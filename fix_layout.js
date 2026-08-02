const fs = require('fs');
let code = fs.readFileSync('frontend/sac.js', 'utf8');

// 1. Popup 100%
const modalOld = 'style="width:100vw;max-width:1100px;margin:20px auto;border-radius:12px;background:#fff;display:flex;flex-direction:column;position:relative;box-shadow:0 10px 25px rgba(0,0,0,0.1);height:calc(100vh - 40px);max-height:900px;overflow:hidden;"';
const modalNew = 'style="width:100vw;max-width:100vw;margin:0;border-radius:0;background:#fff;display:flex;flex-direction:column;position:relative;height:100vh;max-height:100vh;overflow:hidden;"';
code = code.replace(modalOld, modalNew);

// 2. Coluna Direita (Comentários) mais larga (1fr 2fr = 1/3 e 2/3)
const gridOld = 'grid-template-columns:1fr 500px;gap:40px;"';
const gridNew = 'grid-template-columns:1fr 2fr;gap:40px;"';
code = code.replace(gridOld, gridNew);

// 3. Ocultar Próximos Passos
const proxPassosOld = '<div style="font-size:0.75rem;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:8px;">Próximos Passos</div>\n                <div style="background:#f8fafc;border-radius:8px;padding:12px;font-size:0.85rem;color:#475569;border:1px solid #e2e8f0;white-space:pre-wrap;">${t.nextSteps||\'Nenhum próximo passo registrado.\'}</div>';
const proxPassosNew = '<div style="display:none;font-size:0.75rem;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:8px;">Próximos Passos</div>\n                <div style="display:none;background:#f8fafc;border-radius:8px;padding:12px;font-size:0.85rem;color:#475569;border:1px solid #e2e8f0;white-space:pre-wrap;">${t.nextSteps||\'Nenhum próximo passo registrado.\'}</div>';
// To be safe with newlines:
const ppIndex = code.indexOf('Próximos Passos</div>');
if (ppIndex > 0) {
    const ppStart = code.lastIndexOf('<div style="margin-top:24px;">', ppIndex);
    if (ppStart > 0) {
        code = code.substring(0, ppStart) + '<div style="display:none;margin-top:24px;">' + code.substring(ppStart + 30);
    }
}

// 4. Descrição Editável
const descOld = `<div style="font-size:0.75rem;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:8px;">Descrição</div>
                <div style="background:#f8fafc;border-radius:8px;padding:12px;font-size:0.85rem;color:#475569;border:1px solid #e2e8f0;white-space:pre-wrap;">\${t.description||'Nenhuma descrição informada.'}</div>`;
const descNew = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                    <div style="font-size:0.75rem;font-weight:700;color:#94a3b8;text-transform:uppercase;">Descrição</div>
                    <button class="sac-btn sac-btn-secondary" style="padding:4px 10px;font-size:0.75rem;border-radius:6px;background:#e2e8f0;border:none;cursor:pointer;font-weight:600;color:#475569;" onclick="SAC.saveDescription('\${t.id}')">Salvar Edição</button>
                </div>
                <textarea id="modal-desc-edit-\${t.id}" style="width:100%;min-height:120px;background:#f8fafc;border-radius:8px;padding:12px;font-size:0.85rem;color:#475569;border:1px solid #e2e8f0;white-space:pre-wrap;font-family:inherit;resize:vertical;" oninput="this.style.borderColor='#3b82f6'">\${t.description||''}</textarea>`;
code = code.replace(descOld, descNew);

// 5. Mover Dados da OS para a coluna esquerda
const pDireita = code.indexOf('<!-- COLUNA DIREITA -->');
const pComentarios = code.indexOf('<!-- COMENTÁRIOS / HISTÓRICO -->');
const pFimEsquerda = code.lastIndexOf('</div>', pDireita); // The closing div of COLUNA ESQUERDA

if (pDireita > 0 && pComentarios > pDireita) {
    const dadosOsBlock = code.substring(pDireita + '<!-- COLUNA DIREITA -->\n        <div style="display:flex;flex-direction:column;">'.length, pComentarios).trim();
    
    // We will place dadosOsBlock right after Descrição block (or at the bottom of left column)
    // Actually, just append it before the `</div>` that closes the left column
    const insertPoint = pFimEsquerda;
    
    const wrapper = `
            <!-- DADOS DA OS (MOVIDO) -->
            <div style="margin-top: 32px; border-top: 1px dashed #cbd5e1; padding-top: 24px;">
                ${dadosOsBlock}
            </div>
    `;
    
    // Remove it from the right column first
    const rightColStart = code.lastIndexOf('<div style="display:flex;flex-direction:column;">', pDireita + 50);
    if (rightColStart > 0) {
        // We only want to remove `dadosOsBlock`
        code = code.substring(0, pDireita) + 
               '<!-- COLUNA DIREITA -->\n        <div style="display:flex;flex-direction:column;height:100%;">\n            <!-- COMENTÁRIOS / HISTÓRICO -->' + 
               code.substring(pComentarios + '<!-- COMENTÁRIOS / HISTÓRICO -->'.length);
    }

    // Now insert it into the left column
    const pFimEsqNovo = code.indexOf('<!-- COLUNA DIREITA -->');
    const insertPointNovo = code.lastIndexOf('</div>', pFimEsqNovo);
    
    code = code.substring(0, insertPointNovo) + wrapper + code.substring(insertPointNovo);
}

// 6. Deixar comentários mais alto
const comOld = 'height:400px;margin-bottom:24px;"';
const comNew = 'flex:1;min-height:500px;margin-bottom:24px;"';
code = code.replace(comOld, comNew);

// 7. Função saveDescription
const funcNew = `    saveDescription(ticketId) {
        const t = _tickets.find(x => x.id === ticketId);
        if (!t) return;
        const txt = document.getElementById('modal-desc-edit-' + ticketId);
        if (!txt) return;
        const newDesc = txt.value.trim();
        const oldDesc = t.description || '';
        
        if (newDesc === oldDesc.trim()) {
            showToast('Nenhuma alteração na descrição.', 'info');
            return;
        }

        const user = currentUsername();
        if (!t.comments) t.comments = [];
        
        // Log the old text and who changed it
        t.comments.push({ 
            user: 'Sistema', 
            text: '📝 Descrição editada por ' + user + '. Texto anterior:\\n"' + (oldDesc || '(vazio)') + '"', 
            time: new Date().toISOString() 
        });

        t.description = newDesc;
        updateTicket(t);
        showToast('Descrição salva com sucesso!', 'success');
    },`;
    
const insertFunc = code.indexOf('    exportCSV() {');
if (insertFunc > 0) {
    code = code.substring(0, insertFunc) + funcNew + '\n' + code.substring(insertFunc);
}

fs.writeFileSync('frontend/sac.js', code, 'utf8');
console.log('UI updates applied successfully.');
