
# -*- coding: utf-8 -*-
import re
f = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\backend\server.js'
with open(f, 'r', encoding='utf-8') as fh:
    content = fh.read()

# 1. Fix the SQL JOIN in GET /api/integracao/processos
# Replace LEFT JOIN departamentos d ON d.id = c.departamento_id
# With LEFT JOIN departamentos d ON LOWER(TRIM(d.nome)) = LOWER(TRIM(c.departamento))
regex_join = r"LEFT JOIN departamentos d ON d\.id = c\.departamento_id"
replacement_join = r"LEFT JOIN departamentos d ON LOWER(TRIM(d.nome)) = LOWER(TRIM(c.departamento))"
content = re.sub(regex_join, replacement_join, content)

# 2. In GET /api/integracao/processos/:id
# For non-admins, filter the steps returned.
regex_api_id = r"(app\.get\('/api/integracao/processos/:id', authenticateToken, \(req, res\) => \{.*?)(db\.all\(`SELECT ps\.\*,.*?WHERE ps\.processo_id = \?.*? ORDER BY ps\.id ASC`, \[req\.params\.id\])"
replacement_api_id = r"\1\n    const isAdmin = req.user && (req.user.role === 'admin' || req.user.nivel_acesso === 'admin');\n    let sqlPassos = `SELECT ps.*, u.username as responsavel_username, c.nome_completo as responsavel_nome FROM integracao_passos_status ps LEFT JOIN usuarios u ON u.id = ps.responsavel_user_id LEFT JOIN colaboradores c ON c.id = u.colaborador_id WHERE ps.processo_id = ?`;\n    let paramsPassos = [req.params.id];\n    if (!isAdmin) {\n        sqlPassos += ` AND ps.responsavel_user_id = ?`;\n        paramsPassos.push(req.user.id);\n    }\n    sqlPassos += ` ORDER BY ps.id ASC`;\n    \n    db.all(sqlPassos, paramsPassos"

content = re.sub(regex_api_id, replacement_api_id, content, flags=re.DOTALL)

with open(f, 'w', encoding='utf-8') as fh:
    fh.write(content)

print("Patched backend/server.js")
