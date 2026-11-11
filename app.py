from flask import Flask, render_template, request, redirect, url_for, jsonify
from datetime import datetime, timedelta
import sqlite3

import database


app = Flask(__name__)
DURATIONS = (30, 60, 120, 300)
active_profile_id = None
game_volume = 50
tap_volume = 70
background_music_volume = 60


@app.route("/")
def index():
    return render_template("app.html", background_music_volume=background_music_volume,
                           game_volume=game_volume, tap_volume=tap_volume)


@app.route("/home")
def home():
    return render_template("index.html", active_profile=database.get_profile(active_profile_id))


@app.route("/play")
def play():
    active_profile = database.get_profile(active_profile_id)
    if active_profile is None:
        return redirect(url_for("profiles", choose=1))

    return render_template("play.html", active_profile=active_profile)


@app.route("/classic-levels")
def classic_levels():
    active_profile = database.get_profile(active_profile_id)
    if active_profile is None:
        return redirect(url_for("profiles", choose=1))

    tiers = database.get_tiers()
    requested_tier = request.args.get("tier", default=1, type=int)
    selected_tier = tiers[0]

    for tier in tiers:
        if tier["id"] == requested_tier and tier["available"]:
            selected_tier = tier

    levels = database.get_levels(selected_tier["id"])
    bests = {}
    for result in database.get_classic_bests(active_profile_id):
        bests[result["level_id"]] = result["stars"]
    return render_template("classic-levels.html", tiers=tiers, selected_tier=selected_tier, levels=levels, bests=bests, active_profile=active_profile)


@app.route("/classic")
def classic():
    active_profile = database.get_profile(active_profile_id)
    if active_profile is None:
        return redirect(url_for("profiles", choose=1))

    level = database.get_level(request.args.get("level") or 1)
    if level is None:
        return render_template("classic.html", level=None, active_profile=active_profile), 404

    return render_template("classic.html", level=dict(level), active_profile=active_profile)


@app.route("/time-attack")
def time_attack():
    active_profile = database.get_profile(active_profile_id)
    if active_profile is None:
        return redirect(url_for("profiles", choose=1))

    duration = request.args.get("duration", default=60, type=int)
    if duration not in DURATIONS:
        duration = 60

    passages = []
    for passage in database.get_passages("time_attack"):
        passages.append(passage["content"])

    return render_template("time-attack.html", duration=duration, passages=passages, active_profile=active_profile)


@app.route("/survival")
def survival():
    active_profile = database.get_profile(active_profile_id)
    if active_profile is None:
        return redirect(url_for("profiles", choose=1))

    tiers = []
    for number in range(1, 6):
        tiers.append({"number": number, "passages": []})

    for passage in database.get_passages("survival"):
        tiers[passage["tier"] - 1]["passages"].append(passage["content"])

    return render_template("survival.html", tiers=tiers, active_profile=active_profile)


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
    global active_profile_id

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
                        active_profile_id = database.create_profile(name)
                    else:
                        database.rename_profile(profile_id, name)
                except sqlite3.IntegrityError:
                    error = "A profile with this name already exists."
        elif action == "switch":
            active_profile_id = profile_id
        elif action == "delete":
            database.delete_profile(profile_id)
            if active_profile_id == profile_id:
                remaining_profiles = database.get_profiles()
                active_profile_id = remaining_profiles[0]["id"] if remaining_profiles else None
        else:
            error = "Choose an existing profile."

        if error is None:
            return redirect(url_for("profiles"))

    return render_template("profiles.html", profiles=database.get_profiles(), error=error, modal=modal,
                           entered_name=name, edit_id=profile_id, active_profile=database.get_profile(active_profile_id))


@app.route("/progress")
def progress():
    active_profile = database.get_profile(active_profile_id)
    tab = request.args.get("tab", "classic")
    if tab not in ("classic", "time_attack", "survival", "leaderboard"):
        tab = "classic"
    mode = request.args.get("mode", "classic")
    if mode not in ("classic", "time_attack", "survival"):
        mode = "classic"
    summary = None
    recent = []
    if active_profile is not None and tab != "leaderboard":
        summary, recent = database.get_progress(active_profile_id, tab)
    leaderboard = []
    if tab == "leaderboard":
        leaderboard = database.get_leaderboard(mode)
    return render_template("progress.html", tab=tab, mode=mode, summary=summary,
                           recent=recent, leaderboard=leaderboard, active_profile=active_profile)


@app.route("/settings", methods=["GET", "POST"])
def settings():
    global game_volume, tap_volume, background_music_volume

    if request.method == "POST":
        game_volume = request.form.get("game_volume", game_volume, type=int)
        tap_volume = request.form.get("tap_volume", tap_volume, type=int)
        background_music_volume = request.form.get("background_music_volume", background_music_volume, type=int)
        return jsonify(saved=True)

    return render_template("settings.html", game_volume=game_volume, tap_volume=tap_volume,
                           background_music_volume=background_music_volume,
                           active_profile=database.get_profile(active_profile_id))


@app.route("/results", methods=["POST"])
def save_results():
    active_profile = database.get_profile(active_profile_id)
    if active_profile is None:
        return jsonify(error="Choose a profile before saving."), 401

    data = request.get_json()
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
        database.save_result(mode, active_profile_id, net_wpm, accuracy, elapsed,
                             stars, data.get("level_id"), data.get("duration"), tier)
    except sqlite3.IntegrityError:
        return jsonify(error="Profile, level, or duration is no longer valid. Result not saved."), 409
    return jsonify(saved=True, profile=active_profile["name"], stars=stars)


if __name__ == "__main__":
    existing_profiles = database.get_profiles()
    if existing_profiles:
        active_profile_id = existing_profiles[0]["id"]

    app.run(debug=True, use_reloader=False)
