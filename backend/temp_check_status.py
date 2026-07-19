
import sqlite3
conn = sqlite3.connect("backend/data/hr_system_v2.sqlite")
cursor = conn.cursor()
cursor.execute("PRAGMA table_info('integracao_passos_status');")
for row in cursor.fetchall():
    print(row)
