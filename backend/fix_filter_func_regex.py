# -*- coding: utf-8 -*-
import re

js_file = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\frontend\treinamento_presenca.js'
with open(js_file, 'r', encoding='utf-8', errors='ignore') as f:
    js = f.read()

# Add the missing function using regex
function_to_add = """window.filtrarPresencaBusca = function (val) {
        _filtroBusca = val;
        renderizar();
    };

    window.filtrarPresencaStatus = function (val) {
        _filtroStatus = val;
        renderizar();
    };"""

js = re.sub(r'window\.filtrarPresencaBusca = function \(val\) \{\s*_filtroBusca = val;\s*renderizar\(\);\s*\};', function_to_add, js)

with open(js_file, 'w', encoding='utf-8') as f:
    f.write(js)
print("Regex replaced: Added filtrarPresencaStatus")
