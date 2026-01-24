import { execSync } from 'child_process';
import { renameSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Compile TypeScript
console.log('Compiling Electron TypeScript files...');
execSync('npx tsc -p electron/tsconfig.json', { cwd: rootDir, stdio: 'inherit' });

// Rename files - main.js to .mjs (ESM), preload.js to .cjs (CommonJS)
const distElectron = join(rootDir, 'dist-electron');

// Main process uses ESM
const mainJsPath = join(distElectron, 'main.js');
const mainMjsPath = join(distElectron, 'main.mjs');
if (existsSync(mainJsPath)) {
  renameSync(mainJsPath, mainMjsPath);
  console.log('Renamed main.js to main.mjs');
}

// Preload must use CommonJS
const preloadJsPath = join(distElectron, 'preload.js');
const preloadCjsPath = join(distElectron, 'preload.cjs');
if (existsSync(preloadJsPath)) {
  renameSync(preloadJsPath, preloadCjsPath);
  console.log('Renamed preload.js to preload.cjs');
}

console.log('Electron build complete!');
