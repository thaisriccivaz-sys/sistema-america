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
    // Limpar registros inválidos do servidor (gerados antes da correção de erros)
    fetch('/api/mtr/limpar-invalidos', { method: 'DELETE', headers: { 'Authorization': `Bearer ${window.currentToken}` } }).catch(() => {});
    
    const res = await fetch('/api/mtr/lista', { headers: { 'Authorization': `Bearer ${window.currentToken}` } });
    const data = await res.json();
    // Filtrar localmente também para garantir
    _mtrListaCache = (data || []).filter(m => m.numero_mtr && m.numero_mtr !== 'null');
    renderTabelaMTR(_mtrListaCache);
  } catch (e) {
    console.error('[MTR] Erro ao carregar lista:', e);
  }
}


function renderTabelaMTR(lista) {
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
    if (m.gerador_nome && m.gerador_nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes('america rental')) {
        isAmerica = true;
    }
    
    const rowStyle = isAmerica ? 'background-color: #dcfce7;' : ''; // light green

    return `<tr style="${rowStyle}">
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

  // 1. Reset do form (limpa tudo antes de repopular)
  document.getElementById('mtr-form').reset();
  document.getElementById('mtr-complementar-de').value = complementarDeId || '';
  document.getElementById('mtr-modal-titulo').innerHTML = complementarDeId
    ? '<i class="ph ph-leaf" style="color:#10b981;"></i> Gerar MTR Complementar'
    : '<i class="ph ph-leaf" style="color:#10b981;"></i> Gerar Nova MTR';

  // 2. Mostrar estado de carregamento nos selects dinâmicos
  ['mtr-residuo','mtr-acondicionamento','mtr-estado-fisico','mtr-tratamento'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = '<option value="">Carregando...</option>';
  });

  modal.style.display = 'flex';

  // 3. Carregar tabelas SEMPRE (garante dados frescos)
  await carregarTabelas();

  // 4. Preencher selects com os dados carregados
  preencherSelectsModal();

  // 5. Setar valores padrão APÓS preencher (funciona pois opções já existem no DOM)
  if (!complementarDeId) {
    document.getElementById('mtr-gerador-nome').value = 'América Rental Equipamentos';
    document.getElementById('mtr-gerador-cnpj').value = '03434448000101';
    document.getElementById('mtr-quantidade').value = '10';
    document.getElementById('mtr-unidade').value = 'TON';
    document.getElementById('mtr-residuo').value = '200304';      // Lodos de fossas sépticas
    document.getElementById('mtr-estado-fisico').value = '2';     // LÍQUIDO
    document.getElementById('mtr-acondicionamento').value = '11'; // TANQUE
    document.getElementById('mtr-tratamento').value = '23';       // Tratamento de Efluentes
    // Destinador padrão
    document.getElementById('mtr-destinador-nome').value = 'BRK AMBIENTAL - MAUÁ S.A.';
    document.getElementById('mtr-destinador-cnpj').value = '05.380.441/0002-60';
    document.getElementById('mtr-destinador-unidade').value = '19154';
    document.getElementById('mtr-data-expedicao').value = new Date().toISOString().split('T')[0];
    document.getElementById('mtr-motorista').value = 'MÁRCIO JORGE VILAR DA SILVA';
    document.getElementById('mtr-placa').value = 'DPE5A75';
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
      complementarDeId: document.getElementById('mtr-complementar-de').value || null,
      motorista: document.getElementById('mtr-motorista').value,
      placa: document.getElementById('mtr-placa').value,
      dataExpedicao: document.getElementById('mtr-data-expedicao').value,
      // Destinador (editável pelo usuário)
      destinadorNome: document.getElementById('mtr-destinador-nome').value,
      destinadorCnpj: document.getElementById('mtr-destinador-cnpj').value,
      destinadorUnidade: parseInt(document.getElementById('mtr-destinador-unidade').value) || 19154
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
    if (!res.ok) throw new Error(data.mensagem || 'Erro desconhecido');
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
window.filtrarMTR = function () {
  const num = (document.getElementById('filtro-mtr-numero')?.value || '').toLowerCase();
  const ger = (document.getElementById('filtro-mtr-gerador')?.value || '').toLowerCase();
  const dest = (document.getElementById('filtro-mtr-destinador')?.value || '').toLowerCase();
  const dtIni = document.getElementById('filtro-mtr-data-ini')?.value;
  const dtFim = document.getElementById('filtro-mtr-data-fim')?.value;

  const filtrado = _mtrListaCache.filter(m => {
    let match = true;
    if (num && !(m.numero_mtr || '').toLowerCase().includes(num)) match = false;
    if (ger && !(m.gerador_nome || '').toLowerCase().includes(ger)) match = false;
    
    // Destinador is stored inside payload_json in DB (m.payload_json). We parse it if we need to search it.
    if (dest) {
        let destNome = '';
        try {
            const p = JSON.parse(m.payload_json || '{}');
            const d = p.respostaApiwsManifestoDTO?.[0]?.destinador || p.objetoResposta?.[0]?.destinador || p.objetoResposta?.destinador;
            if (d && d.razaoSocial) destNome = d.razaoSocial;
        } catch(e) {}
        if (!destNome.toLowerCase().includes(dest)) match = false;
    }

    if (dtIni || dtFim) {
        const dtStr = (m.data_geracao || '').split('T')[0];
        if (dtStr) {
            if (dtIni && dtStr < dtIni) match = false;
            if (dtFim && dtStr > dtFim) match = false;
        } else {
            match = false;
        }
    }

    return match;
  });
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
