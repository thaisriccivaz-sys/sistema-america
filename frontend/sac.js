// ============================================================
// MÓDULO: SAC — Portal de Ocorrências (Kanban de Chamados)
// Adaptado de: kanban-flow prototype (React → Vanilla JS)
// ============================================================

(function () {
  'use strict';

  // ── CONSTANTES DE PIPELINE ───────────────────────────────────
  const PIPELINE_STAGES = [
    { id: 'abertura',          name: 'Abertura',           color: '#6c757d', bg: '#f8f9fa' },
    { id: 'triagem',           name: 'Triagem',            color: '#0e7490', bg: '#cffafe' },
    { id: 'aguardando_setores',name: 'Aguard. Setores',    color: '#c2410c', bg: '#fff7ed' },
    { id: 'respondido',        name: 'Respondido',         color: '#7c3aed', bg: '#ede9fe' },
    { id: 'execucao',          name: 'Acompanhamento',     color: '#1d4ed8', bg: '#dbeafe' },
    { id: 'concluido',         name: 'Concluído',          color: '#15803d', bg: '#dcfce7' },
    { id: 'encerrado',         name: 'Encerrado',          color: '#374151', bg: '#f3f4f6' }
  ];

  const TICKET_TYPES = {
    manutencao:          { name: 'MANUTENÇÃO',            sla: 36, icon: '🪣' },
    avaria_funcional:    { name: 'AVARIA FUNCIONAL',      sla: 48, icon: '⚠️' },
    avaria_nao_funcional:{ name: 'AVARIA NÃO FUNCIONAL',  sla: 36, icon: '⚙️' },
    entrega:             { name: 'ENTREGA',                sla: 48, icon: '🚚' },
    retirada:            { name: 'RETIRADA',               sla: 48, icon: '📦' },
    contrato:            { name: 'CONTRATO',               sla: 48, icon: '✍️' },
    furto:               { name: 'FURTO / EXTRAVIO',       sla: 24, icon: '🛡️' },
    visita_tecnica:      { name: 'VISITA TÉCNICA',         sla: 24, icon: '🔧' }
  };

  const OCCURRENCES_BY_TYPE = {
    manutencao:          ['Manutenção não realizada', 'Reclamação de limpeza', 'Manutenção suspensa por falta de pagamento'],
    avaria_funcional:    ['Caixa de Dejetos', 'Teto', 'Porta', 'Bomba da Descarga', 'Bomba do Lavatório', 'Caixa de Descarga', 'Chuveiro', 'Mictório Interno', 'Puxador', 'Vaso Sanitário', 'Vidro da Guarita'],
    avaria_nao_funcional:['Assento Sanitário', 'Chapa Piso Preta', 'Pintura Danificada', 'Suporte Papel Toalha', 'Limitador de Porta', 'Equipamento Antigo'],
    entrega:             ['Endereço incorreto', 'Equipe não localizou o ponto', 'Cliente ausente', 'Produto entregue errado', 'Atraso na entrega'],
    retirada:            ['Fim de contrato indesejada', 'Retirada Infrutífera', 'Desmontagem'],
    contrato:            ['Alteração Cadastral', 'Ruptura de contrato', 'Prorrogação de locação'],
    furto:               ['Furto no Cliente', 'Furto em Trânsito', 'Extravio / Perda'],
    visita_tecnica:      ['Avaliação técnica de equipamento', 'Solicitação do cliente', 'Vistoria de campo', 'Reclamação de funcionamento', 'Verificação pré-contrato']
  };

  const CHECKLISTS_BY_TYPE = {
    all: [
      'Confirmar documentação e dados básicos do cliente',
      'Registrar fotos do local e status do equipamento antes de iniciar',
      'Coletar assinatura de termo de vistoria de campo'
    ],
    manutencao: [
      'Verificar integridade da estrutura física do equipamento',
      'Realizar limpeza interna e higienização profunda',
      'Reabastecer insumos consumíveis padrão',
      'Aferir funcionamento dos sensores e travas automáticas'
    ],
    avaria_funcional: [
      'O reparo funcional do equipamento foi 100% concluído?',
      'Foi feita inspeção para garantir que não há outras avarias ocultas?',
      'A OS de Avaria foi emitida, preenchida e anexada ao sistema?'
    ],
    avaria_nao_funcional: [
      'Foi validado visualmente que o reparo estético foi realizado?',
      'A OS de Avaria correspondente foi devidamente emitida e registrada?'
    ],
    entrega: [
      'A entrega foi efetivada com sucesso no local do cliente?',
      'Os endereços foram atualizados corretamente em todos os sistemas?'
    ],
    retirada: [
      'A retirada física do equipamento no cliente foi concluída?',
      'O registro sistêmico da retirada (baixa de alocação) foi realizado?'
    ],
    contrato: [
      'A alteração contratual foi realizada e salva corretamente no sistema?',
      'Foi solicitada a emissão de um novo boleto ao financeiro (se houver impacto)?'
    ],
    furto: [
      'A cópia oficial do Boletim de Ocorrência (B.O.) foi solicitada e anexada?',
      'A OS de Avaria por Furto foi formalmente emitida?',
      'A reposição de um novo equipamento para o cliente foi registrada?',
      'O setor responsável foi notificado para dar baixa no patrimônio furtado?'
    ],
    visita_tecnica: [
      'O relatório de visita técnica foi preenchido e assinado pelo cliente?',
      'Foram registradas fotos de todas as não conformidades encontradas?',
      'O cliente foi orientado sobre os próximos passos / prazo de retorno?'
    ]
  };

  const LS_KEY = 'sac_tickets_v1';

  // ── ESTADO DO MÓDULO ─────────────────────────────────────────
  let _tickets = [];
  let _view = 'pipeline'; // 'pipeline' | 'tabela' | 'config'
  let _searchTerm = '';
  let _filterType = 'all';
  let _filterDateType = 'abertura';
  let _filterDateStart = '';
  let _filterDateEnd = '';
  let _filterUrgent = false;
  let _selectedTicket = null;
  let _modalTab = 'geral'; // 'geral' | 'historico' | 'custo' | 'anexos' | 'checklist'
  let _pendingTransition = null;
  let _draggedId = null;
  let _sortKey = 'openDate';
  let _sortDir = 'desc';
  let _tableStartDate = '';
  let _tableEndDate = '';
  let _tablePage = 1;
  const TABLE_PAGE_SIZE = 15;

  // Wizard state
  let _wiz = {
    step: 1,
    protocol: '',
    osNumber: '',
    clientName: '',
    cnpjCpf: '',
    equipment: '',
    address: '',
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    channel: 'WhatsApp',
    typeKey: 'manutencao',
    occList: [],
    currentOcc: '',
    currentOccNote: '',
    description: '',
    isUrgent: false
  };

  // CC form state
  let _ccForm = {
    id: null,
    sector: 'Cliente',
    employee: '',
    lossValue: 0,
    reason: '',
    hasBilling: false
  };

  // Transition form state
  let _transForm = {
    nextSteps: '',
    obs: '',
    sector: 'Logística',
    closingReason: 'Concluído',
    checklistJustification: '',
    closingAttachments: []
  };

  // ── PERSISTÊNCIA ─────────────────────────────────────────────
  function saveTickets() {
    // Agora é feito via API no updateTicket / wizSubmit
  }

  let _globalDepartamentos = [];

  async function loadTickets() {
    try {
      const token = localStorage.getItem('erp_token')||localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };
      const [ticketsRes, deptsRes, usersRes] = await Promise.all([
        fetch('/api/sac/tickets', { headers }),
        fetch('/api/departamentos', { headers }).catch(() => null),
        fetch('/api/usuarios', { headers }).catch(() => null)
      ]);
      if (ticketsRes.ok) _tickets = await ticketsRes.json();
      if (deptsRes && deptsRes.ok) _globalDepartamentos = await deptsRes.json();
      if (usersRes && usersRes.ok) window._sacUsersList = await usersRes.json();
    } catch(e) { console.error('[SAC] Erro ao carregar chamados', e); }
    if (!_tickets) _tickets = [];
  }

  // ── HELPERS ──────────────────────────────────────────────────
  function _normDate(str) {
    if (!str) return str;
    if (typeof str === 'string') {
      let s = str.replace(' ', 'T');
      if (s.length === 19 && !s.endsWith('Z')) s += 'Z';
      return s;
    }
    return str;
  }

  function formatDate(iso) {
    if (!iso) return '—';
    const d = new Date(_normDate(iso));
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
  }

  function formatDateShort(iso) {
    if (!iso) return '—';
    const d = new Date(_normDate(iso));
    if (isNaN(d.getTime())) return '—';
    const dd = String(d.getDate()).padStart(2,'0');
    const mm = String(d.getMonth()+1).padStart(2,'0');
    const hh = String(d.getHours()).padStart(2,'0');
    const min = String(d.getMinutes()).padStart(2,'0');
    return `${dd}/${mm} ${hh}:${min}`;
  }

  function formatBRL(v) {
    return new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(v || 0);
  }

  function nextProtocol() {
    const nums = _tickets.map(t => {
      const n = parseInt((t.protocol || '').replace(/\D/g,''), 10);
      return isNaN(n) ? 0 : n;
    });
    const next = nums.length ? Math.max(...nums) + 1 : 1;
    return String(next).padStart(4, '0');
  }

  function getSLADetails(ticket) {
    const type = TICKET_TYPES[ticket.typeKey];
    if (!type) return { label: '—', status: 'ok', pct: 100, consumedPct: 0, remaining: 0, isOverdue: false, isConcluido: false };
    const openStr = _normDate(ticket.openDate || new Date().toISOString());
    const opened = new Date(openStr).getTime();
    const limitMs = type.sla * 3600000;
    // isOpen = ticket ainda não encerrado ou concluído
    const isConcluido = ticket.stage === 'concluido';
    const isClosed = isConcluido || ticket.stage === 'encerrado';

    // Se a data de abertura for inválida, retorna fallback seguro
    if (isNaN(opened)) return { label: '—', status: 'ok', pct: 100, consumedPct: 0, remaining: 0, isOverdue: false, isConcluido: false };

    let endCalc = Date.now();
    if (isClosed) {
      const log = ticket.timeline && ticket.timeline.find(l => l.stage === 'concluido' || l.stage === 'encerrado');
      if (log) {
        const t = new Date(_normDate(log.time)).getTime();
        if (!isNaN(t)) endCalc = t;
      }
    }
    const elapsedMs = endCalc - opened;
    const remainMs = limitMs - elapsedMs;
    const remainH = Math.round((remainMs / 3600000) * 10) / 10;
    // pct = % remaining (100 = fresh, 0 = just expired)
    let pct = Math.round((remainMs / limitMs) * 100);
    pct = Math.max(0, Math.min(100, pct));
    // consumedPct = % elapsed (0=fresh, 100+=overdue)
    const consumedPct = Math.min(100, Math.max(0, 100 - pct));
    const isOverdue = remainMs <= 0;

    // — Para chamados CONCLUÍDOS: exibe tempo total desde abertura —
    if (isConcluido) {
      const totalH = Math.round((elapsedMs / 3600000) * 10) / 10;
      const withinSLA = elapsedMs <= limitMs;
      const concludedLabel = `✓ ${totalH}h (${withinSLA ? 'no prazo' : 'em atraso'})`;
      const concludedColor = withinSLA ? '#15803d' : '#dc2626';
      const concludedBarPct = Math.min(100, Math.round((elapsedMs / limitMs) * 100));
      return {
        remaining: totalH,
        pct: withinSLA ? (100 - concludedBarPct) : 0,
        consumedPct: concludedBarPct,
        isOverdue: !withinSLA,
        isConcluido: true,
        label: concludedLabel,
        barColor: withinSLA ? '#15803d' : '#dc2626',
        labelColor: concludedColor,
        status: withinSLA ? 'ok' : 'danger',
        closedDateMs: endCalc
      };
    }

    // Label: positive hours remaining or negative hours overdue
    let label;
    if (isOverdue) {
      const overdueH = Math.abs(Math.round((remainMs / 3600000) * 10) / 10);
      label = `-${overdueH}h`;
    } else {
      label = `${remainH}h restantes`;
    }
    // Color based on consumed %: 0-40%=green, 40-70%=blue, 70-100%=yellow, overdue=red
    let barColor;
    if (isOverdue) barColor = '#dc2626';
    else if (consumedPct <= 40) barColor = '#15803d';
    else if (consumedPct <= 70) barColor = '#2563eb';
    else barColor = '#d97706';
    const labelColor = isOverdue ? '#dc2626' : consumedPct > 70 ? '#d97706' : consumedPct > 40 ? '#2563eb' : '#15803d';
    return {
      remaining: remainH,
      pct,
      consumedPct,
      isOverdue,
      isConcluido: false,
      label,
      barColor,
      labelColor,
      status: isOverdue ? 'danger' : pct < 30 ? 'warning' : 'ok',
      closedDateMs: isClosed ? endCalc : null
    };
  }

  function getChecklist(ticket) {
    if (ticket.checklist && ticket.checklist.length) return ticket.checklist;
    return [
      ...(CHECKLISTS_BY_TYPE.all || []),
      ...(CHECKLISTS_BY_TYPE[ticket.typeKey] || [])
    ].map(text => ({ text, checked: false }));
  }

  function showChecklistInStage(stageId) {
    return ['execucao','concluido','encerrado'].includes(stageId);
  }

  function currentUsername() {
    try { const u = JSON.parse(localStorage.getItem('erp_user')); return u ? (u.nome || u.username || 'Usuário') : 'Usuário'; } catch(e) { return 'Usuário'; }
  }

  function showToast(msg, type='success') {
    const colors = { success:'#15803d', warning:'#c2410c', info:'#1d4ed8' };
    const bg     = { success:'#dcfce7', warning:'#fff7ed', info:'#dbeafe' };
    let el = document.getElementById('sac-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'sac-toast';
      el.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:99999;min-width:280px;max-width:420px;padding:14px 20px;border-radius:12px;font-size:0.9rem;font-weight:600;box-shadow:0 8px 32px rgba(0,0,0,0.18);display:none;align-items:center;gap:12px;transition:opacity 0.3s;';
      document.body.appendChild(el);
    }
    el.style.background = bg[type] || bg.success;
    el.style.color = colors[type] || colors.success;
    el.style.border = `1.5px solid ${colors[type] || colors.success}`;
    el.innerHTML = `<i class="ph ph-${type==='success'?'check-circle':type==='warning'?'warning-circle':'info'}" style="font-size:1.2rem;flex-shrink:0;"></i><span>${msg}</span>`;
    el.style.display = 'flex';
    clearTimeout(el._timer);
    el._timer = setTimeout(() => { el.style.display = 'none'; }, 4000);
  }

  // ── INICIALIZAÇÃO ────────────────────────────────────────────
  window.initSAC = async function () {
    const c = document.getElementById('view-sac');
    if (!c) return;
    c.innerHTML = buildSACShell();
    _view = 'pipeline';
    bindGlobalEvents();
    // Carrega os dados da API antes de renderizar
    await loadTickets();
    _wiz.protocol = nextProtocol();
    renderAll();
  };

  // ── SHELL PRINCIPAL ──────────────────────────────────────────
  function buildSACShell() {
    return `
    <div id="sac-root" style="display:flex;flex-direction:column;height:100%;font-family:'Inter',system-ui,sans-serif;background:#f8fafc;">

      <!-- TOPBAR -->
      <div id="sac-topbar" style="background:#fff;border-bottom:1px solid #e2e8f0;padding:12px 24px;display:flex;align-items:center;gap:16px;min-height:56px;flex-shrink:0;">
        <div style="display:flex;align-items:center;gap:10px;">
          <i class="ph ph-headset" style="font-size:1.4rem;color:#dc2626;"></i>
          <span style="font-weight:800;font-size:1.05rem;letter-spacing:-0.01em;color:#1e293b;">SAC <span style="font-weight:400;font-size:0.8rem;color:#64748b;margin-left:4px;">Portal de Ocorrências</span></span>
        </div>
        <div style="flex:1;display:flex;align-items:center;gap:8px;justify-content:center;">
          <button class="sac-nav-btn" data-view="pipeline" onclick="SAC.setView('pipeline')"><i class="ph ph-kanban"></i> Pipeline</button>
          <button class="sac-nav-btn" data-view="tabela"   onclick="SAC.setView('tabela')"><i class="ph ph-table"></i> Relatório</button>
          <button class="sac-nav-btn" data-view="config"   onclick="SAC.setView('config')"><i class="ph ph-sliders-horizontal"></i> Parametrizar</button>
        </div>
        <button id="sac-btn-novo-chamado" onclick="SAC.openWizard()" style="background:#dc2626;color:#fff;border:none;border-radius:8px;padding:8px 16px;font-weight:700;font-size:0.85rem;cursor:pointer;display:flex;align-items:center;gap:6px;white-space:nowrap;transition:background 0.2s;" onmouseover="this.style.background='#b91c1c'" onmouseout="this.style.background='#dc2626'">
          <i class="ph ph-plus-circle"></i> Abrir Chamado
        </button>
      </div>

      <!-- SEARCH BAR (pipeline only) -->
      <div id="sac-search-bar" style="background:#fff;border-bottom:1px solid #e2e8f0;padding:8px 20px;display:flex;align-items:center;flex-wrap:wrap;gap:10px;flex-shrink:0;">
        <div style="position:relative;flex:1;min-width:260px;max-width:360px;display:flex;align-items:center;">
          <input id="sac-search" type="text" placeholder="Busca por OS, cliente, equipamento..." style="width:100%;padding:7px 38px 7px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:0.85rem;outline:none;box-sizing:border-box;" oninput="SAC.onSearch(this.value)" onkeydown="if(event.key==='Enter'){SAC.onSearch(document.getElementById('sac-search').value)}">
          <button onclick="SAC.onSearch(document.getElementById('sac-search').value)" style="position:absolute;right:4px;top:50%;transform:translateY(-50%);background:#1e293b;border:none;border-radius:6px;width:28px;height:28px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#fff;transition:background 0.2s;" onmouseover="this.style.background='#dc2626'" onmouseout="this.style.background='#1e293b'" title="Buscar"><i class="ph ph-magnifying-glass" style="font-size:0.9rem;"></i></button>
        </div>
        
        <!-- Filters -->
        <select id="sac-filter-type" style="padding:7px 10px;border:1px solid #e2e8f0;border-radius:8px;font-size:0.85rem;outline:none;cursor:pointer;" onchange="SAC.onFilterType(this.value)">
          <option value="all">Todos os tipos</option>
          ${Object.entries(TICKET_TYPES).map(([k,v]) => `<option value="${k}">${v.icon} ${v.name}</option>`).join('')}
        </select>
        
        <select id="sac-filter-datetype" style="padding:7px 10px;border:1px solid #e2e8f0;border-radius:8px;font-size:0.85rem;outline:none;cursor:pointer;" onchange="SAC.onFilterDateType(this.value)">
          <option value="abertura">Data Abertura</option>
          <option value="sla">Data Encerramento SLA</option>
        </select>
        
        <div style="display:flex;align-items:center;gap:6px;font-size:0.8rem;color:#64748b;">
          De: <input type="date" id="sac-filter-datestart" style="padding:6px 8px;border:1px solid #e2e8f0;border-radius:6px;font-size:0.8rem;outline:none;" onchange="SAC.onFilterDate(this.value, document.getElementById('sac-filter-dateend').value)">
          Até: <input type="date" id="sac-filter-dateend" style="padding:6px 8px;border:1px solid #e2e8f0;border-radius:6px;font-size:0.8rem;outline:none;" onchange="SAC.onFilterDate(document.getElementById('sac-filter-datestart').value, this.value)">
        </div>

        <label style="display:flex;align-items:center;gap:6px;font-size:0.85rem;color:#1e293b;cursor:pointer;padding:6px 8px;border-radius:6px;border:1px solid #e2e8f0;background:#f8fafc;">
          <input type="checkbox" id="sac-filter-urgent" onchange="SAC.onFilterUrgent(this.checked)" style="accent-color:#dc2626;width:16px;height:16px;cursor:pointer;">
          <i class="ph ph-warning-circle" style="color:#dc2626;"></i> Urgentes
        </label>
        
        <span id="sac-count-badge" style="font-size:0.8rem;color:#64748b;white-space:nowrap;margin-left:auto;"></span>
      </div>

      <!-- MAIN CONTENT AREA -->
      <div id="sac-main" style="flex:1;overflow:hidden;position:relative;"></div>

      <!-- MODAIS (injetados dinamicamente) -->
      <div id="sac-modal-overlay" style="display:none;position:fixed;inset:0;background:rgba(15,23,42,0.55);z-index:9000;backdrop-filter:blur(3px);" onclick="SAC.closeModal(event)"></div>
      <div id="sac-modal-container" style="display:none;position:fixed;inset:0;z-index:9001;display:none;align-items:center;justify-content:center;pointer-events:none;"></div>

      <!-- WIZARD OVERLAY -->
      <div id="sac-wizard-overlay" style="display:none;position:fixed;inset:0;background:#f8fafc;z-index:9100;align-items:flex-start;justify-content:center;overflow-y:auto;"></div>

      <!-- TRANSITION MODAL -->
      <div id="sac-trans-overlay" style="display:none;position:fixed;inset:0;background:rgba(15,23,42,0.65);z-index:9200;align-items:center;justify-content:center;"></div>

    </div>
    <style>
      .sac-nav-btn { background:transparent;color:#64748b;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:0.83rem;font-weight:600;display:flex;align-items:center;gap:5px;transition:all 0.15s; }
      .sac-nav-btn:hover, .sac-nav-btn.active { background:#f1f5f9;color:#1e293b; }
      .sac-col-header { position:sticky;top:0;z-index:2;padding:10px 12px;display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid rgba(0,0,0,0.06); }
      .sac-card { background:#fff;border-radius:10px;padding:12px;margin-bottom:10px;border:1.5px solid #e2e8f0;cursor:grab;transition:box-shadow 0.2s,transform 0.15s;box-shadow:0 1px 3px rgba(0,0,0,0.06); }
      .sac-card:hover { box-shadow:0 4px 16px rgba(0,0,0,0.12);transform:translateY(-1px); }
      .sac-card.dragging { opacity:0.45;box-shadow:0 8px 24px rgba(0,0,0,0.2); }
      .sac-col.drag-over { background:rgba(249,115,22,0.06)!important;border:2px dashed #f97316!important; }
      .sac-sla-bar { height:4px;border-radius:2px;margin-top:6px;overflow:hidden;background:#f1f5f9; }
      .sac-sla-fill { height:100%;border-radius:2px;transition:width 0.4s; }
      .sac-modal { background:#fff;border-radius:16px;box-shadow:0 24px 80px rgba(0,0,0,0.22);max-height:90vh;overflow-y:auto;pointer-events:all; }
      .sac-tab-btn { padding:8px 16px;border:none;background:transparent;border-bottom:2px solid transparent;color:#64748b;font-weight:600;font-size:0.83rem;cursor:pointer;transition:all 0.15s; }
      .sac-tab-btn.active { color:#f97316;border-bottom-color:#f97316; }
      .sac-field { margin-bottom:12px; }
      .sac-field label { display:block;font-size:0.78rem;font-weight:700;color:#475569;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.04em; }
      .sac-field input, .sac-field textarea, .sac-field select { width:100%;padding:9px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.88rem;outline:none;box-sizing:border-box;transition:border 0.15s; }
      .sac-field input:focus, .sac-field textarea:focus, .sac-field select:focus { border-color:#f97316; }
      .sac-btn { padding:8px 18px;border-radius:8px;font-weight:700;font-size:0.85rem;cursor:pointer;border:none;transition:all 0.15s;display:inline-flex;align-items:center;gap:6px; }
      .sac-btn-primary { background:#f97316;color:#fff; }
      .sac-btn-primary:hover { background:#ea580c; }
      .sac-btn-secondary { background:#f1f5f9;color:#475569;border:1.5px solid #e2e8f0; }
      .sac-btn-secondary:hover { background:#e2e8f0; }
      .sac-btn-danger { background:#fee2e2;color:#dc2626;border:1.5px solid #fca5a5; }
      .sac-btn-danger:hover { background:#fca5a5; }
      .sac-wiz-step-indicator { display:flex;gap:6px;margin-bottom:20px; }
      .sac-wiz-step { flex:1;height:4px;border-radius:2px;background:#e2e8f0; }
      .sac-wiz-step.done { background:#f97316; }
      .sac-checklist-item { display:flex;align-items:flex-start;gap:10px;padding:8px 10px;border-radius:8px;border:1px solid #f1f5f9;margin-bottom:6px;cursor:pointer;transition:background 0.15s; }
      .sac-checklist-item:hover { background:#f8fafc; }
      .sac-checklist-item.checked { background:#f0fdf4;border-color:#86efac; }
      .sac-timeline-item { display:flex;gap:12px;padding-bottom:16px;position:relative; }
      .sac-timeline-item::before { content:'';position:absolute;left:11px;top:22px;bottom:0;width:2px;background:#e2e8f0; }
      .sac-timeline-item:last-child::before { display:none; }
      .sac-timeline-dot { width:24px;height:24px;border-radius:50%;background:#f97316;flex-shrink:0;display:flex;align-items:center;justify-content:center;color:#fff;font-size:0.7rem; }
      .sac-tag { display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:20px;font-size:0.75rem;font-weight:700; }
      @keyframes sacFadeIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
      .sac-animated { animation:sacFadeIn 0.25s ease; }
    </style>`;
  }

  // ── RENDER PRINCIPAL ─────────────────────────────────────────
  function renderAll() {
    updateNavBtns();
    const main = document.getElementById('sac-main');
    if (!main) return;

    if (_view === 'pipeline') {
      renderPipeline(main);
      document.getElementById('sac-search-bar').style.display = 'flex';
    } else if (_view === 'tabela') {
      renderTabela(main);
      document.getElementById('sac-search-bar').style.display = 'flex';
    } else if (_view === 'config') {
      renderConfig(main);
      document.getElementById('sac-search-bar').style.display = 'none';
    }
    updateCountBadge();
  }

  function updateNavBtns() {
    document.querySelectorAll('.sac-nav-btn[data-view]').forEach(b => {
      b.classList.toggle('active', b.dataset.view === _view);
    });
  }

  function updateCountBadge() {
    const badge = document.getElementById('sac-count-badge');
    if (!badge) return;
    const filtered = getFilteredTickets();
    const total = filtered.length;
    const open = filtered.filter(t => !['concluido','encerrado'].includes(t.stage)).length;
    badge.textContent = `${total} OS encontradas | ${open} em aberto`;
  }

  // ── PIPELINE KANBAN ──────────────────────────────────────────
  function renderPipeline(container) {
    const filtered = getFilteredTickets();
    container.innerHTML = `
    <div style="display:flex;gap:0;overflow-x:auto;height:100%;padding:12px;box-sizing:border-box;">
      ${PIPELINE_STAGES.map(stage => {
        const cards = filtered.filter(t => t.stage === stage.id);
        return `
        <div class="sac-col" id="sac-col-${stage.id}" data-stage="${stage.id}"
          style="min-width:260px;max-width:300px;flex:1;display:flex;flex-direction:column;background:${stage.bg};border-radius:12px;margin:0 5px;border:1.5px solid rgba(0,0,0,0.07);"
          ondragover="SAC.onDragOver(event,'${stage.id}')"
          ondragleave="SAC.onDragLeave('${stage.id}')"
          ondrop="SAC.onDrop(event,'${stage.id}')">
          <div class="sac-col-header" style="background:${stage.bg};border-radius:10px 10px 0 0;">
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="width:10px;height:10px;border-radius:50%;background:${stage.color};display:inline-block;flex-shrink:0;"></span>
              <span style="font-weight:700;font-size:0.82rem;color:${stage.color};text-transform:uppercase;letter-spacing:0.04em;">${stage.name}</span>
            </div>
            <span style="background:${stage.color};color:#fff;border-radius:20px;padding:1px 8px;font-size:0.75rem;font-weight:700;">${cards.length}</span>
          </div>
          <div style="flex:1;overflow-y:auto;padding:10px 8px;">
            ${cards.length === 0
              ? `<div style="text-align:center;color:#94a3b8;font-size:0.8rem;padding:20px 0;">Sem ocorrências</div>`
              : cards.map(t => renderCard(t, stage)).join('')
            }
          </div>
        </div>`;
      }).join('')}
    </div>`;
  }

  function renderCard(ticket, stage) {
    const type = TICKET_TYPES[ticket.typeKey] || { name: ticket.typeKey, icon: '❓', sla: 48 };
    const sla = getSLADetails(ticket);
    const slaColor = sla.labelColor || (sla.status === 'danger' ? '#dc2626' : sla.status === 'warning' ? '#d97706' : '#15803d');

    const slaConsumedPct = sla.consumedPct !== undefined ? sla.consumedPct : Math.min(100, Math.max(0, 100 - sla.pct));
    const slaBarColor = sla.barColor || slaColor;

    const clientShort = ticket.clientName.length > 15
      ? ticket.clientName.substring(0, 15) + '…'
      : ticket.clientName;

    const cl = getChecklist(ticket);
    const clChecked = cl.filter(i => i.checked).length;
    const showCL = showChecklistInStage(ticket.stage);

    const hasPendingLog = ticket.logisticsTask && !ticket.logisticsTask.isCompleted;
    const hasPendingCom = ticket.commercialTask && !ticket.commercialTask.isCompleted;
    const hasPendingFin = ticket.financialTask  && !ticket.financialTask.isCompleted;
    const anyPending = hasPendingLog || hasPendingCom || hasPendingFin;

    let assignedUser = null;
    let assignedUserPhoto = null;
    if (hasPendingLog && ticket.logisticsTask.assignedTo) {
        assignedUser = ticket.logisticsTask.assignedToName;
        assignedUserPhoto = ticket.logisticsTask.assignedToPhoto;
    } else if (hasPendingCom && ticket.commercialTask.assignedTo) {
        assignedUser = ticket.commercialTask.assignedToName;
        assignedUserPhoto = ticket.commercialTask.assignedToPhoto;
    } else if (hasPendingFin && ticket.financialTask.assignedTo) {
        assignedUser = ticket.financialTask.assignedToName;
        assignedUserPhoto = ticket.financialTask.assignedToPhoto;
    }

    const occText = ticket.occurrences && ticket.occurrences.length
      ? ticket.occurrences.slice(0,2).map(o => `<span style="background:#f1f5f9;border-radius:4px;padding:1px 5px;font-size:0.72rem;color:#475569;">${o.name}</span>`).join(' ')
      : '';

    const coverAttachment = (ticket.attachments || []).find(a => /\.(jpeg|jpg|gif|png|webp|bmp)$/i.test(a.url || a.originalName || a.name || a.filename));
    const coverHtml = coverAttachment && coverAttachment.url
      ? `<div style="margin:-12px -12px 12px -12px;overflow:hidden;border-radius:8.5px 8.5px 0 0;"><img src="${coverAttachment.url}" style="width:100%;height:140px;object-fit:cover;display:block;"></div>`
      : '';

    return `
    <div class="sac-card" id="card-${ticket.id}" draggable="true"
      ondragstart="SAC.onDragStart(event,'${ticket.id}')"
      ondragend="SAC.onDragEnd(event,'${ticket.id}')"
      onclick="SAC.openDetail('${ticket.id}')">
      ${coverHtml}
      <div style="margin-bottom:4px;">
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
          <span style="font-size:0.7rem;font-weight:700;color:#64748b;font-family:monospace;">Nº ${ticket.protocol}</span>
          ${ticket.isUrgent ? '<span style="background:#fee2e2;color:#dc2626;border-radius:4px;padding:2px 4px;font-size:0.65rem;font-weight:700;"><i class="ph ph-warning-circle"></i> URGENTE</span>' : ''}
        </div>
        <div style="font-weight:700;font-size:0.8rem;color:#1e293b;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${ticket.clientName}">${clientShort}</div>
      </div>
      <div style="font-size:0.78rem;color:#64748b;margin-bottom:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${ticket.equipment}">
        <i class="ph ph-package" style="margin-right:3px;"></i>${ticket.equipment}
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:3px;margin-bottom:6px;">
        <span style="background:#fff7ed;color:#c2410c;border-radius:4px;padding:1px 6px;font-size:0.72rem;font-weight:700;">${type.icon} ${type.name}</span>
        ${occText}
      </div>
      ${anyPending ? `<div style="background:#fef9c3;border:1px solid #fde047;border-radius:6px;padding:4px 8px;font-size:0.72rem;color:#854d0e;font-weight:700;margin-bottom:6px;display:flex;align-items:center;gap:4px;"><i class="ph ph-clock"></i> Pendência ${hasPendingLog?'Logística':hasPendingCom?'Comercial':'Financeiro'}</div>` : ''}
      ${assignedUser ? `<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;background:#f8fafc;padding:4px;border-radius:6px;border:1px solid #e2e8f0;width:fit-content;">
        <img src="${assignedUserPhoto||''}" style="width:20px;height:20px;border-radius:50%;object-fit:cover;background:#cbd5e1;" onerror="this.style.display='none'">
        <span style="font-size:0.7rem;color:#475569;font-weight:600;">${assignedUser}</span>
      </div>` : ''}
      ${showCL ? `<div style="font-size:0.72rem;color:#64748b;display:flex;align-items:center;gap:5px;margin-bottom:4px;">
        <i class="ph ph-check-square" style="color:#15803d;"></i>
        <span>Checklist: ${clChecked}/${cl.length}</span>
        <div class="sac-sla-bar" style="flex:1;"><div class="sac-sla-fill" style="width:${cl.length?Math.round(clChecked/cl.length*100):0}%;background:${clChecked===cl.length?'#15803d':'#f97316'};"></div></div>
      </div>` : ''}
      <div class="sac-sla-bar"><div class="sac-sla-fill" style="width:${slaConsumedPct}%;background:${slaBarColor};transition:width 0.3s;"></div></div>
      <div style="font-size:0.68rem;margin-top:4px;display:flex;justify-content:space-between;">
        <span style="color:#94a3b8;">${formatDateShort(ticket.openDate)}</span>
        <span style="color:${slaColor};font-weight:700;">${sla.label}</span>
      </div>
    </div>`;
  }



  // ── TABELA ───────────────────────────────────────────────────
  function renderTabela(container) {
    const all = getFilteredTickets();

    // Date filter
    let filtered = all.filter(t => {
      const tms = new Date(t.openDate).getTime();
      if (_tableStartDate) { const s = new Date(_tableStartDate+'T00:00:00').getTime(); if (tms<s) return false; }
      if (_tableEndDate)   { const e = new Date(_tableEndDate+'T23:59:59').getTime(); if (tms>e) return false; }
      return true;
    });

    // Sort
    filtered.sort((a,b) => {
      let va = a[_sortKey], vb = b[_sortKey];
      if (_sortKey==='stage') { va=PIPELINE_STAGES.findIndex(s=>s.id===a.stage); vb=PIPELINE_STAGES.findIndex(s=>s.id===b.stage); }
      if (typeof va==='string') return _sortDir==='asc'?va.localeCompare(vb):vb.localeCompare(va);
      return _sortDir==='asc'?va-vb:vb-va;
    });

    // Pagination
    const totalPages = Math.max(1, Math.ceil(filtered.length / TABLE_PAGE_SIZE));
    if (_tablePage > totalPages) _tablePage = totalPages;
    const paged = filtered.slice((_tablePage-1)*TABLE_PAGE_SIZE, _tablePage*TABLE_PAGE_SIZE);

    function sortIcon(key) { if (_sortKey!==key) return '⇅'; return _sortDir==='asc'?'↑':'↓'; }

    container.innerHTML = `
    <div style="padding:16px;display:flex;flex-direction:column;height:100%;box-sizing:border-box;gap:12px;">
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
        <label style="font-size:0.78rem;font-weight:700;color:#475569;">De:</label>
        <input type="date" value="${_tableStartDate}" style="padding:6px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:0.83rem;" onchange="SAC.setTableDate('start',this.value)">
        <label style="font-size:0.78rem;font-weight:700;color:#475569;">Até:</label>
        <input type="date" value="${_tableEndDate}" style="padding:6px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:0.83rem;" onchange="SAC.setTableDate('end',this.value)">
        <button class="sac-btn sac-btn-primary" onclick="SAC.exportCSV()" style="margin-left:auto;"><i class="ph ph-download-simple"></i> Exportar CSV</button>
      </div>
      <div style="flex:1;overflow:auto;background:#fff;border-radius:12px;border:1px solid #e2e8f0;">
        <table style="width:100%;border-collapse:collapse;font-size:0.83rem;">
          <thead>
            <tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0;">
              <th style="padding:10px 12px;text-align:left;cursor:pointer;white-space:nowrap;" onclick="SAC.sortTable('protocol')">Nº ${sortIcon('protocol')}</th>
              <th style="padding:10px 12px;text-align:left;cursor:pointer;" onclick="SAC.sortTable('openDate')">Data Abertura ${sortIcon('openDate')}</th>
              <th style="padding:10px 12px;text-align:left;cursor:pointer;" onclick="SAC.sortTable('clientName')">Cliente ${sortIcon('clientName')}</th>
              <th style="padding:10px 12px;text-align:left;">Equipamento</th>
              <th style="padding:10px 12px;text-align:left;cursor:pointer;" onclick="SAC.sortTable('typeKey')">Tipo ${sortIcon('typeKey')}</th>
              <th style="padding:10px 12px;text-align:left;cursor:pointer;" onclick="SAC.sortTable('stage')">Etapa ${sortIcon('stage')}</th>
              <th style="padding:10px 12px;text-align:left;">SLA</th>
              <th style="padding:10px 12px;text-align:right;">Ações</th>
            </tr>
          </thead>
          <tbody>
          ${paged.length===0?`<tr><td colspan="8" style="text-align:center;padding:32px;color:#94a3b8;">Nenhum chamado encontrado</td></tr>`:
          paged.map(t => {
            const stage = PIPELINE_STAGES.find(s=>s.id===t.stage)||{name:t.stage,color:'#64748b'};
            const type  = TICKET_TYPES[t.typeKey]||{name:t.typeKey,icon:'❓'};
            const sla   = getSLADetails(t);
            const slaColor = sla.status==='danger'?'#dc2626':sla.status==='warning'?'#d97706':'#15803d';
            return `<tr style="border-bottom:1px solid #f1f5f9;" onmouseover="this.style.background='#fafafa'" onmouseout="this.style.background=''">
              <td style="padding:9px 12px;font-family:monospace;font-weight:700;color:#f97316;">${t.protocol} ${t.isUrgent ? ' <i class="ph ph-warning-circle" style="color:#dc2626;" title="Urgente"></i>' : ''}</td>
              <td style="padding:9px 12px;color:#64748b;font-size:0.78rem;">${formatDateShort(t.openDate)}</td>
              <td style="padding:9px 12px;font-weight:600;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${t.clientName}</td>
              <td style="padding:9px 12px;color:#64748b;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${t.equipment}</td>
              <td style="padding:9px 12px;"><span style="background:#fff7ed;color:#c2410c;border-radius:4px;padding:2px 7px;font-size:0.72rem;font-weight:700;">${type.icon} ${type.name}</span></td>
              <td style="padding:9px 12px;"><span style="background:${stage.color}18;color:${stage.color};border-radius:4px;padding:2px 7px;font-size:0.72rem;font-weight:700;">${stage.name}</span></td>
              <td style="padding:9px 12px;"><span style="color:${slaColor};font-weight:700;font-size:0.78rem;">${sla.label}</span></td>
              <td style="padding:9px 12px;text-align:right;">
                <button class="sac-btn sac-btn-secondary" style="padding:4px 10px;font-size:0.78rem;" onclick="SAC.openDetail('${t.id}')"><i class="ph ph-eye"></i> Ver</button>
              </td>
            </tr>`;
          }).join('')}
          </tbody>
        </table>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;font-size:0.82rem;color:#64748b;">
        <span>${filtered.length} registros</span>
        <div style="display:flex;gap:6px;align-items:center;">
          <button class="sac-btn sac-btn-secondary" style="padding:4px 10px;" onclick="SAC.setPage(${_tablePage-1})" ${_tablePage<=1?'disabled':''}>← Ant.</button>
          <span>Pág. ${_tablePage} / ${totalPages}</span>
          <button class="sac-btn sac-btn-secondary" style="padding:4px 10px;" onclick="SAC.setPage(${_tablePage+1})" ${_tablePage>=totalPages?'disabled':''}>Próx. →</button>
        </div>
      </div>
    </div>`;
  }

  // ── CONFIG ───────────────────────────────────────────────────
  function renderConfig(container) {
    const typesList = Object.entries(TICKET_TYPES);
    container.innerHTML = `
    <div style="padding:20px;overflow-y:auto;height:100%;box-sizing:border-box;">
      <h3 style="margin:0 0 16px 0;font-size:1rem;color:#1e293b;display:flex;align-items:center;gap:8px;"><i class="ph ph-sliders-horizontal" style="color:#f97316;"></i> Parametrização do SAC</h3>
      <div style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;padding:20px;margin-bottom:16px;">
        <h4 style="margin:0 0 12px 0;font-size:0.88rem;color:#475569;text-transform:uppercase;letter-spacing:0.05em;">Tipos de Chamado e SLA</h4>
        <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
          <thead><tr style="border-bottom:1px solid #e2e8f0;">
            <th style="text-align:left;padding:6px 8px;color:#64748b;">Ícone</th>
            <th style="text-align:left;padding:6px 8px;color:#64748b;">Tipo</th>
            <th style="text-align:left;padding:6px 8px;color:#64748b;">SLA (horas)</th>
            <th style="text-align:left;padding:6px 8px;color:#64748b;">Ocorrências Cadastradas</th>
          </tr></thead>
          <tbody>
          ${typesList.map(([k,v]) => `
            <tr style="border-bottom:1px solid #f8fafc;">
              <td style="padding:8px;">${v.icon}</td>
              <td style="padding:8px;font-weight:700;color:#1e293b;">${v.name}</td>
              <td style="padding:8px;color:#f97316;font-weight:700;">${v.sla}h</td>
              <td style="padding:8px;color:#64748b;font-size:0.78rem;">${(OCCURRENCES_BY_TYPE[k]||[]).join(', ') || '—'}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div style="background:#fff0f0;border:1.5px solid #fca5a5;border-radius:12px;padding:16px;">
        <p style="margin:0;font-size:0.85rem;color:#7f1d1d;"><i class="ph ph-info" style="margin-right:5px;"></i> <strong>Nota:</strong> A parametrização avançada de tipos, ocorrências e checklists está disponível — contate o administrador do sistema para inclusões e alterações.</p>
      </div>
    </div>`;
  }

  // ── WIZARD ABERTURA ───────────────────────────────────────────
  function openWizard() {
    _wiz = { step:1, protocol: nextProtocol(), osNumber:'', _protocolLocked:false, _osLinked:false, clientName:'', cnpjCpf:'', equipment:'', address:'', contactName:'', contactPhone:'', contactEmail:'', channel:'WhatsApp', typeKey:'manutencao', occList:[], currentOcc: (OCCURRENCES_BY_TYPE.manutencao||[])[0]||'', currentOccNote:'', description:'' };
    renderWizard();
  }

  window.createSACTicketFromOS = function(osData) {
    openWizard();
    _wiz.protocol = nextProtocol();
    _wiz.osNumber = String(osData.number || '');
    _wiz.clientName = osData.client || '';
    _wiz.equipment = osData.equipment || '';
    _wiz.address = osData.address || '';
    _wiz.typeKey = 'visita_tecnica';
    _wiz._protocolLocked = true;
    _wiz._osLinked = true;
    renderWizard();
    const ov = document.getElementById('sac-wizard-overlay');
    if (ov) ov.style.display = 'flex';
    if (typeof navigateTo === 'function') navigateTo('sac');
  };

  // OS lookup: quando o usuario digita o numero da OS no wizard, busca dados na logistica
  const _TIPOS_EXCLUIR_LOOKUP = ['retirada total','retirada parcial','manutencao avulsa','manutencao','reparo equipamento','visita tecnica'];
  function _sacIsOSTipoExcluido(tipoServico) {
    if (!tipoServico) return false;
    const ts = tipoServico.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    return _TIPOS_EXCLUIR_LOOKUP.some(ex => ts.includes(ex.replace(/ /g,'')) || ts.replace(/ /g,'').includes(ex.replace(/ /g,'')));
  }

  window._sacBuscarOSLogistica = async function(osNum) {
    _sacWiz('osNumber', osNum);
    const num = (osNum || '').trim();
    if (!num) { _wiz._protocolLocked = false; _wiz._osLinked = false; renderWizard(); return; }
    const token = localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
    try {
      const resp = await fetch(`/api/logistica/os/buscar?numero_os=${encodeURIComponent(num)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!resp.ok) { _wiz._osLinked = false; _wiz._protocolLocked = false; renderWizard(); return; }
      const rawLista = await resp.json();
      const fixStr = (str) => {
          if (!str || typeof str !== 'string') return str;
          try { if (/[\\xC2\\xC3][\\x80-\\xBF]/.test(str)) return decodeURIComponent(escape(str)); } catch(e) {}
          return str;
      };
      if (Array.isArray(rawLista)) {
          rawLista.forEach(r => {
              if (r.endereco) r.endereco = fixStr(r.endereco);
              if (r.cliente) r.cliente = fixStr(r.cliente);
          });
      }
      const lista = rawLista;
      const osList = Array.isArray(lista) ? lista : (lista.data || []);
      // Filtra os tipos excluidos
      const validas = osList.filter(o => !_sacIsOSTipoExcluido(o.tipo_servico));
      if (!validas.length) { _wiz._osLinked = false; _wiz._protocolLocked = false; renderWizard(); return; }
      // Coleta os produtos unicos para equipamento
      const os = validas[0];
      // Limpa emojis e prefixos de ícones do nome do cliente
      const _clienteLimpo = (os.cliente || '').replace(/^[\s\S]*?([A-Z\u00C0-\u024F])/u, '$1').trim();
      const enderCalc = [os.endereco, os.complemento].filter(Boolean).join(', ');

      // produtos vem como JSON string do banco SQLite — fazer parse
      const _parseProds = (o) => { try { return JSON.parse(o.produtos || '[]'); } catch(e) { return []; } };
      
      const SAC_EQUIP_ICONS = {
          'STD OBRA': '💙', 'STD EVENTO': '💜',
          'LX OBRA': '🟦', 'LX EVENTO': '🟣',
          'EXL OBRA': '🔵', 'EXL EVENTO': '🟣',
          'PCD OBRA': '♿', 'PCD EVENTO': '♿',
          'CHUVEIRO OBRA': '🚿', 'CHUVEIRO EVENTO': '🚿',
          'HIDRÁULICO OBRA': '🚽', 'HIDRÁULICO EVENTO': '🚽',
          'MICTÓRIO OBRA': '💦', 'MICTÓRIO EVENTO': '💦',
          'PBII OBRA': '🧼', 'PBII EVENTO': '🧼',
          'PBIII OBRA': '🧼', 'PBIII EVENTO': '🧼',
          'GUARITA INDIVIDUAL OBRA': '⬜', 'GUARITA INDIVIDUAL EVENTO': '⬜',
          'GUARITA DUPLA OBRA': '⚪', 'GUARITA DUPLA EVENTO': '⚪',
          'LIMPA FOSSA OBRA': '💧', 'LIMPA FOSSA EVENTO': '💧',
          'CARRINHO': '🛤', 'CAIXA DAGUA': '🧊'
      };

      const todosProds = validas.flatMap(o => _parseProds(o).map(p => {
          const icone = SAC_EQUIP_ICONS[p.desc] || '';
          return (icone ? `${icone} ` : '') + [p.qtd, p.desc].filter(Boolean).join('x ');
      }));
      const prodsUnicos = [...new Set(todosProds)].filter(Boolean);
      const equipFinal = prodsUnicos.length > 1
        ? await _sacEscolherEquipamento(prodsUnicos, _clienteLimpo || os.cliente || '', enderCalc)
        : (prodsUnicos[0] || _parseProds(os)[0]?.desc || '');
      if (equipFinal === null) { _wiz._osLinked = false; _wiz._protocolLocked = false; renderWizard(); return; }
      
      _wiz.clientName = _clienteLimpo || os.cliente || '';
      _wiz.equipment  = equipFinal;
      _wiz.address    = enderCalc;
      _wiz.contactName = os.responsavel || '';
      _wiz.contactPhone = os.telefone || '';
      _wiz.contactEmail = os.email || '';
      _wiz.protocol   = nextProtocol();
      _wiz._protocolLocked = true;
      _wiz._osLinked  = true;
      renderWizard();
    } catch(e) {
      console.warn('[SAC] Erro ao buscar OS logistica:', e);
      _wiz._osLinked = false; _wiz._protocolLocked = false; renderWizard();
    }
  };

  async function _sacEscolherEquipamento(prods, cliente, endereco) {
    return new Promise(resolve => {
      const div = document.createElement('div');
      div.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;';
      div.innerHTML = `<div style="background:white;border-radius:12px;padding:24px;min-width:340px;max-width:90vw;box-shadow:0 8px 32px rgba(0,0,0,0.18);">
        <h3 style="margin:0 0 12px;font-size:1rem;color:#1e293b;">Mais de um equipamento encontrado</h3>
        <div style="background:#f8fafc;border-radius:8px;padding:12px;margin-bottom:14px;border:1px solid #e2e8f0;">
          <div style="font-size:0.85rem;color:#1e293b;margin-bottom:4px;font-weight:600;">${cliente}</div>
          <div style="font-size:0.75rem;color:#64748b;">📍 ${endereco}</div>
        </div>
        <p style="margin:0 0 10px;font-size:0.85rem;color:#475569;">Qual equipamento deseja incluir na ocorrência?</p>
        <div id="_sac-equip-opts" style="display:flex;flex-direction:column;gap:8px;max-height:250px;overflow-y:auto;padding-right:4px;">
          ${prods.map((p,i)=>`<button data-idx="${i}" style="background:#fff;border:1.5px solid #e2e8f0;border-radius:8px;padding:10px 14px;font-size:0.85rem;cursor:pointer;text-align:left;font-weight:600;color:#1e293b;transition:all 0.15s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='#fff'">${p}</button>`).join('')}
        </div>
        <button id="_sac-equip-cancel" style="margin-top:14px;background:#e2e8f0;border:none;border-radius:6px;padding:8px 18px;font-size:0.8rem;cursor:pointer;color:#475569;width:100%;font-weight:600;">Cancelar</button>
      </div>`;
      document.body.appendChild(div);
      div.querySelectorAll('[data-idx]').forEach(btn => {
        btn.addEventListener('click', () => { div.remove(); resolve(prods[+btn.dataset.idx]); });
      });
      div.querySelector('#_sac-equip-cancel').addEventListener('click', () => { div.remove(); resolve(null); });
    });
  }

  function renderWizard() {
    const ov = document.getElementById('sac-wizard-overlay');
    ov.style.display = 'flex';

    const typeOptions = Object.entries(TICKET_TYPES).map(([k,v]) => `<option value="${k}" ${_wiz.typeKey===k?'selected':''}>${v.icon} ${v.name}</option>`).join('');
    const occOptions  = (OCCURRENCES_BY_TYPE[_wiz.typeKey]||[]).map(o => `<option value="${o}" ${_wiz.currentOcc===o?'selected':''}>${o}</option>`).join('');
    const channelOpts = ['WhatsApp','E-mail','Telefone','Presencial'].map(c => `<option ${_wiz.channel===c?'selected':''}>${c}</option>`).join('');

    ov.innerHTML = `
    <div class="sac-modal sac-animated" style="width:100%;min-height:100vh;overflow-y:auto;padding:0;position:relative;border-radius:0;box-shadow:none;background:#f8fafc;" onclick="event.stopPropagation()">
      <div style="background:#fff;border-bottom:1px solid #e2e8f0;padding:12px 24px;display:flex;align-items:center;justify-content:space-between;min-height:56px;flex-shrink:0;position:sticky;top:0;z-index:10;">
        <div style="display:flex;align-items:center;gap:10px;">
          <i class="ph ph-headset" style="font-size:1.4rem;color:#dc2626;"></i>
          <span style="font-weight:800;font-size:1.05rem;letter-spacing:-0.01em;color:#1e293b;">SAC <span style="font-weight:400;font-size:0.8rem;color:#64748b;margin-left:4px;">Novo Chamado</span></span>
        </div>
        <button onclick="SAC.closeWizard()" style="background:none;border:none;font-size:1.4rem;cursor:pointer;color:#94a3b8;padding:4px;transition:color 0.2s;" onmouseover="this.style.color='#1e293b'" onmouseout="this.style.color='#94a3b8'">✕</button>
      </div>

      <div style="max-width:1000px;margin:28px auto;background:#fff;padding:28px;border-radius:12px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1),0 2px 4px -1px rgba(0,0,0,0.06);border:1px solid #e2e8f0;">
        <div style="margin-bottom:24px;">
          <h2 style="margin:2px 0 0;font-size:1.25rem;color:#1e293b;">Detalhes da Solicitação</h2>
          <div style="font-size:0.8rem;color:#64748b;">Preencha todas as informações abaixo para abrir a ocorrência.</div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:32px;">
        <!-- COLUNA 1 -->
        <div>
          <!-- SEÇÃO 1: DADOS DA OS -->
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;margin-top:0;">
            <h3 style="font-size:1rem;color:#0f172a;margin:0;border-left:3px solid #3b82f6;padding-left:8px;">Dados do Chamado & Cliente</h3>
            <label style="display:flex;align-items:center;gap:4px;font-size:0.8rem;color:#1e293b;cursor:pointer;background:#fee2e2;padding:4px 8px;border-radius:6px;border:1px solid #fca5a5;">
              <input type="checkbox" id="wiz-isUrgent" onchange="_sacWiz('isUrgent',this.checked)" ${_wiz.isUrgent?'checked':''} style="accent-color:#ef4444;width:14px;height:14px;cursor:pointer;">
              <i class="ph-fill ph-warning-circle" style="color:#ef4444;"></i> Chamado Urgente
            </label>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
            <div class="sac-field">
              <label>Protocolo / Nº Chamado</label>
              <input type="text" autocomplete="off" value="${_wiz.protocol}" id="wiz-protocol" ${_wiz._protocolLocked ? 'readonly style="background:#f1f5f9;color:#64748b;cursor:not-allowed;"' : 'oninput="_sacWiz(\'protocol\',this.value)"'}>
            </div>
            <div class="sac-field">
              <label>Nº OS (Logística/Comercial)</label>
              <div style="display:flex;gap:6px;align-items:center;">
                <input type="text" autocomplete="off" value="${_wiz.osNumber||''}" placeholder="Nº da OS" id="wiz-osNumber" oninput="_sacWiz('osNumber',this.value)" onkeydown="if(event.key==='Enter'){event.preventDefault();_sacBuscarOSLogistica(this.value);}" style="flex:1;">
                <button onclick="_sacBuscarOSLogistica(document.getElementById('wiz-osNumber').value)" title="Buscar OS" style="background:#1e293b;color:#fff;border:none;border-radius:6px;width:34px;height:34px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:background 0.2s;" onmouseover="this.style.background='#dc2626'" onmouseout="this.style.background='#1e293b'"><i class="ph ph-magnifying-glass" style="font-size:1rem;"></i></button>
              </div>
              ${_wiz._osLinked ? '<div style="font-size:0.72rem;color:#15803d;font-weight:600;margin-top:2px;">✅ Dados preenchidos da OS #'+_wiz.osNumber+'</div>' : ''}
            </div>

          </div>
          <div class="sac-field">
            <label>Nome do Cliente <span style="color:#dc2626">*</span></label>
            <input type="text" autocomplete="off" value="${_wiz.clientName}" id="wiz-clientName" placeholder="Razão Social / Nome" oninput="_sacWiz('clientName',this.value)">
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
            <div class="sac-field">
              <label>CNPJ / CPF</label>
              <input type="text" autocomplete="off" value="${_wiz.cnpjCpf}" oninput="_sacWiz('cnpjCpf',this.value)">
            </div>
            <div class="sac-field">
              <label>Canal de Entrada</label>
              <select onchange="_sacWiz('channel',this.value)">${channelOpts}</select>
            </div>
          </div>
          <div class="sac-field">
            <label>Equipamento <span style="color:#dc2626">*</span></label>
            <input type="text" autocomplete="off" value="${_wiz.equipment}" placeholder="Ex.: Sanitário Químico ID #1234" oninput="_sacWiz('equipment',this.value)">
          </div>
          <div class="sac-field" style="margin-bottom:24px;">
            <label>Endereço / Local</label>
            <input type="text" autocomplete="off" value="${_wiz.address}" oninput="_sacWiz('address',this.value)">
          </div>

          <!-- SEÇÃO 2: CONTATO & TIPO -->
          <h3 style="font-size:1rem;color:#0f172a;margin-bottom:12px;border-left:3px solid #eab308;padding-left:8px;">Informações de Contato</h3>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
            <div class="sac-field">
              <label>Nome do Contato <span style="color:#dc2626">*</span></label>
              <input type="text" autocomplete="off" value="${_wiz.contactName}" placeholder="Nome completo" oninput="_sacWiz('contactName',this.value)">
            </div>
            <div class="sac-field">
              <label>Telefone</label>
              <input type="text" autocomplete="off" value="${_wiz.contactPhone}" placeholder="(XX) XXXXX-XXXX" oninput="_sacWiz('contactPhone',this.value)">
            </div>
          </div>
          <div class="sac-field" style="margin-bottom:24px;">
            <label>E-mail</label>
            <input type="email" autocomplete="off" value="${_wiz.contactEmail}" oninput="_sacWiz('contactEmail',this.value)">
          </div>
        </div>

        <!-- COLUNA 2 -->
        <div>
          <!-- SEÇÃO 3: OCORRÊNCIAS & DESCRIÇÃO -->
          <h3 style="font-size:1rem;color:#0f172a;margin-bottom:12px;margin-top:0;border-left:3px solid #ef4444;padding-left:8px;">Detalhes do Problema</h3>
          <div class="sac-field">
            <label>Tipo de Chamado</label>
            <select onchange="_sacWiz('typeKey',this.value)">${typeOptions}</select>
          </div>
          <div class="sac-field">
            <label>Descrição / Detalhamento <span style="color:#dc2626">*</span></label>
            <textarea rows="3" placeholder="Descreva o problema ou solicitação com detalhes..." oninput="_sacWiz('description',this.value)" style="resize:vertical;">${_wiz.description}</textarea>
          </div>

          <div style="margin-bottom:24px;border:1px dashed #cbd5e1;padding:12px;border-radius:8px;background:#f8fafc;">
            <div class="sac-field" style="margin-bottom:8px;">
              <label>Especificar Ocorrência (Opcional)</label>
              <select id="wiz-occ-select" onchange="_sacWiz('currentOcc',this.value)">${occOptions}</select>
            </div>
            <div class="sac-field" style="margin-bottom:8px;">
              <textarea rows="1" placeholder="Notas sobre a ocorrência específica..." oninput="_sacWiz('currentOccNote',this.value)" style="resize:vertical;">${_wiz.currentOccNote}</textarea>
            </div>
            <button class="sac-btn sac-btn-secondary" onclick="SAC.wizAddOcc()" style="margin-bottom:12px;width:100%;"><i class="ph ph-plus"></i> Adicionar Ocorrência à Lista</button>
            <div id="wiz-occ-list">
              ${_wiz.occList.length===0?`<div style="color:#94a3b8;font-size:0.82rem;text-align:center;padding:12px;">Nenhuma ocorrência adicionada</div>`:
              _wiz.occList.map((o,i)=>`
              <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:8px 12px;margin-bottom:6px;display:flex;justify-content:space-between;align-items:flex-start;">
                <div>
                  <div style="font-weight:700;font-size:0.85rem;color:#15803d;">${o.name}</div>
                  <div style="font-size:0.78rem;color:#64748b;">${o.note}</div>
                </div>
                <button class="sac-btn sac-btn-danger" style="padding:3px 8px;font-size:0.75rem;" onclick="SAC.wizRemoveOcc(${i})"><i class="ph ph-trash"></i></button>
              </div>`).join('')}
            </div>
          </div>

          <!-- SEÇÃO 4: ANEXOS -->
          <h3 style="font-size:1rem;color:#0f172a;margin-bottom:12px;border-left:3px solid #10b981;padding-left:8px;">Anexos (Fotos / Vídeos / Documentos)</h3>
          <div class="sac-field" style="margin-bottom:24px;">
            <input type="file" multiple id="wiz-anexos" accept="image/*,video/*,application/pdf" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:6px;background:#f8fafc;cursor:pointer;">
            <div style="font-size:0.75rem;color:#64748b;margin-top:4px;">Selecione um ou mais arquivos. (Limite recomendado: 30MB)</div>
          </div>
        </div>
      </div>

      <div style="display:flex;justify-content:flex-end;margin-top:20px;border-top:1px solid #f1f5f9;padding-top:16px;">
        <button id="wiz-submit-btn" class="sac-btn sac-btn-primary" onclick="SAC.wizSubmit()" style="font-size:1.05rem;padding:10px 24px;background:#dc2626;" onmouseover="this.style.background='#b91c1c'" onmouseout="this.style.background='#dc2626'"><i class="ph ph-check-circle"></i> Criar Chamado</button>
      </div>
      </div>
    </div>`;
  }

  window._sacWiz = function(field, val) { _wiz[field] = val; if (field === 'typeKey') { _wiz.currentOcc = (OCCURRENCES_BY_TYPE[val]||[])[0]||''; } };

  // ── MODAL DETALHES ───────────────────────────────────────────
  function openDetail(id) {
    _selectedTicket = _tickets.find(t => t.id === id);
    if (!_selectedTicket) return;
    _modalTab = 'geral';
    renderDetailModal();
  }

  function renderDetailModal() {
    const t = _selectedTicket;
    if (!t) return;
    const ov = document.getElementById('sac-modal-overlay');
    const mc = document.getElementById('sac-modal-container');
    ov.style.display = 'block';
    mc.style.display = 'flex';

    const stage  = PIPELINE_STAGES.find(s=>s.id===t.stage)||{name:t.stage,color:'#64748b'};
    const type   = TICKET_TYPES[t.typeKey]||{name:t.typeKey,icon:'❓',sla:48};
    const sla    = getSLADetails(t);
    const slaColor = sla.labelColor || (sla.status === 'danger' ? '#dc2626' : sla.status === 'warning' ? '#d97706' : '#15803d');
    const slaConsumedPct = sla.consumedPct !== undefined ? sla.consumedPct : Math.min(100, Math.max(0, 100 - sla.pct));
    const slaBarColor = sla.barColor || slaColor;

    const cl     = getChecklist(t);
    const clChecked = cl.filter(i=>i.checked).length;

    const stageOpts = PIPELINE_STAGES.map(s=>`<option value="${s.id}" ${s.id===t.stage?'selected':''}>${s.name}</option>`).join('');

    mc.innerHTML = `
    <div class="sac-modal sac-animated" style="width:100vw;max-width:100vw;height:100vh;max-height:100vh;border-radius:0;display:flex;flex-direction:column;" onclick="event.stopPropagation()">
      <!-- MODAL HEADER -->
      <div style="padding:20px 24px 0;border-bottom:1px solid #f1f5f9;">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:12px;">
          <div style="flex:1;">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
              <span style="font-family:monospace;font-weight:800;font-size:1rem;color:#f97316;">Nº ${t.protocol}</span>
              <span class="sac-tag" style="background:${stage.color}18;color:${stage.color};">${stage.name}</span>
              <span class="sac-tag" style="background:#fff7ed;color:#c2410c;">${type.icon} ${type.name}</span>
              <span class="sac-tag" style="background:${sla.status==='danger'?'#fee2e2':sla.status==='warning'?'#fef9c3':'#dcfce7'};color:${sla.status==='danger'?'#dc2626':sla.status==='warning'?'#d97706':'#15803d'};">${sla.label}</span>
            </div>
            <div style="margin-top: 8px; max-width: 320px;">
              <div class="sac-sla-bar" style="height: 6px;"><div class="sac-sla-fill" style="width:${slaConsumedPct}%;background:${slaBarColor};transition:width 0.3s;"></div></div>
            </div>
            <h2 style="margin:8px 0 0;font-size:1.1rem;color:#1e293b;">${t.clientName}</h2>
            <div style="font-size:0.82rem;color:#64748b;margin-top:2px;">${t.equipment} ${t.address?'· '+t.address:''}</div>
          </div>
          <button onclick="SAC.closeModal()" style="background:none;border:none;font-size:1.4rem;cursor:pointer;color:#94a3b8;padding:4px;flex-shrink:0;">✕</button>
        </div>
        <!-- TROCA DE ETAPA -->
        <div style="display:flex;align-items:center;gap:8px;padding:8px 0 0;flex-wrap:wrap;">
          <span style="font-size:0.75rem;font-weight:700;color:#64748b;">MOVER PARA:</span>
          <select style="padding:5px 10px;border:1.5px solid #e2e8f0;border-radius:6px;font-size:0.82rem;outline:none;cursor:pointer;" onchange="SAC.changeStageFromModal(this.value)" ${!canMoveTicket(t) ? 'disabled title="Você só pode mover chamados abertos por você."' : ''}>${stageOpts}</select>
          <button class="sac-btn sac-btn-danger" style="padding:5px 12px;font-size:0.78rem;margin-left:auto;" onclick="SAC.deleteTicket('${t.id}')"><i class="ph ph-trash"></i> Excluir OS</button>
        </div>
        <!-- TABS -->
        <div style="display:flex;gap:0;margin-top:10px;">
          <button class="sac-tab-btn ${_modalTab==='geral'?'active':''}" onclick="SAC.setModalTab('geral')">Geral</button>
          <button class="sac-tab-btn ${_modalTab==='historico'?'active':''}" onclick="SAC.setModalTab('historico')">Histórico</button>
          <button class="sac-tab-btn ${_modalTab==='custo'?'active':''}" onclick="SAC.setModalTab('custo')">Centro de Custo</button>
          ${showChecklistInStage(t.stage)?`<button class="sac-tab-btn ${_modalTab==='checklist'?'active':''}" onclick="SAC.setModalTab('checklist')">Checklist (${clChecked}/${cl.length})</button>`:''}
        </div>
      </div>

      <!-- TAB CONTENT -->
      <div style="flex:1;overflow-y:auto;padding:20px 24px;" id="sac-modal-body">
        ${renderModalTab(t, cl)}
      </div>
    </div>`;
  }

  function renderModalTab(t, cl) {
    if (_modalTab === 'geral') return renderModalGeral(t);
    if (_modalTab === 'historico') return renderModalHistorico(t);
    if (_modalTab === 'custo') return renderModalCusto(t);
    if (_modalTab === 'anexos') return renderModalAnexos(t);
    if (_modalTab === 'checklist') return renderModalChecklist(t, cl);
    return '';
  }

  function renderModalGeral(t) {
    const type = TICKET_TYPES[t.typeKey]||{name:t.typeKey};
    const occOpts = (OCCURRENCES_BY_TYPE[t.typeKey]||[]).map(o=>`<option value="${o}">${o}</option>`).join('');
    const allTasks = [
      t.logisticsTask && { label:'Logística', task:t.logisticsTask, key:'logisticsTask' },
      t.commercialTask && { label:'Comercial', task:t.commercialTask, key:'commercialTask' },
      t.financialTask && { label:'Financeiro', task:t.financialTask, key:'financialTask' }
    ].filter(Boolean);

    const canEditAssignment = (ticket, taskLabel) => {
      const cUser = currentUsername();
      let cUserId = null, isAdmin = false;
      try {
        const u = JSON.parse(localStorage.getItem('erp_user'));
        if (u) {
          cUserId = String(u.id);
          isAdmin = (u.perfil === 'Admin' || u.perfil === 'Administrador' || String(u.grupo_permissao_id) === '1' || u.departamento === 'Processos');
        }
      } catch(e) {}
      if (isAdmin) return true;
      if (ticket.timeline && ticket.timeline.length > 0 && ticket.timeline[0].user === cUser) return true;
      const deptNorm = (taskLabel||'').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
      const deptObj = _globalDepartamentos.find(d => {
          const dNorm = (d.nome||'').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
          return dNorm.includes(deptNorm) || deptNorm.includes(dNorm);
      });
      if (deptObj) {
          const gestorId = deptObj.responsavel_id ? String(deptObj.responsavel_id) : null;
          const gestorNome = deptObj.responsavel_nome ? String(deptObj.responsavel_nome) : null;
          if ((gestorId && (gestorId === cUserId || gestorId === cUser)) || (gestorNome && gestorNome === cUser)) return true;
      }
      return false;
    };

    return `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
      <div>
        <div style="font-size:0.75rem;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:8px;">Dados da OS</div>
        <div style="font-size:0.85rem;color:#1e293b;line-height:1.8;">
          <div><strong>Abertura:</strong> ${formatDate(t.openDate)}</div>
          ${t.closeDate?`<div><strong>Encerramento:</strong> ${formatDate(t.closeDate)}</div>`:''}
          <div><strong>Nº OS Relacionada:</strong> ${t.osNumber||'—'}</div>
          <div><strong>Canal:</strong> ${t.channel||'—'}</div>
          <div><strong>CNPJ/CPF:</strong> ${t.cnpjCpf||'—'}</div>
          <div><strong>Contato:</strong> ${t.contactName||'—'} ${t.contactPhone?'· '+t.contactPhone:''}</div>
          ${t.contactEmail?`<div><strong>E-mail:</strong> ${t.contactEmail}</div>`:''}
        </div>
      </div>
      <div>
        <div style="font-size:0.75rem;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:8px;">Próximos Passos</div>
        <div style="background:#f8fafc;border-radius:8px;padding:10px;font-size:0.84rem;color:#475569;border:1px solid #e2e8f0;">${t.nextSteps||'Nenhum próximo passo registrado.'}</div>
        ${t.description?`<div style="margin-top:10px;font-size:0.75rem;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:4px;">Descrição</div><div style="background:#f8fafc;border-radius:8px;padding:10px;font-size:0.84rem;color:#475569;border:1px solid #e2e8f0;">${t.description}</div>`:''}
      </div>
    </div>

    <!-- TAREFAS SETORIAIS -->
    ${allTasks.length?`
    <div style="margin-bottom:16px;">
      <div style="font-size:0.75rem;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:8px;">Tarefas Setoriais</div>
      ${allTasks.map(({label,task,key}) => {
        const canEdit = canEditAssignment(t, label);
        const disabledAttr = canEdit ? '' : 'disabled title="Apenas o criador do chamado ou gestor do setor podem alterar a atribuição"';
        return `
      <div style="background:${task.isCompleted?'#f0fdf4':'#fffbeb'};border:1.5px solid ${task.isCompleted?'#86efac':'#fde68a'};border-radius:10px;padding:12px;margin-bottom:8px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
          <i class="ph ph-${task.isCompleted?'check-circle':'clock'}" style="color:${task.isCompleted?'#15803d':'#d97706'};font-size:1rem;"></i>
          <strong style="font-size:0.85rem;color:#1e293b;">${label}: </strong>
          <span style="font-size:0.8rem;color:#475569;">${task.name}</span>
        </div>
        <!-- Edição de atribuição -->
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap;">
          <img src="${task.assignedToPhoto||''}" style="width:26px;height:26px;border-radius:50%;object-fit:cover;background:#cbd5e1;flex-shrink:0;" onerror="this.style.display='none'">
          <select id="assign-select-${key}" ${disabledAttr} style="flex:1;min-width:160px;padding:5px 8px;border:1.5px solid #e2e8f0;border-radius:6px;font-size:0.8rem;outline:none;cursor:${canEdit?'pointer':'not-allowed'};opacity:${canEdit?'1':'0.7'};" onchange="SAC.changeTaskAssignment('${key}', this.value)">
            <option value="">— Nenhum —</option>
            ${(window._sacUsersList||[]).map(u=>`<option value="${u.username||u.login||u.email}" ${(task.assignedTo===(u.username||u.login||u.email))?'selected':''}>${u.nome||u.name||u.username}</option>`).join('')}
          </select>
          <span style="font-size:0.75rem;color:#94a3b8;">Atribuído a: <strong>${task.assignedToName||task.assignedTo||'Ninguém'}</strong></span>
        </div>
        ${task.isCompleted?`<div style="font-size:0.8rem;color:#15803d;padding:6px 10px;background:#dcfce7;border-radius:6px;"><strong>Resposta:</strong> ${task.feedback}</div>
        <button class="sac-btn sac-btn-secondary" style="margin-top:6px;padding:4px 10px;font-size:0.78rem;" onclick="SAC.reopenTask('${key}')"><i class="ph ph-arrow-counter-clockwise"></i> Reabrir</button>`:
        `<div id="task-feedback-${key}" style="margin-top:6px;">
          <textarea id="tf-${key}" rows="2" placeholder="Escreva a resposta/feedback do setor ${label}..." style="width:100%;padding:7px 10px;border:1.5px solid #e2e8f0;border-radius:6px;font-size:0.82rem;outline:none;box-sizing:border-box;resize:vertical;"></textarea>
          <button class="sac-btn sac-btn-primary" style="margin-top:6px;padding:5px 12px;font-size:0.78rem;" onclick="SAC.completeTask('${key}')"><i class="ph ph-check-circle"></i> Marcar como Respondido</button>
        </div>`}
      </div>`}).join('')}
    </div>`:''}

    <!-- OCORRÊNCIAS E COMENTÁRIOS -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
      <!-- OCORRÊNCIAS -->
      <div>
        <div style="font-size:0.75rem;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:8px;">Ocorrências (${t.occurrences.length})</div>
        ${t.occurrences.map((o,i)=>`
        <div style="background:#f8fafc;border-radius:8px;padding:10px 12px;margin-bottom:6px;border:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
          <div style="flex:1;">
            <div style="font-weight:700;font-size:0.85rem;color:#1e293b;">${o.name}</div>
            ${o.note?`<div style="font-size:0.78rem;color:#64748b;margin-top:2px;">${o.note}</div>`:''}
          </div>
          ${t.occurrences.length>1?`<button class="sac-btn sac-btn-danger" style="padding:3px 8px;font-size:0.72rem;" onclick="SAC.removeOccurrence(${i})"><i class="ph ph-trash"></i></button>`:''}
        </div>`).join('')}
        ${!['concluido','encerrado'].includes(t.stage)?`
        <div style="background:#fff;border:1.5px dashed #e2e8f0;border-radius:8px;padding:12px;margin-top:8px;">
          <div style="font-size:0.78rem;font-weight:700;color:#64748b;margin-bottom:6px;">Adicionar Ocorrência</div>
          <select id="modal-occ-select" style="width:100%;padding:7px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:0.83rem;margin-bottom:6px;">${occOpts}</select>
          <textarea id="modal-occ-note" rows="2" placeholder="Observação sobre a ocorrência..." style="width:100%;padding:7px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:0.83rem;outline:none;box-sizing:border-box;resize:vertical;margin-bottom:6px;"></textarea>
          <button class="sac-btn sac-btn-secondary" onclick="SAC.addOccurrenceFromModal()"><i class="ph ph-plus"></i> Adicionar</button>
        </div>`:''}
      </div>

      <!-- COMENTÁRIOS -->
      <div>
        <div style="font-size:0.75rem;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:8px;">Comentários</div>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;display:flex;flex-direction:column;height:300px;">
          <div style="flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;">
            ${!(t.comments && t.comments.length) ? '<div style="color:#94a3b8;font-size:0.8rem;text-align:center;padding:20px;">Nenhum comentário.</div>' : 
              (t.comments||[]).map(c => `
              <div style="background:#fff;border:1px solid #e2e8f0;border-radius:6px;padding:8px;">
                <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                  <strong style="font-size:0.75rem;color:#1e293b;">${c.user}</strong>
                  <span style="font-size:0.65rem;color:#94a3b8;">${formatDate(c.time)}</span>
                </div>
                <div style="font-size:0.8rem;color:#475569;white-space:pre-wrap;">${c.text}</div>
              </div>`).join('')}
          </div>
          <div style="border-top:1px solid #e2e8f0;padding:8px;background:#fff;border-radius:0 0 8px 8px;display:flex;gap:6px;">
            <textarea id="new-comment-text" rows="1" placeholder="Escreva um recado..." style="flex:1;padding:6px;border:1px solid #e2e8f0;border-radius:4px;font-size:0.8rem;resize:none;outline:none;font-family:inherit;"></textarea>
            <button class="sac-btn sac-btn-primary" style="padding:0 10px;" onclick="SAC.addComment('${t.id}')"><i class="ph ph-paper-plane-right"></i></button>
          </div>
        </div>
      </div>
    </div>

    <!-- ANEXOS (na aba Geral) -->
    <div style="margin-top:20px;">
      <div style="font-size:0.75rem;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:8px;">Anexos</div>
      ${(t.attachments||[]).length?`
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:8px;margin-bottom:10px;">
        ${(t.attachments||[]).map((a,ai)=>{
          const fname = a.originalName||a.name||a.filename||'Arquivo';
          const isImg = /\.(jpeg|jpg|gif|png|webp|bmp)$/i.test(fname) || /\.(jpeg|jpg|gif|png|webp|bmp)$/i.test(a.url||'');
          const key = a.r2Key||a.originalName||a.name||a.filename;
          if(isImg && a.url) {
            return `<div style="position:relative;border-radius:8px;overflow:hidden;aspect-ratio:1;cursor:pointer;border:1.5px solid #e2e8f0;" onclick="event.stopPropagation();SAC.openAttachmentViewer(${ai})" title="${fname}">
              <img src="${a.url}" style="width:100%;height:100%;object-fit:cover;display:block;">
              <button onclick="event.stopPropagation();SAC.removeAttachment('${key}')" style="position:absolute;top:3px;right:3px;background:rgba(220,38,38,0.85);color:#fff;border:none;border-radius:4px;padding:1px 5px;font-size:0.65rem;cursor:pointer;"><i class="ph ph-trash"></i></button>
            </div>`;
          }
          return `<div style="background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:8px;aspect-ratio:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;cursor:pointer;padding:6px;overflow:hidden;" onclick="${a.url?`event.stopPropagation();window.open('${a.url}','_blank')`:''}" title="${fname}">
            <i class="ph ph-file-text" style="font-size:1.8rem;color:#64748b;"></i>
            <span style="font-size:0.62rem;color:#475569;text-align:center;word-break:break-all;line-height:1.2;max-height:2.6em;overflow:hidden;">${fname}</span>
            <button onclick="event.stopPropagation();SAC.removeAttachment('${key}')" style="background:#fee2e2;color:#dc2626;border:none;border-radius:4px;padding:1px 5px;font-size:0.65rem;cursor:pointer;margin-top:2px;"><i class="ph ph-trash"></i></button>
          </div>`;
        }).join('')}
      </div>`:''}
      ${!(t.attachments||[]).length?`<div style="text-align:center;color:#94a3b8;padding:12px;">Nenhum arquivo anexado.</div>`:''}
      <div style="margin-top:10px;background:#fff;border:1.5px dashed #e2e8f0;border-radius:10px;padding:14px;text-align:center;">
        <i class="ph ph-upload-simple" style="font-size:1.4rem;color:#94a3b8;display:block;margin-bottom:4px;"></i>
        <label style="cursor:pointer;font-size:0.83rem;font-weight:600;color:#f97316;">
          <input type="file" multiple onchange="SAC.addAttachments(this.files)" style="display:none;">
          Selecionar arquivos para upload
        </label>
        <div style="font-size:0.75rem;color:#94a3b8;margin-top:4px;">PDF, imagens, documentos</div>
      </div>
    </div>`;
  }

  function renderModalHistorico(t) {
    const tl = [...(t.timeline||[])].reverse();
    if (!tl.length) return `<div style="text-align:center;color:#94a3b8;padding:32px;">Nenhum registro no histórico.</div>`;
    const stageColors = {};
    PIPELINE_STAGES.forEach(s => stageColors[s.id] = s.color);
    return `<div style="max-width:600px;">${tl.map(log => `
    <div class="sac-timeline-item">
      <div class="sac-timeline-dot" style="background:${stageColors[log.stage]||'#64748b'};"><i class="ph ph-clock" style="font-size:0.75rem;"></i></div>
      <div style="flex:1;">
        <div style="font-size:0.72rem;color:#94a3b8;">${formatDate(log.time)}</div>
        <div style="font-weight:700;font-size:0.82rem;color:${stageColors[log.stage]||'#475569'};">${PIPELINE_STAGES.find(s=>s.id===log.stage)?.name||log.stage}</div>
        <div style="font-size:0.83rem;color:#475569;margin-top:2px;">${log.notes||''}</div>
        ${log.user?`<div style="font-size:0.72rem;color:#94a3b8;margin-top:2px;">Por: ${log.user}</div>`:''}
      </div>
    </div>`).join('')}</div>`;
  }

  function renderModalCusto(t) {
    const list = t.costCenters || [];
    const total = list.reduce((s,c)=>s+(c.lossValue||0),0);
    const sectors = ['Cliente','CS (Cortesia)','Setor Técnico','Logística','Comercial','Financeiro','Pátio','Motorista'];

    return `
    <div>
      ${list.length?`
      <div style="margin-bottom:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <span style="font-size:0.75rem;font-weight:700;color:#94a3b8;text-transform:uppercase;">Lançamentos (${list.length})</span>
          <span style="font-weight:800;font-size:1rem;color:#dc2626;">${formatBRL(total)}</span>
        </div>
        ${list.map(cc=>`
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 12px;margin-bottom:6px;display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
          <div style="flex:1;">
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
              <span style="font-weight:700;font-size:0.85rem;color:#1e293b;">${cc.sector}</span>
              ${cc.hasBilling?`<span class="sac-tag" style="background:#dbeafe;color:#1d4ed8;font-size:0.7rem;">Cobrar do cliente</span>`:''}
            </div>
            <div style="font-size:0.78rem;color:#64748b;margin-top:2px;">${cc.reason}</div>
          </div>
          <div style="text-align:right;flex-shrink:0;">
            <div style="font-weight:800;color:#dc2626;">${formatBRL(cc.lossValue)}</div>
            <button class="sac-btn sac-btn-danger" style="padding:2px 8px;font-size:0.72rem;margin-top:4px;" onclick="SAC.removeCostCenter('${cc.id}')"><i class="ph ph-trash"></i></button>
          </div>
        </div>`).join('')}
      </div>`:
      `<div style="text-align:center;color:#94a3b8;padding:16px;">Nenhum lançamento de custo registrado.</div>`}

      <div style="background:#fff;border:1.5px solid #e2e8f0;border-radius:10px;padding:16px;">
        <div style="font-size:0.78rem;font-weight:700;color:#475569;margin-bottom:10px;text-transform:uppercase;">Novo Lançamento</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
          <div class="sac-field" style="margin:0;">
            <label>Setor Responsável</label>
            <select id="cc-sector" style="padding:7px 10px;border:1.5px solid #e2e8f0;border-radius:6px;font-size:0.83rem;width:100%;">
              ${sectors.map(s=>`<option>${s}</option>`).join('')}
            </select>
          </div>
          <div class="sac-field" style="margin:0;">
            <label>Valor do Prejuízo (R$)</label>
            <input type="number" id="cc-valor" min="0" step="0.01" placeholder="0,00" style="padding:7px 10px;border:1.5px solid #e2e8f0;border-radius:6px;font-size:0.83rem;width:100%;box-sizing:border-box;">
          </div>
        </div>
        <div class="sac-field" style="margin-bottom:10px;">
          <label>Motivo / Justificativa</label>
          <textarea id="cc-motivo" rows="2" placeholder="Descreva a causa do prejuízo..." style="width:100%;padding:7px 10px;border:1.5px solid #e2e8f0;border-radius:6px;font-size:0.83rem;resize:vertical;box-sizing:border-box;outline:none;"></textarea>
        </div>
        <label style="display:flex;align-items:center;gap:6px;font-size:0.83rem;cursor:pointer;margin-bottom:12px;">
          <input type="checkbox" id="cc-billing"> Cobrar do cliente em boleto
        </label>
        <button class="sac-btn sac-btn-primary" onclick="SAC.saveCostCenter()"><i class="ph ph-plus-circle"></i> Adicionar Lançamento</button>
      </div>
    </div>`;
  }

  function renderModalAnexos(t) {
    const list = t.attachments || [];
    return `
    <div>
      ${list.length?`
      ${list.map(a=>`
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 12px;margin-bottom:6px;display:flex;align-items:center;gap:10px;">
        <i class="ph ph-file-text" style="font-size:1.2rem;color:#64748b;flex-shrink:0;"></i>
        <div style="flex:1;">
          <div style="font-weight:600;font-size:0.85rem;color:#1e293b;">
            ${a.url ? `<a href="${a.url}" target="_blank" style="color:#1e293b;text-decoration:none;" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">` : ''}
            ${a.originalName||a.name||a.filename||'Arquivo'}
            ${a.url ? `</a>` : ''}
          </div>
          <div style="font-size:0.72rem;color:#94a3b8;">${a.size||''} ${a.date||a.uploadDate?'· '+(a.date||formatDate(a.uploadDate)):''}</div>
        </div>
        <button class="sac-btn sac-btn-danger" style="padding:3px 8px;font-size:0.72rem;" onclick="SAC.removeAttachment('${a.r2Key||a.originalName||a.name||a.filename}')"><i class="ph ph-trash"></i></button>
      </div>`).join('')}`:`<div style="text-align:center;color:#94a3b8;padding:16px;">Nenhum arquivo anexado.</div>`}
      <div style="margin-top:16px;background:#fff;border:1.5px dashed #e2e8f0;border-radius:10px;padding:16px;text-align:center;">
        <i class="ph ph-upload-simple" style="font-size:1.5rem;color:#94a3b8;display:block;margin-bottom:6px;"></i>
        <label style="cursor:pointer;font-size:0.83rem;font-weight:600;color:#f97316;">
          <input type="file" multiple onchange="SAC.addAttachments(this.files)" style="display:none;">
          Selecionar arquivos para upload (serão enviados na hora)
        </label>
        <div style="font-size:0.75rem;color:#94a3b8;margin-top:4px;">PDF, imagens, documentos</div>
      </div>
    </div>`;
  }

  function renderModalChecklist(t, cl) {
    const checked = cl.filter(i=>i.checked).length;
    const pct = cl.length ? Math.round(checked/cl.length*100) : 0;
    return `
    <div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
        <span style="font-size:0.82rem;color:#64748b;">${checked}/${cl.length} itens concluídos</span>
        <span style="font-weight:700;font-size:0.88rem;color:${pct===100?'#15803d':'#f97316'};">${pct}%</span>
      </div>
      <div class="sac-sla-bar" style="height:6px;margin-bottom:16px;"><div class="sac-sla-fill" style="width:${pct}%;background:${pct===100?'#15803d':'#f97316'};"></div></div>
      ${cl.map((item, i) => `
      <div class="sac-checklist-item ${item.checked?'checked':''}" onclick="SAC.toggleChecklist(${i})">
        <div style="width:20px;height:20px;border-radius:4px;border:2px solid ${item.checked?'#15803d':'#e2e8f0'};background:${item.checked?'#15803d':'#fff'};display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all 0.15s;">
          ${item.checked?`<i class="ph ph-check" style="color:#fff;font-size:0.7rem;"></i>`:''}
        </div>
        <span style="font-size:0.84rem;color:${item.checked?'#15803d':'#475569'};${item.checked?'text-decoration:line-through;opacity:0.7;':''}">${item.text}</span>
      </div>`).join('')}
      ${t.checklistJustification?`<div style="margin-top:12px;background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:10px;font-size:0.82rem;color:#c2410c;"><strong>Justificativa de encerramento:</strong> ${t.checklistJustification}</div>`:''}
    </div>`;
  }

  // -- MODAL DE TRANSICAO --------------------------------------------------
  async function openTransitionModal(ticketId, targetStageId) {
    const ticket = _tickets.find(t => t.id === ticketId);
    if (!ticket) return;
    const src = PIPELINE_STAGES.find(s => s.id === ticket.stage);
    const tgt = PIPELINE_STAGES.find(s => s.id === targetStageId);
    let usersList = window._sacUsersList || [];
    let lastSector = 'Logística';
    let lastUser = '';
    
    if (targetStageId === 'aguardando_setores') {
      try {
        const token = localStorage.getItem('erp_token') || localStorage.getItem('token');
        const res = await fetch('/api/usuarios', { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) usersList = await res.json();
      } catch (e) { console.error('Erro ao buscar usuarios:', e); }

      let latestTime = 0;
      const checkTask = (task, sectorName) => {
          if (task && task.isCompleted && task.history) {
              const lastRes = task.history.findLast(h => h.type === 'resolution');
              if (lastRes) {
                  const tTime = new Date(lastRes.time).getTime();
                  if (tTime > latestTime) { latestTime = tTime; lastSector = sectorName; lastUser = task.assignedTo; }
              }
          }
      };
      checkTask(ticket.logisticsTask, 'Logística');
      checkTask(ticket.commercialTask, 'Comercial');
      checkTask(ticket.financialTask, 'Financeiro');
    }
    
    _pendingTransition = { ticketId, targetStageId, srcName: src?.name||ticket.stage, tgtName: tgt?.name||targetStageId, usersList };
    _transForm = { nextSteps:'', obs:'', sector: lastSector, assignedUser: lastUser, closingReason:'Concluído', checklistJustification:'', closingAttachments:[] };
    renderTransModal();
  }

  function renderTransModal() {
    const ov = document.getElementById('sac-trans-overlay');
    ov.style.display = 'flex';
    const pt = _pendingTransition;
    const ticket = _tickets.find(t => t.id === pt.ticketId);
    const isClosing  = pt.targetStageId === 'encerrado';
    const isAguard  = pt.targetStageId === 'aguardando_setores';
    const cl = ticket ? getChecklist(ticket) : [];
    const hasUnchecked = cl.some(i => !i.checked);
    const sectorOpts = ['Logística','Comercial','Financeiro'];
    ov.innerHTML = '<div class="sac-modal sac-animated" style="width:500px;max-width:95vw;padding:24px;" onclick="event.stopPropagation()">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">' +
        '<div><div style="font-size:0.75rem;color:#94a3b8;font-weight:600;">Transição de Etapa</div>' +
        '<h3 style="margin:2px 0 0;font-size:1rem;color:#1e293b;">' + pt.srcName + ' → ' + pt.tgtName + '</h3></div>' +
        '<button onclick="SAC.cancelTransition()" style="background:none;border:none;font-size:1.3rem;cursor:pointer;color:#94a3b8;">&times;</button>' +
      '</div>' +
      (isAguard ?
        `<div class="sac-field"><label>Setor Demandado <span style="color:#dc2626">*</span></label>
        <select id="trans-sector" onchange="SAC.filterTransUsers(this.value)" style="padding:8px 10px;border:1.5px solid #e2e8f0;border-radius:6px;font-size:0.85rem;width:100%;">
          <option value="Logística" ${_transForm.sector==='Logística'?'selected':''}>Logística</option>
          <option value="Comercial" ${_transForm.sector==='Comercial'?'selected':''}>Comercial</option>
          <option value="Financeiro" ${_transForm.sector==='Financeiro'?'selected':''}>Financeiro</option>
        </select></div>
        <div class="sac-field"><label>Usuário Atribuído <span style="color:#dc2626">*</span></label>
        <div style="display:flex;align-items:center;gap:10px;"><select id="trans-assigned-user" onchange="document.getElementById('trans-assigned-photo').src=this.options[this.selectedIndex].dataset.photo||'';document.getElementById('trans-assigned-photo').style.display=this.options[this.selectedIndex].dataset.photo?'block':'none';" style="padding:8px 10px;border:1.5px solid #e2e8f0;border-radius:6px;font-size:0.85rem;flex:1;"><option value="">Selecione um usuário...</option></select>
        <img id="trans-assigned-photo" src="" style="width:36px;height:36px;border-radius:50%;object-fit:cover;background:#e2e8f0;display:none;" onerror="this.style.display='none'"></div></div>` : '') +
      (isClosing ?
        `<div class="sac-field"><label>Motivo de Encerramento <span style="color:#dc2626">*</span></label><select id="trans-closing-reason" style="padding:8px 10px;border:1.5px solid #e2e8f0;border-radius:6px;font-size:0.85rem;width:100%;"><option>Concluído</option><option>Improcedente</option><option>Cancelado pelo cliente</option><option>Outro</option></select></div>
        <div class="sac-field"><label>Resumo do Encerramento <span style="color:#dc2626">*</span></label><textarea id="trans-obs" rows="3" placeholder="Descreva como o chamado foi resolvido..." style="width:100%;padding:8px 10px;border:1.5px solid #e2e8f0;border-radius:6px;font-size:0.85rem;resize:vertical;box-sizing:border-box;outline:none;"></textarea></div>` +
        (showChecklistInStage(ticket?.stage||'') && hasUnchecked ? `<div class="sac-field" style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:12px;"><label style="color:#c2410c;">Justificativa checklist <span style="color:#dc2626">*</span></label><textarea id="trans-cl-just" rows="2" placeholder="Explique por que itens do checklist não foram concluídos..." style="width:100%;padding:8px 10px;border:1.5px solid #fed7aa;border-radius:6px;font-size:0.85rem;resize:vertical;box-sizing:border-box;outline:none;"></textarea></div>` : '') :
        `<div class="sac-field"><label>Próximos Passos <span style="color:#dc2626">*</span></label><textarea id="trans-next" rows="3" placeholder="O que será feito a seguir?" style="width:100%;padding:8px 10px;border:1.5px solid #e2e8f0;border-radius:6px;font-size:0.85rem;resize:vertical;box-sizing:border-box;outline:none;"></textarea></div>
        <div class="sac-field"><label>Observação (opcional)</label><textarea id="trans-obs" rows="2" placeholder="Informação adicional..." style="width:100%;padding:8px 10px;border:1.5px solid #e2e8f0;border-radius:6px;font-size:0.85rem;resize:vertical;box-sizing:border-box;outline:none;"></textarea></div>`) +
      `<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px;"><button class="sac-btn sac-btn-secondary" onclick="SAC.cancelTransition()">Cancelar</button><button class="sac-btn sac-btn-primary" onclick="SAC.confirmTransition()"><i class="ph ph-check-circle"></i> Confirmar Transição</button></div>
      </div>`;
    if (isAguard) setTimeout(() => SAC.filterTransUsers(_transForm.sector, _transForm.assignedUser), 0);
  }

  // ── PERMISSIONS ───────────────────────────────────────────────
  function canMoveTicket(t) {
    const perms = window.activeUserPerms || {};
    const isTopAdmin = window.isTopAdmin || false;
    const canSeeAll = isTopAdmin || (perms['sac'] === true && perms['sac-atribuidos'] !== true);
    if (canSeeAll) return true;
    const cuLower = (currentUsername() || '').toLowerCase();
    const isCreator = t.timeline && t.timeline.length > 0 && t.timeline[0].user && t.timeline[0].user.toLowerCase() === cuLower;
    return isCreator;
  }

  // ── FILTRAGEM ─────────────────────────────────────────────────
  function getFilteredTickets() {
    const s = _searchTerm.toLowerCase();
    const cu = window.currentUser;
    const perms = window.activeUserPerms || {};
    const isTopAdmin = window.isTopAdmin || false;
    // canSeeAll: apenas Diretoria/Admin OU quem tem permissão plena 'sac' SEM restrição de 'sac-atribuidos'
    // Se tem 'sac-atribuidos', vê apenas os chamados relacionados a ele mesmo
    const canSeeAll = isTopAdmin || (perms['sac'] === true && perms['sac-atribuidos'] !== true);
    const canSeeAssigned = !canSeeAll && (perms['sac-atribuidos'] === true || perms['sac'] === true);

    // Identifica quais departamentos o usuário atual gerencia (via tela Gestão de Departamentos)
    const currUsername = currentUsername();
    const currNome = (cu ? (cu.nome || '') : '').toLowerCase();
    const deptMap = { 'Logística': 'logisticsTask', 'Comercial': 'commercialTask', 'Financeiro': 'financialTask' };
    const myManagedDepts = _globalDepartamentos
      .filter(d => {
        const respId = (d.responsavel_id || '').toString().toLowerCase();
        const respNome = (d.responsavel_nome || '').toLowerCase();
        return respId === currUsername.toLowerCase() ||
               (currNome && respNome && respNome.includes(currNome));
      })
      .map(d => (d.nome || '').trim());

    return _tickets.filter(t => {
      const matchSearch = !s ||
        t.protocol.toLowerCase().includes(s) ||
        t.clientName.toLowerCase().includes(s) ||
        (t.equipment||'').toLowerCase().includes(s) ||
        (t.cnpjCpf||'').includes(s) ||
        (t.occurrences||[]).some(o => o.name.toLowerCase().includes(s) || (o.note||'').toLowerCase().includes(s));
      const matchType = _filterType === 'all' || t.typeKey === _filterType;
      const matchUrgent = !_filterUrgent || t.isUrgent;

      let matchDate = true;
      if (_filterDateStart || _filterDateEnd) {
        let compareMs = 0;
        if (_filterDateType === 'abertura') {
          compareMs = new Date(_normDate(t.openDate || '')).getTime() || 0;
        } else if (_filterDateType === 'sla') {
          const sla = getSLADetails(t);
          if (sla.closedDateMs) compareMs = sla.closedDateMs;
          else compareMs = sla.closedDateMs || 0;
        }
        if (compareMs > 0) {
          if (_filterDateStart) {
            const startMs = new Date(_filterDateStart + 'T00:00:00').getTime();
            if (compareMs < startMs) matchDate = false;
          }
          if (_filterDateEnd && matchDate) {
            const endMs = new Date(_filterDateEnd + 'T23:59:59').getTime();
            if (compareMs > endMs) matchDate = false;
          }
        } else {
          matchDate = false;
        }
      }

      let matchPermission = canSeeAll;
      if (!canSeeAll) {
        const cuLower = (currUsername || '').toLowerCase();
        const isAssigned = (t.logisticsTask && t.logisticsTask.assignedTo && t.logisticsTask.assignedTo.toLowerCase() === cuLower) ||
                           (t.commercialTask && t.commercialTask.assignedTo && t.commercialTask.assignedTo.toLowerCase() === cuLower) ||
                           (t.financialTask && t.financialTask.assignedTo && t.financialTask.assignedTo.toLowerCase() === cuLower);
        const isCreator = t.timeline && t.timeline.length > 0 && t.timeline[0].user && t.timeline[0].user.toLowerCase() === cuLower;
        const wasEverAssigned = isAssigned || (t.logisticsTask && t.logisticsTask.history && t.logisticsTask.history.some(h => h.assignedTo && h.assignedTo.toLowerCase() === cuLower)) ||
                                (t.commercialTask && t.commercialTask.history && t.commercialTask.history.some(h => h.assignedTo && h.assignedTo.toLowerCase() === cuLower)) ||
                                (t.financialTask && t.financialTask.history && t.financialTask.history.some(h => h.assignedTo && h.assignedTo.toLowerCase() === cuLower));
        const isManagerOfTicket = myManagedDepts.some(dept => {
          const taskKey = deptMap[dept];
          return taskKey && t[taskKey];
        });
        matchPermission = isAssigned || wasEverAssigned || isCreator || (canSeeAssigned && isManagerOfTicket);
      }

      return matchSearch && matchType && matchUrgent && matchDate && matchPermission;
    });
  }

  // ── DRAG & DROP ────────────────────────────────────────────────
  function onDragStart(e, id) {
    const t = _tickets.find(x => x.id === id);
    if (t && !canMoveTicket(t)) {
        e.preventDefault();
        showToast('Você só pode mover chamados abertos por você.', 'warning');
        return;
    }
    _draggedId = id;
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => {
      const card = document.getElementById('card-'+id);
      if (card) card.classList.add('dragging');
    }, 0);
  }

  function onDragEnd(e, id) {
    _draggedId = null;
    const card = document.getElementById('card-'+id);
    if (card) card.classList.remove('dragging');
    document.querySelectorAll('.sac-col').forEach(c => c.classList.remove('drag-over'));
  }

  function onDragOver(e, colId) {
    e.preventDefault();
    document.querySelectorAll('.sac-col').forEach(c => c.classList.remove('drag-over'));
    const col = document.getElementById('sac-col-'+colId);
    if (col) col.classList.add('drag-over');
  }

  function onDragLeave(colId) {
    const col = document.getElementById('sac-col-'+colId);
    if (col) col.classList.remove('drag-over');
  }

  function onDrop(e, colId) {
    e.preventDefault();
    document.querySelectorAll('.sac-col').forEach(c => c.classList.remove('drag-over'));
    if (!_draggedId) return;
    const ticket = _tickets.find(t => t.id === _draggedId);
    if (!ticket || ticket.stage === colId) { _draggedId = null; return; }

    // Gate: check pending tasks
    const gate = checkGate(ticket, colId);
    if (gate) {
      alert(`Bloqueio de Conformidade:\n\nEste chamado possui uma TAREFA DE ${gate.sector.toUpperCase()} pendente.\n"${gate.task}"\n\nConclua essa pendência antes de avançar.`);
      _draggedId = null;
      return;
    }

    openTransitionModal(_draggedId, colId);
    _draggedId = null;
  }

  function checkGate(ticket, targetStageId) {
    const srcIdx = PIPELINE_STAGES.findIndex(s => s.id === ticket.stage);
    const tgtIdx = PIPELINE_STAGES.findIndex(s => s.id === targetStageId);
    if (tgtIdx > srcIdx) {
      if (ticket.logisticsTask && !ticket.logisticsTask.isCompleted) return { sector:'Logística', task: ticket.logisticsTask.name };
      if (ticket.commercialTask && !ticket.commercialTask.isCompleted) return { sector:'Comercial', task: ticket.commercialTask.name };
      if (ticket.financialTask  && !ticket.financialTask.isCompleted)  return { sector:'Financeiro',  task: ticket.financialTask.name };
    }
    return null;
  }

  // ── AÇÕES PÚBLICO ─────────────────────────────────────────────
  const SAC = window.SAC = {
    setView(v)    { _view = v; renderAll(); },
    onSearch(v)   { _searchTerm = v; renderAll(); },
    onFilterType(v){ _filterType = v; renderAll(); },
    onFilterDateType(v){ _filterDateType = v; renderAll(); },
    onFilterDate(start, end){ _filterDateStart = start; _filterDateEnd = end; renderAll(); },
    onFilterUrgent(checked){ _filterUrgent = checked; renderAll(); },
    sortTable(k)  { if (_sortKey===k) { _sortDir=_sortDir==='asc'?'desc':'asc'; } else { _sortKey=k; _sortDir='asc'; } _tablePage=1; renderAll(); },
    setPage(p)    { _tablePage=p; renderAll(); },
    setTableDate(pos,v){ if(pos==='start') _tableStartDate=v; else _tableEndDate=v; renderAll(); },
    openWizard()  { openWizard(); },
    closeWizard() { document.getElementById('sac-wizard-overlay').style.display='none'; },
    wizStep(delta){
      if (delta > 0) {
        if (_wiz.step===1 && (!_wiz.clientName.trim()||!_wiz.equipment.trim())) { showToast('Preencha o nome do cliente e o equipamento.','warning'); return; }
        if (_wiz.step===2 && (!_wiz.contactName.trim() || !_wiz.description.trim())) { showToast('Preencha os campos obrigatórios (*).','warning'); return; }
      }
      _wiz.step = Math.max(1, Math.min(3, _wiz.step+delta));
      renderWizard();
    },
    wizAddOcc() {
      const occ = _wiz.currentOcc;
      if (!occ) { showToast('Selecione uma ocorrência.','warning'); return; }
      if (_wiz.occList.some(o=>o.name===occ)) { showToast('Ocorrência já adicionada.','warning'); return; }
      _wiz.occList.push({ name:occ, note:_wiz.currentOccNote.trim()||'Sem observações.', images:[] });
      _wiz.currentOccNote = '';
      renderWizard();
    },
    wizRemoveOcc(i) { _wiz.occList.splice(i,1); renderWizard(); },
    async wizSubmit() {
      if (!_wiz.clientName.trim()||!_wiz.equipment.trim()) { showToast('Dados obrigatórios ausentes.','warning'); return; }
      if (!_wiz.contactName.trim() || !_wiz.description.trim()) { showToast('Preencha os campos obrigatórios (*).','warning'); return; }

      const btn = document.getElementById('wiz-submit-btn');
      if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Criando...'; }

      try {
        const fileInput = document.getElementById('wiz-anexos');
        let finalAttachments = [];
        if (fileInput && fileInput.files.length > 0) {
          const fd = new FormData();
          for (let f of fileInput.files) fd.append('anexos', f);
          const uploadRes = await fetch('/api/sac/upload-anexos', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('erp_token')||localStorage.getItem('token')}` },
            body: fd
          });
          if (!uploadRes.ok) throw new Error('Erro no upload de anexos');
          const uploadData = await uploadRes.json();
          finalAttachments = uploadData.urls || [];
        }

        const proto = _wiz.protocol.trim() || nextProtocol();
        const dupl = _tickets.find(t => t.protocol === proto);
        if (dupl && !confirm(`Já existe a OS ${proto} (${dupl.clientName}). Criar mesmo assim?`)) {
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ph ph-check-circle"></i> Criar Chamado'; }
            return;
        }

        const user = currentUsername();
        const now = new Date().toISOString();
        const newTicket = {
          id: 'sac-'+Date.now(),
          protocol: proto,
          osNumber: _wiz.osNumber.trim(),
          openDate: now,
          clientName: _wiz.clientName.trim(),
          cnpjCpf: _wiz.cnpjCpf.trim(),
          equipment: _wiz.equipment.trim(),
          address: _wiz.address.trim(),
          contactName: _wiz.contactName.trim(),
          contactPhone: _wiz.contactPhone.trim(),
          contactEmail: _wiz.contactEmail.trim(),
          channel: _wiz.channel,
          typeKey: _wiz.typeKey,
          isUrgent: _wiz.isUrgent,
          occurrences: _wiz.occList.length ? _wiz.occList : [{ name: _wiz.currentOcc||'Ocorrência geral', note: '', images:[] }],
          description: _wiz.description.trim(),
          stage: 'abertura',
          nextSteps: 'Triagem inicial pendente.',
          timeline: [{ stage:'abertura', time:now, notes:'Chamado aberto. Triagem inicial pendente.', user }],
          costCenters: [],
          attachments: finalAttachments,
          checklist: [...(CHECKLISTS_BY_TYPE.all||[]),...(CHECKLISTS_BY_TYPE[_wiz.typeKey]||[])].map(text=>({text,checked:false})),
          logisticsTask:null, commercialTask:null, financialTask:null
        };

        const res = await fetch('/api/sac/tickets', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('erp_token')||localStorage.getItem('token')}`
          },
          body: JSON.stringify(newTicket)
        });
        if (!res.ok) throw new Error('Erro ao salvar chamado no servidor');

        // Notificar Rafaela sobre novo chamado
        fetch('/api/sac/notificar-rafaela', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('erp_token')||localStorage.getItem('token')}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ protocol: proto, client: newTicket.clientName })
        }).catch(e => console.error(e));

        _tickets.unshift(newTicket);
        SAC.closeWizard();
        showToast(`Chamado ${proto} criado com sucesso!`,'success');
        renderAll();
      } catch (err) {
        console.error(err);
        showToast('Erro ao criar chamado. Tente novamente.', 'error');
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ph ph-check-circle"></i> Criar Chamado'; }
      }
    },
    openDetail(id) { openDetail(id); },
    closeModal(e) {
      if (e && e.target !== document.getElementById('sac-modal-overlay') && e.target !== document.getElementById('sac-modal-container')) return;
      document.getElementById('sac-modal-overlay').style.display='none';
      document.getElementById('sac-modal-container').style.display='none';
      _selectedTicket = null;
    },
    setModalTab(tab) {
      _modalTab = tab;
      renderDetailModal();
    },
    changeStageFromModal(targetId) {
      const t = _selectedTicket;
      if (!t || t.stage === targetId) return;
      const gate = checkGate(t, targetId);
      if (gate) { alert(`Bloqueio: Pendência ${gate.sector} não concluída.\n${gate.task}`); renderDetailModal(); return; }
      openTransitionModal(t.id, targetId);
    },
    changeTaskAssignment(key, newUsername) {
      const t = _selectedTicket;
      if (!t || !t[key]) return;
      const usersList = window._sacUsersList || [];
      const user = usersList.find(u => (u.username||u.login||u.email) === newUsername);
      const previousAssignee = t[key].assignedTo;
      t[key] = {
        ...t[key],
        assignedTo: newUsername || null,
        assignedToName: user ? (user.nome||user.name||user.username) : newUsername,
        assignedToPhoto: user ? (user.foto||user.photo||'') : ''
      };
      updateTicket(t);
      showToast(`Atribuição de ${key.replace('Task','')} atualizada.`, 'success');
      // Notifica o usuário atribuído por e-mail + popup se houve mudança de atribuicão
      if (newUsername && newUsername !== previousAssignee) {
        const token = localStorage.getItem('erp_token')||localStorage.getItem('token');
        fetch('/api/sac/notificar-atribuicao', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ticketId: t.id,
            protocol: t.protocol,
            clientName: t.clientName,
            setor: key.replace('Task',''),
            assignedUsername: newUsername,
            assignedUserNome: user ? (user.nome||user.name||user.username) : newUsername
          })
        }).catch(e => console.error('[SAC] Erro ao notificar atribuicao:', e));
      }
    },
    deleteTicket(id) {
      if (!confirm('Excluir esta OS permanentemente?')) return;
      const token = localStorage.getItem('erp_token')||localStorage.getItem('token');
      fetch(`/api/sac/tickets/${id}`, { method:'DELETE', headers:{'Authorization':`Bearer ${token}`} })
        .then(r => r.ok ? r.json() : Promise.reject(r))
        .then(() => {
          _tickets = _tickets.filter(t => t.id !== id);
          SAC.closeModal({ target: document.getElementById('sac-modal-overlay') });
          showToast('OS excluída com sucesso.','warning');
          renderAll();
        })
        .catch(() => {
          // Fallback: remove local mesmo que API falhe
          _tickets = _tickets.filter(t => t.id !== id);
          SAC.closeModal({ target: document.getElementById('sac-modal-overlay') });
          showToast('OS excluída (modo local).','warning');
          renderAll();
        });
    },
    removeOccurrence(idx) {
      const t = _selectedTicket;
      if (!t || t.occurrences.length<=1) { showToast('Mínimo de 1 ocorrência.','warning'); return; }
      t.occurrences.splice(idx,1);
      updateTicket(t);
    },
    addOccurrenceFromModal() {
      const t = _selectedTicket;
      if (!t) return;
      const sel = document.getElementById('modal-occ-select');
      const note = document.getElementById('modal-occ-note');
      if (!sel||!sel.value) { showToast('Selecione uma ocorrência.','warning'); return; }
      if (t.occurrences.some(o=>o.name===sel.value)) { showToast('Ocorrência já cadastrada.','warning'); return; }
      t.occurrences.push({ name:sel.value, note:(note&&note.value)||'', images:[] });
      if (note) note.value='';
      updateTicket(t);
    },
    addComment(ticketId) {
      const t = _tickets.find(x => x.id === ticketId);
      if (!t) return;
      const textInput = document.getElementById('new-comment-text');
      const text = textInput ? textInput.value.trim() : '';
      if (!text) return;
      const user = currentUsername();
      if (!t.comments) t.comments = [];
      t.comments.push({ user, text, time: new Date().toISOString() });
      updateTicket(t);
      if (textInput) textInput.value = '';
    },
    completeTask(key) {
      const t = _selectedTicket;
      if (!t) return;
      const inp = document.getElementById('tf-'+key);
      const feedback = inp ? inp.value.trim() : '';
      if (!feedback) { showToast('Escreva o feedback antes de confirmar.','warning'); return; }
      const isRedirect = t.stage === 'aguardando_setores';
      const user = currentUsername();
      t[key] = { ...t[key], isCompleted:true, feedback, history: [...(t[key].history||[]), { type:'resolution', time:new Date().toISOString(), feedback, user }] };
      const taskName = key === 'logisticsTask' ? 'Logística' : key === 'commercialTask' ? 'Comercial' : 'Financeiro';
      if (isRedirect) { t.stage = 'respondido'; t.timeline.push({ stage:'respondido', time:new Date().toISOString(), notes:`Pendência ${taskName} resolvida: "${feedback}". OS movida para Respondido.`, user }); }
      else { t.timeline.push({ stage:t.stage, time:new Date().toISOString(), notes:`Pendência ${taskName} resolvida: "${feedback}"`, user }); }
      updateTicket(t);
      if (isRedirect) { showToast(`OS ${t.protocol} respondida! Movida para Respondido.`,'warning'); }
      else { showToast('Pendência marcada como resolvida!','success'); }
    },
    reopenTask(key) {
      const t = _selectedTicket;
      if (!t||!t[key]) return;
      const reason = prompt('Motivo da reabertura:');
      if (!reason||!reason.trim()) return;
      const user = currentUsername();
      t[key] = { ...t[key], isCompleted:false, feedback:'', history:[...(t[key].history||[]),{type:'reopen',time:new Date().toISOString(),feedback:reason,user}] };
      t.timeline.push({ stage:t.stage, time:new Date().toISOString(), notes:`Pendência ${key.replace('Task','')} reaberta: "${reason}"`, user });
      updateTicket(t);
      showToast('Pendência reaberta. Avanço bloqueado.','warning');
    },
    saveCostCenter() {
      const t = _selectedTicket;
      if (!t) return;
      const sector  = document.getElementById('cc-sector')?.value||'Cliente';
      const valor   = parseFloat(document.getElementById('cc-valor')?.value||0);
      const motivo  = document.getElementById('cc-motivo')?.value?.trim()||'';
      const billing = document.getElementById('cc-billing')?.checked||false;
      if (valor<=0) { showToast('Informe um valor maior que zero.','warning'); return; }
      if (!motivo)  { showToast('Informe o motivo do custo.','warning'); return; }
      const cc = { id:'cc-'+Date.now(), sector, lossValue:valor, reason:motivo, hasBilling:billing };
      t.costCenters = [...(t.costCenters||[]), cc];
      t.timeline.push({ stage:t.stage, time:new Date().toISOString(), notes:`Centro de custo adicionado: ${sector} — ${formatBRL(valor)}`, user:currentUsername() });
      updateTicket(t);
      showToast('Lançamento adicionado!','success');
    },
    removeCostCenter(ccId) {
      const t = _selectedTicket;
      if (!t) return;
      t.costCenters = (t.costCenters||[]).filter(c=>c.id!==ccId);
      updateTicket(t);
      showToast('Lançamento removido.','warning');
    },
    async addAttachments(files) {
      const t = _selectedTicket;
      if (!t||!files.length) return;
      showToast('Enviando anexos...', 'info');
      try {
        const fd = new FormData();
        for (let f of files) fd.append('anexos', f);
        const res = await fetch('/api/sac/upload-anexos', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('erp_token')||localStorage.getItem('token')}` },
          body: fd
        });
        if (!res.ok) throw new Error('Erro no upload');
        const data = await res.json();
        t.attachments = [...(t.attachments||[]), ...(data.urls||[]).map(a => ({
          ...a,
          size: 'KB',
          date: new Date().toLocaleDateString('pt-BR')
        }))];
        updateTicket(t);
        showToast(`${files.length} arquivo(s) adicionado(s) com sucesso.`,'success');
      } catch (e) {
        console.error(e);
        showToast('Erro ao enviar os arquivos', 'error');
      }
    },
    removeAttachment(r2Key) {
      const t = _selectedTicket;
      if (!t) return;
      if (!confirm('Deseja realmente remover este anexo?')) return;
      t.attachments = (t.attachments||[]).filter(a=>(a.r2Key||a.name||a.filename)!==r2Key);
      updateTicket(t);
    },
    toggleChecklist(idx) {
      const t = _selectedTicket;
      if (!t) return;
      const cl = getChecklist(t);
      cl[idx] = { ...cl[idx], checked:!cl[idx].checked };
      t.checklist = cl;
      updateTicket(t);
    },

    // ── filterTransUsers: busca colaboradores por departamento na tabela colaboradores (HR)
    // Inclui gestora, afastados e outros sem conta de sistema via endpoint dedicado.
    filterTransUsers(sector, preselectedUser = null) {
      const pt = _pendingTransition;
      if (!pt) return;
      const sel = document.getElementById('trans-assigned-user');
      const photo = document.getElementById('trans-assigned-photo');
      if (!sel) return;
      sel.innerHTML = '<option value="">Buscando colaboradores...</option>';
      const token = localStorage.getItem('erp_token') || localStorage.getItem('token');
      fetch(`/api/sac/colaboradores-por-setor?setor=${encodeURIComponent(sector)}&_t=${Date.now()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(lista => {
        const normalizeId = str => (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '.');
        if (!lista || lista.length === 0) {
          sel.innerHTML = '<option value="">Nenhum colaborador encontrado para este setor</option>';
          if (photo) { photo.src = ''; photo.style.display = 'none'; }
          return;
        }
        sel.innerHTML = '<option value="">Selecione um usuário...</option>' +
          lista.map(u => {
            const val = u.username || normalizeId(u.nome);
            const badge = u.status && u.status.toLowerCase().includes('afastado') ? ' (Afastado)' :
                          u.status && u.status.toLowerCase().includes('ferias') ? ' (Férias)' : '';
            return `<option value="${val}" data-photo="${u.foto_colaborador||''}" data-id="${u.id || ''}" ${preselectedUser === val ? 'selected' : ''}>${u.nome}${badge}</option>`;
          }).join('');
        
        if (sel.selectedIndex > 0 && photo) {
            photo.src = sel.options[sel.selectedIndex].dataset.photo || '';
            photo.style.display = photo.src ? 'block' : 'none';
        } else if (photo) {
            photo.src = ''; photo.style.display = 'none'; 
        }
      })
      .catch(err => {
        // Fallback local: usa lista de usuários carregada na inicialização, filtragem bidirecional
        console.warn('[SAC] Erro ao buscar colaboradores por setor, usando fallback:', err);
        const normalizeStr = str => (str||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
        const deptKey = normalizeStr(sector);
        const allUsers = window._sacUsersList || pt.usersList || [];
        // Filtragem bidirecional: departamento do usuário contém o setor OU setor contém o departamento
        const filtered = allUsers.filter(u => {
          if (!u.ativo) return false;
          const uDept = normalizeStr(u.departamento || '');
          return uDept.includes(deptKey) || deptKey.includes(uDept);
        });
        if (filtered.length === 0) {
          // Não retornar todos os usuários — exibir aviso em vez disso
          sel.innerHTML = `<option value="">Nenhum colaborador encontrado para "${sector}"</option>`;
          if (photo) { photo.src = ''; photo.style.display = 'none'; }
        } else {
          sel.innerHTML = '<option value="">Selecione um usuário...</option>' +
            filtered.map(u => `<option value="${u.username}" data-photo="${u.foto_colaborador||''}" data-id="${u.id}" ${preselectedUser === u.username ? 'selected' : ''}>${u.nome}</option>`).join('');
            
          if (sel.selectedIndex > 0 && photo) {
              photo.src = sel.options[sel.selectedIndex].dataset.photo || '';
              photo.style.display = photo.src ? 'block' : 'none';
          } else if (photo) {
              photo.src = ''; photo.style.display = 'none'; 
          }
        }
      });
    },
    openAttachmentViewer(idx) {
      const t = _selectedTicket;
      if (!t || !t.attachments) return;
      const imgs = t.attachments.filter(a => /\.(jpeg|jpg|gif|png|webp|bmp)$/i.test(a.originalName||a.name||a.filename||a.url||''));
      if (!imgs[idx]) return;
      // Remove viewer anterior se existir
      const old = document.getElementById('sac-img-viewer');
      if (old) old.remove();
      const overlay = document.createElement('div');
      overlay.id = 'sac-img-viewer';
      overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.92);display:flex;align-items:center;justify-content:center;cursor:zoom-out;';
      overlay.onclick = () => overlay.remove();
      let _idx = idx;
      const renderImg = () => {
        overlay.innerHTML = `
          <button onclick="event.stopPropagation();document.getElementById('sac-img-viewer').remove()" style="position:absolute;top:16px;right:20px;background:rgba(255,255,255,0.15);border:none;color:#fff;font-size:1.5rem;cursor:pointer;border-radius:8px;padding:2px 10px;z-index:1;">✕</button>
          ${imgs.length>1?`<button onclick="event.stopPropagation();SAC._viewerNav(-1)" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);background:rgba(255,255,255,0.15);border:none;color:#fff;font-size:2rem;cursor:pointer;border-radius:8px;padding:4px 14px;z-index:1;">❮</button>`:''}
          <img src="${imgs[_idx].url}" style="max-width:90vw;max-height:88vh;object-fit:contain;border-radius:8px;box-shadow:0 8px 48px rgba(0,0,0,0.6);" onclick="event.stopPropagation()">
          ${imgs.length>1?`<button onclick="event.stopPropagation();SAC._viewerNav(1)" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:rgba(255,255,255,0.15);border:none;color:#fff;font-size:2rem;cursor:pointer;border-radius:8px;padding:4px 14px;z-index:1;">❯</button>`:''}
          <div style="position:absolute;bottom:16px;color:#94a3b8;font-size:0.78rem;">${_idx+1} / ${imgs.length}</div>`;
      };
      SAC._viewerNav = (dir) => { _idx = (_idx+dir+imgs.length)%imgs.length; renderImg(); };
      renderImg();
      document.body.appendChild(overlay);
    },
    cancelTransition() {
      document.getElementById('sac-trans-overlay').style.display='none';
      _pendingTransition = null;
      renderAll();
    },
    confirmTransition() {
      const pt = _pendingTransition;
      if (!pt) return;
      const ticket = _tickets.find(t=>t.id===pt.ticketId);
      if (!ticket) return;
      const isClosing  = pt.targetStageId === 'encerrado';
      const isAguard   = pt.targetStageId === 'aguardando_setores';
      const cl = getChecklist(ticket);
      const hasUnchecked = cl.some(i=>!i.checked);
      const user = currentUsername();

      let nextSteps  = (document.getElementById('trans-next')?.value||'').trim();
      let obs        = (document.getElementById('trans-obs')?.value||'').trim();
      let sector     = document.getElementById('trans-sector')?.value || 'Logística';
      let closeReason= document.getElementById('trans-closing-reason')?.value || 'Concluído';
      let clJust     = (document.getElementById('trans-cl-just')?.value||'').trim();

      if (isClosing) {
        if (!obs) { showToast('O resumo de encerramento é obrigatório.','warning'); return; }
        if (hasUnchecked && !clJust) { showToast('Justificativa do checklist incompleto é obrigatória.','warning'); return; }
        if (hasUnchecked && clJust.length<10) { showToast('Justificativa muito curta (mín. 10 caracteres).','warning'); return; }
      } else {
        if (!nextSteps) { showToast('Os próximos passos são obrigatórios.','warning'); return; }
      }

      let logNotes = isClosing
        ? `Encerramento: ${closeReason}. Resumo: "${obs}"` + (hasUnchecked?` | Justificativa checklist: "${clJust}"`:'' )
        : `${pt.srcName} → ${pt.tgtName}. Próximos passos: "${nextSteps}"` + (obs?` | Obs: "${obs}"`:' ');

      ticket.stage = pt.targetStageId;
      ticket.nextSteps = isClosing ? `Encerrado: ${closeReason}` : nextSteps;
      if (isClosing) { ticket.closeDate = new Date().toISOString(); ticket.checklistJustification = clJust||null; }
      ticket.timeline.push({ stage:pt.targetStageId, time:new Date().toISOString(), notes:logNotes, user });

      if (isAguard) {
        const userSelect = document.getElementById('trans-assigned-user');
        const assignedUsername = userSelect?.value || '';
        const assignedUserNome = userSelect?.options[userSelect.selectedIndex]?.text || '';
        const assignedUserPhoto = userSelect?.options[userSelect.selectedIndex]?.dataset.photo || '';
        
        if (!assignedUsername) { showToast('Selecione o usu├írio atribu├¡do.', 'warning'); return; }

        ticket.logisticsTask  = sector==='Logística'  ? { name:`Pendente: Logística — aguardando resposta.`, isCompleted:false, feedback:'', history:[], assignedTo: assignedUsername, assignedToName: assignedUserNome, assignedToPhoto: assignedUserPhoto } : null;
        ticket.commercialTask = sector==='Comercial'  ? { name:`Pendente: Comercial — aguardando resposta.`, isCompleted:false, feedback:'', history:[], assignedTo: assignedUsername, assignedToName: assignedUserNome, assignedToPhoto: assignedUserPhoto } : null;
        ticket.financialTask  = sector==='Financeiro' ? { name:`Pendente: Financeiro — aguardando resposta.`, isCompleted:false, feedback:'', history:[], assignedTo: assignedUsername, assignedToName: assignedUserNome, assignedToPhoto: assignedUserPhoto } : null;
      }

      updateTicket(ticket);
      _pendingTransition = null;
      document.getElementById('sac-trans-overlay').style.display='none';
      showToast(`OS ${ticket.protocol} movida para "${pt.tgtName}"!`,'success');
      renderAll();
    },
    exportCSV() {
      const all = getFilteredTickets();
      const headers = ['Protocolo','OS Relacionada','Data Abertura','Cliente','CNPJ/CPF','Equipamento','Tipo','Etapa','SLA','Ocorr├¬ncias'];
      const rows = all.map(t => {
        const sla = getSLADetails(t);
        return [
          t.protocol, t.osNumber||'', new Date(t.openDate).toLocaleString('pt-BR'), t.clientName, t.cnpjCpf||'',
          t.equipment, TICKET_TYPES[t.typeKey]?.name||t.typeKey,
          PIPELINE_STAGES.find(s=>s.id===t.stage)?.name||t.stage,
          sla.isOverdue?'Atrasado':'No Prazo',
          (t.occurrences||[]).map(o=>o.name).join('; ')
        ];
      });
      const csv = [headers,...rows].map(r=>r.map(v=>`"${String(v||'').replace(/"/g,'""')}"`).join(';')).join('\n');
      const blob = new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href=url; a.download=`sac_ocorrencias_${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      showToast('CSV exportado com sucesso!','success');
    },
    // drag handlers p├║blicos
    onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop
  };

  function updateTicket(t) {
    _tickets = _tickets.map(x => x.id===t.id ? t : x);
    fetch('/api/sac/tickets/'+t.id, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('erp_token')||localStorage.getItem('token')}`
      },
      body: JSON.stringify(t)
    }).catch(e=>console.error('[SAC] Erro salvando OS', e));

    if (_selectedTicket && _selectedTicket.id===t.id) {
      _selectedTicket = t;
      renderDetailModal();
    }
    renderAll();
  }

  function bindGlobalEvents() {
    // Fechar modal overlay clicando fora
    const ov = document.getElementById('sac-modal-overlay');
    if (ov) ov.onclick = (e) => { if (e.target===ov) SAC.closeModal(e); };
  }

})();
