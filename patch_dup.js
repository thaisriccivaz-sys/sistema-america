const fs = require('fs');
let code = fs.readFileSync('frontend/sac.js', 'utf8');

// Find and replace the duplicateTicket function body precisely
const startMarker = '      const newTicket = {\r\n          id: \'sac-\'+Date.now(),\r\n          protocol: proto,\r\n          osNumber: t.osNumber || \'\',\r\n          openDate: now,\r\n          clientName: t.clientName || \'\',\r\n          cnpjCpf: t.cnpjCpf || \'\',\r\n          equipment: t.equipment || \'\',\r\n          address: t.address || \'\',\r\n          contactName: t.contactName || \'\',\r\n          contactPhone: t.contactPhone || \'\',\r\n          contactEmail: t.contactEmail || \'\',\r\n          typeKey: t.typeKey || \'manutencao\',\r\n          description: t.description || \'\',\r\n          stage: \'abertura\',\r\n          nextSteps: \'Triagem inicial pendente.\',\r\n          timeline: [{ stage:\'abertura\', time:now, notes:\'Chamado aberto via duplicação da OS \' + t.protocol + \'. Triagem inicial pendente.\', user }],\r\n          occurrences: t.occurrences || [],\r\n          attachments: t.attachments || [],\r\n          isUrgent: t.isUrgent || false,\r\n          comments: [],\r\n          costCenters: []\r\n      };\r\n      \r\n      const modal = document.getElementById(\'sac-detail-overlay\');\r\n      if (modal) modal.style.display = \'none\';\r\n      \r\n      try {\r\n          await updateTicket(newTicket);\r\n          await loadTickets();\r\n          renderAll();\r\n          showToast(\'Chamado duplicado com sucesso!\', \'success\');\r\n          SAC.openDetail(newTicket.id);\r\n      } catch (e) {\r\n          showToast(\'Erro ao duplicar chamado\', \'error\');\r\n      }';

const replacement = `      const newTicket = {
          id: 'sac-'+Date.now(),
          protocol: proto,
          osNumber: t.osNumber || '',
          openDate: now,
          clientName: t.clientName || '',
          cnpjCpf: t.cnpjCpf || '',
          equipment: t.equipment || '',
          address: t.address || '',
          contacts: t.contacts ? JSON.parse(JSON.stringify(t.contacts)) : [],
          contactName: t.contactName || '',
          contactPhone: t.contactPhone || '',
          contactEmail: t.contactEmail || '',
          typeKey: t.typeKey || 'manutencao',
          description: t.description || '',
          stage: 'abertura',
          nextSteps: 'Triagem inicial pendente.',
          timeline: [{ stage:'abertura', time:now, notes:'Chamado aberto via duplicação da OS ' + t.protocol + '. Triagem inicial pendente.', user }],
          occurrences: t.occurrences ? JSON.parse(JSON.stringify(t.occurrences)) : [],
          attachments: t.attachments ? JSON.parse(JSON.stringify(t.attachments)) : [],
          isUrgent: t.isUrgent || false,
          comments: [],
          costCenters: []
      };
      
      const modal = document.getElementById('sac-detail-overlay');
      if (modal) modal.style.display = 'none';
      
      try {
          const _dupToken = localStorage.getItem('erp_token') || localStorage.getItem('token');
          const _dupRes = await fetch('/api/sac/tickets', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + _dupToken },
              body: JSON.stringify(newTicket)
          });
          if (!_dupRes.ok) throw new Error('Erro ao salvar duplicata: ' + _dupRes.status);
          const _saved = await _dupRes.json().catch(() => newTicket);
          const _savedId = (_saved && _saved.id) ? _saved.id : newTicket.id;
          await loadTickets();
          renderAll();
          showToast('Chamado duplicado com sucesso!', 'success');
          setTimeout(() => { SAC.openDetail(_savedId); }, 400);
      } catch (e) {
          console.error('Erro duplicar:', e);
          showToast('Erro ao duplicar chamado: ' + e.message, 'error');
      }`;

if (code.includes(startMarker)) {
    code = code.replace(startMarker, replacement);
    console.log('✅ duplicateTicket replaced successfully');
} else {
    // Try with \n instead of \r\n
    const startMarkerLF = startMarker.replace(/\r\n/g, '\n');
    if (code.includes(startMarkerLF)) {
        code = code.replace(startMarkerLF, replacement);
        console.log('✅ duplicateTicket replaced (LF variant)');
    } else {
        console.log('❌ marker not found - using regex approach');
        // Use line-based replacement
        const lines = code.split('\n');
        let inFunc = false, startIdx = -1, endIdx = -1, depth = 0;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('async duplicateTicket(id)')) { inFunc = true; }
            if (inFunc && lines[i].includes('const newTicket = {')) { startIdx = i; depth = 1; }
            if (startIdx >= 0 && i > startIdx) {
                if (lines[i].includes('{')) depth++;
                if (lines[i].includes('}')) depth--;
                // look for the closing of the try/catch block
                if (lines[i].trim() === '},') { endIdx = i; break; }
            }
        }
        console.log('startIdx:', startIdx, 'endIdx:', endIdx);
    }
}

fs.writeFileSync('frontend/sac.js', code, 'utf8');
console.log('File size:', require('fs').statSync('frontend/sac.js').size);
console.log('POST check:', code.includes('/api/sac/tickets'));
console.log('clone contacts:', code.includes('JSON.stringify(t.contacts)'));
console.log('openDetail savedId:', code.includes('openDetail(_savedId)'));
