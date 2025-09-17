from flask import Flask, request, jsonify, send_file
import json
from datetime import datetime, date
import csv
import os

app = Flask(__name__)
DATA_FILE = 'licenses.json'

def load_data():
    with open(DATA_FILE, 'r') as f:
        return json.load(f)

def save_data(data):
    with open(DATA_FILE, 'w') as f:
        json.dump(data, f, indent=2)

@app.route('/api/licenses', methods=['GET'])
def get_licenses():
    return jsonify(load_data())

@app.route('/api/licenses', methods=['POST'])
def add_license():
    new = request.get_json()
    data = load_data()
    data.append(new)
    save_data(data)
    return jsonify({"status": "ok"}), 201

@app.route('/api/licenses/<int:index>', methods=['PUT'])
def update_license(index):
    updated = request.get_json()
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

@app.route('/api/export_csv')
def export_csv():
    data = load_data()
    csv_file = 'licenses_export.csv'
    with open(csv_file, 'w', newline='') as f:
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
    return send_file(csv_file, as_attachment=True)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=10000)  # Use port 10000 for Render
