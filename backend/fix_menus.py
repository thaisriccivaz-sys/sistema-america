# -*- coding: utf-8 -*-
import re

html_file = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\frontend\index.html'
with open(html_file, 'r', encoding='utf-8', errors='ignore') as f:
    html = f.read()

# Remove the independent "Palestras" menu and its submenu completely.
# In a previous step I added this:
# <!-- Palestras -->
# <div class="dept-group">
#     <button class="dept-btn" title="Palestras">
#     ...
#     </button>
#     <div class="dept-submenu">
#         ...
#     </div>
# </div>

# Let's find the Treinamento and Palestras blocks.
# Instead of complex regex, let's just find the whole "Treinamentos" and "Palestras" blocks and replace them.

old_treinamento_menu = """<!-- Treinamentos -->
                <div class="dept-group">
                    <button class="dept-btn" title="Treinamentos">
                        <div class="dept-btn-icon-wrapper" style="background:#cffafe;color:#0e7490;">
                            <i class="ph ph-graduation-cap"></i>
                        </div>
                        <span>TREINAME.</span>
                    </button>
                    <div class="dept-submenu">
                        <div class="dept-submenu-header" style="color:#0e7490;"><i class="ph ph-graduation-cap"></i> Treinamentos</div>
                        
                            <a href="#treinamento-materiais" class="submenu-item">
                                <i class="ph ph-books"></i>
                                Materiais Trein.</a>
                        
                            <a href="#treinamento-presenca" class="submenu-item">
                                <i class="ph ph-check-square"></i>
                                Presença Trein.</a>
                        
                    </div>
                </div>

                <!-- Palestras -->
                <div class="dept-group">
                    <button class="dept-btn" title="Palestras">
                        <div class="dept-btn-icon-wrapper" style="background:#cffafe;color:#0e7490;">
                            <i class="ph ph-users-three"></i>
                        </div>
                        <span>Palestras</span>
                    </button>
                    <div class="dept-submenu">
                        <div class="dept-submenu-header" style="color:#0e7490;"><i class="ph ph-users-three"></i> Palestras</div>
                        
                            <a href="#treinamento-materiais-terapia" class="submenu-item">
                                <i class="ph ph-books"></i>
                                Materiais Pales.</a>
                        
                            <a href="#treinamento-presenca-terapia" class="submenu-item">
                                <i class="ph ph-list-numbers"></i>
                                Presença Pales.</a>
                        
                    </div>
                </div>"""

new_treinamento_menu = """<!-- Treinamentos -->
                <div class="dept-group">
                    <button class="dept-btn" title="Treinamentos">
                        <div class="dept-btn-icon-wrapper" style="background:#cffafe;color:#0e7490;">
                            <i class="ph ph-graduation-cap"></i>
                        </div>
                        <span>TREINAME.</span>
                    </button>
                    <div class="dept-submenu" style="padding-top:8px;">
                        <!-- Submenu: Treinamentos -->
                        <div style="font-size:0.75rem; font-weight:700; color:#0e7490; margin:10px 0 4px 12px; text-transform:uppercase;">Treinamentos</div>
                        <a href="#treinamento-materiais" class="submenu-item">
                            <i class="ph ph-books"></i>
                            Materiais Trein.</a>
                        <a href="#treinamento-presenca" class="submenu-item">
                            <i class="ph ph-check-square"></i>
                            Presença Trein.</a>
                            
                        <!-- Submenu: Palestras -->
                        <div style="font-size:0.75rem; font-weight:700; color:#0e7490; margin:14px 0 4px 12px; text-transform:uppercase;">Palestras</div>
                        <a href="#treinamento-materiais-terapia" class="submenu-item">
                            <i class="ph ph-books"></i>
                            Materiais Pales.</a>
                        <a href="#treinamento-presenca-terapia" class="submenu-item">
                            <i class="ph ph-list-numbers"></i>
                            Presença Pales.</a>
                    </div>
                </div>"""

# Replace the HTML block
if old_treinamento_menu in html:
    html = html.replace(old_treinamento_menu, new_treinamento_menu)
else:
    print("Warning: old menu exact block not found. Trying regex.")
    html = re.sub(r'<!-- Treinamentos -->\s*<div class="dept-group">.*?<!-- Palestras -->\s*<div class="dept-group">.*?</div>\s*</div>', new_treinamento_menu, html, flags=re.DOTALL)

with open(html_file, 'w', encoding='utf-8') as f:
    f.write(html)
print("Updated HTML Menu")

