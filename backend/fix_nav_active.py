# -*- coding: utf-8 -*-
import re

html_file = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\frontend\index.html'
with open(html_file, 'r', encoding='utf-8', errors='ignore') as f:
    html = f.read()

# I want to change:
# onclick="window._currentTreinamentoTipo='...'; navigateTo('...'); setTimeout(() => { document.querySelectorAll('.nav-item').forEach(e=>e.classList.remove('active')); this.classList.add('active'); if(...) ... }, 10); return false;"
# TO:
# onclick="window._currentTreinamentoTipo='...'; document.querySelectorAll('.nav-item').forEach(e=>e.classList.remove('active')); this.classList.add('active'); navigateTo('...'); if(...) ...; return false;"

# Actually, the easiest way is to use regex.
def replace_onclick(m):
    tipo = m.group(1)
    target = m.group(2)
    init_func = m.group(3)
    return f'onclick="window._currentTreinamentoTipo=\'{tipo}\'; document.querySelectorAll(\'.nav-item\').forEach(e=>e.classList.remove(\'active\')); this.classList.add(\'active\'); navigateTo(\'{target}\'); if(window.{init_func}) window.{init_func}(); return false;"'

pattern = r'onclick="window\._currentTreinamentoTipo=\'([^\']+)\'; navigateTo\(\'([^\']+)\'\); setTimeout\(\(\) => \{ document\.querySelectorAll\(\'\.nav-item\'\)\.forEach\(e=>e\.classList\.remove\(\'active\'\)\); this\.classList\.add\(\'active\'\); if\(window\.([^\)]+)\) window\.[^\(]+\(\); \}, 10\); return false;"'

html = re.sub(pattern, replace_onclick, html)

with open(html_file, 'w', encoding='utf-8') as f:
    f.write(html)
print("Updated HTML onclick events")
