# -*- coding: utf-8 -*-
import re

html_file = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\frontend\index.html'
with open(html_file, 'r', encoding='utf-8', errors='ignore') as f:
    html = f.read()

# Fix Treinamentos button structure
old_btn = """                    <button class="dept-btn" title="Treinamentos">
                        <div class="dept-btn-icon-wrapper" style="background:#cffafe;color:#0e7490;">
                            <i class="ph ph-graduation-cap"></i>
                        </div>
                        <span>TREINAME.</span>
                    </button>"""

new_btn = """                    <button class="dept-btn" title="Treinamentos">
                        <i class="ph ph-graduation-cap"></i>
                        <span>TREINAME.</span>
                    </button>"""

if old_btn in html:
    html = html.replace(old_btn, new_btn)
else:
    print("Warning: could not find old_btn for Treinamentos.")
    # Maybe indentation is different, use regex
    html = re.sub(r'<button class="dept-btn" title="Treinamentos">\s*<div class="dept-btn-icon-wrapper"[^>]*>\s*<i class="ph ph-graduation-cap"></i>\s*</div>\s*<span>TREINAME\.</span>\s*</button>', new_btn, html)


# Ensure Diretoria button structure is not broken. Let's inspect it carefully.
# In my previous view_file, it was:
#                 <!-- Diretoria -->
#                 <div class="dept-group">
#                     <button class="dept-btn" title="Diretoria">
#                     <i class="ph ph-crown"></i>
#                     <span>Diretoria</span>
#                 </button>
# This seems correct structurally (div class="dept-group" followed by button class="dept-btn").
# Wait, why was it grey? Maybe there's a missing </div> somewhere?
# Let's count open divs in new_menu:
# <!-- Treinamentos -->
# <div class="dept-group"> (1)
#   <button>...</button>
#   <div class="dept-submenu"> (2)
#     ...
#   </div> (closes 2)
# </div> (closes 1)
# 
# This matches perfectly. There is no missing div.
# Why is Diretoria grey? Let's check app.js again. Maybe app.js has a list of departments to colorize and it relies on exact names?

with open(html_file, 'w', encoding='utf-8') as f:
    f.write(html)
print("Removed icon-wrapper from Treinamentos.")
