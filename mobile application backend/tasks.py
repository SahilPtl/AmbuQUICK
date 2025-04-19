from celery import Celery
import time
import datetime
from config import config
from services import process_alerts, ambulances_data # Import the dict and function

# Initialize Celery (same as before)
celery_app = Celery(__name__, broker=config.CELERY_BROKER_URL, backend=config.CELERY_RESULT_BACKEND)
# celery_app.config_from_object(config, namespace='CELERY') # Load config if needed

# No Flask app context needed for DB, but might be for config
# If run as separate process, direct access to global dicts won't work unless using
# manager processes or shared memory, which adds complexity.
# Assuming Celery worker runs in a context where `ambulances_data` is accessible,
# OR that data needed is passed *to* the task. The latter is safer.

# --- SAFER APPROACH: Pass data to task ---
# @celery_app.task(name='tasks.process_single_ambulance')
# def process_single_ambulance(ambulance_id, amb_data_snapshot):
#     """ Processes alerts for a snapshot of ambulance data """
#     print(f"Processing task for ambulance: {ambulance_id}")
#     try:
#         # Note: This uses potentially stale vehicle data from the global dict
#         # A better way might involve also passing relevant vehicle data or using Redis GEO commands
#         process_alerts(ambulance_id, amb_data_snapshot)
#     except Exception as e:
#         print(f"ERROR processing task for {ambulance_id}: {e}")

# --- SIMPLER APPROACH (used below): Access global dict (Concurrency Risk!) ---
@celery_app.task(name='tasks.check_all_alerts')
def check_all_alerts():
    """
    Periodic Celery task to find active ambulances and trigger alert processing.
    WARNING: Accesses global dicts - risky with multiple workers unless managed.
    """
    print("Running periodic alert check task (in-memory)...")
    current_time = time.time()
    active_ambulance_ids = []

    # --- Concurrency Warning: Reading while another thread/process might write ---
    try:
        # Iterate safely over a copy of keys if needed, or use locks
        amb_ids = list(ambulances_data.keys())
        for amb_id in amb_ids:
             # Check existence again in case deleted between getting keys and access
            if amb_id in ambulances_data:
                amb_data = ambulances_data[amb_id]
                if (amb_data.get('status') == 'active' and
                        (current_time - amb_data.get('last_updated', 0)) < config.AMBULANCE_DATA_TIMEOUT_SECONDS):
                    active_ambulance_ids.append(amb_id)

        print(f"Found {len(active_ambulance_ids)} active ambulances.")

        for amb_id in active_ambulance_ids:
             # Check existence again
             if amb_id in ambulances_data:
                print(f"Processing alerts for ambulance: {amb_id}")
                # Access the data again - it might have changed slightly, which is okay
                process_alerts(amb_id, ambulances_data[amb_id])

        print("Alert check task finished.")
        return f"Processed {len(active_ambulance_ids)} ambulances."

    except Exception as e:
        print(f"ERROR in check_all_alerts task: {e}")
        return "Task failed."

# --- Celery Beat Schedule (same as before) ---
# celery_app.conf.beat_schedule = { ... }
# celery_app.conf.timezone = 'UTC'