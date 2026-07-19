
# -*- coding: utf-8 -*-
import re
f = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\frontend\integracao.js'
with open(f, 'r', encoding='utf-8') as fh:
    content = fh.read()

# Fix 1: Insert Treinamento Vinculado dropdown
# The original block is:
#                 <select class="cia-condicao" style="width:100%; padding:0.4rem; border:1px solid #cbd5e1; border-radius:6px; font-size:0.8rem; outline:none;">
#                     <option value="">Nenhuma (Sempre exigir)</option>
#                     <option value="vt" ${a.condicao==='vt'?'selected':''}>Somente se usar VT</option>
#                     <option value="vc" ${a.condicao==='vc'?'selected':''}>Somente se usar VC</option>
#                     <option value="terapia" ${a.condicao==='terapia'?'selected':''}>Somente se usar Terapia</option>
#                 </select>
#             </div>
# We want to replace it to include the cia-treinamento block.
# Let's use regex to find the end of cia-condicao div and insert the new div.

regex_condicao = r'(<select class="cia-condicao".*?</select>\s*</div>)'
replacement = r'''\1
                <div style="flex:1;">
                    <label style="display:block;font-size:0.75rem;font-weight:600;color:#64748b;margin-bottom:0.25rem;">Treinamento Vinculado</label>
                    <select class="cia-treinamento" style="width:100%;padding:0.4rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.8rem;outline:none;background:#fff;">
                        ${window._ciTreinOpts}
                    </select>
                </div>'''
content = re.sub(regex_condicao, replacement, content, flags=re.DOTALL)

# Fix 2: Lock the "4 Treinamentos" group
# In ciAdicionarGrupo, the input cig-nome is generated.
# <input type="text" class="cig-nome" value="${nome.replace(/"/g, '&quot;')}" placeholder="Nome do Grupo (Ex: Treinamentos)" style="flex:1; max-width:400px; padding:0.5rem; border:1px solid #cbd5e1; border-radius:6px; font-size:1rem; font-weight:600; outline:none;" onfocus="this.style.borderColor='#0f4c81'" onblur="this.style.borderColor='#d1d5db'">

regex_grupo = r'(<input type="text" class="cig-nome".*?onblur="this\.style\.borderColor=\'#d1d5db\'">)'
# Let's make it readonly if the name contains 'treinamentos'
replacement_grupo = r'''<input type="text" class="cig-nome" value="${nome.replace(/"/g, '&quot;')}" placeholder="Nome do Grupo (Ex: Treinamentos)" ${nome.toLowerCase().includes('treinamentos') ? 'readonly' : ''} style="flex:1; max-width:400px; padding:0.5rem; border:1px solid #cbd5e1; border-radius:6px; font-size:1rem; font-weight:600; outline:none; ${nome.toLowerCase().includes('treinamentos') ? 'background:#e2e8f0; color:#475569; border-color:#cbd5e1;' : ''}" onfocus="if(!this.readOnly) this.style.borderColor='#0f4c81'" onblur="if(!this.readOnly) this.style.borderColor='#d1d5db'">'''

content = re.sub(regex_grupo, replacement_grupo, content)

with open(f, 'w', encoding='utf-8') as fh:
    fh.write(content)

print("Fixed integracao.js")
