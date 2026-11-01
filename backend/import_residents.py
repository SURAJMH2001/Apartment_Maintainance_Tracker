import os
import sys

# Ensure backend packages and modules are in sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
site_packages = os.path.join(backend_dir, "Lib", "site-packages")
if site_packages not in sys.path:
    sys.path.insert(0, site_packages)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from sqlalchemy.orm import Session
from app.core.database import SessionLocal, Base, engine
from app.models.resident import Resident
from app.models.user import User
from app.core.security import get_password_hash

# Residents data extracted directly from directory images:
# Image 1: NITHYA BRINDAVANA (NB)
NB_RESIDENTS = [
    {"floor_name": "GROUND FLOOR", "floor": 0, "flat": "GF1", "name": "BALAPPA B YARAZARI"},
    {"floor_name": "GROUND FLOOR", "floor": 0, "flat": "GF2", "name": "NAVEEN NAGARAJU"},
    {"floor_name": "GROUND FLOOR", "floor": 0, "flat": "GF3", "name": "RANJANA VINOD KUMAR"},
    {"floor_name": "FIRST FLOOR",  "floor": 1, "flat": "FF1", "name": "POOJA & SUBRAMANYA KASHYAP H B"},
    {"floor_name": "FIRST FLOOR",  "floor": 1, "flat": "FF2", "name": "PADMANAV ROUT, SNEHALATA JENA"},
    {"floor_name": "FIRST FLOOR",  "floor": 1, "flat": "FF3", "name": "ABHISHEK N"},
    {"floor_name": "SECOND FLOOR", "floor": 2, "flat": "SF1", "name": "RAGHAVENDRA RAJEET"},
    {"floor_name": "SECOND FLOOR", "floor": 2, "flat": "SF2", "name": "SANTOSH S"},
    {"floor_name": "SECOND FLOOR", "floor": 2, "flat": "SF3", "name": "PAVAN H R"},
    {"floor_name": "THIRD FLOOR",  "floor": 3, "flat": "TF1", "name": "SHILPA SUDHAKAR"},
    {"floor_name": "THIRD FLOOR",  "floor": 3, "flat": "TF2", "name": "SRIKANTAIAH GS & RN KANTHA"},
    {"floor_name": "THIRD FLOOR",  "floor": 3, "flat": "TF3", "name": "SRIDEVI MANJUNATH K"},
    {"floor_name": "PENT HOUSE",   "floor": 4, "flat": "PH1", "name": "DEVRAJ"}
]

# Image 2: NITHYA NANDA GOKULA (NNG)
NNG_RESIDENTS = [
    {"floor_name": "GROUND FLOOR", "floor": 0, "flat": "GF1", "name": "BHARADWAJ BS"},
    {"floor_name": "GROUND FLOOR", "floor": 0, "flat": "GF2", "name": "MAMATHA VEERESH"},
    {"floor_name": "GROUND FLOOR", "floor": 0, "flat": "GF3", "name": "RAGHU K, KEERTHILATHA NS"},
    {"floor_name": "FIRST FLOOR",  "floor": 1, "flat": "FF1", "name": "RAVI M, KRISHNA VARUN"},
    {"floor_name": "FIRST FLOOR",  "floor": 1, "flat": "FF2", "name": "SAGAR, ASHWINI BR"},
    {"floor_name": "FIRST FLOOR",  "floor": 1, "flat": "FF3", "name": "ROOPA & SUBRAMANYAM"},
    {"floor_name": "SECOND FLOOR", "floor": 2, "flat": "SF1", "name": "AKSHATHA & ANIRUDDHA BHAT"},
    {"floor_name": "SECOND FLOOR", "floor": 2, "flat": "SF2", "name": "M.K.MAHESH"},
    {"floor_name": "SECOND FLOOR", "floor": 2, "flat": "SF3", "name": "SUMA & MAHENDRA HEGDE"},
    {"floor_name": "THIRD FLOOR",  "floor": 3, "flat": "TF1", "name": "PRASAD S M"},
    {"floor_name": "THIRD FLOOR",  "floor": 3, "flat": "TF2", "name": "HAREESH MJ"},
    {"floor_name": "THIRD FLOOR",  "floor": 3, "flat": "TF3", "name": "VINAY GOWDA R V"}
]

def import_residents():
    # Ensure all tables exist without dropping existing data
    Base.metadata.create_all(bind=engine)
    
    db: Session = SessionLocal()
    inserted = 0
    updated = 0
    
    try:
        # Check / Create default admin if not existing
        admin = db.query(User).filter(User.username == "admin").first()
        if not admin:
            print("Creating default super-admin user...")
            admin = User(
                username="admin",
                email="admin@societytrack.com",
                hashed_password=get_password_hash("Admin@123"),
                role="super-admin",
                display_name="Super Admin"
            )
            db.add(admin)
            db.commit()

        # Import NITHYA BRINDAVANA (NB)
        print("\n=== Processing Nithya Brindavana (NB) Residents ===")
        for r in NB_RESIDENTS:
            unit = f"NB-{r['flat']}"
            existing = db.query(Resident).filter(Resident.unit_number == unit).first()
            if existing:
                existing.block = "NB"
                existing.flat_number = r["flat"]
                existing.floor = r["floor"]
                existing.owner_name = r["name"]
                existing.ownership_type = "owner"
                existing.is_active = True
                print(f"  [UPDATE] {unit} -> {r['name']} (Floor {r['floor']})")
                updated += 1
            else:
                new_resident = Resident(
                    block="NB",
                    flat_number=r["flat"],
                    unit_number=unit,
                    floor=r["floor"],
                    owner_name=r["name"],
                    ownership_type="owner",
                    is_active=True
                )
                db.add(new_resident)
                print(f"  [INSERT] {unit} -> {r['name']} (Floor {r['floor']})")
                inserted += 1

        # Import NITHYA NANDA GOKULA (NNG)
        print("\n=== Processing Nithya Nanda Gokula (NNG) Residents ===")
        for r in NNG_RESIDENTS:
            unit = f"NNG-{r['flat']}"
            existing = db.query(Resident).filter(Resident.unit_number == unit).first()
            if existing:
                existing.block = "NNG"
                existing.flat_number = r["flat"]
                existing.floor = r["floor"]
                existing.owner_name = r["name"]
                existing.ownership_type = "owner"
                existing.is_active = True
                print(f"  [UPDATE] {unit} -> {r['name']} (Floor {r['floor']})")
                updated += 1
            else:
                new_resident = Resident(
                    block="NNG",
                    flat_number=r["flat"],
                    unit_number=unit,
                    floor=r["floor"],
                    owner_name=r["name"],
                    ownership_type="owner",
                    is_active=True
                )
                db.add(new_resident)
                print(f"  [INSERT] {unit} -> {r['name']} (Floor {r['floor']})")
                inserted += 1

        db.commit()
        print(f"\nSuccessfully processed residents: {inserted} inserted, {updated} updated, Total: {inserted + updated}")

    except Exception as e:
        db.rollback()
        print(f"Error during import: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    import_residents()
