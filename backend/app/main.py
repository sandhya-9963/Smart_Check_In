from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, Query, status
from fastapi.middleware.cors import CORSMiddleware
from jose import JWTError, jwt
import logging

from .config import settings
from .database import engine, Base
from .websocket import manager
from .routers import auth, appointments, patients, doctors, admin, notifications

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from contextlib import asynccontextmanager
from .seed import seed_db
from .database import SessionLocal

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create database tables automatically
    Base.metadata.create_all(bind=engine)
    # Seed database
    db = SessionLocal()
    try:
        seed_db(db)
    finally:
        db.close()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development ease; restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(appointments.router, prefix=settings.API_V1_STR)
app.include_router(patients.router, prefix=settings.API_V1_STR)
app.include_router(doctors.router, prefix=settings.API_V1_STR)
app.include_router(admin.router, prefix=settings.API_V1_STR)
app.include_router(notifications.router, prefix=settings.API_V1_STR)

@app.get("/")
def read_root():
    return {"message": "Welcome to SmartCheck AI API Services"}

# WebSocket Endpoint
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(...)):
    # Authenticate socket using token passed as query parameter
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        role: str = payload.get("role")
        user_id: int = payload.get("user_id")
        
        if email is None or role is None or user_id is None:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
            
    except JWTError:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
        
    await manager.connect(websocket, user_id, role)
    
    # Send an initial welcome packet
    await websocket.send_json({
        "event": "connection_established",
        "data": {"user_id": user_id, "role": role}
    })
    
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
            else:
                logger.info(f"Received websocket text from User {user_id}: {data}")
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id, role)
    except Exception as e:
        logger.error(f"WebSocket error on User {user_id}: {e}")
        manager.disconnect(websocket, user_id, role)
