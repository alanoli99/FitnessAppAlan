# FitnessAppAlan

A **production-quality**, offline-first mobile fitness tracker built with **React Native** and **Expo**. Designed for real-world daily use — tracks a structured 12-week training program, logs sets in real time, and persists all data locally with SQLite.

> Built as a personal tool, engineered like a product.

---

## Highlights

- **Offline-first architecture** — zero backend dependency; all data lives on-device via `expo-sqlite`
- **Versioned schema migrations** — forward-compatible database layer with automatic legacy detection and safe resets
- **Deterministic seed system** — workout plan data is ingested from JSON with content-addressable IDs and version-gated re-seeding
- **File-based routing** — Expo Router with dynamic segments (`[dayId]`, `[sessionId]`) for deep-linkable screens
- **Type-safe throughout** — end-to-end TypeScript with Zod validation and `react-hook-form` integration
- **Performant lists** — `@shopify/flash-list` for buttery-smooth scrolling on large exercise/session datasets

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | React Native 0.81 · Expo SDK 54 |
| **Language** | TypeScript 5.9 |
| **Navigation** | Expo Router (file-based) |
| **Database** | expo-sqlite (SQLite / WAL mode) |
| **Forms** | react-hook-form + Zod |
| **Lists** | @shopify/flash-list |
| **Tooling** | Python 3 (PDF → JSON pipeline) |

---

## Architecture

```
┌──────────────────────────────────────────────────┐
│                   UI Layer                       │
│  app/index.tsx · app/workout/[dayId].tsx · ...   │
├──────────────────────────────────────────────────┤
│               Component Layer                    │
│  SessionHeader · ExerciseRow · SetLoggerSheet    │
├──────────────────────────────────────────────────┤
│              Service Layer                       │
│  seed.ts (plan ingestion) · progress.ts          │
├──────────────────────────────────────────────────┤
│              Database Layer                      │
│  queries.ts → migrations.ts → expo-sqlite        │
│  (WAL mode · indexed · FK-constrained)           │
└──────────────────────────────────────────────────┘
```

### Key Design Decisions

- **Plan vs. Log separation** — Program structure (`program_days`, `exercise_item`) is kept independent from session data (`session`, `set_entry`, `exercise_status`), enabling safe re-seeding without data loss.
- **Content-addressable IDs** — Exercise items derive deterministic IDs from their content, preventing duplicates across seed versions.
- **Migration-first schema** — `migrate()` runs on every cold start, creating or updating tables idempotently. Legacy schemas are detected via column introspection and reset automatically.
- **Cyclic program mapping** — The home screen resolves today's workout by mapping the current date against `program_start_date`, cycling through program days indefinitely.

---

## Data Model

```
program_days ──┬── exercise_item
               │
session ───────┼── set_entry
               └── exercise_status

settings (key-value)
meta (seed_version tracking)
```

Indexed for fast reads:
`idx_set_entry_session` · `idx_set_entry_exercise_item` · `idx_exercise_item_day` · `idx_session_day_status`

---

## Project Structure

```
FitnessAppAlan/
  app/
    _layout.tsx                 App bootstrap + tab navigation
    index.tsx                   Home — today's workout card
    workout/[dayId].tsx         Active workout session
    session/[sessionId].tsx     Completed session detail
    program.tsx                 Full program browser
    history.tsx                 Session history list
    settings.tsx                Program configuration

  components/Workout/
    SessionHeader.tsx           Session status + timer
    ExerciseRow.tsx             Exercise card with set progress
    SetLoggerSheet.tsx          Bottom sheet for logging sets

  src/db/
    migrations.ts               Schema creation + legacy reset
    queries.ts                  SQL query layer
    index.ts                    Public DB facade

  src/services/
    seed.ts                     Versioned plan ingestion
    progress.ts                 Progress computation

  src/types/program.ts          Shared type definitions
  src/data/program.json         Seed workout plan (generated)
  scripts/import_workout_plan.py  PDF → JSON converter
```

---

## Getting Started

### Prerequisites

- Node.js ≥ 20
- npm ≥ 10
- Expo Go (iOS / Android)

### Run

```bash
cd FitnessAppAlan
npm install
npx expo start -c
```

Scan the QR code with Expo Go to launch on your device.

---

## App Flow

1. **Launch** → `initializeDatabase()` runs migrations and seeds the program plan
2. **Home** → Resolves today's workout from `program_start_date` with cyclic day mapping
3. **Workout** → Loads exercises, tracks active session, shows aggregate set progress
4. **Log** → `SetLoggerSheet` captures weight / reps / RPE / RIR per set
5. **Finish** → Session marked complete with timestamp; visible in history

---

## License

This project is for personal use and portfolio demonstration.
