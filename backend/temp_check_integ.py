
import sqlite3
conn = sqlite3.connect("backend/data/hr_system_v2.sqlite")
cursor = conn.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'integ%';")
for row in cursor.fetchall():
    print(row)
