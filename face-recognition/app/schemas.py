from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    model_loaded: bool
    mode: str


class FaceResponse(BaseModel):
    success: bool
    employee_id: str
    message: str
    confidence: float | None = None
    embedding_size: int | None = None


class VerifyResponse(BaseModel):
    success: bool
    verified: bool
    employee_id: str
    confidence: float
    message: str


class EmbeddingResponse(BaseModel):
    success: bool
    employee_id: str
    embedding: list[float]
    message: str
