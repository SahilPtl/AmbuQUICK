# No longer needed if using geopy, keep if implementing Haversine manually
# import math

# def haversine(lat1, lon1, lat2, lon2):
#     """Calculate the great-circle distance between two points on the earth (in meters)."""
#     # ... (implementation from previous simple example) ...

# --- Add other non-DB utility functions if needed ---

def is_vehicle_potentially_ahead(amb_lat, amb_lon, amb_heading, veh_lat, veh_lon):
    """
    VERY basic check if vehicle is generally 'ahead' based on heading.
    Highly simplified due to lack of route context.
    Returns True if potentially ahead, False otherwise.
    """
    if amb_heading is None:
        return True # If no heading, assume potentially ahead within radius

    # Calculate bearing from ambulance to vehicle using math if needed
    # (This is complex, can approximate or skip if heading data unreliable)
    # Example using simplified logic (adjust threshold):
    # bearing = calculate_bearing(amb_lat, amb_lon, veh_lat, veh_lon) # Needs implementation
    # angle_diff = abs(bearing - amb_heading)
    # angle_diff = min(angle_diff, 360 - angle_diff)
    # return angle_diff <= 75 # Wider threshold maybe

    # --- SIMPLER (less accurate) ---
    # Just check if vehicle latitude/longitude is 'further along' based on cardinal heading
    if 0 <= amb_heading < 180: # Roughly North/East heading
        if veh_lat < amb_lat: return False # Should be North
    if 90 <= amb_heading < 270: # Roughly East/South heading
         if veh_lon < amb_lon: return False # Should be East
    if 180 <= amb_heading < 360: # Roughly South/West heading
        if veh_lat > amb_lat: return False # Should be South
    if 270 <= amb_heading <= 360 or 0 <= amb_heading < 90: # Roughly West/North heading
        if veh_lon > amb_lon: return False # Should be West

    return True # Passes basic checks