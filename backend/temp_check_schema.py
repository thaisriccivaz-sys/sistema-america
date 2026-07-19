
import sqlite3

conn = sqlite3.connect("backend/data/hr_system_v2.sqlite")
cursor = conn.cursor()
cursor.execute("PRAGMA table_info('colaboradores');")
cols = [r[1] for r in cursor.fetchall()]
print('nao_admitido in cols:', 'nao_admitido' in cols)
