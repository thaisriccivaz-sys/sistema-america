
# -*- coding: utf-8 -*-
f = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\frontend\index.html'
with open(f, 'r', encoding='utf-8') as fh:
    content = fh.read()

# 1. In modal-novo-treinamento
NOVO_OLD = """                    <div class="mb-3">
                        <label style="font-weight:600;font-size:0.95rem;color:#374151;display:block;margin-bottom:8px;">Departamentos</label>"""
NOVO_NEW = """                    <div class="mb-3">
                        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-weight:600;font-size:0.95rem;color:#374151;">
                            <input type="checkbox" id="novo-treinamento-is-integracao" value="1"> Pertence à Integração do colaborador?
                        </label>
                        <p style="font-size:0.78rem;color:#94a3b8;margin:4px 0 0 24px;">Se marcado, este treinamento poderá ser vinculado nas ações de integração para auto-conclusão.</p>
                    </div>
                    <div class="mb-3">
                        <label style="font-weight:600;font-size:0.95rem;color:#374151;display:block;margin-bottom:8px;">Departamentos</label>"""
content = content.replace(NOVO_OLD, NOVO_NEW)

# 2. In modal-editar-treinamento
EDIT_OLD = """                    <div class="mb-3">
                        <label style="font-weight:600;font-size:0.95rem;color:#374151;display:block;margin-bottom:8px;">Departamentos</label>"""
EDIT_NEW = """                    <div class="mb-3">
                        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-weight:600;font-size:0.95rem;color:#374151;">
                            <input type="checkbox" id="editar-treinamento-is-integracao" value="1"> Pertence à Integração do colaborador?
                        </label>
                    </div>
                    <div class="mb-3">
                        <label style="font-weight:600;font-size:0.95rem;color:#374151;display:block;margin-bottom:8px;">Departamentos</label>"""
content = content.replace(EDIT_OLD, EDIT_NEW)

with open(f, 'w', encoding='utf-8') as fh:
    fh.write(content)

print("Frontend patch for index.html Treinamento Integration done!")
