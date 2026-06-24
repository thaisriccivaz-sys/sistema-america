// frontend/treinamento_presenca.js
// Módulo de Controle de Presenças — com assinatura digital e selfie
(function () {
    'use strict';

    // ── Estado ────────────────────────────────────────────────────────────────
    let _dados = [];            // [{id, nome_completo, departamento, treinamentos:[...]}]
    let _filtroDepto = '';
    let _filtroBusca = '';
    let _assinCtx = null;       // canvas context para assinatura
    let _assinDesenhando = false;
    let _assinTreinamento = null; // { treinamento, colaborador }
    let _selfieStream = null;
    let _selfieBase64 = '';
    let _assinaturaBase64 = '';
    let _passoAtual = 1;        // 1=capa, 2=assinatura, 3=selfie, 4=confirmação

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

    // ── Carregar dados ────────────────────────────────────────────────────────
    async function carregarDados() {
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

        let lista = _dados;
        if (depto) lista = lista.filter(c => c.departamento === depto);
        if (busca) lista = lista.filter(c =>
            (c.nome_completo || '').toLowerCase().includes(busca) ||
            (c.cargo || '').toLowerCase().includes(busca)
        );

        // Mostrar todos os colaboradores (removido filtro que ocultava os que não tinham treinamentos aplicáveis)

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
            ? 'linear-gradient(135deg,#ef4444,#dc2626)' // Vermelho para pendentes
            : 'linear-gradient(135deg,#0e7490,#06b6d4)'; // Azul normal

        const listaTrein = (c.treinamentos || []).map(t => {
            if (t.concluido) {
                return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #f1f5f9;">
                    <i class="ph ph-check-circle" style="color:#10b981;font-size:1.1rem;flex-shrink:0;"></i>
                    <div style="flex:1;min-width:0;">
                        <div style="font-size:0.82rem;font-weight:600;color:#334155;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${t.nome}">${t.nome}</div>
                        <div style="font-size:0.72rem;color:#10b981;">Concluído em ${fmtData(t.data_conclusao)}</div>
                    </div>
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
                <div style="width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,0.25);display:flex;align-items:center;justify-content:center;font-size:1rem;font-weight:700;color:#fff;flex-shrink:0;">${iniciais}</div>
                <div style="flex:1;min-width:0;">
                    <div style="color:#fff;font-weight:700;font-size:0.92rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${c.nome_completo}">${c.nome_completo}</div>
                    <div style="color:rgba(255,255,255,0.8);font-size:0.75rem;">${c.cargo || ''} ${c.departamento ? '· ' + c.departamento : ''}</div>
                </div>
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

    // ── Abrir modal de assinatura ─────────────────────────────────────────────
    window.abrirAssinaturaTreinamento = function (colaboradorId, treinamentoId) {
        const colab = _dados.find(c => c.id === colaboradorId);
        const trein = colab && colab.treinamentos.find(t => t.id === treinamentoId);
        if (!colab || !trein) return;

        _assinTreinamento = { colaborador: colab, treinamento: trein };
        _selfieBase64 = '';
        _assinaturaBase64 = '';
        _passoAtual = 1;

        const modal = document.getElementById('modal-assinatura-treinamento');
        if (modal) {
            modal.style.display = 'flex';
            _renderPasso(1);
        }
    };

    function _fecharModal() {
        const modal = document.getElementById('modal-assinatura-treinamento');
        if (modal) modal.style.display = 'none';
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

        // Indicador de passos
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

    // Passo 1: Apresentação + capa
    function _renderPasso1(corpo, c, t) {
        _pararCamera();
        corpo.innerHTML = `
            <div style="text-align:center;padding:8px 0 16px;">
                ${t.capa_url
                    ? `<div style="width:100%;max-height:200px;border-radius:12px;overflow:hidden;margin-bottom:16px;border:1px solid #e2e8f0;">
                        <img src="${t.capa_url}" style="width:100%;max-height:200px;object-fit:cover;" />
                       </div>`
                    : `<div style="width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,#0e7490,#06b6d4);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
                        <i class="ph ph-graduation-cap" style="color:#fff;font-size:2rem;"></i>
                       </div>`
                }
                <h3 style="margin:0 0 8px;font-size:1.15rem;font-weight:700;color:#1e293b;">${t.nome}</h3>
                ${t.descricao ? `<p style="margin:0 0 16px;color:#64748b;font-size:0.88rem;line-height:1.5;">${t.descricao}</p>` : ''}
                <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:12px 16px;margin-bottom:16px;text-align:left;">
                    <p style="margin:0 0 4px;font-size:0.82rem;color:#166534;font-weight:600;"><i class="ph ph-user"></i> Colaborador</p>
                    <p style="margin:0;font-size:0.95rem;color:#14532d;font-weight:700;">${c.nome_completo}</p>
                    <p style="margin:2px 0 0;font-size:0.78rem;color:#166534;">${c.cargo || ''} · ${c.departamento || ''}</p>
                </div>
                <p style="font-size:0.82rem;color:#64748b;margin:0;">
                    Ao clicar em <strong>Continuar</strong>, o colaborador confirma que foi treinado neste conteúdo e irá assinar digitalmente.
                </p>
            </div>
            <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px;">
                <button onclick="window.fecharModalAssinaturaTreinamento()" style="background:#f1f5f9;color:#475569;border:none;border-radius:8px;padding:10px 20px;cursor:pointer;font-weight:600;">Cancelar</button>
                <button onclick="window._avancarPasso(2)" style="background:#0e7490;color:#fff;border:none;border-radius:8px;padding:10px 20px;cursor:pointer;font-weight:600;display:inline-flex;align-items:center;gap:6px;">
                    <i class="ph ph-arrow-right"></i> Continuar
                </button>
            </div>`;
    }

    // Passo 2: Canvas de assinatura
    function _renderPasso2(corpo, c, t) {
        _pararCamera();
        corpo.innerHTML = `
            <div style="text-align:center;margin-bottom:12px;">
                <p style="font-size:0.88rem;color:#64748b;margin:0 0 4px;">Colaborador: <strong style="color:#1e293b;">${c.nome_completo}</strong></p>
                <p style="font-size:0.82rem;color:#94a3b8;margin:0;">Treinamento: ${t.nome}</p>
            </div>
            <div style="border:2px dashed #cbd5e1;border-radius:12px;background:#fafafa;position:relative;overflow:hidden;margin-bottom:12px;">
                <canvas id="presenca-assin-canvas" width="460" height="200" style="display:block;width:100%;height:180px;cursor:crosshair;touch-action:none;"></canvas>
                <span style="position:absolute;bottom:8px;left:50%;transform:translateX(-50%);font-size:0.7rem;color:#cbd5e1;pointer-events:none;white-space:nowrap;">Assine aqui</span>
            </div>
            <div style="display:flex;justify-content:flex-end;margin-bottom:12px;">
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

        // Inicializar canvas
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
        // Verificar se tem algo desenhado
        const dados = _assinCtx ? _assinCtx.getImageData(0, 0, canvas.width, canvas.height).data : [];
        const temConteudo = Array.from(dados).some((v, i) => i % 4 === 3 && v > 0);
        if (!temConteudo) {
            alert('Por favor, assine no campo antes de continuar.');
            return;
        }
        _assinaturaBase64 = canvas.toDataURL('image/png');
        _avancarPasso(3);
    };

    // Passo 3: Selfie
    function _renderPasso3(corpo, c, t) {
        corpo.innerHTML = `
            <div style="text-align:center;margin-bottom:12px;">
                <p style="font-size:0.88rem;color:#64748b;margin:0 0 4px;">Tire uma selfie para confirmar presença</p>
                <p style="font-size:0.78rem;color:#94a3b8;margin:0;">A foto incluirá nome, treinamento e data/hora automaticamente.</p>
            </div>
            <div style="position:relative;border-radius:12px;overflow:hidden;background:#000;margin-bottom:10px;min-height:200px;">
                <video id="presenca-selfie-video" autoplay playsinline muted style="width:100%;display:block;max-height:240px;object-fit:cover;"></video>
                <canvas id="presenca-selfie-canvas" style="display:none;width:100%;border-radius:12px;"></canvas>
                <div id="presenca-selfie-overlay" style="position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(0,0,0,0.7));padding:10px 14px;pointer-events:none;">
                    <p style="margin:0;color:#fff;font-size:0.75rem;font-weight:600;">${c.nome_completo}</p>
                    <p style="margin:0;color:rgba(255,255,255,0.8);font-size:0.68rem;">${t.nome} · ${new Date().toLocaleString('pt-BR')}</p>
                </div>
            </div>
            <div id="presenca-selfie-acoes" style="display:flex;gap:8px;justify-content:center;margin-bottom:12px;">
                <button id="btn-tirar-foto" onclick="window._tirarFoto()" style="background:#0e7490;color:#fff;border:none;border-radius:8px;padding:10px 20px;cursor:pointer;font-weight:600;display:inline-flex;align-items:center;gap:6px;">
                    <i class="ph ph-camera"></i> Tirar Foto
                </button>
            </div>
            <div style="display:flex;gap:8px;justify-content:flex-end;">
                <button onclick="window._avancarPasso(2)" style="background:#f1f5f9;color:#475569;border:none;border-radius:8px;padding:10px 20px;cursor:pointer;font-weight:600;">Voltar</button>
                <button id="btn-selfie-continuar" onclick="window._confirmarSelfie()" disabled style="background:#cbd5e1;color:#fff;border:none;border-radius:8px;padding:10px 20px;cursor:not-allowed;font-weight:600;display:inline-flex;align-items:center;gap:6px;">
                    <i class="ph ph-arrow-right"></i> Próximo
                </button>
            </div>`;

        // Iniciar câmera
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

        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext('2d');

        // Foto do vídeo
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Overlay com dados
        const overlayH = 70;
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.fillRect(0, canvas.height - overlayH, canvas.width, overlayH);

        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.round(canvas.width / 28)}px Arial, sans-serif`;
        ctx.fillText(c.nome_completo, 14, canvas.height - overlayH + 24);

        ctx.font = `${Math.round(canvas.width / 34)}px Arial, sans-serif`;
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillText(`${t.nome}`, 14, canvas.height - overlayH + 46);

        ctx.font = `${Math.round(canvas.width / 38)}px Arial, sans-serif`;
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fillText(new Date().toLocaleString('pt-BR'), 14, canvas.height - overlayH + 63);

        _selfieBase64 = canvas.toDataURL('image/jpeg', 0.85);

        // Trocar vídeo por imagem capturada
        video.style.display = 'none';
        canvas.style.display = 'block';
        _pararCamera();

        // Atualizar botões
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

    // Passo 4: Confirmação
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
                    <p style="margin:0;font-size:0.82rem;"><strong>Assinatura:</strong> <span style="color:#10b981;">✔ Coletada</span></p>
                    <p style="margin:4px 0 0;font-size:0.82rem;"><strong>Selfie:</strong> <span style="color:${_selfieBase64 ? '#10b981' : '#94a3b8'};">${_selfieBase64 ? '✔ Coletada' : '— Não coletada'}</span></p>
                </div>

                ${_assinaturaBase64 ? `<div style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:10px;">
                    <p style="margin:0;background:#f1f5f9;padding:6px 10px;font-size:0.72rem;font-weight:600;color:#64748b;">ASSINATURA</p>
                    <img src="${_assinaturaBase64}" style="width:100%;max-height:80px;object-fit:contain;padding:4px;" />
                </div>` : ''}
                ${_selfieBase64 ? `<div style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:10px;">
                    <p style="margin:0;background:#f1f5f9;padding:6px 10px;font-size:0.72rem;font-weight:600;color:#64748b;">SELFIE</p>
                    <img src="${_selfieBase64}" style="width:100%;max-height:120px;object-fit:cover;" />
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
            const r = await api('/treinamento-presenca/assinar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    colaborador_id: c.id,
                    treinamento_id: t.id,
                    assinatura_base64: _assinaturaBase64,
                    selfie_base64: _selfieBase64
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
                    treinLocal.data_conclusao = dados.data_conclusao || new Date().toISOString();
                }
                colabLocal.concluidos = colabLocal.treinamentos.filter(x => x.concluido).length;
            }

            _fecharModal();
            renderizar();

            if (window.showToast) showToast(`✅ Presença de "${c.nome_completo}" registrada com sucesso!`, 'success');

        } catch (e) {
            console.error('[PRESENÇA] Erro ao salvar:', e);
            alert('Erro ao salvar presença: ' + e.message);
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ph ph-check-circle"></i> Confirmar Presença'; }
        }
    };

    window._avancarPasso = function (passo) {
        _renderPasso(passo);
    };

    // ── Filtros ───────────────────────────────────────────────────────────────
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

    // Escuta navegação
    document.addEventListener('navigatedTo', function (e) {
        if (e.detail && e.detail.view === 'treinamento-presenca') {
            carregarDados();
        }
    });

    // Também tenta init ao carregar (caso já esteja na view)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (document.getElementById('view-treinamento-presenca')?.classList.contains('active')) {
                carregarDados();
            }
        });
    }

})();
