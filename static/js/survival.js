// Survival rules and the passage tiers supplied by Flask.
const survivalData =
{
    countdownMilliseconds: 3000,
    windowCharacters: 60,
    startingHalfHearts: 6,
    startingSpeed: 1.5,           // Characters per second
    speedIncreasePerMinute: 0.5,
    maximumSpeed: 4,
    tierMilliseconds: 60000,
    startingDamageThreshold: 6,   // Mistakes per half-heart at the start
    tiers: survivalTiers
};

// Find the Survival controls and the movable character track.
const typingArea = document.getElementById("typing-area");
const track = document.getElementById("survival-track");
const modeLabel = document.getElementById("mode-label");
const gameStatus = document.getElementById("game-status");
const footerMessage = document.getElementById("footer-message");
const net_wpm = document.getElementById("net-wpm");
const timer = document.getElementById("elapsed-time");
const pauseButton = document.getElementById("pause-button");
const pauseBtnLabel = document.getElementById("pause_btn-label");
const pauseIcon = document.getElementById("pause-icon");
const restartButton = document.getElementById("restart-button");

const WINDOW_CHARACTERS = 60;     // Maximum spans in the visible window
const HISTORY_CHARACTERS = 18;    // Starting space for scrolling history

let windowStart = 0;           // First span index in the window
let windowEnd = 60;            // First index after the window
let position = 0;              // Current cursor index
let furthestPosition = 0;      // Right Arrow cannot move past this index

let generatedCount = 0;        // Number of spans created
let typedCount = 0;            // Positions marked correct or incorrect
let correctCharacters = 0;
let cursorCharacter = null;    // Span carrying the cursor border

let finalizedCount = 0;        // First editable index at the left edge
let finalizedUntyped = 0;      // Untyped positions that left the window

let halfHearts = survivalData.startingHalfHearts;   // Two units per full heart
let damageCounter = 0;                              // Mistakes toward the next half-heart loss
let damageStage = 0;                                // Elapsed minutes used to set the threshold

let passageOrders = [];        // Shuffled passage indexes per tier
let lastPassages = [];         // Last passage used per tier

let gameState = "start";       // start, play, pause or end
let pausedState = "start";     // State to restore on Resume

let countdownRemaining = survivalData.countdownMilliseconds;    // Countdown time saved on pause
let countdownSince = 0;                                         // Current countdown start timestamp

let activeMs = 0;              // Accumulated play time in milliseconds
let lastTick = null;           // Playing period start, or null when stopped

let rawWpm = 0;                // Speed before the accuracy adjustment
let accuracy = 0;
let animationFrame = null;     // Pending frame ID for pause or restart

// Choose a passage from this tier and append numbered character spans.
function appendPassage(tierNumber)
{
    const tierIndex = tierNumber - 1;
    const tier = survivalData.tiers[tierIndex];
    const order = passageOrders[tierIndex];

    if (order.length === 0)
    {
        for (let i = 0; i < tier.passages.length; i++)
        {
            order.push(i);
        }

        // Fisher–Yates shuffle of this tier's passage indexes.
        for (let i = order.length - 1; i > 0; i--)
        {
            const randomIndex = Math.floor(Math.random() * (i + 1));
            const temporary = order[i];
            order[i] = order[randomIndex];
            order[randomIndex] = temporary;
        }

        // Avoid repeating the previous passage at the start of a new cycle.
        if (order.length > 1 && order[0] === lastPassages[tierIndex])
        {
            const temporary = order[0];
            order[0] = order[1];
            order[1] = temporary;
        }
    }

    const passageIndex = order.shift();
    let passage = tier.passages[passageIndex];
    lastPassages[tierIndex] = passageIndex;

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

        track.appendChild(character);
        generatedCount++;
    }
}

// Append passages until enough characters are available.
function ensureText(minimumLength, tierNumber)
{
    while (generatedCount < minimumLength)
    {
        appendPassage(tierNumber);
    }
}

// Advance the passage tier each minute, up to Tier 5.
function getTier(elapsedMilliseconds)
{
    const tier = Math.floor(elapsedMilliseconds / survivalData.tierMilliseconds) + 1;
    return Math.min(survivalData.tiers.length, tier);
}

// Reduce mistakes per half-heart each minute, to a minimum of one.
function getDamageThreshold(stage)
{
    return Math.max(1, survivalData.startingDamageThreshold - stage);
}

// Count a wrong key or missed character toward losing half a heart.
function applyDamage()
{
    damageCounter++;

    if (damageCounter >= getDamageThreshold(damageStage))
    {
        halfHearts--;
        damageCounter = 0;
    }
}

// Calculate distance from elapsed time, acceleration and the speed cap.
function getScrollDistance(seconds)
{
    const acceleration = survivalData.speedIncreasePerMinute / 60;
    const timeToMaximum = (survivalData.maximumSpeed - survivalData.startingSpeed) / acceleration;
    const increasingTime = Math.min(seconds, timeToMaximum);
    let distance = survivalData.startingSpeed * increasingTime + acceleration * increasingTime * increasingTime / 2;

    if (seconds > timeToMaximum)
    {
        distance += survivalData.maximumSpeed * (seconds - timeToMaximum);
    }

    return distance;
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

// Let elapsed time move the window forward; typing does not move it.
function shiftWindow(newStart)
{
    while (windowStart < newStart)
    {
        document.getElementById("char-" + windowStart).classList.add("hidden-character");
        document.getElementById("char-" + windowEnd).classList.remove("hidden-character");
        windowStart++;
        windowEnd++;
    }
}

// Finalize text leaving the left edge and charge untyped positions.
function advanceBoundary(elapsedMilliseconds)
{
    const distance = getScrollDistance(elapsedMilliseconds / 1000);
    const crossedCount = Math.floor(distance + 0.000000001);
    const newStart = Math.max(0, crossedCount - HISTORY_CHARACTERS);
    // Lock a position as soon as it starts leaving the left edge.
    const leftBoundary = Math.max(0, Math.ceil(distance - HISTORY_CHARACTERS - 0.000000001));
    ensureText(Math.max(crossedCount + 1, newStart + WINDOW_CHARACTERS), getTier(elapsedMilliseconds));

    // Reset the damage counter each minute as the threshold changes.
    const currentStage = Math.floor(elapsedMilliseconds / survivalData.tierMilliseconds);

    if (currentStage !== damageStage)
    {
        damageStage = currentStage;
        damageCounter = 0;
    }

    while (finalizedCount < leftBoundary)
    {
        const character = document.getElementById("char-" + finalizedCount);

        if (!character.classList.contains("correct") && !character.classList.contains("incorrect"))
        {
            finalizedUntyped++;
            applyDamage();
        }

        finalizedCount++;

        if (halfHearts === 0)
        {
            break;
        }
    }

    shiftWindow(newStart);
    position = Math.max(position, finalizedCount);

    if (halfHearts === 0)
    {
        finishGame();
    }
}

// Apply fractional movement between whole-character window shifts.
function moveStrip(elapsedMilliseconds)
{
    const distance = getScrollDistance(elapsedMilliseconds / 1000);
    const offset = HISTORY_CHARACTERS + windowStart - distance;
    const character = document.getElementById("char-" + windowStart);
    const characterWidth = character.getBoundingClientRect().width;
    track.style.transform = "translateX(" + offset * characterWidth + "px)";
}

// Find the last position before the right-side fade.
function getCursorLimit()
{
    const firstCharacter = document.getElementById("char-" + windowStart);
    const characterWidth = firstCharacter.getBoundingClientRect().width;
    const visibleWidth = typingArea.clientWidth - 60;
    const firstLeft = firstCharacter.getBoundingClientRect().left - typingArea.getBoundingClientRect().left - typingArea.clientLeft;
    const visiblePositions = Math.floor((visibleWidth - firstLeft - 3) / characterWidth);
    return Math.min(windowEnd - 1, windowStart + visiblePositions);
}

// Move the cursor border and keep it inside the typing area.
function updateCursor()
{
    if (cursorCharacter !== null)
    {
        cursorCharacter.classList.remove("current-character");
    }

    if (gameState === "end")
    {
        cursorCharacter = null;
        return;
    }

    position = Math.max(finalizedCount, Math.min(position, getCursorLimit()));
    cursorCharacter = document.getElementById("char-" + position);
    cursorCharacter.classList.add("current-character");
}

// Choose full, half or empty icons from the remaining half-heart units.
function renderHearts()
{
    for (let i = 0; i < 3; i++)
    {
        const heart = document.getElementById("heart-" + (i + 1));
        const units = halfHearts - i * 2;
        let source = iconBase + "heart-empty.svg";

        if (units >= 2)
        {
            source = iconBase + "heart-full.svg";
        }
        else if (units === 1)
        {
            source = iconBase + "heart-half.svg";
        }

        if (heart.getAttribute("src") !== source)
        {
            heart.src = source;
        }
    }
}

// Format elapsed time as MM:SS.tenths.
function formatElapsed(milliseconds)
{
    const tenths = Math.round(milliseconds / 100);
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

// Include finalized misses in accuracy, then update speed, time and hearts.
function updateStats()
{
    const elapsed = getActiveTime();
    const opportunityPositions = typedCount + finalizedUntyped;  // Typed positions plus misses
    rawWpm = 0;
    accuracy = 0;

    if (elapsed > 0)
    {
        rawWpm = typedCount / 5 / (elapsed / 60000);
    }

    if (opportunityPositions > 0)
    {
        accuracy = correctCharacters / opportunityPositions;
    }

    const formattedSpeed = (rawWpm * accuracy).toFixed(1);
    net_wpm.textContent = formattedSpeed;
    net_wpm.style.fontSize = "";

    if (formattedSpeed.length > 4)
    {
        net_wpm.style.fontSize = Math.floor(520 / formattedSpeed.length) + "px";
    }

    timer.textContent = formatElapsed(elapsed);
    modeLabel.textContent = "SURVIVAL / TIER " + getTier(elapsed) + " / " + survivalData.tiers.length;
    renderHearts();
}

// Set buttons, status and footer text for the current game state.
function updateInterface()
{
    const completedMessage = footerMessage.textContent;
    pauseButton.disabled = gameState === "start" || gameState === "end";
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
        // Keep the save message when the display updates again.
        if (completedMessage.includes(" · Saved for ") || completedMessage.includes(" · Not saved: "))
        {
            footerMessage.textContent = completedMessage;
            return;
        }
        gameStatus.textContent = "GAME OVER";
        footerMessage.textContent = "GAME OVER · ACCURACY " + (accuracy * 100).toFixed(1) + "% · RAW WPM " + rawWpm.toFixed(1);
    }
}

// Stop the clock and animation, hide the cursor and save the run.
function finishGame()
{
    stopTimer();
    gameState = "end";

    if (animationFrame !== null)
    {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
    }

    updateCursor();
    saveGameResult(typedCount, correctCharacters, getActiveTime(), finalizedUntyped);
}

// Advance the countdown and scrolling, then refresh the display.
function updateGame()
{
    const now = performance.now();

    if (gameState === "start" && now >= countdownSince + countdownRemaining)
    {
        // Start at the countdown deadline even if this update arrived late.
        startTimer(countdownSince + countdownRemaining);
        countdownRemaining = 0;
        gameState = "play";
        typingArea.focus();
    }

    if (gameState === "play")
    {
        advanceBoundary(getActiveTime());
    }

    moveStrip(getActiveTime());
    updateCursor();
    updateStats();
    updateInterface();
}

// Run another animation frame while counting down or playing.
function animateGame()
{
    animationFrame = null;
    updateGame();

    if (gameState === "start" || gameState === "play")
    {
        animationFrame = requestAnimationFrame(animateGame);
    }
}

// Handle typing and edits between the locked left edge and the right fade.
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

    const cursorLimit = getCursorLimit();
    let changed = false;

    if (event.key === "Backspace")
    {
        event.preventDefault();

        if (position > finalizedCount)
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
            }

            character.classList.remove("correct", "incorrect");
            changed = true;
        }
    }
    else if (event.key === "ArrowLeft")
    {
        event.preventDefault();

        if (position > finalizedCount)
        {
            position--;
            changed = true;
        }
    }
    else if (event.key === "ArrowRight")
    {
        event.preventDefault();

        if (position < furthestPosition && position < cursorLimit)
        {
            position++;
            changed = true;
        }
    }
    else if (event.key.length === 1 && !event.repeat)
    {
        event.preventDefault();

        if (position >= cursorLimit)
        {
            return;
        }

        const character = document.getElementById("char-" + position);
        const wasCorrect = character.classList.contains("correct");
        const wasIncorrect = character.classList.contains("incorrect");

        // Count each position only on its first entry or after it was erased.
        if (!wasCorrect && !wasIncorrect)
        {
            typedCount++;
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
            applyDamage();
        }

        position++;
        furthestPosition = Math.max(furthestPosition, position);

        if (halfHearts === 0)
        {
            finishGame();
        }

        changed = true;
    }

    if (changed)
    {
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

    // Remember whether Resume should continue the countdown or active play.
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

    if (animationFrame !== null)
    {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
    }

    updateGame();
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

    if (animationFrame === null)
    {
        animationFrame = requestAnimationFrame(animateGame);
    }
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

// Clear the track, hearts and counters; start a fresh countdown.
function restartGame()
{
    resultSaved = false;
    if (animationFrame !== null)
    {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
    }

    track.innerHTML = "";
    windowStart = 0;
    windowEnd = 60;
    position = 0;
    furthestPosition = 0;
    generatedCount = 0;
    typedCount = 0;
    correctCharacters = 0;
    cursorCharacter = null;
    finalizedCount = 0;
    finalizedUntyped = 0;
    halfHearts = survivalData.startingHalfHearts;
    damageCounter = 0;
    damageStage = 0;
    passageOrders = [];
    lastPassages = [];

    for (let i = 0; i < survivalData.tiers.length; i++)
    {
        passageOrders.push([]);
        lastPassages.push(-1);
    }

    gameState = "start";
    pausedState = "start";
    countdownRemaining = survivalData.countdownMilliseconds;
    countdownSince = performance.now();
    resetTimer();
    ensureText(WINDOW_CHARACTERS, 1);
    updateGame();
    typingArea.focus();
    animationFrame = requestAnimationFrame(animateGame);
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

// Connect controls; Restart also performs the initial setup.
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
