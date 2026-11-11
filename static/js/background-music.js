const musicContext = new AudioContext({latencyHint: "interactive"});
const musicGain = musicContext.createGain();
musicGain.gain.value = initialMusicVolume / 100;
musicGain.connect(musicContext.destination);

let musicBuffer = null;
let musicSource = null;

async function loadMusic()
{
    const response = await fetch(backgroundMusicUrl);
    const recording = await response.arrayBuffer();
    musicBuffer = await musicContext.decodeAudioData(recording);
    startMusic();
}

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

function setMusicVolume(value)
{
    musicGain.gain.value = value / 100;
}

function focusPage()
{
    const frame = document.getElementById("app-frame");
    document.title = frame.contentDocument.title || "TypeQuest";
    frame.contentWindow.focus();
}

document.addEventListener("DOMContentLoaded", function()
{
    document.getElementById("app-frame").addEventListener("load", focusPage);
    focusPage();
});

document.addEventListener("pointerdown", unlockMusic, true);
document.addEventListener("keydown", unlockMusic, true);
loadMusic().catch(console.error);
