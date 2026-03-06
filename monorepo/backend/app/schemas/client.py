from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from uuid import UUID
from datetime import datetime


class ClientBase(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    document: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None

    @field_validator('email', mode='before')
    @classmethod
    def empty_str_to_none_email(cls, v):
        if v == '' or v is None:
            return None
        return v

    @field_validator('phone', 'document', 'address', 'notes', mode='before')
    @classmethod
    def empty_str_to_none(cls, v):
        if v == '':
            return None
        return v


class ClientCreate(ClientBase):
    pass


class ClientResponse(ClientBase):
    id: UUID
    created_at: datetime

    class Config:
        from_attributes = True
