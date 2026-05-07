// ── EQUIPES MODULE ────────────────────────────────────────────────────────────
(function () {
'use strict';

const COLUNAS_DEFAULT = [
  { id: 1, nome: 'Equipe 07h', horario: 'Entra às 07h', cor: '#2563eb', icone: 'ph-sun', membros: [] },
  { id: 2, nome: 'Equipe 09h', horario: 'Entra às 09h', cor: '#7c3aed', icone: 'ph-sun-horizon', membros: [] },
  { id: 3, nome: 'Noturno',    horario: '20h às 05h',   cor: '#0f172a', icone: 'ph-moon',        membros: [] },
  { id: 4, nome: 'Reserva',    horario: 'Conforme escala', cor: '#db2777', icone: 'ph-archive',  membros: [] },
  { id: 5, nome: 'Intermitentes', horario: 'Variável',  cor: '#ea580c', icone: 'ph-shuffle',    membros: [] },
  { id: 6, nome: 'Líderes',    horario: 'Variável',     cor: '#b45309', icone: 'ph-star',        membros: [] },
];

let _equipes = [];
let _semEquipe = [];   // colaboradores fora de qualquer equipe
let _busca = '';

// ── Drag state ───────────────────────────────────────────────────────────────
// equipeId = 0 significa coluna "Fora de Equipe"
let _drag = { membroId: null, origemEquipeId: null };

// ── API helpers ───────────────────────────────────────────────────────────────
const _eq_apiBase = () => (window.API_URL || '/api');
const _eq_headers = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${window.currentToken}` });
async function _eq_get(path) {
  const r = await fetch(_eq_apiBase() + path, { headers: _eq_headers() });
  return r.json();
}
async function _eq_post(path, body) {
  const r = await fetch(_eq_apiBase() + path, { method: 'POST', headers: _eq_headers(), body: JSON.stringify(body) });
  return r.json();
}
async function _eq_patch(path, body) {
  const r = await fetch(_eq_apiBase() + path, { method: 'PATCH', headers: _eq_headers(), body: JSON.stringify(body) });
  return r.json();
}
async function _eq_del(path) {
  const r = await fetch(_eq_apiBase() + path, { method: 'DELETE', headers: _eq_headers() });
  return r.json();
}

function _eq_fotoSrc(m) {
  if (m.foto_base64) return 'data:image/jpeg;base64,' + m.foto_base64;
  if (m.foto_path) return _eq_apiBase() + `/colaboradores/${m.colaborador_id}/foto`;
  return null;
}

window.initEquipes = async function () {
  const el = document.getElementById('equipes-container');
  if (!el) return;
  _renderAll(el);
  _mostrarSkeleton();
  try {
    [_equipes, _semEquipe] = await Promise.all([
      _eq_get('/equipes'),
      _eq_get('/equipes/colaboradores-sem-equipe')
    ]);
    if (_equipes.length === 0) {
      const defaults = [
        { nome: 'Equipe 07h', horario: 'Entra às 07h', cor: '#2563eb', ordem: 1 },
        { nome: 'Equipe 09h', horario: 'Entra às 09h', cor: '#7c3aed', ordem: 2 },
        { nome: 'Noturno',    horario: '20h às 05h',   cor: '#0f172a', ordem: 3 },
        { nome: 'Reserva',    horario: 'Conforme escala', cor: '#db2777', ordem: 4 },
        { nome: 'Intermitentes', horario: 'Variável',  cor: '#ea580c', ordem: 5 },
        { nome: 'Líderes',    horario: 'Variável',     cor: '#b45309', ordem: 6 },
      ];
      for (const d of defaults) {
        const eq = await _eq_post('/equipes', d);
        if (eq.id) _equipes.push({ ...d, ...eq, membros: [] });
      }
    }
  } catch(e) {
    console.error('[EQUIPES]', e);
    _equipes = JSON.parse(JSON.stringify(COLUNAS_DEFAULT));
    _semEquipe = [];
  }
  const board = document.getElementById('equipes-board');
  if (board) board.innerHTML = _renderFora() + _renderBoard();
};

function _renderAll(el) {
  el.innerHTML = `
  <style>
    #equipes-wrapper { display:flex; flex-direction:column; height:100%; font-family:'Inter',sans-serif; }
    #equipes-header { display:flex; align-items:center; gap:.75rem; flex-wrap:wrap; padding:.25rem 0 1rem; flex-shrink:0; }
    #equipes-header h2 { margin:0; font-size:1.4rem; font-weight:800; color:#0f172a; display:flex; align-items:center; gap:8px; }
    #equipes-search { flex:1; min-width:200px; max-width:300px; height:38px; border:1.5px solid #e2e8f0; border-radius:8px; padding:0 .75rem 0 2.2rem; font-size:.88rem; background:#f8fafc url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%2394a3b8' viewBox='0 0 256 256'%3E%3Cpath d='M229.66,218.34l-50.07-50.07a88.19,88.19,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.31ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z'/%3E%3C/svg%3E") .6rem center no-repeat; }
    #equipes-search:focus { outline:none; border-color:#6366f1; }
    .eq-btn-primary { height:38px; padding:0 1.1rem; background:#0f172a; color:#fff; border:none; border-radius:8px; font-weight:700; font-size:.85rem; cursor:pointer; display:flex; align-items:center; gap:6px; transition:background .15s; }
    .eq-btn-primary:hover { background:#1e293b; }
    .eq-btn-sec { height:38px; padding:0 1.1rem; background:#fff; color:#334155; border:1.5px solid #e2e8f0; border-radius:8px; font-weight:600; font-size:.85rem; cursor:pointer; display:flex; align-items:center; gap:6px; transition:border-color .15s; }
    .eq-btn-sec:hover { border-color:#94a3b8; }
    #equipes-board { display:flex; gap:1rem; overflow-x:auto; padding-bottom:1rem; flex:1; min-height:0; align-items:flex-start; }
    #equipes-board::-webkit-scrollbar { height:6px; }
    #equipes-board::-webkit-scrollbar-thumb { background:#cbd5e1; border-radius:3px; }
    .eq-col { width:240px; min-width:240px; background:#f8fafc; border-radius:14px; border:1.5px solid #e2e8f0; display:flex; flex-direction:column; flex-shrink:0; max-height:calc(100vh - 180px); }
    .eq-col-header { padding:.9rem 1rem .7rem; border-radius:12px 12px 0 0; }
    .eq-col-title { font-size:.95rem; font-weight:800; color:#fff; margin:0; display:flex; align-items:center; gap:6px; }
    .eq-col-sub { font-size:.72rem; color:rgba(255,255,255,.75); margin-top:3px; display:flex; align-items:center; justify-content:space-between; }
    .eq-badge { background:rgba(255,255,255,.25); border-radius:10px; padding:1px 8px; font-weight:700; font-size:.72rem; }
    .eq-col-body { padding:.6rem; overflow-y:auto; flex:1; display:flex; flex-direction:column; gap:.5rem; min-height:80px; }
    .eq-col-body::-webkit-scrollbar { width:4px; }
    .eq-col-body::-webkit-scrollbar-thumb { background:#e2e8f0; border-radius:2px; }
    .eq-col-body.drag-over { background:#eff6ff; border:2px dashed #6366f1; border-radius:8px; }
    .eq-card { background:#fff; border-radius:10px; border:1.5px solid #f1f5f9; padding:.6rem .75rem; box-shadow:0 1px 3px rgba(0,0,0,.06); display:flex; align-items:center; gap:.6rem; cursor:grab; transition:box-shadow .15s, transform .15s, opacity .15s; user-select:none; }
    .eq-card:hover { box-shadow:0 4px 12px rgba(0,0,0,.1); transform:translateY(-1px); }
    .eq-card.dragging { opacity:.4; transform:scale(.97); box-shadow:none; cursor:grabbing; }
    .eq-avatar { width:38px; height:38px; border-radius:50%; object-fit:cover; flex-shrink:0; border:2px solid #e2e8f0; }
    .eq-avatar-placeholder { width:38px; height:38px; border-radius:50%; flex-shrink:0; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:.9rem; color:#fff; }
    .eq-card-info { flex:1; min-width:0; }
    .eq-card-name { font-size:.8rem; font-weight:700; color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .eq-card-func { font-size:.7rem; font-weight:600; padding:1px 7px; border-radius:8px; display:inline-block; margin-top:2px; }
    .eq-card-escala { font-size:.68rem; color:#94a3b8; margin-top:1px; }
    .eq-status-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
    .eq-empty { text-align:center; padding:1.5rem .5rem; color:#cbd5e1; font-size:.8rem; }
    .eq-col-footer { padding:.5rem; border-top:1px solid #f1f5f9; }
    .eq-add-btn { width:100%; background:transparent; border:1.5px dashed #cbd5e1; border-radius:8px; color:#94a3b8; font-size:.8rem; padding:.5rem; cursor:pointer; transition:all .15s; display:flex; align-items:center; justify-content:center; gap:5px; }
    .eq-add-btn:hover { border-color:#6366f1; color:#6366f1; background:#f5f3ff; }
    .eq-indicator { width:10px; height:10px; border-radius:50%; display:inline-block; margin-right:4px; }
  </style>
  <div id="equipes-wrapper">
    <div id="equipes-header">
      <h2><i class="ph ph-users-three" style="color:#6366f1;font-size:1.6rem;"></i> Equipes</h2>
      <input id="equipes-search" type="text" placeholder="Buscar colaborador..." oninput="window._equipesSearch(this.value)">
      <div style="margin-left:auto;display:flex;gap:.5rem;flex-wrap:wrap;">
        <button class="eq-btn-sec" onclick="window._equipesNovaEquipe()"><i class="ph ph-plus"></i> Criar equipe</button>
        <button class="eq-btn-primary" onclick="window._equipesSalvar()"><i class="ph ph-floppy-disk"></i> Salvar alterações</button>
      </div>
    </div>
    <div id="equipes-board">${_renderBoard()}</div>
    <div id="equipes-summary"></div>
  </div>

  <!-- Modal nova equipe -->
  <div id="eq-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:99999;align-items:center;justify-content:center;">
    <div style="background:#fff;border-radius:16px;padding:2rem;width:400px;max-width:95vw;">
      <h3 style="margin:0 0 1.25rem;font-size:1.1rem;font-weight:800;">Nova Equipe</h3>
      <label style="font-size:.8rem;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Nome</label>
      <input id="eq-modal-nome" style="width:100%;border:1.5px solid #e2e8f0;border-radius:8px;padding:.5rem .75rem;font-size:.9rem;box-sizing:border-box;" placeholder="Ex: Equipe 07h">
      <label style="font-size:.8rem;font-weight:600;color:#475569;display:block;margin:1rem 0 4px;">Horário</label>
      <input id="eq-modal-horario" style="width:100%;border:1.5px solid #e2e8f0;border-radius:8px;padding:.5rem .75rem;font-size:.9rem;box-sizing:border-box;" placeholder="Ex: Entra às 07h">
      <label style="font-size:.8rem;font-weight:600;color:#475569;display:block;margin:1rem 0 4px;">Cor</label>
      <input id="eq-modal-cor" type="color" value="#2563eb" style="height:38px;width:80px;border:1.5px solid #e2e8f0;border-radius:8px;cursor:pointer;">
      <div style="display:flex;gap:.75rem;justify-content:flex-end;margin-top:1.5rem;">
        <button class="eq-btn-sec" onclick="document.getElementById('eq-modal').style.display='none'">Cancelar</button>
        <button class="eq-btn-primary" onclick="window._equipesConfirmarNova()"><i class="ph ph-check"></i> Criar</button>
      </div>
    </div>
  </div>
  `;
}

function _eqAlertas(membros) {
  const alertas = [];
  if (membros.length === 0) return alertas;
  if (!membros.some(m => m.funcao === 'motorista')) alertas.push({ tipo: 'erro', msg: 'Sem motorista' });
  if (!membros.some(m => ['ajudante','reserva'].includes(m.funcao))) alertas.push({ tipo: 'aviso', msg: 'Sem ajudante' });
  if (membros.length > 4) alertas.push({ tipo: 'aviso', msg: `Excesso: ${membros.length} membros` });
  return alertas;
}

function _eqStatus(membros) {
  if (membros.length === 0) return { cor: '#ef4444', label: 'Incompleta' };
  const temMotorista = membros.some(m => m.funcao === 'motorista');
  const temAjudante  = membros.some(m => ['ajudante','reserva'].includes(m.funcao));
  if (temMotorista && temAjudante) return { cor: '#22c55e', label: 'Completa' };
  if (temMotorista || temAjudante) return { cor: '#f59e0b', label: 'Atenção' };
  return { cor: '#ef4444', label: 'Incompleta' };
}

function _renderFora() {
  const b = _busca.toLowerCase();
  const lista = b ? _semEquipe.filter(m => (m.nome_completo||'').toLowerCase().includes(b)) : _semEquipe;
  const cards = lista.map(m => {
    const iniciais = (m.nome_completo||'?').split(' ').slice(0,2).map(p=>p[0]).join('').toUpperCase();
    const avatarBg = ['#94a3b8','#64748b','#78716c','#6b7280','#71717a','#737373'][m.id % 6];
    const fotoSrc = m.foto_base64 ? 'data:image/jpeg;base64,'+m.foto_base64 : null;
    const avatarHtml = fotoSrc
      ? `<img class="eq-avatar" src="${fotoSrc}" alt="${m.nome_completo}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"><div class="eq-avatar-placeholder" style="background:${avatarBg};display:none;">${iniciais}</div>`
      : `<div class="eq-avatar-placeholder" style="background:${avatarBg};">${iniciais}</div>`;
    return `<div class="eq-card" data-membro-id="${m.id}" data-equipe-id="0"
      draggable="true"
      ondragstart="window._eqDragStart(event,${m.id},0)"
      ondragend="window._eqDragEnd(event)"
      style="opacity:.85;">
      ${avatarHtml}
      <div class="eq-card-info">
        <div class="eq-card-name">${m.nome_completo||'?'}</div>
        <span class="eq-card-func" style="background:#f1f5f9;color:#64748b;">${m.cargo||'Operacional'}</span>
      </div>
    </div>`;
  }).join('');
  return `<div class="eq-col" data-equipe-id="0" style="border:2px dashed #cbd5e1;background:#f8fafc;">
    <div class="eq-col-header" style="background:#64748b;">
      <div class="eq-col-title"><span class="eq-indicator" style="background:#94a3b8;border:2px solid rgba(255,255,255,.4);"></span> Fora de Equipe</div>
      <div class="eq-col-sub"><span>Sem equipe definida</span><span class="eq-badge">${lista.length}</span></div>
    </div>
    <div class="eq-col-body" id="eq-body-0"
      ondragover="event.preventDefault();window._eqDragOver(event,0)"
      ondragleave="window._eqDragLeave(event)"
      ondrop="window._eqDrop(event,0)">
      ${cards || '<div class="eq-empty"><i class="ph ph-check-circle" style="font-size:1.5rem;display:block;margin-bottom:4px;color:#22c55e;"></i>Todos em equipes!</div>'}
    </div>
    <div class="eq-col-footer"><div style="text-align:center;font-size:.72rem;color:#94a3b8;padding:.25rem;">Arraste para uma equipe</div></div>
  </div>`;
}

function _renderBoard(busca) {
  const b = (busca || _busca || '').toLowerCase();
  // Summary bar
  const totalEquipes = _equipes.length;
  const incompletas = _equipes.filter(e => _eqStatus(e.membros).label !== 'Completa').length;
  const totalMembros = _equipes.reduce((acc, e) => acc + e.membros.length, 0);

  const summaryEl = document.getElementById('equipes-summary');
  if (summaryEl) {
    summaryEl.style.cssText = 'display:flex;gap:.75rem;flex-wrap:wrap;margin-bottom:1rem;flex-shrink:0;';
    summaryEl.innerHTML = `
      <div style="background:#dcfce7;border:1px solid #bbf7d0;border-radius:8px;padding:.4rem .9rem;font-size:.78rem;font-weight:700;color:#15803d;display:flex;align-items:center;gap:5px;">
        <i class="ph ph-users"></i> ${totalMembros} colaboradores distribuídos
      </div>
      <div style="background:${incompletas===0?'#dcfce7':'#fef3c7'};border:1px solid ${incompletas===0?'#bbf7d0':'#fde68a'};border-radius:8px;padding:.4rem .9rem;font-size:.78rem;font-weight:700;color:${incompletas===0?'#15803d':'#92400e'};display:flex;align-items:center;gap:5px;">
        <i class="ph ph-${incompletas===0?'check-circle':'warning'}"></i> ${incompletas === 0 ? 'Todas equipes completas' : `${incompletas} equipe${incompletas>1?'s':''} incompleta${incompletas>1?'s':''}`}
      </div>
      <div style="background:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;padding:.4rem .9rem;font-size:.78rem;font-weight:700;color:#475569;display:flex;align-items:center;gap:5px;">
        <i class="ph ph-layout"></i> ${totalEquipes} equipes
      </div>`;
  }

  return _equipes.map(eq => {
    const membros = b ? eq.membros.filter(m => (m.nome_completo||m.nome||'').toLowerCase().includes(b)) : eq.membros;
    const { cor: indicadorCor } = _eqStatus(membros);
    const alertas = _eqAlertas(membros);
    const alertasHtml = alertas.map(a =>
      `<div style="padding:3px 8px;font-size:.68rem;font-weight:700;background:${a.tipo==='erro'?'#fee2e2':'#fef3c7'};color:${a.tipo==='erro'?'#991b1b':'#92400e'};display:flex;align-items:center;gap:4px;">
        <i class="ph ph-${a.tipo==='erro'?'x-circle':'warning'}"></i>${a.msg}
      </div>`
    ).join('');

    return `<div class="eq-col" data-equipe-id="${eq.id}">
      <div class="eq-col-header" style="background:${eq.cor};">
        <div class="eq-col-title">
          <span class="eq-indicator" style="background:${indicadorCor};border:2px solid rgba(255,255,255,.5);"></span>
          ${eq.nome}
        </div>
        <div class="eq-col-sub">
          <span>${eq.horario}</span>
          <span class="eq-badge">${membros.length}</span>
        </div>
      </div>
      ${alertasHtml}
    <div class="eq-col-body" id="eq-body-${eq.id}"
      ondragover="event.preventDefault();window._eqDragOver(event,${eq.id})"
      ondragleave="window._eqDragLeave(event)"
      ondrop="window._eqDrop(event,${eq.id})">
        ${membros.length ? membros.map(m => _renderCard(m)).join('') : '<div class="eq-empty"><i class="ph ph-users" style="font-size:1.5rem;display:block;margin-bottom:4px;"></i>Sem membros</div>'}
      </div>
      <div class="eq-col-footer">
        <button class="eq-add-btn" onclick="window._equipesAdicionarMembro(${eq.id})">
          <i class="ph ph-plus"></i> Adicionar
        </button>
      </div>
    </div>`;
  }).join('');
}

const FUNC_STYLE = {
  motorista:    { bg: '#dbeafe', color: '#1d4ed8', label: 'Motorista' },
  ajudante:     { bg: '#f1f5f9', color: '#475569', label: 'Ajudante' },
  reserva:      { bg: '#fce7f3', color: '#be185d', label: 'Reserva' },
  intermitente: { bg: '#ffedd5', color: '#c2410c', label: 'Intermitente' },
  lider:        { bg: '#fef3c7', color: '#92400e', label: 'Líder' },
};

const STATUS_COR = { ativo: '#22c55e', folga: '#94a3b8', ferias: '#3b82f6', afastado: '#ef4444', experiencia: '#eab308' };

function _renderCard(m) {
  const fs = FUNC_STYLE[m.funcao] || FUNC_STYLE.ajudante;
  const sc = STATUS_COR[m.status] || '#22c55e';
  const afastado = m.status === 'afastado';
  const nomeRaw = m.nome_completo || m.nome || '?';
  const emExp = nomeRaw.toLowerCase().includes('experi') || m.status === 'experiencia';
  const nome = nomeRaw.replace(/\s*\(Experi[^)]*\)/i,'').replace(/\s*\(E\)/i,'').trim();
  const iniciais = nome.split(' ').slice(0,2).map(p => p[0]).join('').toUpperCase();
  const avatarBg = ['#6366f1','#8b5cf6','#ec4899','#14b8a6','#f97316','#84cc16'][(m.colaborador_id||m.id) % 6];
  const borderStyle = afastado ? 'border-color:#fca5a5;background:#fff5f5;' : emExp ? 'border-color:#fde68a;background:#fffbeb;' : '';
  const avatarBorder = afastado ? 'border-color:#ef4444;border-width:2px;' : emExp ? 'border-color:#f59e0b;border-width:2px;' : '';
  const avatarHtml = _eq_fotoSrc(m)
    ? `<img class="eq-avatar" src="${_eq_fotoSrc(m)}" alt="${nome}" style="${avatarBorder}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
       <div class="eq-avatar-placeholder" style="background:${avatarBg};display:none;">${iniciais}</div>`
    : `<div class="eq-avatar-placeholder" style="background:${avatarBg};${avatarBorder}">${iniciais}</div>`;
  return `
  <div class="eq-card" data-membro-id="${m.colaborador_id||m.id}" data-equipe-id="${m.equipe_id}"
    draggable="true"
    ondragstart="window._eqDragStart(event,${m.colaborador_id||m.id},${m.equipe_id})"
    ondragend="window._eqDragEnd(event)"
    style="${borderStyle}">
    ${avatarHtml}
    <div class="eq-card-info">
      <div class="eq-card-name">${nome}${emExp?` <span style="font-size:.58rem;background:#fde68a;color:#92400e;border-radius:3px;padding:0 3px;font-weight:800;">EXP</span>`:''}</div>
      <span class="eq-card-func" style="background:${fs.bg};color:${fs.color};">${fs.label}</span>
      ${m.escala ? `<div class="eq-card-escala">${m.escala}</div>` : (m.cargo ? `<div class="eq-card-escala">${m.cargo}</div>` : '')}
    </div>
    <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
      <div class="eq-status-dot" title="${m.status||'ativo'}" style="background:${sc};"></div>
      <button onclick="event.stopPropagation();window._eqRemoverMembro(${m.colaborador_id||m.id},${m.equipe_id})" style="background:none;border:none;cursor:pointer;color:#cbd5e1;font-size:.75rem;padding:0;" title="Remover">×</button>
    </div>
  </div>`;
}


// ── Handlers ──────────────────────────────────────────────────────────────────
window._equipesSearch = function(val) {
  _busca = val;
  const board = document.getElementById('equipes-board');
  if (board) board.innerHTML = _renderBoard(val);
};

window._equipesNovaEquipe = function() {
  const m = document.getElementById('eq-modal');
  if (m) m.style.display = 'flex';
};

window._equipesConfirmarNova = async function() {
  const nome = document.getElementById('eq-modal-nome').value.trim();
  const horario = document.getElementById('eq-modal-horario').value.trim();
  const cor = document.getElementById('eq-modal-cor').value;
  if (!nome) { alert('Informe o nome da equipe'); return; }
  try {
    const eq = await _eq_post('/equipes', { nome, horario: horario || 'Variável', cor, ordem: _equipes.length + 1 });
    _equipes.push({ ...eq, membros: [] });
    document.getElementById('eq-modal').style.display = 'none';
    const board = document.getElementById('equipes-board');
    if (board) board.innerHTML = _renderBoard();
  } catch(e) { alert('Erro ao criar equipe: ' + e.message); }
};

window._equipesSalvar = function() {
  if (typeof window.showToast === 'function') window.showToast('Alterações salvas!', 'success');
  else alert('Alterações salvas!');
};

// ── Drag & Drop handlers ──────────────────────────────────────────────────────
window._eqDragStart = function(ev, membroId, equipeId) {
  _drag.membroId = membroId;
  _drag.origemEquipeId = equipeId;
  ev.dataTransfer.effectAllowed = 'move';
  ev.dataTransfer.setData('text/plain', membroId);
  // Marca o card como sendo arrastado (via timeout p/ browser renderizar antes)
  setTimeout(() => {
    const el = document.querySelector(`[data-membro-id="${membroId}"]`);
    if (el) el.classList.add('dragging');
  }, 0);
};

window._eqDragEnd = function(ev) {
  document.querySelectorAll('.eq-card.dragging').forEach(el => el.classList.remove('dragging'));
  document.querySelectorAll('.eq-col-body.drag-over').forEach(el => el.classList.remove('drag-over'));
};

window._eqDragOver = function(ev, equipeId) {
  ev.preventDefault();
  ev.dataTransfer.dropEffect = 'move';
  const body = document.getElementById(`eq-body-${equipeId}`);
  if (body && !body.classList.contains('drag-over')) {
    document.querySelectorAll('.eq-col-body.drag-over').forEach(el => el.classList.remove('drag-over'));
    body.classList.add('drag-over');
  }
};

window._eqDragLeave = function(ev) {
  // Só remove se o mouse saiu para fora da coluna (não para um filho)
  if (ev.currentTarget && !ev.currentTarget.contains(ev.relatedTarget)) {
    ev.currentTarget.classList.remove('drag-over');
  }
};

window._eqDrop = async function(ev, equipeDestinoId) {
  ev.preventDefault();
  const body = document.getElementById(`eq-body-${equipeDestinoId}`);
  if (body) body.classList.remove('drag-over');

  const { membroId, origemEquipeId } = _drag;
  if (!membroId) return;
  if (equipeDestinoId === origemEquipeId) return;

  // ── Soltar em "Fora de Equipe" (id=0) → remover da equipe ──
  if (equipeDestinoId === 0) {
    const origem = _equipes.find(e => e.id === origemEquipeId);
    if (!origem) return;
    const idx = origem.membros.findIndex(m => (m.colaborador_id||m.id) === membroId);
    if (idx === -1) return;
    const [membro] = origem.membros.splice(idx, 1);
    _semEquipe.push({ id: membro.colaborador_id||membro.id, nome_completo: membro.nome_completo||membro.nome, cargo: membro.cargo||'', foto_base64: membro.foto_base64||null });
    _reRenderFora();
    _reRenderColuna(origemEquipeId);
    try {
      await _eq_del(`/equipes/${origemEquipeId}/membros/${membro.colaborador_id||membro.id}`);
      if (typeof window.showToast === 'function') window.showToast(`${membro.nome_completo||membro.nome} movido para Fora de Equipe`, 'success');
    } catch(e) { console.error('[EQUIPES] Erro ao remover:', e); }
    _drag = { membroId: null, origemEquipeId: null };
    return;
  }

  // ── Soltar em equipe vindo de "Fora de Equipe" (id=0) → adicionar à equipe ──
  if (origemEquipeId === 0) {
    const destino = _equipes.find(e => e.id === equipeDestinoId);
    if (!destino) return;
    const idx = _semEquipe.findIndex(m => m.id === membroId);
    if (idx === -1) return;
    const [colab] = _semEquipe.splice(idx, 1);
    const novoMembro = { colaborador_id: colab.id, nome_completo: colab.nome_completo, cargo: colab.cargo, foto_base64: colab.foto_base64, funcao: 'ajudante', escala: '', equipe_id: equipeDestinoId };
    destino.membros.push(novoMembro);
    _reRenderFora();
    _reRenderColuna(equipeDestinoId);
    try {
      await _eq_post(`/equipes/${equipeDestinoId}/membros`, { colaborador_id: colab.id, funcao: 'ajudante' });
      if (typeof window.showToast === 'function') window.showToast(`${colab.nome_completo} adicionado a ${destino.nome}`, 'success');
    } catch(e) { console.error('[EQUIPES] Erro ao adicionar:', e); }
    _drag = { membroId: null, origemEquipeId: null };
    return;
  }

  // ── Mover entre equipes ──
  const origem = _equipes.find(e => e.id === origemEquipeId);
  const destino = _equipes.find(e => e.id === equipeDestinoId);
  if (!origem || !destino) return;
  const idx = origem.membros.findIndex(m => (m.colaborador_id||m.id) === membroId);
  if (idx === -1) return;
  const [membro] = origem.membros.splice(idx, 1);
  membro.equipe_id = equipeDestinoId;
  destino.membros.push(membro);
  _reRenderColuna(origemEquipeId);
  _reRenderColuna(equipeDestinoId);
  try {
    await _eq_patch('/equipes/mover', { colaborador_id: membro.colaborador_id||membro.id, equipe_origem_id: origemEquipeId, equipe_destino_id: equipeDestinoId, funcao: membro.funcao });
    if (typeof window.showToast === 'function') window.showToast(`${membro.nome_completo||membro.nome} movido para ${destino.nome}`, 'success');
  } catch(e) {
    destino.membros.splice(destino.membros.findIndex(m => (m.colaborador_id||m.id) === membroId), 1);
    membro.equipe_id = origemEquipeId;
    origem.membros.push(membro);
    _reRenderColuna(origemEquipeId);
    _reRenderColuna(equipeDestinoId);
  }
  _drag = { membroId: null, origemEquipeId: null };
};

function _reRenderColuna(equipeId) {
  if (equipeId === 0) { _reRenderFora(); return; }
  const eq = _equipes.find(e => e.id === equipeId);
  if (!eq) return;
  const { cor: indicadorCor } = _eqStatus(eq.membros);
  const badge = document.querySelector(`[data-equipe-id="${equipeId}"] .eq-badge`);
  if (badge) badge.textContent = eq.membros.length;
  const indicator = document.querySelector(`[data-equipe-id="${equipeId}"] .eq-indicator`);
  if (indicator) indicator.style.background = indicadorCor;
  const body = document.getElementById(`eq-body-${equipeId}`);
  if (!body) return;
  const b = _busca.toLowerCase();
  const membros = b ? eq.membros.filter(m => (m.nome_completo||m.nome||'').toLowerCase().includes(b)) : eq.membros;
  body.innerHTML = membros.length
    ? membros.map(m => _renderCard(m)).join('')
    : '<div class="eq-empty"><i class="ph ph-users" style="font-size:1.5rem;display:block;margin-bottom:4px;"></i>Sem membros</div>';
}

function _reRenderFora() {
  const foraCol = document.querySelector('.eq-col[data-equipe-id="0"]');
  if (!foraCol) return;
  const badge = foraCol.querySelector('.eq-badge');
  if (badge) badge.textContent = _semEquipe.length;
  const body = document.getElementById('eq-body-0');
  if (!body) return;
  const b = _busca.toLowerCase();
  const lista = b ? _semEquipe.filter(m => (m.nome_completo||'').toLowerCase().includes(b)) : _semEquipe;
  body.innerHTML = lista.map(m => {
    const iniciais = (m.nome_completo||'?').split(' ').slice(0,2).map(p=>p[0]).join('').toUpperCase();
    const avatarBg = ['#94a3b8','#64748b','#78716c','#6b7280','#71717a','#737373'][m.id % 6];
    const fotoSrc = m.foto_base64 ? 'data:image/jpeg;base64,'+m.foto_base64 : null;
    const avatarHtml = fotoSrc
      ? `<img class="eq-avatar" src="${fotoSrc}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"><div class="eq-avatar-placeholder" style="background:${avatarBg};display:none;">${iniciais}</div>`
      : `<div class="eq-avatar-placeholder" style="background:${avatarBg};">${iniciais}</div>`;
    return `<div class="eq-card" data-membro-id="${m.id}" data-equipe-id="0" draggable="true"
      ondragstart="window._eqDragStart(event,${m.id},0)" ondragend="window._eqDragEnd(event)" style="opacity:.85;">
      ${avatarHtml}
      <div class="eq-card-info">
        <div class="eq-card-name">${m.nome_completo||'?'}</div>
        <span class="eq-card-func" style="background:#f1f5f9;color:#64748b;">${m.cargo||'Operacional'}</span>
      </div></div>`;
  }).join('') || '<div class="eq-empty"><i class="ph ph-check-circle" style="font-size:1.5rem;display:block;margin-bottom:4px;color:#22c55e;"></i>Todos em equipes!</div>';
}

window._equipesAdicionarMembro = async function(equipeId) {
  // Buscar colaboradores sem equipe
  let semEquipe = [];
  try { semEquipe = await _eq_get('/equipes/colaboradores-sem-equipe'); } catch(e) {}

  const modal = document.createElement('div');
  modal.id = 'eq-add-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:99999;display:flex;align-items:center;justify-content:center;';
  const nomesOptions = semEquipe.map(c =>
    `<option value="${c.id}">${c.nome_completo} — ${c.cargo||''}</option>`
  ).join('');
  modal.innerHTML = `
  <div style="background:#fff;border-radius:16px;padding:1.5rem;width:420px;max-width:95vw;">
    <h3 style="margin:0 0 1rem;font-size:1rem;font-weight:800;">Adicionar colaborador</h3>
    ${semEquipe.length === 0 ? '<p style="color:#94a3b8;font-size:.85rem;">Todos os colaboradores já estão em uma equipe.</p>' : `
    <label style="font-size:.8rem;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Colaborador</label>
    <select id="eq-add-colab" style="width:100%;height:38px;border:1.5px solid #e2e8f0;border-radius:8px;padding:0 .6rem;font-size:.85rem;">
      <option value="">Selecione...</option>${nomesOptions}
    </select>
    <label style="font-size:.8rem;font-weight:600;color:#475569;display:block;margin:1rem 0 4px;">Função</label>
    <select id="eq-add-funcao" style="width:100%;height:38px;border:1.5px solid #e2e8f0;border-radius:8px;padding:0 .6rem;font-size:.85rem;">
      <option value="motorista">Motorista</option>
      <option value="ajudante">Ajudante</option>
      <option value="reserva">Reserva</option>
      <option value="intermitente">Intermitente</option>
      <option value="lider">Líder</option>
    </select>
    <label style="font-size:.8rem;font-weight:600;color:#475569;display:block;margin:1rem 0 4px;">Escala</label>
    <input id="eq-add-escala" placeholder="Ex: Seg a Sex" style="width:100%;border:1.5px solid #e2e8f0;border-radius:8px;padding:.5rem .6rem;font-size:.85rem;box-sizing:border-box;">`}
    <div style="display:flex;gap:.75rem;justify-content:flex-end;margin-top:1.25rem;">
      <button onclick="this.closest('#eq-add-modal').remove()" style="height:36px;padding:0 1rem;background:#f1f5f9;color:#475569;border:none;border-radius:8px;font-size:.85rem;cursor:pointer;">Cancelar</button>
      ${semEquipe.length > 0 ? `<button onclick="window._eqConfirmarAdicionar(${equipeId})" style="height:36px;padding:0 1rem;background:#0f172a;color:#fff;border:none;border-radius:8px;font-weight:700;font-size:.85rem;cursor:pointer;">Adicionar</button>` : ''}
    </div>
  </div>`;
  document.body.appendChild(modal);
};

window._eqConfirmarAdicionar = async function(equipeId) {
  const colabId = parseInt(document.getElementById('eq-add-colab')?.value);
  const funcao  = document.getElementById('eq-add-funcao')?.value || 'ajudante';
  const escala  = document.getElementById('eq-add-escala')?.value || '';
  if (!colabId) { alert('Selecione um colaborador'); return; }
  try {
    await _eq_post(`/equipes/${equipeId}/membros`, { colaborador_id: colabId, funcao, escala });
    document.getElementById('eq-add-modal')?.remove();
    // Recarregar equipes
    _equipes = await _eq_get('/equipes');
    const board = document.getElementById('equipes-board');
    if (board) board.innerHTML = _renderBoard();
  } catch(e) { alert('Erro ao adicionar: ' + e.message); }
};

window._eqRemoverMembro = async function(colaboradorId, equipeId) {
  if (!confirm('Mover colaborador para Fora de Equipe?')) return;
  try {
    await _eq_del(`/equipes/${equipeId}/membros/${colaboradorId}`);
    const eq = _equipes.find(e => e.id === equipeId);
    if (eq) {
      const idx = eq.membros.findIndex(m => (m.colaborador_id||m.id) === colaboradorId);
      if (idx !== -1) {
        const [m] = eq.membros.splice(idx, 1);
        _semEquipe.push({ id: colaboradorId, nome_completo: m.nome_completo||m.nome, cargo: m.cargo||'', foto_base64: m.foto_base64||null });
      }
    }
    _reRenderFora();
    _reRenderColuna(equipeId);
    if (typeof window.showToast === 'function') window.showToast('Colaborador movido para Fora de Equipe', 'success');
  } catch(e) { alert('Erro: ' + e.message); }
};

function _mostrarSkeleton() {
  const board = document.getElementById('equipes-board');
  if (!board) return;
  board.innerHTML = Array(6).fill(0).map(() => `
  <div style="width:240px;min-width:240px;background:#e2e8f0;border-radius:14px;height:320px;animation:eq-pulse 1.5s ease-in-out infinite;">
    <div style="height:70px;background:#cbd5e1;border-radius:12px 12px 0 0;"></div>
    <div style="padding:.75rem;display:flex;flex-direction:column;gap:.5rem;">
      ${Array(3).fill('<div style="height:56px;background:#e2e8f0;border-radius:8px;"></div>').join('')}
    </div>
  </div>`).join('');
  const style = document.createElement('style');
  style.textContent = '@keyframes eq-pulse{0%,100%{opacity:1}50%{opacity:.5}}';
  document.head.appendChild(style);
}

})();
