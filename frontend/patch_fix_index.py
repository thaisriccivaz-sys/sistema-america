
# -*- coding: utf-8 -*-
f = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\frontend\index.html'
with open(f, 'r', encoding='utf-8') as fh:
    content = fh.read()

# Fix duplicates in index.html
# Find the exact duplicate blocks and remove the extra ones.
# In modal-novo-treinamento, we have novo-treinamento-is-integracao and editar-treinamento-is-integracao.
# Let's remove the editar-treinamento-is-integracao block from modal-novo-treinamento, and novo-treinamento-is-integracao from modal-editar-treinamento.

import re

# Clean up novo-treinamento block
BLOCK_TO_REMOVE_FROM_NOVO = """                    <div class="mb-3">
                        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-weight:600;font-size:0.95rem;color:#374151;">
                            <input type="checkbox" id="editar-treinamento-is-integracao" value="1"> Pertence à Integração do colaborador?
                        </label>
                    </div>"""
# Clean up editar-treinamento block
BLOCK_TO_REMOVE_FROM_EDITAR = """                    <div class="mb-3">
                        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-weight:600;font-size:0.95rem;color:#374151;">
                            <input type="checkbox" id="novo-treinamento-is-integracao" value="1"> Pertence à Integração do colaborador?
                        </label>
                        <p style="font-size:0.78rem;color:#94a3b8;margin:4px 0 0 24px;">Se marcado, este treinamento poderá ser vinculado nas ações de integração para auto-conclusão.</p>
                    </div>"""

# Replace in content
# I need to make sure I only remove them once, or just use string replace.
content = content.replace(BLOCK_TO_REMOVE_FROM_NOVO, "")
content = content.replace(BLOCK_TO_REMOVE_FROM_EDITAR, "")

with open(f, 'w', encoding='utf-8') as fh:
    fh.write(content)

print("Fixed duplicate checkboxes in index.html")
