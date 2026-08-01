# -*- coding: utf-8 -*-

js_file = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\frontend\epi.js'

with open(js_file, 'r', encoding='utf-8', errors='ignore') as f:
    js = f.read()

# Fix cache issues on GET requests
js = js.replace("fetch(`${API_URL}/epi-templates`, {", "fetch(`${API_URL}/epi-templates?_t=${Date.now()}`, {")
js = js.replace("fetch(`${API_URL}/departamentos`, {", "fetch(`${API_URL}/departamentos?_t=${Date.now()}`, {")
js = js.replace("fetch(`/api/colaboradores/${colabId}/epi-fichas`, {", "fetch(`/api/colaboradores/${colabId}/epi-fichas?_t=${Date.now()}`, {")
js = js.replace("fetch(`/api/epi-fichas/${fichaId}/entregas`, {", "fetch(`/api/epi-fichas/${fichaId}/entregas?_t=${Date.now()}`, {")

with open(js_file, 'w', encoding='utf-8') as f:
    f.write(js)
print("Added cache-busting to GET requests in epi.js")
