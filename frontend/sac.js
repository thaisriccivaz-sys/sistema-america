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
    visita_tecnica:      { name: 'VISITA TÉCNICA',         sla: 48, icon: '🔧' },
    tipo_teste:          { name: 'TIPO TESTE',             sla: (2/60), icon: '🧪' }
  };

  const POPUP_CLOSERS = ['Thais.Ricci', 'renata.comercial'];
  let _sacSlaNotificadosIds = [];

  let OCCURRENCES_BY_TYPE = {
    manutencao:          ['Manutenção não realizada', 'Reclamação de limpeza', 'Manutenção suspensa por falta de pagamento'],
    avaria_funcional:    ['Caixa de Dejetos', 'Teto', 'Porta', 'Bomba da Descarga', 'Bomba do Lavatório', 'Caixa de Descarga', 'Chuveiro', 'Mictório Interno', 'Puxador', 'Vaso Sanitário', 'Vidro da Guarita'],
    avaria_nao_funcional:['Assento Sanitário', 'Chapa Piso Preta', 'Pintura Danificada', 'Suporte Papel Toalha', 'Limitador de Porta', 'Equipamento Antigo'],
    entrega:             ['Endereço incorreto', 'Equipe não localizou o ponto', 'Cliente ausente', 'Produto entregue errado', 'Atraso na entrega'],
    retirada:            ['Fim de contrato indesejada', 'Retirada Infrutífera', 'Desmontagem'],
    contrato:            ['Alteração Cadastral', 'Ruptura de contrato', 'Prorrogação de locação'],
    furto:               ['Furto no Cliente', 'Furto em Trânsito', 'Extravio / Perda'],
    visita_tecnica:      ['Avaliação técnica de equipamento', 'Solicitação do cliente', 'Vistoria de campo', 'Reclamação de funcionamento', 'Verificação pré-contrato'],
    tipo_teste:          ['Teste 1', 'Teste 2']
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
  window._stripEmojis = function(str) {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/^[^a-zA-Z0-9À-ɏ]+/, '').replace(/[🌀-🧿☀-⛿✀-➿😀-🙏🚀-🛿🇠-🇿]/gu, '').trim();
  };
  let _view = 'pipeline'; // 'pipeline' | 'tabela' | 'config'
  let _searchTerm = '';
  let _filterType = 'all';
  let _filterDateType = 'abertura';
  let _filterDateStart = '';
  let _filterDateEnd = '';
  let _filterUrgent = false;
  let _filterAssigned = '';
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
    contacts: [{ id: Date.now(), type: 'Contato de Instalação', name: '', phone: '', email: '' }],
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
      const [ticketsRes, deptsRes, usersRes, occsRes] = await Promise.all([
        fetch('/api/sac/tickets', { headers }),
        fetch('/api/departamentos', { headers }).catch(() => null),
        fetch('/api/usuarios', { headers }).catch(() => null),
        fetch('/api/sac/ocorrencias', { headers }).catch(() => null)
      ]);
      if (ticketsRes.ok) _tickets = await ticketsRes.json();
      if (deptsRes && deptsRes.ok) _globalDepartamentos = await deptsRes.json();
      if (usersRes && usersRes.ok) window._sacUsersList = await usersRes.json();
      if (occsRes && occsRes.ok) {
        const occs = await occsRes.json();
        window._sacOccurrencesRaw = occs;
        const updatedOccurrences = {};
        occs.forEach(o => {
            if (!updatedOccurrences[o.type_key]) updatedOccurrences[o.type_key] = [];
            updatedOccurrences[o.type_key].push(o.description);
        });
        if (Object.keys(updatedOccurrences).length > 0) {
            OCCURRENCES_BY_TYPE = { ...OCCURRENCES_BY_TYPE, ...updatedOccurrences };
        }
      }
    } catch(e) { console.error('[SAC] Erro ao carregar chamados/ocorrencias', e); }
    if (!_tickets) _tickets = [];
  }

  // ── BUSINESS HOURS HELPERS (Seg-Sex 08:00-17:00) ─────────────
  // addBusinessHours: avança N ms de horas úteis a partir de start
  function addBusinessHours(start, hoursMs) {
    const WS = 8, WE = 17;
    let cur = new Date(start), rem = hoursMs, g = 0;
    while (rem > 0 && ++g < 500) {
      const dow = cur.getDay(), h = cur.getHours();
      if (dow === 0 || dow === 6) {
        const n = new Date(cur); n.setDate(n.getDate() + (dow===6?2:1)); n.setHours(WS,0,0,0); cur=n; continue;
      }
      if (h < WS) { cur = new Date(cur); cur.setHours(WS,0,0,0); continue; }
      if (h >= WE) { const n = new Date(cur); n.setDate(n.getDate()+1); n.setHours(WS,0,0,0); cur=n; continue; }
      const eod = new Date(cur); eod.setHours(WE,0,0,0);
      const toEnd = eod.getTime() - cur.getTime();
      if (rem <= toEnd) { cur = new Date(cur.getTime()+rem); rem=0; }
      else { rem-=toEnd; const n=new Date(cur); n.setDate(n.getDate()+1); n.setHours(WS,0,0,0); cur=n; }
    }
    return cur;
  }
  function businessMsBetween(from, to) {
    const WS=8, WE=17;
    if (from>=to) return 0;
    let total=0, cur=new Date(from), g=0;
    while (cur<to && ++g<2000) {
      const dow=cur.getDay(), h=cur.getHours();
      if (dow===0||dow===6){const n=new Date(cur);n.setDate(n.getDate()+(dow===6?2:1));n.setHours(WS,0,0,0);cur=n;continue;}
      if (h<WS){cur=new Date(cur);cur.setHours(WS,0,0,0);continue;}
      if (h>=WE){const n=new Date(cur);n.setDate(n.getDate()+1);n.setHours(WS,0,0,0);cur=n;continue;}
      const eod=new Date(cur);eod.setHours(WE,0,0,0);
      const pe=new Date(Math.min(eod.getTime(),to.getTime()));
      total+=pe.getTime()-cur.getTime();cur=eod;
    }
    return total;
  }
  function businessMsUntilDeadline(deadlineIso) {
    const dl=new Date(deadlineIso), now=new Date();
    if (now>=dl) return -businessMsBetween(dl,now);
    return businessMsBetween(now,dl);
  }

  // Retorna tempo percorrido ignorando apenas os fins de semana (Sexta 17h ate Seg 08h)
  function getSlaElapsedMs(startMs, endMs) {
    if (startMs >= endMs) return 0;
    const from = new Date(startMs);
    const to = new Date(endMs);
    let elapsed = 0;
    let cur = new Date(from);
    let guard = 0;
    while (cur < to && ++guard < 5000) {
      const dow = cur.getDay();
      const h = cur.getHours();
      const isWeekendPause = (dow === 5 && h >= 17) || dow === 6 || dow === 0 || (dow === 1 && h < 8);
      
      if (isWeekendPause) {
        const next = new Date(cur);
        if (dow === 5) next.setDate(next.getDate() + 3);
        else if (dow === 6) next.setDate(next.getDate() + 2);
        else if (dow === 0) next.setDate(next.getDate() + 1);
        next.setHours(8, 0, 0, 0);
        
        if (to < next) cur = to;
        else cur = next;
      } else {
        const next = new Date(cur);
        const daysToFriday = 5 - dow;
        next.setDate(next.getDate() + daysToFriday);
        next.setHours(17, 0, 0, 0);
        
        if (to < next) {
          elapsed += (to.getTime() - cur.getTime());
          cur = to;
        } else {
          elapsed += (next.getTime() - cur.getTime());
          cur = next;
        }
      }
    }
    return Math.round(elapsed);
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
    let isFrozen = !!ticket.slaFrozenAt;
    let fallbackElapsed = null;

    // Fallback para chamados que já estão em Acompanhamento mas não salvaram slaFrozenAt
    if (!isFrozen && ticket.stage === 'execucao' && ticket.timeline) {
        const log = [...ticket.timeline].reverse().find(l => l.stage === 'execucao');
        if (log) {
            isFrozen = true;
            fallbackElapsed = new Date(_normDate(log.time)).getTime() - opened;
        }
    }

    if (isClosed) {
      const log = ticket.timeline && ticket.timeline.find(l => l.stage === 'concluido' || l.stage === 'encerrado');
      if (log) {
        const t = new Date(_normDate(log.time)).getTime();
        if (!isNaN(t)) endCalc = t;
      }
    }

    // SLA congelado no Acompanhamento (pausa no fds)
    let elapsedMs = getSlaElapsedMs(opened, endCalc);
    if (isFrozen) {
        if (ticket.slaElapsedMs) elapsedMs = ticket.slaElapsedMs;
        else if (fallbackElapsed) elapsedMs = getSlaElapsedMs(opened, opened + fallbackElapsed);
    }
    
    const remainMs = limitMs - elapsedMs;

    const fmtHM = (ms) => {
        const totalMin = Math.floor(Math.abs(ms) / 60000);
        const h = Math.floor(totalMin / 60);
        const m = totalMin % 60;
        return `${h}h${m.toString().padStart(2, '0')}m`;
    };

    const remainH = Math.round((remainMs / 3600000) * 10) / 10;
    // pct = % remaining (100 = fresh, 0 = just expired)
    let pct = Math.round((remainMs / limitMs) * 100);
    pct = Math.max(0, Math.min(100, pct));
    // consumedPct = % elapsed (0=fresh, 100+=overdue)
    const consumedPct = Math.min(100, Math.max(0, 100 - pct));
    const isOverdue = remainMs <= 0;

    // — Para chamados CONCLUÍDOS: exibe tempo total desde abertura —
    if (isConcluido) {
      const withinSLA = elapsedMs <= limitMs;
      const concludedLabel = `✓ ${fmtHM(elapsedMs)} (${withinSLA ? 'no prazo' : 'em atraso'})`;
      const concludedColor = withinSLA ? '#15803d' : '#dc2626';
      const concludedBarPct = Math.min(100, Math.round((elapsedMs / limitMs) * 100));
      return {
        remaining: remainH,
        pct: withinSLA ? (100 - concludedBarPct) : 0,
        consumedPct: concludedBarPct,
        isOverdue: !withinSLA,
        isConcluido: true,
        label: concludedLabel,
        barColor: withinSLA ? '#15803d' : '#dc2626',
        labelColor: concludedColor,
        status: withinSLA ? 'ok' : 'danger',
        closedDateMs: endCalc,
        deadlineMs: opened + limitMs
      };
    }

        const nowD = new Date();
    const dow = nowD.getDay();
    const nowH = nowD.getHours();
    const isWeekendPause = (dow === 5 && nowH >= 17) || dow === 6 || dow === 0 || (dow === 1 && nowH < 8);

    // Label: positive hours remaining or negative hours overdue
    let label;
    const sign = isOverdue ? '-' : '';
    if (isFrozen) {
      label = `🔒 ${sign}${fmtHM(remainMs)}`;
    } else if (isWeekendPause) {
      label = `❄️ ${sign}${fmtHM(remainMs)}`;
    } else if (isOverdue) {
      label = `-${fmtHM(remainMs)}`;
    } else {
      label = `${fmtHM(remainMs)} restantes`;
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
      closedDateMs: isClosed ? endCalc : null,
      deadlineMs: opened + limitMs
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

    const tk = localStorage.getItem('erp_token') || localStorage.getItem('token');
    if (tk) {
      try {
        const resConf = await fetch('/api/config-notificacoes', { headers: { 'Authorization': 'Bearer ' + tk } });
        if (resConf.ok) {
          const configRows = await resConf.json();
          _sacSlaNotificadosIds = configRows.filter(r => r.tipo === 'sac_sla_vencido').map(r => String(r.usuario_id));
        }
      } catch(e) {}
    }

    _wiz.protocol = nextProtocol();
    renderAll();
    
    // Auto-refresh a cada 5 minutos — protegido contra sobrescrever saves recentes
    let _lastSaveTime = 0;
    window._sacLastSaveTime = () => _lastSaveTime;
    const _origUpdate = updateTicket;
    // Decorar updateTicket para registrar timestamp do último save
    // (já feito inline abaixo via _lastSaveTime)
    if (!window._sacAutoRefresh) {
      window._sacAutoRefresh = setInterval(async () => {
        const root = document.getElementById('view-sac');
        if (root && root.style.display !== 'none' && document.body.contains(root)) {
            // Não recarregar se houve um save nos últimos 30 segundos (anti race-condition)
            const secsSinceLastSave = (Date.now() - (window._sacLastSaveMs || 0)) / 1000;
            if (secsSinceLastSave < 30) return;
            const ov = document.getElementById('sac-modal-overlay');
            if (!ov || ov.style.display === 'none') {
                await loadTickets();
                renderAll();
            }
        }
      }, 30 * 1000);
    }
    // Loop de alertas: SLA vencido + follow-up vencido a cada 1 min
    if (!window._sacAlertLoop) {
      window._sacAlertLoop = setInterval(() => {
        const root = document.getElementById('view-sac');
        if (root && document.body.contains(root)) {
          checkFollowUpAlerts();
          checkSLAOverdue();
        }
      }, 60 * 1000);
    }
    // Verificar imediatamente ao carregar (reoabrir popups pendentes após reload)
    setTimeout(() => {
      checkFollowUpAlerts();
      checkSLAOverdue();
      // Reabrir popups pendentes do localStorage
      _tickets.forEach(ticket => {
        const pendingType = localStorage.getItem('sac_pending_popup_' + ticket.id);
        if (pendingType) {
          showMandatoryJustificationPopup(ticket, pendingType);
        }
      });
    }, 2000);
  };

  // ── SHELL PRINCIPAL ──────────────────────────────────────────
  function buildSACShell() {
    return `
    <div id="sac-root" style="display:flex;flex-direction:column;height:100%;font-family:'Inter',system-ui,sans-serif;background:#f8fafc;">
      <!-- ERRO DE SALVAMENTO -->
      <div id="sac-save-error-toast" style="display:none;position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:999999;background:#dc2626;color:#fff;font-weight:700;font-size:0.9rem;padding:14px 24px;border-radius:10px;box-shadow:0 8px 32px rgba(220,38,38,0.45);max-width:90vw;text-align:center;"></div>

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
        <button onclick="SAC.refreshData()" style="background:#f1f5f9;color:#475569;border:1px solid #e2e8f0;border-radius:8px;padding:8px 12px;font-weight:600;font-size:0.85rem;cursor:pointer;display:flex;align-items:center;gap:6px;transition:all 0.2s;margin-right:8px;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'" title="Atualizar chamados">
          <i class="ph ph-arrows-clockwise"></i>
        </button>
        <button id="sac-btn-novo-chamado" onclick="SAC.openWizard()" style="background:#ef4444;color:#fff;border:none;border-radius:8px;padding:8px 16px;font-weight:700;font-size:0.85rem;cursor:pointer;display:flex;align-items:center;gap:6px;white-space:nowrap;transition:background 0.2s;" onmouseover="this.style.background='#dc2626'" onmouseout="this.style.background='#ef4444'">
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

        <div style="position:relative;display:flex;align-items:center;">
          <i class="ph ph-user-circle" style="position:absolute;left:8px;color:#64748b;font-size:0.9rem;pointer-events:none;"></i>
          <input id="sac-filter-assigned" type="text" placeholder="Filtrar por atribuição..." style="padding:7px 8px 7px 28px;border:1px solid #e2e8f0;border-radius:8px;font-size:0.85rem;outline:none;min-width:180px;" oninput="SAC.onFilterAssigned(this.value)">
          <button id="sac-filter-assigned-clear" onclick="document.getElementById('sac-filter-assigned').value='';SAC.onFilterAssigned('')" style="position:absolute;right:4px;background:none;border:none;cursor:pointer;color:#94a3b8;font-size:0.9rem;display:none;" title="Limpar">&#x2715;</button>
        </div>
        
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
      ${PIPELINE_STAGES.filter(s => s.id !== 'encerrado').map(stage => {
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

    const cleanClientName = window._stripEmojis(ticket.clientName);
    const clientShort = cleanClientName.length > 25
      ? cleanClientName.substring(0, 25) + '…'
      : cleanClientName;

    const cl = getChecklist(ticket);
    const clChecked = cl.filter(i => i.checked).length;
    const showCL = showChecklistInStage(ticket.stage) && ticket.stage !== 'execucao';

    const hasPendingLog = ticket.logisticsTask && !ticket.logisticsTask.isCompleted;
    const hasPendingCom = ticket.commercialTask && !ticket.commercialTask.isCompleted;
    const hasPendingFin = ticket.financialTask  && !ticket.financialTask.isCompleted;
    const anyPending = hasPendingLog || hasPendingCom || hasPendingFin;

    let assignedUser = null;
    let assignedUserPhoto = null;
    if (ticket.logisticsTask && ticket.logisticsTask.assignedTo && (!ticket.logisticsTask.isCompleted || ticket.stage === 'respondido')) {
        assignedUser = ticket.logisticsTask.assignedToName;
        assignedUserPhoto = ticket.logisticsTask.assignedToPhoto;
    } else if (ticket.commercialTask && ticket.commercialTask.assignedTo && (!ticket.commercialTask.isCompleted || ticket.stage === 'respondido')) {
        assignedUser = ticket.commercialTask.assignedToName;
        assignedUserPhoto = ticket.commercialTask.assignedToPhoto;
    } else if (ticket.financialTask && ticket.financialTask.assignedTo && (!ticket.financialTask.isCompleted || ticket.stage === 'respondido')) {
        assignedUser = ticket.financialTask.assignedToName;
        assignedUserPhoto = ticket.financialTask.assignedToPhoto;
    }
    
    const assignedUserShort = assignedUser && assignedUser.length > 20 
      ? assignedUser.substring(0, 20) + '…' 
      : assignedUser;

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
          <span style="font-size:0.7rem;font-weight:700;color:#64748b;font-family:monospace;">Nº ${ticket.protocol}${ticket.osNumber ? ' · OS ' + ticket.osNumber : ''}</span>
          ${ticket.isUrgent ? '<span style="background:#fee2e2;color:#dc2626;border-radius:4px;padding:2px 4px;font-size:0.8rem;display:flex;align-items:center;justify-content:center;" title="Urgente"><i class="ph-fill ph-warning-circle"></i></span>' : ''}
          ${(ticket.tags || []).includes('Reagendamento') ? `<span style="background:#ffedd5;color:#ea580c;border-radius:4px;padding:2px 6px;font-size:0.65rem;font-weight:700;">Reagendamento</span>` : ''}
        </div>
        <div style="font-weight:700;font-size:0.8rem;color:#1e293b;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${cleanClientName}">${clientShort}</div>
      </div>
      <div style="font-size:0.78rem;color:#64748b;margin-bottom:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${ticket.equipment}">
        ${ticket.equipment}
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:3px;margin-bottom:6px;">
        <span style="background:#fff7ed;color:#c2410c;border-radius:4px;padding:1px 6px;font-size:0.72rem;font-weight:700;">${type.icon} ${type.name}</span>
      </div>
      ${ticket.followUpDeadline && ticket.stage === 'execucao' ? `<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:5px;padding:3px 7px;font-size:0.68rem;color:#c2410c;font-weight:700;margin-bottom:5px;display:flex;align-items:center;gap:3px;"><i class="ph ph-calendar-check"></i> Acomp. até ${formatDateShort(ticket.followUpDeadline)}</div>` : ''}
      ${assignedUser ? `<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;background:#f8fafc;padding:4px;border-radius:6px;border:1px solid #e2e8f0;width:100%;box-sizing:border-box;max-width:100%;overflow:hidden;">
        <img src="${assignedUserPhoto||''}" style="width:20px;height:20px;flex-shrink:0;border-radius:50%;object-fit:cover;background:#cbd5e1;" onerror="this.style.display='none'">
        <span style="font-size:0.7rem;color:#475569;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${assignedUser}">${assignedUser.length > 20 ? assignedUser.substring(0, 20) + '...' : assignedUser}</span>
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
      ${(() => {
        if (ticket.stage !== 'aguardando_setores' || !ticket.aguardDeadline) return '';
        const AGUARD_TOTAL_MS = 2 * 60 * 1000;
        const bizMs = businessMsUntilDeadline(ticket.aguardDeadline);
        const isOverAguard = bizMs <= 0;
        const absMs = Math.abs(bizMs);
        const hh = Math.floor(absMs/3600000).toString().padStart(2,'0');
        const mm = Math.floor((absMs%3600000)/60000).toString().padStart(2,'0');
        const ss = Math.floor((absMs%60000)/1000).toString().padStart(2,'0');
        const aguardPct = isOverAguard ? 100 : Math.min(100, Math.round((AGUARD_TOTAL_MS - bizMs) / AGUARD_TOTAL_MS * 100));
        const nowD = new Date(), nowDow = nowD.getDay(), nowH = nowD.getHours();
        const isPaused = nowDow===0 || nowDow===6 || nowH<8 || nowH>=17;
        const countLabel = isOverAguard ? `-${hh}:${mm}:${ss}` : isPaused ? `❄️ ${hh}:${mm}:${ss}` : `⏳ ${hh}:${mm}:${ss}`;
        const barColor = isOverAguard ? '#dc2626' : aguardPct > 70 ? '#d97706' : '#eab308';
        const pendSector = hasPendingLog ? 'Logística' : hasPendingCom ? 'Comercial' : hasPendingFin ? 'Financeiro' : '';
        return `<div class="sac-sla-bar" style="margin-top:8px;background:#fef9c3;"><div class="sac-sla-fill" style="width:${aguardPct}%;background:${barColor};transition:width 0.3s;"></div></div>
        <div style="font-size:0.63rem;color:${barColor};font-weight:700;margin-top:1px;display:flex;justify-content:space-between;align-items:center;">
          <span style="color:${isOverAguard ? '#dc2626' : '#854d0e'};">${pendSector ? (isOverAguard ? '🔴 Aguard. ' : '⏳ Aguard. ') + pendSector : ''}</span>
          <span>${countLabel}</span>
        </div>`;
      })()}
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
              <td style="padding:9px 12px;font-weight:600;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${window._stripEmojis(t.clientName)}</td>
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
    const rawOccs = window._sacOccurrencesRaw || [];
    
    let html = `
    <div style="padding:20px;overflow-y:auto;height:100%;box-sizing:border-box;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <h3 style="margin:0;font-size:1rem;color:#1e293b;display:flex;align-items:center;gap:8px;">
          <i class="ph ph-sliders-horizontal" style="color:#f97316;"></i> Tipos de Ocorrência por Chamado
        </h3>
        <button onclick="window._sacOpenNewOccModal()" style="background:#ef4444;color:#fff;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-weight:600;display:flex;align-items:center;gap:6px;font-size:0.85rem;">
          <i class="ph ph-plus"></i> Nova Ocorrência
        </button>
      </div>

      <div style="display:flex;flex-direction:column;gap:16px;">
    `;

    typesList.forEach(([typeKey, typeDef]) => {
      const occsForType = rawOccs.filter(o => o.type_key === typeKey);
      
      html += `
        <div style="background:#fff;border-radius:8px;border:1px solid #e2e8f0;overflow:hidden;">
          <div style="background:#f8fafc;padding:12px 16px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;gap:8px;font-weight:600;color:#334155;">
            ${typeDef.icon} ${typeDef.name}
          </div>
          <div style="padding:12px 16px;">
            ${occsForType.length === 0 ? '<p style="margin:0;color:#94a3b8;font-size:0.85rem;">Nenhuma ocorrência cadastrada.</p>' : `
              <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
                <tbody>
                  ${occsForType.map(o => `
                    <tr style="border-bottom:1px solid #f1f5f9;">
                      <td style="padding:8px;color:#475569;">${o.description}</td>
                      <td style="padding:8px;text-align:right;width:80px;">
                        <button onclick="window._sacEditOcc(${o.id})" style="background:transparent;border:none;color:#3b82f6;cursor:pointer;padding:4px;" title="Editar"><i class="ph ph-pencil-simple"></i></button>
                        <button onclick="window._sacDeleteOcc(${o.id})" style="background:transparent;border:none;color:#ef4444;cursor:pointer;padding:4px;" title="Excluir"><i class="ph ph-trash"></i></button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            `}
          </div>
        </div>
      `;
    });

    html += `
      </div>
    </div>`;
    
    container.innerHTML = html;
  }


  // ── OCCURRENCES CRUD ───────────────────────────────────────────────────
  window._sacOpenNewOccModal = function() {
    window._sacCurrentEditOccId = null;
    document.getElementById('sac-occ-modal-title').innerText = 'Nova Ocorrência';
    document.getElementById('sac-occ-type').value = 'manutencao';
    document.getElementById('sac-occ-desc').value = '';
    document.getElementById('sac-occ-modal').style.display = 'flex';
  };

  window._sacEditOcc = function(id) {
    const rawOccs = window._sacOccurrencesRaw || [];
    const occ = rawOccs.find(o => o.id === id);
    if (!occ) return;
    window._sacCurrentEditOccId = id;
    document.getElementById('sac-occ-modal-title').innerText = 'Editar Ocorrência';
    document.getElementById('sac-occ-type').value = occ.type_key;
    document.getElementById('sac-occ-desc').value = occ.description;
    document.getElementById('sac-occ-modal').style.display = 'flex';
  };

  window._sacCloseOccModal = function() {
    document.getElementById('sac-occ-modal').style.display = 'none';
  };

  window._sacSaveOcc = async function() {
    const type_key = document.getElementById('sac-occ-type').value;
    const description = document.getElementById('sac-occ-desc').value.trim();
    if (!description) { showToast('Descrição é obrigatória', 'error'); return; }

    const id = window._sacCurrentEditOccId;
    const token = localStorage.getItem('erp_token')||localStorage.getItem('token');
    
    try {
      let res;
      if (id) {
        res = await fetch(`/api/sac/ocorrencias/${id}`, {
          method: 'PUT',
          headers: {'Authorization':'Bearer '+token, 'Content-Type':'application/json'},
          body: JSON.stringify({ type_key, description })
        });
      } else {
        res = await fetch('/api/sac/ocorrencias', {
          method: 'POST',
          headers: {'Authorization':'Bearer '+token, 'Content-Type':'application/json'},
          body: JSON.stringify({ type_key, description })
        });
      }
      
      if (res.ok) {
        showToast('Ocorrência salva!', 'success');
        _sacCloseOccModal();
        await loadTickets(); // Reloads occurrences globally
        renderAll(); // Re-render current view (Config)
      } else {
        showToast('Erro ao salvar', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Erro de conexão', 'error');
    }
  };

  window._sacDeleteOcc = async function(id) {
    if (!confirm('Deseja realmente excluir esta ocorrência?')) return;
    const token = localStorage.getItem('erp_token')||localStorage.getItem('token');
    try {
      const res = await fetch(`/api/sac/ocorrencias/${id}`, {
        method: 'DELETE',
        headers: {'Authorization':'Bearer '+token}
      });
      if (res.ok) {
        showToast('Ocorrência excluída!', 'success');
        await loadTickets();
        renderAll();
      } else {
        showToast('Erro ao excluir', 'error');
      }
    } catch(e) {
      console.error(e);
      showToast('Erro de conexão', 'error');
    }
  };

  // Add the modal HTML to body if not exists
  if (!document.getElementById('sac-occ-modal')) {
    const modalHtml = `
      <div id="sac-occ-modal" style="display:none;position:fixed;inset:0;background:rgba(15,23,42,0.6);z-index:9999;align-items:center;justify-content:center;backdrop-filter:blur(2px);">
        <div style="background:#fff;width:100%;max-width:400px;border-radius:12px;box-shadow:0 10px 25px rgba(0,0,0,0.1);overflow:hidden;">
          <div style="padding:16px 20px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;background:#f8fafc;">
            <h3 id="sac-occ-modal-title" style="margin:0;font-size:1.05rem;color:#1e293b;font-weight:700;">Nova Ocorrência</h3>
            <button onclick="window._sacCloseOccModal()" style="background:transparent;border:none;font-size:1.2rem;cursor:pointer;color:#64748b;"><i class="ph ph-x"></i></button>
          </div>
          <div style="padding:20px;">
            <div style="margin-bottom:12px;">
              <label style="display:block;font-size:0.85rem;font-weight:600;color:#475569;margin-bottom:6px;">Tipo de Chamado</label>
              <select id="sac-occ-type" style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:6px;font-size:0.9rem;outline:none;">
                ${Object.entries(TICKET_TYPES).map(([k,v]) => `<option value="${k}">${v.name}</option>`).join('')}
              </select>
            </div>
            <div style="margin-bottom:20px;">
              <label style="display:block;font-size:0.85rem;font-weight:600;color:#475569;margin-bottom:6px;">Descrição</label>
              <input type="text" id="sac-occ-desc" style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:6px;font-size:0.9rem;outline:none;box-sizing:border-box;" placeholder="Ex: Produto entregue errado..." />
            </div>
            <div style="display:flex;justify-content:flex-end;gap:10px;">
              <button onclick="window._sacCloseOccModal()" style="padding:8px 16px;background:#f1f5f9;color:#475569;border:none;border-radius:6px;font-weight:600;cursor:pointer;">Cancelar</button>
              <button onclick="window._sacSaveOcc()" style="padding:8px 16px;background:#3b82f6;color:#fff;border:none;border-radius:6px;font-weight:600;cursor:pointer;">Salvar</button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }

  // ── WIZARD ABERTURA ───────────────────────────────────────────
  function openWizard() {
    _wiz = { step:1, protocol: nextProtocol(), osNumber:'', _protocolLocked:false, _osLinked:false, clientName:'', cnpjCpf:'', equipment:'', address:'', contacts:[{ id: Date.now(), type: 'Contato de Instalação', name: '', phone: '', email: '' }], channel:'WhatsApp', typeKey:'manutencao', occList:[], currentOcc: (OCCURRENCES_BY_TYPE.manutencao||[])[0]||'', currentOccNote:'', description:'', attachments:[] };
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

  window._sacBuscarContrato = async function(contratoVal) {
    _sacWiz('cnpjCpf', contratoVal);
    const num = (contratoVal || '').trim();
    if (!num) return;
    
    try {
        const token = localStorage.getItem('erp_token') || localStorage.getItem('token');
        const res = await fetch('/api/logistica/os/buscar?contrato=' + encodeURIComponent(num), {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
            const data = await res.json();
            if (data && data.length > 0) {
                // Preenche com a OS mais recente desse contrato
                const os = data[0];
                if (os.cliente) _sacWiz('clientName', os.cliente);
                if (os.endereco) _sacWiz('address', os.endereco);
                if (os.equipamento) _sacWiz('equipment', os.equipamento);
                // Múltiplos contatos
                if (!_wiz.contacts || _wiz.contacts.length === 0) _wiz.contacts = [{ id: Date.now(), type: 'Contato de Instalação', name: '', phone: '', email: '' }];
                if (os.responsavel) _wiz.contacts[0].name = os.responsavel;
                if (os.telefone) _wiz.contacts[0].phone = os.telefone;
                if (os.email) _wiz.contacts[0].email = os.email;
                
                renderWizard();
                showToast('Dados preenchidos via Contrato!', 'success');
            } else {
                showToast('Nenhuma OS encontrada para este contrato no histórico.', 'info');
            }
        } else {
            showToast('Nenhuma OS encontrada para este contrato no histórico.', 'info');
        }
    } catch (e) {
        console.error('Erro ao buscar contrato:', e);
        showToast('Erro de conexão ao buscar contrato.', 'error');
    }
  }

  window._sacBuscarOSLogistica = async function(osNum) {
    _sacWiz('osNumber', osNum);
    const num = (osNum || '').trim();
    if (!num) { _wiz._protocolLocked = false; _wiz._osLinked = false; renderWizard(); return; }
    
    // Verifica se ja existe chamados em aberto para esta OS
    const existingTickets = _tickets.filter(t => String(t.osNumber) === String(num) && !['concluido','encerrado'].includes(t.stage));
    if (existingTickets.length > 0) {
        let listHtml = existingTickets.map(t => {
            const typeDef = TICKET_TYPES[t.typeKey] || TICKET_TYPES.manutencao;
            const coverImg = (t.attachments && t.attachments.length > 0) ? t.attachments[0].url : null;
            const imgHtml = coverImg ? `<div style="height:120px;border-radius:8px;overflow:hidden;margin-bottom:12px;background:#e2e8f0;"><img src="${coverImg}" style="width:100%;height:100%;object-fit:cover;"></div>` : '';
            const desc = t.description ? (t.description.length > 80 ? t.description.substring(0,80)+'...' : t.description) : 'Sem descrição';
            const clientInfo = t.clientName ? `<div style="font-size:0.8rem;color:#334155;margin-bottom:4px;display:flex;align-items:flex-start;gap:4px;"><i class="ph ph-user" style="margin-top:2px;color:#94a3b8;"></i><span style="font-weight:600;flex:1;line-height:1.3;">${window._stripEmojis(t.clientName)}</span></div>` : '';
            const addressInfo = t.address ? `<div style="font-size:0.75rem;color:#475569;margin-bottom:4px;display:flex;align-items:flex-start;gap:4px;"><i class="ph ph-map-pin" style="margin-top:2px;color:#94a3b8;"></i><span style="flex:1;line-height:1.3;">${t.address}</span></div>` : '';
            const equipmentInfo = t.equipment ? `<div style="font-size:0.75rem;color:#475569;margin-bottom:10px;display:flex;align-items:flex-start;gap:4px;"><i class="ph ph-package" style="margin-top:2px;color:#94a3b8;"></i><span style="flex:1;line-height:1.3;">${t.equipment}</span></div>` : '';
            
            return `
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;text-align:left;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);display:flex;flex-direction:column;">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;flex-wrap:wrap;gap:6px;">
                    <strong style="color:#0ea5e9;font-size:1rem;">Prot. ${t.protocol}</strong>
                    <span style="font-size:0.7rem;background:#e0f2fe;color:#0369a1;padding:4px 8px;border-radius:12px;font-weight:700;">${typeDef.name}</span>
                </div>
                ${imgHtml}
                ${clientInfo}
                ${addressInfo}
                ${equipmentInfo}
                <div style="font-size:0.85rem;color:#475569;margin-bottom:16px;line-height:1.5;flex:1;overflow:hidden;text-overflow:ellipsis;padding-top:6px;border-top:1px solid #e2e8f0;">${desc}</div>
                <button onclick="window._sacWizardChoice='open'; Swal.close(); document.getElementById('sac-wizard-overlay').style.display='none'; setTimeout(() => { SAC.openDetail('${t.id}'); }, 300);" style="width:100%;padding:10px;background:#1d4ed8;color:#fff;border:none;border-radius:8px;font-size:0.9rem;cursor:pointer;font-weight:600;transition:all 0.2s;margin-top:auto;" onmouseover="this.style.background='#1e40af';this.style.transform='translateY(-1px)';" onmouseout="this.style.background='#1d4ed8';this.style.transform='none';">Abrir chamado</button>
            </div>
            `;
        }).join('');

        window._sacWizardChoice = null;
        const result = await Swal.fire({
          title: existingTickets.length === 1 ? 'Chamado em Aberto!' : 'Chamados em Aberto!',
          html: `
            <p style="font-size:1rem;color:#475569;margin-bottom:20px;font-weight:500;">
              ${existingTickets.length === 1 ? 'Foi localizado 1 chamado em andamento para esta OS:' : `Foram localizados ${existingTickets.length} chamados em andamento para esta OS:`}
            </p>
            <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(260px, 1fr));gap:20px;max-height:65vh;overflow-y:auto;padding:10px;">
              ${listHtml}
            </div>
            <p style="margin-top:25px;font-size:0.95rem;font-weight:600;color:#334155;">Deseja continuar criando um novo chamado?</p>
          `,
          showCancelButton: true,
          showConfirmButton: true,
          confirmButtonText: 'Sim, criar novo chamado',
          cancelButtonText: 'Cancelar',
          confirmButtonColor: '#10b981',
          cancelButtonColor: '#94a3b8',
          width: '95vw',
          padding: '2em'
        });
        
        if (window._sacWizardChoice === 'open') {
            return;
        }
        if (!result.isConfirmed) {
            return; // Usuário clicou em Cancelar ou clicou fora, aborta a busca e criação
        }
    }

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
      if (!osList.length) { _wiz._osLinked = false; _wiz._protocolLocked = false; renderWizard(); return; }
      
      const clienteNome = osList[0].cliente || '';
      const _clienteLimpo = window._stripEmojis(clienteNome);
      
      const todosEnderecos = osList.map(o => [o.endereco, o.complemento].filter(Boolean).join(', ')).filter(Boolean);
      const enderecosUnicos = [...new Set(todosEnderecos)];
      const enderecoFinal = enderecosUnicos.length > 1
        ? await _sacEscolherEndereco(enderecosUnicos, _clienteLimpo || clienteNome)
        : (enderecosUnicos[0] || '');
      if (enderecosUnicos.length > 1 && enderecoFinal === null) { _wiz._osLinked = false; _wiz._protocolLocked = false; renderWizard(); return; }

      const osDoEndereco = osList.filter(o => [o.endereco, o.complemento].filter(Boolean).join(', ') === enderecoFinal);
      const os = osDoEndereco[0] || osList[0];

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

      const todosProds = osDoEndereco.flatMap(o => _parseProds(o).map(p => {
          const icone = SAC_EQUIP_ICONS[p.desc] || '';
          return (icone ? `${icone} ` : '') + [p.qtd, p.desc].filter(Boolean).join('x ');
      }));
      const prodsUnicos = [...new Set(todosProds)].filter(Boolean);
      const precisaModal = prodsUnicos.length > 1 || (prodsUnicos.length === 1 && (() => { const m = prodsUnicos[0].match(/(\d+)x /); return m && parseInt(m[1]) > 1; })());
      const equipFinal = precisaModal
        ? await _sacEscolherEquipamento(prodsUnicos, _clienteLimpo || os.cliente || '', enderecoFinal)
        : (prodsUnicos[0] || _parseProds(os)[0]?.desc || '');
      if (equipFinal === null) { _wiz._osLinked = false; _wiz._protocolLocked = false; renderWizard(); return; }
      
      _wiz.clientName = _clienteLimpo || os.cliente || '';
      _wiz.cnpjCpf    = os.contrato || os.numero_contrato || '';
      _wiz.equipment  = equipFinal;
      _wiz.address    = enderecoFinal;
      if (!_wiz.contacts || _wiz.contacts.length === 0) _wiz.contacts = [{ id: Date.now(), type: 'Contato de Instalação', name: '', phone: '', email: '' }];
      _wiz.contacts[0].name = os.responsavel || '';
      _wiz.contacts[0].phone = os.telefone || '';
      _wiz.contacts[0].email = os.email || '';
      _wiz.protocol   = nextProtocol();
      _wiz._protocolLocked = true;
      _wiz._osLinked  = true;
      renderWizard();
    } catch(e) {
      console.warn('[SAC] Erro ao buscar OS logistica:', e);
      _wiz._osLinked = false; _wiz._protocolLocked = false; renderWizard();
    }
  };

  async function _sacEscolherEndereco(enderecos, cliente, osList) {
    return new Promise(resolve => {
      const clienteLimpo = window._stripEmojis ? window._stripEmojis(cliente) : (cliente||'').replace(/^[^a-zA-Z0-9À-ɏ]+/, '').trim();
      const div = document.createElement('div');
      div.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;';
      const btnsHtml = enderecos.map((e,i) =>
        `<button data-idx="${i}" style="background:#fff;border:1.5px solid #e2e8f0;border-radius:8px;padding:10px 14px;font-size:0.82rem;cursor:pointer;text-align:left;font-weight:500;color:#1e293b;transition:all 0.15s;display:flex;align-items:flex-start;gap:8px;" onmouseover="this.style.background='#f1f5f9';this.style.borderColor='#3b82f6';" onmouseout="this.style.background='#fff';this.style.borderColor='#e2e8f0';"><span style='color:#ef4444;flex-shrink:0;'>📍</span><span style='flex:1;line-height:1.4;'>${e}</span></button>`
      ).join('');
      div.innerHTML = `
        <div style="background:white;border-radius:12px;padding:24px;min-width:340px;max-width:600px;width:90vw;box-shadow:0 8px 32px rgba(0,0,0,0.18);">
          <h3 style="margin:0 0 12px;font-size:1rem;color:#1e293b;">Mais de um endereço encontrado</h3>
          <div style="background:#f8fafc;border-radius:8px;padding:12px;margin-bottom:14px;border:1px solid #e2e8f0;">
            <div style="font-size:0.9rem;color:#1e293b;font-weight:700;">${clienteLimpo}</div>
          </div>
          <p style="margin:0 0 10px;font-size:0.85rem;color:#475569;">Qual endereço deseja utilizar na ocorrência?</p>
          <div id="_sac-ender-opts" style="display:flex;flex-direction:column;gap:8px;max-height:280px;overflow-y:auto;padding-right:4px;margin-bottom:12px;">
            ${btnsHtml}
          </div>
          <div style="display:flex;gap:8px;">
            <button id="_sac-ender-todos" style="flex:1;background:#10b981;color:white;border:none;border-radius:6px;padding:9px 14px;font-size:0.82rem;cursor:pointer;font-weight:700;">✔ Adicionar Todos</button>
            <button id="_sac-ender-cancel" style="flex:1;background:#e2e8f0;border:none;border-radius:6px;padding:9px 14px;font-size:0.82rem;cursor:pointer;color:#475569;font-weight:600;">Cancelar</button>
          </div>
        </div>`;
      document.body.appendChild(div);
      div.querySelectorAll('[data-idx]').forEach(btn => {
        btn.addEventListener('click', () => { div.remove(); resolve({ label: enderecos[+btn.dataset.idx], todos: false }); });
      });
      div.querySelector('#_sac-ender-todos').addEventListener('click', () => { div.remove(); resolve({ label: enderecos[0], todos: true }); });
      div.querySelector('#_sac-ender-cancel').addEventListener('click', () => { div.remove(); resolve(null); });
    });
  }

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
          ${prods.map((p,i)=>{
              const m = p.match(/^.*?(\d+)x/);
              const max = m ? parseInt(m[1]) : 1;
              if (max > 1) {
                  return `<div style="display:flex;gap:8px;align-items:center;background:#fff;border:1.5px solid #e2e8f0;border-radius:8px;padding:10px 14px;">
                      <div style="flex:1;font-size:0.85rem;font-weight:600;color:#1e293b;">${p.replace(/(\d+)x\s*/, '')}</div>
                      <input type="number" id="_sac-equip-qtd-${i}" min="1" max="${max}" value="${max}" style="width:60px;padding:4px;border:1px solid #cbd5e1;border-radius:4px;text-align:center;">
                      <button data-idx="${i}" data-max="${max}" style="background:#3b82f6;color:white;border:none;border-radius:4px;padding:6px 12px;cursor:pointer;font-weight:600;font-size:0.75rem;">Adicionar</button>
                  </div>`;
              } else {
                  return `<button data-idx="${i}" data-max="1" style="background:#fff;border:1.5px solid #e2e8f0;border-radius:8px;padding:10px 14px;font-size:0.85rem;cursor:pointer;text-align:left;font-weight:600;color:#1e293b;transition:all 0.15s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='#fff'">${p}</button>`;
              }
          }).join('')}
        </div>
        <button id="_sac-equip-cancel" style="margin-top:14px;background:#e2e8f0;border:none;border-radius:6px;padding:8px 18px;font-size:0.8rem;cursor:pointer;color:#475569;width:100%;font-weight:600;">Cancelar</button>
      </div>`;
      document.body.appendChild(div);
      div.querySelectorAll('[data-idx]').forEach(btn => {
        btn.addEventListener('click', () => { 
            const idx = +btn.dataset.idx;
            const max = +btn.dataset.max;
            let prodStr = prods[idx];
            if (max > 1) {
                const input = document.getElementById(`_sac-equip-qtd-${idx}`);
                let val = parseInt(input.value);
                if (isNaN(val) || val < 1 || val > max) { alert('Quantidade inválida!'); return; }
                prodStr = prodStr.replace(/(\d+)x\s*/, `${val}x `);
            }
            div.remove(); resolve(prodStr); 
        });
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
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:10px;align-items:flex-end;">
            <div class="sac-field" style="margin-bottom:0;">
              <label>Nº Chamado</label>
              <input type="text" autocomplete="off" value="${_wiz.protocol}" id="wiz-protocol" ${_wiz._protocolLocked ? 'readonly style="background:#f1f5f9;color:#64748b;cursor:not-allowed;"' : 'oninput="_sacWiz(\'protocol\',this.value)"'}>
            </div>
            <div class="sac-field" style="margin-bottom:0;position:relative;">
              <label>Nº OS</label>
              <div style="display:flex;gap:6px;align-items:center;">
                <input type="text" autocomplete="off" value="${_wiz.osNumber||''}" placeholder="Nº da OS" id="wiz-osNumber" oninput="_sacWiz('osNumber',this.value)" onkeydown="if(event.key==='Enter'){event.preventDefault();_sacBuscarOSLogistica(this.value);}" style="flex:1;">
                <button onclick="_sacBuscarOSLogistica(document.getElementById('wiz-osNumber').value)" title="Buscar OS" style="background:#1e293b;color:#fff;border:none;border-radius:6px;width:34px;height:34px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:background 0.2s;" onmouseover="this.style.background='#dc2626'" onmouseout="this.style.background='#1e293b'"><i class="ph ph-magnifying-glass" style="font-size:1rem;"></i></button>
              </div>
              ${_wiz._osLinked ? '<div style="position:absolute;top:100%;left:0;font-size:0.72rem;color:#15803d;font-weight:600;margin-top:4px;">✓ Dados preenchidos da OS #'+_wiz.osNumber+'</div>' : ''}
            </div>
            <div class="sac-field" style="margin-bottom:0;">
              <label>Nº Contrato</label>
              <div style="display:flex;gap:6px;align-items:center;">
                <input type="text" autocomplete="off" value="${_wiz.cnpjCpf||''}" placeholder="Nº do Contrato" id="wiz-contract" oninput="_sacWiz('cnpjCpf',this.value)" onkeydown="if(event.key==='Enter'){event.preventDefault();_sacBuscarContrato(this.value);}" style="flex:1;">
                <button onclick="_sacBuscarContrato(document.getElementById('wiz-contract').value)" title="Buscar Contrato" style="background:#1e293b;color:#fff;border:none;border-radius:6px;width:34px;height:34px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:background 0.2s;" onmouseover="this.style.background='#dc2626'" onmouseout="this.style.background='#1e293b'"><i class="ph ph-magnifying-glass" style="font-size:1rem;"></i></button>
              </div>
            </div>
          </div>
          <div class="sac-field">
            <label>Nome do Cliente <span style="color:#dc2626">*</span></label>
            <input type="text" autocomplete="off" value="${_wiz.clientName}" id="wiz-clientName" placeholder="Razão Social / Nome" oninput="_sacWiz('clientName',this.value)">
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
          <h3 style="font-size:1rem;color:#0f172a;margin-bottom:12px;border-left:3px solid #eab308;padding-left:8px;display:flex;justify-content:space-between;align-items:center;">
            Informações de Contato
            <button onclick="SAC.wizAddContact()" style="background:#e0f2fe;color:#0369a1;border:1px solid #bae6fd;border-radius:6px;padding:4px 8px;font-size:0.75rem;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:4px;"><i class="ph ph-plus"></i> Adicionar</button>
          </h3>
          <div style="display:flex;flex-direction:column;gap:16px;margin-bottom:24px;">
              ${_wiz.contacts.map((c, i) => `
                  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;position:relative;">
                      ${_wiz.contacts.length > 1 ? `<button onclick="SAC.wizRemoveContact(${c.id})" style="position:absolute;top:8px;right:8px;background:transparent;border:none;color:#dc2626;cursor:pointer;" title="Remover Contato"><i class="ph ph-trash"></i></button>` : ''}
                      
                      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
                          <div class="sac-field" style="margin-bottom:0;">
                              <label>Tipo de Contato</label>
                              <select onchange="SAC.wizUpdateContact(${c.id}, 'type', this.value)">
                                  <option value="Contato de Instalação" ${c.type==='Contato de Instalação'?'selected':''}>Contato de Instalação</option>
                                  <option value="Contato Financeiro" ${c.type==='Contato Financeiro'?'selected':''}>Contato Financeiro</option>
                                  <option value="Contato de Contrato" ${c.type==='Contato de Contrato'?'selected':''}>Contato de Contrato</option>
                              </select>
                          </div>
                          <div class="sac-field" style="margin-bottom:0;">
                              <label>Nome do Contato <span style="color:#dc2626">*</span></label>
                              <input type="text" autocomplete="off" value="${c.name}" placeholder="Nome completo" oninput="SAC.wizUpdateContact(${c.id}, 'name', this.value)">
                          </div>
                      </div>
                      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                          <div class="sac-field" style="margin-bottom:0;">
                              <label>Telefone</label>
                              <input type="text" autocomplete="off" value="${c.phone}" placeholder="(XX) XXXXX-XXXX" oninput="SAC.wizUpdateContact(${c.id}, 'phone', this.value)">
                          </div>
                          <div class="sac-field" style="margin-bottom:0;">
                              <label>E-mail</label>
                              <input type="email" autocomplete="off" value="${c.email}" placeholder="E-mail" oninput="SAC.wizUpdateContact(${c.id}, 'email', this.value)">
                          </div>
                      </div>
                  </div>
              `).join('')}
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
            <textarea rows="6" placeholder="Descreva o problema ou solicitação com detalhes..." oninput="_sacWiz('description',this.value)" style="resize:vertical;">${_wiz.description}</textarea>
          </div>

          <div style="display:none;margin-bottom:24px;border:1px dashed #cbd5e1;padding:12px;border-radius:8px;background:#f8fafc;">
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
            ${(() => {
                const list = _wiz.attachments || [];
                return `
                <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;" id="sac-wiz-attachments-list">
                    ${(list).map((a,ai)=>{
                        const fname = a.originalName||a.name||a.filename||'Arquivo';
                        const isImg = /\.(jpeg|jpg|gif|png|webp|bmp)$/i.test(fname) || /\.(jpeg|jpg|gif|png|webp|bmp)$/i.test(a.url||'');
                        const key = a.r2Key||a.originalName||a.name||a.filename;
                        if(isImg && a.url) {
                            return `<div style="position:relative;border-radius:6px;overflow:hidden;width:64px;height:64px;cursor:pointer;border:1.5px solid #e2e8f0;" onclick="event.stopPropagation();window.open('${a.url}','_blank')" title="${fname}">
                            <img src="${a.url}" style="width:100%;height:100%;object-fit:cover;display:block;">
                            <button onclick="event.stopPropagation();SAC.wizRemoveAttachment('${key}')" style="position:absolute;top:2px;right:2px;background:rgba(220,38,38,0.85);color:#fff;border:none;border-radius:4px;padding:2px 4px;font-size:0.6rem;cursor:pointer;"><i class="ph ph-trash"></i></button>
                            </div>`;
                        }
                        return `<div style="background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:6px;width:64px;height:64px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;cursor:pointer;padding:4px;overflow:hidden;position:relative;" onclick="${a.url?`event.stopPropagation();window.open('${a.url}','_blank')` : ''}" title="${fname}">
                            <i class="ph ph-file-text" style="font-size:1.4rem;color:#64748b;"></i>
                            <span style="font-size:0.55rem;color:#475569;text-align:center;word-break:break-all;line-height:1.2;max-height:2.4em;overflow:hidden;">${fname}</span>
                            <button onclick="event.stopPropagation();SAC.wizRemoveAttachment('${key}')" style="position:absolute;top:2px;right:2px;background:rgba(220,38,38,0.85);color:#fff;border:none;border-radius:4px;padding:2px 4px;font-size:0.6rem;cursor:pointer;"><i class="ph ph-trash"></i></button>
                        </div>`;
                    }).join('')}
                    <label style="background:#fff;border:1.5px dashed #cbd5e1;border-radius:6px;width:96px;height:64px;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;color:#94a3b8;transition:all 0.2s;text-align:center;padding:4px;">
                        <input type="file" multiple onchange="SAC.addWizardAttachments(this.files)" style="display:none;">
                        <i class="ph ph-upload-simple" style="font-size:1.2rem;margin-bottom:2px;"></i>
                        <span style="font-size:0.55rem;line-height:1.1;">Arrastar, colar ou<br>selecionar</span>
                    </label>
                </div>`;
            })()}
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
    const pendingPopupType = localStorage.getItem('sac_pending_popup_' + t.id);
    const ov = document.getElementById('sac-modal-overlay');
    const mc = document.getElementById('sac-modal-container');
    ov.style.display = 'block';
    mc.style.display = 'flex';

    const stage  = PIPELINE_STAGES.find(s=>s.id===t.stage)||{name:t.stage,color:'#64748b'};
    const type   = TICKET_TYPES[t.typeKey]||{name:t.typeKey,icon:'?',sla:48};
    const sla    = getSLADetails(t);
    const slaColor = sla.labelColor || (sla.status === 'danger' ? '#dc2626' : sla.status === 'warning' ? '#d97706' : '#15803d');
    const slaConsumedPct = sla.consumedPct !== undefined ? sla.consumedPct : Math.min(100, Math.max(0, 100 - sla.pct));
    const slaBarColor = sla.barColor || slaColor;

    const occOpts = (OCCURRENCES_BY_TYPE[t.typeKey]||[]).map(o=>`<option value="${o}">${o}</option>`).join('');
    const stageOpts = PIPELINE_STAGES.filter(s => s.id !== 'respondido' || s.id === t.stage).map(s=>`<option value="${s.id}" ${s.id===t.stage?'selected':''}>${s.name}</option>`).join('');

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

    const allTasks = [
      t.logisticsTask && { label:'Logística', task:t.logisticsTask, key:'logisticsTask' },
      t.commercialTask && { label:'Comercial', task:t.commercialTask, key:'commercialTask' },
      t.financialTask && { label:'Financeiro', task:t.financialTask, key:'financialTask' }
    ].filter(Boolean);

    mc.innerHTML = `
    <div class="sac-modal sac-animated" id="sac-modal-dropzone" style="width:100vw;max-width:100vw;margin:0;border-radius:0;background:#fff;display:flex;flex-direction:column;position:relative;height:100vh;max-height:100vh;overflow:hidden;" onclick="event.stopPropagation()">
      <div style="padding:16px 24px;border-bottom:1px solid #f1f5f9;display:flex;justify-content:flex-end;align-items:center; ${pendingPopupType === 'sla' ? 'background:#dc2626;color:#fff;' : pendingPopupType === 'aguard' ? 'background:#d97706;color:#fff;' : pendingPopupType === 'followup' ? 'background:#2563eb;color:#fff;' : ''}">
        ${pendingPopupType === 'sla'
            ? `<div style="flex:1;font-weight:700;color:#fff;font-size:1.1rem;">⚠️ SLA Estourado - Justificativa Obrigatória</div>`
            : pendingPopupType === 'aguard'
            ? `<div style="flex:1;font-weight:700;color:#fff;font-size:1.1rem;">⏰ Tempo de resposta de chamado excedido. Justificativa obrigatória.</div>`
            : pendingPopupType === 'followup'
            ? `<div style="flex:1;font-weight:700;color:#fff;font-size:1.1rem;">⏰ Tempo de acompanhamento de chamado excedido. Justificativa obrigatória.</div>`
            : ''}
        ${(() => {
            const permsNowX = window.activeUserPerms || {};
            const isTopAdminX = window.isTopAdmin || false;
            const canSeeAllNowX = isTopAdminX || (permsNowX['sac'] === true && permsNowX['sac-atribuidos'] !== true);
            const isPopupCloser = POPUP_CLOSERS.some(u => currentUsername().toLowerCase() === u.toLowerCase());
            // gestorRequired='1' → só o gestor do setor precisa preencher; '0' ou ausente → pode fechar com X
            const gestorRequired = localStorage.getItem('sac_popup_gestor_required_' + t.id) === '1';
            const canClose = !pendingPopupType || isPopupCloser || !gestorRequired;
            return canClose 
                ? `<button onclick="SAC.closeModal()" style="background:none;border:none;font-size:1.4rem;cursor:pointer;color:${pendingPopupType?'#fff':'#94a3b8'};padding:4px;line-height:1;">✕</button>` 
                : '';
        })()}
      </div>

      <div style="flex:1;overflow-y:auto;padding:24px;display:grid;grid-template-columns:1fr 2fr;gap:40px;" id="sac-modal-body">
        
        <!-- COLUNA ESQUERDA -->
        <div style="display:flex;flex-direction:column;">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                <span style="font-family:monospace;font-weight:800;font-size:1rem;color:#f97316;">Nº ${t.protocol}</span>
                <span class="sac-tag" style="background:${stage.color}18;color:${stage.color};">${stage.name}</span>
                <span class="sac-tag" style="background:#e0e7ff;color:#4338ca;"><i class="ph ${type.icon}"></i> ${type.name}</span>
                <span class="sac-tag" style="background:${sla.status==='danger'?'#fee2e2':sla.status==='warning'?'#fef9c3':'#dcfce7'};color:${sla.status==='danger'?'#dc2626':sla.status==='warning'?'#d97706':'#15803d'};"><i class="ph ph-clock"></i> ${sla.label}</span>
                ${t.followUpDeadline && t.stage === 'execucao' ? `<span class="sac-tag" style="background:#fff7ed;color:#c2410c;border:1px solid #fed7aa;"><i class="ph ph-calendar-check"></i> Acomp. até ${formatDateShort(t.followUpDeadline)}</span>` : ''}
            </div>
            <div style="margin-top: 8px; width: 100%; max-width:320px;">
                <div class="sac-sla-bar" style="height: 6px;"><div class="sac-sla-fill" style="width:${slaConsumedPct}%;background:${slaBarColor};transition:width 0.3s;"></div></div>
            </div>
            
            <h2 style="margin:16px 0 0;font-size:1.25rem;color:#1e293b;">${window._stripEmojis(t.clientName)}</h2>
            <div style="font-size:0.85rem;color:#64748b;margin-top:4px;">
                <div style="font-weight:600;color:#1e293b;">${t.equipment}</div>
                ${t.address ? `<div style="display:flex;align-items:flex-start;gap:6px;margin-top:4px;font-size:0.72rem;color:#64748b;word-break:break-word;line-height:1.4;" title="${t.address}"><i class="ph ph-map-pin" style="color:#3b82f6;flex-shrink:0;margin-top:2px;"></i><span>${t.address}</span></div>` : ''}
            </div>

            
            ${(() => {
                const creatorUserStr = (t.timeline && t.timeline.length > 0 && t.timeline[0].user) ? t.timeline[0].user : null;
                let creatorInfo = '';
                if (creatorUserStr) {
                    const u = (window._sacUsersList || []).find(x => {
                        const val = x.username || x.login || x.email || x.nome;
                        return (val || '').toLowerCase() === creatorUserStr.toLowerCase();
                    });
                    const cName = u ? (u.nome || u.name || creatorUserStr) : creatorUserStr;
                    const cPhoto = u ? (u.foto_colaborador || '') : '';
                    const cNameTrunc = cName.length > 15 ? cName.substring(0, 15) + '...' : cName;
                    creatorInfo = `<div style="display:flex;align-items:center;gap:6px;background:#f8fafc;padding:3px 10px;border-radius:20px;border:1px solid #e2e8f0;" title="${cName}">
                        <span style="font-size:0.65rem;color:#64748b;font-weight:600;text-transform:uppercase;">Aberto por</span>
                        ${cPhoto ? `<img src="${cPhoto}" style="width:18px;height:18px;border-radius:50%;object-fit:cover;">` : `<div style="width:18px;height:18px;border-radius:50%;background:#e2e8f0;display:flex;align-items:center;justify-content:center;font-size:0.55rem;font-weight:bold;color:#475569;">${cName.charAt(0).toUpperCase()}</div>`}
                        <span style="font-size:0.75rem;font-weight:600;color:#1e293b;">${cNameTrunc}</span>
                    </div>`;
                }
                return `<div style="display:flex;align-items:center;justify-content:space-between;margin-top:20px;flex-wrap:nowrap;width:100%;gap:10px;">
                    <div style="display:flex;align-items:center;gap:6px;">
                        <span style="font-size:0.7rem;font-weight:700;color:#94a3b8;text-transform:uppercase;">MOVER PARA:</span>
                        <select style="padding:4px 8px;border:1.5px solid #e2e8f0;border-radius:6px;font-size:0.8rem;outline:none;cursor:pointer;background:#fff;" onchange="SAC.changeStageFromModal(this.value)" ${!canMoveTicket(t) ? 'disabled title="Você só pode mover chamados abertos por você."' : ''}>${stageOpts}</select>
                    </div>
                    ${creatorInfo}
                </div>`;
            })()}

            <div style="display:none;margin-top:24px;">
                <div style="font-size:0.75rem;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:8px;">Próximos Passos</div>
                <div style="background:#f8fafc;border-radius:8px;padding:12px;font-size:0.85rem;color:#475569;border:1px solid #e2e8f0;white-space:pre-wrap;">${(t.nextSteps||'Nenhum próximo passo registrado.').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</div>
            </div>

            <div style="margin-top:24px;">
                <div style="font-size:0.75rem;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:8px;">Descrição</div>
                <textarea id="modal-desc-edit-${t.id}" style="width:100%;min-height:120px;background:#f8fafc;border-radius:8px;padding:12px;font-size:0.85rem;color:#475569;border:1px solid #e2e8f0;white-space:pre-wrap;font-family:inherit;resize:vertical;" oninput="this.style.borderColor='#3b82f6'">${t.description||''}</textarea>
                <div style="display:flex;justify-content:flex-end;margin-top:8px;">
                    <button class="sac-btn sac-btn-secondary" style="padding:6px 12px;font-size:0.8rem;border-radius:6px;background:#eff6ff;border:1px solid #bfdbfe;cursor:pointer;font-weight:700;color:#2563eb;" onclick="SAC.saveDescription('${t.id}')">Salvar Descrição</button>
                </div>
            </div>

            ${allTasks.length ? `
            <div style="margin-top:24px;">
                <div style="font-size:0.75rem;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:8px;">Tarefas Setoriais</div>
                ${allTasks.map(({label,task,key}) => {
                    const canEdit = canEditAssignment(t, label);
                    const disabledAttr = canEdit ? '' : 'disabled title="Apenas o criador ou gestor podem alterar a atribuição"';
                    return `
                    <div style="background:${task.isCompleted?'#f0fdf4':'#fffbeb'};border:1.5px solid ${task.isCompleted?'#86efac':'#fde68a'};border-radius:8px;padding:12px;margin-bottom:8px;">
                        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                            <i class="ph ph-${task.isCompleted?'check-circle':'clock'}" style="color:${task.isCompleted?'#15803d':'#d97706'};font-size:1rem;"></i>
                            <strong style="font-size:0.85rem;color:#1e293b;">${label}:</strong>
                            <span style="font-size:0.8rem;color:#475569;">${task.name}</span>
                        </div>
                        <div style="display:flex;align-items:center;gap:8px;">
                            <span style="font-size:0.75rem;color:#64748b;">Responsável:</span>
                            ${(() => {
                                const assignedUser = (window._sacUsersList||[]).find(u => {
                                    const val = u.username || u.login || u.email || (u.nome || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '.');
                                    return val === task.assignedTo;
                                });
                                const photoUrl = task.assignedToPhoto || (assignedUser ? (assignedUser.foto_colaborador || '') : '');
                                return photoUrl ? `<img src="${photoUrl}" style="width:24px;height:24px;border-radius:50%;object-fit:cover;border:1px solid #cbd5e1;flex-shrink:0;">` : '';
                            })()}
                            <select style="padding:4px 8px;border:1px solid #cbd5e1;border-radius:4px;font-size:0.75rem;background:#fff;" onchange="SAC.changeTaskAssignment('${key}', this.value)" ${disabledAttr}>
                                <option value="">Sem atribuição</option>
                                ${(() => {
                                    const allowedDepts = ['Logística', 'Comercial', 'Financeiro'];
                                    const managers = (_globalDepartamentos || []).filter(d => allowedDepts.includes(d.nome) && d.responsavel_nome).map(d => d.responsavel_nome.toLowerCase());
                                    const validUsers = (window._sacUsersList || []).filter(u => {
                                        if (!u.ativo) return false;
                                        const dept = (u.departamento || '');
                                        const isAllowedDept = allowedDepts.some(d => dept.toLowerCase().includes(d.toLowerCase()));
                                        const isManager = managers.includes((u.nome || '').toLowerCase());
                                        return isAllowedDept || isManager;
                                    });
                                    // Sort by name
                                    validUsers.sort((a,b) => (a.nome||'').localeCompare(b.nome||''));
                                    
                                    // Guarantee the currently assigned user is visible even if they no longer match
                                    if (task.assignedTo && !validUsers.find(u => {
                                        const val = u.username || u.login || u.email || (u.nome||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '.');
                                        return val === task.assignedTo;
                                    })) {
                                        const currU = (window._sacUsersList || []).find(u => {
                                            const val = u.username || u.login || u.email || (u.nome||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '.');
                                            return val === task.assignedTo;
                                        });
                                        if (currU) validUsers.unshift(currU);
                                    }

                                    return validUsers.map(u => {
                                        const val = u.username || u.login || u.email || (u.nome||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '.');
                                        const rawName = u.nome || u.name || val;
                                        
                                        // Label formatting
                                        let deptLabel = '';
                                        const uDept = u.departamento || '';
                                        let foundDept = allowedDepts.find(d => uDept.toLowerCase().includes(d.toLowerCase()));
                                        const isManagerOf = (_globalDepartamentos||[]).find(d => allowedDepts.includes(d.nome) && d.responsavel_nome && d.responsavel_nome.toLowerCase() === (u.nome||'').toLowerCase());
                                        
                                        if (isManagerOf) {
                                            deptLabel = `(Gestor ${isManagerOf.nome})`;
                                        } else if (foundDept) {
                                            deptLabel = `(${foundDept})`;
                                        } else if (uDept) {
                                            deptLabel = `(${uDept})`;
                                        }
                                        
                                        const displayName = deptLabel ? `${rawName} ${deptLabel}` : rawName;
                                        return `<option value="${val}" ${val === task.assignedTo ? 'selected' : ''}>${displayName}</option>`;
                                    }).join('');
                                })()}
                            </select>
                        </div>
                    </div>`;
                }).join('')}
            </div>` : ''}

            <div style="display:none;margin-top:24px;">
                <div style="font-size:0.75rem;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:8px;">Ocorrências (${t.occurrences.length})</div>
                ${t.occurrences.map((o,i)=>`
                <div style="background:#fff;border-radius:8px;padding:10px 12px;margin-bottom:6px;border:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
                <div style="flex:1;">
                    <div style="font-weight:700;font-size:0.85rem;color:#1e293b;">${o.name}</div>
                    ${o.note?`<div style="font-size:0.78rem;color:#64748b;margin-top:2px;">${o.note}</div>` : ''}
                </div>
                ${t.occurrences.length>1?`<button class="sac-btn sac-btn-danger" style="padding:3px 8px;font-size:0.72rem;" onclick="SAC.removeOccurrence(${i})"><i class="ph ph-trash"></i></button>`:''}
                </div>`).join('')}
                ${!['concluido','encerrado'].includes(t.stage)?`
                <div style="background:#f8fafc;border:1px dashed #cbd5e1;border-radius:8px;padding:12px;margin-top:8px;">
                <div style="font-size:0.75rem;font-weight:700;color:#64748b;margin-bottom:6px;">Adicionar Ocorrência</div>
                <select id="modal-occ-select" style="width:100%;padding:7px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:0.83rem;margin-bottom:6px;">${occOpts}</select>

                <textarea id="modal-occ-note" rows="2" placeholder="Observação sobre a ocorrência..." style="width:100%;padding:7px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:0.83rem;outline:none;box-sizing:border-box;resize:vertical;margin-bottom:6px;"></textarea>
                <button class="sac-btn sac-btn-secondary" onclick="SAC.addOccurrenceFromModal()"><i class="ph ph-plus"></i> Adicionar</button>
                </div>`:''}
            </div>
        
            <!-- DADOS DA OS (MOVIDO) -->
            <div style="margin-top: 32px; border-top: 1px dashed #cbd5e1; padding-top: 24px;">
            
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
                <div style="font-size:0.75rem;font-weight:700;color:#94a3b8;text-transform:uppercase;">Dados da OS</div>
                <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end;">
                    <!-- Botões ocultos conforme solicitado -->
                </div>
            </div>
            
            <div style="font-size:0.85rem;color:#1e293b;line-height:1.8;margin-bottom:24px;">
                <div><strong>Abertura:</strong> ${formatDate(t.openDate)}</div>
                ${t.closeDate?`<div><strong>Encerramento:</strong> ${formatDate(t.closeDate)}</div>`:''}
                <div><strong>Nº OS Relacionada:</strong> ${t.osNumber||'—'}</div>
                <div><strong>Canal:</strong> ${t.channel||'—'}</div>
                <div><strong>Nº Contrato:</strong> ${t.cnpjCpf||'—'}</div>
                <div style="margin-top:16px;margin-bottom:8px;border-top:1px solid #e2e8f0;padding-top:16px;display:flex;justify-content:space-between;align-items:center;">
                    <h4 style="margin:0;font-size:0.9rem;color:#0f172a;">Contatos</h4>
                    ${(window.isTopAdmin || (window.activeUserPerms||{})['sac'] === true) ? `<button onclick="SAC.openEditContactsModal('${t.id}')" style="background:#e0f2fe;color:#0369a1;border:1px solid #bae6fd;border-radius:6px;padding:3px 8px;font-size:0.75rem;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:4px;"><i class="ph ph-pencil-simple"></i> Editar</button>` : ''}
                </div>
                ${(() => {
                    const contactsList = (t.contacts && t.contacts.length > 0) ? t.contacts : [{ type: 'Contato de Instalação', name: t.contactName, phone: t.contactPhone, email: t.contactEmail }];
                    return contactsList.filter(c => c.name).map(c => `
                        <div style="margin-bottom:12px;background:#f8fafc;padding:8px;border-radius:6px;border:1px solid #e2e8f0;">
                            <div style="font-size:0.7rem;font-weight:700;color:#64748b;text-transform:uppercase;margin-bottom:4px;">${c.type}</div>
                            <div><strong>Nome:</strong> ${c.name}</div>
                            ${c.phone ? `<div><strong>Telefone:</strong> ${c.phone}</div>` : ''}
                            ${c.email ? `<div><strong>E-mail:</strong> ${c.email}</div>` : ''}
                        </div>
                    `).join('');
                })()}
            </div>
            </div>
    </div>

        <!-- COLUNA DIREITA -->
        <div style="display:flex;flex-direction:column;height:100%;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <!-- COMENTÁRIOS / HISTÓRICO -->
                <div style="display:flex;align-items:center;gap:8px;">
                    <div style="font-size:0.75rem;font-weight:700;color:#94a3b8;text-transform:uppercase;">Comentários</div>
                    ${(window.isTopAdmin || (window.activeUserPerms||{})['sac'] === true) ? `<button onclick="if(confirm('Tem certeza que deseja EXCLUIR este chamado? Esta ação não pode ser desfeita!'))SAC.deleteTicket('${t.id}')" style="font-size:0.72rem;font-weight:700;color:#dc2626;background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:3px 8px;cursor:pointer;display:flex;align-items:center;gap:4px;"><i class="ph ph-trash"></i> Excluir</button>` : ''}
                    <button onclick="SAC.duplicateTicket('${t.id}')" style="font-size:0.72rem;font-weight:700;color:#0369a1;background:#e0f2fe;border:1px solid #bae6fd;border-radius:6px;padding:3px 8px;cursor:pointer;display:flex;align-items:center;gap:4px;"><i class="ph ph-copy"></i> Duplicar</button>
                </div>
                <div style="display:flex;align-items:center;gap:8px;">
                    ${(window.isTopAdmin || (window.activeUserPerms||{})['sac'] === true) ? `<button onclick="SAC.openChecklistModal()" style="font-size:0.8rem;font-weight:700;color:#fff;background:#0369a1;padding:4px 12px;border-radius:6px;border:none;cursor:pointer;display:flex;align-items:center;gap:6px;"><i class="ph ph-list-checks"></i> Check-list</button>` : ''}
                    ${(window.isTopAdmin || (window.activeUserPerms||{})['sac'] === true) ? `<button onclick="SAC.openCustosModal()" style="font-size:0.8rem;font-weight:700;color:#fff;background:#7e22ce;padding:4px 12px;border-radius:6px;border:none;cursor:pointer;display:flex;align-items:center;gap:6px;"><i class="ph ph-currency-dollar"></i> Centro de Custos</button>` : ''}
                    <label style="cursor:pointer;font-size:0.8rem;font-weight:700;color:#dc2626;display:flex;align-items:center;gap:6px;background:#fef2f2;padding:4px 8px;border-radius:6px;border:1px solid #fecaca;">
                        <input type="checkbox" ${t.isUrgent ? 'checked' : ''} onchange="SAC.toggleUrgent('${t.id}', this.checked)" style="accent-color:#dc2626;cursor:pointer;width:14px;height:14px;">
                        Chamado Urgente
                    </label>
                </div>
            </div>
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;display:flex;flex-direction:column;flex:1;min-height:500px;margin-bottom:24px;">
                <div style="flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;" id="sac-comments-list">
                    ${(() => {
                        const stageColors = {};
                        if (typeof PIPELINE_STAGES !== 'undefined') PIPELINE_STAGES.forEach(s => stageColors[s.id] = s.color);
                        // Filtrar comentários redundantes do sistema de retorno automático
                        const systemRedundant = new Set();
                        (t.timeline || []).forEach(l => { if (l.notes && l.notes.startsWith('Retorno automático:')) systemRedundant.add(l.time); });
                        const filteredComments = (t.comments || []).filter(c => {
                            if (c.text && c.text.startsWith('↩ Chamado devolvido para Triagem')) return false;
                            return true;
                        });
                        const unified = [
                            ...filteredComments.map(c => ({ type: 'comment', time: c.time, user: c.user, text: c.text })),
                            ...(t.timeline || []).map(l => ({ type: 'timeline', time: l.time, user: l.user, stage: l.stage, notes: l.notes }))
                        ].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
                        if (!unified.length) return '<div style="color:#94a3b8;font-size:0.8rem;text-align:center;padding:20px;">Nenhum registro.</div>';
                        return unified.map(item => {
                            if (item.type === 'comment') {
                                const isJust = item.text && item.text.startsWith('📝 Justificativa');
                                const isSlaJust = isJust && item.text.includes('(SLA');
                                const isAguardJust = isJust && item.text.includes('(prazo de aguardo');
                                // followup e aguard justificativas são embutidas ou renderizadas na timeline, SLA fica separado
                                if (isJust && !isSlaJust) return '';
                                const formattedText = (item.text || '').replace(/"([^"]+)"/g, '"<strong>$1</strong>"');
                                // Para justificativas (SLA/aguard), não mostra o nome do usuário
                                const showCommentUser = !isJust;
                                return `<div style="background:${isJust ? '#fffbeb' : '#fff'};border:1px solid ${isJust ? '#fde68a' : '#e2e8f0'};border-radius:6px;padding:8px;">
                                <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                                    ${showCommentUser ? `<strong style="font-size:0.75rem;color:#1e293b;">${item.user || 'Desconhecido'}</strong>` : '<span></span>'}
                                    <span style="font-size:0.65rem;color:#94a3b8;">${formatDate(item.time)}</span>
                                </div>
                                <div style="font-size:0.8rem;color:#475569;white-space:pre-wrap;">${formattedText}</div>
                                </div>`;
                            } else {
                                const isAutoReturn = item.notes && item.notes.startsWith('Retorno automático:');
                                const stageName = (typeof PIPELINE_STAGES !== 'undefined' ? (PIPELINE_STAGES.find(s=>s.id===item.stage)?.name||item.stage) : item.stage);
                                const sColor = stageColors[item.stage] || '#475569';
                                let formattedNotes = (item.notes || '').replace(/"([^"]+)"/g, '"<strong>$1</strong>"').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
                                if (formattedNotes.startsWith('Respondido via justificativa')) formattedNotes = '';
                                // Buscar justificativa associada (comentário 📝 com timestamp próximo)
                                const justEntry = (t.comments||[]).find(c => c.text && c.text.startsWith('📝 Justificativa') && Math.abs(new Date(c.time).getTime()-new Date(item.time).getTime()) < 5000);
                                const justFormatted = justEntry ? justEntry.text.replace(/"([^"]+)"/g,'"<strong>$1</strong>"').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') : null;
                                // Mostrar usuário apenas se não for retorno automático do sistema
                                const showUser = item.user && !isAutoReturn;
                                return `<div style="background:#f1f5f9;border-left:3px solid ${sColor};border-radius:0 6px 6px 0;padding:6px 10px;">
                                <div style="display:flex;justify-content:space-between;align-items:center;">
                                    <strong style="font-size:0.7rem;color:${sColor};text-transform:uppercase;">${stageName}</strong>
                                    <span style="font-size:0.65rem;color:#94a3b8;">${formatDate(item.time)}</span>
                                </div>
                                ${formattedNotes ? `<div style="font-size:0.75rem;color:#475569;margin-top:2px;">${formattedNotes}</div>` : ''}
                                ${justFormatted ? `<div style="font-size:0.75rem;color:#475569;margin-top:3px;">${justFormatted}</div>` : ''}
                                ${showUser ? `<div style="font-size:0.68rem;color:#94a3b8;margin-top:2px;">Por: ${item.user}</div>` : ''}
                                </div>`;
                            }
                        }).join('');
                    })()}
                </div>
                <div style="border-top:1px solid #e2e8f0;padding:8px;background:#fff;border-radius:0 0 8px 8px;display:flex;gap:6px;flex-direction:column;">
                    ${pendingPopupType ? `<div style="font-size:0.8rem;color:${pendingPopupType === 'sla' ? '#dc2626' : '#d97706'};font-weight:700;margin-bottom:4px;">Informe o motivo deste chamado não ter sido concluído conforme programado:</div>` : ''}
                    <div style="display:flex;gap:6px;">
                        <textarea id="new-comment-text" rows="${pendingPopupType ? 3 : 1}" placeholder="${pendingPopupType ? 'Digite a justificativa obrigatória aqui...' : 'Escreva um recado...'}" style="flex:1;padding:6px;border:1px solid ${pendingPopupType === 'sla' ? '#fca5a5' : pendingPopupType ? '#fde68a' : '#e2e8f0'};border-radius:4px;font-size:0.8rem;resize:none;outline:none;font-family:inherit;"></textarea>
                        <button class="sac-btn sac-btn-primary" style="padding:0 10px;${pendingPopupType === 'sla' ? 'background:#dc2626' : pendingPopupType ? 'background:#d97706' : ''}" onclick="SAC.addComment('${t.id}')"><i class="ph ph-paper-plane-right"></i></button>
                    </div>
                </div>
            </div>

            <!-- ANEXOS -->
            <div style="display:${pendingPopupType ? 'none' : 'block'}">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                    <div style="font-size:0.75rem;font-weight:700;color:#94a3b8;text-transform:uppercase;">Anexos</div>
                    <label style="cursor:pointer;font-size:0.75rem;color:#3b82f6;font-weight:600;display:none;">
                        <input type="file" multiple onchange="SAC.handleFileUpload(this.files)" style="display:none;">
                        <i class="ph ph-upload-simple"></i> Enviar
                    </label>
                </div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;" id="sac-attachments-list">
                    ${(t.attachments||[]).map((a,ai)=>{
                        const fname = a.originalName||a.name||a.filename||'Arquivo';
                        const isImg = /\.(jpeg|jpg|gif|png|webp|bmp)$/i.test(fname) || /\.(jpeg|jpg|gif|png|webp|bmp)$/i.test(a.url||'');
                        const key = a.r2Key||a.originalName||a.name||a.filename;
                        if(isImg && a.url) {
                            return `<div style="position:relative;border-radius:6px;overflow:hidden;width:64px;height:64px;cursor:pointer;border:1.5px solid #e2e8f0;" onclick="event.stopPropagation();SAC.openAttachmentViewer(${ai})" title="${fname}">
                            <img src="${a.url}" style="width:100%;height:100%;object-fit:cover;display:block;">
                            <button onclick="event.stopPropagation();SAC.removeAttachment('${key}')" style="position:absolute;top:2px;right:2px;background:rgba(220,38,38,0.85);color:#fff;border:none;border-radius:4px;padding:2px 4px;font-size:0.6rem;cursor:pointer;"><i class="ph ph-trash"></i></button>
                            </div>`;
                        }
                        return `<div style="background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:6px;width:64px;height:64px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;cursor:pointer;padding:4px;overflow:hidden;position:relative;" onclick="${a.url?`event.stopPropagation();window.open('${a.url}','_blank')` : ''}" title="${fname}">
                            <i class="ph ph-file-text" style="font-size:1.4rem;color:#64748b;"></i>
                            <span style="font-size:0.55rem;color:#475569;text-align:center;word-break:break-all;line-height:1.2;max-height:2.4em;overflow:hidden;">${fname}</span>
                            <button onclick="event.stopPropagation();SAC.removeAttachment('${key}')" style="position:absolute;top:2px;right:2px;background:rgba(220,38,38,0.85);color:#fff;border:none;border-radius:4px;padding:2px 4px;font-size:0.6rem;cursor:pointer;"><i class="ph ph-trash"></i></button>
                        </div>`;
                    }).join('')}
                    <label id="sac-dropzone" style="background:#fff;border:1.5px dashed #cbd5e1;border-radius:6px;width:96px;height:64px;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;color:#94a3b8;transition:all 0.2s;text-align:center;padding:4px;">
                        <input type="file" multiple onchange="SAC.handleFileUpload(this.files)" style="display:none;">
                        <i class="ph ph-upload-simple" style="font-size:1.2rem;margin-bottom:2px;"></i>
                        <span style="font-size:0.55rem;line-height:1.1;">Arrastar, colar ou<br>selecionar</span>
                    </label>
                </div>
            </div>
            
        </div>
      </div>
    </div>`;
    
    setTimeout(() => {
        const clist = document.getElementById('sac-comments-list');
        if (clist) clist.scrollTop = clist.scrollHeight;
        if(typeof SAC.bindUploadEvents === 'function') SAC.bindUploadEvents();
    }, 50);
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
        (pt.targetStageId === 'concluido' ? 
          `<div class="sac-field" style="margin-bottom:0;"><label>Ocorrências <span style="color:#dc2626">*</span></label></div>
           <div id="trans-concluido-occs"></div>
           <button onclick="SAC.addTransOccRow()" style="background:#f1f5f9;color:#334155;border:1px dashed #cbd5e1;padding:8px;border-radius:6px;cursor:pointer;width:100%;font-size:0.85rem;font-weight:600;margin-top:8px;">+ Adicionar Ocorrência</button>
           <textarea id="trans-next" style="display:none;"></textarea>` 
          :
          `<div class="sac-field"><label>Próximos Passos <span style="color:#dc2626">*</span></label><textarea id="trans-next" rows="3" placeholder="O que será feito a seguir?" style="width:100%;padding:8px 10px;border:1.5px solid #e2e8f0;border-radius:6px;font-size:0.85rem;resize:vertical;box-sizing:border-box;outline:none;"></textarea></div>`
        ) +
        `${pt.targetStageId === 'execucao' ? '<div class="sac-field" style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:12px;margin-top:8px;"><label style="color:#c2410c;font-weight:700;display:block;margin-bottom:6px;"><i class=\'ph ph-calendar-check\'></i> Data/Hora Limite do Acompanhamento <span style=\'color:#dc2626\'>*</span></label><input type="datetime-local" id="trans-followup-deadline" style="width:100%;padding:8px 10px;border:1.5px solid #fed7aa;border-radius:6px;font-size:0.9rem;box-sizing:border-box;" min="' + new Date().toISOString().slice(0,16) + '"></div>' : ''}
        <textarea id="trans-obs" style="display:none;"></textarea>`) +
      `<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px;"><button class="sac-btn sac-btn-secondary" onclick="SAC.cancelTransition()">Cancelar</button><button class="sac-btn sac-btn-primary" onclick="SAC.confirmTransition()"><i class="ph ph-check-circle"></i> Confirmar Transição</button></div>
      </div>`;
    if (isAguard) setTimeout(() => SAC.filterTransUsers(_transForm.sector, _transForm.assignedUser), 0);
    if (pt.targetStageId === 'concluido') {
        window._transOccsState = (ticket && ticket.occurrences && ticket.occurrences.length > 0) 
            ? JSON.parse(JSON.stringify(ticket.occurrences))
            : [{ name: '', note: '' }];
        setTimeout(() => SAC.renderTransOccsRows(), 0);
    }
  }

  // ── PERMISSIONS ───────────────────────────────────────────────
  function canMoveTicket(t) {
    const perms = window.activeUserPerms || {};
    const isTopAdmin = window.isTopAdmin || false;
    const canSeeAll = isTopAdmin || (perms['sac'] === true && perms['sac-atribuidos'] !== true);
    return canSeeAll;
  }

  // ── FILTRAGEM ─────────────────────────────────────────────────
  function getFilteredTickets() {
    const s = _searchTerm.toLowerCase();
    const cu = window.currentUser;
    const perms = window.activeUserPerms || {};
    const isTopAdmin = window.isTopAdmin || false;
    const canSeeAll = isTopAdmin || (perms['sac'] === true && perms['sac-atribuidos'] !== true);
    const canSeeAssigned = !canSeeAll && (perms['sac-atribuidos'] === true || perms['sac'] === true);

    const currUsername = currentUsername();
    const currNome = (cu ? (cu.nome || '') : '').toLowerCase();
    let currUserId = null;
    try { const u = JSON.parse(localStorage.getItem('erp_user')||'{}'); currUserId = String(u.id); } catch(e){}
    const deptMap = { 'Logística': 'logisticsTask', 'Comercial': 'commercialTask', 'Financeiro': 'financialTask' };
    const myManagedDepts = _globalDepartamentos
      .filter(d => {
        const clean = s => (s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
        // Match por ID de usuario (mais confiavel - vem do JOIN no backend)
        const respUserId = (d.responsavel_usuario_id || '').toString().trim();
        // Match por username (vem do JOIN com tabela usuarios)
        const respUsernameClean = clean(d.responsavel_username);
        // Match por nome (fallback)
        const respNomeClean = clean(d.responsavel_nome);
        
        const currNomeClean = clean(cu ? cu.nome : '');
        const currUsernameClean = clean(currUsername);
        
        return (currUserId && respUserId && respUserId === currUserId) ||
               (currUsernameClean && respUsernameClean && respUsernameClean === currUsernameClean) ||
               (currNomeClean && respNomeClean && (respNomeClean === currNomeClean || respNomeClean.includes(currNomeClean) || currNomeClean.includes(respNomeClean)) && currNomeClean.length > 3);
      })
      .map(d => (d.nome || '').trim());

    return _tickets.filter(t => {
      const matchSearch = !s ||
        t.protocol.toLowerCase().includes(s) ||
        (t.osNumber||'').toLowerCase().includes(s) ||
        t.clientName.toLowerCase().includes(s) ||
        (t.equipment||'').toLowerCase().includes(s) ||
        (t.cnpjCpf||'').includes(s) ||
        (t.occurrences||[]).some(o => o.name.toLowerCase().includes(s) || (o.note||'').toLowerCase().includes(s));
      const matchType = _filterType === 'all' || t.typeKey === _filterType;
      const matchUrgent = !_filterUrgent || t.isUrgent;

      const fa = _filterAssigned.toLowerCase().trim();
      const matchAssigned = !fa || [
        t.logisticsTask?.assignedToName,
        t.logisticsTask?.assignedTo,
        t.commercialTask?.assignedToName,
        t.commercialTask?.assignedTo,
        t.financialTask?.assignedToName,
        t.financialTask?.assignedTo,
      ].some(v => v && v.toLowerCase().includes(fa));

      let matchDate = true;
      if (_filterDateStart || _filterDateEnd) {
        let compareMs = 0;
        if (_filterDateType === 'abertura') {
          compareMs = new Date(_normDate(t.openDate || '')).getTime() || 0;
        } else if (_filterDateType === 'sla') {
          const sla = getSLADetails(t);
          compareMs = sla.deadlineMs || 0;
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
        let actualUsernameLower = cuLower;
        try {
            const u = JSON.parse(localStorage.getItem('erp_user'));
            if (u) {
                const possibleId = u.username || u.login || u.email || (u.nome || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '.');
                if (possibleId) actualUsernameLower = possibleId.toLowerCase();
            }
        } catch(e) {}

        const isAssigned = (t.logisticsTask && t.logisticsTask.assignedTo && t.logisticsTask.assignedTo.toLowerCase() === actualUsernameLower) ||
                           (t.commercialTask && t.commercialTask.assignedTo && t.commercialTask.assignedTo.toLowerCase() === actualUsernameLower) ||
                           (t.financialTask && t.financialTask.assignedTo && t.financialTask.assignedTo.toLowerCase() === actualUsernameLower);
        const isCreator = t.timeline && t.timeline.length > 0 && t.timeline[0].user && t.timeline[0].user.toLowerCase() === cuLower;
        const wasEverAssigned = isAssigned || (t.logisticsTask && t.logisticsTask.history && t.logisticsTask.history.some(h => h.assignedTo && h.assignedTo.toLowerCase() === actualUsernameLower)) ||
                                (t.commercialTask && t.commercialTask.history && t.commercialTask.history.some(h => h.assignedTo && h.assignedTo.toLowerCase() === actualUsernameLower)) ||
                                (t.financialTask && t.financialTask.history && t.financialTask.history.some(h => h.assignedTo && h.assignedTo.toLowerCase() === actualUsernameLower));
        const isManagerOfTicket = myManagedDepts.length > 0 && myManagedDepts.some(dept => {
          const taskKey = deptMap[dept];
          return taskKey && t[taskKey];
        });
        matchPermission = isAssigned || wasEverAssigned || isCreator || isManagerOfTicket;
      }

      return matchSearch && matchType && matchUrgent && matchDate && matchAssigned && matchPermission;
    });
  }

  // ── DRAG & DROP ────────────────────────────────────────────────
  function onDragStart(e, id) {
    const t = _tickets.find(x => x.id === id);
    if (!t) return;
    if (t.stage === 'concluido') {
        e.preventDefault();
        showToast('Chamados concluídos não podem ser movidos.', 'warning');
        return;
    }
    if (!canMoveTicket(t)) {
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

    if (ticket.stage === 'aguardando_setores') {
        alert('Um chamado em "Aguardando Setores" n\u00e3o pode ser arrastado manualmente. Ele ser\u00e1 movido para "Respondido" automaticamente quando o respons\u00e1vel responder no card.');
        _draggedId = null;
        return;
    }

    if (colId === 'respondido') {
        alert('A coluna "Respondido" só é atingida automaticamente ao marcar uma Tarefa Setorial como Respondida.');
        _draggedId = null;
        return;
    }

    if (colId === 'concluido' && (!ticket.costCenters || ticket.costCenters.length === 0)) {
        alert('Bloqueio: É obrigatório lançar um Centro de Custo no botão roxo antes de concluir o chamado.\n\nSe não houver cobrança, selecione "Cliente (Não Cobrar do Cliente)" e coloque um valor simbólico (ex: 0.01).');
        _draggedId = null;
        return;
    }

    const gate = checkGate(ticket, colId);
    if (gate) {
      alert(`Bloqueio de Conformidade:\n\nEste chamado possui uma TAREFA DE ${gate.sector.toUpperCase()} pendente.\n"${gate.task}"\n\nConclua essa pendência antes de avançar.`);
      _draggedId = null;
      return;
    }

    openTransitionModal(_draggedId, colId);
    _draggedId = null;
  }

  function isChecklistComplete(ticket) {
    const cl = ticket.sacChecklist || {};
    if (!cl.q1 || cl.q1 < 1 || cl.q1 > 5) return false;
    if (ticket.logisticsTask && (!cl.q2 || cl.q2 < 1 || cl.q2 > 5)) return false;
    if (ticket.financialTask && (!cl.q3 || cl.q3 < 1 || cl.q3 > 5)) return false;
    if (ticket.commercialTask && (!cl.q4 || cl.q4 < 1 || cl.q4 > 5)) return false;
    if (!cl.q5 || cl.q5 < 1 || cl.q5 > 5) return false;
    if (!cl.q6) return false;
    if (!cl.q7) return false;
    // q8 is optional
    if (!cl.q9 || cl.q9 < 1 || cl.q9 > 5) return false;
    if (!cl.q10 || cl.q10 < 1 || cl.q10 > 5) return false;
    return true;
  }

  function checkGate(ticket, targetStageId) {
    const srcIdx = PIPELINE_STAGES.findIndex(s => s.id === ticket.stage);
    const tgtIdx = PIPELINE_STAGES.findIndex(s => s.id === targetStageId);
    if (tgtIdx > srcIdx) {
      if (ticket.logisticsTask && !ticket.logisticsTask.isCompleted) return { sector:'Logística', task: ticket.logisticsTask.name };
      if (ticket.commercialTask && !ticket.commercialTask.isCompleted) return { sector:'Comercial', task: ticket.commercialTask.name };
      if (ticket.financialTask  && !ticket.financialTask.isCompleted)  return { sector:'Financeiro',  task: ticket.financialTask.name };
    }
    if (targetStageId === 'concluido' && !isChecklistComplete(ticket)) {
      return { sector:'SAC', task: 'Preenchimento do Check-list Obrigatório' };
    }
    return null;
  }

  // ── AÇÕES PÚBLICO ─────────────────────────────────────────────
  const SAC = window.SAC = {
    renderTransOccsRows() {
      const container = document.getElementById('trans-concluido-occs');
      if (!container) return;
      
      const pt = _pendingTransition;
      const ticket = _tickets.find(t => t.id === pt.ticketId);
      const typeKey = ticket ? ticket.typeKey : '';
      const opts = (window._sacOccurrencesRaw||[]).filter(o => o.type_key === typeKey);
      
      const state = window._transOccsState || [];
      
      let html = '';
      state.forEach((item, idx) => {
        const selOpts = opts.map(o => `<option value="${o.description}" ${o.description === item.name ? 'selected' : ''}>${o.description}</option>`).join('');
        html += `
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin-bottom:8px;position:relative;">
            ${state.length > 1 ? `<button onclick="SAC.removeTransOccRow(${idx})" style="position:absolute;top:10px;right:10px;background:none;border:none;color:#ef4444;cursor:pointer;"><i class="ph ph-trash"></i></button>` : ''}
            <div style="margin-bottom:8px;">
              <label style="font-size:0.75rem;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">Ocorrência <span style="color:#dc2626">*</span></label>
              <select onchange="window._transOccsState[${idx}].name=this.value" style="width:100%;padding:6px 10px;border:1px solid #cbd5e1;border-radius:4px;font-size:0.85rem;outline:none;">
                <option value="">Selecione...</option>
                ${selOpts}
              </select>
            </div>
            <div>
              <label style="font-size:0.75rem;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">Informações de conclusão <span style="color:#dc2626">*</span></label>
              <textarea onchange="window._transOccsState[${idx}].note=this.value" rows="2" placeholder="Descreva os próximos passos ou resolução..." style="width:100%;padding:6px 10px;border:1px solid #cbd5e1;border-radius:4px;font-size:0.85rem;resize:vertical;outline:none;">${item.note}</textarea>
            </div>
          </div>
        `;
      });
      container.innerHTML = html;
    },
    addTransOccRow() {
      window._transOccsState = window._transOccsState || [];
      window._transOccsState.push({ name: '', note: '' });
      SAC.renderTransOccsRows();
    },
    removeTransOccRow(idx) {
      if (window._transOccsState && window._transOccsState.length > 1) {
        window._transOccsState.splice(idx, 1);
        SAC.renderTransOccsRows();
      }
    },
    async refreshData() {
      const btn = document.querySelector('button[onclick="SAC.refreshData()"]');
      if (btn) btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i>';
      await loadTickets();
      renderAll();
      showToast('Dados atualizados', 'success');
      if (btn) btn.innerHTML = '<i class="ph ph-arrows-clockwise"></i>';
    },
    async duplicateTicket(id) {
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
      }
    },
    setView(v)    { _view = v; renderAll(); },
    onSearch(v)   { _searchTerm = v; renderAll(); },
    onFilterType(v){ _filterType = v; renderAll(); },
    onFilterDateType(v){ _filterDateType = v; renderAll(); },
    onFilterDate(start, end){ _filterDateStart = start; _filterDateEnd = end; renderAll(); },
    onFilterUrgent(checked){ _filterUrgent = checked; renderAll(); },
    onFilterAssigned(v) {
      _filterAssigned = v;
      const clearBtn = document.getElementById('sac-filter-assigned-clear');
      if (clearBtn) clearBtn.style.display = v ? 'block' : 'none';
      renderAll();
    },
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
    wizAddContact() { _wiz.contacts.push({ id: Date.now(), type: 'Contato de Instalação', name: '', phone: '', email: '' }); renderWizard(); },
    wizUpdateContact(id, field, value) { const c = _wiz.contacts.find(x => x.id === id); if (c) c[field] = value; },
    wizRemoveContact(id) { if (_wiz.contacts.length <= 1) { showToast('Mínimo 1 contato.', 'warning'); return; } _wiz.contacts = _wiz.contacts.filter(x => x.id !== id); renderWizard(); },
    async wizSubmit() {
      if (!_wiz.clientName.trim()||!_wiz.equipment.trim()) { showToast('Dados obrigatórios ausentes.','warning'); return; }
      if (_wiz.contacts.some(c => !c.name.trim()) || !_wiz.description.trim()) { showToast('Preencha os campos obrigatórios (*).','warning'); return; }

      const btn = document.getElementById('wiz-submit-btn');
      if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Criando...'; }

      try {
        let finalAttachments = _wiz.attachments || [];

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
          contacts: _wiz.contacts.map(c => ({ ...c, name: c.name.trim(), phone: c.phone.trim(), email: c.email.trim() })),
          // Fallback fields for older systems / compatibility if ever read directly
          contactName: _wiz.contacts[0].name.trim(),
          contactPhone: _wiz.contacts[0].phone.trim(),
          contactEmail: _wiz.contacts[0].email.trim(),
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

        fetch('/api/sac/notificar-novo-chamado', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('erp_token')||localStorage.getItem('token')}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticketId: newTicket.id, protocol: proto, client: newTicket.clientName })
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
      if (_selectedTicket) {
        const pendingTipo = localStorage.getItem('sac_pending_popup_' + _selectedTicket.id);
        if (pendingTipo) {
          const u = currentUsername().toLowerCase();
          const permsNowX = window.activeUserPerms || {};
          const isTopAdminX = window.isTopAdmin || false;
          const canSeeAllNowX = isTopAdminX || (permsNowX['sac'] === true && permsNowX['sac-atribuidos'] !== true);
          
          const isCloserByList = POPUP_CLOSERS.some(x => x.toLowerCase() === u || x.toLowerCase() === u.replace(/\s+/g, '.'));
          const gestorRequiredClose = localStorage.getItem('sac_popup_gestor_required_' + _selectedTicket.id) === '1';
          const canClose = isCloserByList || !gestorRequiredClose;
          if (!canClose) {
            showToast('Preencha a justificativa obrigatória antes de fechar.', 'warning');
            return;
          } else {
            _selectedTicket.slaOverduePendingJustification = false;
            if (pendingTipo === 'aguard') _selectedTicket.aguardPendingJustification = false;
            if (pendingTipo === 'followup') _selectedTicket.followUpPendingJustification = false;
            updateTicket(_selectedTicket);
            localStorage.removeItem('sac_popup_gestor_required_' + _selectedTicket.id);
            localStorage.removeItem('sac_pending_popup_' + _selectedTicket.id);
          }
        }
      }
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
      if (targetId === 'respondido') {
          alert('A coluna "Respondido" só é atingida automaticamente ao marcar uma Tarefa Setorial como Respondida.');
          renderDetailModal();
          return;
      }
      if (targetId === 'concluido' && (!t.costCenters || t.costCenters.length === 0)) {
          alert('Bloqueio: É obrigatório lançar um Centro de Custo no botão roxo antes de concluir o chamado.\n\nSe não houver cobrança, selecione "Cliente (Não Cobrar do Cliente)" e coloque um valor simbólico (ex: 0.01).');
          renderDetailModal();
          return;
      }
      const gate = checkGate(t, targetId);
      if (gate) { alert(`Bloqueio: Pendência ${gate.sector} não concluída.\n${gate.task}`); renderDetailModal(); return; }
      openTransitionModal(t.id, targetId);
    },
    changeTaskAssignment(key, newUsername) {
      const t = _selectedTicket;
      if (!t || !t[key]) return;
      const usersList = window._sacUsersList || [];
      const normalizeId = str => (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '.');
      
      const user = usersList.find(u => (u.username||u.login||u.email||normalizeId(u.nome)) === newUsername);
      const previousAssignee = t[key].assignedTo;
      
      // -- Transferência de setor baseada no departamento do novo usuário --
      let targetKey = key;
      let newGestorSetor = t.gestorSetor;
      
      if (user && newUsername) {
         const uDept = (user.departamento || '').toLowerCase();
         const isManagerOf = (_globalDepartamentos||[]).find(d => ['Logística','Comercial','Financeiro'].includes(d.nome) && d.responsavel_nome && d.responsavel_nome.toLowerCase() === (user.nome||'').toLowerCase());
         
         let determinedDept = '';
         if (isManagerOf) {
             determinedDept = isManagerOf.nome;
         } else if (uDept.includes('logística') || uDept.includes('logistica')) {
             determinedDept = 'Logística';
         } else if (uDept.includes('comercial')) {
             determinedDept = 'Comercial';
         } else if (uDept.includes('financeiro')) {
             determinedDept = 'Financeiro';
         }
         
         const mapDepts = { 'Logística': 'logisticsTask', 'Comercial': 'commercialTask', 'Financeiro': 'financialTask' };
         
         if (determinedDept && mapDepts[determinedDept] && mapDepts[determinedDept] !== key) {
             targetKey = mapDepts[determinedDept];
             
             // Cria a nova tarefa no novo setor
             t[targetKey] = {
                 name: `Pendente: ${determinedDept} - aguardando resposta.`,
                 isCompleted: false,
                 feedback: '',
                 history: t[key].history || [],
                 assignedTo: newUsername,
                 assignedToName: user.nome || user.name || user.username,
                 assignedToPhoto: user.foto || user.photo || user.foto_colaborador || ''
             };
             
             // Timeline
             t.timeline = t.timeline || [];
             t.timeline.push({
                 stage: t.stage,
                 time: new Date().toISOString(),
                 notes: `Tarefa transferida de ${key.replace('Task','')} para ${determinedDept} (Atribuído a ${user.nome}).`,
                 user: { id: window.currentUser ? window.currentUser.id : '', nome: currentUsername() }
             });
             
             // Novo Gestor
             const novoGestor = (_globalDepartamentos||[]).find(d => d.nome === determinedDept);
             if (novoGestor && novoGestor.responsavel_nome) {
                 const gestorUser = usersList.find(u => (u.nome||'').toLowerCase() === novoGestor.responsavel_nome.toLowerCase());
                 if (gestorUser) {
                     newGestorSetor = {
                         id: gestorUser.id,
                         login: gestorUser.username || gestorUser.login || gestorUser.email,
                         nome: gestorUser.nome
                     };
                 }
             }
             
             // Remove a tarefa antiga
             t[key] = null;
         }
      }

      if (targetKey === key) {
          // Mesmo setor
          t[key] = {
            ...t[key],
            assignedTo: newUsername || null,
            assignedToName: user ? (user.nome||user.name||user.username) : newUsername,
            assignedToPhoto: user ? (user.foto||user.photo||user.foto_colaborador||'') : ''
          };
      }
      
      if (newGestorSetor) {
          t.gestorSetor = newGestorSetor;
      }
      
      updateTicket(t);
      showToast(`Atribuição de ${targetKey.replace('Task','')} atualizada.`, 'success');
      
      if (newUsername && newUsername !== previousAssignee) {
        const token = localStorage.getItem('erp_token')||localStorage.getItem('token');
        fetch('/api/sac/notificar-atribuicao', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ticketId: t.id,
            protocol: t.protocol,
            clientName: t.clientName,
            setor: targetKey.replace('Task',''),
            assignedUsername: newUsername,
            assignedUserNome: user ? (user.nome||user.name||user.username) : newUsername
          })
        }).catch(e => console.error('[SAC] Erro ao notificar atribuicao:', e));
      }
    },
    deleteTicket(id) {
      const pwd = prompt('Digite a senha para excluir permanentemente esta OS:');
      if (pwd !== 'abc') {
          if (pwd !== null) showToast('Senha incorreta.', 'error');
          return;
      }
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
          _tickets = _tickets.filter(t => t.id !== id);
          SAC.closeModal({ target: document.getElementById('sac-modal-overlay') });
          showToast('OS excluída (modo local).','warning');
          renderAll();
        });
    },
    toggleUrgent(id, isUrgent) {
      const t = _tickets.find(x => x.id === id);
      if (!t) return;
      t.isUrgent = isUrgent;
      updateTicket(t);
      if (isUrgent) {
         showToast('Marcado como urgente!', 'warning');
      }
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
    async addComment(ticketId) {
      let tLocal = _tickets.find(x => x.id === ticketId);
      if (!tLocal) return;
      const textInput = document.getElementById('new-comment-text');
      const text = textInput ? textInput.value.trim() : '';
      if (!text) return;

      const token = localStorage.getItem('erp_token')||localStorage.getItem('token');
      let t = tLocal;
      try {
          const resp = await fetch('/api/sac/tickets/' + ticketId, { headers: { 'Authorization': `Bearer ${token}` } });
          if (resp.ok) {
              t = await resp.json();
          }
      } catch (e) { console.error('Erro ao buscar versão mais recente do ticket', e); }

      const user = currentUsername();
      if (!t.comments) t.comments = [];
      let isHandled = false;
      const pendingTipo = localStorage.getItem('sac_pending_popup_' + t.id);
      const isGestorJustifying = pendingTipo && localStorage.getItem('sac_popup_gestor_required_' + t.id) === '1';

      if (isGestorJustifying) {
          const typeLabel = pendingTipo === 'followup' ? 'prazo de acompanhamento' : pendingTipo === 'aguard' ? 'prazo de aguardo de setor' : 'SLA';
          const justTimestamp = new Date().toISOString();
          
          if (pendingTipo !== 'aguard') {
              t.comments.push({ user: 'Sistema', text: '\u{1F4DD} Justificativa (' + typeLabel + ' vencido): <b>"' + text + '"</b>', time: justTimestamp });
          }

          if (pendingTipo === 'followup') {
              isHandled = true;
              t.stage = 'triagem';
              t.slaFrozenAt = null;
              t.followUpDeadline = null;
              t.followUpPendingJustification = false;
              
              t.isUrgent = true;
              if (!t.tags) t.tags = [];
              if (!t.tags.includes('Reagendamento')) t.tags.push('Reagendamento');

              t.timeline.push({ stage: 'triagem', time: justTimestamp, notes: 'Retorno autom\u00e1tico: prazo de acompanhamento vencido. Justificativa registrada.', user: null });
              localStorage.removeItem('sac_pending_popup_' + t.id);
              showToast('Justificativa registrada com sucesso.', 'success');
              setTimeout(() => { SAC.closeModal(); }, 100);
          } else if (pendingTipo === 'aguard') {
              // Apenas registra a justificativa na timeline e mantém o chamado em 'aguardando_setores'.
              isHandled = true;
              t.aguardPendingJustification = false;
              // CRÍTICO: remover localStorage ANTES de qualquer re-render para evitar loop infinito
              localStorage.removeItem('sac_pending_popup_' + t.id);
              t.timeline.push({ stage: t.stage, time: justTimestamp, notes: 'Justificativa de atraso registrada: "' + text + '"', user });
              // Fechar popup obrigatório se ainda estiver na tela
              const popupEl = document.getElementById('sac-mandatory-popup-' + t.id);
              if (popupEl) popupEl.remove();
              // Salva ANTES de reabrir o modal para garantir persistência
              await updateTicket(t);
              if (textInput) textInput.value = '';
              showToast('Justificativa registrada com sucesso.', 'success');
              setTimeout(() => { SAC.closeModal(); }, 100);
              return;
          } else {
              isHandled = true;
              t.slaOverduePendingJustification = false;
              localStorage.removeItem('sac_pending_popup_' + t.id);
              showToast('Justificativa registrada com sucesso.', 'success');
              setTimeout(() => { SAC.closeModal(); }, 100);
          }
      }

      if (!isHandled && t.stage === 'aguardando_setores') {
         // Recalcular myManagedDepts com a mesma l\u00f3gica de visibilidade (garantia de consist\u00eancia)
         let cUserIdNow = null;
         let currNomeNow = '';
         try { const u = JSON.parse(localStorage.getItem('erp_user')||'{}'); cUserIdNow = String(u.id); currNomeNow = (u.nome||'').toLowerCase(); } catch(e){}
         const cu2 = window.currentUser;
         const currNomeWindow = (cu2 ? (cu2.nome || '') : '').toLowerCase();
         const effectiveNome = currNomeNow || currNomeWindow;

         // Extrair o username real do usuário logado (ANTES do filtro de departamentos)
         // currentUsername() retorna u.nome||u.username — pode ser o nome de exibição.
         // O assignedTo guarda o login real (ex: beatriz.batista). Usar erp_user.username.
         let usernameActual = (user || '').toLowerCase().trim();
         try {
             const uu = JSON.parse(localStorage.getItem('erp_user')||'{}');
             const realLogin = (uu.username || uu.login || '').toLowerCase().trim();
             if (realLogin) usernameActual = realLogin;
         } catch(e){}

         const myDeptsNow = _globalDepartamentos.filter(d => {
             const respId   = (d.responsavel_id || '').toString().trim();
             const respNome = (d.responsavel_nome || '').toLowerCase();
             const respLogin = (d.responsavel_login || d.responsavel_username || '').toLowerCase();
             return (cUserIdNow && respId && respId === cUserIdNow) ||
                    (usernameActual && respLogin && respLogin === usernameActual) ||
                    (effectiveNome && respNome && respNome === effectiveNome) ||
                    (effectiveNome && respNome && respNome.includes(effectiveNome) && effectiveNome.length > 5);
         }).map(d => (d.nome || '').trim());

         const deptMapLocal = { 'Logística': 'logisticsTask', 'Comercial': 'commercialTask', 'Financeiro': 'financialTask' };

         // Usuário é o atribuído diretamente?
         const isAssigned = ['logisticsTask','commercialTask','financialTask'].some(k => {
             const task = t[k];
             if (!task || !task.assignedTo) return false;
             const a = task.assignedTo.toLowerCase().trim();
             return a === usernameActual;
         });

         // Usuário é o gestor gravado no ticket quando foi atribuído?
         const gs = t.gestorSetor;
         const isGestorByTicket = gs && (
             (cUserIdNow && gs.id && gs.id === cUserIdNow) ||
             (usernameActual && gs.login && gs.login === usernameActual) ||
             (() => {
                 if (!effectiveNome || !gs.nome) return false;
                 const clean = s => (s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
                 const normCurr = clean(effectiveNome);
                 const normGs = clean(gs.nome);
                 return normGs && normCurr && (normGs === normCurr || normGs.includes(normCurr) || normCurr.includes(normGs));
             })()
         );

         // Usu\u00e1rio \u00e9 gestor do departamento do chamado via _globalDepartamentos?
         const isGestorOfTicket = myDeptsNow.length > 0 && myDeptsNow.some(deptName => {
             const taskKey = deptMapLocal[deptName];
             return taskKey && t[taskKey] && !t[taskKey].isCompleted;
         });

         // Gestor via permissão SAC restrita (mesma lógica do popup) — funciona mesmo quando
         // _globalDepartamentos tem dados nulos no banco (caso do Comercial da Beatriz)
         const permsForComment = window.activeUserPerms || {};
         const isTopAdminForComment = window.isTopAdmin || false;
         const canSeeAllForComment = isTopAdminForComment || (permsForComment['sac'] === true && permsForComment['sac-atribuidos'] !== true);
         const isGestorBySacPerm = (permsForComment['sac'] === true || permsForComment['sac-atribuidos'] === true) && !canSeeAllForComment;

         if (isAssigned || isGestorByTicket || isGestorOfTicket || isGestorBySacPerm) {
             isHandled = true;
             const nowTs = new Date().toISOString();
             t.stage = 'respondido';
             t.timeline.push({ stage: 'respondido', time: nowTs, notes: 'Respondido via comentário: "' + text + '"', user });
             // Comentário inserido no bloco roxo, removemos a duplicação no quadro branco
             ['logisticsTask','commercialTask','financialTask'].forEach(k => {
                 if (t[k] && !t[k].isCompleted) {
                     t[k].isCompleted = true;
                     t[k].feedback = text;
                     t[k].history = [...(t[k].history||[]), { type:'resolution', time: nowTs, feedback: text, user }];
                 }
             });
             // Salva ANTES de fechar o modal para garantir persistência
             await updateTicket(t);
             if (textInput) textInput.value = '';
             showToast('OS ' + t.protocol + ' respondida e movida para Respondido!', 'success');
             SAC.closeModal();
             return;
         }
      }

      if (!isHandled) {
          t.comments.push({ user, text, time: new Date().toISOString() });
      }

      updateTicket(t);
      if (textInput) textInput.value = '';
      
      // Atualizar o modal para mostrar o novo comentário
      if (!isHandled) {
          SAC.openDetail(t.id);
      }
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
      const sector  = document.getElementById('cc-sector')?.value||'Cliente (Cobrar do Cliente)';
      const valor   = parseFloat(document.getElementById('cc-valor')?.value||0);
      const motivo  = document.getElementById('cc-motivo')?.value?.trim()||'';
      
      const responsibleUserSelect = document.getElementById('cc-responsible-user');
      let responsibleUser = null;
      let responsiblePhoto = null;
      let responsibleName = null;
      if (responsibleUserSelect && responsibleUserSelect.value) {
          responsibleUser = responsibleUserSelect.value;
          const opt = responsibleUserSelect.options[responsibleUserSelect.selectedIndex];
          responsiblePhoto = opt.getAttribute('data-photo');
          responsibleName = opt.getAttribute('data-name');
      }

      if (isNaN(valor) || valor < 0) { showToast('Informe um valor válido (pode ser zero).','warning'); return false; }
      if (!motivo)  { showToast('Informe o motivo do custo.','warning'); return false; }
      const cc = { id:'cc-'+Date.now(), sector, lossValue:valor, reason:motivo, hasBilling:false, responsibleUser, responsibleName, responsiblePhoto };
      t.costCenters = [...(t.costCenters||[]), cc];
      
      updateTicket(t);
      showToast('Lançamento adicionado!','success');
      return true;
    },
    openEditContactsModal(ticketId) {
        const t = _tickets.find(x => x.id === ticketId);
        if (!t) return;
        window._modalContactsTicketId = ticketId;
        // fallback
        const initialContacts = (t.contacts && t.contacts.length > 0) ? t.contacts : [{ id: Date.now(), type: 'Contato de Instalação', name: t.contactName, phone: t.contactPhone, email: t.contactEmail }];
        window._modalContacts = JSON.parse(JSON.stringify(initialContacts)); // deep copy
        
        let overlay = document.getElementById('sac-edit-contacts-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'sac-edit-contacts-overlay';
            overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(2px);';
            document.body.appendChild(overlay);
        }
        
        SAC._renderContactsModal();
    },
    _renderContactsModal() {
        const overlay = document.getElementById('sac-edit-contacts-overlay');
        if (!overlay) return;
        
        overlay.innerHTML = `
            <div style="background:#fff;border-radius:12px;width:100%;max-width:600px;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 10px 25px rgba(0,0,0,0.15);overflow:hidden;">
                <!-- HEADER -->
                <div style="background:#f8fafc;border-bottom:1px solid #e2e8f0;padding:16px 20px;display:flex;justify-content:space-between;align-items:center;">
                    <div style="font-weight:700;font-size:1.05rem;color:#0f172a;display:flex;align-items:center;gap:8px;">
                        <i class="ph ph-users" style="color:#0369a1;font-size:1.2rem;"></i>
                        Editar Contatos
                    </div>
                    <button onclick="document.getElementById('sac-edit-contacts-overlay').remove()" style="background:transparent;border:none;cursor:pointer;color:#94a3b8;display:flex;align-items:center;justify-content:center;" onmouseover="this.style.color='#dc2626'" onmouseout="this.style.color='#94a3b8'">
                        <i class="ph ph-x" style="font-size:1.2rem;"></i>
                    </button>
                </div>
                
                <!-- BODY -->
                <div style="padding:20px;overflow-y:auto;flex:1;background:#fff;">
                    <div style="display:flex;justify-content:flex-end;margin-bottom:12px;">
                        <button onclick="SAC.addContactToModal()" style="background:#e0f2fe;color:#0369a1;border:1px solid #bae6fd;border-radius:6px;padding:6px 12px;font-size:0.8rem;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:4px;">
                            <i class="ph ph-plus"></i> Novo Contato
                        </button>
                    </div>
                    
                    <div style="display:flex;flex-direction:column;gap:16px;">
                        ${window._modalContacts.map((c, i) => `
                            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;position:relative;">
                                ${window._modalContacts.length > 1 ? `<button onclick="SAC.removeContactFromModal(${c.id})" style="position:absolute;top:8px;right:8px;background:transparent;border:none;color:#dc2626;cursor:pointer;" title="Remover Contato"><i class="ph ph-trash"></i></button>` : ''}
                                
                                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
                                    <div class="sac-field" style="margin-bottom:0;">
                                        <label style="font-size:0.75rem;color:#64748b;font-weight:600;display:block;margin-bottom:4px;">Tipo de Contato</label>
                                        <select onchange="SAC.updateContactInModal(${c.id}, 'type', this.value)" style="width:100%;padding:8px;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;">
                                            <option value="Contato de Instalação" ${c.type==='Contato de Instalação'?'selected':''}>Contato de Instalação</option>
                                            <option value="Contato Financeiro" ${c.type==='Contato Financeiro'?'selected':''}>Contato Financeiro</option>
                                            <option value="Contato de Contrato" ${c.type==='Contato de Contrato'?'selected':''}>Contato de Contrato</option>
                                        </select>
                                    </div>
                                    <div class="sac-field" style="margin-bottom:0;">
                                        <label style="font-size:0.75rem;color:#64748b;font-weight:600;display:block;margin-bottom:4px;">Nome <span style="color:#dc2626">*</span></label>
                                        <input type="text" value="${c.name||''}" placeholder="Nome completo" oninput="SAC.updateContactInModal(${c.id}, 'name', this.value)" style="width:100%;padding:8px;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;">
                                    </div>
                                </div>
                                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                                    <div class="sac-field" style="margin-bottom:0;">
                                        <label style="font-size:0.75rem;color:#64748b;font-weight:600;display:block;margin-bottom:4px;">Telefone</label>
                                        <input type="text" value="${c.phone||''}" placeholder="(XX) XXXXX-XXXX" oninput="SAC.updateContactInModal(${c.id}, 'phone', this.value)" style="width:100%;padding:8px;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;">
                                    </div>
                                    <div class="sac-field" style="margin-bottom:0;">
                                        <label style="font-size:0.75rem;color:#64748b;font-weight:600;display:block;margin-bottom:4px;">E-mail</label>
                                        <input type="email" value="${c.email||''}" placeholder="E-mail" oninput="SAC.updateContactInModal(${c.id}, 'email', this.value)" style="width:100%;padding:8px;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;">
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <!-- FOOTER -->
                <div style="background:#f1f5f9;border-top:1px solid #e2e8f0;padding:16px 20px;display:flex;justify-content:flex-end;gap:12px;">
                    <button onclick="document.getElementById('sac-edit-contacts-overlay').remove()" class="sac-btn sac-btn-secondary" style="background:#fff;">Cancelar</button>
                    <button onclick="SAC.saveContactsModal()" class="sac-btn sac-btn-primary"><i class="ph ph-check-circle"></i> Salvar Alterações</button>
                </div>
            </div>
        `;
    },
    addContactToModal() {
        if (!window._modalContacts) return;
        window._modalContacts.push({ id: Date.now(), type: 'Contato de Instalação', name: '', phone: '', email: '' });
        SAC._renderContactsModal();
    },
    removeContactFromModal(id) {
        if (!window._modalContacts) return;
        if (window._modalContacts.length <= 1) {
            showToast('O chamado precisa de pelo menos 1 contato.', 'warning');
            return;
        }
        window._modalContacts = window._modalContacts.filter(x => x.id !== id);
        SAC._renderContactsModal();
    },
    updateContactInModal(id, field, value) {
        if (!window._modalContacts) return;
        const c = window._modalContacts.find(x => x.id === id);
        if (c) c[field] = value;
    },
    saveContactsModal() {
        if (!window._modalContacts || !window._modalContactsTicketId) return;
        
        // Validation
        if (window._modalContacts.some(c => !c.name || !c.name.trim())) {
            showToast('Preencha o nome de todos os contatos.', 'warning');
            return;
        }
        
        const t = _tickets.find(x => x.id === window._modalContactsTicketId);
        if (!t) return;
        
        // Format and clean up
        t.contacts = window._modalContacts.map(c => ({ ...c, name: c.name.trim(), phone: (c.phone||'').trim(), email: (c.email||'').trim() }));
        
        // Update fallbacks for old readers just in case
        t.contactName = t.contacts[0].name;
        t.contactPhone = t.contacts[0].phone;
        t.contactEmail = t.contacts[0].email;
        
        updateTicket(t);
        
        // Refresh details modal if it's the open one
        if (_selectedTicket && _selectedTicket.id === t.id) {
            renderDetailModal();
        }
        
        document.getElementById('sac-edit-contacts-overlay').remove();
        showToast('Contatos atualizados com sucesso!', 'success');
    },
    removeCostCenter(ccId) {
      const t = _selectedTicket;
      if (!t) return;
      t.costCenters = (t.costCenters||[]).filter(c=>c.id!==ccId);
      updateTicket(t);
      showToast('Lançamento removido.','warning');
    },
    async onCostCenterSectorChange() {
      const sector = document.getElementById('cc-sector')?.value || '';
      const targetSectors = ['Logística (Interno)', 'Financeiro (Interno)', 'Comercial (Interno)', 'Motorista (Interno)'];
      const container = document.getElementById('cc-user-container');
      if (!container) return;

      if (targetSectors.includes(sector)) {
        const baseSector = sector.split(' (')[0]; 
        const normalizeStr = str => (str||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
        const deptKey = normalizeStr(baseSector);
        
        container.innerHTML = '<div style="margin-top:12px;font-size:0.8rem;color:#64748b;">Buscando colaboradores...</div>';
        container.style.display = 'block';
        
        try {
            const token = localStorage.getItem('erp_token') || localStorage.getItem('token');
            const res = await fetch(`/api/sac/colaboradores-por-setor?setor=${encodeURIComponent(baseSector)}&_t=${Date.now()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            let validUsers = [];
            if (res.ok) {
                validUsers = await res.json();
            }
            
            const managerName = (_globalDepartamentos || []).find(d => normalizeStr(d.nome) === deptKey)?.responsavel_nome;
            let manager = null;
            if (managerName) {
                const m = normalizeStr(managerName);
                const mFirst = m.split(' ')[0];
                manager = validUsers.find(u => {
                    const n = normalizeStr(u.nome || u.nome_completo || u.username || '');
                    if (!n) return false;
                    return n === m || n.includes(m) || m.includes(n) || (mFirst && n.startsWith(mFirst));
                });
                if (!manager) {
                    // Try to find in global _sacUsersList if not in sector list
                    const globalManager = (window._sacUsersList || []).find(u => {
                        const n = normalizeStr(u.nome || u.nome_completo || u.username || '');
                        if (!n) return false;
                        return n === m || n.includes(m) || m.includes(n) || (mFirst && n.startsWith(mFirst));
                    });
                    if (globalManager) {
                        manager = {
                            id: globalManager.id,
                            nome: globalManager.nome || globalManager.nome_completo || globalManager.username,
                            username: globalManager.username || globalManager.email,
                            foto_colaborador: globalManager.foto_colaborador || ''
                        };
                        validUsers.unshift(manager);
                    }
                }
            }
            
            // Ordenar alfabeticamente, mas garantir que o gestor (se existir) fique no topo
            validUsers.sort((a,b) => {
                if (manager && a.id === manager.id) return -1;
                if (manager && b.id === manager.id) return 1;
                const nameA = normalizeStr(a.nome || a.nome_completo || a.username || '');
                const nameB = normalizeStr(b.nome || b.nome_completo || b.username || '');
                return nameA.localeCompare(nameB);
            });

            let html = `
                <div style="margin-top:12px;">
                    <label style="font-size:0.75rem;color:#64748b;font-weight:600;display:block;margin-bottom:4px;white-space:nowrap;">Qual colaborador da ${baseSector} o custo se aplica?</label>
                    <div style="position:relative;">
                        <select id="cc-responsible-user" style="width:100%;padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:6px;font-size:0.85rem;background:#fff;appearance:none;cursor:pointer;" onchange="
                            const sel = this;
                            const opt = sel.options[sel.selectedIndex];
                            const photo = opt.getAttribute('data-photo');
                            const imgEl = document.getElementById('cc-user-photo-preview');
                            if (photo) {
                                imgEl.src = photo;
                                imgEl.style.display = 'block';
                            } else {
                                imgEl.style.display = 'none';
                            }
                        ">
                            <option value="">Selecione um colaborador...</option>
                            ${validUsers.map(u => `<option value="${u.username||u.nome||u.nome_completo}" data-photo="${u.foto_colaborador||u.foto_path||''}" data-name="${u.nome||u.nome_completo||u.username}">${u.nome||u.nome_completo||u.username} ${manager && u.id === manager.id ? '(Gestor)' : ''}</option>`).join('')}
                        </select>
                        <img id="cc-user-photo-preview" src="" style="width:24px;height:24px;border-radius:50%;object-fit:cover;position:absolute;right:32px;top:50%;transform:translateY(-50%);display:none;border:1px solid #cbd5e1;pointer-events:none;background:#fff;">
                        <i class="ph ph-caret-down" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);color:#94a3b8;pointer-events:none;"></i>
                    </div>
                </div>
            `;
            container.innerHTML = html;
        } catch (err) {
            console.error('Erro ao buscar colaboradores:', err);
            container.innerHTML = '<div style="margin-top:12px;font-size:0.8rem;color:#dc2626;">Erro ao carregar colaboradores.</div>';
        }
      } else {
        container.innerHTML = '';
        container.style.display = 'none';
      }
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
      const oldStageId = ticket.stage;

      let nextSteps  = (document.getElementById('trans-next')?.value||'').trim();
      let obs        = (document.getElementById('trans-obs')?.value||'').trim();
      let sector     = document.getElementById('trans-sector')?.value || 'Logística';
      let closeReason= document.getElementById('trans-closing-reason')?.value || 'Concluído';
      let clJust     = (document.getElementById('trans-cl-just')?.value||'').trim();

      if (pt.targetStageId === 'concluido') {
        const state = window._transOccsState || [];
        const missing = state.some(o => !o.name || !o.note || !o.note.trim());
        if (missing) {
          showToast('Preencha a Ocorrência e as Informações de conclusão para todos os itens.', 'warning');
          return;
        }
        nextSteps = state.map(o => `**${o.name}** - ${o.note.trim()}`).join('\n');
      }

      if (isClosing) {
        if (!obs) { showToast('O resumo de encerramento é obrigatório.','warning'); return; }
        if (hasUnchecked && !clJust) { showToast('Justificativa do checklist incompleto é obrigatória.','warning'); return; }
        if (hasUnchecked && clJust.length<10) { showToast('Justificativa muito curta (mín. 10 caracteres).','warning'); return; }
      } else {
        if (!nextSteps) { showToast('Os próximos passos são obrigatórios.','warning'); return; }
      }

      // Build logNotes — for execucao (Acompanhamento), put SLA info before Próximos passos
      const isExecucao = pt.targetStageId === 'execucao';
      let logNotes;
      if (isClosing) {
        logNotes = 'Encerramento: ' + closeReason + '. Resumo: "' + obs + '"' + (hasUnchecked ? ' | Justificativa checklist: "' + clJust + '"' : '');
      } else if (isExecucao) {
        // Will be completed after deadline is set below
        logNotes = pt.srcName + ' \u2192 ' + pt.tgtName;
      } else if (pt.targetStageId === 'concluido') {
        logNotes = pt.srcName + ' \u2192 ' + pt.tgtName + '. Informações de conclusão: \n' + nextSteps;
      } else {
        logNotes = pt.srcName + ' \u2192 ' + pt.tgtName + '. Pr\u00f3ximos passos: "' + nextSteps + '"' + (obs ? ' | Obs: "' + obs + '"' : '');
      }

      // ── execucao: capturar data limite e congelar SLA ──
      let followUpDeadlineVal = null;
      if (isExecucao) {
        followUpDeadlineVal = (document.getElementById('trans-followup-deadline')?.value || '').trim();
        if (!followUpDeadlineVal) { showToast('A data/hora limite do acompanhamento \u00e9 obrigat\u00f3ria.','warning'); return; }
        if (new Date(followUpDeadlineVal).getTime() <= Date.now()) { showToast('A data/hora limite deve ser no futuro.','warning'); return; }
      }
      ticket.stage = pt.targetStageId;
      ticket.nextSteps = isClosing ? 'Encerrado: ' + closeReason : nextSteps;
      if (isClosing) { ticket.closeDate = new Date().toISOString(); ticket.checklistJustification = clJust||null; }
      if (isExecucao) {
        const openedMs = new Date(_normDate(ticket.openDate)).getTime();
        ticket.slaFrozenAt = new Date().toISOString();
        ticket.slaElapsedMs = getSlaElapsedMs(openedMs, Date.now());
        ticket.followUpDeadline = new Date(followUpDeadlineVal).toISOString();
        ticket.followUpNotified = false;
        ticket.followUpPendingJustification = true;
        const dlFmt = new Date(followUpDeadlineVal).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
        logNotes += ' | SLA congelado. Acompanhamento at\u00e9 ' + dlFmt + '. Pr\u00f3ximos passos: "' + nextSteps + '"';
      } else if (ticket.slaFrozenAt && pt.targetStageId !== 'execucao') {
        if (oldStageId === 'execucao' && pt.targetStageId === 'triagem' && ticket.followUpDeadline) {
          if (new Date(ticket.followUpDeadline).getTime() < Date.now()) {
            ticket.isUrgent = true;
            if (!ticket.tags) ticket.tags = [];
            if (!ticket.tags.includes('Reagendamento')) ticket.tags.push('Reagendamento');
          }
        }
        ticket.slaFrozenAt = null;
        ticket.followUpDeadline = null;
        ticket.followUpPendingJustification = false;
      }
      ticket.timeline.push({ stage:pt.targetStageId, time:new Date().toISOString(), notes:logNotes, user });
      if (!ticket.comments) ticket.comments = [];

      if (pt.targetStageId === 'concluido') {
        const state = window._transOccsState || [];
        ticket.occurrences = state.map(s => {
           const exist = (ticket.occurrences||[]).find(o => o.name === s.name);
           return { name: s.name, note: s.note.trim(), images: exist ? exist.images : [] };
        });
      }

      if (isAguard) {
        const userSelect = document.getElementById('trans-assigned-user');
        const assignedUsername = userSelect?.value || '';
        const assignedUserNome = userSelect?.options[userSelect.selectedIndex]?.text || '';
        const assignedUserPhoto = userSelect?.options[userSelect.selectedIndex]?.dataset.photo || '';
        
        if (!assignedUsername) { showToast('Selecione o usuário atribuído.', 'warning'); return; }

        ticket.logisticsTask  = sector==='Logística'  ? { name:`Pendente: Logística — aguardando resposta.`, isCompleted:false, feedback:'', history:[], assignedTo: assignedUsername, assignedToName: assignedUserNome, assignedToPhoto: assignedUserPhoto } : null;
        ticket.commercialTask = sector==='Comercial'  ? { name:`Pendente: Comercial — aguardando resposta.`, isCompleted:false, feedback:'', history:[], assignedTo: assignedUsername, assignedToName: assignedUserNome, assignedToPhoto: assignedUserPhoto } : null;
        ticket.financialTask  = sector==='Financeiro' ? { name:`Pendente: Financeiro — aguardando resposta.`, isCompleted:false, feedback:'', history:[], assignedTo: assignedUsername, assignedToName: assignedUserNome, assignedToPhoto: assignedUserPhoto } : null;
        // Prazo de 2h úteis (Seg-Sex 08h-17h) — congela fora do horário comercial e fins de semana
        ticket.aguardDeadline = addBusinessHours(new Date(), 2 * 60 * 1000).toISOString();
        ticket.aguardNotified = false;
        ticket.aguardPendingJustification = true;

        const token = localStorage.getItem('erp_token')||localStorage.getItem('token');
        fetch('/api/sac/notificar-atribuicao', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ticketId: ticket.id,
            protocol: ticket.protocol,
            clientName: ticket.clientName,
            setor: sector,
            assignedUsername: assignedUsername,
            assignedUserNome: assignedUserNome
          })
        }).catch(e => console.error('[SAC] Erro ao notificar atribuicao na transicao:', e));
      }

      updateTicket(ticket);
      _pendingTransition = null;
      document.getElementById('sac-trans-overlay').style.display='none';
      showToast(`OS ${ticket.protocol} movida para "${pt.tgtName}"!`,'success');
      renderAll();
    },
    // confirmMandatoryJustification removed
        saveDescription(ticketId) {
        const t = _tickets.find(x => x.id === ticketId);
        if (!t) return;
        const txt = document.getElementById('modal-desc-edit-' + ticketId);
        if (!txt) return;
        const newDesc = txt.value.trim();
        const oldDesc = t.description || '';
        
        if (newDesc === oldDesc.trim()) {
            showToast('Nenhuma alteração na descrição.', 'info');
            return;
        }

        const user = currentUsername();
        if (!t.comments) t.comments = [];
        
        // Log the old text and who changed it
        t.comments.push({ 
            user: 'Sistema', 
            text: '📝 Descrição editada por ' + user + '. Texto anterior:\n"' + (oldDesc || '(vazio)') + '"', 
            time: new Date().toISOString() 
        });

        t.description = newDesc;
        updateTicket(t);
        showToast('Descrição salva com sucesso!', 'success');
    },
    exportCSV() {
      const all = getFilteredTickets();
      const headers = ['Protocolo','OS Relacionada','Data Abertura','Cliente','CNPJ/CPF','Equipamento','Tipo','Etapa','SLA','Ocorrências'];
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
    bindUploadEvents() {
        [document.getElementById('sac-modal-dropzone'), document.getElementById('sac-wiz-dropzone')].forEach(dropzone => {
            if (!dropzone) return;
            dropzone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropzone.style.background = '#f0f9ff';
                dropzone.style.border = '2px dashed #3b82f6';
            });
            dropzone.addEventListener('dragleave', (e) => {
                e.preventDefault();
                dropzone.style.background = '#fff';
                dropzone.style.border = 'none';
            });
            dropzone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropzone.style.background = '#fff';
                dropzone.style.border = 'none';
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    if (dropzone.id === 'sac-wiz-dropzone') SAC.addWizardAttachments(e.dataTransfer.files);
                    else SAC.handleFileUpload(e.dataTransfer.files);
                }
            });
        });

        // Only register paste once to avoid multiple listeners
        if (!window._sacPasteBound) {
            window._sacPasteBound = true;
            document.addEventListener('paste', (e) => {
                const mc = document.getElementById('sac-modal-container');
                const wmc = document.getElementById('sac-wizard-overlay');
                if (mc && mc.style.display !== 'none' && e.clipboardData && e.clipboardData.files.length > 0) {
                    SAC.handleFileUpload(e.clipboardData.files);
                } else if (wmc && wmc.style.display !== 'none' && e.clipboardData && e.clipboardData.files.length > 0) {
                    SAC.addWizardAttachments(e.clipboardData.files);
                }
            });
        }
    },
    handleFileUpload(files) {
        if (!files || files.length === 0) return;
        SAC.addAttachments(files);
    },
    async addWizardAttachments(files) {
        if (!files || files.length === 0) return;
        const fd = new FormData();
        for (let f of files) fd.append('anexos', f);
        showToast('Enviando anexos...', 'info');
        try {
            const token = localStorage.getItem('erp_token') || localStorage.getItem('token');
            const r = await fetch('/api/sac/upload-anexos', { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: fd });
            if (r.ok) {
                const data = await r.json();
                _wiz.attachments = [...(_wiz.attachments||[]), ...(data.urls||[])];
                renderWizard();
                showToast('Anexos enviados com sucesso.', 'success');
            } else {
                showToast('Erro ao enviar anexos.', 'error');
            }
        } catch(e) {
            console.error(e);
            showToast('Erro de rede ao enviar anexos.', 'error');
        }
    },
    wizRemoveAttachment(key) {
        if (!key) return;
        if (confirm('Remover este anexo da lista?')) {
            _wiz.attachments = (_wiz.attachments||[]).filter(a => (a.r2Key||a.originalName||a.name||a.filename) !== key);
            renderWizard();
        }
    },
    openCustosModal() {
        const t = _selectedTicket;
        if (!t) return;
        
        let html = `
        <div class="sac-modal sac-animated" style="width:80vw;max-width:80vw;margin:20px auto;border-radius:12px;background:#fff;display:flex;flex-direction:column;position:relative;box-shadow:0 10px 25px rgba(0,0,0,0.1);padding:24px;" onclick="event.stopPropagation()">
            <div style="position:absolute;top:16px;right:16px;">
                <button onclick="document.getElementById('sac-custos-overlay').remove()" style="background:none;border:none;font-size:1.4rem;cursor:pointer;color:#94a3b8;line-height:1;">✕</button>
            </div>
            
            <div style="background:#f8fafc;border:1px dashed #cbd5e1;border-radius:8px;padding:16px;margin-bottom:20px;">
                <div style="font-size:0.75rem;font-weight:700;color:#64748b;margin-bottom:12px;text-transform:uppercase;">Lançar Novo Custo</div>
                <div style="display:flex;gap:12px;margin-bottom:12px;">
                    <div style="flex:1;">
                        <label style="font-size:0.75rem;color:#64748b;font-weight:600;display:block;margin-bottom:4px;">Setor / Responsável</label>
                        <select id="cc-sector" onchange="SAC.onCostCenterSectorChange()" style="width:100%;padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:6px;font-size:0.85rem;background:#fff;">
                            <option value="Cliente (Cobrar do Cliente)">Cliente (Cobrar do Cliente)</option>
                            <option value="Cliente (Não Cobrar do Cliente)">Cliente (Não Cobrar do Cliente)</option>
                            <option value="Setor Técnico (Interno)">Setor Técnico (Interno)</option>
                            <option value="Logística (Interno)">Logística (Interno)</option>
                            <option value="Comercial (Interno)">Comercial (Interno)</option>
                            <option value="Financeiro (Interno)">Financeiro (Interno)</option>
                            <option value="Pátio (Interno)">Pátio (Interno)</option>
                            <option value="Motorista (Interno)">Motorista (Interno)</option>
                            <option value="Outro Responsável">Outro Responsável</option>
                        </select>
                        <div id="cc-user-container" style="display:none;"></div>
                    </div>
                    <div style="width:140px;">
                        <label style="font-size:0.75rem;color:#64748b;font-weight:600;display:block;margin-bottom:4px;white-space:nowrap;">Valor do Prejuízo (R$)</label>
                        <input type="number" id="cc-valor" step="0.01" min="0" placeholder="Ex: 250" style="width:100%;padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:6px;font-size:0.85rem;">
                    </div>
                </div>
                <div style="display:flex;gap:12px;align-items:flex-end;">
                    <div style="flex:1;">
                        <label style="font-size:0.75rem;color:#64748b;font-weight:600;display:block;margin-bottom:4px;">Descrição do Motivo Financeiro</label>
                        <textarea id="cc-motivo" placeholder="Justificativa da avaria ou perda..." style="width:100%;padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:6px;font-size:0.85rem;resize:vertical;min-height:50px;font-family:inherit;"></textarea>
                    </div>
                    <div style="padding-bottom:2px;">
                        <button class="sac-btn sac-btn-primary" onclick="if(SAC.saveCostCenter()) { document.getElementById('sac-custos-overlay').remove(); SAC.openCustosModal(); }" style="height:50px;padding:0 24px;"><i class="ph ph-plus"></i> Adicionar</button>
                    </div>
                </div>
            </div>

            <div style="font-size:0.75rem;font-weight:700;color:#94a3b8;margin-bottom:12px;text-transform:uppercase;">Histórico de Custos</div>
            <div style="max-height:350px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;flex:1;">
                ${(t.costCenters||[]).length===0 ? '<div style="color:#94a3b8;font-size:0.85rem;text-align:center;padding:16px;">Nenhum custo lançado.</div>' : 
                [...(t.costCenters||[])].reverse().map(c => {
                    const isPositive = c.sector === 'Cliente (Cobrar do Cliente)';
                    const color = isPositive ? '#16a34a' : '#dc2626';
                    const sign = isPositive ? '+' : '-';
                    return `
                <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:12px;display:flex;justify-content:space-between;align-items:center;gap:12px;">
                    <div style="flex:1;">
                        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                            <span style="font-weight:700;font-size:0.85rem;color:#1e293b;">${c.sector}</span>
                            ${c.responsibleName ? `<div style="display:flex;align-items:center;gap:4px;background:#f1f5f9;padding:2px 8px;border-radius:12px;border:1px solid #e2e8f0;"><img src="${c.responsiblePhoto||''}" style="width:16px;height:16px;border-radius:50%;object-fit:cover;${c.responsiblePhoto?'':'display:none;'}"><span style="font-size:0.7rem;color:#475569;font-weight:600;">${c.responsibleName}</span></div>` : ''}
                        </div>
                        <div style="font-size:0.75rem;color:#64748b;">${c.reason}</div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-weight:800;font-size:0.95rem;color:${color};margin-bottom:4px;">${sign} R$ ${c.lossValue.toFixed(2)}</div>
                        <button style="background:none;border:none;color:#94a3b8;font-size:0.7rem;cursor:pointer;text-decoration:underline;" onclick="SAC.removeCostCenter('${c.id}'); document.getElementById('sac-custos-overlay').remove(); SAC.openCustosModal();">Remover</button>
                    </div>
                </div>
                `}).join('')}
            </div>
            
            ${(() => {
                const costs = t.costCenters || [];
                const totalPositive = costs.filter(c => c.sector === 'Cliente (Cobrar do Cliente)').reduce((a,b)=>a+b.lossValue,0);
                const totalNegative = costs.filter(c => c.sector !== 'Cliente (Cobrar do Cliente)').reduce((a,b)=>a+b.lossValue,0);
                
                let totalsHtml = '';
                if (totalPositive > 0 && totalNegative > 0) {
                    const balance = totalPositive - totalNegative;
                    const balanceColor = balance >= 0 ? '#16a34a' : '#dc2626';
                    totalsHtml = `
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                        <span style="font-size:0.85rem;color:#64748b;">Total Positivo (Receitas):</span>
                        <span style="font-weight:700;font-size:0.9rem;color:#16a34a;">+ R$ ${totalPositive.toFixed(2)}</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                        <span style="font-size:0.85rem;color:#64748b;">Total Negativo (Custos Internos):</span>
                        <span style="font-weight:700;font-size:0.9rem;color:#dc2626;">- R$ ${totalNegative.toFixed(2)}</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px dashed #cbd5e1;padding-top:8px;">
                        <span style="font-weight:700;font-size:0.95rem;color:#1e293b;">Saldo Final:</span>
                        <span style="font-weight:800;font-size:1.2rem;color:${balanceColor};">${balance >= 0 ? '+' : '-'} R$ ${Math.abs(balance).toFixed(2)}</span>
                    </div>`;
                } else if (totalPositive > 0) {
                    totalsHtml = `
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <span style="font-weight:700;font-size:0.95rem;color:#1e293b;">Total Positivo:</span>
                        <span style="font-weight:800;font-size:1.2rem;color:#16a34a;">+ R$ ${totalPositive.toFixed(2)}</span>
                    </div>`;
                } else if (totalNegative > 0) {
                    totalsHtml = `
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <span style="font-weight:700;font-size:0.95rem;color:#1e293b;">Total Negativo:</span>
                        <span style="font-weight:800;font-size:1.2rem;color:#dc2626;">- R$ ${totalNegative.toFixed(2)}</span>
                    </div>`;
                }
                
                return totalsHtml ? `<div style="margin-top:16px;padding:16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;">${totalsHtml}</div>` : '';
            })()}
        </div>
        `;
        
        let overlay = document.getElementById('sac-custos-overlay');
        if (overlay) overlay.remove();
        
        overlay = document.createElement('div');
        overlay.id = 'sac-custos-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.6);z-index:99999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(2px);';
        overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
        overlay.innerHTML = html;
        document.body.appendChild(overlay);
    },
    openChecklistModal() {
        const t = _selectedTicket;
        if (!t) return;
        
        const cl = t.sacChecklist || {};
        
        const renderRatingQuestion = (id, text, val) => {
            const colors = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e'];
            let btns = '';
            for(let i=1; i<=5; i++) {
                const sel = val == i;
                const c = colors[i-1];
                btns += `<label style="cursor:pointer;display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;font-weight:700;font-size:0.9rem;border:1.5px solid ${sel ? c : '#e2e8f0'};background:${sel ? c : '#fff'};color:${sel ? '#fff' : '#64748b'};transition:all 0.2s;">
                    <input type="radio" name="chk_${id}" value="${i}" ${sel ? 'checked' : ''} style="display:none;" onchange="
                        const labels = this.parentElement.parentElement.querySelectorAll('label');
                        labels.forEach(l => { l.style.background='#fff'; l.style.color='#64748b'; l.style.borderColor='#e2e8f0'; });
                        this.parentElement.style.background='${c}';
                        this.parentElement.style.color='#fff';
                        this.parentElement.style.borderColor='${c}';
                    ">
                    ${i}
                </label>`;
            }
            return `
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;">
                <div style="font-weight:600;font-size:0.9rem;color:#1e293b;margin-bottom:12px;">${text}</div>
                <div style="display:flex;gap:8px;align-items:center;">
                    ${btns}
                </div>
            </div>
            `;
        };

        const renderCheckboxQuestion = (id, text, checked) => {
            return `
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;">
                <label style="display:flex;align-items:center;gap:12px;cursor:pointer;font-weight:600;font-size:0.9rem;color:#1e293b;">
                    <input type="checkbox" id="chk_${id}" ${checked ? 'checked' : ''} style="width:18px;height:18px;accent-color:#0369a1;cursor:pointer;">
                    ${text}
                </label>
            </div>
            `;
        };

        let html = `
        <div class="sac-modal sac-animated" style="width:600px;max-width:90vw;max-height:85vh;margin:auto;border-radius:12px;background:#fff;display:flex;flex-direction:column;position:relative;box-shadow:0 10px 25px rgba(0,0,0,0.1);padding:24px;" onclick="event.stopPropagation()">
            <button onclick="document.getElementById('sac-checklist-overlay').remove()" style="position:absolute;top:16px;right:16px;background:none;border:none;font-size:1.5rem;color:#94a3b8;cursor:pointer;"><i class="ph ph-x"></i></button>
            
            <div style="font-size:1.2rem;font-weight:800;color:#1e293b;margin-bottom:16px;display:flex;align-items:center;gap:8px;">
                <i class="ph ph-list-checks" style="color:#0369a1;"></i> SAC Check-list
            </div>
            
            <div style="flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:12px;padding-right:8px;" class="custom-scroll">
                ${renderRatingQuestion('q1', '1. O tipo do chamado e ocorrência foram inseridas corretamente?', cl.q1)}
                ${t.logisticsTask ? renderRatingQuestion('q2', '2. A solicitação foi resolvida pela logística dentro do SLA?', cl.q2) : ''}
                ${t.financialTask ? renderRatingQuestion('q3', '3. A solicitação foi resolvida pelo financeiro dentro do SLA?', cl.q3) : ''}
                ${t.commercialTask ? renderRatingQuestion('q4', '4. A solicitação foi resolvida pelo comercial dentro do SLA?', cl.q4) : ''}
                ${renderRatingQuestion('q5', '5. Ações e ocorrências foram preenchidas corretamente na OS?', cl.q5)}
                
                ${renderRatingQuestion('q9', '6. O laudo relata claramente a ação executada e solução aplicada?', cl.q9)}
                ${renderRatingQuestion('q10', '7. O cliente foi atendido de maneira satisfatória?', cl.q10)}
                
                ${renderCheckboxQuestion('q6', '8. As evidências obrigatórias (fotos, B.O., avaria) foram inseridas?', cl.q6)}
                ${renderCheckboxQuestion('q7', '9. O cliente foi informado sobre todas as etapas até a conclusão?', cl.q7)}
                ${renderCheckboxQuestion('q8', '10. Houve necessidade de escalonamento para Diretoria?', cl.q8)}
            </div>
            
            <div style="margin-top:20px;display:flex;justify-content:flex-end;">
                <button class="sac-btn sac-btn-primary" onclick="SAC.saveChecklist();" style="padding:10px 24px;font-size:0.9rem;background:#0369a1;"><i class="ph ph-check"></i> Salvar Check-list</button>
            </div>
        </div>
        `;
        
        let overlay = document.getElementById('sac-checklist-overlay');
        if (overlay) overlay.remove();
        
        overlay = document.createElement('div');
        overlay.id = 'sac-checklist-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.6);z-index:99999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(2px);';
        overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
        overlay.innerHTML = html;
        document.body.appendChild(overlay);
    },
    saveChecklist() {
        const t = _selectedTicket;
        if (!t) return;
        
        const cl = {};
        
        ['q1','q2','q3','q4','q5','q9','q10'].forEach(q => {
            const sel = document.querySelector(`input[name="chk_${q}"]:checked`);
            if (sel) cl[q] = parseInt(sel.value);
        });
        
        ['q6','q7','q8'].forEach(q => {
            const chk = document.getElementById(`chk_${q}`);
            if (chk) cl[q] = chk.checked;
        });
        
        t.sacChecklist = cl;
        updateTicket(t);
        
        const ov = document.getElementById('sac-checklist-overlay');
        if (ov) ov.remove();
        showToast('Check-list salvo!','success');
    },
    // drag handlers públicos
    onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop
  };

  async function updateTicket(t, _retries = 0) {
    window._sacLastSaveMs = Date.now(); // Marca imediatamente para evitar auto-refresh durante o save
    _tickets = _tickets.map(x => x.id===t.id ? t : x);
    const token = localStorage.getItem('erp_token')||localStorage.getItem('token');
    try {
      const res = await fetch('/api/sac/tickets/'+t.id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(t)
      });
      if (!res.ok) {
        const errText = await res.text().catch(()=>'');
        console.error(`[SAC] Erro HTTP ${res.status} ao salvar OS ${t.protocol}:`, errText);
        throw new Error(`HTTP ${res.status}`);
      }
      // Registrar timestamp do último save com sucesso (anti race-condition no auto-refresh)
      window._sacLastSaveMs = Date.now();
    } catch(e) {
      if (_retries < 3) {
        const delay = 1500 * Math.pow(2, _retries); // 1.5s, 3s, 6s
        console.warn(`[SAC] Falha ao salvar OS ${t.protocol}, tentativa ${_retries+1}/3 em ${delay}ms`, e.message);
        setTimeout(() => updateTicket(t, _retries + 1), delay);
      } else {
        console.error(`[SAC] FALHA PERMANENTE ao salvar OS ${t.protocol}`, e);
        // Mostrar erro visível — dados NÃO foram salvos no servidor
        const errEl = document.getElementById('sac-save-error-toast');
        if (errEl) {
          errEl.textContent = `⚠️ ERRO: OS ${t.protocol} NÃO foi salva no servidor! Verifique a conexão e tente novamente sem recarregar a página.`;
          errEl.style.display = 'flex';
          setTimeout(() => { errEl.style.display = 'none'; }, 15000);
        }
      }
    }
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


  // ══════════════════════════════════════════════════════
  // POPUP OBRIGATÓRIO — não pode ser fechado
  // ══════════════════════════════════════════════════════
  // Usuários que podem fechar o popup sem preencher (gestores/admins) já definidos no topo

  function showMandatoryJustificationPopup(ticket, tipo) {
    const existingId = 'sac-mandatory-popup-' + ticket.id;
    if (document.getElementById(existingId)) return; // já aberto

    // Para aguard: popup aparece apenas para o gestor do departamento atribuído
    const currentUser = currentUsername();
    if (tipo === 'aguard') {
      // Descobrir o setor atribuído
      const sectorName = ticket.logisticsTask && !ticket.logisticsTask.isCompleted ? 'Logística'
                       : ticket.commercialTask && !ticket.commercialTask.isCompleted ? 'Comercial'
                       : ticket.financialTask  && !ticket.financialTask.isCompleted  ? 'Financeiro'
                       : null;
      if (sectorName) {
        // Verificar se o usuário atual é o gestor do setor
        // Método 1: gestor gravado no ticket ao atribuir
        const gs = ticket.gestorSetor;
        let cUserId = null;
        let currNomeCompleto = '';
        try { const u = JSON.parse(localStorage.getItem('erp_user')||'{}'); cUserId = String(u.id); currNomeCompleto = (u.nome||'').toLowerCase(); } catch(e){}

        const isGestorByTicket = gs && (
          (cUserId && gs.id && gs.id === cUserId) ||
          (currentUser && gs.login && gs.login === currentUser.toLowerCase()) ||
          (() => {
              if (!currNomeCompleto || !gs.nome) return false;
              const clean = s => (s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
              const normCurr = clean(currNomeCompleto);
              const normGs = clean(gs.nome);
              return normGs && normCurr && (normGs === normCurr || normGs.includes(normCurr) || normCurr.includes(normGs));
          })()
        );

        // Método 2: myManagedDepts (mesma lógica que já funciona para visibilidade dos cards)
        const myDeptsPopup = _globalDepartamentos.filter(d => {
          const respId   = (d.responsavel_id || '').toString().trim();
          const clean = s => (s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
          const respNomeClean = clean(d.responsavel_nome);
          const respLoginClean = clean(d.responsavel_login || d.responsavel_username);
          
          const currNomeClean = clean(currNomeCompleto);
          const currUserClean = clean(currentUser);
          
          return (cUserId && respId && respId === cUserId) ||
                 (currUserClean && respLoginClean && respLoginClean === currUserClean) ||
                 (currNomeClean && respNomeClean && respNomeClean === currNomeClean) ||
                 (currNomeClean && respNomeClean && (respNomeClean.includes(currNomeClean) || currNomeClean.includes(respNomeClean)) && currNomeClean.length > 3);
        }).map(d => (d.nome || '').trim());

        const sectorNorm = sectorName.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
        const isGestorByDept = myDeptsPopup.some(n => {
          const nn = n.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
          return nn.includes(sectorNorm) || sectorNorm.includes(nn);
        });

        // Método 0 (mais direto): usuário é o assignedTo do ticket
        let usernameFallbackPopup = currentUser.toLowerCase().trim();
        try {
          const uu = JSON.parse(localStorage.getItem('erp_user')||'{}');
          const fb = (uu.username || uu.login || '').toLowerCase().trim();
          if (fb) usernameFallbackPopup = fb;
        } catch(e){}
        const isAssignedPopup = ['logisticsTask','commercialTask','financialTask'].some(k => {
          const task = ticket[k];
          if (!task || !task.assignedTo) return false;
          const a = task.assignedTo.toLowerCase().trim();
          return a === currentUser.toLowerCase().trim() || a === usernameFallbackPopup;
        });

        // Método 3: POPUP_CLOSERS (admins)
        const isPopupCloser = POPUP_CLOSERS.some(u => currentUser === u || currentUser.toLowerCase() === u.toLowerCase());

        // Método 4: usuário tem permissão SAC restrita (gestor de setor via grupo de permissão)
        const permsNow = window.activeUserPerms || {};
        const isTopAdminNow = window.isTopAdmin || false;
        const canSeeAllNow = isTopAdminNow || (permsNow['sac'] === true && permsNow['sac-atribuidos'] !== true);
        const isGestorBySacPerm = (permsNow['sac'] === true || permsNow['sac-atribuidos'] === true) && !canSeeAllNow;

        if (!isAssignedPopup && !isGestorByTicket && !isGestorByDept && !isPopupCloser && !isGestorBySacPerm && !canSeeAllNow) return;
        // Somente o gestor real do setor (isGestorByTicket || isGestorByDept) precisa preencher obrigatoriamente
        // Demais (assignedTo, admins, canSeeAll) podem fechar com X
        const mustJustify = (isGestorByTicket || isGestorByDept) && !isPopupCloser;
        localStorage.setItem('sac_popup_gestor_required_' + ticket.id, mustJustify ? '1' : '0');
        localStorage.setItem('sac_pending_popup_' + ticket.id, tipo);
        if (mustJustify) {
            SAC.openDetail(ticket.id);
        }
      }
    } else {
      const permsNow = window.activeUserPerms || {};
      const isTopAdminNow = window.isTopAdmin || false;
      const canSeeAllNow = isTopAdminNow || (permsNow['sac'] === true && permsNow['sac-atribuidos'] !== true);
      
      if (!canSeeAllNow) return;

      const isPopupCloser = POPUP_CLOSERS.some(u => currentUser.toLowerCase() === u.toLowerCase());
      const mustJustify = !isPopupCloser;
      localStorage.setItem('sac_popup_gestor_required_' + ticket.id, mustJustify ? '1' : '0');
      localStorage.setItem('sac_pending_popup_' + ticket.id, tipo);
      
      if (mustJustify) {
          SAC.openDetail(ticket.id);
      }
    }
  }

  // ══════════════════════════════════════════════════════
  // CHECK FOLLOW-UP ALERTS — roda a cada 1 minuto
  // ══════════════════════════════════════════════════════
  function checkFollowUpAlerts() {
    const now = Date.now();
    _tickets.forEach(ticket => {
      // Não processar tickets já respondidos ou encerrados
      if (['concluido','encerrado','respondido','acompanhamento'].includes(ticket.stage)) {
        if (ticket.aguardPendingJustification === true) showMandatoryJustificationPopup(ticket, 'aguard');
        if (ticket.followUpPendingJustification === true) showMandatoryJustificationPopup(ticket, 'followup');
        return;
      }
      if (ticket.stage === 'execucao' && ticket.followUpDeadline) {
        const prazo = new Date(ticket.followUpDeadline).getTime();
        if (!isNaN(prazo)) {
          if (prazo < now && !ticket.followUpNotified) {
            ticket.followUpNotified = true;
            if (!ticket.comments) ticket.comments = [];
            ticket.comments.push({ user:'Sistema', text:'🔔 Prazo de acompanhamento vencido em ' + new Date(prazo).toLocaleString('pt-BR') + '. Aguardando justificativa do responsável.', time: new Date().toISOString() });
            updateTicket(ticket);
            const token = localStorage.getItem('erp_token')||localStorage.getItem('token');
            // Notificar apenas usuários configurados em sac_sla_vencido (via API — sem enviar lista de envolvidos)
            fetch('/api/sac/notificar-acompanhamento', {
              method:'POST',
              headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},
              body: JSON.stringify({ ticketId:ticket.id, protocol:ticket.protocol, clientName:ticket.clientName, followUpDeadline:ticket.followUpDeadline })
            }).catch(e => console.error('[SAC] notificar-acompanhamento:', e));
          }
          if (prazo < now && ticket.followUpPendingJustification === true) {
            showMandatoryJustificationPopup(ticket, 'followup');
          }
        }
      }

      // ── Aguardando Setores (2h) ────────────────────────────
      if (ticket.stage === 'aguardando_setores' && ticket.aguardDeadline) {
        const aguardPrazo = new Date(ticket.aguardDeadline).getTime();
        if (!isNaN(aguardPrazo)) {
          if (aguardPrazo < now && !ticket.aguardNotified) {
            ticket.aguardNotified = true;
            if (!ticket.comments) ticket.comments = [];
            ticket.comments.push({ user:'Sistema', text:'🔔 Prazo de aguardo de setor vencido em ' + new Date(aguardPrazo).toLocaleString('pt-BR') + '. Aguardando justificativa do responsável.', time: new Date().toISOString() });
            updateTicket(ticket);
            const token = localStorage.getItem('erp_token')||localStorage.getItem('token');
            fetch('/api/sac/notificar-acompanhamento', {
              method:'POST',
              headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},
              body: JSON.stringify({ ticketId:ticket.id, protocol:ticket.protocol, clientName:ticket.clientName, followUpDeadline:ticket.aguardDeadline })
            }).catch(e => console.error('[SAC] notificar-aguard:', e));
          }
          if (aguardPrazo < now && ticket.aguardPendingJustification === true) {
            showMandatoryJustificationPopup(ticket, 'aguard');
          }
        }
      }
    });
  }

  // ══════════════════════════════════════════════════════
  // CHECK SLA OVERDUE — roda a cada 1 minuto
  // ══════════════════════════════════════════════════════
  function checkSLAOverdue() {
    _tickets.forEach(ticket => {
      if (['concluido','encerrado','execucao','respondido','acompanhamento'].includes(ticket.stage)) {
        if (ticket.slaOverduePendingJustification === true) showMandatoryJustificationPopup(ticket, 'sla');
        return;
      }
      const sla = getSLADetails(ticket);
      if (!sla.isOverdue) return;

      let changed = false;

      // Marcar urgente automaticamente
      if (!ticket.isUrgent) {
        ticket.isUrgent = true;
        if (!ticket.comments) ticket.comments = [];
        ticket.comments.push({ user:'Sistema', text:'🚨 Chamado marcado como URGENTE automaticamente — SLA vencido.', time: new Date().toISOString() });
        changed = true;
      }

      // Notificar configurados (uma vez)
      if (!ticket.slaOverdueNotified) {
        ticket.slaOverdueNotified = true;
        ticket.slaOverduePendingJustification = true;
        if (!ticket.comments) ticket.comments = [];
        changed = true;
        const token = localStorage.getItem('erp_token')||localStorage.getItem('token');
        fetch('/api/sac/notificar-sla-vencido', {
          method:'POST',
          headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},
          body: JSON.stringify({ ticketId:ticket.id, protocol:ticket.protocol, clientName:ticket.clientName, openDate:ticket.openDate, typeKey:ticket.typeKey })
        }).catch(e => console.error('[SAC] notificar-sla-vencido:', e));
      }

      // Popup obrigatório SLA estourado
      if (ticket.slaOverduePendingJustification === true) {
        showMandatoryJustificationPopup(ticket, 'sla');
      }

      if (changed) updateTicket(ticket);
    });
  }

})();
