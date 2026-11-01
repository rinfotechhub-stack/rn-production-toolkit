import * as fs from 'node:fs';
import * as path from 'node:path';
import * as toolkit from '../src';

describe('core package foundation', () => {
  it('loads the package entry module', () => {
    expect(typeof toolkit).toBe('object');
  });

  it('declares coherent package metadata', () => {
    const pkgPath = path.resolve(__dirname, '..', 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as {
      name: string;
      version: string;
      license: string;
      main: string;
      types: string;
      files: string[];
    };

    expect(pkg.name).toBe('@rn-production-toolkit/core');
    expect(pkg.version).toBe('0.1.0');
    expect(pkg.license).toBe('MIT');

    // main/types must point into the dist output produced by the build.
    expect(pkg.main).toBe('./dist/index.js');
    expect(pkg.types).toBe('./dist/index.d.ts');

    // Only generated artifacts are published.
    expect(pkg.files).toEqual(['dist']);
  });
});
