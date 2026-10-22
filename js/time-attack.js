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

const HISTORY_CHARACTERS = 18;
const WINDOW_CHARACTERS = 60;
const parameters = new URLSearchParams(window.location.search);
const requestedDuration = Number(parameters.get("duration"));
let durationSeconds = 60;

for (let i = 0; i < timeAttackData.durations.length; i++)
{
    if (timeAttackData.durations[i] === requestedDuration)
    {
        durationSeconds = requestedDuration;
    }
}

const durationMs = durationSeconds * 1000;
let windowStart = 0;
let windowEnd = 60;
let position = 0;
let furthestPosition = 0;
let generatedCount = 0;                 // the total number of character spans created so far
let typedCount = 0;                    // how many spans currently have either the correct or incorrect class
let correctCharacters = 0;
let cursorCharacter = null;          // a reference to the span currently displaying the cursor's left border

let passageOrder = [];              // stores a shuffled list of indexes of passages to be appended
let lastPassage = -1;              // remembers the index of the most recently appended passage

let gameState = "start";
let pausedState = "start";          // remembers whether Pause interrupted the starting countdown or active gameplay

// initial three-second countdown
let countdownRemaining = 3000;
let countdownSince = 0;

let activeMs = 0;
let lastTick = null;
let rawWpm = 0;
let accuracy = 0;
let wordsTyped = 0;

// Use every passage once per shuffled cycle, avoiding repetition at the join.
function appendPassage()
{
    // Refill and reshuffle the list of passage indexes when it runs out.
    if (passageOrder.length === 0)
    {

        // Fill the list with every passage index

        for (let i = 0; i < timeAttackData.passages.length; i++)
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
    let passage = timeAttackData.passages[passageIndex];
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

// Append only enough passages to keep 60 characters ahead of the typing frontier.
function ensureText()
{
    while (generatedCount - furthestPosition < WINDOW_CHARACTERS)
    {
        appendPassage();
    }
}

// moves the 60-character visible window forward or backward.
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

// Update the cursor's position and ensure it is visible within the 60-character window
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

// Return the total active time in milliseconds, including the current tick if the timer is running
function getActiveTime()
{
    if (lastTick === null)
    {
        return activeMs;
    }

    return activeMs + (performance.now() - lastTick);
}

// Start the timer if it is not already running, using the provided start time or the current time
function startTimer(startTime = performance.now())
{
    if (lastTick === null)
    {
        lastTick = startTime;
    }
}

function stopTimer()
{
    if (lastTick !== null)
    {
        activeMs += performance.now() - lastTick;
        lastTick = null;
    }
}

function resetTimer()
{
    activeMs = 0;
    lastTick = null;
}

// Format the remaining time as MM:SS.tenths, rounding up to the next tenth of a second
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

// Update the WPM, accuracy, and remaining time displays based on the current game state
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

// Update the interface to reflect the current game state, including button states and messages
function updateInterface()
{
    pauseButton.disabled = gameState === "start" || gameState === "end";
    restartButton.disabled = false;
    pauseBtnLabel.textContent = "Pause";
    pauseIcon.src = "icons/pause.svg";
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
        pauseIcon.src = "icons/resume.svg";
        typingArea.classList.add("paused");
    }
    else
    {
        gameStatus.textContent = "TIME UP";
        footerMessage.textContent = "TIME UP · ACCURACY " + (accuracy * 100).toFixed(1) + "% · RAW WPM " + rawWpm.toFixed(1) + " · WORDS " + wordsTyped;
    }
}

// Stop the timer, set the active time to the full duration, and transition to the end state
function finishGame()
{
    stopTimer();
    activeMs = durationMs;
    gameState = "end";
    updateCursor();
}

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

// Handle typing input, cursor movement, and backspace corrections
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

            // Preserve the old word count: entered positions whose original text is a space.
            if (character.textContent === " ")
            {
                wordsTyped++;
            }
        }

        if (event.key === character.textContent)
        {
            if (!wasCorrect)
            {
                correctCharacters++;
            }

            character.classList.remove("incorrect");
            character.classList.add("correct");
        }
        else
        {
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

// Remember whether Pause interrupted the starting countdown or active gameplay.
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

// Only Restart clears the spans. Every run begins with a fresh three-second countdown.
function restartGame()
{
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

function handleShortcut(event)
{
    if (event.key === "Escape" && !event.repeat)
    {
        event.preventDefault();
        togglePause();
    }
}

function handleVisibilityChange()
{
    if (document.hidden)
    {
        pauseGame();
    }
}

function preventPaste(event)
{
    event.preventDefault();
}

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
