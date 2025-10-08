from flask import Flask, request, jsonify, send_file, send_from_directory, abort
from flask_cors import CORS
import json
import csv
import os
import threading
import logging

# ----------------- Configuration -----------------

class Config:
    DATA_FILE = os.environ.get("DATA_FILE", "licenses.json")
    EXPORT_CSV = os.environ.get("EXPORT_CSV", "licenses_export.csv")
    STATIC_FOLDER = "static"
    STATIC_URL_PATH = "/static"
    TEMPLATES_FOLDER = "templates"

# ----------------- App Initialization -----------------

app = Flask(__name__, static_folder=Config.STATIC_FOLDER, static_url_path=Config.STATIC_URL_PATH)
CORS(app, resources={r"/api/*": {"origins": "*"}})  # Limit in production

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Thread-safe file access
lock = threading.Lock()

# ----------------- Data Handling -----------------

def load_data():
    with lock:
        if not os.path.exists(Config.DATA_FILE):
            logger.warning(f"{Config.DATA_FILE} not found, initializing new.")
            with open(Config.DATA_FILE, 'w') as f:
                json.dump([], f)
        with open(Config.DATA_FILE, 'r') as f:
            try:
                return json.load(f)
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse JSON: {e}")
                return []

def save_data(data):
    with lock:
        with open(Config.DATA_FILE, 'w') as f:
            json.dump(data, f, indent=2)

# ----------------- Utility -----------------

def validate_license(data):
    required_fields = ['name', 'start_date', 'end_date', 'active', 'level']
    return all(field in data for field in required_fields)

# ----------------- API ROUTES -----------------

@app.route('/api/pulse', methods=['GET'])
def pulse():
    return jsonify({"status": "ok"}), 200

@app.route('/api/licenses', methods=['GET'])
def get_licenses():
    try:
        return jsonify(load_data()), 200
    except Exception as e:
        logger.exception("Error loading licenses")
        return jsonify({"error": "Server error"}), 500

@app.route('/api/licenses', methods=['POST'])
def add_license():
    try:
        new = request.get_json()
        if not new or not validate_license(new):
            return jsonify({"error": "Invalid license data"}), 400

        data = load_data()
        data.append(new)
        save_data(data)
        return jsonify({"status": "ok"}), 201

    except Exception as e:
        logger.exception("Failed to add license")
        return jsonify({"error": "Server error"}), 500

@app.route('/api/licenses/<int:index>', methods=['PUT'])
def update_license(index):
    try:
        updated = request.get_json()
        if not updated or not validate_license(updated):
            return jsonify({"error": "Invalid license data"}), 400

        data = load_data()
        if 0 <= index < len(data):
            data[index] = updated
            save_data(data)
            return jsonify({"status": "ok"}), 200
        return jsonify({"error": "Index out of range"}), 404

    except Exception as e:
        logger.exception("Failed to update license")
        return jsonify({"error": "Server error"}), 500

@app.route('/api/licenses/<int:index>', methods=['DELETE'])
def delete_license(index):
    try:
        data = load_data()
        if 0 <= index < len(data):
            data.pop(index)
            save_data(data)
            return jsonify({"status": "ok"}), 200
        return jsonify({"error": "Index out of range"}), 404

    except Exception as e:
        logger.exception("Failed to delete license")
        return jsonify({"error": "Server error"}), 500

@app.route('/api/export_csv', methods=['GET'])
def export_csv():
    try:
        data = load_data()
        with open(Config.EXPORT_CSV, 'w', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(['Name', 'Start Date', 'End Date', 'Active', 'Level'])
            for lic in data:
                writer.writerow([
                    lic.get('name', ''),
                    lic.get('start_date', ''),
                    lic.get('end_date', ''),
                    lic.get('active', ''),
                    lic.get('level', '')
                ])
        return send_file(Config.EXPORT_CSV, as_attachment=True, mimetype='text/csv')
    except Exception as e:
        logger.exception("Failed to export CSV")
        return jsonify({"error": "Server error"}), 500

# ----------------- FRONTEND ROUTES -----------------

@app.route('/')
def serve_index():
    try:
        return send_from_directory(Config.TEMPLATES_FOLDER, 'index.html')
    except FileNotFoundError:
        abort(404)

@app.route('/edit')
def serve_edit():
    try:
        return send_from_directory(Config.TEMPLATES_FOLDER, 'edit.html')
    except FileNotFoundError:
        abort(404)

# ----------------- MAIN -----------------

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 10000))
    logger.info(f"Starting server on port {port}")
    # DO NOT use this in production
    app.run(host='0.0.0.0', port=port, debug=False)
