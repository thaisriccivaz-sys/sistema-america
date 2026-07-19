
import sqlite3
conn = sqlite3.connect("backend/data/hr_system_v2.sqlite")
cursor = conn.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
with open("backend/all_tables.txt", "w") as f:
    for row in cursor.fetchall():
        f.write(row[0] + "\n")
