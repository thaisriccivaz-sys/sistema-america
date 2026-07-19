
import sqlite3
conn = sqlite3.connect("backend/data/hr_system_v2.sqlite")
cursor = conn.cursor()
cursor.execute("SELECT id, username, role FROM usuarios WHERE username LIKE '%thais%'")
print(cursor.fetchall())
