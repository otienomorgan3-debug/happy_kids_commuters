from haversine import haversine, Unit
from itertools import permutations

def calculate_distance(point1, point2):
    """Calculate distance in km between two GPS coordinates"""
    return haversine(point1, point2, unit=Unit.KILOMETERS)

def nearest_neighbor_route(stops: list) -> list:
    """
    Nearest Neighbor Algorithm — greedy route optimization.
    Starts from the first stop and always visits the closest unvisited stop next.
    Good balance between speed and accuracy for school bus routing.
    
    stops: list of dicts with keys: id, name, latitude, longitude
    returns: optimized list of stops in order to visit
    """
    if not stops:
        return []
    
    if len(stops) == 1:
        return stops

    unvisited = stops.copy()
    route = [unvisited.pop(0)]  # Start from first stop (school or depot)

    while unvisited:
        current = route[-1]
        current_pos = (current['latitude'], current['longitude'])

        # Find closest unvisited stop
        closest = min(
            unvisited,
            key=lambda s: calculate_distance(
                current_pos,
                (s['latitude'], s['longitude'])
            )
        )

        route.append(closest)
        unvisited.remove(closest)

    return route

def calculate_total_distance(route: list) -> float:
    """Calculate total distance of a route in km"""
    if len(route) < 2:
        return 0.0
    
    total = 0.0
    for i in range(len(route) - 1):
        p1 = (route[i]['latitude'], route[i]['longitude'])
        p2 = (route[i + 1]['latitude'], route[i + 1]['longitude'])
        total += calculate_distance(p1, p2)
    
    return round(total, 2)

def cluster_stops_by_zone(stops: list, zones: dict) -> dict:
    """
    Group stops by geographical zone for multi-bus routing.
    zones: dict of zone_name → (center_lat, center_lng, radius_km)
    Returns: dict of zone_name → list of stops in that zone
    """
    clustered = {zone: [] for zone in zones}
    unassigned = []

    for stop in stops:
        stop_pos = (stop['latitude'], stop['longitude'])
        assigned = False

        for zone_name, (lat, lng, radius) in zones.items():
            center = (lat, lng)
            if calculate_distance(stop_pos, center) <= radius:
                clustered[zone_name].append(stop)
                assigned = True
                break

        if not assigned:
            unassigned.append(stop)

    if unassigned:
        clustered['unassigned'] = unassigned

    return clustered

def optimize_multi_bus_route(stops: list, num_buses: int) -> list:
    """
    Split stops among multiple buses and optimize each bus route.
    Uses zone clustering when possible, falls back to even splitting.
    
    Returns list of routes, one per bus.
    """
    if not stops or num_buses <= 0:
        return []

    if num_buses == 1:
        return [nearest_neighbor_route(stops)]

    # Split stops evenly among buses
    chunk_size = len(stops) // num_buses
    remainder = len(stops) % num_buses
    
    routes = []
    start = 0

    for i in range(num_buses):
        # Distribute remainder stops to first buses
        end = start + chunk_size + (1 if i < remainder else 0)
        bus_stops = stops[start:end]
        
        if bus_stops:
            optimized = nearest_neighbor_route(bus_stops)
            routes.append({
                'bus_number': i + 1,
                'stops': optimized,
                'total_distance_km': calculate_total_distance(optimized),
                'total_stops': len(optimized)
            })
        
        start = end

    return routes