from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from route_optimizer import (
    nearest_neighbor_route,
    calculate_total_distance,
    optimize_multi_bus_route
)
from eta_predictor import calculate_eta, calculate_route_eta

app = FastAPI(
    title="HKCS AI Route Optimization Service",
    description="AI-powered route optimization and ETA prediction for Happy Kids Commuter System",
    version="1.0.0"
)

# Allow requests from backend and dashboard
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

# request models

class Stop(BaseModel):
    id: int
    name: str
    latitude: float
    longitude: float

class OptimizeRouteRequest(BaseModel):
    stops: List[Stop]

class MultiBusRequest(BaseModel):
    stops: List[Stop]
    num_buses: int

class ETARequest(BaseModel):
    current_lat: float
    current_lng: float
    destination_lat: float
    destination_lng: float
    zone: Optional[str] = "default"

class RouteETARequest(BaseModel):
    stops: List[Stop]
    bus_lat: float
    bus_lng: float

# routes

@app.get("/")
def root():
    return {
        "service": "HKCS AI Route Optimization",
        "status": "running",
        "version": "1.0.0"
    }

@app.post("/optimize-route")
def optimize_route(request: OptimizeRouteRequest):
    """
    Optimize pickup/dropoff order for a single bus.
    Uses Nearest Neighbor algorithm for fast, efficient routing.
    """
    if not request.stops:
        raise HTTPException(status_code=400, detail="No stops provided")

    stops = [s.dict() for s in request.stops]
    optimized = nearest_neighbor_route(stops)
    total_distance = calculate_total_distance(optimized)

    # Calculate time estimate (assuming 25 km/h average in Nairobi)
    estimated_minutes = round((total_distance / 25) * 60)

    return {
        "original_stops": len(stops),
        "optimized_route": optimized,
        "total_distance_km": total_distance,
        "estimated_duration_minutes": estimated_minutes,
        "message": f"Route optimized for {len(stops)} stops"
    }

@app.post("/optimize-multi-bus")
def optimize_multi_bus(request: MultiBusRequest):
    """
    Optimize routes for multiple buses.
    Splits stops efficiently among available buses.
    """
    if not request.stops:
        raise HTTPException(status_code=400, detail="No stops provided")

    if request.num_buses < 1:
        raise HTTPException(status_code=400, detail="Number of buses must be at least 1")

    stops = [s.dict() for s in request.stops]
    routes = optimize_multi_bus_route(stops, request.num_buses)

    total_distance = sum(r['total_distance_km'] for r in routes)

    return {
        "total_stops": len(stops),
        "num_buses": request.num_buses,
        "routes": routes,
        "total_combined_distance_km": round(total_distance, 2),
        "message": f"Optimized {len(stops)} stops across {request.num_buses} buses"
    }

@app.post("/calculate-eta")
def get_eta(request: ETARequest):
    """
    Calculate ETA from current bus position to a destination.
    Accounts for time of day and Nairobi traffic patterns.
    """
    eta = calculate_eta(
        request.current_lat,
        request.current_lng,
        request.destination_lat,
        request.destination_lng,
        request.zone
    )

    return {
        "eta": eta,
        "message": f"Estimated arrival in {eta['estimated_arrival']}"
    }

@app.post("/route-eta")
def get_route_eta(request: RouteETARequest):
    """
    Calculate cumulative ETA to each stop on a route
    from the bus's current position.
    """
    if not request.stops:
        raise HTTPException(status_code=400, detail="No stops provided")

    stops = [s.dict() for s in request.stops]
    stops_with_eta = calculate_route_eta(stops, request.bus_lat, request.bus_lng)

    return {
        "bus_position": {
            "latitude": request.bus_lat,
            "longitude": request.bus_lng
        },
        "stops_with_eta": stops_with_eta,
        "total_stops": len(stops_with_eta),
        "message": f"ETA calculated for {len(stops_with_eta)} stops"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "HKCS AI Service"}