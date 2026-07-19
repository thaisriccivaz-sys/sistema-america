
# -*- coding: utf-8 -*-
import re
f = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\frontend\integracao.js'
with open(f, 'r', encoding='utf-8') as fh:
    content = fh.read()

# 1. Expand max-width
content = content.replace("max-width: 1000px;", "max-width: 100%;")

# 2. Expand max-height for departments
content = content.replace("max-height:70px;", "max-height:180px;")

# 3. Change span to input for Group number
OLD_GRP_NUM = """<span class="cig-num" style="background:#0f4c81; color:#fff; font-weight:700; font-size:1rem; padding:4px 10px; border-radius:6px;"></span>"""
NEW_GRP_NUM = """<input type="text" class="cig-num" onchange="window.ciReordenarGrupoPorInput(this)" style="background:#0f4c81; color:#fff; font-weight:700; font-size:1rem; padding:4px 10px; border-radius:6px; width:45px; text-align:center; border:none; outline:none;">"""
content = content.replace(OLD_GRP_NUM, NEW_GRP_NUM)

# 4. Change span to input for Action number
OLD_ACT_NUM = """<span class="cia-num" style="color:#0f4c81; font-weight:700; font-size:0.9rem; min-width:35px;"></span>"""
NEW_ACT_NUM = """<input type="text" class="cia-num" onchange="window.ciReordenarPorInput(this)" style="color:#0f4c81; font-weight:700; font-size:0.9rem; width:40px; border:1px solid transparent; background:transparent; text-align:center; outline:none; border-radius:4px; padding:2px;" onfocus="this.style.border='1px solid #cbd5e1';this.style.background='#fff'" onblur="this.style.border='1px solid transparent';this.style.background='transparent'">"""
content = content.replace(OLD_ACT_NUM, NEW_ACT_NUM)

# 5. Fix ciAtualizarNumeracao
OLD_ATUALIZAR = """window.ciAtualizarNumeracao = function() {
    const grupos = document.querySelectorAll('.ci-grupo-block');
    grupos.forEach((g, gIdx) => {
        const numGrp = gIdx + 1;
        const spanGrp = g.querySelector('.cig-num');
        if (spanGrp) spanGrp.textContent = numGrp;
        
        const acoes = g.querySelectorAll('.ci-acao-item');
        acoes.forEach((a, aIdx) => {
            const spanAcao = a.querySelector('.cia-num');
            if (spanAcao) spanAcao.textContent = `${numGrp}.${aIdx + 1}`;
        });
    });
};"""

NEW_ATUALIZAR = """window.ciAtualizarNumeracao = function() {
    const grupos = document.querySelectorAll('.ci-grupo-block');
    grupos.forEach((g, gIdx) => {
        const numGrp = gIdx + 1;
        const inputGrp = g.querySelector('.cig-num');
        if (inputGrp) inputGrp.value = numGrp;
        
        const acoes = g.querySelectorAll('.ci-acao-item');
        acoes.forEach((a, aIdx) => {
            const inputAcao = a.querySelector('.cia-num');
            if (inputAcao) inputAcao.value = `${numGrp}.${aIdx + 1}`;
        });
    });
};

window.ciReordenarPorInput = function(input) {
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
};

window.ciReordenarGrupoPorInput = function(input) {
    const targetIdx = parseInt(input.value.trim()) - 1;
    const item = input.closest('.ci-grupo-block');
    const parentList = item.parentNode;
    const items = Array.from(parentList.querySelectorAll('.ci-grupo-block'));
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
content = content.replace(OLD_ATUALIZAR, NEW_ATUALIZAR)


# 6. Ensure the bottom grid layout is wider
OLD_BOTTOM_GRID = """<div style="display:grid; grid-template-columns:1.5fr 1fr 1fr; gap:1rem; padding-left:45px;">"""
NEW_BOTTOM_GRID = """<div style="display:grid; grid-template-columns:1fr 200px 200px; gap:1.5rem; padding-left:45px; align-items:start;">"""
content = content.replace(OLD_BOTTOM_GRID, NEW_BOTTOM_GRID)

with open(f, 'w', encoding='utf-8') as fh:
    fh.write(content)

print("Patch visual aplicado com sucesso!")
