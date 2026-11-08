let resultAttempt = 0;
let savedAttempt = -1;

// Restart gets a new result ID without changing the typing engine or making a request.
function startResultRun()
{
    resultAttempt++;
}

function saveGameResult(typed, correct, elapsed, missed)
{
    if (savedAttempt === resultAttempt)
    {
        return;
    }

    const attempt = resultAttempt;
    savedAttempt = attempt;
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

    const result =
    {
        run_id: resultConfig.runId + "-" + attempt,
        typed_count: typed,
        correct_count: correct,
        elapsed_ms: elapsed,
        missed_count: missed
    };

    fetch(resultConfig.url,
    {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(result)
    })
    .then(function (response)
    {
        return response.json().then(function (data)
        {
            if (!response.ok)
            {
                throw new Error(data.error || "Result not saved.");
            }
            if (resultAttempt === attempt)
            {
                footerMessage.textContent += " · Saved for " + data.profile;
            }
        });
    })
    .catch(function (error)
    {
        if (resultAttempt === attempt)
        {
            footerMessage.textContent += " · Not saved: " + error.message;
        }
    });
}
