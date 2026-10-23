# TypeQuest 2

**v1.0.0 — First playable frontend version**

TypeQuest 2 is a browser-based typing game for a college Design Thinking and Idea Lab project. It uses HTML, internal CSS, and vanilla JavaScript, with simple code that can be understood, modified, and explained during the lab presentation.

This milestone includes playable **Classic, Time Attack, and Survival** modes, along with Home, game selection, and Classic level selection. Gameplay and results run entirely in the browser. Results are not saved.

The current version is intended for **desktop and laptop browsers with a physical keyboard**. Mobile layouts are not implemented.

## What Works in This Version

| Area | Current status |
| --- | --- |
| Home | Begin button and Enter shortcut open game selection |
| Play | Opens all three modes and passes the selected Time Attack duration |
| Classic level selection | Loads tiers and levels from JavaScript data; Tiers 1–2 are available |
| Classic gameplay | Levels 1–20, passage completion, character feedback, stopwatch, Net WPM, and final statistics |
| Time Attack | 30-second, 1-minute, 2-minute, and 5-minute challenges with a continuous passage stream |
| Survival | Automatic scrolling, editable visible text, increasing difficulty, hearts, and GAME OVER |
| Shared gameplay controls | Pause/resume, Escape shortcut, automatic pause on focus loss, and restart |
| Results | Final statistics appear on the current gameplay page |

### Classic

- Five tiers are shown, with a planned total of 50 levels.
- Tiers 1 and 2 currently contain 10 playable levels each. Tiers 3–5 are disabled.
- Tier information, level headings, and passages come from `js/classic-data.js`.
- The multiline passage uses character coloring and a cursor that stays visible as the passage scrolls vertically.
- The stopwatch begins on the first typed character. Paused time is excluded.
- Typing moves forward; **Backspace is the way to move back and erase**. Left/Right Arrow editing is not used in Classic.
- Entering the full passage completes the level, even if incorrect characters remain.
- Completion freezes the clock and shows accuracy and Raw WPM alongside the Net WPM display.
- Stars, unlocking, and saved completion status are pending. Level cards show **Not attempted** because progress is not stored.

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
| Stars and progression | No earned stars, completion tracking, or progression-based unlocking |
| Saved results | No persistence between runs, page reloads, or browser sessions |
| Progress and leaderboard | Navigation placeholders; no statistics dashboard or local leaderboard |
| Profiles | No account system or profile management; the displayed username is a visual placeholder |
| Settings | Navigation placeholder with no settings page or functionality |
| Audio | The audio footer is decorative; game audio is not implemented |
| Backend | Flask integration is postponed |
| Database | SQLite integration is postponed; data currently comes from JavaScript objects and arrays |

The project currently makes no database or backend API calls and does not use browser storage to save game results. Some interface text describes planned features such as stars and unlocking; those are not functional in this version.

Mobile support, multiplayer, and a separate Practice mode are outside the current project scope.

## Run Locally

No frontend packages or build step are required. With Python installed, open a terminal in the project directory and run:

```powershell
python -m http.server 8000
```

Open [TypeQuest locally](http://localhost:8000/) in a desktop browser. Stop the server with `Ctrl+C`.

Python only serves the static files here; Flask is not needed to play this version. Fonts load from Google Fonts, so internet access is needed for the intended fonts. SVG icons are included locally.

## Project Structure

```text
TypeQuest 2/
├── index.html                 # Home
├── play.html                  # Game modes and Time Attack duration
├── classic-levels.html        # Tier and level selection
├── classic.html               # Classic gameplay
├── time-attack.html           # Time Attack gameplay
├── survival.html              # Survival gameplay
├── js/
│   ├── home.js
│   ├── classic-data.js        # Tier information, level titles, and passages
│   ├── classic-levels.js      # Builds tier buttons and level cards
│   ├── classic.js
│   ├── time-attack-data.js    # Supported durations and passage pool
│   ├── time-attack.js
│   ├── survival-data.js       # Speed, hearts, damage rules, and tier passage pools
│   └── survival.js
├── icons/                    # SVG files referenced as images
├── .gitignore
└── README.md
```

Each gameplay page has its own JavaScript file. Numbered character spans retain correct/incorrect status, and counters track results without recreating the visible passage on each keystroke.

## Development Approach

- Build playable browser functionality first; add Flask and SQLite later.
- Keep separate HTML pages, internal CSS, and straightforward vanilla JavaScript.
- Use editable JavaScript data objects and arrays until database integration is needed.
- Use four-space indentation, opening braces on the next line in JavaScript, and opening braces on the selector line in CSS.
- Use one-value `padding`/`margin` when all sides are equal, or four values when they differ.
- Keep static page backgrounds on `body`, icons in separate SVG files, and layouts focused on desktop/laptop screens.
- Preserve the supplied designs and favor code that can be explained line by line over frameworks or unnecessary abstractions.

This release marks the first version with all three core game modes playable. The remaining interface, content, progression, and persistence work is listed above.
