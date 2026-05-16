from haversine import haversine, Unit
from datetime import datetime

# Average bus speed assumptions (km/h) based on Nairobi traffic patterns
SPEED_PROFILES = {
    'morning_peak': 20,    # 6am - 9am
    'midday': 35,          # 9am - 4pm
    'evening_peak': 18,    # 4pm - 7pm
    'off_peak': 40         # 7pm - 6am
}

# Traffic multipliers for Nairobi zones
TRAFFIC_ZONES = {
    'CBD': 0.6,          # Heavy traffic — slower
    'Westlands': 0.75,
    'Eastlands': 0.8,
    'Suburbs': 0.95,
    'default': 0.85
}

def get_speed_for_time(hour: int) -> float:
    """Get average speed based on time of day"""
    if 6 <= hour < 9:
        return SPEED_PROFILES['morning_peak']
    elif 9 <= hour < 16:
        return SPEED_PROFILES['midday']
    elif 16 <= hour < 19:
        return SPEED_PROFILES['evening_peak']
    else:
        return SPEED_PROFILES['off_peak']

def calculate_eta(
    current_lat: float,
    current_lng: float,
    destination_lat: float,
    destination_lng: float,
    zone: str = 'default'
) -> dict:
    """
    Calculate ETA from current position to destination.
    Takes into account time of day and traffic zone.
    """
    current_pos = (current_lat, current_lng)
    dest_pos = (destination_lat, destination_lng)

    # Calculate straight-line distance
    distance_km = haversine(current_pos, dest_pos, unit=Unit.KILOMETERS)

    # Add 30% for road factor (roads are never straight)
    road_distance_km = distance_km * 1.3

    # Get speed based on current time
    current_hour = datetime.now().hour
    base_speed = get_speed_for_time(current_hour)

    # Apply traffic zone multiplier
    traffic_multiplier = TRAFFIC_ZONES.get(zone, TRAFFIC_ZONES['default'])
    effective_speed = base_speed * traffic_multiplier

    # Calculate time in minutes
    time_hours = road_distance_km / effective_speed
    time_minutes = round(time_hours * 60)

    return {
        'distance_km': round(road_distance_km, 2),
        'estimated_minutes': time_minutes,
        'estimated_arrival': f"{time_minutes} minutes",
        'speed_used_kmh': round(effective_speed, 1),
        'traffic_zone': zone,
        'time_of_day': get_time_period(current_hour)
    }

def get_time_period(hour: int) -> str:
    """Get human readable time period"""
    if 6 <= hour < 9:
        return 'Morning peak'
    elif 9 <= hour < 16:
        return 'Midday'
    elif 16 <= hour < 19:
        return 'Evening peak'
    else:
        return 'Off peak'

def calculate_route_eta(stops: list, current_lat: float, current_lng: float) -> list:
    """
    Calculate ETA to each stop on a route from current bus position.
    stops: list of dicts with latitude, longitude, name
    Returns stops with ETA added to each
    """
    result = []
    cumulative_minutes = 0
    prev_lat = current_lat
    prev_lng = current_lng

    for stop in stops:
        eta = calculate_eta(prev_lat, prev_lng, stop['latitude'], stop['longitude'])
        cumulative_minutes += eta['estimated_minutes']

        result.append({
            **stop,
            'eta_minutes': cumulative_minutes,
            'eta_display': f"{cumulative_minutes} min",
            'distance_from_prev_km': eta['distance_km']
        })

        prev_lat = stop['latitude']
        prev_lng = stop['longitude']

    return result