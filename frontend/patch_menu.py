
# -*- coding: utf-8 -*-
f = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\frontend\index.html'
with open(f, 'r', encoding='utf-8') as fh:
    content = fh.read()

target = """
                        <div class="nav-group" id="nav-group-terapia">
                            <button class="nav-group-label nav-group-toggle"
                                onclick="toggleNavGroup('nav-group-terapia')">
                                <span style="display:flex;align-items:center;gap:0.55rem;">
                                    <i class="ph ph-heartbeat"></i>
                                    Terapia
                                </span>
                                <i class="ph ph-caret-right nav-group-chevron"></i>
                            </button>
                            <div class="nav-group-items" id="nav-group-items-terapia">
                                <a href="#" class="nav-item nav-item-sub" data-target="treinamento-materiais-terapia"
                                    onclick="window._currentTreinamentoTipo='terapia'; navigateTo('treinamento-materiais-terapia'); setTimeout(() => { document.querySelectorAll('.nav-item').forEach(e=>e.classList.remove('active')); this.classList.add('active'); if(window.renderTreinamentosTable) window.renderTreinamentosTable(); }, 10); return false;"><i class="ph ph-books"></i>
                                    Palestras</a>
                                <a href="#" class="nav-item nav-item-sub" data-target="treinamento-presenca-terapia"
                                    onclick="window._currentTreinamentoTipo='terapia'; navigateTo('treinamento-presenca-terapia'); setTimeout(() => { document.querySelectorAll('.nav-item').forEach(e=>e.classList.remove('active')); this.classList.add('active'); if(window.initPresencaTreinamento) window.initPresencaTreinamento(); }, 10); return false;"><i class="ph ph-list-numbers"></i>
                                    Listas</a>
                            </div>
                        </div>"""

replacement = """
                        <a href="#" class="nav-item nav-item-sub" data-target="treinamento-materiais-terapia"
                            onclick="window._currentTreinamentoTipo='terapia'; navigateTo('treinamento-materiais-terapia'); setTimeout(() => { document.querySelectorAll('.nav-item').forEach(e=>e.classList.remove('active')); this.classList.add('active'); if(window.renderTreinamentosTable) window.renderTreinamentosTable(); }, 10); return false;"><i class="ph ph-books"></i>
                            Palestras</a>
                        <a href="#" class="nav-item nav-item-sub" data-target="treinamento-presenca-terapia"
                            onclick="window._currentTreinamentoTipo='terapia'; navigateTo('treinamento-presenca-terapia'); setTimeout(() => { document.querySelectorAll('.nav-item').forEach(e=>e.classList.remove('active')); this.classList.add('active'); if(window.initPresencaTreinamento) window.initPresencaTreinamento(); }, 10); return false;"><i class="ph ph-list-numbers"></i>
                            Listas</a>"""

if target in content:
    content = content.replace(target, replacement)
    with open(f, 'w', encoding='utf-8') as fh:
        fh.write(content)
    print("Patched index.html Terapia menu")
else:
    print("Could not find the target string in index.html")
