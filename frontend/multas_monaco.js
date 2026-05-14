// ─── MÔNACO MULTAS MODULE ───────────────────────────────────────────────────
(function() {
'use strict';

const TIPO_CONFIG = {
    'notificacao': { label: 'Notificação',  bg: '#fff7cd', color: '#7c4a00', icon: 'ph-bell' },
    'multa':       { label: 'Multa',        bg: '#ffe4e4', color: '#991b1b', icon: 'ph-warning-circle' },
    'remulta':     { label: 'Re-Multa',     bg: '#fde8d8', color: '#7c2d12', icon: 'ph-warning' },
    'multa-paga':  { label: 'Multa Paga',   bg: '#dcfce7', color: '#14532d', icon: 'ph-check-circle' },
};

const GRAV_COLOR = { 'Grave': '#ef4444', 'Média': '#f97316', 'Leve': '#eab308', 'Gravíssima': '#7c3aed' };

let _multas = [];
let _filtroTipo = '';
let _filtroPlaca = '';
let _filtroVisualizada = '';
let _selectedId = null;

// ── Init ──────────────────────────────────────────────────────────────────────
window.initMultasMonaco = async function() {
    const container = document.getElementById('multas-monaco-container');
    if (!container) return;
    container.innerHTML = '<p style="padding:2rem;color:#64748b;">Carregando...</p>';
    await _carregarMultas();
    _renderPage(container);
    _atualizarBadgeMenu();
};

async function _carregarMultas() {
    try {
        const params = new URLSearchParams();
        if (_filtroTipo) params.set('tipo', _filtroTipo);
        if (_filtroPlaca) params.set('placa', _filtroPlaca);
        if (_filtroVisualizada !== '') params.set('visualizada', _filtroVisualizada);
        params.set('limit', '300');
        const res = await apiGet('/monaco/multas?' + params.toString());
        _multas = res.multas || [];
    } catch(e) {
        console.error('[Monaco]', e);
        _multas = [];
    }
}

async function _atualizarBadgeMenu() {
    try {
        const res = await apiGet('/monaco/multas/count/novas');
        const badge = document.getElementById('monaco-badge');
        if (badge) {
            if (res.novas > 0) {
                badge.textContent = res.novas;
                badge.style.display = 'inline-flex';
            } else {
                badge.style.display = 'none';
            }
        }
    } catch(e) {}
}

// ── Render Page ───────────────────────────────────────────────────────────────
function _renderPage(container) {
    const novas = _multas.filter(m => !m.visualizada).length;
    container.innerHTML = `
    <div style="max-width:1400px;margin:0 auto;">
        <!-- Header -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem;flex-wrap:wrap;gap:1rem;">
            <div style="display:flex;align-items:center;gap:12px;">
                <div style="width:44px;height:44px;background:linear-gradient(135deg,#dc2626,#991b1b);border-radius:12px;display:flex;align-items:center;justify-content:center;">
                    <i class="ph ph-car" style="color:#fff;font-size:1.4rem;"></i>
                </div>
                <div>
                    <h2 style="margin:0;font-size:1.4rem;font-weight:800;color:#1e293b;">Multas Mônaco</h2>
                    <p style="margin:0;font-size:0.82rem;color:#64748b;">Infrações recebidas via webhook da plataforma Mônaco</p>
                </div>
            </div>
            ${novas > 0 ? `<div style="background:#fef2f2;border:1.5px solid #fca5a5;border-radius:10px;padding:0.6rem 1.2rem;display:flex;align-items:center;gap:8px;color:#991b1b;font-weight:700;">
                <i class="ph ph-bell-ringing"></i> ${novas} nova${novas>1?'s':''} multa${novas>1?'s':''} não visualizada${novas>1?'s':''}
            </div>` : ''}
        </div>

        <!-- Filtros -->
        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:1rem 1.25rem;margin-bottom:1.25rem;display:flex;gap:0.75rem;flex-wrap:wrap;align-items:flex-end;">
            <div style="display:flex;flex-direction:column;gap:4px;">
                <label style="font-size:0.75rem;font-weight:600;color:#475569;">Tipo</label>
                <select id="monaco-filtro-tipo" onchange="window._monacoFiltrar()" style="height:36px;padding:0 0.6rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;">
                    <option value="">Todos</option>
                    <option value="notificacao">Notificação</option>
                    <option value="multa">Multa</option>
                    <option value="remulta">Re-Multa</option>
                    <option value="multa-paga">Multa Paga</option>
                </select>
            </div>
            <div style="display:flex;flex-direction:column;gap:4px;">
                <label style="font-size:0.75rem;font-weight:600;color:#475569;">Placa</label>
                <input id="monaco-filtro-placa" type="text" placeholder="Ex: ABC1234" oninput="window._monacoFiltrar()" style="height:36px;padding:0 0.6rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;width:120px;">
            </div>
            <div style="display:flex;flex-direction:column;gap:4px;">
                <label style="font-size:0.75rem;font-weight:600;color:#475569;">Status</label>
                <select id="monaco-filtro-vis" onchange="window._monacoFiltrar()" style="height:36px;padding:0 0.6rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;">
                    <option value="">Todas</option>
                    <option value="0">Novas</option>
                    <option value="1">Visualizadas</option>
                </select>
            </div>
            <button onclick="window._monacoFiltrar()" style="height:36px;padding:0 1rem;background:#1e293b;color:#fff;border:none;border-radius:6px;font-weight:600;cursor:pointer;font-size:0.85rem;display:flex;align-items:center;gap:6px;">
                <i class="ph ph-funnel"></i> Filtrar
            </button>
            <button onclick="window._monacoMarcarTodasLidas()" style="height:36px;padding:0 1rem;background:#f1f5f9;color:#475569;border:1px solid #e2e8f0;border-radius:6px;font-weight:600;cursor:pointer;font-size:0.85rem;display:flex;align-items:center;gap:6px;" title="Marcar todas como lidas">
                <i class="ph ph-check-square"></i> Marcar todas lidas
            </button>
        </div>

        <!-- Tabela -->
        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
            <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;font-size:0.9rem;">
                <thead style="position:sticky; top:0; z-index:2; background:#f8fafc; outline:1px solid #e2e8f0;">
                    <tr style="text-align:left;">
                        <th style="padding:1rem; font-weight:600; color:#475569; white-space:nowrap;">AIT</th>
                        <th style="padding:1rem; font-weight:600; color:#475569;">Placa</th>
                        <th style="padding:1rem; font-weight:600; color:#475569; white-space:nowrap;">Data/Hora</th>
                        <th style="padding:1rem; font-weight:600; color:#475569; white-space:nowrap;">Motivo</th>
                        <th style="padding:1rem; font-weight:600; color:#475569; white-space:nowrap;">Motorista</th>
                        <th style="padding:1rem; font-weight:600; color:#475569; white-space:nowrap;">Status</th>
                        <th style="padding:1rem; font-weight:600; color:#475569; white-space:nowrap;">Data Limite</th>
                        <th style="padding:1rem; font-weight:600; color:#475569; text-align:center;">Ações</th>
                    </tr>
                </thead>
                <tbody id="monaco-tbody">
                    ${_renderRows()}
                </tbody>
            </table>
            </div>
            ${_multas.length === 0 ? `<div style="text-align:center;padding:3rem;color:#94a3b8;"><i class="ph ph-empty" style="font-size:3rem;"></i><p style="margin-top:0.5rem;">Nenhuma multa encontrada</p></div>` : ''}
        </div>

        <!-- Count -->
        <p style="margin-top:0.75rem;font-size:0.78rem;color:#94a3b8;text-align:right;">${_multas.length} registro${_multas.length!==1?'s':''}</p>
    </div>

    <!-- Detail Drawer -->
    <div id="monaco-drawer" style="display:none;position:fixed;top:0;right:0;width:480px;height:100vh;background:#fff;box-shadow:-8px 0 32px rgba(0,0,0,0.18);z-index:99999;overflow-y:auto;flex-direction:column;">
        <div id="monaco-drawer-content"></div>
    </div>
    `;
}

function _renderRows() {
    if (!_multas.length) return '';
    return _multas.map(m => {
        const tc = TIPO_CONFIG[m.tipo_evento] || TIPO_CONFIG['notificacao'];
        const isNova = !m.visualizada;
        const dataFmt = m.data_da_infracao ? m.data_da_infracao.split('-').reverse().join('/') : '—';
        const horaFmt = m.hora_da_infracao || '—';
        const motivo = m.descricao || '—';
        const condutor = (m.condutor && m.condutor !== 'não informado') ? m.condutor : '—';
        const dataLimiteVal = m.prazo_identificacao_condutor || m.vencimento_multa || '';

        let motoristaHtml = `<span style="font-weight:600; color:#0f172a;">${condutor}</span>`;
        if (condutor === '—') {
             motoristaHtml = `<button onclick="window._monacoAbrirDetalhe(${m.id})" style="background:#f1f5f9; color:#2563eb; border:1px solid #cbd5e1; padding:0.3rem 0.6rem; border-radius:4px; cursor:pointer; font-size:0.8rem; font-weight:600;">+ Adicionar Motorista</button>`;
        }
        
        const statusHtml = `<span style="background:${tc.bg}; color:${tc.color}; padding:4px 8px; border-radius:12px; font-size:0.8rem; font-weight:600; white-space:nowrap;">${tc.label}</span>`;
        
        let dataLimiteHtml = '—';
        if (dataLimiteVal) {
             let fmt = '';
             let isoDateForDiff = '';
             if (dataLimiteVal.includes('/')) {
                 fmt = dataLimiteVal;
                 const parts = dataLimiteVal.split('/');
                 if (parts.length === 3) {
                     isoDateForDiff = `${parts[2]}-${parts[1]}-${parts[0]}T12:00:00`;
                 } else {
                     isoDateForDiff = new Date().toISOString(); // fallback
                 }
             } else {
                 const [y, mm, d] = dataLimiteVal.split('-');
                 fmt = `${d}/${mm}/${y}`;
                 isoDateForDiff = dataLimiteVal + 'T12:00:00';
             }
             
             const diff = Math.ceil((new Date(isoDateForDiff) - new Date()) / 86400000);
             if (diff <= 10 && !isNaN(diff)) {
                  const urgente = diff <= 0 ? 'VENCIDA' : `${diff}d`;
                  dataLimiteHtml = `<span style="color:#dc2626;font-weight:700;white-space:nowrap;" title="${urgente}">⚠️ ${fmt}</span>`;
             } else {
                  dataLimiteHtml = `<span style="white-space:nowrap;">${fmt}</span>`;
             }
        }

        let statusVisBadge = '';
        const sv = m.status_visualizacao || (m.visualizada ? 'vista' : 'nova');
        if (sv === 'nova') {
            statusVisBadge = `<span style="background:#ef4444;color:#fff;padding:2px 6px;border-radius:10px;font-size:0.6rem;font-weight:800;letter-spacing:0.05em;margin-left:5px;vertical-align:middle;">NOVA</span>`;
        } else if (sv === 'atualizado') {
            statusVisBadge = `<span style="background:#f97316;color:#fff;padding:2px 6px;border-radius:10px;font-size:0.6rem;font-weight:800;letter-spacing:0.05em;margin-left:5px;vertical-align:middle;">ATUALIZADO</span>`;
        } else {
            statusVisBadge = `<span style="color:#94a3b8;font-size:0.75rem;margin-left:5px;vertical-align:middle;"><i class="ph ph-check"></i> Vista</span>`;
        }

        const rowBg = (sv === 'nova' || sv === 'atualizado') ? '#fffbf0' : 'transparent';
        const rowBgHover = '#f8fafc';
        return `<tr style="border-bottom:1px solid #e2e8f0; transition:background 0.2s; background:${rowBg};" onmouseover="this.style.background='${rowBgHover}'" onmouseout="this.style.background='${rowBg}'">
                <td style="padding:1rem;"><strong>${m.numero_ait||'—'}</strong>${statusVisBadge}</td>
                <td style="padding:1rem; font-weight:600; color:#334155; white-space:nowrap;">${m.placa||'—'}</td>
                <td style="padding:1rem;">${dataFmt}<br><span style="color:#64748b; font-size:0.8rem;">${horaFmt}</span></td>
                <td style="padding:1rem; max-width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${motivo}">${motivo}</td>
                <td style="padding:1rem;">${motoristaHtml}</td>
                <td style="padding:1rem;">${statusHtml}</td>
                <td style="padding:1rem; white-space:nowrap;">${dataLimiteHtml}</td>
                <td style="padding:1rem; text-align:center; min-width:140px; white-space:nowrap;">
                    <button onclick="window._monacoAbrirDetalhe(${m.id})" style="background:transparent; border:none; cursor:pointer; color:#2563eb; margin-right:8px;" title="Detalhes / Gerenciar"><i class="ph ph-pencil-simple" style="font-size:1.2rem;"></i></button>
                    ${(m.arquivos_json && m.arquivos_json !== '[]') ? `<button onclick="window._monacoAbrirDetalhe(${m.id})" style="background:transparent; border:none; cursor:pointer; color:#10b981; margin-right:8px;" title="Ver Documentos"><i class="ph ph-file-pdf" style="font-size:1.2rem;"></i></button>` : ''}
                </td>
            </tr>`;
    }).join('');
}

// ── Filtrar ───────────────────────────────────────────────────────────────────
window._monacoFiltrar = async function() {
    _filtroTipo = document.getElementById('monaco-filtro-tipo')?.value || '';
    _filtroPlaca = document.getElementById('monaco-filtro-placa')?.value || '';
    _filtroVisualizada = document.getElementById('monaco-filtro-vis')?.value ?? '';
    await _carregarMultas();
    const tbody = document.getElementById('monaco-tbody');
    if (tbody) tbody.innerHTML = _renderRows();
};

// ── Detalhe ───────────────────────────────────────────────────────────────────
window._monacoAbrirDetalhe = async function(id) {
    _selectedId = id;
    const m = _multas.find(x => x.id === id);
    if (!m) return;

    // Marcar como visualizada
    if (!m.visualizada) {
        try {
            await fetch(`/api/monaco/multas/${id}/visualizar`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${window.currentToken}` }
            });
            m.visualizada = 1;
            m.status_visualizacao = 'vista';
            // Atualizar badge na linha da tabela
            const badge = document.querySelector(`#monaco-tbody tr td:first-child`);
            const allRows = document.querySelectorAll('#monaco-tbody tr');
            allRows.forEach(row => {
                const btn = row.querySelector(`button[onclick="window._monacoAbrirDetalhe(${id})"]`);
                if (btn) {
                    const td = row.querySelector('td:first-child');
                    if (td) {
                        const spans = td.querySelectorAll('span');
                        spans.forEach(s => { if (s.textContent === 'NOVA' || s.textContent === 'ATUALIZADO') s.remove(); });
                        const vistaSpan = document.createElement('span');
                        vistaSpan.style.cssText = 'color:#94a3b8;font-size:0.75rem;margin-left:5px;vertical-align:middle;';
                        vistaSpan.innerHTML = '<i class="ph ph-check"></i> Vista';
                        td.appendChild(vistaSpan);
                    }
                    row.style.background = 'transparent';
                }
            });
            _atualizarBadgeMenu();
        } catch(e) {}
    }

    const tc = TIPO_CONFIG[m.tipo_evento] || TIPO_CONFIG['notificacao'];
    const gc = GRAV_COLOR[m.gravidade] || '#64748b';

    const fmtVal = v => v ? `R$ ${parseFloat(v).toFixed(2).replace('.',',')}` : '—';
    const fmtStr = s => s && s !== 'não informado' ? s : '—';

    let arquivosHtml = '';
    try {
        const arqs = JSON.parse(m.arquivos_json || '[]');
        if (arqs.length > 0) {
            arquivosHtml = `<div style="margin-top:1rem;padding:1rem;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">
                <p style="font-size:0.78rem;font-weight:700;color:#334155;margin:0 0 0.5rem;">📎 Documentos Anexados (${arqs.length})</p>
                ${arqs.map((a,i) => `<div style="display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid #f1f5f9;">
                    <i class="ph ph-file-pdf" style="color:#ef4444;"></i>
                    <span style="font-size:0.8rem;color:#475569;">${a.nome || `Arquivo ${i+1}`}</span>
                    ${a.base64 ? `<button onclick="window._monacoVerPDF('${a.base64}','${a.nome||'arquivo.pdf'}')" style="margin-left:auto;background:#0f172a;color:#fff;border:none;border-radius:4px;padding:2px 8px;font-size:0.72rem;cursor:pointer;">Ver PDF</button>` : ''}
                </div>`).join('')}
            </div>`;
        }
    } catch(e) {}

    const retornoOpts = ['se identificou', 'optou por nao se identificar', 'ainda nao respondeu', 'pendente'];

    const drawer = document.getElementById('monaco-drawer');
    document.getElementById('monaco-drawer-content').innerHTML = `
        <div style="background:#1e293b;padding:1.25rem 1.5rem;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">
            <div style="display:flex;align-items:center;gap:10px;">
                <span style="background:${tc.bg};color:${tc.color};padding:3px 12px;border-radius:8px;font-size:0.8rem;font-weight:700;"><i class="ph ${tc.icon}"></i> ${tc.label}</span>
                <span style="color:#f1f5f9;font-weight:700;font-size:1rem;">${m.placa || '—'}</span>
            </div>
            <button onclick="document.getElementById('monaco-drawer').style.display='none'" style="background:rgba(255,255,255,0.1);border:none;color:#94a3b8;width:32px;height:32px;border-radius:8px;cursor:pointer;font-size:1.2rem;">×</button>
        </div>
        <div style="padding:1.5rem;display:flex;flex-direction:column;gap:1.25rem;">
            <!-- Info grid -->
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;">
                ${_campo('Placa', m.placa)}
                ${_campo('Renavam', m.renavam)}
                ${_campo('AIT', m.numero_ait)}
                ${_campo('Enquadramento', m.enquadramento)}
                ${_campo('Artigo CTB', m.artigo_ctb)}
                ${_campo('Pontos', m.pontos)}
                ${_campo('Gravidade', `<span style="color:${gc};font-weight:700;">${m.gravidade||'—'}</span>`)}
                ${_campo('Data Infração', m.data_da_infracao)}
                ${_campo('Hora', m.hora_da_infracao)}
                ${_campo('Cidade', m.cidade)}
            </div>
            ${_campoFull('Descrição', m.descricao)}
            ${_campoFull('Local', m.local_infracao)}
            ${_campoFull('Órgão Autuador', m.orgao_autuador)}

            <hr style="border:0;border-top:1px solid #f1f5f9;">
            <p style="font-size:0.78rem;font-weight:700;color:#334155;margin:0;text-transform:uppercase;letter-spacing:0.05em;">Valores</p>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.75rem;">
                ${_campo('Valor', fmtVal(m.valor_da_infracao))}
                ${_campo('Com desconto', fmtVal(m.valor_com_desconto))}
                ${_campo('Pago', fmtVal(m.valor_pago))}
                ${_campo('Vencimento', m.vencimento_multa||'—')}
                ${_campo('Data Pgto', m.data_pagamento_da_multa||'—')}
                ${_campo('Emissão', m.data_emissao||'—')}
            </div>

            <hr style="border:0;border-top:1px solid #f1f5f9;">
            <p style="font-size:0.78rem;font-weight:700;color:#334155;margin:0;text-transform:uppercase;letter-spacing:0.05em;">Condutor & Notificação</p>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;">
                ${_campo('Condutor', fmtStr(m.condutor))}
                ${_campo('Gestor', fmtStr(m.gestor))}
                ${_campo('Frota ID', m.fleet_id||'—')}
                ${_campo('Número Frota', m.numero_frota||'—')}
                ${_campo('Prazo Identificação', m.prazo_identificacao_condutor||'—')}
                ${_campo('Retorno Condutor', m.retorno_condutor||'—')}
            </div>

            ${m.controle_notificacao ? _campoFull('Controle Notificação', m.controle_notificacao) : ''}
            ${m.controle_da_multa ? _campoFull('Controle da Multa', m.controle_da_multa) : ''}

            ${arquivosHtml}

            <!-- Obs interna -->
            <div>
                <label style="font-size:0.78rem;font-weight:700;color:#334155;display:block;margin-bottom:4px;">📝 Observação Interna</label>
                <textarea id="monaco-obs-input" style="width:100%;border:1px solid #cbd5e1;border-radius:6px;padding:0.5rem;font-size:0.85rem;resize:vertical;min-height:70px;" placeholder="Anotações internas...">${m.observacao_interna||''}</textarea>
                <button onclick="window._monacoSalvarObs(${m.id})" style="margin-top:6px;background:#334155;color:#fff;border:none;border-radius:6px;padding:6px 16px;font-size:0.82rem;font-weight:600;cursor:pointer;">Salvar Obs.</button>
            </div>
        </div>
    `;
    drawer.style.display = 'flex';
};

function _campo(label, val) {
    return `<div style="background:#f8fafc;border-radius:6px;padding:0.5rem 0.75rem;">
        <p style="margin:0;font-size:0.68rem;color:#94a3b8;font-weight:600;text-transform:uppercase;">${label}</p>
        <p style="margin:2px 0 0;font-size:0.85rem;font-weight:600;color:#334155;">${val||'—'}</p>
    </div>`;
}
function _campoFull(label, val) {
    return `<div style="background:#f8fafc;border-radius:6px;padding:0.5rem 0.75rem;">
        <p style="margin:0;font-size:0.68rem;color:#94a3b8;font-weight:600;text-transform:uppercase;">${label}</p>
        <p style="margin:2px 0 0;font-size:0.85rem;color:#334155;">${val||'—'}</p>
    </div>`;
}

// ── Salvar Observação ─────────────────────────────────────────────────────────
window._monacoSalvarObs = async function(id) {
    const obs = document.getElementById('monaco-obs-input')?.value || '';
    try {
        await fetch(`/api/monaco/multas/${id}/observacao`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${window.currentToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ observacao_interna: obs })
        });
        const m = _multas.find(x => x.id === id);
        if (m) m.observacao_interna = obs;
        if (typeof window.showToast === 'function') window.showToast('Observação salva!', 'success');
    } catch(e) { alert('Erro ao salvar: ' + e.message); }
};

// ── Marcar todas lidas ────────────────────────────────────────────────────────
window._monacoMarcarTodasLidas = async function() {
    const novas = _multas.filter(m => !m.visualizada);
    if (!novas.length) return;
    if (!confirm(`Marcar ${novas.length} multa(s) como lidas?`)) return;
    await Promise.all(novas.map(m =>
        fetch(`/api/monaco/multas/${m.id}/visualizar`, {
            method: 'PATCH', headers: { 'Authorization': `Bearer ${window.currentToken}` }
        })
    ));
    await _carregarMultas();
    const container = document.getElementById('multas-monaco-container');
    if (container) _renderPage(container);
    _atualizarBadgeMenu();
};

// ── Ver PDF base64 ────────────────────────────────────────────────────────────
window._monacoVerPDF = function(base64, nome) {
    const byteString = atob(base64);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
    const blob = new Blob([ab], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const win = window.open('', '_blank');
    win.document.write(`<iframe src="${url}" style="width:100%;height:100vh;border:none;"></iframe>`);
};

})();
