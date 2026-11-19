// Shared typing and tap sounds for the outer app.html page.
const audioContext = new AudioContext({latencyHint: "interactive"});
const audioBuffers = {};       // Decoded sounds keyed by name
const audioGains =
{
    game_volume: audioContext.createGain(),
    tap_volume: audioContext.createGain()
};

// Give Game and Tap their own volume controls.
for (const name in audioGains)
{
    audioGains[name].gain.value = audioSettings[name] / 100;
    audioGains[name].connect(audioContext.destination);
}

// Fetch and decode a recording once for repeated playback.
async function loadSound(name)
{
    const response = await fetch(audioFiles[name]);
    const recording = await response.arrayBuffer();
    audioBuffers[name] = await audioContext.decodeAudioData(recording);
}

// Allow background music and sound effects after user interaction.
function unlockAudio()
{
    unlockMusic();

    if (audioContext.state === "suspended")
    {
        audioContext.resume().catch(console.error);
    }
}

// Create a new source so consecutive sounds can overlap.
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

// Convert the slider percentage to its sound-effect gain.
function setAudioVolume(name, value)
{
    audioGains[name].gain.value = value / 100;
}

// Play a tap when an enabled control receives input.
function handleAudioTap(event)
{
    // Play on pointerdown or a keyboard click to avoid a double tap.
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

// Attach shared audio handlers to the current iframe document.
function connectPageAudio()
{
    const page = document.getElementById("app-frame").contentDocument;
    page.addEventListener("pointerdown", unlockAudio, true);
    page.addEventListener("keydown", unlockAudio, true);
    page.addEventListener("pointerdown", handleAudioTap, true);
    page.addEventListener("click", handleAudioTap, true);
}

// Reconnect handlers whenever iframe navigation replaces its document.
document.addEventListener("DOMContentLoaded", function()
{
    document.getElementById("app-frame").addEventListener("load", connectPageAudio);
    connectPageAudio();
});

// Preload the sound files listed in app.html.
for (const name in audioFiles)
{
    loadSound(name).catch(console.error);
}
