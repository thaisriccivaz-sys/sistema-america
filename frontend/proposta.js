/* ═══════════════════════════════════════════════════════════════════
   MÓDULO: PROPOSTAS COMERCIAIS
   Gerenciamento completo de propostas de locação
   ═══════════════════════════════════════════════════════════════════ */

/* ── Dados de configuração ─────────────────────────────────────────── */
const PROP_TIPOS = [
    'Proposta Obra Mensal', 'Proposta Evento', 'Proposta Obra Diária',
    'Proposta Serviço Avulso', 'Proposta Locação Longa', 'Proposta Reforma'
];
const PROP_FASES = [
    'Em Elaboração', 'Proposta Enviada', 'Em Negociação',
    'Aguardando Aprovação', 'Aprovada', 'Reprovada', 'Cancelada', 'Convertida em OS'
];
const PROP_MODELOS = [
    'Locação Obra', 'Locação Evento', 'Proposta Simplificada', 'Proposta Completa'
];
const PROP_TABELAS = [
    'Locação Mensal Obra (5)', 'Locação Mensal Obra (10)', 'Locação Mensal Obra (20+)',
    'Locação Evento STD', 'Locação Evento LX', 'Tabela Especial Cliente'
];
const PROP_COND_PAG = [
    'À Vista', 'DD 28 Dias', 'DD 30 Dias', 'DD 45 Dias', 'DD 60 Dias',
    '30/60 Dias', 'Boleto 30 Dias', 'Boleto 28 Dias', 'Mensal Antecipado'
];
const PROP_LOCAIS = ['AMERICA RENTAL', 'Filial SP', 'Filial RJ', 'Filial BH', 'Filial Campinas'];
const PROP_TRANSPORTADORAS = ['', 'América Rental', 'Terceirizado', 'Cliente Retira'];
const PROP_FRETES = ['', 'CIF', 'FOB', 'Sem Frete'];

const PROP_STATUS_CORES = {
    'Em Elaboração':        { bg: '#e0f2fe', text: '#0369a1', icon: 'ph-pencil' },
    'Proposta Enviada':     { bg: '#fef9c3', text: '#92400e', icon: 'ph-paper-plane-right' },
    'Em Negociação':        { bg: '#fff7ed', text: '#c2410c', icon: 'ph-arrows-left-right' },
    'Aguardando Aprovação': { bg: '#f3e8ff', text: '#6d28d9', icon: 'ph-clock' },
    'Aprovada':             { bg: '#dcfce7', text: '#166534', icon: 'ph-check-circle' },
    'Reprovada':            { bg: '#fee2e2', text: '#991b1b', icon: 'ph-x-circle' },
    'Cancelada':            { bg: '#f1f5f9', text: '#64748b', icon: 'ph-prohibit' },
    'Convertida em OS':     { bg: '#dbeafe', text: '#1e40af', icon: 'ph-clipboard-text' },
};

let _propostasData = [];
let _propostasEditandoId = null;
let _currentPropostaTab = 'lista'; // 'lista', 'form' ou 'cadastro-cliente'
let _clienteEditandoId = null;
let _clienteContatos = [];
let _clientesCache = [];

// Variáveis de estado para o cadastro de contatos
let _contatoEditandoId = null;
let _empresaSelecionadaId = null;
let _empresaSelecionadaCodigo = null;

/* ── Inicialização ──────────────────────────────────────────────────── */
async function inicializarPropostas() {
    // Redireciona o alert nativo do navegador para o SweetAlert2 com layout unificado
    const originalAlert = window.alert;
    window.alert = function(msg) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: 'Aviso',
                text: msg,
                icon: 'warning',
                confirmButtonText: 'Ok'
            });
        } else {
            originalAlert(msg);
        }
    };

    await carregarPropostas();
    renderTelaPropostas();
}

async function carregarPropostas() {
    try {
        const data = await apiGet('/propostas');
        _propostasData = Array.isArray(data) ? data : [];
    } catch (e) {
        console.error('[PROPOSTAS] Erro ao carregar:', e);
        _propostasData = [];
    }
}

/* ── Render da tela principal ───────────────────────────────────────── */
function renderTelaPropostas() {
    const container = document.getElementById('view-comercial-proposta');
    if (!container) return;

    const hoje = new Date().toLocaleDateString('pt-BR');

    container.innerHTML = `
        <div style="max-width:1400px; margin:0 auto;">

            <!-- STYLE PARA A NAVBAR SAAS -->
            <style>
                /* Estilização personalizada para as caixas de mensagem (SweetAlert2) */
                .swal2-popup {
                    font-family: 'Inter', sans-serif !important;
                    border-radius: 14px !important;
                    padding: 1.5rem !important;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08) !important;
                }
                .swal2-title {
                    font-size: 1.25rem !important;
                    font-weight: 700 !important;
                    color: #1e293b !important;
                }
                .swal2-html-container {
                    font-size: 0.9rem !important;
                    color: #475569 !important;
                    line-height: 1.5 !important;
                }
                .swal2-actions {
                    gap: 0.5rem !important;
                }
                .swal2-confirm {
                    background-color: #2e58a6 !important;
                    color: white !important;
                    border-radius: 6px !important;
                    padding: 0.55rem 1.25rem !important;
                    font-size: 0.85rem !important;
                    font-weight: 600 !important;
                    box-shadow: none !important;
                }
                .swal2-confirm:hover {
                    background-color: #1a3e80 !important;
                }
                .swal2-cancel {
                    background-color: #dc2626 !important;
                    color: white !important;
                    border-radius: 6px !important;
                    padding: 0.55rem 1.25rem !important;
                    font-size: 0.85rem !important;
                    font-weight: 600 !important;
                    box-shadow: none !important;
                }
                .swal2-cancel:hover {
                    background-color: #b91c1c !important;
                }

                .custom-swal-height {
                    width: 1100px !important;
                    height: 500px !important;
                    display: flex !important;
                    flex-direction: column !important;
                }

                .saas-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    background-color: #F4F5F7;
                    padding: 0.6rem 1.5rem;
                    border-radius: 8px;
                    border: 1px solid #E2E8F0;
                    margin-bottom: 0.5rem;
                    font-family: 'Inter', sans-serif;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.02);
                }
                .saas-brand {
                    display: flex;
                    align-items: center;
                    gap: 0.6rem;
                    cursor: pointer;
                    user-select: none;
                }
                .saas-logo-img {
                    height: 28px;
                    width: auto;
                    object-fit: contain;
                }
                .saas-brand-text {
                    font-size: 1rem;
                    font-weight: 800;
                    color: #1E293B;
                    font-family: 'Inter', sans-serif;
                    letter-spacing: 0.03em;
                }
                .saas-nav {
                    display: flex;
                    align-items: center;
                    gap: 0.8rem;
                }
                .saas-nav-item {
                    display: flex;
                    align-items: center;
                    gap: 0.35rem;
                    font-size: 0.85rem;
                    font-weight: 600;
                    color: #64748B;
                    text-decoration: none;
                    padding: 0.45rem 0.75rem;
                    border-radius: 6px;
                    cursor: pointer;
                    transition: all 0.2s;
                    user-select: none;
                }
                .saas-nav-item:hover {
                    color: #1E293B;
                    background-color: #E2E8F0;
                }
                .saas-nav-item.active {
                    color: #7048E8 !important;
                    background-color: #E2E8F0;
                }
                .saas-right-section {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }
                .saas-avatar-btn {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    background-color: #E2E8F0;
                    color: #475569;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 700;
                    font-size: 0.85rem;
                    cursor: pointer;
                    border: none;
                }
                .saas-settings-btn {
                    background: none;
                    border: none;
                    color: #64748B;
                    font-size: 1.25rem;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    padding: 0.25rem;
                    border-radius: 6px;
                }

                /* Regras de Uniformização de Fontes (Baseadas em Cadastro de Contatos) */
                #view-comercial-proposta,
                #view-comercial-proposta input,
                #view-comercial-proposta select,
                #view-comercial-proposta button,
                #view-comercial-proposta textarea,
                #view-comercial-proposta table,
                #view-comercial-proposta label {
                    font-family: 'Inter', sans-serif !important;
                }

                /* Rótulos dos Campos (Labels) */
                .prop-lbl {
                    font-size: 0.75rem !important;
                    font-weight: 700 !important;
                    color: #64748b !important;
                    text-transform: uppercase !important;
                    letter-spacing: 0.02em !important;
                    display: block !important;
                    margin-bottom: 0.25rem !important;
                }

                /* Títulos de Seção */
                #form-proposta h4 {
                    font-size: 0.9rem !important;
                    font-weight: 800 !important;
                    color: #475569 !important;
                    text-transform: uppercase !important;
                    letter-spacing: 0.05em !important;
                    border-bottom: 2px solid #e2e8f0 !important;
                    padding-bottom: 0.4rem !important;
                    margin: 1.5rem 0 1rem 0 !important;
                    display: flex !important;
                    align-items: center !important;
                    gap: 0.5rem !important;
                }

                /* Tamanho de Fonte e Cor de Inputs, Selects e Textareas */
                #form-proposta input,
                #form-proposta select,
                #form-proposta textarea,
                #form-cadastro-cliente input:not([type="checkbox"]),
                #form-cadastro-cliente select {
                    font-size: 0.85rem !important;
                    color: #1e293b !important;
                }
            </style>

            <!-- NOVO CABEÇALHO SAAS -->
            <div class="saas-header">
                <!-- Lado Esquerdo: Logo da Empresa -->
                <div class="saas-brand" onclick="switchPropostaTab('lista')">
                    <img src="logo.png" alt="America Rental" class="saas-logo-img">
                    <span class="saas-brand-text">America Rental</span>
                </div>

                <!-- Centro: Navegação Principal -->
                <div class="saas-nav">
                    <div class="saas-nav-item" id="tab-prop-lista" onclick="switchPropostaTab('lista')">
                        <i class="ph ph-list-bullets"></i> Lista de Propostas
                    </div>
                    <div class="saas-nav-item" id="tab-prop-form" onclick="abrirFormProposta(null)">
                        <i class="ph ph-pencil-simple"></i> Nova Proposta
                    </div>
                    <div class="saas-nav-item" id="tab-prop-cadastro-cliente" onclick="switchPropostaTab('cadastro-cliente')">
                        <i class="ph ph-user-plus"></i> Cadastro de Clientes
                    </div>
                    <div class="saas-nav-item" id="tab-prop-cadastro-contatos" onclick="switchPropostaTab('cadastro-contatos')">
                        <i class="ph ph-identification-card"></i> Cadastro de Contatos
                    </div>
                </div>

                <!-- Lado Direito: Perfil do Usuário -->
                <div class="saas-right-section">
                    <button class="saas-avatar-btn" title="Perfil do Usuário">J</button>
                    <button class="saas-settings-btn" title="Configurações"><i class="ph ph-gear"></i></button>
                </div>
            </div>

            <!-- VIEW: LISTA -->
            <div id="prop-view-lista" style="display:${_currentPropostaTab === 'lista' ? 'block' : 'none'};">
                <div style="display:flex; justify-content:flex-end; margin-bottom:1rem;">
                    <button onclick="abrirFormProposta(null)" style="
                        background:linear-gradient(135deg,#7048e8,#9775fa);
                        color:white; border:none; padding:0.65rem 1.3rem;
                        border-radius:8px; cursor:pointer; font-weight:600;
                        display:flex; align-items:center; gap:0.5rem;
                        font-size:0.9rem; box-shadow:0 4px 12px rgba(112,72,232,0.35);
                        transition:all 0.2s;" onmouseover="this.style.transform='translateY(-1px)'"
                        onmouseout="this.style.transform='translateY(0)'">
                        <i class="ph ph-plus-circle"></i> Nova Proposta
                    </button>
                </div>

                <!-- Cards de resumo -->
                <div id="prop-cards-resumo" style="display:flex; gap:1rem; margin-bottom:1.5rem; flex-wrap:wrap;">
                    ${_renderCardsResumoProp()}
                </div>

                <!-- Filtros -->
                <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:0.9rem 1.1rem; margin-bottom:1rem;">
                    <div style="display:flex; flex-wrap:wrap; gap:0.6rem; align-items:center;">
                        <input id="prop-filtro-texto" type="text" placeholder="🔍 Buscar por cliente, código, tipo..."
                            oninput="filtrarPropostas()"
                            style="flex:2; min-width:200px; padding:0.45rem 0.75rem; border:1px solid #cbd5e1; border-radius:6px; font-size:0.83rem;">
                        <select id="prop-filtro-fase" onchange="filtrarPropostas()"
                            style="flex:1; min-width:160px; padding:0.45rem 0.75rem; border:1px solid #cbd5e1; border-radius:6px; font-size:0.83rem;">
                            <option value="">Todas as Fases</option>
                            ${PROP_FASES.map(f => `<option value="${f}">${f}</option>`).join('')}
                        </select>
                        <input id="prop-filtro-de" type="date" title="Período de" onchange="filtrarPropostas()"
                            style="flex:0 0 auto; padding:0.45rem 0.75rem; border:1px solid #cbd5e1; border-radius:6px; font-size:0.83rem;">
                        <input id="prop-filtro-ate" type="date" title="Período até" onchange="filtrarPropostas()"
                            style="flex:0 0 auto; padding:0.45rem 0.75rem; border:1px solid #cbd5e1; border-radius:6px; font-size:0.83rem;">
                        <button onclick="limparFiltrosPropostas()" style="padding:0.45rem 0.85rem; background:#e2e8f0; border:none; border-radius:6px; cursor:pointer; font-size:0.83rem; color:#475569;">
                            ✕ Limpar
                        </button>
                    </div>
                </div>

                <!-- Tabela -->
                <div style="background:#fff; border-radius:10px; border:1px solid #e2e8f0; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                    <div style="overflow-x:auto;">
                        <table style="width:100%; border-collapse:collapse; font-size:0.87rem; min-width:900px;">
                            <thead>
                                <tr style="background:#f8fafc; border-bottom:2px solid #e2e8f0;">
                                    <th style="padding:0.9rem 1rem; text-align:left; font-weight:700; color:#475569; white-space:nowrap;">Código</th>
                                    <th style="padding:0.9rem 1rem; text-align:left; font-weight:700; color:#475569;">Cliente</th>
                                    <th style="padding:0.9rem 1rem; text-align:left; font-weight:700; color:#475569;">Tipo</th>
                                    <th style="padding:0.9rem 1rem; text-align:left; font-weight:700; color:#475569;">Fase</th>
                                    <th style="padding:0.9rem 1rem; text-align:left; font-weight:700; color:#475569; white-space:nowrap;">Período</th>
                                    <th style="padding:0.9rem 1rem; text-align:left; font-weight:700; color:#475569;">Atendente</th>
                                    <th style="padding:0.9rem 1rem; text-align:left; font-weight:700; color:#475569; white-space:nowrap;">Cadastro</th>
                                    <th style="padding:0.9rem 1rem; text-align:center; font-weight:700; color:#475569;">Ações</th>
                                </tr>
                            </thead>
                            <tbody id="prop-tbody">
                                ${_renderLinhasPropostas(_propostasData)}
                            </tbody>
                        </table>
                    </div>
                </div>

                <p id="prop-count" style="text-align:right; font-size:0.8rem; color:#94a3b8; margin-top:0.5rem;">
                    ${_propostasData.length} proposta(s) encontrada(s)
                </p>
            </div>

            <!-- VIEW: FORMULÁRIO -->
            <div id="prop-view-form" style="display:${_currentPropostaTab === 'form' ? 'block' : 'none'};"></div>

            <!-- VIEW: CADASTRO CLIENTE -->
            <div id="prop-view-cadastro-cliente" style="display:${_currentPropostaTab === 'cadastro-cliente' ? 'block' : 'none'};"></div>

            <!-- VIEW: CADASTRO CONTATOS -->
            <div id="prop-view-cadastro-contatos" style="display:${_currentPropostaTab === 'cadastro-contatos' ? 'block' : 'none'};"></div>

        </div>
    `;

    if (_currentPropostaTab === 'form') {
        _renderFormPropostaInt();
    } else if (_currentPropostaTab === 'cadastro-cliente') {
        _renderCadastroClienteInt();
    } else if (_currentPropostaTab === 'cadastro-contatos') {
        _renderCadastroContatosInt();
    }
}

window.switchPropostaTab = function(tab) {
    _currentPropostaTab = tab;
    
    const viewLista = document.getElementById('prop-view-lista');
    const viewForm = document.getElementById('prop-view-form');
    const viewCadastroCliente = document.getElementById('prop-view-cadastro-cliente');
    const viewCadastroContatos = document.getElementById('prop-view-cadastro-contatos');
    const tabLista = document.getElementById('tab-prop-lista');
    const tabForm = document.getElementById('tab-prop-form');
    const tabCadastroCliente = document.getElementById('tab-prop-cadastro-cliente');
    const tabCadastroContatos = document.getElementById('tab-prop-cadastro-contatos');

    if (viewLista && viewForm && viewCadastroCliente && viewCadastroContatos && tabLista && tabForm && tabCadastroCliente && tabCadastroContatos) {
        if (tab === 'form' && viewForm.innerHTML.trim() === '') {
            _renderFormPropostaInt();
        }
        if (tab === 'cadastro-cliente' && viewCadastroCliente.innerHTML.trim() === '') {
            _renderCadastroClienteInt();
        }
        if (tab === 'cadastro-contatos' && viewCadastroContatos.innerHTML.trim() === '') {
            _renderCadastroContatosInt();
        }

        viewLista.style.display = tab === 'lista' ? 'block' : 'none';
        viewForm.style.display = tab === 'form' ? 'block' : 'none';
        viewCadastroCliente.style.display = tab === 'cadastro-cliente' ? 'block' : 'none';
        viewCadastroContatos.style.display = tab === 'cadastro-contatos' ? 'block' : 'none';

        // Update active class in SaaS Header
        document.querySelectorAll('.saas-nav-item').forEach(item => {
            item.classList.remove('active');
        });

        if (tab === 'lista') tabLista.classList.add('active');
        else if (tab === 'form') tabForm.classList.add('active');
        else if (tab === 'cadastro-cliente') tabCadastroCliente.classList.add('active');
        else if (tab === 'cadastro-contatos') tabCadastroContatos.classList.add('active');
    } else {
        renderTelaPropostas();
    }
};

function _renderCardsResumoProp() {
    const total = _propostasData.length;
    const aprovadas = _propostasData.filter(p => p.fase_negociacao === 'Aprovada').length;
    const emNeg = _propostasData.filter(p => ['Em Negociação','Proposta Enviada','Em Elaboração','Aguardando Aprovação'].includes(p.fase_negociacao)).length;
    const convertidas = _propostasData.filter(p => p.fase_negociacao === 'Convertida em OS').length;

    const cards = [
        { label: 'Total', val: total, icon: 'ph-file-text', bg: '#f5f3ff', text: '#6d28d9', border: '#ddd6fe' },
        { label: 'Em Andamento', val: emNeg, icon: 'ph-arrows-left-right', bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' },
        { label: 'Aprovadas', val: aprovadas, icon: 'ph-check-circle', bg: '#f0fdf4', text: '#166534', border: '#bbf7d0' },
        { label: 'Convertidas em OS', val: convertidas, icon: 'ph-clipboard-text', bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
    ];
    return cards.map(c => `
        <div style="flex:1; min-width:140px; background:${c.bg}; border:1px solid ${c.border}; border-radius:10px; padding:1rem 1.2rem; display:flex; align-items:center; gap:0.85rem;">
            <div style="width:38px; height:38px; background:white; border-radius:9px; display:flex; align-items:center; justify-content:center; box-shadow:0 1px 3px rgba(0,0,0,0.08);">
                <i class="ph ${c.icon}" style="font-size:1.25rem; color:${c.text};"></i>
            </div>
            <div>
                <div style="font-size:1.45rem; font-weight:800; color:${c.text}; line-height:1;">${c.val}</div>
                <div style="font-size:0.75rem; color:${c.text}; opacity:0.8; margin-top:2px;">${c.label}</div>
            </div>
        </div>
    `).join('');
}

function _renderLinhasPropostas(lista) {
    if (!lista || lista.length === 0) {
        return `<tr><td colspan="8" style="padding:3rem; text-align:center; color:#94a3b8;">
            <i class="ph ph-file-dashed" style="font-size:2.5rem; display:block; margin-bottom:0.5rem;"></i>
            Nenhuma proposta encontrada.
        </td></tr>`;
    }

    return lista.map(p => {
        const fase = p.fase_negociacao || 'Em Elaboração';
        const faseStyle = PROP_STATUS_CORES[fase] || { bg: '#f1f5f9', text: '#64748b', icon: 'ph-circle' };
        const periodo = p.periodo_inicio ? `${_fmtData(p.periodo_inicio)} → ${_fmtData(p.periodo_fim)}` : '—';
        const cadastro = _fmtData(p.data_cadastro || p.criado_em);

        return `
        <tr style="border-bottom:1px solid #f1f5f9; transition:background 0.15s;" onmouseover="this.style.background='#fafbff'" onmouseout="this.style.background=''">
            <td style="padding:0.85rem 1rem; font-weight:700; color:#7048e8; white-space:nowrap;">
                ${p.codigo || '—'}
            </td>
            <td style="padding:0.85rem 1rem; color:#1e293b; font-weight:600; max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${p.cliente_nome||''}">
                ${p.cliente_nome || '<span style="color:#94a3b8">—</span>'}
            </td>
            <td style="padding:0.85rem 1rem; color:#475569; font-size:0.83rem; max-width:160px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${p.tipo||''}">
                ${p.tipo || '—'}
            </td>
            <td style="padding:0.85rem 1rem;">
                <span style="background:${faseStyle.bg}; color:${faseStyle.text}; padding:3px 10px; border-radius:12px; font-size:0.78rem; font-weight:600; white-space:nowrap; display:inline-flex; align-items:center; gap:4px;">
                    <i class="ph ${faseStyle.icon}" style="font-size:0.85rem;"></i> ${fase}
                </span>
            </td>
            <td style="padding:0.85rem 1rem; color:#64748b; font-size:0.82rem; white-space:nowrap;">${periodo}</td>
            <td style="padding:0.85rem 1rem; color:#475569; font-size:0.83rem;">${p.atendente || '—'}</td>
            <td style="padding:0.85rem 1rem; color:#64748b; font-size:0.82rem; white-space:nowrap;">${cadastro}</td>
            <td style="padding:0.85rem 1rem; text-align:center; white-space:nowrap;">
                <button onclick="abrirFormProposta(${p.id})" title="Editar" style="background:#f0f4ff; color:#3b5bdb; border:none; padding:5px 10px; border-radius:6px; cursor:pointer; font-size:0.82rem; margin-right:4px; transition:background 0.15s;" onmouseover="this.style.background='#dbeafe'" onmouseout="this.style.background='#f0f4ff'">
                    <i class="ph ph-pencil-simple"></i> Editar
                </button>
                <button onclick="imprimirProposta(${p.id})" title="Imprimir/PDF" style="background:#f0fdf4; color:#16a34a; border:none; padding:5px 10px; border-radius:6px; cursor:pointer; font-size:0.82rem; margin-right:4px;" onmouseover="this.style.background='#dcfce7'" onmouseout="this.style.background='#f0fdf4'">
                    <i class="ph ph-printer"></i>
                </button>
                <button onclick="excluirProposta(${p.id})" title="Excluir" style="background:#fff1f2; color:#e11d48; border:none; padding:5px 10px; border-radius:6px; cursor:pointer; font-size:0.82rem;" onmouseover="this.style.background='#fee2e2'" onmouseout="this.style.background='#fff1f2'">
                    <i class="ph ph-trash"></i>
                </button>
            </td>
        </tr>`;
    }).join('');
}

/* ── Filtros ────────────────────────────────────────────────────────── */
function filtrarPropostas() {
    const texto = (document.getElementById('prop-filtro-texto')?.value || '').toLowerCase().trim();
    const fase  = document.getElementById('prop-filtro-fase')?.value || '';
    const de    = document.getElementById('prop-filtro-de')?.value || '';
    const ate   = document.getElementById('prop-filtro-ate')?.value || '';

    let lista = _propostasData.filter(p => {
        if (texto && ![p.codigo, p.cliente_nome, p.tipo, p.atendente, p.representante].some(f => (f||'').toLowerCase().includes(texto))) return false;
        if (fase && p.fase_negociacao !== fase) return false;
        if (de && p.data_cadastro && p.data_cadastro < de) return false;
        if (ate && p.data_cadastro && p.data_cadastro > ate) return false;
        return true;
    });

    const tbody = document.getElementById('prop-tbody');
    const count = document.getElementById('prop-count');
    if (tbody) tbody.innerHTML = _renderLinhasPropostas(lista);
    if (count) count.textContent = `${lista.length} proposta(s) encontrada(s)`;
}

function limparFiltrosPropostas() {
    ['prop-filtro-texto','prop-filtro-fase','prop-filtro-de','prop-filtro-ate'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    filtrarPropostas();
}

/* ── Formulário (Modal) ─────────────────────────────────────────────── */
function abrirFormProposta(id) {
    _propostasEditandoId = id;
    _currentPropostaTab = 'form';
    
    // Sempre re-renderiza o form ao abrir pelo botão de Editar ou Nova Proposta (para resetar dados)
    if (document.getElementById('prop-view-form')) {
        _renderFormPropostaInt();
    }
    window.switchPropostaTab('form');
}

function _renderFormPropostaInt() {
    const id = _propostasEditandoId;
    const prop = id ? _propostasData.find(p => p.id === id) : null;
    const isNovo = !prop;
    const hoje = new Date().toISOString().split('T')[0];
    const dataCadastroVal = prop && prop.data_cadastro ? prop.data_cadastro : hoje;
    const umaSemanaDepois = (() => {
        const d = new Date(dataCadastroVal + 'T12:00:00');
        d.setDate(d.getDate() + 7);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    })();
    const titulo = isNovo ? '📄 Nova Proposta' : `✏️ Editar Proposta — ${prop.codigo}`;

    const container = document.getElementById('prop-view-form');
    if (!container) return;

    const v = (campo) => prop ? (prop[campo] || '') : '';
    const vn = (campo, def='0') => prop ? (prop[campo] ?? def) : def;

    container.innerHTML = `
        <div style="background:#fff; width:100%; border-radius:14px; box-shadow:0 5px 20px rgba(0,0,0,0.05); overflow:visible; margin:0 auto; border: 1px solid #e2e8f0;">

            <!-- Toolbar -->
            <div style="background:#f8fafc; border-bottom:1px solid #e2e8f0; padding:0.65rem 1.5rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.6rem; position:sticky; top:98px; z-index:997; border-top-left-radius:14px; border-top-right-radius:14px;">
                
                <!-- Badge Lado Esquerdo -->
                <div style="background:#2e58a6; color:white; padding:0.45rem 0.9rem; border-radius:6px; font-weight:700; font-size:0.86rem; display:flex; align-items:center; gap:0.4rem; font-family:'Inter', sans-serif; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <i class="ph ph-presentation-chart" style="font-size:1.15rem;"></i>
                    Proposta de Locação
                </div>

                <!-- Botões de Ação (Lado Direito) -->
                <div style="display:flex; gap:0.4rem; align-items:center; flex-wrap:wrap;">
                    <!-- Icon buttons -->
                    <button onclick="${isNovo ? "Swal.fire('Aviso', 'Salve a proposta primeiro para poder enviá-la por e-mail.', 'warning')" : `abrirPopupEmail(${id})`}" title="Enviar email" style="background:#e2e8f0; color:#475569; border:none; width:34px; height:34px; border-radius:6px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; transition:all 0.15s; outline:none;" onmouseover="this.style.background='#cbd5e1'" onmouseout="this.style.background='#e2e8f0'">
                        <i class="ph ph-envelope-simple" style="font-size:1.15rem;"></i>
                    </button>
                    <button onclick="${isNovo ? "Swal.fire('Aviso', 'Salve a proposta primeiro para poder imprimi-la.', 'warning')" : `imprimirProposta(${id})`}" title="Imprimir" style="background:#e2e8f0; color:#475569; border:none; width:34px; height:34px; border-radius:6px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; transition:all 0.15s; outline:none;" onmouseover="this.style.background='#cbd5e1'" onmouseout="this.style.background='#e2e8f0'">
                        <i class="ph ph-printer" style="font-size:1.15rem;"></i>
                    </button>
                    <button onclick="${isNovo ? "Swal.fire('Aviso', 'Salve a proposta primeiro para poder ver o histórico.', 'warning')" : `abrirLogsAlteracao(${id})`}" title="Histórico de Alterações" style="background:#e2e8f0; color:#475569; border:none; width:34px; height:34px; border-radius:6px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; transition:all 0.15s; outline:none;" onmouseover="this.style.background='#cbd5e1'" onmouseout="this.style.background='#e2e8f0'">
                        <i class="ph ph-clock-counter-clockwise" style="font-size:1.15rem;"></i>
                    </button>
                    <button onclick="recarregarPropostaForm(${id || 'null'})" title="Recarregar" style="background:#e2e8f0; color:#475569; border:none; width:34px; height:34px; border-radius:6px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; transition:all 0.15s; outline:none;" onmouseover="this.style.background='#cbd5e1'" onmouseout="this.style.background='#e2e8f0'">
                        <i class="ph ph-arrows-clockwise" style="font-size:1.15rem;"></i>
                    </button>

                    <!-- Spacer -->
                    <div style="width: 4px;"></div>

                    <!-- Text Buttons -->
                    <button onclick="limparFormPropostaNovo()" style="background:#3b82f6; color:white; border:none; padding:0.45rem 1rem; border-radius:6px; cursor:pointer; font-weight:600; font-size:0.82rem; display:inline-flex; align-items:center; gap:5px; transition:background 0.15s;" onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'" onfocus="this.blur()">
                        <i class="ph ph-file-text" style="font-size:1rem;"></i> Novo
                    </button>
                    <button onclick="salvarPropostaNova()" style="background:#16a34a; color:white; border:none; padding:0.45rem 1rem; border-radius:6px; cursor:pointer; font-weight:600; font-size:0.82rem; display:inline-flex; align-items:center; gap:5px; transition:background 0.15s;" onmouseover="this.style.background='#15803d'" onmouseout="this.style.background='#16a34a'" onfocus="this.blur()">
                        <i class="ph ph-check" style="font-size:1rem;"></i> Salvar
                    </button>
                    <button onclick="fecharFormProposta()" style="background:#dc2626; color:white; border:none; padding:0.45rem 1rem; border-radius:6px; cursor:pointer; font-weight:600; font-size:0.82rem; display:inline-flex; align-items:center; gap:5px; transition:background 0.15s;" onmouseover="this.style.background='#b91c1c'" onmouseout="this.style.background='#dc2626'" onfocus="this.blur()">
                        <i class="ph ph-prohibit" style="font-size:1rem;"></i> Cancelar
                    </button>
                    <button onclick="${isNovo ? "Swal.fire('Aviso', 'Salve a proposta primeiro para poder excluí-la.', 'warning')" : `excluirProposta(${id})`}" style="background:#dc2626; color:white; border:none; padding:0.45rem 1rem; border-radius:6px; cursor:pointer; font-weight:600; font-size:0.82rem; display:inline-flex; align-items:center; gap:5px; transition:background 0.15s;" onmouseover="this.style.background='#b91c1c'" onmouseout="this.style.background='#dc2626'" onfocus="this.blur()">
                        <i class="ph ph-trash" style="font-size:1rem;"></i> Excluir
                    </button>
                    <button onclick="${isNovo ? "Swal.fire('Aviso', 'Salve a proposta primeiro para poder estorná-la.', 'warning')" : `estornarPropostaEdicao()`}" style="background:#64748b; color:white; border:none; padding:0.45rem 1rem; border-radius:6px; cursor:pointer; font-weight:600; font-size:0.82rem; display:inline-flex; align-items:center; gap:5px; transition:background 0.15s;" onmouseover="this.style.background='#475569'" onmouseout="this.style.background='#64748b'" onfocus="this.blur()">
                        <i class="ph ph-arrow-counter-clockwise" style="font-size:1rem;"></i> Estornar
                    </button>
                </div>
            </div>

            <!-- Corpo do formulário -->
            <div style="padding:1.5rem; overflow-y:auto; max-height:78vh;">
                <form id="form-proposta" onsubmit="return false;">

                    <!-- Linha 1: Código, Tipo, Atendente -->
                    <div style="display:grid; grid-template-columns:1fr 2fr 1.5fr; gap:1rem; margin-bottom:1rem;">
                        <div>
                            <label class="prop-lbl">Código</label>
                            <input type="text" id="prop-codigo" value="${v('codigo') || (isNovo ? 'Auto' : '')}" readonly
                                style="width:100%;padding:0.55rem;border:1px solid #e2e8f0;border-radius:6px;background:#f8fafc;color:#64748b;font-size:0.85rem;box-sizing:border-box;">
                        </div>
                        <div>
                            <label class="prop-lbl">Tipo *</label>
                            <select id="prop-tipo" style="width:100%;padding:0.55rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;box-sizing:border-box;">
                                <option value="">-- Selecione --</option>
                                ${PROP_TIPOS.map(t => `<option value="${t}" ${v('tipo')===t?'selected':''}>${t}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="prop-lbl">Atendente</label>
                            <input type="text" id="prop-atendente" value="${v('atendente') || window.currentUser?.nome || window.currentUser?.username || window.currentUser?.email || ''}" readonly
                                style="width:100%;padding:0.55rem;border:1px solid #e2e8f0;border-radius:6px;background:#f8fafc;color:#64748b;font-size:0.85rem;box-sizing:border-box;">
                        </div>
                    </div>

                    <!-- Linha 2: Datas cadastro, previsão, fase, modelo -->
                    <div style="display:grid; grid-template-columns:1fr 1fr 1.5fr 1.5fr; gap:1rem; margin-bottom:1rem;">
                        <div>
                            <label class="prop-lbl">Data Cadastro *</label>
                            <input type="date" id="prop-data-cadastro" value="${v('data_cadastro') || hoje}" onchange="window.calcularPrevisaoFechamento()"
                                style="width:100%;padding:0.55rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;box-sizing:border-box;">
                        </div>
                        <div>
                            <label class="prop-lbl">Previsão Fechamento *</label>
                            <input type="date" id="prop-previsao" value="${v('previsao_fechamento') || umaSemanaDepois}"
                                style="width:100%;padding:0.55rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;box-sizing:border-box;">
                        </div>
                        <div>
                            <label class="prop-lbl">Fase de Negociação *</label>
                            <select id="prop-fase" style="width:100%;padding:0.55rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;box-sizing:border-box;">
                                ${PROP_FASES.map(f => `<option value="${f}" ${v('fase_negociacao')===f?'selected':''}>${f}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="prop-lbl">Modelo de Impressão</label>
                            <select id="prop-modelo" style="width:100%;padding:0.55rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;box-sizing:border-box;">
                                <option value="">-- Selecione --</option>
                                ${PROP_MODELOS.map(m => `<option value="${m}" ${v('modelo_impressao')===m?'selected':''}>${m}</option>`).join('')}
                            </select>
                        </div>
                    </div>

                    <!-- Seção: Cliente e Contato -->
                    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:9px; padding:1rem 1.2rem; margin-bottom:1rem;">
                        <h4 style="margin:0 0 0.85rem; font-size:0.88rem; color:#475569; font-weight:700; display:flex; align-items:center; gap:6px;">
                            <i class="ph ph-buildings" style="color:#7048e8;"></i> Dados do Cliente
                        </h4>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
                            <div>
                                <label class="prop-lbl">Cliente</label>
                                <div style="display:flex; gap:0.4rem; align-items:center;">
                                    <input type="text" id="prop-cliente" value="${v('cliente_nome')}"
                                        style="flex:1;padding:0.55rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;box-sizing:border-box;" placeholder="Nome ou razão do cliente">
                                    <button type="button" onclick="pesquisarClienteProposta()" title="Pesquisar Cliente" style="background:#16a34a; color:white; border:none; width:34px; height:34px; border-radius:6px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; transition:background 0.15s; outline:none;" onmouseover="this.style.background='#15803d'" onmouseout="this.style.background='#16a34a'">
                                        <i class="ph ph-magnifying-glass" style="font-size:1.1rem;"></i>
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label class="prop-lbl">Contato</label>
                                <div style="display:flex; gap:0.4rem; align-items:center;">
                                    <input type="text" id="prop-contato" value="${v('contato_nome')}"
                                        style="flex:1;padding:0.55rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;box-sizing:border-box;" placeholder="Nome do contato">
                                    <button type="button" onclick="pesquisarContatoProposta()" title="Pesquisar Contato" style="background:#16a34a; color:white; border:none; width:34px; height:34px; border-radius:6px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; transition:background 0.15s; outline:none;" onmouseover="this.style.background='#15803d'" onmouseout="this.style.background='#16a34a'">
                                        <i class="ph ph-magnifying-glass" style="font-size:1.1rem;"></i>
                                    </button>
                                    <button type="button" onclick="verDetalhesContatoProposta()" title="Ver Detalhes do Contato" style="background:#0ea5e9; color:white; border:none; width:34px; height:34px; border-radius:6px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; transition:background 0.15s; outline:none;" onmouseover="this.style.background='#0284c7'" onmouseout="this.style.background='#0ea5e9'">
                                        <i class="ph ph-eye" style="font-size:1.1rem;"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Seção: Período e Preços -->
                    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:9px; padding:1rem 1.2rem; margin-bottom:1rem;">
                        <h4 style="margin:0 0 0.85rem; font-size:0.88rem; color:#475569; font-weight:700; display:flex; align-items:center; gap:6px;">
                            <i class="ph ph-calendar-blank" style="color:#7048e8;"></i> Período e Condições
                        </h4>
                        <div style="display:grid; grid-template-columns:1.2fr 1.2fr 0.8fr 1.8fr; gap:1rem; margin-bottom:0.85rem;">
                            <div>
                                <label class="prop-lbl">Período Início *</label>
                                <input type="date" id="prop-periodo-ini" value="${v('periodo_inicio')}"
                                    onchange="calcularDiasContrato(); calcularFimContrato();"
                                    style="width:100%;padding:0.55rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;box-sizing:border-box;">
                            </div>
                            <div>
                                <label class="prop-lbl">Até *</label>
                                <input type="date" id="prop-periodo-fim" value="${v('periodo_fim')}"
                                    onchange="calcularDiasContrato()"
                                    style="width:100%;padding:0.55rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;box-sizing:border-box;">
                            </div>
                            <div>
                                <label class="prop-lbl">Dias Contrato</label>
                                <input type="number" id="prop-dias" value="${vn('dias_contrato','0')}" min="0"
                                    oninput="calcularFimContrato()"
                                    style="width:100%;padding:0.55rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;box-sizing:border-box;">
                            </div>
                            <div>
                                <label class="prop-lbl">Tabela de Preços *</label>
                                <select id="prop-tabela" style="width:100%;padding:0.55rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;box-sizing:border-box;">
                                    <option value="">-- Selecione --</option>
                                    ${PROP_TABELAS.map(t => `<option value="${t}" ${v('tabela_precos')===t?'selected':''}>${t}</option>`).join('')}
                                </select>
                            </div>
                        </div>
                        <div style="display:grid; grid-template-columns:2fr 1fr 1fr 1.5fr; gap:1rem;">
                            <div>
                                <label class="prop-lbl">Endereço de Instalação</label>
                                <input type="text" id="prop-endereco" value="${v('endereco_instalacao')}"
                                    style="width:100%;padding:0.55rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;box-sizing:border-box;" placeholder="Rua, número, cidade, estado">
                            </div>
                            <div>
                                <label class="prop-lbl">Desconto (%)</label>
                                <input type="number" id="prop-desc-pct" value="${vn('desconto_percent','0')}" min="0" max="100" step="0.01"
                                    oninput="calcularDescontoReais()"
                                    style="width:100%;padding:0.55rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;box-sizing:border-box;">
                            </div>
                            <div>
                                <label class="prop-lbl">Desconto (R$)</label>
                                <input type="number" id="prop-desc-rs" value="${vn('desconto_reais','0')}" min="0" step="0.01"
                                    style="width:100%;padding:0.55rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;box-sizing:border-box;">
                            </div>
                            <div>
                                <label class="prop-lbl">Condição de Pagamento *</label>
                                <select id="prop-cond-pag" style="width:100%;padding:0.55rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;box-sizing:border-box;">
                                    <option value="">-- Selecione --</option>
                                    ${PROP_COND_PAG.map(c => `<option value="${c}" ${v('condicao_pagamento')===c?'selected':''}>${c}</option>`).join('')}
                                </select>
                            </div>
                        </div>
                    </div>

                    <!-- Seção: Representante, Frete e Valor -->
                    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:9px; padding:1rem 1.2rem; margin-bottom:1rem;">
                        <h4 style="margin:0 0 0.85rem; font-size:0.88rem; color:#475569; font-weight:700; display:flex; align-items:center; gap:6px;">
                            <i class="ph ph-user-check" style="color:#7048e8;"></i> Representante e Dados do Pedido
                        </h4>
                        <div style="display:grid; grid-template-columns:1fr 1fr 1fr 1fr 1fr 1fr; gap:1rem;">
                            <div style="grid-column:span 2;">
                                <label class="prop-lbl">Representante *</label>
                                <input type="text" id="prop-representante" value="${v('representante') || window.currentUser?.nome || window.currentUser?.username || window.currentUser?.email || ''}" readonly
                                    style="width:100%;padding:0.55rem;border:1px solid #e2e8f0;border-radius:6px;background:#f8fafc;color:#64748b;font-size:0.85rem;box-sizing:border-box;">
                            </div>
                            <div>
                                <label class="prop-lbl">Transportadora</label>
                                <select id="prop-transportadora" style="width:100%;padding:0.55rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;box-sizing:border-box;">
                                    ${PROP_TRANSPORTADORAS.map(t => `<option value="${t}" ${v('transportadora')===t?'selected':''}>${t||'— Nenhuma —'}</option>`).join('')}
                                </select>
                            </div>
                            <div>
                                <label class="prop-lbl">Tipo de Frete</label>
                                <select id="prop-tipo-frete" style="width:100%;padding:0.55rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;box-sizing:border-box;">
                                    ${PROP_FRETES.map(f => `<option value="${f}" ${v('tipo_frete')===f?'selected':''}>${f||'— Nenhum —'}</option>`).join('')}
                                </select>
                            </div>
                            <div>
                                <label class="prop-lbl">Frete Ida (R$)</label>
                                <input type="number" id="prop-frete-ida" value="${vn('valor_frete_ida','0')}" min="0" step="0.01"
                                    style="width:100%;padding:0.55rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;box-sizing:border-box;">
                            </div>
                            <div>
                                <label class="prop-lbl">Frete Volta (R$)</label>
                                <input type="number" id="prop-frete-volta" value="${vn('valor_frete_volta','0')}" min="0" step="0.01"
                                    style="width:100%;padding:0.55rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;box-sizing:border-box;">
                            </div>
                        </div>
                        <div style="margin-top:1rem; display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
                            <div>
                                <label class="prop-lbl">Valor Total (R$)</label>
                                <input type="number" id="prop-valor-total" value="${vn('valor_total','0')}" min="0" step="0.01"
                                    style="width:100%;padding:0.65rem;border:2px solid #7048e8;border-radius:6px;font-size:0.95rem;font-weight:700;color:#4c1d95;box-sizing:border-box;">
                            </div>
                            <div>
                                <label class="prop-lbl">Status</label>
                                <select id="prop-status" style="width:100%;padding:0.55rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;box-sizing:border-box;">
                                    ${['Ativa','Arquivada'].map(s => `<option value="${s}" ${v('status')===s?'selected':''}>${s}</option>`).join('')}
                                </select>
                            </div>
                        </div>
                    </div>

                    <!-- Observações -->
                    <div style="margin-bottom:0.5rem;">
                        <label class="prop-lbl">Observações</label>
                        <textarea id="prop-obs" rows="3" style="width:100%;padding:0.6rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;resize:vertical;box-sizing:border-box;" placeholder="Informações adicionais sobre a proposta...">${v('observacoes')}</textarea>
                    </div>

                </form>
            </div>
    `;
}

window.verClienteProposta = async function(id) {
    const p = _propostasData.find(pr => pr.id === id);
    if (!p || !p.cliente_nome) {
        Swal.fire('Aviso', 'Nenhum cliente selecionado nesta proposta.', 'warning');
        return;
    }
    try {
        const clientes = await apiGet('/clientes');
        const cliente = clientes.find(c => c.nome_razao_social.toLowerCase() === p.cliente_nome.toLowerCase());
        if (cliente) {
            Swal.fire({
                title: `<div style="font-size:1.15rem; font-weight:700; color:#1e293b; text-align:left; border-bottom:2px solid #e2e8f0; padding-bottom:8px;"><i class="ph ph-buildings"></i> Dados do Cliente</div>`,
                html: `
                    <div style="text-align:left; font-family:'Inter', sans-serif; font-size:0.85rem; display:flex; flex-direction:column; gap:0.5rem; line-height:1.4;">
                        <p><b>Código:</b> ${cliente.codigo}</p>
                        <p><b>Razão Social:</b> ${cliente.nome_razao_social}</p>
                        <p><b>CPF/CNPJ:</b> ${cliente.cpf_cnpj || '—'}</p>
                        <p><b>Telefone:</b> ${cliente.telefone || '—'}</p>
                        <p><b>E-mail:</b> ${cliente.email || '—'}</p>
                        <p><b>Endereço:</b> ${cliente.endereco || '—'}, ${cliente.numero || ''} - ${cliente.bairro || ''}</p>
                        <p><b>Município:</b> ${cliente.municipio || '—'} / ${cliente.uf || ''}</p>
                    </div>
                `,
                confirmButtonColor: '#3b82f6',
                confirmButtonText: 'Fechar'
            });
        } else {
            Swal.fire('Aviso', 'Cliente não encontrado no cadastro.', 'warning');
        }
    } catch(e) {
        console.error(e);
        Swal.fire('Erro', 'Não foi possível carregar os dados do cliente.', 'error');
    }
};

window.abrirWhatsAppProposta = async function(id) {
    const p = _propostasData.find(pr => pr.id === id);
    if (!p || !p.contato_nome) {
        Swal.fire('Aviso', 'Nenhum contato selecionado nesta proposta.', 'warning');
        return;
    }
    try {
        const contatos = await apiGet('/contatos');
        const contato = contatos.find(c => c.nome.toLowerCase() === p.contato_nome.toLowerCase());
        if (contato && contato.celular) {
            const cleanCel = contato.celular.replace(/\D/g, '');
            if (cleanCel) {
                window.open(`https://wa.me/55${cleanCel}`, '_blank');
                return;
            }
        }
        Swal.fire('Aviso', 'Celular do contato não cadastrado ou inválido.', 'warning');
    } catch (e) {
        console.error(e);
        Swal.fire('Erro', 'Não foi possível buscar o contato.', 'error');
    }
};

window.recarregarPropostaForm = async function(id) {
    if (!id) {
        _renderFormPropostaInt();
        return;
    }
    Swal.fire({
        title: 'Recarregando...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });
    try {
        await carregarPropostas();
        Swal.close();
        _renderFormPropostaInt();
        if (typeof mostrarToastSucesso === 'function') {
            mostrarToastSucesso('Dados da proposta atualizados!');
        }
    } catch(e) {
        Swal.close();
        console.error(e);
    }
};

window.fecharFormProposta = function() {
    _propostasEditandoId = null;
    const viewForm = document.getElementById('prop-view-form');
    if (viewForm) viewForm.innerHTML = '';
    window.switchPropostaTab('lista');
};

/* ── Redirecionamentos e Pesquisas de Clientes / Contatos na Proposta ── */
let _redirectAfterClientSave = false;
let _redirectAfterContactSave = false;

window.pesquisarClienteProposta = async function() {
    const query = document.getElementById('prop-cliente').value.trim();
    if (!query) {
        Swal.fire({
            title: 'Cliente não informado',
            text: 'Deseja abrir o formulário de Cadastro de Clientes?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sim, cadastrar',
            cancelButtonText: 'Não',
            confirmButtonColor: '#2e58a6',
            cancelButtonColor: '#64748b'
        }).then((res) => {
            if (res.isConfirmed) {
                _redirectAfterClientSave = true;
                window.switchPropostaTab('cadastro-cliente');
                window.limparFormCliente();
            }
        });
        return;
    }

    try {
        const clientes = await apiGet('/clientes');
        const filtrados = clientes.filter(c => 
            (c.nome_razao_social && c.nome_razao_social.toLowerCase().includes(query.toLowerCase())) ||
            (c.codigo && c.codigo.toString() === query)
        );

        if (filtrados.length >= 1) {
            const rowsHtml = filtrados.map(c => `
                <tr onclick="window.selectClienteProposta('${c.nome_razao_social.replace(/'/g, "\\'")}')" style="cursor:pointer; border-bottom:1px solid #e2e8f0;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background=''">
                    <td style="padding:0.5rem; text-align:left; font-weight:bold; color:#2e58a6;">${c.codigo}</td>
                    <td style="padding:0.5rem; text-align:left;">${c.nome_razao_social}</td>
                    <td style="padding:0.5rem; text-align:left;">${c.cpf_cnpj || '—'}</td>
                </tr>
            `).join('');

            window.selectClienteProposta = function(nome) {
                document.getElementById('prop-cliente').value = nome;
                Swal.close();
            };

            Swal.fire({
                title: 'Selecione o Cliente',
                html: `
                    <div style="max-height:300px; overflow-y:auto; width:100%;">
                        <table style="width:100%; border-collapse:collapse; font-size:0.8rem; text-align:left; font-family:'Inter', sans-serif;">
                            <thead>
                                <tr style="background:#f8fafc; border-bottom:2px solid #cbd5e1; color:#475569;">
                                    <th style="padding:0.5rem;">Código</th>
                                    <th style="padding:0.5rem;">Razão Social</th>
                                    <th style="padding:0.5rem;">CPF / CNPJ</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rowsHtml}
                            </tbody>
                        </table>
                    </div>
                `,
                showConfirmButton: true,
                confirmButtonText: '<i class="ph ph-plus-circle"></i> Cadastrar Novo',
                confirmButtonColor: '#16a34a',
                showCancelButton: true,
                cancelButtonText: 'Fechar',
                cancelButtonColor: '#64748b'
            }).then((res) => {
                if (res.isConfirmed) {
                    _redirectAfterClientSave = true;
                    window.switchPropostaTab('cadastro-cliente');
                    window.limparFormCliente();
                    setTimeout(() => {
                        const rSocialInput = document.getElementById('cli-razao-social');
                        if (rSocialInput) rSocialInput.value = query;
                    }, 300);
                }
            });
        } else {
            Swal.fire({
                title: 'Cliente não cadastrado',
                text: `Nenhum cliente encontrado com "${query}". Deseja abrir o Cadastro de Clientes?`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Sim, cadastrar',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#2e58a6',
                cancelButtonColor: '#64748b'
            }).then((res) => {
                if (res.isConfirmed) {
                    _redirectAfterClientSave = true;
                    window.switchPropostaTab('cadastro-cliente');
                    window.limparFormCliente();
                    setTimeout(() => {
                        const rSocialInput = document.getElementById('cli-razao-social');
                        if (rSocialInput) rSocialInput.value = query;
                    }, 300);
                }
            });
        }
    } catch (e) {
        console.error(e);
        Swal.fire('Erro', 'Não foi possível buscar clientes.', 'error');
    }
};

window.pesquisarContatoProposta = async function() {
    const clienteNome = document.getElementById('prop-cliente').value.trim();
    if (!clienteNome) {
        Swal.fire('Aviso', 'Por favor, selecione o cliente primeiro para buscar os contatos.', 'warning');
        return;
    }

    const query = document.getElementById('prop-contato').value.trim();

    try {
        const contatos = await apiGet('/contatos');
        const filtrados = contatos.filter(c => {
            const matchCliente = c.cliente_nome && c.cliente_nome.toLowerCase() === clienteNome.toLowerCase();
            if (!matchCliente) return false;
            
            if (query) {
                return (c.nome && c.nome.toLowerCase().includes(query.toLowerCase())) ||
                       (c.codigo && c.codigo.toString() === query);
            }
            return true;
        });

        // Buscar clientes para obter dados do cliente atual
        const clientes = await apiGet('/clientes') || [];
        const foundCli = clientes.find(c => c.nome_razao_social && c.nome_razao_social.toLowerCase() === clienteNome.toLowerCase());

        const handleRedirecionamentoContato = () => {
            _redirectAfterContactSave = true;
            window.switchPropostaTab('cadastro-contatos');
            window.limparFormContato();
            setTimeout(async () => {
                const nameInput = document.getElementById('con-nome');
                if (nameInput) nameInput.value = query;
                if (foundCli) {
                    await window.carregarEmpresaSelecionada(foundCli.id);
                } else {
                    const empRazaoInput = document.getElementById('emp-razao-social');
                    if (empRazaoInput) {
                        empRazaoInput.value = clienteNome;
                        empRazaoInput.dispatchEvent(new Event('input'));
                    }
                }
            }, 300);
        };

        if (filtrados.length >= 1) {
            const rowsHtml = filtrados.map(c => `
                <tr onclick="window.selectContatoProposta('${c.nome.replace(/'/g, "\\'")}')" style="cursor:pointer; border-bottom:1px solid #e2e8f0;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background=''">
                    <td style="padding:0.5rem; text-align:left; font-weight:bold; color:#2e58a6;">${c.codigo}</td>
                    <td style="padding:0.5rem; text-align:left;">${c.nome}</td>
                    <td style="padding:0.5rem; text-align:left;">${c.cargo || '—'}</td>
                </tr>
            `).join('');

            window.selectContatoProposta = function(nome) {
                document.getElementById('prop-contato').value = nome;
                Swal.close();
            };

            Swal.fire({
                title: 'Selecione o Contato',
                html: `
                    <div style="max-height:300px; overflow-y:auto; width:100%;">
                        <table style="width:100%; border-collapse:collapse; font-size:0.8rem; text-align:left; font-family:'Inter', sans-serif;">
                            <thead>
                                <tr style="background:#f8fafc; border-bottom:2px solid #cbd5e1; color:#475569;">
                                    <th style="padding:0.5rem;">Código</th>
                                    <th style="padding:0.5rem;">Nome</th>
                                    <th style="padding:0.5rem;">Cargo</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rowsHtml}
                            </tbody>
                        </table>
                    </div>
                `,
                showConfirmButton: true,
                confirmButtonText: '<i class="ph ph-plus-circle"></i> Cadastrar Novo',
                confirmButtonColor: '#16a34a',
                showCancelButton: true,
                cancelButtonText: 'Fechar',
                cancelButtonColor: '#64748b'
            }).then((res) => {
                if (res.isConfirmed) {
                    handleRedirecionamentoContato();
                }
            });
        } else {
            Swal.fire({
                title: 'Contato não cadastrado',
                text: query 
                    ? `Nenhum contato encontrado com "${query}" para o cliente "${clienteNome}". Deseja abrir o Cadastro de Contatos?`
                    : `Nenhum contato cadastrado para o cliente "${clienteNome}". Deseja abrir o Cadastro de Contatos?`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Sim, cadastrar',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#2e58a6',
                cancelButtonColor: '#64748b'
            }).then((res) => {
                if (res.isConfirmed) {
                    handleRedirecionamentoContato();
                }
            });
        }
    } catch (e) {
        console.error(e);
        Swal.fire('Erro', 'Não foi possível buscar contatos.', 'error');
    }
};

window.verDetalhesContatoProposta = async function() {
    const nomeContato = document.getElementById('prop-contato').value.trim();
    if (!nomeContato) {
        Swal.fire('Aviso', 'Por favor, selecione ou digite o nome de um contato primeiro.', 'warning');
        return;
    }

    try {
        const contatos = await apiGet('/contatos');
        const contato = contatos.find(c => c.nome.toLowerCase() === nomeContato.toLowerCase());
        if (contato) {
            Swal.fire({
                title: `<div style="font-size:1.15rem; font-weight:700; color:#1e293b; text-align:left; border-bottom:2px solid #e2e8f0; padding-bottom:8px;"><i class="ph ph-user"></i> Detalhes do Contato</div>`,
                html: `
                    <div style="text-align:left; font-family:'Inter', sans-serif; font-size:0.85rem; display:flex; flex-direction:column; gap:0.5rem; line-height:1.4;">
                        <p><b>Código:</b> ${contato.codigo}</p>
                        <p><b>Nome:</b> ${contato.nome}</p>
                        <p><b>Tipo:</b> ${contato.tipo || '—'}</p>
                        <p><b>Cargo:</b> ${contato.cargo || '—'}</p>
                        <p><b>Departamento:</b> ${contato.departamento || '—'}</p>
                        <p><b>E-mail:</b> ${contato.email || '—'}</p>
                        <p><b>Celular:</b> ${contato.celular || '—'}</p>
                        <p><b>Telefone:</b> ${contato.telefone || '—'} ${contato.ramal ? 'Ramal: ' + contato.ramal : ''}</p>
                    </div>
                `,
                confirmButtonColor: '#3b82f6',
                confirmButtonText: 'Fechar'
            });
        } else {
            Swal.fire('Aviso', 'Contato não cadastrado ou não encontrado.', 'warning');
        }
    } catch(e) {
        console.error(e);
        Swal.fire('Erro', 'Não foi possível carregar os detalhes do contato.', 'error');
    }
};

/* ── Cálculos auxiliares ────────────────────────────────────────────── */
window.calcularPrevisaoFechamento = function() {
    const dataCad = document.getElementById('prop-data-cadastro')?.value;
    const previsaoEl = document.getElementById('prop-previsao');
    if (!dataCad || !previsaoEl) return;
    const date = new Date(dataCad + 'T12:00:00');
    date.setDate(date.getDate() + 7);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    previsaoEl.value = `${yyyy}-${mm}-${dd}`;
};

window.calcularDiasContrato = function() {
    const ini = document.getElementById('prop-periodo-ini')?.value;
    const fim = document.getElementById('prop-periodo-fim')?.value;
    const diasEl = document.getElementById('prop-dias');
    if (!ini || !fim || !diasEl) return;
    const diff = Math.ceil((new Date(fim + 'T12:00:00') - new Date(ini + 'T12:00:00')) / (1000 * 60 * 60 * 24));
    if (diff >= 0) diasEl.value = diff;
};

window.calcularFimContrato = function() {
    const ini = document.getElementById('prop-periodo-ini')?.value;
    const dias = parseInt(document.getElementById('prop-dias')?.value || 0);
    const fimEl = document.getElementById('prop-periodo-fim');
    if (!ini || !fimEl || dias <= 0) return;
    const date = new Date(ini + 'T12:00:00');
    date.setDate(date.getDate() + dias);
    fimEl.value = date.toISOString().split('T')[0];
};

function calcularDescontoReais() {
    const pct = parseFloat(document.getElementById('prop-desc-pct')?.value || 0);
    const total = parseFloat(document.getElementById('prop-valor-total')?.value || 0);
    const rsEl = document.getElementById('prop-desc-rs');
    if (rsEl && total > 0) rsEl.value = (total * pct / 100).toFixed(2);
}

/* ── Botões CRUD e Envio ─────────────────────────────────────────────── */
window.limparFormPropostaNovo = function() {
    _propostasEditandoId = null;
    _renderFormPropostaInt();
    if (typeof mostrarToastSucesso === 'function') {
        mostrarToastSucesso('Campos limpos. Pronto para criar nova proposta.');
    }
};

window.salvarPropostaNova = async function() {
    const obter = (id) => document.getElementById(id)?.value || '';
    const obterN = (id) => parseFloat(document.getElementById(id)?.value || 0);

    const tipo = obter('prop-tipo');
    const fase = obter('prop-fase');
    const dataCad = obter('prop-data-cadastro');

    if (!tipo) { alert('Selecione o Tipo da proposta.'); return; }
    if (!dataCad) { alert('Informe a Data de Cadastro.'); return; }

    const payload = {
        local: obter('prop-local') || 'AMERICA RENTAL',
        tipo,
        atendente: obter('prop-atendente'),
        data_cadastro: dataCad,
        previsao_fechamento: obter('prop-previsao'),
        fase_negociacao: fase,
        modelo_impressao: obter('prop-modelo'),
        cliente_nome: obter('prop-cliente'),
        contato_nome: obter('prop-contato'),
        periodo_inicio: obter('prop-periodo-ini'),
        periodo_fim: obter('prop-periodo-fim'),
        hora_inicio: obter('prop-hora-ini') || '00:00',
        hora_fim: obter('prop-hora-fim') || '00:00',
        dias_contrato: parseInt(obter('prop-dias') || 0),
        tabela_precos: obter('prop-tabela'),
        endereco_instalacao: obter('prop-endereco'),
        desconto_percent: obterN('prop-desc-pct'),
        desconto_reais: obterN('prop-desc-rs'),
        condicao_pagamento: obter('prop-cond-pag'),
        representante: obter('prop-representante'),
        transportadora: obter('prop-transportadora'),
        tipo_frete: obter('prop-tipo-frete'),
        valor_frete_ida: obterN('prop-frete-ida'),
        valor_frete_volta: obterN('prop-frete-volta'),
        observacoes: obter('prop-obs'),
        valor_total: obterN('prop-valor-total'),
        status: obter('prop-status'),
        criado_por: window.currentUser?.nome || window.currentUser?.email || '',
    };

    try {
        const resp = await apiPost('/propostas', payload);
        if (resp && (resp.success || resp.id)) {
            fecharFormProposta();
            await carregarPropostas();
            renderTelaPropostas();
            if (typeof mostrarToastSucesso === 'function') {
                mostrarToastSucesso(`Proposta ${resp.codigo} criada com contrato ${resp.contrato} com sucesso!`);
            }
        } else {
            alert('Erro ao salvar proposta: ' + (resp?.error || 'Erro desconhecido'));
        }
    } catch (e) {
        console.error('[PROPOSTAS] Erro ao salvar:', e);
        alert('Erro ao comunicar com o servidor.');
    }
};

window.estornarPropostaEdicao = async function() {
    if (!_propostasEditandoId) {
        alert('Nenhuma proposta para estornar.');
        return;
    }

    const obter = (id) => document.getElementById(id)?.value || '';
    const obterN = (id) => parseFloat(document.getElementById(id)?.value || 0);

    const tipo = obter('prop-tipo');
    const dataCad = obter('prop-data-cadastro');

    if (!tipo) { alert('Selecione o Tipo da proposta.'); return; }
    if (!dataCad) { alert('Informe a Data de Cadastro.'); return; }

    const payload = {
        local: obter('prop-local') || 'AMERICA RENTAL',
        tipo,
        atendente: obter('prop-atendente'),
        data_cadastro: dataCad,
        previsao_fechamento: obter('prop-previsao'),
        fase_negociacao: 'Aguardando Aprovação', // Estorna e libera para aprovação novamente
        modelo_impressao: obter('prop-modelo'),
        cliente_nome: obter('prop-cliente'),
        contato_nome: obter('prop-contato'),
        periodo_inicio: obter('prop-periodo-ini'),
        periodo_fim: obter('prop-periodo-fim'),
        hora_inicio: obter('prop-hora-ini') || '00:00',
        hora_fim: obter('prop-hora-fim') || '00:00',
        dias_contrato: parseInt(obter('prop-dias') || 0),
        tabela_precos: obter('prop-tabela'),
        endereco_instalacao: obter('prop-endereco'),
        desconto_percent: obterN('prop-desc-pct'),
        desconto_reais: obterN('prop-desc-rs'),
        condicao_pagamento: obter('prop-cond-pag'),
        representante: obter('prop-representante'),
        transportadora: obter('prop-transportadora'),
        tipo_frete: obter('prop-tipo-frete'),
        valor_frete_ida: obterN('prop-frete-ida'),
        valor_frete_volta: obterN('prop-frete-volta'),
        observacoes: obter('prop-obs'),
        valor_total: obterN('prop-valor-total'),
        status: obter('prop-status'),
        criado_por: window.currentUser?.nome || window.currentUser?.email || '',
    };

    try {
        const resp = await apiPut(`/propostas/${_propostasEditandoId}`, payload);
        if (resp && resp.success) {
            fecharFormProposta();
            await carregarPropostas();
            renderTelaPropostas();
            if (typeof mostrarToastSucesso === 'function') {
                mostrarToastSucesso('Alterações salvas e proposta liberada para aprovação!');
            }
        } else {
            alert('Erro ao salvar proposta: ' + (resp?.error || 'Erro desconhecido'));
        }
    } catch (e) {
        console.error('[PROPOSTAS] Erro ao estornar:', e);
        alert('Erro ao comunicar com o servidor.');
    }
};

window.salvarProposta = function() {
    // Mantido por compatibilidade
    window.salvarPropostaNova();
};

window.abrirPopupEmail = function(id) {
    const p = _propostasData.find(pr => pr.id === id);
    if (!p) { alert('Proposta não encontrada.'); return; }

    const tipoServico = p.tipo || 'Serviço';
    const codigoProp = p.codigo || '';

    const headerText = `Enviar Proposta de ${tipoServico} N° ${codigoProp} por email`;
    const defaultSubject = `Proposta de ${tipoServico} - N° ${codigoProp}`;

    Swal.fire({
        title: `<div style="font-size:1.1rem; font-weight:700; color:#4c1d95; text-align:left; border-bottom:2px solid #e2e8f0; padding-bottom:8px; width:100%;"><i class="ph ph-paper-plane-right"></i> ${headerText}</div>`,
        html: `
            <div style="text-align:left; display:flex; flex-direction:column; gap:0.75rem; font-family:'Inter', sans-serif; font-size:0.85rem; width:100%; box-sizing:border-box;">
                <div>
                    <label style="font-weight:700; color:#475569; display:block; margin-bottom:4px;">Assunto</label>
                    <input type="text" id="email-assunto" value="${defaultSubject}" style="width:100%; padding:0.5rem; border:1px solid #cbd5e1; border-radius:6px; font-size:0.85rem; box-sizing:border-box;">
                </div>
                <div>
                    <label style="font-weight:700; color:#475569; display:block; margin-bottom:4px;">Destinatário(s) - Utilize; para separar destinatários.</label>
                    <input type="text" id="email-destinatarios" placeholder="email1@empresa.com; email2@empresa.com" style="width:100%; padding:0.5rem; border:1px solid #cbd5e1; border-radius:6px; font-size:0.85rem; box-sizing:border-box;">
                </div>
                <div>
                    <label style="font-weight:700; color:#475569; display:block; margin-bottom:4px;">Corpo do email</label>
                    <div style="border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; background: #fff; width:100%; box-sizing:border-box;">
                        <!-- Barra de ferramentas do editor -->
                        <div style="background: #f1f5f9; border-bottom: 1px solid #cbd5e1; padding: 0.35rem; display: flex; gap: 0.25rem; flex-wrap:wrap;">
                            <button type="button" onclick="document.execCommand('bold', false, null)" style="background: #fff; border: 1px solid #cbd5e1; border-radius: 4px; padding: 0.25rem 0.5rem; cursor: pointer; font-weight: bold; font-size: 0.8rem;" title="Negrito">B</button>
                            <button type="button" onclick="document.execCommand('italic', false, null)" style="background: #fff; border: 1px solid #cbd5e1; border-radius: 4px; padding: 0.25rem 0.5rem; cursor: pointer; font-style: italic; font-size: 0.8rem;" title="Itálico">I</button>
                            <button type="button" onclick="document.execCommand('underline', false, null)" style="background: #fff; border: 1px solid #cbd5e1; border-radius: 4px; padding: 0.25rem 0.5rem; cursor: pointer; text-decoration: underline; font-size: 0.8rem;" title="Sublinhado">U</button>
                            <button type="button" onclick="document.execCommand('insertUnorderedList', false, null)" style="background: #fff; border: 1px solid #cbd5e1; border-radius: 4px; padding: 0.25rem 0.5rem; cursor: pointer; font-size: 0.8rem;" title="Lista">• Lista</button>
                            <button type="button" onclick="document.execCommand('insertOrderedList', false, null)" style="background: #fff; border: 1px solid #cbd5e1; border-radius: 4px; padding: 0.25rem 0.5rem; cursor: pointer; font-size: 0.8rem;" title="Numeração">1. Lista</button>
                        </div>
                        <!-- Area editavel -->
                        <div id="email-corpo-editor" contenteditable="true" style="min-height: 120px; max-height: 220px; overflow-y: auto; padding: 0.55rem; font-size: 0.85rem; outline: none; box-sizing:border-box;">
                            Olá,<br><br>Seguem em anexo os detalhes da proposta comercial em PDF.<br><br>Atenciosamente,<br>${p.atendente || 'America Rental'}
                        </div>
                    </div>
                </div>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: '<i class="ph ph-paper-plane-tilt"></i> Enviar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#7048e8',
        cancelButtonColor: '#64748b',
        focusConfirm: false,
        preConfirm: () => {
            const assunto = document.getElementById('email-assunto').value.trim();
            const destinatarios = document.getElementById('email-destinatarios').value.trim();
            const corpo = document.getElementById('email-corpo-editor').innerHTML;
            
            if (!destinatarios) {
                Swal.showValidationMessage('Por favor, informe os destinatários.');
                return false;
            }
            return { assunto, destinatarios, corpo };
        }
    }).then(async (result) => {
        if (result.isConfirmed) {
            Swal.fire({
                title: 'Enviando e-mail...',
                html: 'Gerando PDF da proposta e transmitindo e-mail. Por favor, aguarde.',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            try {
                const resp = await apiPost(`/propostas/${id}/enviar-email`, result.value);
                Swal.close();
                if (resp && resp.success) {
                    if (typeof mostrarToastSucesso === 'function') {
                        mostrarToastSucesso('E-mail enviado com sucesso!');
                    } else {
                        Swal.fire('Sucesso', 'E-mail enviado com sucesso com PDF em anexo!', 'success');
                    }
                } else {
                    Swal.fire('Erro', 'Falha ao enviar e-mail: ' + (resp?.error || 'Erro de rede'), 'error');
                }
            } catch (e) {
                Swal.close();
                console.error(e);
                Swal.fire('Erro', 'Erro ao conectar com o servidor: ' + e.message, 'error');
            }
        }
    });
};

window.abrirLogsAlteracao = async function(id) {
    Swal.fire({
        title: 'Carregando logs...',
        html: '<i class="ph ph-spinner ph-spin" style="font-size:2rem; color:#7048e8;"></i>',
        showConfirmButton: false,
        allowOutsideClick: false
    });

    try {
        const logs = await apiGet(`/propostas/${id}/logs`);
        Swal.close();

        if (!logs || logs.length === 0) {
            Swal.fire({
                title: 'Logs de Alteração',
                text: 'Nenhuma alteração registrada para esta proposta até o momento.',
                icon: 'info',
                confirmButtonColor: '#7048e8'
            });
            return;
        }

        const rowsHtml = logs.map(log => {
            const dataHora = new Date(log.data_hora).toLocaleString('pt-BR');
            return `
                <tr style="border-bottom:1px solid #f1f5f9; font-size:0.75rem;">
                    <td style="padding:0.4rem; white-space:nowrap;">${dataHora}</td>
                    <td style="padding:0.4rem; font-weight:600; color:#475569;">${log.usuario}</td>
                    <td style="padding:0.4rem; font-weight:600; color:#7048e8;">${log.campo}</td>
                    <td style="padding:0.4rem; color:#dc2626; max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${log.conteudo_anterior||''}">${log.conteudo_anterior || '—'}</td>
                    <td style="padding:0.4rem; color:#16a34a; max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${log.conteudo_atual||''}">${log.conteudo_atual || '—'}</td>
                </tr>
            `;
        }).join('');

        Swal.fire({
            title: '<div style="font-size:1.1rem; font-weight:700; color:#1e293b; text-align:left; border-bottom:2px solid #e2e8f0; padding-bottom:8px; width:100%;"><i class="ph ph-list-checks"></i> Histórico de Alterações</div>',
            html: `
                <div style="max-height:350px; overflow-y:auto; width:100%; box-sizing:border-box;">
                    <table style="width:100%; border-collapse:collapse; text-align:left; font-family:'Inter', sans-serif;">
                        <thead>
                            <tr style="background:#f8fafc; border-bottom:2px solid #cbd5e1; color:#475569; font-size:0.75rem; font-weight:700;">
                                <th style="padding:0.4rem;">Data/Hora</th>
                                <th style="padding:0.4rem;">Usuário</th>
                                <th style="padding:0.4rem;">Campo</th>
                                <th style="padding:0.4rem;">Anterior</th>
                                <th style="padding:0.4rem;">Atual</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsHtml}
                        </tbody>
                    </table>
                </div>
            `,
            width: '750px',
            confirmButtonText: 'Fechar',
            confirmButtonColor: '#7048e8'
        });

    } catch (e) {
        Swal.close();
        console.error(e);
        Swal.fire('Erro', 'Erro ao carregar histórico: ' + e.message, 'error');
    }
};

/* ── Excluir proposta ───────────────────────────────────────────────── */
async function excluirProposta(id) {
    if (!confirm('Tem certeza que deseja excluir esta proposta? Esta ação não pode ser desfeita.')) return;
    try {
        const resp = await apiDelete(`/propostas/${id}`);
        if (resp && resp.success) {
            fecharFormProposta();
            await carregarPropostas();
            renderTelaPropostas();
            if (typeof mostrarToastSucesso === 'function') mostrarToastSucesso('Proposta excluída.');
        } else {
            alert('Erro ao excluir: ' + (resp?.error || 'Erro desconhecido'));
        }
    } catch (e) {
        console.error('[PROPOSTAS] Erro ao excluir:', e);
        alert('Erro ao comunicar com o servidor.');
    }
}

/* ── Impressão / PDF ────────────────────────────────────────────────── */
function imprimirProposta(id) {
    const p = _propostasData.find(pr => pr.id === id);
    if (!p) { alert('Proposta não encontrada.'); return; }

    const win = window.open('', '_blank', 'width=900,height=700');
    const fmtMoeda = (v) => 'R$ ' + Number(v||0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    const fmtData = (s) => _fmtData(s);

    win.document.write(`<!DOCTYPE html><html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <title>Proposta ${p.codigo}</title>
        <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: Arial, sans-serif; font-size: 11pt; color: #1e293b; background: #fff; padding: 20px; }
            .header { background: #4c1d95; color: white; padding: 20px 24px; border-radius: 8px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
            .header h1 { font-size: 16pt; margin-bottom: 4px; }
            .header .sub { font-size: 10pt; opacity: 0.85; }
            .badge { background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 20px; font-size: 10pt; font-weight: bold; }
            .section { margin-bottom: 18px; }
            .section h3 { font-size: 10pt; font-weight: 700; color: #6d28d9; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e0e7ff; padding-bottom: 5px; margin-bottom: 10px; }
            .grid { display: grid; gap: 8px; }
            .grid-2 { grid-template-columns: 1fr 1fr; }
            .grid-3 { grid-template-columns: 1fr 1fr 1fr; }
            .grid-4 { grid-template-columns: 1fr 1fr 1fr 1fr; }
            .field { background: #f8fafc; border-radius: 5px; padding: 8px 10px; }
            .field label { display: block; font-size: 8pt; color: #64748b; font-weight: 700; text-transform: uppercase; margin-bottom: 3px; }
            .field span { font-size: 10.5pt; color: #1e293b; font-weight: 600; }
            .valor-box { background: #4c1d95; color: white; border-radius: 8px; padding: 14px 18px; text-align: center; margin-top: 16px; }
            .valor-box .label { font-size: 9pt; opacity: 0.8; margin-bottom: 4px; }
            .valor-box .val { font-size: 22pt; font-weight: 800; }
            .footer { border-top: 1px solid #e2e8f0; padding-top: 12px; margin-top: 16px; font-size: 8pt; color: #94a3b8; text-align: center; }
            .obs { background: #fffbeb; border: 1px solid #fcd34d; border-radius: 6px; padding: 10px 12px; font-size: 10pt; color: #78350f; }
            @media print { body { padding: 10px; } .no-print { display: none; } }
        </style>
    </head>
    <body>
        <div class="header">
            <div>
                <h1>📋 Proposta de Locação</h1>
                <div class="sub">América Rental Equipamentos · ${fmtData(p.data_cadastro)}</div>
            </div>
            <div class="badge">${p.codigo || 'S/N'}</div>
        </div>

        <div class="section">
            <h3>Informações Gerais</h3>
            <div class="grid grid-4">
                <div class="field"><label>Tipo</label><span>${p.tipo||'—'}</span></div>
                <div class="field"><label>Fase</label><span>${p.fase_negociacao||'—'}</span></div>
                <div class="field"><label>Atendente</label><span>${p.atendente||'—'}</span></div>
                <div class="field"><label>Previsão Fechamento</label><span>${fmtData(p.previsao_fechamento)||'—'}</span></div>
            </div>
        </div>

        <div class="section">
            <h3>Cliente</h3>
            <div class="grid grid-2">
                <div class="field"><label>Cliente</label><span>${p.cliente_nome||'—'}</span></div>
                <div class="field"><label>Contato</label><span>${p.contato_nome||'—'}</span></div>
            </div>
        </div>

        <div class="section">
            <h3>Período e Local</h3>
            <div class="grid grid-4">
                <div class="field"><label>Período Início</label><span>${fmtData(p.periodo_inicio)||'—'}</span></div>
                <div class="field"><label>Período Fim</label><span>${fmtData(p.periodo_fim)||'—'}</span></div>
                <div class="field"><label>Hora Início / Fim</label><span>${p.hora_inicio||'00:00'} — ${p.hora_fim||'00:00'}</span></div>
                <div class="field"><label>Dias de Contrato</label><span>${p.dias_contrato||0}</span></div>
            </div>
            <div class="grid grid-1" style="margin-top:8px;">
                <div class="field"><label>Endereço de Instalação</label><span>${p.endereco_instalacao||'—'}</span></div>
            </div>
        </div>

        <div class="section">
            <h3>Condições Comerciais</h3>
            <div class="grid grid-4">
                <div class="field"><label>Tabela de Preços</label><span>${p.tabela_precos||'—'}</span></div>
                <div class="field"><label>Condição Pagamento</label><span>${p.condicao_pagamento||'—'}</span></div>
                <div class="field"><label>Desconto (%)</label><span>${Number(p.desconto_percent||0).toFixed(2)}%</span></div>
                <div class="field"><label>Desconto (R$)</label><span>${fmtMoeda(p.desconto_reais)}</span></div>
            </div>
        </div>

        <div class="section">
            <h3>Representante e Frete</h3>
            <div class="grid grid-4">
                <div class="field"><label>Representante</label><span>${p.representante||'—'}</span></div>
                <div class="field"><label>Transportadora</label><span>${p.transportadora||'—'}</span></div>
                <div class="field"><label>Frete Ida</label><span>${fmtMoeda(p.valor_frete_ida)}</span></div>
                <div class="field"><label>Frete Volta</label><span>${fmtMoeda(p.valor_frete_volta)}</span></div>
            </div>
        </div>

        <div class="no-print" style="text-align:center; margin-top:20px;">
            <button onclick="window.print(); window.close();" style="background:#4c1d95;color:white;border:none;padding:10px 24px;border-radius:8px;cursor:pointer;font-size:12pt;font-weight:700;">
                🖨️ Imprimir / Salvar PDF
            </button>
        </div>
    </body></html>`);
    win.document.close();
    win.focus();
}

/* ── Utilitários ────────────────────────────────────────────────────── */
function _fmtData(s) {
    if (!s) return '—';
    if (typeof s === 'string' && s.includes('/')) return s;
    try {
        const d = new Date(s + (s.length === 10 ? 'T12:00:00' : ''));
        return d.toLocaleDateString('pt-BR');
    } catch (e) { return s; }
}


// ══════════════════════════════════════════════════════════════════════
// CADASTRO DE CLIENTES: RENDER & EVENT HANDLERS
// ══════════════════════════════════════════════════════════════════════
function _renderCadastroClienteInt() {
    const container = document.getElementById('prop-view-cadastro-cliente');
    if (!container) return;
    
    const hoje = new Date().toISOString().split('T')[0];
    
    container.innerHTML = `
        <style>
            #form-cadastro-cliente input:not([type="checkbox"]),
            #form-cadastro-cliente select {
                padding: 0.55rem 0.75rem !important;
                border: 1px solid #cbd5e1 !important;
                border-radius: 6px !important;
                font-size: 0.85rem !important;
                background: #fff !important;
                color: #1e293b !important;
                outline: none !important;
                transition: all 0.2s !important;
                box-sizing: border-box !important;
                width: 100% !important;
                height: 38px !important;
            }
            #form-cadastro-cliente input:not([type="checkbox"]):focus,
            #form-cadastro-cliente select:focus {
                border-color: #3b82f6 !important;
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15) !important;
            }
            #form-cadastro-cliente input[readonly] {
                background: #f1f5f9 !important;
                color: #64748b !important;
                cursor: not-allowed !important;
            }
            #form-cadastro-cliente button {
                border-radius: 6px !important;
                height: 38px !important;
                box-sizing: border-box !important;
                transition: all 0.2s !important;
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
            }
            #form-cadastro-cliente button[title="Buscar Cliente"],
            #form-cadastro-cliente button[id="btn-busca-cnpj"],
            #form-cadastro-cliente button[title="Buscar CEP"] {
                background-color: #16a34a !important;
            }
            #form-cadastro-cliente button[title="Buscar Cliente"]:hover,
            #form-cadastro-cliente button[id="btn-busca-cnpj"]:hover,
            #form-cadastro-cliente button[title="Buscar CEP"]:hover {
                background-color: #15803d !important;
            }
            #form-cadastro-cliente button[title="Limpar/Novo"] {
                background-color: #475569 !important;
            }
            #form-cadastro-cliente button[title="Limpar/Novo"]:hover {
                background-color: #334155 !important;
            }
        </style>
        <div style="background:#fff; width:100%; border-radius:14px; box-shadow:0 5px 20px rgba(0,0,0,0.05); overflow:visible; margin:0 auto; border: 1px solid #e2e8f0; font-family:'Inter', sans-serif;">
            
            <!-- Toolbar -->
            <div style="background:#f8fafc; border-bottom:1px solid #e2e8f0; padding:0.65rem 1.5rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.6rem; position:sticky; top:98px; z-index:997; border-top-left-radius:14px; border-top-right-radius:14px;">
                
                <!-- Badge Lado Esquerdo -->
                <div style="background:#2e58a6; color:white; padding:0.45rem 0.9rem; border-radius:6px; font-weight:700; font-size:0.86rem; display:flex; align-items:center; gap:0.4rem; font-family:'Inter', sans-serif; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <i class="ph ph-user-focus" style="font-size:1.15rem;"></i>
                    Cadastro de Clientes
                </div>

                <!-- Botões de Ação (Lado Direito) -->
                <div style="display:flex; gap:0.4rem; align-items:center; flex-wrap:wrap;">
                    <button onclick="recarregarCliente()" title="Recarregar" style="background:#e2e8f0; color:#475569; border:none; width:34px; height:34px; border-radius:6px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; transition:all 0.15s; outline:none;" onmouseover="this.style.background='#cbd5e1'" onmouseout="this.style.background='#e2e8f0'">
                        <i class="ph ph-arrows-clockwise" style="font-size:1.15rem;"></i>
                    </button>

                    <!-- Spacer -->
                    <div style="width: 4px;"></div>

                    <button onclick="salvarCliente()" style="background:#16a34a; color:white; border:none; padding:0.45rem 1rem; border-radius:6px; cursor:pointer; font-weight:600; font-size:0.82rem; display:inline-flex; align-items:center; gap:5px; transition:background 0.15s;" onmouseover="this.style.background='#15803d'" onmouseout="this.style.background='#16a34a'" onfocus="this.blur()">
                        <i class="ph ph-check" style="font-size:1rem;"></i> Processar
                    </button>
                    <button onclick="excluirCliente()" style="background:#dc2626; color:white; border:none; padding:0.45rem 1rem; border-radius:6px; cursor:pointer; font-weight:600; font-size:0.82rem; display:inline-flex; align-items:center; gap:5px; transition:background 0.15s;" onmouseover="this.style.background='#b91c1c'" onmouseout="this.style.background='#dc2626'" onfocus="this.blur()">
                        <i class="ph ph-trash" style="font-size:1rem;"></i> Excluir
                    </button>
                    <button onclick="verificarCliente()" style="background:#64748b; color:white; border:none; padding:0.45rem 1rem; border-radius:6px; cursor:pointer; font-weight:600; font-size:0.82rem; display:inline-flex; align-items:center; gap:5px; transition:background 0.15s;" onmouseover="this.style.background='#475569'" onmouseout="this.style.background='#64748b'" onfocus="this.blur()">
                        <i class="ph ph-shield-check" style="font-size:1rem;"></i> Verificar
                    </button>
                </div>
            </div>

            <!-- Corpo da Tela -->
            <div style="padding:1.5rem; overflow-y:auto; max-height:80vh;">
                
                <!-- Info bar at the top of form body -->
                <div style="display:flex; justify-content:space-between; align-items:center; background:#f0f7ff; border:1px solid #c2e0ff; padding:0.6rem 1.2rem; border-radius:6px; margin-bottom:1rem; font-size:0.85rem; color:#1e40af; flex-wrap:wrap; gap:0.5rem;">
                    <div style="font-weight:600; display:flex; align-items:center; gap:6px;">
                        <i class="ph ph-info" style="font-size:1.1rem;"></i>
                        Pesquise pelo CNPJ para completar o cadastro.
                    </div>
                    <label style="display:flex; align-items:center; gap:5px; cursor:pointer; font-weight:600; color:#1e293b;">
                        <input type="checkbox" id="cli-inativo" style="accent-color:#3b82f6;"> Inativo?
                    </label>
                </div>

                <form id="form-cadastro-cliente" onsubmit="return false;" style="margin-bottom:1.5rem;">
                    
                    <!-- Grid Principal: Campos e Foto -->
                    <div style="display:flex; gap:1.5rem; flex-wrap:wrap;">
                        
                        <!-- Coluna dos Campos (Esquerda) -->
                        <div style="flex:1; min-width:300px; display:grid; gap:0.85rem;">
                            
                            <!-- Linha 1: Código, Data Cadastro, CPF/CNPJ, IE -->
                            <div style="display:grid; grid-template-columns:1.2fr 1fr 1.5fr 1.5fr; gap:0.75rem;">
                                <div>
                                    <label class="prop-lbl">Código</label>
                                    <div style="display:flex; gap:3px;">
                                        <input type="text" id="cli-codigo" readonly placeholder="Auto" style="width:100%;padding:0.45rem;border:1px solid #cbd5e1;border-radius:4px;font-size:0.85rem;background:#f1f5f9;color:#64748b;box-sizing:border-box;">
                                        <button onclick="abrirModalPesquisaCliente()" title="Buscar Cliente" style="background:#82c91e;color:white;border:none;padding:0.45rem;border-radius:4px;cursor:pointer;display:flex;align-items:center;justify-content:center;"><i class="ph ph-magnifying-glass"></i></button>
                                        <button onclick="limparFormCliente()" title="Limpar/Novo" style="background:#495057;color:white;border:none;padding:0.45rem;border-radius:4px;cursor:pointer;display:flex;align-items:center;justify-content:center;"><i class="ph ph-arrows-counter-clockwise"></i></button>
                                    </div>
                                </div>
                                <div>
                                    <label class="prop-lbl">Data de Cadastro</label>
                                    <input type="date" id="cli-data-cadastro" value="${hoje}" style="width:100%;padding:0.45rem;border:1px solid #cbd5e1;border-radius:4px;font-size:0.85rem;box-sizing:border-box;">
                                </div>
                                <div>
                                    <label class="prop-lbl">CPF / CNPJ *</label>
                                    <div style="display:flex; gap:3px;">
                                        <input type="text" id="cli-cpf-cnpj" placeholder="Apenas números" style="width:100%;padding:0.45rem;border:1px solid #cbd5e1;border-radius:4px;font-size:0.85rem;box-sizing:border-box;">
                                        <button onclick="buscarCNPJ()" id="btn-busca-cnpj" title="Buscar CNPJ" style="background:#82c91e;color:white;border:none;padding:0.45rem 0.6rem;border-radius:4px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-weight:bold;gap:3px;"><i class="ph ph-magnifying-glass"></i></button>
                                    </div>
                                </div>
                                <div>
                                    <label class="prop-lbl">Inscrição Estadual</label>
                                    <input type="text" id="cli-ie" placeholder="ISENTO" style="width:100%;padding:0.45rem;border:1px solid #cbd5e1;border-radius:4px;font-size:0.85rem;box-sizing:border-box;">
                                </div>
                            </div>

                            <!-- Linha 2: IM, Grupo, Centralizador -->
                            <div style="display:grid; grid-template-columns:1.2fr 1.5fr 2.3fr; gap:0.75rem;">
                                <div>
                                    <label class="prop-lbl">Inscrição Municipal</label>
                                    <input type="text" id="cli-im" style="width:100%;padding:0.45rem;border:1px solid #cbd5e1;border-radius:4px;font-size:0.85rem;box-sizing:border-box;">
                                </div>
                                <div>
                                    <label class="prop-lbl">Grupo de Clientes</label>
                                    <select id="cli-grupo" style="width:100%;padding:0.45rem;border:1px solid #cbd5e1;border-radius:4px;font-size:0.85rem;box-sizing:border-box;">
                                        <option value="">-- Selecione --</option>
                                        <option value="1 - Diamante">1 - Diamante</option>
                                        <option value="2 - Ouro">2 - Ouro</option>
                                        <option value="3 - Prata">3 - Prata</option>
                                        <option value="4 - Bronze">4 - Bronze</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="prop-lbl">Cliente Centralizador</label>
                                    <select id="cli-centralizador" style="width:100%;padding:0.45rem;border:1px solid #cbd5e1;border-radius:4px;font-size:0.85rem;box-sizing:border-box;">
                                        <option value="">-- Selecione --</option>
                                    </select>
                                </div>
                            </div>

                            <!-- Linha 3: Razão Social -->
                            <div>
                                <label class="prop-lbl">Nome / Razão Social *</label>
                                <input type="text" id="cli-razao-social" oninput="atualizarClienteCentralizadorOptions()" style="width:100%;padding:0.45rem;border:1px solid #cbd5e1;border-radius:4px;font-size:0.85rem;box-sizing:border-box;">
                            </div>

                            <!-- Linha 4: Nome Fantasia -->
                            <div>
                                <label class="prop-lbl">Nome Fantasia</label>
                                <input type="text" id="cli-nome-fantasia" style="width:100%;padding:0.45rem;border:1px solid #cbd5e1;border-radius:4px;font-size:0.85rem;box-sizing:border-box;">
                            </div>
                        </div>

                        <!-- Foto/Avatar (Direita) -->
                        <div style="flex:0 0 160px; display:flex; flex-direction:column; align-items:center; justify-content:center; border:1px solid #cbd5e1; border-radius:8px; background:#f8fafc; padding:1rem; box-sizing:border-box;">
                            <div style="width:100px; height:100px; border-radius:50%; background:#e2e8f0; display:flex; align-items:center; justify-content:center; margin-bottom:0.75rem; border:2px solid #cbd5e1; overflow:hidden;">
                                <i class="ph ph-user" style="font-size:3rem; color:#94a3b8;"></i>
                            </div>
                            <button onclick="alert('Funcionalidade de foto em desenvolvimento')" style="background:#495057;color:white;border:none;padding:0.4rem 0.8rem;border-radius:4px;font-size:0.75rem;font-weight:600;cursor:pointer;">
                                Alterar Foto
                            </button>
                        </div>
                    </div>

                    <!-- Endereço -->
                    <div style="display:grid; grid-template-columns:1.2fr 3fr 1fr 1.5fr; gap:0.75rem; margin-top:0.85rem;">
                        <div>
                            <label class="prop-lbl">CEP</label>
                            <div style="display:flex; gap:3px;">
                                <input type="text" id="cli-cep" placeholder="00000-000" style="width:100%;padding:0.45rem;border:1px solid #cbd5e1;border-radius:4px;font-size:0.85rem;box-sizing:border-box;">
                                <button onclick="buscarCEP()" title="Buscar CEP" style="background:#82c91e;color:white;border:none;padding:0.45rem;border-radius:4px;cursor:pointer;display:flex;align-items:center;justify-content:center;"><i class="ph ph-magnifying-glass"></i></button>
                            </div>
                        </div>
                        <div>
                            <label class="prop-lbl">Endereço</label>
                            <input type="text" id="cli-endereco" style="width:100%;padding:0.45rem;border:1px solid #cbd5e1;border-radius:4px;font-size:0.85rem;box-sizing:border-box;">
                        </div>
                        <div>
                            <label class="prop-lbl">Número</label>
                            <input type="text" id="cli-numero" style="width:100%;padding:0.45rem;border:1px solid #cbd5e1;border-radius:4px;font-size:0.85rem;box-sizing:border-box;">
                        </div>
                        <div>
                            <label class="prop-lbl">Complemento</label>
                            <input type="text" id="cli-complemento" style="width:100%;padding:0.45rem;border:1px solid #cbd5e1;border-radius:4px;font-size:0.85rem;box-sizing:border-box;">
                        </div>
                    </div>

                    <!-- Bairro/Cidade -->
                    <div style="display:grid; grid-template-columns:2fr 1fr 2fr 1fr; gap:0.75rem; margin-top:0.85rem;">
                        <div>
                            <label class="prop-lbl">Bairro</label>
                            <input type="text" id="cli-bairro" style="width:100%;padding:0.45rem;border:1px solid #cbd5e1;border-radius:4px;font-size:0.85rem;box-sizing:border-box;">
                        </div>
                        <div>
                            <label class="prop-lbl">UF</label>
                            <select id="cli-uf" style="width:100%;padding:0.45rem;border:1px solid #cbd5e1;border-radius:4px;font-size:0.85rem;box-sizing:border-box;">
                                <option value="">--</option>
                                ${['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']
                                    .map(uf => `<option value="${uf}">${uf}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="prop-lbl">Município</label>
                            <input type="text" id="cli-municipio" style="width:100%;padding:0.45rem;border:1px solid #cbd5e1;border-radius:4px;font-size:0.85rem;box-sizing:border-box;">
                        </div>
                        <div>
                            <label class="prop-lbl">País</label>
                            <input type="text" id="cli-pais" value="BRASIL" style="width:100%;padding:0.45rem;border:1px solid #cbd5e1;border-radius:4px;font-size:0.85rem;box-sizing:border-box;">
                        </div>
                    </div>

                    <!-- Contatos / Tel -->
                    <div style="display:grid; grid-template-columns:1.5fr 0.8fr 1.5fr 0.8fr 1fr 1.5fr; gap:0.75rem; margin-top:0.85rem;">
                        <div>
                            <label class="prop-lbl">Telefone</label>
                            <input type="text" id="cli-telefone" style="width:100%;padding:0.45rem;border:1px solid #cbd5e1;border-radius:4px;font-size:0.85rem;box-sizing:border-box;">
                        </div>
                        <div>
                            <label class="prop-lbl">Ramal</label>
                            <input type="text" id="cli-ramal" style="width:100%;padding:0.45rem;border:1px solid #cbd5e1;border-radius:4px;font-size:0.85rem;box-sizing:border-box;">
                        </div>
                        <div>
                            <label class="prop-lbl">Telefone 2</label>
                            <input type="text" id="cli-telefone2" style="width:100%;padding:0.45rem;border:1px solid #cbd5e1;border-radius:4px;font-size:0.85rem;box-sizing:border-box;">
                        </div>
                        <div>
                            <label class="prop-lbl">Ramal</label>
                            <input type="text" id="cli-ramal2" style="width:100%;padding:0.45rem;border:1px solid #cbd5e1;border-radius:4px;font-size:0.85rem;box-sizing:border-box;">
                        </div>
                        <div>
                            <label class="prop-lbl">Fax</label>
                            <input type="text" id="cli-fax" style="width:100%;padding:0.45rem;border:1px solid #cbd5e1;border-radius:4px;font-size:0.85rem;box-sizing:border-box;">
                        </div>
                        <div>
                            <label class="prop-lbl">Website</label>
                            <input type="text" id="cli-website" style="width:100%;padding:0.45rem;border:1px solid #cbd5e1;border-radius:4px;font-size:0.85rem;box-sizing:border-box;">
                        </div>
                    </div>

                    <!-- Celular e WhatsApp -->
                    <div style="display:grid; grid-template-columns:1.5fr 2fr auto 1.5fr; gap:0.75rem; margin-top:0.85rem; align-items:end;">
                        <div>
                            <label class="prop-lbl">DDI do Celular</label>
                            <select id="cli-celular-ddi" style="width:100%;padding:0.45rem;border:1px solid #cbd5e1;border-radius:4px;font-size:0.85rem;box-sizing:border-box;">
                                <option value="+55 (BRASIL)">+55 (BRASIL)</option>
                                <option value="+1 (EUA)">+1 (EUA)</option>
                                <option value="+351 (PORTUGAL)">+351 (PORTUGAL)</option>
                            </select>
                        </div>
                        <div>
                            <label class="prop-lbl">Celular</label>
                            <input type="text" id="cli-celular" placeholder="(XX)XXXXX-XXXX" style="width:100%;padding:0.45rem;border:1px solid #cbd5e1;border-radius:4px;font-size:0.85rem;box-sizing:border-box;">
                        </div>
                        <div>
                            <button onclick="abrirWhatsApp()" style="background:#25d366;color:white;border:none;padding:0.5rem;border-radius:4px;cursor:pointer;font-size:1.15rem;display:flex;align-items:center;justify-content:center;height:34px;width:38px;"><i class="ph ph-whatsapp-logo"></i></button>
                        </div>
                        <div>
                            <button onclick="alert('Abrindo CRM...')" style="background:#3b5bdb;color:white;border:none;padding:0.45rem 1rem;border-radius:4px;font-weight:600;font-size:0.85rem;cursor:pointer;display:flex;align-items:center;gap:5px;height:34px;justify-content:center;"><i class="ph ph-briefcase"></i> Abrir no CRM</button>
                        </div>
                    </div>
                </form>

                <!-- ACORDEÕES EXPANSÍVEIS -->
                <div style="display:flex; flex-direction:column; gap:0.5rem; margin-top:1.5rem;">
                    
                    <!-- Parâmetros -->
                    <div style="border:1px solid #e2e8f0; border-radius:6px; overflow:hidden;">
                        <div onclick="toggleAccordion('acc-parametros')" style="background:#f8fafc; padding:0.75rem 1rem; display:flex; justify-content:space-between; align-items:center; cursor:pointer; font-weight:bold; font-size:0.88rem; color:#475569;">
                            <span>▶ Parâmetros <i class="ph ph-gear-six"></i></span>
                            <span id="acc-parametros-arrow" style="transition:transform 0.2s;">▶</span>
                        </div>
                        <div id="acc-parametros" style="display:none; padding:1rem; border-top:1px solid #e2e8f0; font-size:0.85rem;">
                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
                                <label style="display:flex; align-items:center; gap:5px;"><input type="checkbox" id="cli-p-limite"> Bloquear faturamento por limite de crédito</label>
                                <label style="display:flex; align-items:center; gap:5px;"><input type="checkbox" id="cli-p-retencao"> Exigir retenção de impostos em notas fiscais</label>
                            </div>
                        </div>
                    </div>

                    <!-- Fiscal -->
                    <div style="border:1px solid #e2e8f0; border-radius:6px; overflow:hidden;">
                        <div onclick="toggleAccordion('acc-fiscal')" style="background:#f8fafc; padding:0.75rem 1rem; display:flex; justify-content:space-between; align-items:center; cursor:pointer; font-weight:bold; font-size:0.88rem; color:#475569;">
                            <span>▶ Fiscal <i class="ph ph-wrench"></i></span>
                            <span id="acc-fiscal-arrow" style="transition:transform 0.2s;">▶</span>
                        </div>
                        <div id="acc-fiscal" style="display:none; padding:1rem; border-top:1px solid #e2e8f0; font-size:0.85rem;">
                            <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:0.75rem;">
                                <div>
                                    <label class="prop-lbl">Enquadramento Tributário</label>
                                    <select id="cli-f-tributario" style="width:100%;padding:0.45rem;border:1px solid #cbd5e1;border-radius:4px;">
                                        <option value="Simples Nacional">Simples Nacional</option>
                                        <option value="Lucro Presumido">Lucro Presumido</option>
                                        <option value="Lucro Real">Lucro Real</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="prop-lbl">Regime Especial ISS</label>
                                    <input type="text" id="cli-f-iss" placeholder="Ex: Nenhum" style="width:100%;padding:0.45rem;border:1px solid #cbd5e1;border-radius:4px;">
                                </div>
                                <div>
                                    <label class="prop-lbl">CNAE Principal</label>
                                    <input type="text" id="cli-f-cnae" style="width:100%;padding:0.45rem;border:1px solid #cbd5e1;border-radius:4px;">
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Contatos (Expandido por padrão) -->
                    <div style="border:1px solid #e2e8f0; border-radius:6px; overflow:hidden;">
                        <div onclick="toggleAccordion('acc-contatos')" style="background:#f8fafc; padding:0.75rem 1rem; display:flex; justify-content:space-between; align-items:center; cursor:pointer; font-weight:bold; font-size:0.88rem; color:#475569;">
                            <span>▼ Contatos <i class="ph ph-users-three"></i></span>
                            <span id="acc-contatos-arrow" style="transform:rotate(90deg); transition:transform 0.2s;">▶</span>
                        </div>
                        <div id="acc-contatos" style="display:block; padding:1.2rem; border-top:1px solid #e2e8f0; font-size:0.85rem;">
                            
                            <!-- Controles de e-mail e botão novo contato -->
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; flex-wrap:wrap; gap:0.5rem;">
                                <div style="display:flex; align-items:center; gap:8px; font-weight:600; font-family:'Inter', sans-serif; font-size:0.85rem; color:#475569;">
                                    <span>Dados para Envio de E-Mail Cobranças: Enviar com</span>
                                    <input type="number" id="cli-email-cob-antecedencia" value="5" style="width:45px; text-align:center; padding:4px; border:1px solid #cbd5e1; border-radius:6px; height:30px; box-sizing:border-box; outline:none; font-family:'Inter', sans-serif;">
                                    <span>dias de antecedência e</span>
                                    <input type="number" id="cli-email-cob-posterior" value="5" style="width:45px; text-align:center; padding:4px; border:1px solid #cbd5e1; border-radius:6px; height:30px; box-sizing:border-box; outline:none; font-family:'Inter', sans-serif;">
                                    <span>dias posterior ao Vencimento</span>
                                </div>
                                <div style="display:flex; gap:0.5rem; align-items:center;">
                                    <button onclick="abrirModalPesquisaContatoCliente()" style="background:#e2e8f0; color:#475569; border:none; padding:0.45rem 1rem; border-radius:6px; font-weight:600; font-size:0.83rem; cursor:pointer; display:flex; align-items:center; gap:5px; transition:all 0.15s;" onmouseover="this.style.background='#cbd5e1'" onmouseout="this.style.background='#e2e8f0'">
                                        <i class="ph ph-magnifying-glass" style="font-size:1rem;"></i> Pesquisar Contato
                                    </button>
                                    <button onclick="encaminharNovoContato()" style="background:#3b82f6; color:white; border:none; padding:0.45rem 1rem; border-radius:6px; font-weight:600; font-size:0.83rem; cursor:pointer; display:flex; align-items:center; gap:5px; transition:background 0.15s;" onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'">
                                        <i class="ph ph-plus-bold" style="font-size:1rem;"></i> Novo Contato
                                    </button>
                                </div>
                            </div>

                            <!-- Tabela de contatos cadastrados -->
                            <div style="background:#fff; border-radius:10px; border:1px solid #e2e8f0; overflow-x:auto; box-shadow:0 1px 3px rgba(0,0,0,0.02);">
                                <table style="width:100%; border-collapse:collapse; font-size:0.82rem; min-width:1200px; font-family:'Inter', sans-serif;">
                                    <thead>
                                        <tr style="background:#f8fafc; border-bottom:2px solid #cbd5e1; text-align:left;">
                                            <th style="padding:0.75rem 1rem; font-weight:700; color:#475569; font-size:0.75rem; text-transform:uppercase; letter-spacing:0.02em;">Identificação</th>
                                            <th style="padding:0.75rem 1rem; font-weight:700; color:#475569; font-size:0.75rem; text-transform:uppercase; letter-spacing:0.02em;">Nome</th>
                                            <th style="padding:0.75rem 1rem; font-weight:700; color:#475569; font-size:0.75rem; text-transform:uppercase; letter-spacing:0.02em;">Departamento</th>
                                            <th style="padding:0.75rem 1rem; font-weight:700; color:#475569; font-size:0.75rem; text-transform:uppercase; letter-spacing:0.02em;">Celular</th>
                                            <th style="padding:0.75rem 1rem; font-weight:700; color:#475569; font-size:0.75rem; text-transform:uppercase; letter-spacing:0.02em;">Telefone/Ramal</th>
                                            <th style="padding:0.75rem 1rem; font-weight:700; color:#475569; font-size:0.75rem; text-transform:uppercase; letter-spacing:0.02em;">E-mail</th>
                                            <th style="padding:0.75rem 1rem; font-weight:700; color:#475569; font-size:0.75rem; text-transform:uppercase; letter-spacing:0.02em;">Dono</th>
                                            <th style="padding:0.75rem 1rem; font-weight:700; color:#475569; font-size:0.75rem; text-transform:uppercase; letter-spacing:0.02em;">Cargo</th>
                                            <th style="padding:0.75rem 1rem; font-weight:700; color:#475569; font-size:0.75rem; text-transform:uppercase; letter-spacing:0.02em;">Situação</th>
                                            <th style="padding:0.75rem 1rem; font-weight:700; color:#475569; font-size:0.75rem; text-transform:uppercase; letter-spacing:0.02em;">NFe</th>
                                            <th style="padding:0.75rem 1rem; font-weight:700; color:#475569; font-size:0.75rem; text-transform:uppercase; letter-spacing:0.02em;">Cobrança</th>
                                            <th style="padding:0.75rem 1rem; font-weight:700; color:#475569; font-size:0.75rem; text-transform:uppercase; letter-spacing:0.02em;">OS</th>
                                            <th style="padding:0.75rem 1rem; font-weight:700; color:#475569; font-size:0.75rem; text-transform:uppercase; letter-spacing:0.02em;">Contrato</th>
                                            <th style="padding:0.75rem 1rem; font-weight:700; color:#475569; font-size:0.75rem; text-transform:uppercase; letter-spacing:0.02em;">Origem</th>
                                            <th style="padding:0.75rem 1rem; font-weight:700; color:#475569; font-size:0.75rem; text-transform:uppercase; letter-spacing:0.02em;">Inativo</th>
                                            <th style="padding:0.75rem 1rem; font-weight:700; color:#475569; font-size:0.75rem; text-transform:uppercase; letter-spacing:0.02em; text-align:center;">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody id="cli-contatos-tbody">
                                        <!-- Populado dinamicamente -->
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <!-- Validação de Dados (DataValid) -->
                    <div style="border:1px solid #e2e8f0; border-radius:6px; overflow:hidden;">
                        <div onclick="toggleAccordion('acc-validacao')" style="background:#f8fafc; padding:0.75rem 1rem; display:flex; justify-content:space-between; align-items:center; cursor:pointer; font-weight:bold; font-size:0.88rem; color:#475569;">
                            <span>▶ Validação de Dados (DataValid) <i class="ph ph-check-circle"></i></span>
                            <span id="acc-validacao-arrow" style="transition:transform 0.2s;">▶</span>
                        </div>
                        <div id="acc-validacao" style="display:none; padding:1rem; border-top:1px solid #e2e8f0; font-size:0.85rem;">
                            <div style="color:#155724; background-color:#d4edda; border:1px solid #c3e6cb; padding:0.75rem 1.25rem; border-radius:4px; font-weight:600; display:flex; align-items:center; gap:5px;">
                                <i class="ph ph-check-circle-bold" style="font-size:1.2rem;"></i> Todos os dados cadastrais estão de acordo com a Receita Federal e Sintegra.
                            </div>
                        </div>
                    </div>

                    <!-- Anexo de Arquivos -->
                    <div style="border:1px solid #e2e8f0; border-radius:6px; overflow:hidden;">
                        <div onclick="toggleAccordion('acc-anexos')" style="background:#f8fafc; padding:0.75rem 1rem; display:flex; justify-content:space-between; align-items:center; cursor:pointer; font-weight:bold; font-size:0.88rem; color:#475569;">
                            <span>▶ Anexo de Arquivos <i class="ph ph-file-arrow-up"></i></span>
                            <span id="acc-anexos-arrow" style="transition:transform 0.2s;">▶</span>
                        </div>
                        <div id="acc-anexos" style="display:none; padding:1rem; border-top:1px solid #e2e8f0; font-size:0.85rem;">
                            <input type="file" id="cli-anexo-file" style="margin-bottom:0.5rem; display:block;">
                            <span style="color:#64748b; font-size:0.75rem;">(Formatos permitidos: PDF, PNG, JPG até 5MB)</span>
                        </div>
                    </div>

                </div>

            </div>
        </div>
    `;

    _renderTabelaContatos();
}

window.atualizarClienteCentralizadorOptions = async function(selectedValue = null) {
    const razaoSocialInput = document.getElementById('cli-razao-social');
    const selectCentralizador = document.getElementById('cli-centralizador');
    if (!selectCentralizador) return;

    // Se a lista de clientes no cache estiver vazia, vamos buscar uma vez
    if (!_clientesCache || _clientesCache.length === 0) {
        try {
            _clientesCache = await apiGet('/clientes') || [];
        } catch (e) {
            console.error('Erro ao carregar clientes para centralizador:', e);
            _clientesCache = [];
        }
    }

    const currentVal = razaoSocialInput ? razaoSocialInput.value.trim() : '';
    
    // Extrai a primeira palavra com mais de 2 caracteres
    const words = currentVal.split(/\s+/).filter(w => w.length > 2);
    const filterWord = words.length > 0 ? words[0] : '';

    // Filtra os clientes
    let filtered = [];
    if (filterWord) {
        // Função para remover acentos para comparação mais robusta
        const cleanStr = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        const searchVal = cleanStr(filterWord);
        
        filtered = _clientesCache.filter(c => {
            const nameClean = cleanStr(c.nome_razao_social || '');
            return nameClean.includes(searchVal);
        });
    }

    // Se o selectedValue foi passado e não está na lista filtrada, vamos adicioná-lo
    // para não perder a seleção salva na renderização
    if (selectedValue) {
        const alreadyInList = filtered.some(c => String(c.codigo) === String(selectedValue) || String(c.nome_razao_social) === String(selectedValue));
        if (!alreadyInList) {
            const found = _clientesCache.find(c => String(c.codigo) === String(selectedValue) || String(c.nome_razao_social) === String(selectedValue));
            if (found) {
                filtered.unshift(found);
            }
        }
    }

    // Monta as opções do select
    let optionsHtml = '<option value="">-- Selecione --</option>';
    filtered.forEach(c => {
        // Marcamos como selecionado se coincide com selectedValue (código ou razão)
        const isSelected = selectedValue && (String(c.codigo) === String(selectedValue) || String(c.nome_razao_social) === String(selectedValue)) ? 'selected' : '';
        optionsHtml += `<option value="${c.codigo}" ${isSelected}>${c.codigo} - ${c.nome_razao_social}</option>`;
    });

    selectCentralizador.innerHTML = optionsHtml;
};

window.toggleAccordion = function(id) {
    const el = document.getElementById(id);
    const arrow = document.getElementById(id + '-arrow');
    if (el) {
        if (el.style.display === 'none') {
            el.style.display = 'block';
            if (arrow) arrow.innerText = '▼';
        } else {
            el.style.display = 'none';
            if (arrow) arrow.innerText = '▶';
        }
    }
};

window.buscarCNPJ = async function() {
    const cnpjRaw = document.getElementById('cli-cpf-cnpj')?.value || '';
    const cnpj = cnpjRaw.replace(/\D/g, '');
    if (cnpj.length !== 14) {
        alert('Por favor, informe um CNPJ válido com 14 dígitos para buscar.');
        return;
    }
    
    const btn = document.getElementById('btn-busca-cnpj');
    const origText = btn.innerHTML;
    btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i>';
    btn.disabled = true;

    try {
        const result = await apiGet(`/consulta-cnpj/${cnpj}`);
        if (!result || !result.data) {
            throw new Error('Retorno inválido do servidor.');
        }

        const data = result.data;
        const source = result.source;

        if (source === 'cnpjws') {
            document.getElementById('cli-razao-social').value = data.razao_social || '';
            document.getElementById('cli-nome-fantasia').value = data.estabelecimento?.nome_fantasia || '';
            document.getElementById('cli-cep').value = data.estabelecimento?.cep || '';
            
            // Endereço
            const logradouro = data.estabelecimento?.logradouro || '';
            const tipoLogradouro = data.estabelecimento?.tipo_logradouro || '';
            const numero = data.estabelecimento?.numero || '';
            const compl = data.estabelecimento?.complemento || '';
            
            document.getElementById('cli-endereco').value = `${tipoLogradouro} ${logradouro}`.trim() + (numero ? ', ' + numero : '');
            document.getElementById('cli-complemento').value = compl;
            document.getElementById('cli-bairro').value = data.estabelecimento?.bairro || '';
            document.getElementById('cli-uf').value = data.estabelecimento?.estado?.sigla || '';
            document.getElementById('cli-municipio').value = data.estabelecimento?.cidade?.nome || '';
            document.getElementById('cli-pais').value = 'BRASIL';
            
            // Telefone
            if (data.estabelecimento?.ddd1 && data.estabelecimento?.telefone1) {
                document.getElementById('cli-telefone').value = `(${data.estabelecimento.ddd1}) ${data.estabelecimento.telefone1}`;
            }

            // Inscrição Estadual
            let ie = 'ISENTO';
            const ieList = data.estabelecimento?.inscricoes_estaduais;
            if (Array.isArray(ieList) && ieList.length > 0) {
                const activeIe = ieList.find(x => x.ativo);
                if (activeIe) {
                    ie = activeIe.inscricao_estadual;
                } else {
                    ie = ieList[0].inscricao_estadual;
                }
            }
            document.getElementById('cli-ie').value = ie;

        } else {
            // Source: brasilapi
            document.getElementById('cli-razao-social').value = data.razao_social || '';
            document.getElementById('cli-nome-fantasia').value = data.nome_fantasia || '';
            document.getElementById('cli-cep').value = data.cep || '';
            document.getElementById('cli-endereco').value = (data.logradouro || '') + (data.numero ? ', ' + data.numero : '');
            document.getElementById('cli-bairro').value = data.bairro || '';
            document.getElementById('cli-uf').value = data.uf || '';
            document.getElementById('cli-municipio').value = data.municipio || '';
            document.getElementById('cli-pais').value = 'BRASIL';
            
            if (data.ddd_telefone_1) {
                document.getElementById('cli-telefone').value = `(${data.ddd_telefone_1.substring(0,2)}) ${data.ddd_telefone_1.substring(2)}`;
            }
            document.getElementById('cli-ie').value = 'ISENTO';
        }

        // Atualizar as opções do centralizador dinamicamente!
        await atualizarClienteCentralizadorOptions();

        if (typeof mostrarToastSucesso === 'function') {
            const extra = source === 'cnpjws' ? '' : ' (Inscrição Estadual indisponível no fallback)';
            mostrarToastSucesso('Dados do CNPJ importados com sucesso!' + extra);
        }
    } catch(e) {
        console.error(e);
        alert('Erro ao buscar CNPJ: ' + (e.message || 'Erro desconhecido.'));
    } finally {
        btn.innerHTML = origText;
        btn.disabled = false;
    }
};

window.buscarCEP = async function() {
    const cepRaw = document.getElementById('cli-cep')?.value || '';
    const cep = cepRaw.replace(/\D/g, '');
    if (cep.length !== 8) {
        alert('Por favor, informe um CEP válido com 8 dígitos.');
        return;
    }
    
    try {
        const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        if (!res.ok) throw new Error('CEP não encontrado.');
        const data = await res.json();
        if (data.erro) throw new Error('CEP inexistente.');
        
        document.getElementById('cli-endereco').value = data.logradouro || '';
        document.getElementById('cli-bairro').value = data.bairro || '';
        document.getElementById('cli-uf').value = data.uf || '';
        document.getElementById('cli-municipio').value = data.localidade || '';
        document.getElementById('cli-pais').value = 'BRASIL';
        
        if (typeof mostrarToastSucesso === 'function') {
            mostrarToastSucesso('Endereço importado com sucesso!');
        }
    } catch(e) {
        console.error(e);
        alert('Erro ao buscar CEP: ' + e.message);
    }
};

window.abrirWhatsApp = function() {
    const cel = document.getElementById('cli-celular')?.value || '';
    const cleanCel = cel.replace(/\D/g, '');
    if (!cleanCel) {
        alert('Por favor, informe o celular primeiro.');
        return;
    }
    window.open(`https://wa.me/55${cleanCel}`, '_blank');
};

window.abrirModalPesquisaCliente = async function() {
    try {
        const clientes = await apiGet('/clientes');
        if (!clientes || clientes.length === 0) {
            Swal.fire('Aviso', 'Nenhum cliente cadastrado ainda.', 'info');
            return;
        }

        const rowsHtml = clientes.map(c => `
            <tr onclick="selectClientePesquisa(${c.id})" style="cursor:pointer; border-bottom:1px solid #e2e8f0;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background=''">
                <td style="padding:0.5rem; text-align:left; font-weight:bold; color:#7048e8;">${c.codigo}</td>
                <td style="padding:0.5rem; text-align:left;">${c.nome_razao_social}</td>
                <td style="padding:0.5rem; text-align:left;">${c.cpf_cnpj}</td>
            </tr>
        `).join('');

        window.selectClientePesquisa = function(id) {
            Swal.close();
            carregarClienteParaEdicao(id);
        };

        Swal.fire({
            title: 'Pesquisar Cliente',
            html: `
                <div style="max-height:400px; overflow-y:auto;">
                    <table style="width:100%; border-collapse:collapse; font-size:0.85rem;">
                        <thead>
                            <tr style="background:#f8fafc; border-bottom:2px solid #cbd5e1;">
                                <th style="padding:0.5rem; text-align:left;">Código</th>
                                <th style="padding:0.5rem; text-align:left;">Nome / Razão Social</th>
                                <th style="padding:0.5rem; text-align:left;">CPF / CNPJ</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsHtml}
                        </tbody>
                    </table>
                </div>
            `,
            showConfirmButton: false,
            showCancelButton: true,
            cancelButtonText: 'Fechar'
        });
    } catch (e) {
        console.error(e);
        alert('Erro ao carregar lista de clientes: ' + e.message);
    }
};

window.carregarClienteParaEdicao = async function(id) {
    try {
        const c = await apiGet(`/clientes/${id}`);
        if (!c) throw new Error('Cliente não encontrado.');

        _clienteEditandoId = c.id;
        document.getElementById('cli-codigo').value = c.codigo || '';
        document.getElementById('cli-data-cadastro').value = c.data_cadastro || '';
        document.getElementById('cli-inativo').checked = c.inativo === 1;
        document.getElementById('cli-cpf-cnpj').value = c.cpf_cnpj || '';
        document.getElementById('cli-ie').value = c.inscricao_estadual || '';
        document.getElementById('cli-im').value = c.inscricao_municipal || '';
        document.getElementById('cli-razao-social').value = c.nome_razao_social || '';
        document.getElementById('cli-grupo').value = c.grupo_clientes || '';
        await atualizarClienteCentralizadorOptions(c.cliente_centralizador || '');
        document.getElementById('cli-nome-fantasia').value = c.nome_fantasia || '';
        document.getElementById('cli-cep').value = c.cep || '';
        document.getElementById('cli-endereco').value = c.endereco || '';
        document.getElementById('cli-numero').value = c.numero || '';
        document.getElementById('cli-complemento').value = c.complemento || '';
        document.getElementById('cli-bairro').value = c.bairro || '';
        document.getElementById('cli-uf').value = c.uf || '';
        document.getElementById('cli-municipio').value = c.municipio || '';
        document.getElementById('cli-pais').value = c.pais || 'BRASIL';
        document.getElementById('cli-telefone').value = c.telefone || '';
        document.getElementById('cli-ramal').value = c.ramal || '';
        document.getElementById('cli-telefone2').value = c.telefone_2 || '';
        document.getElementById('cli-ramal2').value = c.ramal_2 || '';
        document.getElementById('cli-fax').value = c.fax || '';
        document.getElementById('cli-website').value = c.website || '';
        document.getElementById('cli-celular-ddi').value = c.celular_ddi || '+55 (BRASIL)';
        document.getElementById('cli-celular').value = c.celular || '';

        // Carregar contatos e acordeões
        try {
            _clienteContatos = JSON.parse(c.contatos || '[]');
        } catch(e) {
            _clienteContatos = [];
        }
        _renderTabelaContatos();

        // Carregar outros campos JSON
        try {
            const p = JSON.parse(c.parametros || '{}');
            document.getElementById('cli-p-limite').checked = !!p.limite;
            document.getElementById('cli-p-retencao').checked = !!p.retencao;
        } catch(e) {}

        try {
            const f = JSON.parse(c.fiscal || '{}');
            document.getElementById('cli-f-tributario').value = f.enquadramento || 'Simples Nacional';
            document.getElementById('cli-f-iss').value = f.regime_iss || '';
            document.getElementById('cli-f-cnae').value = f.cnae || '';
        } catch(e) {}

        if (typeof mostrarToastSucesso === 'function') {
            mostrarToastSucesso(`Cliente ${c.codigo} carregado com sucesso!`);
        }
    } catch (e) {
        console.error(e);
        alert('Erro ao carregar dados do cliente: ' + e.message);
    }
};

window.limparFormCliente = function() {
    _clienteEditandoId = null;
    _clienteContatos = [];
    
    const form = document.getElementById('form-cadastro-cliente');
    if (form) form.reset();
    
    document.getElementById('cli-codigo').value = '';
    document.getElementById('cli-inativo').checked = false;
    
    // Resetar checkboxes adicionais
    const checkLimite = document.getElementById('cli-p-limite');
    if (checkLimite) checkLimite.checked = false;
    const checkRetencao = document.getElementById('cli-p-retencao');
    if (checkRetencao) checkRetencao.checked = false;
    
    // Resetar campos fiscais
    const tributario = document.getElementById('cli-f-tributario');
    if (tributario) tributario.value = 'Simples Nacional';
    const iss = document.getElementById('cli-f-iss');
    if (iss) iss.value = '';
    const cnae = document.getElementById('cli-f-cnae');
    if (cnae) cnae.value = '';

    // Resetar centralizador
    const selectCentralizador = document.getElementById('cli-centralizador');
    if (selectCentralizador) {
        selectCentralizador.innerHTML = '<option value="">-- Selecione --</option>';
    }

    _renderTabelaContatos();
};

window._renderTabelaContatos = function() {
    const tbody = document.getElementById('cli-contatos-tbody');
    if (!tbody) return;
    
    if (_clienteContatos.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="16" style="padding:1rem; text-align:center; color:#94a3b8;">
                    Nenhum contato adicionado.
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = _clienteContatos.map((c, idx) => `
        <tr style="border-bottom:1px solid #f1f5f9; transition:background 0.15s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''">
            <td style="padding:0.75rem 1rem; color:#475569;">${c.identificacao || '—'}</td>
            <td style="padding:0.75rem 1rem; color:#1e293b; font-weight:600;">${c.nome}</td>
            <td style="padding:0.75rem 1rem; color:#475569;">${c.departamento || '—'}</td>
            <td style="padding:0.75rem 1rem; color:#475569;">${c.celular || '—'}</td>
            <td style="padding:0.75rem 1rem; color:#475569;">${c.telefone_ramal || '—'}</td>
            <td style="padding:0.75rem 1rem; color:#475569;">${c.email || '—'}</td>
            <td style="padding:0.75rem 1rem; color:#475569;">${c.dono || '—'}</td>
            <td style="padding:0.75rem 1rem; color:#475569;">${c.cargo || '—'}</td>
            <td style="padding:0.75rem 1rem; color:#475569;">${c.situacao || '—'}</td>
            <td style="padding:0.75rem 1rem; color:#475569;">${c.nfe || 'Não'}</td>
            <td style="padding:0.75rem 1rem; color:#475569;">${c.cobranca || 'Não'}</td>
            <td style="padding:0.75rem 1rem; color:#475569;">${c.os || 'Não'}</td>
            <td style="padding:0.75rem 1rem; color:#475569;">${c.contrato || 'Não'}</td>
            <td style="padding:0.75rem 1rem; color:#475569;">${c.origem || '—'}</td>
            <td style="padding:0.75rem 1rem; color:#475569;">${c.inativo || 'Não'}</td>
            <td style="padding:0.75rem 1rem; text-align:center;">
                <button onclick="removerContato(${idx})" style="background:#ffe3e3; color:#e03131; border:none; padding:5px 8px; border-radius:6px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; transition:all 0.15s;" onmouseover="this.style.background='#fa5252'; this.style.color='#fff';" onmouseout="this.style.background='#ffe3e3'; this.style.color='#e03131';" title="Remover Contato">
                    <i class="ph ph-trash" style="font-size:0.95rem;"></i>
                </button>
            </td>
        </tr>
    `).join('');
};

window.encaminharNovoContato = async function() {
    const cnpjInput = document.getElementById('cli-cpf-cnpj');
    const rawCnpj = cnpjInput ? cnpjInput.value : '';
    const cleanCnpj = rawCnpj.replace(/\D/g, '');

    if (!_clienteEditandoId && cleanCnpj) {
        try {
            const clientes = await apiGet('/clientes');
            const client = clientes.find(c => c.cpf_cnpj && c.cpf_cnpj.replace(/\D/g, '') === cleanCnpj);
            if (client) {
                await window.carregarClienteParaEdicao(client.id);
            }
        } catch (err) {
            console.error(err);
        }
    }

    if (!_clienteEditandoId) {
        Swal.fire({
            title: 'Aviso',
            text: 'Por favor, preencha e salve o cliente primeiro para poder cadastrar contatos vinculados a ele.',
            icon: 'warning',
            confirmButtonColor: '#3b82f6',
            confirmButtonText: 'Ok'
        });
        return;
    }

    window.limparFormContato();
    window.switchPropostaTab('cadastro-contatos');
    await window.carregarEmpresaSelecionada(_clienteEditandoId);
};

window.abrirModalPesquisaContatoCliente = async function() {
    const cnpjInput = document.getElementById('cli-cpf-cnpj');
    const rawCnpj = cnpjInput ? cnpjInput.value : '';
    const cleanCnpj = rawCnpj.replace(/\D/g, '');

    const razaoInput = document.getElementById('cli-razao-social');
    const rawRazao = razaoInput ? razaoInput.value.trim().toLowerCase() : '';

    if (!cleanCnpj && !rawRazao) {
        Swal.fire({
            title: 'Aviso',
            text: 'Por favor, digite o CPF/CNPJ ou a Razão Social do cliente antes de pesquisar contatos.',
            icon: 'warning',
            confirmButtonColor: '#3b82f6',
            confirmButtonText: 'Ok'
        });
        return;
    }

    try {
        const clientes = await apiGet('/clientes');
        let client;

        if (cleanCnpj) {
            client = clientes.find(c => c.cpf_cnpj && c.cpf_cnpj.replace(/\D/g, '') === cleanCnpj);
        }

        if (!client && rawRazao) {
            client = clientes.find(c => c.nome_razao_social && c.nome_razao_social.trim().toLowerCase().includes(rawRazao));
        }

        if (client) {
            await window.carregarClienteParaEdicao(client.id);
        } else {
            Swal.fire({
                title: 'Aviso',
                text: 'Nenhum cliente cadastrado com este CNPJ ou Razão Social foi encontrado no banco de dados. Para pesquisar contatos, certifique-se de que o cliente já esteja cadastrado.',
                icon: 'warning',
                confirmButtonColor: '#3b82f6',
                confirmButtonText: 'Ok'
            });
            return;
        }

        Swal.fire({
            title: '<div style="font-size:1.15rem; font-weight:700; color:#1e293b; text-align:left; border-bottom:2px solid #e2e8f0; padding-bottom:8px;"><i class="ph ph-magnifying-glass"></i> Pesquisar Contatos do Cliente</div>',
            html: `
                <div style="text-align:left; font-family:'Inter', sans-serif; height:320px; display:flex; flex-direction:column;">
                    <input type="text" id="modal-search-contato" placeholder="Digite parte do nome para buscar..." style="width:100%; padding:0.55rem 0.75rem; border:1px solid #cbd5e1; border-radius:6px; font-size:0.85rem; margin-bottom:12px; box-sizing:border-box; outline:none; height:38px; flex-shrink:0;" oninput="window.filtrarContatosModal(this.value)">
                    <div id="modal-contatos-grid-container" style="flex:1; overflow-y:auto; border:1px solid #e2e8f0; border-radius:8px; background:#fff;"></div>
                </div>
            `,
            showConfirmButton: true,
            confirmButtonText: 'Fechar',
            confirmButtonColor: '#3b82f6',
            customClass: {
                popup: 'custom-swal-height'
            },
            didOpen: () => {
                window.filtrarContatosModal('');
                const input = document.getElementById('modal-search-contato');
                if (input) input.focus();
            }
        });
    } catch (err) {
        console.error(err);
        Swal.fire('Erro', 'Não foi possível buscar os contatos: ' + err.message, 'error');
    }
};

window.filtrarContatosModal = function(term = '') {
    const container = document.getElementById('modal-contatos-grid-container');
    if (!container) return;

    const filtered = _clienteContatos.filter(c => 
        (c.nome && c.nome.toLowerCase().includes(term.toLowerCase())) ||
        (c.identificacao && c.identificacao.toString().includes(term)) ||
        (c.departamento && c.departamento.toLowerCase().includes(term.toLowerCase())) ||
        (c.email && c.email.toLowerCase().includes(term.toLowerCase()))
    );

    if (filtered.length === 0) {
        container.innerHTML = `
            <div style="padding:1.5rem; text-align:center; color:#64748b; font-family:'Inter', sans-serif;">
                Nenhum contato encontrado para o termo pesquisado.
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <table style="width:100%; border-collapse:collapse; font-size:0.82rem; font-family:'Inter', sans-serif; text-align:left;">
            <thead>
                <tr style="background:#f8fafc; color:#475569; border-bottom:2px solid #e2e8f0;">
                    <th style="padding:0.65rem 1rem; font-weight:700;">Identificação</th>
                    <th style="padding:0.65rem 1rem; font-weight:700;">Nome</th>
                    <th style="padding:0.65rem 1rem; font-weight:700;">Departamento</th>
                    <th style="padding:0.65rem 1rem; font-weight:700;">Celular</th>
                    <th style="padding:0.65rem 1rem; font-weight:700;">E-mail</th>
                </tr>
            </thead>
            <tbody>
                ${filtered.map(c => `
                    <tr style="border-bottom:1px solid #f1f5f9; transition:background 0.15s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''">
                        <td style="padding:0.65rem 1rem; color:#475569;">${c.identificacao || '—'}</td>
                        <td style="padding:0.65rem 1rem; color:#1e293b; font-weight:600;">${c.nome}</td>
                        <td style="padding:0.65rem 1rem; color:#475569;">${c.departamento || '—'}</td>
                        <td style="padding:0.65rem 1rem; color:#475569;">${c.celular || '—'}</td>
                        <td style="padding:0.65rem 1rem; color:#475569;">${c.email || '—'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
};

window.removerContato = function(idx) {
    if (confirm('Deseja realmente remover este contato?')) {
        _clienteContatos.splice(idx, 1);
        _renderTabelaContatos();
    }
};

window.abrirModalNovoContato = function() {
    Swal.fire({
        title: 'Novo Contato',
        html: `
            <div style="text-align:left; display:grid; grid-template-columns:1fr 1fr; gap:0.8rem; font-size:0.85rem;">
                <div>
                    <label style="font-weight:bold;display:block;margin-bottom:3px;">Identificação *</label>
                    <input id="swal-contato-id" class="swal2-input" style="width:100%;margin:0;padding:0.4rem;height:auto;font-size:0.85rem;" placeholder="Ex: 14848">
                </div>
                <div>
                    <label style="font-weight:bold;display:block;margin-bottom:3px;">Nome *</label>
                    <input id="swal-contato-nome" class="swal2-input" style="width:100%;margin:0;padding:0.4rem;height:auto;font-size:0.85rem;" placeholder="Nome Completo">
                </div>
                <div>
                    <label style="font-weight:bold;display:block;margin-bottom:3px;">Departamento</label>
                    <input id="swal-contato-depto" class="swal2-input" style="width:100%;margin:0;padding:0.4rem;height:auto;font-size:0.85rem;">
                </div>
                <div>
                    <label style="font-weight:bold;display:block;margin-bottom:3px;">Celular</label>
                    <input id="swal-contato-celular" class="swal2-input" style="width:100%;margin:0;padding:0.4rem;height:auto;font-size:0.85rem;" placeholder="(99) 99999-9999">
                </div>
                <div>
                    <label style="font-weight:bold;display:block;margin-bottom:3px;">Telefone/Ramal</label>
                    <input id="swal-contato-tel" class="swal2-input" style="width:100%;margin:0;padding:0.4rem;height:auto;font-size:0.85rem;">
                </div>
                <div>
                    <label style="font-weight:bold;display:block;margin-bottom:3px;">E-mail *</label>
                    <input id="swal-contato-email" class="swal2-input" style="width:100%;margin:0;padding:0.4rem;height:auto;font-size:0.85rem;" placeholder="email@dominio.com">
                </div>
                <div>
                    <label style="font-weight:bold;display:block;margin-bottom:3px;">Dono</label>
                    <input id="swal-contato-dono" class="swal2-input" style="width:100%;margin:0;padding:0.4rem;height:auto;font-size:0.85rem;">
                </div>
                <div>
                    <label style="font-weight:bold;display:block;margin-bottom:3px;">Cargo</label>
                    <input id="swal-contato-cargo" class="swal2-input" style="width:100%;margin:0;padding:0.4rem;height:auto;font-size:0.85rem;">
                </div>
                <div>
                    <label style="font-weight:bold;display:block;margin-bottom:3px;">Situação</label>
                    <input id="swal-contato-situacao" class="swal2-input" style="width:100%;margin:0;padding:0.4rem;height:auto;font-size:0.85rem;">
                </div>
                <div>
                    <label style="font-weight:bold;display:block;margin-bottom:3px;">Recebe E-mail de NFe?</label>
                    <select id="swal-contato-nfe" class="swal2-select" style="width:100%;margin:0;padding:0.4rem;height:auto;font-size:0.85rem;">
                        <option value="Não">Não</option>
                        <option value="Sim">Sim</option>
                    </select>
                </div>
                <div>
                    <label style="font-weight:bold;display:block;margin-bottom:3px;">Recebe E-mail Cobrança/Boleto?</label>
                    <select id="swal-contato-cobranca" class="swal2-select" style="width:100%;margin:0;padding:0.4rem;height:auto;font-size:0.85rem;">
                        <option value="Não">Não</option>
                        <option value="Sim">Sim</option>
                    </select>
                </div>
                <div>
                    <label style="font-weight:bold;display:block;margin-bottom:3px;">Recebe E-mail Situação OS?</label>
                    <select id="swal-contato-os" class="swal2-select" style="width:100%;margin:0;padding:0.4rem;height:auto;font-size:0.85rem;">
                        <option value="Não">Não</option>
                        <option value="Sim">Sim</option>
                    </select>
                </div>
                <div>
                    <label style="font-weight:bold;display:block;margin-bottom:3px;">Recebe E-mail Contrato?</label>
                    <select id="swal-contato-contrato" class="swal2-select" style="width:100%;margin:0;padding:0.4rem;height:auto;font-size:0.85rem;">
                        <option value="Não">Não</option>
                        <option value="Sim">Sim</option>
                    </select>
                </div>
                <div>
                    <label style="font-weight:bold;display:block;margin-bottom:3px;">Origem</label>
                    <input id="swal-contato-origem" class="swal2-input" style="width:100%;margin:0;padding:0.4rem;height:auto;font-size:0.85rem;">
                </div>
                <div style="grid-column:span 2;">
                    <label style="font-weight:bold;display:block;margin-bottom:3px;">Inativo?</label>
                    <select id="swal-contato-inativo" class="swal2-select" style="width:100%;margin:0;padding:0.4rem;height:auto;font-size:0.85rem;">
                        <option value="Não">Não</option>
                        <option value="Sim">Sim</option>
                    </select>
                </div>
            </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Adicionar',
        cancelButtonText: 'Cancelar',
        preConfirm: () => {
            const idVal = document.getElementById('swal-contato-id').value;
            const nomeVal = document.getElementById('swal-contato-nome').value;
            const emailVal = document.getElementById('swal-contato-email').value;
            
            if (!idVal || !nomeVal || !emailVal) {
                Swal.showValidationMessage('Identificação, Nome e E-mail são obrigatórios.');
                return false;
            }
            return {
                identificacao: idVal,
                nome: nomeVal,
                departamento: document.getElementById('swal-contato-depto').value,
                celular: document.getElementById('swal-contato-celular').value,
                telefone_ramal: document.getElementById('swal-contato-tel').value,
                email: emailVal,
                dono: document.getElementById('swal-contato-dono').value,
                cargo: document.getElementById('swal-contato-cargo').value,
                situacao: document.getElementById('swal-contato-situacao').value,
                nfe: document.getElementById('swal-contato-nfe').value,
                cobranca: document.getElementById('swal-contato-cobranca').value,
                os: document.getElementById('swal-contato-os').value,
                contrato: document.getElementById('swal-contato-contrato').value,
                origem: document.getElementById('swal-contato-origem').value,
                inativo: document.getElementById('swal-contato-inativo').value
            };
        }
    }).then((result) => {
        if (result.isConfirmed) {
            _clienteContatos.push(result.value);
            _renderTabelaContatos();
        }
    });
};

window.salvarCliente = async function() {
    const cpfCnpj = document.getElementById('cli-cpf-cnpj')?.value || '';
    const razaoSocial = document.getElementById('cli-razao-social')?.value || '';
    
    if (!cpfCnpj) {
        alert('Por favor, informe o CPF / CNPJ.');
        return;
    }
    if (!razaoSocial) {
        alert('Por favor, informe a Razão Social.');
        return;
    }

    const parametros = {
        limite: document.getElementById('cli-p-limite')?.checked || false,
        retencao: document.getElementById('cli-p-retencao')?.checked || false
    };

    const fiscal = {
        enquadramento: document.getElementById('cli-f-tributario')?.value || 'Simples Nacional',
        regime_iss: document.getElementById('cli-f-iss')?.value || '',
        cnae: document.getElementById('cli-f-cnae')?.value || ''
    };

    const payload = {
        codigo: document.getElementById('cli-codigo')?.value || null,
        data_cadastro: document.getElementById('cli-data-cadastro')?.value || '',
        inativo: document.getElementById('cli-inativo')?.checked ? 1 : 0,
        cpf_cnpj: cpfCnpj,
        inscricao_estadual: document.getElementById('cli-ie')?.value || '',
        inscricao_municipal: document.getElementById('cli-im')?.value || '',
        rg: '',
        data_nascimento: '',
        grupo_clientes: document.getElementById('cli-grupo')?.value || '',
        cliente_centralizador: document.getElementById('cli-centralizador')?.value || '',
        nome_razao_social: razaoSocial,
        nome_fantasia: document.getElementById('cli-nome-fantasia')?.value || '',
        cep: document.getElementById('cli-cep')?.value || '',
        endereco: document.getElementById('cli-endereco')?.value || '',
        numero: document.getElementById('cli-numero')?.value || '',
        complemento: document.getElementById('cli-complemento')?.value || '',
        bairro: document.getElementById('cli-bairro')?.value || '',
        uf: document.getElementById('cli-uf')?.value || '',
        municipio: document.getElementById('cli-municipio')?.value || '',
        pais: document.getElementById('cli-pais')?.value || 'BRASIL',
        telefone: document.getElementById('cli-telefone')?.value || '',
        ramal: document.getElementById('cli-ramal')?.value || '',
        telefone_2: document.getElementById('cli-telefone2')?.value || '',
        ramal_2: document.getElementById('cli-ramal2')?.value || '',
        fax: document.getElementById('cli-fax')?.value || '',
        website: document.getElementById('cli-website')?.value || '',
        celular_ddi: document.getElementById('cli-celular-ddi')?.value || '',
        celular: document.getElementById('cli-celular')?.value || '',
        parametros: JSON.stringify(parametros),
        fiscal: JSON.stringify(fiscal),
        contatos: JSON.stringify(_clienteContatos),
        validacao_dados: '',
        anexo_arquivos: '',
        criado_por: window.currentUser?.nome || window.currentUser?.email || ''
    };

    try {
        let res;
        if (_clienteEditandoId) {
            res = await apiPut(`/clientes/${_clienteEditandoId}`, payload);
        } else {
            res = await apiPost('/clientes', payload);
        }

        if (res && res.success) {
            _clientesCache = []; // Limpar cache para atualizar centralizadores
            if (!_clienteEditandoId && res.id) {
                _clienteEditandoId = res.id;
                document.getElementById('cli-codigo').value = res.codigo || '';
            }
            if (typeof mostrarToastSucesso === 'function') {
                mostrarToastSucesso(_clienteEditandoId ? 'Cliente atualizado com sucesso!' : 'Cliente cadastrado com sucesso!');
            }
            if (_redirectAfterClientSave) {
                _redirectAfterClientSave = false;
                const propClienteInput = document.getElementById('prop-cliente');
                if (propClienteInput) propClienteInput.value = razaoSocial;
                window.switchPropostaTab('form');
            }
        } else {
            alert('Erro ao salvar cliente: ' + (res?.error || 'Erro desconhecido.'));
        }
    } catch (e) {
        console.error(e);
        alert('Erro de comunicação com o servidor.');
    }
};

window.excluirCliente = async function() {
    if (!_clienteEditandoId) {
        alert('Selecione um cliente cadastrado para poder excluir.');
        return;
    }
    if (!confirm('Deseja realmente excluir este cliente permanentemente?')) {
        return;
    }
    
    try {
        const res = await apiDelete(`/clientes/${_clienteEditandoId}`);
        if (res && res.success) {
            _clientesCache = []; // Limpar cache
            limparFormCliente();
            if (typeof mostrarToastSucesso === 'function') {
                mostrarToastSucesso('Cliente excluído com sucesso.');
            }
        } else {
            alert('Erro ao excluir cliente: ' + (res?.error || 'Erro desconhecido.'));
        }
    } catch (e) {
        console.error(e);
        alert('Erro ao comunicar com o servidor.');
    }
};

window.recarregarCliente = function() {
    if (_clienteEditandoId) {
        carregarClienteParaEdicao(_clienteEditandoId);
    } else {
        limparFormCliente();
    }
};

window.verificarCliente = function() {
    const cpfCnpj = document.getElementById('cli-cpf-cnpj')?.value || '';
    const razaoSocial = document.getElementById('cli-razao-social')?.value || '';
    
    if (!cpfCnpj) {
        alert('Falta preencher: CPF / CNPJ.');
        return;
    }
    if (!razaoSocial) {
        alert('Falta preencher: Nome / Razão Social.');
        return;
    }
    
    alert('Campos validados com sucesso! Pronto para salvar.');
};

console.log('[PROPOSTAS] Módulo frontend carregado.');
console.log('[CLIENTES] Módulo frontend de cadastro de clientes carregado.');


// ══════════════════════════════════════════════════════════════════════
// CADASTRO DE CONTATOS: RENDER & EVENT HANDLERS (NOVO LAYOUT)
// ══════════════════════════════════════════════════════════════════════
function _renderCadastroContatosInt() {
    const container = document.getElementById('prop-view-cadastro-contatos');
    if (!container) return;
    
    container.innerHTML = `
        <style>
            .cc-container {
                background: #fff;
                width: 100%;
                border-radius: 14px;
                box-shadow: 0 5px 20px rgba(0,0,0,0.05);
                overflow: visible;
                margin: 0 auto;
                border: 1px solid #e2e8f0;
                font-family: 'Inter', sans-serif;
            }
            .cc-toolbar {
                background: #f8fafc;
                border-bottom: 1px solid #e2e8f0;
                padding: 0.65rem 1.5rem;
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-wrap: wrap;
                gap: 0.6rem;
                position: sticky;
                top: 98px;
                z-index: 997;
                border-top-left-radius: 14px;
                border-top-right-radius: 14px;
            }
            .cc-ribbon-checkboxes {
                display: flex;
                gap: 1.25rem;
                align-items: center;
                font-size: 0.85rem;
                font-weight: 600;
                flex-wrap: wrap;
            }
            .cc-ribbon-checkboxes label {
                display: flex;
                align-items: center;
                gap: 0.35rem;
                cursor: pointer;
            }
            .cc-ribbon-checkboxes input[type="checkbox"] {
                accent-color: #3b82f6;
                width: 1rem;
                height: 1rem;
                cursor: pointer;
            }
            .cc-form-body {
                padding: 1.5rem;
            }
            .cc-section-title {
                font-size: 0.9rem;
                font-weight: 800;
                color: #475569;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                border-bottom: 2px solid #e2e8f0;
                padding-bottom: 0.4rem;
                margin: 1.5rem 0 1rem 0;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }
            .cc-section-title.first {
                margin-top: 0;
            }
            .cc-grid {
                display: grid;
                gap: 0.75rem 1rem;
            }
            .cc-grid-contact-row1 {
                grid-template-columns: 1.5fr 3.5fr 2fr 2fr;
            }
            .cc-grid-contact-row2 {
                grid-template-columns: 1.5fr 1.5fr 1.5fr 1.2fr 1.2fr 1.5fr;
            }
            .cc-grid-contact-row3 {
                grid-template-columns: 1.5fr 1.5fr 1.2fr 1.8fr 1.2fr 1.2fr;
            }
            .cc-grid-contact-row4 {
                grid-template-columns: 1.5fr 0.8fr 4fr;
            }
            .cc-grid-company-row1 {
                grid-template-columns: 4fr 2fr 1.5fr;
            }
            .cc-grid-company-row2 {
                grid-template-columns: 3.5fr 1fr 2fr 2.5fr 1fr;
            }
            .cc-grid-company-row3 {
                grid-template-columns: 1.5fr 0.8fr 1.5fr 1.5fr 0.8fr 2fr;
            }
            .cc-field {
                display: flex;
                flex-direction: column;
                gap: 0.25rem;
            }
            .cc-field label {
                font-size: 0.75rem;
                font-weight: 700;
                color: #64748b;
                text-transform: uppercase;
                letter-spacing: 0.02em;
            }
            .cc-input, .cc-select {
                padding: 0.55rem 0.75rem;
                border: 1px solid #cbd5e1;
                border-radius: 6px;
                font-size: 0.85rem;
                background: #fff;
                color: #1e293b;
                outline: none;
                transition: all 0.2s;
                box-sizing: border-box;
                width: 100%;
                height: 38px;
            }
            .cc-input:focus, .cc-select:focus {
                border-color: #3b82f6;
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
            }
            .cc-input[readonly] {
                background: #f1f5f9;
                color: #64748b;
                cursor: not-allowed;
            }
            .cc-input-group {
                display: flex;
                gap: 0.35rem;
                width: 100%;
            }
            .cc-btn-addon {
                background: #16a34a;
                color: #fff;
                border: none;
                padding: 0.5rem 0.75rem;
                border-radius: 6px;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                font-weight: 600;
                transition: all 0.2s;
                height: 38px;
                box-sizing: border-box;
            }
            .cc-btn-addon:hover {
                background: #15803d;
            }
            .cc-btn-addon.secondary {
                background: #475569;
            }
            .cc-btn-addon.secondary:hover {
                background: #334155;
            }
            .cc-btn-addon.success {
                background: #25d366;
            }
            .cc-btn-addon.success:hover {
                background: #20ba5a;
            }
            @media (max-width: 992px) {
                .cc-grid-contact-row1, .cc-grid-contact-row2, .cc-grid-contact-row3, .cc-grid-contact-row4,
                .cc-grid-company-row1, .cc-grid-company-row2, .cc-grid-company-row3 {
                    grid-template-columns: 1fr 1fr !important;
                }
            }
            @media (max-width: 576px) {
                .cc-grid-contact-row1, .cc-grid-contact-row2, .cc-grid-contact-row3, .cc-grid-contact-row4,
                .cc-grid-company-row1, .cc-grid-company-row2, .cc-grid-company-row3 {
                    grid-template-columns: 1fr !important;
                }
            }
        </style>

        <div class="cc-container">
            <!-- Barra de Ferramentas -->
            <div class="cc-toolbar">
                <!-- Badge Lado Esquerdo -->
                <div style="background:#2e58a6; color:white; padding:0.45rem 0.9rem; border-radius:6px; font-weight:700; font-size:0.86rem; display:flex; align-items:center; gap:0.4rem; font-family:'Inter', sans-serif; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <i class="ph ph-identification-card" style="font-size:1.15rem;"></i>
                    Cadastro de Contatos
                </div>

                <!-- Botões de Ação (Lado Direito) -->
                <div style="display:flex; gap:0.4rem; align-items:center; flex-wrap:wrap;">
                    <button onclick="recarregarContato()" title="Recarregar" style="background:#e2e8f0; color:#475569; border:none; width:34px; height:34px; border-radius:6px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; transition:all 0.15s; outline:none;" onmouseover="this.style.background='#cbd5e1'" onmouseout="this.style.background='#e2e8f0'">
                        <i class="ph ph-arrows-clockwise" style="font-size:1.15rem;"></i>
                    </button>

                    <!-- Spacer -->
                    <div style="width: 4px;"></div>

                    <button onclick="limparFormContato()" style="background:#3b82f6; color:white; border:none; padding:0.45rem 1rem; border-radius:6px; cursor:pointer; font-weight:600; font-size:0.82rem; display:inline-flex; align-items:center; gap:5px; transition:background 0.15s;" onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'" onfocus="this.blur()">
                        <i class="ph ph-file-text" style="font-size:1rem;"></i> Novo
                    </button>
                    <button onclick="salvarContato()" style="background:#16a34a; color:white; border:none; padding:0.45rem 1rem; border-radius:6px; cursor:pointer; font-weight:600; font-size:0.82rem; display:inline-flex; align-items:center; gap:5px; transition:background 0.15s;" onmouseover="this.style.background='#15803d'" onmouseout="this.style.background='#16a34a'" onfocus="this.blur()">
                        <i class="ph ph-check" style="font-size:1rem;"></i> Salvar
                    </button>
                    <button onclick="excluirContato()" style="background:#dc2626; color:white; border:none; padding:0.45rem 1rem; border-radius:6px; cursor:pointer; font-weight:600; font-size:0.82rem; display:inline-flex; align-items:center; gap:5px; transition:background 0.15s;" onmouseover="this.style.background='#b91c1c'" onmouseout="this.style.background='#dc2626'" onfocus="this.blur()">
                        <i class="ph ph-trash" style="font-size:1rem;"></i> Excluir
                    </button>
                </div>
            </div>

            <!-- Corpo da Tela -->
            <div class="cc-form-body" style="padding-bottom: 0;">
                
                <!-- Checkboxes info bar at the top of form body -->
                <div style="display:flex; justify-content:space-between; align-items:center; background:#f0f7ff; border:1px solid #c2e0ff; padding:0.6rem 1.2rem; border-radius:6px; margin-bottom:1rem; font-size:0.85rem; color:#1e40af; flex-wrap:wrap; gap:0.5rem;">
                    <div style="font-weight:600; display:flex; align-items:center; gap:6px;">
                        <i class="ph ph-info" style="font-size:1.1rem;"></i>
                        Configure as notificações de e-mail e status do contato.
                    </div>
                    <div class="cc-ribbon-checkboxes" style="color:#1e293b;">
                        <label>
                            <input type="checkbox" id="con-email-nfe"> Envio NFe
                        </label>
                        <label>
                            <input type="checkbox" id="con-email-cobranca"> Cobrança
                        </label>
                        <label>
                            <input type="checkbox" id="con-email-os"> OS
                        </label>
                        <label>
                            <input type="checkbox" id="con-email-contrato"> Contrato
                        </label>
                        <label style="margin-left:8px; border-left:1px solid #cbd5e1; padding-left:12px;">
                            <input type="checkbox" id="con-inativo"> Inativo
                        </label>
                    </div>
                </div>
            </div>

            <!-- Formulário -->
            <div class="cc-form-body" style="padding-top: 0.5rem;">
                <form id="form-cadastro-contatos" onsubmit="return false;">
                    
                    <!-- SEÇÃO: DADOS DO CONTATO -->
                    <div class="cc-section-title first">
                        <i class="ph ph-identification-card"></i> Dados do Contato
                    </div>

                    <div class="cc-grid" style="display: flex; flex-direction: column; gap: 0.75rem;">
                        <!-- Linha 1: ID/Código, Nome, Celular, E-mail -->
                        <div class="cc-grid cc-grid-contact-row1">
                            <div class="cc-field">
                                <label>Código</label>
                                <div class="cc-input-group">
                                    <button onclick="navegarContato('anterior')" class="cc-btn-addon secondary" title="Anterior"><i class="ph ph-caret-left"></i></button>
                                    <input type="text" id="con-codigo" readonly placeholder="Auto" class="cc-input" style="text-align: center; font-weight: bold; color: #7048e8;">
                                    <button onclick="navegarContato('proximo')" class="cc-btn-addon secondary" title="Próximo"><i class="ph ph-caret-right"></i></button>
                                    <button onclick="abrirModalPesquisaContato()" class="cc-btn-addon" title="Buscar Contato"><i class="ph ph-magnifying-glass"></i></button>
                                </div>
                            </div>
                            <div class="cc-field">
                                <label>Nome *</label>
                                <input type="text" id="con-nome" placeholder="Nome Completo" class="cc-input">
                            </div>
                            <div class="cc-field">
                                <label>Celular</label>
                                <div class="cc-input-group">
                                    <input type="text" id="con-celular" placeholder="(XX) XXXXX-XXXX" class="cc-input">
                                    <button onclick="abrirWhatsAppContato()" class="cc-btn-addon success" title="WhatsApp"><i class="ph ph-whatsapp-logo" style="font-size: 1.2rem;"></i></button>
                                </div>
                            </div>
                            <div class="cc-field">
                                <label>E-mail *</label>
                                <input type="email" id="con-email" placeholder="nome@empresa.com" class="cc-input">
                            </div>
                        </div>

                        <!-- Linha 2: Tipo, Representante, Cargo, Sexo, Nascimento, Departamento -->
                        <div class="cc-grid cc-grid-contact-row2">
                            <div class="cc-field">
                                <label>Tipo</label>
                                <select id="con-tipo" class="cc-select">
                                    <option value="">-- Selecione --</option>
                                    <option value="1 - Principal">1 - Principal</option>
                                    <option value="2 - Financeiro">2 - Financeiro</option>
                                    <option value="3 - Comercial">3 - Comercial</option>
                                    <option value="4 - Técnico">4 - Técnico</option>
                                    <option value="5 - Diretoria">5 - Diretoria</option>
                                    <option value="6 - Outros">6 - Outros</option>
                                </select>
                            </div>
                            <div class="cc-field">
                                <label>Representante</label>
                                <input type="text" id="con-representante" class="cc-input">
                            </div>
                            <div class="cc-field">
                                <label>Cargo</label>
                                <input type="text" id="con-cargo" class="cc-input">
                            </div>
                            <div class="cc-field">
                                <label>Sexo</label>
                                <select id="con-sexo" class="cc-select">
                                    <option value="">--</option>
                                    <option value="M">Masculino</option>
                                    <option value="F">Feminino</option>
                                    <option value="O">Outro</option>
                                </select>
                            </div>
                            <div class="cc-field">
                                <label>Nascimento</label>
                                <input type="date" id="con-nascimento" class="cc-input">
                            </div>
                            <div class="cc-field">
                                <label>Departamento</label>
                                <input type="text" id="con-departamento" class="cc-input">
                            </div>
                        </div>

                        <!-- Linha 3: Origem, Influenciador, Classificação, Ramo, Região, Nextel -->
                        <div class="cc-grid cc-grid-contact-row3">
                            <div class="cc-field">
                                <label>Origem</label>
                                <input type="text" id="con-origem" class="cc-input">
                            </div>
                            <div class="cc-field">
                                <label>Influenciador</label>
                                <select id="con-influenciador" class="cc-select">
                                    <option value="">-- Selecione --</option>
                                    <option value="Sim">Sim</option>
                                    <option value="Não">Não</option>
                                </select>
                            </div>
                            <div class="cc-field">
                                <label>Classificação</label>
                                <select id="con-classificacao" class="cc-select">
                                    <option value="">-- Selecione --</option>
                                    <option value="1 - Diamante">1 - Diamante</option>
                                    <option value="2 - Ouro">2 - Ouro</option>
                                    <option value="3 - Prata">3 - Prata</option>
                                    <option value="4 - Bronze">4 - Bronze</option>
                                </select>
                            </div>
                            <div class="cc-field">
                                <label>Ramo de Atividade</label>
                                <input type="text" id="con-ramo-atividade" class="cc-input">
                            </div>
                            <div class="cc-field">
                                <label>Região</label>
                                <input type="text" id="con-regiao" class="cc-input">
                            </div>
                            <div class="cc-field">
                                <label>Nextel</label>
                                <input type="text" id="con-nextel" class="cc-input">
                            </div>
                        </div>

                        <!-- Linha 4: Telefone, Ramal, Outra Comunicação -->
                        <div class="cc-grid cc-grid-contact-row4">
                            <div class="cc-field">
                                <label>Telefone</label>
                                <input type="text" id="con-telefone" placeholder="(XX) XXXX-XXXX" class="cc-input">
                            </div>
                            <div class="cc-field">
                                <label>Ramal</label>
                                <input type="text" id="con-ramal" class="cc-input">
                            </div>
                            <div class="cc-field">
                                <label>Outras Comunicações</label>
                                <input type="text" id="con-outra-comunicacao" class="cc-input">
                            </div>
                        </div>
                    </div>

                    <!-- SEÇÃO: EMPRESA CLIENTE -->
                    <div class="cc-section-title">
                        <i class="ph ph-buildings"></i> Empresa Cliente
                    </div>

                    <div class="cc-grid" style="display: flex; flex-direction: column; gap: 0.75rem;">
                        <!-- Linha 1: Cliente, CNPJ, CEP -->
                        <div class="cc-grid cc-grid-company-row1">
                            <div class="cc-field">
                                <label>Cliente (Razão Social) *</label>
                                <div class="cc-input-group">
                                    <input type="text" id="emp-codigo" readonly placeholder="Cód" class="cc-input" style="width: 80px; font-weight: bold; text-align: center;">
                                    <input type="text" id="emp-razao-social" placeholder="Razão Social da Empresa" class="cc-input" oninput="atualizarClienteCentralizadorOptions()">
                                    <button onclick="abrirModalPesquisaEmpresa()" class="cc-btn-addon" title="Buscar Empresa"><i class="ph ph-magnifying-glass"></i></button>
                                    <button onclick="limparEmpresaCliente()" class="cc-btn-addon secondary" title="Nova Empresa"><i class="ph ph-plus"></i></button>
                                </div>
                            </div>
                            <div class="cc-field">
                                <label>CNPJ *</label>
                                <div class="cc-input-group">
                                    <input type="text" id="emp-cnpj" placeholder="CNPJ da Empresa" class="cc-input">
                                    <button onclick="buscarCNPJContatos()" id="btn-busca-cnpj" class="cc-btn-addon" title="Buscar CNPJ no WebService"><i class="ph ph-magnifying-glass"></i></button>
                                </div>
                            </div>
                            <div class="cc-field">
                                <label>CEP</label>
                                <div class="cc-input-group">
                                    <input type="text" id="emp-cep" placeholder="00000-000" class="cc-input">
                                    <button onclick="buscarCEPContatos()" class="cc-btn-addon" title="Buscar CEP"><i class="ph ph-magnifying-glass"></i></button>
                                </div>
                            </div>
                        </div>

                        <!-- Linha 2: Endereço, Número, Bairro, Cidade, UF -->
                        <div class="cc-grid cc-grid-company-row2">
                            <div class="cc-field">
                                <label>Endereço</label>
                                <input type="text" id="emp-endereco" class="cc-input">
                            </div>
                            <div class="cc-field">
                                <label>Número</label>
                                <input type="text" id="emp-numero" class="cc-input">
                            </div>
                            <div class="cc-field">
                                <label>Bairro</label>
                                <input type="text" id="emp-bairro" class="cc-input">
                            </div>
                            <div class="cc-field">
                                <label>Cidade</label>
                                <input type="text" id="emp-cidade" class="cc-input">
                            </div>
                            <div class="cc-field">
                                <label>UF</label>
                                <select id="emp-uf" class="cc-select">
                                    <option value="">--</option>
                                    ${['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']
                                        .map(uf => `<option value="${uf}">${uf}</option>`).join('')}
                                </select>
                            </div>
                        </div>

                        <!-- Linha de controle: Grupo de Clientes e Cliente Centralizador -->
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                            <div class="cc-field">
                                <label>Grupo de Clientes</label>
                                <select id="emp-grupo" class="cc-select">
                                    <option value="">-- Selecione --</option>
                                    <option value="1 - Diamante">1 - Diamante</option>
                                    <option value="2 - Ouro">2 - Ouro</option>
                                    <option value="3 - Prata">3 - Prata</option>
                                    <option value="4 - Bronze">4 - Bronze</option>
                                </select>
                            </div>
                            <div class="cc-field">
                                <label>Cliente Centralizador</label>
                                <select id="emp-centralizador" class="cc-select">
                                    <option value="">-- Selecione --</option>
                                </select>
                            </div>
                        </div>

                        <!-- Linha 3: Telefone, Ramal, Telefone 2, Ramal 2, Fax, Website -->
                        <div class="cc-grid cc-grid-company-row3">
                            <div class="cc-field">
                                <label>Telefone</label>
                                <input type="text" id="emp-telefone" class="cc-input">
                            </div>
                            <div class="cc-field">
                                <label>Ramal</label>
                                <input type="text" id="emp-ramal" class="cc-input">
                            </div>
                            <div class="cc-field">
                                <label>Telefone 2</label>
                                <input type="text" id="emp-telefone2" class="cc-input">
                            </div>
                            <div class="cc-field">
                                <label>Ramal 2</label>
                                <input type="text" id="emp-ramal2" class="cc-input">
                            </div>
                            <div class="cc-field">
                                <label>Fax</label>
                                <input type="text" id="emp-fax" class="cc-input">
                            </div>
                            <div class="cc-field">
                                <label>Website (Site)</label>
                                <input type="text" id="emp-site" placeholder="www.empresa.com" class="cc-input">
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    `;

    // Hook para carregar o registro ativo ou o mais recente ao abrir a tela
    if (!_contatoEditandoId) {
        apiGet('/contatos').then(list => {
            if (list && list.length > 0) {
                carregarContatoParaEdicao(list[list.length - 1].id); // Carrega o mais recente
            } else {
                limparFormContato();
            }
        }).catch(e => {
            console.error(e);
            limparFormContato();
        });
    } else {
        carregarContatoParaEdicao(_contatoEditandoId);
    }
}

window.atualizarClienteCentralizadorOptions = async function(selectedValue = null) {
    const razaoSocialInput = document.getElementById('emp-razao-social');
    const selectCentralizador = document.getElementById('emp-centralizador');
    if (!selectCentralizador) return;

    if (!_clientesCache || _clientesCache.length === 0) {
        try {
            _clientesCache = await apiGet('/clientes') || [];
        } catch (e) {
            console.error('Erro ao carregar clientes para centralizador:', e);
            _clientesCache = [];
        }
    }

    const currentVal = razaoSocialInput ? razaoSocialInput.value.trim() : '';
    const words = currentVal.split(/\s+/).filter(w => w.length > 2);
    const filterWord = words.length > 0 ? words[0] : '';

    let filtered = [];
    if (filterWord) {
        const cleanStr = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        const searchVal = cleanStr(filterWord);
        
        filtered = _clientesCache.filter(c => {
            const nameClean = cleanStr(c.nome_razao_social || '');
            return nameClean.includes(searchVal);
        });
    }

    if (selectedValue) {
        const alreadyInList = filtered.some(c => String(c.codigo) === String(selectedValue) || String(c.nome_razao_social) === String(selectedValue));
        if (!alreadyInList) {
            const found = _clientesCache.find(c => String(c.codigo) === String(selectedValue) || String(c.nome_razao_social) === String(selectedValue));
            if (found) {
                filtered.unshift(found);
            }
        }
    }

    let optionsHtml = '<option value="">-- Selecione --</option>';
    filtered.forEach(c => {
        const isSelected = selectedValue && (String(c.codigo) === String(selectedValue) || String(c.nome_razao_social) === String(selectedValue)) ? 'selected' : '';
        optionsHtml += `<option value="${c.codigo}" ${isSelected}>${c.codigo} - ${c.nome_razao_social}</option>`;
    });

    selectCentralizador.innerHTML = optionsHtml;
};

window.buscarCNPJContatos = async function() {
    const cnpjRaw = document.getElementById('emp-cnpj')?.value || '';
    const cnpj = cnpjRaw.replace(/\D/g, '');
    if (cnpj.length !== 14) {
        alert('Por favor, informe um CNPJ válido com 14 dígitos para buscar.');
        return;
    }

    const btn = document.getElementById('btn-busca-cnpj');
    const origText = btn.innerHTML;
    btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i>';
    btn.disabled = true;

    try {
        const result = await apiGet('/consulta-cnpj/' + cnpj);
        if (!result || !result.data) {
            throw new Error('Retorno inválido do servidor.');
        }

        const data = result.data;
        const source = result.source;

        if (source === 'cnpjws') {
            document.getElementById('emp-razao-social').value = data.razao_social || '';
            document.getElementById('emp-site').value = data.estabelecimento?.nome_fantasia || '';
            document.getElementById('emp-cep').value = data.estabelecimento?.cep || '';

            // Endereço
            const logradouro = data.estabelecimento?.logradouro || '';
            const tipoLogradouro = data.estabelecimento?.tipo_logradouro || '';
            const numero = data.estabelecimento?.numero || '';
            const compl = data.estabelecimento?.complemento || '';

            document.getElementById('emp-endereco').value = `${tipoLogradouro} ${logradouro}`.trim() + (numero ? ', ' + numero : '');
            document.getElementById('emp-bairro').value = data.estabelecimento?.bairro || '';
            document.getElementById('emp-uf').value = data.estabelecimento?.estado?.sigla || '';
            document.getElementById('emp-cidade').value = data.estabelecimento?.cidade?.nome || '';

            if (data.estabelecimento?.ddd1 && data.estabelecimento?.telefone1) {
                document.getElementById('emp-telefone').value = `(${data.estabelecimento.ddd1}) ${data.estabelecimento.telefone1}`;
            }

        } else {
            // Source: brasilapi
            document.getElementById('emp-razao-social').value = data.razao_social || '';
            document.getElementById('emp-cep').value = data.cep || '';
            document.getElementById('emp-endereco').value = (data.logradouro || '') + (data.numero ? ', ' + data.numero : '');
            document.getElementById('emp-bairro').value = data.bairro || '';
            document.getElementById('emp-uf').value = data.uf || '';
            document.getElementById('emp-cidade').value = data.municipio || '';

            if (data.ddd_telefone_1) {
                document.getElementById('emp-telefone').value = `(${data.ddd_telefone_1.substring(0,2)}) ${data.ddd_telefone_1.substring(2)}`;
            }
        }

        await atualizarClienteCentralizadorOptions();

        if (typeof mostrarToastSucesso === 'function') {
            mostrarToastSucesso('Dados do CNPJ importados com sucesso!');
        }
    } catch(e) {
        console.error(e);
        alert('Erro ao buscar CNPJ: ' + (e.message || 'Erro desconhecido.'));
    } finally {
        btn.innerHTML = origText;
        btn.disabled = false;
    }
};

window.buscarCEPContatos = async function() {
    const cepRaw = document.getElementById('emp-cep')?.value || '';
    const cep = cepRaw.replace(/\D/g, '');
    if (cep.length !== 8) {
        alert('Por favor, informe um CEP válido com 8 dígitos.');
        return;
    }

    try {
        const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        if (!res.ok) throw new Error('CEP não encontrado.');
        const data = await res.json();
        if (data.erro) throw new Error('CEP inexistente.');

        document.getElementById('emp-endereco').value = data.logradouro || '';
        document.getElementById('emp-bairro').value = data.bairro || '';
        document.getElementById('emp-uf').value = data.uf || '';
        document.getElementById('emp-cidade').value = data.localidade || '';

        if (typeof mostrarToastSucesso === 'function') {
            mostrarToastSucesso('Endereço importado com sucesso!');
        }
    } catch(e) {
        console.error(e);
        alert('Erro ao buscar CEP: ' + e.message);
    }
};

window.abrirWhatsAppContato = function() {
    const cel = document.getElementById('con-celular')?.value || '';
    const cleanCel = cel.replace(/\D/g, '');
    if (!cleanCel) {
        alert('Por favor, informe o celular do contato primeiro.');
        return;
    }
    window.open(`https://wa.me/55${cleanCel}`, '_blank');
};

window.abrirModalPesquisaContato = async function() {
    try {
        const contatos = await apiGet('/contatos');
        if (!contatos || contatos.length === 0) {
            Swal.fire('Aviso', 'Nenhum contato cadastrado ainda.', 'info');
            return;
        }

        const rowsHtml = contatos.map(c => `
            <tr onclick="selectContatoPesquisa(${c.id})" class="swal-contato-row" style="cursor:pointer; border-bottom:1px solid #e2e8f0;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background=''">
                <td style="padding:0.5rem; text-align:left; font-weight:bold; color:#7048e8;">${c.codigo}</td>
                <td style="padding:0.5rem; text-align:left;">${c.nome}</td>
                <td style="padding:0.5rem; text-align:left;">${c.email}</td>
                <td style="padding:0.5rem; text-align:left;">${c.celular || ''}</td>
                <td style="padding:0.5rem; text-align:left;">${c.cliente_nome || ''}</td>
            </tr>
        `).join('');

        window.selectContatoPesquisa = function(id) {
            Swal.close();
            carregarContatoParaEdicao(id);
        };

        window.filtrarContatosTabela = function() {
            const query = document.getElementById('swal-busca-contato').value.toLowerCase();
            const rows = document.querySelectorAll('.swal-contato-row');
            rows.forEach(row => {
                const text = row.innerText.toLowerCase();
                row.style.display = text.includes(query) ? '' : 'none';
            });
        };

        Swal.fire({
            title: 'Pesquisar Contato',
            html: `
                <div style="text-align:left; font-family:'Inter', sans-serif; height:320px; display:flex; flex-direction:column;">
                    <input type="text" id="swal-busca-contato" oninput="filtrarContatosTabela()" placeholder="Digite para filtrar..." style="width:100%; padding:0.5rem; margin-bottom:1rem; border:1px solid #cbd5e1; border-radius:6px; font-size:0.875rem; box-sizing:border-box; flex-shrink:0;">
                    <div style="flex:1; overflow-y:auto; border:1px solid #e2e8f0; border-radius:8px; background:#fff;">
                        <table style="width:100%; border-collapse:collapse; font-size:0.85rem;">
                            <thead>
                                <tr style="background:#f8fafc; border-bottom:2px solid #cbd5e1;">
                                    <th style="padding:0.5rem; text-align:left;">Código</th>
                                    <th style="padding:0.5rem; text-align:left;">Nome</th>
                                    <th style="padding:0.5rem; text-align:left;">E-mail</th>
                                    <th style="padding:0.5rem; text-align:left;">Celular</th>
                                    <th style="padding:0.5rem; text-align:left;">Empresa</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rowsHtml}
                            </tbody>
                        </table>
                    </div>
                </div>
            `,
            showConfirmButton: false,
            showCancelButton: true,
            cancelButtonText: 'Fechar',
            customClass: {
                popup: 'custom-swal-height'
            }
        });
    } catch (e) {
        console.error(e);
        alert('Erro ao carregar lista de contatos: ' + e.message);
    }
};

window.abrirModalPesquisaEmpresa = async function() {
    try {
        const empresas = await apiGet('/clientes');
        if (!empresas || empresas.length === 0) {
            Swal.fire('Aviso', 'Nenhuma empresa cadastrada ainda.', 'info');
            return;
        }

        const rowsHtml = empresas.map(c => `
            <tr onclick="selectEmpresaPesquisa(${c.id})" class="swal-empresa-row" style="cursor:pointer; border-bottom:1px solid #e2e8f0;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background=''">
                <td style="padding:0.5rem; text-align:left; font-weight:bold; color:#7048e8;">${c.codigo}</td>
                <td style="padding:0.5rem; text-align:left;">${c.nome_razao_social}</td>
                <td style="padding:0.5rem; text-align:left;">${c.cpf_cnpj}</td>
            </tr>
        `).join('');

        window.selectEmpresaPesquisa = function(id) {
            Swal.close();
            carregarEmpresaSelecionada(id);
        };

        window.filtrarEmpresasTabela = function() {
            const query = document.getElementById('swal-busca-empresa').value.toLowerCase();
            const rows = document.querySelectorAll('.swal-empresa-row');
            rows.forEach(row => {
                const text = row.innerText.toLowerCase();
                row.style.display = text.includes(query) ? '' : 'none';
            });
        };

        Swal.fire({
            title: 'Pesquisar Empresa Cliente',
            html: `
                <input type="text" id="swal-busca-empresa" oninput="filtrarEmpresasTabela()" placeholder="Digite para filtrar..." style="width:100%; padding:0.5rem; margin-bottom:1rem; border:1px solid #cbd5e1; border-radius:6px; font-size:0.875rem; box-sizing:border-box;">
                <div style="max-height:300px; overflow-y:auto;">
                    <table style="width:100%; border-collapse:collapse; font-size:0.85rem;">
                        <thead>
                            <tr style="background:#f8fafc; border-bottom:2px solid #cbd5e1;">
                                <th style="padding:0.5rem; text-align:left;">Código</th>
                                <th style="padding:0.5rem; text-align:left;">Razão Social</th>
                                <th style="padding:0.5rem; text-align:left;">CNPJ</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsHtml}
                        </tbody>
                    </table>
                </div>
            `,
            showConfirmButton: false,
            showCancelButton: true,
            cancelButtonText: 'Fechar'
        });
    } catch (e) {
        console.error(e);
        alert('Erro ao carregar lista de empresas: ' + e.message);
    }
};

window.carregarEmpresaSelecionada = async function(id) {
    try {
        const c = await apiGet('/clientes/' + id);
        if (!c) throw new Error('Empresa não encontrada.');

        _empresaSelecionadaId = c.id;
        _empresaSelecionadaCodigo = c.codigo;

        document.getElementById('emp-codigo').value = c.codigo || '';
        document.getElementById('emp-razao-social').value = c.nome_razao_social || '';
        document.getElementById('emp-cnpj').value = c.cpf_cnpj || '';
        document.getElementById('emp-cep').value = c.cep || '';
        document.getElementById('emp-endereco').value = c.endereco || '';
        document.getElementById('emp-numero').value = c.numero || '';
        document.getElementById('emp-bairro').value = c.bairro || '';
        document.getElementById('emp-cidade').value = c.municipio || '';
        document.getElementById('emp-uf').value = c.uf || '';
        document.getElementById('emp-grupo').value = c.grupo_clientes || '';
        await atualizarClienteCentralizadorOptions(c.cliente_centralizador || '');
        document.getElementById('emp-telefone').value = c.telefone || '';
        document.getElementById('emp-ramal').value = c.ramal || '';
        document.getElementById('emp-telefone2').value = c.telefone_2 || '';
        document.getElementById('emp-ramal2').value = c.ramal_2 || '';
        document.getElementById('emp-fax').value = c.fax || '';
        document.getElementById('emp-site').value = c.website || '';

        if (typeof mostrarToastSucesso === 'function') {
            mostrarToastSucesso(`Empresa ${c.nome_razao_social} selecionada!`);
        }
    } catch (e) {
        console.error(e);
        alert('Erro ao carregar empresa: ' + e.message);
    }
};

window.limparEmpresaCliente = function() {
    _empresaSelecionadaId = null;
    _empresaSelecionadaCodigo = null;

    document.getElementById('emp-codigo').value = '';
    document.getElementById('emp-razao-social').value = '';
    document.getElementById('emp-cnpj').value = '';
    document.getElementById('emp-cep').value = '';
    document.getElementById('emp-endereco').value = '';
    document.getElementById('emp-numero').value = '';
    document.getElementById('emp-bairro').value = '';
    document.getElementById('emp-cidade').value = '';
    document.getElementById('emp-uf').value = '';
    document.getElementById('emp-grupo').value = '';
    
    const selectCentralizador = document.getElementById('emp-centralizador');
    if (selectCentralizador) {
        selectCentralizador.innerHTML = '<option value="">-- Selecione --</option>';
    }

    document.getElementById('emp-telefone').value = '';
    document.getElementById('emp-ramal').value = '';
    document.getElementById('emp-telefone2').value = '';
    document.getElementById('emp-ramal2').value = '';
    document.getElementById('emp-fax').value = '';
    document.getElementById('emp-site').value = '';

    if (typeof mostrarToastSucesso === 'function') {
        mostrarToastSucesso('Pronto para cadastrar nova empresa cliente.');
    }
};

window.carregarContatoParaEdicao = async function(id) {
    try {
        const c = await apiGet('/contatos/' + id);
        if (!c) throw new Error('Contato não encontrado.');

        _contatoEditandoId = c.id;
        _empresaSelecionadaId = c.cliente_id || null;
        _empresaSelecionadaCodigo = c.cliente_codigo || null;

        // Populate Contact Fields
        document.getElementById('con-codigo').value = c.codigo || '';
        document.getElementById('con-nome').value = c.nome || '';
        document.getElementById('con-celular').value = c.celular || '';
        document.getElementById('con-email').value = c.email || '';
        document.getElementById('con-tipo').value = c.tipo || '';
        document.getElementById('con-representante').value = c.representante || '';
        document.getElementById('con-cargo').value = c.cargo || '';
        document.getElementById('con-sexo').value = c.sexo || '';
        document.getElementById('con-nascimento').value = c.data_nascimento || '';
        document.getElementById('con-departamento').value = c.departamento || '';
        document.getElementById('con-origem').value = c.origem || '';
        document.getElementById('con-influenciador').value = c.influenciador || '';
        document.getElementById('con-classificacao').value = c.classificacao || '';
        document.getElementById('con-ramo-atividade').value = c.ramo_atividade || '';
        document.getElementById('con-regiao').value = c.regiao || '';
        document.getElementById('con-telefone').value = c.telefone || '';
        document.getElementById('con-ramal').value = c.ramal || '';
        document.getElementById('con-nextel').value = c.nextel || '';
        document.getElementById('con-outra-comunicacao').value = c.outra_comunicacao || '';

        // Checkboxes at the top
        document.getElementById('con-email-nfe').checked = c.email_nfe === 1;
        document.getElementById('con-email-cobranca').checked = c.email_cobranca === 1;
        document.getElementById('con-email-os').checked = c.email_os === 1;
        document.getElementById('con-email-contrato').checked = c.email_contrato === 1;
        document.getElementById('con-inativo').checked = c.inativo === 1;

        // Populate Company Fields
        document.getElementById('emp-codigo').value = c.cliente_codigo || '';
        document.getElementById('emp-razao-social').value = c.cliente_nome || '';
        document.getElementById('emp-cnpj').value = c.cpf_cnpj || '';
        document.getElementById('emp-cep').value = c.cep || '';
        document.getElementById('emp-endereco').value = c.endereco || '';
        document.getElementById('emp-numero').value = c.numero || '';
        document.getElementById('emp-bairro').value = c.bairro || '';
        document.getElementById('emp-cidade').value = c.cliente_cidade || '';
        document.getElementById('emp-uf').value = c.uf || '';
        document.getElementById('emp-grupo').value = c.grupo_clientes || '';
        await atualizarClienteCentralizadorOptions(c.cliente_centralizador || '');
        document.getElementById('emp-telefone').value = c.cliente_telefone || '';
        document.getElementById('emp-ramal').value = c.cliente_ramal || '';
        document.getElementById('emp-telefone2').value = c.cliente_telefone2 || '';
        document.getElementById('emp-ramal2').value = c.cliente_ramal2 || '';
        document.getElementById('emp-fax').value = c.cliente_fax || '';
        document.getElementById('emp-site').value = c.cliente_site || '';

        if (typeof mostrarToastSucesso === 'function') {
            mostrarToastSucesso(`Contato ${c.codigo} carregado com sucesso!`);
        }
    } catch (e) {
        console.error(e);
        alert('Erro ao carregar contato: ' + e.message);
    }
};

window.limparFormContato = function() {
    _contatoEditandoId = null;
    _empresaSelecionadaId = null;
    _empresaSelecionadaCodigo = null;

    // Clear checkboxes
    document.getElementById('con-email-nfe').checked = false;
    document.getElementById('con-email-cobranca').checked = false;
    document.getElementById('con-email-os').checked = false;
    document.getElementById('con-email-contrato').checked = false;
    document.getElementById('con-inativo').checked = false;

    // Clear Contact inputs
    document.getElementById('con-codigo').value = 'Auto';
    document.getElementById('con-nome').value = '';
    document.getElementById('con-celular').value = '';
    document.getElementById('con-email').value = '';
    document.getElementById('con-tipo').value = '';
    document.getElementById('con-representante').value = '';
    document.getElementById('con-cargo').value = '';
    document.getElementById('con-sexo').value = '';
    document.getElementById('con-nascimento').value = '';
    document.getElementById('con-departamento').value = '';
    document.getElementById('con-origem').value = '';
    document.getElementById('con-influenciador').value = '';
    document.getElementById('con-classificacao').value = '';
    document.getElementById('con-ramo-atividade').value = '';
    document.getElementById('con-regiao').value = '';
    document.getElementById('con-telefone').value = '';
    document.getElementById('con-ramal').value = '';
    document.getElementById('con-nextel').value = '';
    document.getElementById('con-outra-comunicacao').value = '';

    // Clear Company inputs
    document.getElementById('emp-codigo').value = '';
    document.getElementById('emp-razao-social').value = '';
    document.getElementById('emp-cnpj').value = '';
    document.getElementById('emp-cep').value = '';
    document.getElementById('emp-endereco').value = '';
    document.getElementById('emp-numero').value = '';
    document.getElementById('emp-bairro').value = '';
    document.getElementById('emp-cidade').value = '';
    document.getElementById('emp-uf').value = '';
    document.getElementById('emp-grupo').value = '';
    
    const selectCentralizador = document.getElementById('emp-centralizador');
    if (selectCentralizador) {
        selectCentralizador.innerHTML = '<option value="">-- Selecione --</option>';
    }

    document.getElementById('emp-telefone').value = '';
    document.getElementById('emp-ramal').value = '';
    document.getElementById('emp-telefone2').value = '';
    document.getElementById('emp-ramal2').value = '';
    document.getElementById('emp-fax').value = '';
    document.getElementById('emp-site').value = '';
};

window.recarregarContato = function() {
    if (_contatoEditandoId) {
        carregarContatoParaEdicao(_contatoEditandoId);
    } else {
        limparFormContato();
    }
};

window.navegarContato = async function(direcao) {
    if (!_contatoEditandoId) {
        try {
            const contatos = await apiGet('/contatos');
            if (contatos && contatos.length > 0) {
                const c = direcao === 'proximo' ? contatos[contatos.length - 1] : contatos[0];
                carregarContatoParaEdicao(c.id);
            } else {
                alert('Nenhum contato cadastrado no momento.');
            }
        } catch (e) {
            console.error(e);
        }
        return;
    }

    try {
        const res = await apiGet('/contatos/' + _contatoEditandoId + '/navegar/' + direcao);
        if (res && res.endOfList) {
            Swal.fire('Aviso', 'Fim da lista de contatos nesta direção.', 'info');
            return;
        }
        if (res && res.id) {
            carregarContatoParaEdicao(res.id);
        }
    } catch (e) {
        console.error(e);
        alert('Erro ao navegar contatos: ' + e.message);
    }
};

window.salvarContato = async function() {
    const conNome = document.getElementById('con-nome')?.value || '';
    const conEmail = document.getElementById('con-email')?.value || '';
    const empCnpj = document.getElementById('emp-cnpj')?.value || '';
    const empRazao = document.getElementById('emp-razao-social')?.value || '';

    if (!conNome) {
        alert('Por favor, preencha o Nome do Contato.');
        return;
    }
    if (!conEmail) {
        alert('Por favor, preencha o E-mail do Contato.');
        return;
    }
    if (!empCnpj) {
        alert('Por favor, preencha o CNPJ da Empresa Cliente.');
        return;
    }
    if (!empRazao) {
        alert('Por favor, preencha a Razão Social da Empresa Cliente.');
        return;
    }

    let resolvedId = _empresaSelecionadaId;
    let resolvedCodigo = _empresaSelecionadaCodigo;

    if (!resolvedId) {
        try {
            const clientes = await apiGet('/clientes') || [];
            const cleanCnpj = empCnpj.replace(/\D/g, '');
            const found = clientes.find(c => 
                (c.cpf_cnpj && c.cpf_cnpj.replace(/\D/g, '') === cleanCnpj) || 
                (c.nome_razao_social && c.nome_razao_social.toLowerCase() === empRazao.toLowerCase())
            );
            if (found) {
                resolvedId = found.id;
                resolvedCodigo = found.codigo;
                _empresaSelecionadaId = found.id;
                _empresaSelecionadaCodigo = found.codigo;
                
                const cnpjInput = document.getElementById('emp-cnpj');
                if (cnpjInput && !cnpjInput.value) {
                    cnpjInput.value = found.cpf_cnpj || '';
                }
                const codInput = document.getElementById('emp-codigo');
                if (codInput) {
                    codInput.value = found.codigo || '';
                }
            }
        } catch(e) {
            console.error('Erro ao auto-resolver cliente:', e);
        }
    }

    const empresa_cliente = {
        id: resolvedId,
        codigo: resolvedCodigo,
        cpf_cnpj: empCnpj,
        nome_razao_social: empRazao,
        cep: document.getElementById('emp-cep')?.value || '',
        endereco: document.getElementById('emp-endereco')?.value || '',
        numero: document.getElementById('emp-numero')?.value || '',
        bairro: document.getElementById('emp-bairro')?.value || '',
        municipio: document.getElementById('emp-cidade')?.value || '',
        uf: document.getElementById('emp-uf')?.value || '',
        grupo_clientes: document.getElementById('emp-grupo')?.value || '',
        cliente_centralizador: document.getElementById('emp-centralizador')?.value || '',
        telefone: document.getElementById('emp-telefone')?.value || '',
        ramal: document.getElementById('emp-ramal')?.value || '',
        telefone_2: document.getElementById('emp-telefone2')?.value || '',
        ramal_2: document.getElementById('emp-ramal2')?.value || '',
        fax: document.getElementById('emp-fax')?.value || '',
        website: document.getElementById('emp-site')?.value || '',
        criado_por: window.currentUser?.nome || window.currentUser?.email || ''
    };

    const payload = {
        codigo: _contatoEditandoId ? document.getElementById('con-codigo')?.value : null,
        nome: conNome,
        tipo: document.getElementById('con-tipo')?.value || '',
        representante: document.getElementById('con-representante')?.value || '',
        departamento: document.getElementById('con-departamento')?.value || '',
        cargo: document.getElementById('con-cargo')?.value || '',
        origem: document.getElementById('con-origem')?.value || '',
        influenciador: document.getElementById('con-influenciador')?.value || '',
        classificacao: document.getElementById('con-classificacao')?.value || '',
        data_nascimento: document.getElementById('con-nascimento')?.value || '',
        ramo_atividade: document.getElementById('con-ramo-atividade')?.value || '',
        regiao: document.getElementById('con-regiao')?.value || '',
        sexo: document.getElementById('con-sexo')?.value || '',
        celular: document.getElementById('con-celular')?.value || '',
        telefone: document.getElementById('con-telefone')?.value || '',
        ramal: document.getElementById('con-ramal')?.value || '',
        nextel: document.getElementById('con-nextel')?.value || '',
        email: conEmail,
        outra_comunicacao: document.getElementById('con-outra-comunicacao')?.value || '',
        inativo: document.getElementById('con-inativo')?.checked ? 1 : 0,
        email_cobranca: document.getElementById('con-email-cobranca')?.checked ? 1 : 0,
        email_nfe: document.getElementById('con-email-nfe')?.checked ? 1 : 0,
        email_os: document.getElementById('con-email-os')?.checked ? 1 : 0,
        email_contrato: document.getElementById('con-email-contrato')?.checked ? 1 : 0,
        criado_por: window.currentUser?.nome || window.currentUser?.email || '',
        empresa_cliente: empresa_cliente
    };

    try {
        let res;
        if (_contatoEditandoId) {
            res = await apiPut('/contatos/' + _contatoEditandoId, payload);
        } else {
            res = await apiPost('/contatos', payload);
        }

        if (res && res.success) {
            _clientesCache = []; // Limpar cache
            if (!_contatoEditandoId && res.id) {
                _contatoEditandoId = res.id;
            }
            await carregarContatoParaEdicao(_contatoEditandoId);

            if (typeof mostrarToastSucesso === 'function') {
                mostrarToastSucesso(_contatoEditandoId ? 'Contato atualizado com sucesso!' : 'Contato cadastrado com sucesso!');
            }

            if (_redirectAfterContactSave) {
                _redirectAfterContactSave = false;
                const propContatoInput = document.getElementById('prop-contato');
                if (propContatoInput) propContatoInput.value = conNome;
                window.switchPropostaTab('form');
            }
        } else {
            alert('Erro ao salvar contato: ' + (res?.error || 'Erro desconhecido.'));
        }
    } catch (e) {
        console.error(e);
        alert('Erro ao comunicar com o servidor.');
    }
};

window.excluirContato = async function() {
    if (!_contatoEditandoId) {
        alert('Selecione um contato cadastrado para poder excluir.');
        return;
    }
    if (!confirm('Deseja realmente excluir este contato permanentemente?')) {
        return;
    }

    try {
        const res = await apiDelete('/contatos/' + _contatoEditandoId);
        if (res && res.success) {
            _clientesCache = []; // Limpar cache
            limparFormContato();
            if (typeof mostrarToastSucesso === 'function') {
                mostrarToastSucesso('Contato excluído com sucesso.');
            }
        } else {
            alert('Erro ao excluir contato: ' + (res?.error || 'Erro desconhecido.'));
        }
    } catch (e) {
        console.error(e);
        alert('Erro ao comunicar com o servidor.');
    }
};

console.log('[PROPOSTAS] Módulo frontend de proposta carregado.');
console.log('[CONTATOS] Módulo frontend de cadastro de contatos carregado.');

