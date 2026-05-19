from fastapi import FastAPI

app = FastAPI(title="AlkaSense API", version="1.0.0")

@app.get("/health")
def health():
    return {"status": "ok", "project": "AlkaSense"}