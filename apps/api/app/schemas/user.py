from datetime import datetime

from pydantic import BaseModel, EmailStr


class UserPublic(BaseModel):
    id: int
    email: EmailStr
    username: str
    bio: str | None = None
    favorite_stock: str | None = None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
