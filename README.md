# Alternity Warship Generator

A desktop application for generating Warships for the Alternity sci-fi role-playing game.

Built with Electron + React + TypeScript + Vite.

## Download

Download the latest installer from the [Releases page](https://github.com/VicenteCartas/AlternityWarshipsGenerator/releases).

- **Windows:** Download `Alternity.Warship.Generator.Setup.X.X.X.exe`

## Development

### Prerequisites

- Node.js 20.19+ or 22.12+ (recommended)
- npm

### Install Dependencies

```bash
npm install
```

### Development Mode

To run the app in development mode with hot-reload:

```bash
npm run dev:electron
```

This starts both the Vite dev server and Electron. Changes to React code will hot-reload instantly.

**Alternative:** If you want to run them separately (useful for debugging):

```bash
# Terminal 1: Start Vite dev server
npm run dev

# Terminal 2: Start Electron (after Vite is ready)
npm run electron:start
```

### Build for Production

```bash
# Build the app
npm run build:electron

# Create Windows installer
npm run dist:win
```

The installer will be created in the `release/` folder.

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server only (web preview at http://localhost:4200) |
| `npm run dev:electron` | Start Vite + Electron together for desktop development |
| `npm run electron:start` | Start Electron only (requires Vite to be running) |
| `npm run build` | Build React app for production |
| `npm run build:electron` | Build both React and Electron for production |
| `npm run dist:win` | Create Windows installer |
| `npm run lint` | Run ESLint |

## Project Structure

```
├── electron/           # Electron main process code
│   ├── main.ts         # Main process entry point
│   ├── preload.ts      # Preload script for IPC
│   └── tsconfig.json   # TypeScript config for Electron
├── scripts/            # Build scripts
├── src/                # React application code
│   ├── App.tsx         # Main React component
│   └── main.tsx        # React entry point
├── public/             # Static assets
└── Warships.pdf        # Source material for warship generation rules
```

## Creating a Release

Releases are automated via GitHub Actions. To create a new release:

1. **Update the version** in `package.json`:
   ```json
   "version": "0.2.0"
   ```

2. **Commit and tag** the release:
   ```bash
   git add -A
   git commit -m "Release v0.2.0"
   git tag v0.2.0
   git push origin main --tags
   ```

3. **GitHub Actions will automatically:**
   - Build the Windows installer
   - Create a GitHub Release
   - Attach the installer for download

The release will appear on the [Releases page](https://github.com/VicenteCartas/AlternityWarshipsGenerator/releases) within a few minutes.

## Tech Stack

- **Electron** - Desktop app framework
- **React** - UI library
- **TypeScript** - Type safety
- **Vite** - Fast build tool with HMR
