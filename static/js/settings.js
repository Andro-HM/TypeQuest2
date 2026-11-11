const settingsForm = document.getElementById("volume-settings");

function updateVolume(event)
{
    const slider = event.target;
    document.getElementById(slider.id + "-value").textContent = slider.value + "%";
    slider.style.setProperty("--volume", slider.value + "%");
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

    const data = new FormData();
    data.append(slider.name, slider.value);
    fetch(settingsForm.action,
    {
        method: "POST",
        body: data
    });
}

for (const slider of settingsForm.querySelectorAll('input[type="range"]'))
{
    slider.addEventListener("input", updateVolume);
}
