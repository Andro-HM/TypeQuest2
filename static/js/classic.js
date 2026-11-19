// Find the Classic controls in classic.html.
const typingArea = document.getElementById("typing-area");
const gameStatus = document.getElementById("game-status");
const footerMessage = document.getElementById("footer-message");
const net_wpm = document.getElementById("net-wpm");
const stopwatch = document.getElementById("stopwatch");
const pauseButton = document.getElementById("pause-button");
const pauseBtnLabel = document.getElementById("pause_btn-label");
const pauseIcon = document.getElementById("pause-icon");
const restartButton = document.getElementById("restart-button");

let position = 0;              // Next character index and current typed count
let correctCharacters = 0;
let gameState = "start";       // start, play, pause or end
let cursorCharacter = null;    // Span carrying the cursor border

let activeMs = 0;              // Accumulated play time in milliseconds
let lastTick = null;           // Playing period start, or null when stopped

let rawWpm = 0;                // Speed before the accuracy adjustment
let accuracy = 0;

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
function startTimer()
{
    if (lastTick === null)
    {
        lastTick = performance.now();
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

// Format elapsed time as MM:SS.
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

// Calculate Raw WPM, accuracy and Net WPM from entered positions.
function updateStats()
{
    const elapsed = getActiveTime();
    rawWpm = 0;
    accuracy = 0;

    if (elapsed > 0)
    {
        // One word is five characters. Convert milliseconds to minutes.
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

// Create one numbered span per character from the Jinja level data.
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

// Move the cursor border and keep it inside the typing area.
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

    // Scroll only when the cursor leaves the visible area.
    if (cursorCharacter.offsetTop < typingArea.scrollTop)
    {
        typingArea.scrollTop = cursorCharacter.offsetTop;
    }
    else if (cursorCharacter.offsetTop + cursorCharacter.offsetHeight > typingArea.scrollTop + typingArea.clientHeight)
    {
        typingArea.scrollTop = cursorCharacter.offsetTop + cursorCharacter.offsetHeight - typingArea.clientHeight;
    }
}

// Set buttons, status and footer text for the current game state.
function updateInterface()
{
    pauseButton.disabled = gameState === "end" || level === null;
    restartButton.disabled = level === null;

    pauseBtnLabel.textContent = "Pause";
    pauseIcon.src = iconBase + "pause.svg";

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
        pauseIcon.src = iconBase + "resume.svg";
        typingArea.classList.add("paused");
    }
    else if (gameState === "end")
    {
        gameStatus.textContent = "COMPLETE";
        footerMessage.textContent = "COMPLETE · ACCURACY " + (accuracy * 100).toFixed(1) + "% · RAW WPM " + rawWpm.toFixed(1);
    }
}

// Type forward. Backspace erases the previous character.
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

        // The first character starts the stopwatch.
        if (gameState === "start")
        {
            gameState = "play";
            startTimer();
            updateInterface();
        }

        const character = document.getElementById("char-" + position);

        // The span holds the expected character. Its class shows the result.
        if (event.key === character.textContent)
        {
            window.parent.playSound("correct_key", "game_volume");
            character.classList.add("correct");
            correctCharacters++;
        }
        else
        {
            window.parent.playSound("wrong_key", "game_volume");
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

// Freeze the result on screen and send it through results.js.
function finishGame()
{
    stopTimer();
    gameState = "end";
    updateStats();
    updateInterface();
    saveGameResult(position, correctCharacters, getActiveTime(), 0);
}

// Pause typing and stop the active stopwatch.
function pauseGame()
{
    if (gameState === "pause" || gameState === "end")
    {
        return;
    }

    stopTimer();
    gameState = "pause";
    updateStats();
    updateInterface();
}

// Resume play, or return to start if nothing was typed yet.
function resumeGame()
{
    gameState = "start";    //Temporarily make the gameState start

    if (activeMs > 0 || position > 0)
    {
        startTimer();
        gameState = "play";
    }

    updateStats();
    updateInterface();
    typingArea.focus();
}

// Use the same pause/resume action for the button and Escape.
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

// Clear marks and counters; wait for the first character again.
function restartGame()
{
    resultSaved = false;
    position = 0;
    correctCharacters = 0;
    gameState = "start";
    resetTimer();

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

// Toggle pause on Escape; ignore a held-down key.
function handleShortcut(event)
{
    if (event.key === "Escape" && !event.repeat)
    {
        event.preventDefault();
        togglePause();
    }
}

// Pause active play when the window loses focus.
function pauseForFocusLoss()
{
    if (gameState === "play")
    {
        pauseGame();
    }
}

// Pause when this document becomes hidden.
function handleVisibilityChange()
{
    if (document.hidden)
    {
        pauseForFocusLoss();
    }
}

// Require character-by-character input.
function preventPaste(event)
{
    event.preventDefault();
}

// Initialize the passage and controls, or show the unavailable-level message.
if (level === null)
{
    typingArea.textContent = "Choose an available level from Tier 1 or Tier 2.";
    typingArea.tabIndex = -1;
    updateInterface();
}
else
{
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
