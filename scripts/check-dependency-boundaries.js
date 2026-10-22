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
function collectReachable(roots) {
  const seen = new Set();
  const queue = roots.map(name => resolveDependency('', name)).filter(Boolean);
  while (queue.length) {
    const path = queue.shift();
    if (seen.has(path)) continue;
    seen.add(path);
    const entry = packages[path] ?? {};
    for (const section of ['dependencies', 'optionalDependencies', 'peerDependencies']) {
      for (const name of Object.keys(entry[section] ?? {})) {
        const resolved = resolveDependency(path, name);
        if (resolved && !seen.has(resolved)) queue.push(resolved);
      }
    }
  }
  return seen;
}
const production = collectReachable(Object.keys(root.dependencies ?? {}));
const cliTree = collectReachable(['netlify-cli']);
assert.ok(cliTree.size > 0, 'lockfile must resolve netlify-cli');
for (const path of cliTree) {
  if (production.has(path)) continue;
  assert.equal(packages[path].dev, true, `${path} is reachable only through development tooling and must be marked dev-only in package-lock.json`);
}
for (const path of production) {
  assert.notEqual(packages[path].dev, true, `${path} is production-reachable and must not be marked dev-only`);
}
console.log(`Dependency boundaries verified: ${production.size} production package paths; ${cliTree.size} netlify-cli package paths.`);
