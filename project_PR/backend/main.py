import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import check_db_connection
from app.services.notification_scheduler import start_scheduler, stop_scheduler
from app.api.routes.auth import router as auth_router
from app.api.routes.patient import router as patient_router
from app.api.routes.medicine import router as medicine_router, medications_alias_router
from app.api.routes.schedule import router as schedule_router
from app.api.routes.reminder import router as reminder_router
from app.api.routes.dose import router as dose_router
from app.api.routes.adherence import router as adherence_router
from app.api.routes.notification import router as notification_router
from app.api.routes.internal import router as internal_router
from app.api.routes.caregiver import router as caregiver_router
from app.api.routes.admin import router as admin_router
from app.api.routes.refill import router as refill_router

logger = logging.getLogger("pillsync")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("PillSync application startup: initializing background services...")
    start_scheduler()
    yield
    logger.info("PillSync application shutdown: stopping background services...")
    await stop_scheduler()


app = FastAPI(
    title="PillSync API",
    description="Backend API for PillSync medication tracking and reminder platform",
    version="0.1.0",
    lifespan=lifespan,
)

# Enable CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(auth_router, prefix="/api")
app.include_router(patient_router, prefix="/api")
app.include_router(medicine_router, prefix="/api")
app.include_router(medications_alias_router, prefix="/api")
app.include_router(schedule_router, prefix="/api")
app.include_router(reminder_router, prefix="/api")
app.include_router(dose_router, prefix="/api")
app.include_router(adherence_router, prefix="/api")
app.include_router(refill_router, prefix="/api")
app.include_router(notification_router, prefix="/api")
app.include_router(internal_router, prefix="/api")
app.include_router(caregiver_router, prefix="/api")
app.include_router(admin_router, prefix="/api")


@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "message": "PillSync backend is running"
    }


@app.get("/api/health/db")
def db_health_check():
    try:
        check_db_connection()
        return {
            "status": "ok",
            "database": "connected"
        }
    except Exception as e:
        logger.error(f"Database connection error: {type(e).__name__}")
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "error",
                "database": "disconnected",
                "detail": f"Database connection failed: {type(e).__name__}"
            }
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
