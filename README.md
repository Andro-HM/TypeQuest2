# TypeQuest 2

A browser-based typing game for a college Design Thinking and Idea Lab project, built with HTML, CSS, and vanilla JavaScript.

This version includes the Home page, game mode selection, Classic level selection, and playable Classic, Time Attack, and Survival modes. Gameplay runs entirely in the browser. Nothing is saved between runs or page reloads.

## Current Features

### Home and Game Selection

- Begin button and Enter shortcut open the Play page.
- Play provides links to all three game modes.
- Time Attack offers 30 seconds, 1 minute, 2 minutes, and 5 minutes.
- Pages follow a consistent light white, blue, and teal theme with responsive layouts.

### Classic

- Five tiers are displayed in level selection.
- Tiers 1 and 2 are available, with 10 levels each: levels 1–20 are playable.
- Tiers 3–5 are disabled for now. The planned total is 50 levels.
- Tier information, level titles, and passages load from a JavaScript data object.
- The selected level opens a multiline typing passage with character coloring, a cursor, elapsed time, and live Net WPM.
- The timer starts on the first typed character.
- The passage scrolls vertically to keep the cursor visible.
- Entering the full passage ends the run, even if mistakes remain. Final figures appear on the same page.
- Stars, unlocking, and completion tracking are not implemented. Level cards currently show “Not attempted.”

### Time Attack

- The selected duration carries over from Play.
- A three-second countdown precedes the playing timer.
- Shuffled passages provide a continuous stream of text.
- A single-line strip advances as the player types, retaining a short history for corrections.
- Remaining time and Net WPM update during play.
- Input stops when the selected duration expires, and final figures appear on the same page.
- Changes in the width of the WPM number do not shift the typing area.

### Survival

- A three-second countdown starts the run with three hearts.
- Text automatically moves left, independently of how fast the player types.
- Characters can be corrected while they remain in the typing area.
- Once a character completely leaves the left edge, its result is finalized: correct characters cause no miss; incorrect or untyped characters count as misses.
- The cursor and editing stay within the visible typing area. Passed characters cannot be changed.
- Text speed increases gradually, and the tier advances each minute up to Tier 5.
- Newly appended passages come from the current tier; already queued text continues naturally.

| Active playing time | Tier | Text speed at that point | Misses per half-heart |
| --- | --- | --- | --- |
| Start | 1 | 1.5 characters/second | 6 |
| 1 minute | 2 | 2 characters/second | 5 |
| 2 minutes | 3 | 2.5 characters/second | 4 |
| 3 minutes | 4 | 3 characters/second | 3 |
| 4 minutes | 5 | 3.5 characters/second | 2 |
| 5 minutes onward | 5 | 4 characters/second | 1 |

Speed increases continuously between these points and caps at 4 characters per second. Misses accumulate rather than needing to be consecutive. The miss counter resets after damage and at each new minute; correct characters do not reset it. Losing all hearts ends the run.

Survival rules and tier-based passage pools are editable in `js/survival-data.js`.

## Gameplay Controls and Feedback

| Control | Action |
| --- | --- |
| Character keys | Enter text; overwrite a position when correcting earlier text |
| Left / Right arrows | Move through editable entered text |
| Backspace | Remove the character before the cursor within the editable area |
| Pause / Resume button or Escape | Pause or resume the run |
| Restart | Reset the current run |
| Levels / Modes and Home links | Return to level selection, game selection, or Home |

- Correct characters appear green, incorrect characters receive red styling, and untouched text remains muted.
- Paused time is excluded from the playing clock. Switching tabs or leaving the browser automatically pauses an active run.
- Paste is blocked in the typing areas.
- Five characters count as one word. Net WPM is typing rate adjusted by accuracy. Survival also includes passed, untyped positions in its accuracy calculation.

## Run Locally

No frontend installation or build step is required. From the project directory, start a static server with Python:

```powershell
python -m http.server 8000
```

Open [http://localhost:8000](http://localhost:8000) in a browser. Stop the server with `Ctrl+C`.

This command only serves the frontend files; Flask is not required for this version. Fonts load from Google Fonts.

## Project Structure

```text
TypeQuest 2/
├── index.html
├── play.html
├── classic-levels.html
├── classic.html
├── time-attack.html
├── survival.html
├── js/
│   ├── home.js
│   ├── classic-data.js
│   ├── classic-levels.js
│   ├── classic.js
│   ├── time-attack-data.js
│   ├── time-attack.js
│   ├── survival-data.js
│   └── survival.js
├── icons/
├── .gitignore
└── README.md
```

Pages use internal CSS and separate JavaScript files for gameplay. SVG icons are stored in `icons/` and referenced as images. Passages and level information currently come from editable JavaScript arrays and objects.

## Not Implemented Yet

- Dedicated results screens; results currently stay on the gameplay pages.
- Classic level content for Tiers 3–5.
- Final passage seeding; current content can be replaced later.
- Stars, level unlocking, and saved progress.
- Progress statistics and the planned local leaderboard.
- Profile management and Settings functionality.
- Flask and SQLite integration.

Progress, Profiles, and Settings are currently navigation placeholders. The displayed username and audio footer are visual elements, without account or audio functionality. There are no accounts, database calls, or browser storage for game results in this version.
