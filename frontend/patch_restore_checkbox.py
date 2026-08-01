
# -*- coding: utf-8 -*-
import re
f = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\frontend\index.html'
with open(f, 'r', encoding='utf-8') as fh:
    content = fh.read()

# We need to target the empty space between the Nome div and Departamentos div in both forms.
# Let's find form-editar-treinamento
editar_nome = r'(<input type="text" id="editar-treinamento-nome".*?</div>)\s*<div class="mb-3">\s*<label[^>]*>Departamentos</label>'
editar_insert = r'''\1
                    <div class="mb-3">
                        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-weight:600;font-size:0.95rem;color:#374151;">
                            <input type="checkbox" id="editar-treinamento-is-integracao" value="1"> Pertence à Integração do colaborador?
                        </label>
                    </div>
                    <div class="mb-3">
                        <label style="font-weight:600;font-size:0.95rem;color:#374151;display:block;margin-bottom:8px;">Departamentos</label>'''
content = re.sub(editar_nome, editar_insert, content, flags=re.DOTALL)

novo_nome = r'(<input type="text" id="novo-treinamento-nome".*?</div>)\s*<div class="mb-3">\s*<label[^>]*>Departamentos</label>'
novo_insert = r'''\1
                    <div class="mb-3">
                        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-weight:600;font-size:0.95rem;color:#374151;">
                            <input type="checkbox" id="novo-treinamento-is-integracao" value="1"> Pertence à Integração do colaborador?
                        </label>
                        <p style="font-size:0.78rem;color:#94a3b8;margin:4px 0 0 24px;">Se marcado, este treinamento poderá ser vinculado nas ações de integração para auto-conclusão.</p>
                    </div>
                    <div class="mb-3">
                        <label style="font-weight:600;font-size:0.95rem;color:#374151;display:block;margin-bottom:8px;">Departamentos</label>'''
content = re.sub(novo_nome, novo_insert, content, flags=re.DOTALL)

with open(f, 'w', encoding='utf-8') as fh:
    fh.write(content)

print("Restored checkboxes in index.html")
