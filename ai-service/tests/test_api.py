"""Tests for the FastAPI API endpoints."""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


class TestHealthEndpoint:
    def test_root_returns_service_info(self):
        """GET / should return service status."""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["service"] == "HKCS AI Route Optimization"
        assert data["status"] == "running"

    def test_health_returns_healthy(self):
        """GET /health should return healthy status."""
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"


class TestOptimizeRoute:
    def test_valid_stops_returns_optimized_route(self):
        """POST /optimize-route with valid stops should return optimization."""
        payload = {
            "stops": [
                {"id": 1, "name": "School", "latitude": -1.2921, "longitude": 36.8219},
                {"id": 2, "name": "Stop A", "latitude": -1.3000, "longitude": 36.8300},
                {"id": 3, "name": "Stop B", "latitude": -1.2800, "longitude": 36.8100},
            ]
        }
        response = client.post("/optimize-route", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["original_stops"] == 3
        assert len(data["optimized_route"]) == 3
        assert data["total_distance_km"] > 0

    def test_empty_stops_returns_400(self):
        """POST /optimize-route with empty stops should return 400."""
        response = client.post("/optimize-route", json={"stops": []})
        assert response.status_code == 400

    def test_single_stop_returns_it(self):
        """POST /optimize-route with single stop should return it directly."""
        payload = {
            "stops": [
                {"id": 1, "name": "School", "latitude": -1.2921, "longitude": 36.8219}
            ]
        }
        response = client.post("/optimize-route", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert len(data["optimized_route"]) == 1
        assert data["optimized_route"][0]["id"] == 1


class TestOptimizeMultiBus:
    def test_valid_split_returns_multiple_routes(self):
        """POST /optimize-multi-bus should split stops across buses."""
        payload = {
            "stops": [
                {"id": 1, "name": "A", "latitude": -1.292, "longitude": 36.822},
                {"id": 2, "name": "B", "latitude": -1.300, "longitude": 36.830},
                {"id": 3, "name": "C", "latitude": -1.310, "longitude": 36.840},
                {"id": 4, "name": "D", "latitude": -1.320, "longitude": 36.850},
            ],
            "num_buses": 2
        }
        response = client.post("/optimize-multi-bus", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["num_buses"] == 2
        assert len(data["routes"]) == 2
        assert data["total_combined_distance_km"] > 0

    def test_zero_buses_returns_400(self):
        """POST /optimize-multi-bus with 0 buses should return 400."""
        payload = {"stops": [{"id": 1, "name": "A", "latitude": -1.292, "longitude": 36.822}], "num_buses": 0}
        response = client.post("/optimize-multi-bus", json=payload)
        assert response.status_code == 400

    def test_empty_stops_returns_400(self):
        """POST /optimize-multi-bus with no stops should return 400."""
        payload = {"stops": [], "num_buses": 2}
        response = client.post("/optimize-multi-bus", json=payload)
        assert response.status_code == 400


class TestCalculateETA:
    def test_valid_coordinates_returns_eta(self):
        """POST /calculate-eta with valid coords should return ETA."""
        payload = {
            "current_lat": -1.2921,
            "current_lng": 36.8219,
            "destination_lat": -1.3000,
            "destination_lng": 36.8300,
        }
        response = client.post("/calculate-eta", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "eta" in data
        assert data["eta"]["estimated_minutes"] >= 0
        assert "min" in data["eta"]["estimated_arrival"]

    def test_different_zone_affects_eta(self):
        """Different traffic zones should produce different ETAs."""
        default = client.post("/calculate-eta", json={
            "current_lat": -1.2921, "current_lng": 36.8219,
            "destination_lat": -1.3000, "destination_lng": 36.8300,
        })
        cbd = client.post("/calculate-eta", json={
            "current_lat": -1.2921, "current_lng": 36.8219,
            "destination_lat": -1.3000, "destination_lng": 36.8300,
            "zone": "CBD"
        })
        # CBD zone is slower (0.6x) vs default (0.85x), so ETA should be higher
        assert cbd.json()["eta"]["estimated_minutes"] > default.json()["eta"]["estimated_minutes"]


class TestRouteETA:
    def test_valid_route_returns_etas(self):
        """POST /route-eta should calculate ETAs to each stop."""
        payload = {
            "stops": [
                {"id": 1, "name": "Stop A", "latitude": -1.3000, "longitude": 36.8300},
                {"id": 2, "name": "Stop B", "latitude": -1.3100, "longitude": 36.8400},
            ],
            "bus_lat": -1.2921,
            "bus_lng": 36.8219
        }
        response = client.post("/route-eta", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert len(data["stops_with_eta"]) == 2
        assert data["total_stops"] == 2
        assert data["bus_position"]["latitude"] == -1.2921

    def test_empty_stops_returns_400(self):
        """POST /route-eta with empty stops should return 400."""
        payload = {"stops": [], "bus_lat": -1.2921, "bus_lng": 36.8219}
        response = client.post("/route-eta", json=payload)
        assert response.status_code == 400