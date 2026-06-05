# HKCS - AI Route Optimization Service

This service is a Python-based FastAPI application responsible for route optimization and ETA (Estimated Time of Arrival) predictions for the school buses.

## Technologies Used
- **Language:** Python 3.12+
- **Framework:** FastAPI
- **Server:** Uvicorn

## Getting Started

1. **Set up Virtual Environment:**
   ```bash
   python -m venv venv
   # On Windows:
   venv/Scripts/activate
   # On macOS/Linux:
   source venv/bin/activate
   ```

2. **Install requirements:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the service:**
   ```bash
   uvicorn main:app --reload --port 8000
   ```
   The service will be available at `http://localhost:8000`. You can access the automatic API documentation at `http://localhost:8000/docs`.

## Key Components
- `main.py` - FastAPI entry point and route definitions.
- `route_optimizer.py` - Logic for calculating the most efficient pickup/drop-off routes.
- `eta_predictor.py` - Heuristics for predicting travel times and stop ETAs.
