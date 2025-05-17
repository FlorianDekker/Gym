from flask import Flask, jsonify, render_template, request
from flask_cors import CORS
import psycopg2
import os

app = Flask(__name__)
CORS(app, origins=["https://gym-pc00.onrender.com"])  # allows frontend access

DATABASE_URL = os.environ.get("DATABASE_URL")

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/exercises.json")
def get_exercises():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        cur.execute("SELECT id, name, muscle_group FROM workouts.exercise ORDER BY name")
        exercises = cur.fetchall()
        result = [{"id": e[0], "name": e[1], "muscle_group": e[2]} for e in exercises]
        cur.close()
        conn.close()
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/submit", methods=["POST"])
def submit_workout():
    data = request.get_json()
    print("Received data:", data, flush=True) 

    workout_name = data.get("workout")
    date = data.get("date")
    exercises = data.get("exercises")

    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()

        # Get workout_id
        cur.execute("SELECT id FROM workouts.workout WHERE LOWER(name) = LOWER(%s)", (workout_name,))
        workout_row = cur.fetchone()
        if not workout_row:
            return jsonify({"success": False, "error": f"Workout '{workout_name}' not found"}), 400
        workout_id = workout_row[0]

        # Insert session
        cur.execute("INSERT INTO workouts.session (date, workout_id) VALUES (%s, %s) RETURNING id", (date, workout_id))
        session_id = cur.fetchone()[0]

        for ex in exercises:
            name = ex["name"].strip()
            sets = ex["sets"]

            # Get or create exercise
            cur.execute("SELECT id FROM workouts.exercise WHERE LOWER(name) = LOWER(%s)", (name,))
            row = cur.fetchone()
            if row:
                exercise_id = row[0]
            else:
                cur.execute("INSERT INTO workouts.exercise (name, muscle_group) VALUES (%s, %s) RETURNING id", (name, None))
                exercise_id = cur.fetchone()[0]

            # Insert session_exercise
            default_group = 'Other'
            cur.execute(
                    "INSERT INTO workouts.exercise (name, muscle_group) VALUES (%s, %s) RETURNING id",
                    (name, default_group)
                )
            session_exercise_id = cur.fetchone()[0]

            # Insert sets
            for s in sets:
                reps = s["reps"]
                weight = s["weight"]
                cur.execute("INSERT INTO workouts.session_set (session_exercise_id, reps, weight) VALUES (%s, %s, %s)", (session_exercise_id, reps, weight))

        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"success": True})

    except Exception as e:
        print(e)
        return jsonify({"success": False, "error": str(e)}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=True, host="0.0.0.0", port=port)

