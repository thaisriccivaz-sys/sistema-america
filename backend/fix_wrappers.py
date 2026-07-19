# -*- coding: utf-8 -*-
import re

html_file = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\frontend\index.html'
with open(html_file, 'r', encoding='utf-8', errors='ignore') as f:
    html = f.read()

# Fix Treinamentos wrapper
treinamentos_old = """<!-- Treinamentos -->
                <div class="dept-group">
                    <button class="dept-btn" title="Treinamentos">"""

treinamentos_new = """<!-- Treinamentos -->
                <div class="dept-item" style="--dept-color:#0e7490; --dept-bg:#cffafe;">
                    <button class="dept-btn" title="Treinamentos">"""

html = html.replace(treinamentos_old, treinamentos_new)
if treinamentos_old not in html:
    # try regex just in case
    html = re.sub(r'<!-- Treinamentos -->\s*<div class="dept-group">\s*<button class="dept-btn" title="Treinamentos">', treinamentos_new, html)

# Fix Diretoria wrapper
diretoria_old = """<!-- Diretoria -->
                <div class="dept-group">
                    <button class="dept-btn" title="Diretoria">"""

diretoria_new = """<!-- Diretoria -->
                <div class="dept-item" style="--dept-color:#d9480f; --dept-bg:#ffedd5;">
                    <button class="dept-btn" title="Diretoria">"""

html = html.replace(diretoria_old, diretoria_new)
if diretoria_old not in html:
    html = re.sub(r'<!-- Diretoria -->\s*<div class="dept-group">\s*<button class="dept-btn" title="Diretoria">', diretoria_new, html)

# Also fix the star button that was supposedly still there.
# The user said "Favoritoa continua funcionando" in the top tabs!
# Ah! In the screenshot, there is a star next to "Colaboradores" and "Satisfação".
# This means I hid `#btn-star-page` but they meant the bookmark/favorites tab bar entirely?
# No, "Favoritoa continua funcionando". It means they can still click it? Or the button `#btn-star-page` is STILL visible?
# Wait, in app.js line 769: starBtn.style.display = 'flex'; !!
# So my CSS `display:none !important;` in HTML was overridden by inline style if `!important` was somehow lost, OR wait! I did:
# `html.replace('<button id="btn-star-page"', '<button id="btn-star-page" style="display:none !important;"')`
# But in app.js: `starBtn.style.display = 'flex';` -> This overrides standard styles, but NOT `!important` in a style attribute.
# Wait, setting `.style.display = 'flex'` on an element overrides the style attribute.
# Oh! Inline style `style="display:none !important;"` might be overwritten by JS `.style.display = 'flex'`?
# No, JS `element.style.display = 'flex'` does NOT override an inline `!important`. It just sets it to `flex`, but `!important` in CSS takes precedence.
# BUT I put `display:none !important;` in the *HTML string* `style="display:none !important;"`.
# Actually, setting `element.style.display = 'flex'` modifies the inline style string, potentially stripping the old values or overriding them.
# The best way to hide it is in CSS block or commenting it out.
# Let's remove the star button entirely from HTML to be safe!

star_btn_regex = r'<button id="btn-star-page"[^>]*>.*?</button>'
html = re.sub(star_btn_regex, '', html, flags=re.DOTALL)

with open(html_file, 'w', encoding='utf-8') as f:
    f.write(html)
print("Fixed wrappers and removed star button.")
