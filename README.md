# TJA Analyzer

A versatile tool for visualizing, analyzing, and annotating TJA charts.

## Features

### Chart rendering

- Renders TJA charts in native resolution with zooming support.
- Renders branches (Normal, Expert, Master) individually or stacked together.

### Analysis

- Displays note statistics such as BPM and interval from previous note.
- Annotate hands (L/R) manually or automatically with hand inference.

### Export

- Exports selected chart section as TJA, with loop customizations.
- Save rendered charts as high-quality images.

## Getting Started

### Prerequisites

- Node.js (for building/running locally)

### Installation

```bash
npm install
```

### Running

**Development Mode (Hot Reload):**
```bash
npm run dev
```
*Access at the URL shown in your terminal (usually `http://localhost:5173`). Use this for active development.*

**Production Preview:**
```bash
npm start
```
*Access at `http://localhost:8080`. This serves the built assets from `dist/` to simulate a production deployment. Requires `npm run build` first.*

**Desktop Mode (Neutralinojs):**
```bash
npm run start:exe
```
*Starts the application as a standalone desktop executable.*

### Building

To build the web assets:
```bash
npm run build
```

To build the standalone executable:
```bash
npm run build:exe
```

### Development

**Formatting & Linting:**
This project uses [Biome](https://biomejs.dev/) for formatting and linting.
```bash
npm run format
```

**Testing:**
```bash
npm test
```

**Updating ESE Assets:**
To fetch the latest charts from the ESE database:
```bash
npm run fetch-ese
```

## Project Structure

- `src/`: Source code (TypeScript, CSS, Components) for the main application (TJA Analyzer).
- `renderer-package/`: Core chart rendering logic extracted as a standalone package.
- `renderer-example/`: Minimal usage example for the renderer package.
- `public/`: Static assets (such as HTML and chart database) served directly.
- `tests/`: Playwright and unit test suites.
- `dist/`: Build output for the web application (generated).
- `release/`: Build output for standalone executables (generated).
