from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.core.database import get_db
from app.models.vendor import Vendor
from app.core.dependencies import get_current_user, get_current_manager_or_admin

router = APIRouter()

class VendorBase(BaseModel):
    name: str
    category: Optional[str] = "Maintenance"
    service_type: Optional[str] = None
    contact: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    service: Optional[str] = None
    is_active: bool = True

class VendorCreate(BaseModel):
    name: str
    category: Optional[str] = None
    service_type: Optional[str] = None
    contact: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    service: Optional[str] = None
    is_active: bool = True

class VendorResponse(BaseModel):
    id: int
    name: str
    category: str
    service_type: Optional[str] = None
    service: Optional[str] = None
    contact: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    is_active: bool = True
    created_at: Optional[datetime] = None
    class Config:
        from_attributes = True

def _build_vendor_response(v: Vendor) -> VendorResponse:
    cat = v.category or v.service or "Maintenance"
    cnt = v.contact or ""
    return VendorResponse(
        id=v.id,
        name=v.name,
        category=cat,
        service_type=cat,
        service=v.service or cat,
        contact=cnt,
        contact_person=cnt,
        phone=v.phone or "",
        email=v.email or "",
        is_active=bool(v.is_active),
        created_at=v.created_at
    )

@router.get("", response_model=List[VendorResponse])
def get_vendors(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    vendors = db.query(Vendor).all()
    return [_build_vendor_response(v) for v in vendors]

@router.post("", response_model=VendorResponse)
def create_vendor(vendor_in: VendorCreate, db: Session = Depends(get_db), current_user = Depends(get_current_manager_or_admin)):
    cat = vendor_in.category or vendor_in.service_type or vendor_in.service or "Maintenance"
    cnt = vendor_in.contact or vendor_in.contact_person or ""
    svc = vendor_in.service or vendor_in.service_type or cat
    v = Vendor(
        name=vendor_in.name,
        category=cat,
        contact=cnt,
        phone=vendor_in.phone,
        email=vendor_in.email,
        service=svc,
        is_active=vendor_in.is_active
    )
    db.add(v)
    db.commit()
    db.refresh(v)
    return _build_vendor_response(v)

@router.put("/{id}", response_model=VendorResponse)
def update_vendor(id: int, vendor_in: VendorCreate, db: Session = Depends(get_db), current_user = Depends(get_current_manager_or_admin)):
    v = db.query(Vendor).filter(Vendor.id == id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Vendor not found")
    for k, val in vendor_in.model_dump().items():
        setattr(v, k, val)
    db.commit()
    db.refresh(v)
    return v

@router.delete("/{id}")
def delete_vendor(id: int, db: Session = Depends(get_db), current_user = Depends(get_current_manager_or_admin)):
    v = db.query(Vendor).filter(Vendor.id == id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Vendor not found")
    db.delete(v)
    db.commit()
    return {"message": "Vendor deleted"}
