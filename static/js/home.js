const beginButton = document.getElementById("btn-begin");

// Navigate the iframe to the Play URL supplied by the template.
function openPlayPage()
{
    window.location.href = playUrl;
}

// Let Enter trigger the Begin button when no control has focus.
function handleHomeKeydown(event)
{
    if (event.key === "Enter" && event.target === document.body)
    {
        event.preventDefault();
        beginButton.click();
    }
}

beginButton.addEventListener("click", openPlayPage);
document.addEventListener("keydown", handleHomeKeydown);
