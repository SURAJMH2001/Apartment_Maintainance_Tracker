from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Union
from pydantic import BaseModel
from datetime import datetime, timezone

from app.core.database import get_db
from app.models.vehicle import Vehicle
from app.models.resident import Resident
from app.core.dependencies import get_current_user

router = APIRouter()

class VehicleCreate(BaseModel):
    resident_id: Optional[Union[str, int]] = None
    vehicle_type: Optional[str] = "four_wheeler"
    registration_number: Optional[str] = None
    vehicle_number: Optional[str] = None
    make_model: Optional[str] = None
    parking_slot: Optional[str] = None

class VehicleResponse(BaseModel):
    id: int
    resident_id: str
    vehicle_type: str
    registration_number: str
    vehicle_number: str
    make_model: Optional[str] = None
    parking_slot: Optional[str] = None
    unit_number: Optional[str] = None
    resident_name: Optional[str] = None
    owner_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

def _build_vehicle_response(v: Vehicle, resident: Optional[Resident] = None) -> VehicleResponse:
    reg = v.registration_number or ""
    unit = resident.unit_number if resident else ""
    owner = resident.owner_name if resident else ""
    now = datetime.now(timezone.utc)
    return VehicleResponse(
        id=v.id,
        resident_id=str(v.resident_id),
        vehicle_type=v.vehicle_type or "four_wheeler",
        registration_number=reg,
        vehicle_number=reg,
        make_model=v.make_model or "",
        parking_slot=getattr(v, 'parking_slot', None) or "",
        unit_number=unit,
        resident_name=owner,
        owner_name=owner,
        created_at=v.created_at or now,
        updated_at=v.updated_at or now
    )

@router.get("", response_model=List[VehicleResponse])
def get_vehicles(
    resident_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    query = db.query(Vehicle)
    # If viewer, only show their flat vehicles
    if current_user.role == "viewer" and current_user.resident_id:
        query = query.filter(Vehicle.resident_id == str(current_user.resident_id))
    elif resident_id:
        query = query.filter(Vehicle.resident_id == str(resident_id))

    vehicles = query.all()
    results = []
    for v in vehicles:
        res = None
        try:
            res = db.query(Resident).filter(Resident.id == int(v.resident_id)).first()
        except Exception:
            pass
        results.append(_build_vehicle_response(v, res))
    return results

@router.post("", response_model=VehicleResponse)
def create_vehicle(vehicle: VehicleCreate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    # Default to user's flat if not specified
    res_id = vehicle.resident_id or current_user.resident_id
    if not res_id:
        raise HTTPException(status_code=400, detail="Please select a flat/resident for this vehicle")
    
    reg_number = (vehicle.vehicle_number or vehicle.registration_number or "").strip().upper()
    if not reg_number:
        raise HTTPException(status_code=400, detail="Vehicle registration number is required")

    db_vehicle = Vehicle(
        resident_id=str(res_id),
        vehicle_type=vehicle.vehicle_type or "four_wheeler",
        registration_number=reg_number,
        make_model=vehicle.make_model,
        parking_slot=vehicle.parking_slot
    )
    db.add(db_vehicle)
    db.commit()
    db.refresh(db_vehicle)

    res = None
    try:
        res = db.query(Resident).filter(Resident.id == int(db_vehicle.resident_id)).first()
    except Exception:
        pass

    return _build_vehicle_response(db_vehicle, res)

@router.put("/{id}", response_model=VehicleResponse)
def update_vehicle(id: int, vehicle_in: VehicleCreate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    db_vehicle = db.query(Vehicle).filter(Vehicle.id == id).first()
    if not db_vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    
    if current_user.role == "viewer" and str(current_user.resident_id) != str(db_vehicle.resident_id):
        raise HTTPException(status_code=403, detail="Permission denied")
        
    if vehicle_in.resident_id:
        db_vehicle.resident_id = str(vehicle_in.resident_id)
    if vehicle_in.vehicle_type:
        db_vehicle.vehicle_type = vehicle_in.vehicle_type
    
    reg_number = (vehicle_in.vehicle_number or vehicle_in.registration_number or "").strip().upper()
    if reg_number:
        db_vehicle.registration_number = reg_number
    if vehicle_in.make_model is not None:
        db_vehicle.make_model = vehicle_in.make_model
    if vehicle_in.parking_slot is not None:
        db_vehicle.parking_slot = vehicle_in.parking_slot
        
    db.commit()
    db.refresh(db_vehicle)
    
    res = None
    try:
        res = db.query(Resident).filter(Resident.id == int(db_vehicle.resident_id)).first()
    except Exception:
        pass
        
    return _build_vehicle_response(db_vehicle, res)

@router.delete("/{id}")
def delete_vehicle(id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    db_vehicle = db.query(Vehicle).filter(Vehicle.id == id).first()
    if not db_vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    # Viewers can only delete their own flat vehicles
    if current_user.role == "viewer" and str(current_user.resident_id) != str(db_vehicle.resident_id):
        raise HTTPException(status_code=403, detail="Permission denied")
    db.delete(db_vehicle)
    db.commit()
    return {"message": "Vehicle deleted"}
