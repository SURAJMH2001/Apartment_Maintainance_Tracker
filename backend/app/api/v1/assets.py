from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, date

from app.core.database import get_db
from app.models.asset import Asset
from app.core.dependencies import get_current_user, get_current_manager_or_admin

router = APIRouter()

class AssetBase(BaseModel):
    name: str
    category: Optional[str] = None
    location: Optional[str] = None
    purchase_date: Optional[date] = None
    purchase_cost: Optional[float] = None
    status: str = "active"
    last_maintenance_date: Optional[date] = None
    next_maintenance_date: Optional[date] = None

class AssetCreate(AssetBase):
    pass

class AssetUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    location: Optional[str] = None
    purchase_date: Optional[date] = None
    purchase_cost: Optional[float] = None
    status: Optional[str] = None
    last_maintenance_date: Optional[date] = None
    next_maintenance_date: Optional[date] = None

class AssetResponse(AssetBase):
    id: int
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

@router.get("", response_model=List[AssetResponse])
def get_assets(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    return db.query(Asset).order_by(Asset.created_at.desc()).all()

@router.post("", response_model=AssetResponse)
def create_asset(asset: AssetCreate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    db_asset = Asset(**asset.model_dump())
    db.add(db_asset)
    db.commit()
    db.refresh(db_asset)
    return db_asset

@router.put("/{id}", response_model=AssetResponse)
def update_asset(id: int, asset: AssetUpdate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    db_asset = db.query(Asset).filter(Asset.id == id).first()
    if not db_asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    update_data = asset.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(db_asset, k, v)
        
    db.commit()
    db.refresh(db_asset)
    return db_asset

@router.delete("/{id}")
def delete_asset(id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    db_asset = db.query(Asset).filter(Asset.id == id).first()
    if not db_asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    db.delete(db_asset)
    db.commit()
    return {"message": "Asset deleted successfully"}
