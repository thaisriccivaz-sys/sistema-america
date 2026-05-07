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

let _equipes = JSON.parse(JSON.stringify(COLUNAS_DEFAULT));
let _busca = '';

// ── Drag state ───────────────────────────────────────────────────────────────
let _drag = { membroId: null, origemEquipeId: null };

window.initEquipes = function () {
  const el = document.getElementById('equipes-container');
  if (!el) return;
  _renderAll(el);
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

function _renderBoard(busca) {
  const b = (busca || _busca || '').toLowerCase();
  return _equipes.map(eq => {
    const membros = b ? eq.membros.filter(m => m.nome.toLowerCase().includes(b)) : eq.membros;
    const completa = membros.some(m => m.funcao === 'motorista') && membros.some(m => m.funcao === 'ajudante');
    const indicadorCor = membros.length === 0 ? '#ef4444' : completa ? '#22c55e' : '#f59e0b';
    return `
    <div class="eq-col" data-equipe-id="${eq.id}">
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
  const iniciais = (m.nome || '?').split(' ').slice(0,2).map(p => p[0]).join('').toUpperCase();
  const avatarBg = ['#6366f1','#8b5cf6','#ec4899','#14b8a6','#f97316','#84cc16'][m.id % 6];
  const avatarHtml = m.foto
    ? `<img class="eq-avatar" src="${m.foto}" alt="${m.nome}" style="${afastado?'border-color:#ef4444;border-width:2px;':''}">`
    : `<div class="eq-avatar-placeholder" style="background:${avatarBg};${afastado?'border:2px solid #ef4444;':''}">${iniciais}</div>`;
  return `
  <div class="eq-card" data-membro-id="${m.id}" data-equipe-id="${m.equipe_id}"
    draggable="true"
    ondragstart="window._eqDragStart(event,${m.id},${m.equipe_id})"
    ondragend="window._eqDragEnd(event)"
    style="${afastado?'border-color:#fca5a5;background:#fff5f5;':''}">
    ${avatarHtml}
    <div class="eq-card-info">
      <div class="eq-card-name">${m.nome}</div>
      <span class="eq-card-func" style="background:${fs.bg};color:${fs.color};">${fs.label}</span>
      ${m.escala ? `<div class="eq-card-escala">${m.escala}</div>` : ''}
    </div>
    <div class="eq-status-dot" title="${m.status||'ativo'}" style="background:${sc};"></div>
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

window._equipesConfirmarNova = function() {
  const nome = document.getElementById('eq-modal-nome').value.trim();
  const horario = document.getElementById('eq-modal-horario').value.trim();
  const cor = document.getElementById('eq-modal-cor').value;
  if (!nome) { alert('Informe o nome da equipe'); return; }
  const newId = Date.now();
  _equipes.push({ id: newId, nome, horario: horario || 'Variável', cor, icone: 'ph-users', membros: [] });
  document.getElementById('eq-modal').style.display = 'none';
  const board = document.getElementById('equipes-board');
  if (board) board.innerHTML = _renderBoard();
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

window._eqDrop = function(ev, equipeDestinoId) {
  ev.preventDefault();
  const body = document.getElementById(`eq-body-${equipeDestinoId}`);
  if (body) body.classList.remove('drag-over');

  const { membroId, origemEquipeId } = _drag;
  if (!membroId || equipeDestinoId === origemEquipeId) return;

  // Encontrar e mover o membro no estado
  const origem = _equipes.find(e => e.id === origemEquipeId);
  const destino = _equipes.find(e => e.id === equipeDestinoId);
  if (!origem || !destino) return;

  const idx = origem.membros.findIndex(m => m.id === membroId);
  if (idx === -1) return;

  const [membro] = origem.membros.splice(idx, 1);
  membro.equipe_id = equipeDestinoId;
  destino.membros.push(membro);

  // Re-renderizar só as duas colunas afetadas
  _reRenderColuna(origemEquipeId);
  _reRenderColuna(equipeDestinoId);

  if (typeof window.showToast === 'function') {
    window.showToast(`${membro.nome} movido para ${destino.nome}`, 'success');
  }

  _drag = { membroId: null, origemEquipeId: null };
};

function _reRenderColuna(equipeId) {
  const eq = _equipes.find(e => e.id === equipeId);
  if (!eq) return;
  // Atualiza o badge de contagem no header
  const badge = document.querySelector(`[data-equipe-id="${equipeId}"] .eq-badge`);
  if (badge) badge.textContent = eq.membros.length;
  // Atualiza o indicador de completude
  const completa = eq.membros.some(m => m.funcao === 'motorista') && eq.membros.some(m => m.funcao === 'ajudante');
  const indicadorCor = eq.membros.length === 0 ? '#ef4444' : completa ? '#22c55e' : '#f59e0b';
  const indicator = document.querySelector(`[data-equipe-id="${equipeId}"] .eq-indicator`);
  if (indicator) indicator.style.background = indicadorCor;
  // Re-renderiza o corpo
  const body = document.getElementById(`eq-body-${equipeId}`);
  if (!body) return;
  const b = _busca.toLowerCase();
  const membros = b ? eq.membros.filter(m => m.nome.toLowerCase().includes(b)) : eq.membros;
  body.innerHTML = membros.length
    ? membros.map(m => _renderCard(m)).join('')
    : '<div class="eq-empty"><i class="ph ph-users" style="font-size:1.5rem;display:block;margin-bottom:4px;"></i>Sem membros</div>';
}

window._equipesAdicionarMembro = function(equipeId) {
  // Placeholder — será expandido na integração com backend
  const nome = prompt('Nome do colaborador (temporário):');
  if (!nome) return;
  const eq = _equipes.find(e => e.id === equipeId);
  if (!eq) return;
  eq.membros.push({
    id: Date.now(), equipe_id: equipeId, nome,
    funcao: 'ajudante', status: 'ativo', escala: '', foto: null
  });
  const board = document.getElementById('equipes-board');
  if (board) board.innerHTML = _renderBoard();
};

})();
