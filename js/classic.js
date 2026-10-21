const typingArea = document.getElementById("typing-area");
const levelHeading = document.getElementById("level-heading");
const levelNo = document.getElementById("level-no");
const levelsButton = document.getElementById("levels-button");
const gameStatus = document.getElementById("game-status");
const footerMessage = document.getElementById("footer-message");
const net_wpm = document.getElementById("net-wpm");
const stopwatch = document.getElementById("stopwatch");
const pauseButton = document.getElementById("pause-button");
const pauseBtnLabel = document.getElementById("pause_btn-label");
const pauseIcon = document.getElementById("pause-icon");
const restartButton = document.getElementById("restart-button");

let selectedTier = 1;
let position = 0;
let correctCharacters = 0;
let gameState = "start";
let cursorCharacter = null;
let elapsedBeforeRun = 0;
let runningSince = null;
let rawWpm = 0;
let accuracy = 0;

const parameters = new URLSearchParams(window.location.search);
const levelNumber = Number(parameters.get("level") || 1);
const level = findLevel(levelNumber);

// Find an available level in the shared JavaScript data object.
function findLevel(number)
{
    for (let i = 0; i < classicData.tiers.length; i++)
    {
        const tier = classicData.tiers[i];

        if (tier.available)
        {
            for (let j = 0; j < tier.levels.length; j++)
            {
                if (tier.levels[j].number === number)
                {
                    selectedTier = tier.number;
                    return tier.levels[j];
                }
            }
        }
    }

    return null;
}

// Count only time spent playing, leaving paused time out.
function getActiveTime()
{
    if (runningSince === null)
    {
        return elapsedBeforeRun;
    }

    return elapsedBeforeRun + performance.now() - runningSince;
}

// Show the clock as minutes and seconds.
function formatTime(milliseconds)
{
    const totalSeconds = Math.floor(milliseconds / 1000);
    let minutes = Math.floor(totalSeconds / 60);
    let seconds = totalSeconds % 60;

    if (minutes < 10)
    {
        minutes = "0" + minutes;
    }

    if (seconds < 10)
    {
        seconds = "0" + seconds;
    }

    return minutes + ":" + seconds;
}

// Use the retained character counters; five characters make one word.
function updateStats()
{
    const elapsed = getActiveTime();
    rawWpm = 0;
    accuracy = 0;

    if (elapsed > 0)
    {
        rawWpm = (position / 5) / (elapsed / 60000);
    }

    if (position > 0)
    {
        accuracy = correctCharacters / position;
    }

    const netWpm = rawWpm * accuracy;
    const formattedSpeed = netWpm.toFixed(1);
    net_wpm.textContent = formattedSpeed;
    net_wpm.style.fontSize = "";

    // Keep large speed readings inside the metric column.
    if (formattedSpeed.length > 4)
    {
        net_wpm.style.fontSize = Math.floor(520 / formattedSpeed.length) + "px";
    }

    stopwatch.textContent = formatTime(elapsed);
}

// Create the passage once. Typing and Restart reuse these numbered spans.
function createPassage()
{
    for (let i = 0; i < level.content.length; i++)
    {
        const character = document.createElement("span");
        character.id = "char-" + i;
        character.textContent = level.content[i];
        typingArea.appendChild(character);
    }
}

// Move one border between the existing spans and keep it visible while scrolling.
function updateCursor()
{
    if (cursorCharacter !== null)
    {
        cursorCharacter.classList.remove("cursor-start", "cursor-after");
    }

    if (gameState === "end")
    {
        cursorCharacter = null;
        return;
    }

    if (position === 0)
    {
        cursorCharacter = document.getElementById("char-0");
        cursorCharacter.classList.add("cursor-start");
    }
    else
    {
        cursorCharacter = document.getElementById("char-" + (position - 1));
        cursorCharacter.classList.add("cursor-after");
    }

    if (cursorCharacter.offsetTop < typingArea.scrollTop)
    {
        typingArea.scrollTop = cursorCharacter.offsetTop;
    }
    else if (cursorCharacter.offsetTop + cursorCharacter.offsetHeight > typingArea.scrollTop + typingArea.clientHeight)
    {
        typingArea.scrollTop = cursorCharacter.offsetTop + cursorCharacter.offsetHeight - typingArea.clientHeight;
    }
}

// Keep all state-dependent labels, buttons, and paused styling in one place.
function updateInterface()
{
    pauseButton.disabled = gameState === "end" || level === null;
    restartButton.disabled = level === null;
    pauseBtnLabel.textContent = "Pause";
    pauseIcon.src = "icons/pause.svg";
    typingArea.classList.remove("paused");
    gameStatus.textContent = "IN PLAY";
    footerMessage.textContent = "ESC · PAUSE";

    if (level === null)
    {
        gameStatus.textContent = "UNAVAILABLE";
        footerMessage.textContent = "Use Levels to choose a level.";
    }
    else if (gameState === "pause")
    {
        gameStatus.textContent = "PAUSED";
        footerMessage.textContent = "ESC · RESUME";
        pauseBtnLabel.textContent = "Resume";
        pauseIcon.src = "icons/resume.svg";
        typingArea.classList.add("paused");
    }
    else if (gameState === "end")
    {
        gameStatus.textContent = "COMPLETE";
        footerMessage.textContent = "COMPLETE · ACCURACY " + (accuracy * 100).toFixed(1) + "% · RAW WPM " + rawWpm.toFixed(1);
    }
}

// Type forward. Backspace is the only way to go back and erase a character.
function handleTyping(event)
{
    if (event.ctrlKey || event.altKey || event.metaKey)
    {
        return;
    }

    if (event.key !== "Backspace" && (event.key.length !== 1 || event.repeat))
    {
        if (event.key === "Enter" || event.key === "ArrowLeft" || event.key === "ArrowRight")
        {
            event.preventDefault();
        }

        return;
    }

    event.preventDefault();

    if (gameState === "pause" || gameState === "end")
    {
        return;
    }

    if (event.key === "Backspace")
    {
        if (position === 0)
        {
            return;
        }

        position--;
        const character = document.getElementById("char-" + position);

        if (character.classList.contains("correct"))
        {
            correctCharacters--;
        }

        character.className = "";
    }
    else
    {
        if (position >= level.content.length)
        {
            return;
        }

        if (gameState === "start")
        {
            gameState = "play";
            runningSince = performance.now();
            updateInterface();
        }

        const character = document.getElementById("char-" + position);

        if (event.key === character.textContent)
        {
            character.classList.add("correct");
            correctCharacters++;
        }
        else
        {
            character.classList.add("incorrect");
        }

        position++;
    }

    if (position === level.content.length)
    {
        finishGame();
    }
    else
    {
        updateStats();
    }

    updateCursor();
}

// Freeze the clock and show the final figures without saving a result.
function finishGame()
{
    elapsedBeforeRun = getActiveTime();
    runningSince = null;
    gameState = "end";
    updateStats();
    updateInterface();
}

// Pause both typing and the active playing clock.
function pauseGame()
{
    if (gameState === "pause" || gameState === "end")
    {
        return;
    }

    elapsedBeforeRun = getActiveTime();
    runningSince = null;
    gameState = "pause";
    updateStats();
    updateInterface();
}

// Before the first key, Resume returns to start without starting the stopwatch.
function resumeGame()
{
    gameState = "start";

    if (elapsedBeforeRun > 0 || position > 0)
    {
        runningSince = performance.now();
        gameState = "play";
    }

    updateStats();
    updateInterface();
    typingArea.focus();
}

// The button and Escape use the same pause action.
function togglePause()
{
    if (level === null || gameState === "end")
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

// Clear the existing spans and counters, then wait for the first character again.
function restartGame()
{
    position = 0;
    correctCharacters = 0;
    gameState = "start";
    elapsedBeforeRun = 0;
    runningSince = null;

    for (let i = 0; i < level.content.length; i++)
    {
        document.getElementById("char-" + i).className = "";
    }

    typingArea.scrollTop = 0;
    updateCursor();
    updateStats();
    updateInterface();
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

// Leaving the browser or switching tabs pauses an active game.
function pauseForFocusLoss()
{
    if (gameState === "play")
    {
        pauseGame();
    }
}

function handleVisibilityChange()
{
    if (document.hidden)
    {
        pauseForFocusLoss();
    }
}

function preventPaste(event)
{
    event.preventDefault();
}

if (level === null)
{
    levelHeading.textContent = "Level unavailable";
    levelNo.textContent = "CLASSIC";
    typingArea.textContent = "Choose an available level from Tier 1 or Tier 2.";
    typingArea.tabIndex = -1;
    updateInterface();
}
else
{
    let displayNumber = level.number;

    if (displayNumber < 10)
    {
        displayNumber = "0" + displayNumber;
    }

    document.title = level.title + " — TypeQuest";
    levelHeading.textContent = level.title;
    levelNo.textContent = "CLASSIC / LEVEL " + displayNumber;
    levelsButton.href = "classic-levels.html?tier=" + selectedTier;
    typingArea.addEventListener("keydown", handleTyping);
    typingArea.addEventListener("paste", preventPaste);
    pauseButton.addEventListener("click", togglePause);
    restartButton.addEventListener("click", restartGame);
    document.addEventListener("keydown", handleShortcut);
    window.addEventListener("blur", pauseForFocusLoss);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    createPassage();
    updateCursor();
    updateStats();
    updateInterface();
    typingArea.focus();
    setInterval(updateStats, 100);
}
