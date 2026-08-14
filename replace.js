const fs = require('fs');
let code = fs.readFileSync('frontend/sac.js', 'utf8');

const regex = /async duplicateTicket\(id\) \{[\s\S]*?\} catch \(e\) \{[\s\S]*?\}\n    \},/;

const replacement = \sync duplicateTicket(id) {
      const t = _tickets.find(x => x.id === id);
      if (!t) return;
      if (!confirm('Deseja duplicar este chamado? Será criado um novo card idêntico na coluna Abertura, com um novo número de protocolo e histórico zerado.')) return;
      
      const user = window.currentUser ? window.currentUser.nome || currentUsername() : currentUsername();
      const now = new Date().toISOString();
      const proto = nextProtocol();
      
      const newTicket = {
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
          const res = await fetch('/api/sac/tickets', {
              method: 'POST',
              headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': \\\Bearer \\\\\\
              },
              body: JSON.stringify(newTicket)
          });
          if (!res.ok) throw new Error('Erro ao salvar duplicata no servidor');
          
          await loadTickets();
          renderAll();
          showToast('Chamado duplicado com sucesso!', 'success');
          
          setTimeout(() => {
              SAC.openDetail(newTicket.id);
          }, 300);
      } catch (e) {
          console.error(e);
          showToast('Erro ao duplicar chamado', 'error');
      }
    },\;

if (regex.test(code)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('frontend/sac.js', code, 'utf8');
    console.log('Replaced successfully');
} else {
    console.log('Regex did not match');
}
