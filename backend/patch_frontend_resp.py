
# -*- coding: utf-8 -*-
import re
f = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\frontend\integracao.js'
with open(f, 'r', encoding='utf-8') as fh:
    content = fh.read()

# 1. renderCiForm options
OPT_OLD = """    const uOpts = `<option value="">— Nenhum (RH/Geral) —</option>` + 
        ciUsuarios.map(u => `<option value="${u.id}">${u.nome||u.username}</option>`).join('');"""
OPT_NEW = """    const baseUOpts = ciUsuarios.map(u => `<option value="${u.id}">${u.nome||u.username}</option>`).join('');
    const uOpts = `<option value="">— Nenhum (RH/Geral) —</option>` + baseUOpts;
    window._ciUOpts_raw = baseUOpts;"""
content = content.replace(OPT_OLD, OPT_NEW)

# 2. renderCiForm grouping
GRP_OLD = """        mapGrupos.forEach((acts, gName) => {
            const grpEl = window.ciAdicionarGrupo(gName, false);"""
GRP_NEW = """        mapGrupos.forEach((acts, gName) => {
            const firstWithGrpResp = acts.find(a => a.grupo_responsavel_user_id);
            const gResp = firstWithGrpResp ? firstWithGrpResp.grupo_responsavel_user_id : null;
            const grpEl = window.ciAdicionarGrupo(gName, false, gResp);"""
content = content.replace(GRP_OLD, GRP_NEW)

# 3. ciAdicionarGrupo signature and dropdown
SIG_OLD = """window.ciAdicionarGrupo = function(nome, updateNum = true) {"""
SIG_NEW = """window.ciAdicionarGrupo = function(nome, updateNum = true, respId = null) {"""
content = content.replace(SIG_OLD, SIG_NEW)

HTML_OLD = """            <div style="display:flex; align-items:center; gap:0.5rem;">
                <button type="button" onclick="window.ciMoverElemento(this.closest('.ci-grupo-block'), -1)\""""
HTML_NEW = """            <div style="display:flex; align-items:center; gap:0.5rem;">
                <select class="cig-responsavel" title="Responsável por todo o grupo (aplicado a ações sem responsável)" style="padding:0.4rem; border:1px solid #cbd5e1; border-radius:6px; font-size:0.8rem; outline:none; background:#fff; max-width:150px;">
                    <option value="">— Sem Resp. Grupo —</option>
                    ${window._ciUOpts_raw}
                </select>
                <div style="width:1px; height:20px; background:#cbd5e1; margin:0 2px;"></div>
                <button type="button" onclick="window.ciMoverElemento(this.closest('.ci-grupo-block'), -1)\""""
content = content.replace(HTML_OLD, HTML_NEW)

RET_OLD = """    container.appendChild(div);
    window.ciCheckEmpty();"""
RET_NEW = """    if (respId) div.querySelector('.cig-responsavel').value = respId;
    container.appendChild(div);
    window.ciCheckEmpty();"""
content = content.replace(RET_OLD, RET_NEW)

# 4. ciSalvarTemplate
SAVE_OLD = """        const grupoNome = grp.querySelector('.cig-nome').value.trim() || 'Geral';
        
        const acoesNode = grp.querySelectorAll('.ci-acao-item');"""
SAVE_NEW = """        const grupoNome = grp.querySelector('.cig-nome').value.trim() || 'Geral';
        const grupoResp = grp.querySelector('.cig-responsavel')?.value;
        
        const acoesNode = grp.querySelectorAll('.ci-acao-item');"""
content = content.replace(SAVE_OLD, SAVE_NEW)

PUSH_OLD = """                condicao: cond || null,
                ordem: ordemCounter++
            });"""
PUSH_NEW = """                condicao: cond || null,
                ordem: ordemCounter++,
                grupo_responsavel_user_id: grupoResp || null
            });"""
content = content.replace(PUSH_OLD, PUSH_NEW)

with open(f, 'w', encoding='utf-8') as fh:
    fh.write(content)

print("Patch frontend (responsavel grupo) aplicado com sucesso!")
