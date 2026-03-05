# Alan Fitness App

Personal iPhone-first fitness tracker built with Expo React Native.  
The app is offline-first and stores all workout/session data in on-device SQLite.

## Overview

This app tracks a 12-week workout plan, lets you log sets during sessions, and stores a full session history.

Primary goals:

- Fast workout logging with minimal UI friction
- Deterministic workout ordering (no accidental duplicate cards)
- Local-first storage, no backend required
- Seeded plan data that can be re-imported/versioned safely

## Tech Stack

- Expo SDK 54
- React Native + TypeScript
- Expo Router
- expo-sqlite
- @shopify/flash-list
- date-fns

## Prerequisites

- Node.js `>= 20`
- npm `>= 10`
- Expo Go on iPhone (latest available in App Store)

Optional (for PDF re-import workflow):

- Python 3
- `pypdf`

## Quick Start

```bash
npm install
npx expo start -c
```

From your iPhone:

1. Open Expo Go
2. Scan the QR code from terminal/browser

## Project Layout

```text
app/
  index.tsx                  Home
  workout/[dayId].tsx        Workout session screen
  day/[dayId].tsx            Legacy redirect to /workout/[dayId]
  program.tsx                Program browser
  history.tsx                Session list
  session/[sessionId].tsx    Session detail
  settings.tsx               Program start date
  _layout.tsx                App bootstrap + routes

components/Workout/
  SessionHeader.tsx
  ExerciseRow.tsx
  SetLoggerSheet.tsx

src/db/
  migrations.ts              Schema migration/reset logic
  queries.ts                 SQL query layer
  index.ts                   App-facing DB facade
  database.ts                Re-export compatibility shim

src/services/
  seed.ts                    Seed ingestion + seed versioning
  progress.ts                Progress helper utilities

src/types/
  program.ts                 Shared app types

src/data/
  program.json               Seed workout plan

scripts/
  import_workout_plan.py     PDF -> JSON converter
```

## Data Model

The plan and logs are intentionally separated.

Plan tables:

- `program_days`
- `exercise_item`
- `meta` (`seed_version`)

Session/log tables:

- `session`
- `set_entry`
- `exercise_status`

Support:

- `settings` (e.g. `program_start_date`)

Important indexes:

- `idx_set_entry_session`
- `idx_set_entry_exercise_item`
- `idx_exercise_item_day`
- `idx_session_day_status`

## Startup Flow

On app launch:

1. `initializeDatabase()` runs
2. `migrate()` creates/updates schema
3. Legacy incompatible schema is detected and reset when required
4. `seedProgramIfNeeded()` applies plan data based on `meta.seed_version`

## Workout Flow

1. Home resolves today's program day from `program_start_date`
2. Workout screen loads:
   - program day details
   - active session (or start on demand)
   - aggregate set progress by `exercise_item_id`
3. Tapping an exercise opens `SetLoggerSheet`
4. Logging a set inserts into `set_entry` with auto `set_index`
5. Finish session marks `session.status = completed` and sets `ended_at`

## Seed and Import Workflow

To regenerate `src/data/program.json` from the original PDF folder:

```bash
python scripts/import_workout_plan.py --input-dir "C:\Users\alano\Downloads\Alan Oliver Workout Plan" --output "src/data/program.json"
```

Notes:

- PDF extraction quality can vary; verify output before relying on it
- `seed.ts` derives deterministic `exercise_item.id` values
- Seed changes should bump `SEED_VERSION` so ingestion reruns

## Dev Commands

```bash
npm run start
npm run ios
npm run android
npm run web
npm run typecheck
```

## Troubleshooting

### `Project is incompatible with this version of Expo Go`

- Confirm app uses Expo SDK 54 (`package.json`)
- Update Expo Go to latest available
- Restart with cache clear: `npx expo start -c`

### Initialization error about missing DB columns

- Caused by old local schema from earlier versions
- `migrations.ts` now auto-resets incompatible legacy tables
- Fully restart Expo Go after launching with `-c`

### Metro resolution/module errors

- Run `npm install`
- Then `npx expo install --check`
- Restart with `npx expo start -c`

## Git Notes

Local-only files are ignored:

- root `.claude/`
- IDE folders (`.vscode/`, `.idea/`)
- Expo cache and node modules
- optional local DB artifacts (`*.db`, `*.sqlite*`)
