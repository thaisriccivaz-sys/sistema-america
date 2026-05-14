// ── MÓDULO MTR SIGOR ──────────────────────────────────────────────────────────
// API Homologação: https://mtrr-hom.cetesb.sp.gov.br/apiws/rest
// API Produção:    https://mtrr.cetesb.sp.gov.br/apiws/rest

const SIGOR_CONFIG = {
  cpfCnpj: '38058722839',
  senha: 'gb5ti5',
  unidade: '19201',
  apiBase: '/api/mtr'
};

let _mtrToken = null;
let _mtrResiduos = [];
let _mtrAcondicionamentos = [];
let _mtrEstadosFisicos = [];
let _mtrTratamentos = [];
let _mtrUnidades = [];
let _mtrListaCache = [];

// ── Inicialização ─────────────────────────────────────────────────────────────
window.initMTR = async function () {
  await carregarListaMTR();
  await carregarTabelas();
};

// ── Carregar lista de MTRs do banco local ─────────────────────────────────────
async function carregarListaMTR() {
  try {
    const res = await fetch('/api/mtr/lista', { headers: { 'Authorization': `Bearer ${window.currentToken}` } });
    const data = await res.json();
    _mtrListaCache = data || [];
    renderTabelaMTR(_mtrListaCache);
  } catch (e) {
    console.error('[MTR] Erro ao carregar lista:', e);
  }
}

function renderTabelaMTR(lista) {
  const tbody = document.getElementById('mtr-tbody');
  if (!tbody) return;
  if (!lista.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#64748b;padding:2rem;">Nenhuma MTR encontrada.</td></tr>`;
    return;
  }
  tbody.innerHTML = lista.map(m => {
    const statusColor = {
      'Ativo': '#10b981', 'Recebido': '#3b82f6', 'Cancelado': '#ef4444', 'Pendente': '#f59e0b'
    }[m.status] || '#64748b';
    return `<tr>
      <td><strong>${m.numero_mtr || '-'}</strong></td>
      <td>${m.data_geracao ? new Date(m.data_geracao).toLocaleDateString('pt-BR') : '-'}</td>
      <td><span style="background:${statusColor}22;color:${statusColor};padding:2px 8px;border-radius:999px;font-size:0.78rem;font-weight:600;">${m.status || 'Pendente'}</span></td>
      <td>${m.residuo_nome || '-'}</td>
      <td>${m.gerador_nome || '-'}</td>
      <td style="text-align:right;">
        ${m.numero_mtr ? `<button onclick="window.downloadMTR(${m.id})" class="btn btn-secondary" style="padding:3px 10px;font-size:0.78rem;margin-right:4px;"><i class="ph ph-download-simple"></i> PDF</button>` : ''}
        ${m.status === 'Ativo' ? `<button onclick="window.abrirReceberMTR(${m.id})" class="btn btn-primary" style="padding:3px 10px;font-size:0.78rem;background:#3b82f6;"><i class="ph ph-check-circle"></i> Receber</button>` : ''}
      </td>
    </tr>`;
  }).join('');
}

// ── Carregar tabelas de referência SIGOR ──────────────────────────────────────
async function carregarTabelas() {
  try {
    const res = await fetch('/api/mtr/tabelas', { headers: { 'Authorization': `Bearer ${window.currentToken}` } });
    const data = await res.json();
    _mtrResiduos = data.residuos || [];
    _mtrAcondicionamentos = data.acondicionamentos || [];
    _mtrEstadosFisicos = data.estadosFisicos || [];
    _mtrTratamentos = data.tratamentos || [];
    _mtrUnidades = data.unidades || [];
  } catch (e) {
    console.warn('[MTR] Tabelas ainda não carregadas:', e);
  }
}

// ── Abrir modal Gerar MTR ─────────────────────────────────────────────────────
window.abrirModalGerarMTR = async function (complementarDeId = null) {
  const modal = document.getElementById('modal-gerar-mtr');
  if (!modal) return;
  
  // Mostrar estado de carregamento
  document.getElementById('mtr-residuo').innerHTML = '<option value="">Carregando opções da CETESB...</option>';
  document.getElementById('mtr-acondicionamento').innerHTML = '<option value="">Carregando...</option>';
  document.getElementById('mtr-estado-fisico').innerHTML = '<option value="">Carregando...</option>';
  document.getElementById('mtr-tratamento').innerHTML = '<option value="">Carregando...</option>';
  
  document.getElementById('mtr-form').reset();
  document.getElementById('mtr-complementar-de').value = complementarDeId || '';
  document.getElementById('mtr-modal-titulo').textContent = complementarDeId ? 'Gerar MTR Complementar' : 'Gerar Nova MTR';
  modal.style.display = 'flex';

  // Se as listas estiverem vazias, tenta carregar novamente
  if (_mtrResiduos.length === 0 || _mtrAcondicionamentos.length === 0) {
    await carregarTabelas();
  }
  
  preencherSelectsModal();

  // Se for uma nova MTR (não complementar), setar valores padrões recorrentes
  if (!complementarDeId) {
    document.getElementById('mtr-gerador-nome').value = 'América Rental Equipamentos';
    document.getElementById('mtr-gerador-cnpj').value = '03434448000101';
    document.getElementById('mtr-quantidade').value = '10';
    document.getElementById('mtr-unidade').value = 'TON';
    document.getElementById('mtr-residuo').value = '200304'; // Lodos de fossas sépticas
    document.getElementById('mtr-estado-fisico').value = '2'; // LÍQUIDO
    document.getElementById('mtr-acondicionamento').value = '11'; // TANQUE
    document.getElementById('mtr-tratamento').value = '23'; // Tratamento de Efluentes
  }
};

window.fecharModalMTR = function () {
  const modal = document.getElementById('modal-gerar-mtr');
  if (modal) modal.style.display = 'none';
};

function preencherSelectsModal() {
  const selRes = document.getElementById('mtr-residuo');
  if (selRes) {
    selRes.innerHTML = '<option value="">Selecione o resíduo...</option>' +
      _mtrResiduos.map(r => `<option value="${r.codigo}">${r.descricao}</option>`).join('');
  }
  const selAco = document.getElementById('mtr-acondicionamento');
  if (selAco) {
    selAco.innerHTML = '<option value="">Selecione...</option>' +
      _mtrAcondicionamentos.map(a => `<option value="${a.codigo}">${a.descricao}</option>`).join('');
  }
  const selEf = document.getElementById('mtr-estado-fisico');
  if (selEf) {
    selEf.innerHTML = '<option value="">Selecione...</option>' +
      _mtrEstadosFisicos.map(e => `<option value="${e.codigo}">${e.descricao}</option>`).join('');
  }
  const selTrat = document.getElementById('mtr-tratamento');
  if (selTrat) {
    selTrat.innerHTML = '<option value="">Selecione...</option>' +
      _mtrTratamentos.map(t => `<option value="${t.codigo}">${t.descricao}</option>`).join('');
  }
}

// ── Submeter geração de MTR ───────────────────────────────────────────────────
window.submitGerarMTR = async function (e) {
  e.preventDefault();
  const btn = document.getElementById('mtr-btn-gerar');
  btn.disabled = true;
  btn.innerHTML = '<i class="ph ph-spinner"></i> Gerando...';
  try {
    const payload = {
      geradorNome: document.getElementById('mtr-gerador-nome').value,
      geradorCnpj: document.getElementById('mtr-gerador-cnpj').value,
      residuoCodigo: document.getElementById('mtr-residuo').value,
      quantidade: document.getElementById('mtr-quantidade').value,
      unidade: document.getElementById('mtr-unidade').value,
      acondicionamentoCodigo: document.getElementById('mtr-acondicionamento').value,
      estadoFisicoCodigo: document.getElementById('mtr-estado-fisico').value,
      tratamentoCodigo: document.getElementById('mtr-tratamento').value,
      observacao: document.getElementById('mtr-observacao').value,
      complementarDeId: document.getElementById('mtr-complementar-de').value || null
    };
    const res = await fetch('/api/mtr/gerar', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${window.currentToken}` }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok || data.erro) throw new Error(data.mensagem || 'Erro ao gerar MTR');
    window.fecharModalMTR();
    Swal.fire({ icon: 'success', title: 'MTR Gerada!', text: `Número: ${data.numeroMTR}`, confirmButtonColor: '#10b981' });
    await carregarListaMTR();
  } catch (err) {
    Swal.fire({ icon: 'error', title: 'Erro ao gerar MTR', text: err.message });
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="ph ph-leaf"></i> Gerar MTR';
  }
};

// ── Receber MTR ───────────────────────────────────────────────────────────────
window.abrirReceberMTR = function (id) {
  const mtr = _mtrListaCache.find(m => m.id === id);
  if (!mtr) return;
  Swal.fire({
    title: `Receber MTR ${mtr.numero_mtr}`,
    html: `
      <div style="text-align:left;">
        <label style="font-size:0.85rem;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Peso Real Recebido (ton)</label>
        <input id="swal-peso-real" type="number" step="0.001" class="swal2-input" placeholder="Ex: 1.500">
        <label style="font-size:0.85rem;font-weight:600;color:#475569;display:block;margin:12px 0 4px;">Data de Recebimento</label>
        <input id="swal-data-receb" type="date" class="swal2-input" value="${new Date().toISOString().split('T')[0]}">
        <label style="font-size:0.85rem;font-weight:600;color:#475569;display:block;margin:12px 0 4px;">Observação</label>
        <textarea id="swal-obs-receb" class="swal2-textarea" placeholder="Observações..."></textarea>
      </div>`,
    confirmButtonText: '<i class="ph ph-check-circle"></i> Confirmar Recebimento',
    confirmButtonColor: '#10b981',
    showCancelButton: true,
    cancelButtonText: 'Cancelar',
    preConfirm: async () => {
      const peso = document.getElementById('swal-peso-real').value;
      const dataReceb = document.getElementById('swal-data-receb').value;
      if (!peso || !dataReceb) { Swal.showValidationMessage('Preencha peso e data'); return false; }
      const res = await fetch(`/api/mtr/${id}/receber`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${window.currentToken}` },
        body: JSON.stringify({ pesoReal: peso, dataRecebimento: dataReceb, observacao: document.getElementById('swal-obs-receb').value })
      });
      const data = await res.json();
      if (!res.ok) { Swal.showValidationMessage(data.mensagem || 'Erro'); return false; }
      return data;
    }
  }).then(result => {
    if (result.isConfirmed) {
      Swal.fire({ icon: 'success', title: 'MTR Recebida!', confirmButtonColor: '#10b981' });
      carregarListaMTR();
    }
  });
};

// ── Download PDF MTR ──────────────────────────────────────────────────────────
window.downloadMTR = async function (id) {
  try {
    const res = await fetch(`/api/mtr/${id}/pdf`, { headers: { 'Authorization': `Bearer ${window.currentToken}` } });
    const data = await res.json();
    if (!data.pdf) throw new Error('PDF não disponível');
    const blob = b64toBlob(data.pdf, 'application/pdf');
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  } catch (e) {
    Swal.fire({ icon: 'error', title: 'Erro', text: e.message });
  }
};

function b64toBlob(b64, type) {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type });
}

// ── Filtro da tabela ──────────────────────────────────────────────────────────
window.filtrarMTR = function (q) {
  const lower = q.toLowerCase();
  const filtrado = _mtrListaCache.filter(m =>
    (m.numero_mtr || '').toLowerCase().includes(lower) ||
    (m.gerador_nome || '').toLowerCase().includes(lower) ||
    (m.residuo_nome || '').toLowerCase().includes(lower)
  );
  renderTabelaMTR(filtrado);
};

// Auto-init quando a view for ativada
document.addEventListener('DOMContentLoaded', () => {
  const obs = new MutationObserver(() => {
    const view = document.getElementById('view-logistica-mtrs');
    if (view && view.classList.contains('active') && !view.dataset.mtrLoaded) {
      view.dataset.mtrLoaded = '1';
      window.initMTR();
    }
  });
  obs.observe(document.body, { attributes: true, subtree: true, attributeFilter: ['class'] });
});
