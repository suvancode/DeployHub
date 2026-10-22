import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';

const outDir = path.resolve('dist-electron/preload');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Build index.cjs as CommonJS
await esbuild.build({
  entryPoints: ['electron/preload/index.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  external: ['electron'],
  outfile: path.join(outDir, 'index.cjs'),
});

// Build index.js as CommonJS
await esbuild.build({
  entryPoints: ['electron/preload/index.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  external: ['electron'],
  outfile: path.join(outDir, 'index.js'),
});

// Write package.json inside dist-electron/preload marking it as commonjs
fs.writeFileSync(
  path.join(outDir, 'package.json'),
  JSON.stringify({ type: 'commonjs' }, null, 2)
);

console.log('Preload built successfully as CommonJS (.cjs + .js + package.json)');
