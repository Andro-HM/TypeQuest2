// Open the page where the player can choose a game mode.
const beginButton = document.getElementById("btn-begin");

function openPlayPage()
{
    window.location.href = "play.html";
}

// Let Enter open Play unless the player is using another control.
function handleHomeKeydown(event)
{
    if (event.key === "Enter" && event.target === document.body)
    {
        event.preventDefault();
        openPlayPage();
    }
}

beginButton.addEventListener("click", openPlayPage);
document.addEventListener("keydown", handleHomeKeydown);
