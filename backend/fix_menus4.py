# -*- coding: utf-8 -*-
import re

html_file = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\frontend\index.html'
with open(html_file, 'r', encoding='utf-8', errors='ignore') as f:
    html = f.read()

new_menu = """<!-- Treinamentos -->
                <div class="dept-group">
                    <button class="dept-btn" title="Treinamentos">
                        <div class="dept-btn-icon-wrapper" style="background:#cffafe;color:#0e7490;">
                            <i class="ph ph-graduation-cap"></i>
                        </div>
                        <span>TREINAME.</span>
                    </button>
                    <div class="dept-submenu" style="padding-top:8px;">
                        <div style="font-size:0.75rem; font-weight:800; color:#0e7490; margin:10px 0 4px 12px; text-transform:uppercase;">Treinamentos</div>
                        <a href="#treinamento-materiais" class="submenu-item" onclick="window._currentTreinamentoTipo='treinamento'; navigateTo('treinamento-materiais'); setTimeout(() => { document.querySelectorAll('.nav-item').forEach(e=>e.classList.remove('active')); this.classList.add('active'); if(window.renderTreinamentosTable) window.renderTreinamentosTable(); }, 10); return false;">
                            <i class="ph ph-books"></i>
                            Materiais Trein.</a>
                        <a href="#treinamento-presenca" class="submenu-item" onclick="window._currentTreinamentoTipo='treinamento'; navigateTo('treinamento-presenca'); setTimeout(() => { document.querySelectorAll('.nav-item').forEach(e=>e.classList.remove('active')); this.classList.add('active'); if(window.initPresencaTreinamento) window.initPresencaTreinamento(); }, 10); return false;">
                            <i class="ph ph-check-square"></i>
                            Presença Trein.</a>
                            
                        <div style="font-size:0.75rem; font-weight:800; color:#0e7490; margin:14px 0 4px 12px; text-transform:uppercase;">Palestras</div>
                        <a href="#treinamento-materiais-terapia" class="submenu-item" onclick="window._currentTreinamentoTipo='terapia'; navigateTo('treinamento-materiais-terapia'); setTimeout(() => { document.querySelectorAll('.nav-item').forEach(e=>e.classList.remove('active')); this.classList.add('active'); if(window.renderTreinamentosTable) window.renderTreinamentosTable(); }, 10); return false;">
                            <i class="ph ph-books"></i>
                            Materiais Pales.</a>
                        <a href="#treinamento-presenca-terapia" class="submenu-item" onclick="window._currentTreinamentoTipo='terapia'; navigateTo('treinamento-presenca-terapia'); setTimeout(() => { document.querySelectorAll('.nav-item').forEach(e=>e.classList.remove('active')); this.classList.add('active'); if(window.initPresencaTreinamento) window.initPresencaTreinamento(); }, 10); return false;">
                            <i class="ph ph-list-numbers"></i>
                            Presença Pales.</a>
                    </div>
                </div>

                <!-- Diretoria -->
                <div class="dept-group">
                    <button class="dept-btn" title="Diretoria">"""

# Let's match from <!-- Treinamentos --> up to <button class="dept-btn" title="Diretoria">
pattern = re.compile(r'<!-- Treinamentos -->.*?<button class="dept-btn" title="Diretoria">', re.DOTALL)
if pattern.search(html):
    html = pattern.sub(new_menu, html)
    print("Replaced menu successfully.")
else:
    print("Could not find the block to replace.")

with open(html_file, 'w', encoding='utf-8') as f:
    f.write(html)
