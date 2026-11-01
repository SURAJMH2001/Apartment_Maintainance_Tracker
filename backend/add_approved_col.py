import sqlite3

for db_name in ['maintenance_tracker.db', 'society.db']:
    try:
        conn = sqlite3.connect(db_name)
        cursor = conn.cursor()
        cursor.execute('PRAGMA table_info(users)')
        cols = [r[1] for r in cursor.fetchall()]
        if 'is_approved' not in cols:
            print(f'Adding is_approved to {db_name}')
            cursor.execute('ALTER TABLE users ADD COLUMN is_approved BOOLEAN DEFAULT 0')
        cursor.execute("UPDATE users SET is_approved = 1 WHERE role IN ('admin', 'super-admin', 'superadmin', 'manager')")
        conn.commit()
        conn.close()
        print(f'{db_name} updated successfully')
    except Exception as e:
        print(f'Error on {db_name}: {e}')
