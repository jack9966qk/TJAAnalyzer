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
*Access at the URL shown in your terminal. Use this for active development.*

**Production Preview:**
```bash
npm start
```
*This serves the built assets from `dist/` to simulate a production deployment. Requires `npm run build` first.*

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

## Version History

A brief summary of each minor version:

- **v0.9.x**: Added playdata management (import and export), play status indicators in chart list, persistent URL updates, refined ESE search functionality.
- **v0.8.x**: Implemented PWA offline support and auto-updates, migrated build system, extracted renderer logic into a standalone package.
- **v0.7.x**: Overhauled judgement handling for better game integration, introduced portable builds for desktop, added scripts for generating song mappings.
- **v0.6.x**: Responsive horizontal layout and dark mode support, consolidated input tabs, refactored core components.
- **v0.5.x**: Automatic hand annotation features based on note patterns and segmentation logic, visual improvements for note selection.
- **v0.4.x**: Stacked rendering of multiple branches, improved visual cues for Gogo time and branching.
- **v0.3.x**: ESE integration, added Neutralinojs packaging for desktop deployment.
- **v0.2.x**: Added note selection export functionality, allowing users to export specific sections of a chart with custom loop settings.
- **v0.1.x**: Initial release featuring basic TJA chart rendering, navigation, and zooming support.
