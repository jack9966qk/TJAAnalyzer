# Web APIs

## Note gaps service

A minimal [Cloudflare Worker](https://developers.cloudflare.com/workers/) that takes a
TJA string and returns the note-gap analysis as JSON. The JSON has the same shape produced by
`offline-analysis/analyze-ese.ts`.

The handler reuses `offline-analysis/tja-gaps.ts` (`analyzeTJA`) directly, so there is
no Python and no subprocess — the parse + gap logic runs in-process in the Worker.

### API

`POST /` with the following input:
* request body: the raw TJA string
* query parameters (optional):
  * `?unit=measures|ms` (default `measures`)
  * `?longNoteHandling=[one of LongNoteHandling enum values]` (default `strict`)

Responses:
* success: `{ "courses": { ... } }`
* invalid input: `{ "error": "...", "usage": "..." }`, where `usage` is a short reminder of how to call the API


## Deploy (free Workers plan)

Run everything from this `api/` directory. Wrangler bundles `worker.ts` with esbuild,
resolving `tja-renderer` from the repo's `node_modules` — no separate build step and no
`nodejs_compat` flag (the parse path uses zero Node built-ins).

```sh
cd api
npm install
npx wrangler deploy --dry-run --outdir /tmp/wout   # verify the bundle builds
npx wrangler login
npx wrangler deploy
```
