
import sqlite3
conn = sqlite3.connect("backend/database.sqlite")
cursor = conn.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
for row in cursor.fetchall():
    print(row)
print("---")
cursor.execute("PRAGMA table_info('departamentos');")
for row in cursor.fetchall():
    print(row)
