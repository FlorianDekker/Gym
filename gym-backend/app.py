from flask import Flask, jsonify, render_template
from flask_cors import CORS
import psycopg2
import os

app = Flask(__name__)
CORS(app)  # allows frontend access

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

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=True, host="0.0.0.0", port=port)
