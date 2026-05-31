// ─────────────────────────────────────────────────────────────────────────────
// recibos.js — Tela de Recibos de Benefícios em Massa (VT, VC, VR)
// v2.0 — listagem com filtros, seleção em massa, integração RHID, PDF em massa
// ─────────────────────────────────────────────────────────────────────────────

// ─── Estado Global ────────────────────────────────────────────────────────────
let _recibosAllColabs   = [];
let _recibosFiltrados   = [];
let _recibosDeptTipoMap = {}; // { 'Logística': 'Operacional', 'RH': 'Administrativo' }
let _recibosSelecoes    = {}; // { id: { selecionado, diasTrabalhados, faltas, diasExtra, pontoStatus } }

// ─── Init da view ─────────────────────────────────────────────────────────────
window.initRecibosView = async function () {
    const container = document.getElementById('recibos-container');
    if (!container) return;

    // Reset
    _recibosAllColabs = []; _recibosFiltrados = [];
    _recibosDeptTipoMap = {}; _recibosSelecoes = {};

    const hoje   = new Date();
    const mesAt  = hoje.getMonth() + 1;
    const anoAt  = hoje.getFullYear();

    container.innerHTML = _buildRecibosLayout(mesAt, anoAt);
    _ensureSpinCss();

    // Dados em paralelo
    await Promise.all([_loadDeptsTipo(), _loadColabs()]);
};

// ─── CSS de animação spin ─────────────────────────────────────────────────────
function _ensureSpinCss() {
    if (document.getElementById('rec-spin-css')) return;
    const s = document.createElement('style');
    s.id = 'rec-spin-css';
    s.textContent = '@keyframes rec-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}';
    document.head.appendChild(s);
}

// ─── HTML da tela principal ───────────────────────────────────────────────────
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
        <p style="margin:4px 0 0;color:#64748b;font-size:.88rem;">Geração em massa — VR para todos · VT ou VC conforme cadastro do colaborador.</p>
      </div>
    </div>
    <button id="btn-gerar-massa" onclick="window.gerarRecibosEmMassa()"
      style="display:flex;align-items:center;gap:8px;padding:.65rem 1.4rem;background:linear-gradient(135deg,#1e3a5f,#2563eb);color:#fff;border:none;border-radius:10px;font-size:.95rem;font-weight:700;cursor:pointer;box-shadow:0 2px 10px rgba(37,99,235,.35);">
      <i class="ph ph-printer" style="font-size:1.1rem;"></i> Gerar Recibos Selecionados
    </button>
  </div>

  <!-- PERÍODO + VR -->
  <div class="card" style="padding:1.25rem 1.5rem;margin-bottom:1rem;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,.06);">
    <div style="display:flex;gap:1.5rem;align-items:flex-end;flex-wrap:wrap;">
      <div>
        <label style="font-size:.79rem;font-weight:600;color:#475569;display:block;margin-bottom:.3rem;"><i class="ph ph-calendar-blank" style="color:#2563eb;"></i> Mês</label>
        <select id="rec-mes" onchange="window._recAtualizarDiasUteis()"
          style="padding:.54rem .85rem;border:1px solid #cbd5e1;border-radius:8px;font-size:.93rem;background:#fff;cursor:pointer;">
          ${MESES.map((m,i)=>`<option value="${i+1}" ${i+1===mesAt?'selected':''}>${m}</option>`).join('')}
        </select>
      </div>
      <div>
        <label style="font-size:.79rem;font-weight:600;color:#475569;display:block;margin-bottom:.3rem;">Ano</label>
        <select id="rec-ano" onchange="window._recAtualizarDiasUteis()"
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
          <span style="font-size:.75rem;color:#94a3b8;">padrão R$&nbsp;35,00</span>
        </div>
      </div>
      <div style="width:1px;height:42px;background:#e2e8f0;align-self:flex-end;"></div>
      <div>
        <label style="font-size:.79rem;font-weight:600;color:#475569;display:block;margin-bottom:.3rem;">
          <i class="ph ph-calendar-check" style="color:#2563eb;"></i> Dias úteis do mês
        </label>
        <div style="display:flex;align-items:center;gap:8px;">
          <input type="number" id="rec-dias-uteis" min="1" max="31"
            style="width:68px;padding:.54rem .6rem;border:1px solid #cbd5e1;border-radius:8px;font-size:.95rem;font-weight:700;text-align:center;"
            onchange="window._recAplicarDiasUteisGlobal()">
          <span style="font-size:.75rem;color:#94a3b8;">seg–sáb</span>
        </div>
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
      <div style="flex:1;min-width:135px;">
        <label style="font-size:.77rem;font-weight:600;color:#475569;display:block;margin-bottom:.25rem;">Tipo</label>
        <select id="rec-f-tipo" onchange="window.aplicarFiltrosRecibos()"
          style="width:100%;padding:.46rem .65rem;border:1px solid #e2e8f0;border-radius:8px;font-size:.88rem;background:#fff;">
          <option value="">Todos</option>
          <option value="Operacional">Operacional</option>
          <option value="Administrativo">Administrativo</option>
        </select>
      </div>
      <div style="flex:1;min-width:130px;">
        <label style="font-size:.77rem;font-weight:600;color:#475569;display:block;margin-bottom:.25rem;">Transporte</label>
        <select id="rec-f-transp" onchange="window.aplicarFiltrosRecibos()"
          style="width:100%;padding:.46rem .65rem;border:1px solid #e2e8f0;border-radius:8px;font-size:.88rem;background:#fff;">
          <option value="">Todos</option>
          <option value="vt">VT</option>
          <option value="vc">VC</option>
          <option value="proprio">Próprio/A pé</option>
        </select>
      </div>
      <div>
        <label style="font-size:.77rem;font-weight:600;color:#475569;display:block;margin-bottom:.25rem;">&nbsp;</label>
        <button onclick="window._recBuscarPontoSelecionados()"
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
    <div style="overflow-x:auto;">
      <table style="width:100%;border-collapse:collapse;font-size:.85rem;">
        <thead>
          <tr style="background:#f1f5f9;border-bottom:2px solid #e2e8f0;">
            <th style="padding:.7rem .5rem;width:36px;"></th>
            <th style="padding:.7rem 1rem;text-align:left;color:#475569;font-weight:600;font-size:.76rem;text-transform:uppercase;letter-spacing:.04em;">Colaborador</th>
            <th style="padding:.7rem 1rem;text-align:left;color:#475569;font-weight:600;font-size:.76rem;text-transform:uppercase;letter-spacing:.04em;">Cargo / Departamento</th>
            <th style="padding:.7rem .75rem;text-align:center;color:#475569;font-weight:600;font-size:.76rem;text-transform:uppercase;letter-spacing:.04em;">Tipo</th>
            <th style="padding:.7rem .75rem;text-align:center;color:#475569;font-weight:600;font-size:.76rem;text-transform:uppercase;letter-spacing:.04em;">Transporte</th>
            <th style="padding:.7rem .5rem;text-align:center;color:#475569;font-weight:600;font-size:.76rem;text-transform:uppercase;letter-spacing:.04em;">Dias&nbsp;Trab.</th>
            <th style="padding:.7rem .5rem;text-align:center;color:#475569;font-weight:600;font-size:.76rem;text-transform:uppercase;letter-spacing:.04em;">Faltas</th>
            <th style="padding:.7rem .5rem;text-align:center;color:#475569;font-weight:600;font-size:.76rem;text-transform:uppercase;letter-spacing:.04em;">Ponto</th>
          </tr>
        </thead>
        <tbody id="rec-tbody">
          <tr><td colspan="8" style="text-align:center;padding:3rem;color:#94a3b8;">
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
      <i class="ph ph-warning" style="color:#f59e0b;"></i> Não encontrado no RHID
    </span>
    <span style="font-size:.77rem;color:#64748b;display:flex;align-items:center;gap:5px;">
      <i class="ph ph-minus-circle" style="color:#cbd5e1;"></i> Ponto não buscado (valor manual)
    </span>
  </div>
</div>`;
}

// ─── Carregar departamentos → mapa nome→tipo ──────────────────────────────────
async function _loadDeptsTipo() {
    try {
        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        const res = await fetch(`${API_URL}/departamentos`, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.departamentos || []);
        _recibosDeptTipoMap = {};
        list.forEach(d => { if (d.nome && d.tipo) _recibosDeptTipoMap[d.nome.trim()] = d.tipo.trim(); });
    } catch (e) { console.warn('[Recibos] Erro ao carregar departamentos:', e.message); }
}

// ─── Carregar colaboradores ativos ────────────────────────────────────────────
async function _loadColabs() {
    try {
        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        const res = await fetch(`${API_URL}/colaboradores?status=Ativo&limit=2000`, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json();
        _recibosAllColabs = Array.isArray(data) ? data : (data.colaboradores || []);

        const mes = parseInt(document.getElementById('rec-mes')?.value) || (new Date().getMonth() + 1);
        const ano = parseInt(document.getElementById('rec-ano')?.value) || new Date().getFullYear();
        const du  = _calcDiasUteis(mes, ano);

        const duEl = document.getElementById('rec-dias-uteis');
        if (duEl) duEl.value = du;

        _recibosSelecoes = {};
        _recibosAllColabs.forEach(c => {
            _recibosSelecoes[c.id] = { selecionado: false, diasTrabalhados: du, faltas: 0, diasExtra: 0, pontoStatus: null };
        });

        _popularFiltros();
        _filtrarERendar();

    } catch (e) {
        console.error('[Recibos] Erro:', e);
        const tbody = document.getElementById('rec-tbody');
        if (tbody) tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:2rem;color:#ef4444;">
            <i class="ph ph-warning-circle" style="font-size:1.5rem;display:block;margin-bottom:.5rem;"></i>
            Erro ao carregar colaboradores: ${e.message}</td></tr>`;
    }
}

// ─── Popular dropdowns de filtro ──────────────────────────────────────────────
function _popularFiltros() {
    const depts  = [...new Set(_recibosAllColabs.map(c => c.departamento).filter(Boolean))].sort();
    const cargos = [...new Set(_recibosAllColabs.map(c => c.cargo).filter(Boolean))].sort();

    const dSel = document.getElementById('rec-f-dept');
    if (dSel) dSel.innerHTML = '<option value="">Todos os Departamentos</option>' + depts.map(d => `<option value="${d}">${d}</option>`).join('');

    const cSel = document.getElementById('rec-f-cargo');
    if (cSel) cSel.innerHTML = '<option value="">Todos os Cargos</option>' + cargos.map(c => `<option value="${c}">${c}</option>`).join('');
}

// ─── Atualizar dias úteis ao trocar mês/ano ───────────────────────────────────
window._recAtualizarDiasUteis = function () {
    const mes = parseInt(document.getElementById('rec-mes')?.value);
    const ano = parseInt(document.getElementById('rec-ano')?.value);
    if (!mes || !ano) return;
    const du = _calcDiasUteis(mes, ano);
    const el = document.getElementById('rec-dias-uteis');
    if (el) el.value = du;
    window._recAplicarDiasUteisGlobal();
};

// ─── Propagar dias úteis para quem não tem ponto RHID ────────────────────────
window._recAplicarDiasUteisGlobal = function () {
    const du = parseInt(document.getElementById('rec-dias-uteis')?.value) || 26;
    _recibosAllColabs.forEach(c => {
        const s = _recibosSelecoes[c.id];
        if (s && s.pontoStatus !== 'ok') { s.diasTrabalhados = du; s.faltas = 0; }
    });
    _renderTabela();
};

// ─── Filtros (chamado externamente) ──────────────────────────────────────────
window.aplicarFiltrosRecibos = function () { _filtrarERendar(); };

function _filtrarERendar() {
    const nome   = (document.getElementById('rec-f-nome')?.value || '').toLowerCase().trim();
    const dept   = document.getElementById('rec-f-dept')?.value  || '';
    const cargo  = document.getElementById('rec-f-cargo')?.value || '';
    const tipo   = document.getElementById('rec-f-tipo')?.value  || '';
    const transp = document.getElementById('rec-f-transp')?.value || '';

    _recibosFiltrados = _recibosAllColabs.filter(c => {
        if (nome && !(c.nome || '').toLowerCase().includes(nome)) return false;
        if (dept  && c.departamento !== dept)  return false;
        if (cargo && c.cargo        !== cargo) return false;
        if (tipo) {
            const t = _recibosDeptTipoMap[(c.departamento || '').trim()] || 'Administrativo';
            if (t !== tipo) return false;
        }
        if (transp) {
            const m = (c.meio_transporte || '').toLowerCase();
            if (transp === 'vt'     && !_isVT(m))               return false;
            if (transp === 'vc'     && !_isVC(m))               return false;
            if (transp === 'proprio' && (_isVT(m) || _isVC(m))) return false;
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
            Nenhum colaborador com os filtros selecionados.</td></tr>`;
        _atualizarContador(); return;
    }

    tbody.innerHTML = _recibosFiltrados.map(c => {
        const s  = _recibosSelecoes[c.id] || { selecionado: false, diasTrabalhados: 26, faltas: 0, pontoStatus: null };
        const tipo = _recibosDeptTipoMap[(c.departamento || '').trim()] || '';
        const tipoBadge = tipo === 'Operacional'
            ? `<span style="font-size:.72rem;background:#fef3c7;color:#92400e;padding:2px 9px;border-radius:10px;font-weight:600;">OP</span>`
            : tipo === 'Administrativo'
            ? `<span style="font-size:.72rem;background:#eff6ff;color:#1d4ed8;padding:2px 9px;border-radius:10px;font-weight:600;">ADM</span>`
            : `<span style="font-size:.72rem;color:#94a3b8;">—</span>`;

        const m = (c.meio_transporte || '').toLowerCase();
        const transpBadge = _isVT(m)
            ? `<span style="background:#eff6ff;color:#1d4ed8;padding:3px 10px;border-radius:10px;font-size:.78rem;font-weight:600;">VT</span>`
            : _isVC(m)
            ? `<span style="background:#fffbeb;color:#d97706;padding:3px 10px;border-radius:10px;font-size:.78rem;font-weight:600;">VC</span>`
            : `<span style="color:#94a3b8;font-size:.8rem;">Próprio/A pé</span>`;

        const pontoIcon = s.pontoStatus === 'ok'
            ? `<i class="ph ph-check-circle" style="color:#10b981;font-size:1.1rem;" title="Importado do RHID"></i>`
            : s.pontoStatus === 'erro'
            ? `<i class="ph ph-warning" style="color:#f59e0b;font-size:1.1rem;" title="Não encontrado no RHID"></i>`
            : `<i class="ph ph-minus-circle" style="color:#cbd5e1;font-size:1.1rem;" title="Ponto não buscado"></i>`;

        const bg = s.selecionado ? '#f0f9ff' : '#fff';

        return `<tr id="rec-row-${c.id}"
            style="border-bottom:1px solid #f1f5f9;background:${bg};transition:background .12s;"
            onmouseover="if(!_recibosSelecoes[${c.id}]?.selecionado)this.style.background='#f8fafc'"
            onmouseout="this.style.background=_recibosSelecoes[${c.id}]?.selecionado?'#f0f9ff':'#fff'">
          <td style="padding:.55rem .5rem;text-align:center;">
            <input type="checkbox" id="rec-cb-${c.id}" data-id="${c.id}" ${s.selecionado?'checked':''}
              style="width:16px;height:16px;accent-color:#2563eb;cursor:pointer;"
              onchange="window.toggleReciboColab(${c.id},this.checked)">
          </td>
          <td style="padding:.55rem 1rem;">
            <div style="font-weight:600;color:#1e293b;font-size:.88rem;">${c.nome}</div>
            <div style="font-size:.74rem;color:#94a3b8;">CPF: ${c.cpf || '—'}</div>
          </td>
          <td style="padding:.55rem 1rem;">
            <div style="color:#475569;font-size:.85rem;">${c.cargo || '—'}</div>
            <div style="font-size:.74rem;color:#94a3b8;">${c.departamento || '—'}</div>
          </td>
          <td style="padding:.55rem .75rem;text-align:center;">${tipoBadge}</td>
          <td style="padding:.55rem .75rem;text-align:center;">${transpBadge}</td>
          <td style="padding:.45rem .4rem;text-align:center;">
            <input type="number" min="0" max="31" value="${s.diasTrabalhados}"
              style="width:58px;padding:.3rem .35rem;border:1px solid #e2e8f0;border-radius:6px;text-align:center;font-size:.88rem;font-weight:600;color:#1e293b;"
              onchange="window.atualizarDadosReciboColab(${c.id},'diasTrabalhados',this.value)">
          </td>
          <td style="padding:.45rem .4rem;text-align:center;">
            <input type="number" min="0" max="31" value="${s.faltas}"
              style="width:52px;padding:.3rem .35rem;border:1px solid #e2e8f0;border-radius:6px;text-align:center;font-size:.88rem;font-weight:600;color:#ef4444;"
              onchange="window.atualizarDadosReciboColab(${c.id},'faltas',this.value)">
          </td>
          <td style="padding:.55rem .4rem;text-align:center;">${pontoIcon}</td>
        </tr>`;
    }).join('');

    _atualizarContador();
}

// ─── Toggle individual ────────────────────────────────────────────────────────
window.toggleReciboColab = function (id, checked) {
    if (!_recibosSelecoes[id]) return;
    _recibosSelecoes[id].selecionado = checked;
    const row = document.getElementById(`rec-row-${id}`);
    if (row) row.style.background = checked ? '#f0f9ff' : '#fff';
    _atualizarContador();
    // Sincronizar "selecionar todos"
    const sa = document.getElementById('rec-select-all');
    if (sa) sa.checked = _recibosFiltrados.length > 0 && _recibosFiltrados.every(c => _recibosSelecoes[c.id]?.selecionado);
};

// ─── Toggle selecionar todos ──────────────────────────────────────────────────
window.toggleSelectAllRecibos = function (checked) {
    _recibosFiltrados.forEach(c => {
        if (!_recibosSelecoes[c.id]) return;
        _recibosSelecoes[c.id].selecionado = checked;
        const cb  = document.getElementById(`rec-cb-${c.id}`);  if (cb)  cb.checked = checked;
        const row = document.getElementById(`rec-row-${c.id}`); if (row) row.style.background = checked ? '#f0f9ff' : '#fff';
    });
    _atualizarContador();
};

// ─── Atualizar dado individual (dias / faltas) ────────────────────────────────
window.atualizarDadosReciboColab = function (id, campo, valor) {
    if (!_recibosSelecoes[id]) return;
    _recibosSelecoes[id][campo] = Math.max(0, parseInt(valor) || 0);
};

// ─── Contador de selecionados ─────────────────────────────────────────────────
function _atualizarContador() {
    const n  = Object.values(_recibosSelecoes).filter(s => s.selecionado).length;
    const el = document.getElementById('rec-contador');
    if (!el) return;
    el.textContent = n === 0 ? '0 selecionados' : `${n} colaborador${n > 1 ? 'es' : ''} selecionado${n > 1 ? 's' : ''}`;
    el.style.color      = n > 0 ? '#2563eb' : '#64748b';
    el.style.fontWeight = n > 0 ? '700' : '500';
}

// ─── Dias úteis (seg–sáb, sem domingos) ──────────────────────────────────────
function _calcDiasUteis(mes, ano) {
    const dm = new Date(ano, mes, 0).getDate();
    let n = 0;
    for (let d = 1; d <= dm; d++) if (new Date(ano, mes - 1, d).getDay() !== 0) n++;
    return n;
}

// ─── Buscar ponto RHID em lote para selecionados ─────────────────────────────
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

    if (badge) {
        badge.style.cssText = 'display:inline-flex;align-items:center;gap:5px;font-size:.8rem;font-weight:600;color:#1d4ed8;';
        badge.innerHTML = `<i class="ph ph-spinner" style="animation:rec-spin 1s linear infinite;"></i> Buscando ${sels.length} ponto${sels.length > 1 ? 's' : ''}...`;
    }

    let ok = 0, erro = 0;

    for (const c of sels) {
        const cpf = (c.cpf || '').replace(/\D/g, '');
        if (!cpf || cpf.length < 8) { _recibosSelecoes[c.id].pontoStatus = 'erro'; erro++; continue; }
        try {
            const res  = await fetch(`${API_URL}/diretoria/controlid/ponto-colaborador?cpf=${encodeURIComponent(cpf)}&mes=${mes}&ano=${ano}`,
                { headers: { 'Authorization': `Bearer ${token}` } });
            const data = await res.json();
            if (res.ok && data.success && !data.aviso) {
                const s = _recibosSelecoes[c.id];
                if (data.diasTrabalhados != null) s.diasTrabalhados = data.diasTrabalhados;
                if (data.faltas          != null) s.faltas          = data.faltas;
                if (data.diasComHoraExtra != null) s.diasExtra      = data.diasComHoraExtra;
                s.pontoStatus = 'ok'; ok++;
            } else { _recibosSelecoes[c.id].pontoStatus = 'erro'; erro++; }
        } catch { _recibosSelecoes[c.id].pontoStatus = 'erro'; erro++; }
    }

    _renderTabela();

    if (badge) {
        badge.innerHTML =
            (ok   > 0 ? `<span style="color:#059669;font-weight:600;"><i class="ph ph-check-circle"></i> ${ok} importado${ok>1?'s':''}</span>` : '') +
            (erro > 0 ? ` <span style="color:#f59e0b;font-weight:600;"><i class="ph ph-warning"></i> ${erro} sem ponto</span>` : '');
    }
};

// ─── Geração em massa ─────────────────────────────────────────────────────────
window.gerarRecibosEmMassa = async function () {
    const sels = _recibosAllColabs.filter(c => _recibosSelecoes[c.id]?.selecionado);
    if (!sels.length) {
        if (typeof Swal !== 'undefined') Swal.fire('Atenção', 'Selecione ao menos um colaborador para gerar os recibos.', 'warning');
        return;
    }

    const mes       = parseInt(document.getElementById('rec-mes')?.value);
    const ano       = parseInt(document.getElementById('rec-ano')?.value);
    const valorVR   = parseFloat(document.getElementById('rec-valor-vr')?.value) || 35.00;
    const diasUteis = parseInt(document.getElementById('rec-dias-uteis')?.value) || _calcDiasUteis(mes, ano);
    const mesNome   = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][mes - 1];

    // Loading no botão
    const btn = document.getElementById('btn-gerar-massa');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ph ph-spinner" style="animation:rec-spin 1s linear infinite;"></i> Gerando...'; }

    const logo = await _recGetLogo();

    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ph ph-printer"></i> Gerar Recibos Selecionados'; }

    let corpo = '';
    sels.forEach((c, idx) => {
        if (idx > 0) corpo += '<div class="pb"></div>';
        const s  = _recibosSelecoes[c.id] || { diasTrabalhados: diasUteis, faltas: 0, diasExtra: 0 };
        const m  = (c.meio_transporte || '').toLowerCase();

        // VR — sempre
        corpo += _buildReciboBlock('VR', c, s, mes, mesNome, ano, diasUteis, valorVR, logo);

        // VT ou VC — conforme cadastro
        if (_isVT(m)) { corpo += _corteLine(); corpo += _buildReciboBlock('VT', c, s, mes, mesNome, ano, diasUteis, valorVR, logo); }
        if (_isVC(m)) { corpo += _corteLine(); corpo += _buildReciboBlock('VC', c, s, mes, mesNome, ano, diasUteis, valorVR, logo); }
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

// ─── Separador de corte entre tipos ──────────────────────────────────────────
function _corteLine() {
    return `<div style="border-top:2px dashed #94a3b8;margin:0 32px;position:relative;padding:6px 0;">
      <span style="position:absolute;left:50%;transform:translateX(-50%);background:#fff;padding:0 14px;font-size:.68rem;color:#94a3b8;top:-7px;">✂ Cortar aqui</span>
    </div>`;
}

// ─── Obter logo em base64 ─────────────────────────────────────────────────────
async function _recGetLogo() {
    try {
        const base = (typeof API_URL !== 'undefined' ? API_URL : '').replace('/api', '');
        const res  = await fetch(`${base}/assets/logo-header.png`);
        if (!res.ok) return null;
        const blob = await res.blob();
        return new Promise(r => { const fr = new FileReader(); fr.onloadend = () => r(fr.result); fr.readAsDataURL(blob); });
    } catch { return null; }
}

// ─── Formatar moeda ───────────────────────────────────────────────────────────
function _recFmt(v) { return (parseFloat(v)||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}); }

// ─── Montar bloco HTML de um recibo (2 vias) ─────────────────────────────────
function _buildReciboBlock(tipo, colab, dados, mes, mesNome, ano, diasUteis, valorVR, logoB64) {
    const hoje    = new Date();
    const dataHj  = `${String(hoje.getDate()).padStart(2,'0')}/${String(hoje.getMonth()+1).padStart(2,'0')}/${hoje.getFullYear()}`;
    const logoHtml = logoB64
        ? `<img src="${logoB64}" style="width:100%;max-width:794px;display:block;" alt="America Rental">`
        : `<div style="background:#1e3a5f;padding:16px 32px;"><span style="color:#fff;font-size:1.3rem;font-weight:900;letter-spacing:1px;">AMERICA RENTAL</span></div>`;

    const dtrab  = dados.diasTrabalhados || 0;
    const faltas = dados.faltas   || 0;
    const dExtra = dados.diasExtra || 0;
    const valTransp = parseFloat(colab.valor_transporte) || 0;

    let titulo = '', beneficio = '', linhas = '', totalFinal = 0, obs = '';

    if (tipo === 'VR') {
        titulo   = 'RECIBO DE VALE REFEIÇÃO';
        beneficio = 'Vale Refeição';
        const tVR = dtrab * valorVR;
        const tJantar = dExtra * valorVR;
        totalFinal = tVR + tJantar;
        linhas = `
<tr><td style="padding:7px 12px;border:1px solid #ddd;">Dias Trabalhados</td><td style="padding:7px 12px;border:1px solid #ddd;text-align:right;">${dtrab} dias</td></tr>
<tr><td style="padding:7px 12px;border:1px solid #ddd;">Vale Refeição (${dtrab} × R$ ${_recFmt(valorVR)})</td><td style="padding:7px 12px;border:1px solid #ddd;text-align:right;">R$ ${_recFmt(tVR)}</td></tr>
${dExtra > 0 ? `<tr><td style="padding:7px 12px;border:1px solid #ddd;">Jantar — dias c/ ≥3h extra (${dExtra} × R$ ${_recFmt(valorVR)})</td><td style="padding:7px 12px;border:1px solid #ddd;text-align:right;">R$ ${_recFmt(tJantar)}</td></tr>` : ''}
<tr style="background:#1e3a5f;color:#fff;font-weight:700;"><td style="padding:9px 12px;border:1px solid #1e3a5f;">TOTAL A RECEBER</td><td style="padding:9px 12px;border:1px solid #1e3a5f;text-align:right;font-size:1.05rem;">R$ ${_recFmt(totalFinal)}</td></tr>`;

    } else if (tipo === 'VT') {
        titulo   = 'RECIBO DE VALE TRANSPORTE';
        beneficio = 'Vale Transporte';
        totalFinal = dtrab * valTransp;
        linhas = `
<tr><td style="padding:7px 12px;border:1px solid #ddd;">Meio de Transporte</td><td style="padding:7px 12px;border:1px solid #ddd;text-align:right;">${colab.meio_transporte||'—'}</td></tr>
<tr><td style="padding:7px 12px;border:1px solid #ddd;">Dias Trabalhados</td><td style="padding:7px 12px;border:1px solid #ddd;text-align:right;">${dtrab} dias</td></tr>
<tr><td style="padding:7px 12px;border:1px solid #ddd;">Valor por Dia de Trabalho</td><td style="padding:7px 12px;border:1px solid #ddd;text-align:right;">R$ ${_recFmt(valTransp)}</td></tr>
<tr style="background:#1e3a5f;color:#fff;font-weight:700;"><td style="padding:9px 12px;border:1px solid #1e3a5f;">TOTAL A RECEBER</td><td style="padding:9px 12px;border:1px solid #1e3a5f;text-align:right;font-size:1.05rem;">R$ ${_recFmt(totalFinal)}</td></tr>`;
        obs = 'Conforme Decreto nº 95.247/87. O desconto de até 6% do salário base pode ser aplicado conforme legislação vigente.';

    } else if (tipo === 'VC') {
        titulo   = 'RECIBO DE VALE COMBUSTÍVEL';
        beneficio = 'Vale Combustível';
        const desc = diasUteis > 0 ? (valTransp / diasUteis * faltas) : 0;
        totalFinal = Math.max(0, valTransp - desc);
        linhas = `
<tr><td style="padding:7px 12px;border:1px solid #ddd;">Valor Integral do Benefício</td><td style="padding:7px 12px;border:1px solid #ddd;text-align:right;">R$ ${_recFmt(valTransp)}</td></tr>
<tr><td style="padding:7px 12px;border:1px solid #ddd;">Dias Úteis no Mês</td><td style="padding:7px 12px;border:1px solid #ddd;text-align:right;">${diasUteis} dias</td></tr>
<tr><td style="padding:7px 12px;border:1px solid #ddd;">Faltas no Período</td><td style="padding:7px 12px;border:1px solid #ddd;text-align:right;">${faltas} dia(s)</td></tr>
<tr><td style="padding:7px 12px;border:1px solid #ddd;">Desconto Proporcional por Faltas</td><td style="padding:7px 12px;border:1px solid #ddd;text-align:right;color:#ef4444;">-R$ ${_recFmt(desc)}</td></tr>
<tr style="background:#1e3a5f;color:#fff;font-weight:700;"><td style="padding:9px 12px;border:1px solid #1e3a5f;">TOTAL A RECEBER</td><td style="padding:9px 12px;border:1px solid #1e3a5f;text-align:right;font-size:1.05rem;">R$ ${_recFmt(totalFinal)}</td></tr>`;
        obs = 'O desconto é proporcional às faltas injustificadas. Dias de folga programada não geram desconto.';
    }

    const ultimoDia = new Date(ano, mes, 0).getDate();

    const via = (n) => `
<div class="via" style="padding:24px 32px;">
  ${logoHtml}
  <div style="padding-top:14px;">
    <!-- Quadro dados empresa/colaborador -->
    <table style="width:100%;border-collapse:collapse;font-size:11px;border:1.5px solid #1e3a5f;margin-bottom:0;">
      <tr style="background:#1e3a5f;color:#fff;">
        <td colspan="4" style="padding:6px 12px;font-weight:700;font-size:10.5px;letter-spacing:.5px;text-transform:uppercase;">
          Dados do Colaborador &nbsp;·&nbsp; ${n === 1 ? '1ª Via — Colaborador' : '2ª Via — Empresa'}
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
        <td style="padding:6px 10px;font-weight:700;font-size:11px;">${colab.nome}</td>
        <td style="padding:6px 10px;font-weight:600;color:#475569;font-size:10.5px;">CPF:</td>
        <td style="padding:6px 10px;font-size:11px;">${colab.cpf || '—'}</td>
      </tr>
      <tr style="background:#f8fafc;">
        <td style="padding:6px 10px;font-weight:600;color:#475569;font-size:10.5px;">Cargo:</td>
        <td style="padding:6px 10px;font-size:11px;">${colab.cargo || '—'}</td>
        <td style="padding:6px 10px;font-weight:600;color:#475569;font-size:10.5px;">Departamento:</td>
        <td style="padding:6px 10px;font-size:11px;">${colab.departamento || '—'}</td>
      </tr>
      <tr>
        <td style="padding:6px 10px;font-weight:600;color:#475569;font-size:10.5px;">Referência:</td>
        <td style="padding:6px 10px;font-weight:700;font-size:11px;">${mesNome.toUpperCase()} / ${ano}</td>
        <td style="padding:6px 10px;font-weight:600;color:#475569;font-size:10.5px;">Matrícula:</td>
        <td style="padding:6px 10px;font-size:11px;">${colab.numero_registro || colab.id || '—'}</td>
      </tr>
    </table>

    <!-- Título -->
    <div style="text-align:center;background:#1e3a5f;color:#fff;padding:9px;font-size:13px;font-weight:700;letter-spacing:1.5px;margin:10px 0;">
      ${titulo}
    </div>

    <!-- Cálculo -->
    <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:10px;">
      <thead>
        <tr style="background:#e8edf5;">
          <th style="padding:7px 12px;border:1px solid #ddd;text-align:left;font-size:10.5px;text-transform:uppercase;letter-spacing:.04em;color:#374151;">Descrição</th>
          <th style="padding:7px 12px;border:1px solid #ddd;text-align:right;font-size:10.5px;text-transform:uppercase;letter-spacing:.04em;color:#374151;width:195px;">Valor</th>
        </tr>
      </thead>
      <tbody>${linhas}</tbody>
    </table>

    ${obs ? `<div style="font-size:10px;color:#64748b;background:#f8fafc;border-left:3px solid #94a3b8;padding:5px 10px;margin-bottom:10px;">⚠ ${obs}</div>` : ''}

    <!-- Declaração -->
    <p style="font-size:11.5px;color:#374151;line-height:1.7;margin-bottom:18px;text-align:justify;">
      Declaro que recebi da empresa <strong>AMERICA RENTAL EQUIPAMENTOS LTDA</strong> o benefício de
      <strong>${beneficio}</strong> referente ao período de
      <strong>01 a ${ultimoDia} de ${mesNome} de ${ano}</strong>,
      no valor de <strong>R$&nbsp;${_recFmt(totalFinal)}</strong>.
    </p>

    <!-- Assinaturas -->
    <table style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="width:55%;text-align:center;padding-top:36px;vertical-align:bottom;">
          <div style="border-top:1px solid #333;padding-top:5px;font-size:11px;">Assinatura do Colaborador</div>
          <div style="font-size:10px;color:#64748b;">${colab.nome}</div>
        </td>
        <td style="width:10%;"></td>
        <td style="width:35%;text-align:center;padding-top:36px;vertical-align:bottom;">
          <div style="border-top:1px solid #333;padding-top:5px;font-size:11px;">Data</div>
          <div style="font-size:10px;color:#64748b;">${dataHj}</div>
        </td>
      </tr>
    </table>
  </div>
</div>`;

    return `<div style="max-width:794px;margin:0 auto;">
  ${via(1)}
  <div style="border-top:2px dashed #94a3b8;margin:0 32px;position:relative;padding:6px 0;">
    <span style="position:absolute;left:50%;transform:translateX(-50%);background:#fff;padding:0 14px;font-size:.68rem;color:#94a3b8;top:-7px;">✂ Cortar aqui</span>
  </div>
  ${via(2)}
</div>`;
}

// ─── Geração Individual (usada pelos Geradores) ───────────────────────────────
window.gerarReciboIndividual = async function (tipo, colabId, mes, ano, valorVRParam) {
    const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
    let colab = (_recibosAllColabs || []).find(c => String(c.id) === String(colabId));
    if (!colab) {
        try {
            const r = await fetch(`${API_URL}/colaboradores/${colabId}`, { headers: { 'Authorization': `Bearer ${token}` } });
            colab = await r.json();
        } catch { alert('Colaborador não encontrado.'); return; }
    }
    const diasUteis = _calcDiasUteis(mes, ano);
    const mesNome   = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][mes - 1];
    const valorVR   = valorVRParam || 35.00;
    const logo      = await _recGetLogo();
    const dados     = { diasTrabalhados: diasUteis, faltas: 0, diasExtra: 0 };
    const benef     = tipo === 'VR' ? 'Vale Refeição' : tipo === 'VT' ? 'Vale Transporte' : 'Vale Combustível';

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<title>${benef} — ${colab.nome}</title>
<style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:Arial,Helvetica,sans-serif;font-size:12px;background:#fff;}
.bar{display:flex;}.via{page-break-inside:avoid;}@media print{.bar{display:none!important;}}</style>
</head><body>
<div class="bar" style="background:#1e3a5f;color:#fff;padding:10px 24px;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:999;">
  <span style="font-weight:700;">${benef} — ${colab.nome} — ${mesNome}/${ano}</span>
  <button onclick="window.print()" style="background:#fff;color:#1e3a5f;border:none;padding:7px 20px;border-radius:6px;font-weight:700;cursor:pointer;">🖨 Imprimir</button>
</div>
${_buildReciboBlock(tipo, colab, dados, mes, mesNome, ano, diasUteis, valorVR, logo)}
</body></html>`;

    const win = window.open('', '_blank', 'width=880,height=760');
    if (win) { win.document.write(html); win.document.close(); }
};
