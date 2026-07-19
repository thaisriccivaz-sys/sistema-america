
# -*- coding: utf-8 -*-
f = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\frontend\integracao.js'
with open(f, 'r', encoding='utf-8') as fh:
    content = fh.read()

# 1. Fix the buttons in ciAdicionarGrupo
content = content.replace(
    """<button onclick="window.ciAdicionarAcaoNoGrupo(this.closest('.ci-grupo-block'))\"""",
    """<button type="button" onclick="window.ciAdicionarAcaoNoGrupo(this.closest('.ci-grupo-block'), null)\""""
)
content = content.replace(
    """<button onclick="window.ciMoverElemento(this.closest('.ci-grupo-block'), -1)\"""" ,
    """<button type="button" onclick="window.ciMoverElemento(this.closest('.ci-grupo-block'), -1)\""""
)
content = content.replace(
    """<button onclick="window.ciMoverElemento(this.closest('.ci-grupo-block'), 1)\"""" ,
    """<button type="button" onclick="window.ciMoverElemento(this.closest('.ci-grupo-block'), 1)\""""
)
content = content.replace(
    """<button onclick="if(confirm('Excluir este grupo e todas as ações?')) { this.closest('.ci-grupo-block').remove(); window.ciAtualizarNumeracao(); window.ciCheckEmpty(); }\"""",
    """<button type="button" onclick="if(confirm('Excluir este grupo e todas as ações?')) { this.closest('.ci-grupo-block').remove(); window.ciAtualizarNumeracao(); window.ciCheckEmpty(); }\""""
)

# 2. Fix the buttons in ciAdicionarAcaoNoGrupo
content = content.replace(
    """<button onclick="window.ciMoverElemento(this.closest('.ci-acao-item'), -1)\"""",
    """<button type="button" onclick="window.ciMoverElemento(this.closest('.ci-acao-item'), -1)\""""
)
content = content.replace(
    """<button onclick="window.ciMoverElemento(this.closest('.ci-acao-item'), 1)\"""",
    """<button type="button" onclick="window.ciMoverElemento(this.closest('.ci-acao-item'), 1)\""""
)
content = content.replace(
    """<button onclick="this.closest('.ci-acao-item').remove(); window.ciAtualizarNumeracao();\"""",
    """<button type="button" onclick="this.closest('.ci-acao-item').remove(); window.ciAtualizarNumeracao();\""""
)

# 3. Add safety check in ciAdicionarAcaoNoGrupo
OLD_START = """window.ciAdicionarAcaoNoGrupo = function(grupoEl, a = {}) {"""
NEW_START = """window.ciAdicionarAcaoNoGrupo = function(grupoEl, a) {
    if (!a || a instanceof Event) a = {};
    if (!grupoEl) { console.error('grupoEl é nulo'); alert('Erro interno: Bloco do grupo não encontrado.'); return; }
    try {"""

OLD_END = """    lista.appendChild(div);
    window.ciAtualizarNumeracao();
};"""
NEW_END = """    lista.appendChild(div);
    window.ciAtualizarNumeracao();
    } catch (e) {
        console.error('Erro ao adicionar acao:', e);
        alert('Erro ao adicionar ação: ' + e.message);
    }
};"""

content = content.replace(OLD_START, NEW_START)
content = content.replace(OLD_END, NEW_END)

# 4. Make sure 'Adicionar Grupo' button has type=button
content = content.replace(
    """<button onclick="window.ciAdicionarGrupo()\"""",
    """<button type="button" onclick="window.ciAdicionarGrupo(null)\""""
)
content = content.replace(
    """window.ciAdicionarGrupo = function(nome = '', updateNum = true) {""",
    """window.ciAdicionarGrupo = function(nome, updateNum = true) {
    if (!nome || typeof nome !== 'string') nome = '';"""
)

with open(f, 'w', encoding='utf-8') as fh:
    fh.write(content)

print("Patch aplicado com sucesso!")
