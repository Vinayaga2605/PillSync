from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth_dependency import get_current_user
from app.models.user import User
from app.services.assistant_service import process_assistant_message

router = APIRouter(
    prefix="/api/assistant",
    tags=["AI Assistant"]
)


class ChatRequest(BaseModel):
    message: str
    conversation_history: list = []


@router.post("/chat")
def chat_with_assistant(
    payload: ChatRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    if not payload.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    result = process_assistant_message(
        db=db,
        user=user,
        message=payload.message,
        conversation_history=payload.conversation_history
    )

    return result
