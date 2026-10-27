from flask import Flask, render_template, request

import database


app = Flask(__name__)
DURATIONS = (30, 60, 120, 300)


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/play")
def play():
    return render_template("play.html")


@app.route("/classic-levels")
def classic_levels():
    tiers = database.get_tiers()
    requested_tier = request.args.get("tier", default=1, type=int)
    selected_tier = tiers[0]

    for tier in tiers:
        if tier["id"] == requested_tier and tier["available"]:
            selected_tier = tier

    levels = database.get_levels(selected_tier["id"])
    return render_template("classic-levels.html", tiers=tiers, selected_tier=selected_tier, levels=levels)


@app.route("/classic")
def classic():
    number = request.args.get("level", "1") or "1"

    try:
        number = int(number)
    except ValueError:
        number = 0

    level = database.get_level(number)
    if level is None:
        return render_template("classic.html", level=None), 404

    return render_template("classic.html", level=dict(level))


@app.route("/time-attack")
def time_attack():
    duration = request.args.get("duration", default=60, type=int)
    if duration not in DURATIONS:
        duration = 60

    passages = []
    for passage in database.get_passages("time_attack"):
        passages.append(passage["content"])

    return render_template("time-attack.html", duration=duration, passages=passages)


@app.route("/survival")
def survival():
    tiers = []
    for number in range(1, 6):
        tiers.append({"number": number, "passages": []})

    for passage in database.get_passages("survival"):
        tiers[passage["tier"] - 1]["passages"].append(passage["content"])

    return render_template("survival.html", tiers=tiers)


if __name__ == "__main__":
    app.run(debug=True)
