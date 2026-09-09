import os
import socket
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.database import Base
from app.database import engine

import app.models

from app.routers.auth import router as auth_router
from app.routers.medicine import router as medicine_router
from app.routers.patient import router as patient_router
from app.routers.medication import router as medication_router
from app.routers.caregiver import router as caregiver_router
from app.routers.notification import router as notification_router
from app.routers.admin import router as admin_router
from app.routers.users import router as users_router
from app.routers.reminder import router as reminder_router
from app.routers.assistant import router as assistant_router
from app.routers.prescription import router as prescription_router

from app.utils.helpers import security_headers_middleware

Base.metadata.create_all(bind=engine)


def get_lan_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


lan_ip = get_lan_ip()

# Build allowed origins list for local and LAN access
allowed_origins = [
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    f"http://{lan_ip}:5174",
    f"http://{lan_ip}:8004",
]

env_origin = os.getenv("FRONTEND_ORIGIN")
if env_origin and env_origin not in allowed_origins:
    allowed_origins.append(env_origin)

app = FastAPI(
    title="PillSync API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+)(:\d+)?",
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.middleware("http")(security_headers_middleware)

app.include_router(auth_router)
app.include_router(medicine_router)
app.include_router(patient_router)
app.include_router(medication_router)
app.include_router(caregiver_router)
app.include_router(notification_router)
app.include_router(admin_router)
app.include_router(users_router)
app.include_router(reminder_router)
app.include_router(assistant_router)
app.include_router(prescription_router)


@app.get("/")
def home():
    return {
        "message": "PillSync Backend Running Successfully",
        "lan_ip": lan_ip,
        "frontend_lan_url": f"http://{lan_ip}:5174"
    }


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "lan_ip": lan_ip,
        "backend_url": f"http://{lan_ip}:8004",
        "frontend_url": f"http://{lan_ip}:5174"
    }


@app.get("/db-test")
def db_test():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))

        return {
            "database": "Connected Successfully"
        }

    except Exception as e:
        return {
            "database": "Connection Failed",
            "error": str(e)
        }