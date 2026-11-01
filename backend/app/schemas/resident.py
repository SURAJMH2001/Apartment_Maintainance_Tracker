from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import date, datetime

class ResidentBase(BaseModel):
    block: str = "NNG"
    flat_number: str
    unit_number: str
    floor: Optional[int] = None
    owner_name: str
    owner_email: Optional[str] = None
    owner_phone: Optional[str] = None
    alternate_phone: Optional[str] = None
    ownership_type: str = "owner"
    move_in_date: Optional[date] = None
    is_active: bool = True
    notes: Optional[str] = None

    @field_validator("owner_email", mode="before")
    def empty_email_to_none(cls, v):
        if not v or not str(v).strip():
            return None
        return str(v).strip().lower()

    @field_validator("owner_phone", mode="before")
    def empty_phone_to_none(cls, v):
        if not v or not str(v).strip():
            return None
        return str(v).strip()

class ResidentCreate(ResidentBase):
    pass

class ResidentUpdate(BaseModel):
    block: Optional[str] = None
    flat_number: Optional[str] = None
    unit_number: Optional[str] = None
    floor: Optional[int] = None
    owner_name: Optional[str] = None
    owner_email: Optional[str] = None  # Fixed: was Optional[EmailStr] causing PydanticUserError
    owner_phone: Optional[str] = None
    alternate_phone: Optional[str] = None
    ownership_type: Optional[str] = None
    move_in_date: Optional[date] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None

    @field_validator("owner_email", mode="before")
    def empty_email_to_none(cls, v):
        if not v or not str(v).strip():
            return None
        return str(v).strip().lower()

    @field_validator("owner_phone", mode="before")
    def empty_phone_to_none(cls, v):
        if not v or not str(v).strip():
            return None
        return str(v).strip()


class ResidentResponse(ResidentBase):
    id: int
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True
