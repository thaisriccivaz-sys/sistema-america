// ═══════════════════════════════════════════════════════════
//  MÓDULO DE LICENÇAS EMPRESARIAIS
//  Empresas: América Rental | Attend Ambiental | BRK | Outras Licenças
// ═══════════════════════════════════════════════════════════

const LICENCAS_CONFIG = {
    'america-rental': {
        label: 'América Rental',
        color: '#d9480f',
        bg: '#fff5f0',
        border: '#ffd0b8',
        icon: 'ph-building-office',
        docs: [
            'PCMSO', 'PRG', 'CLI - Alvará', 'AVCB', 'CADRI', 'Cartão de CNPJ',
            'CND Estadual', 'CND Federal', 'CND Municipal',
            'CND Trabalhista', 'CTF IBAMA', 'Inscrição Estadual',
            'Inscrição Municipal', 'LO - CETESB', 'LTCAT'
        ]
    },
    'attend-ambiental': {
        label: 'Attend Ambiental',
        color: '#1971c2',
        bg: '#f0f7ff',
        border: '#b8d9f5',
        icon: 'ph-leaf',
        docs: [
            'CLI - Alvará', 'AVCB', 'CADRI', 'Cartão CNPJ', 'CTF IBAMA',
            'Declaração de Contrato',
            'LI - Licença de Instalação', 'LO - CETESB'
        ]
    },
    'brk': {
        label: 'BRK',
        color: '#2d9e5f',
        bg: '#f0fdf4',
        border: '#b8f0d0',
        icon: 'ph-factory',
        docs: [
            'CLI - Alvará', 'AVCB', 'CADRI', 'Cartão CNPJ', 'Contrato',
            'CTF IBAMA', 'LO - CETESB'
        ]
    },
    'outras-licencas': {
        label: 'Outras Licenças',
        color: '#7c3aed',
        bg: '#f5f3ff',
        border: '#ddd6fe',
        icon: 'ph-folders',
        apenasControle: true,
        docs: [
            'Cadastro Mobiliário',
            'Cadesp – Inscrição Estadual',
            'Consulta optante pelo Simples Nacional',
            'CRF – FGTS',
            'Certidão de falência',
            'Certidão Estadual de Distribuições Criminais',
            'Certidão Estadual de Distribuições Cíveis',
            'Certidão de Ação Trabalhista em Tramitação'
        ]
    }
};

// ── Regras especiais de vencimento por empresa/documento ──────
function adicionarDiasISO(isoDate, dias) {
    if (!isoDate) return '';
    const [y, m, d] = isoDate.split('-').map(Number);
    const dt = new Date(y, m - 1, d, 12, 0, 0);
    dt.setDate(dt.getDate() + dias);
    const yy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
}

function getDia01MesAtualISO() {
    const hj = new Date();
    return `${hj.getFullYear()}-${String(hj.getMonth() + 1).padStart(2, '0')}-01`;
}

function getProximoDia01ISO() {
    const hj = new Date();
    const prox = new Date(hj.getFullYear(), hj.getMonth() + 1, 1, 12, 0, 0);
    return `${prox.getFullYear()}-${String(prox.getMonth() + 1).padStart(2, '0')}-01`;
}

function getHojeISO() {
    const hj = new Date();
    return `${hj.getFullYear()}-${String(hj.getMonth() + 1).padStart(2, '0')}-${String(hj.getDate()).padStart(2, '0')}`;
}

function getRegraLicenca(empresa, nome) {
    const emp = String(empresa || '').toLowerCase().trim();
    const n = String(nome || '').trim();
    const nNorm = n.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

    // 1. Cartão de CNPJ dentro da América Rental: vencimento fixo todo dia 01, liberado no credenciamento mesmo vencido
    if (emp === 'america-rental' && nNorm.includes('cartao de cnpj')) {
        return {
            tipo: 'dia_01',
            permiteCredenciamentoVencido: true,
            badgeTexto: 'Vencimento fixo: todo dia 01 • Liberado no Credenciamento'
        };
    }

    // 2. Outras Licenças — 4 licenças com vencimento fixo todo dia 01 de cada mês
    if (emp === 'outras-licencas') {
        if (
            nNorm.includes('cadastro mobiliario') ||
            nNorm.includes('cadesp') ||
            nNorm.includes('simples nacional') ||
            nNorm.includes('crf') || nNorm.includes('fgts')
        ) {
            return {
                tipo: 'dia_01',
                badgeTexto: 'Vencimento fixo: todo dia 01 do mês (notifica dia 01)'
            };
        }

        // 3. Outras Licenças — 4 certidões com ciclo de 90 dias (3 meses)
        if (nNorm.includes('falencia')) {
            return {
                tipo: '90_dias',
                cicloDias: 90,
                defaultValidade: '2026-12-16',
                badgeTexto: 'Vencimento fixo a cada 90 dias'
            };
        }
        if (nNorm.includes('distribuicoes criminais')) {
            return {
                tipo: '90_dias',
                cicloDias: 90,
                defaultValidade: '2026-12-11',
                badgeTexto: 'Válida por 3 meses (90 dias)'
            };
        }
        if (nNorm.includes('distribuicoes civeis')) {
            const defaultEmissao = '2026-08-01';
            const defaultValidade = adicionarDiasISO(defaultEmissao, 90); // 2026-10-30
            return {
                tipo: '90_dias',
                cicloDias: 90,
                defaultEmissao,
                defaultValidade,
                badgeTexto: 'Renovação a cada 90 dias (3 meses)'
            };
        }
        if (nNorm.includes('acao trabalhista')) {
            return {
                tipo: '90_dias',
                cicloDias: 90,
                defaultValidade: '2026-12-10',
                badgeTexto: 'Válida por 3 meses (90 dias)'
            };
        }
    }

    return null;
}

let licencasData = {}; // { 'america-rental': [...licencas], ... }
let licencasActiveTab = 'america-rental';
let licencasFiltro = ''; // texto de busca atual

// ── Filtro de busca em tempo real ───────────────────────────
window.filtrarLicencas = function(val) {
    licencasFiltro = val.toLowerCase().trim();
    document.querySelectorAll('.licenca-card, .licenca-card-empty').forEach(card => {
        const nomeEl = card.querySelector('.licenca-doc-nome');
        if (!nomeEl) return;
        const nomeCard = nomeEl.textContent.toLowerCase();
        card.style.display = (!licencasFiltro || nomeCard.includes(licencasFiltro)) ? '' : 'none';
    });
    const grid = document.getElementById('licencas-grid-main');
    if (grid) {
        const visiveis = [...grid.querySelectorAll('.licenca-card, .licenca-card-empty')].filter(c => c.style.display !== 'none');
        const semResultado = grid.querySelector('#licencas-sem-resultado');
        if (semResultado) semResultado.style.display = visiveis.length === 0 ? '' : 'none';
    }
};

// ── Inicializar módulo ───────────────────────────────────────
window.initLicencas = async function() {
    renderLicencasTabs();
    await Promise.all([
        loadLicencas(),
        carregarEmailNotificacaoLicencas()
    ]);
    renderLicencasContent();
};

// ── Carregar e salvar e-mail de notificação ──────────────────
async function carregarEmailNotificacaoLicencas() {
    const input = document.getElementById('licencas-email-notificacao');
    if (!input) return;
    try {
        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        const res = await fetch('/api/licencas/config', { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) return;
        const data = await res.json();
        if (data && data.email_notificacao) {
            input.value = data.email_notificacao;
        }
    } catch (e) {
        console.warn('[Licenças] Erro ao carregar config de e-mail:', e);
    }
}

window.salvarEmailNotificacaoLicencas = async function() {
    const input = document.getElementById('licencas-email-notificacao');
    const btn = document.getElementById('btn-salvar-email-licencas');
    if (!input) return;
    const email = input.value.trim();
    if (!email || !email.includes('@')) {
        if (typeof showToast !== 'undefined') showToast('Informe um e-mail válido para notificação.', 'warning');
        else alert('Informe um e-mail válido para notificação.');
        input.focus();
        return;
    }
    const origHtml = btn ? btn.innerHTML : '';
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ph ph-spinner"></i> Salvando...'; }
    try {
        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        const res = await fetch('/api/licencas/config', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email_notificacao: email })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao salvar e-mail');
        if (typeof showToast !== 'undefined') showToast('E-mail de notificação salvo com sucesso!', 'success');
        else alert('E-mail de notificação salvo com sucesso!');
    } catch (e) {
        if (typeof showToast !== 'undefined') showToast('Erro: ' + e.message, 'error');
        else alert('Erro: ' + e.message);
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = origHtml; }
    }
};

// ── Renderizar abas de empresa ───────────────────────────────
function renderLicencasTabs() {
    const tabsEl = document.getElementById('licencas-tabs');
    if (!tabsEl) return;
    tabsEl.innerHTML = Object.entries(LICENCAS_CONFIG).map(([key, cfg]) => `
        <button class="licenca-tab-btn ${key === licencasActiveTab ? 'active' : ''}"
                onclick="switchLicencaTab('${key}')"
                style="--tab-color:${cfg.color}; ${key === licencasActiveTab ? `border-bottom:3px solid ${cfg.color}; color:${cfg.color};` : ''}">
            <i class="ph ${cfg.icon}"></i> ${cfg.label}
        </button>
    `).join('');
}

// ── Carregar licenças do backend ─────────────────────────────
async function loadLicencas() {
    try {
        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        const res = await fetch('/api/licencas', { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) throw new Error(`Erro ${res.status}`);
        const all = await res.json();
        licencasData = {};
        Object.keys(LICENCAS_CONFIG).forEach(k => licencasData[k] = []);
        (all || []).forEach(l => {
            if (licencasData[l.empresa]) licencasData[l.empresa].push(l);
        });
    } catch(e) {
        console.error('[Licenças] Erro ao carregar:', e);
        Object.keys(LICENCAS_CONFIG).forEach(k => licencasData[k] = []);
    }
}

// ── Trocar aba ───────────────────────────────────────────────
window.switchLicencaTab = function(key) {
    licencasActiveTab = key;
    renderLicencasTabs();
    renderLicencasContent();
};

// ── Verificar se documento não possui validade ──────────────
function isDocumentoSemValidade(empresa, nome) {
    const regra = getRegraLicenca(empresa, nome);
    if (regra) return false; // Se tem regra especial (ex: Cartão de CNPJ na América Rental ou Cadesp em Outras), TEM validade!
    const SEM_VALIDADE_NOMES = ['cnpj', 'inscrição estadual', 'inscricao estadual', 'inscrição municipal', 'inscricao municipal', 'ltcat', 'contrato'];
    const nLow = String(nome || '').toLowerCase();
    return SEM_VALIDADE_NOMES.some(s => nLow.includes(s));
}

// ── Resolver validade efetiva de uma licença ─────────────────
function getValidadeEfetiva(empresa, nome, licenca) {
    const regra = getRegraLicenca(empresa, nome);
    if (regra && regra.tipo === 'dia_01') {
        const inicioMes = getDia01MesAtualISO();
        const updatedIso = licenca && licenca.updated_at ? String(licenca.updated_at).substring(0, 10) : '';
        // Se tem validade futura (> hoje), respeita; se não foi atualizado no mês atual ou não tem validade, vence no dia 01 do mês atual
        if (licenca && licenca.validade && licenca.validade > getHojeISO() && updatedIso >= inicioMes) {
            return licenca.validade;
        }
        return (licenca && licenca.validade && licenca.validade <= getHojeISO()) ? licenca.validade : inicioMes;
    }
    if (regra && regra.tipo === '90_dias') {
        if (licenca && licenca.validade) return licenca.validade;
        return regra.defaultValidade || null;
    }
    return licenca ? licenca.validade : null;
}

// ── Renderizar conteúdo da aba ativa ────────────────────────
function renderLicencasContent() {
    const container = document.getElementById('licencas-content');
    if (!container) return;

    const cfg = LICENCAS_CONFIG[licencasActiveTab];
    const docs = licencasData[licencasActiveTab] || [];
    const hoje = new Date(); hoje.setHours(0,0,0,0);

    const getStatus = (validade, nome, temArquivo, regra) => {
        if (isDocumentoSemValidade(licencasActiveTab, nome)) {
            if (temArquivo) return { label: 'Sem vencimento', color: '#16a34a', bg: '#dcfce7', icon: 'ph-check-circle' };
            return { label: 'Sem documento', color: '#94a3b8', bg: '#f1f5f9', icon: 'ph-minus' };
        }
        if (!validade) return { label: 'Sem data', color: '#94a3b8', bg: '#f1f5f9', icon: 'ph-minus' };
        const d = new Date(validade + 'T12:00:00');
        const diff = Math.ceil((d - hoje) / 86400000);
        // Licenças com vencimento fixo todo dia 01: consideradas vencidas já no próprio dia 01 (diff <= 0)
        if (regra && regra.tipo === 'dia_01' && diff <= 0) {
            return { label: 'Vencida (Dia 01)', color: '#dc2626', bg: '#fee2e2', icon: 'ph-x-circle', diff };
        }
        if (diff < 0)  return { label: 'Vencida',          color: '#dc2626', bg: '#fee2e2', icon: 'ph-x-circle',       diff };
        if (diff <= 30) return { label: `Vence em ${diff}d`, color: '#d97706', bg: '#fef3c7', icon: 'ph-warning-circle',  diff };
        if (diff <= 90) return { label: `Vence em ${diff}d`, color: '#0891b2', bg: '#e0f7fa', icon: 'ph-clock',          diff };
        return { label: 'Regular',            color: '#16a34a', bg: '#dcfce7', icon: 'ph-check-circle',   diff };
    };

    const formatDate = (iso) => {
        if (!iso) return '—';
        const [y, m, d] = iso.split('-');
        return `${d}/${m}/${y}`;
    };

    let vencidasCount = 0;
    let proximasCount = 0;
    let semDocCount = 0;

    // Construir cards de documentos fixos
    const cards = cfg.docs.map(nome => {
        const licenca = docs.find(d => d.nome === nome || (nome === 'PRG' && (d.nome === 'PGR' || d.nome === 'PRG')));
        const temArquivo = !!(licenca && (licenca.file_name || licenca.file_path || licenca.r2_key));
        const regra = getRegraLicenca(licencasActiveTab, nome);
        const validadeEfetiva = getValidadeEfetiva(licencasActiveTab, nome, licenca);
        const emissaoEfetiva = (licenca && licenca.data_emissao) || (regra && regra.defaultEmissao) || null;
        const status = getStatus(validadeEfetiva, nome, temArquivo, regra);
        const vencFormatted = formatDate(validadeEfetiva);
        const emissaoFormatted = emissaoEfetiva ? formatDate(emissaoEfetiva) : null;
        const idSafe = `lic-${licencasActiveTab}-${nome.replace(/[^a-zA-Z0-9]/g,'_')}`;
        const semVal = isDocumentoSemValidade(licencasActiveTab, nome);

        if (!temArquivo) semDocCount++;
        if (validadeEfetiva && !semVal) {
            const dObj = new Date(validadeEfetiva + 'T12:00:00');
            const diffDias = Math.ceil((dObj - hoje) / 86400000);
            if ((regra && regra.tipo === 'dia_01' && diffDias <= 0) || diffDias < 0) vencidasCount++;
            else if (diffDias >= 0 && diffDias <= 30) proximasCount++;
        }

        const mostrarCardAtivo = !!(licenca || validadeEfetiva);

        return `
        <div class="licenca-card ${mostrarCardAtivo ? '' : 'licenca-card-empty'}" id="card-${idSafe}"
             style="border:1.5px solid ${mostrarCardAtivo ? status.color + '44' : '#e2e8f0'}; background:${mostrarCardAtivo ? status.bg : '#fafafa'};">
            <!-- Status strip -->
            <div class="licenca-status-strip" style="background:${status.color};"></div>

            <div class="licenca-card-body">
                <!-- Ícone + Nome -->
                <div class="licenca-card-header">
                    <div class="licenca-doc-icon" style="background:${cfg.bg}; color:${cfg.color}; border:1.5px solid ${cfg.border};">
                        <i class="ph ph-file-pdf"></i>
                    </div>
                    <div style="flex:1; min-width:0;">
                        <div class="licenca-doc-nome">${nome}</div>
                        <div style="display:flex; flex-wrap:wrap; gap:4px; align-items:center; margin-top:2px;">
                            <div class="licenca-empresa-badge" style="background:${cfg.bg}; color:${cfg.color}; border:1px solid ${cfg.border};">
                                ${cfg.label}
                            </div>
                            ${regra ? `<span style="font-size:0.68rem; font-weight:700; padding:2px 7px; border-radius:999px; background:#fff; color:#475569; border:1px solid #cbd5e1;">${regra.badgeTexto}</span>` : ''}
                        </div>
                    </div>
                    <!-- Badge status -->
                    <div class="licenca-status-badge" style="background:${status.bg}; color:${status.color}; border:1px solid ${status.color}33;">
                        <i class="ph ${status.icon}"></i> ${status.label}
                    </div>
                </div>

                <!-- Validade -->
                ${(licenca || validadeEfetiva) ? `
                <div class="licenca-validade-row" style="flex-wrap:wrap; gap:6px;">
                    <i class="ph ${semVal ? 'ph-infinity' : 'ph-calendar-blank'}" style="color:${status.color};"></i>
                    ${emissaoFormatted ? `<span>Emissão: <strong>${emissaoFormatted}</strong> •</span>` : ''}
                    <span>${semVal ? '<strong>Documento sem vencimento</strong>' : `Validade: <strong>${vencFormatted}</strong>`}</span>
                    ${(licenca && licenca.updated_at && temArquivo) ? `<span class="licenca-upload-date">• Atualizado: ${formatDate(licenca.updated_at.substring(0,10))}</span>` : ''}
                    ${!temArquivo ? `<span style="font-size:0.75rem; color:#d97706; font-weight:600;">• PDF pendente de anexo</span>` : ''}
                </div>` : `
                <div class="licenca-validade-row" style="color:#94a3b8;">
                    <i class="ph ph-upload-simple"></i>
                    <span>Nenhum documento cadastrado</span>
                </div>`}

                <!-- Ações -->
                <div class="licenca-card-actions">
                    ${temArquivo ? `
                        <button class="licenca-btn licenca-btn-view" onclick="viewLicenca(${licenca.id})" title="Visualizar PDF">
                            <i class="ph ph-eye"></i> Ver PDF
                        </button>
                        <button class="licenca-btn licenca-btn-edit" onclick="editLicencaModal('${licencasActiveTab}', '${nome.replace(/'/g,"\\'")}', ${licenca.id}, '${validadeEfetiva || ''}', '${emissaoEfetiva || ''}')">
                            <i class="ph ph-pencil"></i> Atualizar
                        </button>
                        <button class="licenca-btn licenca-btn-del" onclick="deleteLicenca(${licenca.id}, '${nome.replace(/'/g,"\\'")}', this)" title="Excluir">
                            <i class="ph ph-trash"></i>
                        </button>
                    ` : `
                        <label class="licenca-btn licenca-btn-upload" style="cursor:pointer;">
                            <i class="ph ph-upload-simple"></i> Anexar PDF
                            <input type="file" accept=".pdf" style="display:none;"
                                onchange="uploadLicenca(this, '${licencasActiveTab}', '${nome.replace(/'/g,"\\'")}', '${validadeEfetiva || ''}', '${emissaoEfetiva || ''}')">
                        </label>
                        ${licenca ? `
                        <button class="licenca-btn licenca-btn-edit" onclick="editLicencaModal('${licencasActiveTab}', '${nome.replace(/'/g,"\\'")}', ${licenca.id}, '${validadeEfetiva || ''}', '${emissaoEfetiva || ''}')" title="Alterar data de vencimento">
                            <i class="ph ph-calendar"></i> Data
                        </button>` : ''}
                    `}
                </div>
            </div>
        </div>`;
    }).join('');

    container.innerHTML = `
        ${cfg.apenasControle ? `
        <div style="margin-bottom:12px; padding:10px 14px; border-radius:10px; background:#f5f3ff; border:1px solid #ddd6fe; color:#5b21b6; font-size:0.84rem; display:flex; align-items:center; gap:8px; font-weight:600;">
            <i class="ph-bold ph-info" style="font-size:1.1rem;"></i>
            <span>As licenças desta aba (<strong>Outras Licenças</strong>) são exclusivas para controle interno de vencimentos e não aparecem no Credenciamento.</span>
        </div>` : ''}

        <!-- Alertas resumo -->
        ${(vencidasCount || proximasCount || semDocCount) ? `
        <div class="licencas-alert-bar">
            ${vencidasCount ? `<div class="licencas-alert-chip" style="background:#fee2e2; color:#dc2626; border:1px solid #fca5a5;"><i class="ph ph-x-circle"></i> ${vencidasCount} vencida${vencidasCount > 1 ? 's' : ''}</div>` : ''}
            ${proximasCount ? `<div class="licencas-alert-chip" style="background:#fef3c7; color:#d97706; border:1px solid #fcd34d;"><i class="ph ph-warning-circle"></i> ${proximasCount} vence${proximasCount > 1 ? 'm' : ''} em 30 dias</div>` : ''}
            ${semDocCount   ? `<div class="licencas-alert-chip" style="background:#f1f5f9; color:#64748b; border:1px solid #cbd5e1;"><i class="ph ph-file-dashed"></i> ${semDocCount} sem PDF anexado</div>` : ''}
        </div>` : `
        <div class="licencas-alert-bar">
            <div class="licencas-alert-chip" style="background:#dcfce7; color:#16a34a; border:1px solid #86efac;"><i class="ph ph-check-circle"></i> Todas as licenças em dia</div>
        </div>`}

        <!-- Barra de busca -->
        <div style="margin-bottom:12px;">
            <div style="position:relative; max-width:380px;">
                <i class="ph ph-magnifying-glass" style="position:absolute; left:12px; top:50%; transform:translateY(-50%); color:#94a3b8; font-size:16px; pointer-events:none;"></i>
                <input type="text" id="licencas-search-input"
                    placeholder="Pesquisar documento..."
                    oninput="filtrarLicencas(this.value)"
                    style="width:100%; padding:9px 12px 9px 36px; border:1.5px solid #e2e8f0; border-radius:10px;
                           font-size:14px; color:#334155; background:#fff; outline:none;
                           box-shadow:0 1px 4px rgba(0,0,0,0.06); transition:border .2s;"
                    onfocus="this.style.borderColor='#6366f1'"
                    onblur="this.style.borderColor='#e2e8f0'"
                    value="${licencasFiltro}"
                >
            </div>
        </div>

        <!-- Grid de cards -->
        <div class="licencas-grid" id="licencas-grid-main">
            ${cards}
            <div id="licencas-sem-resultado" style="display:none; grid-column:1/-1; text-align:center; color:#94a3b8; padding:32px 0;">
                <i class="ph ph-magnifying-glass" style="font-size:32px;"></i>
                <p style="margin-top:8px;">Nenhum documento encontrado para "<span id="lsr-texto"></span>"</p>
            </div>
        </div>
    `;
}

// ── Upload de licença ────────────────────────────────────────
window.uploadLicenca = async function(input, empresa, nome, valSugerida = '', emissaoSugerida = '') {
    const file = input.files[0];
    if (!file) return;

    const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
    const semValidade = isDocumentoSemValidade(empresa, nome);
    const regra = getRegraLicenca(empresa, nome);

    let venc = '';
    let dataEmissao = emissaoSugerida || '';

    if (regra && regra.tipo === 'dia_01') {
        // Vencimento fixo todo dia 01: ao anexar/atualizar no mês, o próximo vencimento é dia 01 do próximo mês
        const proxDia01 = getProximoDia01ISO();
        const promptRes = await promptValidade(nome, proxDia01, empresa, '');
        if (promptRes === null) { input.value = ''; return; }
        venc = promptRes.validade || proxDia01;
    } else if (!semValidade) {
        let valAtual = valSugerida || '';
        if (file.type === 'application/pdf' && (!regra || regra.tipo !== '90_dias')) {
            try {
                if (typeof showToast !== 'undefined') showToast('Analisando documento...', 'info');
                const extractData = new FormData();
                extractData.append('file', file);
                extractData.append('nome', nome);
                const extRes = await fetch('/api/licencas/extrair-validade', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: extractData
                });
                if (extRes.ok) {
                    const extJson = await extRes.json();
                    if (extJson.validade) valAtual = extJson.validade;
                }
            } catch(e) { console.error('Erro na extração:', e); }
        }

        const promptRes = await promptValidade(nome, valAtual, empresa, dataEmissao);
        if (promptRes === null) { input.value = ''; return; }
        venc = promptRes.validade;
        dataEmissao = promptRes.data_emissao || '';
    }

    input.value = '';

    const formData = new FormData();
    formData.append('file', file);
    formData.append('empresa', empresa);
    formData.append('nome', nome);
    formData.append('validade', venc);
    if (dataEmissao) formData.append('data_emissao', dataEmissao);

    try {
        const btn = input.closest('label');
        if (btn) { btn.style.opacity = '0.5'; btn.style.pointerEvents = 'none'; }

        const res = await fetch('/api/licencas', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao fazer upload');

        if (typeof showToast !== 'undefined') showToast(`${nome} anexado com sucesso!`, 'success');
        await loadLicencas();
        renderLicencasContent();
    } catch(e) {
        alert('Erro: ' + e.message);
    }
};

// ── Modal atualizar licença ──────────────────────────────────
window.editLicencaModal = async function(empresa, nome, id, valAtual, emissaoAtual = '') {
    const semValidade = isDocumentoSemValidade(empresa, nome);
    const regra = getRegraLicenca(empresa, nome);
    let venc = '';
    let dataEmissao = emissaoAtual || '';

    if (regra && regra.tipo === 'dia_01') {
        const proxDia01 = getProximoDia01ISO();
        const promptRes = await promptValidade(nome, proxDia01, empresa, '');
        if (promptRes === null) return;
        venc = promptRes.validade || proxDia01;
    } else if (!semValidade) {
        const promptRes = await promptValidade(nome, valAtual, empresa, dataEmissao);
        if (promptRes === null) return;
        venc = promptRes.validade;
        dataEmissao = promptRes.data_emissao || '';
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf';

    const patchValidade = async () => {
        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        const res = await fetch(`/api/licencas/${id}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ validade: venc, data_emissao: dataEmissao })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao atualizar');
        if (typeof showToast !== 'undefined') showToast('Validade atualizada!', 'success');
        await loadLicencas();
        renderLicencasContent();
    };

    input.onchange = async function() {
        if (!this.files[0]) {
            if (!semValidade) await patchValidade();
            return;
        }
        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        const formData = new FormData();
        formData.append('file', this.files[0]);
        formData.append('empresa', empresa);
        formData.append('nome', nome);
        formData.append('validade', venc);
        if (dataEmissao) formData.append('data_emissao', dataEmissao);
        formData.append('_method', 'PUT');
        try {
            const res = await fetch(`/api/licencas/${id}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erro ao atualizar');
            if (typeof showToast !== 'undefined') showToast(`${nome} atualizado!`, 'success');
            await loadLicencas();
            renderLicencasContent();
        } catch(e) { alert('Erro: ' + e.message); }
    };

    if (semValidade) {
        input.click();
    } else {
        if (confirm('Deseja também substituir/anexar o arquivo PDF?')) {
            input.click();
        } else {
            await patchValidade();
        }
    }
};

// ── Visualizar PDF ───────────────────────────────────────────
window.viewLicenca = function(id) {
    const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
    const url = `/api/licencas/${id}/view?token=${encodeURIComponent(token)}`;
    window.open(url, '_blank');
};

// ── Deletar licença ──────────────────────────────────────────
window.deleteLicenca = async function(id, nome, btn) {
    if (!confirm(`Excluir "${nome}"? Esta ação não pode ser desfeita.`)) return;
    const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
    try {
        btn.disabled = true;
        const res = await fetch(`/api/licencas/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error((await res.json()).error || 'Erro');
        if (typeof showToast !== 'undefined') showToast(`${nome} excluído.`, 'info');
        await loadLicencas();
        renderLicencasContent();
    } catch(e) { alert('Erro: ' + e.message); btn.disabled = false; }
};

// ── Prompt de validade (modal nativo ou SweetAlert) ──────────
async function promptValidade(nome, valAtual, empresa = '', emissaoAtual = '') {
    const regra = getRegraLicenca(empresa, nome);
    const is90Dias = !!(regra && regra.tipo === '90_dias');
    const isDia01 = !!(regra && regra.tipo === 'dia_01');

    if (window.Swal) {
        let extraHtml = '';
        if (isDia01) {
            extraHtml = `
                <div style="background:#fff7ed; border:1px solid #fed7aa; border-radius:8px; padding:8px 12px; margin-bottom:12px; font-size:0.82rem; color:#9a3412; text-align:left;">
                    <strong>Regra fixa:</strong> Este documento vence todo <strong>dia 01 de cada mês</strong>. Ao atualizar neste mês, o próximo vencimento é <strong>${valAtual.split('-').reverse().join('/')}</strong>.
                </div>
            `;
        } else if (is90Dias) {
            const emInit = emissaoAtual || regra.defaultEmissao || '';
            extraHtml = `
                <div style="background:#f5f3ff; border:1px solid #ddd6fe; border-radius:8px; padding:10px 12px; margin-bottom:12px; font-size:0.82rem; color:#5b21b6; text-align:left;">
                    <strong>Renovação a cada 90 dias:</strong> Informe a data de emissão para calcular +90 dias automaticamente, ou defina a data de vencimento abaixo.
                    <div style="margin-top:8px;">
                        <label style="display:block; font-size:0.76rem; font-weight:700; margin-bottom:3px;">Data de Emissão (calcula +90 dias):</label>
                        <input id="swal-emissao" type="date" value="${emInit}"
                            onchange="if(this.value){ const [y,m,d]=this.value.split('-').map(Number); const dt=new Date(y,m-1,d,12,0,0); dt.setDate(dt.getDate()+90); document.getElementById('swal-validade').value=dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0')+'-'+String(dt.getDate()).padStart(2,'0'); }"
                            style="width:100%; padding:6px 10px; border:1px solid #c4b5fd; border-radius:6px; font-size:0.9rem;">
                    </div>
                </div>
            `;
        }

        const result = await Swal.fire({
            title: `Validade — ${nome}`,
            html: `
                ${extraHtml}
                <p style="color:#475569; font-size:0.9rem; margin-bottom:0.6rem;">
                    Data de vencimento do documento:
                </p>
                <input id="swal-validade" type="date" class="swal2-input"
                    value="${valAtual || ''}"
                    style="font-size:1rem; padding:0.5rem; margin-top:0;">
            `,
            showCancelButton: true,
            confirmButtonText: 'Confirmar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#d9480f',
            preConfirm: () => {
                const validade = document.getElementById('swal-validade').value || '';
                const emEl = document.getElementById('swal-emissao');
                const data_emissao = emEl ? (emEl.value || '') : '';
                return { validade, data_emissao };
            }
        });
        if (result.isDismissed) return null;
        return result.value;
    }
    const val = prompt(`Data de validade de "${nome}" (AAAA-MM-DD, ou vazio):`, valAtual || '');
    if (val === null) return null;
    return { validade: val, data_emissao: emissaoAtual || '' };
}
