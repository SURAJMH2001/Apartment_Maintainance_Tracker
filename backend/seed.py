import os
import sys

# Make sure our packages and app are importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "Lib", "site-packages"))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from datetime import datetime, date, timedelta
from sqlalchemy.orm import Session

from app.core.database import SessionLocal, Base, engine
import app.models  # registers all models with SQLAlchemy metadata
from app.models.user import User
from app.models.resident import Resident
from app.models.transaction import Transaction
from app.models.payment import Payment
from app.models.alert import Alert
from app.models.audit_log import AuditLog
from app.models.vehicle import Vehicle
from app.models.announcement import Announcement
from app.models.task import Task
from app.models.asset import Asset
from app.core.security import get_password_hash

def compute_floor(flat: str) -> int:
    if flat.startswith("GF"): return 0
    if flat.startswith("FF"): return 1
    if flat.startswith("SF"): return 2
    if flat.startswith("TF"): return 3
    if flat.startswith("PH"): return 4
    return 0

def seed_db():
    print("Dropping all tables...")
    Base.metadata.drop_all(bind=engine)
    print("Creating all tables...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Create super admin
        print("Creating super admin user...")
        admin = User(
            username="admin",
            email="admin@societytrack.com",
            hashed_password=get_password_hash("Admin@123"),
            role="super-admin",
            display_name="Super Admin"
        )
        db.add(admin)
        
        # Resident Data
        nng_residents = [
            ("GF1", "BHARADWAJ BS"),
            ("GF2", "MAMATHA VEERESH"),
            ("GF3", "RAGHU K, KEERTHILATHA NS"),
            ("FF1", "RAVI M, KRISHNA VARUN"),
            ("FF2", "SAGAR, ASHWINI BR"),
            ("FF3", "ROOPA & SUBRAMANYAM"),
            ("SF1", "AKSHATHA & ANIRUDDHA BHAT"),
            ("SF2", "M.K.MAHESH"),
            ("SF3", "SUMA & MAHENDRA HEGDE"),
            ("TF1", "PRASAD S M"),
            ("TF2", "HAREESH MJ"),
            ("TF3", "VINAY GOWDA R V")
        ]
        
        nb_residents = [
            ("GF1", "BALAPPA B YARAZARI"),
            ("GF2", "NAVEEN NAGARAJU"),
            ("GF3", "RANJANA VINOD KUMAR"),
            ("FF1", "POOJA & SUBRAMANYA KASHYAP H B"),
            ("FF2", "PADMANAV ROUT, SNEHALATA JENA"),
            ("FF3", "ABHISHEK N"),
            ("SF1", "RAGHAVENDRA RAJEET"),
            ("SF2", "SANTOSH S"),
            ("SF3", "PAVAN H R"),
            ("TF1", "SHILPA SUDHAKAR"),
            ("TF2", "SRIKANTAIAH GS & RN KANTHA"),
            ("TF3", "SRIDEVI MANJUNATH K"),
            ("PH1", "DEVRAJ")
        ]
        
        print("Seeding Nithya Nanda Gokula (NNG) residents...")
        for flat, name in nng_residents:
            db.add(Resident(
                block="NNG",
                flat_number=flat,
                unit_number=f"NNG-{flat}",
                floor=compute_floor(flat),
                owner_name=name
            ))
            
        print("Seeding Nithya Brindavan (NB) residents...")
        for flat, name in nb_residents:
            db.add(Resident(
                block="NB",
                flat_number=flat,
                unit_number=f"NB-{flat}",
                floor=compute_floor(flat),
                owner_name=name
            ))
        
        db.commit()
        
        print("Seeding Announcements...")
        db.add(Announcement(
            title="Welcome to SocietyTrack",
            content="We have successfully migrated our resident tracking system to the new software. Please update your vehicle details.",
            priority="high",
            created_by="Super Admin"
        ))
        db.commit()
        
        print("Database seeded successfully!")
        
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
