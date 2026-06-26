// frontend/treinamento_presenca.js
// Módulo de Controle de Presenças — com assinatura digital e selfie
(function () {
    'use strict';

    // ── Estado ────────────────────────────────────────────────────────────────
    let _dados = [];
    let _filtroDepto = '';
    let _filtroTipoDepto = '';
    let _filtroBusca = '';
    let _assinCtx = null;
    let _assinDesenhando = false;
    let _assinTreinamento = null; // { treinamento, colaborador }
    let _selfieStream = null;
    let _selfieBase64 = '';
    let _assinaturaBase64 = '';
    let _passoAtual = 1;

    function tok() {
        return window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
    }
    function api(path, opts = {}) {
        return fetch((window.API_URL || '') + path, {
            ...opts,
            headers: { Authorization: 'Bearer ' + tok(), ...(opts.headers || {}) }
        });
    }
    function fmtData(iso) {
        if (!iso) return '—';
        try {
            const d = new Date(iso);
            return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        } catch { return iso; }
    }
    function getInstrutorNome() {
        // Tenta pegar o usuário logado salvo no localStorage pelo app.js
        try {
            const saved = localStorage.getItem('erp_user');
            if (saved) {
                const u = JSON.parse(saved);
                return u.nome || u.username || u.email || 'Instrutor';
            }
        } catch (e) { /* ignora */ }
        return window.currentUser?.nome
            || window.currentUser?.username
            || window.currentUsername
            || localStorage.getItem('erp_username')
            || localStorage.getItem('username')
            || 'Instrutor';
    }

    // ── Carregar dados ────────────────────────────────────────────────────────
    async function carregarDados() {
        let tipoAtual = window._currentTreinamentoTipo || 'treinamento';
        
        // FORÇA o tipo baseado na aba ativa no DOM para evitar falhas de estado
        const tabAtiva = document.querySelector('.app-top-tab.active');
        if (tabAtiva) {
            const onclickText = tabAtiva.getAttribute('onclick') || '';
            if (onclickText.includes('treinamento-presenca-terapia')) {
                tipoAtual = 'terapia';
                window._currentTreinamentoTipo = 'terapia';
            } else if (onclickText.includes('treinamento-presenca')) {
                tipoAtual = 'treinamento';
                window._currentTreinamentoTipo = 'treinamento';
            }
        }

        const view = document.getElementById('view-treinamento-presenca');
        if (view) {
            const h1 = view.querySelector('h1');
            const p = view.querySelector('p');
            if (tipoAtual === 'terapia') {
                if (h1) h1.textContent = 'Palestras listas';
                if (p) p.textContent = 'Visualize e registre a presença em terapias por colaborador.';
            } else {
                if (h1) h1.textContent = 'Treinamentos - Presença';
                if (p) p.textContent = 'Visualize e registre a conclusão de treinamentos por colaborador.';
            }
        }

        const grid = document.getElementById('presenca-colaboradores-grid');
        if (grid) grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:3rem;color:#94a3b8;">
            <i class="ph ph-spinner" style="font-size:2rem;animation:spin 1s linear infinite;display:block;margin-bottom:8px;"></i>
            Carregando colaboradores...
        </div>`;

        try {
            const r = await api('/treinamento-presenca/colaboradores');
            if (!r.ok) throw new Error('Erro ao carregar');
            _dados = await r.json();
        } catch (e) {
            console.error('[PRESENÇA]', e);
            _dados = [];
        }
        _popularFiltroDepto();
        renderizar();
    }

    function _popularFiltroDepto() {
        const sel = document.getElementById('pres-filtro-depto');
        if (!sel) return;
        const deptos = [...new Set(_dados.map(c => c.departamento).filter(Boolean))].sort();
        sel.innerHTML = '<option value="">Todos os departamentos</option>' +
            deptos.map(d => `<option value="${d}">${d}</option>`).join('');
    }

    // ── Renderizar cards ──────────────────────────────────────────────────────
    function renderizar() {
        const grid = document.getElementById('presenca-colaboradores-grid');
        const counter = document.getElementById('pres-counter');
        if (!grid) return;

        const busca = (_filtroBusca || '').toLowerCase().trim();
        const depto = _filtroDepto;
        const tipoDepto = _filtroTipoDepto;

        let lista = _dados;
        if (depto) lista = lista.filter(c => c.departamento === depto);
        if (tipoDepto) lista = lista.filter(c => c.departamento_tipo === tipoDepto);
        if (busca) lista = lista.filter(c =>
            (c.nome_completo || '').toLowerCase().includes(busca) ||
            (c.cargo || '').toLowerCase().includes(busca)
        );

        const tipoAtual = window._currentTreinamentoTipo || 'treinamento';
        
        lista = lista.map(c => {
            const tr = (c.treinamentos || []).filter(t => (t.tipo || 'treinamento') === tipoAtual);
            return {
                ...c,
                treinamentos: tr,
                total: tr.length,
                concluidos: tr.filter(x => x.concluido).length
            };
        }).filter(c => c.total > 0 || c.treinamentos.length > 0);

        if (counter) counter.textContent = `${lista.length} colaborador(es)`;

        if (!lista.length) {
            grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:4rem;color:#94a3b8;">
                <i class="ph ph-users" style="font-size:3rem;display:block;margin-bottom:12px;color:#cbd5e1;"></i>
                <p style="font-size:1rem;font-weight:600;color:#64748b;margin:0 0 4px;">Nenhum colaborador encontrado</p>
                <p style="font-size:0.85rem;margin:0;">Ajuste os filtros ou cadastre treinamentos para os departamentos.</p>
            </div>`;
            return;
        }

        grid.innerHTML = lista.map(c => _cardHtml(c)).join('');
    }

    function _cardHtml(c) {
        const total = c.total || 0;
        const concluidos = c.concluidos || 0;
        const pendentes = total - concluidos;
        const pct = total ? Math.round((concluidos / total) * 100) : 0;

        const iniciais = (c.nome_completo || '?').split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
        const corBar = pct === 100 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
        const bgHeader = pendentes > 0
            ? 'linear-gradient(135deg,#ef4444,#dc2626)'
            : 'linear-gradient(135deg,#0e7490,#06b6d4)';

        const listaTrein = (c.treinamentos || []).map(t => {
            if (t.concluido) {
                const valStr = t.validade_dias > 0 ? `<br>Válido por ${t.validade_dias} meses` : '';
                const respStr = t.respondido_em ? `<br>Respondido: ${fmtData(t.respondido_em)}` : '';
                const encodedId = `${c.id},${t.id}`;
                
                const btnPesquisa = t.respondido_em 
                    ? `<button onclick="window.verResultadoPesquisaTreinamento(${t.id}, ${c.id})" title="Ver respostas da pesquisa" style="background:#10b981;color:#fff;border:1.5px solid #059669;border-radius:6px;padding:4px 8px;font-size:0.72rem;font-weight:600;cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;justify-content:center;gap:3px;width:100%;">
                        <i class="ph ph-chart-bar"></i>
                    </button>`
                    : `<button onclick="window.copiarLinkPesquisa(${t.id}, ${c.id}, this, '${t.nome.replace(/'/g, "\\'")}')" title="Copiar link da pesquisa" style="background:#fef3c7;color:#92400e;border:1.5px solid #fde68a;border-radius:6px;padding:4px 8px;font-size:0.72rem;font-weight:600;cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;justify-content:center;gap:3px;width:100%;"><i class="ph ph-link"></i></button>`;

                return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #f1f5f9;">
                    <i class="ph ph-check-circle" style="color:#10b981;font-size:1.1rem;flex-shrink:0;"></i>
                    <div style="flex:1;min-width:0;">
                        <div style="font-size:0.82rem;font-weight:600;color:#334155;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${t.nome}">${t.nome}</div>
                        <div style="font-size:0.72rem;color:#10b981;">Concluído em ${fmtData(t.data_conclusao)}${valStr}${respStr}</div>
                    </div>
                    <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0;min-width:38px;">
                        <button onclick="window._verDocTreinamento(${c.id},${t.id},'${(c.nome_completo||'').replace(/'/g,\"\\'\")}')" title="Ver documento assinado" style="background:#eff6ff;color:#1d4ed8;border:1.5px solid #bfdbfe;border-radius:6px;padding:4px 8px;font-size:0.72rem;font-weight:600;cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;justify-content:center;gap:3px;width:100%;"><i class="ph ph-eye"></i></button>
                        ${btnPesquisa}
                    </div>
                </div>`;
            } else if (t.vencido) {
                return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #f1f5f9;">
                    <i class="ph ph-warning-circle" style="color:#ef4444;font-size:1.1rem;flex-shrink:0;"></i>
                    <div style="flex:1;min-width:0;">
                        <div style="font-size:0.82rem;font-weight:600;color:#334155;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${t.nome}">${t.nome}</div>
                        <div style="font-size:0.72rem;color:#ef4444;">Vencido — renovar</div>
                    </div>
                    <button onclick="window.abrirAssinaturaTreinamento(${c.id},${t.id})"
                        style="background:#ef4444;color:#fff;border:none;border-radius:6px;padding:4px 10px;font-size:0.72rem;font-weight:600;cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;gap:4px;">
                        <i class="ph ph-pen-nib"></i> Renovar
                    </button>
                </div>`;
            } else {
                return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #f1f5f9;">
                    <i class="ph ph-clock" style="color:#f59e0b;font-size:1.1rem;flex-shrink:0;"></i>
                    <div style="flex:1;min-width:0;">
                        <div style="font-size:0.82rem;font-weight:600;color:#334155;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${t.nome}">${t.nome}</div>
                        <div style="font-size:0.72rem;color:#f59e0b;">Pendente</div>
                    </div>
                    <button onclick="window.abrirAssinaturaTreinamento(${c.id},${t.id})"
                        style="background:#0e7490;color:#fff;border:none;border-radius:6px;padding:4px 10px;font-size:0.72rem;font-weight:600;cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;gap:4px;">
                        <i class="ph ph-pen-nib"></i> Assinar
                    </button>
                </div>`;
            }
        }).join('');

        return `<div style="background:#fff;border-radius:14px;border:1px solid #e2e8f0;box-shadow:0 2px 8px rgba(0,0,0,0.05);overflow:hidden;display:flex;flex-direction:column;">
            <!-- Cabeçalho do card -->
            <div style="background:${bgHeader};padding:14px 16px;display:flex;align-items:center;gap:12px;transition:background 0.3s ease;">
                <div style="width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,0.25);display:flex;align-items:center;justify-content:center;font-size:1rem;font-weight:700;color:#fff;flex-shrink:0;overflow:hidden;position:relative;">
                    <img src="${API_URL}/colaboradores/foto/${c.id}?token=${currentToken}" 
                         style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0;" 
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" alt="Foto"/>
                    <div style="display:none;width:100%;height:100%;align-items:center;justify-content:center;">${iniciais}</div>
                </div>
                <div style="flex:1;min-width:0;">
                    <div style="color:#fff;font-weight:700;font-size:0.92rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${c.nome_completo}">${c.nome_completo}</div>
                    <div style="color:rgba(255,255,255,0.8);font-size:0.75rem;">${c.cargo || ''} ${c.departamento ? '· ' + c.departamento : ''}</div>
                </div>
                <!-- Ícone de histórico -->
                <button onclick="window.abrirHistoricoColaborador(${c.id},'${(c.nome_completo || '').replace(/'/g, "\\'")}')"
                    style="background:rgba(255,255,255,0.18);border:1.5px solid rgba(255,255,255,0.4);border-radius:8px;padding:6px 8px;cursor:pointer;color:#fff;display:inline-flex;align-items:center;gap:4px;font-size:0.72rem;font-weight:600;flex-shrink:0;"
                    title="Ver histórico de treinamentos">
                    <i class="ph ph-clock-counter-clockwise" style="font-size:1rem;"></i>
                </button>
            </div>
            <!-- Barra de progresso -->
            <div style="padding:10px 16px;background:#f8fafc;border-bottom:1px solid #e2e8f0;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">
                    <span style="font-size:0.75rem;font-weight:600;color:#475569;">Progresso de treinamentos</span>
                    <span style="font-size:0.75rem;font-weight:700;color:${corBar};">${concluidos}/${total} (${pct}%)</span>
                </div>
                <div style="background:#e2e8f0;border-radius:999px;height:6px;overflow:hidden;">
                    <div style="width:${pct}%;background:${corBar};height:100%;border-radius:999px;transition:width 0.4s ease;"></div>
                </div>
                <div style="display:flex;gap:12px;margin-top:6px;">
                    <span style="font-size:0.7rem;color:#10b981;display:flex;align-items:center;gap:3px;"><i class="ph ph-check-circle"></i> ${concluidos} concluído(s)</span>
                    <span style="font-size:0.7rem;color:#f59e0b;display:flex;align-items:center;gap:3px;"><i class="ph ph-clock"></i> ${pendentes} pendente(s)</span>
                </div>
            </div>
            <!-- Lista de treinamentos -->
            <div style="padding:8px 16px 12px;flex:1;overflow-y:auto;max-height:220px;">
                ${listaTrein || '<p style="font-size:0.82rem;color:#94a3b8;text-align:center;padding:1rem 0;">Nenhum treinamento aplicável</p>'}
            </div>
        </div>`;
    }

    // ── Histórico do colaborador ───────────────────────────────────────────────
    window.abrirHistoricoColaborador = async function (colaboradorId, nome) {
        // Criar modal de histórico
        let modal = document.getElementById('modal-historico-treinamento');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'modal-historico-treinamento';
            modal.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:20px;overflow-y:auto;background:rgba(0,0,0,0.6);';
            document.body.appendChild(modal);
        }

        modal.style.display = 'flex';
        modal.innerHTML = `<div style="background:#fff;border-radius:16px;width:100%;max-width:700px;margin:auto;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
            <div style="background:linear-gradient(135deg,#1e293b,#334155);padding:20px 24px;display:flex;align-items:center;justify-content:space-between;">
                <div>
                    <h3 style="margin:0;color:#fff;font-size:1.1rem;font-weight:700;"><i class="ph ph-clock-counter-clockwise"></i> Histórico de Treinamentos</h3>
                    <p style="margin:4px 0 0;color:rgba(255,255,255,0.7);font-size:0.82rem;">${nome}</p>
                </div>
                <button onclick="document.getElementById('modal-historico-treinamento').style.display='none'"
                    style="background:rgba(255,255,255,0.1);border:none;border-radius:8px;width:36px;height:36px;cursor:pointer;color:#fff;font-size:1.2rem;display:flex;align-items:center;justify-content:center;">
                    <i class="ph ph-x"></i>
                </button>
            </div>
            <div id="historico-corpo" style="padding:20px;">
                <div style="text-align:center;padding:2rem;color:#94a3b8;">
                    <i class="ph ph-spinner" style="font-size:2rem;animation:spin 1s linear infinite;display:block;margin-bottom:8px;"></i>
                    Carregando histórico...
                </div>
            </div>
        </div>`;

        try {
            const r = await api(`/treinamento-presenca/historico/${colaboradorId}`);
            const historico = r.ok ? await r.json() : [];
            const corpo = document.getElementById('historico-corpo');
            if (!corpo) return;

            if (!historico.length) {
                corpo.innerHTML = `<div style="text-align:center;padding:3rem;color:#94a3b8;">
                    <i class="ph ph-file-x" style="font-size:3rem;display:block;margin-bottom:12px;"></i>
                    <p style="margin:0;font-size:0.95rem;font-weight:600;color:#64748b;">Nenhum treinamento realizado ainda</p>
                </div>`;
                return;
            }

            corpo.innerHTML = historico.map(h => {
                const dt = fmtData(h.data_conclusao);
                const vencidoBadge = h.vencido
                    ? `<span style="background:#fef2f2;color:#ef4444;border-radius:10px;padding:2px 8px;font-size:0.7rem;font-weight:600;">VENCIDO</span>`
                    : `<span style="background:#f0fdf4;color:#10b981;border-radius:10px;padding:2px 8px;font-size:0.7rem;font-weight:600;">CONCLUÍDO</span>`;
                const validStr = h.validade_dias > 0 ? `<span style="font-size:0.72rem;color:#64748b;"> · Validade: ${h.validade_dias} meses</span>` : '';
                const instrutor = h.instrutor_nome ? `<span style="font-size:0.72rem;color:#64748b;"> · Instrutor: ${h.instrutor_nome}</span>` : '';
                const respStr = h.respondido_em ? `<br><span style="font-size:0.72rem;color:#64748b;">Respondido: ${fmtData(h.respondido_em)}</span>` : '';

                const temDoc = h.assinatura_base64 || h.selfie_base64;
                const btnDoc = temDoc
                    ? `<button onclick="window._verDocumentoAssinado('${encodeURIComponent(JSON.stringify({ assinatura: h.assinatura_base64, selfie: h.selfie_base64, capa: h.capa_url || '', nome: nome, treinamento: h.treinamento_nome, data: dt, instrutor: h.instrutor_nome || '' }))}')"
                        style="background:#eff6ff;color:#1d4ed8;border:1.5px solid #bfdbfe;border-radius:7px;padding:5px 10px;cursor:pointer;font-size:0.78rem;font-weight:600;display:inline-flex;align-items:center;gap:4px;">
                        <i class="ph ph-eye"></i> Ver documento
                      </button>
                      ${h.respondido_em 
                          ? `<button onclick="window.verResultadoPesquisaTreinamento(${h.treinamento_id}, ${colaboradorId})"
                                style="background:#10b981;color:#fff;border:1.5px solid #059669;border-radius:7px;padding:5px 10px;cursor:pointer;font-size:0.78rem;font-weight:600;display:inline-flex;align-items:center;gap:4px;">
                                <i class="ph ph-chart-bar"></i> Ver Respostas
                            </button>`
                          : `<button onclick="window.copiarLinkPesquisa(${h.treinamento_id}, ${colaboradorId}, this, '${h.treinamento_nome.replace(/'/g, "\\'")}')"
                                style="background:#fef3c7;color:#92400e;border:1.5px solid #fde68a;border-radius:7px;padding:5px 10px;cursor:pointer;font-size:0.78rem;font-weight:600;display:inline-flex;align-items:center;gap:4px;">
                                <i class="ph ph-link"></i> Copiar Link
                              </button>`
                      }`
                    : `<span style="font-size:0.75rem;color:#94a3b8;">Sem documento</span>`;

                return `<div style="border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;margin-bottom:12px;background:#fafafa;">
                    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;">
                        <div style="flex:1;min-width:0;">
                            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap;">
                                <span style="font-weight:700;font-size:0.9rem;color:#1e293b;">${h.treinamento_nome}</span>
                                ${vencidoBadge}
                            </div>
                            <div style="font-size:0.78rem;color:#64748b;">
                                <i class="ph ph-calendar"></i> ${dt}${validStr}${instrutor}${respStr}
                            </div>
                        </div>
                        <div style="display:flex;gap:8px;align-items:center;">
                            ${btnDoc}
                        </div>
                    </div>
                </div>`;
            }).join('');
        } catch (e) {
            const corpo = document.getElementById('historico-corpo');
            if (corpo) corpo.innerHTML = `<div style="text-align:center;padding:2rem;color:#ef4444;">Erro ao carregar histórico.</div>`;
        }
    };

    // ── Buscar e exibir documento assinado de um treinamento específico ───────────
    window._verDocTreinamento = async function (colaboradorId, treinamentoId, nomeColab) {
        try {
            const r = await api(`/treinamento-presenca/historico/${colaboradorId}`);
            const historico = r.ok ? await r.json() : [];
            const h = historico.find(x => x.treinamento_id === treinamentoId);
            if (!h) { alert('Documento não encontrado.'); return; }
            const dt = fmtData(h.data_conclusao);
            window._verDocumentoAssinado(encodeURIComponent(JSON.stringify({
                assinatura: h.assinatura_base64 || '',
                selfie: h.selfie_base64 || '',
                capa: h.capa_url || '',
                nome: nomeColab || '',
                treinamento: h.treinamento_nome || '',
                data: dt,
                instrutor: h.instrutor_nome || ''
            })));
        } catch (e) {
            alert('Erro ao carregar documento: ' + e.message);
        }
    };

    // ── Visualizar documento assinado (fullscreen split-screen) ────────────────
    window._verDocumentoAssinado = function (encodedData) {
        const data = JSON.parse(decodeURIComponent(encodedData));
        let fs = document.getElementById('fs-ver-documento');
        if (!fs) {
            fs = document.createElement('div');
            fs.id = 'fs-ver-documento';
            document.body.appendChild(fs);
        }
        fs.style.cssText = 'position:fixed;inset:0;z-index:10001;background:#0f172a;display:flex;flex-direction:column;overflow:hidden;font-family:inherit;';

        // Monta o painel esquerdo (capa) somente se tiver capa
        const capaPanel = data.capa ? `
            <div style="flex:1;min-width:0;background:#000;display:flex;align-items:center;justify-content:center;border-right:1px solid rgba(255,255,255,0.08);">
                <img src="${data.capa}" style="width:100%;height:100%;object-fit:contain;display:block;" />
            </div>` : '';

        // Painel direito: dados + assinatura + selfie
        const rightPanel = `
            <div style="${data.capa ? 'width:340px;min-width:260px;max-width:40%;' : 'flex:1;max-width:600px;margin:0 auto;'}background:#f8fafc;display:flex;flex-direction:column;overflow-y:auto;">
                <!-- Cabeçalho interno -->
                <div style="background:linear-gradient(135deg,#0e7490,#06b6d4);padding:14px 16px;flex-shrink:0;">
                    <p style="margin:0 0 2px;font-size:0.72rem;font-weight:700;color:rgba(255,255,255,0.7);letter-spacing:.06em;">DADOS DO REGISTRO</p>
                    <p style="margin:0 0 2px;font-size:0.85rem;color:#fff;"><strong>${data.nome}</strong></p>
                    <p style="margin:0 0 2px;font-size:0.8rem;color:rgba(255,255,255,0.85);">${data.treinamento}</p>
                    <p style="margin:0 0 2px;font-size:0.75rem;color:rgba(255,255,255,0.75);"><i class="ph ph-calendar"></i> ${data.data}</p>
                    ${data.instrutor ? `<p style="margin:0;font-size:0.75rem;color:rgba(255,255,255,0.75);"><i class="ph ph-chalkboard-teacher"></i> Instrutor: ${data.instrutor}</p>` : ''}
                </div>
                <!-- Conteúdo -->
                <div style="flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:12px;">
                    ${data.assinatura ? `<div style="background:#fff;border-radius:10px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
                        <p style="margin:0;background:#f1f5f9;padding:8px 12px;font-size:0.68rem;font-weight:700;color:#64748b;letter-spacing:.06em;">ASSINATURA DIGITAL</p>
                        <img src="${data.assinatura}" style="width:100%;object-fit:contain;display:block;" />
                    </div>` : '<p style="font-size:0.8rem;color:#94a3b8;text-align:center;padding:16px 0;">Sem assinatura registrada</p>'}

                    ${data.selfie ? `<div style="background:#fff;border-radius:10px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
                        <p style="margin:0;background:#f1f5f9;padding:8px 12px;font-size:0.68rem;font-weight:700;color:#64748b;letter-spacing:.06em;">SELFIE DE CONFIRMAÇÃO</p>
                        <img src="${data.selfie}" style="width:100%;object-fit:contain;display:block;" />
                    </div>` : ''}
                    <div style="height:4px;"></div>
                </div>
            </div>`;

        fs.innerHTML = `
            <!-- Barra de título -->
            <div style="background:#1e293b;padding:10px 16px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;border-bottom:1px solid rgba(255,255,255,0.08);">
                <div style="display:flex;align-items:center;gap:10px;">
                    <i class="ph ph-certificate" style="color:#06b6d4;font-size:1.1rem;"></i>
                    <span style="color:#fff;font-size:0.9rem;font-weight:700;">Documento Assinado</span>
                    <span style="color:rgba(255,255,255,0.5);font-size:0.8rem;">— ${data.treinamento}</span>
                </div>
                <button onclick="document.getElementById('fs-ver-documento').style.display='none'"
                    style="background:rgba(255,255,255,0.1);border:none;border-radius:50%;width:36px;height:36px;cursor:pointer;color:#fff;font-size:1.1rem;display:flex;align-items:center;justify-content:center;">
                    <i class="ph ph-x"></i>
                </button>
            </div>
            <!-- Corpo split -->
            <div style="flex:1;display:flex;overflow:hidden;">
                ${capaPanel}
                ${rightPanel}
            </div>`;

        fs.style.display = 'flex';
    };

    // ── Abrir modal de assinatura ─────────────────────────────────────────────
    window.abrirAssinaturaTreinamento = function (colaboradorId, treinamentoId) {
        const colab = _dados.find(c => c.id === colaboradorId);
        const trein = colab && colab.treinamentos.find(t => t.id === treinamentoId);
        if (!colab || !trein) return;

        _assinTreinamento = { colaborador: colab, treinamento: trein };
        _selfieBase64 = '';
        _assinaturaBase64 = '';
        _passoAtual = 1;

        if (trein.capa_url) {
            // Mostra capa em fullscreen antes do modal de assinatura
            _abrirCapaParaAssinatura(trein.capa_url, colab, trein);
        } else {
            // Sem capa: abre modal direto no passo 2 (assinatura)
            _abrirModalAssinatura(2);
        }
    };

    function _abrirModalAssinatura(passo) {
        const modal = document.getElementById('modal-assinatura-treinamento');
        if (modal) {
            modal.style.display = 'flex';
            _renderPasso(passo || 1);
        }
    }

    function _fecharModal() {
        const modal = document.getElementById('modal-assinatura-treinamento');
        if (modal) modal.style.display = 'none';
        // Fechar também os overlays fullscreen
        const fsCapaEl = document.getElementById('pres-capa-assinatura-fs');
        if (fsCapaEl) fsCapaEl.style.display = 'none';
        const fsAssinEl = document.getElementById('pres-assinatura-fs');
        if (fsAssinEl) fsAssinEl.style.display = 'none';
        _pararCamera();
        _assinTreinamento = null;
    }
    window.fecharModalAssinaturaTreinamento = _fecharModal;

    function _pararCamera() {
        if (_selfieStream) {
            _selfieStream.getTracks().forEach(t => t.stop());
            _selfieStream = null;
        }
    }

    function _renderPasso(passo) {
        _passoAtual = passo;
        const corpo = document.getElementById('modal-assin-corpo');
        const titulo = document.getElementById('modal-assin-titulo');
        const sub = document.getElementById('modal-assin-sub');
        if (!corpo) return;

        const { colaborador: c, treinamento: t } = _assinTreinamento;

        const passos = ['Apresentação', 'Assinatura', 'Selfie', 'Confirmar'];
        const passosHtml = passos.map((p, i) => {
            const n = i + 1;
            const ativo = n === passo;
            const concl = n < passo;
            return `<div style="display:flex;align-items:center;gap:4px;flex:1;flex-direction:column;">
                <div style="width:28px;height:28px;border-radius:50%;background:${concl ? '#10b981' : ativo ? '#0e7490' : '#e2e8f0'};color:${(concl || ativo) ? '#fff' : '#94a3b8'};display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:700;">
                    ${concl ? '<i class="ph ph-check"></i>' : n}
                </div>
                <span style="font-size:0.65rem;color:${ativo ? '#0e7490' : '#94a3b8'};font-weight:${ativo ? '700' : '500'};text-align:center;">${p}</span>
            </div>`;
        }).join('<div style="flex:1;height:2px;background:#e2e8f0;margin-top:-14px;"></div>');

        if (titulo) titulo.textContent = passos[passo - 1];
        if (sub) sub.innerHTML = `<div style="display:flex;align-items:center;gap:16px;padding:0 4px;">${passosHtml}</div>`;

        if (passo === 1) _renderPasso1(corpo, c, t);
        else if (passo === 2) _renderPasso2(corpo, c, t);
        else if (passo === 3) _renderPasso3(corpo, c, t);
        else if (passo === 4) _renderPasso4(corpo, c, t);
    }

    // ── Passo 1 (fullscreen capa antes do modal) ──────────────────────────────
    // Abre capa 100% da tela com botão Continuar que leva ao campo de assinatura
    function _abrirCapaParaAssinatura(url, c, t) {
        let ov = document.getElementById('pres-capa-assinatura-fs');
        if (!ov) {
            ov = document.createElement('div');
            ov.id = 'pres-capa-assinatura-fs';
            document.body.appendChild(ov);
        }
        ov.style.cssText = 'position:fixed;inset:0;z-index:99990;background:#000;display:flex;flex-direction:column;align-items:stretch;overflow:hidden;';

        ov.innerHTML = `
            <!-- Imagem da capa ocupa toda a tela -->
            <div style="flex:1;position:relative;overflow:hidden;">
                <img src="${url}" style="width:100%;height:100%;object-fit:contain;display:block;" />
                <!-- Gradiente overlay -->
                <div style="position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,0.55) 0%,transparent 30%,transparent 60%,rgba(0,0,0,0.85) 100%);pointer-events:none;"></div>
                <!-- Cabeçalho -->
                <div style="position:absolute;top:0;left:0;right:0;padding:16px 20px;display:flex;align-items:center;justify-content:space-between;">
                    <div>
                        <div style="color:#fff;font-size:1rem;font-weight:700;text-shadow:0 1px 4px rgba(0,0,0,0.6);">${t.nome}</div>
                        <div style="color:rgba(255,255,255,0.75);font-size:0.78rem;margin-top:2px;"><i class="ph ph-user"></i> ${c.nome_completo}</div>
                    </div>
                    <button onclick="document.getElementById('pres-capa-assinatura-fs').style.display='none';window.fecharModalAssinaturaTreinamento();"
                        style="background:rgba(255,255,255,0.15);border:1.5px solid rgba(255,255,255,0.3);border-radius:50%;width:40px;height:40px;cursor:pointer;color:#fff;font-size:1.1rem;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);">
                        <i class="ph ph-x"></i>
                    </button>
                </div>
                <!-- Rodapé com info e botão -->
                <div style="position:absolute;bottom:0;left:0;right:0;padding:20px;">
                    ${t.descricao ? `<p style="margin:0 0 12px;color:rgba(255,255,255,0.85);font-size:0.85rem;line-height:1.5;text-shadow:0 1px 3px rgba(0,0,0,0.5);">${t.descricao}</p>` : ''}
                    <p style="margin:0 0 16px;font-size:0.8rem;color:rgba(255,255,255,0.7);">
                        <i class="ph ph-info"></i> Confirme que foi treinado neste conteúdo e assine digitalmente.
                    </p>
                    <div style="display:flex;gap:10px;justify-content:flex-end;">
                        <button onclick="document.getElementById('pres-capa-assinatura-fs').style.display='none';window.fecharModalAssinaturaTreinamento();"
                            style="background:rgba(255,255,255,0.12);color:#fff;border:1.5px solid rgba(255,255,255,0.3);border-radius:10px;padding:12px 22px;cursor:pointer;font-weight:600;font-size:0.9rem;backdrop-filter:blur(8px);">
                            Cancelar
                        </button>
                        <button onclick="document.getElementById('pres-capa-assinatura-fs').style.display='none';window._abrirAssinaturaFullscreen();"
                            style="background:linear-gradient(135deg,#0e7490,#06b6d4);color:#fff;border:none;border-radius:10px;padding:12px 28px;cursor:pointer;font-weight:700;font-size:0.95rem;display:inline-flex;align-items:center;gap:8px;box-shadow:0 4px 20px rgba(6,182,212,0.4);">
                            <i class="ph ph-pen-nib"></i> Continuar — Assinar
                        </button>
                    </div>
                </div>
            </div>`;

        ov.style.display = 'flex';
    }

    // Abre o campo de assinatura em tela cheia (fullscreen real)
    window._abrirAssinaturaFullscreen = function () {
        if (!_assinTreinamento) return;
        const { colaborador: c, treinamento: t } = _assinTreinamento;
        const instrutor = getInstrutorNome();

        let ov = document.getElementById('pres-assinatura-fs');
        if (!ov) {
            ov = document.createElement('div');
            ov.id = 'pres-assinatura-fs';
            document.body.appendChild(ov);
        }
        ov.style.cssText = 'position:fixed;inset:0;z-index:99991;background:#f8fafc;display:flex;flex-direction:column;overflow:hidden;';

        ov.innerHTML = `
            <!-- Header -->
            <div style="background:linear-gradient(135deg,#0e7490,#06b6d4);padding:14px 20px;display:flex;align-items:center;gap:12px;flex-shrink:0;">
                <div style="flex:1;min-width:0;">
                    <div style="color:#fff;font-size:0.95rem;font-weight:700;">${c.nome_completo}</div>
                    <div style="color:rgba(255,255,255,0.8);font-size:0.75rem;">${t.nome}</div>
                </div>
                <div style="color:rgba(255,255,255,0.85);font-size:0.72rem;text-align:right;">
                    <div><i class="ph ph-chalkboard-teacher"></i> Instrutor: <strong>${instrutor}</strong></div>
                </div>
            </div>
            <!-- Instrução -->
            <div style="padding:12px 20px 8px;text-align:center;background:#fff;border-bottom:1px solid #e2e8f0;flex-shrink:0;">
                <p style="margin:0;font-size:0.85rem;color:#64748b;"><i class="ph ph-pencil-line"></i> Assine com o dedo ou mouse no campo abaixo</p>
            </div>
            <!-- Canvas em fullscreen -->
            <div style="flex:1;position:relative;background:#fafafa;display:flex;align-items:stretch;padding:12px;">
                <div style="flex:1;border:2px dashed #cbd5e1;border-radius:12px;background:#fff;position:relative;overflow:hidden;">
                    <canvas id="pres-assin-fs-canvas" style="display:block;width:100%;height:100%;cursor:crosshair;touch-action:none;"></canvas>
                    <span style="position:absolute;bottom:10px;left:50%;transform:translateX(-50%);font-size:0.72rem;color:#cbd5e1;pointer-events:none;white-space:nowrap;">Assine aqui</span>
                </div>
            </div>
            <!-- Botões -->
            <div style="padding:12px 20px;background:#fff;border-top:1px solid #e2e8f0;display:flex;gap:10px;justify-content:space-between;flex-shrink:0;">
                <button onclick="window._limparAssinaturaFS()" style="background:#f1f5f9;color:#64748b;border:none;border-radius:8px;padding:10px 18px;cursor:pointer;font-size:0.85rem;font-weight:600;display:inline-flex;align-items:center;gap:6px;">
                    <i class="ph ph-eraser"></i> Limpar
                </button>
                <div style="display:flex;gap:8px;">
                    <button onclick="document.getElementById('pres-assinatura-fs').style.display='none';" style="background:#f1f5f9;color:#475569;border:none;border-radius:8px;padding:10px 18px;cursor:pointer;font-weight:600;">
                        Voltar
                    </button>
                    <button onclick="window._confirmarAssinaturaFS()" style="background:linear-gradient(135deg,#0e7490,#06b6d4);color:#fff;border:none;border-radius:8px;padding:10px 22px;cursor:pointer;font-weight:700;display:inline-flex;align-items:center;gap:6px;box-shadow:0 3px 12px rgba(14,116,144,0.35);">
                        <i class="ph ph-arrow-right"></i> Próximo
                    </button>
                </div>
            </div>`;

        ov.style.display = 'flex';

        // Inicializar canvas fullscreen
        setTimeout(() => {
            const canvas = document.getElementById('pres-assin-fs-canvas');
            if (!canvas) return;
            canvas.width = canvas.offsetWidth || window.innerWidth;
            canvas.height = canvas.offsetHeight || (window.innerHeight - 200);
            _assinCtx = canvas.getContext('2d');
            _assinCtx.strokeStyle = '#0e2244';
            _assinCtx.lineWidth = 2.5;
            _assinCtx.lineCap = 'round';
            _assinCtx.lineJoin = 'round';

            function getPos(e, rect) {
                const scaleX = canvas.width / rect.width;
                const scaleY = canvas.height / rect.height;
                if (e.touches) return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY };
                return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
            }
            function iniciar(e) { e.preventDefault(); _assinDesenhando = true; const r = canvas.getBoundingClientRect(); const p = getPos(e, r); _assinCtx.beginPath(); _assinCtx.moveTo(p.x, p.y); }
            function desenhar(e) { e.preventDefault(); if (!_assinDesenhando) return; const r = canvas.getBoundingClientRect(); const p = getPos(e, r); _assinCtx.lineTo(p.x, p.y); _assinCtx.stroke(); }
            function parar(e) { e.preventDefault(); _assinDesenhando = false; }

            canvas.addEventListener('mousedown', iniciar);
            canvas.addEventListener('mousemove', desenhar);
            canvas.addEventListener('mouseup', parar);
            canvas.addEventListener('mouseleave', parar);
            canvas.addEventListener('touchstart', iniciar, { passive: false });
            canvas.addEventListener('touchmove', desenhar, { passive: false });
            canvas.addEventListener('touchend', parar, { passive: false });
        }, 80);
    };

    window._limparAssinaturaFS = function () {
        const canvas = document.getElementById('pres-assin-fs-canvas');
        if (canvas && _assinCtx) _assinCtx.clearRect(0, 0, canvas.width, canvas.height);
    };

    window._confirmarAssinaturaFS = function () {
        const canvas = document.getElementById('pres-assin-fs-canvas');
        if (!canvas) return;
        const dados = _assinCtx ? _assinCtx.getImageData(0, 0, canvas.width, canvas.height).data : [];
        const temConteudo = Array.from(dados).some((v, i) => i % 4 === 3 && v > 0);
        if (!temConteudo) { alert('Por favor, assine no campo antes de continuar.'); return; }
        _assinaturaBase64 = canvas.toDataURL('image/png');
        // Fecha o fullscreen de assinatura e abre o modal no passo 3 (selfie)
        const fsEl = document.getElementById('pres-assinatura-fs');
        if (fsEl) fsEl.style.display = 'none';
        _abrirModalAssinatura(3);
    };

    // ── Passo 1: renderizado dentro do modal (fallback sem capa) ──────────────
    function _renderPasso1(corpo, c, t) {
        _pararCamera();
        corpo.innerHTML = `
            <div style="text-align:center;padding:8px 0 16px;">
                <div style="width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,#0e7490,#06b6d4);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
                    <i class="ph ph-graduation-cap" style="color:#fff;font-size:2rem;"></i>
                </div>
                <h3 style="margin:0 0 8px;font-size:1.15rem;font-weight:700;color:#1e293b;">${t.nome}</h3>
                ${t.descricao ? `<p style="margin:0 0 16px;color:#64748b;font-size:0.88rem;line-height:1.5;">${t.descricao}</p>` : ''}
                <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:12px 16px;margin-bottom:16px;text-align:left;">
                    <p style="margin:0 0 4px;font-size:0.82rem;color:#166534;font-weight:600;"><i class="ph ph-user"></i> Colaborador</p>
                    <p style="margin:0;font-size:0.95rem;color:#14532d;font-weight:700;">${c.nome_completo}</p>
                    <p style="margin:2px 0 0;font-size:0.78rem;color:#166534;">${c.cargo || ''} · ${c.departamento || ''}</p>
                </div>
                <p style="font-size:0.82rem;color:#64748b;margin:0;">Ao clicar em <strong>Continuar</strong>, o colaborador irá assinar digitalmente.</p>
            </div>
            <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px;">
                <button onclick="window.fecharModalAssinaturaTreinamento()" style="background:#f1f5f9;color:#475569;border:none;border-radius:8px;padding:10px 20px;cursor:pointer;font-weight:600;">Cancelar</button>
                <button onclick="window._avancarPasso(2)" style="background:#0e7490;color:#fff;border:none;border-radius:8px;padding:10px 20px;cursor:pointer;font-weight:600;display:inline-flex;align-items:center;gap:6px;">
                    <i class="ph ph-arrow-right"></i> Continuar
                </button>
            </div>`;
    }

    // Ampliar capa em tela cheia (chamado ao clicar na imagem para zoom)
    window._abrirCapaFullscreen = function (url) {
        let ov = document.getElementById('pres-capa-fullscreen');
        if (!ov) {
            ov = document.createElement('div');
            ov.id = 'pres-capa-fullscreen';
            ov.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.96);display:flex;align-items:center;justify-content:center;cursor:zoom-out;';
            ov.onclick = () => ov.style.display = 'none';
            document.body.appendChild(ov);
        }
        ov.innerHTML = `<img src="${url}" style="max-width:100%;max-height:100vh;object-fit:contain;border-radius:4px;box-shadow:0 0 80px rgba(0,0,0,0.8);" />
            <button onclick="event.stopPropagation();document.getElementById('pres-capa-fullscreen').style.display='none'"
                style="position:fixed;top:16px;right:16px;background:rgba(255,255,255,0.15);border:none;border-radius:50%;width:44px;height:44px;cursor:pointer;color:#fff;font-size:1.3rem;display:flex;align-items:center;justify-content:center;">
                <i class="ph ph-x"></i>
            </button>`;
        ov.style.display = 'flex';
    };

    // ── Passo 2: Canvas de assinatura em fullscreen ───────────────────────────
    function _renderPasso2(corpo, c, t) {
        _pararCamera();
        corpo.innerHTML = `
            <div style="text-align:center;margin-bottom:10px;">
                <p style="font-size:0.88rem;color:#64748b;margin:0 0 2px;">Colaborador: <strong style="color:#1e293b;">${c.nome_completo}</strong></p>
                <p style="font-size:0.82rem;color:#94a3b8;margin:0;">Treinamento: ${t.nome}</p>
            </div>
            <div style="border:2px dashed #cbd5e1;border-radius:12px;background:#fafafa;position:relative;overflow:hidden;margin-bottom:10px;">
                <canvas id="presenca-assin-canvas" width="600" height="240" style="display:block;width:100%;height:220px;cursor:crosshair;touch-action:none;"></canvas>
                <span style="position:absolute;bottom:8px;left:50%;transform:translateX(-50%);font-size:0.7rem;color:#cbd5e1;pointer-events:none;white-space:nowrap;">Assine aqui com o dedo ou mouse</span>
            </div>
            <div style="display:flex;justify-content:flex-end;margin-bottom:10px;">
                <button onclick="window._limparAssinatura()" style="background:#f1f5f9;color:#64748b;border:none;border-radius:6px;padding:6px 14px;font-size:0.8rem;cursor:pointer;display:inline-flex;align-items:center;gap:4px;">
                    <i class="ph ph-eraser"></i> Limpar
                </button>
            </div>
            <div style="display:flex;gap:8px;justify-content:flex-end;">
                <button onclick="window._avancarPasso(1)" style="background:#f1f5f9;color:#475569;border:none;border-radius:8px;padding:10px 20px;cursor:pointer;font-weight:600;">Voltar</button>
                <button onclick="window._confirmarAssinatura()" style="background:#0e7490;color:#fff;border:none;border-radius:8px;padding:10px 20px;cursor:pointer;font-weight:600;display:inline-flex;align-items:center;gap:6px;">
                    <i class="ph ph-arrow-right"></i> Próximo
                </button>
            </div>`;

        setTimeout(() => _iniciarCanvas(), 50);
    }

    function _iniciarCanvas() {
        const canvas = document.getElementById('presenca-assin-canvas');
        if (!canvas) return;
        _assinCtx = canvas.getContext('2d');
        _assinCtx.strokeStyle = '#0e2244';
        _assinCtx.lineWidth = 2.5;
        _assinCtx.lineCap = 'round';
        _assinCtx.lineJoin = 'round';

        function getPos(e, rect) {
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            if (e.touches) {
                return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY };
            }
            return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
        }

        function iniciar(e) {
            e.preventDefault();
            _assinDesenhando = true;
            const rect = canvas.getBoundingClientRect();
            const pos = getPos(e, rect);
            _assinCtx.beginPath();
            _assinCtx.moveTo(pos.x, pos.y);
        }
        function desenhar(e) {
            e.preventDefault();
            if (!_assinDesenhando) return;
            const rect = canvas.getBoundingClientRect();
            const pos = getPos(e, rect);
            _assinCtx.lineTo(pos.x, pos.y);
            _assinCtx.stroke();
        }
        function parar(e) { e.preventDefault(); _assinDesenhando = false; }

        canvas.addEventListener('mousedown', iniciar);
        canvas.addEventListener('mousemove', desenhar);
        canvas.addEventListener('mouseup', parar);
        canvas.addEventListener('mouseleave', parar);
        canvas.addEventListener('touchstart', iniciar, { passive: false });
        canvas.addEventListener('touchmove', desenhar, { passive: false });
        canvas.addEventListener('touchend', parar, { passive: false });
    }

    window._limparAssinatura = function () {
        const canvas = document.getElementById('presenca-assin-canvas');
        if (canvas && _assinCtx) _assinCtx.clearRect(0, 0, canvas.width, canvas.height);
    };

    window._confirmarAssinatura = function () {
        const canvas = document.getElementById('presenca-assin-canvas');
        if (!canvas) return;
        const dados = _assinCtx ? _assinCtx.getImageData(0, 0, canvas.width, canvas.height).data : [];
        const temConteudo = Array.from(dados).some((v, i) => i % 4 === 3 && v > 0);
        if (!temConteudo) {
            alert('Por favor, assine no campo antes de continuar.');
            return;
        }
        _assinaturaBase64 = canvas.toDataURL('image/png');
        _avancarPasso(3);
    };

    // ── Passo 3: Selfie com nome do instrutor ─────────────────────────────────
    function _renderPasso3(corpo, c, t) {
        const instrutor = getInstrutorNome();
        corpo.innerHTML = `
            <div style="text-align:center;margin-bottom:10px;">
                <p style="font-size:0.88rem;color:#64748b;margin:0 0 2px;">Tire uma selfie para confirmar presença</p>
                <p style="font-size:0.78rem;color:#94a3b8;margin:0 0 4px;">A foto incluirá nome, treinamento e data/hora automaticamente.</p>
                <p style="font-size:0.78rem;color:#0e7490;margin:0;font-weight:600;"><i class="ph ph-chalkboard-teacher"></i> Instrutor: <strong>${instrutor}</strong></p>
            </div>
            <div style="position:relative;border-radius:12px;overflow:hidden;background:#000;margin-bottom:10px;min-height:200px;">
                <video id="presenca-selfie-video" autoplay playsinline muted style="width:100%;display:block;max-height:260px;object-fit:cover;"></video>
                <canvas id="presenca-selfie-canvas" style="display:none;width:100%;border-radius:12px;"></canvas>
                <div id="presenca-selfie-overlay" style="position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(0,0,0,0.75));padding:10px 14px;pointer-events:none;">
                    <p style="margin:0;color:#fff;font-size:0.75rem;font-weight:600;">${c.nome_completo}</p>
                    <p style="margin:0;color:rgba(255,255,255,0.8);font-size:0.68rem;">${t.nome} · ${new Date().toLocaleString('pt-BR')}</p>
                    <p style="margin:0;color:rgba(255,255,255,0.7);font-size:0.65rem;">Instrutor: ${instrutor}</p>
                </div>
            </div>
            <div id="presenca-selfie-acoes" style="display:flex;gap:8px;justify-content:center;margin-bottom:10px;">
                <button id="btn-tirar-foto" onclick="window._tirarFoto()" style="background:#0e7490;color:#fff;border:none;border-radius:8px;padding:10px 20px;cursor:pointer;font-weight:600;display:inline-flex;align-items:center;gap:6px;">
                    <i class="ph ph-camera"></i> Tirar Foto
                </button>
            </div>
            <div style="display:flex;gap:8px;justify-content:flex-end;">
                <button onclick="window._voltarDaSelfie()" style="background:#f1f5f9;color:#475569;border:none;border-radius:8px;padding:10px 20px;cursor:pointer;font-weight:600;">Voltar</button>
                <button id="btn-selfie-continuar" onclick="window._confirmarSelfie()" disabled style="background:#cbd5e1;color:#fff;border:none;border-radius:8px;padding:10px 20px;cursor:not-allowed;font-weight:600;display:inline-flex;align-items:center;gap:6px;">
                    <i class="ph ph-arrow-right"></i> Próximo
                </button>
            </div>`;

        _iniciarCamera();
    }

    async function _iniciarCamera() {
        try {
            _selfieStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
            const video = document.getElementById('presenca-selfie-video');
            if (video) { video.srcObject = _selfieStream; }
        } catch (e) {
            console.warn('[PRESENÇA] Câmera indisponível:', e);
            const overlay = document.getElementById('presenca-selfie-overlay');
            if (overlay) overlay.innerHTML = '<p style="color:#fca5a5;font-size:0.8rem;margin:0;">Câmera não disponível. Clique em "Próximo" para continuar sem selfie.</p>';
            const btn = document.getElementById('btn-selfie-continuar');
            if (btn) { btn.disabled = false; btn.style.background = '#0e7490'; btn.style.cursor = 'pointer'; }
            const btnFoto = document.getElementById('btn-tirar-foto');
            if (btnFoto) btnFoto.style.display = 'none';
        }
    }

    window._tirarFoto = function () {
        const video = document.getElementById('presenca-selfie-video');
        const canvas = document.getElementById('presenca-selfie-canvas');
        if (!video || !canvas) return;

        const { colaborador: c, treinamento: t } = _assinTreinamento;
        const instrutor = getInstrutorNome();

        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext('2d');

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Overlay com dados
        const overlayH = 80;
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.fillRect(0, canvas.height - overlayH, canvas.width, overlayH);

        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.round(canvas.width / 26)}px Arial, sans-serif`;
        ctx.fillText(c.nome_completo, 14, canvas.height - overlayH + 22);

        ctx.font = `${Math.round(canvas.width / 32)}px Arial, sans-serif`;
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillText(`${t.nome}`, 14, canvas.height - overlayH + 42);

        ctx.font = `${Math.round(canvas.width / 38)}px Arial, sans-serif`;
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fillText(new Date().toLocaleString('pt-BR'), 14, canvas.height - overlayH + 60);

        ctx.font = `${Math.round(canvas.width / 40)}px Arial, sans-serif`;
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fillText(`Instrutor: ${instrutor}`, 14, canvas.height - overlayH + 76);

        _selfieBase64 = canvas.toDataURL('image/jpeg', 0.85);

        video.style.display = 'none';
        canvas.style.display = 'block';
        _pararCamera();

        const acoes = document.getElementById('presenca-selfie-acoes');
        if (acoes) acoes.innerHTML = `
            <button onclick="window._retirarFoto()" style="background:#f1f5f9;color:#475569;border:none;border-radius:8px;padding:8px 16px;cursor:pointer;font-weight:600;display:inline-flex;align-items:center;gap:4px;">
                <i class="ph ph-arrow-counter-clockwise"></i> Tirar novamente
            </button>`;

        const btn = document.getElementById('btn-selfie-continuar');
        if (btn) { btn.disabled = false; btn.style.background = '#0e7490'; btn.style.cursor = 'pointer'; }
    };

    window._retirarFoto = async function () {
        _selfieBase64 = '';
        const video = document.getElementById('presenca-selfie-video');
        const canvas = document.getElementById('presenca-selfie-canvas');
        if (video) video.style.display = 'block';
        if (canvas) canvas.style.display = 'none';
        const btn = document.getElementById('btn-selfie-continuar');
        if (btn) { btn.disabled = true; btn.style.background = '#cbd5e1'; btn.style.cursor = 'not-allowed'; }
        const acoes = document.getElementById('presenca-selfie-acoes');
        if (acoes) acoes.innerHTML = `
            <button id="btn-tirar-foto" onclick="window._tirarFoto()" style="background:#0e7490;color:#fff;border:none;border-radius:8px;padding:10px 20px;cursor:pointer;font-weight:600;display:inline-flex;align-items:center;gap:6px;">
                <i class="ph ph-camera"></i> Tirar Foto
            </button>`;
        await _iniciarCamera();
    };

    window._confirmarSelfie = function () {
        _pararCamera();
        _avancarPasso(4);
    };

    // ── Passo 4: Confirmação ──────────────────────────────────────────────────
    function _renderPasso4(corpo, c, t) {
        _pararCamera();
        corpo.innerHTML = `
            <div style="text-align:center;padding:8px 0;">
                <div style="width:64px;height:64px;border-radius:50%;background:#f0fdf4;border:2px solid #bbf7d0;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
                    <i class="ph ph-check-circle" style="color:#10b981;font-size:2rem;"></i>
                </div>
                <h3 style="margin:0 0 6px;font-size:1.1rem;font-weight:700;color:#1e293b;">Confirmar Registro</h3>
                <p style="margin:0 0 20px;color:#64748b;font-size:0.85rem;">Verifique os dados antes de confirmar:</p>

                <div style="text-align:left;background:#f8fafc;border-radius:10px;padding:14px;margin-bottom:16px;">
                    <p style="margin:0 0 6px;font-size:0.82rem;"><strong>Colaborador:</strong> ${c.nome_completo}</p>
                    <p style="margin:0 0 6px;font-size:0.82rem;"><strong>Treinamento:</strong> ${t.nome}</p>
                    <p style="margin:0 0 6px;font-size:0.82rem;"><strong>Data/Hora:</strong> ${new Date().toLocaleString('pt-BR')}</p>
                    <p style="margin:0 0 6px;font-size:0.82rem;"><strong>Instrutor:</strong> ${getInstrutorNome()}</p>
                    <p style="margin:0 0 6px;font-size:0.82rem;"><strong>Assinatura:</strong> <span style="color:#10b981;">✔ Coletada</span></p>
                    <p style="margin:4px 0 0;font-size:0.82rem;"><strong>Selfie:</strong> <span style="color:${_selfieBase64 ? '#10b981' : '#94a3b8'};">${_selfieBase64 ? '✔ Coletada' : '— Não coletada'}</span></p>
                </div>

                ${_assinaturaBase64 ? `<div style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:10px;">
                    <p style="margin:0;background:#f1f5f9;padding:6px 10px;font-size:0.72rem;font-weight:600;color:#64748b;">ASSINATURA</p>
                    <img src="${_assinaturaBase64}" style="width:100%;max-height:80px;object-fit:contain;padding:4px;" />
                </div>` : ''}
                ${_selfieBase64 ? `<div style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:10px;">
                    <p style="margin:0;background:#f1f5f9;padding:6px 10px;font-size:0.72rem;font-weight:600;color:#64748b;">SELFIE</p>
                    <img src="${_selfieBase64}" style="width:100%;max-height:140px;object-fit:contain;" />
                </div>` : ''}
            </div>
            <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px;">
                <button onclick="window._avancarPasso(3)" style="background:#f1f5f9;color:#475569;border:none;border-radius:8px;padding:10px 20px;cursor:pointer;font-weight:600;">Voltar</button>
                <button id="btn-confirmar-presenca" onclick="window._salvarPresencaAssinada()" style="background:#10b981;color:#fff;border:none;border-radius:8px;padding:10px 20px;cursor:pointer;font-weight:700;display:inline-flex;align-items:center;gap:6px;">
                    <i class="ph ph-check-circle"></i> Confirmar Presença
                </button>
            </div>`;
    }

    // ── Salvar presença com assinatura ────────────────────────────────────────
    window._salvarPresencaAssinada = async function () {
        const btn = document.getElementById('btn-confirmar-presenca');
        if (btn) { btn.disabled = true; btn.textContent = 'Salvando...'; }

        const { colaborador: c, treinamento: t } = _assinTreinamento;

        try {
            const secData = (typeof window.getDeviceSecurityData === 'function') ? await window.getDeviceSecurityData() : { gps_lat: '', gps_lon: '', dispositivo: navigator.userAgent };

            const r = await api('/treinamento-presenca/assinar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    colaborador_id: c.id,
                    treinamento_id: t.id,
                    assinatura_base64: _assinaturaBase64,
                    selfie_base64: _selfieBase64,
                    instrutor_nome: getInstrutorNome(),
                    gps_lat: secData.gps_lat,
                    gps_lon: secData.gps_lon,
                    dispositivo: secData.dispositivo
                })
            });
            if (!r.ok) {
                const e = await r.json();
                throw new Error(e.error || 'Erro ao salvar');
            }
            const dados = await r.json();

            // Atualizar estado local
            const colabLocal = _dados.find(x => x.id === c.id);
            if (colabLocal) {
                const treinLocal = colabLocal.treinamentos.find(x => x.id === t.id);
                if (treinLocal) {
                    treinLocal.concluido = true;
                    treinLocal.vencido = false;
                    treinLocal.data_conclusao = dados.data_conclusao || new Date().toISOString();
                }
                colabLocal.concluidos = colabLocal.treinamentos.filter(x => x.concluido).length;
            }

            // Mostrar botão de olho (ver documento)
            const corpo = document.getElementById('modal-assin-corpo');
            if (corpo) {
                const docData = encodeURIComponent(JSON.stringify({
                    assinatura: _assinaturaBase64,
                    selfie: _selfieBase64,
                    capa: t.capa_url || '',
                    nome: c.nome_completo,
                    treinamento: t.nome,
                    data: new Date().toLocaleString('pt-BR'),
                    instrutor: getInstrutorNome()
                }));
                corpo.innerHTML = `
                    <div style="text-align:center;padding:20px 0;">
                        <div style="width:80px;height:80px;border-radius:50%;background:#f0fdf4;border:2px solid #10b981;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
                            <i class="ph ph-check-circle" style="color:#10b981;font-size:2.5rem;"></i>
                        </div>
                        <h3 style="margin:0 0 8px;font-size:1.2rem;font-weight:700;color:#1e293b;">Presença Registrada!</h3>
                        <p style="margin:0 0 24px;color:#64748b;font-size:0.88rem;"><strong>${c.nome_completo}</strong> assinou o treinamento <strong>${t.nome}</strong>.</p>
                        <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
                            <button onclick="window._verDocumentoAssinado('${docData}')"
                                style="background:#0e7490;color:#fff;border:none;border-radius:10px;padding:12px 24px;cursor:pointer;font-weight:700;font-size:1rem;display:inline-flex;align-items:center;gap:8px;box-shadow:0 4px 14px rgba(14,116,144,0.3);">
                                <i class="ph ph-eye" style="font-size:1.2rem;"></i> Ver Documento Assinado
                            </button>
                            <button onclick="window.fecharModalAssinaturaTreinamento()"
                                style="background:#f1f5f9;color:#475569;border:none;border-radius:10px;padding:12px 24px;cursor:pointer;font-weight:600;">
                                Fechar
                            </button>
                        </div>
                    </div>`;
            }

            renderizar();
            if (window.showToast) showToast(`✅ Presença de "${c.nome_completo}" registrada com sucesso!`, 'success');

        } catch (e) {
            console.error('[PRESENÇA] Erro ao salvar:', e);
            alert('Erro ao salvar presença: ' + e.message);
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ph ph-check-circle"></i> Confirmar Presença'; }
        }
    };

    window._voltarDaSelfie = function () {
        _pararCamera();
        if (_assinTreinamento && _assinTreinamento.treinamento.capa_url) {
            // Fecha o modal e reabre o fullscreen de assinatura
            const modal = document.getElementById('modal-assinatura-treinamento');
            if (modal) modal.style.display = 'none';
            window._abrirAssinaturaFullscreen();
        } else {
            _avancarPasso(2);
        }
    };

    window._avancarPasso = function (passo) {
        _renderPasso(passo);
    };

    // ── Filtros ───────────────────────────────────────────────────────────────
    window.filtrarPresencaTipoDepto = function (val) {
        _filtroTipoDepto = val;
        renderizar();
    };
    window.filtrarPresencaDepto = function (val) {
        _filtroDepto = val;
        renderizar();
    };
    window.filtrarPresencaBusca = function (val) {
        _filtroBusca = val;
        renderizar();
    };

    // ── Init ──────────────────────────────────────────────────────────────────
    window.initPresencaTreinamento = function () {
        carregarDados();
    };

    document.addEventListener('navigatedTo', function (e) {
        if (e.detail && e.detail.view === 'treinamento-presenca') {
            carregarDados();
        }
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (document.getElementById('view-treinamento-presenca')?.classList.contains('active')) {
                carregarDados();
            }
        });
    }

    // ── PESQUISA DE SATISFAÇÃO ────────────────────────────────────────────────
    window.copiarLinkPesquisa = async function(treinId, colabId, btn, treinNome) {
        const textOrig = btn.innerHTML;
        btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Gerando...';
        btn.disabled = true;

        try {
            const r = await api(`/treinamentos/${treinId}/enviar-pesquisa`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ colaborador_id: colabId })
            });
            if (!r.ok) {
                const e = await r.json().catch(()=>({}));
                throw new Error(e.error || 'Erro ao gerar link de pesquisa');
            }
            const res = await r.json();
            
            const msgToCopy = `Pesquisa referente ao treinamento: ${treinNome || 'Treinamento'}\n\nPor favor, responda a nossa pesquisa de satisfação acessando o link abaixo:\n${res.link}`;
            await navigator.clipboard.writeText(msgToCopy);
            
            btn.innerHTML = '<i class="ph ph-check"></i> Copiado!';
            setTimeout(() => {
                btn.innerHTML = textOrig;
                btn.disabled = false;
            }, 2000);
        } catch (e) {
            alert('Erro: ' + e.message);
            btn.innerHTML = textOrig;
            btn.disabled = false;
        }
    };

    window.verResultadoPesquisaTreinamento = async function(treinId, colabId) {
        try {
            const r = await api(`/treinamentos/${treinId}/resultado-pesquisa/${colabId}`);
            if (!r.ok) throw new Error('Erro ao buscar resultado');
            const data = await r.json();
            
            if (data.status === 'não_enviado' || !data.respostas_json) {
                alert('A pesquisa ainda não foi enviada ou o colaborador ainda não respondeu.');
                return;
            }

            let html = '<div style="padding:1rem;font-family:sans-serif;">';
            html += '<h3 style="margin-top:0;">Respostas da Pesquisa</h3>';
            try {
                const respostasArray = JSON.parse(data.respostas_json);
                const colorMap = {
                    1: { bg: '#fee2e2', border: '#ef4444', color: '#b91c1c' },
                    2: { bg: '#ffedd5', border: '#f97316', color: '#c2410c' },
                    3: { bg: '#fef9c3', border: '#eab308', color: '#a16207' },
                    4: { bg: '#ecfccb', border: '#84cc16', color: '#4d7c0f' },
                    5: { bg: '#dcfce7', border: '#22c55e', color: '#15803d' }
                };

                for (const item of respostasArray) {
                    if (item.nota !== null) {
                        html += `<div style="margin-bottom:20px; background:#f1f5f9; padding:15px; border-radius:8px; border:1px solid #e2e8f0;">
                            <strong style="display:block;font-size:1rem;color:#334155;margin-bottom:12px;">${item.pergunta}</strong>
                            <div style="display:flex; gap:8px;">`;
                        for(let i=1; i<=5; i++) {
                            const isSelected = (i === item.nota);
                            const st = isSelected 
                                ? `background:${colorMap[i].bg}; border:2px solid ${colorMap[i].border}; color:${colorMap[i].color}; font-weight:bold;`
                                : `background:#fff; border:1.5px solid #cbd5e1; color:#94a3b8;`;
                            html += `<div style="flex:1; text-align:center; padding:10px 0; border-radius:6px; font-size:1rem; ${st}">${i}</div>`;
                        }
                        html += `</div>
                        </div>`;
                    } else if (item.texto !== undefined && item.texto !== null) {
                        html += `<div style="margin-bottom:20px; background:#f1f5f9; padding:15px; border-radius:8px; border:1px solid #e2e8f0;">
                            <strong style="display:block;font-size:1rem;color:#334155;margin-bottom:8px;">${item.pergunta}</strong>
                            <div style="font-size:0.95rem;color:#475569;background:#fff;padding:12px;border-radius:6px;border:1px solid #cbd5e1;white-space:pre-wrap;">${item.texto}</div>
                        </div>`;
                    }
                }
            } catch(e) {
                html += '<p>Erro ao ler respostas.</p>';
            }
            html += '</div>';

            let modal = document.getElementById('modal-resultado-pesquisa-treinamento');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'modal-resultado-pesquisa-treinamento';
                modal.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.8); padding: 20px; box-sizing: border-box;';
                document.body.appendChild(modal);
            }
            
            modal.innerHTML = `<div style="background:#fff;border-radius:12px;width:100%;height:100%;max-width:1200px;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,0.3);overflow:hidden;">
                <div style="background:#f8fafc;padding:16px 20px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
                    <h3 style="margin:0;font-size:1.2rem;color:#1e293b;display:flex;align-items:center;gap:8px;"><i class="ph ph-chart-bar" style="color:#0ea5e9;"></i> Resultados da Pesquisa</h3>
                    <button onclick="document.getElementById('modal-resultado-pesquisa-treinamento').style.display='none'" style="background:none;border:none;font-size:1.5rem;cursor:pointer;color:#64748b;">&times;</button>
                </div>
                <div style="padding:20px;overflow-y:auto;">
                    ${html}
                </div>
                <div style="padding:16px 20px;border-top:1px solid #e2e8f0;background:#f8fafc;text-align:right;">
                    <button onclick="document.getElementById('modal-resultado-pesquisa-treinamento').style.display='none'" style="background:#0ea5e9;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-weight:600;cursor:pointer;">Fechar</button>
                </div>
            </div>`;
            
            modal.style.display = 'flex';
        } catch(e) {
            alert('Erro: ' + e.message);
        }
    };

})();


window._excluirAssinaturaTreinamento = async function(colabId, treinId, nomeColab, nomeTrein) {
    if (!await Swal.fire({
        title: 'Excluir assinatura?',
        text: `Deseja realmente excluir a assinatura de ${nomeColab} para "${nomeTrein}"?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'Sim, excluir',
        cancelButtonText: 'Cancelar'
    }).then(r => r.isConfirmed)) return;

    try {
        const r = await fetch((window.API_URL || '') + `/treinamento-presenca/${treinId}/${colabId}`, {
            method: 'DELETE',
            headers: { Authorization: 'Bearer ' + (localStorage.getItem('erp_token') || '') }
        });
        if (!r.ok) throw new Error('Erro ao excluir assinatura');
        
        Swal.fire({icon:'success',title:'Excluído!',showConfirmButton:false,timer:1500});
        
        // Atualiza a tela recarregando os dados (simula clique no botão Atualizar)
        const btnRender = document.querySelector('button[onclick="window.initPresencaTreinamento()"]');
        if (btnRender) btnRender.click();
        else window.initPresencaTreinamento();
    } catch(e) {
        Swal.fire({icon:'error',title:'Erro',text:e.message});
    }
};

