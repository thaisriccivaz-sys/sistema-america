const fs = require('fs');

// 1. PATCH BACKEND
let serverCode = fs.readFileSync('backend/server.js', 'utf8');

const newRoute = `// ── POST /api/mtr/:id/cancelar ──────────────────────────────────────────────────
app.post('/api/mtr/:id/cancelar', authenticateToken, async (req, res) => {
  const { justificativa } = req.body;
  if (!justificativa) return res.status(400).json({ mensagem: 'Justificativa obrigatória' });
  db.get('SELECT * FROM mtr_local WHERE id = ?', [req.params.id], async (err, row) => {
    if (err || !row) return res.status(404).json({ mensagem: 'MTR não encontrada' });
    try {
      const payload = [{
        numeroManifesto: row.numero_mtr,
        justificativaCancelamento: justificativa
      }];
      const data = await sigorReq('/cancelarManifestoLote', 'POST', payload);
      // Analisar retorno (pode variar, assumimos que validaçao é checada ou retorna erro)
      if (data.erro || (data.objetoResposta && !data.objetoResposta[0]?.restResponseValido)) {
          return res.status(400).json({ mensagem: data.mensagem || data.objetoResposta?.[0]?.restResponseMensagem || 'Erro ao cancelar' });
      }
      db.run('UPDATE mtr_local SET status = ? WHERE id = ?', ['Cancelado', req.params.id]);
      res.json({ mensagem: 'MTR cancelada com sucesso' });
    } catch (e) {
      res.status(500).json({ mensagem: e.message });
    }
  });
});

// ── GET /api/mtr/:id/pdf ─────────────────────────────────────────────────────`;

if (!serverCode.includes('/api/mtr/:id/cancelar')) {
    serverCode = serverCode.replace('// ── GET /api/mtr/:id/pdf', newRoute);
    fs.writeFileSync('backend/server.js', serverCode);
    console.log('BACKEND CANCEL ROUTE ADDED');
} else {
    console.log('BACKEND CANCEL ROUTE ALREADY EXISTS');
}

// 2. PATCH FRONTEND
let mtrCode = fs.readFileSync('frontend/mtr.js', 'utf8');

// Replace the renderTabelaMTR to include the new buttons
const oldRender = /function renderTabelaMTR\(lista\) \{[\s\S]*?\}\)\.join\(''\);\s*\n\}/;

const newRender = `function renderTabelaMTR(lista) {
  const tbody = document.getElementById('mtr-tbody');
  if (!lista || lista.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#64748b;padding:2rem;">Nenhuma MTR encontrada.</td></tr>';
    return;
  }
  tbody.innerHTML = lista.map(m => {
    const statusColor = {
      'Ativo': '#10b981', 'Recebido': '#3b82f6', 'Cancelado': '#ef4444', 'Pendente': '#f59e0b'
    }[m.status] || '#64748b';
    
    let isAmerica = false;
    if (m.gerador_nome && m.gerador_nome.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').includes('america rental')) {
        isAmerica = true;
    }
    
    const rowStyle = isAmerica ? 'background-color: #dcfce7;' : '';

    let actionsHtml = '';
    if (isAmerica) {
        if (m.numero_mtr) {
            actionsHtml += \`<button onclick="window.downloadMTR(\${m.id})" title="Imprimir MTR" class="btn btn-secondary" style="padding:4px 8px;font-size:1.1rem;margin-right:4px;"><i class="ph ph-printer"></i></button>\`;
        }
        if (m.status === 'Ativo' || m.status === 'Salvo' || m.status === 'Pendente') {
            actionsHtml += \`<button onclick="window.cancelarMTR(\${m.id})" class="btn btn-danger" style="padding:4px 8px;font-size:0.8rem;background:#ef4444;color:white;border:none;border-radius:6px;cursor:pointer;"><i class="ph ph-x"></i> Cancelar</button>\`;
        } else if (m.status === 'Recebido') {
            actionsHtml += \`<button onclick="window.downloadRecebimento(\${m.id})" title="Imprimir Recebimento" class="btn btn-secondary" style="padding:4px 8px;font-size:1.1rem;margin-right:4px;background:#3b82f6;color:white;border:none;border-radius:6px;cursor:pointer;"><i class="ph ph-shield-check"></i></button>\`;
            actionsHtml += \`<button onclick="window.downloadCDF(\${m.id})" title="Baixar CDF" class="btn btn-secondary" style="padding:4px 8px;font-size:1.1rem;margin-right:4px;background:#8b5cf6;color:white;border:none;border-radius:6px;cursor:pointer;"><i class="ph ph-file-text"></i></button>\`;
        }
    } else {
        if (m.numero_mtr) {
            actionsHtml += \`<button onclick="window.downloadMTR(\${m.id})" class="btn btn-secondary" style="padding:3px 10px;font-size:0.78rem;margin-right:4px;"><i class="ph ph-download-simple"></i> PDF</button>\`;
        }
        if (m.status === 'Ativo' || m.status === 'Salvo' || m.status === 'Pendente') {
            actionsHtml += \`<button onclick="window.abrirReceberMTR(\${m.id})" class="btn btn-primary" style="padding:3px 10px;font-size:0.78rem;background:#3b82f6;border:none;border-radius:6px;color:white;cursor:pointer;"><i class="ph ph-check-circle"></i> Receber</button>\`;
        }
    }

    return \`<tr style="\${rowStyle}">
      <td><strong>\${m.numero_mtr || '-'}</strong></td>
      <td>\${m.data_geracao ? new Date(m.data_geracao).toLocaleDateString('pt-BR') : '-'}</td>
      <td><span style="background:\${statusColor}22;color:\${statusColor};padding:2px 8px;border-radius:999px;font-size:0.78rem;font-weight:600;">\${m.status || 'Pendente'}</span></td>
      <td>\${m.residuo_nome || '-'}</td>
      <td>\${m.gerador_nome || '-'}</td>
      <td style="text-align:right;">\${actionsHtml}</td>
    </tr>\`;
  }).join('');
}`;

if (oldRender.test(mtrCode)) {
    mtrCode = mtrCode.replace(oldRender, newRender);
} else {
    console.log('FRONTEND RENDER NOT FOUND WITH REGEX');
}

// Add the new functions to frontend
const newFuncs = `
window.cancelarMTR = async function(id) {
    const mtr = _mtrListaCache.find(m => m.id === id);
    if (!mtr) return;
    
    const { value: justificativa } = await Swal.fire({
      title: 'Cancelar MTR',
      html: \`Informe a justificativa para o cancelamento do MTR número \${mtr.numero_mtr}?\`,
      input: 'textarea',
      inputPlaceholder: 'Justificativa...',
      showCancelButton: true,
      confirmButtonText: 'Salvar',
      confirmButtonColor: '#ef4444',
      cancelButtonText: 'Cancelar',
      inputValidator: (value) => {
        if (!value) {
          return 'Você precisa informar a justificativa!';
        }
      }
    });

    if (justificativa) {
        try {
            const res = await fetch(\`/api/mtr/\${id}/cancelar\`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${window.currentToken}\` },
                body: JSON.stringify({ justificativa })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.mensagem || 'Erro ao cancelar');
            Swal.fire('Cancelado!', 'O MTR foi cancelado com sucesso.', 'success');
            carregarListaMTR();
        } catch(e) {
            Swal.fire('Erro', e.message, 'error');
        }
    }
};

window.downloadRecebimento = function(id) {
    Swal.fire('Em breve', 'A impressão do certificado de recebimento está em desenvolvimento.', 'info');
};

window.downloadCDF = function(id) {
    Swal.fire('Em breve', 'O download do CDF está em desenvolvimento.', 'info');
};
`;

if (!mtrCode.includes('window.cancelarMTR =')) {
    mtrCode += newFuncs;
    console.log('FRONTEND FUNCS ADDED');
}

fs.writeFileSync('frontend/mtr.js', mtrCode);
console.log('PATCH MTR CANCEL OK');
