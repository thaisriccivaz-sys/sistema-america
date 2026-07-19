
import sqlite3
conn = sqlite3.connect("backend/database.sqlite")
cursor = conn.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
with open("backend/all_tables_db1.txt", "w") as f:
    for row in cursor.fetchall():
        f.write(row[0] + "\n")
