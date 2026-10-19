const typingArea = document.getElementById("typing-area");
const levelTitle = document.getElementById("level-title");
const levelLabel = document.getElementById("level-label");
const levelsLink = document.getElementById("levels-link");
const gameStatus = document.getElementById("game-status");
const gameMessage = document.getElementById("game-message");
const speedDisplay = document.getElementById("net-wpm");
const timeDisplay = document.getElementById("elapsed-time");
const pauseButton = document.getElementById("pause-button");
const pauseLabel = document.getElementById("pause-label");
const pauseIcon = document.getElementById("pause-icon");
const restartButton = document.getElementById("restart-button");

let selectedTier = 1;
let typedText = "";
let cursorPosition = 0;
let hasStarted = false;
let isPaused = false;
let isComplete = false;
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

// Match the reference: five retained characters make one word.
function updateStats()
{
    const elapsed = getActiveTime();
    let correctCharacters = 0;

    for (let i = 0; i < typedText.length; i++)
    {
        if (typedText[i] === level.content[i])
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

    const netWpm = rawWpm * accuracy;
    const formattedSpeed = netWpm.toFixed(1);
    speedDisplay.textContent = formattedSpeed;
    speedDisplay.style.fontSize = "";

    // Keep large speed readings inside the metric column.
    if (formattedSpeed.length > 4)
    {
        speedDisplay.style.fontSize = Math.floor(520 / formattedSpeed.length) + "px";
    }

    timeDisplay.textContent = formatTime(elapsed);
}

// Color each position and keep the cursor inside the visible passage.
function renderPassage()
{
    typingArea.innerHTML = "";

    for (let i = 0; i < level.content.length; i++)
    {
        const character = document.createElement("span");
        character.textContent = level.content[i];

        if (i < typedText.length)
        {
            if (typedText[i] === level.content[i])
            {
                character.className = "correct";
            }
            else
            {
                character.className = "incorrect";
            }
        }

        if (i === cursorPosition && !isComplete)
        {
            character.classList.add("current-character");
            character.id = "typing-cursor";
        }

        typingArea.appendChild(character);
    }

    const cursor = document.getElementById("typing-cursor");

    if (cursor)
    {
        if (cursor.offsetTop < typingArea.scrollTop)
        {
            typingArea.scrollTop = cursor.offsetTop;
        }
        else if (cursor.offsetTop + cursor.offsetHeight > typingArea.scrollTop + typingArea.clientHeight)
        {
            typingArea.scrollTop = cursor.offsetTop + cursor.offsetHeight - typingArea.clientHeight;
        }
    }
}

// Letters overwrite earlier positions; Backspace removes a character.
function handleTyping(event)
{
    if (event.ctrlKey || event.altKey || event.metaKey)
    {
        return;
    }

    if (event.key === "Enter")
    {
        event.preventDefault();
        return;
    }

    if (isPaused || isComplete)
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

        if (cursorPosition > 0)
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

        if (!hasStarted)
        {
            hasStarted = true;
            runningSince = performance.now();
        }
    }

    if (changed)
    {
        if (typedText.length === level.content.length)
        {
            finishGame();
        }

        renderPassage();
        updateStats();
    }
}

// Freeze the clock and show the final figures without saving a result.
function finishGame()
{
    elapsedBeforeRun = getActiveTime();
    runningSince = null;
    isComplete = true;
    pauseButton.disabled = true;
    gameStatus.textContent = "COMPLETE";
    updateStats();
    gameMessage.textContent = "COMPLETE · ACCURACY " + (accuracy * 100).toFixed(1) + "% · RAW WPM " + rawWpm.toFixed(1);
}

// Pause both typing and the active playing clock.
function pauseGame()
{
    if (isPaused || isComplete)
    {
        return;
    }

    elapsedBeforeRun = getActiveTime();
    runningSince = null;
    isPaused = true;
    gameStatus.textContent = "PAUSED";
    gameMessage.textContent = "ESC · RESUME";
    pauseLabel.textContent = "Resume";
    pauseIcon.src = "icons/resume.svg";
    typingArea.classList.add("paused");
    updateStats();
}

// Resume without counting the time spent paused.
function resumeGame()
{
    isPaused = false;

    if (hasStarted)
    {
        runningSince = performance.now();
    }

    gameStatus.textContent = "IN PLAY";
    gameMessage.textContent = "ESC · PAUSE";
    pauseLabel.textContent = "Pause";
    pauseIcon.src = "icons/pause.svg";
    typingArea.classList.remove("paused");
    typingArea.focus();
    updateStats();
}

// The button and Escape use the same pause action.
function togglePause()
{
    if (level === null || isComplete)
    {
        return;
    }

    if (isPaused)
    {
        resumeGame();
    }
    else
    {
        pauseGame();
    }
}

// Reset the current level and wait for the first character again.
function restartGame()
{
    typedText = "";
    cursorPosition = 0;
    hasStarted = false;
    isPaused = false;
    isComplete = false;
    elapsedBeforeRun = 0;
    runningSince = null;
    pauseButton.disabled = false;
    pauseLabel.textContent = "Pause";
    pauseIcon.src = "icons/pause.svg";
    gameStatus.textContent = "IN PLAY";
    gameMessage.textContent = "ESC · PAUSE";
    typingArea.classList.remove("paused");
    typingArea.scrollTop = 0;
    renderPassage();
    updateStats();
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
    if (hasStarted && !isComplete)
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
    levelTitle.textContent = "Level unavailable";
    levelLabel.textContent = "CLASSIC";
    gameStatus.textContent = "UNAVAILABLE";
    typingArea.textContent = "Choose an available level from Tier 1 or Tier 2.";
    typingArea.tabIndex = -1;
    gameMessage.textContent = "Use Levels to choose a level.";
    pauseButton.disabled = true;
    restartButton.disabled = true;
}
else
{
    let displayNumber = level.number;

    if (displayNumber < 10)
    {
        displayNumber = "0" + displayNumber;
    }

    document.title = level.title + " — TypeQuest";
    levelTitle.textContent = level.title;
    levelLabel.textContent = "CLASSIC / LEVEL " + displayNumber;
    levelsLink.href = "classic-levels.html?tier=" + selectedTier;
    typingArea.addEventListener("keydown", handleTyping);
    typingArea.addEventListener("paste", preventPaste);
    pauseButton.addEventListener("click", togglePause);
    restartButton.addEventListener("click", restartGame);
    document.addEventListener("keydown", handleShortcut);
    window.addEventListener("blur", pauseForFocusLoss);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    renderPassage();
    updateStats();
    typingArea.focus();
    setInterval(updateStats, 100);
}
