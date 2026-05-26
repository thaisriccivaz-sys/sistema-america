const fs = require('fs');
let c = fs.readFileSync('frontend/resumo_rota.js', 'utf8');

const target = `    if (promises.length) {
        try {
            await Promise.all(promises);
            console.log('[RR] Auditoria salva:', promises.length, 'alterações');
        } catch (e) {
            console.error('Erro ao registrar auditoria de Resumo Rota', e);
            if (typeof showToast === 'function') showToast('Erro na auditoria: ' + e.message, 'error');
        }
    }`;

const replacement = `    if (promises.length) {
        try {
            const resList = await Promise.all(promises);
            const badRes = resList.find(r => !r.ok);
            if (badRes) {
                if (typeof showToast === 'function') showToast('DEBUG: Backend Error HTTP ' + badRes.status, 'error');
            } else {
                if (typeof showToast === 'function') showToast('DEBUG: Auditoria registrada com sucesso!', 'success');
            }
            console.log('[RR] Auditoria salva:', promises.length, 'alterações');
        } catch (e) {
            console.error('Erro ao registrar auditoria de Resumo Rota', e);
            if (typeof showToast === 'function') showToast('DEBUG: Erro de rede na auditoria: ' + e.message, 'error');
        }
    } else {
        if (typeof showToast === 'function') showToast('DEBUG: Nenhuma alteração detectada (snapshot idêntico)', 'info');
    }`;

c = c.replace(target, replacement);
fs.writeFileSync('frontend/resumo_rota.js', c);
