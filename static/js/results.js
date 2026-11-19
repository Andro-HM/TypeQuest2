let resultSaved = false;       // Blocks another submission until Restart

// Send the completed run to Flask and display its save result.
async function saveGameResult(typed, correct, elapsed, missed)
{
    if (resultSaved)
    {
        return;
    }

    // Set the flag before awaiting Flask so duplicate calls cannot submit.
    resultSaved = true;

    // Show Classic stars from unrounded accuracy before Flask responds.
    if (resultConfig.mode === "classic")
    {
        let stars = 1;
        if (correct / typed >= 0.95)
        {
            stars = 3;
        }
        else if (correct / typed >= 0.90)
        {
            stars = 2;
        }
        footerMessage.textContent += " · STARS " + stars + " / 3";
    }

    // Combine the template configuration with the finished run's counts and time.
    const result =
    {
        mode: resultConfig.mode,
        typed_count: typed,
        correct_count: correct,
        elapsed_ms: elapsed,
        missed_count: missed
    };

    if (resultConfig.mode === "classic")
    {
        result.level_id = resultConfig.levelId;
    }
    else if (resultConfig.mode === "time_attack")
    {
        result.duration = resultConfig.duration;
    }

    // Flask calculates saved statistics and uses the selected global profile.
    try
    {
        const response = await fetch(resultConfig.url,
        {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(result)
        });
        const data = await response.json();

        if (!response.ok)
        {
            throw new Error(data.error || "Result not saved.");
        }

        // Update the footer only while the game is in its end state.
        if (gameState === "end")
        {
            footerMessage.textContent += " · Saved for " + data.profile;
        }
    }
    catch (error)
    {
        if (gameState === "end")
        {
            footerMessage.textContent += " · Not saved: " + error.message;
        }
    }
}
