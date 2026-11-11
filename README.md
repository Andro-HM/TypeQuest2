# TypeQuest 2

**Playable modes, local profiles and progress, settings, and persistent browser-tab audio**

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
| Settings | Three live audio volume sliders with automatic updates to global Python variables |
| Audio | Looping background music, overlapping typing sounds, and shared UI taps on every page |

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
| Final passage content | Current SQLite passages can be replaced with the final supplied content later |
| Tier unlocking | Star-based unlocking remains pending; Tiers 3–5 stay unavailable |

The database stores game content, local profiles, and completed run history. Profiles are local players, not online accounts. There are no passwords, online authentication, settings table, or separate leaderboard table. Rankings are calculated from saved runs. The selected profile is stored in the Python variable `active_profile_id` for this one-process localhost demonstration. Selection is shared by all browsers. Each server startup selects the first existing profile ordered by database ID, or leaves selection empty if there are no profiles. Manual selection is not remembered across restarts; saved profiles and results remain in SQLite.

Mobile support, multiplayer, and a separate Practice mode are outside the current project scope.

## Profiles, Saving, and Leaderboards

- Profile names are trimmed, unique (case-insensitive for ASCII names), and 1–24 characters long.
- Creating a profile immediately selects it. Use Switch to choose another player. The ⋯ menu provides Rename and Delete; deletion requires confirmation and removes that profile’s saved runs only.
- Opening a game without a selected profile redirects to Profiles. No sample players or scores are added to the real database.
- Each completed run adds one row. A single JavaScript `resultSaved` flag prevents repeated saves from that completion. Restart resets the flag; abandoned runs are not saved. There are no run tokens, attempt IDs, or server-side replay registry.
- `active_profile_id` holds the selected player’s database ID. Create and Switch update it; deleting the active player selects the first remaining profile by ID, or clears it if none remain. Pages read that profile from SQLite and pass it explicitly to Jinja. Result JSON has no profile ID: `/results` saves to the profile currently selected in Python. There are no Flask sessions, selection cookies, secret key, request hooks, or context processors for profile selection.
- Save failures appear in the gameplay footer. Do not navigate away immediately after completion; wait for “Saved for …”.
- Classic progress counts distinct completed levels and sums the best stars for each level. Replaying a level cannot inflate the total best stars.
- Classic leaderboard: total best stars across levels. Time Attack leaderboard: best Net WPM, separately for 30/60/120/300 seconds. Survival leaderboard: longest active survival time. Equal scores are ordered by profile ID.
- Personal Progress shows best figures and the latest five completed runs per mode. Times are stored in UTC and displayed in IST.
- SQLite content and result queries stay in `database.py`, which imports only `sqlite3`. The existing typing, scrolling, timer, and damage engines stay in JavaScript; small completion/restart hooks call the shared result saver.

## Backend and Content Storage

The database is `typequest.db` in the project root. It is Git-ignored and can be rebuilt from the tracked `test/schema.sql` and `test/seed_data.json` files.

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

`test/seed.py` creates missing tables and inserts missing seed IDs. Repeating it does not duplicate rows or overwrite existing database edits. Ordinary Flask startup does not initialize or reseed the database. The seed fixture is for rebuilding; normal page requests read SQLite. Run it from the project root using `python -m test.seed`, not by running the file directly inside `test/`. Editing an existing ID in `test/seed_data.json` does not update that row in an existing database; update the database row separately when replacing existing content.

## Flask Routes

| URL | Page |
| --- | --- |
| `/` | Persistent outer document with shared audio and one fullscreen iframe |
| `/home` | Existing Home page inside the iframe |
| `/play` | Mode selection |
| `/classic-levels?tier=1` | Classic tiers and level cards |
| `/classic?level=1` | Selected Classic level |
| `/time-attack?duration=60` | Selected Time Attack duration |
| `/survival` | Survival |
| `/profiles` | Profile list and create/switch/rename/delete forms |
| `/settings` (GET/POST) | Volume sliders and automatic updates |
| `/progress` | Personal results; `?tab=leaderboard` opens rankings |
| `/results` (POST) | Save a completed game for the selected profile |

An invalid or unavailable Classic level shows the existing unavailable-level screen with HTTP 404. Invalid/unavailable tier selections fall back to Tier 1. Missing, invalid, or unsupported Time Attack durations default to 60 seconds.

Jinja renders Classic tier buttons and cards directly. Tier selection submits a normal GET form, preserving `?tier=` without rebuilding cards in JavaScript. Initial gameplay content is passed safely with Jinja's `tojson` filter. There are no asynchronous content-fetch requests. Completed runs are sent to `/results` using a small shared JavaScript saver. The POST includes the mode, level/duration where applicable, character counts, and active elapsed time. The selected profile comes from Python, not the request. Flask checks the basic values and calculates WPM, accuracy, and stars before inserting the result.

## Run Locally — Windows PowerShell

Use Python 3 and run these commands from the project root directory. The `test/` folder contains both database setup files and automated tests:

```powershell
# Open PowerShell in your cloned TypeQuest 2 folder first.
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m test.seed
python app.py
```

If `.venv` already exists on this device, skip its creation. Each teammate creates their own environment; do not copy a virtual environment from another laptop. Flask is the only listed dependency; pygame is not needed. Open [TypeQuest locally](http://127.0.0.1:5000/) in a desktop browser. Stop Flask with `Ctrl+C`.

If PowerShell prevents activation, use the environment's Python directly:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m test.seed
.\.venv\Scripts\python.exe app.py
```

Launch with `python app.py` so the first-profile startup selection runs. Debug mode remains enabled with `use_reloader=False`; restart manually after Python code edits. Open the root URL, `http://127.0.0.1:5000/`, to load the persistent outer page. The server itself never plays audio. Closing the tab stops its music while Flask keeps running; `Ctrl+C` stops Flask.

Serve the application through Flask. Opening template HTML directly, or using `python -m http.server`, will not render Jinja or load database content. Fonts load from Google Fonts; SVG icons are local.

## Setup on a Teammate's Device

Install Python 3 and Git, then clone the repository or pull the project updates. Open PowerShell in that checkout's root folder and follow the initial setup commands above. The folder path can differ from laptop to laptop.

- Keep `app.py`, `database.py`, all of `templates/`, and all of `static/` to run the website.
- Keep `requirements.txt` for installing dependencies.
- Keep `test/seed.py`, `test/schema.sql`, `test/seed_data.json`, and `test/__init__.py` for initial database setup or rebuilding a missing database.
- The two `test/test_*.py` files are optional for launching the website, but keep them in Git so everyone can run the checks.
- Keep `README.md` and `.gitignore` with the repository.
- Do not transfer `.venv/`, the unused `.venv-pygame/`, or `__pycache__/`. The new device creates its own environment and cache.

`typequest.db` is Git-ignored. Seeding creates it in the project root, not inside `test/`. A fresh database has game content but no profiles or saved results. Each teammate creates a profile in the browser; their records are independent of yours. Pulling code does not transfer anyone's profiles or progress.

After the first setup, launch normally from the project root:

```powershell
.\.venv\Scripts\python.exe app.py
```

Do not seed before every launch. Rerun setup when creating a missing database or applying the documented seed/schema updates. After later pulls, install requirements again if dependencies changed. Existing database edits and results survive repeat seeding.

## Tests

Run from the project root with the virtual environment activated:

```powershell
python -m unittest -v
```

Without activating it:

```powershell
.\.venv\Scripts\python.exe -m unittest -v
```

The `test/` package contains 24 tests in `test_backend.py` and `test_profiles_progress.py`. Default discovery finds them through `test/__init__.py`. Neither the tests nor the seed helper run during ordinary `python app.py` startup.

The tests use temporary SQLite databases and cover the full seed fixture, repeatable seeding without overwriting edits, foreign keys, routes, assets, tier/level validation, duration defaults, and safe JSON rendering. They do not change the application's database.

Browser verification during this migration also covered navigation, the six original page layouts, Classic completion, all Time Attack durations, and Survival scrolling, editing, damage, tiers, pause/resume, and restart. Timing scenarios used a controlled browser clock. Actual operating-system tab switching was not retested during this migration.

## Project Structure

```text
TypeQuest 2/
├── app.py                     # Flask routes, selected profile, global volumes and result saving
├── database.py                # SQLite connections and queries
├── requirements.txt           # Flask (includes Jinja2 as a dependency)
├── test/                      # Database setup files and automated tests
│   ├── __init__.py            # Allows module commands and default test discovery
│   ├── seed.py                # Explicit database initialization/seeding
│   ├── schema.sql             # Seven database tables
│   ├── seed_data.json         # Original content, tracked in Git
│   ├── test_backend.py        # Content and route tests
│   └── test_profiles_progress.py  # Profiles, results, stars, and leaderboards
├── typequest.db               # Local database, Git-ignored
├── templates/
│   ├── app.html                # Persistent outer document and fullscreen iframe
│   ├── index.html
│   ├── play.html
│   ├── classic-levels.html
│   ├── classic.html
│   ├── time-attack.html
│   ├── survival.html
│   ├── profiles.html
│   ├── progress.html
│   └── settings.html
├── static/
│   ├── js/
│   │   ├── audio.js           # Shared typing/UI sounds, loaded once by app.html
│   │   ├── background-music.js  # One music player belonging to the outer document
│   │   ├── home.js
│   │   ├── classic.js
│   │   ├── time-attack.js
│   │   ├── survival.js
│   │   ├── profiles.js
│   │   ├── results.js
│   │   └── settings.js
│   ├── audio/                   # Background/UI originals and louder typing WAVs
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

Profiles and completed results are now saved, with local rankings and progress pages. Tier unlocking, remaining Classic content, and a dedicated results page remain pending.

To update an existing database for this version, stop Flask, run `python -m test.seed`, and restart Flask. This adds the four new tables without deleting content, profiles, or results. `python -m unittest -v` now runs 24 tests, including exact unrounded star boundaries, profile CRUD, guest blocking, result validation, the simplified result endpoint, global profile selection across browser clients, cascade deletion, duration-specific rankings, and IST display. Browser checks cover the modal/list, navigation, completed Classic runs and restarts, all four Time Attack durations, Survival saves, and isolation between profiles.

### Simplified result saving

The save flow is now: game completes → check/set `resultSaved` → POST `/results` → require a selected profile and check basic count/time values → calculate statistics → insert a row. Restart sets `resultSaved = false`. Repeating a raw HTTP POST can create another row; normal duplicate completion calls are stopped by the JavaScript flag rather than database tokens.

Run `python -m test.seed` once after updating an older installation. It removes the old `run_id` columns while preserving existing progress IDs, profile links, scores, stars, times, and timestamps. Fresh databases use the simpler seven-table schema directly. The upgrade runs only during explicit initialization, not on ordinary Flask startup. Tests cover upgrading a populated old database and repeating initialization without losing history.

### Localhost backend approach

`app.py` contains the routes, profile form handling, the `active_profile_id` variable, and result calculations. `database.py` contains direct SQLite queries: reads open a connection, fetch rows, and close it; writes commit and always close the connection, including after an error. Foreign keys and the existing table constraints stay enabled. There is no extra service, repository, or validation layer.

The game decides when a run is complete. `/results` trusts the game's JSON field types, completion event, and elapsed time rather than checking passage length, exact challenge duration, numeric types, or extreme fabricated values again. It requires an existing selected profile and retains the supported mode check, nonnegative character counts, correct-count bounds, and positive playing time. The profile foreign key comes directly from `active_profile_id`, not from the browser. SQLite rejects invalid profile/level references and unsupported durations. Profile forms still check name length and report duplicate names. Ordinary malformed JSON is handled by Flask.

Accuracy, Net WPM, raw-accuracy Classic stars, and Survival tier calculations are unchanged. Templates, CSS, browser gameplay, the seven-table schema, and the explicit `test/seed.py` setup process are unchanged by this simplification.

### Settings milestone

Settings contains exactly three sliders, each from 0% to 100%: Game Volume for correct/wrong typing sounds, Tap Volume for UI/navigation clicks, and Background Music Volume for looping music. Game and Tap control the browser sound effects; Background Music controls the outer browser page’s player.

`app.py` stores `game_volume = 50`, `tap_volume = 70`, and `background_music_volume = 60`. GET `/settings` renders the current values and the selected profile. One JavaScript input handler updates the percentage and filled track immediately, adjusts the browser gain for Game or Tap, and sends the changed field to POST `/settings`. A Background Music change calls the same-origin parent’s `setMusicVolume()` to change its running GainNode, then saves the value to the Python variable through the existing POST. There is no Save button or page reload. Fields not included in that POST retain their current values.

Volumes are shared by all profiles, work without a selected profile, and reset to their defaults when Flask restarts. SQLite is unchanged. No settings table, cookies, or browser storage is used. All Settings navigation links now open `/settings`.

### Audio playback

The recordings live in `static/audio/`. Background music and UI tap recordings are unchanged; correct and wrong typing WAVs have their louder levels baked into the files, with matching average levels and their original durations, stereo channels, and sample rates. Flask has no Python audio player and requirements contain no pygame dependency.

GET `/` renders `templates/app.html`: a small parent document with one fullscreen, borderless iframe pointing to `/home`. `static/js/background-music.js` belongs only to this parent. The existing Home template remains `index.html`; its route is `/home`, and every existing `url_for('home')` link follows it inside the iframe.

Links, form submissions, redirects, progress filters, and the existing `window.location` gameplay navigation use the iframe’s own window. The outer document stays loaded. No SPA router, content rewriting, messages, timestamps, or browser storage are used. Focusing the iframe after load keeps Home’s Enter shortcut and gameplay keyboard input working; the outer title follows the current page title.

The parent fetches and decodes music once, then starts one guarded `AudioBufferSourceNode` with `loop = true`, connected to one GainNode. This repeats the decoded samples without timers or end/restart callbacks. Audio starts immediately when browser autoplay permits it; otherwise the shared interaction handler inside the iframe unlocks the parent’s audio contexts. Iframe navigation never recreates the music context, source, or gain.

The Settings page calls `window.parent.setMusicVolume()` directly because parent and iframe are same-origin. Its background slider changes the running parent gain immediately and continues POSTing to the existing Python `background_music_volume` variable. Game and Tap control the parent’s two sound-effect gains. `audio.js` is loaded once by `app.html`; the three effects are decoded once per outer page load. Gameplay pages call `window.parent.playSound()`, and Settings calls `window.parent.setAudioVolume()`. The shared click and unlock handlers attach to each iframe document when it loads. There is no per-page `_audio.html` include.

Refreshing the outer tab destroys the old player and starts a new document at Home, using the current volume from Flask. Closing the tab destroys its browser audio contexts, even while Flask keeps running. Merely loading a child URL directly, such as `/settings`, does not create a background player: enter the application at `/`.

Tests cover the parent route, Home route, shared effects assets, Python volume updates, import/startup without Python audio, existing profile selection/fallback, and the unchanged database/gameplay behavior. Browser checks exercise iframe navigation, profile forms, normal redirects, persistent music identity, independent volumes, loop samples, outer refresh, and tab closure. The existing missing `favicon.ico` request still returns 404.

Typing playback stays basic: decoded file → Game Volume gain → speakers. The extra per-sound gain boosts and runtime compressor have been removed. Loudness editing is done once in the typing WAVs, not while the game runs. Game Volume still controls both, including 0 for mute; UI taps and persistent background music retain their existing levels.
