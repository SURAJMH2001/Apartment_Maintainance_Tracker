import sqlite3
from datetime import datetime, timezone

def run_seed():
    conn = sqlite3.connect('backend/maintenance_tracker.db')
    c = conn.cursor()

    # 1. Check / Seed November 2026 Payments for all 25 units
    c.execute("SELECT COUNT(*) FROM payments WHERE month = '2026-11'")
    nov_count = c.fetchone()[0]
    print(f"Existing 2026-11 payments count: {nov_count}")

    if nov_count == 0:
        # Get all 25 flats
        c.execute("""
            SELECT id, unit_number, owner_name 
            FROM residents 
            WHERE id <= 25 
            ORDER BY id
        """)
        residents = c.fetchall()
        now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

        # Let some flats be already paid for realistic display
        paid_units = {"NNG-TF2", "NNG-GF1", "NB-FF1", "NB-GF1"}
        
        for r_id, u_num, o_name in residents:
            is_paid = u_num in paid_units
            status = "paid" if is_paid else "pending"
            paid_amt = 2750.0 if is_paid else 0.0
            paid_dt = "2026-11-01" if is_paid else None
            method = "UPI / Razorpay" if is_paid else None

            c.execute("""
                INSERT INTO payments 
                (resident_id, month, due_amount, paid_amount, due_date, paid_date, status, penalty_amount, payment_method, notes, created_at, updated_at)
                VALUES (?, '2026-11', 2750.0, ?, '2026-11-05', ?, ?, 0.0, ?, ?, ?, ?)
            """, (r_id, paid_amt, paid_dt, status, method, f"Nov 2026 dues for {u_num}", now_str, now_str))

        print(f"Seeded 2026-11 payments for {len(residents)} flats.")

    # 2. Seed Tasks in `tasks` table
    c.execute("DELETE FROM tasks")
    tasks_data = [
        ("Elevator Monthly AMC Servicing (Block A & B)", "Mandatory Schindler/Otis monthly preventive maintenance, lube rope, motor inspect", "Electrical", "Building Lift Shafts", "Otis AMC Team", "completed", "critical", "2026-11-01", "11"),
        ("Overhead Water Tank Deep Cleaning & Disinfection", "Drain rooftop tanks, chlorination wash, UV filter test", "Plumbing", "Rooftop Water Tanks", "AquaPure Cleaners", "in_progress", "high", "2026-11-05", "10"),
        ("Swimming Pool Filtration & Chemical Balancing", "Filter backwash, chemical chlorine and pH leveling for clubhouse pool", "Maintenance", "Clubhouse Pool", "AquaTech Services", "completed", "medium", "2026-11-03", None),
        ("Clubhouse Gym AC Filter Servicing & Duct Cleaning", "Indoor unit coil washing and filter replacements across gym", "HVAC", "Clubhouse Ground Floor", "CoolAir Solutions", "pending", "medium", "2026-11-08", None),
        ("Common Corridor LED Light Replacement", "Replace non-functional lights on Block A 1st & 2nd floor corridors", "Electrical", "Tower A Corridors", "Suresh (Electrician)", "pending", "low", "2026-11-12", "4"),
        ("Basement Stormwater Drainage Sump Pump Testing", "Check dual submersible pumps in basement sump pit and float switches", "Plumbing", "Basement Parking B2", "Master Plumber", "pending", "high", "2026-11-15", None),
        ("Fire Extinguisher & Hydrant System Bi-Annual Audit", "Hydrostatic testing of hose reels and checking 24 ABC fire extinguishers", "Safety", "All Floors & Stairwells", "Safety First India", "pending", "critical", "2026-11-20", None),
        ("Diesel Generator (DG) 250kVA Full AMC Check", "Engine oil level check, coolant top-up, battery health, and load test", "Electrical", "DG Yard Near Gate 2", "Cummins Power Service", "pending", "high", "2026-11-25", None),
        ("Garden Sprinkler Line & Timer Calibration", "Fix jammed rotary nozzles and set 6 AM automated watering timer", "Maintenance", "Central Garden & Boundary", "GreenThumb Landscapes", "completed", "low", "2026-10-28", None),
        ("CCTV Camera Angle & Storage Server Health Inspection", "Clean outdoor camera domes, verify 30-day NVR recording storage", "Safety", "Security Control Room", "SecureVision Tech", "completed", "medium", "2026-10-25", None)
    ]
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    for t in tasks_data:
        c.execute("""
            INSERT INTO tasks 
            (title, description, category, location, assignee, status, priority, due_date, resident_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (*t, now_str, now_str))
    print(f"Seeded {len(tasks_data)} maintenance tasks.")

    # 3. Seed Issues, Comments, Reactions
    c.execute("DELETE FROM issue_reactions")
    c.execute("DELETE FROM issue_comments")
    c.execute("DELETE FROM issues")

    issues_data = [
        (
            1, "KRISHNA VARUN", "krishna.varun@example.com", "9845112233", "NNG-FF1",
            "electrical", "medium", "Corridor Light Flickering on 1st Floor",
            "The LED tube light outside flat FF1 flickers continuously at night. Needs replacement. [Preferred Date: 2026-11-02] [Preferred Time: Morning (9 AM - 12 PM)]",
            "Block A, 1st Floor Corridor", "in_progress", None, 5, "2026-11-01 09:30:00"
        ),
        (
            2, "SANTOSH S", "santosh.s@example.com", "9845223344", "NB-SF2",
            "amenity", "low", "Clubhouse Gym AC Remote Sensor Issue",
            "The remote control for the AC unit in the clubhouse gym is not turning on. [Preferred Date: 2026-10-30] [Preferred Time: Evening (4 PM - 8 PM)]",
            "Clubhouse Gym", "resolved", "New batteries and remote replaced by facility staff.", None, "2026-10-29 14:15:00"
        ),
        (
            3, "HAREESH MJ", "hareesh.mj@example.com", "9845334455", "NNG-TF2",
            "plumbing", "high", "Main Overhead Water Tank Float Sensor Calibration",
            "The automatic pump cut-off float sensor triggered false overflow alarms yesterday morning. [Preferred Date: 2026-11-03] [Preferred Time: Morning (9 AM - 12 PM)]",
            "Rooftop Tank", "pending", None, 2, "2026-11-01 08:00:00"
        ),
        (
            4, "Hanumanth", "hanumanth@example.com", "9845445566", "NB-GF1",
            "security", "medium", "Visitor Parking Gate Boom Barrier Sensor Delay",
            "RFID reader at Main Gate 1 takes 10+ seconds to sense registered vehicle tags.",
            "Main Gate 1", "resolved", "Technician aligned the optical antenna and cleaned sensor lens.", None, "2026-10-26 11:20:00"
        ),
        (
            5, "BHARADWAJ BS", "bharadwaj.bs@example.com", "9845556677", "NNG-GF1",
            "amenity", "low", "Garden Sprinkler Head Clogged with Mud",
            "Two rotary sprinklers in the central garden are stuck and spraying onto the walkway.",
            "Central Lawn", "pending", None, None, "2026-11-01 11:45:00"
        ),
        (
            6, "ANIRUDDHA BHAT", "aniruddha.b@example.com", "9845667788", "NNG-SF1",
            "plumbing", "high", "Basement Pipe Joint Minor Leakage",
            "Small water drip observed on B1 ceiling pipe near parking bay 14.",
            "Basement B1 Parking", "resolved", "Pipe joint re-threaded and teflon sealed.", None, "2026-09-28 16:30:00"
        )
    ]

    for iss in issues_data:
        c.execute("""
            INSERT INTO issues 
            (id, name, email, phone, unit, category, priority, title, description, location, status, admin_response, task_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (*iss, iss[13]))

    print(f"Seeded {len(issues_data)} issues.")

    # Comments for issues
    comments_data = [
        (1, 1, "Admin Team", "admin", "Management", "Electrician Suresh assigned. Scheduled for visit on Monday morning at 10 AM.", 1, "2026-11-01 10:15:00"),
        (1, 4, "KRISHNA VARUN", "resident", "NNG-FF1", "Thank you for the prompt update! Will make sure corridor is accessible.", 0, "2026-11-01 10:45:00"),
        (2, 1, "Facility Desk", "admin", "Management", "Tested remote sensors and placed new Energizer batteries. Working smoothly now.", 1, "2026-10-30 17:00:00"),
        (3, 1, "Admin Team", "admin", "Management", "AquaPure technicians notified. Calibration scheduled along with tank cleaning on Nov 5.", 1, "2026-11-01 09:00:00"),
        (4, 1, "Security Head", "admin", "Management", "Boom barrier loop detector recalibrated and validated for all 25 flats.", 1, "2026-10-26 14:00:00")
    ]
    for comm in comments_data:
        c.execute("""
            INSERT INTO issue_comments
            (issue_id, user_id, author_name, author_role, author_unit, comment, is_admin, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (*comm, comm[7]))
    print(f"Seeded {len(comments_data)} issue comments.")

    # Reactions for issues
    reactions_data = [
        (1, 1, "SURAJ M.H", "👍"),
        (1, 2, "Admin", "🛠️"),
        (2, 20, "SANTOSH S", "❤️"),
        (3, 1, "SURAJ M.H", "⚠️"),
        (4, 13, "Hanumanth", "👏")
    ]
    for r in reactions_data:
        c.execute("""
            INSERT INTO issue_reactions
            (issue_id, user_id, user_name, emoji, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (*r, now_str, now_str))
    print(f"Seeded {len(reactions_data)} issue reactions.")

    # 4. Seed Feedbacks
    c.execute("DELETE FROM feedbacks")
    feedbacks_data = [
        ("SURAJ M.H", "suraj@example.com", "Excellent Lift Servicing & Smooth Ride", "Lift AMC servicing was done on Nov 1st without any downtime during peak hours. Great job by committee!", 5, "maintenance", "NNG-TF2", "2026-11-01 12:00:00"),
        ("KRISHNA VARUN", "krishna.v@example.com", "Prompt Response to Corridor Lighting Ticket", "Raised issue in the morning and was acknowledged within 30 minutes. The new portal makes tracking effortless.", 5, "service", "NNG-FF1", "2026-11-01 10:50:00"),
        ("Priya Narayanan", "priya.n@example.com", "Clean Clubhouse and Landscaped Garden Pathways", "Housekeeping staff has been doing an outstanding job keeping the common garden and jogging track spotless.", 5, "amenity", "NB-FF2", "2026-10-25 15:30:00"),
        ("Karthik Rao", "karthik.r@example.com", "Water Tank Disinfection Notice & Timely Execution", "Appreciate advance notice regarding overhead water tank cleaning. Water supply resumed right on schedule.", 4, "maintenance", "NNG-SF1", "2026-10-18 11:20:00"),
        ("MAHESH MK", "mahesh.mk@example.com", "Security Guard Courtesy and Visitor Logging", "Gate security team is well trained and polite with visitor entry protocols.", 4, "security", "NNG-SF2", "2026-10-10 09:15:00"),
        ("SRIKANTAIAH GS", "srikantaiah@example.com", "Diesel Generator Backup During Power Cut", "Smooth switchover during the BESCOM power disruption last week. No elevator stranding.", 5, "maintenance", "NB-TF2", "2026-09-22 18:40:00"),
        ("ROOPA", "roopa@example.com", "Rainwater Harvesting Pit Desilting", "Good preventive step taken before the monsoon rains. Water drains quickly from basement driveway.", 5, "service", "NNG-FF3", "2026-09-15 14:00:00")
    ]
    for fb in feedbacks_data:
        c.execute("""
            INSERT INTO feedbacks
            (name, email, subject, message, rating, category, unit, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (*fb, fb[7]))
    print(f"Seeded {len(feedbacks_data)} feedbacks.")

    conn.commit()
    conn.close()
    print("Database seeding completed successfully.")

if __name__ == '__main__':
    run_seed()
