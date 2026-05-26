const fs = require('fs');

let serverCode = fs.readFileSync('backend/server.js', 'utf8');

const syncRoute = `
// ── POST /api/mtr/sincronizar ────────────────────────────────────────────────
app.post('/api/mtr/sincronizar', authenticateToken, async (req, res) => {
  db.all('SELECT * FROM mtr_local WHERE status NOT IN ("Cancelado", "Recebido")', [], async (err, rows) => {
    if (err) return res.status(500).json({ mensagem: err.message });
    if (!rows || rows.length === 0) return res.json({ mensagem: 'Nenhuma MTR pendente para sincronizar' });
    
    let atualizados = 0;
    for (const row of rows) {
      if (!row.numero_mtr) continue;
      try {
        const data = await sigorReq('/retornaManifesto/' + row.numero_mtr);
        if (data && data.objetoResposta && data.objetoResposta.situacaoManifesto) {
           let sit = data.objetoResposta.situacaoManifesto.simDescricao;
           if(sit === 'Salvo') sit = 'Ativo'; // Mapeamento
           if (sit !== row.status) {
              db.run('UPDATE mtr_local SET status = ? WHERE id = ?', [sit, row.id]);
              atualizados++;
           }
        }
      } catch (e) {}
    }
    res.json({ mensagem: \`Sincronização concluída. \${atualizados} MTR(s) atualizada(s).\` });
  });
});
`;

if (!serverCode.includes('/api/mtr/sincronizar')) {
    serverCode = serverCode.replace('// ── GET /api/mtr/tabelas', syncRoute + '\n// ── GET /api/mtr/tabelas');
}

const cronJob = `
// ── CRON JOB MTR (A CADA 1 HORA) ─────────────────────────────────────────────
setInterval(async () => {
    console.log('[CRON-MTR] Iniciando sincronização automática de MTRs...');
    db.all('SELECT * FROM mtr_local WHERE status NOT IN ("Cancelado", "Recebido")', [], async (err, rows) => {
        if (err || !rows) return;
        let atualizados = 0;
        for (const row of rows) {
            if (!row.numero_mtr) continue;
            try {
                const data = await sigorReq('/retornaManifesto/' + row.numero_mtr);
                if (data && data.objetoResposta && data.objetoResposta.situacaoManifesto) {
                    let sit = data.objetoResposta.situacaoManifesto.simDescricao;
                    if(sit === 'Salvo') sit = 'Ativo';
                    if (sit && sit !== row.status) {
                        db.run('UPDATE mtr_local SET status = ? WHERE id = ?', [sit, row.id]);
                        atualizados++;
                    }
                }
            } catch(e) {}
        }
        if (atualizados > 0) {
            console.log(\`[CRON-MTR] Sincronização automática concluiu com \${atualizados} atualizações.\`);
        }
    });
}, 60 * 60 * 1000);
`;

if (!serverCode.includes('[CRON-MTR]')) {
    serverCode += '\n' + cronJob;
}

fs.writeFileSync('backend/server.js', serverCode);
console.log('BACKEND SYNC OK');

let html = fs.readFileSync('frontend/index.html', 'utf8');
const syncBtn = `<button onclick="window.sincronizarMTR()" class="btn btn-primary" style="background-color:#3b82f6;border:none;border-radius:8px;padding:0.6rem 1.2rem;font-weight:600;margin-right:10px;"><i class="ph ph-arrows-clockwise"></i> Sincronizar</button>`;
if (!html.includes('sincronizarMTR()')) {
    html = html.replace('<button class="btn btn-primary" onclick="window.abrirModalGerarMTR()"', syncBtn + '\n                            <button class="btn btn-primary" onclick="window.abrirModalGerarMTR()"');
    fs.writeFileSync('frontend/index.html', html);
    console.log('INDEX BTN OK');
}

let mtrJs = fs.readFileSync('frontend/mtr.js', 'utf8');
const syncFunc = `
window.sincronizarMTR = async function() {
    Swal.fire({
      title: 'Sincronizando MTRs...',
      text: 'Buscando status atualizados na CETESB. Isso pode levar alguns segundos dependendo da quantidade de MTRs.',
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); }
    });
    try {
        const res = await fetch('/api/mtr/sincronizar', {
            method: 'POST',
            headers: { 'Authorization': \`Bearer \${window.currentToken}\` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.mensagem || 'Erro ao sincronizar');
        
        Swal.fire('Concluído!', data.mensagem, 'success');
        carregarListaMTR();
    } catch(e) {
        Swal.fire('Erro', e.message, 'error');
    }
};
`;
if (!mtrJs.includes('window.sincronizarMTR =')) {
    mtrJs += syncFunc;
    fs.writeFileSync('frontend/mtr.js', mtrJs);
    console.log('MTR JS FUNCS OK');
}
