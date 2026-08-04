import os
import logging
import numpy as np

logger = logging.getLogger(__name__)

MODEL_NAME = os.getenv("FACE_MODEL", "buffalo_l")
SIMILARITY_THRESHOLD = float(os.getenv("FACE_SIMILARITY_THRESHOLD", "0.4"))


class FaceEngine:
    """InsightFace-based face engine with OpenCV fallback for development."""

    def __init__(self):
        self.mode = "insightface"
        self.app = None
        self._load_model()

    def _load_model(self):
        try:
            from insightface.app import FaceAnalysis

            self.app = FaceAnalysis(name=MODEL_NAME, providers=["CPUExecutionProvider"])
            self.app.prepare(ctx_id=0, det_size=(640, 640))
            logger.info("InsightFace model loaded: %s", MODEL_NAME)
        except Exception as e:
            logger.warning("InsightFace unavailable (%s), using OpenCV fallback", e)
            self.mode = "opencv"
            self.app = None

    def extract_embedding(self, image_bytes: bytes) -> np.ndarray | None:
        import cv2

        arr = np.frombuffer(image_bytes, dtype=np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img is None:
            return None

        if self.mode == "insightface" and self.app:
            faces = self.app.get(img)
            if not faces:
                return None
            face = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
            return face.normed_embedding

        # OpenCV fallback: Haar cascade + simple normalized pixel embedding
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
        faces = cascade.detectMultiScale(gray, 1.3, 5)
        if len(faces) == 0:
            return None
        x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
        face_img = cv2.resize(gray[y : y + h, x : x + w], (64, 64))
        embedding = face_img.flatten().astype(np.float32)
        embedding = embedding / (np.linalg.norm(embedding) + 1e-8)
        return embedding

    def compare(self, emb1: np.ndarray, emb2: np.ndarray) -> float:
        """Cosine similarity (higher = more similar)."""
        return float(np.dot(emb1, emb2) / (np.linalg.norm(emb1) * np.linalg.norm(emb2) + 1e-8))

    @property
    def is_ready(self) -> bool:
        return True

    @property
    def model_info(self) -> dict:
        return {"mode": self.mode, "model": MODEL_NAME if self.mode == "insightface" else "opencv-haar"}


engine = FaceEngine()
