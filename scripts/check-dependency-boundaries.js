import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const lock = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'));
const root = lock.packages?.[''];
assert.ok(root, 'package-lock.json must contain the root package entry');

for (const section of ['dependencies', 'devDependencies', 'optionalDependencies']) {
  assert.deepEqual(root[section] ?? {}, manifest[section] ?? {}, `package.json and package-lock.json must agree for ${section}`);
}

assert.equal(manifest.dependencies?.['netlify-cli'], undefined, 'netlify-cli is local development tooling and must not be a production dependency');
assert.equal(manifest.devDependencies?.['netlify-cli'], '^27.13.0', 'keep the pinned netlify-cli range in devDependencies');

const packages = lock.packages;
function resolveDependency(fromPath, dependency) {
  let base = fromPath;
  while (base) {
    const candidate = `${base}/node_modules/${dependency}`;
    if (packages[candidate]) return candidate;
    const nested = base.lastIndexOf('/node_modules/');
    if (nested >= 0) base = base.slice(0, nested);
    else if (base.startsWith('node_modules/')) base = '';
    else break;
  }
  const rootPath = `node_modules/${dependency}`;
  return packages[rootPath] ? rootPath : null;
}

function collectReachable(roots, { requiredRoots = [] } = {}) {
  const seen = new Set();
  const queue = [];
  for (const name of roots) {
    const resolved = resolveDependency('', name);
    if (requiredRoots.includes(name)) {
      assert.ok(resolved, `required root dependency ${name} must resolve in package-lock.json`);
    }
    if (resolved) queue.push(resolved);
  }

  while (queue.length) {
    const path = queue.shift();
    if (seen.has(path)) continue;
    seen.add(path);
    const entry = packages[path];
    assert.ok(entry, `reachable lockfile entry ${path} must exist`);

    for (const name of Object.keys(entry.dependencies ?? {})) {
      const resolved = resolveDependency(path, name);
      assert.ok(resolved, `required dependency ${name} from ${path} must resolve in package-lock.json`);
      if (!seen.has(resolved)) queue.push(resolved);
    }

    // Optional dependencies may legitimately be absent on a given platform.
    for (const name of Object.keys(entry.optionalDependencies ?? {})) {
      const resolved = resolveDependency(path, name);
      if (resolved && !seen.has(resolved)) queue.push(resolved);
    }

    // Peer dependencies are not necessarily installed. Skip optional peers even
    // when present in the lockfile; follow required peers only when they resolve.
    for (const name of Object.keys(entry.peerDependencies ?? {})) {
      if (entry.peerDependenciesMeta?.[name]?.optional === true) continue;
      const resolved = resolveDependency(path, name);
      if (resolved && !seen.has(resolved)) queue.push(resolved);
    }
  }
  return seen;
}

const productionRoots = [
  ...Object.keys(root.dependencies ?? {}),
  ...Object.keys(root.optionalDependencies ?? {}),
];
const production = collectReachable(productionRoots, {
  requiredRoots: Object.keys(root.dependencies ?? {}),
});
const cliTree = collectReachable(['netlify-cli'], { requiredRoots: ['netlify-cli'] });

// npm may leave a package without dev:true when it is also present solely to
// satisfy an optional peer of a production package. Such peers are not installed
// automatically and must not be treated as production-reachable dependencies.
const optionalPeerPaths = new Set();
for (const path of production) {
  const entry = packages[path];
  for (const [name, metadata] of Object.entries(entry.peerDependenciesMeta ?? {})) {
    if (metadata?.optional !== true) continue;
    const resolved = resolveDependency(path, name);
    if (resolved) optionalPeerPaths.add(resolved);
  }
}

const bracesPaths = Object.keys(packages).filter(path => path === 'node_modules/braces' || path.endsWith('/node_modules/braces'));
assert.ok(bracesPaths.length > 0, 'the lockfile should retain the transitive braces package while the advisory is under review');
assert.ok(bracesPaths.every(path => !production.has(path)), 'braces must remain outside the production dependency graph until the advisory is resolved or its applicability is documented');
assert.ok(cliTree.size > 0, 'lockfile must resolve netlify-cli');
for (const path of cliTree) {
  if (production.has(path) || optionalPeerPaths.has(path)) continue;
  assert.equal(packages[path].dev, true, `${path} is reachable only through development tooling and must be marked dev-only in package-lock.json`);
}
for (const path of production) {
  assert.notEqual(packages[path].dev, true, `${path} is production-reachable and must not be marked dev-only`);
}
console.log(`Dependency boundaries verified: ${production.size} production package paths; ${cliTree.size} netlify-cli package paths.`);
