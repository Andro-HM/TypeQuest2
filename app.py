from flask import Flask, render_template, request, redirect, url_for, session, g, jsonify
from datetime import datetime, timedelta
import math
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
    entered_name = ""
    edit_id = None
    if request.method == "POST":
        action = request.form.get("action")
        profile_id = request.form.get("profile_id", type=int)
        profile = database.get_profile(profile_id)
        entered_name = request.form.get("name", "").strip()
        if action in ("create", "rename"):
            modal = action
            edit_id = profile_id
            if not 1 <= len(entered_name) <= 24:
                error = "Use 1–24 characters for the profile name."
            elif action == "rename" and profile is None:
                error = "This profile no longer exists."
            else:
                try:
                    if action == "create":
                        profile_id = database.create_profile(entered_name)
                        session["profile_id"] = profile_id
                        session.permanent = True
                    else:
                        database.rename_profile(profile_id, entered_name)
                except sqlite3.IntegrityError:
                    error = "A profile with this name already exists."
                else:
                    return redirect(url_for("profiles"))
        elif action == "switch" and profile is not None:
            session["profile_id"] = profile_id
            session.permanent = True
            return redirect(url_for("profiles"))
        elif action == "delete" and profile is not None:
            database.delete_profile(profile_id)
            if session.get("profile_id") == profile_id:
                session.pop("profile_id", None)
            return redirect(url_for("profiles"))
        else:
            error = "Choose an existing profile."
    return render_template("profiles.html", profiles=database.get_profiles(), error=error, modal=modal,
                           entered_name=entered_name, edit_id=edit_id)


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

    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify(error="Invalid result."), 400
    if data.get("profile_id") != g.profile["id"]:
        return jsonify(error="The selected profile changed. Result not saved."), 409

    mode = data.get("mode")
    if mode not in ("classic", "time_attack", "survival"):
        return jsonify(error="Choose a valid game mode."), 400

    typed = data.get("typed_count")
    correct = data.get("correct_count")
    missed = data.get("missed_count", 0)
    elapsed = data.get("elapsed_ms")
    for count in (typed, correct, missed):
        if type(count) is not int or count < 0:
            return jsonify(error="Invalid character counts."), 400
    if correct > typed or type(elapsed) not in (int, float):
        return jsonify(error="Invalid result."), 400
    if elapsed <= 0 or not math.isfinite(elapsed):
        return jsonify(error="Invalid playing time."), 400

    level_id = None
    duration = None
    if mode == "classic":
        level_id = data.get("level_id")
        if type(level_id) is not int:
            return jsonify(error="Choose a valid level."), 400
        level = database.get_level(level_id)
        if level is None or typed != len(level["content"]) or missed != 0:
            return jsonify(error="Complete an available Classic level before saving."), 400
    elif mode == "time_attack":
        duration = data.get("duration")
        if duration not in DURATIONS or elapsed != duration * 1000 or missed != 0:
            return jsonify(error="Complete a supported Time Attack duration before saving."), 400

    accuracy = 0
    if typed + missed > 0:
        accuracy = correct / (typed + missed)
    try:
        net_wpm = typed / 5 / (elapsed / 60000) * accuracy
    except (OverflowError, ZeroDivisionError):
        return jsonify(error="Invalid result."), 400
    if not math.isfinite(net_wpm):
        return jsonify(error="Invalid result."), 400

    stars = 1
    if accuracy >= 0.95:
        stars = 3
    elif accuracy >= 0.90:
        stars = 2
    tier = min(5, int(elapsed // 60000) + 1)
    try:
        database.save_result(mode, g.profile["id"], net_wpm, accuracy, elapsed,
                             stars, level_id, duration, tier)
    except sqlite3.IntegrityError:
        return jsonify(error="Profile or level no longer exists. Result not saved."), 409
    return jsonify(saved=True, profile=g.profile["name"], stars=stars)


if __name__ == "__main__":
    app.run(debug=True)
