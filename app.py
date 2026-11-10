from flask import Flask, render_template, request, redirect, url_for, session, g, jsonify
from datetime import datetime, timedelta
import sqlite3

import database


app = Flask(__name__)
DURATIONS = (30, 60, 120, 300)
# Local player selection, not online account authentication.
app.secret_key = "typequest-local-player-selection"


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
    bests = {}
    for result in database.get_classic_bests(g.profile["id"]):
        bests[result["level_id"]] = result["stars"]
    return render_template("classic-levels.html", tiers=tiers, selected_tier=selected_tier, levels=levels, bests=bests)


@app.route("/classic")
def classic():
    level = database.get_level(request.args.get("level") or 1)
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


@app.before_request
def select_active_profile():
    g.profile = database.get_profile(session.get("profile_id"))
    if g.profile is None:
        session.pop("profile_id", None)
    if request.endpoint in ("play", "classic_levels", "classic", "time_attack", "survival") and g.profile is None:
        return redirect(url_for("profiles", choose=1))


@app.context_processor
def profile_context():
    return {"active_profile": g.profile}


@app.template_filter("initials")
def initials(name):
    words = name.split()
    if len(words) > 1:
        return (words[0][0] + words[-1][0]).upper()
    if len(name) <= 2:
        return name.upper()
    return name[0].upper()


@app.template_filter("ist")
def format_ist(value):
    return (datetime.strptime(value, "%Y-%m-%d %H:%M:%S") + timedelta(hours=5, minutes=30)).strftime("%d %b %Y · %H:%M")


@app.template_filter("duration_text")
def duration_text(milliseconds):
    seconds = int(milliseconds / 1000)
    return f"{seconds // 60:02d}:{seconds % 60:02d}"


@app.route("/profiles", methods=["GET", "POST"])
def profiles():
    error = None
    modal = None
    profile_id = request.form.get("profile_id", type=int)
    name = request.form.get("name", "").strip()

    if request.method == "POST":
        action = request.form.get("action")
        if action != "create" and database.get_profile(profile_id) is None:
            error = "Choose an existing profile."
        elif action in ("create", "rename"):
            modal = action
            if not 1 <= len(name) <= 24:
                error = "Use 1–24 characters for the profile name."
            else:
                try:
                    if action == "create":
                        session["profile_id"] = database.create_profile(name)
                        session.permanent = True
                    else:
                        database.rename_profile(profile_id, name)
                except sqlite3.IntegrityError:
                    error = "A profile with this name already exists."
        elif action == "switch":
            session["profile_id"] = profile_id
            session.permanent = True
        elif action == "delete":
            database.delete_profile(profile_id)
            if session.get("profile_id") == profile_id:
                session.pop("profile_id", None)
        else:
            error = "Choose an existing profile."

        if error is None:
            return redirect(url_for("profiles"))

    return render_template("profiles.html", profiles=database.get_profiles(), error=error, modal=modal,
                           entered_name=name, edit_id=profile_id)


@app.route("/progress")
def progress():
    tab = request.args.get("tab", "classic")
    if tab not in ("classic", "time_attack", "survival", "leaderboard"):
        tab = "classic"
    mode = request.args.get("mode", "classic")
    if mode not in ("classic", "time_attack", "survival"):
        mode = "classic"
    duration = request.args.get("duration", 60, type=int)
    if duration not in DURATIONS:
        duration = 60
    summary = None
    recent = []
    if g.profile is not None and tab != "leaderboard":
        summary, recent = database.get_progress(g.profile["id"], tab)
    leaderboard = []
    if tab == "leaderboard":
        leaderboard = database.get_leaderboard(mode, duration)
    return render_template("progress.html", tab=tab, mode=mode, duration=duration, summary=summary,
                           recent=recent, leaderboard=leaderboard)


@app.route("/results", methods=["POST"])
def save_results():
    if g.profile is None:
        return jsonify(error="Choose a profile before saving."), 401

    data = request.get_json()
    if data.get("profile_id") != g.profile["id"]:
        return jsonify(error="The selected profile changed. Result not saved."), 409

    mode = data.get("mode")
    if mode not in ("classic", "time_attack", "survival"):
        return jsonify(error="Choose a valid game mode."), 400

    typed = data.get("typed_count", 0)
    correct = data.get("correct_count", 0)
    missed = data.get("missed_count", 0)
    elapsed = data.get("elapsed_ms", 0)
    if elapsed <= 0 or typed < 0 or missed < 0 or not 0 <= correct <= typed:
        return jsonify(error="Invalid playing time or character counts."), 400

    # The game sends these counts only when a run ends.
    accuracy = 0
    if typed + missed > 0:
        accuracy = correct / (typed + missed)
    net_wpm = typed / 5 / (elapsed / 60000) * accuracy
    stars = 1
    if accuracy >= 0.95:
        stars = 3
    elif accuracy >= 0.90:
        stars = 2

    tier = min(5, int(elapsed // 60000) + 1)
    try:
        database.save_result(mode, g.profile["id"], net_wpm, accuracy, elapsed,
                             stars, data.get("level_id"), data.get("duration"), tier)
    except sqlite3.IntegrityError:
        return jsonify(error="Profile, level, or duration is no longer valid. Result not saved."), 409
    return jsonify(saved=True, profile=g.profile["name"], stars=stars)


if __name__ == "__main__":
    app.run(debug=True)
