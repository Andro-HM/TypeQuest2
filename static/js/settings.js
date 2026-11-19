const settingsForm = document.getElementById("volume-settings");   // Its action is the Flask save URL

// Update the display and sound volume, then send the value to Flask.
function updateVolume(event)
{
    const slider = event.target;

    document.getElementById(slider.id + "-value").textContent = slider.value + "%";
    slider.style.setProperty("--volume", slider.value + "%");

    // Audio players live in the parent page and survive navigation.
    if (slider.name === "background_music_volume")
    {
        if (window.parent !== window)
        {
            window.parent.setMusicVolume(slider.value);
        }
    }
    else
    {
        window.parent.setAudioVolume(slider.name, slider.value);
    }

    // Send only the changed slider; Flask retains the other values.
    const data = new FormData();
    data.append(slider.name, slider.value);
    fetch(settingsForm.action,
    {
        method: "POST",
        body: data
    });
}

// Apply volume while the slider moves.
for (const slider of settingsForm.querySelectorAll('input[type="range"]'))
{
    slider.addEventListener("input", updateVolume);
}
