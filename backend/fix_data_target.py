# -*- coding: utf-8 -*-
import re

html_file = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\frontend\index.html'
with open(html_file, 'r', encoding='utf-8', errors='ignore') as f:
    html = f.read()

# Replace the complicated onclick with simple data-target and navigateTo calls
# Link 1: treinamento-materiais
html = re.sub(
    r'<a href="#treinamento-materiais" class="nav-item" onclick=".*?">',
    r'<a href="#treinamento-materiais" class="nav-item" data-target="treinamento-materiais" onclick="navigateTo(\'treinamento-materiais\'); if(window.renderTreinamentosTable) window.renderTreinamentosTable(); return false;">',
    html
)

# Link 2: treinamento-presenca
html = re.sub(
    r'<a href="#treinamento-presenca" class="nav-item" onclick=".*?">',
    r'<a href="#treinamento-presenca" class="nav-item" data-target="treinamento-presenca" onclick="navigateTo(\'treinamento-presenca\'); if(window.initPresencaTreinamento) window.initPresencaTreinamento(); return false;">',
    html
)

# Link 3: treinamento-materiais-terapia
html = re.sub(
    r'<a href="#treinamento-materiais-terapia" class="nav-item" onclick=".*?">',
    r'<a href="#treinamento-materiais-terapia" class="nav-item" data-target="treinamento-materiais-terapia" onclick="navigateTo(\'treinamento-materiais-terapia\'); if(window.renderTreinamentosTable) window.renderTreinamentosTable(); return false;">',
    html
)

# Link 4: treinamento-presenca-terapia
html = re.sub(
    r'<a href="#treinamento-presenca-terapia" class="nav-item" onclick=".*?">',
    r'<a href="#treinamento-presenca-terapia" class="nav-item" data-target="treinamento-presenca-terapia" onclick="navigateTo(\'treinamento-presenca-terapia\'); if(window.initPresencaTreinamento) window.initPresencaTreinamento(); return false;">',
    html
)

with open(html_file, 'w', encoding='utf-8') as f:
    f.write(html)
print("Added data-target to HTML links")
