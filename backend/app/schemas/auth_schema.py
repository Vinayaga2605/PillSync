from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    role: str


class LoginResponse(BaseModel):
    message: str
    role: str
    user_id: int