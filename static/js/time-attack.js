// Find the Time Attack controls in time-attack.html.
const typingArea = document.getElementById("typing-area");
const challengeTimeHeading = document.getElementById("challenge-time-heading");
const modeLabel = document.getElementById("mode-label");
const gameStatus = document.getElementById("game-status");
const footerMessage = document.getElementById("footer-message");
const net_wpm = document.getElementById("net-wpm");
const timer = document.getElementById("remaining-time");
const pauseButton = document.getElementById("pause-button");
const pauseBtnLabel = document.getElementById("pause_btn-label");
const pauseIcon = document.getElementById("pause-icon");
const restartButton = document.getElementById("restart-button");

// Window limits are character indexes; the cursor can move within them.
const HISTORY_CHARACTERS = 18;
const WINDOW_CHARACTERS = 60;
const durationMs = durationSeconds * 1000;
let windowStart = 0;
let windowEnd = 60;
let position = 0;
let furthestPosition = 0;
let generatedCount = 0;                 // the total number of character spans created so far
let typedCount = 0;                    // how many spans currently have either the correct or incorrect class
let correctCharacters = 0;
let cursorCharacter = null;          // Span carrying the cursor border

let passageOrder = [];              // stores a shuffled list of indexes of passages to be appended
let lastPassage = -1;              // remembers the index of the most recently appended passage

let gameState = "start";
let pausedState = "start";          // State to restore on Resume

// initial three-second countdown
let countdownRemaining = 3000;
let countdownSince = 0;

// Keep accumulated playing time separate from the current running period.
let activeMs = 0;
let lastTick = null;
let rawWpm = 0;
let accuracy = 0;
let wordsTyped = 0;

// Shuffle passage indexes and append numbered character spans.
function appendPassage()
{
    // Refill and reshuffle the list of passage indexes when it runs out.
    if (passageOrder.length === 0)
    {

        // Fill the list with every passage index

        for (let i = 0; i < passages.length; i++)
        {
            passageOrder.push(i);
        }

        // Shuffle the list using the Fisher-Yates algorithm
        for (let i = passageOrder.length - 1; i > 0; i--)
        {
            const randomIndex = Math.floor(Math.random() * (i + 1));
            const temporary = passageOrder[i];
            passageOrder[i] = passageOrder[randomIndex];
            passageOrder[randomIndex] = temporary;
        }

        if (passageOrder.length > 1 && passageOrder[0] === lastPassage)
        {
            const temporary = passageOrder[0];
            passageOrder[0] = passageOrder[1];
            passageOrder[1] = temporary;
        }
    }

    const passageIndex = passageOrder.shift();                  // remove the 1st index from the shuffled list
    let passage = passages[passageIndex];
    lastPassage = passageIndex;

    // adds a space in front of the passage only if it is not the first one
    if (generatedCount > 0)
    {
        passage = " " + passage;
    }

    for (let i = 0; i < passage.length; i++)
    {
        const character = document.createElement("span");
        character.id = "char-" + generatedCount;
        character.className = "typing-character";
        character.textContent = passage[i];

        if (generatedCount < windowStart || generatedCount >= windowEnd)
        {
            character.classList.add("hidden-character");
        }

        typingArea.appendChild(character);
        generatedCount++;
    }
}

// Keep at least 60 generated characters beyond the typing frontier.
function ensureText()
{
    while (generatedCount - furthestPosition < WINDOW_CHARACTERS)
    {
        appendPassage();
    }
}

// Show and hide only spans entering or leaving the 60-character window.
function shiftWindow(newStart)
{
    while (windowStart < newStart)
    {
        document.getElementById("char-" + windowStart).classList.add("hidden-character");
        document.getElementById("char-" + windowEnd).classList.remove("hidden-character");
        windowStart++;
        windowEnd++;
    }

    while (windowStart > newStart)
    {
        windowStart--;
        windowEnd--;
        document.getElementById("char-" + windowStart).classList.remove("hidden-character");
        document.getElementById("char-" + windowEnd).classList.add("hidden-character");
    }
}

// Move the cursor border and keep it inside the typing area.
function updateCursor()
{
    // Remove the old cursor
    if (cursorCharacter !== null)
    {
        cursorCharacter.classList.remove("current-character");
    }

    // If the game has ended, hide cursor
    if (gameState === "end")
    {
        cursorCharacter = null;
        return;
    }

    // Shift the window if the cursor is outside the visible range
    if (position < windowStart)
    {
        shiftWindow(position);
    }
    else if (position >= windowEnd)
    {
        shiftWindow(position - WINDOW_CHARACTERS + 1);
    }

    // Place the cursor on the current character
    cursorCharacter = document.getElementById("char-" + position);
    cursorCharacter.classList.add("current-character");

    // Keep the cursor before the existing 60px fade at the right edge.
    const visibleWidth = typingArea.clientWidth - 60;

    if (cursorCharacter.offsetLeft + 3 > visibleWidth)
    {
        const characterWidth = cursorCharacter.getBoundingClientRect().width;
        const shift = Math.ceil((cursorCharacter.offsetLeft + 3 - visibleWidth) / characterWidth);
        shiftWindow(windowStart + shift);
    }
}

// Return playing time in milliseconds, excluding pauses.
function getActiveTime()
{
    if (lastTick === null)
    {
        return activeMs;
    }

    return activeMs + (performance.now() - lastTick);
}

// Start or resume an active playing period.
function startTimer(startTime = performance.now())
{
    if (lastTick === null)
    {
        lastTick = startTime;
    }
}

// Accumulate the current playing period, then stop the clock.
function stopTimer()
{
    if (lastTick !== null)
    {
        activeMs += performance.now() - lastTick;
        lastTick = null;
    }
}

// Clear the accumulated time and running timestamp.
function resetTimer()
{
    activeMs = 0;
    lastTick = null;
}

// Format time as MM:SS.tenths, rounding up.
function formatRemaining(milliseconds)
{
    const tenths = Math.ceil(Math.max(0, milliseconds) / 100);
    let minutes = Math.floor(tenths / 600);
    let seconds = Math.floor(tenths / 10) % 60;
    const fraction = tenths % 10;

    if (minutes < 10)
    {
        minutes = "0" + minutes;
    }

    if (seconds < 10)
    {
        seconds = "0" + seconds;
    }

    return minutes + ":" + seconds + "." + fraction;
}

// Calculate statistics and update Net WPM and remaining time.
function updateStats()
{
    const elapsed = Math.min(durationMs, getActiveTime());
    const remainingMs = Math.max(0, durationMs - getActiveTime());
    rawWpm = 0;
    accuracy = 0;

    if (elapsed > 0)
    {
        rawWpm = (typedCount / 5) / (elapsed / 60000);
    }

    if (typedCount > 0)
    {
        accuracy = correctCharacters / typedCount;
    }

    const netWpm = rawWpm * accuracy;
    const formattedSpeed = netWpm.toFixed(1);
    net_wpm.textContent = formattedSpeed;
    net_wpm.style.fontSize = "";

    if (formattedSpeed.length > 4)
    {
        net_wpm.style.fontSize = Math.floor(520 / formattedSpeed.length) + "px";
    }

    timer.textContent = formatRemaining(remainingMs);
}

// Set buttons, status and footer text for the current game state.
function updateInterface()
{
    const completedMessage = footerMessage.textContent;
    pauseButton.disabled = gameState === "start" || gameState === "end";
    restartButton.disabled = false;
    pauseBtnLabel.textContent = "Pause";
    pauseIcon.src = iconBase + "pause.svg";
    typingArea.classList.remove("paused");
    footerMessage.textContent = "ESC · PAUSE";

    if (gameState === "start")
    {
        const remaining = Math.max(0, countdownRemaining - (performance.now() - countdownSince));
        gameStatus.textContent = "STARTING IN " + Math.ceil(remaining / 1000);
    }
    else if (gameState === "play")
    {
        gameStatus.textContent = "IN PLAY";
    }
    else if (gameState === "pause")
    {
        gameStatus.textContent = "PAUSED";
        footerMessage.textContent = "ESC · RESUME";
        pauseBtnLabel.textContent = "Resume";
        pauseIcon.src = iconBase + "resume.svg";
        typingArea.classList.add("paused");
    }
    else
    {
        if (completedMessage.includes(" · Saved for ") || completedMessage.includes(" · Not saved: "))
        {
            footerMessage.textContent = completedMessage;
            return;
        }
        gameStatus.textContent = "TIME UP";
        footerMessage.textContent = "TIME UP · ACCURACY " + (accuracy * 100).toFixed(1) + "% · RAW WPM " + rawWpm.toFixed(1) + " · WORDS " + wordsTyped;
    }
}

// Freeze at the selected duration and call results.js to save.
function finishGame()
{
    stopTimer();
    activeMs = durationMs;
    gameState = "end";
    updateCursor();
    saveGameResult(typedCount, correctCharacters, getActiveTime(), 0);
}

// Advance the countdown, check time expiry and refresh the display.
function updateGame()
{
    const now = performance.now();

    if (gameState === "start" && now >= countdownSince + countdownRemaining)
    {
        startTimer(countdownSince + countdownRemaining);
        countdownRemaining = 0;
        gameState = "play";
        typingArea.focus();
    }

    if (gameState === "play" && getActiveTime() >= durationMs)
    {
        finishGame();
    }

    updateStats();
    updateInterface();
}

// Handle characters, corrections and allowed cursor movement.
function handleTyping(event)
{
    updateGame();

    if (event.ctrlKey || event.altKey || event.metaKey)
    {
        return;
    }

    if (event.key === "Enter")
    {
        event.preventDefault();
        return;
    }

    if (gameState !== "play")
    {
        if (event.key.length === 1 || event.key === "Backspace" || event.key === "ArrowLeft" || event.key === "ArrowRight")
        {
            event.preventDefault();
        }

        return;
    }

    let changed = false;

    if (event.key === "Backspace")
    {
        event.preventDefault();

        if (position > 0)
        {
            position--;
            const character = document.getElementById("char-" + position);
            const wasCorrect = character.classList.contains("correct");
            const wasIncorrect = character.classList.contains("incorrect");

            if (wasCorrect)
            {
                correctCharacters--;
            }

            if (wasCorrect || wasIncorrect)
            {
                typedCount--;

                if (character.textContent === " ")
                {
                    wordsTyped--;
                }
            }

            character.classList.remove("correct", "incorrect");
            changed = true;
        }
    }
    else if (event.key === "ArrowLeft")
    {
        event.preventDefault();

        if (position > 0)
        {
            position--;
            changed = true;
        }
    }
    else if (event.key === "ArrowRight")
    {
        event.preventDefault();

        if (position < furthestPosition)
        {
            position++;
            changed = true;
        }
    }
    else if (event.key.length === 1 && !event.repeat)
    {
        event.preventDefault();
        const character = document.getElementById("char-" + position);
        const wasCorrect = character.classList.contains("correct");
        const wasIncorrect = character.classList.contains("incorrect");

        if (!wasCorrect && !wasIncorrect)
        {
            typedCount++;

            // Count entered space positions as word separators.
            if (character.textContent === " ")
            {
                wordsTyped++;
            }
        }

        if (event.key === character.textContent)
        {
            window.parent.playSound("correct_key", "game_volume");
            if (!wasCorrect)
            {
                correctCharacters++;
            }

            character.classList.remove("incorrect");
            character.classList.add("correct");
        }
        else
        {
            window.parent.playSound("wrong_key", "game_volume");
            if (wasCorrect)
            {
                correctCharacters--;
            }

            character.classList.remove("correct");
            character.classList.add("incorrect");
        }

        position++;

        if (position > furthestPosition)
        {
            furthestPosition = position;
            ensureText();
            // keeps 18 character positions behind the cursor visible during normal typing
            shiftWindow(Math.max(0, position - HISTORY_CHARACTERS));
        }

        changed = true;
    }

    if (changed)
    {
        updateCursor();
        updateGame();
    }
}

// Freeze active play, or remember the remaining countdown.
function pauseGame()
{
    updateGame();

    if (gameState !== "start" && gameState !== "play")
    {
        return;
    }

    pausedState = gameState;

    if (gameState === "start")
    {
        countdownRemaining = Math.max(0, countdownRemaining - (performance.now() - countdownSince));
    }
    else
    {
        stopTimer();
    }

    gameState = "pause";
    updateStats();
    updateInterface();
}

// Resume the saved state and return focus to the typing area.
function resumeGame()
{
    gameState = pausedState;

    if (gameState === "start")
    {
        countdownSince = performance.now();
    }
    else
    {
        startTimer();
    }

    updateGame();
    typingArea.focus();
}

// Use the same pause/resume action for the button and Escape.
function togglePause()
{
    if (gameState === "end")
    {
        return;
    }

    if (gameState === "pause")
    {
        resumeGame();
    }
    else
    {
        pauseGame();
    }
}

// Reset the stream, counters and timer for a new countdown.
function restartGame()
{
    resultSaved = false;
    typingArea.innerHTML = "";
    windowStart = 0;
    windowEnd = 60;
    position = 0;
    furthestPosition = 0;
    generatedCount = 0;
    typedCount = 0;
    correctCharacters = 0;
    cursorCharacter = null;
    passageOrder = [];
    wordsTyped = 0;
    gameState = "start";
    pausedState = "start";
    countdownRemaining = 3000;
    countdownSince = performance.now();
    resetTimer();
    ensureText();
    updateCursor();
    updateGame();
    typingArea.focus();
}

// Toggle pause on Escape; ignore a held-down key.
function handleShortcut(event)
{
    if (event.key === "Escape" && !event.repeat)
    {
        event.preventDefault();
        togglePause();
    }
}

// Pause when this document becomes hidden.
function handleVisibilityChange()
{
    if (document.hidden)
    {
        pauseGame();
    }
}

// Require character-by-character input.
function preventPaste(event)
{
    event.preventDefault();
}

// durationSeconds and passages come from the Jinja template.
let durationTitle = "30-second challenge";
let durationLabel = "30 SEC";

if (durationSeconds >= 60)
{
    const minutes = durationSeconds / 60;
    durationTitle = minutes + "-minute challenge";
    durationLabel = minutes + " MIN";
}

challengeTimeHeading.textContent = durationTitle;
modeLabel.textContent = "TIME ATTACK / " + durationLabel;
document.title = durationTitle + " — TypeQuest";

// Connect controls, then begin the first countdown.
typingArea.addEventListener("keydown", handleTyping);
typingArea.addEventListener("paste", preventPaste);
pauseButton.addEventListener("click", togglePause);
restartButton.addEventListener("click", restartGame);
document.addEventListener("keydown", handleShortcut);
window.addEventListener("blur", pauseGame);
document.addEventListener("visibilitychange", handleVisibilityChange);
restartGame();

if (document.hidden)
{
    pauseGame();
}

setInterval(updateGame, 50);
