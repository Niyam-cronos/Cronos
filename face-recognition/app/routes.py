import io
import logging
from fastapi import APIRouter, File, Form, UploadFile, HTTPException

from app.face_engine import engine, SIMILARITY_THRESHOLD
from app.schemas import HealthResponse, FaceResponse, VerifyResponse, EmbeddingResponse

logger = logging.getLogger(__name__)
router = APIRouter()

# In-memory store for dev; production uses DB embeddings via backend
_embeddings: dict[str, list[float]] = {}


@router.get("/health", response_model=HealthResponse)
async def health():
    info = engine.model_info
    return HealthResponse(
        status="ok",
        service="face-recognition",
        version="1.0.0",
        model_loaded=engine.is_ready,
        mode=info["mode"],
    )


@router.post("/register", response_model=FaceResponse)
async def register_face(
    employee_id: str = Form(...),
    image: UploadFile = File(...),
):
    data = await image.read()
    embedding = engine.extract_embedding(data)
    if embedding is None:
        raise HTTPException(400, "No face detected in image")

    _embeddings[employee_id] = embedding.tolist()
    return FaceResponse(
        success=True,
        employee_id=employee_id,
        message="Face registered successfully",
        embedding_size=len(embedding),
    )


@router.post("/verify", response_model=VerifyResponse)
async def verify_face(
    employee_id: str = Form(...),
    image: UploadFile = File(...),
    threshold: float = Form(SIMILARITY_THRESHOLD),
):
    stored = _embeddings.get(employee_id)
    if not stored:
        raise HTTPException(404, "No face registered for this employee")

    data = await image.read()
    embedding = engine.extract_embedding(data)
    if embedding is None:
        return VerifyResponse(
            success=True,
            verified=False,
            employee_id=employee_id,
            confidence=0.0,
            message="No face detected in image",
        )

    import numpy as np

    confidence = engine.compare(embedding, np.array(stored))
    verified = confidence >= threshold

    return VerifyResponse(
        success=True,
        verified=verified,
        employee_id=employee_id,
        confidence=round(confidence, 4),
        message="Face verified" if verified else "Face does not match",
    )


@router.post("/extract", response_model=EmbeddingResponse)
async def extract_embedding(
    employee_id: str = Form(...),
    image: UploadFile = File(...),
):
    """Return embedding vector for backend to store in PostgreSQL."""
    data = await image.read()
    embedding = engine.extract_embedding(data)
    if embedding is None:
        raise HTTPException(400, "No face detected in image")

    return EmbeddingResponse(
        success=True,
        employee_id=employee_id,
        embedding=embedding.tolist(),
        message="Embedding extracted",
    )


@router.delete("/{employee_id}")
async def delete_face(employee_id: str):
    _embeddings.pop(employee_id, None)
    return {"success": True, "message": "Face deleted"}


@router.post("/compare")
async def compare_embeddings(body: dict):
    import numpy as np

    embedding1 = body.get("embedding1", [])
    embedding2 = body.get("embedding2", [])
    threshold = float(body.get("threshold", SIMILARITY_THRESHOLD))

    e1 = np.array(embedding1, dtype=np.float32)
    e2 = np.array(embedding2, dtype=np.float32)
    confidence = engine.compare(e1, e2)
    return {
        "success": True,
        "verified": confidence >= threshold,
        "confidence": round(confidence, 4),
    }
