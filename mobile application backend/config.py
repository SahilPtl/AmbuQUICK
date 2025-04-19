import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # --- Redis/Celery Config Removed ---

    # External APIs (Same as before)
    MAPPING_API_KEY = os.getenv('MAPPING_API_KEY')
    MAPBOX_ACCESS_TOKEN = os.getenv('MAPBOX_ACCESS_TOKEN')
    FCM_API_KEY = os.getenv('FCM_API_KEY')
    APNS_KEY_PATH = os.getenv('APNS_KEY_PATH')
    # ... (rest of API keys) ...
    #APNS_USE_SANDBOX = os.getenv('APNS_USE_SANDBOX', 'True').lower() == 'true'

    # Application Settings (Same as before)
    VEHICLE_DATA_TIMEOUT_SECONDS = 120
    AMBULANCE_DATA_TIMEOUT_SECONDS = 60
    ALERT_RADIUS_METERS = 2000
    ALERT_COOLDOWN_SECONDS = 60
    # --- New ---
    SCHEDULER_INTERVAL_SECONDS = 5 # How often the background check runs

config = Config()