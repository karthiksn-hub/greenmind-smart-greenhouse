
import io
import os
import logging
from contextlib import asynccontextmanager

import torch
from PIL import Image, UnidentifiedImageError
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from transformers import AutoImageProcessor, AutoModelForImageClassification

# --------------------------------------------------
# CONFIGURATION
# --------------------------------------------------

MODEL_NAME = os.getenv(
    "PLANT_MODEL_NAME",
    "neghani/plantvillage-mobilenetv2"
)

MAX_IMAGE_SIZE = 10 * 1024 * 1024

ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp"
}

DEVICE = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("greenmind")

# --------------------------------------------------
# GLOBAL MODEL VARIABLES
# --------------------------------------------------

processor = None
model = None
model_labels = {}

# --------------------------------------------------
# LOAD AI MODEL
# --------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    global processor, model, model_labels

    logger.info("Loading GreenMind plant disease model...")

    try:
        processor = AutoImageProcessor.from_pretrained(MODEL_NAME)

        model = AutoModelForImageClassification.from_pretrained(
            MODEL_NAME
        )

        model.to(DEVICE)
        model.eval()

        model_labels = model.config.id2label or {}

        logger.info("AI model loaded successfully.")
        logger.info("Running on: %s", DEVICE)

    except Exception:
        logger.exception("Could not load the plant disease model.")
        raise

    yield

    logger.info("GreenMind AI backend shutting down.")

# --------------------------------------------------
# FASTAPI APPLICATION
# --------------------------------------------------

app = FastAPI(
    title="GreenMind Plant Disease Detection API",
    description="AI-powered plant disease detection for GreenMind Smart Greenhouse.",
    version="1.0.0",
    lifespan=lifespan
)

# --------------------------------------------------
# CORS CONFIGURATION
# --------------------------------------------------

FRONTEND_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://greenmind-smart-greenhouse-xalv.vercel.app",
]

extra_origins = os.getenv("FRONTEND_ORIGINS", "")

if extra_origins:
    FRONTEND_ORIGINS.extend(
        origin.strip()
        for origin in extra_origins.split(",")
        if origin.strip()
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# --------------------------------------------------
# HELPER: FORMAT MODEL LABEL
# --------------------------------------------------

def format_prediction(label: str):
    cleaned = str(label).strip()

    if "___" in cleaned:
        crop, condition = cleaned.split("___", 1)
    else:
        crop = "Unknown"
        condition = cleaned

    crop = crop.replace("_", " ").strip()
    condition = condition.replace("_", " ").strip()

    return crop, condition

# --------------------------------------------------
# HELPER: CHECK HEALTHY PLANT
# --------------------------------------------------

def is_healthy(condition: str) -> bool:
    return "healthy" in condition.lower()

# --------------------------------------------------
# HELPER: GENERATE BASIC ADVICE
# --------------------------------------------------

def get_basic_advice(condition: str) -> str:
    condition_lower = condition.lower()

    if "healthy" in condition_lower:
        return (
            "Your plant appears healthy according to the AI model. "
            "Continue regular watering, suitable sunlight and monitoring."
        )

    return (
        "The AI model detected a possible plant health problem. "
        "Inspect the affected leaves, avoid unnecessary watering, "
        "and compare the symptoms with reliable agricultural guidance "
        "before applying any treatment."
    )

# --------------------------------------------------
# HEALTH CHECK ENDPOINT
# --------------------------------------------------

@app.get("/")
def home():
    return {
        "success": True,
        "message": "Welcome to GreenMind Plant Disease Detection API",
        "model": MODEL_NAME,
        "device": str(DEVICE)
    }

@app.get("/health")
def health():
    return {
        "status": "healthy" if model is not None else "loading",
        "model_loaded": model is not None,
        "model_name": MODEL_NAME,
        "device": str(DEVICE)
    }

# --------------------------------------------------
# PLANT DISEASE PREDICTION
# --------------------------------------------------

@app.post("/predict")
async def predict(file: UploadFile = File(...)):

    if model is None or processor is None:
        raise HTTPException(
            status_code=503,
            detail="AI model is not ready. Please try again."
        )

    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Upload a JPG, JPEG, PNG or WEBP image."
        )

    image_bytes = await file.read(MAX_IMAGE_SIZE + 1)

    if not image_bytes:
        raise HTTPException(
            status_code=400,
            detail="Uploaded image is empty."
        )

    if len(image_bytes) > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Image size must not exceed 10 MB."
        )

    try:
        image = Image.open(io.BytesIO(image_bytes))
        image.verify()

        image = Image.open(
            io.BytesIO(image_bytes)
        ).convert("RGB")

    except (UnidentifiedImageError, OSError, ValueError):
        raise HTTPException(
            status_code=400,
            detail="Invalid or unsupported image file."
        )

    try:
        inputs = processor(
            images=image,
            return_tensors="pt"
        )

        inputs = {
            key: value.to(DEVICE)
            for key, value in inputs.items()
        }

        with torch.inference_mode():
            outputs = model(**inputs)

            probabilities = torch.softmax(
                outputs.logits,
                dim=-1
            )[0]

        top_count = min(3, probabilities.shape[0])

        top_values, top_indices = torch.topk(
            probabilities,
            k=top_count
        )

        top_predictions = []

        for score, index in zip(
            top_values.tolist(),
            top_indices.tolist()
        ):
            label = model_labels.get(index, str(index))

            crop_name, condition_name = format_prediction(label)

            top_predictions.append({
                "crop": crop_name,
                "condition": condition_name,
                "confidence": round(score * 100, 2),
                "label": label
            })

        best = top_predictions[0]

        crop = best["crop"]
        condition = best["condition"]
        confidence = best["confidence"]

        healthy = is_healthy(condition)

        status = "healthy" if healthy else "disease_detected"

        message = get_basic_advice(condition)

        return {
            "success": True,
            "crop": crop,
            "condition": condition,
            "status": status,
            "confidence": confidence,
            "message": message,
            "top_predictions": top_predictions,
            "model_name": MODEL_NAME,
            "disclaimer": (
                "This is an AI-generated prediction, not a confirmed "
                "agricultural diagnosis. Model confidence is not a "
                "guarantee of accuracy. Check symptoms and consult "
                "an agricultural expert before treatment."
            )
        }

    except HTTPException:
        raise

    except Exception:
        logger.exception("Plant disease prediction failed.")

        raise HTTPException(
            status_code=500,
            detail="Plant disease analysis failed. Please try another image."
        )

    finally:
        await file.close()
