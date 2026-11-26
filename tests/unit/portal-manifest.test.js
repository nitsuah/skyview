import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { getManifestForClient, findFile } from '../../netlify/functions/utils/portal-manifest.js';

describe('getManifestForClient', () => {
  it('returns a populated manifest and the same one for any client', () => {
    const manifest = getManifestForClient('anyone');
    expect(manifest.projectName).toBeTruthy();
    expect(manifest.deliveredAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Number.isNaN(Date.parse(manifest.deliveredAt))).toBe(false);
    expect(manifest.files.length).toBeGreaterThan(0);
    expect(getManifestForClient('someone-else')).toEqual(manifest);
  });

  it('describes every file with the expected fields', () => {
    const { files } = getManifestForClient('c');
    for (const file of files) {
      for (const key of ['id', 'title', 'type', 'meta', 'path']) {
        expect(typeof file[key]).toBe('string');
        expect(file[key].length).toBeGreaterThan(0);
      }
      expect(['photo', 'raw', 'video']).toContain(file.type);
      expect(file.path.startsWith('/assets/gallery/')).toBe(true);
    }
    const ids = files.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('lists only assets that exist on disk', () => {
    for (const file of getManifestForClient('c').files) {
      expect(fs.existsSync(path.join(process.cwd(), file.path.slice(1)))).toBe(true);
    }
  });
});

describe('findFile', () => {
  it('returns the matching file', () => {
    const file = findFile('c', 'sunset-marina');
    expect(file).not.toBeNull();
    expect(file.id).toBe('sunset-marina');
    expect(file.type).toBe('video');
  });

  it('returns null for unknown and empty ids', () => {
    expect(findFile('c', 'does-not-exist')).toBeNull();
    expect(findFile('c', '')).toBeNull();
  });
});
