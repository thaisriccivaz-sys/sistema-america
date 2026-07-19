# -*- coding: utf-8 -*-
import re

# 1. Update app.js tabs
app_file = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\frontend\app.js'
with open(app_file, 'r', encoding='utf-8', errors='ignore') as f:
    app_js = f.read()

# Replace tab definitions
app_js = app_js.replace("'treinamento-materiais': { color: '#0e7490', icon: 'ph-books', title: 'Materiais' }",
                        "'treinamento-materiais': { color: '#0e7490', icon: 'ph-books', title: 'Materiais de treinamento' }")
app_js = app_js.replace("'treinamento-presenca': { color: '#0e7490', icon: 'ph-check-square', title: 'Presenças' }",
                        "'treinamento-presenca': { color: '#0e7490', icon: 'ph-check-square', title: 'Presença Treinamento' }")
app_js = app_js.replace("'treinamento-materiais-terapia': { color: '#0e7490', icon: 'ph-books', title: 'Palestras' }",
                        "'treinamento-materiais-terapia': { color: '#0e7490', icon: 'ph-books', title: 'Materiais Palestras' }")
app_js = app_js.replace("'treinamento-presenca-terapia': { color: '#0e7490', icon: 'ph-list-numbers', title: 'Listas' }",
                        "'treinamento-presenca-terapia': { color: '#0e7490', icon: 'ph-list-numbers', title: 'Presença Palestras' }")

with open(app_file, 'w', encoding='utf-8') as f:
    f.write(app_js)

# 2. Update titles in treinamento_presenca.js
pres_file = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\frontend\treinamento_presenca.js'
with open(pres_file, 'r', encoding='utf-8', errors='ignore') as f:
    pres_js = f.read()

pres_js = pres_js.replace("h1.textContent = 'Presença Trein.';", "h1.textContent = 'Presença Treinamento';")
pres_js = pres_js.replace("h1.textContent = 'Presença Pales.';", "h1.textContent = 'Presença Palestras';")

with open(pres_file, 'w', encoding='utf-8') as f:
    f.write(pres_js)

# 3. Update titles in treinamento.js (Wait, the user only asked for Presença title, but maybe materials too? The user said "Mudar o titulo que está presença Trein. para presença treinamento". I'll leave Materiais as Materiais Trein. unless asked).

# 4. Hide favorite stars and bottom bar in index.html
index_file = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\frontend\index.html'
with open(index_file, 'r', encoding='utf-8', errors='ignore') as f:
    html = f.read()

# Favoritos star is usually <button id="btn-favorito" or similar, or an icon like <i class="ph ph-star">
# In the header there's a favorite button. Let's find and hide it.
# Let's search for "btn-favorito" or "btn-favorite"
if 'id="btn-favorite"' in html:
    html = html.replace('id="btn-favorite" style="', 'id="btn-favorite" style="display:none !important;')
    html = html.replace('id="btn-favorite" class="', 'id="btn-favorite" style="display:none !important;" class="')
if 'id="btn-favorito"' in html:
    html = html.replace('id="btn-favorito" style="', 'id="btn-favorito" style="display:none !important;')
    html = html.replace('id="btn-favorito" class="', 'id="btn-favorito" style="display:none !important;" class="')
    
# Or maybe the star in the search bar: <button class="fav-btn" title="Favoritar esta tela" onclick="toggleFavorite()">
html = re.sub(r'(<button[^>]*onclick="toggleFavorite\(\)"[^>]*>)', r'\1<!-- hidden -->', html)
# Add display none to that button
html = html.replace('class="fav-btn"', 'class="fav-btn" style="display:none !important;"')

# Also hide the bottom bar
# The bottom bar is usually <nav class="bottom-nav"> or similar. Let's just add display:none to .bottom-nav in CSS
if '<style>' in html:
    html = html.replace('<style>', '<style>\n.bottom-nav, .mobile-bottom-nav, #bottom-navbar { display: none !important; }\n.fav-btn, .btn-favorite { display: none !important; }\n')

with open(index_file, 'w', encoding='utf-8') as f:
    f.write(html)
print("Finished patching UI changes.")
