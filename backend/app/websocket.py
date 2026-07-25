from fastapi import WebSocket
from typing import Dict, List, Any
import json
import logging

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        # Map user_id -> list of WebSockets
        self.user_connections: Dict[int, List[WebSocket]] = {}
        # Map role -> list of WebSockets
        self.role_connections: Dict[str, List[WebSocket]] = {
            "admin": [],
            "doctor": [],
            "receptionist": [],
            "patient": []
        }

    async def connect(self, websocket: WebSocket, user_id: int, role: str):
        await websocket.accept()
        
        # Add to user connections
        if user_id not in self.user_connections:
            self.user_connections[user_id] = []
        self.user_connections[user_id].append(websocket)
        
        # Add to role connections
        if role in self.role_connections:
            self.role_connections[role].append(websocket)
        else:
            self.role_connections[role] = [websocket]
            
        logger.info(f"WebSocket connected: User {user_id} with role {role}")

    def disconnect(self, websocket: WebSocket, user_id: int, role: str):
        # Remove from user connections
        if user_id in self.user_connections:
            if websocket in self.user_connections[user_id]:
                self.user_connections[user_id].remove(websocket)
            if not self.user_connections[user_id]:
                del self.user_connections[user_id]
                
        # Remove from role connections
        if role in self.role_connections:
            if websocket in self.role_connections[role]:
                self.role_connections[role].remove(websocket)
                
        logger.info(f"WebSocket disconnected: User {user_id} with role {role}")

    async def send_personal_message(self, message: Any, user_id: int):
        if user_id in self.user_connections:
            data = json.dumps(message)
            for websocket in self.user_connections[user_id]:
                try:
                    await websocket.send_text(data)
                except Exception as e:
                    logger.error(f"Error sending message to user {user_id}: {e}")

    async def broadcast_to_role(self, message: Any, role: str):
        if role in self.role_connections:
            data = json.dumps(message)
            for websocket in self.role_connections[role]:
                try:
                    await websocket.send_text(data)
                except Exception as e:
                    logger.error(f"Error broadcasting to role {role}: {e}")

    async def broadcast_global(self, message: Any):
        data = json.dumps(message)
        for user_id, websockets in self.user_connections.items():
            for websocket in websockets:
                try:
                    await websocket.send_text(data)
                except Exception as e:
                    logger.error(f"Error broadcasting to user {user_id}: {e}")

manager = ConnectionManager()
