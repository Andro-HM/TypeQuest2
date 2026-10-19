const typingArea = document.getElementById("typing-area");
const track = document.getElementById("survival-track");
const cursorDisplay = document.getElementById("typing-cursor");
const modeLabel = document.getElementById("mode-label");
const gameStatus = document.getElementById("game-status");
const gameMessage = document.getElementById("game-message");
const speedDisplay = document.getElementById("net-wpm");
const timeDisplay = document.getElementById("elapsed-time");
const pauseButton = document.getElementById("pause-button");
const pauseLabel = document.getElementById("pause-label");
const pauseIcon = document.getElementById("pause-icon");
const restartButton = document.getElementById("restart-button");

let targetText = "";
let typedText = "";
let cursorPosition = 0;
let finalizedCount = 0;
let finalizedEntered = 0;
let finalizedCorrect = 0;
let halfHearts = survivalData.startingHalfHearts;
let damageCounter = 0;
let damageStage = 0;
let passageOrders = [];
let lastPassages = [];
let phase = "countdown";
let countdownRemaining = survivalData.countdownMilliseconds;
let countdownSince = 0;
let elapsedBeforeRun = 0;
let runningSince = null;
let rawWpm = 0;
let accuracy = 0;
let animationFrame = null;

// Select passages from the current tier, using each one before repeating a cycle.
function ensureText(minimumLength, tierNumber)
{
    const tierIndex = tierNumber - 1;
    const tier = survivalData.tiers[tierIndex];

    while (targetText.length < minimumLength)
    {
        if (passageOrders[tierIndex].length === 0)
        {
            for (let i = 0; i < tier.passages.length; i++)
            {
                passageOrders[tierIndex].push(i);
            }

            const order = passageOrders[tierIndex];

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

        const passageIndex = passageOrders[tierIndex].shift();

        if (targetText.length > 0)
        {
            targetText += " ";
        }

        targetText += tier.passages[passageIndex];
        lastPassages[tierIndex] = passageIndex;
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

// Find the exact active time when a character crossed the left boundary.
function getCrossingTime(distance)
{
    const acceleration = survivalData.speedIncreasePerMinute / 60;
    const timeToMaximum = (survivalData.maximumSpeed - survivalData.startingSpeed) / acceleration;
    const distanceAtMaximum = getScrollDistance(timeToMaximum);
    let seconds = 0;

    if (distance <= distanceAtMaximum)
    {
        seconds = (Math.sqrt(survivalData.startingSpeed * survivalData.startingSpeed + 2 * acceleration * distance) - survivalData.startingSpeed) / acceleration;
    }
    else
    {
        seconds = timeToMaximum + (distance - distanceAtMaximum) / survivalData.maximumSpeed;
    }

    return seconds * 1000;
}

function getActiveTime(now)
{
    if (runningSince === null)
    {
        return elapsedBeforeRun;
    }

    return elapsedBeforeRun + now - runningSince;
}

// A late frame still ends the run at the fatal character, not at the frame time.
function finishGame(fatalTime)
{
    phase = "finished";
    elapsedBeforeRun = fatalTime;
    runningSince = null;
}

// Lock positions as they leave the window. Only these positions can cause damage.
function advanceBoundary(elapsedMilliseconds)
{
    const crossedCount = Math.floor(getScrollDistance(elapsedMilliseconds / 1000) + 0.000000001);
    let changed = false;

    while (finalizedCount < crossedCount)
    {
        const index = finalizedCount;
        const crossingTime = getCrossingTime(index + 1);
        ensureText(index + 1, getTier(crossingTime));
        let enteredCharacter = null;

        if (typedText.length > 0)
        {
            enteredCharacter = typedText[0];
            typedText = typedText.slice(1);
            cursorPosition = Math.max(0, cursorPosition - 1);
            finalizedEntered++;
        }

        finalizedCount++;
        changed = true;
        const stage = Math.floor(crossingTime / survivalData.tierMilliseconds);

        if (stage !== damageStage)
        {
            damageStage = stage;
            damageCounter = 0;
        }

        if (enteredCharacter !== null && enteredCharacter === targetText[index])
        {
            finalizedCorrect++;
        }
        else
        {
            damageCounter++;

            if (damageCounter >= getDamageThreshold(stage))
            {
                halfHearts--;
                damageCounter = 0;
            }
        }

        if (halfHearts === 0)
        {
            finishGame(crossingTime);
            break;
        }
    }

    if (phase !== "finished")
    {
        const currentStage = Math.floor(elapsedMilliseconds / survivalData.tierMilliseconds);

        if (currentStage !== damageStage)
        {
            damageStage = currentStage;
            damageCounter = 0;
        }

        ensureText(finalizedCount + survivalData.windowCharacters + 1, getTier(elapsedMilliseconds));
    }

    return changed;
}

// Rebuild the visible characters after input or a character crossing.
function renderStrip()
{
    track.innerHTML = "";

    for (let offset = 0; offset <= survivalData.windowCharacters; offset++)
    {
        const index = finalizedCount + offset;
        const character = document.createElement("span");
        character.className = "typing-character";
        character.textContent = " ";

        if (index < targetText.length)
        {
            character.textContent = targetText[index];
        }

        if (offset < typedText.length)
        {
            if (typedText[offset] === targetText[index])
            {
                character.classList.add("correct");
            }
            else
            {
                character.classList.add("incorrect");
            }
        }

        track.appendChild(character);
    }
}

// Limit editing to positions whose cursor fits inside the visible typing area.
function getCursorLimit(elapsedMilliseconds)
{
    const distance = getScrollDistance(elapsedMilliseconds / 1000);
    const fraction = Math.max(0, distance - finalizedCount);
    const characterWidth = track.firstElementChild.getBoundingClientRect().width;
    const visiblePositions = Math.floor((typingArea.clientWidth - cursorDisplay.offsetWidth) / characterWidth + fraction);
    return Math.max(0, Math.min(survivalData.windowCharacters, visiblePositions));
}

// Move the text smoothly, keeping the cursor inside both visible edges.
function moveStrip(elapsedMilliseconds)
{
    const distance = getScrollDistance(elapsedMilliseconds / 1000);
    const fraction = Math.max(0, distance - finalizedCount);
    const characterWidth = track.firstElementChild.getBoundingClientRect().width;
    cursorPosition = Math.min(cursorPosition, getCursorLimit(elapsedMilliseconds));
    const cursorLeft = Math.max(0, (cursorPosition - fraction) * characterWidth);
    track.style.transform = "translateX(-" + fraction * characterWidth + "px)";
    cursorDisplay.style.left = cursorLeft + "px";
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

// Include passed positions in accuracy, even when the player left them untyped.
function updateStats(elapsedMilliseconds)
{
    let correctCharacters = finalizedCorrect;

    for (let i = 0; i < typedText.length; i++)
    {
        if (typedText[i] === targetText[finalizedCount + i])
        {
            correctCharacters++;
        }
    }

    const enteredCharacters = finalizedEntered + typedText.length;
    const opportunityPositions = finalizedCount + typedText.length;
    rawWpm = 0;
    accuracy = 0;

    if (elapsedMilliseconds > 0)
    {
        rawWpm = enteredCharacters / 5 / (elapsedMilliseconds / 60000);
    }

    if (opportunityPositions > 0)
    {
        accuracy = correctCharacters / opportunityPositions;
    }

    const formattedSpeed = (rawWpm * accuracy).toFixed(1);
    speedDisplay.textContent = formattedSpeed;
    speedDisplay.style.fontSize = "";

    if (formattedSpeed.length > 4)
    {
        speedDisplay.style.fontSize = Math.floor(520 / formattedSpeed.length) + "px";
    }

    timeDisplay.textContent = formatElapsed(elapsedMilliseconds);
    modeLabel.textContent = "SURVIVAL / TIER " + getTier(elapsedMilliseconds) + " / " + survivalData.tiers.length;
    renderHearts();
}

function updateGame(now = performance.now())
{
    if (phase === "countdown" && now >= countdownSince + countdownRemaining)
    {
        runningSince = countdownSince + countdownRemaining;
        countdownRemaining = 0;
        phase = "running";
        typingArea.focus();
    }

    if (phase === "running")
    {
        if (advanceBoundary(getActiveTime(now)))
        {
            renderStrip();
        }
    }

    const elapsed = getActiveTime(now);
    updateStats(elapsed);
    moveStrip(elapsed);
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
        gameStatus.textContent = "GAME OVER";
        pauseButton.disabled = true;
        gameMessage.textContent = "GAME OVER · ACCURACY " + (accuracy * 100).toFixed(1) + "% · RAW WPM " + rawWpm.toFixed(1);
    }
}

function animateGame()
{
    animationFrame = null;
    updateGame();

    if (phase === "countdown" || phase === "running")
    {
        animationFrame = requestAnimationFrame(animateGame);
    }
}

// Editing is limited to the active window; passed characters cannot be changed.
function handleTyping(event)
{
    const now = performance.now();
    updateGame(now);

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
    const cursorLimit = getCursorLimit(getActiveTime(now));

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

        if (cursorPosition < typedText.length && cursorPosition < cursorLimit)
        {
            cursorPosition++;
            changed = true;
        }
    }
    else if (event.key.length === 1 && !event.repeat)
    {
        event.preventDefault();

        if (cursorPosition >= cursorLimit)
        {
            return;
        }

        if (cursorPosition < typedText.length)
        {
            typedText = typedText.slice(0, cursorPosition) + event.key + typedText.slice(cursorPosition + 1);
            cursorPosition++;
            changed = true;
        }
        else if (typedText.length < survivalData.windowCharacters)
        {
            typedText += event.key;
            cursorPosition++;
            changed = true;
        }
    }

    if (changed)
    {
        renderStrip();
        updateGame(now);
    }
}

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
        elapsedBeforeRun = getActiveTime(now);
        runningSince = null;
        phase = "paused-running";
    }

    if (phase === "paused-countdown" || phase === "paused-running")
    {
        pauseLabel.textContent = "Resume";
        pauseIcon.src = "icons/resume.svg";
        typingArea.classList.add("paused");
    }

    if (animationFrame !== null)
    {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
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

    if (animationFrame === null && (phase === "countdown" || phase === "running"))
    {
        animationFrame = requestAnimationFrame(animateGame);
    }
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

// Reset both the active window and the already-passed statistics.
function restartGame()
{
    if (animationFrame !== null)
    {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
    }

    targetText = "";
    typedText = "";
    cursorPosition = 0;
    finalizedCount = 0;
    finalizedEntered = 0;
    finalizedCorrect = 0;
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

    phase = "countdown";
    countdownRemaining = survivalData.countdownMilliseconds;
    countdownSince = performance.now();
    elapsedBeforeRun = 0;
    runningSince = null;
    pauseLabel.textContent = "Pause";
    pauseIcon.src = "icons/pause.svg";
    typingArea.classList.remove("paused");
    ensureText(survivalData.windowCharacters + 1, 1);
    renderStrip();
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
