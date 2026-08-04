# Face Recognition Service

Python FastAPI microservice using **InsightFace** (with OpenCV fallback).

## Run locally

```bash
cd face-recognition
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service health |
| POST | `/register` | Register face (multipart: employee_id + image) |
| POST | `/verify` | Verify face against registered |
| POST | `/extract` | Extract embedding for DB storage |
| DELETE | `/{employee_id}` | Delete registered face |

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `FACE_MODEL` | `buffalo_l` | InsightFace model name |
| `FACE_SIMILARITY_THRESHOLD` | `0.4` | Min cosine similarity to pass |

## Docker

```bash
docker build -t cronos-face .
docker run -p 8000:8000 cronos-face
```
