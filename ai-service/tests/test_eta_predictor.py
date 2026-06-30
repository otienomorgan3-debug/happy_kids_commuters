"""Tests for the ETA predictor module."""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from eta_predictor import (
    calculate_eta,
    calculate_route_eta,
    get_speed_for_time,
    get_time_period
)


class TestGetSpeedForTime:
    def test_morning_peak_returns_20(self):
        """6am-9am should return 20 km/h."""
        assert get_speed_for_time(6) == 20
        assert get_speed_for_time(7) == 20
        assert get_speed_for_time(8) == 20

    def test_midday_returns_35(self):
        """9am-4pm should return 35 km/h."""
        assert get_speed_for_time(9) == 35
        assert get_speed_for_time(12) == 35
        assert get_speed_for_time(15) == 35

    def test_evening_peak_returns_18(self):
        """4pm-7pm should return 18 km/h."""
        assert get_speed_for_time(16) == 18
        assert get_speed_for_time(17) == 18
        assert get_speed_for_time(18) == 18

    def test_off_peak_returns_40(self):
        """7pm-6am should return 40 km/h."""
        assert get_speed_for_time(19) == 40
        assert get_speed_for_time(0) == 40
        assert get_speed_for_time(5) == 40


class TestGetTimePeriod:
    def test_morning_peak_label(self):
        assert get_time_period(7) == 'Morning peak'

    def test_midday_label(self):
        assert get_time_period(12) == 'Midday'

    def test_evening_peak_label(self):
        assert get_time_period(17) == 'Evening peak'

    def test_off_peak_label(self):
        assert get_time_period(22) == 'Off peak'


class TestCalculateETA:
    def test_returns_required_fields(self):
        """Should return all required fields in response."""
        result = calculate_eta(-1.2921, 36.8219, -1.3000, 36.8300)
        assert 'distance_km' in result
        assert 'estimated_minutes' in result
        assert 'estimated_arrival' in result
        assert 'speed_used_kmh' in result
        assert 'traffic_zone' in result
        assert 'time_of_day' in result

    def test_same_point_returns_small_distance(self):
        """Same start and destination should have very small distance."""
        result = calculate_eta(-1.2921, 36.8219, -1.2921, 36.8219)
        assert result['distance_km'] < 0.1
        assert result['estimated_minutes'] <= 1

    def test_cbd_zone_slower_than_default(self):
        """CBD zone should have lower effective speed than default."""
        default = calculate_eta(-1.2921, 36.8219, -1.3000, 36.8300, zone='default')
        cbd = calculate_eta(-1.2921, 36.8219, -1.3000, 36.8300, zone='CBD')
        assert cbd['speed_used_kmh'] < default['speed_used_kmh']

    def test_suburbs_faster_than_cbd(self):
        """Suburbs zone should be faster than CBD."""
        cbd = calculate_eta(-1.2921, 36.8219, -1.3000, 36.8300, zone='CBD')
        suburbs = calculate_eta(-1.2921, 36.8219, -1.3000, 36.8300, zone='Suburbs')
        assert suburbs['speed_used_kmh'] > cbd['speed_used_kmh']

    def test_longer_distance_increases_time(self):
        """Further destinations should have higher estimated minutes."""
        near = calculate_eta(-1.2921, 36.8219, -1.3000, 36.8300)
        far = calculate_eta(-1.2921, 36.8219, -1.3500, 36.9000)
        assert far['estimated_minutes'] >= near['estimated_minutes']

    def test_unknown_zone_falls_back_to_default(self):
        """Unknown zone should use default multiplier."""
        result = calculate_eta(-1.2921, 36.8219, -1.3000, 36.8300, zone='unknown_zone')
        assert result['traffic_zone'] == 'unknown_zone'
        assert result['speed_used_kmh'] > 0


class TestCalculateRouteETA:
    def test_single_stop_returns_eta(self):
        """Should calculate ETA for a single stop."""
        stops = [
            {'id': 1, 'name': 'Stop A', 'latitude': -1.3000, 'longitude': 36.8300}
        ]
        result = calculate_route_eta(stops, -1.2921, 36.8219)
        assert len(result) == 1
        assert 'eta_minutes' in result[0]
        assert 'eta_display' in result[0]
        assert 'distance_from_prev_km' in result[0]

    def test_multiple_stops_accumulate_eta(self):
        """ETAs should accumulate across multiple stops."""
        stops = [
            {'id': 1, 'name': 'Stop A', 'latitude': -1.3000, 'longitude': 36.8300},
            {'id': 2, 'name': 'Stop B', 'latitude': -1.3100, 'longitude': 36.8400},
        ]
        result = calculate_route_eta(stops, -1.2921, 36.8219)
        assert len(result) == 2
        # Second stop should have higher cumulative ETA
        assert result[1]['eta_minutes'] >= result[0]['eta_minutes']

    def test_preserves_stop_data(self):
        """Should preserve original stop data in result."""
        stops = [
            {'id': 42, 'name': 'Test School', 'latitude': -1.3000, 'longitude': 36.8300}
        ]
        result = calculate_route_eta(stops, -1.2921, 36.8219)
        assert result[0]['id'] == 42
        assert result[0]['name'] == 'Test School'

    def test_empty_stops_returns_empty(self):
        """Should return empty list for no stops."""
        result = calculate_route_eta([], -1.2921, 36.8219)
        assert result == []