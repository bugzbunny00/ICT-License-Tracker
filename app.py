from flask import Flask, request, jsonify, send_file, send_from_directory
from flask_cors import CORS
import json
import csv
import os

app = Flask(__name__, static_folder="static", static_url_path="/static")
CORS(app)


DATA_FILE = 'licenses.json'

def load_data():
    if not os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'w') as f:
            json.dump([], f)
    with open(DATA_FILE, 'r') as f:
        return json.load(f)

def save_data(data):
    with open(DATA_FILE, 'w') as f:
        json.dump(data, f, indent=2)

# ----------------- API ROUTES -----------------

@app.route('/api/pulse', methods=['GET'])
def pulse():
    return jsonify({"status": "ok"}), 200

@app.route('/api/licenses', methods=['GET'])
def get_licenses():
    return jsonify(load_data())

@app.route('/api/licenses', methods=['POST'])
def add_license():
    new = request.get_json()
    if not new:
        return jsonify({"error": "No data provided"}), 400
    data = load_data()
    data.append(new)
    save_data(data)
    return jsonify({"status": "ok"}), 201

@app.route('/api/licenses/<int:index>', methods=['PUT'])
def update_license(index):
    updated = request.get_json()
    if not updated:
        return jsonify({"error": "No data provided"}), 400
    data = load_data()
    if 0 <= index < len(data):
        data[index] = updated
        save_data(data)
        return jsonify({"status": "ok"})
    return jsonify({"error": "index out of range"}), 404

@app.route('/api/licenses/<int:index>', methods=['DELETE'])
def delete_license(index):
    data = load_data()
    if 0 <= index < len(data):
        data.pop(index)
        save_data(data)
        return jsonify({"status": "ok"})
    return jsonify({"error": "index out of range"}), 404

@app.route('/api/export_csv', methods=['GET'])
def export_csv():
    data = load_data()
    csv_filename = 'licenses_export.csv'
    with open(csv_filename, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['Name','Start Date','End Date','Active','Level'])
        for lic in data:
            writer.writerow([
                lic.get('name'),
                lic.get('start_date'),
                lic.get('end_date'),
                lic.get('active'),
                lic.get('level')
            ])
    return send_file(csv_filename, as_attachment=True, mimetype='text/csv')

# ----------------- FRONTEND ROUTES -----------------

@app.route('/')
def serve_index():
    return send_from_directory('.', 'templates/index.html')

@app.route('/edit')
def serve_edit():
    return send_from_directory('.', 'templates/edit.html') 

# ----------------- MAIN -----------------

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 10000))
    app.run(host='0.0.0.0', port=port)
