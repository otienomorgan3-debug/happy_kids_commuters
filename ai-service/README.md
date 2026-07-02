# HKCS AI Service

> Rule-based route optimization and ETA prediction engine for the Happy Kids Commuter System. No ML training required — runs instantly on any machine.

---

## Overview

The HKCS AI Service provides **deterministic route optimization and ETA prediction** for school bus fleets. It uses the Nearest Neighbor algorithm and Haversine distance calculations to optimize stop order, and applies time-of-day traffic rules to predict arrival times.

**No machine learning models, no training data, no GPU needed.** All algorithms are rule-based and work out of the box.

**Who it's for:** The HKCS backend calls this service automatically when administrators create or optimize routes. It can also be used standalone via its REST API.

---

## Demo

```bash
# Test route optimization
curl -X POST http://localhost:8000/optimize-route \
  -H "Content-Type: application/json" \
  -d '{"stops":[{"id":1,"name":"School","latitude":-1.2921,"longitude":36.8219},{"id":2,"name":"Stop A","latitude":-1.3000,"longitude":36.8300}]}'

# Response:
# {"original_stops":2,"optimized_route":[...],"total_distance_km":1.3,"estimated_duration_minutes":5}
```

---

## Installation

### Prerequisites

- [Python](https://python.org/) 3.10+
- [pip](https://pip.pypa.io/)

### Quick Start

```bash
# 1. Navigate to the ai-service directory
cd ai-service

# 2. Create a virtual environment (recommended)
python -m venv venv

# 3. Activate it
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# 4. Install dependencies
pip install -r requirements.txt

# 5. Start the service
uvicorn main:app --host 0.0.0.0 --port 8000
```

### Using Docker

```bash
docker build -t hkcs-ai-service .
docker run -p 8000:8000 hkcs-ai-service
```

### Using Docker Compose (Full Stack)

```bash
# From the project root
docker compose up -d ai-service
```

---

## Usage

### Available Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/optimize-route` | Optimize the order of stops for a single bus route |
| `POST` | `/optimize-multi-bus` | Distribute stops across multiple buses and optimize each route |
| `POST` | `/calculate-eta` | Calculate ETA from current position to a destination |
| `POST` | `/route-eta` | Calculate cumulative ETA for all stops on a route |
| `GET` | `/health` | Health check |

### Example: Optimize a Route

```bash
curl -X POST http://localhost:8000/optimize-route \
  -H "Content-Type: application/json" \
  -d '{
    "stops": [
      {"id": 1, "name": "School", "latitude": -1.2921, "longitude": 36.8219},
      {"id": 2, "name": "Stop A", "latitude": -1.3000, "longitude": 36.8300},
      {"id": 3, "name": "Stop B", "latitude": -1.3100, "longitude": 36.8400}
    ]
  }'
```

### Example: Calculate ETA

```bash
curl -X POST http://localhost:8000/calculate-eta \
  -H "Content-Type: application/json" \
  -d '{
    "current_lat": -1.2921,
    "current_lng": 36.8219,
    "destination_lat": -1.3000,
    "destination_lng": 36.8300,
    "zone": "CBD"
  }'
```

### Health Check

```bash
curl http://localhost:8000/health
# → {"status":"healthy","service":"hkcs-ai-service"}
```

---

## Features

### Route Optimization
- **Nearest Neighbor Algorithm** — Greedy optimization that finds the shortest path through all stops
- **Multi-Bus Distribution** — Automatically splits stops across multiple buses using zone clustering
- **Haversine Distance** — Accurate geographic distance calculations

### ETA Prediction
- **Time-of-Day Profiles** — Morning peak (20 km/h), midday (35 km/h), evening peak (18 km/h), off-peak (40 km/h)
- **Traffic Zone Multipliers** — CBD (60%), Westlands (75%), Eastlands (80%), Suburbs (95%)
- **Road Factor** — Accounts for indirect routes (×1.3 multiplier)

### Performance
- Route optimization: **< 10ms** for 50 stops
- ETA calculation: **< 5ms** per stop
- Multi-bus optimization: **< 50ms** for 100 stops across 5 buses
- Memory usage: **< 50MB**
- CPU: **Single core sufficient**

### Reliability
- **Graceful Fallback** — Backend continues working if AI service is unavailable
- **Deterministic** — Same input always produces the same output
- **No Training Required** — Works immediately after installation

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Python, FastAPI |
| **Server** | Uvicorn (ASGI) |
| **Distance Calculation** | Haversine formula |
| **Data Validation** | Pydantic |
| **Containerization** | Docker |

---

## How It Works

### 1. Nearest Neighbor Route Optimization

```
Input:  [School, Stop A, Stop B, Stop C]
Output: [School, Stop A (2km), Stop C (1.5km), Stop B (3km)]
```

1. Start from the first stop (school/depot)
2. Find the closest unvisited stop using Haversine distance
3. Move to that stop and repeat until all stops are visited

**Time Complexity:** O(n²) where n = number of stops

### 2. ETA Calculation

```
Distance: 10 km
Time: 8am (morning peak)
Zone: CBD

Base speed: 20 km/h
Traffic multiplier: 0.6
Effective speed: 20 × 0.6 = 12 km/h
Road distance: 10 × 1.3 = 13 km
ETA: 13 / 12 = 1.08 hours ≈ 65 minutes
```

### 3. Multi-Bus Optimization

1. **Zone Clustering** — Group stops by geographical proximity
2. **Even Distribution** — Split stops equally among buses
3. **Per-Bus Optimization** — Apply Nearest Neighbor to each bus's stops

---

### Customizing Traffic Rules

Edit `eta_predictor.py` to adjust speed profiles and traffic zones for your city:

```python
SPEED_PROFILES = {
    'morning_peak': 20,    # km/h - adjust for your city
    'midday': 35,
    'evening_peak': 18,
    'off_peak': 40
}

TRAFFIC_ZONES = {
    'CBD': 0.6,            # multiplier - lower = slower
    'Westlands': 0.75,
    'Eastlands': 0.8,
    'Suburbs': 0.95
}
```

---
