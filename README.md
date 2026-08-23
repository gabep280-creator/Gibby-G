# Noah's Pork Rinds — Vendor Route Manager

A map-first route planning and flavor-performance tool for Noah's Pork Rinds
delivery drivers. Plan an efficient stop order, log units sold per flavor at
each store, and see A/B/C performance grades at a glance — built to be used
on a phone in a truck.

## Stack

- **Next.js (App Router)** — frontend + `/api` route handlers
- **Prisma 7 + SQLite** (via the `better-sqlite3` driver adapter) — swap the
  `datasource` provider in `prisma/schema.prisma` to `postgresql` to move to
  Postgres later; the rest of the app is unaffected
- **Mapbox GL JS** — map rendering, Optimization API for route sequencing,
  Directions API for road-following route lines, Geocoding API for address
  autocomplete
- **Tailwind CSS** — mobile-first, touch-friendly styling
- **@dnd-kit** — drag-to-reorder route stops

The app is fully functional **without** a Mapbox token: it falls back to a
local nearest-neighbor algorithm for route sequencing and a schematic
lat/lng-projected layout instead of real map tiles, so you can develop and
demo it with zero external accounts.

## Getting started

```bash
npm install
npx prisma migrate deploy   # create prisma/dev.db and apply the schema
npx prisma db seed          # seed the 3 flavors + sample Charlotte, NC stores
npm run dev
```

Open http://localhost:3000.

### Enabling live maps, geocoding, and Mapbox-optimized routes

Add a token to `.env`:

```
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_token_here
```

Get one at https://account.mapbox.com/access-tokens/. With it set:
- The map renders real Mapbox tiles instead of the schematic fallback.
- Address autocomplete works when adding/editing a store.
- Routes are sequenced with the Mapbox Optimization API (falls back to
  nearest-neighbor automatically for >12 stops, or if the API call fails).
- The route line snaps to roads via the Directions API instead of drawing
  straight lines between stops.

## Data model

See `prisma/schema.prisma`:

- **Location** — a store/stop, with address, geocoded lat/lng, contact info,
  visit frequency
- **Product** — a flavor/SKU (seeded: Salt & Pepper, Spicy BBQ, Spicy Dill
  Pickle)
- **SalesRecord** — units sold of a Product at a Location for a visit/period
- **Route** / **RouteStop** — a planned delivery route and its ordered stops,
  including per-leg distance/duration and completion status

A/B/C grades are **computed on read**, not stored — see `lib/grading.ts`.
The default strategy grades each flavor at a location relative to that
location's own top seller, so a store can flag a weak flavor even if its
overall sales are healthy. The grading function is swappable in one place if
the threshold logic needs to be tuned later.

`RouteStop` and `SalesRecord` already carry nullable fields (`photoUrl`,
`signatureUrl`, `visitNotes`) so delivery photo/signature confirmation and
per-visit notes can be added later without a schema migration. `driverName`
on `Route` is a placeholder for multi-driver assignment.

## Project structure

```
app/
  page.tsx                 dashboard (today's route, C-grade flags)
  map/page.tsx              map-first view: pins, route planning, stop list
  locations/                 store list, add/edit forms
  rankings/                  all stores ranked by a chosen flavor
  api/                       route handlers (locations, products, sales,
                              routes, geocode, dashboard)
components/                  MapView, RoutePanel, LocationDetailSheet, etc.
lib/
  grading.ts                 A/B/C grading logic
  mapbox.ts / mapbox-client.ts  Mapbox API helpers (server / client)
  queries.ts                  grade-computation helpers shared by API routes
prisma/
  schema.prisma, seed.ts
```
