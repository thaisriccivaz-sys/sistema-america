# -*- coding: utf-8 -*-
import re

# 1. Patch server.js
server_file = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\backend\server.js'
with open(server_file, 'r', encoding='utf-8') as f:
    server = f.read()

# Look for sqlTrein inside /api/treinamento-presenca/colaboradores
# The line is currently: SELECT id, nome, descricao, departamento, capa_url, validade_dias, IFNULL(tipo, 'treinamento') AS tipo
if 'IFNULL(tipo, \'treinamento\') AS tipo\nFROM treinamentos' in server:
    server = server.replace(
        "IFNULL(tipo, 'treinamento') AS tipo\nFROM treinamentos",
        "IFNULL(tipo, 'treinamento') AS tipo, is_integracao\nFROM treinamentos"
    )
elif 'IFNULL(tipo, \'treinamento\') AS tipo, is_integracao\nFROM treinamentos' not in server:
    # Just in case the format is different
    server = server.replace(
        "IFNULL(tipo, 'treinamento') AS tipo\r\nFROM treinamentos",
        "IFNULL(tipo, 'treinamento') AS tipo, is_integracao\r\nFROM treinamentos"
    )

with open(server_file, 'w', encoding='utf-8') as f:
    f.write(server)
print("Updated server.js")

# 2. Patch treinamento_presenca.js
pres_file = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\frontend\treinamento_presenca.js'
with open(pres_file, 'r', encoding='utf-8') as f:
    pres = f.read()

# We need to add a badge next to the title in the training list.
old_tr_title = """<span class="tr-nome">${t.nome}</span>"""
new_tr_title = """<span class="tr-nome">${t.nome} ${t.is_integracao ? '<span style="font-size:0.65rem;background:#0ea5e9;color:#fff;padding:2px 6px;border-radius:4px;margin-left:6px;font-weight:600;vertical-align:middle;">Integração</span>' : ''}</span>"""

if "Integração" not in pres or "${t.is_integracao" not in pres:
    pres = pres.replace(old_tr_title, new_tr_title)
    with open(pres_file, 'w', encoding='utf-8') as f:
        f.write(pres)
    print("Updated treinamento_presenca.js")

# 3. Patch treinamento.js
trein_file = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\frontend\treinamento.js'
with open(trein_file, 'r', encoding='utf-8') as f:
    trein = f.read()

# We need to add the badge next to the title in the table.
# Currently it is: <div style="font-weight:600;color:#0f172a;font-size:0.95rem;">${t.nome}</div>
old_trein_title = """<div style="font-weight:600;color:#0f172a;font-size:0.95rem;">${t.nome}</div>"""
new_trein_title = """<div style="font-weight:600;color:#0f172a;font-size:0.95rem;display:flex;align-items:center;gap:8px;">${t.nome}${t.is_integracao ? '<span style="font-size:0.65rem;background:#0ea5e9;color:#fff;padding:2px 6px;border-radius:4px;font-weight:600;">Integração</span>' : ''}</div>"""

if "Integração</span>" not in trein:
    trein = trein.replace(old_trein_title, new_trein_title)
    with open(trein_file, 'w', encoding='utf-8') as f:
        f.write(trein)
    print("Updated treinamento.js")
