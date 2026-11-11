const audioContext = new AudioContext({latencyHint: "interactive"});
const audioBuffers = {};
const audioGains =
{
    game_volume: audioContext.createGain(),
    tap_volume: audioContext.createGain()
};

for (const name in audioGains)
{
    audioGains[name].gain.value = audioSettings[name] / 100;
    audioGains[name].connect(audioContext.destination);
}

// Decode each recording once. Every playback reuses these buffers.
async function loadSound(name)
{
    const response = await fetch(audioFiles[name]);
    const recording = await response.arrayBuffer();
    audioBuffers[name] = await audioContext.decodeAudioData(recording);
}

// Browsers may keep the context suspended until a real click or keypress.
function unlockAudio()
{
    unlockMusic();

    if (audioContext.state === "suspended")
    {
        audioContext.resume().catch(console.error);
    }
}

// A new source lets consecutive taps and keystrokes overlap naturally.
function playSound(name, volume)
{
    if (!audioBuffers[name])
    {
        return;
    }

    const source = audioContext.createBufferSource();
    source.buffer = audioBuffers[name];
    source.connect(audioGains[volume]);
    source.start();
}

function setAudioVolume(name, value)
{
    audioGains[name].gain.value = value / 100;
}

function handleAudioTap(event)
{
    // Pointer taps start before navigation. The following click must not repeat them.
    if (event.button !== 0 || (event.type === "click" && event.detail !== 0))
    {
        return;
    }

    const control = event.target.closest('a, button, summary, select, input[type="button"], input[type="submit"]');
    if (control && !control.disabled)
    {
        unlockAudio();
        playSound("ui_tap", "tap_volume");
    }
}

// Events inside the iframe stay in its document.
function connectPageAudio()
{
    const page = document.getElementById("app-frame").contentDocument;
    page.addEventListener("pointerdown", unlockAudio, true);
    page.addEventListener("keydown", unlockAudio, true);
    page.addEventListener("pointerdown", handleAudioTap, true);
    page.addEventListener("click", handleAudioTap, true);
}

document.addEventListener("DOMContentLoaded", function()
{
    document.getElementById("app-frame").addEventListener("load", connectPageAudio);
    connectPageAudio();
});

for (const name in audioFiles)
{
    loadSound(name).catch(console.error);
}
