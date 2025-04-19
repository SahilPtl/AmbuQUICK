import requests
import json
import time
import datetime
from config import config
from geopy.distance import distance as geopy_distance
from utils import is_vehicle_potentially_ahead
# --- NOTE: Import data stores from app.py or pass them in ---
# This example assumes they are global vars accessible where this function is called

# --- Global In-Memory Data Stores (defined in app.py now) ---
# ambulances_data = {}
# vehicles_data = {}


# --- Mapping Service Logic (same as before) ---
def get_predicted_route(start_lat, start_lon, end_lat=None, end_lon=None, heading=None):
    # ... (same implementation) ...
    print(f"TODO: Implement route prediction from ({start_lat},{start_lon})")
    return None

# --- Push Notification Logic (same as before) ---
def send_push_notification(vehicle_info, message):
    # ... (same implementation) ...
    print(f"--- Sending Alert ---")
    print(f"To Vehicle ID: {vehicle_info.get('id', 'N/A')}")
    print(f"Message: {message}")
    print(f"FCM Token: {vehicle_info.get('fcm_token')}")
    print(f"APNS Token: {vehicle_info.get('apns_token')}")
    print(f"---------------------")
    pass


# --- Alerting Logic (Adapted for Dictionaries - No Celery needed) ---
def check_all_alerts_job(app_context):
    """
    The function that will be run periodically by the scheduler.
    Needs access to the application context for config and potentially logging.
    Accesses the global data dictionaries.
    """
    with app_context: # Use Flask app context if needed for config or logging
        print("Running periodic alert check job (APScheduler)...")
        current_time = time.time()
        active_ambulance_ids = []

        # --- Needs access to global ambulances_data & vehicles_data ---
        # These should be defined in the main app.py scope
        from app import ambulances_data, vehicles_data # Assuming defined in app.py

        # --- Concurrency Warning: Reading while Flask handles requests ---
        # Less critical than multi-process, but still use locks if concerned
        try:
            # Iterate safely over a copy of keys
            amb_ids = list(ambulances_data.keys())
            for amb_id in amb_ids:
                if amb_id in ambulances_data: # Check again in case deleted
                    amb_data = ambulances_data[amb_id]
                    if (amb_data.get('status') == 'active' and
                            (current_time - amb_data.get('last_updated', 0)) < config.AMBULANCE_DATA_TIMEOUT_SECONDS):
                        active_ambulance_ids.append(amb_id)

            print(f"Found {len(active_ambulance_ids)} active ambulances.")

            for amb_id in active_ambulance_ids:
                 if amb_id in ambulances_data: # Check again
                    print(f"Processing alerts for ambulance: {amb_id}")
                    process_alerts(amb_id, ambulances_data[amb_id], vehicles_data) # Pass vehicle data too

            print("Alert check job finished.")

        except Exception as e:
            print(f"ERROR in check_all_alerts_job: {e}")
            # Implement proper logging


def find_vehicles_to_alert(ambulance_id, amb_data, current_vehicles_data):
    """ Finds vehicles near the ambulance. Operates on the in-memory dictionaries. """
    # ... (logic mostly same as previous 'services.py', just takes vehicles_data as arg) ...
    current_time = time.time()
    amb_location = amb_data.get('location')
    if not amb_location: return []
    amb_lat, amb_lon = amb_location

    vehicles_to_alert = []
    recently_alerted_ids = {
        veh_id for veh_id, alert_ts in amb_data.get('alerted_vehicles', {}).items()
        if (current_time - alert_ts) < config.ALERT_COOLDOWN_SECONDS
    }

    # Iterate through the passed-in vehicles dictionary
    for veh_id, veh_data in current_vehicles_data.items():
        if (current_time - veh_data.get('last_updated', 0)) > config.VEHICLE_DATA_TIMEOUT_SECONDS: continue
        if veh_id in recently_alerted_ids: continue
        if not veh_data.get('fcm_token') and not veh_data.get('apns_token'): continue
        veh_location = veh_data.get('location')
        if not veh_location: continue
        veh_lat, veh_lon = veh_location

        try:
            distance_meters = geopy_distance((amb_lat, amb_lon), (veh_lat, veh_lon)).meters
        except ValueError: continue

        if distance_meters < config.ALERT_RADIUS_METERS:
             is_ahead = is_vehicle_potentially_ahead(amb_lat, amb_lon, amb_data.get('heading'), veh_lat, veh_lon)
             if is_ahead:
                alert_info = veh_data.copy()
                alert_info['id'] = veh_id
                vehicles_to_alert.append({'vehicle_info': alert_info, 'distance': distance_meters})

    return vehicles_to_alert


def process_alerts(ambulance_id, amb_data, current_vehicles_data):
    """Finds and sends alerts for a given active ambulance's data."""
    # Needs access to global ambulances_data to log alerts
    from app import ambulances_data

    vehicles_found = find_vehicles_to_alert(ambulance_id, amb_data, current_vehicles_data)

    for item in vehicles_found:
        vehicle_info = item['vehicle_info']
        distance = item['distance']
        vehicle_id = vehicle_info['id']

        # ... (Calculate ETA message - same as before) ...
        eta_seconds = 0
        speed_kph = amb_data.get('speed_kph')
        if speed_kph and speed_kph > 5:
            speed_mps = speed_kph * 1000 / 3600
            eta_seconds = int(distance / speed_mps) if speed_mps > 0 else 0

        message = f"Emergency vehicle approaching! Approx {distance:.0f}m away."
        if eta_seconds > 0:
             eta_minutes = eta_seconds // 60
             eta_sec_rem = eta_seconds % 60
             if eta_minutes > 0: message += f" ETA: ~{eta_minutes} min {eta_sec_rem} sec."
             else: message += f" ETA: ~{eta_sec_rem} sec."


        send_push_notification(vehicle_info, message)

        # Log the alert by updating the ambulance's alerted list (in global dict)
        # --- Concurrency Warning ---
        if ambulance_id in ambulances_data: # Check exists
            if 'alerted_vehicles' not in ambulances_data[ambulance_id]:
                ambulances_data[ambulance_id]['alerted_vehicles'] = {}
            ambulances_data[ambulance_id]['alerted_vehicles'][vehicle_id] = time.time()