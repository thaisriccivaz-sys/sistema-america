// ═══════════════════════════════════════════════════════════════
// MÓDULO: ENTREGA DE EPI — LOGÍSTICA
// Permite que a equipe de logística registre entregas de EPI
// para qualquer colaborador, reutilizando o fluxo completo de
// assinatura/selfie/PDF já implementado no prontuário.
// ═══════════════════════════════════════════════════════════════
(function () {
    const API = '/api';
    let _lepiColabs = [];
    let _lepiTemplates = [];
    let _lepiBuscaTimeout = null;
    let _lepiColabSelecionado = null;

    // ── Helpers ─────────────────────────────────────────────────
    function _apiGet(path) {
        return fetch(API + path, {
            headers: { Authorization: 'Bearer ' + window.currentToken }
        }).then(r => (r.ok ? r.json() : null)).catch(() => null);
    }

    function _apiPost(path, body) {
        return fetch(API + path, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer ' + window.currentToken
            },
            body: JSON.stringify(body)
        }).then(r => (r.ok ? r.json() : null)).catch(() => null);
    }

    function _fotoUrl(c) {
        if (c.foto_base64) return c.foto_base64;
        if (c.foto_path) return API + '/colaboradores/foto/' + c.id;
        return null;
    }

    function _initials(nome) {
        return (nome || '').split(' ').filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('');
    }

    // Score de template — mesma lógica do app.js (renderFichaEpiTab)
    function _scoreTemplate(t, dept, cargo) {
        const list = (t.departamentos || []).map(d => d.trim().toLowerCase());
        const cLow = (cargo || '').trim().toLowerCase();
        const dLow = (dept || '').trim().toLowerCase();
        const gLow = (t.grupo || '').trim().toLowerCase();
        let score = 0;
        if (cLow && list.includes(cLow)) score = Math.max(score, 100);
        if (cLow && gLow === cLow) score = Math.max(score, 90);
        if (cLow && list.some(l => l.length > 3 && cLow.includes(l))) score = Math.max(score, 70);
        if (cLow && gLow.length > 3 && cLow.includes(gLow)) score = Math.max(score, 60);
        if (dLow && list.includes(dLow)) score = Math.max(score, 50);
        if (dLow && gLow === dLow) score = Math.max(score, 40);
        if (dLow && list.some(l => l.length > 3 && dLow.includes(l))) score = Math.max(score, 20);
        if (dLow && gLow.length > 3 && dLow.includes(gLow)) score = Math.max(score, 10);
        return score;
    }

    function _melhorTemplate(colab) {
        const SETORES_ADMIN = ['Comercial', 'Financeiro', 'Logística', 'Logistica', 'Administrativo', 'RH'];
        const dept = colab.departamento || '';
        const cargo = colab.cargo || '';
        const isAdmin = SETORES_ADMIN.includes(dept) || SETORES_ADMIN.includes(cargo);

        let best = null, bestScore = 0;
        (_lepiTemplates || []).forEach(t => {
            const s = _scoreTemplate(t, dept, cargo);
            if (s > bestScore) { bestScore = s; best = t; }
        });
        if ((!best || bestScore < 40) && isAdmin) {
            best = _lepiTemplates.find(t => t.categoria === 'Administrativo') || best;
        }
        return best;
    }

    // ── Renderizar tela principal ────────────────────────────────
    window.renderLogisticaEpi = async function () {
        const container = document.getElementById('logistica-epi-container');
        if (!container) return;

        container.innerHTML = `
        <div style="min-height:100vh; background:#f0f4f8; font-family:'Inter',sans-serif;">
            <!-- Cabeçalho -->
            <div style="background:#1e3a5f; padding:1.5rem 2rem; display:flex; align-items:center; gap:1rem;">
                <div style="width:48px;height:48px;border-radius:12px;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;">
                    <i class="ph ph-shield-check" style="font-size:1.6rem;color:#93c5fd;"></i>
                </div>
                <div>
                    <h1 style="margin:0;color:#f1f5f9;font-size:1.25rem;font-weight:700;">Entrega de EPI</h1>
                    <p style="margin:0;color:#93c5fd;font-size:0.82rem;">Registre a entrega de Equipamento de Proteção Individual</p>
                </div>
            </div>

            <!-- Corpo -->
            <div style="max-width:860px;margin:0 auto;padding:2rem 1.5rem;">
                <!-- Busca -->
                <div style="background:#fff;border-radius:16px;padding:1.5rem;box-shadow:0 2px 12px rgba(0,0,0,0.06);margin-bottom:1.5rem;">
                    <label style="display:block;font-size:0.82rem;font-weight:700;color:#475569;margin-bottom:0.5rem;text-transform:uppercase;letter-spacing:0.05em;">
                        <i class="ph ph-magnifying-glass" style="margin-right:5px;"></i>Buscar Colaborador
                    </label>
                    <div style="position:relative;">
                        <i class="ph ph-user" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#94a3b8;font-size:1.1rem;pointer-events:none;"></i>
                        <input
                            id="lepi-busca"
                            type="text"
                            placeholder="Digite o nome do colaborador..."
                            autocomplete="off"
                            style="width:100%;padding:0.75rem 1rem 0.75rem 2.5rem;border:1.5px solid #e2e8f0;border-radius:10px;font-size:0.95rem;outline:none;transition:border-color 0.2s;box-sizing:border-box;font-family:inherit;"
                            oninput="window._lepiOnBusca(this.value)"
                            onfocus="this.style.borderColor='#2563eb'"
                            onblur="this.style.borderColor='#e2e8f0'"
                        />
                    </div>
                </div>

                <!-- Resultados -->
                <div id="lepi-resultados" style="display:none;"></div>

                <!-- Estado inicial -->
                <div id="lepi-estado-inicial" style="text-align:center;padding:3rem 1rem;color:#94a3b8;">
                    <i class="ph ph-shield-check" style="font-size:3.5rem;color:#cbd5e1;display:block;margin-bottom:1rem;"></i>
                    <p style="font-size:1rem;font-weight:600;color:#475569;margin:0 0 0.5rem;">Busque um colaborador</p>
                    <p style="font-size:0.85rem;margin:0;">Digite o nome acima para encontrar o colaborador e registrar a entrega de EPI.</p>
                </div>

                <!-- Carregando -->
                <div id="lepi-loading" style="display:none;text-align:center;padding:2rem;">
                    <div style="display:inline-block;width:32px;height:32px;border:3px solid #e2e8f0;border-top-color:#2563eb;border-radius:50%;animation:lepi-spin 0.7s linear infinite;"></div>
                    <p style="color:#64748b;margin-top:0.75rem;font-size:0.88rem;">Buscando colaboradores...</p>
                </div>
            </div>
        </div>
        <style>
            @keyframes lepi-spin { to { transform: rotate(360deg); } }
            .lepi-card { transition: box-shadow 0.18s, transform 0.18s; cursor: pointer; }
            .lepi-card:hover { box-shadow: 0 8px 28px rgba(30,58,95,0.14) !important; transform: translateY(-2px); }
            .lepi-card:active { transform: scale(0.98); }
            .lepi-status-ativo { background:#dcfce7;color:#16a34a; }
            .lepi-status-afastado { background:#fef9c3;color:#ca8a04; }
            .lepi-status-ferias { background:#ffedd5;color:#ea580c; }
        </style>`;

        // Carrega templates em background (necessário para verificar se colaborador tem template)
        if (!_lepiTemplates.length) {
            _lepiTemplates = await _apiGet('/epi-templates') || [];
        }

        // Foco automático na busca
        setTimeout(() => {
            const inp = document.getElementById('lepi-busca');
            if (inp) inp.focus();
        }, 150);
    };

    // ── Busca com debounce ───────────────────────────────────────
    window._lepiOnBusca = function (valor) {
        clearTimeout(_lepiBuscaTimeout);
        const q = (valor || '').trim();

        if (!q) {
            const res = document.getElementById('lepi-resultados');
            const ini = document.getElementById('lepi-estado-inicial');
            const load = document.getElementById('lepi-loading');
            if (res) res.style.display = 'none';
            if (ini) ini.style.display = 'block';
            if (load) load.style.display = 'none';
            return;
        }

        _lepiBuscaTimeout = setTimeout(() => _lepiBuscar(q), 280);
    };

    async function _lepiBuscar(q) {
        const res = document.getElementById('lepi-resultados');
        const ini = document.getElementById('lepi-estado-inicial');
        const load = document.getElementById('lepi-loading');

        if (ini) ini.style.display = 'none';
        if (res) res.style.display = 'none';
        if (load) load.style.display = 'block';

        // Busca todos colaboradores ativos (cacheado)
        if (!_lepiColabs.length) {
            const data = await _apiGet('/colaboradores');
            _lepiColabs = (data || []).filter(c => c.status === 'Ativo' || c.status === 'Afastado' || c.status === 'Férias');
        }

        const qLow = q.toLowerCase();
        const encontrados = _lepiColabs.filter(c =>
            (c.nome_completo || '').toLowerCase().includes(qLow) ||
            (c.cargo || '').toLowerCase().includes(qLow)
        ).slice(0, 20);

        if (load) load.style.display = 'none';
        if (res) {
            res.style.display = 'block';
            _lepiRenderResultados(res, encontrados, q);
        }
    }

    function _lepiRenderResultados(container, lista, q) {
        if (!lista.length) {
            container.innerHTML = `
                <div style="text-align:center;padding:2.5rem 1rem;background:#fff;border-radius:16px;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
                    <i class="ph ph-user-x" style="font-size:2.5rem;color:#cbd5e1;display:block;margin-bottom:0.75rem;"></i>
                    <p style="font-size:0.95rem;font-weight:600;color:#475569;margin:0 0 0.25rem;">Nenhum colaborador encontrado</p>
                    <p style="font-size:0.82rem;color:#94a3b8;margin:0;">Verifique o nome digitado e tente novamente.</p>
                </div>`;
            return;
        }

        container.innerHTML = `
            <p style="font-size:0.78rem;color:#64748b;font-weight:600;margin:0 0 0.75rem;text-transform:uppercase;letter-spacing:0.05em;">
                ${lista.length} colaborador${lista.length > 1 ? 'es' : ''} encontrado${lista.length > 1 ? 's' : ''}
            </p>
            <div style="display:flex;flex-direction:column;gap:0.75rem;">
                ${lista.map(c => _lepiCardHTML(c)).join('')}
            </div>`;
    }

    function _lepiCardHTML(c) {
        const foto = _fotoUrl(c);
        const initials = _initials(c.nome_completo);
        const statusClass = c.status === 'Ativo' ? 'lepi-status-ativo' : c.status === 'Afastado' ? 'lepi-status-afastado' : 'lepi-status-ferias';
        const statusIcon = c.status === 'Ativo' ? 'ph-check-circle' : c.status === 'Afastado' ? 'ph-first-aid' : 'ph-airplane-tilt';

        const fotoHTML = foto
            ? `<img src="${foto}" style="width:52px;height:52px;border-radius:12px;object-fit:cover;border:2px solid #e2e8f0;" onerror="this.style.display='none';this.nextSibling.style.display='flex';">
               <div style="display:none;width:52px;height:52px;border-radius:12px;background:linear-gradient(135deg,#1e3a5f,#2563eb);color:#fff;font-size:1.1rem;font-weight:700;align-items:center;justify-content:center;flex-shrink:0;">${initials}</div>`
            : `<div style="width:52px;height:52px;border-radius:12px;background:linear-gradient(135deg,#1e3a5f,#2563eb);color:#fff;font-size:1.1rem;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${initials}</div>`;

        return `
            <div class="lepi-card"
                 style="background:#fff;border-radius:14px;padding:1rem 1.25rem;box-shadow:0 2px 10px rgba(0,0,0,0.06);display:flex;align-items:center;gap:1rem;border:1.5px solid #e2e8f0;"
                 onclick="window._lepiSelecionarColab(${c.id})">
                ${fotoHTML}
                <div style="flex:1;min-width:0;">
                    <p style="margin:0;font-size:0.97rem;font-weight:700;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${c.nome_completo}</p>
                    <p style="margin:2px 0 0;font-size:0.8rem;color:#64748b;">${c.cargo || '—'} &bull; ${c.departamento || '—'}</p>
                </div>
                <div style="display:flex;align-items:center;gap:0.5rem;flex-shrink:0;">
                    <span class="${statusClass}" style="font-size:0.72rem;font-weight:700;padding:3px 10px;border-radius:999px;display:flex;align-items:center;gap:4px;white-space:nowrap;">
                        <i class="ph ${statusIcon}"></i> ${c.status}
                    </span>
                    <button style="background:#1e3a5f;color:#fff;border:none;border-radius:10px;padding:0.5rem 1rem;font-size:0.82rem;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:5px;white-space:nowrap;">
                        <i class="ph ph-shield-check"></i> Registrar Entrega
                    </button>
                </div>
            </div>`;
    }

    // ── Selecionar colaborador e abrir fluxo EPI ─────────────────
    window._lepiSelecionarColab = async function (colabId) {
        const colab = _lepiColabs.find(c => c.id === colabId);
        if (!colab) return;
        _lepiColabSelecionado = colab;

        // Carrega templates se ainda não carregou
        if (!_lepiTemplates.length) {
            _lepiTemplates = await _apiGet('/epi-templates') || [];
        }

        // Mostra loading na tela
        const res = document.getElementById('lepi-resultados');
        const prevHTML = res ? res.innerHTML : '';
        if (res) {
            res.innerHTML = `
                <div style="text-align:center;padding:2rem;background:#fff;border-radius:16px;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
                    <div style="display:inline-block;width:32px;height:32px;border:3px solid #e2e8f0;border-top-color:#1e3a5f;border-radius:50%;animation:lepi-spin 0.7s linear infinite;margin-bottom:0.75rem;"></div>
                    <p style="color:#475569;font-size:0.9rem;font-weight:600;margin:0;">Carregando dados de ${colab.nome_completo}...</p>
                </div>`;
        }

        // Busca fichas ativas
        const fichas = await _apiGet('/colaboradores/' + colabId + '/epi-fichas') || [];
        const todasEntregas = await _apiGet('/colaboradores/' + colabId + '/epi-entregas') || [];

        let fichaAtiva = fichas.find(f => f.status === 'ativa');

        // Se não tem ficha ativa, tenta criar a partir do melhor template
        if (!fichaAtiva) {
            const template = _melhorTemplate(colab);
            if (!template) {
                if (res) res.innerHTML = prevHTML;
                Swal.fire({
                    icon: 'warning',
                    title: 'Template não configurado',
                    html: `<p>O colaborador <strong>${colab.nome_completo}</strong> (${colab.cargo || colab.departamento || '—'}) não possui um template de EPI configurado.</p>
                           <p style="font-size:0.85rem;color:#64748b;">Solicite ao RH que configure o template de EPI para este cargo/departamento.</p>`,
                    confirmButtonColor: '#1e3a5f',
                    confirmButtonText: 'Entendido'
                });
                return;
            }

            const novaFicha = await _apiPost('/colaboradores/' + colabId + '/epi-fichas', {
                template_id: template.id,
                grupo: template.grupo,
                snapshot_epis: template.epis,
                snapshot_termo: template.termo_texto,
                snapshot_rodape: template.rodape_texto
            });

            if (!novaFicha || !novaFicha.id) {
                if (res) res.innerHTML = prevHTML;
                Swal.fire('Erro', 'Não foi possível criar a ficha de EPI. Tente novamente.', 'error');
                return;
            }

            fichaAtiva = { ...novaFicha, snapshot_epis: template.epis, snapshot_termo: template.termo_texto, snapshot_rodape: template.rodape_texto, grupo: template.grupo };
        }

        if (res) res.innerHTML = prevHTML;

        // Injeta dados no contexto global que o fluxo de entrega espera
        // O `window.abrirAssinaturaEpi` usa `window._epiProntuarioData` e `window.viewedColaborador`
        window.viewedColaborador = colab;
        window._epiProntuarioData = {
            fichas: [...fichas.filter(f => f.status !== 'ativa'), fichaAtiva],
            colabId,
            todasEntregas
        };
        // Garante que a ficha ativa está na lista
        if (!window._epiProntuarioData.fichas.find(f => f.id === fichaAtiva.id)) {
            window._epiProntuarioData.fichas.push(fichaAtiva);
        }

        // Abre o fluxo de entrega existente
        window.abrirAssinaturaEpi(fichaAtiva.id);

        // Quando o overlay fechar (após entrega), recarrega a tela de logística EPI
        // sem resetar a busca
        const origFechar = window._fecharOverlayEpi;
        window._fecharOverlayEpi = function () {
            if (typeof origFechar === 'function') origFechar();
            window._fecharOverlayEpi = origFechar; // restaura
            // Limpa colaborador selecionado
            _lepiColabSelecionado = null;
        };
    };

})();
