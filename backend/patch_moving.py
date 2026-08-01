
# -*- coding: utf-8 -*-
f = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\frontend\integracao.js'
with open(f, 'r', encoding='utf-8') as fh:
    content = fh.read()

OLD_REORDENAR = """window.ciReordenarPorInput = function(input) {
    const newVal = input.value.trim();
    const parts = newVal.split('.');
    if (parts.length !== 2) { window.ciAtualizarNumeracao(); return; }
    
    const targetIdx = parseInt(parts[1]) - 1;
    const item = input.closest('.ci-acao-item');
    const parentList = item.parentNode;
    const items = Array.from(parentList.children);
    const currentIdx = items.indexOf(item);
    
    if (!isNaN(targetIdx) && targetIdx >= 0 && targetIdx < items.length) {
        if (targetIdx > currentIdx) {
            parentList.insertBefore(item, items[targetIdx].nextElementSibling);
        } else {
            parentList.insertBefore(item, items[targetIdx]);
        }
    } else if (!isNaN(targetIdx) && targetIdx >= items.length) {
        parentList.appendChild(item);
    }
    window.ciAtualizarNumeracao();
};"""

NEW_REORDENAR = """window.ciReordenarPorInput = function(input) {
    const newVal = input.value.trim();
    const parts = newVal.split('.');
    if (parts.length !== 2) { window.ciAtualizarNumeracao(); return; }
    
    const targetGroupNum = parseInt(parts[0]) - 1;
    const targetIdx = parseInt(parts[1]) - 1;
    
    const item = input.closest('.ci-acao-item');
    const grupos = Array.from(document.querySelectorAll('.ci-grupo-block'));
    
    if (targetGroupNum >= 0 && targetGroupNum < grupos.length) {
        const targetGroup = grupos[targetGroupNum];
        const targetList = targetGroup.querySelector('.cig-acoes-lista');
        const items = Array.from(targetList.children);
        
        if (targetList === item.parentNode) {
            const currentIdx = items.indexOf(item);
            if (!isNaN(targetIdx) && targetIdx >= 0 && targetIdx < items.length) {
                if (targetIdx > currentIdx) {
                    targetList.insertBefore(item, items[targetIdx].nextElementSibling);
                } else {
                    targetList.insertBefore(item, items[targetIdx]);
                }
            } else {
                targetList.appendChild(item);
            }
        } else {
            if (!isNaN(targetIdx) && targetIdx >= 0 && targetIdx < items.length) {
                targetList.insertBefore(item, items[targetIdx]);
            } else {
                targetList.appendChild(item);
            }
        }
    }
    
    window.ciAtualizarNumeracao();
};"""
content = content.replace(OLD_REORDENAR, NEW_REORDENAR)


OLD_SAVE = """document.querySelectorAll('.ci-grupo-block').forEach((grp) => {
        const grupoNome = grp.querySelector('.cig-nome').value.trim() || 'Geral';
        
        grp.querySelectorAll('.ci-acao-item').forEach((item) => {"""

NEW_SAVE = """document.querySelectorAll('.ci-grupo-block').forEach((grp) => {
        const grupoNome = grp.querySelector('.cig-nome').value.trim() || 'Geral';
        
        const acoesNode = grp.querySelectorAll('.ci-acao-item');
        if (acoesNode.length === 0) {
            alert(`O grupo "${grupoNome}" está vazio! Adicione pelo menos uma ação dentro dele ou exclua-o (lixeira vermelha) para poder salvar.`);
            hasError = true;
            return;
        }
        
        acoesNode.forEach((item) => {"""
content = content.replace(OLD_SAVE, NEW_SAVE)

with open(f, 'w', encoding='utf-8') as fh:
    fh.write(content)

print("Patch aplicado com sucesso!")
