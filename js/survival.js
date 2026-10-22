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

const WINDOW_CHARACTERS = 60;
const HISTORY_CHARACTERS = 18;

let windowStart = 0;
let windowEnd = 60;
let position = 0;
let furthestPosition = 0;
let generatedCount = 0;
let typedCount = 0;
let correctCharacters = 0;
let cursorCharacter = null;
let finalizedCount = 0;
let finalizedUntyped = 0;

let halfHearts = survivalData.startingHalfHearts;
let damageCounter = 0;
let damageStage = 0;
let passageOrders = [];
let lastPassages = [];

let gameState = "start";
let pausedState = "start";
let countdownRemaining = survivalData.countdownMilliseconds;
let countdownSince = 0;
let activeMs = 0;
let lastTick = null;
let rawWpm = 0;
let accuracy = 0;
let animationFrame = null;

// Select passages from the current tier, using each one before repeating a cycle.
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

        for (let i = order.length - 1; i > 0; i--)
        {
            const randomIndex = Math.floor(Math.random() * (i + 1));
            const temporary = order[i];
            order[i] = order[randomIndex];
            order[randomIndex] = temporary;
        }

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

function ensureText(minimumLength, tierNumber)
{
    while (generatedCount < minimumLength)
    {
        appendPassage(tierNumber);
    }
}

function getTier(elapsedMilliseconds)
{
    const tier = Math.floor(elapsedMilliseconds / survivalData.tierMilliseconds) + 1;
    return Math.min(survivalData.tiers.length, tier);
}

function getDamageThreshold(stage)
{
    return Math.max(1, survivalData.startingDamageThreshold - stage);
}

// Total characters moved: speed increases steadily until it reaches the cap.
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

function getActiveTime()
{
    if (lastTick === null)
    {
        return activeMs;
    }

    return activeMs + (performance.now() - lastTick);
}

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

// Only the timer advances this window. Keyboard input never shifts it.
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

// Finalized positions keep their classes, but cannot be edited again.
function advanceBoundary(elapsedMilliseconds)
{
    const crossedCount = Math.floor(getScrollDistance(elapsedMilliseconds / 1000) + 0.000000001);
    const newStart = Math.max(0, crossedCount - HISTORY_CHARACTERS);
    ensureText(Math.max(crossedCount + 1, newStart + WINDOW_CHARACTERS), getTier(elapsedMilliseconds));

    while (finalizedCount < crossedCount)
    {
        const character = document.getElementById("char-" + finalizedCount);

        if (!character.classList.contains("correct") && !character.classList.contains("incorrect"))
        {
            finalizedUntyped++;
        }

        finalizedCount++;
    }

    shiftWindow(Math.max(0, finalizedCount - HISTORY_CHARACTERS));
    position = Math.max(position, finalizedCount);

    // Passage tiers stop at five; damage keeps increasing each minute to its cap.
    const currentStage = Math.floor(elapsedMilliseconds / survivalData.tierMilliseconds);

    if (currentStage !== damageStage)
    {
        damageStage = currentStage;
        damageCounter = 0;
    }
}

// Start at the boundary with space for history, and scroll from the first second.
function moveStrip(elapsedMilliseconds)
{
    const distance = getScrollDistance(elapsedMilliseconds / 1000);
    const offset = HISTORY_CHARACTERS + windowStart - distance;
    const character = document.getElementById("char-" + windowStart);
    const characterWidth = character.getBoundingClientRect().width;
    track.style.transform = "translateX(" + offset * characterWidth + "px)";
}

// Reserve the existing 60px fade and enough room for the cursor's 3px border.
function getCursorLimit()
{
    const firstCharacter = document.getElementById("char-" + windowStart);
    const characterWidth = firstCharacter.getBoundingClientRect().width;
    const visibleWidth = typingArea.clientWidth - 60;
    const firstLeft = firstCharacter.getBoundingClientRect().left - typingArea.getBoundingClientRect().left - typingArea.clientLeft;
    const visiblePositions = Math.floor((visibleWidth - firstLeft - 3) / characterWidth);
    return Math.min(windowEnd - 1, windowStart + visiblePositions);
}

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

function renderHearts()
{
    for (let i = 0; i < 3; i++)
    {
        const heart = document.getElementById("heart-" + (i + 1));
        const units = halfHearts - i * 2;
        let source = "icons/heart-empty.svg";

        if (units >= 2)
        {
            source = "icons/heart-full.svg";
        }
        else if (units === 1)
        {
            source = "icons/heart-half.svg";
        }

        if (heart.getAttribute("src") !== source)
        {
            heart.src = source;
        }
    }
}

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

// Missed positions count toward accuracy, but never cause heart damage.
function updateStats()
{
    const elapsed = getActiveTime();
    const opportunityPositions = typedCount + finalizedUntyped;
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

function updateInterface()
{
    pauseButton.disabled = gameState === "start" || gameState === "end";
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
        gameStatus.textContent = "GAME OVER";
        footerMessage.textContent = "GAME OVER · ACCURACY " + (accuracy * 100).toFixed(1) + "% · RAW WPM " + rawWpm.toFixed(1);
    }
}

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

    if (gameState === "play")
    {
        advanceBoundary(getActiveTime());
    }

    moveStrip(getActiveTime());
    updateCursor();
    updateStats();
    updateInterface();
}

function animateGame()
{
    animationFrame = null;
    updateGame();

    if (gameState === "start" || gameState === "play")
    {
        animationFrame = requestAnimationFrame(animateGame);
    }
}

// Editing is limited to the active window; passed characters cannot be changed.
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

        if (!wasCorrect && !wasIncorrect)
        {
            typedCount++;
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
            damageCounter++;

            if (damageCounter >= getDamageThreshold(damageStage))
            {
                halfHearts--;
                damageCounter = 0;
            }
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

// Remember whether Pause interrupted the countdown or active gameplay.
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

    if (animationFrame !== null)
    {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
    }

    updateGame();
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

    if (animationFrame === null)
    {
        animationFrame = requestAnimationFrame(animateGame);
    }
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

// Only Restart clears the spans and begins a fresh three-second countdown.
function restartGame()
{
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
