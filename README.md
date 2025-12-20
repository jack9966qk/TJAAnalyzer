# TJA Analyzer

A versatile tool for visualizing, analyzing, and annotating TJA charts for Taiko no Tatsujin simulators.

## Features

- **Chart Visualization**: Renders TJA charts with support for standard notes, rolls, balloons, and variable measures. Displays chart metadata (Title, BPM, etc.).
- **Analysis**:
  - **Detailed Note Statistics**: Inspect individual note timing, interval, and properties.
  - **View Options**: Customizable display with zooming, loop collapsing, and bar numbering.
- **Data Sources**: Load charts from local files, built-in examples, or the **ESE Database**.
- **Judgement Integration**: Connect to an external judgement stream (SSE) to visualize hit results (Perfect, Good, Poor) in real-time.
- **Annotation & Editing**:
  - Select notes and ranges.
  - Annotate hands (L/R) with automatic inference helper.
  - Export selected sections as TJA snippets.
- **Export**: Save rendered charts as high-quality images.
- **Internationalization**: Supports English and Simplified Chinese.

## Getting Started

### Prerequisites

- Node.js (for building/running locally)

### Installation

```bash
npm install
```

### Running

**Web Mode:**
```bash
npm start
```
*Access at `http://localhost:8080` (or the port shown).*

**Desktop Mode (Neutralinojs):**
```bash
npm run start:exe
```

### Building

To build the web assets:
```bash
npm run build
```

To build the standalone executable:
```bash
npm run build:exe
```