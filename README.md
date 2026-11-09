# TypeQuest 2

**Profiles and Progress — local players and saved runs**

The playable frontend milestone is preserved on `main` as `v1.0.0`. Backend development continues on `feature/backend_1`.

TypeQuest 2 is a browser-based typing game for a college Design Thinking and Idea Lab project. It uses Flask and Jinja2 to serve HTML, SQLite to store game content, and internal CSS plus vanilla JavaScript for gameplay, with simple code that can be understood, modified, and explained during the lab presentation.

This milestone includes playable **Classic, Time Attack, and Survival** modes, along with Home, game selection, and Classic level selection. Gameplay and result calculations remain in the browser. Flask loads the initial content from SQLite when rendering each page. Completed runs are saved in SQLite for the selected local profile.

The current version is intended for **desktop and laptop browsers with a physical keyboard**. Mobile layouts are not implemented.

## What Works in This Version

| Area | Current status |
| --- | --- |
| Home | Begin button and Enter shortcut open game selection |
| Play | Opens all three modes and passes the selected Time Attack duration |
| Classic level selection | Renders tiers and levels from SQLite with Jinja; Tiers 1–2 are available |
| Classic gameplay | Levels 1–20, passage completion, character feedback, stopwatch, Net WPM, and final statistics |
| Time Attack | 30-second, 1-minute, 2-minute, and 5-minute challenges with a continuous passage stream |
| Survival | Automatic scrolling, editable visible text, increasing difficulty, hearts, and GAME OVER |
| Shared gameplay controls | Pause/resume, Escape shortcut, automatic pause on focus loss, and restart |
| Results | Final statistics remain on the gameplay page and completed runs save to the active profile |
| Profiles | Create, switch, rename, and delete local players; an active profile is required to play |
| Progress | Best results, latest five sessions per mode, and separate local leaderboards |

### Classic

- Five tiers are shown, with a planned total of 50 levels.
- Tiers 1 and 2 currently contain 10 playable levels each. Tiers 3–5 are disabled.
- Tier information, level headings, and exact original passages come from the `classic_tiers` and `classic_levels` SQLite tables.
- The multiline passage uses character coloring and a cursor that stays visible as the passage scrolls vertically.
- The stopwatch begins on the first typed character. Paused time is excluded.
- Typing moves forward; **Backspace is the way to move back and erase**. Left/Right Arrow editing is not used in Classic.
- Entering the full passage completes the level, even if incorrect characters remain.
- Completion freezes the clock and shows accuracy and Raw WPM alongside the Net WPM display.
- Completion awards 1 star below 90% accuracy, 2 stars at 90% or above, and 3 stars at 95% or above. Exact, unrounded accuracy is used; WPM has no effect on stars.
- Level cards display the current profile’s best stars. Tiers 3–5 remain globally unavailable; star-based unlocking is not implemented.

### Time Attack

- Choose **30 seconds, 1 minute, 2 minutes, or 5 minutes** on Play.
- A three-second countdown runs before the challenge timer starts.
- Passages are shuffled and appended as needed, using each passage before repeating a cycle and avoiding immediate repetition between cycles.
- A single-line, 60-character window follows forward typing, normally retaining 18 previous positions for corrections. The physical typing-area width can reduce the visible history to keep the cursor before the fade.
- Left/Right Arrows move through previously reached text. Typing overwrites a position; Backspace clears the preceding position.
- Remaining time and Net WPM update during play. Paused time is excluded.
- The run ends at the selected duration and displays accuracy, Raw WPM, and the word counter on the same page.

### Survival

- A three-second countdown precedes the run, which begins with **three hearts**, represented by six half-heart units.
- A single-line, 60-character window scrolls automatically from the first active frames. Its movement depends on active elapsed time, not typing speed or the number of animation frames.
- The starting text is offset by 18 character-widths to leave room for recent history as the passage moves left.
- Visible history remains editable with Backspace, Left/Right Arrows, and overwriting. **The editing limit is at the typing area's left edge, not at an internal 18-character wall.**
- A character becomes finalized as it starts scrolling outside the left edge. Its status is retained, and it can no longer be edited.
- The cursor stays inside the usable typing area and disappears at GAME OVER. There is no separate visible boundary indicator inside the passage.
- New passages are selected from the current tier. Each tier's pool is shuffled before reuse; existing queued text is retained.

**Both wrong typing and missed characters cause damage:**

- Each incorrect printable keystroke immediately adds one damage point, including an incorrect overwrite.
- Each character left untyped when it passes the left edge adds one damage point.
- An already-incorrect character is not charged again when it leaves the window.
- Both causes share one damage counter. Reaching the current threshold removes **half a heart**.
- Backspace and arrow keys do not directly cause damage. Corrections do not refund damage; erasing a character and leaving it untyped can result in a later miss.
- The counter resets after a half-heart deduction and at each new minute. Correct typing does not reset it.
- Losing all six half-heart units ends the run and freezes the timer, scrolling, and final statistics.

| Active playing time | Displayed tier | Scrolling speed at that point | Damage points per half-heart |
| --- | --- | --- | --- |
| Start | 1 | 1.5 characters/second | 6 |
| 1 minute | 2 | 2 characters/second | 5 |
| 2 minutes | 3 | 2.5 characters/second | 4 |
| 3 minutes | 4 | 3 characters/second | 3 |
| 4 minutes | 5 | 3.5 characters/second | 2 |
| 5 minutes onward | 5 | 4 characters/second | 1 |

Speed increases continuously between these points and caps at 4 characters per second. The displayed passage tier stops at 5, while the damage threshold reaches its minimum of one point per half-heart after five minutes.

## Controls and Statistics

| Control | Classic | Time Attack and Survival |
| --- | --- | --- |
| Character keys | Type the next character | Type or overwrite at the cursor |
| Backspace | Move back and erase | Move back and clear a position within the editable area |
| Left/Right Arrows | Not used for editing | Navigate previously reached, editable positions |
| Escape | Pause/resume | Pause/resume, including the starting countdown |
| Pause/Resume button | Pause/resume | Pause/resume; initially disabled during the countdown |
| Restart | Reset and wait for the first character | Reset and begin a new three-second countdown |
| Levels/Modes and Home | Return to selection or Home | Return to selection or Home |

- Correct text is green, incorrect text has red styling, and untyped text remains muted.
- Leaving the browser or switching tabs pauses active gameplay. Time Attack and Survival also support pausing their countdowns with Escape or focus loss.
- Paste is blocked in gameplay typing areas.
- Five entered characters count as one word for WPM calculations.
- Raw WPM measures entered characters over active playing time. Net WPM is Raw WPM multiplied by accuracy.
- Classic and Time Attack calculate accuracy from entered positions. Survival also includes finalized, untyped positions as missed opportunities.
- The Time Attack word counter tracks entered positions whose original character is a space.
- Paused time and the initial countdown are excluded from gameplay statistics.
- WPM occupies a fixed metric column so changes in digit width do not shift the passage.

## What Is Not Implemented Yet

| Pending area | Current limitation |
| --- | --- |
| Dedicated results page | Results are currently shown on the gameplay page |
| Remaining Classic content | Tiers 3–5 and levels 21–50 are unavailable |
| Final passage seeding | Current JavaScript content can be replaced with the final level/passages later |
| Tier unlocking | Star-based unlocking remains pending; Tiers 3–5 stay unavailable |
| Settings | Navigation placeholder with no settings page or functionality |
| Audio | The audio footer is decorative; game audio is not implemented |

The database stores game content, local profiles, and completed run history. Profiles are local players, not online accounts. There are no passwords, online authentication, settings table, or separate leaderboard table. Rankings are calculated from saved runs. The active profile is remembered using Flask’s signed session cookie with a local-development key; this is not an online account security system.

Mobile support, multiplayer, and a separate Practice mode are outside the current project scope.

## Profiles, Saving, and Leaderboards

- Profile names are trimmed, unique (case-insensitive for ASCII names), and 1–24 characters long.
- Creating a profile immediately selects it. Use Switch to choose another player. The ⋯ menu provides Rename and Delete; deletion requires confirmation and removes that profile’s saved runs only.
- Opening a game without a selected profile redirects to Profiles. No sample players or scores are added to the real database.
- Each completed run adds one row. A single JavaScript `resultSaved` flag prevents repeated saves from that completion. Restart resets the flag; abandoned runs are not saved. There are no run tokens, attempt IDs, or server-side replay registry.
- Flask’s session remembers the selected profile. Each game sends its displayed profile ID with its result; a simple comparison rejects the save if the selected player has changed or been deleted. No concurrent-tab token system is used.
- Save failures appear in the gameplay footer. Do not navigate away immediately after completion; wait for “Saved for …”.
- Classic progress counts distinct completed levels and sums the best stars for each level. Replaying a level cannot inflate the total best stars.
- Classic leaderboard: total best stars across levels. Time Attack leaderboard: best Net WPM, separately for 30/60/120/300 seconds. Survival leaderboard: longest active survival time. Equal scores are ordered by profile ID.
- Personal Progress shows best figures and the latest five completed runs per mode. Times are stored in UTC and displayed in IST.
- SQLite content and result queries stay in `database.py`, which imports only `sqlite3`. The existing typing, scrolling, timer, and damage engines stay in JavaScript; small completion/restart hooks call the shared result saver.

## Backend and Content Storage

The database is `typequest.db` in the project root. It is Git-ignored and can be rebuilt from the tracked `schema.sql` and `seed_data.json` files.

| Table | Initial records | Purpose |
| --- | --- | --- |
| `classic_tiers` | 5 | Tier ranges and global availability |
| `classic_levels` | 20 | Level numbers, tiers, titles, and exact passages |
| `typing_passages` | 200 | 100 Time Attack passages and 100 Survival passages, with 20 per Survival tier |
| `profiles` | 0 on a fresh setup | Local player names and creation timestamps |
| `classic_progress` | 0 on a fresh setup | Completed runs; foreign keys to profiles and Classic levels |
| `time_attack_progress` | 0 on a fresh setup | Completed runs associated with a profile and duration |
| `survival_progress` | 0 on a fresh setup | Completed runs associated with a profile, survival time, and tier |

Passages appearing in both modes remain separate mode-specific records. Python uses built-in `sqlite3`, parameterized queries, `sqlite3.Row`, and enabled foreign keys. No ORM is used.

`seed.py` creates missing tables and inserts missing seed IDs. Repeating it does not duplicate rows or overwrite existing database edits. Ordinary Flask startup does not initialize or reseed the database. The seed fixture is for rebuilding; normal page requests read SQLite.

## Flask Routes

| URL | Page |
| --- | --- |
| `/` | Home |
| `/play` | Mode selection |
| `/classic-levels?tier=1` | Classic tiers and level cards |
| `/classic?level=1` | Selected Classic level |
| `/time-attack?duration=60` | Selected Time Attack duration |
| `/survival` | Survival |
| `/profiles` | Profile list and create/switch/rename/delete forms |
| `/progress` | Personal results; `?tab=leaderboard` opens rankings |
| `/results` (POST) | Save a completed game for the selected profile |

An invalid or unavailable Classic level shows the existing unavailable-level screen with HTTP 404. Invalid/unavailable tier selections fall back to Tier 1. Missing, invalid, or unsupported Time Attack durations default to 60 seconds.

Jinja renders Classic tier buttons and cards directly. Tier selection submits a normal GET form, preserving `?tier=` without rebuilding cards in JavaScript. Initial gameplay content is passed safely with Jinja's `tojson` filter. There are no asynchronous content-fetch requests. Completed runs are sent to `/results` using a small shared JavaScript saver. The POST includes the mode, profile, level/duration where applicable, character counts, and active elapsed time. Flask checks the basic values and calculates WPM, accuracy, and stars before inserting the result.

## Run Locally — Windows PowerShell

Use Python 3 and run these commands from the project directory:

```powershell
cd "C:\_VAULT\Techhh\TypeQuest 2"
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python seed.py
python app.py
```

If `.venv` already exists, skip its creation. Open [TypeQuest locally](http://127.0.0.1:5000/) in a desktop browser. Stop Flask with `Ctrl+C`.

If PowerShell prevents activation, use the environment's Python directly:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe seed.py
.\.venv\Scripts\python.exe app.py
```

Serve the application through Flask. Opening template HTML directly, or using `python -m http.server`, will not render Jinja or load database content. Fonts load from Google Fonts; SVG icons are local.

## Tests

```powershell
python -m unittest -v
```

The tests use temporary SQLite databases and cover the full seed fixture, repeatable seeding without overwriting edits, foreign keys, routes, assets, tier/level validation, duration defaults, and safe JSON rendering. They do not change the application's database.

Browser verification during this migration also covered navigation, the six original page layouts, Classic completion, all Time Attack durations, and Survival scrolling, editing, damage, tiers, pause/resume, and restart. Timing scenarios used a controlled browser clock. Actual operating-system tab switching was not retested during this migration.

## Project Structure

```text
TypeQuest 2/
├── app.py                     # Flask routes and initial page data
├── database.py                # SQLite connections and queries
├── schema.sql                 # Three content tables and four profile/progress tables
├── seed.py                    # Explicit database initialization/seeding
├── seed_data.json             # Exact original content, tracked in Git
├── requirements.txt           # Flask (includes Jinja2 as a dependency)
├── test_backend.py            # Content and route tests
├── test_profiles_progress.py  # Profiles, saving, stars, isolation, and leaderboard tests
├── typequest.db               # Local database, Git-ignored
├── templates/
│   ├── index.html
│   ├── play.html
│   ├── classic-levels.html
│   ├── classic.html
│   ├── time-attack.html
│   ├── survival.html
│   ├── profiles.html
│   └── progress.html
├── static/
│   ├── js/
│   │   ├── home.js
│   │   ├── classic.js
│   │   ├── time-attack.js
│   │   ├── survival.js
│   │   ├── profiles.js
│   │   └── results.js
│   └── icons/
├── .gitignore
└── README.md
```

The three old JavaScript data files and `classic-levels.js` have been removed. Gameplay constants remain in JavaScript. Numbered character spans, correctness classes, timers, and scoring stay in the existing browser engines.

## Development Approach

- Keep per-keystroke gameplay in the browser; use Flask for routing/rendering and SQLite for content.
- Keep separate Jinja templates, internal CSS, and straightforward vanilla JavaScript.
- Keep database queries in Python and pass initial content with Jinja; avoid extra client-side content fetching.
- Use four-space indentation, opening braces on the next line in JavaScript, and opening braces on the selector line in CSS.
- Use one-value `padding`/`margin` when all sides are equal, or four values when they differ.
- Keep static page backgrounds on `body`, icons in separate SVG files, and layouts focused on desktop/laptop screens.
- Preserve the supplied designs and favor code that can be explained line by line over frameworks or unnecessary abstractions.

Profiles and completed results are now saved, with local rankings and progress pages. Tier unlocking, remaining Classic content, a dedicated results page, settings, and audio remain pending.

To update an existing database for this version, stop Flask, run `python seed.py`, and restart Flask. This adds the four new tables without deleting content, profiles, or results. `python -m unittest -v` now runs 13 tests, including exact unrounded star boundaries, profile CRUD, guest blocking, result validation, the simplified result endpoint, profile changes during play, cascade deletion, duration-specific rankings, and IST display. Browser checks cover the modal/list, navigation, completed Classic runs and restarts, all four Time Attack durations, Survival saves, and isolation between profiles.

### Simplified result saving

The save flow is now: game completes → check/set `resultSaved` → POST `/results` → validate basic values → insert a row for the selected profile. Restart sets `resultSaved = false`. Repeating a raw HTTP POST can create another row; normal duplicate completion calls are stopped by the JavaScript flag rather than database tokens.

Run `python seed.py` once after updating an older installation. It removes the old `run_id` columns while preserving existing progress IDs, profile links, scores, stars, times, and timestamps. Fresh databases use the simpler seven-table schema directly. The upgrade runs only during explicit initialization, not on ordinary Flask startup. Tests cover upgrading a populated old database and repeating initialization without losing history.
