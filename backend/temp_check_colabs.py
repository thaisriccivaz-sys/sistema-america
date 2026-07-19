
import sqlite3
conn = sqlite3.connect("backend/data/hr_system_v2.sqlite")
cursor = conn.cursor()
cursor.execute("SELECT COUNT(*) FROM colaboradores WHERE status='Ativo'")
print("Total active collaborators:", cursor.fetchone()[0])
cursor.execute("SELECT DISTINCT c.departamento, d.responsavel_id FROM colaboradores c LEFT JOIN departamentos d ON LOWER(TRIM(d.nome)) = LOWER(TRIM(c.departamento)) WHERE c.status='Ativo'")
print("Departamentos:", cursor.fetchall())
