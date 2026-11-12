/**
 * frontend/uniamerica.js — Treinamentos › UniAmérica
 *  • Gestão de Cursos (Gestor UniAmérica): Diagnóstico por Departamento (Satisfação + Desempenho),
 *    Cursos & Aulas (Detalhes, Pesquisa em Aula com soma de pontos 1..10, Missões Semanais 1..10 com PDF R2
 *    e campos dinâmicos), Lista de Presença, Trava de Avaliação antes da próxima aula, Ranking, Prêmios e Certificados.
 *  • Missões (Colaborador): Testes em aula e Missões da semana liberados mediante presença na aula.
 */
(function () {
    'use strict';

    // ── Estado Global do Módulo ─────────────────────────────────────────────────
    const G = {
        aba: 'cursos',              // 'cursos' | 'diagnostico' | 'ranking' | 'premios'
        cursos: [],
        colabs: [],
        departamentos: [],
        filtroCursoIds: new Set(),  // multi-select de cursos na aba Cursos & Ranking
        filtroCursoBusca: '',
        filtroCursoMenuAberto: false,
        filtroDepto: '',
        filtroStatus: 'todos',
        cursoAbertoId: null,        // quando gerenciando aulas de um curso específico
        diagnostico: null,
        diagFiltroDepto: '',
        rankingQuadros: [],
        premioCursoId: null,
        premiosLista: []
    };

    const M = {
        colabOverrideId: '',
        buscaCurso: '',
        dados: null,
        estrelasTemp: {},           // key `${aulaId}_${missaoId}_${campoId}` -> 1..5
        gravadores: {}              // key `${aulaId}_${missaoId}_${campoId}` -> { rec, chunks, stream }
    };

    // Estado temporário do Modal de Aula (Detalhes, Pesquisa, Missões)
    let _aulaEditor = null;

    // ── Helpers Gerais e API ────────────────────────────────────────────────────
    const esc = s => String(s == null ? '' : s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const norm = s => String(s || '')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .trim().toLowerCase();

    function getToken() {
        return window.currentToken
            || (typeof currentToken !== 'undefined' ? currentToken : '')
            || localStorage.getItem('erp_token')
            || localStorage.getItem('token')
            || '';
    }

    function apiBase() {
        return (typeof window.API_URL !== 'undefined' && window.API_URL) ? window.API_URL : '/api';
    }

    function buildApiUrl(path) {
        const base = apiBase().replace(/\/+$/, '');
        if (path.startsWith('/api/')) {
            return base.replace(/\/api$/, '') + path;
        }
        return base + (path.startsWith('/') ? path : '/' + path);
    }

    function authMediaUrl(url, download) {
        if (!url) return '';
        let full = url.startsWith('http') ? url : buildApiUrl(url);
        const tk = getToken();
        if (tk && full.indexOf('token=') === -1) {
            full += (full.indexOf('?') === -1 ? '?' : '&') + 'token=' + encodeURIComponent(tk);
        }
        if (download && full.indexOf('download=1') === -1) {
            full += (full.indexOf('?') === -1 ? '?' : '&') + 'download=1';
        }
        return full;
    }

    async function api(path, opts) {
        opts = opts || {};
        const headers = Object.assign({ Authorization: 'Bearer ' + getToken() }, opts.headers || {});
        if (opts.body && !(opts.body instanceof FormData) && typeof opts.body === 'object') {
            headers['Content-Type'] = 'application/json';
            opts = Object.assign({}, opts, { body: JSON.stringify(opts.body) });
        } else if (opts.body && !(opts.body instanceof FormData) && !headers['Content-Type']) {
            headers['Content-Type'] = 'application/json';
        }
        const res = await fetch(buildApiUrl(path), Object.assign({}, opts, { headers }));
        let body = null;
        try { body = await res.json(); } catch (e) { /* ignore */ }
        if (!res.ok) {
            const err = new Error((body && body.error) || ('Erro HTTP ' + res.status));
            err.status = res.status;
            err.body = body;
            throw err;
        }
        return body;
    }

    function toastOk(msg) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({ icon: 'success', title: msg, timer: 1600, showConfirmButton: false });
        } else {
            alert(msg);
        }
    }

    function msgErro(titulo, texto) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({ icon: 'error', title: titulo || 'Atenção', text: texto || '' });
        } else {
            alert((titulo ? titulo + ': ' : '') + (texto || ''));
        }
    }

    async function confirmar(titulo, texto, btnTexto) {
        if (typeof Swal !== 'undefined') {
            const r = await Swal.fire({
                icon: 'warning',
                title: titulo,
                text: texto,
                showCancelButton: true,
                confirmButtonColor: '#4f46e5',
                cancelButtonColor: '#64748b',
                confirmButtonText: btnTexto || 'Confirmar',
                cancelButtonText: 'Cancelar'
            });
            return !!r.isConfirmed;
        }
        return window.confirm(titulo + '\n\n' + texto);
    }

    function fmtDataBr(iso) {
        if (!iso) return '—';
        const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
        return m ? `${m[3]}/${m[2]}/${m[1]}` : String(iso);
    }

    function limparNomeParaCertificado(nome) {
        if (typeof window.limparPrefixoGrupoCliente === 'function') {
            return window.limparPrefixoGrupoCliente(String(nome || '')).trim();
        }
        return String(nome || '').replace(/^[\u{1F300}-\u{1FAFF}\u2600-\u27BF]+\s*/u, '').trim();
    }

    // Escala oficial de 4 cores (Satisfação & Desempenho): >=4.5 Verde, <4.5 Amarelo, <4.0 Laranja, <3.0 Vermelho
    function infoCorNota(nota) {
        const v = parseFloat(nota);
        if (isNaN(v) || v <= 0) return { bg: '#f1f5f9', fg: '#64748b', border: '#e2e8f0', label: 'Sem dados' };
        if (v < 3.0) return { bg: '#fee2e2', fg: '#b91c1c', border: '#fca5a5', label: 'Crítico (<3,0)' };
        if (v < 4.0) return { bg: '#ffedd5', fg: '#c2410c', border: '#fdba74', label: 'Atenção redobrada (<4,0)' };
        if (v < 4.5) return { bg: '#fef9c3', fg: '#a16207', border: '#fde047', label: 'Ponto de atenção (<4,5)' };
        return { bg: '#dcfce7', fg: '#15803d', border: '#86efac', label: 'Forte (≥4,5)' };
    }

    // ── Estilos CSS Escopados (garantindo text-transform: none em todos os campos!) ──
    function injectStyles() {
        if (!document.getElementById('ua-cert-font-link')) {
            const link = document.createElement('link');
            link.id = 'ua-cert-font-link';
            link.rel = 'stylesheet';
            link.href = 'https://fonts.googleapis.com/css2?family=Great+Vibes&family=Dancing+Script:wght@600;700&display=swap';
            document.head.appendChild(link);
        }
        if (document.getElementById('uniamerica-styles')) return;
        const st = document.createElement('style');
        st.id = 'uniamerica-styles';
        st.textContent = `
            .ua-wrap, .ua-modal-backdrop {
                font-family: 'Inter', system-ui, -apple-system, sans-serif;
                color: #0f172a;
                text-transform: none !important;
            }
            .ua-wrap input, .ua-wrap textarea, .ua-wrap select, .ua-wrap option,
            .ua-modal-backdrop input, .ua-modal-backdrop textarea, .ua-modal-backdrop select, .ua-modal-backdrop option {
                text-transform: none !important;
                font-family: inherit;
            }
            .ua-wrap { padding: 24px 28px 48px; max-width: 1440px; margin: 0 auto; }
            .ua-hero {
                background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 55%, #4f46e5 100%);
                color: #fff;
                border-radius: 18px;
                padding: 24px 28px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 20px;
                flex-wrap: wrap;
                box-shadow: 0 12px 30px rgba(30, 58, 138, 0.18);
                margin-bottom: 20px;
            }
            .ua-hero h1 { margin: 0; font-size: 1.55rem; font-weight: 800; color: #fff; display: flex; align-items: center; gap: 10px; }
            .ua-hero p { margin: 6px 0 0; font-size: 0.92rem; color: rgba(255,255,255,0.88); }
            .ua-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; margin-bottom: 20px; }
            .ua-kpi {
                background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px 18px;
                display: flex; align-items: center; gap: 14px; box-shadow: 0 2px 6px rgba(15,23,42,0.03);
            }
            .ua-kpi-ic {
                width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center;
                font-size: 1.35rem; flex-shrink: 0;
            }
            .ua-kpi-val { font-size: 1.45rem; font-weight: 800; color: #0f172a; line-height: 1.1; }
            .ua-kpi-lbl { font-size: 0.8rem; color: #64748b; margin-top: 2px; }
            .ua-tabs {
                display: flex; gap: 8px; flex-wrap: wrap; border-bottom: 2px solid #e2e8f0;
                padding-bottom: 10px; margin-bottom: 20px;
            }
            .ua-tab {
                border: 1px solid transparent; background: #fff; color: #475569;
                padding: 9px 16px; border-radius: 10px; font-weight: 600; font-size: 0.88rem;
                cursor: pointer; display: inline-flex; align-items: center; gap: 8px; transition: all .15s;
            }
            .ua-tab:hover { background: #f1f5f9; color: #1e293b; }
            .ua-tab.active { background: #1e40af; color: #fff; box-shadow: 0 4px 12px rgba(30,64,175,0.22); }
            .ua-toolbar {
                background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px 16px;
                display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin-bottom: 18px;
            }
            .ua-input, .ua-select, .ua-textarea {
                width: 100%; padding: 9px 12px; border: 1px solid #cbd5e1; border-radius: 9px;
                font-size: 0.88rem; color: #0f172a; background: #fff; outline: none;
                text-transform: none !important;
            }
            .ua-input:focus, .ua-select:focus, .ua-textarea:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,0.12); }
            .ua-btn {
                border: none; border-radius: 9px; padding: 9px 15px; font-size: 0.86rem; font-weight: 600;
                cursor: pointer; display: inline-flex; align-items: center; gap: 7px; transition: all .15s;
                text-transform: none !important;
            }
            .ua-btn-primary { background: #2563eb; color: #fff; }
            .ua-btn-primary:hover { background: #1d4ed8; }
            .ua-btn-success { background: #16a34a; color: #fff; }
            .ua-btn-success:hover { background: #15803d; }
            .ua-btn-warning { background: #f59e0b; color: #fff; }
            .ua-btn-danger { background: #fee2e2; color: #b91c1c; }
            .ua-btn-danger:hover { background: #fecaca; }
            .ua-btn-ghost { background: #f1f5f9; color: #334155; border: 1px solid #e2e8f0; }
            .ua-btn-ghost:hover { background: #e2e8f0; }
            .ua-grid-cursos { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 18px; }
            .ua-card-curso {
                background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;
                display: flex; flex-direction: column; box-shadow: 0 4px 12px rgba(15,23,42,0.04);
                transition: transform .15s, box-shadow .15s;
            }
            .ua-card-curso:hover { transform: translateY(-2px); box-shadow: 0 10px 24px rgba(15,23,42,0.08); }
            .ua-card-capa {
                height: 148px; background: linear-gradient(135deg, #1e3a8a, #3b82f6);
                position: relative; display: flex; align-items: center; justify-content: center; overflow: hidden;
            }
            .ua-card-capa img { width: 100%; height: 100%; object-fit: cover; }
            .ua-badge {
                display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px;
                border-radius: 999px; font-size: 0.75rem; font-weight: 600;
            }
            .ua-ms-wrap { position: relative; min-width: 290px; flex: 1; max-width: 420px; }
            .ua-ms-trigger {
                width: 100%; padding: 9px 12px; border: 1px solid #cbd5e1; border-radius: 9px;
                background: #fff; display: flex; align-items: center; justify-content: space-between;
                cursor: pointer; font-size: 0.87rem; color: #0f172a;
            }
            .ua-ms-panel {
                position: absolute; top: calc(100% + 6px); left: 0; right: 0; z-index: 60;
                background: #fff; border: 1px solid #cbd5e1; border-radius: 12px;
                box-shadow: 0 14px 32px rgba(15,23,42,0.16); padding: 10px;
            }
            .ua-modal-backdrop {
                position: fixed; inset: 0; background: rgba(15, 23, 42, 0.58); z-index: 9990;
                display: flex; align-items: center; justify-content: center; padding: 18px;
            }
            .ua-modal {
                background: #fff; border-radius: 18px; width: 100%; max-width: 940px;
                max-height: 92vh; display: flex; flex-direction: column; overflow: hidden;
                box-shadow: 0 24px 60px rgba(15,23,42,0.28);
            }
            .ua-modal-hd {
                padding: 18px 22px; border-bottom: 1px solid #e2e8f0;
                display: flex; align-items: center; justify-content: space-between; gap: 12px;
                background: #f8fafc;
            }
            .ua-modal-hd h3 { margin: 0; font-size: 1.12rem; font-weight: 700; color: #0f172a; display: flex; align-items: center; gap: 8px; }
            .ua-modal-bd { padding: 20px 22px; overflow-y: auto; flex: 1; }
            .ua-modal-ft {
                padding: 14px 22px; border-top: 1px solid #e2e8f0; background: #f8fafc;
                display: flex; justify-content: flex-end; gap: 10px; flex-wrap: wrap;
            }
            .ua-table { width: 100%; border-collapse: collapse; font-size: 0.87rem; }
            .ua-table th {
                text-align: left; padding: 11px 12px; background: #f8fafc; color: #475569;
                font-weight: 700; font-size: 0.76rem; border-bottom: 1px solid #e2e8f0;
            }
            .ua-table td { padding: 11px 12px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
            .ua-star-btn {
                background: none; border: none; font-size: 1.65rem; cursor: pointer; padding: 0 3px;
                line-height: 1; transition: transform .12s;
            }
            .ua-star-btn:hover { transform: scale(1.15); }
            @media (max-width: 768px) {
                .ua-wrap { padding: 14px 12px 40px; }
                .ua-hero { padding: 18px; }
                .ua-grid-cursos { grid-template-columns: 1fr; }
            }
        `;
        document.head.appendChild(st);
    }

    // Fechar dropdown multi-select de curso ao clicar fora
    document.addEventListener('click', function (ev) {
        if (!ev.target.closest('.ua-ms-wrap')) {
            const panels = document.querySelectorAll('.ua-ms-panel');
            panels.forEach(p => { p.style.display = 'none'; });
            G.filtroCursoMenuAberto = false;
        }
    });

    // ── Carregamento de Colaboradores e Departamentos ───────────────────────────
    async function carregarBaseColaboradores() {
        try {
            const lista = await api('/colaboradores');
            const arr = Array.isArray(lista) ? lista : (lista && lista.colaboradores ? lista.colaboradores : []);
            G.colabs = arr.filter(c => !String(c.status || '').toLowerCase().startsWith('desligado'));
            const setDept = new Set();
            G.colabs.forEach(c => {
                const d = String(c.departamento || '').trim();
                if (d) setDept.add(d);
            });
            G.departamentos = Array.from(setDept).sort((a, b) => a.localeCompare(b, 'pt-BR'));
        } catch (e) {
            console.warn('[UniAmérica] Falha ao carregar colaboradores:', e.message);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  TELA 1: GESTÃO DE CURSOS (GESTOR UNIAMÉRICA)
    // ═══════════════════════════════════════════════════════════════════════════
    window.renderUniAmericaGestao = async function () {
        injectStyles();
        const root = document.getElementById('uniamerica-gestao-container');
        if (!root) return;

        root.innerHTML = `<div class="ua-wrap"><div style="padding:48px;text-align:center;color:#64748b;">
            <i class="ph ph-circle-notch" style="font-size:2rem;animation:spin 1s linear infinite;"></i>
            <div style="margin-top:8px;">Carregando Gestão de Cursos da UniAmérica...</div>
        </div></div>`;

        try {
            const [resCursos] = await Promise.all([
                api('/uniamerica/cursos'),
                carregarBaseColaboradores()
            ]);
            G.cursos = (resCursos && resCursos.cursos) ? resCursos.cursos : [];
            if (!G.premioCursoId && G.cursos.length > 0) {
                G.premioCursoId = G.cursos[0].id;
            }
            desenharGestao();
        } catch (e) {
            root.innerHTML = `<div class="ua-wrap">
                <div style="background:#fef2f2;border:1px solid #fecaca;color:#991b1b;padding:24px;border-radius:14px;">
                    <h3 style="margin:0 0 6px;"><i class="ph ph-lock-key"></i> Acesso restrito à Gestão da UniAmérica</h3>
                    <p style="margin:0;font-size:0.9rem;">${esc(e.message)}</p>
                </div>
            </div>`;
        }
    };

    function desenharGestao() {
        const root = document.getElementById('uniamerica-gestao-container');
        if (!root) return;

        // Se estiver gerenciando as aulas de um curso específico
        if (G.cursoAbertoId) {
            const curso = G.cursos.find(c => Number(c.id) === Number(G.cursoAbertoId));
            if (curso) {
                root.innerHTML = renderPainelAulasDoCurso(curso);
                return;
            }
            G.cursoAbertoId = null;
        }

        const totalCursos = G.cursos.length;
        const totalAulas = G.cursos.reduce((s, c) => s + (c.total_aulas || 0), 0);
        const totalPart = G.cursos.reduce((s, c) => s + (c.total_participantes || 0), 0);
        const totalPendMissoes = G.cursos.reduce((s, c) => s + (c.missoes_pendentes_avaliacao || 0), 0);

        root.innerHTML = `
            <div class="ua-wrap">
                <div class="ua-hero">
                    <div>
                        <h1><i class="ph ph-graduation-cap"></i> UniAmérica — Gestão de Cursos</h1>
                        <p>Desenvolvimento corporativo por departamento, testes em aula, missões semanais, ranking, prêmios e certificados.</p>
                    </div>
                    <div style="display:flex;gap:10px;flex-wrap:wrap;">
                        <button class="ua-btn" style="background:rgba(255,255,255,0.16);color:#fff;border:1px solid rgba(255,255,255,0.3);" onclick="window._uaMudarAbaGestao('diagnostico')">
                            <i class="ph ph-chart-polar"></i> Ver Análises por Departamento
                        </button>
                        <button class="ua-btn" style="background:#fff;color:#1e3a8a;font-weight:700;" onclick="window._uaAbrirModalCurso()">
                            <i class="ph ph-plus-circle"></i> Novo Curso
                        </button>
                    </div>
                </div>

                <div class="ua-kpis">
                    <div class="ua-kpi">
                        <div class="ua-kpi-ic" style="background:#dbeafe;color:#1d4ed8;"><i class="ph ph-books"></i></div>
                        <div><div class="ua-kpi-val">${totalCursos}</div><div class="ua-kpi-lbl">Cursos cadastrados</div></div>
                    </div>
                    <div class="ua-kpi">
                        <div class="ua-kpi-ic" style="background:#ede9fe;color:#6d28d9;"><i class="ph ph-chalkboard-teacher"></i></div>
                        <div><div class="ua-kpi-val">${totalAulas}</div><div class="ua-kpi-lbl">Aulas estruturadas</div></div>
                    </div>
                    <div class="ua-kpi">
                        <div class="ua-kpi-ic" style="background:#dcfce7;color:#15803d;"><i class="ph ph-users-three"></i></div>
                        <div><div class="ua-kpi-val">${totalPart}</div><div class="ua-kpi-lbl">Vínculos em cursos</div></div>
                    </div>
                    <div class="ua-kpi">
                        <div class="ua-kpi-ic" style="background:${totalPendMissoes > 0 ? '#ffedd5' : '#f1f5f9'};color:${totalPendMissoes > 0 ? '#c2410c' : '#64748b'};"><i class="ph ph-flag-checkered"></i></div>
                        <div><div class="ua-kpi-val">${totalPendMissoes}</div><div class="ua-kpi-lbl">Missões aguardando nota</div></div>
                    </div>
                </div>

                <div class="ua-tabs">
                    <button class="ua-tab ${G.aba === 'cursos' ? 'active' : ''}" onclick="window._uaMudarAbaGestao('cursos')">
                        <i class="ph ph-books"></i> Cursos & Aulas
                    </button>
                    <button class="ua-tab ${G.aba === 'diagnostico' ? 'active' : ''}" onclick="window._uaMudarAbaGestao('diagnostico')">
                        <i class="ph ph-heartbeat"></i> Diagnóstico por Departamento (Satisfação & Desempenho)
                    </button>
                    <button class="ua-tab ${G.aba === 'ranking' ? 'active' : ''}" onclick="window._uaMudarAbaGestao('ranking')">
                        <i class="ph ph-trophy"></i> Ranking & Certificados
                    </button>
                    <button class="ua-tab ${G.aba === 'premios' ? 'active' : ''}" onclick="window._uaMudarAbaGestao('premios')">
                        <i class="ph ph-medal"></i> Prêmios
                    </button>
                </div>

                <div id="ua-gestao-tab-body"></div>
            </div>
        `;

        renderAbaAtivaGestao();
    }

    window._uaMudarAbaGestao = async function (aba) {
        G.aba = aba;
        G.cursoAbertoId = null;
        desenharGestao();
    };

    async function renderAbaAtivaGestao() {
        const box = document.getElementById('ua-gestao-tab-body');
        if (!box) return;
        if (G.aba === 'cursos') {
            box.innerHTML = renderAbaCursosHtml();
        } else if (G.aba === 'diagnostico') {
            await carregarERenderizarDiagnostico(box);
        } else if (G.aba === 'ranking') {
            await carregarERenderizarRanking(box);
        } else if (G.aba === 'premios') {
            await carregarERenderizarPremios(box);
        }
    }

    // ── Componente: Multi-Select Pesquisável de Cursos (digitar + selecionar >1 curso) ──
    function renderFiltroCursosMultiSelectHtml(onChangeFnName) {
        const qtdSel = G.filtroCursoIds.size;
        let rotulo = 'Todos os cursos (clique para pesquisar ou selecionar vários)';
        if (qtdSel === 1) {
            const unicoId = Array.from(G.filtroCursoIds)[0];
            const c = G.cursos.find(x => x.id === unicoId);
            rotulo = c ? c.nome : '1 curso selecionado';
        } else if (qtdSel > 1) {
            rotulo = `${qtdSel} cursos selecionados`;
        }

        const termo = norm(G.filtroCursoBusca);
        const visiveis = G.cursos.filter(c => !termo || norm(c.nome).includes(termo));

        return `
            <div class="ua-ms-wrap">
                <button type="button" class="ua-ms-trigger" onclick="window._uaToggleCursoMs(event)">
                    <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                        <i class="ph ph-magnifying-glass" style="color:#64748b;margin-right:6px;"></i>${esc(rotulo)}
                    </span>
                    <i class="ph ph-caret-down" style="color:#64748b;"></i>
                </button>
                <div id="ua-curso-ms-panel" class="ua-ms-panel" style="display:${G.filtroCursoMenuAberto ? 'block' : 'none'};" onclick="event.stopPropagation()">
                    <input type="text" id="ua-curso-ms-search" class="ua-input" placeholder="Digite o nome do curso para filtrar..."
                           value="${esc(G.filtroCursoBusca)}"
                           oninput="window._uaFiltrarTextoCursoMs(this.value, '${onChangeFnName}')">
                    <div style="display:flex;justify-content:space-between;gap:8px;margin:8px 0;font-size:0.78rem;">
                        <button type="button" class="ua-btn ua-btn-ghost" style="padding:4px 9px;font-size:0.76rem;" onclick="window._uaMarcarVisiveisCursoMs('${onChangeFnName}')">Marcar visíveis</button>
                        <button type="button" class="ua-btn ua-btn-ghost" style="padding:4px 9px;font-size:0.76rem;" onclick="window._uaLimparCursoMs('${onChangeFnName}')">Limpar seleção</button>
                    </div>
                    <div id="ua-curso-ms-list" style="max-height:220px;overflow-y:auto;display:flex;flex-direction:column;gap:4px;">
                        ${visiveis.length === 0
                            ? `<div style="padding:10px;color:#94a3b8;font-size:0.82rem;text-align:center;">Nenhum curso compatível com "${esc(G.filtroCursoBusca)}"</div>`
                            : visiveis.map(c => `
                                <label style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:8px;cursor:pointer;font-size:0.84rem;background:${G.filtroCursoIds.has(c.id) ? '#eff6ff' : 'transparent'};">
                                    <input type="checkbox" ${G.filtroCursoIds.has(c.id) ? 'checked' : ''}
                                           onchange="window._uaToggleItemCursoMs(${c.id}, this.checked, '${onChangeFnName}')">
                                    <span style="flex:1;">${esc(c.nome)}</span>
                                    <span style="font-size:0.74rem;color:#64748b;">${c.total_aulas || 0} aula(s)</span>
                                </label>
                            `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    window._uaToggleCursoMs = function (ev) {
        if (ev) ev.stopPropagation();
        G.filtroCursoMenuAberto = !G.filtroCursoMenuAberto;
        const p = document.getElementById('ua-curso-ms-panel');
        if (p) {
            p.style.display = G.filtroCursoMenuAberto ? 'block' : 'none';
            if (G.filtroCursoMenuAberto) {
                const inp = document.getElementById('ua-curso-ms-search');
                if (inp) inp.focus();
            }
        }
    };

    window._uaFiltrarTextoCursoMs = function (val, fnName) {
        G.filtroCursoBusca = val || '';
        G.filtroCursoMenuAberto = true;
        if (typeof window[fnName] === 'function') window[fnName](true);
    };

    window._uaToggleItemCursoMs = function (cursoId, checked, fnName) {
        if (checked) G.filtroCursoIds.add(Number(cursoId));
        else G.filtroCursoIds.delete(Number(cursoId));
        G.filtroCursoMenuAberto = true;
        if (typeof window[fnName] === 'function') window[fnName](false);
    };

    window._uaMarcarVisiveisCursoMs = function (fnName) {
        const termo = norm(G.filtroCursoBusca);
        G.cursos.forEach(c => {
            if (!termo || norm(c.nome).includes(termo)) G.filtroCursoIds.add(Number(c.id));
        });
        G.filtroCursoMenuAberto = true;
        if (typeof window[fnName] === 'function') window[fnName](false);
    };

    window._uaLimparCursoMs = function (fnName) {
        G.filtroCursoIds.clear();
        G.filtroCursoBusca = '';
        G.filtroCursoMenuAberto = false;
        if (typeof window[fnName] === 'function') window[fnName](false);
    };

    // ── ABA 1: CURSOS & AULAS ───────────────────────────────────────────────────
    function filtrarListaCursosGestao() {
        const termoDigitado = norm(G.filtroCursoBusca);
        return G.cursos.filter(c => {
            if (G.filtroCursoIds.size > 0) {
                if (!G.filtroCursoIds.has(Number(c.id))) return false;
            } else if (termoDigitado) {
                if (!norm(c.nome).includes(termoDigitado)) return false;
            }
            if (G.filtroDepto) {
                const depts = String(c.departamentos || '').toLowerCase();
                if (depts !== 'todos' && !norm(c.departamentos).split(',').map(s => s.trim()).includes(norm(G.filtroDepto))) {
                    return false;
                }
            }
            if (G.filtroStatus !== 'todos' && c.status !== G.filtroStatus) return false;
            return true;
        });
    }

    function renderCardsCursosInterno(lista) {
        if (lista.length === 0) {
            return `<div style="background:#fff;border:1px dashed #cbd5e1;border-radius:16px;padding:48px 24px;text-align:center;color:#64748b;">
                <i class="ph ph-graduation-cap" style="font-size:2.6rem;color:#94a3b8;"></i>
                <h3 style="margin:10px 0 6px;color:#1e293b;">Nenhum curso encontrado</h3>
                <p style="margin:0 0 16px;font-size:0.9rem;">Crie um curso com suas aulas, perguntas em sala e missões semanais.</p>
                <button class="ua-btn ua-btn-primary" onclick="window._uaAbrirModalCurso()"><i class="ph ph-plus-circle"></i> Criar Primeiro Curso</button>
            </div>`;
        }

        return `<div class="ua-grid-cursos">
            ${lista.map(c => {
                const capa = c.capa_stream_url ? authMediaUrl(c.capa_stream_url) : '';
                const statusCor = c.status === 'concluido' ? { bg: '#dcfce7', fg: '#15803d', txt: 'Concluído' }
                    : c.status === 'arquivado' ? { bg: '#f1f5f9', fg: '#64748b', txt: 'Arquivado' }
                    : { bg: '#dbeafe', fg: '#1d4ed8', txt: 'Ativo' };

                return `
                    <div class="ua-card-curso">
                        <div class="ua-card-capa">
                            ${capa
                                ? `<img src="${esc(capa)}" alt="${esc(c.nome)}" onerror="this.style.display='none'">`
                                : `<i class="ph ph-graduation-cap" style="font-size:3.2rem;color:rgba(255,255,255,0.75);"></i>`}
                            <span class="ua-badge" style="position:absolute;top:12px;right:12px;background:${statusCor.bg};color:${statusCor.fg};">
                                ${statusCor.txt}
                            </span>
                            ${c.missoes_pendentes_avaliacao > 0 ? `
                                <span class="ua-badge" style="position:absolute;bottom:12px;left:12px;background:#ea580c;color:#fff;">
                                    <i class="ph ph-warning-circle"></i> ${c.missoes_pendentes_avaliacao} missão(ões) p/ avaliar
                                </span>
                            ` : ''}
                        </div>
                        <div style="padding:18px;flex:1;display:flex;flex-direction:column;gap:10px;">
                            <div style="font-size:1.06rem;font-weight:700;color:#0f172a;">${esc(c.nome)}</div>
                            ${c.descricao ? `<div style="font-size:0.84rem;color:#64748b;line-height:1.45;">${esc(c.descricao.slice(0, 140))}${c.descricao.length > 140 ? '...' : ''}</div>` : ''}
                            <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:2px;">
                                <span class="ua-badge" style="background:#f1f5f9;color:#334155;">
                                    <i class="ph ph-buildings"></i> ${esc(c.departamentos || 'Vínculo individual')}
                                </span>
                                <span class="ua-badge" style="background:#eef2ff;color:#4338ca;">
                                    <i class="ph ph-users"></i> ${c.total_participantes || 0} participante(s)
                                </span>
                                <span class="ua-badge" style="background:#f0fdf4;color:#15803d;">
                                    <i class="ph ph-chalkboard-teacher"></i> ${c.total_aulas || 0} aula(s)
                                </span>
                                ${c.carga_horaria ? `<span class="ua-badge" style="background:#fef9c3;color:#854d0e;"><i class="ph ph-clock"></i> ${c.carga_horaria}h</span>` : ''}
                            </div>
                            <div style="font-size:0.78rem;color:#64748b;">
                                Período: <strong>${fmtDataBr(c.data_inicio)}</strong> até <strong>${fmtDataBr(c.data_fim)}</strong>
                            </div>
                            <div style="margin-top:auto;padding-top:12px;border-top:1px solid #f1f5f9;display:flex;gap:8px;flex-wrap:wrap;">
                                <button class="ua-btn ua-btn-primary" style="flex:1;justify-content:center;" onclick="window._uaAbrirAulasCurso(${c.id})">
                                    <i class="ph ph-list-checks"></i> Gerenciar Aulas (${c.total_aulas || 0})
                                </button>
                                <button class="ua-btn ua-btn-ghost" title="Ver Ranking e Certificados" onclick="window._uaIrRankingCurso(${c.id})">
                                    <i class="ph ph-trophy"></i>
                                </button>
                                <button class="ua-btn ua-btn-ghost" title="Editar Curso e Participantes" onclick="window._uaAbrirModalCurso(${c.id})">
                                    <i class="ph ph-pencil-simple"></i>
                                </button>
                                <button class="ua-btn ua-btn-danger" title="Excluir Curso" onclick="window._uaExcluirCurso(${c.id})">
                                    <i class="ph ph-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>`;
    }

    function renderAbaCursosHtml() {
        const filtrados = filtrarListaCursosGestao();
        return `
            <div class="ua-toolbar">
                ${renderFiltroCursosMultiSelectHtml('_uaAtualizarFiltroCursosGestao')}
                <select class="ua-select" style="width:auto;min-width:190px;" onchange="G_uaSetDepto(this.value)">
                    <option value="">Todos os departamentos</option>
                    ${G.departamentos.map(d => `<option value="${esc(d)}" ${G.filtroDepto === d ? 'selected' : ''}>${esc(d)}</option>`).join('')}
                </select>
                <select class="ua-select" style="width:auto;min-width:150px;" onchange="G_uaSetStatus(this.value)">
                    <option value="todos" ${G.filtroStatus === 'todos' ? 'selected' : ''}>Todos os status</option>
                    <option value="ativo" ${G.filtroStatus === 'ativo' ? 'selected' : ''}>Ativos</option>
                    <option value="concluido" ${G.filtroStatus === 'concluido' ? 'selected' : ''}>Concluídos</option>
                    <option value="arquivado" ${G.filtroStatus === 'arquivado' ? 'selected' : ''}>Arquivados</option>
                </select>
                <div style="margin-left:auto;font-size:0.83rem;color:#64748b;">
                    Exibindo <strong>${filtrados.length}</strong> de ${G.cursos.length} curso(s)
                </div>
            </div>
            <div id="ua-cursos-cards-wrap">
                ${renderCardsCursosInterno(filtrados)}
            </div>
        `;
    }

    window.G_uaSetDepto = function (v) { G.filtroDepto = v; renderAbaAtivaGestao(); };
    window.G_uaSetStatus = function (v) { G.filtroStatus = v; renderAbaAtivaGestao(); };
    window._uaAtualizarFiltroCursosGestao = function (manterFocoInput) {
        if (manterFocoInput) {
            // Atualiza somente a lista do dropdown e os cards para não perder o cursor de digitação
            const listEl = document.getElementById('ua-curso-ms-list');
            const termo = norm(G.filtroCursoBusca);
            const visiveis = G.cursos.filter(c => !termo || norm(c.nome).includes(termo));
            if (listEl) {
                listEl.innerHTML = visiveis.length === 0
                    ? `<div style="padding:10px;color:#94a3b8;font-size:0.82rem;text-align:center;">Nenhum curso compatível com "${esc(G.filtroCursoBusca)}"</div>`
                    : visiveis.map(c => `
                        <label style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:8px;cursor:pointer;font-size:0.84rem;background:${G.filtroCursoIds.has(c.id) ? '#eff6ff' : 'transparent'};">
                            <input type="checkbox" ${G.filtroCursoIds.has(c.id) ? 'checked' : ''}
                                   onchange="window._uaToggleItemCursoMs(${c.id}, this.checked, '_uaAtualizarFiltroCursosGestao')">
                            <span style="flex:1;">${esc(c.nome)}</span>
                            <span style="font-size:0.74rem;color:#64748b;">${c.total_aulas || 0} aula(s)</span>
                        </label>
                    `).join('');
            }
            const wrapCards = document.getElementById('ua-cursos-cards-wrap');
            if (wrapCards) wrapCards.innerHTML = renderCardsCursosInterno(filtrarListaCursosGestao());
            return;
        }
        renderAbaAtivaGestao();
    };

    window._uaIrRankingCurso = function (cursoId) {
        G.filtroCursoIds = new Set([Number(cursoId)]);
        G.aba = 'ranking';
        G.cursoAbertoId = null;
        desenharGestao();
    };

    // ── Modal Novo / Editar Curso (Vinculação por Departamento + Colaborador ao Curso Inteiro!) ──
    window._uaAbrirModalCurso = function (cursoId, deptoPreSelecionado) {
        const curso = cursoId ? G.cursos.find(c => Number(c.id) === Number(cursoId)) : null;
        const deptRaw = curso ? String(curso.departamentos || '') : (deptoPreSelecionado || '');
        const isTodosDept = deptRaw.trim().toLowerCase() === 'todos';
        const deptSet = new Set(
            (!isTodosDept && deptRaw && deptRaw.toLowerCase() !== 'nenhum')
                ? deptRaw.split(',').map(s => s.trim()).filter(Boolean)
                : []
        );
        const avulsosSet = new Set(
            String(curso ? curso.colaboradores_avulsos || '' : '')
                .split(',').map(x => parseInt(x.trim(), 10)).filter(n => !isNaN(n) && n > 0)
        );

        const backdrop = document.createElement('div');
        backdrop.className = 'ua-modal-backdrop';
        backdrop.id = 'ua-modal-curso';
        backdrop.innerHTML = `
            <div class="ua-modal" style="max-width:860px;">
                <div class="ua-modal-hd">
                    <h3><i class="ph ph-graduation-cap" style="color:#2563eb;"></i> ${curso ? 'Editar Curso da UniAmérica' : 'Novo Curso da UniAmérica'}</h3>
                    <button class="ua-btn ua-btn-ghost" style="padding:6px 10px;" onclick="document.getElementById('ua-modal-curso').remove()"><i class="ph ph-x"></i></button>
                </div>
                <div class="ua-modal-bd">
                    <div style="display:grid;grid-template-columns:2fr 1fr;gap:14px;margin-bottom:14px;">
                        <div>
                            <label style="font-size:0.82rem;font-weight:600;display:block;margin-bottom:5px;">Nome do Curso *</label>
                            <input type="text" id="ua-c-nome" class="ua-input" placeholder="Ex.: Formação de Liderança Operacional" value="${esc(curso ? curso.nome : '')}">
                        </div>
                        <div>
                            <label style="font-size:0.82rem;font-weight:600;display:block;margin-bottom:5px;">Carga Horária Total (horas)</label>
                            <input type="number" step="0.5" min="0" id="ua-c-carga" class="ua-input" placeholder="Ex.: 24" value="${esc(curso ? curso.carga_horaria || '' : '')}">
                        </div>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-bottom:14px;">
                        <div>
                            <label style="font-size:0.82rem;font-weight:600;display:block;margin-bottom:5px;">Data de Início</label>
                            <input type="date" id="ua-c-inicio" class="ua-input" value="${esc(curso && curso.data_inicio ? curso.data_inicio : '')}">
                        </div>
                        <div>
                            <label style="font-size:0.82rem;font-weight:600;display:block;margin-bottom:5px;">Data de Término</label>
                            <input type="date" id="ua-c-fim" class="ua-input" value="${esc(curso && curso.data_fim ? curso.data_fim : '')}">
                        </div>
                        <div>
                            <label style="font-size:0.82rem;font-weight:600;display:block;margin-bottom:5px;">Status do Curso</label>
                            <select id="ua-c-status" class="ua-select">
                                <option value="ativo" ${!curso || curso.status === 'ativo' ? 'selected' : ''}>Ativo</option>
                                <option value="concluido" ${curso && curso.status === 'concluido' ? 'selected' : ''}>Concluído</option>
                                <option value="arquivado" ${curso && curso.status === 'arquivado' ? 'selected' : ''}>Arquivado</option>
                            </select>
                        </div>
                    </div>
                    <div style="margin-bottom:14px;">
                        <label style="font-size:0.82rem;font-weight:600;display:block;margin-bottom:5px;">Descrição / Objetivo do Curso</label>
                        <textarea id="ua-c-desc" rows="2" class="ua-textarea" placeholder="Descreva os objetivos e competências desenvolvidas neste treinamento...">${esc(curso ? curso.descricao || '' : '')}</textarea>
                    </div>
                    <div style="margin-bottom:16px;">
                        <label style="font-size:0.82rem;font-weight:600;display:block;margin-bottom:5px;">Imagem de Capa do Curso (salva no Cloudflare R2)</label>
                        <input type="file" id="ua-c-capa" accept="image/*" class="ua-input">
                    </div>

                    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:12px 14px;margin-bottom:14px;font-size:0.83rem;color:#1e3a8a;">
                        <i class="ph ph-info"></i> <strong>Regra de vínculo:</strong> O vínculo por Departamento e Colaborador vale para <strong>todo o curso</strong> (todas as aulas, testes em sala e missões semanais deste treinamento).
                    </div>

                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:14px;">
                        <div style="border:1px solid #e2e8f0;border-radius:12px;padding:12px;">
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                                <strong style="font-size:0.85rem;">1. Vincular Departamentos</strong>
                                <label style="font-size:0.8rem;cursor:pointer;display:flex;align-items:center;gap:5px;">
                                    <input type="checkbox" id="ua-c-dept-todos" ${isTodosDept ? 'checked' : ''} onchange="window._uaToggleTodosDeptModal(this.checked)"> Todos os setores
                                </label>
                            </div>
                            <div id="ua-c-dept-list" style="max-height:190px;overflow-y:auto;display:flex;flex-direction:column;gap:4px;opacity:${isTodosDept ? '0.45' : '1'};pointer-events:${isTodosDept ? 'none' : 'auto'};">
                                ${G.departamentos.map(d => `
                                    <label style="display:flex;align-items:center;gap:8px;font-size:0.83rem;padding:4px 6px;border-radius:6px;cursor:pointer;">
                                        <input type="checkbox" class="ua-c-dept-chk" value="${esc(d)}" ${deptSet.has(d) ? 'checked' : ''}>
                                        <span>${esc(d)}</span>
                                    </label>
                                `).join('')}
                            </div>
                        </div>

                        <div style="border:1px solid #e2e8f0;border-radius:12px;padding:12px;">
                            <div style="margin-bottom:8px;">
                                <strong style="font-size:0.85rem;display:block;margin-bottom:6px;">2. Vincular Colaboradores Específicos</strong>
                                <input type="text" class="ua-input" style="padding:6px 10px;font-size:0.82rem;" placeholder="Pesquisar colaborador por nome ou setor..."
                                       oninput="window._uaFiltrarColabModal(this.value)">
                            </div>
                            <div id="ua-c-colab-list" style="max-height:155px;overflow-y:auto;display:flex;flex-direction:column;gap:4px;">
                                ${G.colabs.map(col => `
                                    <label class="ua-c-colab-row" data-search="${esc(norm(col.nome_completo + ' ' + (col.departamento || '') + ' ' + (col.cargo || '')))}"
                                           style="display:flex;align-items:center;gap:8px;font-size:0.82rem;padding:4px 6px;border-radius:6px;cursor:pointer;">
                                        <input type="checkbox" class="ua-c-colab-chk" value="${col.id}" ${avulsosSet.has(Number(col.id)) ? 'checked' : ''}>
                                        <span style="flex:1;">${esc(col.nome_completo)} <small style="color:#64748b;">(${esc(col.departamento || 'Sem setor')})</small></span>
                                    </label>
                                `).join('')}
                            </div>
                        </div>
                    </div>

                    <div>
                        <label style="font-size:0.82rem;font-weight:600;display:block;margin-bottom:5px;">Avaliação Geral & Apresentação Final (após a última aula)</label>
                        <textarea id="ua-c-aval-geral" rows="2" class="ua-textarea" placeholder="Registre observações da avaliação geral, banca/apresentação final e entrega de certificados...">${esc(curso ? curso.avaliacao_geral_obs || '' : '')}</textarea>
                    </div>
                </div>
                <div class="ua-modal-ft">
                    <button class="ua-btn ua-btn-ghost" onclick="document.getElementById('ua-modal-curso').remove()">Cancelar</button>
                    <button class="ua-btn ua-btn-primary" id="ua-btn-salvar-curso" onclick="window._uaSalvarCurso(${curso ? curso.id : 'null'})">
                        <i class="ph ph-floppy-disk"></i> ${curso ? 'Salvar Alterações' : 'Criar Curso'}
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(backdrop);
    };

    window._uaToggleTodosDeptModal = function (checked) {
        const list = document.getElementById('ua-c-dept-list');
        if (!list) return;
        list.style.opacity = checked ? '0.45' : '1';
        list.style.pointerEvents = checked ? 'none' : 'auto';
    };

    window._uaFiltrarColabModal = function (q) {
        const termo = norm(q);
        document.querySelectorAll('.ua-c-colab-row').forEach(el => {
            const hay = el.getAttribute('data-search') || '';
            el.style.display = (!termo || hay.includes(termo)) ? 'flex' : 'none';
        });
    };

    window._uaSalvarCurso = async function (cursoId) {
        const nome = (document.getElementById('ua-c-nome').value || '').trim();
        if (!nome) return msgErro('Campo obrigatório', 'Informe o nome do curso.');

        const todosDept = document.getElementById('ua-c-dept-todos').checked;
        const deptsMarcados = Array.from(document.querySelectorAll('.ua-c-dept-chk:checked')).map(el => el.value);
        const departamentos = todosDept ? 'Todos' : (deptsMarcados.length > 0 ? deptsMarcados.join(',') : 'Nenhum');

        const colabsMarcados = Array.from(document.querySelectorAll('.ua-c-colab-chk:checked')).map(el => el.value);
        const colaboradores_avulsos = colabsMarcados.join(',');

        const fd = new FormData();
        fd.append('nome', nome);
        fd.append('carga_horaria', document.getElementById('ua-c-carga').value || '0');
        fd.append('data_inicio', document.getElementById('ua-c-inicio').value || '');
        fd.append('data_fim', document.getElementById('ua-c-fim').value || '');
        fd.append('status', document.getElementById('ua-c-status').value || 'ativo');
        fd.append('descricao', document.getElementById('ua-c-desc').value || '');
        fd.append('departamentos', departamentos);
        fd.append('colaboradores_avulsos', colaboradores_avulsos);
        fd.append('avaliacao_geral_obs', document.getElementById('ua-c-aval-geral').value || '');

        const capaInput = document.getElementById('ua-c-capa');
        if (capaInput && capaInput.files && capaInput.files[0]) {
            fd.append('capa', capaInput.files[0]);
        }

        const btn = document.getElementById('ua-btn-salvar-curso');
        if (btn) btn.disabled = true;

        try {
            if (cursoId) {
                await api('/uniamerica/cursos/' + cursoId, { method: 'PUT', body: fd });
                toastOk('Curso atualizado com sucesso!');
            } else {
                const novo = await api('/uniamerica/cursos', { method: 'POST', body: fd });
                toastOk('Curso criado! Agora adicione as aulas do curso.');
                if (novo && novo.id) G.cursoAbertoId = novo.id;
            }
            const m = document.getElementById('ua-modal-curso');
            if (m) m.remove();
            await window.renderUniAmericaGestao();
        } catch (e) {
            if (btn) btn.disabled = false;
            msgErro('Erro ao salvar curso', e.message);
        }
    };

    window._uaExcluirCurso = async function (cursoId) {
        const curso = G.cursos.find(c => Number(c.id) === Number(cursoId));
        if (!await confirmar('Excluir curso?', `Deseja excluir permanentemente o curso "${curso ? curso.nome : ''}", todas as aulas, notas e arquivos do R2?`, 'Sim, excluir')) return;
        try {
            await api('/uniamerica/cursos/' + cursoId, { method: 'DELETE' });
            toastOk('Curso excluído.');
            await window.renderUniAmericaGestao();
        } catch (e) {
            msgErro('Erro ao excluir', e.message);
        }
    };

    // ═══════════════════════════════════════════════════════════════════════════
    //  GERENCIAMENTO DE AULAS DO CURSO (DETALHES, PESQUISA EM SALA, MISSÕES, PRESENÇA E AVALIAÇÃO)
    // ═══════════════════════════════════════════════════════════════════════════
    window._uaAbrirAulasCurso = function (cursoId) {
        G.cursoAbertoId = Number(cursoId);
        desenharGestao();
    };

    window._uaVoltarListaCursos = function () {
        G.cursoAbertoId = null;
        desenharGestao();
    };

    function renderPainelAulasDoCurso(curso) {
        const aulas = Array.isArray(curso.aulas) ? curso.aulas : [];
        return `
            <div class="ua-wrap">
                <div style="margin-bottom:14px;">
                    <button class="ua-btn ua-btn-ghost" onclick="window._uaVoltarListaCursos()">
                        <i class="ph ph-arrow-left"></i> Voltar para Lista de Cursos
                    </button>
                </div>

                <div class="ua-hero" style="margin-bottom:20px;">
                    <div>
                        <h1><i class="ph ph-chalkboard-teacher"></i> ${esc(curso.nome)}</h1>
                        <p>
                            Vínculo do curso inteiro: <strong>${esc(curso.departamentos || 'Individual')}</strong> •
                            <strong>${curso.total_participantes || 0}</strong> participante(s) •
                            <strong>${aulas.length}</strong> aula(s) • Carga horária: <strong>${curso.carga_horaria || 0}h</strong>
                        </p>
                    </div>
                    <div style="display:flex;gap:10px;flex-wrap:wrap;">
                        <button class="ua-btn" style="background:rgba(255,255,255,0.16);color:#fff;border:1px solid rgba(255,255,255,0.3);" onclick="window._uaIrRankingCurso(${curso.id})">
                            <i class="ph ph-trophy"></i> Ranking & Certificados
                        </button>
                        <button class="ua-btn" style="background:#fff;color:#1e3a8a;font-weight:700;" onclick="window._uaAbrirEditorAula(${curso.id}, null)">
                            <i class="ph ph-plus-circle"></i> Nova Aula
                        </button>
                    </div>
                </div>

                <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:12px 16px;margin-bottom:18px;font-size:0.84rem;color:#92400e;display:flex;gap:10px;align-items:center;">
                    <i class="ph ph-info" style="font-size:1.2rem;flex-shrink:0;"></i>
                    <div>
                        <strong>Fluxo das Aulas:</strong>
                        1) Registre a <strong>Lista de Presença</strong> para liberar o teste em sala e as missões (válidas por 1 semana).
                        2) Antes de <strong>Iniciar a próxima aula</strong>, avalie todas as missões realizadas na aula anterior atribuindo nota de <strong>1 a 10</strong>.
                        3) Apenas colaboradores com presença em <strong>todas as aulas</strong> recebem o Certificado.
                    </div>
                </div>

                ${aulas.length === 0 ? `
                    <div style="background:#fff;border:1px dashed #cbd5e1;border-radius:16px;padding:48px 24px;text-align:center;color:#64748b;">
                        <i class="ph ph-chalkboard" style="font-size:2.5rem;color:#94a3b8;"></i>
                        <h3 style="margin:10px 0 6px;color:#0f172a;">Nenhuma aula cadastrada neste curso</h3>
                        <p style="margin:0 0 16px;font-size:0.9rem;">Adicione as aulas com seus materiais, perguntas de múltipla escolha em aula e missões semanais.</p>
                        <button class="ua-btn ua-btn-primary" onclick="window._uaAbrirEditorAula(${curso.id}, null)">
                            <i class="ph ph-plus-circle"></i> Adicionar Aula 1
                        </button>
                    </div>
                ` : `
                    <div style="display:flex;flex-direction:column;gap:14px;">
                        ${aulas.map(a => {
                            const pergs = Array.isArray(a.perguntas) ? a.perguntas : [];
                            const missoes = Array.isArray(a.missoes) ? a.missoes : [];
                            const anexos = Array.isArray(a.anexos) ? a.anexos : [];
                            const somaPtsPergs = pergs.reduce((s, q) => s + (Number(q.nota_pontos) || 1), 0);
                            const somaPtsMissoes = missoes.reduce((s, m) => s + (Number(m.nota_maxima) || 10), 0);
                            const stBadge = a.status_aula === 'concluida'
                                ? { bg: '#dcfce7', fg: '#15803d', txt: 'Concluída' }
                                : a.status_aula === 'em_andamento'
                                    ? { bg: '#dbeafe', fg: '#1d4ed8', txt: 'Em andamento' }
                                    : { bg: '#f1f5f9', fg: '#475569', txt: 'Agendada' };

                            return `
                                <div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:18px 20px;box-shadow:0 2px 8px rgba(15,23,42,0.03);">
                                    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:14px;flex-wrap:wrap;">
                                        <div>
                                            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                                                <span class="ua-badge" style="background:#1e3a8a;color:#fff;">Aula ${a.ordem}</span>
                                                <h3 style="margin:0;font-size:1.08rem;font-weight:700;color:#0f172a;">${esc(a.titulo)}</h3>
                                                <span class="ua-badge" style="background:${stBadge.bg};color:${stBadge.fg};">${stBadge.txt}</span>
                                                ${a.missoes_pendentes_avaliacao > 0 ? `
                                                    <span class="ua-badge" style="background:#ffedd5;color:#c2410c;">
                                                        <i class="ph ph-clock-countdown"></i> ${a.missoes_pendentes_avaliacao} missão(ões) pendente(s) de nota
                                                    </span>
                                                ` : ''}
                                            </div>
                                            ${a.descricao ? `<p style="margin:6px 0 0;font-size:0.85rem;color:#64748b;">${esc(a.descricao)}</p>` : ''}
                                            <div style="display:flex;gap:14px;flex-wrap:wrap;margin-top:10px;font-size:0.81rem;color:#475569;">
                                                <span><i class="ph ph-calendar-blank"></i> Data: <strong>${fmtDataBr(a.data_aula)}</strong></span>
                                                <span><i class="ph ph-clock"></i> Carga: <strong>${a.carga_horaria || 0}h</strong></span>
                                                <span><i class="ph ph-paperclip"></i> Materiais: <strong>${anexos.length}</strong></span>
                                                <span><i class="ph ph-exam"></i> Pesquisa em aula: <strong>${pergs.length} questão(ões) (${somaPtsPergs} pts)</strong></span>
                                                <span><i class="ph ph-rocket-launch"></i> Missões (1 sem.): <strong>${missoes.length} atividade(s) (${somaPtsMissoes} pts)</strong></span>
                                            </div>
                                        </div>

                                        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
                                            ${a.status_aula === 'agendada' ? `
                                                <button class="ua-btn ua-btn-primary" onclick="window._uaIniciarAula(${a.id})">
                                                    <i class="ph ph-play-circle"></i> Iniciar Aula
                                                </button>
                                            ` : ''}
                                            ${a.status_aula === 'em_andamento' ? `
                                                <button class="ua-btn ua-btn-success" onclick="window._uaConcluirAula(${a.id})">
                                                    <i class="ph ph-check-circle"></i> Concluir Aula
                                                </button>
                                            ` : ''}
                                            <button class="ua-btn ua-btn-ghost" onclick="window._uaAbrirPresencaAula(${a.id})">
                                                <i class="ph ph-user-check"></i> Lista de Presença
                                            </button>
                                            <button class="ua-btn ${a.missoes_pendentes_avaliacao > 0 ? 'ua-btn-warning' : 'ua-btn-ghost'}" onclick="window._uaAbrirAvaliacaoAula(${a.id})">
                                                <i class="ph ph-star"></i> Avaliar Testes & Missões
                                            </button>
                                            <button class="ua-btn ua-btn-ghost" onclick="window._uaAbrirEditorAula(${curso.id}, ${a.id})" title="Editar Detalhes, Pesquisa e Missões">
                                                <i class="ph ph-pencil-simple"></i> Editar Aula
                                            </button>
                                            <button class="ua-btn ua-btn-danger" onclick="window._uaExcluirAula(${a.id})" title="Excluir Aula">
                                                <i class="ph ph-trash"></i>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                `}
            </div>
        `;
    }

    window._uaIniciarAula = async function (aulaId) {
        try {
            await api(`/uniamerica/aulas/${aulaId}/iniciar`, { method: 'POST', body: {} });
            toastOk('Aula iniciada! Registre a lista de presença para liberar o teste e as missões.');
            await window.renderUniAmericaGestao();
        } catch (e) {
            if (e.status === 409 && e.body && e.body.codigo === 'MISSOES_ANTERIORES_PENDENTES') {
                if (typeof Swal !== 'undefined') {
                    const r = await Swal.fire({
                        icon: 'warning',
                        title: 'Avaliação de Missões Obrigatória',
                        text: e.body.error || e.message,
                        showCancelButton: true,
                        confirmButtonColor: '#2563eb',
                        confirmButtonText: 'Avaliar Missões da Aula Anterior Agora',
                        cancelButtonText: 'Fechar'
                    });
                    if (r.isConfirmed && e.body.aula_anterior_id) {
                        window._uaAbrirAvaliacaoAula(e.body.aula_anterior_id);
                    }
                } else {
                    alert(e.message);
                    if (e.body.aula_anterior_id) window._uaAbrirAvaliacaoAula(e.body.aula_anterior_id);
                }
                return;
            }
            msgErro('Não foi possível iniciar a aula', e.message);
        }
    };

    window._uaConcluirAula = async function (aulaId) {
        if (!await confirmar('Concluir esta aula?', 'Ao marcar todas as aulas como concluídas, o Ranking Final do curso ficará consolidado.', 'Concluir Aula')) return;
        try {
            await api(`/uniamerica/aulas/${aulaId}/concluir`, { method: 'POST', body: {} });
            toastOk('Aula concluída!');
            await window.renderUniAmericaGestao();
        } catch (e) {
            msgErro('Erro ao concluir aula', e.message);
        }
    };

    window._uaExcluirAula = async function (aulaId) {
        if (!await confirmar('Excluir aula?', 'Todos os materiais, presenças, respostas e missões desta aula serão removidos.', 'Excluir')) return;
        try {
            await api(`/uniamerica/aulas/${aulaId}`, { method: 'DELETE' });
            toastOk('Aula excluída.');
            await window.renderUniAmericaGestao();
        } catch (e) {
            msgErro('Erro ao excluir aula', e.message);
        }
    };

    // ── MODAL DE CRIAÇÃO / EDIÇÃO DE AULA (3 ABAS: DETALHES, PESQUISA, MISSÕES) ──
    window._uaAbrirEditorAula = function (cursoId, aulaId) {
        const curso = G.cursos.find(c => Number(c.id) === Number(cursoId));
        if (!curso) return;
        const aulaOrig = aulaId ? (curso.aulas || []).find(a => Number(a.id) === Number(aulaId)) : null;

        _aulaEditor = {
            cursoId: curso.id,
            aulaId: aulaOrig ? aulaOrig.id : null,
            aba: 'detalhes',
            ordem: aulaOrig ? aulaOrig.ordem : ((curso.aulas ? curso.aulas.length : 0) + 1),
            titulo: aulaOrig ? aulaOrig.titulo : '',
            data_aula: aulaOrig && aulaOrig.data_aula ? aulaOrig.data_aula : '',
            carga_horaria: aulaOrig ? (aulaOrig.carga_horaria || 0) : 2,
            descricao: aulaOrig ? (aulaOrig.descricao || '') : '',
            anexos: aulaOrig && Array.isArray(aulaOrig.anexos) ? JSON.parse(JSON.stringify(aulaOrig.anexos)) : [],
            arquivosNovos: [], // Files a enviar caso a aula ainda esteja sendo criada
            perguntas: aulaOrig && Array.isArray(aulaOrig.perguntas)
                ? JSON.parse(JSON.stringify(aulaOrig.perguntas))
                : [],
            missoes: aulaOrig && Array.isArray(aulaOrig.missoes)
                ? JSON.parse(JSON.stringify(aulaOrig.missoes))
                : []
        };

        const old = document.getElementById('ua-modal-aula');
        if (old) old.remove();

        const backdrop = document.createElement('div');
        backdrop.className = 'ua-modal-backdrop';
        backdrop.id = 'ua-modal-aula';
        document.body.appendChild(backdrop);

        desenharModalEditorAula();
    };

    function sincronizarInputsEditorAula() {
        if (!_aulaEditor) return;
        const t = document.getElementById('ua-ae-titulo');
        if (t) _aulaEditor.titulo = t.value;
        const o = document.getElementById('ua-ae-ordem');
        if (o) _aulaEditor.ordem = parseInt(o.value, 10) || 1;
        const dt = document.getElementById('ua-ae-data');
        if (dt) _aulaEditor.data_aula = dt.value;
        const ch = document.getElementById('ua-ae-carga');
        if (ch) _aulaEditor.carga_horaria = parseFloat(ch.value) || 0;
        const ds = document.getElementById('ua-ae-desc');
        if (ds) _aulaEditor.descricao = ds.value;
    }

    function desenharModalEditorAula() {
        const backdrop = document.getElementById('ua-modal-aula');
        if (!backdrop || !_aulaEditor) return;

        const somaPerguntas = _aulaEditor.perguntas.reduce((s, q) => s + (parseFloat(q.nota_pontos) || 1), 0);
        const somaMissoes = _aulaEditor.missoes.reduce((s, m) => s + (parseFloat(m.nota_maxima) || 10), 0);

        backdrop.innerHTML = `
            <div class="ua-modal" style="max-width:980px;">
                <div class="ua-modal-hd">
                    <h3>
                        <i class="ph ph-chalkboard-teacher" style="color:#2563eb;"></i>
                        ${_aulaEditor.aulaId ? `Editar Aula ${_aulaEditor.ordem}` : 'Nova Aula do Curso'}
                    </h3>
                    <button class="ua-btn ua-btn-ghost" style="padding:6px 10px;" onclick="document.getElementById('ua-modal-aula').remove()"><i class="ph ph-x"></i></button>
                </div>

                <div style="display:flex;gap:8px;padding:12px 22px 0;border-bottom:1px solid #e2e8f0;background:#f8fafc;">
                    <button type="button" class="ua-tab ${_aulaEditor.aba === 'detalhes' ? 'active' : ''}" style="border-bottom-left-radius:0;border-bottom-right-radius:0;"
                            onclick="window._uaMudarAbaEditorAula('detalhes')">
                        <i class="ph ph-folder-open"></i> 1. Detalhes & Materiais (${_aulaEditor.anexos.length + _aulaEditor.arquivosNovos.length})
                    </button>
                    <button type="button" class="ua-tab ${_aulaEditor.aba === 'pesquisa' ? 'active' : ''}" style="border-bottom-left-radius:0;border-bottom-right-radius:0;"
                            onclick="window._uaMudarAbaEditorAula('pesquisa')">
                        <i class="ph ph-exam"></i> 2. Pesquisa / Formulário em Aula (${_aulaEditor.perguntas.length} • ${somaPerguntas} pts)
                    </button>
                    <button type="button" class="ua-tab ${_aulaEditor.aba === 'missoes' ? 'active' : ''}" style="border-bottom-left-radius:0;border-bottom-right-radius:0;"
                            onclick="window._uaMudarAbaEditorAula('missoes')">
                        <i class="ph ph-rocket-launch"></i> 3. Missões da Semana (${_aulaEditor.missoes.length} • ${somaMissoes} pts)
                    </button>
                </div>

                <div class="ua-modal-bd">
                    ${_aulaEditor.aba === 'detalhes' ? renderAbaEditorDetalhes() : ''}
                    ${_aulaEditor.aba === 'pesquisa' ? renderAbaEditorPesquisa() : ''}
                    ${_aulaEditor.aba === 'missoes' ? renderAbaEditorMissoes() : ''}
                </div>

                <div class="ua-modal-ft">
                    <button type="button" class="ua-btn ua-btn-ghost" onclick="document.getElementById('ua-modal-aula').remove()">Cancelar</button>
                    <button type="button" class="ua-btn ua-btn-primary" id="ua-btn-salvar-aula" onclick="window._uaSalvarAulaCompleta()">
                        <i class="ph ph-floppy-disk"></i> Salvar Aula Completa
                    </button>
                </div>
            </div>
        `;
    }

    window._uaMudarAbaEditorAula = function (aba) {
        sincronizarInputsEditorAula();
        _aulaEditor.aba = aba;
        desenharModalEditorAula();
    };

    function renderAbaEditorDetalhes() {
        return `
            <div style="display:grid;grid-template-columns:90px 1fr 160px 140px;gap:12px;margin-bottom:14px;">
                <div>
                    <label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:4px;">Ordem</label>
                    <input type="number" min="1" id="ua-ae-ordem" class="ua-input" value="${_aulaEditor.ordem}">
                </div>
                <div>
                    <label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:4px;">Título da Aula *</label>
                    <input type="text" id="ua-ae-titulo" class="ua-input" placeholder="Ex.: Comunicação Assertiva e Feedback" value="${esc(_aulaEditor.titulo)}">
                </div>
                <div>
                    <label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:4px;">Data da Aula</label>
                    <input type="date" id="ua-ae-data" class="ua-input" value="${esc(_aulaEditor.data_aula || '')}">
                </div>
                <div>
                    <label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:4px;">Carga (horas)</label>
                    <input type="number" step="0.5" min="0" id="ua-ae-carga" class="ua-input" value="${_aulaEditor.carga_horaria}">
                </div>
            </div>

            <div style="margin-bottom:16px;">
                <label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:4px;">Conteúdo / Resumo da Aula</label>
                <textarea id="ua-ae-desc" rows="3" class="ua-textarea" placeholder="Descreva a pauta e tópicos trabalhados nesta aula...">${esc(_aulaEditor.descricao)}</textarea>
            </div>

            <div style="border:1px dashed #93c5fd;background:#eff6ff;border-radius:14px;padding:16px;">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:10px;">
                    <div>
                        <strong style="font-size:0.9rem;color:#1e3a8a;"><i class="ph ph-cloud-arrow-up"></i> Materiais da Aula (Vídeos, PDFs, Slides, Imagens)</strong>
                        <div style="font-size:0.78rem;color:#475569;">Armazenados com segurança no Cloudflare R2 e liberados aos colaboradores presentes.</div>
                    </div>
                    <label class="ua-btn ua-btn-primary" style="cursor:pointer;">
                        <i class="ph ph-upload-simple"></i> Adicionar Arquivo
                        <input type="file" multiple style="display:none;" onchange="window._uaAdicionarAnexoAula(this)">
                    </label>
                </div>

                <div style="display:flex;flex-direction:column;gap:8px;">
                    ${_aulaEditor.anexos.map(an => `
                        <div style="background:#fff;border:1px solid #dbeafe;border-radius:10px;padding:9px 12px;display:flex;justify-content:space-between;align-items:center;">
                            <a href="${esc(authMediaUrl(an.url))}" target="_blank" style="color:#1d4ed8;font-weight:600;font-size:0.85rem;text-decoration:none;">
                                <i class="ph ph-file"></i> ${esc(an.nome_arquivo)}
                            </a>
                            <button type="button" class="ua-btn ua-btn-danger" style="padding:4px 9px;font-size:0.76rem;" onclick="window._uaRemoverAnexoExistenteAula(${an.id})">
                                <i class="ph ph-trash"></i> Remover
                            </button>
                        </div>
                    `).join('')}
                    ${_aulaEditor.arquivosNovos.map((f, idx) => `
                        <div style="background:#fff;border:1px solid #bbf7d0;border-radius:10px;padding:9px 12px;display:flex;justify-content:space-between;align-items:center;">
                            <span style="font-size:0.85rem;color:#166534;"><i class="ph ph-check-circle"></i> Pronto para enviar ao salvar: <strong>${esc(f.name)}</strong></span>
                            <button type="button" class="ua-btn ua-btn-danger" style="padding:4px 9px;font-size:0.76rem;" onclick="window._uaRemoverAnexoNovoIdx(${idx})">Remover</button>
                        </div>
                    `).join('')}
                    ${_aulaEditor.anexos.length === 0 && _aulaEditor.arquivosNovos.length === 0 ? `<div style="font-size:0.82rem;color:#64748b;">Nenhum material anexado ainda.</div>` : ''}
                </div>
            </div>
        `;
    }

    window._uaAdicionarAnexoAula = async function (input) {
        if (!input.files || input.files.length === 0) return;
        sincronizarInputsEditorAula();
        const files = Array.from(input.files);
        if (_aulaEditor.aulaId) {
            for (const f of files) {
                try {
                    const fd = new FormData();
                    fd.append('arquivo', f);
                    const up = await api(`/uniamerica/aulas/${_aulaEditor.aulaId}/anexos`, { method: 'POST', body: fd });
                    _aulaEditor.anexos.push(up);
                } catch (e) {
                    msgErro('Erro no upload', e.message);
                }
            }
        } else {
            files.forEach(f => _aulaEditor.arquivosNovos.push(f));
        }
        input.value = '';
        desenharModalEditorAula();
    };

    window._uaRemoverAnexoExistenteAula = async function (anexoId) {
        if (!_aulaEditor || !_aulaEditor.aulaId) return;
        try {
            await api(`/uniamerica/aulas/${_aulaEditor.aulaId}/anexos/${anexoId}`, { method: 'DELETE' });
            _aulaEditor.anexos = _aulaEditor.anexos.filter(a => a.id !== anexoId);
            desenharModalEditorAula();
        } catch (e) {
            msgErro('Erro ao remover anexo', e.message);
        }
    };

    window._uaRemoverAnexoNovoIdx = function (idx) {
        _aulaEditor.arquivosNovos.splice(idx, 1);
        desenharModalEditorAula();
    };

    // ── ABA 2 DO EDITOR DE AULA: PESQUISA / FORMULÁRIO EM AULA (MÚLTIPLA ESCOLHA, NOTA 1..10 SOMADA) ──
    function renderAbaEditorPesquisa() {
        const somaTotal = _aulaEditor.perguntas.reduce((s, q) => s + (parseFloat(q.nota_pontos) || 1), 0);
        return `
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:12px 14px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
                <div style="font-size:0.83rem;color:#166534;">
                    <i class="ph ph-check-square-offset"></i>
                    <strong>Respondidas em sala de aula</strong> (não são enviadas por e-mail).
                    Defina o valor de <strong>1 a 10 pontos</strong> para cada pergunta; a nota é a <strong>soma dos pontos</strong> das respostas corretas!
                </div>
                <div style="display:flex;align-items:center;gap:10px;">
                    <span class="ua-badge" style="background:#15803d;color:#fff;font-size:0.82rem;">Soma Máxima: ${somaTotal} pts</span>
                    <button type="button" class="ua-btn ua-btn-primary" onclick="window._uaAddPerguntaAula()">
                        <i class="ph ph-plus"></i> Adicionar Pergunta
                    </button>
                </div>
            </div>

            ${_aulaEditor.perguntas.length === 0 ? `
                <div style="padding:32px;text-align:center;color:#64748b;border:1px dashed #cbd5e1;border-radius:12px;">
                    Nenhuma pergunta adicionada para esta aula. Clique em <strong>Adicionar Pergunta</strong> para criar o teste de múltipla escolha.
                </div>
            ` : `
                <div style="display:flex;flex-direction:column;gap:14px;">
                    ${_aulaEditor.perguntas.map((q, qIdx) => `
                        <div style="border:1px solid #e2e8f0;border-radius:14px;padding:14px 16px;background:#fff;">
                            <div style="display:grid;grid-template-columns:1fr 150px auto;gap:10px;align-items:end;margin-bottom:10px;">
                                <div>
                                    <label style="font-size:0.79rem;font-weight:700;color:#334155;display:block;margin-bottom:4px;">Pergunta ${qIdx + 1}</label>
                                    <input type="text" class="ua-input" placeholder="Digite o enunciado da pergunta..."
                                           value="${esc(q.pergunta)}"
                                           oninput="window._uaAtualizarPerguntaCampo(${qIdx}, 'pergunta', this.value)">
                                </div>
                                <div>
                                    <label style="font-size:0.79rem;font-weight:700;color:#1d4ed8;display:block;margin-bottom:4px;">Nota (1 a 10 pts)</label>
                                    <input type="number" min="1" max="10" step="1" class="ua-input"
                                           value="${q.nota_pontos || 2}"
                                           onchange="window._uaAtualizarPerguntaNota(${qIdx}, this.value)">
                                </div>
                                <button type="button" class="ua-btn ua-btn-danger" onclick="window._uaRemoverPerguntaAula(${qIdx})">
                                    <i class="ph ph-trash"></i>
                                </button>
                            </div>

                            <div style="font-size:0.78rem;font-weight:600;color:#475569;margin-bottom:6px;">
                                Marque no botão circular qual é a <strong>alternativa correta</strong>:
                            </div>
                            <div style="display:flex;flex-direction:column;gap:6px;">
                                ${(q.opcoes || []).map((op, opIdx) => `
                                    <div style="display:flex;align-items:center;gap:8px;">
                                        <input type="radio" name="ua_correta_q_${qIdx}" ${Number(q.correta_idx) === opIdx ? 'checked' : ''}
                                               onchange="window._uaMarcarCorretaPergunta(${qIdx}, ${opIdx})"
                                               title="Marcar como resposta correta">
                                        <input type="text" class="ua-input" style="padding:7px 10px;border-color:${Number(q.correta_idx) === opIdx ? '#16a34a' : '#cbd5e1'};background:${Number(q.correta_idx) === opIdx ? '#f0fdf4' : '#fff'};"
                                               placeholder="Alternativa ${opIdx + 1}"
                                               value="${esc(op)}"
                                               oninput="window._uaEditarOpcaoPergunta(${qIdx}, ${opIdx}, this.value)">
                                        ${q.opcoes.length > 2 ? `
                                            <button type="button" class="ua-btn ua-btn-ghost" style="padding:6px 9px;" onclick="window._uaRemoverOpcaoPergunta(${qIdx}, ${opIdx})">
                                                <i class="ph ph-minus"></i>
                                            </button>
                                        ` : ''}
                                    </div>
                                `).join('')}
                            </div>
                            <div style="margin-top:8px;">
                                <button type="button" class="ua-btn ua-btn-ghost" style="padding:5px 10px;font-size:0.78rem;" onclick="window._uaAddOpcaoPergunta(${qIdx})">
                                    <i class="ph ph-plus"></i> Adicionar alternativa
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `}
        `;
    }

    window._uaAddPerguntaAula = function () {
        _aulaEditor.perguntas.push({
            id: 'q_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            pergunta: '',
            opcoes: ['', '', '', ''],
            correta_idx: 0,
            nota_pontos: 2
        });
        desenharModalEditorAula();
    };
    window._uaRemoverPerguntaAula = function (idx) { _aulaEditor.perguntas.splice(idx, 1); desenharModalEditorAula(); };
    window._uaAtualizarPerguntaCampo = function (idx, k, v) { _aulaEditor.perguntas[idx][k] = v; };
    window._uaAtualizarPerguntaNota = function (idx, v) {
        _aulaEditor.perguntas[idx].nota_pontos = Math.max(1, Math.min(10, parseFloat(v) || 1));
        desenharModalEditorAula();
    };
    window._uaMarcarCorretaPergunta = function (qIdx, opIdx) {
        _aulaEditor.perguntas[qIdx].correta_idx = opIdx;
        desenharModalEditorAula();
    };
    window._uaEditarOpcaoPergunta = function (qIdx, opIdx, val) { _aulaEditor.perguntas[qIdx].opcoes[opIdx] = val; };
    window._uaAddOpcaoPergunta = function (qIdx) { _aulaEditor.perguntas[qIdx].opcoes.push(''); desenharModalEditorAula(); };
    window._uaRemoverOpcaoPergunta = function (qIdx, opIdx) {
        _aulaEditor.perguntas[qIdx].opcoes.splice(opIdx, 1);
        if (_aulaEditor.perguntas[qIdx].correta_idx >= _aulaEditor.perguntas[qIdx].opcoes.length) {
            _aulaEditor.perguntas[qIdx].correta_idx = 0;
        }
        desenharModalEditorAula();
    };

    // ── ABA 3 DO EDITOR DE AULA: MISSÕES DA SEMANA (NOTA 1..10, PDF DE INSTRUÇÃO R2 E CAMPOS DINÂMICOS) ──
    const TIPOS_CAMPO_MISSAO = [
        { val: 'texto', lbl: 'Texto / Pergunta aberta' },
        { val: 'multipla_escolha', lbl: 'Questão de Múltipla Escolha' },
        { val: 'documento', lbl: 'Anexo de Documentos / Arquivos' },
        { val: 'audio', lbl: 'Anexo / Gravação de Áudio' },
        { val: 'imagem', lbl: 'Anexo de Imagens / Fotos' },
        { val: 'estrelas', lbl: 'Pontuação por Estrelas (1 a 5)' }
    ];

    function renderAbaEditorMissoes() {
        const somaMissoes = _aulaEditor.missoes.reduce((s, m) => s + (parseFloat(m.nota_maxima) || 10), 0);
        return `
            <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:12px 14px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
                <div style="font-size:0.83rem;color:#1e3a8a;">
                    <i class="ph ph-rocket-launch"></i>
                    <strong>Validade de 1 semana (7 dias)</strong> a partir da presença na aula.
                    Anexe o <strong>PDF de Instrução</strong> e monte os campos dinâmicos que o colaborador deverá cumprir. Cada missão vale de <strong>1 a 10 pontos</strong>.
                </div>
                <div style="display:flex;align-items:center;gap:10px;">
                    <span class="ua-badge" style="background:#1d4ed8;color:#fff;font-size:0.82rem;">Soma Máxima: ${somaMissoes} pts</span>
                    <button type="button" class="ua-btn ua-btn-primary" onclick="window._uaAddMissaoAula()">
                        <i class="ph ph-plus"></i> Nova Missão na Aula
                    </button>
                </div>
            </div>

            ${_aulaEditor.missoes.length === 0 ? `
                <div style="padding:32px;text-align:center;color:#64748b;border:1px dashed #cbd5e1;border-radius:12px;">
                    Nenhuma missão cadastrada para esta aula. Clique em <strong>Nova Missão na Aula</strong> para adicionar atividades práticas da semana.
                </div>
            ` : `
                <div style="display:flex;flex-direction:column;gap:16px;">
                    ${_aulaEditor.missoes.map((m, mIdx) => `
                        <div style="border:1px solid #cbd5e1;border-radius:16px;padding:16px;background:#fff;">
                            <div style="display:grid;grid-template-columns:1fr 165px auto;gap:10px;align-items:end;margin-bottom:10px;">
                                <div>
                                    <label style="font-size:0.8rem;font-weight:700;color:#0f172a;display:block;margin-bottom:4px;">Título da Missão ${mIdx + 1} *</label>
                                    <input type="text" class="ua-input" placeholder="Ex.: Aplicar reunião relâmpago de 5 minutos com a equipe"
                                           value="${esc(m.titulo)}"
                                           oninput="window._uaEditarMissaoProp(${mIdx}, 'titulo', this.value)">
                                </div>
                                <div>
                                    <label style="font-size:0.8rem;font-weight:700;color:#1d4ed8;display:block;margin-bottom:4px;">Nota Máxima (1 a 10)</label>
                                    <input type="number" min="1" max="10" step="1" class="ua-input"
                                           value="${m.nota_maxima || 10}"
                                           onchange="window._uaEditarMissaoNota(${mIdx}, this.value)">
                                </div>
                                <button type="button" class="ua-btn ua-btn-danger" onclick="window._uaRemoverMissaoAula(${mIdx})">
                                    <i class="ph ph-trash"></i>
                                </button>
                            </div>

                            <div style="margin-bottom:12px;">
                                <label style="font-size:0.79rem;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Instruções resumidas para o colaborador</label>
                                <textarea rows="2" class="ua-textarea" placeholder="Explique como o colaborador deve realizar a missão durante a semana..."
                                          oninput="window._uaEditarMissaoProp(${mIdx}, 'descricao', this.value)">${esc(m.descricao || '')}</textarea>
                            </div>

                            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
                                <div style="font-size:0.83rem;">
                                    <i class="ph ph-file-pdf" style="color:#dc2626;font-size:1.1rem;"></i>
                                    <strong>PDF de Instrução da Missão:</strong>
                                    ${m.pdf_r2_key
                                        ? `<a href="${esc(authMediaUrl(m.pdf_url || ('/api/uniamerica/arquivo?key=' + encodeURIComponent(m.pdf_r2_key))))}" target="_blank" style="color:#2563eb;font-weight:600;margin-left:6px;">${esc(m.pdf_nome || 'Abrir PDF atual')}</a>`
                                        : (m._pendingPdfFile ? `<span style="color:#15803d;margin-left:6px;">Selecionado: ${esc(m._pendingPdfFile.name)} (será salvo no R2)</span>` : `<span style="color:#94a3b8;margin-left:6px;">Nenhum PDF anexado</span>`)}
                                </div>
                                <label class="ua-btn ua-btn-ghost" style="cursor:pointer;padding:6px 12px;font-size:0.8rem;">
                                    <i class="ph ph-upload-simple"></i> Anexar PDF da Missão
                                    <input type="file" accept="application/pdf,.pdf" style="display:none;" onchange="window._uaUploadPdfMissao(${mIdx}, this)">
                                </label>
                            </div>

                            <div style="border-top:1px solid #f1f5f9;padding-top:10px;">
                                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:8px;">
                                    <strong style="font-size:0.83rem;color:#334155;"><i class="ph ph-sliders-horizontal"></i> Campos Dinâmicos da Missão (${(m.campos || []).length})</strong>
                                    <button type="button" class="ua-btn ua-btn-ghost" style="padding:5px 11px;font-size:0.79rem;" onclick="window._uaAddCampoDinamicoMissao(${mIdx})">
                                        <i class="ph ph-plus"></i> Adicionar Campo Dinâmico
                                    </button>
                                </div>

                                <div style="display:flex;flex-direction:column;gap:8px;">
                                    ${(m.campos || []).map((cp, cpIdx) => `
                                        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:10px;">
                                            <div style="display:grid;grid-template-columns:220px 1fr auto auto;gap:8px;align-items:center;">
                                                <select class="ua-select" style="padding:7px 9px;font-size:0.82rem;"
                                                        onchange="window._uaMudarTipoCampoMissao(${mIdx}, ${cpIdx}, this.value)">
                                                    ${TIPOS_CAMPO_MISSAO.map(t => `<option value="${t.val}" ${cp.tipo === t.val ? 'selected' : ''}>${t.lbl}</option>`).join('')}
                                                </select>
                                                <input type="text" class="ua-input" style="padding:7px 10px;font-size:0.83rem;"
                                                       placeholder="Pergunta ou instrução deste campo (ex.: Envie uma foto da ata / Grave um áudio relatando...)"
                                                       value="${esc(cp.label || '')}"
                                                       oninput="window._uaEditarCampoMissao(${mIdx}, ${cpIdx}, 'label', this.value)">
                                                <label style="font-size:0.78rem;display:flex;align-items:center;gap:4px;white-space:nowrap;cursor:pointer;">
                                                    <input type="checkbox" ${cp.obrigatorio ? 'checked' : ''} onchange="window._uaEditarCampoMissao(${mIdx}, ${cpIdx}, 'obrigatorio', this.checked)"> Obrigatório
                                                </label>
                                                <button type="button" class="ua-btn ua-btn-danger" style="padding:5px 8px;" onclick="window._uaRemoverCampoMissao(${mIdx}, ${cpIdx})">
                                                    <i class="ph ph-x"></i>
                                                </button>
                                            </div>
                                            ${cp.tipo === 'multipla_escolha' ? `
                                                <div style="margin-top:8px;padding-left:8px;">
                                                    <label style="font-size:0.76rem;color:#64748b;display:block;margin-bottom:4px;">Alternativas (uma por linha ou separadas por ponto e vírgula ";"):</label>
                                                    <input type="text" class="ua-input" style="padding:6px 10px;font-size:0.81rem;"
                                                           placeholder="Ex.: Sim, apliquei integralmente; Apliquei parcialmente; Ainda não consegui aplicar"
                                                           value="${esc((cp.opcoes || []).join('; '))}"
                                                           oninput="window._uaEditarOpcoesCampoMissao(${mIdx}, ${cpIdx}, this.value)">
                                                </div>
                                            ` : ''}
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `}
        `;
    }

    window._uaAddMissaoAula = function () {
        _aulaEditor.missoes.push({
            id: 'm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            titulo: '',
            descricao: '',
            nota_maxima: 10,
            prazo_dias: 7,
            pdf_r2_key: null,
            pdf_nome: null,
            campos: [
                { id: 'campo_' + Date.now(), tipo: 'texto', label: 'Descreva como você executou a missão nesta semana:', obrigatorio: true, opcoes: [] }
            ]
        });
        desenharModalEditorAula();
    };
    window._uaRemoverMissaoAula = function (mIdx) { _aulaEditor.missoes.splice(mIdx, 1); desenharModalEditorAula(); };
    window._uaEditarMissaoProp = function (mIdx, prop, val) { _aulaEditor.missoes[mIdx][prop] = val; };
    window._uaEditarMissaoNota = function (mIdx, val) {
        _aulaEditor.missoes[mIdx].nota_maxima = Math.max(1, Math.min(10, parseFloat(val) || 10));
        desenharModalEditorAula();
    };
    window._uaAddCampoDinamicoMissao = function (mIdx) {
        _aulaEditor.missoes[mIdx].campos = _aulaEditor.missoes[mIdx].campos || [];
        _aulaEditor.missoes[mIdx].campos.push({
            id: 'campo_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5),
            tipo: 'texto',
            label: '',
            obrigatorio: false,
            opcoes: []
        });
        desenharModalEditorAula();
    };
    window._uaRemoverCampoMissao = function (mIdx, cpIdx) {
        _aulaEditor.missoes[mIdx].campos.splice(cpIdx, 1);
        desenharModalEditorAula();
    };
    window._uaMudarTipoCampoMissao = function (mIdx, cpIdx, tipo) {
        _aulaEditor.missoes[mIdx].campos[cpIdx].tipo = tipo;
        desenharModalEditorAula();
    };
    window._uaEditarCampoMissao = function (mIdx, cpIdx, k, v) {
        _aulaEditor.missoes[mIdx].campos[cpIdx][k] = v;
    };
    window._uaEditarOpcoesCampoMissao = function (mIdx, cpIdx, raw) {
        _aulaEditor.missoes[mIdx].campos[cpIdx].opcoes = String(raw || '').split(/[;\n]/).map(s => s.trim()).filter(Boolean);
    };

    window._uaUploadPdfMissao = async function (mIdx, input) {
        if (!input.files || !input.files[0]) return;
        const file = input.files[0];
        if (_aulaEditor.aulaId) {
            try {
                const fd = new FormData();
                fd.append('pdf', file);
                const up = await api(`/uniamerica/aulas/${_aulaEditor.aulaId}/missao-pdf`, { method: 'POST', body: fd });
                _aulaEditor.missoes[mIdx].pdf_r2_key = up.pdf_r2_key;
                _aulaEditor.missoes[mIdx].pdf_nome = up.pdf_nome;
                _aulaEditor.missoes[mIdx].pdf_url = up.pdf_url;
                toastOk('PDF de instrução anexado no R2!');
            } catch (e) {
                msgErro('Erro ao anexar PDF', e.message);
            }
        } else {
            _aulaEditor.missoes[mIdx]._pendingPdfFile = file;
        }
        input.value = '';
        desenharModalEditorAula();
    };

    window._uaSalvarAulaCompleta = async function () {
        sincronizarInputsEditorAula();
        if (!(_aulaEditor.titulo || '').trim()) {
            _aulaEditor.aba = 'detalhes';
            desenharModalEditorAula();
            return msgErro('Título obrigatório', 'Informe o título da aula na aba Detalhes.');
        }

        const btn = document.getElementById('ua-btn-salvar-aula');
        if (btn) btn.disabled = true;

        try {
            let aulaId = _aulaEditor.aulaId;
            // Se ainda não existia a aula, cria primeiro para ter o ID para uploads R2 pendentes
            if (!aulaId) {
                const criada = await api(`/uniamerica/cursos/${_aulaEditor.cursoId}/aulas`, {
                    method: 'POST',
                    body: {
                        ordem: _aulaEditor.ordem,
                        titulo: _aulaEditor.titulo,
                        descricao: _aulaEditor.descricao,
                        data_aula: _aulaEditor.data_aula,
                        carga_horaria: _aulaEditor.carga_horaria,
                        perguntas: _aulaEditor.perguntas,
                        missoes: []
                    }
                });
                aulaId = criada.id;
            }

            // Enviar PDFs de missão pendentes ao R2
            for (const m of _aulaEditor.missoes) {
                if (m._pendingPdfFile) {
                    const fdPdf = new FormData();
                    fdPdf.append('pdf', m._pendingPdfFile);
                    const upPdf = await api(`/uniamerica/aulas/${aulaId}/missao-pdf`, { method: 'POST', body: fdPdf });
                    m.pdf_r2_key = upPdf.pdf_r2_key;
                    m.pdf_nome = upPdf.pdf_nome;
                    delete m._pendingPdfFile;
                }
            }

            // Enviar materiais novos ao R2
            for (const f of _aulaEditor.arquivosNovos) {
                const fdAn = new FormData();
                fdAn.append('arquivo', f);
                await api(`/uniamerica/aulas/${aulaId}/anexos`, { method: 'POST', body: fdAn });
            }

            // Salvar versão final consolidada da aula (detalhes + perguntas + missões com r2_key)
            await api(`/uniamerica/aulas/${aulaId}`, {
                method: 'PUT',
                body: {
                    ordem: _aulaEditor.ordem,
                    titulo: _aulaEditor.titulo,
                    descricao: _aulaEditor.descricao,
                    data_aula: _aulaEditor.data_aula,
                    carga_horaria: _aulaEditor.carga_horaria,
                    perguntas: _aulaEditor.perguntas,
                    missoes: _aulaEditor.missoes
                }
            });

            const modal = document.getElementById('ua-modal-aula');
            if (modal) modal.remove();
            toastOk('Aula salva com sucesso!');
            await window.renderUniAmericaGestao();
        } catch (e) {
            if (btn) btn.disabled = false;
            msgErro('Erro ao salvar aula', e.message);
        }
    };

    // ── MODAL: LISTA DE PRESENÇA DA AULA (LIBERA TESTE E MISSÕES DA SEMANA) ─────
    let _presencaEstado = null;

    window._uaAbrirPresencaAula = async function (aulaId) {
        try {
            const data = await api(`/uniamerica/aulas/${aulaId}/presenca`);
            _presencaEstado = {
                aula: data.aula,
                lista: data.lista || [],
                busca: ''
            };
            const old = document.getElementById('ua-modal-presenca');
            if (old) old.remove();
            const backdrop = document.createElement('div');
            backdrop.className = 'ua-modal-backdrop';
            backdrop.id = 'ua-modal-presenca';
            document.body.appendChild(backdrop);
            desenharModalPresenca();
        } catch (e) {
            msgErro('Erro ao carregar lista de presença', e.message);
        }
    };

    function desenharModalPresenca() {
        const backdrop = document.getElementById('ua-modal-presenca');
        if (!backdrop || !_presencaEstado) return;
        const presentesQtd = _presencaEstado.lista.filter(x => x.presente).length;
        const termo = norm(_presencaEstado.busca);
        const visiveis = _presencaEstado.lista.filter(x => !termo || norm(x.nome_completo + ' ' + (x.departamento || '')).includes(termo));

        backdrop.innerHTML = `
            <div class="ua-modal" style="max-width:760px;">
                <div class="ua-modal-hd">
                    <h3><i class="ph ph-user-check" style="color:#16a34a;"></i> Lista de Presença — Aula ${_presencaEstado.aula.ordem}: ${esc(_presencaEstado.aula.titulo)}</h3>
                    <button class="ua-btn ua-btn-ghost" style="padding:6px 10px;" onclick="document.getElementById('ua-modal-presenca').remove()"><i class="ph ph-x"></i></button>
                </div>
                <div class="ua-modal-bd">
                    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:10px 14px;margin-bottom:12px;font-size:0.82rem;color:#166534;">
                        <i class="ph ph-check-circle"></i> Somente colaboradores com <strong>presença confirmada</strong> nesta lista podem responder o formulário da aula e cumprir as missões da semana. Presença atual: <strong>${presentesQtd} / ${_presencaEstado.lista.length}</strong>.
                    </div>
                    <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;">
                        <input type="text" class="ua-input" style="flex:1;min-width:200px;" placeholder="Buscar participante..."
                               value="${esc(_presencaEstado.busca)}"
                               oninput="window._uaFiltrarPresencaModal(this.value)">
                        <button type="button" class="ua-btn ua-btn-ghost" onclick="window._uaMarcarTodosPresenca(true)">Marcar Todos Presentes</button>
                        <button type="button" class="ua-btn ua-btn-ghost" onclick="window._uaMarcarTodosPresenca(false)">Desmarcar Todos</button>
                    </div>
                    <div style="max-height:380px;overflow-y:auto;border:1px solid #e2e8f0;border-radius:12px;">
                        <table class="ua-table">
                            <thead>
                                <tr>
                                    <th>Colaborador</th>
                                    <th>Departamento</th>
                                    <th style="text-align:center;">Status na Aula</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${visiveis.length === 0 ? `<tr><td colspan="3" style="text-align:center;color:#94a3b8;padding:20px;">Nenhum colaborador vinculado ao curso.</td></tr>` :
                                    visiveis.map(p => `
                                        <tr>
                                            <td style="font-weight:600;">${esc(p.nome_completo)}<div style="font-size:0.75rem;color:#64748b;font-weight:400;">${esc(p.cargo || '')}</div></td>
                                            <td>${esc(p.departamento || '—')}</td>
                                            <td style="text-align:center;">
                                                <label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;padding:5px 12px;border-radius:999px;background:${p.presente ? '#dcfce7' : '#fee2e2'};color:${p.presente ? '#15803d' : '#b91c1c'};font-weight:700;font-size:0.8rem;">
                                                    <input type="checkbox" ${p.presente ? 'checked' : ''} onchange="window._uaTogglePresencaItem(${p.colaborador_id}, this.checked)">
                                                    ${p.presente ? 'Presente' : 'Ausente'}
                                                </label>
                                            </td>
                                        </tr>
                                    `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div class="ua-modal-ft">
                    <button class="ua-btn ua-btn-ghost" onclick="document.getElementById('ua-modal-presenca').remove()">Cancelar</button>
                    <button class="ua-btn ua-btn-success" onclick="window._uaSalvarListaPresenca()">
                        <i class="ph ph-floppy-disk"></i> Salvar Lista de Presença e Liberar Missões
                    </button>
                </div>
            </div>
        `;
    }

    window._uaFiltrarPresencaModal = function (v) { _presencaEstado.busca = v; desenharModalPresenca(); };
    window._uaTogglePresencaItem = function (colabId, checked) {
        const it = _presencaEstado.lista.find(x => x.colaborador_id === colabId);
        if (it) it.presente = checked;
        desenharModalPresenca();
    };
    window._uaMarcarTodosPresenca = function (val) {
        _presencaEstado.lista.forEach(x => { x.presente = val; });
        desenharModalPresenca();
    };
    window._uaSalvarListaPresenca = async function () {
        try {
            await api(`/uniamerica/aulas/${_presencaEstado.aula.id}/presenca`, {
                method: 'PUT',
                body: {
                    presencas: _presencaEstado.lista.map(x => ({ colaborador_id: x.colaborador_id, presente: x.presente }))
                }
            });
            const m = document.getElementById('ua-modal-presenca');
            if (m) m.remove();
            toastOk('Lista de presença salva! Missões da semana liberadas para os presentes.');
            await window.renderUniAmericaGestao();
        } catch (e) {
            msgErro('Erro ao salvar presença', e.message);
        }
    };

    // ── MODAL: AVALIAÇÃO PELO GESTOR (TESTES EM AULA & MISSÕES COM NOTA DE 1 A 10) ─
    let _avalEstado = null;

    window._uaAbrirAvaliacaoAula = async function (aulaId) {
        try {
            const data = await api(`/uniamerica/aulas/${aulaId}/avaliacoes`);
            _avalEstado = data;
            const old = document.getElementById('ua-modal-avaliacoes');
            if (old) old.remove();
            const backdrop = document.createElement('div');
            backdrop.className = 'ua-modal-backdrop';
            backdrop.id = 'ua-modal-avaliacoes';
            document.body.appendChild(backdrop);
            desenharModalAvaliacoesAula();
        } catch (e) {
            msgErro('Erro ao carregar avaliações da aula', e.message);
        }
    };

    function desenharModalAvaliacoesAula() {
        const backdrop = document.getElementById('ua-modal-avaliacoes');
        if (!backdrop || !_avalEstado) return;
        const aula = _avalEstado.aula;
        const participantes = _avalEstado.participantes || [];
        const defsMissoesMap = {};
        (aula.missoes || []).forEach(m => { defsMissoesMap[m.id] = m; });

        backdrop.innerHTML = `
            <div class="ua-modal" style="max-width:1040px;">
                <div class="ua-modal-hd">
                    <h3><i class="ph ph-star" style="color:#f59e0b;"></i> Avaliar Respostas & Missões — Aula ${aula.ordem}: ${esc(aula.titulo)}</h3>
                    <button class="ua-btn ua-btn-ghost" style="padding:6px 10px;" onclick="document.getElementById('ua-modal-avaliacoes').remove(); window.renderUniAmericaGestao();"><i class="ph ph-x"></i></button>
                </div>
                <div class="ua-modal-bd">
                    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:10px 14px;margin-bottom:14px;font-size:0.83rem;color:#92400e;">
                        <i class="ph ph-info"></i> Avalie cada missão entregue atribuindo uma <strong>nota de 1 a 10</strong>. Os pontos das perguntas certas e das missões avaliadas são somados diretamente ao Ranking do curso.
                    </div>

                    <div style="display:flex;flex-direction:column;gap:14px;">
                        ${participantes.map(p => {
                            const st = p.teste;
                            const ptsTesteAtual = st ? (st.pontos_gestor != null ? st.pontos_gestor : st.pontos_calculados) : 0;
                            return `
                                <div style="border:1px solid #e2e8f0;border-radius:14px;padding:14px 16px;background:#fff;">
                                    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid #f1f5f9;">
                                        <div>
                                            <strong style="font-size:0.96rem;color:#0f172a;">${esc(p.nome_completo)}</strong>
                                            <span style="font-size:0.8rem;color:#64748b;margin-left:8px;">${esc(p.departamento || '')} • ${esc(p.cargo || '')}</span>
                                        </div>
                                        <span class="ua-badge" style="background:${p.presente ? '#dcfce7' : '#fee2e2'};color:${p.presente ? '#15803d' : '#b91c1c'};">
                                            ${p.presente ? 'Presente na aula' : 'Ausente na aula'}
                                        </span>
                                    </div>

                                    <!-- Bloco 1: Teste em Aula -->
                                    <div style="background:#f8fafc;border-radius:10px;padding:10px 12px;margin-bottom:10px;">
                                        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
                                            <div style="font-size:0.84rem;">
                                                <strong><i class="ph ph-exam"></i> Formulário / Teste em Aula:</strong>
                                                ${st
                                                    ? `<span style="color:#15803d;font-weight:700;margin-left:6px;">Respondido • Soma automática: ${st.pontos_calculados} pt(s)</span>`
                                                    : `<span style="color:#94a3b8;margin-left:6px;">Ainda não respondido</span>`}
                                            </div>
                                            <div style="display:flex;align-items:center;gap:6px;">
                                                <label style="font-size:0.78rem;color:#475569;">Pontos validados:</label>
                                                <input type="number" min="0" step="0.5" id="ua-av-teste-pts-${p.colaborador_id}" class="ua-input" style="width:82px;padding:5px 8px;" value="${ptsTesteAtual}">
                                                <input type="text" id="ua-av-teste-fb-${p.colaborador_id}" class="ua-input" style="width:190px;padding:5px 8px;" placeholder="Feedback opcional..." value="${esc(st ? st.feedback_gestor || '' : '')}">
                                                <button class="ua-btn ua-btn-ghost" style="padding:6px 10px;font-size:0.78rem;" onclick="window._uaSalvarAvalTeste(${aula.id}, ${p.colaborador_id})">
                                                    Salvar Teste
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Bloco 2: Missões da Semana -->
                                    ${p.missoes.length === 0 ? `<div style="font-size:0.8rem;color:#94a3b8;">Esta aula não possui missões configuradas.</div>` :
                                        p.missoes.map(em => {
                                            const sub = em.submissao;
                                            const defM = defsMissoesMap[em.missao_id] || { campos: [] };
                                            const respostas = (sub && sub.respostas) ? sub.respostas : {};
                                            const jaAvaliada = sub && sub.status === 'avaliada';

                                            return `
                                                <div style="border:1px solid ${sub && !jaAvaliada ? '#fdba74' : '#e2e8f0'};background:${sub && !jaAvaliada ? '#fff7ed' : '#fff'};border-radius:10px;padding:12px;margin-top:8px;">
                                                    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:8px;">
                                                        <div style="font-size:0.86rem;font-weight:700;color:#1e293b;">
                                                            <i class="ph ph-rocket-launch" style="color:#2563eb;"></i> ${esc(em.titulo)}
                                                            <span style="font-weight:500;color:#64748b;font-size:0.78rem;">(Vale até ${em.nota_maxima} pts)</span>
                                                        </div>
                                                        ${jaAvaliada
                                                            ? `<span class="ua-badge" style="background:#dcfce7;color:#15803d;"><i class="ph ph-check-circle"></i> Avaliada: Nota ${sub.nota_gestor}/10</span>`
                                                            : (sub
                                                                ? `<span class="ua-badge" style="background:#ffedd5;color:#c2410c;"><i class="ph ph-clock"></i> Realizada — aguardando nota (1 a 10)</span>`
                                                                : `<span class="ua-badge" style="background:#f1f5f9;color:#64748b;">Não enviada pelo colaborador</span>`)}
                                                    </div>

                                                    ${sub ? `
                                                        <div style="background:#f8fafc;border-radius:8px;padding:10px;margin-bottom:10px;font-size:0.82rem;display:flex;flex-direction:column;gap:6px;">
                                                            ${(defM.campos || []).map(cp => {
                                                                const val = respostas[cp.id];
                                                                const arqsCampo = (em.arquivos || []).filter(ar => ar.campo_id === cp.id);
                                                                return `
                                                                    <div>
                                                                        <strong style="color:#334155;">${esc(cp.label)}:</strong>
                                                                        ${cp.tipo === 'estrelas'
                                                                            ? `<span style="color:#f59e0b;margin-left:6px;">${'★'.repeat(Number(val) || 0)}${'☆'.repeat(Math.max(0, 5 - (Number(val) || 0)))} (${val || 0}/5)</span>`
                                                                            : (val ? `<div style="margin-top:2px;color:#0f172a;white-space:pre-wrap;">${esc(String(val))}</div>` : '')}
                                                                        ${arqsCampo.map(arq => {
                                                                            const u = authMediaUrl(arq.url);
                                                                            if (String(arq.tipo_mime || '').startsWith('audio/')) {
                                                                                return `<div style="margin-top:4px;"><audio controls src="${esc(u)}" style="height:34px;max-width:320px;"></audio></div>`;
                                                                            }
                                                                            if (String(arq.tipo_mime || '').startsWith('image/')) {
                                                                                return `<div style="margin-top:4px;"><a href="${esc(u)}" target="_blank"><img src="${esc(u)}" style="max-height:90px;border-radius:8px;border:1px solid #cbd5e1;"></a></div>`;
                                                                            }
                                                                            return `<div style="margin-top:4px;"><a href="${esc(u)}" target="_blank" style="color:#2563eb;font-weight:600;"><i class="ph ph-file-arrow-down"></i> ${esc(arq.nome_arquivo)}</a></div>`;
                                                                        }).join('')}
                                                                    </div>
                                                                `;
                                                            }).join('')}
                                                        </div>
                                                    ` : ''}

                                                    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                                                        <label style="font-size:0.8rem;font-weight:700;color:#1e3a8a;">Nota (1 a 10):</label>
                                                        <input type="number" min="1" max="10" step="0.5"
                                                               id="ua-av-m-nota-${p.colaborador_id}-${em.missao_id}"
                                                               class="ua-input" style="width:90px;padding:6px 8px;"
                                                               placeholder="1 a 10"
                                                               value="${sub && sub.nota_gestor != null ? sub.nota_gestor : ''}">
                                                        <input type="text"
                                                               id="ua-av-m-fb-${p.colaborador_id}-${em.missao_id}"
                                                               class="ua-input" style="flex:1;min-width:200px;padding:6px 10px;"
                                                               placeholder="Comentário / feedback da avaliação da missão..."
                                                               value="${esc(sub ? sub.feedback_gestor || '' : '')}">
                                                        <button class="ua-btn ua-btn-primary" style="padding:7px 14px;font-size:0.81rem;"
                                                                onclick="window._uaSalvarAvalMissao(${aula.id}, ${p.colaborador_id}, '${esc(em.missao_id)}')">
                                                            <i class="ph ph-check"></i> Salvar Nota (1–10)
                                                        </button>
                                                    </div>
                                                </div>
                                            `;
                                        }).join('')}
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
                <div class="ua-modal-ft">
                    <button class="ua-btn ua-btn-primary" onclick="document.getElementById('ua-modal-avaliacoes').remove(); window.renderUniAmericaGestao();">
                        Concluir e Fechar
                    </button>
                </div>
            </div>
        `;
    }

    window._uaSalvarAvalTeste = async function (aulaId, colabId) {
        const pts = parseFloat(document.getElementById(`ua-av-teste-pts-${colabId}`).value);
        const fb = document.getElementById(`ua-av-teste-fb-${colabId}`).value || '';
        if (isNaN(pts) || pts < 0) return msgErro('Pontuação inválida', 'Informe um valor maior ou igual a zero.');
        try {
            await api('/uniamerica/submissoes-teste/avaliar', {
                method: 'PUT',
                body: { aula_id: aulaId, colaborador_id: colabId, pontos_gestor: pts, feedback_gestor: fb }
            });
            toastOk('Pontuação do teste salva!');
            await window._uaAbrirAvaliacaoAula(aulaId);
        } catch (e) {
            msgErro('Erro ao salvar pontuação', e.message);
        }
    };

    window._uaSalvarAvalMissao = async function (aulaId, colabId, missaoId) {
        const notaEl = document.getElementById(`ua-av-m-nota-${colabId}-${missaoId}`);
        const fbEl = document.getElementById(`ua-av-m-fb-${colabId}-${missaoId}`);
        const nota = parseFloat(notaEl ? notaEl.value : '');
        if (isNaN(nota) || nota < 1 || nota > 10) {
            return msgErro('Nota de 1 a 10 obrigatória', 'Informe uma nota entre 1 e 10 para avaliar a missão.');
        }
        try {
            await api('/uniamerica/submissoes-missao/avaliar', {
                method: 'PUT',
                body: {
                    aula_id: aulaId,
                    colaborador_id: colabId,
                    missao_id: missaoId,
                    nota_gestor: nota,
                    feedback_gestor: fbEl ? fbEl.value : ''
                }
            });
            toastOk(`Nota ${nota}/10 registrada na missão!`);
            await window._uaAbrirAvaliacaoAula(aulaId);
        } catch (e) {
            msgErro('Erro ao avaliar missão', e.message);
        }
    };

    // ═══════════════════════════════════════════════════════════════════════════
    //  ABA 2: DIAGNÓSTICO POR DEPARTAMENTO (SATISFAÇÃO & DESEMPENHO PARA DEFINIR CURSOS)
    // ═══════════════════════════════════════════════════════════════════════════
    async function carregarERenderizarDiagnostico(box) {
        box.innerHTML = `<div style="padding:36px;text-align:center;color:#64748b;">
            <i class="ph ph-circle-notch" style="font-size:1.8rem;animation:spin 1s linear infinite;"></i>
            <div style="margin-top:8px;">Consolidando análises de Satisfação e Desempenho por departamento...</div>
        </div>`;
        try {
            if (!G.diagnostico) {
                const r = await api('/avaliacoes/diagnostico-departamentos');
                G.diagnostico = (r && r.departamentos) ? r.departamentos : [];
            }
            desenharDiagnosticoDeptos(box);
        } catch (e) {
            box.innerHTML = `<div style="padding:20px;background:#fef2f2;border:1px solid #fecaca;border-radius:12px;color:#991b1b;">Erro ao carregar diagnóstico: ${esc(e.message)}</div>`;
        }
    }

    function desenharDiagnosticoDeptos(box) {
        if (!box) box = document.getElementById('ua-gestao-tab-body');
        if (!box) return;
        const todos = G.diagnostico || [];
        const lista = G.diagFiltroDepto ? todos.filter(d => d.departamento === G.diagFiltroDepto) : todos;

        box.innerHTML = `
            <div class="ua-toolbar">
                <div style="font-weight:700;color:#1e293b;font-size:0.9rem;">
                    <i class="ph ph-funnel" style="color:#2563eb;"></i> Filtrar Departamento:
                </div>
                <select class="ua-select" style="width:auto;min-width:240px;" onchange="window._uaSetDiagDepto(this.value)">
                    <option value="">Todos os departamentos (${todos.length})</option>
                    ${todos.map(d => `<option value="${esc(d.departamento)}" ${G.diagFiltroDepto === d.departamento ? 'selected' : ''}>${esc(d.departamento)}</option>`).join('')}
                </select>
                <div style="display:flex;gap:10px;flex-wrap:wrap;font-size:0.76rem;color:#475569;margin-left:auto;">
                    <span class="ua-badge" style="background:#dcfce7;color:#15803d;">≥ 4,5 Ponto forte</span>
                    <span class="ua-badge" style="background:#fef9c3;color:#a16207;">4,0–4,4 Atenção</span>
                    <span class="ua-badge" style="background:#ffedd5;color:#c2410c;">3,0–3,9 Atenção redobrada</span>
                    <span class="ua-badge" style="background:#fee2e2;color:#b91c1c;">&lt; 3,0 Crítico</span>
                </div>
                <button class="ua-btn ua-btn-ghost" onclick="window._uaRecarregarDiagnostico()">
                    <i class="ph ph-arrows-clockwise"></i> Atualizar
                </button>
            </div>

            <div style="display:flex;flex-direction:column;gap:18px;">
                ${lista.map((d, dIdx) => {
                    const sat = d.satisfacao;
                    const des = d.desempenho;
                    const alertas = d.alertas_treinamento || [];
                    const corSat = sat && sat.media_geral != null ? infoCorNota(sat.media_geral) : infoCorNota(null);
                    const corDes = des && des.media_geral != null ? infoCorNota(des.media_geral) : infoCorNota(null);

                    return `
                        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:20px;box-shadow:0 3px 10px rgba(15,23,42,0.03);">
                            <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;padding-bottom:14px;border-bottom:1px solid #f1f5f9;margin-bottom:14px;">
                                <div>
                                    <h3 style="margin:0;font-size:1.12rem;font-weight:800;color:#0f172a;display:flex;align-items:center;gap:8px;">
                                        <i class="ph ph-buildings" style="color:#2563eb;"></i> ${esc(d.departamento)}
                                    </h3>
                                    <div style="font-size:0.8rem;color:#64748b;margin-top:3px;">
                                        ${d.gestor_nome ? `Gestor vinculado: <strong>${esc(d.gestor_nome)}</strong> • ` : ''}
                                        ${alertas.length > 0 ? `<strong style="color:#c2410c;">${alertas.length} indicador(es) abaixo de 4,5 sugerem treinamento</strong>` : `<span style="color:#15803d;">Indicadores consolidados acima de 4,5</span>`}
                                    </div>
                                </div>
                                <button class="ua-btn ua-btn-primary" onclick="window._uaAbrirModalCurso(null, '${esc(d.departamento)}')">
                                    <i class="ph ph-plus-circle"></i> Criar Curso para ${esc(d.departamento)}
                                </button>
                            </div>

                            ${alertas.length > 0 ? `
                                <div style="margin-bottom:14px;display:flex;flex-wrap:wrap;gap:6px;align-items:center;">
                                    <span style="font-size:0.78rem;font-weight:700;color:#475569;margin-right:4px;">Temas prioritários p/ capacitação:</span>
                                    ${alertas.map(al => {
                                        const c = infoCorNota(al.media);
                                        return `<span class="ua-badge" style="background:${c.bg};color:${c.fg};border:1px solid ${c.border};">
                                            [${esc(al.origem)}] ${esc(al.topico)}: ${Number(al.media).toFixed(1)}
                                        </span>`;
                                    }).join('')}
                                </div>
                            ` : ''}

                            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(340px, 1fr));gap:16px;">
                                <!-- Coluna Satisfação -->
                                <div style="border:1px solid #e2e8f0;border-radius:12px;padding:14px;background:#fcfdff;">
                                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                                        <div>
                                            <strong style="font-size:0.9rem;color:#0f172a;"><i class="ph ph-smiley" style="color:#7c3aed;"></i> Avaliação de Satisfação</strong>
                                            <div style="font-size:0.76rem;color:#64748b;">${sat ? `${esc(sat.periodo_label)} • ${sat.responderam}/${sat.total_colaboradores} resp.` : 'Sem ciclo'}</div>
                                        </div>
                                        <span class="ua-badge" style="background:${corSat.bg};color:${corSat.fg};font-size:0.86rem;">
                                            Média: ${sat && sat.media_geral != null ? Number(sat.media_geral).toFixed(1) : '—'}
                                        </span>
                                    </div>
                                    ${sat && sat.topicos && sat.topicos.length > 0 ? `
                                        <div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:10px;">
                                            ${sat.topicos.map(t => {
                                                const ct = infoCorNota(t.media);
                                                return `<span class="ua-badge" style="background:${ct.bg};color:${ct.fg};font-weight:600;">${esc(t.topico)}: ${Number(t.media).toFixed(1)}</span>`;
                                            }).join('')}
                                        </div>
                                    ` : `<div style="font-size:0.8rem;color:#94a3b8;margin-bottom:10px;">Sem respostas de satisfação neste setor.</div>`}

                                    ${sat && sat.relatorio_texto ? `
                                        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:9px;padding:10px;font-size:0.8rem;color:#334155;max-height:170px;overflow-y:auto;white-space:pre-wrap;">${esc(sat.relatorio_texto)}</div>
                                    ` : (sat && sat.responderam > 0 ? `
                                        <button class="ua-btn ua-btn-ghost" style="width:100%;justify-content:center;font-size:0.8rem;"
                                                onclick="window._uaGerarRelatorioDiag('satisfacao', '${esc(d.departamento)}', ${sat.ano}, ${sat.trimestre}, ${dIdx})">
                                            <i class="ph ph-sparkle"></i> Gerar Análise IA de Satisfação deste Setor
                                        </button>
                                    ` : '')}
                                </div>

                                <!-- Coluna Desempenho -->
                                <div style="border:1px solid #e2e8f0;border-radius:12px;padding:14px;background:#fcfdff;">
                                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                                        <div>
                                            <strong style="font-size:0.9rem;color:#0f172a;"><i class="ph ph-chart-line-up" style="color:#2563eb;"></i> Avaliação de Desempenho</strong>
                                            <div style="font-size:0.76rem;color:#64748b;">${des ? `${esc(des.periodo_label)} • ${des.responderam}/${des.total_colaboradores} aval.` : 'Sem ciclo'}</div>
                                        </div>
                                        <span class="ua-badge" style="background:${corDes.bg};color:${corDes.fg};font-size:0.86rem;">
                                            Média: ${des && des.media_geral != null ? Number(des.media_geral).toFixed(1) : '—'}
                                        </span>
                                    </div>
                                    ${des && des.topicos && des.topicos.length > 0 ? `
                                        <div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:10px;">
                                            ${des.topicos.map(t => {
                                                const ct = infoCorNota(t.media);
                                                return `<span class="ua-badge" style="background:${ct.bg};color:${ct.fg};font-weight:600;">${esc(t.topico)}: ${Number(t.media).toFixed(1)}</span>`;
                                            }).join('')}
                                        </div>
                                    ` : `<div style="font-size:0.8rem;color:#94a3b8;margin-bottom:10px;">Sem avaliações de desempenho neste setor.</div>`}

                                    ${des && des.relatorio_texto ? `
                                        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:9px;padding:10px;font-size:0.8rem;color:#334155;max-height:170px;overflow-y:auto;white-space:pre-wrap;">${esc(des.relatorio_texto)}</div>
                                    ` : (des && des.responderam > 0 ? `
                                        <button class="ua-btn ua-btn-ghost" style="width:100%;justify-content:center;font-size:0.8rem;"
                                                onclick="window._uaGerarRelatorioDiag('desempenho', '${esc(d.departamento)}', ${des.ano}, ${des.trimestre}, ${dIdx})">
                                            <i class="ph ph-sparkle"></i> Gerar Análise IA de Desempenho deste Setor
                                        </button>
                                    ` : '')}
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    window._uaSetDiagDepto = function (v) {
        G.diagFiltroDepto = v;
        desenharDiagnosticoDeptos();
    };
    window._uaRecarregarDiagnostico = async function () {
        G.diagnostico = null;
        await renderAbaAtivaGestao();
    };
    window._uaGerarRelatorioDiag = async function (tipo, depto, ano, trimestre) {
        try {
            toastOk('Gerando análise com IA...');
            await api(`/avaliacoes/${tipo}/relatorio-ia`, {
                method: 'POST',
                body: { departamento: depto, ano, trimestre }
            });
            G.diagnostico = null;
            await renderAbaAtivaGestao();
        } catch (e) {
            msgErro('Não foi possível gerar a análise', e.message);
        }
    };

    // ═══════════════════════════════════════════════════════════════════════════
    //  ABA 3: RANKING POR CURSO (MAIOR NOTA → MENOR NOTA) & CERTIFICADOS (ANEXO 2)
    // ═══════════════════════════════════════════════════════════════════════════
    async function carregarERenderizarRanking(box) {
        box.innerHTML = `<div style="padding:36px;text-align:center;color:#64748b;">
            <i class="ph ph-circle-notch" style="font-size:1.8rem;animation:spin 1s linear infinite;"></i>
            <div style="margin-top:8px;">Calculando ranking dos cursos (soma de perguntas + soma de missões)...</div>
        </div>`;

        try {
            const idsParam = G.filtroCursoIds.size > 0 ? `?curso_ids=${Array.from(G.filtroCursoIds).join(',')}` : '';
            const r = await api('/uniamerica/ranking' + idsParam);
            G.rankingQuadros = (r && r.quadros) ? r.quadros : [];
            desenharAbaRanking(box);
        } catch (e) {
            box.innerHTML = `<div style="padding:20px;background:#fef2f2;border:1px solid #fecaca;border-radius:12px;color:#991b1b;">Erro ao carregar ranking: ${esc(e.message)}</div>`;
        }
    }

    function desenharAbaRanking(box) {
        if (!box) box = document.getElementById('ua-gestao-tab-body');
        if (!box) return;

        const termo = norm(G.filtroCursoBusca);
        const quadrosVisiveis = G.rankingQuadros.filter(q => {
            if (G.filtroCursoIds.size > 0) return G.filtroCursoIds.has(Number(q.curso.id));
            if (termo) return norm(q.curso.nome).includes(termo);
            return true;
        });

        box.innerHTML = `
            <div class="ua-toolbar">
                ${renderFiltroCursosMultiSelectHtml('_uaAtualizarFiltroRanking')}
                <div style="font-size:0.82rem;color:#64748b;margin-left:auto;">
                    <i class="ph ph-medal" style="color:#f59e0b;"></i> Ranking ordenado da <strong>maior nota para a menor nota</strong> (soma de pontos). Certificado liberado apenas com <strong>100% de presença</strong>.
                </div>
            </div>

            <div id="ua-ranking-quadros-wrap" style="display:flex;flex-direction:column;gap:22px;">
                ${renderQuadrosRankingInterno(quadrosVisiveis)}
            </div>
        `;
    }

    function renderQuadrosRankingInterno(quadros) {
        if (quadros.length === 0) {
            return `<div style="background:#fff;border:1px dashed #cbd5e1;border-radius:16px;padding:40px;text-align:center;color:#64748b;">Nenhum curso selecionado ou cadastrado para exibir o ranking.</div>`;
        }

        return quadros.map(q => {
            const c = q.curso;
            return `
                <div style="background:#fff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;box-shadow:0 4px 14px rgba(15,23,42,0.04);">
                    <div style="padding:18px 22px;background:linear-gradient(90deg, #eff6ff 0%, #f8fafc 100%);border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
                        <div>
                            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                                <h3 style="margin:0;font-size:1.15rem;font-weight:800;color:#1e3a8a;"><i class="ph ph-trophy" style="color:#f59e0b;"></i> ${esc(c.nome)}</h3>
                                <span class="ua-badge" style="background:${q.todas_aulas_concluidas ? '#dcfce7' : '#fef9c3'};color:${q.todas_aulas_concluidas ? '#15803d' : '#a16207'};">
                                    ${q.todas_aulas_concluidas ? 'Ranking Final Consolidado (todas as aulas concluídas)' : `Ranking em Andamento (${q.total_aulas} aula(s))`}
                                </span>
                            </div>
                            <div style="font-size:0.81rem;color:#475569;margin-top:4px;">
                                Pontuação máxima distribuída: <strong>${q.max_pontos_total} pts</strong>
                                (${q.max_pontos_testes} pts em testes em sala + ${q.max_pontos_missoes} pts em missões)
                                ${c.avaliacao_geral_obs ? ` • <em>Avaliação Geral: ${esc(c.avaliacao_geral_obs)}</em>` : ''}
                            </div>
                        </div>
                        <div style="display:flex;gap:8px;flex-wrap:wrap;">
                            <button class="ua-btn ua-btn-ghost" onclick="window._uaIrPremiosDoCurso(${c.id})">
                                <i class="ph ph-gift"></i> Configurar Prêmios (${(q.premios || []).length})
                            </button>
                            <button class="ua-btn ua-btn-ghost" onclick="window._uaAbrirModalCurso(${c.id})">
                                <i class="ph ph-note-pencil"></i> Avaliação Geral / Editar
                            </button>
                        </div>
                    </div>

                    <div style="overflow-x:auto;">
                        <table class="ua-table">
                            <thead>
                                <tr>
                                    <th style="width:90px;">Posição</th>
                                    <th>Colaborador</th>
                                    <th>Departamento</th>
                                    <th style="text-align:center;">Presença nas Aulas</th>
                                    <th style="text-align:center;">Soma Testes</th>
                                    <th style="text-align:center;">Soma Missões</th>
                                    <th style="text-align:center;">Nota Total</th>
                                    <th>Prêmio da Colocação</th>
                                    <th style="text-align:right;">Certificado</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${q.ranking.length === 0 ? `<tr><td colspan="9" style="text-align:center;padding:24px;color:#94a3b8;">Nenhum colaborador vinculado a este curso.</td></tr>` :
                                    q.ranking.map(r => {
                                        const medalha = r.posicao === 1 ? '🥇 1º' : r.posicao === 2 ? '🥈 2º' : r.posicao === 3 ? '🥉 3º' : `${r.posicao}º`;
                                        const presOk = r.elegivel_certificado;
                                        return `
                                            <tr style="${r.posicao <= 3 && r.nota_total > 0 ? 'background:#fefce8;' : ''}">
                                                <td style="font-weight:800;font-size:0.95rem;color:${r.posicao === 1 ? '#b45309' : '#1e293b'};">${medalha}</td>
                                                <td>
                                                    <div style="font-weight:700;color:#0f172a;">${esc(r.nome_completo)}</div>
                                                    <div style="font-size:0.75rem;color:#64748b;">${esc(r.cargo || '')}</div>
                                                </td>
                                                <td>${esc(r.departamento || '—')}</td>
                                                <td style="text-align:center;">
                                                    <span class="ua-badge" style="background:${presOk ? '#dcfce7' : '#fee2e2'};color:${presOk ? '#15803d' : '#b91c1c'};">
                                                        ${r.aulas_presentes} / ${r.total_aulas} aula(s)
                                                    </span>
                                                </td>
                                                <td style="text-align:center;font-weight:600;color:#334155;">${r.soma_testes} pts</td>
                                                <td style="text-align:center;font-weight:600;color:#334155;">${r.soma_missoes} pts</td>
                                                <td style="text-align:center;">
                                                    <span class="ua-badge" style="background:#1e3a8a;color:#fff;font-size:0.88rem;padding:5px 12px;">
                                                        ${r.nota_total} pts
                                                    </span>
                                                </td>
                                                <td>
                                                    ${r.premio
                                                        ? `<span class="ua-badge" style="background:#fef3c7;color:#92400e;"><i class="ph ph-trophy"></i> ${esc(r.premio.titulo)}${r.premio.recompensa ? ' — ' + esc(r.premio.recompensa) : ''}</span>`
                                                        : `<span style="color:#cbd5e1;font-size:0.78rem;">—</span>`}
                                                </td>
                                                <td style="text-align:right;">
                                                    ${presOk
                                                        ? `<button class="ua-btn ${r.certificado ? 'ua-btn-success' : 'ua-btn-primary'}" style="padding:6px 12px;font-size:0.8rem;"
                                                                   onclick="window._uaEmitirCertificado(${c.id}, ${r.colaborador_id})">
                                                               <i class="ph ph-certificate"></i> ${r.certificado ? 'Ver / Regerar Certificado' : 'Gerar Certificado'}
                                                           </button>`
                                                        : `<span style="font-size:0.76rem;color:#94a3b8;" title="Apenas colaboradores com presença em todas as aulas recebem o certificado.">
                                                               <i class="ph ph-lock-simple"></i> Exige 100% de presença
                                                           </span>`}
                                                </td>
                                            </tr>
                                        `;
                                    }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }).join('');
    }

    window._uaAtualizarFiltroRanking = async function (manterFocoInput) {
        if (manterFocoInput) {
            const listEl = document.getElementById('ua-curso-ms-list');
            const termo = norm(G.filtroCursoBusca);
            const visiveis = G.cursos.filter(c => !termo || norm(c.nome).includes(termo));
            if (listEl) {
                listEl.innerHTML = visiveis.length === 0
                    ? `<div style="padding:10px;color:#94a3b8;font-size:0.82rem;text-align:center;">Nenhum curso compatível</div>`
                    : visiveis.map(c => `
                        <label style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:8px;cursor:pointer;font-size:0.84rem;background:${G.filtroCursoIds.has(c.id) ? '#eff6ff' : 'transparent'};">
                            <input type="checkbox" ${G.filtroCursoIds.has(c.id) ? 'checked' : ''}
                                   onchange="window._uaToggleItemCursoMs(${c.id}, this.checked, '_uaAtualizarFiltroRanking')">
                            <span style="flex:1;">${esc(c.nome)}</span>
                        </label>
                    `).join('');
            }
            const wrap = document.getElementById('ua-ranking-quadros-wrap');
            if (wrap) {
                const qVis = G.rankingQuadros.filter(q => !termo || norm(q.curso.nome).includes(termo));
                wrap.innerHTML = renderQuadrosRankingInterno(qVis);
            }
            return;
        }
        await renderAbaAtivaGestao();
    };

    window._uaIrPremiosDoCurso = function (cursoId) {
        G.premioCursoId = Number(cursoId);
        G.aba = 'premios';
        desenharGestao();
    };

    // ── GERADOR DE CERTIFICADO EM IMAGEM (MODELO FIEL AO ANEXO 2 + UPLOAD R2) ────
    function carregarImagemAsync(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = (err) => reject(err);
            img.src = src;
        });
    }

    function quebrarLinhasCanvas(ctx, texto, maxWidth) {
        const palavras = String(texto || '').split(/\s+/).filter(Boolean);
        const linhas = [];
        let atual = '';
        for (const p of palavras) {
            const teste = atual ? (atual + ' ' + p) : p;
            if (ctx.measureText(teste).width > maxWidth && atual) {
                linhas.push(atual);
                atual = p;
            } else {
                atual = teste;
            }
        }
        if (atual) linhas.push(atual);
        return linhas;
    }

    async function renderizarCanvasCertificadoAnexo2(dados) {
        // Aguardar fontes cursivas carregarem se disponíveis
        if (document.fonts && document.fonts.ready) {
            try { await document.fonts.ready; } catch (e) { /* ignore */ }
        }

        const W = 2048;
        const H = 1364;
        const canvas = document.createElement('canvas');
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext('2d');

        let usouModeloAnexo2 = false;
        try {
            const baseImg = await carregarImagemAsync('/assets/certificado-uniamerica-modelo.jpg?v=1');
            ctx.drawImage(baseImg, 0, 0, W, H);

            // Limpar de forma invisível apenas a faixa central onde constava o texto exemplo ("Alice Pereira" + parágrafo),
            // preservando 100% do selo dourado superior, título CERTIFICADO, moldura dupla dourada, logo AMÉRICA Rental desde 1999 e fitas azuis!
            // Na imagem original (1024x682 -> escalada 2x para 2048x1364):
            //  - Faixa limpa à esquerda (com o exato padrão de ondas creme): x = 112..392, y = 618..1016
            //  - Faixa central do texto dinâmico: x = 350..1698, y = 618..1016
            const stripY = 618;
            const stripH = 398;
            const sampleX = 116;
            const sampleW = 240;
            // Encontrar período horizontal exato da onda para encaixe contínuo sem emenda
            const imgData = ctx.getImageData(sampleX, stripY, sampleW, 80).data;
            let bestPeriod = 96;
            let bestDiff = Infinity;
            for (let p = 40; p <= 140; p++) {
                let diff = 0;
                for (let row = 0; row < 80; row += 4) {
                    for (let dx = 0; dx < 60; dx += 2) {
                        const idx1 = (row * sampleW + dx) * 4;
                        const idx2 = (row * sampleW + (dx + p)) * 4;
                        diff += Math.abs(imgData[idx1] - imgData[idx2]) + Math.abs(imgData[idx1 + 1] - imgData[idx2 + 1]);
                    }
                }
                if (diff < bestDiff) { bestDiff = diff; bestPeriod = p; }
            }
            for (let x = 340; x < 1710; x += bestPeriod) {
                const wDraw = Math.min(bestPeriod, 1710 - x);
                ctx.drawImage(canvas, sampleX, stripY, wDraw, stripH, x, stripY, wDraw, stripH);
            }
            usouModeloAnexo2 = true;
        } catch (e) {
            // Fallback vetorial completo caso a imagem base não carregue
            ctx.fillStyle = '#fdfcf8';
            ctx.fillRect(0, 0, W, H);
            ctx.strokeStyle = '#c89b3c';
            ctx.lineWidth = 6;
            ctx.strokeRect(56, 56, W - 112, H - 112);
            ctx.lineWidth = 2.5;
            ctx.strokeRect(72, 72, W - 144, H - 144);
            ctx.fillStyle = '#0a0a0a';
            ctx.font = '800 116px Inter, Montserrat, Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('CERTIFICADO', W / 2, 595);
            try {
                const logo = await carregarImagemAsync('/assets/logo-excel-fechamento.jpg');
                ctx.drawImage(logo, W / 2 - 310, 1040, 620, 170);
            } catch (e2) { /* ignore */ }
        }

        // 1. Nome do Colaborador em fonte manuscrita azul-marinho (exatamente como no Anexo 2)
        const nomeLimpo = limparNomeParaCertificado(dados.nome_colaborador);
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#083a6b';
        let tamFonteNome = 132;
        ctx.font = `${tamFonteNome}px "Great Vibes", "Dancing Script", "Brush Script MT", "Segoe Script", cursive`;
        while (ctx.measureText(nomeLimpo).width > 1280 && tamFonteNome > 72) {
            tamFonteNome -= 6;
            ctx.font = `${tamFonteNome}px "Great Vibes", "Dancing Script", "Brush Script MT", "Segoe Script", cursive`;
        }
        ctx.fillText(nomeLimpo, W / 2, usouModeloAnexo2 ? 706 : 715);
        ctx.restore();

        // 2. Parágrafo formal de conclusão com curso, carga horária e período
        const cargaTxt = dados.carga_horaria && Number(dados.carga_horaria) > 0
            ? `${dados.carga_horaria} horas`
            : 'carga horária integral';
        const periodoTxt = dados.periodo_texto || 'período letivo regular';
        const paragrafo = `concluiu com êxito o curso de ${dados.nome_curso}, realizado na UniAmérica — América Rental, com carga horária total de ${cargaTxt}, ${periodoTxt}, demonstrando dedicação, participação em todas as aulas e aproveitamento satisfatório.`;

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#1e293b';
        ctx.font = '400 36px Inter, "Segoe UI", Arial, sans-serif';
        const linhas = quebrarLinhasCanvas(ctx, paragrafo, 1220);
        const startY = usouModeloAnexo2 ? 806 : 815;
        const lineHeight = 50;
        linhas.slice(0, 4).forEach((ln, idx) => {
            ctx.fillText(ln, W / 2, startY + idx * lineHeight);
        });
        ctx.restore();

        return canvas.toDataURL('image/png');
    }

    window._uaEmitirCertificado = async function (cursoId, colaboradorId) {
        const quadro = G.rankingQuadros.find(q => Number(q.curso.id) === Number(cursoId));
        if (!quadro) return;
        const part = quadro.ranking.find(p => Number(p.colaborador_id) === Number(colaboradorId));
        if (!part) return;
        if (!part.elegivel_certificado) {
            return msgErro('Certificado bloqueado', 'Apenas colaboradores que participaram de todas as aulas recebem o certificado.');
        }

        const c = quadro.curso;
        let periodoTexto = 'com presença integral nas aulas';
        if (c.data_inicio && c.data_fim) {
            periodoTexto = `no período de ${fmtDataBr(c.data_inicio)} a ${fmtDataBr(c.data_fim)}`;
        } else if (c.data_inicio) {
            periodoTexto = `iniciado em ${fmtDataBr(c.data_inicio)}`;
        }

        try {
            const dataUrl = await renderizarCanvasCertificadoAnexo2({
                nome_colaborador: part.nome_completo,
                nome_curso: c.nome,
                carga_horaria: c.carga_horaria,
                periodo_texto: periodoTexto
            });

            const salvo = await api(`/uniamerica/cursos/${cursoId}/certificados`, {
                method: 'POST',
                body: {
                    colaborador_id: colaboradorId,
                    periodo_texto: periodoTexto,
                    imagem_base64: dataUrl
                }
            });

            abrirModalPreviewCertificado(part.nome_completo, c.nome, dataUrl, salvo.codigo_validacao);
            // Atualiza em background para refletir certificado emitido
            const idsParam = G.filtroCursoIds.size > 0 ? `?curso_ids=${Array.from(G.filtroCursoIds).join(',')}` : '';
            const r = await api('/uniamerica/ranking' + idsParam);
            G.rankingQuadros = (r && r.quadros) ? r.quadros : [];
            desenharAbaRanking();
        } catch (e) {
            msgErro('Erro ao emitir certificado', e.message);
        }
    };

    function abrirModalPreviewCertificado(nomeColab, nomeCurso, imgSrc, codigoValidacao) {
        const old = document.getElementById('ua-modal-certificado');
        if (old) old.remove();
        const backdrop = document.createElement('div');
        backdrop.className = 'ua-modal-backdrop';
        backdrop.id = 'ua-modal-certificado';
        const nomeArq = `Certificado_${limparNomeParaCertificado(nomeColab).replace(/\s+/g, '_')}.png`;
        backdrop.innerHTML = `
            <div class="ua-modal" style="max-width:980px;">
                <div class="ua-modal-hd">
                    <h3><i class="ph ph-certificate" style="color:#ca8a04;"></i> Certificado Emitido — ${esc(nomeColab)}</h3>
                    <button class="ua-btn ua-btn-ghost" style="padding:6px 10px;" onclick="document.getElementById('ua-modal-certificado').remove()"><i class="ph ph-x"></i></button>
                </div>
                <div class="ua-modal-bd" style="text-align:center;background:#0f172a;padding:20px;">
                    <img id="ua-cert-preview-img" src="${imgSrc}" alt="Certificado" style="max-width:100%;max-height:68vh;border-radius:10px;box-shadow:0 16px 40px rgba(0,0,0,0.45);">
                    ${codigoValidacao ? `<div style="color:#cbd5e1;font-size:0.78rem;margin-top:10px;">Código de validação salvo no R2: <strong>${esc(codigoValidacao)}</strong></div>` : ''}
                </div>
                <div class="ua-modal-ft">
                    <button class="ua-btn ua-btn-ghost" onclick="document.getElementById('ua-modal-certificado').remove()">Fechar</button>
                    <button class="ua-btn ua-btn-ghost" onclick="window._uaImprimirCertificadoPreview()">
                        <i class="ph ph-printer"></i> Imprimir Certificado
                    </button>
                    <a class="ua-btn ua-btn-primary" href="${imgSrc}" download="${esc(nomeArq)}" style="text-decoration:none;">
                        <i class="ph ph-download-simple"></i> Baixar Imagem do Certificado (PNG)
                    </a>
                </div>
            </div>
        `;
        document.body.appendChild(backdrop);
    }

    window._uaImprimirCertificadoPreview = function () {
        const img = document.getElementById('ua-cert-preview-img');
        if (!img) return;
        const w = window.open('', '_blank');
        if (!w) return;
        w.document.write(`<!DOCTYPE html><html><head><title>Certificado UniAmérica</title>
            <style>@page { size: landscape; margin: 0; } body { margin: 0; display:flex; align-items:center; justify-content:center; height:100vh; background:#fff; } img { width:100%; height:100%; object-fit:contain; }</style>
            </head><body><img src="${img.src}" onload="window.print();"></body></html>`);
        w.document.close();
    };

    // ═══════════════════════════════════════════════════════════════════════════
    //  ABA 4: PRÊMIOS DO RANKING (POR COLOCAÇÃO 1º, 2º, 3º... COM IMAGEM R2)
    // ═══════════════════════════════════════════════════════════════════════════
    async function carregarERenderizarPremios(box) {
        if (G.cursos.length === 0) {
            box.innerHTML = `<div style="background:#fff;border:1px dashed #cbd5e1;border-radius:16px;padding:40px;text-align:center;color:#64748b;">Cadastre primeiro um curso na aba <strong>Cursos & Aulas</strong> para definir os prêmios do ranking.</div>`;
            return;
        }
        if (!G.premioCursoId || !G.cursos.some(c => Number(c.id) === Number(G.premioCursoId))) {
            G.premioCursoId = G.cursos[0].id;
        }
        try {
            const r = await api(`/uniamerica/cursos/${G.premioCursoId}/premios`);
            G.premiosLista = (r && r.premios) ? r.premios : [];
            desenharAbaPremios(box);
        } catch (e) {
            box.innerHTML = `<div style="color:#b91c1c;padding:20px;">Erro ao carregar prêmios: ${esc(e.message)}</div>`;
        }
    }

    function desenharAbaPremios(box) {
        if (!box) box = document.getElementById('ua-gestao-tab-body');
        if (!box) return;

        box.innerHTML = `
            <div class="ua-toolbar">
                <strong style="font-size:0.9rem;color:#0f172a;"><i class="ph ph-medal" style="color:#f59e0b;"></i> Curso para Premiação do Ranking:</strong>
                <select class="ua-select" style="width:auto;min-width:290px;" onchange="window._uaSelecionarCursoPremios(this.value)">
                    ${G.cursos.map(c => `<option value="${c.id}" ${Number(c.id) === Number(G.premioCursoId) ? 'selected' : ''}>${esc(c.nome)}</option>`).join('')}
                </select>
                <span style="font-size:0.81rem;color:#64748b;margin-left:auto;">
                    A premiação final é atribuída conforme a colocação no Ranking após a última aula e avaliação geral.
                </span>
            </div>

            <div style="display:grid;grid-template-columns:360px 1fr;gap:20px;align-items:start;">
                <div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:18px;">
                    <h3 style="margin:0 0 12px;font-size:1rem;color:#0f172a;"><i class="ph ph-plus-circle" style="color:#2563eb;"></i> Cadastrar / Atualizar Prêmio</h3>
                    <div style="margin-bottom:10px;">
                        <label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:4px;">Colocação no Ranking *</label>
                        <select id="ua-pr-colocacao" class="ua-select">
                            <option value="1">🥇 1º Lugar</option>
                            <option value="2">🥈 2º Lugar</option>
                            <option value="3">🥉 3º Lugar</option>
                            <option value="4">4º Lugar</option>
                            <option value="5">5º Lugar</option>
                        </select>
                    </div>
                    <div style="margin-bottom:10px;">
                        <label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:4px;">Título do Prêmio *</label>
                        <input type="text" id="ua-pr-titulo" class="ua-input" placeholder="Ex.: Vale-experiência + Troféu Destaque">
                    </div>
                    <div style="margin-bottom:10px;">
                        <label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:4px;">Valor / Recompensa</label>
                        <input type="text" id="ua-pr-recompensa" class="ua-input" placeholder="Ex.: R$ 500,00 / Folga premiada / Kit">
                    </div>
                    <div style="margin-bottom:10px;">
                        <label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:4px;">Descrição</label>
                        <textarea id="ua-pr-desc" rows="2" class="ua-textarea" placeholder="Detalhes da entrega na apresentação final..."></textarea>
                    </div>
                    <div style="margin-bottom:14px;">
                        <label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:4px;">Foto / Imagem do Prêmio (R2)</label>
                        <input type="file" id="ua-pr-img" accept="image/*" class="ua-input">
                    </div>
                    <button class="ua-btn ua-btn-primary" style="width:100%;justify-content:center;" onclick="window._uaSalvarPremio()">
                        <i class="ph ph-floppy-disk"></i> Salvar Prêmio da Colocação
                    </button>
                </div>

                <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(250px, 1fr));gap:14px;">
                    ${G.premiosLista.length === 0 ? `
                        <div style="grid-column:1/-1;background:#fff;border:1px dashed #cbd5e1;border-radius:16px;padding:36px;text-align:center;color:#64748b;">
                            Nenhum prêmio cadastrado ainda para este curso.
                        </div>
                    ` : G.premiosLista.map(pr => {
                        const med = pr.colocacao === 1 ? '🥇 1º Lugar' : pr.colocacao === 2 ? '🥈 2º Lugar' : pr.colocacao === 3 ? '🥉 3º Lugar' : `${pr.colocacao}º Lugar`;
                        return `
                            <div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;display:flex;flex-direction:column;">
                                <div style="height:130px;background:linear-gradient(135deg,#fef3c7,#fde68a);display:flex;align-items:center;justify-content:center;position:relative;">
                                    ${pr.imagem_url
                                        ? `<img src="${esc(authMediaUrl(pr.imagem_url))}" style="width:100%;height:100%;object-fit:cover;">`
                                        : `<i class="ph ph-trophy" style="font-size:3rem;color:#d97706;"></i>`}
                                    <span class="ua-badge" style="position:absolute;top:10px;left:10px;background:#1e3a8a;color:#fff;">${med}</span>
                                </div>
                                <div style="padding:14px;flex:1;display:flex;flex-direction:column;gap:6px;">
                                    <strong style="font-size:0.98rem;color:#0f172a;">${esc(pr.titulo)}</strong>
                                    ${pr.recompensa ? `<span style="font-size:0.84rem;font-weight:700;color:#15803d;">${esc(pr.recompensa)}</span>` : ''}
                                    ${pr.descricao ? `<p style="margin:0;font-size:0.8rem;color:#64748b;">${esc(pr.descricao)}</p>` : ''}
                                    <div style="margin-top:auto;padding-top:10px;display:flex;justify-content:flex-end;">
                                        <button class="ua-btn ua-btn-danger" style="padding:5px 10px;font-size:0.78rem;" onclick="window._uaExcluirPremio(${pr.id})">
                                            <i class="ph ph-trash"></i> Remover
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    window._uaSelecionarCursoPremios = async function (cursoId) {
        G.premioCursoId = Number(cursoId);
        await renderAbaAtivaGestao();
    };

    window._uaSalvarPremio = async function () {
        const titulo = (document.getElementById('ua-pr-titulo').value || '').trim();
        if (!titulo) return msgErro('Título obrigatório', 'Informe o título do prêmio.');
        const fd = new FormData();
        fd.append('colocacao', document.getElementById('ua-pr-colocacao').value);
        fd.append('titulo', titulo);
        fd.append('recompensa', document.getElementById('ua-pr-recompensa').value || '');
        fd.append('descricao', document.getElementById('ua-pr-desc').value || '');
        const imgInp = document.getElementById('ua-pr-img');
        if (imgInp && imgInp.files && imgInp.files[0]) fd.append('imagem', imgInp.files[0]);

        try {
            await api(`/uniamerica/cursos/${G.premioCursoId}/premios`, { method: 'POST', body: fd });
            toastOk('Prêmio salvo para a colocação!');
            await renderAbaAtivaGestao();
        } catch (e) {
            msgErro('Erro ao salvar prêmio', e.message);
        }
    };

    window._uaExcluirPremio = async function (premioId) {
        if (!await confirmar('Remover prêmio?', 'Deseja remover este prêmio do ranking?', 'Remover')) return;
        try {
            await api(`/uniamerica/premios/${premioId}`, { method: 'DELETE' });
            toastOk('Prêmio removido.');
            await renderAbaAtivaGestao();
        } catch (e) {
            msgErro('Erro ao remover prêmio', e.message);
        }
    };

    // ═══════════════════════════════════════════════════════════════════════════
    //  TELA 2: MISSÕES DO COLABORADOR (TREINAMENTOS › UNIAMÉRICA › MISSÕES)
    // ═══════════════════════════════════════════════════════════════════════════
    window.renderUniAmericaMissoes = async function () {
        injectStyles();
        const root = document.getElementById('uniamerica-missoes-container');
        if (!root) return;

        root.innerHTML = `<div class="ua-wrap"><div style="padding:48px;text-align:center;color:#64748b;">
            <i class="ph ph-circle-notch" style="font-size:2rem;animation:spin 1s linear infinite;"></i>
            <div style="margin-top:8px;">Carregando seus cursos e missões na UniAmérica...</div>
        </div></div>`;

        try {
            const qs = M.colabOverrideId ? `?colab_id=${encodeURIComponent(M.colabOverrideId)}` : '';
            M.dados = await api('/uniamerica/minhas-missoes' + qs);
            desenharTelaMissoes();
        } catch (e) {
            root.innerHTML = `<div class="ua-wrap">
                <div style="background:#fef2f2;border:1px solid #fecaca;color:#991b1b;padding:24px;border-radius:14px;">
                    <h3 style="margin:0 0 6px;"><i class="ph ph-warning-circle"></i> Não foi possível carregar suas Missões</h3>
                    <p style="margin:0;font-size:0.9rem;">${esc(e.message)}</p>
                </div>
            </div>`;
        }
    };

    function desenharTelaMissoes() {
        const root = document.getElementById('uniamerica-missoes-container');
        if (!root || !M.dados) return;

        const d = M.dados;
        const colab = d.colaborador;
        const termo = norm(M.buscaCurso);
        const cursos = (d.cursos || []).filter(c => !termo || norm(c.nome).includes(termo));

        root.innerHTML = `
            <div class="ua-wrap">
                ${d.is_gestor ? `
                    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:10px 16px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
                        <div style="font-size:0.84rem;color:#1e3a8a;">
                            <i class="ph ph-eye"></i> <strong>Modo Gestor UniAmérica:</strong> Você pode visualizar e testar a tela de Missões como qualquer colaborador:
                        </div>
                        <select class="ua-select" style="width:auto;min-width:280px;" onchange="window._uaMudarColabSimulado(this.value)">
                            <option value="">Meu próprio vínculo de colaborador</option>
                            ${(d.colaboradores_seletor || []).map(c => `
                                <option value="${c.id}" ${String(M.colabOverrideId) === String(c.id) ? 'selected' : ''}>
                                    ${esc(c.nome_completo)} (${esc(c.departamento || 'Sem setor')})
                                </option>
                            `).join('')}
                        </select>
                    </div>
                ` : ''}

                <div class="ua-hero">
                    <div>
                        <h1><i class="ph ph-rocket-launch"></i> UniAmérica — Minhas Aulas & Missões</h1>
                        <p>
                            ${colab
                                ? `Olá, <strong>${esc(colab.nome_completo)}</strong> (${esc(colab.departamento || '')})! Participe das aulas para liberar os testes e cumprir as missões semanais.`
                                : 'Acompanhe seus cursos, formulários em sala, missões da semana, ranking e certificados.'}
                        </p>
                    </div>
                    ${(d.cursos || []).length > 1 ? `
                        <div style="min-width:260px;">
                            <input type="text" class="ua-input" placeholder="Pesquisar pelo nome do curso..."
                                   value="${esc(M.buscaCurso)}"
                                   oninput="window._uaFiltrarMeusCursos(this.value)">
                        </div>
                    ` : ''}
                </div>

                ${d.sem_vinculo ? `
                    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:40px;text-align:center;color:#64748b;">
                        <i class="ph ph-user-circle-dashed" style="font-size:2.8rem;color:#94a3b8;"></i>
                        <h3 style="color:#0f172a;margin:10px 0 6px;">Seu usuário ainda não está vinculado a um cadastro de colaborador</h3>
                        <p style="margin:0;font-size:0.88rem;">Solicite ao RH ou ao Gestor da UniAmérica a conferência do seu e-mail/nome no cadastro de colaboradores.</p>
                    </div>
                ` : cursos.length === 0 ? `
                    <div style="background:#fff;border:1px dashed #cbd5e1;border-radius:16px;padding:44px;text-align:center;color:#64748b;">
                        <i class="ph ph-books" style="font-size:2.6rem;color:#94a3b8;"></i>
                        <h3 style="color:#0f172a;margin:10px 0 6px;">Nenhum curso ativo vinculado no momento</h3>
                        <p style="margin:0;font-size:0.88rem;">Assim que você ou seu departamento forem vinculados a um curso da UniAmérica, as aulas e missões aparecerão aqui.</p>
                    </div>
                ` : `
                    <div style="display:flex;flex-direction:column;gap:24px;">
                        ${cursos.map(c => renderCardMeuCursoMissoes(c, colab)).join('')}
                    </div>
                `}
            </div>
        `;
    }

    window._uaMudarColabSimulado = function (val) {
        M.colabOverrideId = val || '';
        window.renderUniAmericaMissoes();
    };
    window._uaFiltrarMeusCursos = function (val) {
        M.buscaCurso = val || '';
        desenharTelaMissoes();
    };

    function renderCardMeuCursoMissoes(c, colab) {
        const meu = c.meu_desempenho;
        const certUrl = meu && meu.certificado && meu.certificado.arquivo_url ? authMediaUrl(meu.certificado.arquivo_url) : null;

        return `
            <div style="background:#fff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;box-shadow:0 4px 16px rgba(15,23,42,0.04);">
                <div style="padding:20px 24px;background:linear-gradient(90deg,#1e3a8a 0%,#2563eb 100%);color:#fff;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:14px;">
                    <div>
                        <h2 style="margin:0;font-size:1.25rem;font-weight:800;color:#fff;">${esc(c.nome)}</h2>
                        ${c.descricao ? `<div style="font-size:0.85rem;color:rgba(255,255,255,0.86);margin-top:4px;">${esc(c.descricao)}</div>` : ''}
                    </div>
                    <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
                        ${meu ? `
                            <span class="ua-badge" style="background:rgba(255,255,255,0.18);color:#fff;font-size:0.85rem;padding:6px 12px;">
                                <i class="ph ph-trophy" style="color:#fde047;"></i> Ranking: ${meu.posicao}º lugar
                            </span>
                            <span class="ua-badge" style="background:#fff;color:#1e3a8a;font-size:0.88rem;padding:6px 14px;font-weight:800;">
                                ${meu.nota_total} pontos (${meu.aulas_presentes}/${meu.total_aulas} aulas)
                            </span>
                        ` : ''}
                        ${certUrl ? `
                            <a href="${esc(certUrl)}" target="_blank" class="ua-btn" style="background:#fde047;color:#713f12;text-decoration:none;font-weight:800;">
                                <i class="ph ph-certificate"></i> Meu Certificado
                            </a>
                        ` : ''}
                    </div>
                </div>

                ${(c.premios || []).length > 0 ? `
                    <div style="padding:10px 24px;background:#fffbeb;border-bottom:1px solid #fde68a;display:flex;gap:12px;align-items:center;flex-wrap:wrap;font-size:0.82rem;color:#92400e;">
                        <strong><i class="ph ph-gift"></i> Prêmios deste Curso:</strong>
                        ${c.premios.map(pr => `<span class="ua-badge" style="background:#fef3c7;color:#92400e;border:1px solid #fde68a;">${pr.colocacao}º Lugar: ${esc(pr.titulo)}${pr.recompensa ? ' (' + esc(pr.recompensa) + ')' : ''}</span>`).join('')}
                    </div>
                ` : ''}

                <div style="padding:20px 24px;display:flex;flex-direction:column;gap:16px;">
                    ${(c.aulas || []).map(aula => renderAulaColaborador(aula, colab)).join('')}
                </div>
            </div>
        `;
    }

    function renderAulaColaborador(aula, colab) {
        if (!aula.presente) {
            return `
                <div style="border:1px dashed #cbd5e1;background:#f8fafc;border-radius:14px;padding:16px 18px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
                    <div>
                        <div style="display:flex;align-items:center;gap:8px;">
                            <span class="ua-badge" style="background:#94a3b8;color:#fff;">Aula ${aula.ordem}</span>
                            <strong style="font-size:1rem;color:#334155;">${esc(aula.titulo)}</strong>
                        </div>
                        <div style="font-size:0.82rem;color:#64748b;margin-top:4px;">
                            <i class="ph ph-lock-key"></i> As perguntas em aula e as missões da semana só são ativadas após a confirmação da sua participação na <strong>Lista de Presença</strong> desta aula.
                        </div>
                    </div>
                    <span class="ua-badge" style="background:#fee2e2;color:#b91c1c;"><i class="ph ph-lock-simple"></i> Aguardando presença</span>
                </div>
            `;
        }

        const st = aula.submissao_teste;
        const pergs = aula.perguntas || [];
        const missoes = aula.missoes || [];
        const anexos = aula.anexos || [];

        return `
            <div style="border:1px solid #bfdbfe;background:#fff;border-radius:16px;padding:18px 20px;">
                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;padding-bottom:12px;border-bottom:1px solid #f1f5f9;margin-bottom:14px;">
                    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                        <span class="ua-badge" style="background:#1d4ed8;color:#fff;">Aula ${aula.ordem}</span>
                        <h3 style="margin:0;font-size:1.05rem;color:#0f172a;">${esc(aula.titulo)}</h3>
                        <span class="ua-badge" style="background:#dcfce7;color:#15803d;"><i class="ph ph-check-circle"></i> Presença confirmada</span>
                    </div>
                    <span class="ua-badge" style="background:${aula.prazo_expirado ? '#fee2e2' : '#eff6ff'};color:${aula.prazo_expirado ? '#b91c1c' : '#1d4ed8'};">
                        <i class="ph ph-calendar-check"></i> ${aula.prazo_expirado ? 'Prazo de 1 semana encerrado' : `Missões válidas por mais ${aula.dias_restantes} dia(s)`}
                    </span>
                </div>

                ${anexos.length > 0 ? `
                    <div style="margin-bottom:14px;">
                        <strong style="font-size:0.84rem;color:#334155;display:block;margin-bottom:6px;"><i class="ph ph-folder-open"></i> Materiais da Aula:</strong>
                        <div style="display:flex;flex-wrap:wrap;gap:8px;">
                            ${anexos.map(an => `
                                <a href="${esc(authMediaUrl(an.url))}" target="_blank" class="ua-btn ua-btn-ghost" style="text-decoration:none;font-size:0.8rem;padding:6px 12px;">
                                    <i class="ph ph-file-arrow-down"></i> ${esc(an.nome_arquivo)}
                                </a>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- Seção 1: Formulário / Teste em Aula -->
                ${pergs.length > 0 ? `
                    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px 16px;margin-bottom:14px;">
                        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
                            <strong style="font-size:0.92rem;color:#0f172a;"><i class="ph ph-exam" style="color:#2563eb;"></i> Teste de Múltipla Escolha em Aula</strong>
                            ${st
                                ? `<span class="ua-badge" style="background:#dcfce7;color:#15803d;font-size:0.82rem;">Pontuação obtida: +${st.pontos_gestor != null ? st.pontos_gestor : st.pontos_calculados} pt(s)</span>`
                                : `<span class="ua-badge" style="background:#fef9c3;color:#a16207;">Responda em aula para somar pontos</span>`}
                        </div>

                        <div style="display:flex;flex-direction:column;gap:12px;">
                            ${pergs.map((q, qIdx) => {
                                const respDada = st && st.respostas ? st.respostas[q.id] : null;
                                return `
                                    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:12px;">
                                        <div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:8px;">
                                            <strong style="font-size:0.86rem;color:#1e293b;">${qIdx + 1}. ${esc(q.pergunta)}</strong>
                                            <span class="ua-badge" style="background:#eef2ff;color:#4338ca;flex-shrink:0;">Vale ${q.nota_pontos} pt(s)</span>
                                        </div>
                                        <div style="display:flex;flex-direction:column;gap:6px;">
                                            ${(q.opcoes || []).map((op, opIdx) => {
                                                const marcada = st && Number(respDada) === opIdx;
                                                const ehCorreta = st && q.correta_idx !== undefined && Number(q.correta_idx) === opIdx;
                                                const bg = st ? (ehCorreta ? '#dcfce7' : (marcada ? '#fee2e2' : '#fff')) : '#fff';
                                                return `
                                                    <label style="display:flex;align-items:center;gap:8px;padding:7px 10px;border:1px solid #e2e8f0;border-radius:8px;background:${bg};cursor:${st ? 'default' : 'pointer'};font-size:0.84rem;">
                                                        <input type="radio" name="ua_resp_q_${aula.id}_${esc(q.id)}" value="${opIdx}"
                                                               ${marcada ? 'checked' : ''} ${st ? 'disabled' : ''}>
                                                        <span>${esc(op)}</span>
                                                    </label>
                                                `;
                                            }).join('')}
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>

                        ${!st ? `
                            <div style="margin-top:12px;display:flex;justify-content:flex-end;">
                                <button class="ua-btn ua-btn-primary" onclick="window._uaEnviarRespostasTesteAula(${aula.id})">
                                    <i class="ph ph-paper-plane-tilt"></i> Enviar Respostas da Aula
                                </button>
                            </div>
                        ` : ''}
                    </div>
                ` : ''}

                <!-- Seção 2: Missões da Semana -->
                ${missoes.length > 0 ? `
                    <div style="display:flex;flex-direction:column;gap:14px;">
                        <strong style="font-size:0.94rem;color:#0f172a;"><i class="ph ph-rocket-launch" style="color:#16a34a;"></i> Missões da Semana (${missoes.length})</strong>
                        ${missoes.map(m => renderMissaoCardColaborador(aula, m)).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }

    function renderMissaoCardColaborador(aula, m) {
        const sub = m.submissao;
        const respostasSalvas = (sub && sub.respostas) ? sub.respostas : {};
        const jaAvaliada = sub && sub.status === 'avaliada';
        const bloqueadaEdicao = jaAvaliada || aula.prazo_expirado;

        return `
            <div style="border:1px solid ${jaAvaliada ? '#86efac' : '#cbd5e1'};background:${jaAvaliada ? '#f0fdf4' : '#fff'};border-radius:14px;padding:16px;">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap;margin-bottom:10px;">
                    <div>
                        <div style="font-size:0.98rem;font-weight:800;color:#0f172a;">${esc(m.titulo)}</div>
                        ${m.descricao ? `<div style="font-size:0.84rem;color:#475569;margin-top:3px;">${esc(m.descricao)}</div>` : ''}
                    </div>
                    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                        <span class="ua-badge" style="background:#dbeafe;color:#1d4ed8;">Vale até ${m.nota_maxima} pts</span>
                        ${jaAvaliada
                            ? `<span class="ua-badge" style="background:#16a34a;color:#fff;font-size:0.84rem;">Nota atribuída: ${sub.nota_gestor} / 10 pts</span>`
                            : (sub ? `<span class="ua-badge" style="background:#fef3c7;color:#92400e;">Enviada — será avaliada antes da próxima aula</span>` : '')}
                    </div>
                </div>

                ${m.pdf_url ? `
                    <div style="margin-bottom:14px;">
                        <a href="${esc(authMediaUrl(m.pdf_url))}" target="_blank" class="ua-btn" style="background:#fee2e2;color:#b91c1c;text-decoration:none;border:1px solid #fecaca;">
                            <i class="ph ph-file-pdf" style="font-size:1.15rem;"></i> Abrir PDF de Instrução da Missão (${esc(m.pdf_nome || 'Instruções.pdf')})
                        </a>
                    </div>
                ` : ''}

                <div style="display:flex;flex-direction:column;gap:12px;">
                    ${(m.campos || []).map(cp => renderCampoDinamicoColaborador(aula.id, m, cp, respostasSalvas[cp.id], bloqueadaEdicao)).join('')}
                </div>

                ${jaAvaliada && sub.feedback_gestor ? `
                    <div style="margin-top:12px;padding:10px 12px;background:#dcfce7;border-radius:10px;font-size:0.83rem;color:#14532d;">
                        <strong>Feedback do Gestor:</strong> ${esc(sub.feedback_gestor)}
                    </div>
                ` : ''}

                ${!bloqueadaEdicao ? `
                    <div style="margin-top:14px;display:flex;justify-content:flex-end;">
                        <button class="ua-btn ua-btn-success" onclick="window._uaEnviarMissaoColaborador(${aula.id}, '${esc(m.id)}')">
                            <i class="ph ph-check-circle"></i> ${sub ? 'Atualizar Envio da Missão' : 'Concluir e Enviar Missão'}
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }

    function renderCampoDinamicoColaborador(aulaId, missao, cp, valorSalvo, desabilitado) {
        const keyEstrela = `${aulaId}_${missao.id}_${cp.id}`;
        if (cp.tipo === 'estrelas' && M.estrelasTemp[keyEstrela] === undefined && valorSalvo) {
            M.estrelasTemp[keyEstrela] = Number(valorSalvo) || 0;
        }
        const arqsDoCampo = (missao.arquivos || []).filter(a => a.campo_id === cp.id);
        const domId = `ua_cp_${aulaId}_${missao.id}_${cp.id}`;

        let controleHtml = '';
        if (cp.tipo === 'texto') {
            controleHtml = `<textarea id="${esc(domId)}" rows="3" class="ua-textarea" ${desabilitado ? 'disabled' : ''}
                placeholder="Digite sua resposta aqui...">${esc(valorSalvo || '')}</textarea>`;
        } else if (cp.tipo === 'multipla_escolha') {
            controleHtml = `<div style="display:flex;flex-direction:column;gap:6px;">
                ${(cp.opcoes || []).map(op => `
                    <label style="display:flex;align-items:center;gap:8px;font-size:0.84rem;cursor:${desabilitado ? 'default' : 'pointer'};">
                        <input type="radio" name="${esc(domId)}" value="${esc(op)}" ${valorSalvo === op ? 'checked' : ''} ${desabilitado ? 'disabled' : ''}>
                        <span>${esc(op)}</span>
                    </label>
                `).join('')}
            </div>`;
        } else if (cp.tipo === 'estrelas') {
            const atual = Number(M.estrelasTemp[keyEstrela] || valorSalvo || 0);
            controleHtml = `<div id="${esc(domId)}_wrap" style="display:flex;align-items:center;gap:4px;">
                ${[1, 2, 3, 4, 5].map(n => `
                    <button type="button" class="ua-star-btn" style="color:${n <= atual ? '#f59e0b' : '#cbd5e1'};"
                            ${desabilitado ? 'disabled' : `onclick="window._uaSetEstrelaMissao('${esc(keyEstrela)}', ${n})"`}>★</button>
                `).join('')}
                <span style="font-size:0.82rem;color:#64748b;margin-left:6px;">${atual > 0 ? `${atual} de 5 estrelas` : 'Selecione de 1 a 5 estrelas'}</span>
            </div>`;
        } else if (cp.tipo === 'documento' || cp.tipo === 'imagem' || cp.tipo === 'audio') {
            const accept = cp.tipo === 'imagem' ? 'image/*' : cp.tipo === 'audio' ? 'audio/*' : '*/*';
            controleHtml = `
                <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
                    ${!desabilitado ? `
                        <label class="ua-btn ua-btn-ghost" style="cursor:pointer;font-size:0.82rem;">
                            <i class="ph ph-upload-simple"></i> Enviar ${cp.tipo === 'imagem' ? 'Imagem/Foto' : cp.tipo === 'audio' ? 'Arquivo de Áudio' : 'Documento/Arquivo'}
                            <input type="file" accept="${accept}" style="display:none;"
                                   onchange="window._uaUploadArquivoCampoMissao(${aulaId}, '${esc(missao.id)}', '${esc(cp.id)}', this)">
                        </label>
                        ${cp.tipo === 'audio' ? `
                            <button type="button" id="ua_rec_btn_${esc(keyEstrela)}" class="ua-btn ua-btn-ghost" style="font-size:0.82rem;"
                                    onclick="window._uaToggleGravarAudioMissao(${aulaId}, '${esc(missao.id)}', '${esc(cp.id)}')">
                                <i class="ph ph-microphone" style="color:#dc2626;"></i> Gravar Áudio Agora
                            </button>
                        ` : ''}
                    ` : ''}
                </div>
                <div style="margin-top:8px;display:flex;flex-direction:column;gap:6px;">
                    ${arqsDoCampo.map(ar => {
                        const u = authMediaUrl(ar.url);
                        if (cp.tipo === 'audio' || String(ar.tipo_mime || '').startsWith('audio/')) {
                            return `<audio controls src="${esc(u)}" style="height:36px;max-width:340px;"></audio>`;
                        }
                        if (cp.tipo === 'imagem' || String(ar.tipo_mime || '').startsWith('image/')) {
                            return `<a href="${esc(u)}" target="_blank"><img src="${esc(u)}" style="max-height:110px;border-radius:8px;border:1px solid #cbd5e1;"></a>`;
                        }
                        return `<a href="${esc(u)}" target="_blank" style="font-size:0.83rem;color:#2563eb;font-weight:600;"><i class="ph ph-check-circle" style="color:#16a34a;"></i> ${esc(ar.nome_arquivo)}</a>`;
                    }).join('')}
                </div>
            `;
        }

        return `
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px;">
                <label style="font-size:0.84rem;font-weight:700;color:#1e293b;display:block;margin-bottom:6px;">
                    ${esc(cp.label)} ${cp.obrigatorio ? '<span style="color:#dc2626;">*</span>' : ''}
                </label>
                ${controleHtml}
            </div>
        `;
    }

    window._uaSetEstrelaMissao = function (key, val) {
        M.estrelasTemp[key] = val;
        desenharTelaMissoes();
    };

    window._uaUploadArquivoCampoMissao = async function (aulaId, missaoId, campoId, input) {
        if (!input.files || !input.files[0]) return;
        const fd = new FormData();
        fd.append('arquivo', input.files[0]);
        fd.append('campo_id', campoId);
        if (M.colabOverrideId) fd.append('colab_id', M.colabOverrideId);

        try {
            await api(`/uniamerica/aulas/${aulaId}/missoes/${encodeURIComponent(missaoId)}/upload-campo`, { method: 'POST', body: fd });
            toastOk('Arquivo salvo no Cloudflare R2!');
            await window.renderUniAmericaMissoes();
        } catch (e) {
            msgErro('Erro ao anexar arquivo', e.message);
        }
    };

    window._uaToggleGravarAudioMissao = async function (aulaId, missaoId, campoId) {
        const key = `${aulaId}_${missaoId}_${campoId}`;
        const btn = document.getElementById(`ua_rec_btn_${key}`);

        if (M.gravadores[key] && M.gravadores[key].rec && M.gravadores[key].rec.state === 'recording') {
            M.gravadores[key].rec.stop();
            return;
        }

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            return msgErro('Microfone indisponível', 'Seu navegador não suporta gravação direta. Envie um arquivo de áudio.');
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const chunks = [];
            const rec = new MediaRecorder(stream);
            M.gravadores[key] = { rec, chunks, stream };

            rec.ondataavailable = ev => { if (ev.data && ev.data.size > 0) chunks.push(ev.data); };
            rec.onstop = async () => {
                stream.getTracks().forEach(t => t.stop());
                const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
                const ext = (rec.mimeType || '').includes('ogg') ? 'ogg' : 'webm';
                const file = new File([blob], `audio_missao_${Date.now()}.${ext}`, { type: blob.type });
                const fd = new FormData();
                fd.append('arquivo', file);
                fd.append('campo_id', campoId);
                if (M.colabOverrideId) fd.append('colab_id', M.colabOverrideId);
                try {
                    await api(`/uniamerica/aulas/${aulaId}/missoes/${encodeURIComponent(missaoId)}/upload-campo`, { method: 'POST', body: fd });
                    toastOk('Áudio gravado e enviado!');
                    await window.renderUniAmericaMissoes();
                } catch (e) {
                    msgErro('Erro ao enviar áudio', e.message);
                }
            };

            rec.start();
            if (btn) {
                btn.innerHTML = '<i class="ph ph-stop-circle" style="color:#dc2626;"></i> Parar e Salvar Áudio';
                btn.style.background = '#fee2e2';
            }
        } catch (e) {
            msgErro('Permissão de microfone negada', e.message);
        }
    };

    window._uaEnviarRespostasTesteAula = async function (aulaId) {
        let aulaAlvo = null;
        (M.dados.cursos || []).forEach(c => {
            (c.aulas || []).forEach(a => { if (a.id === aulaId) aulaAlvo = a; });
        });
        if (!aulaAlvo) return;

        const respostas = {};
        for (const q of (aulaAlvo.perguntas || [])) {
            const sel = document.querySelector(`input[name="ua_resp_q_${aulaId}_${q.id}"]:checked`);
            if (!sel) {
                return msgErro('Responda todas as questões', `Selecione uma alternativa para a pergunta "${q.pergunta}".`);
            }
            respostas[q.id] = parseInt(sel.value, 10);
        }

        try {
            const body = { respostas };
            if (M.colabOverrideId) body.colab_id = M.colabOverrideId;
            const res = await api(`/uniamerica/aulas/${aulaId}/responder-teste`, { method: 'POST', body });
            toastOk(`Respostas enviadas! Você somou +${res.pontos_calculados} ponto(s) (${res.acertos}/${res.total_perguntas} acertos).`);
            await window.renderUniAmericaMissoes();
        } catch (e) {
            msgErro('Erro ao enviar respostas', e.message);
        }
    };

    window._uaEnviarMissaoColaborador = async function (aulaId, missaoId) {
        let aulaAlvo = null;
        let missaoAlvo = null;
        (M.dados.cursos || []).forEach(c => {
            (c.aulas || []).forEach(a => {
                if (a.id === aulaId) {
                    aulaAlvo = a;
                    missaoAlvo = (a.missoes || []).find(m => m.id === missaoId);
                }
            });
        });
        if (!aulaAlvo || !missaoAlvo) return;

        const respostas = {};
        for (const cp of (missaoAlvo.campos || [])) {
            const domId = `ua_cp_${aulaId}_${missaoId}_${cp.id}`;
            const keyEstrela = `${aulaId}_${missaoId}_${cp.id}`;

            if (cp.tipo === 'texto') {
                const el = document.getElementById(domId);
                const val = el ? el.value.trim() : '';
                if (cp.obrigatorio && !val) return msgErro('Campo obrigatório', `Preencha o campo "${cp.label}".`);
                respostas[cp.id] = val;
            } else if (cp.tipo === 'multipla_escolha') {
                const sel = document.querySelector(`input[name="${domId}"]:checked`);
                const val = sel ? sel.value : '';
                if (cp.obrigatorio && !val) return msgErro('Campo obrigatório', `Selecione uma opção em "${cp.label}".`);
                respostas[cp.id] = val;
            } else if (cp.tipo === 'estrelas') {
                const subAnt = missaoAlvo.submissao && missaoAlvo.submissao.respostas ? missaoAlvo.submissao.respostas[cp.id] : 0;
                const val = Number(M.estrelasTemp[keyEstrela] || subAnt || 0);
                if (cp.obrigatorio && !val) return msgErro('Avaliação por estrelas obrigatória', `Selecione de 1 a 5 estrelas em "${cp.label}".`);
                respostas[cp.id] = val;
            } else {
                const arqs = (missaoAlvo.arquivos || []).filter(a => a.campo_id === cp.id);
                if (cp.obrigatorio && arqs.length === 0) {
                    return msgErro('Anexo obrigatório', `Envie pelo menos um arquivo em "${cp.label}".`);
                }
                respostas[cp.id] = arqs.map(a => a.nome_arquivo).join(', ');
            }
        }

        try {
            const body = { respostas };
            if (M.colabOverrideId) body.colab_id = M.colabOverrideId;
            await api(`/uniamerica/aulas/${aulaId}/missoes/${encodeURIComponent(missaoId)}/responder`, { method: 'POST', body });
            toastOk('Missão enviada com sucesso! O Gestor avaliará na próxima aula.');
            await window.renderUniAmericaMissoes();
        } catch (e) {
            msgErro('Erro ao enviar missão', e.message);
        }
    };
})();
