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

// Rename .js files to .mjs
const distElectron = join(rootDir, 'dist-electron');
const files = ['main.js', 'preload.js'];

for (const file of files) {
  const jsPath = join(distElectron, file);
  const mjsPath = join(distElectron, file.replace('.js', '.mjs'));
  
  if (existsSync(jsPath)) {
    renameSync(jsPath, mjsPath);
    console.log(`Renamed ${file} to ${file.replace('.js', '.mjs')}`);
  }
}

console.log('Electron build complete!');
