
import sqlite3
import datetime

conn = sqlite3.connect("backend/data/hr_system_v2.sqlite")
cursor = conn.cursor()

hoje = datetime.datetime.now()
expectedAno = 2026
expectedTrim = 3 

query = """
    SELECT c.id, c.nome_completo, c.departamento,
           d.responsavel_id,
           (SELECT COALESCE(NULLIF(email_corporativo, ''), NULLIF(email, '')) FROM colaboradores WHERE id = d.responsavel_id) as resp_email,
           (SELECT nome_completo FROM colaboradores WHERE id = d.responsavel_id) as resp_nome,
           (SELECT COUNT(*) FROM avaliacoes WHERE colaborador_id = c.id AND tipo = 'desempenho' AND ano = ? AND trimestre = ? AND situacao = 'finalizado') as has_avaliation
    FROM colaboradores c
    LEFT JOIN departamentos d ON LOWER(TRIM(d.nome)) = LOWER(TRIM(c.departamento))
    WHERE c.status = 'Ativo'
"""

cursor.execute(query, (expectedAno, expectedTrim))
rows = cursor.fetchall()
thais_count = 0
for r in rows:
    if r[4] and 'thais.ricci' in r[4].lower():
        thais_count += 1
print(f"Colaboradores for Thais: {thais_count}")
