// ─────────────────────────────────────────────────────────────────────────────
// recibos.js — Recibos de Benefícios em Massa (VR, VT, VC)
// v3.0 — campo nome_completo corrigido, sem "dias úteis globais",
//         VC proporcional via diasTrab+faltas, erro RHID detalhado
// ─────────────────────────────────────────────────────────────────────────────

// ─── Estado Global ────────────────────────────────────────────────────────────
let _recibosAllColabs   = [];
let _recibosFiltrados   = [];
let _recibosDeptTipoMap = {}; // { 'Logística': 'Operacional', 'RH': 'Administrativo' }
let _recibosSelecoes    = {}; // { id: { selecionado, diasTrabalhados, faltas, diasExtra, pontoStatus, isAutoSupervisao, historicoEncontrado, apuracaoDiaria } }
let _recibosSortCol     = 'nome';
let _recibosSortAsc     = true;

// ─── Calendário de Feriados ───────────────────────────────────────────────────
let _feriadosBrasil = {};

/**
 * Busca feriados do ano e retorna a lista de datas ('YYYY-MM-DD').
 */
async function _getFeriados(ano) {
    if (!_feriadosBrasil[ano]) {
        try {
            const res = await fetch(`https://brasilapi.com.br/api/feriados/v1/${ano}`);
            if (res.ok) {
                const data = await res.json();
                _feriadosBrasil[ano] = data.map(f => f.date);
            } else {
                _feriadosBrasil[ano] = [];
            }
        } catch(e) {
            _feriadosBrasil[ano] = [];
        }
    }
    return _feriadosBrasil[ano];
}

/**
 * Retorna o número de dias úteis (legado — mantido para compatibilidade).
 */
async function _getDiasUteis(ano, mes, segASex = false) {
    const feriados = await _getFeriados(ano);
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

/**
 * Feriados fixos do Estado de SP e do Município de Guarulhos.
 * Formato: 'MM-DD' (independente do ano).
 */
function _feriadosSPGuarulhos() {
    return [
        '01-25', // Aniversário de São Paulo (Estado)
        '07-09', // Revolução Constitucionalista (Estado SP)
        '06-13', // Santo Antônio de Pádua — Padroeiro de Guarulhos
    ];
}

/**
 * Verifica se uma data (objeto Date) é feriado SP/Guarulhos.
 */
function _isFeriadoSPGru(d) {
    const mmdd = `${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    return _feriadosSPGuarulhos().includes(mmdd);
}

/**
 * ─── NOVA REGRA DE CRÉDITO ──────────────────────────────────────────────────
 *
 * Calcula os dias de benefício (crédito) do colaborador no mês/ano
 * com base na escala cadastrada.
 *
 * Regras gerais:
 *   • Operacional: feriados que caem em dias de trabalho da escala CONTAM
 *     (= geram benefício, pois recebem mesmo nos feriados).
 *   • Supervisores e Administrativos: feriados nacionais, estaduais (SP)
 *     e municipais (Guarulhos) NÃO CONTAM (= não recebem nesses dias).
 *
 * Escalas suportadas:
 *   padrao_seg_sexta / null   → Seg a Sex
 *   padrao_seis_dias          → Seg a Sáb
 *   padrao_sab_4h             → Seg a Sáb (Sáb gera benefício)
 *   padrao_sab_alternado      → Seg–Sex + Sábados calculados pelo ciclo
 *                               (usa escala_ciclo_inicio como referência)
 *   escala_duas_folgas        → Todos os dias menos os fixos de folga
 *                               + rotação de domingo (2 trabalhados, 1 folga)
 *                               calculada pelo ciclo
 */
async function _calcularDiasEscala(colab, ano, mes) {
    const feriadosNacionais = await _getFeriados(ano);

    // ── Detecta Supervisor ou ADM (não recebem feriados) ──────────────────
    const isSupervisao = (window._isSupervisao && window._isSupervisao(colab)) || false;
    const isAdm = (_recibosDeptTipoMap[(colab.departamento||'').trim()] || '') === 'Administrativo';
    const isSemFeriado = isSupervisao || isAdm;

    // ── Data de início de contagem (admissão proporcional) ────────────────
    // Se o colaborador foi admitido neste mês, contar apenas da admissão.
    // Se foi admitido antes, contar do dia 1 do mês.
    let diaInicio = 1; // padrão: início do mês
    if (colab.data_admissao) {
        const admissao = new Date(colab.data_admissao + 'T00:00:00');
        // Só aplica se a admissão foi neste mesmo mês/ano
        if (admissao.getFullYear() === ano && admissao.getMonth() + 1 === mes) {
            diaInicio = admissao.getDate();
        }
    }

    // Feriado para o dia: para operacionais, feriados sempre contam; para sup/ADM, não.
    function ehFeriado(d) {
        if (!isSemFeriado) return false;
        const dataStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        return feriadosNacionais.includes(dataStr) || _isFeriadoSPGru(d);
    }

    const DIAS_NOME = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const escalaTipo = (colab.escala_tipo || '').trim();

    // Sábado alternado: par = trabalhado, ímpar = folga (a partir do cicloRef)
    function sabadoTrabalhado(dataSab, cicloRef) {
        if (!cicloRef) return false;
        const MS_SEMANA = 7 * 24 * 60 * 60 * 1000;
        const refSab = new Date(cicloRef);
        while (refSab.getDay() !== 6) refSab.setDate(refSab.getDate() + 1);
        const semanas = Math.round((dataSab - refSab) / MS_SEMANA);
        return ((semanas % 2) + 2) % 2 === 0;
    }

    // Domingo rotativo: 2 trabalhados, 1 folga (ciclo de 3)
    function domingoTrabalhado(dataDom, cicloRef) {
        if (!cicloRef) return false;
        const MS_SEMANA = 7 * 24 * 60 * 60 * 1000;
        const refDom = new Date(cicloRef);
        while (refDom.getDay() !== 0) refDom.setDate(refDom.getDate() + 1);
        const semanas = Math.round((dataDom - refDom) / MS_SEMANA);
        const pos = ((semanas % 3) + 3) % 3; // 0=trab, 1=trab, 2=folga
        return pos !== 2;
    }

    const cicloRef = colab.escala_ciclo_inicio
        ? new Date(colab.escala_ciclo_inicio + 'T00:00:00')
        : null;

    let count = 0;
    // Começa na data de admissão (se for este mês) ou no dia 1
    const cur = new Date(ano, mes - 1, diaInicio);

    if (escalaTipo === 'padrao_seis_dias' || escalaTipo === 'padrao_sab_4h') {
        // Seg–Sáb
        while (cur.getMonth() === mes - 1) {
            const ds = cur.getDay();
            if (ds >= 1 && ds <= 6 && !ehFeriado(cur)) count++;
            cur.setDate(cur.getDate() + 1);
        }

    } else if (escalaTipo === 'padrao_sab_alternado') {
        // Seg–Sex + Sábados alternados pelo cicloRef
        while (cur.getMonth() === mes - 1) {
            const ds = cur.getDay();
            if (ds >= 1 && ds <= 5) {
                if (!ehFeriado(cur)) count++;
            } else if (ds === 6 && sabadoTrabalhado(cur, cicloRef)) {
                if (!ehFeriado(cur)) count++;
            }
            cur.setDate(cur.getDate() + 1);
        }

    } else if (escalaTipo === 'escala_duas_folgas') {
        // Folgas fixas (escala_folgas) + domingos rotativos pelo cicloRef
        let diasFolgaFixos = [];
        let temDomingoNasFolgas = false;
        try {
            const folgas = JSON.parse(colab.escala_folgas || '[]');
            temDomingoNasFolgas = folgas.some(f => f.toLowerCase() === 'dom');
            diasFolgaFixos = folgas
                .map(f => DIAS_NOME.indexOf(f))
                .filter(n => n > 0); // exclui dom (0) — tratado separado
        } catch(e) {}

        while (cur.getMonth() === mes - 1) {
            const ds = cur.getDay();
            if (diasFolgaFixos.includes(ds)) {
                // Folga fixa → não conta
            } else if (ds === 0) {
                if (temDomingoNasFolgas) {
                    // Domingo rotativo: 2 trabalhados, 1 folga
                    if (domingoTrabalhado(cur, cicloRef) && !ehFeriado(cur)) count++;
                } else {
                    // Domingo não é folga fixa → sempre trabalha
                    if (!ehFeriado(cur)) count++;
                }
            } else {
                // Dia normal de trabalho
                if (!ehFeriado(cur)) count++;
            }
            cur.setDate(cur.getDate() + 1);
        }

    } else {
        // padrao_seg_sexta / null / sem cadastro / ADM / supervisão → Seg–Sex
        while (cur.getMonth() === mes - 1) {
            const ds = cur.getDay();
            if (ds >= 1 && ds <= 5 && !ehFeriado(cur)) count++;
            cur.setDate(cur.getDate() + 1);
        }
    }

    return count;
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

    window._recibosValorVR = 35.00;
    try {
        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        const res = await fetch(`${API_URL}/configuracoes/valor_vr`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) {
            const cfg = await res.json();
            if (cfg.valor_vr) window._recibosValorVR = parseFloat(cfg.valor_vr);
        }
    } catch(e) { /* usa padrão 35.00 */ }

    // Se há um processo de anexação em andamento, atualiza o botão
    if (window._recibosAnexandoStatus && window._recibosAnexandoStatus.ativo) {
        const btn = document.getElementById('btn-anexar-massa');
        if (btn) {
            btn.disabled = true;
            const s = window._recibosAnexandoStatus;
            btn.innerHTML = `<i class="ph ph-spinner" style="animation:rec-spin 1s linear infinite;"></i> Anexando (${s.progresso}/${s.total})...`;
        }
    }

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

// ─── Banner flutuante de background ──────────────────────────────────────────
window._recibosAnexandoStatus = { ativo: false, progresso: 0, total: 0 };

function _recShowBannerAnexando(progresso, total) {
    window._recibosAnexandoStatus = { ativo: true, progresso, total };
    const banner = document.getElementById('banner-anexando-recibos');
    const texto  = document.getElementById('banner-anexando-texto');
    const icon   = document.getElementById('banner-anexando-icon');
    if (banner) {
        banner.style.display = 'flex';
        document.body.style.paddingTop = '42px'; // empurra o conteúdo para baixo do banner
    }
    if (texto) texto.textContent = total > 0
        ? `Anexando recibos em background: ${progresso} / ${total}...`
        : 'Preparando anexação de recibos...';
    if (icon) icon.style.animation = 'rec-spin 1s linear infinite';
}


function _recHideBannerAnexando() {
    window._recibosAnexandoStatus = { ativo: false, progresso: 0, total: 0 };
    const banner = document.getElementById('banner-anexando-recibos');
    if (banner) banner.style.display = 'none';
    document.body.style.paddingTop = '';
}

// ─── LOG DE AUDITORIA DAS AÇÕES ──────────────────────────────────────────────
// Salva no localStorage por chave: recibos_log_{mes}_{ano}
// Tipos: 'ponto', 'recibos', 'anexo'

function _recLog_key(mes, ano) {
    return `recibos_log_${String(mes).padStart(2,'0')}_${ano}`;
}

function _recLog_registrar(tipo, mes, ano, nomes) {
    if (!nomes || !nomes.length) return;
    const key = _recLog_key(mes, ano);
    let log = {};
    try { log = JSON.parse(localStorage.getItem(key) || '{}'); } catch(e) {}
    const agora = new Date();
    const dt = `${String(agora.getDate()).padStart(2,'0')}/${String(agora.getMonth()+1).padStart(2,'0')}/${agora.getFullYear()} ${String(agora.getHours()).padStart(2,'0')}:${String(agora.getMinutes()).padStart(2,'0')}`;
    log[tipo] = { dataHora: dt, nomes: nomes };
    try { localStorage.setItem(key, JSON.stringify(log)); } catch(e) {}
}

function _recLog_renderizarPainel() {
    const painel = document.getElementById('rec-log-painel');
    if (!painel) return;
    const mes = parseInt(document.getElementById('rec-mes')?.value || new Date().getMonth()+1);
    const ano = parseInt(document.getElementById('rec-ano')?.value || new Date().getFullYear());
    const key = _recLog_key(mes, ano);
    let log = {};
    try { log = JSON.parse(localStorage.getItem(key) || '{}'); } catch(e) {}

    const cfg = [
        { tipo: 'ponto',   icon: 'ph-fingerprint',  label: 'Ponto buscado',  cor: '#1d4ed8', bg: '#eff6ff', borda: '#bfdbfe' },
        { tipo: 'recibos', icon: 'ph-printer',       label: 'Recibos gerados', cor: '#065f46', bg: '#d1fae5', borda: '#6ee7b7' },
        { tipo: 'anexo',   icon: 'ph-paperclip',     label: 'Docs anexados',   cor: '#6d28d9', bg: '#ede9fe', borda: '#c4b5fd' },
    ];

    // Garante que o tooltip global existe
    if (!document.getElementById('rec-log-tooltip')) {
        const tt = document.createElement('div');
        tt.id = 'rec-log-tooltip';
        tt.style.cssText = 'position:fixed;z-index:9999;background:#0f172a;color:#f8fafc;padding:10px 14px;border-radius:10px;font-size:.78rem;line-height:1.6;max-width:320px;pointer-events:none;opacity:0;transition:opacity .15s;box-shadow:0 8px 24px rgba(0,0,0,.35);white-space:pre-wrap;';
        document.body.appendChild(tt);
    }

    painel.innerHTML = cfg.map(c => {
        const entry = log[c.tipo];
        if (!entry) return '';
        const nomesCurtos = entry.nomes.slice(0, 5);
        const extra = entry.nomes.length > 5 ? `\n+${entry.nomes.length - 5} mais...` : '';
        const tooltipText = `${c.label}\n${entry.dataHora}\n\n${nomesCurtos.join('\n')}${extra}`;
        return `<div
            style="display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border-radius:8px;background:${c.bg};border:1px solid ${c.borda};cursor:default;"
            data-reclog="${encodeURIComponent(tooltipText)}"
            onmouseenter="window._recLogShowTip(this,event)" onmouseleave="window._recLogHideTip()">
            <i class="ph ${c.icon}" style="font-size:.9rem;color:${c.cor};"></i>
            <span style="font-size:.72rem;font-weight:700;color:${c.cor};">${c.label}</span>
            <span style="font-size:.7rem;color:#64748b;font-weight:500;">${entry.dataHora}</span>
        </div>`;
    }).join('');
}

window._recLogShowTip = function(el, e) {
    const tt = document.getElementById('rec-log-tooltip');
    if (!tt) return;
    tt.textContent = decodeURIComponent(el.dataset.reclog || '');
    tt.style.opacity = '1';
    const rect = el.getBoundingClientRect();
    tt.style.top  = (rect.bottom + 8) + 'px';
    tt.style.left = Math.max(8, rect.left) + 'px';
};
window._recLogHideTip = function() {
    const tt = document.getElementById('rec-log-tooltip');
    if (tt) tt.style.opacity = '0';
};


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
      <div>
        <label style="font-size:.79rem;font-weight:600;color:#64748b;display:block;margin-bottom:.3rem;" title="Total de dias do mês seguinte — usado como base (bruto) para o VR">
          <i class="ph ph-calendar-check" style="color:#2563eb;"></i> Dias (Mês Seg.)
        </label>
        <input type="number" id="rec-dias-bruto" min="1" max="31" value="0"
          style="width:72px;padding:.52rem .6rem;border:1.5px solid #2563eb;border-radius:8px;font-size:.97rem;font-weight:700;color:#1e3a8a;background:#eff6ff;text-align:center;"
          title="Total de dias do mês seguinte (base bruto VR) — editável"
          onchange="window._recibos_diasBruto = parseInt(this.value)||0">
      </div>
      <div style="width:1px;height:42px;background:#e2e8f0;align-self:flex-end;"></div>
      <!-- PAINEL DE AUDITORIA -->
      <div id="rec-log-painel" style="margin-left:auto;display:flex;flex-direction:column;gap:6px;justify-content:center;"></div>
    </div>
  </div>

  <!-- FILTROS -->
  <div class="card" style="padding:1rem 1.5rem;margin-bottom:.75rem;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,.06);">
    <div style="display:flex;gap:.75rem;align-items:flex-end;flex-wrap:wrap;">
      <div style="flex:2;min-width:170px;">
        <label style="font-size:.77rem;font-weight:600;color:#475569;display:block;margin-bottom:.25rem;">Nome</label>
        <input type="text" id="rec-f-nome" placeholder="Buscar colaborador..."
          style="width:100%;padding:.46rem .75rem;border:1px solid #e2e8f0;border-radius:8px;font-size:.88rem;box-sizing:border-box;"
          autocomplete="new-password" spellcheck="false" readonly onfocus="this.removeAttribute('readonly')"
          oninput="window.aplicarFiltrosRecibos()">
      </div>
      <div style="flex:2;min-width:155px;">
        <label style="font-size:.77rem;font-weight:600;color:#475569;display:block;margin-bottom:.25rem;">Departamento</label>
        <select id="rec-f-dept" onchange="window.aplicarFiltrosRecibos()"
          style="width:100%;padding:.46rem .65rem;border:1px solid #e2e8f0;border-radius:8px;font-size:.88rem;background:#fff;">
          <option value="">Todos</option>
        </select>
      </div>
      <div style="flex:1;min-width:130px;">
        <label style="font-size:.77rem;font-weight:600;color:#475569;display:block;margin-bottom:.25rem;">Férias</label>
        <select id="rec-f-ferias" onchange="window.aplicarFiltrosRecibos()"
          style="width:100%;padding:.46rem .65rem;border:1px solid #e2e8f0;border-radius:8px;font-size:.88rem;background:#fff;">
          <option value="">Todos</option>
          <option value="sim">Sim</option>
          <option value="nao">Não</option>
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
          <tr id="rec-thead-tr" style="background:#f1f5f9;border-bottom:2px solid #e2e8f0;">
            <th style="position:sticky;top:0;background:#f1f5f9;padding:.7rem .5rem;width:36px;z-index:11;"></th>
            <th style="position:sticky;top:0;background:#f1f5f9;padding:.7rem 1rem;text-align:left;color:#475569;font-weight:600;font-size:.76rem;text-transform:uppercase;letter-spacing:.04em;z-index:11;cursor:pointer;user-select:none;white-space:nowrap;" onclick="window.ordenarRecibos('nome')">Colaborador <i class="ph ${_recibosSortCol==='nome'?(_recibosSortAsc?'ph-caret-up':'ph-caret-down'):'ph-caret-up'}" style="opacity:${_recibosSortCol==='nome'?'1':'0.3'}"></i></th>
            <th style="position:sticky;top:0;background:#f1f5f9;padding:.7rem 1rem;text-align:left;color:#475569;font-weight:600;font-size:.76rem;text-transform:uppercase;letter-spacing:.04em;z-index:11;cursor:pointer;user-select:none;white-space:nowrap;" onclick="window.ordenarRecibos('cargo')">Cargo / Departamento <i class="ph ${_recibosSortCol==='cargo'?(_recibosSortAsc?'ph-caret-up':'ph-caret-down'):'ph-caret-up'}" style="opacity:${_recibosSortCol==='cargo'?'1':'0.3'}"></i></th>
            <th style="position:sticky;top:0;background:#8aa0fe;padding:.7rem .75rem;text-align:center;color:#475569;font-weight:600;font-size:.76rem;text-transform:uppercase;letter-spacing:.04em;z-index:11;white-space:nowrap;">Meio Transp.</th>
            <th style="position:sticky;top:0;background:#8aa0fe;padding:.7rem .5rem;text-align:center;color:#475569;font-weight:600;font-size:.76rem;text-transform:uppercase;letter-spacing:.04em;z-index:11;cursor:pointer;user-select:none;white-space:nowrap;" title="Folgas VT" onclick="window.ordenarRecibos('folgasVT')">Folgas<br>VT <i class="ph ${_recibosSortCol==='folgasVT'?(_recibosSortAsc?'ph-caret-up':'ph-caret-down'):'ph-caret-up'}" style="opacity:${_recibosSortCol==='folgasVT'?'1':'0.3'}"></i></th>
            <th style="position:sticky;top:0;background:#8aa0fe;padding:.7rem .5rem;text-align:center;color:#475569;font-weight:600;font-size:.76rem;text-transform:uppercase;letter-spacing:.04em;z-index:11;cursor:pointer;user-select:none;white-space:nowrap;" title="Faltas VT" onclick="window.ordenarRecibos('faltasVT')">Faltas<br>Transp. <i class="ph ${_recibosSortCol==='faltasVT'?(_recibosSortAsc?'ph-caret-up':'ph-caret-down'):'ph-caret-up'}" style="opacity:${_recibosSortCol==='faltasVT'?'1':'0.3'}"></i></th>
            <th style="position:sticky;top:0;background:#adfca9;padding:.7rem .5rem;text-align:center;color:#475569;font-weight:600;font-size:.76rem;text-transform:uppercase;letter-spacing:.04em;z-index:11;cursor:pointer;user-select:none;white-space:nowrap;" title="Dias > 3h extra" onclick="window.ordenarRecibos('jantar')">Jantar <i class="ph ${_recibosSortCol==='jantar'?(_recibosSortAsc?'ph-caret-up':'ph-caret-down'):'ph-caret-up'}" style="opacity:${_recibosSortCol==='jantar'?'1':'0.3'}"></i></th>
            <th style="position:sticky;top:0;background:#adfca9;padding:.7rem .5rem;text-align:center;color:#475569;font-weight:600;font-size:.76rem;text-transform:uppercase;letter-spacing:.04em;z-index:11;cursor:pointer;user-select:none;white-space:nowrap;" title="Folgas VR" onclick="window.ordenarRecibos('folgasVR')">Folgas<br>VR <i class="ph ${_recibosSortCol==='folgasVR'?(_recibosSortAsc?'ph-caret-up':'ph-caret-down'):'ph-caret-up'}" style="opacity:${_recibosSortCol==='folgasVR'?'1':'0.3'}"></i></th>
            <th style="position:sticky;top:0;background:#adfca9;padding:.7rem .5rem;text-align:center;color:#475569;font-weight:600;font-size:.76rem;text-transform:uppercase;letter-spacing:.04em;z-index:11;cursor:pointer;user-select:none;white-space:nowrap;" title="Faltas VR" onclick="window.ordenarRecibos('faltasVR')">Faltas<br>VR <i class="ph ${_recibosSortCol==='faltasVR'?(_recibosSortAsc?'ph-caret-up':'ph-caret-down'):'ph-caret-up'}" style="opacity:${_recibosSortCol==='faltasVR'?'1':'0.3'}"></i></th>
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
        _recibosAllColabs = list.filter(c => c.status !== 'Desligado').sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

        // Inicializar seleções com 0 — aguarda RHID ou preenchimento manual
        _recibosSelecoes = {};
        _recibosAllColabs.forEach(c => {
            _recibosSelecoes[c.id] = { selecionado: false, diasTrabalhados: 0, diasVR: 0, faltas: 0, folgas: 0, diasExtra: 0, pontoStatus: null, isAutoSupervisao: false, historicoEncontrado: false };
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

window.ordenarRecibos = function(col) {
    if (_recibosSortCol === col) {
        _recibosSortAsc = !_recibosSortAsc;
    } else {
        _recibosSortCol = col;
        _recibosSortAsc = true;
    }
    _filtrarERendar();
};

function _filtrarERendar() {
    const nome   = (document.getElementById('rec-f-nome')?.value || '').toLowerCase().trim();
    const dept   = document.getElementById('rec-f-dept')?.value  || '';
    const feriasFiltro = document.getElementById('rec-f-ferias')?.value || '';
    const tipo   = document.getElementById('rec-f-tipo')?.value  || '';
    const transp = document.getElementById('rec-f-transp')?.value || '';
    
    const mesAt = parseInt(document.getElementById('rec-mes')?.value || (new Date().getMonth()+1));
    const anoAt = parseInt(document.getElementById('rec-ano')?.value || new Date().getFullYear());

    _recibosFiltrados = _recibosAllColabs.filter(c => {
        const nomeC = _recNome(c).toLowerCase();
        if (nome   && !nomeC.includes(nome))               return false;
        if (dept   && c.departamento !== dept)             return false;
        if (feriasFiltro) {
            const temFerias = window._temFeriasJanela ? window._temFeriasJanela(c, anoAt, mesAt) : false;
            if (feriasFiltro === 'sim' && !temFerias) return false;
            if (feriasFiltro === 'nao' && temFerias) return false;
        }
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

    _recibosFiltrados.sort((a, b) => {
        let valA, valB;
        const selA = _recibosSelecoes[a.id] || {};
        const selB = _recibosSelecoes[b.id] || {};

        switch(_recibosSortCol) {
            case 'nome':
                valA = _recNome(a).toLowerCase();
                valB = _recNome(b).toLowerCase();
                break;
            case 'cargo':
                valA = (a.cargo || '').toLowerCase() + (a.departamento || '').toLowerCase();
                valB = (b.cargo || '').toLowerCase() + (b.departamento || '').toLowerCase();
                break;
            case 'transporte':
                valA = selA.diasTrabalhados || 0;
                valB = selB.diasTrabalhados || 0;
                break;
            case 'vr':
                valA = selA.diasVR != null ? selA.diasVR : (selA.diasTrabalhados || 0);
                valB = selB.diasVR != null ? selB.diasVR : (selB.diasTrabalhados || 0);
                break;
            case 'jantar':
                valA = selA.diasExtra || 0;
                valB = selB.diasExtra || 0;
                break;
            case 'folgas':
            case 'folgasVT':
            case 'folgasVR':
                valA = selA[_recibosSortCol] || 0;
                valB = selB[_recibosSortCol] || 0;
                break;
            case 'faltas':
            case 'faltasVT':
            case 'faltasVR':
                valA = selA[_recibosSortCol] || 0;
                valB = selB[_recibosSortCol] || 0;
                break;
            case 'ponto':
                valA = selA.pontoStatus || '';
                valB = selB.pontoStatus || '';
                break;
            default:
                valA = _recNome(a).toLowerCase();
                valB = _recNome(b).toLowerCase();
        }

        if (valA < valB) return _recibosSortAsc ? -1 : 1;
        if (valA > valB) return _recibosSortAsc ? 1 : -1;
        return 0;
    });

    _renderTabela();
}

// ─── Helpers meio de transporte ───────────────────────────────────────────────
function _isVT(m) { return m.includes('vale transporte') || m.includes('(vt)') || m === 'vt'; }
function _isVC(m) { return m.includes('combustivel') || m.includes('combustível') || m.includes('(vc)') || m === 'vc'; }

function _calcTotaisRecibo(c, s) {
    const valorVR = window._recibosValorVR || 35.00;
    const mTransp = (c.meio_transporte||'').toLowerCase();
    
    // VR
    const totalDiasMes = (window._recibos_diasBruto && window._recibos_diasBruto > 0)
        ? window._recibos_diasBruto
        : ((s.diasVR != null && s.diasVR > 0) ? s.diasVR : (s.diasTrabalhados || 0));
    const brutoVR = totalDiasMes * valorVR;
    const brutoJantar = (s.diasExtra || 0) * valorVR;
    const totalDescVR = ((s.folgasVR || 0) * valorVR) + ((s.faltasVR || 0) * valorVR);
    const totalFinalVR = Math.max(0, brutoVR + brutoJantar - totalDescVR);

    // Transp
    let totalFinalTransp = 0;
    let valTransp = parseFloat(c.valor_transporte) || 0;
    if (_isVT(mTransp)) {
        valTransp = valTransp * 2;
        const diasVT = Math.max(0, 30 - (s.folgasVT || 0) - (s.faltasVT || 0));
        totalFinalTransp = diasVT * valTransp;
    } else if (_isVC(mTransp)) {
        const diariaVC = valTransp / 30;
        const descVC = (s.faltasVT || 0) * diariaVC;
        totalFinalTransp = Math.max(0, valTransp - descVC);
    }
    
    return { totalFinalVR, totalFinalTransp };
}

// ─── Renderizar tabela ────────────────────────────────────────────────────────
function _renderTabela() {
    if (!document.getElementById('recibos-spin-style')) {
        const s = document.createElement('style');
        s.id = 'recibos-spin-style';
        s.innerHTML = `input[type="number"].no-spin::-webkit-inner-spin-button, input[type="number"].no-spin::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; } input[type="number"].no-spin { -moz-appearance: textfield; }`;
        document.head.appendChild(s);
    }

    const tbody = document.getElementById('rec-tbody');
    if (!tbody) return;

    const trHead = document.getElementById('rec-thead-tr');
    if (trHead) {
        trHead.innerHTML = `
            <th style="position:sticky;top:0;background:#f1f5f9;padding:.7rem .5rem;width:36px;z-index:11;"></th>
            <th style="position:sticky;top:0;background:#f1f5f9;padding:.7rem 1rem;text-align:left;color:#475569;font-weight:600;font-size:.76rem;text-transform:uppercase;letter-spacing:.04em;z-index:11;cursor:pointer;user-select:none;white-space:nowrap;" onclick="window.ordenarRecibos('nome')">Colaborador <i class="ph ${_recibosSortCol==='nome'?(_recibosSortAsc?'ph-caret-up':'ph-caret-down'):'ph-caret-up'}" style="opacity:${_recibosSortCol==='nome'?'1':'0.3'};vertical-align:middle;margin-left:4px;"></i></th>
            <th style="position:sticky;top:0;background:#f1f5f9;padding:.7rem 1rem;text-align:left;color:#475569;font-weight:600;font-size:.76rem;text-transform:uppercase;letter-spacing:.04em;z-index:11;cursor:pointer;user-select:none;white-space:nowrap;" onclick="window.ordenarRecibos('cargo')">Cargo / Depto <i class="ph ${_recibosSortCol==='cargo'?(_recibosSortAsc?'ph-caret-up':'ph-caret-down'):'ph-caret-up'}" style="opacity:${_recibosSortCol==='cargo'?'1':'0.3'};vertical-align:middle;margin-left:4px;"></i></th>
            <th style="position:sticky;top:0;background:#8aa0fe;padding:.7rem .4rem;text-align:center;color:#475569;font-weight:600;font-size:.65rem;text-transform:uppercase;letter-spacing:.04em;z-index:11;white-space:nowrap;">Meio Transp.</th>
            <th style="position:sticky;top:0;background:#8aa0fe;padding:.7rem .4rem;text-align:center;color:#475569;font-weight:600;font-size:.65rem;text-transform:uppercase;letter-spacing:.04em;z-index:11;cursor:pointer;user-select:none;white-space:nowrap;" title="Folgas VT" onclick="window.ordenarRecibos('folgasVT')">Folgas<br>VT <i class="ph ${_recibosSortCol==='folgasVT'?(_recibosSortAsc?'ph-caret-up':'ph-caret-down'):'ph-caret-up'}" style="opacity:${_recibosSortCol==='folgasVT'?'1':'0.3'};vertical-align:middle;margin-left:4px;"></i></th>
            <th style="position:sticky;top:0;background:#8aa0fe;padding:.7rem .4rem;text-align:center;color:#475569;font-weight:600;font-size:.65rem;text-transform:uppercase;letter-spacing:.04em;z-index:11;cursor:pointer;user-select:none;white-space:nowrap;" title="Faltas VT" onclick="window.ordenarRecibos('faltasVT')">Faltas<br>Transp. <i class="ph ${_recibosSortCol==='faltasVT'?(_recibosSortAsc?'ph-caret-up':'ph-caret-down'):'ph-caret-up'}" style="opacity:${_recibosSortCol==='faltasVT'?'1':'0.3'};vertical-align:middle;margin-left:4px;"></i></th>
            <th style="position:sticky;top:0;background:#8aa0fe;padding:.7rem .4rem;text-align:center;color:#475569;font-weight:600;font-size:.65rem;text-transform:uppercase;letter-spacing:.04em;z-index:11;white-space:nowrap;" title="Valor Total Transp.">Valor<br>Transp.</th>
            <th style="position:sticky;top:0;background:#adfca9;padding:.7rem .4rem;text-align:center;color:#475569;font-weight:600;font-size:.65rem;text-transform:uppercase;letter-spacing:.04em;z-index:11;cursor:pointer;user-select:none;white-space:nowrap;" title="Dias > 3h extra" onclick="window.ordenarRecibos('jantar')">Jantar <i class="ph ${_recibosSortCol==='jantar'?(_recibosSortAsc?'ph-caret-up':'ph-caret-down'):'ph-caret-up'}" style="opacity:${_recibosSortCol==='jantar'?'1':'0.3'};vertical-align:middle;margin-left:4px;"></i></th>
            <th style="position:sticky;top:0;background:#adfca9;padding:.7rem .4rem;text-align:center;color:#475569;font-weight:600;font-size:.65rem;text-transform:uppercase;letter-spacing:.04em;z-index:11;cursor:pointer;user-select:none;white-space:nowrap;" title="Folgas VR" onclick="window.ordenarRecibos('folgasVR')">Folgas<br>VR <i class="ph ${_recibosSortCol==='folgasVR'?(_recibosSortAsc?'ph-caret-up':'ph-caret-down'):'ph-caret-up'}" style="opacity:${_recibosSortCol==='folgasVR'?'1':'0.3'};vertical-align:middle;margin-left:4px;"></i></th>
            <th style="position:sticky;top:0;background:#adfca9;padding:.7rem .4rem;text-align:center;color:#475569;font-weight:600;font-size:.65rem;text-transform:uppercase;letter-spacing:.04em;z-index:11;cursor:pointer;user-select:none;white-space:nowrap;" title="Faltas VR" onclick="window.ordenarRecibos('faltasVR')">Faltas<br>VR <i class="ph ${_recibosSortCol==='faltasVR'?(_recibosSortAsc?'ph-caret-up':'ph-caret-down'):'ph-caret-up'}" style="opacity:${_recibosSortCol==='faltasVR'?'1':'0.3'};vertical-align:middle;margin-left:4px;"></i></th>
            <th style="position:sticky;top:0;background:#adfca9;padding:.7rem .4rem;text-align:center;color:#475569;font-weight:600;font-size:.65rem;text-transform:uppercase;letter-spacing:.04em;z-index:11;white-space:nowrap;" title="Valor Total VR">Valor<br>VR</th>
        `;
    }

    if (!_recibosFiltrados.length) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:2.5rem;color:#94a3b8;">
            <i class="ph ph-users" style="font-size:2rem;display:block;margin-bottom:.5rem;"></i>
            Nenhum colaborador encontrado.</td></tr>`;
        _atualizarContador(); return;
    }

    const mesAt = parseInt(document.getElementById('rec-mes')?.value || (new Date().getMonth()+1));
    const anoAt = parseInt(document.getElementById('rec-ano')?.value || new Date().getFullYear());

    tbody.innerHTML = _recibosFiltrados.map(c => {
        const s    = _recibosSelecoes[c.id] || { selecionado:false, diasTrabalhados:0, diasVR:0, faltas:0, folgas:0, diasExtra:0, pontoStatus:null, folgasVT:0, faltasVT:0, folgasVR:0, faltasVR:0 };
        const nomeCompleto = _recNome(c);
        const nome = nomeCompleto.length > 30 ? nomeCompleto.substring(0, 30) + '...' : nomeCompleto;
        const tipo = _recibosDeptTipoMap[(c.departamento||'').trim()] || '';
        
        const temFeriasJanela = window._temFeriasJanela ? window._temFeriasJanela(c, anoAt, mesAt) : false;
        const nomeCor = '#1e293b'; // Default text color for everyone

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

        const totais = _calcTotaisRecibo(c, s);

        return `<tr id="rec-row-${c.id}"
            style="border-bottom:1px solid #f1f5f9;background:${bg};transition:background .12s;"
            onmouseover="this.style.background='${hoverBg}';"
            onmouseout="this.style.background='${bg}';">
          <td style="padding:.55rem .5rem;text-align:center;">
            <input type="checkbox" id="rec-cb-${c.id}" data-id="${c.id}" ${s.selecionado?'checked':''}
              style="width:16px;height:16px;accent-color:#2563eb;cursor:pointer;"
              onchange="window.toggleReciboColab(${c.id},this.checked)">
          </td>
          <td style="padding:.55rem 1rem;max-width:280px;">
            <div style="font-weight:600;color:${nomeCor};font-size:.88rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${nomeCompleto}">${nome}</div>
            <div style="font-size:.74rem;color:#94a3b8;">CPF: ${c.cpf||'—'}</div>
          </td>
          <td style="padding:.55rem 1rem;">
            <div style="color:#475569;font-size:.85rem;">${c.cargo||'—'}</div>
            <div style="font-size:.74rem;color:#94a3b8;">${c.departamento||'—'}</div>
          </td>
          <td style="padding:.55rem .75rem;text-align:center;background:#8aa0fe;">${transpBadge}</td>
          <td style="padding:.45rem .2rem;text-align:center;background:#8aa0fe;">
            ${window._isVT(m) ? `
            <input type="number" min="0" max="35" value="${s.folgasVT||''}"
              style="width:36px;padding:.2rem .1rem;border:1px solid #e2e8f0;border-radius:6px;text-align:center;font-size:.75rem;font-weight:600;color:${(s.folgasVT||0)>0?'#0891b2':'#94a3b8'};"
              placeholder="0"
              title="Folgas VT"
              onchange="window.atualizarDadosReciboColab(${c.id},'folgasVT',this.value)">` : ''}
          </td>
          <td style="padding:.45rem .2rem;text-align:center;background:#8aa0fe;">
            ${(window._isVT(m) || window._isVC(m)) ? `
            <input type="number" min="0" max="35" value="${s.faltasVT||''}"
              style="width:36px;padding:.2rem .1rem;border:1px solid #e2e8f0;border-radius:6px;text-align:center;font-size:.75rem;font-weight:600;color:${(s.faltasVT||0)>0?'#ef4444':'#94a3b8'};"
              placeholder="0"
              onchange="window.atualizarDadosReciboColab(${c.id},'faltasVT',this.value)">` : ''}
          </td>
          <td style="padding:.45rem .2rem;text-align:center;background:#8aa0fe;">
            ${(window._isVT(m) || window._isVC(m)) ? `
            <input type="number" step="0.01" min="0" class="no-spin" id="inp-valvt-${c.id}" value="${s.valVTEdit != null ? s.valVTEdit.toFixed(2) : totais.totalFinalTransp.toFixed(2)}"
              style="width:58px;padding:.2rem .1rem;border:1px solid #e2e8f0;border-radius:6px;text-align:center;font-size:.75rem;font-weight:600;color:#1e3a5f;"
              onchange="window.atualizarValorEditado(${c.id},'valVTEdit',this.value)">` : ''}
          </td>
          <td style="padding:.45rem .2rem;text-align:center;background:#adfca9;">
            <input type="number" min="0" max="35" value="${s.diasExtra||''}"
              style="width:36px;padding:.2rem .1rem;border:1px solid #e2e8f0;border-radius:6px;text-align:center;font-size:.75rem;font-weight:600;color:${s.diasExtra>0?'#8b5cf6':'#94a3b8'};"
              placeholder="0"
              onchange="window.atualizarDadosReciboColab(${c.id},'diasExtra',this.value)">
          </td>
          <td style="padding:.45rem .2rem;text-align:center;background:#adfca9;">
            <input type="number" min="0" max="35" value="${s.folgasVR||''}"
              style="width:36px;padding:.2rem .1rem;border:1px solid #e2e8f0;border-radius:6px;text-align:center;font-size:.75rem;font-weight:600;color:${(s.folgasVR||0)>0?'#0891b2':'#94a3b8'};"
              placeholder="0"
              title="Folgas VR"
              onchange="window.atualizarDadosReciboColab(${c.id},'folgasVR',this.value)">
          </td>
          <td style="padding:.45rem .2rem;text-align:center;background:#adfca9;">
            <input type="number" min="0" max="35" value="${s.faltasVR||''}"
              style="width:36px;padding:.2rem .1rem;border:1px solid #e2e8f0;border-radius:6px;text-align:center;font-size:.75rem;font-weight:600;color:${(s.faltasVR||0)>0?'#ef4444':'#94a3b8'};"
              placeholder="0"
              onchange="window.atualizarDadosReciboColab(${c.id},'faltasVR',this.value)">
          </td>
          <td style="padding:.45rem .2rem;text-align:center;background:#adfca9;">
            <input type="number" step="0.01" min="0" class="no-spin" id="inp-valvr-${c.id}" value="${s.valVREdit != null ? s.valVREdit.toFixed(2) : totais.totalFinalVR.toFixed(2)}"
              style="width:58px;padding:.2rem .1rem;border:1px solid #e2e8f0;border-radius:6px;text-align:center;font-size:.75rem;font-weight:600;color:#064e3b;"
              onchange="window.atualizarValorEditado(${c.id},'valVREdit',this.value)">
          </td>
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

window._temFeriasJanela = function(c, ano, mes) {
    let proxMes = mes + 1;
    let proxAno = ano;
    if (proxMes > 12) { proxMes = 1; proxAno++; }
    return window._isColabFerias(c, ano, mes) || window._isColabFerias(c, proxAno, proxMes);
};

window._isSupervisao = function(c) {
    // Se o colaborador tem dados reais de ponto do RHID (apuracaoDiaria),
    // ele bate ponto e deve ser tratado como operacional (não supervisão)
    const sel = _recibosSelecoes ? _recibosSelecoes[c.id] : null;
    if (sel && sel.apuracaoDiaria && sel.apuracaoDiaria.length > 0) {
        const temPontoReal = sel.apuracaoDiaria.some(d => {
            const trb = (d.diasTrabalhados || 0) > 0 || (d.totalHorasTrabalhadas || 0) > 0;
            const batidas = d.marcacoes && d.marcacoes.length > 0;
            return trb || batidas;
        });
        if (temPontoReal) return false;
    }

    const dept = (c.departamento || '').toLowerCase();
    const cargo = (c.cargo || '').toLowerCase();
    const nome = (c.nome || '').toLowerCase();
    return dept.includes('supervis') || cargo.includes('supervis') || cargo.includes('sup.') || cargo.startsWith('sup ') || nome.includes('thais ricci vaz');
};



window._getRowColors = function(c, s) {
    const mesAt = parseInt(document.getElementById('rec-mes')?.value);
    const anoAt = parseInt(document.getElementById('rec-ano')?.value);
    
    const isFerias = window._isColabFerias(c, anoAt, mesAt);
    const isSupervisao = window._isSupervisao(c);
    
    // AMARELO: Pesquisados (pontoStatus != null), 0 comparecimentos, NÃO são supervisão.
    const isAmarelo = !isFerias && !isSupervisao && (s.diasTrabalhados === 0) && (s.pontoStatus !== null);
    
    // AZUL CLARO: Qualquer colaborador que seja da supervisão (a não ser que esteja de férias)
    const isSupervisorAzul = !isFerias && isSupervisao;

    // VERDE: pontoStatus 'ok', desde que não seja Amarelo, nem Férias, nem Supervisão
    const isVerde = !isFerias && !isSupervisorAzul && !isAmarelo && (s.pontoStatus === 'ok');
    
    const isCinza   = !isFerias && !isSupervisorAzul && !isVerde && !isAmarelo && (s.diasTrabalhados === 0) && (s.pontoStatus === null);

    let bg = '#fff';
    let hoverBg = '#f8fafc';

    if (!s.selecionado) {
        if (isFerias) { bg = '#e9d5ff'; hoverBg = '#d8b4fe'; }
        else if (isSupervisorAzul) { bg = '#bae6fd'; hoverBg = '#7dd3fc'; }
        else if (isCinza) { bg = '#f1f5f9'; hoverBg = '#e2e8f0'; }
        // All others (isVerde, isAmarelo, etc) are white
        else { bg = '#fff'; hoverBg = '#f8fafc'; }
    } else {
        if (isFerias) { bg = '#d8b4fe'; hoverBg = '#c084fc'; }
        else if (isSupervisorAzul) { bg = '#7dd3fc'; hoverBg = '#38bdf8'; }
        else if (isCinza) { bg = '#e2e8f0'; hoverBg = '#cbd5e1'; }
        // Selected rows gets a light blue tint
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
let _recibosSaveTimeout = null;
window.atualizarDadosReciboColab = function (id, campo, valor) {
    if (!_recibosSelecoes[id]) return;
    _recibosSelecoes[id][campo] = Math.max(0, parseInt(valor) || 0);
    _recibosSelecoes[id].is_editado = true;

    if (campo.includes('folgas') || campo.includes('faltas') || campo === 'diasExtra') {
        const c = _recibosAllColabs.find(x => x.id === id);
        if (c) {
            if (campo.includes('VT') || campo.includes('Transp')) {
                _recibosSelecoes[id].valVTEdit = null;
                const totais = _calcTotaisRecibo(c, _recibosSelecoes[id]);
                const inp = document.getElementById(`inp-valvt-${id}`);
                if (inp) inp.value = totais.totalFinalTransp.toFixed(2);
            } else {
                _recibosSelecoes[id].valVREdit = null;
                const totais = _calcTotaisRecibo(c, _recibosSelecoes[id]);
                const inp = document.getElementById(`inp-valvr-${id}`);
                if (inp) inp.value = totais.totalFinalVR.toFixed(2);
            }
        }
    }

    window._autoSalvarRecibo(id);
};

window._autoSalvarRecibo = function(id) {
    if (_recibosSaveTimeout) clearTimeout(_recibosSaveTimeout);
    _recibosSaveTimeout = setTimeout(() => {
        const mes = parseInt(document.getElementById('rec-mes')?.value);
        const ano = parseInt(document.getElementById('rec-ano')?.value);
        if(!mes || !ano) return;
        
        const valorVR = window._recibosValorVR || 35.00;
        const s = _recibosSelecoes[id];
        if (!s) return;
        
        const itensSalvar = [{
            colaborador_id: id,
            dias_trabalhados: s.diasTrabalhados,
            dias_vr: s.diasVR,
            faltas: s.faltas,
            folgas: s.folgas || 0,
            folgas_vt: s.folgasVT || 0,
            faltas_vt: s.faltasVT || 0,
            folgas_vr: s.folgasVR || 0,
            faltas_vr: s.faltasVR || 0,
            dias_extra: s.diasExtra,
            valor_vr: valorVR,
            valor_vt_editado: s.valVTEdit !== undefined ? s.valVTEdit : null,
            valor_vr_editado: s.valVREdit !== undefined ? s.valVREdit : null,
            apuracao_diaria: (s.apuracaoDiaria && s.apuracaoDiaria.length > 0) ? JSON.stringify(s.apuracaoDiaria) : null
        }];
        
        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        fetch(`${typeof API_URL !== 'undefined' ? API_URL : '/api'}/recibos/salvar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ mes, ano, itens: itensSalvar })
        }).catch(e => console.warn('Erro ao auto-salvar edição manual:', e));
    }, 800);
};

window.atualizarValorEditado = function(id, campo, valor) {
    if (!_recibosSelecoes[id]) return;
    const v = parseFloat(valor);
    if (!isNaN(v) && valor.trim() !== '') {
        _recibosSelecoes[id][campo] = v;
        _recibosSelecoes[id].is_editado = true;
    } else {
        _recibosSelecoes[id][campo] = null;
        // Recalcular para mostrar o valor padrão se o usuário apagar o campo
        const c = _recibosAllColabs.find(x => x.id === id);
        if (c) {
            const totais = _calcTotaisRecibo(c, _recibosSelecoes[id]);
            if (campo === 'valVTEdit') {
                const inp = document.getElementById(`inp-valvt-${id}`);
                if (inp) inp.value = totais.totalFinalTransp.toFixed(2);
            } else {
                const inp = document.getElementById(`inp-valvr-${id}`);
                if (inp) inp.value = totais.totalFinalVR.toFixed(2);
            }
        }
    }
    window._autoSalvarRecibo(id);
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
// REGRA:
//   • CRÉDITO = dias de escala do MÊS SEGUINTE ao selecionado (M+1)
//     Ex: selecionando Maio → crédito para Junho (01/06 a 30/06)
//   • DESCONTO (faltas) = ponto da JANELA 28/(M-1) → 28/M
//     Ex: selecionando Maio → desconta faltas de 28/04 a 28/05
//   • CARTÃO DE PONTO = mesmo período do desconto (28/M-1 a 28/M)
window._recBuscarPontoSelecionados = async function () {
    const sels = _recibosAllColabs.filter(c => _recibosSelecoes[c.id]?.selecionado);
    if (!sels.length) {
        if (typeof Swal !== 'undefined') Swal.fire('Atenção', 'Selecione ao menos um colaborador antes de buscar o ponto.', 'warning');
        return;
    }

    // Verifica se algum colaborador selecionado já tem ponto preenchido (RHID ou edição manual)
    const comPontoJaPreenchido = sels.filter(c => {
        const sel = _recibosSelecoes[c.id];
        return sel && (sel.pontoStatus === 'ok' || sel.pontoStatus === 'erro' || sel.is_editado);
    });

    if (comPontoJaPreenchido.length > 0) {
        const { isConfirmed } = await Swal.fire({
            icon: 'warning',
            title: 'Dados anteriores serão apagados',
            html: `<p style="margin:0 0 0.5rem;color:#374151;">
                       ${comPontoJaPreenchido.length} colaborador(es) já possuem dados de ponto preenchidos.
                   </p>
                   <p style="margin:0;color:#6b7280;font-size:0.9rem;">
                       Ao continuar, <strong>todos os dados de ponto serão apagados</strong> e substituídos pelos novos dados buscados do RHID.<br>Tem certeza que deseja continuar?
                   </p>`,
            showCancelButton: true,
            confirmButtonText: '<i class="ph ph-arrow-clockwise"></i> Sim, buscar e substituir',
            cancelButtonText: 'Não, cancelar',
            confirmButtonColor: '#d97706',
            cancelButtonColor: '#64748b',
        });
        if (!isConfirmed) return;
    }


    const mes   = parseInt(document.getElementById('rec-mes')?.value);
    const ano   = parseInt(document.getElementById('rec-ano')?.value);

    // ── CRÉDITO: mês seguinte (M+1) ──────────────────────────────────
    const creditMes = mes === 12 ? 1  : mes + 1;
    const creditAno = mes === 12 ? ano + 1 : ano;

    // ── JANELA de desconto: 01/M ao último dia de M (mês selecionado completo) ─────
    // Ex: selecionando Maio → desconta faltas de 01/05 a 31/05
    const mesPrev = mes === 1 ? 12 : mes - 1;
    const anoPrev = mes === 1 ? ano - 1 : ano;
    const janelaIni = new Date(ano, mes - 1, 1);      // 01/M
    const janelaFim = new Date(ano, mes, 0);           // último dia de M


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
    const nomesSemCadastro = [];
    const nomesErroApi = [];

    const maxConcurrency = 8;
    let i = 0;

    const worker = async () => {
        while (i < sels.length) {
            const c = sels[i++];
            const cpf = (c.cpf || '').replace(/\D/g, '');
            if (!cpf || cpf.length < 8) {
                _recibosSelecoes[c.id].pontoStatus = 'erro';
                semCadastro++;
                nomesSemCadastro.push(_recNome(c));
                continue;
            }
            try {
                // ── 1. Buscar ponto do MÊS SELECIONADO (M) e do M-1 em paralelo ──────
                //    A janela 28/M-1 → 28/M abrange dados dos dois meses.
                const [res1, res2] = await Promise.all([
                    fetch(`${API_URL}/diretoria/controlid/ponto-colaborador?cpf=${encodeURIComponent(cpf)}&mes=${mes}&ano=${ano}`,
                          { headers: { 'Authorization': `Bearer ${token}` } }),
                    fetch(`${API_URL}/diretoria/controlid/ponto-colaborador?cpf=${encodeURIComponent(cpf)}&mes=${mesPrev}&ano=${anoPrev}`,
                          { headers: { 'Authorization': `Bearer ${token}` } })
                ]);
                const data1 = res1.ok ? await res1.json() : null; // M (selecionado)
                const data2 = res2.ok ? await res2.json() : null; // M-1 (anterior)


                // ── 2. Combinar apuracao diaria dos dois meses ─────────────────────
                const RHID_ARRAY_FIELDS = ['records','listaDias','lista','itens','dias','data','items','apuracao','result','results'];
                function extrairDiaria(dataRaw, label) {
                    if (!dataRaw) { console.warn('[extrairDiaria] dataRaw nulo', label); return []; }
                    if (!dataRaw.apuracaoRaw) { console.warn('[extrairDiaria] apuracaoRaw ausente', label); return []; }
                    try {
                        let p = typeof dataRaw.apuracaoRaw === 'string'
                            ? JSON.parse(dataRaw.apuracaoRaw) : dataRaw.apuracaoRaw;
                        if (Array.isArray(p)) { console.log('[extrairDiaria]', label, '-> array direto, length:', p.length); return p; }
                        if (p && typeof p === 'object') {
                            for (const field of RHID_ARRAY_FIELDS) {
                                if (Array.isArray(p[field]) && p[field].length > 0) { console.log('[extrairDiaria]', label, '-> campo', field); return p[field]; }
                            }
                            const k = Object.keys(p).find(key => Array.isArray(p[key]) && p[key].length > 0); if (k) return p[k];
                            if (p.date || p.dateTimeStr) return [p];
                        }
                        return [];
                    } catch(e) { console.error('[extrairDiaria] erro:', e.message); return []; }
                }

                const diaria1 = extrairDiaria(data1, 'M='+mes);
                const diaria2 = extrairDiaria(data2, 'M-1='+mesPrev);
                const diariaTotal = [...diaria2, ...diaria1];
                console.log('[ponto] ' + c.nome_completo + ' M=' + diaria1.length + ' M-1=' + diaria2.length);

                function parseDia(d) {
                    let str = String(d.date || d.dateTimeStr || '').substring(0, 10);
                    if (!str) return null;
                    let dt = new Date(str + 'T00:00:00');
                    if (isNaN(dt)) {
                        const p = str.split('/');
                        if (p.length === 3) dt = new Date(`${p[2]}-${p[1]}-${p[0]}T00:00:00`);
                    }
                    return isNaN(dt) ? null : dt;
                }

                let faltasJanela = 0;
                const MIN_VR = 360; // 6 horas em minutos
                // Cartão de Ponto = mesmos dias da janela de desconto (não mais o mês M-1 completo)
                const apuracaoParaCartao = [];

                // Data de admissão: ignora dias anteriores à entrada do colaborador
                const admissaoColab = c.data_admissao
                    ? new Date(c.data_admissao + 'T00:00:00')
                    : null;

                diariaTotal.forEach(d => {
                    const dt = parseDia(d);
                    if (!dt) return;
                    if (dt < janelaIni || dt > janelaFim) return; // fora da janela de desconto
                    if (admissaoColab && dt < admissaoColab) return; // antes da admissão → ignora

                    // Inclui no Cartão de Ponto (mesmo período da janela)
                    apuracaoParaCartao.push(d);

                    // ── Determinação de FALTA baseada nos dados do RHID (espelha backend) ──
                    // ORDEM IMPORTANTE: folga/DSR/feriado é verificado ANTES de faltaDiaInteiro
                    // (ControlID pode retornar faltaDiaInteiro=true em dias de folga atribuída)
                    const horasTrab = d.totalHorasTrabalhadas || d.horasUteis || 0;
                    // IMPORTANTE: usar apenas horas reais — diasTrabalhados pode ser 1 em dias faltosos
                    const trabalhou = horasTrab > 0;
                    const statusRHID = (d.status || d.situacao || d.tipo || '').toString().toLowerCase();

                    // 1º: Folga/DSR/Feriado explícito — NUNCA é falta (tratado como folga)
                    const isFolga = statusRHID.includes('folg') || statusRHID.includes('dsr') ||
                                    statusRHID.includes('feriado') || statusRHID.includes('f.c.') ||
                                    d.folga === true || d.isHoliday === true || d.isHoliday === 1;

                    // 2º: DSR via campo específico
                    const isDSR = (d.dsrConsideradoMinutos || 0) > 0;

                    // 3º: Dia sem horário contratual previsto = folga/DSR implícito
                    const idHorario = d.idHorarioContratual || 0;
                    const strHorario = (d.strHorarioContratualSimples || '').trim();
                    const semHorarioPrevisto = (idHorario === 0 && strHorario === '');

                    // 4º: Justificado — verifica pelo campo idJustification OU pelo status
                    //     EXCEÇÃO: 'erro no ponto' não é falta — é dia trabalhado corrigido
                    const toolTipAlertRaw = (d.toolTipAlert || '').toLowerCase();
                    const erroNoPonto = toolTipAlertRaw.includes('erro no ponto');
                    const isJustificado = !erroNoPonto && (
                        statusRHID.includes('justif') ||
                        (d.idJustification && d.idJustification > 0)
                    );

                    // ── Classificação unificada — mesma lógica da exibição ──────────
                    // Isso garante que o que a conferência mostra é exatamente o que é descontado.
                    // (faltasJanela e folgasJanela serão recalculados abaixo após apuracaoParaCartao estar completo)
                });

                // ── 3b. Contagem unificada de faltas e folgas ─────────────────────
                // Usa a MESMA lógica de classificação da conferência de ponto
                // para garantir consistência total entre exibição e desconto.
                let faltasTotal = 0;
                let faltasJustificadasTotal = 0; // Somente dias com idJustification (faltas reais c/ justificativa)
                let folgasTotal = 0;
                let folgasVR = 0, faltasVR = 0, folgasVT = 0, faltasVT = 0;

                apuracaoParaCartao.forEach(d => {
                    // IMPORTANTE: totalHorasTrabalhadas já inclui horas noturnas
                    // NÃO somar horasTotalNoturno (seria dupla contagem para noturnos)
                    const hT2 = d.totalHorasTrabalhadas || 0;
                    const trb2 = (d.diasTrabalhados || 0) > 0 || hT2 > 0;
                    const st2 = (d.status || d.situacao || d.tipo || '').toString().toLowerCase();
                    const isFolgaSt2 = st2.includes('folg') || st2.includes('dsr') || st2.includes('feriado');
                    const isDSR2 = (d.dsrConsideradoMinutos || 0) > 0;
                    const semHor2 = ((d.idHorarioContratual || 0) === 0
                                 && (d.strHorarioContratualSimples || '').trim() === '');
                    const isFolgaFlag2 = d.folga === true || d.isHoliday === true || d.isHoliday === 1;

                    let tipo2 = '';
                    if (d.isHoliday) {
                        tipo2 = hT2 >= 120 ? '' : 'folga'; // Feriado: se trabalhou 6h+ não desconta
                    } else if (d.idJustification) {
                        const ob2 = (d.toolTipAlert || '').toLowerCase();
                        const abr2 = (d.abreviationJustification || '').toLowerCase().trim();
                        const st2  = (d.status || d.situacao || d.tipo || '').toString().toLowerCase();
                        const isErroP2  = ob2.includes('erro no ponto');
                        const isExterno2 = ob2.includes('trabalho externo') || ob2.includes('trab. externo')
                                        || ob2.includes('trab externo') || ob2.includes('externo')
                                        || (ob2.includes('servi') && ob2.includes('externo'))
                                        // Campo status/situacao do RHID
                                        || st2.includes('externo') || st2.includes('trab. ext')
                                        || st2 === 'te'
                                        // Abreviação do RHID (ex: "TE", "T.E.", "TRAB.EXT.")
                                        || abr2 === 'te' || abr2 === 't.e.' || abr2.startsWith('te ')
                                        || abr2.includes('ext')
                                        // ── Texto nas entradas de marcação (listAfdtManutencao) ──────────
                                        // O RHID escreve "Trabalho Externo" como texto nas marcações
                                        || (d.listAfdtManutencao || d.marcacoes || []).some(m => {
                                            const _j = JSON.stringify(m || '').toLowerCase();
                                            return _j.includes('externo') || _j.includes('trabalho ext');
                                        });
                        if (isErroP2 || isExterno2 || hT2 > 0) {
                            tipo2 = ''; // Trabalhado (erro de ponto / trabalho externo → não conta falta)
                        } else {
                            tipo2 = 'justificado'; // Falta justificada genuína
                        }
                    } else if (isFolgaSt2 || isFolgaFlag2 || isDSR2) {
                        const dStr2 = String(d.date || d.dateTimeStr || '').substring(0, 10);
                        const dParsed2 = new Date(dStr2 + 'T12:00:00');
                        const isDom2 = !isNaN(dParsed2) && dParsed2.getDay() === 0;
                        const limiteDsr = isDom2 ? 120 : MIN_VR;
                        tipo2 = hT2 >= limiteDsr ? '' : 'folga';
                    } else if (semHor2 && trb2) {
                        // Dia de descanso (sem horário) mas trabalhou:
                        // SAB: precisa de 6h (360min) para ganhar VR; abaixo disso = ainda é folga descontada
                        // DOM / outros: precisa de 2h (120min)
                        const dStr2 = String(d.date || d.dateTimeStr || '').substring(0, 10);
                        const dParsed2 = new Date(dStr2 + 'T12:00:00');
                        const isSat2 = !isNaN(dParsed2) && dParsed2.getDay() === 6;
                        const vrLimite2 = isSat2 ? 360 : 120;
                        if (hT2 < vrLimite2) tipo2 = 'folga'; // trabalho insuficiente → folga
                        // else tipo2 = '' (trabalhou o suficiente → conta como VR)
                    } else if (semHor2 && !trb2) {
                        tipo2 = 'folga'; // Dia de descanso sem trabalho
                    } else if (d.faltaDiaInteiro || (!trb2 && !semHor2)) {
                        tipo2 = 'falta';
                    }

                    if (tipo2 === 'justificado' || tipo2 === 'falta') faltasTotal++;
                    if (tipo2 === 'justificado') faltasJustificadasTotal++; // faltas c/ justificativa real
                    if (tipo2 === 'folga') folgasTotal++;
                });

                faltasJanela = faltasTotal; // será aplicado em s.faltas abaixo
                const faltasJustificadasJanela = faltasJustificadasTotal; // só justificadas (supervisão)


                // ── 4. Calcular CRÉDITO pelo mês SEGUINTE (M+1) ──────────────────
                //    Selecionando Maio → crédito para Junho
                //    EXCEÇÃO: Intermitente → crédito = dias trabalhados no próprio período
                const isIntermitente = (c.tipo_contrato || '').toLowerCase().includes('intermitente');

                let diasCredito;
                if (isIntermitente) {
                    // Intermitente: conta apenas os dias efetivamente trabalhados na janela
                    diasCredito = apuracaoParaCartao.filter(d => {
                        const h = d.totalHorasTrabalhadas || d.horasUteis || 0;
                        return (d.diasTrabalhados || 0) > 0 || h > 0;
                    }).length;
                } else {
                    diasCredito = await _calcularDiasEscala(c, creditAno, creditMes);
                }

                const s = _recibosSelecoes[c.id];
                s.diasTrabalhados = diasCredito; // dias de escala p/ VT/VC
                s.folgasVR = folgasVR;
                s.faltasVR = faltasVR;
                s.folgasVT = folgasVT;
                s.faltasVT = faltasVT;

                // ── diasVR = dias com horário contratual agendado na janela RHID ──
                // Regra VR: conta todo dia em que o colaborador tinha escala contratual.
                // Exclui: FOLGA ESCALA sem horário (5x2/6x1), DSR puro de Domingo, FERIADO sem escala.
                // Inclui: TRABALHADO, JUSTIFICADO, FALTA, DSR e FERIADO em dias agendados (7x0).
                // FALLBACK: se RHID retorna idHorarioContratual=0 mas o colaborador trabalhou >= 6h
                //   (ex: DSR marcado incorretamente), o dia conta como dia VR pelo trabalho realizado.
                // Fallback final: sem dados RHID → usa dias de escala.
                // MIN_VR já definido acima (360 min = 6h)
                if (apuracaoParaCartao.length > 0) {
                    s.diasVR = apuracaoParaCartao.filter(d => {
                        // Trabalho externo: campo/serviço fora do escritório → sempre conta VR
                        if (d.idJustification) {
                            const abrVR = (d.abreviationJustification || '').toLowerCase().trim();
                            const obVR  = (d.toolTipAlert || '').toLowerCase();
                            const isExtVR = obVR.includes('externo')
                                         || abrVR === 'te' || abrVR === 't.e.'
                                         || abrVR.startsWith('te ') || abrVR.includes('ext');
                            if (isExtVR) return true; // trab. externo → conta VR
                            return false; // falta justificada → não conta VR
                        }

                        // Dia agendado = tem horário contratual cadastrado no RHID
                        const temHorario = (d.idHorarioContratual || 0) > 0
                                        || (d.strHorarioContratualSimples || '').trim() !== '';
                        if (temHorario) return true; // agendado → conta

                        // FALLBACK: trabalhou >= 6h sem horário cadastrado
                        const minTrabFallback = d.totalHorasTrabalhadas || 0;
                        return minTrabFallback >= MIN_VR;
                    }).length;
                } else {
                    s.diasVR = diasCredito; // fallback: sem dados RHID → usa escala
                }

                // ── Jantar = trabalhou (previsto + 3h) E mínimo 9h totais ──────────────────────────
                // Regra: colaborador trabalha 3h além do previsto E totaliza pelo menos 9h no dia.
                // Sem escala prevista (DSR): exige mínimo 12h.
                // Administrativo nunca recebe jantar.
                const _parseHorasPrevistas = (d) => {
                    // Tenta usar horasUteis do RHID primeiro
                    if (d.horasUteis && d.horasUteis > 0) return d.horasUteis;
                    // Faz parse do horário contratual
                    const horStr = (d.strHorarioContratualSimples || '').trim();
                    if (!horStr) return 0;
                    let total = 0;
                    horStr.split(/[\r\n]+/).forEach(p => {
                        const m = p.trim().match(/(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})/);
                        if (m) {
                            const sai = parseInt(m[3])*60 + parseInt(m[4]);
                            const ent = parseInt(m[1])*60 + parseInt(m[2]);
                            if (sai > ent) total += (sai - ent);
                        }
                    });
                    return total;
                };
                const tipoDepto = _recibosDeptTipoMap[(c.departamento||'').trim()] || '';
                if (tipoDepto !== 'Administrativo' && apuracaoParaCartao.length > 0) {
                    s.diasExtra = apuracaoParaCartao.filter(d => {
                        const minTrab = d.totalHorasTrabalhadas || 0;
                        const hPrev = _parseHorasPrevistas(d);
                        if (hPrev > 0) {
                            // SAB com jornada curta (≤5h = ≤300min): jantar exige mínimo 11h01 (661min)
                            // Aplica-se ao SAB meio-dia (ex: "08:00-12:00", 4h)
                            const dStr = String(d.date || d.dateTimeStr || '').substring(0,10);
                            const dParsed = new Date(dStr + 'T12:00:00');
                            const isSatTbl = !isNaN(dParsed) && dParsed.getDay() === 6;
                            const minJantar = (isSatTbl && hPrev <= 300) ? 661 : 540;
                            return minTrab >= Math.max(hPrev + 180, minJantar);
                        }
                        // Sem escala (DSR, etc.): mínimo 12h (720min)
                        return minTrab >= 720;
                    }).length;
                } else if (tipoDepto === 'Administrativo') {
                    s.diasExtra = 0;
                }
                // (se não há apuração, mantém diasExtra que veio do histórico ou do RHID)

                // ── Calcular FOLGAS da janela ──────────────────────────────────────
                // Agora usa folgasTotal da contagem unificada acima
                // Intermitente: nunca tem faltas; Supervisão: sem desconto de faltas
                const isSupervisaoColab = (() => {
                    const dept = (c.departamento || '').toLowerCase();
                    const cargo = (c.cargo || '').toLowerCase();
                    return dept.includes('supervis') || cargo.includes('supervis')
                        || cargo.includes('sup.') || cargo.startsWith('sup ');
                })();

                if (isSupervisaoColab) {
                    // Supervisão trabalha Seg-Sex:
                    // Folgas = todos os SAB + DOM no período + feriados em dias úteis
                    let folgasSup = 0;
                    // Contar SAB e DOM pelo calendário (independente do RHID)
                    for (let dtIt = new Date(janelaIni); dtIt <= janelaFim; dtIt.setDate(dtIt.getDate() + 1)) {
                        const dow = dtIt.getDay();
                        if (dow === 0 || dow === 6) folgasSup++; // DOM e SAB
                    }
                    // Adicionar feriados que caíram em dia útil (Seg-Sex)
                    apuracaoParaCartao.forEach(d => {
                        if (d.isHoliday) {
                            const dtH = parseDia(d);
                            if (dtH) {
                                const dow = dtH.getDay();
                                if (dow >= 1 && dow <= 5) folgasSup++; // Feriado em dia útil
                            }
                        }
                    });
                    s.folgas = folgasSup;
                } else {
                    s.folgas = folgasTotal;
                }




                // ── 5. Aplicar faltas da janela + metadados ──────────────────────
                // "encontrado" = RHID achou dados no mês selecionado OU mês anterior
                // OU há registros na janela (colaborador novo que só tem dados em M)
                const encontrado = data1?.encontrado || data2?.encontrado || apuracaoParaCartao.length > 0;

                if (encontrado) {
                    // Intermitente: sem faltas. Supervisão: conta apenas falta com justificativa
                    // (não conta ausências simples que o RHID detecta incorretamente)
                    s.faltas = isIntermitente ? 0
                             : isSupervisaoColab ? faltasJustificadasJanela
                             : faltasJanela;

                    // Cartão de ponto: período 28/M-1 → 28/M
                    if (apuracaoParaCartao.length > 0) {
                        s.apuracaoDiaria = apuracaoParaCartao;
                    }
                    // Nota: diasExtra (jantar) já foi calculado acima a partir da apuração diária (> 10h)

                    // Férias: zera faltas
                    const isFerias = window._isColabFerias(c, ano, mes);
                    if (isFerias) s.faltas = 0;

                    // Status: erro apenas se M (selecionado) não tem dados E não há registros na janela
                    // (data2 pode não ter dados para colaboradores recém-admitidos — isso é normal)
                    const aviso = data1?.aviso && !data1?.encontrado && apuracaoParaCartao.length === 0;
                    s.pontoStatus = aviso ? 'erro' : 'ok';
                    if (aviso) { semApuracao++; errosDetalhes.push(`${_recNome(c)}: sem apuração no mês selecionado`); }
                    else ok++;

                } else {
                    // Não encontrado em nenhum dos dois meses e sem registros na janela
                    s.faltas      = 0;
                    s.folgas      = 0;
                    s.pontoStatus = 'ok';
                    ok++;
                }

            } catch (ex) {
                _recibosSelecoes[c.id].pontoStatus = 'erro';
                erroApi++;
                nomesErroApi.push(_recNome(c));
                errosDetalhes.push(`${_recNome(c)}: ${ex.message}`);
            }
        }
    };


    // ── RECALCULAR supervisores por escala (nova regra) ─────────────────────
    // Supervisores auto-preenchidos passam a usar o crédito pela escala do mês atual
    for (const c of sels) {
        const s = _recibosSelecoes[c.id];
        if (s && s.isAutoSupervisao) {
            const diasEscala = await _calcularDiasEscala(c, ano, mes);
            s.diasTrabalhados = diasEscala;
            s.diasVR          = diasEscala;
            s.faltas          = 0;
            s.pontoStatus     = 'ok';
        }
    }
    // ───────────────────────────────────────────────────────────────────

    const workers = Array.from({ length: maxConcurrency }).map(() => worker());
    await Promise.all(workers);

    for (const c of sels) {
        const s = _recibosSelecoes[c.id];
        if (s) {
            if (window._isSupervisao(c)) { s.faltas = 0; }
            s.folgasVT = s.folgas;
            s.faltasVT = s.faltas;
            s.folgasVR = s.folgas;
            s.faltasVR = s.faltas;
            s.is_editado = false;
        }
    }





    _renderTabela();

    // Salvar apuração automaticamente no backend após a busca
    try {
        const valorVR = window._recibosValorVR || 35.00;
        const itensSalvar = sels.map(c => ({
            colaborador_id: c.id,
            dias_trabalhados: _recibosSelecoes[c.id].diasTrabalhados,
            dias_vr: _recibosSelecoes[c.id].diasVR,
            faltas: _recibosSelecoes[c.id].faltas,
            folgas: _recibosSelecoes[c.id].folgas || 0,
            folgas_vt: _recibosSelecoes[c.id].folgasVT || 0,
            faltas_vt: _recibosSelecoes[c.id].faltasVT || 0,
            folgas_vr: _recibosSelecoes[c.id].folgasVR || 0,
            faltas_vr: _recibosSelecoes[c.id].faltasVR || 0,
            dias_extra: _recibosSelecoes[c.id].diasExtra,
            valor_vr: valorVR,
            apuracao_diaria: (_recibosSelecoes[c.id].apuracaoDiaria && _recibosSelecoes[c.id].apuracaoDiaria.length > 0) ? JSON.stringify(_recibosSelecoes[c.id].apuracaoDiaria) : null
        }));
        fetch(`${API_URL}/recibos/salvar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ mes, ano, itens: itensSalvar })
        }).catch(e => console.warn('Erro ao auto-salvar histórico após busca do ponto:', e));
    } catch (e) {
        console.warn('Erro preparatorio ao auto-salvar:', e);
    }

    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ph ph-fingerprint"></i> Buscar Ponto (RHID)'; }

    // Badge de resultado
    if (badge) {
        const partes = [];
        if (ok         > 0) partes.push(`<span style="color:#059669;"><i class="ph ph-check-circle"></i> ${ok} importado${ok>1?'s':''}</span>`);
        if (semApuracao> 0) partes.push(`<span style="color:#f59e0b;"><i class="ph ph-warning"></i> ${semApuracao} sem apuração</span>`);
        if (semCadastro> 0) partes.push(`<span style="color:#f59e0b;" title="${nomesSemCadastro.join('&#10;')}"><i class="ph ph-user-minus"></i> ${semCadastro} sem cadastro RHID</span>`);
        if (erroApi    > 0) partes.push(`<span style="color:#ef4444;" title="${nomesErroApi.join('&#10;')}"><i class="ph ph-x-circle"></i> ${erroApi} erro API</span>`);
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

    // ── Registrar log de busca de ponto ──────────────────────────────────
    const _nomesBuscados = sels
        .filter(c => _recibosSelecoes[c.id]?.pontoStatus === 'ok')
        .map(c => _recNome(c));
    _recLog_registrar('ponto', mes, ano, _nomesBuscados);
    _recLog_renderizarPainel();
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
    const valorVR = window._recibosValorVR || 35.00;
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
        const s = _recibosSelecoes[c.id] || { diasTrabalhados: 0, diasVR: 0, faltas: 0, folgas: 0, diasExtra: 0 };
        const m = (c.meio_transporte||'').toLowerCase();

        // VR — sempre para todos
        corpo += _buildReciboBlock('VR', c, s, mes, mesNome, ano, valorVR, logo);

        // VT ou VC — conforme meio_transporte cadastrado
        if (_isVT(m)) { corpo += '<div class="pb"></div>' + _buildReciboBlock('VT', c, s, mes, mesNome, ano, valorVR, logo); }
        if (_isVC(m)) { corpo += '<div class="pb"></div>' + _buildReciboBlock('VC', c, s, mes, mesNome, ano, valorVR, logo); }
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

    // ── Registrar log de geração de recibos ──────────────────────────────
    _recLog_registrar('recibos', mes, ano, sels.map(c => _recNome(c)));
    _recLog_renderizarPainel();
};


window.carregarHistoricoRecibos = async function () {
    const mes = document.getElementById('rec-mes')?.value;
    const ano = document.getElementById('rec-ano')?.value;
    if (!mes || !ano) return;

    // ── Atualiza o campo "Dias (Mês Seg.)" automaticamente ─────────────────
    // Selecionando Maio (mes=5) → conta dias de Junho: new Date(ano, 6, 0) = 30
    const elBruto = document.getElementById('rec-dias-bruto');
    if (elBruto) {
        const diasProxMes = new Date(parseInt(ano), parseInt(mes) + 1, 0).getDate();
        elBruto.value = diasProxMes;
        window._recibos_diasBruto = diasProxMes;
    }
    
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
                    // Se dias_vr foi salvo como 0 mas dias_trabalhados é válido, usa dias_trabalhados
                    _recibosSelecoes[h.colaborador_id].diasVR = (h.dias_vr != null && h.dias_vr > 0)
                        ? h.dias_vr
                        : h.dias_trabalhados;

                    _recibosSelecoes[h.colaborador_id].faltas = h.faltas;
                    _recibosSelecoes[h.colaborador_id].folgas = h.folgas || 0;
                    _recibosSelecoes[h.colaborador_id].folgasVT = h.folgas_vt != null ? h.folgas_vt : (h.folgas || 0);
                    _recibosSelecoes[h.colaborador_id].faltasVT = h.faltas_vt != null ? h.faltas_vt : h.faltas;
                    _recibosSelecoes[h.colaborador_id].folgasVR = h.folgas_vr != null ? h.folgas_vr : (h.folgas || 0);
                    _recibosSelecoes[h.colaborador_id].faltasVR = h.faltas_vr != null ? h.faltas_vr : h.faltas;
                    _recibosSelecoes[h.colaborador_id].valVTEdit = h.valor_vt_editado != null ? h.valor_vt_editado : null;
                    _recibosSelecoes[h.colaborador_id].valVREdit = h.valor_vr_editado != null ? h.valor_vr_editado : null;
                    _recibosSelecoes[h.colaborador_id].diasExtra = h.dias_extra;
                    _recibosSelecoes[h.colaborador_id].historicoEncontrado = true;
                    _recibosSelecoes[h.colaborador_id].selecionado = true; // Auto-seleciona os que já estavam salvos
                    if (h.apuracao_diaria) {
                        try {
                            const parsed = JSON.parse(h.apuracao_diaria);
                            _recibosSelecoes[h.colaborador_id].apuracaoDiaria = Array.isArray(parsed) ? parsed : [];
                        } catch(e){}
                    }
                    _recibosSelecoes[h.colaborador_id].pontoStatus = 'ok'; // Mantém a cor verde/azul após carregamento
                }
            });
        }
    } catch(e) { console.warn('Erro ao carregar histórico:', e); }
    
    // Auto-fill pela escala cadastrada (para quem ainda não tem histórico)
    for (const c of _recibosAllColabs) {
        const s = _recibosSelecoes[c.id];
        if (!s) continue;
        const isSupervisao = window._isSupervisao(c);
        if (!s.historicoEncontrado) {
            // Calcula crédito pela escala do mês de crédito (M+1)
            const cMesAuto = parseInt(mes) === 12 ? 1 : parseInt(mes) + 1;
            const cAnoAuto = parseInt(mes) === 12 ? parseInt(ano) + 1 : parseInt(ano);
            const diasEscala = await _calcularDiasEscala(c, cAnoAuto, cMesAuto);
            s.diasTrabalhados = diasEscala;
            s.diasVR          = diasEscala; // dias de escala = base do bruto VR
            // Faltas/folgas ficam 0 até o RHID ser consultado
            s.faltas = 0;
            s.folgas = 0;
        }
        if (isSupervisao) {
            s.isAutoSupervisao = true; // Garante a cor azul para supervisores
            s.faltas = 0;
            s.faltasVT = 0;
            s.faltasVR = 0;
        }
    }

    _filtrarERendar();
    
    // Atualiza checkbox 'Selecionar todos'
    const sa = document.getElementById('rec-select-all');
    if (sa) sa.checked = _recibosFiltrados.length > 0 && _recibosFiltrados.every(c => _recibosSelecoes[c.id]?.selecionado);

    // Atualiza painel de auditoria ao trocar mês/ano
    _recLog_renderizarPainel();
};

window.anexarRecibosDocsMassa = async function () {
    const sels = _recibosAllColabs.filter(c => _recibosSelecoes[c.id]?.selecionado);
    if (!sels.length) {
        if (typeof Swal !== 'undefined') Swal.fire('Atenção', 'Selecione ao menos um colaborador para anexar os recibos.', 'warning');
        return;
    }

    const mesValue = document.getElementById('rec-mes')?.value;
    const mes = mesValue ? String(mesValue).padStart(2, '0') : '';
    const ano = document.getElementById('rec-ano')?.value;
    const mesNome = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][parseInt(mesValue)-1];
    const valorVR = window._recibosValorVR || 35.00;

    const btnAnexar = document.getElementById('btn-anexar-massa');
    if (btnAnexar) { btnAnexar.disabled = true; btnAnexar.innerHTML = '<i class="ph ph-spinner" style="animation:rec-spin 1s linear infinite;"></i> Gerando PDFs...'; }
    _recShowBannerAnexando(0, sels.length);
    _ensureSpinCss();

    try {
        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');

        // 1. Salvar os dados (histórico)
        const itensSalvar = sels.map(c => ({
            colaborador_id: c.id,
            dias_trabalhados: _recibosSelecoes[c.id].diasTrabalhados,
            dias_vr: _recibosSelecoes[c.id].diasVR,
            faltas: _recibosSelecoes[c.id].faltas,
            folgas: _recibosSelecoes[c.id].folgas || 0,
            folgas_vt: _recibosSelecoes[c.id].folgasVT || 0,
            faltas_vt: _recibosSelecoes[c.id].faltasVT || 0,
            folgas_vr: _recibosSelecoes[c.id].folgasVR || 0,
            faltas_vr: _recibosSelecoes[c.id].faltasVR || 0,
            dias_extra: _recibosSelecoes[c.id].diasExtra,
            valor_vr: valorVR,
            apuracao_diaria: JSON.stringify(_recibosSelecoes[c.id].apuracaoDiaria || [])
        }));
        await fetch(`${API_URL}/recibos/salvar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ mes, ano, itens: itensSalvar })
        });

        // 2. Gerar PDFs NO BROWSER (sem Chromium no servidor) e enviar o binário
        const logo = await _recGetLogo();
        let sucesso = 0, falha = 0;

        // Usar iframe isolado: CSS não vaza para o sistema, não bloqueia cliques, não pisca fontes
        const pdfIframe = document.createElement('iframe');
        pdfIframe.style.cssText = 'position:fixed;left:0;top:0;width:794px;height:1px;border:none;visibility:hidden;pointer-events:none;z-index:-1;';
        document.body.appendChild(pdfIframe);

        for (let idx = 0; idx < sels.length; idx++) {
            const c = sels[idx];
            const s = _recibosSelecoes[c.id] || { diasTrabalhados: 0, diasVR: 0, faltas: 0, diasExtra: 0 };
            const m = (c.meio_transporte||'').toLowerCase();

            // Atualizar progresso
            const btnAn = document.getElementById('btn-anexar-massa');
            if (btnAn) btnAn.innerHTML = `<i class="ph ph-spinner" style="animation:rec-spin 1s linear infinite;"></i> Gerando PDF ${idx+1}/${sels.length}...`;
            _recShowBannerAnexando(idx, sels.length);

            try {
                // Montar HTML do recibo
                let corpo = '';
                // 1123px é a altura proporcional a 794px de largura para o formato A4 (297/210 = 1.414)
                const pageDiv = '<div style="width:794px; height:1123px; position:relative; overflow:hidden; background:#fff;">';
                corpo += pageDiv + _buildReciboBlock('VR', c, s, mes, mesNome, ano, valorVR, logo) + '</div>';
                if (_isVT(m)) { corpo += pageDiv + _buildReciboBlock('VT', c, s, mes, mesNome, ano, valorVR, logo) + '</div>'; }
                if (_isVC(m)) { corpo += pageDiv + _buildReciboBlock('VC', c, s, mes, mesNome, ano, valorVR, logo) + '</div>'; }

                // Escrever HTML no iframe isolado (CSS fica dentro do iframe, não afeta o sistema)
                const iDoc = pdfIframe.contentDocument || pdfIframe.contentWindow.document;
                iDoc.open();
                iDoc.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
                  *{box-sizing:border-box;margin:0;padding:0;}
                  body{font-family:Arial,Helvetica,sans-serif;font-size:12px;background:#fff;color:#111;width:794px;}
                </style></head><body>${corpo}</body></html>`);
                iDoc.close();

                // Aguardar render do iframe
                await new Promise(r => setTimeout(r, 150));

                // Capturar com html2canvas o body do iframe
                const canvas = await html2canvas(iDoc.body, {
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    allowTaint: false,
                    backgroundColor: '#ffffff',
                    width: 794,
                    windowWidth: 794
                });

                // Gerar PDF com jsPDF a partir do canvas
                const { jsPDF } = window.jspdf;
                const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
                const pageW = pdf.internal.pageSize.getWidth();
                const pageH = pdf.internal.pageSize.getHeight();
                const imgW = pageW;
                const imgH = (canvas.height * pageW) / canvas.width;
                let posY = 0;
                let remaining = imgH;
                let firstPage = true;

                while (remaining > 1) { // > 1 ignora sobras minúsculas de arredondamento que geram páginas em branco
                    if (!firstPage) pdf.addPage();
                    const srcY = posY * (canvas.width / pageW) * (canvas.height / imgH);
                    const sliceH = Math.min(pageH, remaining);

                    // Recortar a fatia desta página do canvas
                    const sliceCanvas = document.createElement('canvas');
                    sliceCanvas.width = canvas.width;
                    sliceCanvas.height = Math.round(sliceH * canvas.height / imgH);
                    const ctx = sliceCanvas.getContext('2d');
                    ctx.drawImage(canvas, 0, Math.round(posY * canvas.height / imgH), canvas.width, sliceCanvas.height, 0, 0, sliceCanvas.width, sliceCanvas.height);

                    pdf.addImage(sliceCanvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, pageW, sliceH);
                    posY += sliceH;
                    remaining -= sliceH;
                    firstPage = false;
                }

                const pdfBlob = pdf.output('blob');


                // Enviar o PDF pronto para o servidor (só salva, não gera nada)
                const safeNome = (c.nome_completo || 'Colaborador').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/\s+/g, '_');
                const nomeArquivo = `Pagamentos_${safeNome}_${mes}${ano}.pdf`;

                const formData = new FormData();
                formData.append('pdf', pdfBlob, nomeArquivo);
                formData.append('colaborador_id', c.id);
                formData.append('mes', mes);
                formData.append('ano', ano);
                formData.append('nomeArquivo', nomeArquivo);

                const resUpload = await fetch(`${API_URL}/recibos/upload-pdf-colab`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                });

                if (resUpload.ok) {
                    sucesso++;
                } else {
                    falha++;
                    console.error(`Falha upload colaborador ${c.nome_completo}`);
                }
            } catch (errColab) {
                falha++;
                console.error(`Erro colaborador ${c.nome_completo}:`, errColab.message);
            }

            // Pequena pausa entre colaboradores para não travar o browser
            await new Promise(r => setTimeout(r, 100));
        }

        // Remover iframe após processar todos
        if (pdfIframe && pdfIframe.parentNode) pdfIframe.parentNode.removeChild(pdfIframe);

        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: sucesso > 0 ? 'Concluído!' : 'Atenção',
                html: `<strong>${sucesso}</strong> recibo(s) salvo(s) com sucesso nos prontuários.${falha > 0 ? `<br><span style="color:#ef4444;">⚠️ ${falha} com erro</span>` : ''}`,
                icon: sucesso > 0 ? 'success' : 'warning',
                confirmButtonText: 'OK'
            });
        }
    } catch(e) {
        // Garantir limpeza do iframe mesmo em caso de erro
        const iframeEl = document.querySelector('iframe[style*="z-index:-1"]');
        if (iframeEl && iframeEl.parentNode) iframeEl.parentNode.removeChild(iframeEl);
        if (typeof Swal !== 'undefined') Swal.fire('Erro', 'Ocorreu um erro ao anexar: ' + e.message, 'error');
    }

    _recHideBannerAnexando();
    const btnAn2 = document.getElementById('btn-anexar-massa');
    if (btnAn2) { btnAn2.disabled = false; btnAn2.innerHTML = '<i class="ph ph-paperclip"></i> Anexar aos Docs. em Massa'; }

    // ── Registrar log de anexo em docs em massa ───────────────────────────
    const _mesAnexo = parseInt(document.getElementById('rec-mes')?.value || new Date().getMonth()+1);
    const _anoAnexo = parseInt(document.getElementById('rec-ano')?.value || new Date().getFullYear());
    const _selsFinal = _recibosAllColabs.filter(c => _recibosSelecoes[c.id]?.selecionado);
    _recLog_registrar('anexo', _mesAnexo, _anoAnexo, _selsFinal.map(c => _recNome(c)));
    _recLog_renderizarPainel();
};

// ─── Relatório de Conferência ─────────────────────────────────────────────────
window.baixarConferenciaPonto = async function () {
    const sels = _recibosAllColabs.filter(c => _recibosSelecoes[c.id]?.selecionado);
    if (!sels.length) {
        if (typeof Swal !== 'undefined') Swal.fire('Atenção', 'Selecione ao menos um colaborador.', 'warning');
        return;
    }

    const mes = document.getElementById('rec-mes')?.value;
    const ano = document.getElementById('rec-ano')?.value;
    const mesInt = parseInt(mes);
    const anoInt = parseInt(ano);
    const mesNome = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][mesInt-1];
    const valorVR = window._recibosValorVR || 35.00;

    // Período da conferência: 01/M → último dia de M (mês selecionado completo)
    const dtIniConf = new Date(anoInt, mesInt - 1, 1);  // 01/M
    const dtFimConf = new Date(anoInt, mesInt, 0);       // último dia de M
    const fmtDate = (d) => `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
    const periodoTexto = `${fmtDate(dtIniConf)} a ${fmtDate(dtFimConf)}`;

    // Salvar apuração no backend para guardar o histórico da conferência
    try {
        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        const itensSalvar = sels.map(c => ({
            colaborador_id: c.id,
            dias_trabalhados: _recibosSelecoes[c.id].diasTrabalhados,
            dias_vr: _recibosSelecoes[c.id].diasVR,
            faltas: _recibosSelecoes[c.id].faltas,
            folgas: _recibosSelecoes[c.id].folgas || 0,
            folgas_vt: _recibosSelecoes[c.id].folgasVT || 0,
            faltas_vt: _recibosSelecoes[c.id].faltasVT || 0,
            folgas_vr: _recibosSelecoes[c.id].folgasVR || 0,
            faltas_vr: _recibosSelecoes[c.id].faltasVR || 0,
            dias_extra: _recibosSelecoes[c.id].diasExtra,
            valor_vr: valorVR,
            apuracao_diaria: (_recibosSelecoes[c.id].apuracaoDiaria && _recibosSelecoes[c.id].apuracaoDiaria.length > 0) ? JSON.stringify(_recibosSelecoes[c.id].apuracaoDiaria) : null
        }));
        // Executar de forma assíncrona sem aguardar (sem await) para evitar bloqueio de pop-up
        fetch(`${API_URL}/recibos/salvar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ mes, ano, itens: itensSalvar })
        }).catch(e => console.warn('Erro ao salvar histórico da conferência:', e));
    } catch (e) {
        console.warn('Erro preparatorio ao salvar histórico:', e);
    }

    let corpo = '';
    sels.forEach(c => {
        const s = _recibosSelecoes[c.id];
        const nome = _recNome(c);
        let linhas = '';

        if (!s.apuracaoDiaria || !Array.isArray(s.apuracaoDiaria) || s.apuracaoDiaria.length === 0) {
            // Verificar se o colaborador tem data de admissão dentro do período → gera linhas placeholder
            const admStr = c.data_admissao || '';
            let admDt = null;
            if (admStr) {
                const admParsed = admStr.includes('/')
                    ? admStr.split('/').reverse().join('-') + 'T00:00:00'
                    : admStr + 'T00:00:00';
                admDt = new Date(admParsed);
                if (isNaN(admDt)) admDt = null;
            }
            const inicioReal = (admDt && admDt > dtIniConf) ? admDt : dtIniConf;

            if (admDt && admDt <= dtFimConf) {
                // Gera linhas para dias úteis do período (seg-sex), marcados como SEM REGISTRO
                const placeholders = [];
                const cur = new Date(inicioReal);
                while (cur <= dtFimConf) {
                    const dow = cur.getDay();
                    if (dow !== 0 && dow !== 6) {
                        const dd = String(cur.getDate()).padStart(2,'0');
                        const mm = String(cur.getMonth()+1).padStart(2,'0');
                        const yy = cur.getFullYear();
                        placeholders.push(`
                        <tr style="background:#fff8f0;">
                          <td style="padding:4px 3px;border-bottom:1px solid #e2e8f0;white-space:nowrap;font-size:10.5px;">${dd}/${mm}/${yy}</td>
                          <td colspan="14" style="padding:4px 3px;border-bottom:1px solid #e2e8f0;color:#f59e0b;font-weight:600;font-size:10.5px;">SEM REGISTRO NO RHID</td>
                        </tr>`);
                    }
                    cur.setDate(cur.getDate() + 1);
                }
                linhas = placeholders.length > 0
                    ? placeholders.join('')
                    : `<tr><td colspan="15" style="padding:12px;text-align:center;color:#94a3b8;">Nenhum dia útil no período (${fmtDate(inicioReal)} a ${fmtDate(dtFimConf)}).</td></tr>`;
            } else {
                linhas = `<tr><td colspan="15" style="padding:15px;text-align:center;color:#ef4444;">Nenhuma apuração diária encontrada. Certifique-se de "Buscar Ponto (RHID)" antes.</td></tr>`;
            }

        } else {
            // ── Acumuladores para linha de TOTAIS ────────────────────────────────
            let totNormais=0, totNoturno=0, totFaltaAtraso=0, totAbono=0;
            let totExtra60=0, totExtra100=0, totExtraDiurna=0, totExtraNoturna=0;
            const DS_CONF = ['DOM','SEG','TER','QUA','QUI','SEX','SAB'];
            const fmtHM = m => m ? Math.floor(m/60).toString().padStart(2,'0')+':'+(m%60).toString().padStart(2,'0') : '';
            const tdC = (v,st='') => `<td style="padding:4px 3px;border-bottom:1px solid #e2e8f0;font-size:10.5px;${st}">${v||''}</td>`;

            const rowsArr = s.apuracaoDiaria.map(d => {
                // Data + dia da semana
                let diaStr = String(d.date || d.dateTimeStr || '').substring(0,10);
                let diaFmt = diaStr, dsStr = '';
                if (diaStr.includes('-')) {
                    const p = diaStr.split('-');
                    if (p.length === 3) {
                        diaFmt = `${p[2]}/${p[1]}/${p[0]}`;
                        const dt = new Date(`${p[0]}-${p[1]}-${p[2]}T12:00:00`);
                        if (!isNaN(dt.getTime())) dsStr = DS_CONF[dt.getDay()];
                    }
                }

                // ── Classificação do status (JUSTIFICADO antes de DSR/FOLGA) ─────────
                const stRaw = (d.status||d.situacao||d.tipo||'').toString().toLowerCase();
                const isDSRMin = (d.dsrConsideradoMinutos||0) > 0;
                const isFolgaSt = stRaw.includes('folg') || stRaw.includes('dsr');
                const semHor = ((d.idHorarioContratual||0)===0 && (d.strHorarioContratualSimples||'').trim()==='');
                // IMPORTANTE: totalHorasTrabalhadas já inclui horas noturnas — não somar horasTotalNoturno
                const hTrab = d.totalHorasTrabalhadas || 0;
                const trab = (d.diasTrabalhados||0)>0 || hTrab>0;

                let tipo = '';
                if (d.isHoliday) { tipo = 'feriado'; }
                else if (d.idJustification) {
                    const ob = (d.toolTipAlert||'').toLowerCase();
                    // DEBUG: mostra todos os campos relevantes do dia justificado
                    console.log('[JUSTIF_DEBUG]', diaStr, {
                        idJustification: d.idJustification,
                        toolTipAlert: d.toolTipAlert,
                        status: d.status,
                        situacao: d.situacao,
                        tipo: d.tipo,
                        ocorrencia: d.ocorrencia,
                        descricao: d.descricao,
                        nomeJustificativa: d.nomeJustificativa,
                        tipoJustificativa: d.tipoJustificativa,
                        motivoJustificativa: d.motivoJustificativa,
                        justificativa: d.justificativa,
                        observacao: d.observacao,
                        obs: d.obs,
                        descricaoOcorrencia: d.descricaoOcorrencia,
                        all_keys: Object.keys(d).filter(k => !['strHorarioContratualSimples','entrada1','saida1','entrada2','saida2'].includes(k))
                    });
                    const isErroP = ob.includes('erro no ponto');
                    const abr = (d.abreviationJustification || '').toLowerCase().trim();
                    const stJust = (d.status || d.situacao || d.tipo || '').toString().toLowerCase();
                    const isExterno = ob.includes('trabalho externo') || ob.includes('trab. externo')
                                   || ob.includes('trab externo') || ob.includes('externo')
                                   || (ob.includes('servi') && ob.includes('externo'))
                                   // Campo status/situacao do RHID
                                   || stJust.includes('externo') || stJust.includes('trab. ext')
                                   || stJust === 'te'
                                   // Abreviação do RHID (ex: "TE", "T.E.", "TRAB.EXT.")
                                   || abr === 'te' || abr === 't.e.' || abr.startsWith('te ')
                                   || abr.includes('ext');
                    if (isErroP || hTrab > 0) {
                        tipo = ''; // Trabalhado normal (erro de ponto / horas presentes)
                    } else if (isExterno) {
                        tipo = 'trab_externo'; // Trabalho externo: não é falta, não é justificado
                    } else {
                        const jn = (d.nomeJustificativa || d.justificativa || d.abreviationJustification || '').toLowerCase();
                        if (ob.includes('atestado')||ob.includes('medic')) {
                            tipo = 'atestado';
                        } else if (ob.includes('férias')||ob.includes('ferias')||jn.includes('ferias')||jn.includes('férias')) {
                            tipo = 'ferias';
                        } else {
                            tipo = 'justificado';
                        }
                    }
                } else if (isFolgaSt || d.folga===true || isDSRMin) {
                    tipo = hTrab >= 360 ? '' : 'folga';
                } else if (semHor && !trab) { tipo = 'folga'; }
                else if (d.faltaDiaInteiro || (!trab && !semHor && !d.idJustification)) { tipo = 'falta'; }

                // ── Override manual: Justificado ↔ Externo ──────────────────────
                // Quando o RHID não distingue os tipos, o usuário pode clicar para alternar
                window._pontoTipoOverride = window._pontoTipoOverride || {};
                const _ovKey = String(c.id) + '_' + diaStr;
                if (tipo === 'justificado' && window._pontoTipoOverride[_ovKey] === 'externo') {
                    tipo = 'trab_externo'; // marcado manualmente como Externo
                }

                // PREVISTO — folga e dias sem escala não mostram horário previsto
                const prevStr = (d.strHorarioContratualSimples||'').trim().replace(/[\r\n]+/g,' ') || c.escala || '';
                const previsto = tipo==='feriado' ? 'FERIADO' : (tipo==='folga' ? '' : prevStr);

                // Número de períodos no horário do SAB (para detectar tipo de escala)
                // 1 período (ex: "08:30-12:00") = compensação/meio-dia → VR ≥ 6h
                // 2+ períodos (ex: "08:00-12:00 13:00-17:00") = dia completo (6x1) → VR ≥ 2h
                const horBruto = (d.strHorarioContratualSimples || '').trim();
                const satPeriodos = horBruto.split(/[\r\n]+/).filter(p => /\d{1,2}:\d{2}/.test(p)).length;
                const isSatDiaCompleto = dsStr === 'SAB' && satPeriodos >= 2;

                // ── Horas previstas/contratadas (para cálculo de Jantar) ────────────────
                let hPrevConf = d.horasUteis || 0;
                if (!hPrevConf && d.strHorarioContratualSimples && d.strHorarioContratualSimples.trim()) {
                    d.strHorarioContratualSimples.trim().split(/[\r\n]+/).forEach(p => {
                        const m = p.trim().match(/(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})/);
                        if (m) {
                            const sv = parseInt(m[3])*60+parseInt(m[4]);
                            const ev = parseInt(m[1])*60+parseInt(m[2]);
                            if (sv > ev) hPrevConf += (sv - ev);
                        }
                    });
                }

                // Apontamentos individuais
                let marc = [];
                if (d.listAfdtManutencao && d.listAfdtManutencao.length>0) {
                    marc = d.listAfdtManutencao.map(m => {
                        if (m._typeClassification === 'F') return 'Falta';
                        const h = Math.floor(m.hora/100).toString().padStart(2,'0');
                        const mn = (m.hora%100).toString().padStart(2,'0');
                        const isMan = m.isManual || m._typeRegister === 'I';
                        return h+':'+mn+(m.isPreAssigned?' (P)':'')+(isMan?' (I)':'');
                    });
                } else if (d.marcacoes && Array.isArray(d.marcacoes)) {
                    marc = d.marcacoes.map(m => m.hora||m.time||m);
                }
                const e1=marc[0]||'', s1=marc[1]||'', e2=marc[2]||'', s2=marc[3]||'';
                const obsT = (d.toolTipAlert||'').trim();

                // ── Auto-detecção Externo via marcacões ───────────────────────────────
                // O RHID coloca o texto "Trabalho Externo" nas entradas de listAfdtManutencao
                // Verificamos o JSON completo de cada entrada para não depender de campo específico
                if (tipo === 'justificado') {
                    const _allMarc = d.listAfdtManutencao || d.marcacoes || [];
                    const _textos = _allMarc.map(m => JSON.stringify(m||'')).join(' ').toLowerCase();
                    if (_textos.includes('externo') || _textos.includes('trabalho ext') ||
                        // Também testa os campos de texto brutos da marcacão (m.descricao, m.label etc.)
                        _allMarc.some(m => {
                            const v = String(m.descricao||m.label||m.observacao||m.obs||m.tipo||m.type||m.text||'').toLowerCase();
                            return v.includes('externo');
                        })) {
                        tipo = 'trab_externo';
                        console.log('[CONF] Auto-detectado Trab.Externo via marcacões:', diaStr, _allMarc);
                    } else {
                        // Log de debug para identificar campos disponíveis no dia justificado
                        console.log('[CONF] Justificado (sem externo detectado):', diaStr, {
                            abreviationJustification: d.abreviationJustification,
                            toolTipAlert: d.toolTipAlert,
                            listAfdtManutencao: d.listAfdtManutencao,
                            marcacoes: d.marcacoes,
                            allKeys: Object.keys(d)
                        });
                    }
                }

                let ent1='',sai1='',ent2='',sai2='';
                if (tipo==='feriado' && !e1)       { ent1='Feriado: '+(d.holidayName||''); }
                else if (tipo==='folga' && !e1)    { ent1='Folga'; }
                else if (tipo==='ferias' && !e1)   { ent1='Férias'; }
                else if (tipo==='atestado')         { ent1='Atestado Médico'; }   // só ENT.1, resto vazio
                else if (tipo==='justificado')      {
                    // RHID não distingue tipos: mostra toggle clicavel (Justificado ⇔ Externo)
                    const _rowIdJ = `pconf-${c.id}-${diaStr.replace(/-/g,'')}`;
                    ent1 = `<span onclick="window._toggleJustExterno('${c.id}','${diaStr}','${_rowIdJ}')" title="Clique para marcar como Trabalho Externo" style="cursor:pointer;border-bottom:1px dashed #b91c1c;padding-bottom:1px;">Justificado ⇕</span>`;
                }
                else if (tipo==='trab_externo')     {
                    const _isManualExt = (window._pontoTipoOverride || {})[String(c.id) + '_' + diaStr] === 'externo';
                    if (_isManualExt) {
                        const _rowIdE = `pconf-${c.id}-${diaStr.replace(/-/g,'')}`;
                        ent1 = `<span onclick="window._toggleJustExterno('${c.id}','${diaStr}','${_rowIdE}')" title="Clique para marcar como Justificado" style="cursor:pointer;border-bottom:1px dashed #374151;padding-bottom:1px;">Externo ⇕</span>`;
                    } else {
                        ent1 = 'Trab. Externo';
                    }
                }
                else if (tipo==='falta')            { ent1='Falta'; }               // só ENT.1, resto vazio
                else { ent1=e1; sai1=s1; ent2=e2; sai2=s2; }

                // Horas e extras
                // TOTAL NORMAIS = total de horas trabalhadas no dia
                // TOTAL NOTURNO = total de horas noturnas (normais + extras) para bater com relatorio RHID
                const normMin = d.totalHorasTrabalhadas || 0;
                const notMin  = d.horasTotalNoturno || 0;
                const fatMin  = d.horasFaltaAtraso||0;
                const aboMin  = d.horasAbono||d.abono||0;
                const exDMin  = Math.max(0, d.extraDiurna||d.extraAdicionadaDiurna||0);
                const exNMin  = Math.max(0, d.extraNoturna||d.extraAdicionadaNoturna||0);
                
                let ex60=0, ex100=0;
                if (d.horaExtraDeCadaPercentual && Array.isArray(d.horaExtraDeCadaPercentual) && d.horaExtraDeCadaPercentual.length >= 2) {
                    ex60 = d.horaExtraDeCadaPercentual[0] || 0;
                    ex100 = d.horaExtraDeCadaPercentual[1] || 0;
                } else {
                    const totEx = exDMin+exNMin || Math.max(0, d.horasExtrasCalculadas || 0) || 0;
                    if (d.isHoliday||dsStr==='DOM') ex100=totEx; else ex60=totEx;
                }

                // Acumular totais
                totNormais+=normMin; totNoturno+=notMin; totFaltaAtraso+=fatMin; totAbono+=aboMin;
                totExtra60+=ex60; totExtra100+=ex100; totExtraDiurna+=exDMin; totExtraNoturna+=exNMin;

                const isFlt = tipo==='falta';
                const isSunday = dsStr === 'DOM';
                const isSat    = dsStr === 'SAB';
                const isHolidayDay = tipo === 'feriado';

                // Administrativo não recebe Jantar
                const tipoDeptoConf = (typeof _recibosDeptTipoMap !== 'undefined')
                    ? (_recibosDeptTipoMap[(c.departamento||'').trim()] || '') : '';
                const isAdminConf = tipoDeptoConf === 'Administrativo';

                // ── Elegibilidade ao Jantar ─────────────────────────────────────────
                // Regra: trabalhou >= (previsto + 3h) E >= 9h totais
                // Sem escala prevista (DSR, DOM sem escala): exige 12h
                let elegivel_jantar = false;
                if (!isAdminConf) {
                    if (hPrevConf > 0) {
                        // SAB com jornada curta (≤5h = ≤300min): jantar exige mínimo 11h01 (661min)
                        // Ex: Erik no SAB "08:00-12:00" (4h) → precisa trabalhar 11h01 para jantar
                        const minJantar = (isSat && hPrevConf <= 300) ? 661 : 540;
                        elegivel_jantar = hTrab >= Math.max(hPrevConf + 180, minJantar);
                    } else {
                        // Sem escala: 12h (720min)
                        elegivel_jantar = hTrab >= 720;
                    }
                }

                // ── Coloração ────────────────────────────────────────────────────────
                let bg = '#fff';

                if (elegivel_jantar) {
                    bg = '#e9d5ff'; // Roxo: Jantar
                } else if ((semHor || isHolidayDay) && hTrab >= (semHor && isSat && !isHolidayDay ? 360 : 120)) {
                    // Trabalhou em dia SEM horário (folga/dia livre) ou feriado e atingiu mínimo:
                    // SAB de descanso: precisa 6h (360min) | DOM/Feriado/outros: 2h (120min)
                    bg = '#fef08a';
                } else if (!semHor && hTrab >= 120 && tipo !== 'falta' && tipo !== 'folga' && tipo !== 'feriado') {
                    // Dia COM escala prevista e trabalhou normalmente → Amarelo claro
                    bg = '#fffde7';
                } else if (isFlt || tipo === 'justificado' || tipo === 'atestado') {
                    bg = '#fee2e2'; // Falta / Justificado / Atestado
                } else if (tipo === 'ferias') {
                    bg = '#e9d5ff'; // Férias (roxo)
                } else if (tipo === 'trab_externo') {
                    bg = '#fffde7'; // Trabalho Externo: amarelo claro (igual ao dia normal trabalhado)
                } else if (tipo === 'folga' || tipo === 'feriado') {
                    bg = '#f8fafc'; // Folga ou Feriado não trabalhado: azul claro
                }

                // Cor da fonte: vermelho para faltas/justificados/atestados; escuro para trab. externo e dias normais
                const isAusencia = isFlt || tipo === 'justificado' || tipo === 'atestado';
                const fontColor  = isAusencia ? '#b91c1c' : '#1e293b';

                return `<tr id="pconf-${c.id}-${diaStr.replace(/-/g,'')}" style="background:${bg};color:${fontColor};">
                    ${tdC(diaFmt+(dsStr?' - '+dsStr:''),'white-space:nowrap;')}
                    ${tdC(previsto,'font-size:9.5px;word-break:break-word;max-width:90px;')}
                    ${tdC(ent1,'white-space:nowrap;')}
                    ${tdC(sai1,'white-space:nowrap;')}
                    ${tdC(ent2,'font-size:9.5px;')}
                    ${tdC(sai2,'white-space:nowrap;')}
                    ${tdC(normMin?fmtHM(normMin):'','text-align:center;font-weight:600;')}
                    ${tdC(notMin?fmtHM(notMin):'','text-align:center;')}
                    ${tdC(isFlt?'1':'','text-align:center;font-weight:700;color:'+(isFlt?'#dc2626':'#111')+';')}
                    ${tdC(fatMin?fmtHM(fatMin):'','text-align:center;')}
                    ${tdC(aboMin?fmtHM(aboMin):'','text-align:center;')}
                    ${tdC(ex60?fmtHM(ex60):'','text-align:center;')}
                    ${tdC(ex100?fmtHM(ex100):'','text-align:center;')}
                    ${tdC(exDMin?fmtHM(exDMin):'','text-align:center;')}
                    ${tdC(exNMin?fmtHM(exNMin):'','text-align:center;')}
                </tr>`;
            });

            // Linha de TOTAIS
            const totTd = v => `<td style="padding:5px 3px;text-align:center;font-size:10.5px;border-top:2px solid #1e3a5f;">${v||''}</td>`;
            rowsArr.push(`<tr style="background:#dbeafe;font-weight:700;">
                <td colspan="6" style="padding:5px 3px;font-size:11px;border-top:2px solid #1e3a5f;">TOTAIS</td>
                ${totTd(fmtHM(totNormais))}
                ${totTd(fmtHM(totNoturno))}
                ${totTd('')}
                ${totTd(totFaltaAtraso?fmtHM(totFaltaAtraso):'')}
                ${totTd(totAbono?fmtHM(totAbono):'')}
                ${totTd(totExtra60?fmtHM(totExtra60):'')}
                ${totTd(totExtra100?fmtHM(totExtra100):'')}
                ${totTd(totExtraDiurna?fmtHM(totExtraDiurna):'')}
                ${totTd(totExtraNoturna?fmtHM(totExtraNoturna):'')}
            </tr>`);

            linhas = rowsArr.join('');
        }

        const thSt = 'padding:5px 3px;border:1px solid #1a335a;text-align:left;font-size:9px;white-space:nowrap;';
        corpo += `
        <div style="page-break-after:always;padding:12px;">
          <h2 style="margin:0 0 3px;color:#1e3a5f;font-size:14px;">Conferência de Ponto — ${nome}</h2>
          <p style="margin:0 0 10px;font-size:11px;color:#475569;"><strong>Período de desconto:</strong> ${periodoTexto}</p>
          <div style="overflow-x:auto;">
          <table style="width:100%;border-collapse:collapse;font-size:11px;table-layout:fixed;">
            <colgroup>
              <col style="width:13%"><col style="width:13%">
              <col style="width:7%"><col style="width:7%"><col style="width:7%"><col style="width:7%">
              <col style="width:6%"><col style="width:6%"><col style="width:4%"><col style="width:6%">
              <col style="width:4%"><col style="width:5%"><col style="width:5%"><col style="width:5%"><col style="width:5%">
            </colgroup>
            <thead>
              <tr style="background:#1e3a5f;color:#fff;">
                <th style="${thSt}">DIA</th>
                <th style="${thSt}">PREVISTO</th>
                <th style="${thSt}">ENT. 1</th>
                <th style="${thSt}">SAÍ. 1</th>
                <th style="${thSt}">ENT. 2</th>
                <th style="${thSt}">SAÍ. 2</th>
                <th style="${thSt}">TOTAL NORMAIS</th>
                <th style="${thSt}">TOTAL NOTURNO</th>
                <th style="${thSt}">DIA FALTA</th>
                <th style="${thSt}">FALTA E ATRASO</th>
                <th style="${thSt}">ABONO</th>
                <th style="${thSt}">EXTRA 60%</th>
                <th style="${thSt}">EXTRA 100%</th>
                <th style="${thSt}">EXTRA DIURNA</th>
                <th style="${thSt}">EXTRA NOTURNA</th>
              </tr>
            </thead>
            <tbody>${linhas}</tbody>
          </table>
          </div>
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

    const win = window.open('', '_blank', `width=${screen.availWidth},height=${screen.availHeight},top=0,left=0`);
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

// ─── Bloco HTML de Cartão de Ponto (Control iD) ──────────────────────────────
function _buildCartaoPontoBlock(c, apuracaoDiaria, mes, ano, mesNome, logoB64) {
    const safe = (v) => v || '';
    const numMatricula = safe(c.matricula_esocial) || safe(c.numero_registro) || safe(c.matricula) || '0';
    
    const fmtMin = (m) => {
        if (!m) return '';
        const hrs = Math.floor(m / 60).toString().padStart(2, '0');
        const mns = (m % 60).toString().padStart(2, '0');
        return `${hrs}:${mns}`;
    };

    let rowsHtml = '';
    let totalNormais = 0, totalNoturno = 0, totalExtra60 = 0, totalExtra100 = 0;
    let totalExtraDiurna = 0, totalExtraNoturna = 0, totalFaltaAtraso = 0;
    const diasSemana = ['DOM','SEG','TER','QUA','QUI','SEX','SAB'];
    let horarioContratualInfo = null;
    
    apuracaoDiaria.forEach(d => {
        let diaStr = String(d.date || d.dateTimeStr || '').substring(0,10);
        let diaNum = diaStr;
        let diaSemanaStr = '';
        if (diaStr.includes('-')) {
            const p = diaStr.split('-');
            if (p.length === 3) {
                diaNum = `${p[2]}/${p[1]}/${p[0]}`;
                const dtFmt = p[0].length === 4 ? `${p[0]}-${p[1]}-${p[2]}` : `${p[2]}-${p[1]}-${p[0]}`;
                const dt = new Date(`${dtFmt}T12:00:00`);
                if (!isNaN(dt.getTime())) diaSemanaStr = diasSemana[dt.getDay()];
            }
        }
        
        // ── Classificação do status (MESMA lógica do backend cartao_ponto_generator.js) ──
        // ORDEM IMPORTA: JUSTIFICADO e FERIADO antes de DSR/FOLGA e FALTA
        let status = '';
        const stRaw2 = (d.status || d.situacao || d.tipo || '').toString().toLowerCase();
        const isFolgaSt3  = stRaw2.includes('folg') || stRaw2.includes('dsr');
        const isFolgaFlag3 = d.folga === true;
        const isDSRMin3   = (d.dsrConsideradoMinutos || 0) > 0;
        const semHorario3  = ((d.idHorarioContratual || 0) === 0 && (d.strHorarioContratualSimples || '').trim() === '');
        const horasTrab3   = (d.totalHorasTrabalhadas || 0) + (d.horasTotalNoturno || 0);
        const trabalhou3   = (d.diasTrabalhados || 0) > 0 || horasTrab3 > 0;

        if (d.isHoliday) {
            status = 'Feriado: ' + (d.holidayName || '');
        } else if (d.idJustification) {
            const obsJust3 = (d.toolTipAlert || '').toLowerCase();
            if (obsJust3.includes('atestado') || obsJust3.includes('medic')) {
                status = 'Atestado Médico';
            } else {
                status = 'Justificado';
            }
        } else if (isFolgaSt3 || isFolgaFlag3 || isDSRMin3) {
            if (horasTrab3 >= 360) status = ''; // trabalhado
            else status = 'Folga';
        } else if (semHorario3 && !trabalhou3) {
            status = 'Folga';
        } else if (d.faltaDiaInteiro) {
            status = 'Falta';
        }
        
        let marcacoes = [];
        if (d.listAfdtManutencao && d.listAfdtManutencao.length > 0) {
            marcacoes = d.listAfdtManutencao.map(m => {
                const h = Math.floor(m.hora/100).toString().padStart(2,'0');
                const mn = (m.hora%100).toString().padStart(2,'0');
                return h + ':' + mn + (m.isManual ? ' (I)' : '') + (m.isPreAssigned ? ' (P)' : '');
            });
        } else if (d.marcacoes && Array.isArray(d.marcacoes)) {
            marcacoes = d.marcacoes.map(m => m.hora || m.time || m);
        }

        const e1 = marcacoes[0] || '';
        const s1 = marcacoes[1] || '';
        const e2 = marcacoes[2] || '';
        const s2 = marcacoes[3] || '';

        // TOTAL NORMAIS — soma das horas normais + horas noturnas do contrato
        // (na API do RHID, dia-shift usa totalHorasTrabalhadas; noturno-contrato usa horasTotalNoturno)
        // Os campos são EXCLUSIVOS: colaborador diurno tem valor em totalHorasTrabalhadas e 0 em horasTotalNoturno; noturno, o inverso.
        const normaisMin = (d.totalHorasTrabalhadas || 0) + (d.horasTotalNoturno || 0);
        const normais = fmtMin(normaisMin);

        // TOTAL NOTURNO — horas genuinamente noturnas (suplemento para quem trabalha parte do dia e parte da noite)
        // Se totalHorasTrabalhadas é 0, é contrato noturno puro → TOTAL NOTURNO fica vazio (horas já aparecem em NORMAIS)
        const noturnMin = (d.totalHorasTrabalhadas > 0)
            ? (d.horasNoturnasNaoExtra || 0)
            : 0;
        const noturn = fmtMin(noturnMin);


        // EXTRA DIURNA / EXTRA NOTURNA
        const extraDiurnaMin = d.extraDiurna || d.extraAdicionadaDiurna || 0;
        const extraNocturnaMin = d.extraNoturna || d.extraAdicionadaNoturna || 0;
        const extraDiurna = fmtMin(extraDiurnaMin);
        const extraNoturna = fmtMin(extraNocturnaMin);

        // EXTRA 60% / EXTRA 100% por dia da semana
        let extra60Min = 0, extra100Min = 0;
        const totalExtraMin = extraDiurnaMin + extraNocturnaMin || Math.max(0, d.horasExtrasCalculadas || 0) || 0;
        if (d.isHoliday || diaSemanaStr === 'DOM') extra100Min = totalExtraMin;
        else extra60Min = totalExtraMin;
        const extra60 = fmtMin(extra60Min);
        const extra100 = fmtMin(extra100Min);

        // FALTA E ATRASO
        const faltaAtrasoMin = d.horasFaltaAtraso || 0;

        // ACUMULADORES
        totalNormais      += normaisMin;
        totalNoturno      += noturnMin;
        totalExtra60      += extra60Min;
        totalExtra100     += extra100Min;
        totalExtraDiurna  += extraDiurnaMin;
        totalExtraNoturna += extraNocturnaMin;
        totalFaltaAtraso  += faltaAtrasoMin;

        // HORÁRIO CONTRATUAL
        if (!horarioContratualInfo && d.idHorarioContratual && d.strHorarioContratualSimples && d.strHorarioContratualSimples.trim()) {
            horarioContratualInfo = {
                codigo: String(d.idHorarioContratual).padStart(5, '0'),
                horario: d.strHorarioContratualSimples
            };
        }

        // OBSERVAÇÕES
        const obsLinhas = [];
        if (d.toolTipAlert && d.toolTipAlert.trim()) {
            const alertText = d.toolTipAlert.trim();
            if (!alertText.toLowerCase().includes('extra acima de 10 min')) {
                obsLinhas.push(alertText);
            }
        }
        if (d.listAfdtManutencao) {
            d.listAfdtManutencao.forEach(m => {
                if (m.reason && m.reason.trim()) {
                    const tipoOcorr = m.oculto ? '[D] ' : (m.isManual ? '[I] ' : '');
                    obsLinhas.push(tipoOcorr + m.reason.trim());
                }
            });
        }
        const obsText = obsLinhas.join(' | ');

        // ── PREVISTO e células de marcação (igual ao backend) ─────────────────────
        let previsto = c.escala || '08:00-12:00 13:00-17:48';
        let ent1_td, sai1_td, ent2_td, sai2_td;

        if (status.startsWith('Feriado')) {
            previsto = 'FERIADO';
            ent1_td = status; sai1_td = ''; ent2_td = ''; sai2_td = '';
        } else if (status === 'Folga') {
            ent1_td = 'Folga'; sai1_td = ''; ent2_td = ''; sai2_td = '';
        } else if (status === 'Atestado Médico') {
            ent1_td = 'Atestado Médico'; sai1_td = ''; ent2_td = 'Atestado Médico'; sai2_td = '';
        } else if (status === 'Justificado') {
            ent1_td = 'Justificado'; sai1_td = ''; ent2_td = ''; sai2_td = '';
        } else if (status === 'Falta') {
            previsto = '';
            ent1_td = 'Falta'; sai1_td = 'Falta'; ent2_td = 'Falta'; sai2_td = 'Falta';
        } else {
            ent1_td = e1; sai1_td = s1; ent2_td = e2; sai2_td = s2;
        }

        rowsHtml += `
        <tr>
            <td style="padding:3px 1px;border-bottom:1px solid #f1f5f9;overflow:hidden;">${diaNum} - ${diaSemanaStr}</td>
            <td style="padding:3px 1px;border-bottom:1px solid #f1f5f9;overflow:hidden;word-break:break-all;">${previsto}</td>
            <td style="padding:3px 1px;border-bottom:1px solid #f1f5f9;overflow:hidden;">${ent1_td}</td>
            <td style="padding:3px 1px;border-bottom:1px solid #f1f5f9;overflow:hidden;">${sai1_td}</td>
            <td style="padding:3px 1px;border-bottom:1px solid #f1f5f9;overflow:hidden;">${ent2_td}</td>
            <td style="padding:3px 1px;border-bottom:1px solid #f1f5f9;overflow:hidden;">${sai2_td}</td>
            <td style="padding:3px 1px;border-bottom:1px solid #f1f5f9;overflow:hidden;">${normais}</td>
            <td style="padding:3px 1px;border-bottom:1px solid #f1f5f9;overflow:hidden;">${noturn}</td>
            <td style="padding:3px 1px;border-bottom:1px solid #f1f5f9;overflow:hidden;text-align:center;">${status === 'Falta' ? '1' : ''}</td>
            <td style="padding:3px 1px;border-bottom:1px solid #f1f5f9;overflow:hidden;">${fmtMin(faltaAtrasoMin)}</td>
            <td style="padding:3px 1px;border-bottom:1px solid #f1f5f9;overflow:hidden;">${extra60}</td>
            <td style="padding:3px 1px;border-bottom:1px solid #f1f5f9;overflow:hidden;">${extra100}</td>
            <td style="padding:3px 1px;border-bottom:1px solid #f1f5f9;overflow:hidden;">${extraDiurna}</td>
            <td style="padding:3px 1px;border-bottom:1px solid #f1f5f9;overflow:hidden;">${extraNoturna}</td>
            <td style="padding:3px 1px;border-bottom:1px solid #f1f5f9;overflow:hidden;color:#111;font-size:6.5px;word-break:break-word;white-space:normal;">${obsText}</td>
        </tr>`;
    });

    const dataAdmissao = c.data_admissao ? c.data_admissao.split('-').reverse().join('/') : '';
    const cpfFmt = safe(c.cpf).replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    const tzOpts = { timeZone: 'America/Sao_Paulo' };
    const dataEmissao = new Date().toLocaleDateString('pt-BR', tzOpts) + ' \u00e0s ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', ...tzOpts });
    const ultimoDia = new Date(ano, mes, 0).getDate();

    // Bloco Horários Contratuais
    let horarioBlock = '';
    if (horarioContratualInfo) {
        const periodos = horarioContratualInfo.horario.split(/[\r\n]+/).filter(p => p.trim());
        let headerCols = '', dataCols = '';
        periodos.forEach(p => {
            const parts = p.trim().split('-');
            const ent = parts[0] ? parts[0].trim() : '';
            const sai = parts[1] ? parts[1].trim() : '';
            headerCols += `<th style="padding:2px 8px;border:1px solid #ccc;background:#f1f5f9;">ENT</th><th style="padding:2px 8px;border:1px solid #ccc;background:#f1f5f9;">SAI</th>`;
            dataCols   += `<td style="padding:3px 8px;border:1px solid #ccc;">${ent}</td><td style="padding:3px 8px;border:1px solid #ccc;">${sai}</td>`;
        });
        horarioBlock = `
        <div style="margin-top:20px;">
            <div style="font-size:11px;font-weight:bold;margin-bottom:6px;">Hor\u00e1rios Contratuais do Empregado</div>
            <table style="border-collapse:collapse;font-size:8px;">
                <thead><tr>
                    <th style="padding:2px 8px;border:1px solid #ccc;background:#f1f5f9;">C\u00d3DIGO DO HOR\u00c1RIO (CH)</th>
                    ${headerCols}
                </tr></thead>
                <tbody><tr>
                    <td style="padding:3px 8px;border:1px solid #ccc;">${horarioContratualInfo.codigo}</td>
                    ${dataCols}
                </tr></tbody>
            </table>
            <div style="margin-top:8px;font-size:7px;color:#64748b;">(I)=Inclu\u00eddo, (P)=Pr\u00e9-assinalado, (D)=Desconsiderado</div>
        </div>`;
    }

    return `
    <div style="font-family: Arial, sans-serif; font-size: 8px; color: #111; page-break-inside: avoid; padding: 15px;">
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 5px;">
            <tr>
                <td style="width: 30%; vertical-align: top;">
                    <img src="${logoB64}" style="max-height: 35px;" />
                </td>
                <td style="width: 40%; vertical-align: top; text-align: center;">
                    <div style="font-size: 20px; font-weight: bold; line-height: 1;">Cart\u00e3o</div>
                    <div style="font-size: 20px; font-weight: normal; color: #4b4b4b; line-height: 1;">de Ponto</div>
                    <div style="font-size: 10px; font-weight: bold; color: #e30613; margin-top: 5px;">DE 01/${mes}/${ano} AT\u00c9 ${ultimoDia}/${mes}/${ano}</div>
                </td>
                <td style="width: 30%; vertical-align: top; text-align: right;">
                    <span style="font-family: Arial, sans-serif; font-size: 20px; font-weight: normal; color: #4b4b4b; letter-spacing: -0.5px;">Control </span><span style="font-family: Arial, sans-serif; font-size: 20px; font-weight: bold; color: #e30613;">iD</span><br/>
                    <div style="font-size: 8px; color: #e30613; margin-top: 4px;">P\u00e1gina 1 de 1</div>
                    <div style="font-size: 7px; color: #666; margin-top: 2px;">Emitido em ${dataEmissao}</div>
                </td>
            </tr>
        </table>
        
        <div style="border-top: 1px solid #999; margin-bottom: 5px;"></div>
        
        <table style="width: 100%; border-collapse: collapse; font-size: 8px; margin-bottom: 5px;">
            <tr><td colspan="2" style="padding: 2px 0;"><strong>NOME DA EMPRESA:</strong> AMERICA RENTAL EQUIPAMENTOS LTDA</td></tr>
            <tr>
                <td style="padding: 2px 0; width: 50%;"><strong>CNPJ DA EMPRESA:</strong> 03434448000101</td>
                <td style="padding: 2px 0; width: 50%;"><strong>INSCRI\u00c7\u00c3O ESTADUAL DA EMPRESA:</strong> 336.715.410.116</td>
            </tr>
            <tr>
                <td style="padding: 2px 0;"><strong>NOME DO FUNCION\u00c1RIO:</strong> ${c.nome_completo}</td>
                <td style="padding: 2px 0;"><strong>CPF DO FUNCION\u00c1RIO:</strong> ${cpfFmt}</td>
            </tr>
            <tr>
                <td style="padding: 2px 0;"><strong>PIS DO FUNCION\u00c1RIO:</strong> ${safe(c.pis)}</td>
                <td style="padding: 2px 0;"><strong>DATA DE ADMISS\u00c3O DO FUNCION\u00c1RIO:</strong> ${dataAdmissao}</td>
            </tr>
            <tr>
                <td style="padding: 2px 0;"><strong>NOME DO CARGO:</strong> ${safe(c.cargo)}</td>
                <td style="padding: 2px 0;"><strong>N\u00daMERO DE MATR\u00cdCULA:</strong> ${numMatricula}</td>
            </tr>
            <tr><td colspan="2" style="padding: 2px 0;"><strong>NOME DO DEPARTAMENTO:</strong> ${safe(c.departamento)}</td></tr>
        </table>
        
        <div style="border-top: 1px solid #999; margin-bottom: 5px;"></div>
        
        <table style="width: 100%; border-collapse: collapse; font-size: 7px; text-align: left; table-layout: fixed;"><colgroup><col style="width:10%"><col style="width:12%"><col style="width:4%"><col style="width:4%"><col style="width:4%"><col style="width:4%"><col style="width:6%"><col style="width:5%"><col style="width:4%"><col style="width:5%"><col style="width:4%"><col style="width:4%"><col style="width:5%"><col style="width:5%"><col style="width:24%"></colgroup>
            <thead>
                <tr style="border-bottom: 1px solid #ccc; font-weight: bold; color: #475569;">
                    <th style="padding: 2px 1px;">DIA</th>
                    <th style="padding: 2px 1px; min-width:90px; white-space:nowrap;">PREVISTO</th>
                    <th style="padding: 2px 1px;">ENT. 1</th>
                    <th style="padding: 2px 1px;">SA\u00cd. 1</th>
                    <th style="padding: 2px 1px;">ENT. 2</th>
                    <th style="padding: 2px 8px 2px 1px;">SA\u00cd. 2</th>
                    <th style="padding: 2px 1px;">TOTAL NORMAIS</th>
                    <th style="padding: 2px 1px;">TOTAL NOTURNO</th>
                    <th style="padding: 2px 1px;">DIA FALTA</th>
                    <th style="padding: 2px 1px;">FALTA E ATRASO</th>
                    <th style="padding: 2px 1px;">EXTRA 60%</th>
                    <th style="padding: 2px 1px;">EXTRA 100%</th>
                    <th style="padding: 2px 1px;">EXTRA DIURNA</th>
                    <th style="padding: 2px 1px;">EXTRA NOTURNA</th>
                    <th style="padding: 2px 1px; width: 100px;">OBSERVAÇÕES</th>
                </tr>
            </thead>
            <tbody>
                ${rowsHtml}
            </tbody>
            <tfoot>
                <tr style="font-weight: bold; border-top: 1px solid #999; background: #f8fafc;">
                    <td colspan="6" style="padding: 3px 1px;">TOTAIS</td>
                    <td style="padding: 3px 1px;">${fmtMin(totalNormais)}</td>
                    <td style="padding: 3px 1px;">${fmtMin(totalNoturno)}</td>
                    <td style="padding: 3px 1px;"></td>
                    <td style="padding: 3px 1px;">${fmtMin(totalFaltaAtraso)}</td>
                    <td style="padding: 3px 1px;">${fmtMin(totalExtra60)}</td>
                    <td style="padding: 3px 1px;">${fmtMin(totalExtra100)}</td>
                    <td style="padding: 3px 1px;">${fmtMin(totalExtraDiurna)}</td>
                    <td style="padding: 3px 1px;">${fmtMin(totalExtraNoturna)}</td>
                    <td style="padding: 3px 1px;"></td>
                </tr>
            </tfoot>
        </table>

        ${horarioBlock}

    </div>`;
}

// ─── Bloco HTML de recibo (Separado) ──────────────────────────────────────────
function _buildReciboBlock(tipo, colab, dados, mes, mesNome, ano, valorVR, logoB64) {

    const mesesArr = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const idxMesAtual = mesesArr.findIndex(m => m.toLowerCase() === mesNome.toLowerCase());
    let refMesNome = mesNome;
    let refAno = ano;
    if (idxMesAtual !== -1) {
        let nextIdx = (idxMesAtual + 1) % 12;
        refMesNome = mesesArr[nextIdx];
        if (nextIdx === 0) refAno = parseInt(ano, 10) + 1;
    }

    const nome    = _recNome(colab);
    const logoHtml = logoB64
        ? `<div style="margin:0;padding:0;line-height:0;"><img src="${logoB64}" style="width:100%;display:block;margin:0;padding:0;" alt="America Rental"></div>`
        : `<div style="background:#1e3a5f;padding:16px 32px;"><span style="color:#fff;font-size:1.3rem;font-weight:900;letter-spacing:1px;">AMERICA RENTAL</span></div>`;

    const dtrab     = dados.diasTrabalhados || 0;
    // diasVR: usa o valor específico APENAS se for um número positivo (> 0)
    // Evita que diasVR=0 (inicialização padrão) sobrescreva diasTrabalhados correto
    const dVR       = (dados.diasVR != null && dados.diasVR > 0) ? dados.diasVR : dtrab;

    const faltas    = dados.faltasVR || 0; // Use faltasVR for VR, and we will extract faltasVT in VT/VC blocks
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

        // BRUTO = total de dias do próximo mês (campo "Dias Mês Seg." da tela)
        // Ex: selecionando Maio → bruto = dias de Junho (30)
        // Fonte: window._recibos_diasBruto (campo rec-dias-bruto, auto-calculado)
        // Fallback: conta a partir do campo diasVR ou diasTrabalhados se o bruto não foi calculado
        const totalDiasMes = (window._recibos_diasBruto && window._recibos_diasBruto > 0)
            ? window._recibos_diasBruto
            : ((dados.diasVR != null && dados.diasVR > 0) ? dados.diasVR : (dados.diasTrabalhados || 0));
        const folgas = dados.folgasVR || 0;

        // Cálculo Bruto
        const bruttoVR     = totalDiasMes * valorVR;
        const bruttoJantar = dExtra * valorVR;
        const totalBruto   = bruttoVR + bruttoJantar;

        // Cálculo Descontos
        const descFolgas = folgas * valorVR;
        const descFaltas = faltas * valorVR;
        const totalDesc  = descFolgas + descFaltas;

        totalFinal = Math.max(0, totalBruto - totalDesc);
        if (dados.valVREdit != null) totalFinal = parseFloat(dados.valVREdit);

        linhas = `
<tr>
  <td colspan="3" style="padding:0;border:none;">
    <table style="width:100%;border-collapse:collapse;font-size:12px;">
      <thead>
        <tr style="background:#e8edf5;">
          <th style="padding:6px 12px;border:1px solid #ddd;text-align:left;font-size:10.5px;text-transform:uppercase;letter-spacing:.04em;color:#374151;width:45%;">Indicativos</th>
          <th style="padding:6px 12px;border:1px solid #ddd;text-align:right;font-size:10.5px;text-transform:uppercase;letter-spacing:.04em;color:#374151;width:27.5%;">Bruto</th>
          <th style="padding:6px 12px;border:1px solid #ddd;text-align:right;font-size:10.5px;text-transform:uppercase;letter-spacing:.04em;color:#374151;width:27.5%;">Descontos</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="padding:7px 12px;border:1px solid #ddd;">* &nbsp; ${totalDiasMes} PERÍODO DE DIAS</td>
          <td style="padding:7px 12px;border:1px solid #ddd;text-align:right;">R$&nbsp;${_recFmt(bruttoVR)}</td>
          <td style="padding:7px 12px;border:1px solid #ddd;"></td>
        </tr>
        ${dExtra > 0 ? `<tr>
          <td style="padding:7px 12px;border:1px solid #ddd;">* &nbsp; ${dExtra} JANTA${dExtra > 1 ? 'S' : ''}</td>
          <td style="padding:7px 12px;border:1px solid #ddd;text-align:right;">R$&nbsp;${_recFmt(bruttoJantar)}</td>
          <td style="padding:7px 12px;border:1px solid #ddd;"></td>
        </tr>` : `<tr>
          <td style="padding:7px 12px;border:1px solid #ddd;color:#94a3b8;">* &nbsp; 0 JANTAS</td>
          <td style="padding:7px 12px;border:1px solid #ddd;text-align:right;color:#94a3b8;">R$&nbsp;-</td>
          <td style="padding:7px 12px;border:1px solid #ddd;"></td>
        </tr>`}
        <tr>
          <td style="padding:7px 12px;border:1px solid #ddd;">* &nbsp; ${folgas} FOLGA${folgas !== 1 ? 'S' : ''} / FERIADO${folgas !== 1 ? 'S' : ''}</td>
          <td style="padding:7px 12px;border:1px solid #ddd;"></td>
          <td style="padding:7px 12px;border:1px solid #ddd;text-align:right;${descFolgas > 0 ? 'color:#b91c1c;' : 'color:#94a3b8;'}">R$&nbsp;${descFolgas > 0 ? _recFmt(descFolgas) : '-'}</td>
        </tr>
        <tr>
          <td style="padding:7px 12px;border:1px solid #ddd;">* &nbsp; ${faltas} FALTA${faltas !== 1 ? 'S' : ''} / JUSTIFICADO${faltas !== 1 ? 'S' : ''}</td>
          <td style="padding:7px 12px;border:1px solid #ddd;"></td>
          <td style="padding:7px 12px;border:1px solid #ddd;text-align:right;${descFaltas > 0 ? 'color:#b91c1c;' : 'color:#94a3b8;'}">R$&nbsp;${descFaltas > 0 ? _recFmt(descFaltas) : '-'}</td>
        </tr>
        <tr style="background:#f1f5f9;font-weight:700;">
          <td style="padding:8px 12px;border:1px solid #ddd;">Total:</td>
          <td style="padding:8px 12px;border:1px solid #ddd;text-align:right;">R$&nbsp;${_recFmt(totalBruto)}</td>
          <td style="padding:8px 12px;border:1px solid #ddd;text-align:right;color:#b91c1c;">R$&nbsp;${_recFmt(totalDesc)}</td>
        </tr>
        <tr style="background:#1e3a5f;color:#fff;font-weight:700;">
          <td style="padding:9px 12px;border:1px solid #1e3a5f;font-size:11px;letter-spacing:.5px;">TOTAL RECEBIDO:</td>
          <td colspan="2" style="padding:9px 12px;border:1px solid #1e3a5f;text-align:right;font-size:1.05rem;">R$&nbsp;${_recFmt(totalFinal)}</td>
        </tr>
      </tbody>
    </table>
  </td>
</tr>`;

    } else if (tipo === 'VT') {
        titulo    = 'RECIBO DE VALE TRANSPORTE';
        beneficio = 'Vale Transporte';
        // Cálculo automático: 30 - folgas(incl.feriados) - faltas(com e sem atestado)
        // Trabalho Externo tem direito a VT (não é descontado)
        const folgasVT = dados.folgasVT || 0;
        const diasVT   = Math.max(0, 30 - folgasVT - (dados.faltasVT || 0));
        totalFinal = diasVT * valTransp;
        if (dados.valVTEdit != null) totalFinal = parseFloat(dados.valVTEdit);
        linhas = `
<tr><td style="padding:7px 12px;border:1px solid #ddd;">Meio de Transporte</td><td style="padding:7px 12px;border:1px solid #ddd;text-align:center;">—</td><td style="padding:7px 12px;border:1px solid #ddd;text-align:right;">${colab.meio_transporte||'—'}</td></tr>
<tr><td style="padding:7px 12px;border:1px solid #ddd;">Dias Trabalhados</td><td style="padding:7px 12px;border:1px solid #ddd;text-align:center;">${diasVT}</td><td style="padding:7px 12px;border:1px solid #ddd;text-align:right;">${diasVT} dias</td></tr>
<tr><td style="padding:7px 12px;border:1px solid #ddd;">Valor por Dia</td><td style="padding:7px 12px;border:1px solid #ddd;text-align:center;">—</td><td style="padding:7px 12px;border:1px solid #ddd;text-align:right;">R$&nbsp;${_recFmt(valTransp)}</td></tr>
<tr style="background:#1e3a5f;color:#fff;font-weight:700;"><td colspan="2" style="padding:9px 12px;border:1px solid #1e3a5f;">TOTAL A RECEBER</td><td style="padding:9px 12px;border:1px solid #1e3a5f;text-align:right;font-size:1.05rem;">R$&nbsp;${_recFmt(totalFinal)}</td></tr>`;
        obs = 'Conforme Decreto nº 95.247/87. O desconto de até 6% do salário base pode ser aplicado conforme legislação vigente.';

    } else if (tipo === 'VC') {
        titulo    = 'RECIBO DE VALE COMBUSTÍVEL';
        beneficio = 'Vale Combustível';
        // Cálculo proporcional: apenas faltas (com e sem atestado) geram desconto
        // Folgas, feriados e trabalho externo NÃO são descontados
        // Diária = valor mensal / 30 dias
        const diariaVC = valTransp / 30;
        const faltasVC = dados.faltasVT || 0;
        const descVC   = faltasVC * diariaVC;
        totalFinal = Math.max(0, valTransp - descVC);
        if (dados.valVTEdit != null) totalFinal = parseFloat(dados.valVTEdit);
        linhas = `
<tr><td style="padding:7px 12px;border:1px solid #ddd;">Valor Integral Mensal</td><td style="padding:7px 12px;border:1px solid #ddd;text-align:center;">30 dias</td><td style="padding:7px 12px;border:1px solid #ddd;text-align:right;">R$&nbsp;${_recFmt(valTransp)}</td></tr>
<tr><td style="padding:7px 12px;border:1px solid #ddd;">Descontos</td><td style="padding:7px 12px;border:1px solid #ddd;text-align:center;">${faltasVC}</td><td style="padding:7px 12px;border:1px solid #ddd;text-align:right;color:#ef4444;">${descVC > 0 ? '-R$&nbsp;' + _recFmt(descVC) : '-'}</td></tr>
<tr style="background:#1e3a5f;color:#fff;font-weight:700;"><td colspan="2" style="padding:9px 12px;border:1px solid #1e3a5f;">TOTAL A RECEBER</td><td style="padding:9px 12px;border:1px solid #1e3a5f;text-align:right;font-size:1.05rem;">R$&nbsp;${_recFmt(totalFinal)}</td></tr>`;
        obs = '';
    }

    const via = () => `
<div class="via" style="page-break-after:always;">
  ${logoHtml}
  <div style="padding:14px 32px 24px 32px;">
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
        <td style="padding:6px 10px;font-weight:700;font-size:11px;">${refMesNome.toUpperCase()} / ${refAno}</td>
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

// ─── Toggle manual Justificado ↔ Externo na conferência de ponto ─────────────
// Chamado ao clicar em "Justificado ⇕" ou "Externo ⇕" na linha da conferência.
window._toggleJustExterno = function(colabId, date, rowId) {
    window._pontoTipoOverride = window._pontoTipoOverride || {};
    const key = String(colabId) + '_' + date;
    const isNowExterno = (window._pontoTipoOverride[key] !== 'externo');
    window._pontoTipoOverride[key] = isNowExterno ? 'externo' : 'justificado';

    // Atualiza visual da linha
    const tr = document.getElementById(rowId);
    if (tr) {
        tr.style.background = isNowExterno ? '#fffde7' : '#fee2e2';
        tr.style.color      = isNowExterno ? '#1e293b' : '#b91c1c';
        const tds = tr.querySelectorAll('td');
        if (tds[2]) {
            tds[2].innerHTML = isNowExterno
                ? `<span onclick="window._toggleJustExterno('${colabId}','${date}','${rowId}')" title="Clique para marcar como Justificado" style="cursor:pointer;border-bottom:1px dashed #374151;padding-bottom:1px;">Externo \u21d5</span>`
                : `<span onclick="window._toggleJustExterno('${colabId}','${date}','${rowId}')" title="Clique para marcar como Trabalho Externo" style="cursor:pointer;border-bottom:1px dashed #b91c1c;padding-bottom:1px;">Justificado \u21d5</span>`;
        }
    }

    // Atualiza contagem de faltas no _recibosSelecoes
    if (window._recibosSelecoes && window._recibosSelecoes[colabId]) {
        const s = window._recibosSelecoes[colabId];
        if (s._faltasBase === undefined) s._faltasBase = s.faltas; // guarda original
        const extCount = Object.keys(window._pontoTipoOverride)
            .filter(k => k.startsWith(String(colabId) + '_') && window._pontoTipoOverride[k] === 'externo')
            .length;
        s.faltas = Math.max(0, s._faltasBase - extCount);
        const inp = document.getElementById('faltas-inp-' + colabId);
        if (inp) { inp.value = s.faltas; inp.style.color = s.faltas > 0 ? '#ef4444' : '#94a3b8'; }
    }
};
