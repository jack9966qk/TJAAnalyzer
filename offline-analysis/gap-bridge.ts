import { analyzeTJA, type GapUnit } from "./tja-gaps.js";

// Bridge for the Python wrapper (note_gaps.py): reads a TJA string from stdin,
// writes the note-gap analysis as JSON to stdout. Usage:
//   node --loader ts-node/esm offline-analysis/gap-bridge.ts [--unit measures|ms] < chart.tja

function parseGapUnit(): GapUnit {
  const idx = process.argv.indexOf("--unit");
  if (idx === -1) return "measures";
  const value = process.argv[idx + 1];
  if (value === "ms") return "ms";
  if (value === "measures") return "measures";
  process.stderr.write(`error: unknown unit "${value}". Expected "measures" or "ms".\n`);
  process.exit(1);
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function main() {
  const unit = parseGapUnit();
  const content = await readStdin();
  const analysis = analyzeTJA(content, unit);
  process.stdout.write(JSON.stringify(analysis));
}

main().catch((err) => {
  const message = err instanceof Error ? (err.stack ?? err.message) : String(err);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
