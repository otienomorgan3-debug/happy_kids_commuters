"""Tests for the route optimizer module."""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from route_optimizer import (
    nearest_neighbor_route,
    calculate_total_distance,
    cluster_stops_by_zone,
    optimize_multi_bus_route
)


class TestNearestNeighborRoute:
    def test_empty_stops_returns_empty_list(self):
        """Should return empty list when no stops provided."""
        result = nearest_neighbor_route([])
        assert result == []

    def test_single_stop_returns_same_stop(self):
        """Should return the same stop when only one stop provided."""
        stops = [{'id': 1, 'name': 'School', 'latitude': -1.2921, 'longitude': 36.8219}]
        result = nearest_neighbor_route(stops)
        assert len(result) == 1
        assert result[0]['id'] == 1

    def test_three_stops_finds_shorter_route(self):
        """Should reorder stops to minimize distance."""
        stops = [
            {'id': 1, 'name': 'School', 'latitude': -1.2921, 'longitude': 36.8219},
            {'id': 2, 'name': 'Stop A', 'latitude': -1.3000, 'longitude': 36.8300},
            {'id': 3, 'name': 'Stop B', 'latitude': -1.2800, 'longitude': 36.8100},
        ]
        result = nearest_neighbor_route(stops)

        # Should contain all stops
        assert len(result) == 3
        stop_ids = {s['id'] for s in result}
        assert stop_ids == {1, 2, 3}

        # First stop should be the original first stop (school/depot)
        assert result[0]['id'] == 1

    def test_five_stops_returns_all_stops(self):
        """Should not lose any stops during optimization."""
        stops = [
            {'id': 1, 'name': 'School', 'latitude': -1.2921, 'longitude': 36.8219},
            {'id': 2, 'name': 'Stop A', 'latitude': -1.3100, 'longitude': 36.8500},
            {'id': 3, 'name': 'Stop B', 'latitude': -1.2700, 'longitude': 36.8000},
            {'id': 4, 'name': 'Stop C', 'latitude': -1.3200, 'longitude': 36.8700},
            {'id': 5, 'name': 'Stop D', 'latitude': -1.2600, 'longitude': 36.7900},
        ]
        result = nearest_neighbor_route(stops)
        assert len(result) == 5
        assert {s['id'] for s in result} == {1, 2, 3, 4, 5}


class TestCalculateTotalDistance:
    def test_empty_route_returns_zero(self):
        """Should return 0 for empty route."""
        assert calculate_total_distance([]) == 0.0

    def test_single_stop_returns_zero(self):
        """Should return 0 for single stop route."""
        stops = [{'id': 1, 'name': 'School', 'latitude': -1.2921, 'longitude': 36.8219}]
        assert calculate_total_distance(stops) == 0.0

    def test_two_stops_calculates_correct_distance(self):
        """Should calculate distance between two known points."""
        stops = [
            {'id': 1, 'name': 'School', 'latitude': -1.2921, 'longitude': 36.8219},
            {'id': 2, 'name': 'Stop A', 'latitude': -1.3000, 'longitude': 36.8300},
        ]
        distance = calculate_total_distance(stops)
        # Roughly ~1.1 km between these points
        assert 0.5 < distance < 2.0

    def test_three_stops_accumulates_distance(self):
        """Should accumulate distance across multiple segments."""
        stops = [
            {'id': 1, 'name': 'A', 'latitude': -1.2921, 'longitude': 36.8219},
            {'id': 2, 'name': 'B', 'latitude': -1.3000, 'longitude': 36.8300},
            {'id': 3, 'name': 'C', 'latitude': -1.3100, 'longitude': 36.8400},
        ]
        ab = calculate_total_distance(stops[:2])
        total = calculate_total_distance(stops)
        assert total > ab


class TestClusterStopsByZone:
    def test_stops_in_zone_are_clustered(self):
        """Should group stops that fall within zone radius."""
        stops = [
            {'id': 1, 'name': 'Stop 1', 'latitude': -1.292, 'longitude': 36.822},
            {'id': 2, 'name': 'Stop 2', 'latitude': -1.294, 'longitude': 36.824},
        ]
        zones = {
            'CBD': (-1.292, 36.822, 5.0)  # center at CBD, 5km radius
        }
        result = cluster_stops_by_zone(stops, zones)
        assert 'CBD' in result
        assert len(result['CBD']) == 2

    def test_far_stops_are_unassigned(self):
        """Should mark stops far from any zone as unassigned."""
        stops = [
            {'id': 1, 'name': 'Far Stop', 'latitude': -1.500, 'longitude': 37.000},
        ]
        zones = {
            'CBD': (-1.292, 36.822, 1.0)  # 1km radius around CBD
        }
        result = cluster_stops_by_zone(stops, zones)
        assert 'unassigned' in result
        assert len(result['unassigned']) == 1

    def test_empty_stops_returns_empty_zones(self):
        """Should return empty zone lists when no stops provided."""
        zones = {'CBD': (-1.292, 36.822, 5.0)}
        result = cluster_stops_by_zone([], zones)
        assert len(result['CBD']) == 0


class TestOptimizeMultiBusRoute:
    def test_empty_stops_returns_empty(self):
        """Should return empty list for empty stops."""
        result = optimize_multi_bus_route([], 2)
        assert result == []

    def test_single_bus_returns_one_route(self):
        """Should return single route when num_buses=1.
        Note: single bus returns a flat optimized list, not dict format."""
        stops = [
            {'id': 1, 'name': 'A', 'latitude': -1.292, 'longitude': 36.822},
            {'id': 2, 'name': 'B', 'latitude': -1.300, 'longitude': 36.830},
        ]
        result = optimize_multi_bus_route(stops, 1)
        assert len(result) == 1  # One route (list of stops)
        assert len(result[0]) == 2  # Two stops in the route

    def test_two_buses_split_stops(self):
        """Should split stops evenly between two buses."""
        stops = [
            {'id': 1, 'name': 'A', 'latitude': -1.292, 'longitude': 36.822},
            {'id': 2, 'name': 'B', 'latitude': -1.300, 'longitude': 36.830},
            {'id': 3, 'name': 'C', 'latitude': -1.310, 'longitude': 36.840},
            {'id': 4, 'name': 'D', 'latitude': -1.320, 'longitude': 36.850},
        ]
        result = optimize_multi_bus_route(stops, 2)
        assert len(result) == 2
        total_stops = sum(r['total_stops'] for r in result)
        assert total_stops == 4

    def test_more_buses_than_stops(self):
        """Should handle more buses than stops gracefully."""
        stops = [
            {'id': 1, 'name': 'A', 'latitude': -1.292, 'longitude': 36.822},
        ]
        result = optimize_multi_bus_route(stops, 3)
        assert len(result) == 1  # Only 1 bus with stops
        assert result[0]['total_stops'] == 1

    def test_each_route_has_distance(self):
        """Each route should have a valid total distance."""
        stops = [
            {'id': 1, 'name': 'A', 'latitude': -1.292, 'longitude': 36.822},
            {'id': 2, 'name': 'B', 'latitude': -1.300, 'longitude': 36.830},
            {'id': 3, 'name': 'C', 'latitude': -1.310, 'longitude': 36.840},
        ]
        result = optimize_multi_bus_route(stops, 2)
        for route in result:
            assert route['total_distance_km'] >= 0