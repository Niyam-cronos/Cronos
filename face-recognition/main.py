"""Cronos Face Recognition Service — InsightFace + OpenCV."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import router

app = FastAPI(
    title="Cronos Face Recognition",
    description="Register, verify, and manage face embeddings for attendance",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
