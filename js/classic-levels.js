// These containers display the data from classic-data.js.
const tierButtons = document.getElementById("tiers");
const tierTitle = document.getElementById("tier-title");
const levelGrid = document.getElementById("level-grid");

// Build the tier buttons. Only available tiers can be opened.
function displayTiers()
{
    for (let i = 0; i < classicData.tiers.length; i++)
    {
        const tier = classicData.tiers[i];
        const button = document.createElement("button");
        button.id = "tier-" + tier.number;
        button.className = "tier-button";
        button.type = "button";
        button.value = tier.number;
        button.disabled = !tier.available;

        if (!tier.available)
        {
            const lock = document.createElement("img");
            lock.className = "tier-lock";
            lock.src = "icons/lock.svg";
            lock.alt = "Locked";
            button.appendChild(lock);
        }

        const label = document.createElement("span");
        const name = document.createElement("span");
        name.className = "tier-name";
        name.textContent = "Tier " + tier.number;

        const range = document.createElement("span");
        range.className = "tier-range";
        range.textContent = "Levels " + tier.firstLevel + "–" + tier.lastLevel;

        label.appendChild(name);
        label.appendChild(range);
        button.appendChild(label);
        button.addEventListener("click", handleTierClick);
        tierButtons.appendChild(button);
    }
}

// Open the tier chosen by the player.
function handleTierClick(event)
{
    const tierNumber = Number(event.currentTarget.value);
    displayLevels(tierNumber);
}

// Read the chosen tier and create a card for each of its levels.
function displayLevels(tierNumber)
{
    const tier = classicData.tiers[tierNumber - 1];

    if (!tier.available)
    {
        return;
    }

    tierTitle.textContent = "Tier " + tier.number;
    levelGrid.innerHTML = "";

    for (let i = 0; i < classicData.tiers.length; i++)
    {
        const button = document.getElementById("tier-" + classicData.tiers[i].number);
        button.classList.remove("tier-selected");
    }

    const selectedButton = document.getElementById("tier-" + tier.number);
    selectedButton.classList.add("tier-selected");

    for (let i = 0; i < tier.levels.length; i++)
    {
        const level = tier.levels[i];
        const card = document.createElement("div");
        card.className = "level-card";

        let number = level.number;

        if (number < 10)
        {
            number = "0" + number;
        }

        const label = document.createElement("p");
        label.className = "level-number";
        label.textContent = "LEVEL " + number;

        const title = document.createElement("h3");
        title.className = "level-title";
        title.textContent = level.title;

        const status = document.createElement("p");
        status.className = "level-status";
        status.textContent = "Not attempted";

        const playLink = document.createElement("a");
        playLink.id = "btn-level-" + level.number;
        playLink.className = "level-button";
        playLink.href = "classic.html?level=" + level.number;
        playLink.textContent = "Play level →";

        card.appendChild(label);
        card.appendChild(title);
        card.appendChild(status);
        card.appendChild(playLink);
        levelGrid.appendChild(card);
    }
}

displayTiers();

// Returning from a game opens the tier that contains that level.
const parameters = new URLSearchParams(window.location.search);
const requestedTier = Number(parameters.get("tier"));
let startingTier = 1;

for (let i = 0; i < classicData.tiers.length; i++)
{
    const tier = classicData.tiers[i];

    if (tier.number === requestedTier && tier.available)
    {
        startingTier = tier.number;
    }
}

displayLevels(startingTier);
