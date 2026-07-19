
# -*- coding: utf-8 -*-
f = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\frontend\integracao.js'
with open(f, 'r', encoding='utf-8') as fh:
    content = fh.read()

OLD_LISTA = """        <div class="cig-acoes-lista" style="display:flex; flex-direction:column; gap:0.75rem;">
            <!-- Ações aqui -->
        </div>
    `;"""

NEW_LISTA = """        <div class="cig-acoes-lista" style="display:flex; flex-direction:column; gap:0.75rem;">
            <!-- Ações aqui -->
        </div>
        <div style="margin-top:1rem; text-align:center;">
            <button type="button" onclick="window.ciAdicionarAcaoNoGrupo(this.closest('.ci-grupo-block'), null)" style="background:#f8fafc; color:#64748b; border:1.5px dashed #cbd5e1; padding:0.5rem 1.5rem; border-radius:8px; font-size:0.85rem; font-weight:600; cursor:pointer; display:inline-flex; align-items:center; gap:6px; transition:all 0.2s;" onmouseover="this.style.background='#f1f5f9';this.style.borderColor='#94a3b8';this.style.color='#475569'" onmouseout="this.style.background='#f8fafc';this.style.borderColor='#cbd5e1';this.style.color='#64748b'">
                <i class="ph ph-plus"></i> Adicionar nova Ação aqui
            </button>
        </div>
    `;"""

content = content.replace(OLD_LISTA, NEW_LISTA)

with open(f, 'w', encoding='utf-8') as fh:
    fh.write(content)

print("Patch visual aplicado com sucesso!")
