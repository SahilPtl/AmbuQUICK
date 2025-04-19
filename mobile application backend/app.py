from flask import Flask, request, jsonify
from config import config
# --- Remove Celery imports ---
# from tasks import check_all_alerts
import datetime
import time
# --- Remove Redis import ---
# import redis

# --- Add APScheduler imports ---
from apscheduler.schedulers.background import BackgroundScheduler
import atexit # To shut down scheduler gracefully

# --- Define Global In-Memory Stores HERE ---
# Accessible by Flask routes and the scheduled job (running in same process)
# WARNING: Not thread-safe by default if Flask uses threads for requests! Use locks if needed.
ambulances_data = {}
vehicles_data = {}


def create_app():
    app = Flask(__name__)
    app.config.from_object(config)

    # --- Import services function AFTER defining data stores ---
    from services import check_all_alerts_job

    # --- Initialize Scheduler ---
    scheduler = BackgroundScheduler(daemon=True) # daemon=True allows app exit even if scheduler thread is active
    scheduler.add_job(
        func=check_all_alerts_job,
        args=[app.app_context()], # Pass app context to the job
        trigger='interval',
        seconds=config.SCHEDULER_INTERVAL_SECONDS,
        id='alert_check_job',       # Optional: Give the job an ID
        replace_existing=True)
    scheduler.start()
    print(f"APScheduler started, running job every {config.SCHEDULER_INTERVAL_SECONDS} seconds.")

    # Shut down the scheduler when exiting the app
    atexit.register(lambda: scheduler.shutdown())


    # --- API Endpoints (Mostly same as previous 'no-database' version) ---
    @app.route('/ambulance/update', methods=['POST'])
    def update_ambulance():
        # TODO: Authentication
        data = request.json
        ambulance_id = data.get('ambulance_id')
        # ... (rest of validation same as before) ...
        status = data.get('status')
        lat = data.get('latitude')
        lon = data.get('longitude')
        # --- Validation ---
        if not all([ambulance_id, status]): return jsonify({"error": "Missing id or status"}), 400
        if status not in ['active', 'inactive']: return jsonify({"error": "Invalid status"}), 400
        if status == 'active' and (lat is None or lon is None): return jsonify({"error": "Missing lat/lon for active"}), 400

        current_time = time.time()

        # --- Access global dict ---
        if ambulance_id not in ambulances_data:
             ambulances_data[ambulance_id] = {'alerted_vehicles': {}}

        ambulances_data[ambulance_id].update({
            'status': status,
            'location': (lat, lon) if status == 'active' else None,
            'heading': data.get('heading'),
            'speed_kph': data.get('speed_kph'),
            'last_updated': current_time
        })
        if status == 'inactive':
             ambulances_data[ambulance_id]['alerted_vehicles'] = {}

        print(f"Updated Ambulance {ambulance_id}: Status {status}")
        return jsonify({"status": "success", "ambulance_id": ambulance_id}), 200


    @app.route('/vehicle/update', methods=['POST'])
    def update_vehicle():
        # TODO: Authentication
        data = request.json
        vehicle_id = data.get('vehicle_id')
        # ... (rest of validation same as before) ...
        lat = data.get('latitude')
        lon = data.get('longitude')
        fcm_token = data.get('fcm_token')
        apns_token = data.get('apns_token')

        # --- Validation ---
        if not all([vehicle_id, lat is not None, lon is not None]):
            return jsonify({"error": "Missing id, latitude, or longitude"}), 400

        current_time = time.time()

        # --- Access global dict ---
        if vehicle_id not in vehicles_data:
            vehicles_data[vehicle_id] = {}

        vehicles_data[vehicle_id].update({
             'location': (lat, lon),
             'last_updated': current_time
        })
        if fcm_token: vehicles_data[vehicle_id]['fcm_token'] = fcm_token
        if apns_token: vehicles_data[vehicle_id]['apns_token'] = apns_token

        return jsonify({"status": "success", "vehicle_id": vehicle_id}), 200

    @app.route('/health')
    def health_check():
        # Check scheduler status
        scheduler_running = scheduler.running
        return jsonify({
            "status": "ok",
            "info": "Running in-memory with APScheduler",
            "scheduler_running": scheduler_running
        }), 200

    return app

# --- Main execution ---
if __name__ == '__main__':
    app = create_app()
    # Use debug=False for production, but Werkzeug reloader in debug mode
    # might cause issues with APScheduler running jobs twice. Test carefully.
    # For development, running without debug/reloader might be simpler:
    # app.run(host='0.0.0.0', port=5000, debug=False, use_reloader=False)
    app.run(host='0.0.0.0', port=5000) # Default Flask run