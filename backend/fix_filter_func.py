# -*- coding: utf-8 -*-
import re

js_file = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\frontend\treinamento_presenca.js'
with open(js_file, 'r', encoding='utf-8', errors='ignore') as f:
    js = f.read()

# Add the missing function
function_to_add = """window.filtrarPresencaBusca = function (val) {
    _filtroBusca = val;
    renderizar();
};

window.filtrarPresencaStatus = function (val) {
    _filtroStatus = val;
    renderizar();
};"""

js = js.replace("""window.filtrarPresencaBusca = function (val) {
    _filtroBusca = val;
    renderizar();
};""", function_to_add)

with open(js_file, 'w', encoding='utf-8') as f:
    f.write(js)
print("Added filtrarPresencaStatus")
