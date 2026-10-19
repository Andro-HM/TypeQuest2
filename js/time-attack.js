const typingArea = document.getElementById("typing-area");
const challengeTitle = document.getElementById("challenge-title");
const modeLabel = document.getElementById("mode-label");
const gameStatus = document.getElementById("game-status");
const gameMessage = document.getElementById("game-message");
const speedDisplay = document.getElementById("net-wpm");
const timeDisplay = document.getElementById("remaining-time");
const pauseButton = document.getElementById("pause-button");
const pauseLabel = document.getElementById("pause-label");
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

const durationMilliseconds = durationSeconds * 1000;
let targetText = "";
let typedText = "";
let cursorPosition = 0;
let lastPassage = -1;
let phase = "countdown";
let countdownRemaining = 3000;
let countdownSince = 0;
let elapsedBeforeRun = 0;
let runningSince = null;
let rawWpm = 0;
let accuracy = 0;
let wordsTyped = 0;

// Shuffle a full cycle so each passage appears once before the next cycle.
function appendPassages()
{
    const order = [];

    for (let i = 0; i < timeAttackData.passages.length; i++)
    {
        order.push(i);
    }

    for (let i = order.length - 1; i > 0; i--)
    {
        const randomIndex = Math.floor(Math.random() * (i + 1));
        const temporary = order[i];
        order[i] = order[randomIndex];
        order[randomIndex] = temporary;
    }

    if (order.length > 1 && order[0] === lastPassage)
    {
        const temporary = order[0];
        order[0] = order[1];
        order[1] = temporary;
    }

    for (let i = 0; i < order.length; i++)
    {
        if (targetText.length > 0)
        {
            targetText += " ";
        }

        targetText += timeAttackData.passages[order[i]];
    }

    lastPassage = order[order.length - 1];
}

// Add another shuffled cycle before the player reaches the end of the stream.
function ensureText(minimumLength)
{
    while (targetText.length < minimumLength)
    {
        appendPassages();
    }
}

// Keep 18 entered characters behind the cursor in a 60-character strip.
function renderStrip()
{
    typingArea.innerHTML = "";
    const windowStart = typedText.length - HISTORY_CHARACTERS;

    for (let column = 0; column < WINDOW_CHARACTERS; column++)
    {
        const index = windowStart + column;
        const character = document.createElement("span");
        character.className = "typing-character";
        character.textContent = " ";

        if (index >= 0 && index < targetText.length)
        {
            character.textContent = targetText[index];

            if (index < typedText.length)
            {
                if (typedText[index] === targetText[index])
                {
                    character.classList.add("correct");
                }
                else
                {
                    character.classList.add("incorrect");
                }
            }
        }

        if (index === cursorPosition)
        {
            character.classList.add("current-character");
        }

        typingArea.appendChild(character);
    }
}

// Paused time is excluded from the run.
function getActiveTime(now)
{
    if (runningSince === null)
    {
        return elapsedBeforeRun;
    }

    return elapsedBeforeRun + now - runningSince;
}

// Round up to tenths so 00:00.0 appears only when time has actually run out.
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

// Match Classic and the old Time Attack: retained characters and their accuracy.
function updateStats(now)
{
    const elapsed = Math.min(durationMilliseconds, getActiveTime(now));
    let correctCharacters = 0;

    for (let i = 0; i < typedText.length; i++)
    {
        if (typedText[i] === targetText[i])
        {
            correctCharacters++;
        }
    }

    rawWpm = 0;
    accuracy = 0;

    if (elapsed > 0)
    {
        rawWpm = typedText.length / 5 / (elapsed / 60000);
    }

    if (typedText.length > 0)
    {
        accuracy = correctCharacters / typedText.length;
    }

    const formattedSpeed = (rawWpm * accuracy).toFixed(1);
    speedDisplay.textContent = formattedSpeed;
    speedDisplay.style.fontSize = "";

    if (formattedSpeed.length > 4)
    {
        speedDisplay.style.fontSize = Math.floor(520 / formattedSpeed.length) + "px";
    }

    timeDisplay.textContent = formatRemaining(durationMilliseconds - elapsed);
}

// Stop exactly at the selected duration and keep the result on this page.
function finishGame()
{
    phase = "finished";
    elapsedBeforeRun = durationMilliseconds;
    runningSince = null;
    wordsTyped = 0;

    for (let i = 0; i < typedText.length; i++)
    {
        if (targetText[i] === " ")
        {
            wordsTyped++;
        }
    }
}

// The three-second countdown is separate from the selected playing duration.
function updateGame(now = performance.now())
{

    if (phase === "countdown" && now >= countdownSince + countdownRemaining)
    {
        runningSince = countdownSince + countdownRemaining;
        countdownRemaining = 0;
        phase = "running";
        typingArea.focus();
    }

    if (phase === "running" && getActiveTime(now) >= durationMilliseconds)
    {
        finishGame();
    }

    updateStats(now);
    gameMessage.textContent = "ESC · PAUSE";

    if (phase === "countdown")
    {
        const seconds = Math.ceil(Math.max(0, countdownRemaining - (now - countdownSince)) / 1000);
        gameStatus.textContent = "STARTING IN " + seconds;
        pauseButton.disabled = true;
    }
    else if (phase === "paused-countdown" || phase === "paused-running")
    {
        gameStatus.textContent = "PAUSED";
        gameMessage.textContent = "ESC · RESUME";
        pauseButton.disabled = false;
    }
    else if (phase === "running")
    {
        gameStatus.textContent = "IN PLAY";
        pauseButton.disabled = false;
    }
    else
    {
        gameStatus.textContent = "TIME UP";
        pauseButton.disabled = true;
        gameMessage.textContent = "TIME UP · ACCURACY " + (accuracy * 100).toFixed(1) + "% · RAW WPM " + rawWpm.toFixed(1) + " · WORDS " + wordsTyped;
    }
}

// Only accept typing during the active run, including at the final deadline.
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

    if (phase !== "running")
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

        if (cursorPosition > 0)
        {
            typedText = typedText.slice(0, cursorPosition - 1) + typedText.slice(cursorPosition);
            cursorPosition--;
            changed = true;
        }
    }
    else if (event.key === "ArrowLeft")
    {
        event.preventDefault();
        const firstVisiblePosition = Math.max(0, typedText.length - HISTORY_CHARACTERS);

        if (cursorPosition > firstVisiblePosition)
        {
            cursorPosition--;
            changed = true;
        }
    }
    else if (event.key === "ArrowRight")
    {
        event.preventDefault();

        if (cursorPosition < typedText.length)
        {
            cursorPosition++;
            changed = true;
        }
    }
    else if (event.key.length === 1 && !event.repeat)
    {
        event.preventDefault();
        ensureText(typedText.length + WINDOW_CHARACTERS + 1);

        if (cursorPosition === typedText.length)
        {
            typedText += event.key;
        }
        else
        {
            typedText = typedText.slice(0, cursorPosition) + event.key + typedText.slice(cursorPosition + 1);
        }

        cursorPosition++;
        changed = true;
    }

    if (changed)
    {
        renderStrip();
        updateGame();
    }
}

// Freeze whichever phase is currently active.
function pauseGame()
{
    const now = performance.now();
    updateGame(now);

    if (phase === "countdown")
    {
        countdownRemaining = Math.max(0, countdownRemaining - (now - countdownSince));
        phase = "paused-countdown";
    }
    else if (phase === "running")
    {
        elapsedBeforeRun = Math.min(durationMilliseconds, getActiveTime(now));
        runningSince = null;
        phase = "paused-running";
    }

    if (phase === "paused-countdown" || phase === "paused-running")
    {
        pauseLabel.textContent = "Resume";
        pauseIcon.src = "icons/resume.svg";
        typingArea.classList.add("paused");
    }

    updateGame(now);
}

function resumeGame()
{
    if (phase === "paused-countdown")
    {
        countdownSince = performance.now();
        phase = "countdown";
    }
    else if (phase === "paused-running")
    {
        runningSince = performance.now();
        phase = "running";
    }

    pauseLabel.textContent = "Pause";
    pauseIcon.src = "icons/pause.svg";
    typingArea.classList.remove("paused");
    updateGame();
    typingArea.focus();
}

function togglePause()
{
    if (phase === "paused-countdown" || phase === "paused-running")
    {
        resumeGame();
    }
    else
    {
        pauseGame();
    }
}

// Restart with a fresh shuffled stream and a new three-second countdown.
function restartGame()
{
    targetText = "";
    typedText = "";
    cursorPosition = 0;
    lastPassage = -1;
    phase = "countdown";
    countdownRemaining = 3000;
    countdownSince = performance.now();
    elapsedBeforeRun = 0;
    runningSince = null;
    wordsTyped = 0;
    pauseLabel.textContent = "Pause";
    pauseIcon.src = "icons/pause.svg";
    typingArea.classList.remove("paused");
    ensureText(WINDOW_CHARACTERS);
    renderStrip();
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

challengeTitle.textContent = durationTitle;
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
