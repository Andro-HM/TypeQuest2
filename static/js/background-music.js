// Create the audio environment and its volume control.
const musicContext = new AudioContext();
const musicGain = musicContext.createGain();
musicGain.gain.value = initialMusicVolume / 100;
musicGain.connect(musicContext.destination);

let musicBuffer = null;
let musicSource = null;

// Download the local WAV and decode it once into playable samples.
async function loadMusic()
{
    const response = await fetch(backgroundMusicUrl);
    const recording = await response.arrayBuffer();
    musicBuffer = await musicContext.decodeAudioData(recording);
    startMusic();
}

// Create one player; the audio engine loops its buffer continuously.
function startMusic()
{
    if (musicSource !== null || musicBuffer === null || musicContext.state !== "running")
    {
        return;
    }

    musicSource = musicContext.createBufferSource();
    musicSource.buffer = musicBuffer;
    musicSource.loop = true;
    musicSource.connect(musicGain);
    musicSource.start();
}

// Resume after a click or keypress if the browser blocked autoplay.
function unlockMusic()
{
    if (musicContext.state === "suspended")
    {
        musicContext.resume().then(startMusic).catch(console.error);
    }
    else
    {
        startMusic();
    }
}

// Change volume without replacing or restarting the player.
function setMusicVolume(value)
{
    musicGain.gain.value = value / 100;
}

// Keep the tab title and keyboard focus on the current iframe page.
function focusPage()
{
    const frame = document.getElementById("app-frame");
    document.title = frame.contentDocument.title || "TypeQuest";
    frame.contentWindow.focus();
}

// Attach the navigation handler after app-frame exists.
document.addEventListener("DOMContentLoaded", function()
{
    document.getElementById("app-frame").addEventListener("load", focusPage);
    focusPage();
});

// audio.js also forwards clicks and keypresses from inside the iframe.
document.addEventListener("pointerdown", unlockMusic, true);
document.addEventListener("keydown", unlockMusic, true);
loadMusic().catch(console.error);
