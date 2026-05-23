from flask import Flask, jsonify, render_template, request
from flask_cors import CORS
from datetime import date
import psycopg2
import os

app = Flask(__name__)
CORS(app, origins=[
    "https://gym-pc00.onrender.com",
    "https://floriandekker.github.io",
    "http://localhost:5173",
])

DATABASE_URL = os.environ.get("DATABASE_URL")

@app.route("/")
def home():
    return render_template("index.html")

def get_db_connection():
    return psycopg2.connect(DATABASE_URL)

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
    
from datetime import datetime

@app.route("/latest_workouts.json")
def latest_workouts():
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT date, notes
        FROM workouts.workout
        ORDER BY date DESC
        LIMIT 10
    """)
    rows = cur.fetchall()
    cur.close()
    conn.close()

    # Format date into 'Sat, 07 Jun 2025'
    result = [{
        "date": row[0].strftime('%a, %d %b %Y'),
        "notes": row[1]
    } for row in rows]

    return jsonify(result)

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

        # Insert into workout table
        cur.execute("INSERT INTO workouts.workout (date, notes) VALUES (%s, %s) RETURNING id", (date, workout_name))
        workout_id = cur.fetchone()[0]

        for ex_index, ex in enumerate(exercises, start=1):
            name = ex["name"].strip()
            sets = ex["sets"]

            # Get or create exercise
            cur.execute("SELECT id FROM workouts.exercise WHERE LOWER(name) = LOWER(%s)", (name.lower(),))
            row = cur.fetchone()
            if row:
                exercise_id = row[0]
            else:
                cur.execute("INSERT INTO workouts.exercise (name, muscle_group) VALUES (%s, %s) RETURNING id", (name, "Other"))
                exercise_id = cur.fetchone()[0]

            # Insert each set into workout_set
            for s in sets:
                reps = s["reps"]
                weight = s["weight"]
                cur.execute("""
                    INSERT INTO workouts.workout_set (workout_id, exercise_id, order_in_workout, reps, weight)
                    VALUES (%s, %s, %s, %s, %s)
                """, (workout_id, exercise_id, ex_index, reps, weight))

        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"success": True})

    except Exception as e:
        print(e)
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/latest_sets.json")
def get_latest_sets():
    exercise_id = request.args.get("exercise_id", type=int)
    if not exercise_id:
        return jsonify({"error": "Missing exercise_id"}), 400

    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()

        cur.execute("""
            SELECT reps, weight
            FROM workouts.workout_set
            WHERE exercise_id = %s
            ORDER BY workout_id DESC, id DESC
            LIMIT 3
        """, (exercise_id,))
        sets = cur.fetchall()
        cur.close()
        conn.close()

        return jsonify([{"reps": r, "weight": float(w)} for r, w in sets])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/volume')
def get_volume():
    exercise_id = request.args.get('exercise_id', type=int)
    if not exercise_id:
        return jsonify({'error': 'Missing exercise_id'}), 400

    query = """
        SELECT
            w.date,
            SUM(ws.reps * ws.weight) AS total_volume
        FROM workouts.workout_set ws
        JOIN workouts.workout w ON ws.workout_id = w.id
        WHERE ws.exercise_id = %s
        GROUP BY w.date
        ORDER BY w.date;
    """

    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(query, (exercise_id,))
        rows = cur.fetchall()
        result = [
            {'date': r[0].isoformat(), 'total_volume': float(r[1])}
            for r in rows
        ]
        cur.close()
        conn.close()
        return jsonify(result)
    except Exception as e:
        print("Error fetching volume data:", e)
        return jsonify({'error': 'Internal server error'}), 500
    
@app.route("/latest_sets_by_exercise.json")
def get_latest_sets_by_exercise():
    exercise_id = request.args.get("exercise_id", type=int)
    if not exercise_id:
        return jsonify({"error": "Missing exercise_id"}), 400
    
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        query = """
            SELECT
                ws.reps,
                ws.weight,
                w.date
            FROM workouts.workout_set ws
            JOIN workouts.workout w ON ws.workout_id = w.id
            WHERE ws.exercise_id = %s
            ORDER BY w.date DESC, ws.id DESC
        """
        cur.execute(query, (exercise_id,))
        sets = cur.fetchall()
        cur.close()
        conn.close()
        
        # Group sets by workout date to display them in the table
        grouped_sets = {}
        for reps, weight, workout_date in sets:
            date_str = workout_date.strftime('%a, %d %b %Y')
            if date_str not in grouped_sets:
                grouped_sets[date_str] = []
            grouped_sets[date_str].append({"reps": reps, "weight": float(weight)})

        # Calculate total volume for each date
        volume_data = []
        for date_str, set_list in grouped_sets.items():
            total_volume = sum(s['reps'] * s['weight'] for s in set_list)
            volume_data.append({
                "date": date_str,
                "total_volume": total_volume,
                "sets": set_list
            })
            
        return jsonify(volume_data)
        
    except Exception as e:
        print(f"Error fetching detailed sets: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/export_all.json")
def export_all():
    """One-time bulk export for migrating to the new local-first app."""
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("SELECT id, name, muscle_group FROM workouts.exercise ORDER BY id")
        exercises = [{"id": r[0], "name": r[1], "muscle_group": r[2]} for r in cur.fetchall()]

        cur.execute("SELECT id, date, notes FROM workouts.workout ORDER BY date, id")
        workouts_rows = cur.fetchall()

        cur.execute("""
            SELECT workout_id, exercise_id, order_in_workout, reps, weight, id
            FROM workouts.workout_set
            ORDER BY workout_id, order_in_workout, id
        """)
        sets_rows = cur.fetchall()
        sets_by_workout = {}
        for workout_id, exercise_id, order_in_workout, reps, weight, set_id in sets_rows:
            sets_by_workout.setdefault(workout_id, []).append({
                "id": set_id,
                "exercise_id": exercise_id,
                "order_in_workout": order_in_workout,
                "reps": reps,
                "weight": float(weight),
            })

        workouts = [{
            "id": wid,
            "date": d.isoformat() if hasattr(d, "isoformat") else d,
            "notes": notes,
            "sets": sets_by_workout.get(wid, []),
        } for wid, d, notes in workouts_rows]

        cur.close()
        conn.close()
        return jsonify({"exercises": exercises, "workouts": workouts})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=True, host="0.0.0.0", port=port)

