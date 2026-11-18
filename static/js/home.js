// Connect the Home page controls.
const beginButton = document.getElementById("btn-begin");

// Open Play inside the iframe; playUrl comes from the template.
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

// Connect mouse and keyboard input.
beginButton.addEventListener("click", openPlayPage);
document.addEventListener("keydown", handleHomeKeydown);
