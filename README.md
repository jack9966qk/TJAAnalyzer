# TJA Analyzer

A simple local web application to visualize TJA charts.

## Features
- Parses TJA files (prioritizing 'Edit' or 'Oni' difficulty).
- Visualizes the chart with a standard 4-bar layout.
- Supports Don (Red), Ka (Blue), and Big notes.

## How to Run
Since this application uses ES Modules, you need to serve it with a local web server.

1. Open a terminal in this directory.
2. Run a local server:
   - Python 3: `python -m http.server`
   - Node.js (http-server): `npx http-server .`
3. Open your browser to the provided URL (usually `http://localhost:8000` or `http://localhost:8080`).

## Development
- `src/tja-parser.js`: TJA parsing logic.
- `src/renderer.js`: Canvas rendering logic.
- `src/main.js`: Main application entry point.
- `test-parser.js`: Node.js script to verify the parser logic.
