// ─────────────────────────────────────────────────────────────────────────────
// recibos.js — Recibos de Benefícios em Massa (VR, VT, VC)
// v3.0 — campo nome_completo corrigido, sem "dias úteis globais",
//         VC proporcional via diasTrab+faltas, erro RHID detalhado
// ─────────────────────────────────────────────────────────────────────────────

// ─── Estado Global ────────────────────────────────────────────────────────────
let _recibosAllColabs   = [];
let _recibosFiltrados   = [];
let _recibosDeptTipoMap = {}; // { 'Logística': 'Operacional', 'RH': 'Administrativo' }
let _recibosSelecoes    = {}; // { id: { selecionado, diasTrabalhados, faltas, diasExtra, pontoStatus, isAutoSupervisao, historicoEncontrado } }

// ─── Calendário de Feriados ───────────────────────────────────────────────────
let _feriadosBrasil = {};
async function _getDiasUteis(ano, mes, segASex = false) {
    if (!_feriadosBrasil[ano]) {
        try {
            const res = await fetch(`https://brasilapi.com.br/api/feriados/v1/${ano}`);
            if (res.ok) {
                const data = await res.json();
                _feriadosBrasil[ano] = data.map(f => f.date); // 'YYYY-MM-DD'
            } else {
                _feriadosBrasil[ano] = [];
            }
        } catch(e) {
            _feriadosBrasil[ano] = [];
        }
    }
    const feriados = _feriadosBrasil[ano];
    let diasUteis = 0;
    const d = new Date(ano, mes - 1, 1);
    while (d.getMonth() === mes - 1) {
        const diaSemana = d.getDay();
        const ignora = segASex ? (diaSemana === 0 || diaSemana === 6) : (diaSemana === 0);
        if (!ignora) {
            const dataStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
            if (!feriados.includes(dataStr)) {
                diasUteis++;
            }
        }
        d.setDate(d.getDate() + 1);
    }
    return diasUteis;
}

// ─── Helper: nome seguro do colaborador ──────────────────────────────────────
function _recNome(c) {
    return c.nome_completo || c.nome || c.NOME_COMPLETO || c.nome_colab || '(sem nome)';
}

// ─── Init da view ─────────────────────────────────────────────────────────────
window.initRecibosView = async function () {
    const container = document.getElementById('recibos-container');
    if (!container) return;

    _recibosAllColabs = []; _recibosFiltrados = [];
    _recibosDeptTipoMap = {}; _recibosSelecoes = {};

    const hoje  = new Date();
    const mesAt = hoje.getMonth() + 1;
    const anoAt = hoje.getFullYear();

    container.innerHTML = _buildRecibosLayout(mesAt, anoAt);
    _ensureSpinCss();

    await Promise.all([_loadDeptsTipo(), _loadColabs()]);
};

// ─── CSS spin ─────────────────────────────────────────────────────────────────
function _ensureSpinCss() {
    if (document.getElementById('rec-spin-css')) return;
    const s = document.createElement('style');
    s.id = 'rec-spin-css';
    s.textContent = '@keyframes rec-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}';
    document.head.appendChild(s);
}

// ─── HTML principal ───────────────────────────────────────────────────────────
function _buildRecibosLayout(mesAt, anoAt) {
    const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                   'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    return `
<div style="padding:1.5rem;max-width:1300px;margin:0 auto;">

  <!-- CABEÇALHO -->
  <div style="display:flex;align-items:center;justify-content:space-between;gap:1rem;margin-bottom:1.5rem;flex-wrap:wrap;">
    <div style="display:flex;align-items:center;gap:14px;">
      <div style="width:52px;height:52px;border-radius:14px;background:linear-gradient(135deg,#1e3a5f,#2563eb);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
        <i class="ph ph-receipt" style="font-size:1.7rem;color:#fff;"></i>
      </div>
      <div>
        <h2 style="margin:0;font-size:1.4rem;color:#1e293b;font-weight:700;">Recibos de Benefícios</h2>
      </div>
    </div>
    <div style="display:flex;gap:.5rem;">
      <button id="btn-conferencia-ponto" onclick="window.baixarConferenciaPonto()"
        style="display:flex;align-items:center;gap:8px;padding:.65rem 1.4rem;background:#f8fafc;color:#475569;border:1px solid #cbd5e1;border-radius:10px;font-size:.95rem;font-weight:700;cursor:pointer;transition:background .2s;"
        onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='#f8fafc'">
        <i class="ph ph-list-numbers" style="font-size:1.1rem;"></i> Conferência do Ponto
      </button>
      <button id="btn-anexar-massa" onclick="window.anexarRecibosDocsMassa()"
        style="display:none;align-items:center;gap:8px;padding:.65rem 1.4rem;background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:none;border-radius:10px;font-size:.95rem;font-weight:700;cursor:pointer;box-shadow:0 2px 10px rgba(16,185,129,.35);">
        <i class="ph ph-paperclip" style="font-size:1.1rem;"></i> Anexar aos Docs. em Massa
      </button>
      <button id="btn-gerar-massa" onclick="window.gerarRecibosEmMassa()"
        style="display:flex;align-items:center;gap:8px;padding:.65rem 1.4rem;background:linear-gradient(135deg,#1e3a5f,#2563eb);color:#fff;border:none;border-radius:10px;font-size:.95rem;font-weight:700;cursor:pointer;box-shadow:0 2px 10px rgba(37,99,235,.35);">
        <i class="ph ph-printer" style="font-size:1.1rem;"></i> Gerar Recibos Selecionados
      </button>
    </div>
  </div>

  <!-- PERÍODO + VR -->
  <div class="card" style="padding:1.25rem 1.5rem;margin-bottom:1rem;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,.06);">
    <div style="display:flex;gap:1.5rem;align-items:flex-end;flex-wrap:wrap;">
      <div>
        <label style="font-size:.79rem;font-weight:600;color:#475569;display:block;margin-bottom:.3rem;"><i class="ph ph-calendar-blank" style="color:#2563eb;"></i> Mês</label>
        <select id="rec-mes" onchange="window.carregarHistoricoRecibos()"
          style="padding:.54rem .85rem;border:1px solid #cbd5e1;border-radius:8px;font-size:.93rem;background:#fff;cursor:pointer;">
          ${MESES.map((m,i)=>`<option value="${i+1}" ${i+1===mesAt?'selected':''}>${m}</option>`).join('')}
        </select>
      </div>
      <div>
        <label style="font-size:.79rem;font-weight:600;color:#475569;display:block;margin-bottom:.3rem;">Ano</label>
        <select id="rec-ano" onchange="window.carregarHistoricoRecibos()"
          style="padding:.54rem .85rem;border:1px solid #cbd5e1;border-radius:8px;font-size:.93rem;background:#fff;cursor:pointer;">
          ${[anoAt-1,anoAt,anoAt+1].map(a=>`<option value="${a}" ${a===anoAt?'selected':''}>${a}</option>`).join('')}
        </select>
      </div>
      <div style="width:1px;height:42px;background:#e2e8f0;align-self:flex-end;"></div>
      <div>
        <label style="font-size:.79rem;font-weight:600;color:#475569;display:block;margin-bottom:.3rem;">
          <i class="ph ph-fork-knife" style="color:#059669;"></i> Valor VR por dia (R$)
        </label>
        <div style="display:flex;align-items:center;gap:8px;">
          <input type="number" id="rec-valor-vr" value="35.00" min="0" step="0.01"
            style="width:110px;padding:.54rem .75rem;border:1px solid #cbd5e1;border-radius:8px;font-size:.95rem;font-weight:700;color:#059669;">
        </div>
      </div>
      <div style="width:1px;height:42px;background:#e2e8f0;align-self:flex-end;"></div>
      <!-- Aviso sem "dias úteis globais" -->
      <div style="display:flex;align-items:center;gap:8px;padding:.5rem .75rem;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;max-width:340px;">
        <i class="ph ph-info" style="color:#d97706;font-size:1.1rem;flex-shrink:0;"></i>
        <span style="font-size:.79rem;color:#92400e;line-height:1.4;">
          Os <strong>dias trabalhados e faltas</strong> são individuais por colaborador.
          Use <strong>Buscar Ponto (RHID)</strong> para preencher automaticamente.
        </span>
      </div>
    </div>
  </div>

  <!-- FILTROS -->
  <div class="card" style="padding:1rem 1.5rem;margin-bottom:.75rem;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,.06);">
    <div style="display:flex;gap:.75rem;align-items:flex-end;flex-wrap:wrap;">
      <div style="flex:2;min-width:170px;">
        <label style="font-size:.77rem;font-weight:600;color:#475569;display:block;margin-bottom:.25rem;">Nome</label>
        <input type="text" id="rec-f-nome" placeholder="Buscar colaborador..."
          style="width:100%;padding:.46rem .75rem;border:1px solid #e2e8f0;border-radius:8px;font-size:.88rem;box-sizing:border-box;"
          oninput="window.aplicarFiltrosRecibos()">
      </div>
      <div style="flex:2;min-width:155px;">
        <label style="font-size:.77rem;font-weight:600;color:#475569;display:block;margin-bottom:.25rem;">Departamento</label>
        <select id="rec-f-dept" onchange="window.aplicarFiltrosRecibos()"
          style="width:100%;padding:.46rem .65rem;border:1px solid #e2e8f0;border-radius:8px;font-size:.88rem;background:#fff;">
          <option value="">Todos</option>
        </select>
      </div>
      <div style="flex:2;min-width:155px;">
        <label style="font-size:.77rem;font-weight:600;color:#475569;display:block;margin-bottom:.25rem;">Cargo</label>
        <select id="rec-f-cargo" onchange="window.aplicarFiltrosRecibos()"
          style="width:100%;padding:.46rem .65rem;border:1px solid #e2e8f0;border-radius:8px;font-size:.88rem;background:#fff;">
          <option value="">Todos</option>
        </select>
      </div>
      <div style="flex:1;min-width:130px;">
        <label style="font-size:.77rem;font-weight:600;color:#475569;display:block;margin-bottom:.25rem;">Tipo</label>
        <select id="rec-f-tipo" onchange="window.aplicarFiltrosRecibos()"
          style="width:100%;padding:.46rem .65rem;border:1px solid #e2e8f0;border-radius:8px;font-size:.88rem;background:#fff;">
          <option value="">Todos</option>
          <option value="Operacional">Operacional</option>
          <option value="Administrativo">Administrativo</option>
        </select>
      </div>
      <div style="flex:1;min-width:125px;">
        <label style="font-size:.77rem;font-weight:600;color:#475569;display:block;margin-bottom:.25rem;">Transporte</label>
        <select id="rec-f-transp" onchange="window.aplicarFiltrosRecibos()"
          style="width:100%;padding:.46rem .65rem;border:1px solid #e2e8f0;border-radius:8px;font-size:.88rem;background:#fff;">
          <option value="">Todos</option>
          <option value="vt">VT</option>
          <option value="vc">VC</option>
          <option value="proprio">Outros</option>
        </select>
      </div>
      <div>
        <label style="font-size:.77rem;font-weight:600;color:#475569;display:block;margin-bottom:.25rem;">&nbsp;</label>
        <button id="btn-buscar-ponto" onclick="window._recBuscarPontoSelecionados()"
          style="display:flex;align-items:center;gap:6px;padding:.46rem 1rem;background:#0f172a;color:#fff;border:none;border-radius:8px;font-size:.84rem;font-weight:600;cursor:pointer;white-space:nowrap;">
          <i class="ph ph-fingerprint"></i> Buscar Ponto (RHID)
        </button>
      </div>
    </div>
  </div>

  <!-- BARRA DE SELEÇÃO -->
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.5rem;padding:0 .25rem;">
    <label style="display:flex;align-items:center;gap:8px;cursor:pointer;user-select:none;">
      <input type="checkbox" id="rec-select-all" onchange="window.toggleSelectAllRecibos(this.checked)"
        style="width:16px;height:16px;accent-color:#2563eb;cursor:pointer;">
      <span style="font-size:.88rem;font-weight:600;color:#475569;">Selecionar todos</span>
    </label>
    <div style="display:flex;align-items:center;gap:1rem;">
      <span id="rec-ponto-badge" style="font-size:.8rem;"></span>
      <span id="rec-contador" style="font-size:.85rem;color:#64748b;font-weight:500;">0 selecionados</span>
    </div>
  </div>

  <!-- TABELA -->
  <div class="card" style="border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.06);">
    <div style="overflow-x:auto;overflow-y:auto;max-height:65vh;">
      <table style="width:100%;border-collapse:collapse;font-size:.85rem;">
        <thead style="position:sticky;top:0;z-index:10;box-shadow:0 2px 4px rgba(0,0,0,0.05);">
          <tr style="background:#f1f5f9;border-bottom:2px solid #e2e8f0;">
            <th style="position:sticky;top:0;background:#f1f5f9;padding:.7rem .5rem;width:36px;z-index:11;"></th>
            <th style="position:sticky;top:0;background:#f1f5f9;padding:.7rem 1rem;text-align:left;color:#475569;font-weight:600;font-size:.76rem;text-transform:uppercase;letter-spacing:.04em;z-index:11;">Colaborador</th>
            <th style="position:sticky;top:0;background:#f1f5f9;padding:.7rem 1rem;text-align:left;color:#475569;font-weight:600;font-size:.76rem;text-transform:uppercase;letter-spacing:.04em;z-index:11;">Cargo / Departamento</th>
            <th style="position:sticky;top:0;background:#f1f5f9;padding:.7rem .75rem;text-align:center;color:#475569;font-weight:600;font-size:.76rem;text-transform:uppercase;letter-spacing:.04em;z-index:11;">Meio Transp.</th>
            <th style="position:sticky;top:0;background:#f1f5f9;padding:.7rem .5rem;text-align:center;color:#475569;font-weight:600;font-size:.76rem;text-transform:uppercase;letter-spacing:.04em;z-index:11;" title="Dias > 6h (Base VR)">VR</th>
            <th style="position:sticky;top:0;background:#f1f5f9;padding:.7rem .5rem;text-align:center;color:#475569;font-weight:600;font-size:.76rem;text-transform:uppercase;letter-spacing:.04em;z-index:11;" title="Dias > 3h extra">Jantar</th>
            <th style="position:sticky;top:0;background:#f1f5f9;padding:.7rem .5rem;text-align:center;color:#475569;font-weight:600;font-size:.76rem;text-transform:uppercase;letter-spacing:.04em;z-index:11;" title="Dias Trabalhados (Base VT/VC)">Transporte</th>
            <th style="position:sticky;top:0;background:#f1f5f9;padding:.7rem .5rem;text-align:center;color:#475569;font-weight:600;font-size:.76rem;text-transform:uppercase;letter-spacing:.04em;z-index:11;" title="Faltas com e sem atestado">Faltas</th>
            <th style="position:sticky;top:0;background:#f1f5f9;padding:.7rem .5rem;text-align:center;color:#475569;font-weight:600;font-size:.76rem;text-transform:uppercase;letter-spacing:.04em;z-index:11;">Ponto</th>
          </tr>
        </thead>
        <tbody id="rec-tbody">
          <tr><td colspan="9" style="text-align:center;padding:3rem;color:#94a3b8;">
            <i class="ph ph-spinner" style="font-size:1.5rem;animation:rec-spin 1s linear infinite;display:block;margin-bottom:.6rem;"></i>
            Carregando colaboradores...
          </td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- LEGENDA -->
  <div style="display:flex;gap:1.25rem;margin-top:.65rem;flex-wrap:wrap;padding:0 .1rem;">
    <span style="font-size:.77rem;color:#64748b;display:flex;align-items:center;gap:5px;">
      <i class="ph ph-check-circle" style="color:#10b981;"></i> Ponto importado do RHID
    </span>
    <span style="font-size:.77rem;color:#64748b;display:flex;align-items:center;gap:5px;">
      <i class="ph ph-warning" style="color:#f59e0b;"></i> Não encontrado no RHID — preencha manualmente
    </span>
    <span style="font-size:.77rem;color:#64748b;display:flex;align-items:center;gap:5px;">
      <i class="ph ph-minus-circle" style="color:#cbd5e1;"></i> Ponto não buscado — preencha manualmente
    </span>
  </div>
</div>`;
}

// ─── Carregar departamentos → mapa nome→tipo ──────────────────────────────────
async function _loadDeptsTipo() {
    try {
        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        const res   = await fetch(`${API_URL}/departamentos`, { headers: { 'Authorization': `Bearer ${token}` } });
        const data  = await res.json();
        const list  = Array.isArray(data) ? data : (data.departamentos || []);
        _recibosDeptTipoMap = {};
        list.forEach(d => { if (d.nome && d.tipo) _recibosDeptTipoMap[d.nome.trim()] = d.tipo.trim(); });
    } catch (e) { console.warn('[Recibos] Depts:', e.message); }
}

// ─── Carregar colaboradores ativos ────────────────────────────────────────────
async function _loadColabs() {
    try {
        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        const res   = await fetch(`${API_URL}/colaboradores?status=Ativo&limit=2000`, { headers: { 'Authorization': `Bearer ${token}` } });
        const data  = await res.json();
        let list    = Array.isArray(data) ? data : (data.colaboradores || []);
        _recibosAllColabs = list.filter(c => c.status !== 'Desligado');

        // Inicializar seleções com 0 — aguarda RHID ou preenchimento manual
        _recibosSelecoes = {};
        _recibosAllColabs.forEach(c => {
            _recibosSelecoes[c.id] = { selecionado: false, diasTrabalhados: 0, diasVR: 0, faltas: 0, diasExtra: 0, pontoStatus: null, isAutoSupervisao: false, historicoEncontrado: false };
        });

        _popularFiltros();
        await window.carregarHistoricoRecibos(); // Carrega histórico e depois filtra/renderiza

    } catch (e) {
        console.error('[Recibos] Erro ao carregar:', e);
        const tbody = document.getElementById('rec-tbody');
        if (tbody) tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:2rem;color:#ef4444;">
            <i class="ph ph-warning-circle" style="font-size:1.5rem;display:block;margin-bottom:.5rem;"></i>
            Erro ao carregar colaboradores: ${e.message}</td></tr>`;
    }
}

// ─── Popular dropdowns de filtro ──────────────────────────────────────────────
function _popularFiltros() {
    const depts  = [...new Set(_recibosAllColabs.map(c => c.departamento).filter(Boolean))].sort();
    const cargos = [...new Set(_recibosAllColabs.map(c => c.cargo).filter(Boolean))].sort();

    const dSel = document.getElementById('rec-f-dept');
    if (dSel) dSel.innerHTML = '<option value="">Todos os Departamentos</option>' +
        depts.map(d => `<option value="${d}">${d}</option>`).join('');

    const cSel = document.getElementById('rec-f-cargo');
    if (cSel) cSel.innerHTML = '<option value="">Todos os Cargos</option>' +
        cargos.map(c => `<option value="${c}">${c}</option>`).join('');
}

// ─── Filtros ──────────────────────────────────────────────────────────────────
window.aplicarFiltrosRecibos = function () { _filtrarERendar(); };

function _filtrarERendar() {
    const nome   = (document.getElementById('rec-f-nome')?.value || '').toLowerCase().trim();
    const dept   = document.getElementById('rec-f-dept')?.value  || '';
    const cargo  = document.getElementById('rec-f-cargo')?.value || '';
    const tipo   = document.getElementById('rec-f-tipo')?.value  || '';
    const transp = document.getElementById('rec-f-transp')?.value || '';

    _recibosFiltrados = _recibosAllColabs.filter(c => {
        const nomeC = _recNome(c).toLowerCase();
        if (nome   && !nomeC.includes(nome))               return false;
        if (dept   && c.departamento !== dept)             return false;
        if (cargo  && c.cargo        !== cargo)            return false;
        if (tipo) {
            const t = _recibosDeptTipoMap[(c.departamento||'').trim()] || 'Administrativo';
            if (t !== tipo) return false;
        }
        if (transp) {
            const m = (c.meio_transporte||'').toLowerCase();
            if (transp === 'vt'      && !_isVT(m))              return false;
            if (transp === 'vc'      && !_isVC(m))              return false;
            if (transp === 'proprio' && (_isVT(m)||_isVC(m)))   return false;
        }
        return true;
    });

    _renderTabela();
}

// ─── Helpers meio de transporte ───────────────────────────────────────────────
function _isVT(m) { return m.includes('vale transporte') || m.includes('(vt)') || m === 'vt'; }
function _isVC(m) { return m.includes('combustivel') || m.includes('combustível') || m.includes('(vc)') || m === 'vc'; }

// ─── Renderizar tabela ────────────────────────────────────────────────────────
function _renderTabela() {
    const tbody = document.getElementById('rec-tbody');
    if (!tbody) return;

    if (!_recibosFiltrados.length) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:2.5rem;color:#94a3b8;">
            <i class="ph ph-users" style="font-size:2rem;display:block;margin-bottom:.5rem;"></i>
            Nenhum colaborador encontrado.</td></tr>`;
        _atualizarContador(); return;
    }

    tbody.innerHTML = _recibosFiltrados.map(c => {
        const s    = _recibosSelecoes[c.id] || { selecionado:false, diasTrabalhados:0, diasVR:0, faltas:0, diasExtra:0, pontoStatus:null };
        const nome = _recNome(c);
        const tipo = _recibosDeptTipoMap[(c.departamento||'').trim()] || '';

        const tipoBadge = tipo === 'Operacional'
            ? `<span style="font-size:.72rem;background:#fef3c7;color:#92400e;padding:2px 9px;border-radius:10px;font-weight:600;">OP</span>`
            : tipo === 'Administrativo'
            ? `<span style="font-size:.72rem;background:#eff6ff;color:#1d4ed8;padding:2px 9px;border-radius:10px;font-weight:600;">ADM</span>`
            : `<span style="font-size:.72rem;color:#94a3b8;">—</span>`;

        const m = (c.meio_transporte||'').toLowerCase();
        const transpBadge = _isVT(m)
            ? `<span style="background:#eff6ff;color:#1d4ed8;padding:3px 10px;border-radius:10px;font-size:.78rem;font-weight:600;">VT</span>`
            : _isVC(m)
            ? `<span style="background:#fffbeb;color:#d97706;padding:3px 10px;border-radius:10px;font-size:.78rem;font-weight:600;">VC</span>`
            : `<span style="background:#f1f5f9;color:#94a3b8;padding:3px 10px;border-radius:10px;font-size:.78rem;font-weight:600;">Outros</span>`;

        let pontoIcon = s.pontoStatus === 'ok'
            ? `<i class="ph ph-check-circle" style="color:#10b981;font-size:1.1rem;" title="Importado do RHID"></i>`
            : s.pontoStatus === 'erro'
            ? `<i class="ph ph-warning" style="color:#f59e0b;font-size:1.1rem;" title="Não encontrado no RHID — preencha manualmente"></i>`
            : `<i class="ph ph-minus-circle" style="color:#cbd5e1;font-size:1.1rem;" title="Ponto não buscado"></i>`;

        const { bg, hoverBg, isAmarelo, isFerias } = window._getRowColors(c, s);

        if (isAmarelo && s.pontoStatus !== null) {
            pontoIcon = `<i class="ph ph-warning" style="color:#d97706;font-size:1.1rem;" title="0 dias trabalhados identificados no RHID"></i>`;
        } else if (isFerias && s.pontoStatus !== null) {
            pontoIcon = `<i class="ph ph-check-circle" style="color:#a855f7;font-size:1.1rem;" title="Férias (Importado do RHID)"></i>`;
        }

        const dtrabColor = isFerias ? '#a855f7' : (s.diasTrabalhados > 0 ? '#1e293b' : '#94a3b8');
        const faltaColor = isFerias ? '#a855f7' : (s.faltas > 0 ? '#ef4444' : '#94a3b8');

        return `<tr id="rec-row-${c.id}"
            style="border-bottom:1px solid #f1f5f9;background:${bg};transition:background .12s;"
            onmouseover="this.style.background='${hoverBg}';"
            onmouseout="this.style.background='${bg}';">
          <td style="padding:.55rem .5rem;text-align:center;">
            <input type="checkbox" id="rec-cb-${c.id}" data-id="${c.id}" ${s.selecionado?'checked':''}
              style="width:16px;height:16px;accent-color:#2563eb;cursor:pointer;"
              onchange="window.toggleReciboColab(${c.id},this.checked)">
          </td>
          <td style="padding:.55rem 1rem;">
            <div style="font-weight:600;color:#1e293b;font-size:.88rem;">${nome}</div>
            <div style="font-size:.74rem;color:#94a3b8;">CPF: ${c.cpf||'—'}</div>
          </td>
          <td style="padding:.55rem 1rem;">
            <div style="color:#475569;font-size:.85rem;">${c.cargo||'—'}</div>
            <div style="font-size:.74rem;color:#94a3b8;">${c.departamento||'—'}</div>
          </td>
          <td style="padding:.55rem .75rem;text-align:center;">${transpBadge}</td>
          <td style="padding:.45rem .4rem;text-align:center;">
            <input type="number" min="0" max="35" value="${s.diasVR !== null && s.diasVR !== undefined ? s.diasVR : s.diasTrabalhados}"
              style="width:52px;padding:.3rem .35rem;border:1px solid #e2e8f0;border-radius:6px;text-align:center;font-size:.88rem;font-weight:600;color:${dtrabColor};"
              placeholder="0"
              onchange="window.atualizarDadosReciboColab(${c.id},'diasVR',this.value)">
          </td>
          <td style="padding:.45rem .4rem;text-align:center;">
            <input type="number" min="0" max="35" value="${s.diasExtra||''}"
              style="width:52px;padding:.3rem .35rem;border:1px solid #e2e8f0;border-radius:6px;text-align:center;font-size:.88rem;font-weight:600;color:${s.diasExtra>0?'#8b5cf6':'#94a3b8'};"
              placeholder="0"
              onchange="window.atualizarDadosReciboColab(${c.id},'diasExtra',this.value)">
          </td>
          <td style="padding:.45rem .4rem;text-align:center;">
            ${_isVT(m) || _isVC(m) ? `
            <input type="number" min="0" max="35" value="${s.diasTrabalhados}"
              style="width:52px;padding:.3rem .35rem;border:1px solid #e2e8f0;border-radius:6px;text-align:center;font-size:.88rem;font-weight:600;color:${dtrabColor};"
              placeholder="0"
              onchange="window.atualizarDadosReciboColab(${c.id},'diasTrabalhados',this.value); if(_recibosSelecoes[${c.id}].diasVR == null) _recibosSelecoes[${c.id}].diasVR = this.value; window.aplicarFiltrosRecibos();">
            ` : `<span style="color:#94a3b8;font-weight:600;">-</span>`}
          </td>
          <td style="padding:.45rem .4rem;text-align:center;">
            <input type="number" min="0" max="35" value="${s.faltas||''}"
              style="width:52px;padding:.3rem .35rem;border:1px solid #e2e8f0;border-radius:6px;text-align:center;font-size:.88rem;font-weight:600;color:${faltaColor};"
              placeholder="0"
              onchange="window.atualizarDadosReciboColab(${c.id},'faltas',this.value)">
          </td>
          <td style="padding:.55rem .4rem;text-align:center;">${pontoIcon}</td>
        </tr>`;
    }).join('');

    _atualizarContador();
}

window._isColabFerias = function(c, ano, mes) {
    if (c.status === 'Férias') return true;
    if (c.ferias_programadas_inicio && c.ferias_programadas_fim) {
        const ini = new Date(c.ferias_programadas_inicio + 'T00:00:00');
        const fim = new Date(c.ferias_programadas_fim + 'T23:59:59');
        const dIni = new Date(ano, mes - 1, 1);
        const dFim = new Date(ano, mes, 0); 
        if (ini <= dFim && fim >= dIni) return true;
    }
    return false;
};

window._isSupervisao = function(c) {
    const dept = (c.departamento || '').toLowerCase();
    const cargo = (c.cargo || '').toLowerCase();
    return dept.includes('supervis') || cargo.includes('supervis') || cargo.includes('sup.') || cargo.startsWith('sup ');
};

window._getRowColors = function(c, s) {
    const mesAt = parseInt(document.getElementById('rec-mes')?.value);
    const anoAt = parseInt(document.getElementById('rec-ano')?.value);
    
    const isFerias = window._isColabFerias(c, anoAt, mesAt);
    const isSupervisao = window._isSupervisao(c);
    
    // AMARELO: Pesquisados (pontoStatus != null), 0 comparecimentos, NÃO são supervisão.
    const isAmarelo = !isFerias && !isSupervisao && (s.diasTrabalhados === 0) && (s.pontoStatus !== null);
    
    // VERDE: pontoStatus 'ok', desde que não tenha caído na regra do Amarelo.
    const isVerde = (s.pontoStatus === 'ok') && !isAmarelo;
    
    const isSupervisorAzul = isSupervisao && !isVerde;
    const isCinza   = !isFerias && !isSupervisorAzul && !isVerde && !isAmarelo && (s.diasTrabalhados === 0) && (s.pontoStatus === null);

    let bg = '#fff';
    let hoverBg = '#f8fafc';

    if (!s.selecionado) {
        if (isFerias) { bg = '#f3e8ff'; hoverBg = '#e9d5ff'; }
        else if (isSupervisorAzul) { bg = '#e0f2fe'; hoverBg = '#bae6fd'; }
        else if (isVerde) { bg = '#dcfce7'; hoverBg = '#bbf7d0'; }
        else if (isAmarelo) { bg = '#fef08a'; hoverBg = '#fde047'; }
        else if (isCinza) { bg = '#f1f5f9'; hoverBg = '#e2e8f0'; }
    } else {
        if (isFerias) { bg = '#e9d5ff'; hoverBg = '#d8b4fe'; }
        else if (isSupervisorAzul) { bg = '#bae6fd'; hoverBg = '#7dd3fc'; }
        else if (isVerde) { bg = '#bbf7d0'; hoverBg = '#86efac'; }
        else if (isAmarelo) { bg = '#fde047'; hoverBg = '#facc15'; }
        else if (isCinza) { bg = '#e2e8f0'; hoverBg = '#cbd5e1'; }
        else { bg = '#f0f9ff'; hoverBg = '#e0f2fe'; }
    }
    
    return { bg, hoverBg, isAmarelo, isFerias };
};

// ─── Toggle individual ────────────────────────────────────────────────────────
window.toggleReciboColab = function (id, checked) {
    if (!_recibosSelecoes[id]) return;
    _recibosSelecoes[id].selecionado = checked;
    const row = document.getElementById(`rec-row-${id}`);
    if (row) {
        const c = _recibosAllColabs.find(x => x.id === id);
        if (c) {
            const { bg, hoverBg } = window._getRowColors(c, _recibosSelecoes[id]);
            row.style.background = bg;
            row.onmouseover = () => row.style.background = hoverBg;
            row.onmouseout = () => row.style.background = bg;
        }
    }
    _atualizarContador();
    const sa = document.getElementById('rec-select-all');
    if (sa) sa.checked = _recibosFiltrados.length > 0 && _recibosFiltrados.every(c => _recibosSelecoes[c.id]?.selecionado);
};

// ─── Selecionar todos ─────────────────────────────────────────────────────────
window.toggleSelectAllRecibos = function (checked) {
    _recibosFiltrados.forEach(c => {
        if (!_recibosSelecoes[c.id]) return;
        _recibosSelecoes[c.id].selecionado = checked;
        const cb  = document.getElementById(`rec-cb-${c.id}`);  if (cb)  cb.checked = checked;
        const row = document.getElementById(`rec-row-${c.id}`);
        if (row) {
            const { bg, hoverBg } = window._getRowColors(c, _recibosSelecoes[c.id]);
            row.style.background = bg;
            row.onmouseover = () => row.style.background = hoverBg;
            row.onmouseout = () => row.style.background = bg;
        }
    });
    _atualizarContador();
};

// ─── Atualizar dado individual ────────────────────────────────────────────────
window.atualizarDadosReciboColab = function (id, campo, valor) {
    if (!_recibosSelecoes[id]) return;
    _recibosSelecoes[id][campo] = Math.max(0, parseInt(valor) || 0);
};

// ─── Contador de selecionados ─────────────────────────────────────────────────
function _atualizarContador() {
    const n  = Object.values(_recibosSelecoes).filter(s => s.selecionado).length;
    const el = document.getElementById('rec-contador');
    if (!el) return;
    el.textContent = n === 0 ? '0 selecionados' : `${n} colaborador${n>1?'es':''} selecionado${n>1?'s':''}`;
    el.style.color      = n > 0 ? '#2563eb' : '#64748b';
    el.style.fontWeight = n > 0 ? '700' : '500';
}

// ─── Buscar ponto RHID em lote ────────────────────────────────────────────────
window._recBuscarPontoSelecionados = async function () {
    const sels = _recibosAllColabs.filter(c => _recibosSelecoes[c.id]?.selecionado);
    if (!sels.length) {
        if (typeof Swal !== 'undefined') Swal.fire('Atenção', 'Selecione ao menos um colaborador antes de buscar o ponto.', 'warning');
        return;
    }

    const mes   = document.getElementById('rec-mes')?.value;
    const ano   = document.getElementById('rec-ano')?.value;
    const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
    const badge = document.getElementById('rec-ponto-badge');
    const btn   = document.getElementById('btn-buscar-ponto');

    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ph ph-spinner" style="animation:rec-spin 1s linear infinite;"></i> Buscando...'; }
    if (badge) {
        badge.style.cssText = 'display:inline-flex;align-items:center;gap:5px;font-size:.8rem;font-weight:600;color:#1d4ed8;';
        badge.innerHTML = `<i class="ph ph-spinner" style="animation:rec-spin 1s linear infinite;"></i> Buscando ${sels.length} colaborador${sels.length>1?'es':''}...`;
    }

    let ok = 0, semCadastro = 0, semApuracao = 0, erroApi = 0;
    const errosDetalhes = [];

    for (const c of sels) {
        const cpf = (c.cpf || '').replace(/\D/g, '');
        if (!cpf || cpf.length < 8) {
            _recibosSelecoes[c.id].pontoStatus = 'erro';
            semCadastro++;
            continue;
        }
        try {
            const res  = await fetch(
                `${API_URL}/diretoria/controlid/ponto-colaborador?cpf=${encodeURIComponent(cpf)}&mes=${mes}&ano=${ano}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            const data = await res.json();

            if (!res.ok) {
                // Erro HTTP (ex: 500 da API RHID)
                const msgRaw = data.message || `Erro HTTP ${res.status}`;
                // Remove blocos <style>/<script> e tags HTML caso o RHID retorne página de erro
                const msg = msgRaw
                    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
                    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
                    .replace(/<[^>]+>/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim()
                    .substring(0, 200);
                errosDetalhes.push(`${_recNome(c)}: ${msg}`);
                _recibosSelecoes[c.id].pontoStatus = 'erro';
                erroApi++;
                continue;
            }

            if (data.success && data.encontrado) {
                const s = _recibosSelecoes[c.id];
                // Preenchimento: RHID retorna diasTrabalhados e faltas
                if (data.diasTrabalhados != null) s.diasTrabalhados = data.diasTrabalhados;
                if (data.diasVR          != null) s.diasVR          = data.diasVR;
                if (data.faltas          != null) s.faltas          = data.faltas;
                if (data.diasComHoraExtra != null) {
                    const tipo = _recibosDeptTipoMap[(c.departamento||'').trim()] || '';
                    s.diasExtra = (tipo === 'Administrativo') ? 0 : data.diasComHoraExtra;
                }
                
                if (data.apuracaoRaw) {
                    try {
                        s.apuracaoDiaria = typeof data.apuracaoRaw === 'string' ? JSON.parse(data.apuracaoRaw) : data.apuracaoRaw;
                    } catch(e) { console.warn('Erro ao ler apuracaoRaw:', e); }
                }
                
                const isFerias = window._isColabFerias(c, ano, mes);
                if (isFerias) {
                    s.diasTrabalhados = 0;
                    s.diasExtra = 0;
                    s.faltas = 0;
                    s.diasVR = 0;
                }

                // Se RHID retornou dados válidos, remove a flag de supervisão auto, 
                // A MENOS que seja supervisão com 0 dias trabalhados (onde assumimos que a falta de ponto é por ser supervisão)
                const isSupervisao = window._isSupervisao(c);
                if (!(isSupervisao && (data.dtrab || data.diasTrabalhados || 0) === 0)) {
                    s.isAutoSupervisao = false;
                }

                // Se RHID retornou aviso (apuração não disponível)
                s.pontoStatus = data.aviso ? 'erro' : 'ok';
                if (data.aviso) { semApuracao++; errosDetalhes.push(`${_recNome(c)}: ${data.aviso}`); }
                else ok++;
            } else if (data.success === false && data.encontrado === false) {
                // Não encontrado no RHID
                _recibosSelecoes[c.id].pontoStatus = 'erro';
                semCadastro++;
            } else {
                _recibosSelecoes[c.id].pontoStatus = 'erro';
                erroApi++;
                errosDetalhes.push(`${_recNome(c)}: ${data.message || 'Resposta inesperada do RHID'}`);
            }
        } catch (ex) {
            _recibosSelecoes[c.id].pontoStatus = 'erro';
            erroApi++;
            errosDetalhes.push(`${_recNome(c)}: ${ex.message}`);
        }
    }

    // ── CONFRONTO DE DADOS (FERIADOS DO RHID) ────────────────────────────
    // Extrai o calendário real da apuração de algum colaborador para ajustar a Supervisão
    let diasUteisRHID = null;
    let diasUteisRHID_SegSex = null;
    for (const id in _recibosSelecoes) {
        const sel = _recibosSelecoes[id];
        if (sel && sel.apuracaoDiaria && Array.isArray(sel.apuracaoDiaria) && sel.apuracaoDiaria.length > 0) {
            let countSegSab = 0;
            let countSegSex = 0;
            sel.apuracaoDiaria.forEach(d => {
                let dia = String(d.date || d.dateTimeStr || '').substring(0,10);
                if (!dia) return;
                let dataObj = new Date(dia + 'T00:00:00'); 
                if (isNaN(dataObj.getTime())) {
                    const p = dia.split('/');
                    if (p.length === 3) dataObj = new Date(`${p[2]}-${p[1]}-${p[0]}T00:00:00`);
                }
                if (!isNaN(dataObj.getTime())) {
                    const diaSemana = dataObj.getDay();
                    if (diaSemana !== 0 && !d.isHoliday) {
                        countSegSab++;
                        if (diaSemana !== 6) {
                            countSegSex++;
                        }
                    }
                }
            });
            if (countSegSab > 0) {
                diasUteisRHID = countSegSab;
                diasUteisRHID_SegSex = countSegSex;
                break;
            }
        }
    }

    // Se não encontrou o oficial do RHID nas apurações locais, faz o fallback para o gerador padrão de dias úteis
    if (diasUteisRHID === null) {
        diasUteisRHID = await _getDiasUteis(ano, mes, false);
        diasUteisRHID_SegSex = await _getDiasUteis(ano, mes, true);
    }

    if (diasUteisRHID !== null) {
        // Atualiza supervisores auto-preenchidos com a base oficial do RHID (ou fallback)
        _recibosAllColabs.forEach(c => {
            const s = _recibosSelecoes[c.id];
            if (s && s.isAutoSupervisao) {
                s.diasTrabalhados = diasUteisRHID_SegSex;
                s.diasVR = diasUteisRHID_SegSex;
                s.faltas = 0; // Garante que zera as faltas que possam ter retornado
                s.pontoStatus = 'ok'; // Fica verdinho
            }
        });
    }
    // ─────────────────────────────────────────────────────────────────────

    _renderTabela();

    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ph ph-fingerprint"></i> Buscar Ponto (RHID)'; }

    // Badge de resultado
    if (badge) {
        const partes = [];
        if (ok         > 0) partes.push(`<span style="color:#059669;"><i class="ph ph-check-circle"></i> ${ok} importado${ok>1?'s':''}</span>`);
        if (semApuracao> 0) partes.push(`<span style="color:#f59e0b;"><i class="ph ph-warning"></i> ${semApuracao} sem apuração</span>`);
        if (semCadastro> 0) partes.push(`<span style="color:#f59e0b;"><i class="ph ph-user-minus"></i> ${semCadastro} sem cadastro RHID</span>`);
        if (erroApi    > 0) partes.push(`<span style="color:#ef4444;"><i class="ph ph-x-circle"></i> ${erroApi} erro API</span>`);
        badge.innerHTML = partes.join(' &nbsp; ');
    }

    // Mostrar detalhes dos erros se houver
    if (errosDetalhes.length > 0 && typeof Swal !== 'undefined') {
        // Escapa texto para evitar renderização de HTML nos erros
        const esc = (s) => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

        // Se TODOS falharam com erro de API — provavelmente RHID fora do ar
        const totalFalha = erroApi + semCadastro + semApuracao;
        const todosFalharam = (totalFalha === sels.length && ok === 0);

        if (todosFalharam) {
            // Primeira mensagem de erro para diagnose
            const primeiroErro = errosDetalhes[0] || '';
            const erroLimpo = esc(primeiroErro).substring(0, 300);
            Swal.fire({
                title: '⚠️ RHID Indisponível',
                html: `
                  <div style="font-size:.9rem;text-align:left;line-height:1.7;">
                    <p style="margin-bottom:.75rem;">Não foi possível consultar o ponto de <strong>${sels.length} colaborador${sels.length>1?'es':''}</strong>.<br>
                    O sistema de ponto (RHID / Control ID) retornou erro.</p>
                    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:.6rem .85rem;font-size:.8rem;color:#b91c1c;margin-bottom:.85rem;">
                      <strong>Detalhe:</strong> ${erroLimpo}
                    </div>
                    <p style="font-size:.82rem;color:#64748b;">O que fazer:</p>
                    <ul style="font-size:.82rem;color:#475569;padding-left:1.2rem;">
                      <li>Verifique se as credenciais RHID estão corretas (menu Admin › Control ID)</li>
                      <li>Confirme se o sistema de ponto está online</li>
                      <li>Preencha os dias manualmente na tabela</li>
                    </ul>
                  </div>`,
                icon: 'error',
                confirmButtonText: 'Entendido'
            });
        } else {
            // Falha parcial — mostra lista de erros individuais (sem HTML)
            const listHtml = errosDetalhes.slice(0, 8).map(e => `• ${esc(e)}`).join('<br>');
            const extra = errosDetalhes.length > 8 ? `<br><i style="color:#94a3b8;">...e mais ${errosDetalhes.length - 8}</i>` : '';
            Swal.fire({
                title: 'Resultado do Ponto',
                html: `<div style="font-size:.85rem;text-align:left;max-height:280px;overflow-y:auto;line-height:1.6;">${listHtml}${extra}</div>`,
                icon: erroApi > 0 ? 'warning' : 'info',
                confirmButtonText: 'OK'
            });
        }
    }
};

// ─── Geração em massa ─────────────────────────────────────────────────────────
window.gerarRecibosEmMassa = async function () {
    const sels = _recibosAllColabs.filter(c => _recibosSelecoes[c.id]?.selecionado);
    if (!sels.length) {
        if (typeof Swal !== 'undefined') Swal.fire('Atenção', 'Selecione ao menos um colaborador para gerar os recibos.', 'warning');
        return;
    }

    const mes     = parseInt(document.getElementById('rec-mes')?.value);
    const ano     = parseInt(document.getElementById('rec-ano')?.value);
    const valorVR = parseFloat(document.getElementById('rec-valor-vr')?.value) || 35.00;
    const mesNome = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][mes-1];

    // Aviso se algum selecionado tem dias = 0 e ponto não buscado
    const semDados = sels.filter(c => {
        const s = _recibosSelecoes[c.id];
        return s && s.diasTrabalhados === 0 && s.pontoStatus === null;
    });
    if (semDados.length > 0 && typeof Swal !== 'undefined') {
        const r = await Swal.fire({
            title: 'Atenção: Dias zerados',
            html: `<span style="font-size:.9rem;">${semDados.length} colaborador${semDados.length>1?'es estão':'está'} com <b>0 dias trabalhados</b> e sem ponto buscado.<br>Deseja continuar mesmo assim?</span>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Continuar',
            cancelButtonText: 'Cancelar'
        });
        if (!r.isConfirmed) return;
    }

    const btn = document.getElementById('btn-gerar-massa');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ph ph-spinner" style="animation:rec-spin 1s linear infinite;"></i> Gerando...'; }

    const logo = await _recGetLogo();

    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ph ph-printer"></i> Gerar Recibos Selecionados'; }

    const btnAnexar = document.getElementById('btn-anexar-massa');
    if (btnAnexar) btnAnexar.style.display = 'flex'; // Exibe o botão de anexar

    let corpo = '';
    sels.forEach((c, idx) => {
        if (idx > 0) corpo += '<div class="pb"></div>';
        const s = _recibosSelecoes[c.id] || { diasTrabalhados: 0, diasVR: 0, faltas: 0, diasExtra: 0 };
        const m = (c.meio_transporte||'').toLowerCase();

        // VR — sempre para todos
        corpo += _buildReciboBlock('VR', c, s, mes, mesNome, ano, valorVR, logo);

        // VT ou VC — conforme meio_transporte cadastrado
        if (_isVT(m)) { corpo += _buildReciboBlock('VT', c, s, mes, mesNome, ano, valorVR, logo); }
        if (_isVC(m)) { corpo += _buildReciboBlock('VC', c, s, mes, mesNome, ano, valorVR, logo); }
    });

    const fullHtml = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<title>Recibos — ${mesNome}/${ano}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:Arial,Helvetica,sans-serif;font-size:12px;background:#fff;color:#111;}
  .bar{display:flex;}
  .pb{page-break-before:always;}
  .via{page-break-inside:avoid;}
  @media print{.bar{display:none!important;}}
</style>
</head><body>
<div class="bar" style="background:#1e3a5f;color:#fff;padding:10px 24px;align-items:center;justify-content:space-between;gap:12px;position:sticky;top:0;z-index:999;flex-wrap:wrap;">
  <span style="font-weight:700;font-size:.95rem;">Recibos de Benefícios — ${mesNome}/${ano} · ${sels.length} colaborador${sels.length>1?'es':''}</span>
  <button onclick="window.print()" style="background:#fff;color:#1e3a5f;border:none;padding:8px 24px;border-radius:6px;font-weight:700;cursor:pointer;font-size:.93rem;">🖨 Imprimir / Salvar PDF</button>
</div>
${corpo}
</body></html>`;

    const win = window.open('', '_blank', 'width=920,height=840');
    if (!win) { if (typeof Swal !== 'undefined') Swal.fire('Pop-up bloqueado', 'Habilite pop-ups no navegador para gerar os recibos.', 'warning'); return; }
    win.document.write(fullHtml);
    win.document.close();
};

window.carregarHistoricoRecibos = async function () {
    const mes = document.getElementById('rec-mes')?.value;
    const ano = document.getElementById('rec-ano')?.value;
    if (!mes || !ano) return;
    
    try {
        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        const res = await fetch(`${API_URL}/recibos/historico/${mes}/${ano}`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) {
            const hist = await res.json();
            // Reseta seleções para o padrão sem histórico
            _recibosAllColabs.forEach(c => {
                if (_recibosSelecoes[c.id]) {
                    _recibosSelecoes[c.id].diasTrabalhados = 0;
                    _recibosSelecoes[c.id].diasVR = 0;
                    _recibosSelecoes[c.id].faltas = 0;
                    _recibosSelecoes[c.id].diasExtra = 0;
                    _recibosSelecoes[c.id].historicoEncontrado = false;
                    _recibosSelecoes[c.id].isAutoSupervisao = false;
                }
            });
            // Aplica o histórico
            hist.forEach(h => {
                if (_recibosSelecoes[h.colaborador_id]) {
                    _recibosSelecoes[h.colaborador_id].diasTrabalhados = h.dias_trabalhados;
                    _recibosSelecoes[h.colaborador_id].diasVR = h.dias_vr;
                    _recibosSelecoes[h.colaborador_id].faltas = h.faltas;
                    _recibosSelecoes[h.colaborador_id].diasExtra = h.dias_extra;
                    _recibosSelecoes[h.colaborador_id].historicoEncontrado = true;
                }
            });
        }
    } catch(e) { console.warn('Erro ao carregar histórico:', e); }
    
    // Auto-fill para Supervisão (sempre que for 0 dias, preenche auto, ignorando histórico com 0 acidental)
    const diasUteis_SegSex = await _getDiasUteis(ano, mes, true);
    _recibosAllColabs.forEach(c => {
        const s = _recibosSelecoes[c.id];
        const isSupervisao = window._isSupervisao(c);
        if (isSupervisao && s && s.diasTrabalhados === 0) {
            s.diasTrabalhados = diasUteis_SegSex;
            s.diasVR = diasUteis_SegSex;
            s.isAutoSupervisao = true;
        }
    });

    _filtrarERendar();
};

window.anexarRecibosDocsMassa = async function () {
    const sels = _recibosAllColabs.filter(c => _recibosSelecoes[c.id]?.selecionado);
    if (!sels.length) {
        if (typeof Swal !== 'undefined') Swal.fire('Atenção', 'Selecione ao menos um colaborador para anexar os recibos.', 'warning');
        return;
    }

    const mes = document.getElementById('rec-mes')?.value;
    const ano = document.getElementById('rec-ano')?.value;
    const mesNome = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][parseInt(mes)-1];
    const valorVR = parseFloat(document.getElementById('rec-valor-vr')?.value) || 35.00;

    const btnAnexar = document.getElementById('btn-anexar-massa');
    if (btnAnexar) { btnAnexar.disabled = true; btnAnexar.innerHTML = '<i class="ph ph-spinner" style="animation:rec-spin 1s linear infinite;"></i> Anexando e Salvando...'; }

    try {
        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');

        // 1. Salvar os dados (histórico)
        const itensSalvar = sels.map(c => ({
            colaborador_id: c.id,
            dias_trabalhados: _recibosSelecoes[c.id].diasTrabalhados,
            dias_vr: _recibosSelecoes[c.id].diasVR,
            faltas: _recibosSelecoes[c.id].faltas,
            dias_extra: _recibosSelecoes[c.id].diasExtra,
            valor_vr: valorVR
        }));
        await fetch(`${API_URL}/recibos/salvar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ mes, ano, itens: itensSalvar })
        });

        // 2. Enviar HTML de cada colaborador para virar PDF no servidor
        const logo = await _recGetLogo();
        let sucesso = 0, falha = 0;

        for (const c of sels) {
            const s = _recibosSelecoes[c.id] || { diasTrabalhados: 0, diasVR: 0, faltas: 0, diasExtra: 0 };
            const m = (c.meio_transporte||'').toLowerCase();
            let corpo = '';
            
            corpo += _buildReciboBlock('VR', c, s, mes, mesNome, ano, valorVR, logo);
            if (_isVT(m)) { corpo += '<div class="pb"></div>' + _buildReciboBlock('VT', c, s, mes, mesNome, ano, valorVR, logo); }
            if (_isVC(m)) { corpo += '<div class="pb"></div>' + _buildReciboBlock('VC', c, s, mes, mesNome, ano, valorVR, logo); }

            const htmlContent = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Recibos</title>
            <style>
              *{box-sizing:border-box;margin:0;padding:0;}
              body{font-family:Arial,Helvetica,sans-serif;font-size:12px;background:#fff;color:#111;}
              .pb{page-break-before:always;}
              .via{page-break-inside:avoid;}
            </style>
            </head><body>${corpo}</body></html>`;

            const resUpload = await fetch(`${API_URL}/recibos/anexar-massa`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ htmlContent, colaborador_id: c.id, mes, ano })
            });
            if (resUpload.ok) sucesso++; else falha++;
        }

        if (typeof Swal !== 'undefined') {
            Swal.fire('Concluído', `Os recibos foram anexados ao Docs em Massa.<br>Sucesso: ${sucesso} | Falhas: ${falha}`, 'success');
        }
    } catch(e) {
        if (typeof Swal !== 'undefined') Swal.fire('Erro', 'Ocorreu um erro ao anexar: ' + e.message, 'error');
    }

    if (btnAnexar) { btnAnexar.disabled = false; btnAnexar.innerHTML = '<i class="ph ph-paperclip"></i> Anexar aos Docs. em Massa'; }
};

// ─── Relatório de Conferência ─────────────────────────────────────────────────
window.baixarConferenciaPonto = function () {
    const sels = _recibosAllColabs.filter(c => _recibosSelecoes[c.id]?.selecionado);
    if (!sels.length) {
        if (typeof Swal !== 'undefined') Swal.fire('Atenção', 'Selecione ao menos um colaborador.', 'warning');
        return;
    }

    const mesNome = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][parseInt(document.getElementById('rec-mes')?.value)-1];
    const ano = document.getElementById('rec-ano')?.value;

    let corpo = '';
    sels.forEach(c => {
        const s = _recibosSelecoes[c.id];
        const nome = _recNome(c);
        let linhas = '';

        if (!s.apuracaoDiaria || !Array.isArray(s.apuracaoDiaria) || s.apuracaoDiaria.length === 0) {
            linhas = `<tr><td colspan="5" style="padding:15px;text-align:center;color:#ef4444;">Nenhuma apuração diária encontrada para este colaborador. Certifique-se de "Buscar Ponto (RHID)" antes.</td></tr>`;
        } else {
            linhas = s.apuracaoDiaria.map(d => {
                let dia = String(d.date || d.dateTimeStr || '').substring(0,10);
                if (dia.includes('-')) {
                    const p = dia.split('-');
                    if (p.length === 3) dia = `${p[2]}/${p[1]}/${p[0]}`;
                }
                
                const fmtMin = (m) => {
                    if (!m) return '0h';
                    return Math.floor(m/60) + 'h' + (m%60).toString().padStart(2,'0') + 'm';
                };

                const hrsTrab = fmtMin(d.totalHorasTrabalhadas);
                const hrsExt = fmtMin(d.horasExtrasCalculadas);
                const hrsFalta = fmtMin(d.horasFaltaAtraso);
                
                let status = '-';
                if (d.faltaDiaInteiro) status = 'FALTA';
                else if (d.isHoliday) status = 'FERIADO';
                else if (d.dsrConsideradoMinutos > 0 || (d.diasTrabalhados === 0 && d.horasUteis === 0)) status = 'DSR / FOLGA';
                else if (d.diasTrabalhados > 0) status = 'TRABALHADO';
                else if (d.idJustification) status = 'JUSTIFICADO';

                let marcacoesStr = '';
                if (d.listAfdtManutencao && Array.isArray(d.listAfdtManutencao) && d.listAfdtManutencao.length > 0) {
                    marcacoesStr = d.listAfdtManutencao.map(m => {
                        const h = Math.floor(m.hora/100).toString().padStart(2,'0');
                        const mn = (m.hora%100).toString().padStart(2,'0');
                        return h + ':' + mn;
                    }).join(' / ');
                } else if (d.marcacoes && Array.isArray(d.marcacoes)) {
                    marcacoesStr = d.marcacoes.map(m => m.hora || m.time || m).join(' / ');
                }

                return `
                <tr>
                  <td style="padding:6px;border:1px solid #ddd;text-align:center;">${dia}</td>
                  <td style="padding:6px;border:1px solid #ddd;">${status}</td>
                  <td style="padding:6px;border:1px solid #ddd;text-align:center;font-weight:600;color:#2563eb;">${marcacoesStr}</td>
                  <td style="padding:6px;border:1px solid #ddd;text-align:center;">${hrsTrab}</td>
                  <td style="padding:6px;border:1px solid #ddd;text-align:center;">${hrsExt}</td>
                  <td style="padding:6px;border:1px solid #ddd;text-align:center;">${hrsFalta}</td>
                </tr>`;
            }).join('');
        }

        corpo += `
        <div style="page-break-after:always;padding:20px;">
          <h2 style="margin:0 0 15px;color:#1e3a5f;">Conferência de Ponto - ${nome}</h2>
          <table style="width:100%;border-collapse:collapse;font-size:12px;">
            <thead>
              <tr style="background:#e8edf5;">
                <th style="padding:8px;border:1px solid #ddd;">Data</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:left;">Status / Situação</th>
                <th style="padding:8px;border:1px solid #ddd;">Apontamentos</th>
                <th style="padding:8px;border:1px solid #ddd;">Total Trabalhado</th>
                <th style="padding:8px;border:1px solid #ddd;">Horas Extras</th>
                <th style="padding:8px;border:1px solid #ddd;">Atraso/Falta</th>
              </tr>
            </thead>
            <tbody>${linhas}</tbody>
          </table>
          <div style="margin-top:15px;font-size:11px;color:#64748b;">Totais Resumidos: Trabalhados = ${s.diasTrabalhados}, Faltas = ${s.faltas}, Jantar = ${s.diasExtra}</div>
        </div>`;
    });

    const html = `<!DOCTYPE html><html><head><title>Conferência de Ponto</title>
      <style>
        body{font-family:Arial,sans-serif;font-size:12px;color:#111;margin:0;}
        @media print{.bar{display:none!important;}}
      </style>
      </head><body>
      <div class="bar" style="background:#1e3a5f;color:#fff;padding:12px 20px;display:flex;justify-content:space-between;align-items:center;">
        <span style="font-weight:bold;">Conferência de Apuração - ${mesNome}/${ano}</span>
        <button onclick="window.print()" style="background:#fff;border:none;padding:8px 16px;border-radius:4px;cursor:pointer;font-weight:bold;">🖨 Imprimir / Salvar PDF</button>
      </div>
      ${corpo}
      </body></html>`;

    const win = window.open('', '_blank', 'width=900,height=700');
    if (win) { win.document.write(html); win.document.close(); }
    else if (typeof Swal !== 'undefined') Swal.fire('Erro', 'Pop-up bloqueado.', 'warning');
};

// ─── Separador de corte removido ─────────────────────────────────────────────

// ─── Obter logo em base64 ─────────────────────────────────────────────────────
async function _recGetLogo() {
    try {
        const base = (typeof API_URL !== 'undefined' ? API_URL : '').replace('/api','');
        const res  = await fetch(`${base}/assets/logo-header.png`);
        if (!res.ok) return null;
        const blob = await res.blob();
        return new Promise(r => { const fr = new FileReader(); fr.onloadend = () => r(fr.result); fr.readAsDataURL(blob); });
    } catch { return null; }
}

// ─── Formatar moeda ───────────────────────────────────────────────────────────
function _recFmt(v) { return (parseFloat(v)||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}); }

// ─── Bloco HTML de recibo (Separado) ──────────────────────────────────────────
function _buildReciboBlock(tipo, colab, dados, mes, mesNome, ano, valorVR, logoB64) {
    const nome    = _recNome(colab);
    const logoHtml = logoB64
        ? `<img src="${logoB64}" style="width:100%;max-width:794px;display:block;" alt="America Rental">`
        : `<div style="background:#1e3a5f;padding:16px 32px;"><span style="color:#fff;font-size:1.3rem;font-weight:900;letter-spacing:1px;">AMERICA RENTAL</span></div>`;

    const dtrab     = dados.diasTrabalhados || 0;
    const dVR       = dados.diasVR != null ? dados.diasVR : dtrab;
    const faltas    = dados.faltas   || 0;
    const dExtra    = dados.diasExtra || 0;
    
    const mTransp = (colab.meio_transporte||'').toLowerCase();
    let valTransp = parseFloat(colab.valor_transporte) || 0;
    // Para VT, o valor cadastrado é de uma passagem, então dobra-se (ida e volta)
    if (_isVT(mTransp)) {
        valTransp = valTransp * 2;
    }

    let titulo = '', beneficio = '', linhas = '', totalFinal = 0, obs = '';

    if (tipo === 'VR') {
        titulo    = 'RECIBO DE VALE REFEIÇÃO';
        beneficio = 'Vale Refeição';
        const tVR     = dVR * valorVR;
        const tJantar = dExtra * valorVR;
        totalFinal = tVR + tJantar;
        linhas = `
<tr><td style="padding:7px 12px;border:1px solid #ddd;">Vale Refeição</td><td style="padding:7px 12px;border:1px solid #ddd;text-align:center;">${dVR}</td><td style="padding:7px 12px;border:1px solid #ddd;text-align:right;">R$&nbsp;${_recFmt(tVR)}</td></tr>
${dExtra>0?`<tr><td style="padding:7px 12px;border:1px solid #ddd;">Jantar</td><td style="padding:7px 12px;border:1px solid #ddd;text-align:center;">${dExtra}</td><td style="padding:7px 12px;border:1px solid #ddd;text-align:right;">R$&nbsp;${_recFmt(tJantar)}</td></tr>`:''}
<tr style="background:#1e3a5f;color:#fff;font-weight:700;"><td colspan="2" style="padding:9px 12px;border:1px solid #1e3a5f;">TOTAL A RECEBER</td><td style="padding:9px 12px;border:1px solid #1e3a5f;text-align:right;font-size:1.05rem;">R$&nbsp;${_recFmt(totalFinal)}</td></tr>`;

    } else if (tipo === 'VT') {
        titulo    = 'RECIBO DE VALE TRANSPORTE';
        beneficio = 'Vale Transporte';
        totalFinal = dtrab * valTransp;
        linhas = `
<tr><td style="padding:7px 12px;border:1px solid #ddd;">Meio de Transporte</td><td style="padding:7px 12px;border:1px solid #ddd;text-align:center;">—</td><td style="padding:7px 12px;border:1px solid #ddd;text-align:right;">${colab.meio_transporte||'—'}</td></tr>
<tr><td style="padding:7px 12px;border:1px solid #ddd;">Dias Trabalhados</td><td style="padding:7px 12px;border:1px solid #ddd;text-align:center;">${dtrab}</td><td style="padding:7px 12px;border:1px solid #ddd;text-align:right;">${dtrab} dias</td></tr>
<tr><td style="padding:7px 12px;border:1px solid #ddd;">Valor por Dia</td><td style="padding:7px 12px;border:1px solid #ddd;text-align:center;">—</td><td style="padding:7px 12px;border:1px solid #ddd;text-align:right;">R$&nbsp;${_recFmt(valTransp)}</td></tr>
<tr style="background:#1e3a5f;color:#fff;font-weight:700;"><td colspan="2" style="padding:9px 12px;border:1px solid #1e3a5f;">TOTAL A RECEBER</td><td style="padding:9px 12px;border:1px solid #1e3a5f;text-align:right;font-size:1.05rem;">R$&nbsp;${_recFmt(totalFinal)}</td></tr>`;
        obs = 'Conforme Decreto nº 95.247/87. O desconto de até 6% do salário base pode ser aplicado conforme legislação vigente.';

    } else if (tipo === 'VC') {
        titulo    = 'RECIBO DE VALE COMBUSTÍVEL';
        beneficio = 'Vale Combustível';
        const totalDiasRef = dtrab + faltas;
        const desc = totalDiasRef > 0 ? (valTransp / totalDiasRef * faltas) : 0;
        totalFinal = Math.max(0, valTransp - desc);
        linhas = `
<tr><td style="padding:7px 12px;border:1px solid #ddd;">Valor Integral Mensal</td><td style="padding:7px 12px;border:1px solid #ddd;text-align:center;">—</td><td style="padding:7px 12px;border:1px solid #ddd;text-align:right;">R$&nbsp;${_recFmt(valTransp)}</td></tr>
<tr><td style="padding:7px 12px;border:1px solid #ddd;">Dias Trabalhados</td><td style="padding:7px 12px;border:1px solid #ddd;text-align:center;">${dtrab}</td><td style="padding:7px 12px;border:1px solid #ddd;text-align:right;">${dtrab} dias</td></tr>
<tr><td style="padding:7px 12px;border:1px solid #ddd;">Descontos</td><td style="padding:7px 12px;border:1px solid #ddd;text-align:center;">${faltas}</td><td style="padding:7px 12px;border:1px solid #ddd;text-align:right;color:#ef4444;">-R$&nbsp;${_recFmt(desc)}</td></tr>
<tr style="background:#1e3a5f;color:#fff;font-weight:700;"><td colspan="2" style="padding:9px 12px;border:1px solid #1e3a5f;">TOTAL A RECEBER</td><td style="padding:9px 12px;border:1px solid #1e3a5f;text-align:right;font-size:1.05rem;">R$&nbsp;${_recFmt(totalFinal)}</td></tr>`;
        obs = '';
    }

    const via = () => `
<div class="via" style="padding:24px 32px;page-break-after:always;">
  ${logoHtml}
  <div style="padding-top:14px;">
    <table style="width:100%;border-collapse:collapse;font-size:11px;border:1.5px solid #1e3a5f;margin-bottom:0;">
      <tr style="background:#1e3a5f;color:#fff;">
        <td colspan="4" style="padding:6px 12px;font-weight:700;font-size:10.5px;letter-spacing:.5px;text-transform:uppercase;">
          Dados do Colaborador
        </td>
      </tr>
      <tr style="background:#f8fafc;">
        <td style="padding:6px 10px;font-weight:600;color:#475569;width:16%;font-size:10.5px;">Empresa:</td>
        <td style="padding:6px 10px;font-weight:700;font-size:11px;">AMERICA RENTAL EQUIPAMENTOS LTDA</td>
        <td style="padding:6px 10px;font-weight:600;color:#475569;width:10%;font-size:10.5px;">CNPJ:</td>
        <td style="padding:6px 10px;font-size:11px;">03.434.448/0001-01</td>
      </tr>
      <tr>
        <td style="padding:6px 10px;font-weight:600;color:#475569;font-size:10.5px;">Colaborador:</td>
        <td style="padding:6px 10px;font-weight:700;font-size:11px;">${nome}</td>
        <td style="padding:6px 10px;font-weight:600;color:#475569;font-size:10.5px;">CPF:</td>
        <td style="padding:6px 10px;font-size:11px;">${colab.cpf||'—'}</td>
      </tr>
      <tr style="background:#f8fafc;">
        <td style="padding:6px 10px;font-weight:600;color:#475569;font-size:10.5px;">Cargo:</td>
        <td style="padding:6px 10px;font-size:11px;">${colab.cargo||'—'}</td>
        <td style="padding:6px 10px;font-weight:600;color:#475569;font-size:10.5px;">Departamento:</td>
        <td style="padding:6px 10px;font-size:11px;">${colab.departamento||'—'}</td>
      </tr>
      <tr>
        <td style="padding:6px 10px;font-weight:600;color:#475569;font-size:10.5px;">Referência:</td>
        <td style="padding:6px 10px;font-weight:700;font-size:11px;">${mesNome.toUpperCase()} / ${ano}</td>
        <td style="padding:6px 10px;font-weight:600;color:#475569;font-size:10.5px;">Matrícula:</td>
        <td style="padding:6px 10px;font-size:11px;">${colab.matricula_esocial||colab.numero_registro||colab.id||'—'}</td>
      </tr>
    </table>

    <div style="text-align:center;background:#1e3a5f;color:#fff;padding:9px;font-size:13px;font-weight:700;letter-spacing:1.5px;margin:10px 0;">
      ${titulo}
    </div>

    <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:10px;">
      <thead>
        <tr style="background:#e8edf5;">
          <th style="padding:7px 12px;border:1px solid #ddd;text-align:left;font-size:10.5px;text-transform:uppercase;letter-spacing:.04em;color:#374151;">Descrição</th>
          <th style="padding:7px 12px;border:1px solid #ddd;text-align:center;font-size:10.5px;text-transform:uppercase;letter-spacing:.04em;color:#374151;width:100px;">Quant.</th>
          <th style="padding:7px 12px;border:1px solid #ddd;text-align:right;font-size:10.5px;text-transform:uppercase;letter-spacing:.04em;color:#374151;width:175px;">Valor</th>
        </tr>
      </thead>
      <tbody>${linhas}</tbody>
    </table>

    ${obs?`<div style="font-size:10px;color:#64748b;background:#f8fafc;border-left:3px solid #94a3b8;padding:5px 10px;margin-bottom:10px;">⚠ ${obs}</div>`:''}
  </div>
</div>`;

    return `<div style="max-width:794px;margin:0 auto;">${via()}</div>`;
}

// ─── Geração Individual (usada pelos Geradores) ───────────────────────────────
window.gerarReciboIndividual = async function (tipo, colabId, mes, ano, valorVRParam) {
    const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
    let colab = (_recibosAllColabs||[]).find(c => String(c.id)===String(colabId));
    if (!colab) {
        try {
            const r = await fetch(`${API_URL}/colaboradores/${colabId}`, { headers: { 'Authorization': `Bearer ${token}` } });
            colab = await r.json();
        } catch { alert('Colaborador não encontrado.'); return; }
    }
    const mesNome = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][mes-1];
    const valorVR = valorVRParam || 35.00;
    const logo    = await _recGetLogo();
    // Dados vazios — usuário verá 0 e poderá imprimir após conferir
    const dados   = { diasTrabalhados: 0, diasVR: 0, faltas: 0, diasExtra: 0 };
    const benef   = tipo==='VR'?'Vale Refeição':tipo==='VT'?'Vale Transporte':'Vale Combustível';
    const nome    = _recNome(colab);

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<title>${benef} — ${nome}</title>
<style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:Arial,Helvetica,sans-serif;font-size:12px;background:#fff;}
.bar{display:flex;}.via{page-break-inside:avoid;}@media print{.bar{display:none!important;}}</style>
</head><body>
<div class="bar" style="background:#1e3a5f;color:#fff;padding:10px 24px;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:999;">
  <span style="font-weight:700;">${benef} — ${nome} — ${mesNome}/${ano}</span>
  <button onclick="window.print()" style="background:#fff;color:#1e3a5f;border:none;padding:7px 20px;border-radius:6px;font-weight:700;cursor:pointer;">🖨 Imprimir</button>
</div>
${_buildReciboBlock(tipo, colab, dados, mes, mesNome, ano, valorVR, logo)}
</body></html>`;

    const win = window.open('', '_blank', 'width=880,height=760');
    if (win) { win.document.write(html); win.document.close(); }
};
