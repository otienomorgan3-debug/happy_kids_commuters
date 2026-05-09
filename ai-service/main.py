from fastapi import FastAPI
app = FastAPI()

@app.get("/")
def root():
    return {"status": "HKCS AI Service running"}

@app.post("/optimize-route")
def optimize_route(data: dict):
    # Route optimization logic goes here
    return {"optimized_route": data.get("stops", [])}