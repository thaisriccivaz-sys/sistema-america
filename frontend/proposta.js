/* ═══════════════════════════════════════════════════════════════════
   MÓDULO: PROPOSTAS COMERCIAIS
   Gerenciamento completo de propostas de locação
   ═══════════════════════════════════════════════════════════════════ */

/* ── Dados de configuração ─────────────────────────────────────────── */
const PROP_TIPOS = [
    'ADITIVO',
    'EQUIPAMENTOS',
    'PROPOSTA EVENTO',
    'PROPOSTA LIMPA FOSSA',
    'PROPOSTA LIMPA FOSSA MENSAL',
    'PROPOSTA LOCAÇÃO CONTAINER',
    'PROPOSTA OBRA MENSAL',
    'PROPOSTA OBRA QUINZENAL',
    'PROPOSTA OBRA SEMANAL',
    'PROPOSTA VENDA',
    'VISITA TÉCNICA'
];
const PROP_FASES = [
    'Em Elaboração', 'Proposta Enviada', 'Em Negociação',
    'Aguardando Aprovação', 'Aprovada', 'Reprovada', 'Cancelada', 'Convertida em OS'
];
const PROP_MODELOS = [
    'Locação Obra', 'Locação Evento', 'Proposta Simplificada', 'Proposta Completa'
];
const PROP_TABELAS = [
    'TABELA DE PREÇO[1]',
    'LOCAÇÃO DIÁRIA EVENTO[2]',
    'LOCAÇÃO SEMANAL OBRA[3]',
    'LOCAÇÃO QUINZENAL OBRA[4]',
    'LOCAÇÃO MENSAL OBRA[5]',
    'PRODUTO VENDA[6]'
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
let _dashboardStatsData = [];
let _manutencoesData = [];
let _veiculosData = [];
let _clientesData = [];
let _propostasEditandoId = null;
let _propRegiaoIdentificada = '';
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
    try {
        window._comercialModelosContrato = await apiGet('/comercial/modelos-contrato') || [];
    } catch (e) {
        console.error('[CONTRATOS] Erro ao carregar modelos para dropdown:', e);
        window._comercialModelosContrato = [];
    }
    try {
        const stats = await apiGet('/dashboard/stats');
        _dashboardStatsData = Array.isArray(stats) ? stats : [];
    } catch (e) {
        console.error('[DASHBOARD STATS] Erro ao carregar:', e);
        _dashboardStatsData = [];
    }
    try {
        const maint = await apiGet('/frota/manutencoes');
        _manutencoesData = Array.isArray(maint) ? maint : [];
    } catch (e) {
        console.error('[MANUTENCOES] Erro ao carregar:', e);
        _manutencoesData = [];
    }
    try {
        const veic = await apiGet('/frota/veiculos');
        _veiculosData = Array.isArray(veic) ? veic : [];
    } catch (e) {
        console.error('[VEICULOS] Erro ao carregar:', e);
        _veiculosData = [];
    }
    try {
        const clis = await apiGet('/clientes');
        _clientesData = Array.isArray(clis) ? clis : [];
    } catch (e) {
        console.error('[CLIENTES] Erro ao carregar:', e);
        _clientesData = [];
    }
}

/* ── Render da tela principal ───────────────────────────────────────── */
function renderTelaPropostas() {
    const container = document.getElementById('view-comercial-proposta');
    if (!container) return;

    const hoje = new Date().toLocaleDateString('pt-BR');

    container.innerHTML = `
        <div style="max-width:100%; margin:0 auto;">

            <!-- STYLE PARA A NAVBAR SAAS -->
            <style>
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

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

                .custom-swal-height-large {
                    width: 1100px !important;
                    height: 540px !important;
                    display: flex !important;
                    flex-direction: column !important;
                    padding: 0 !important;
                    border-radius: 12px !important;
                    overflow: hidden !important;
                }
                .custom-swal-client-modal {
                    width: 1700px !important;
                    max-width: 95% !important;
                    height: 540px !important;
                    display: flex !important;
                    flex-direction: column !important;
                    padding: 0 !important;
                    border-radius: 12px !important;
                    overflow: hidden !important;
                }
                .custom-swal-padding-zero {
                    padding: 0 !important;
                    border-radius: 12px !important;
                    overflow: hidden !important;
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
                #tab-prop-lista.active {
                    background-color: #2e58a6 !important;
                    color: #ffffff !important;
                }
                #tab-prop-lista.active i {
                    color: #ffffff !important;
                }
                #tab-prop-lista.active:hover {
                    background-color: #1e3d75 !important;
                    color: #ffffff !important;
                }
                .saas-dropdown-container {
                    position: relative;
                    display: inline-block;
                }
                .saas-dropdown-menu {
                    display: none;
                    position: absolute;
                    top: 100%;
                    left: 0;
                    background-color: #ffffff;
                    border: 1px solid #cbd5e1;
                    border-radius: 8px;
                    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
                    min-width: 200px;
                    z-index: 1000;
                    padding: 0.35rem;
                    margin-top: 0.25rem;
                }
                .saas-dropdown-menu::before {
                    content: '';
                    position: absolute;
                    top: -12px;
                    left: 0;
                    width: 100%;
                    height: 12px;
                    background: transparent;
                }
                .saas-dropdown-container:hover .saas-dropdown-menu {
                    display: block;
                }
                .saas-dropdown-item {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 0.85rem;
                    font-weight: 600;
                    color: #64748B;
                    text-decoration: none;
                    padding: 0.5rem 0.75rem;
                    border-radius: 6px;
                    cursor: pointer;
                    transition: all 0.2s;
                    user-select: none;
                    white-space: nowrap;
                }
                .saas-dropdown-item:hover {
                    color: #1E293B;
                    background-color: #F1F5F9;
                }
                .saas-dropdown-item.active {
                    color: #7048E8 !important;
                    background-color: #F1F5F9;
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

                /* Rótulos dos Campos (Labels) */
                .prop-lbl,
                .prop-lbl-end,
                [id^="prop-view-"] label {
                    font-size: 0.7rem !important;
                    font-weight: 700 !important;
                    color: #475569 !important;
                    text-transform: uppercase !important;
                    letter-spacing: 0.03em !important;
                    display: block !important;
                    margin-bottom: 0.15rem !important;
                }

                /* Títulos de Seção / Painéis */
                #form-proposta h4,
                .cc-section-title,
                .cc-section-title-end,
                [id^="prop-view-"] h4 {
                    font-size: 0.8rem !important;
                    font-weight: 800 !important;
                    color: #475569 !important;
                    text-transform: uppercase !important;
                    letter-spacing: 0.04em !important;
                    border-bottom: 2px solid #e2e8f0 !important;
                    padding-bottom: 0.25rem !important;
                    margin: 0.8rem 0 0.5rem 0 !important;
                    display: flex !important;
                    align-items: center !important;
                    gap: 0.4rem !important;
                }

                /* Estilo Profissional de ERP Web (Densa e Compacta) para todos os formulários comerciais */
                [id^="prop-view-"] input:not([type="checkbox"]):not([type="radio"]),
                [id^="prop-view-"] select {
                    height: 28px !important;
                    padding: 0.15rem 0.45rem !important;
                    font-size: 0.76rem !important;
                    border-radius: 4px !important;
                    border: 1px solid #cbd5e1 !important;
                    color: #1e293b !important;
                    box-sizing: border-box !important;
                    line-height: normal !important;
                    font-family: 'Inter', sans-serif !important;
                }
                [id^="prop-view-"] textarea {
                    padding: 0.3rem 0.45rem !important;
                    font-size: 0.76rem !important;
                    border-radius: 4px !important;
                    border: 1px solid #cbd5e1 !important;
                    color: #1e293b !important;
                    box-sizing: border-box !important;
                    font-family: 'Inter', sans-serif !important;
                }

                /* Alinhamento de botões de busca / addon / whatsapp com a altura de 28px */
                [id^="prop-view-"] form button,
                [id^="prop-view-"] .prec-container button,
                [id^="prop-view-"] .cc-grid-end-row1 button,
                [id^="prop-view-"] .cc-grid-contact-row1 button,
                [id^="prop-view-"] button[style*="height:36px"],
                [id^="prop-view-"] button[style*="height: 36px"],
                [id^="prop-view-"] button[style*="height:38px"],
                [id^="prop-view-"] button[style*="height: 38px"],
                [id^="prop-view-"] button[class*="btn-addon"] {
                    height: 28px !important;
                    font-size: 0.76rem !important;
                    padding: 0 0.65rem !important;
                    border-radius: 4px !important;
                    display: inline-flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    gap: 4px !important;
                }
                
                [id^="prop-view-"] form button i,
                [id^="prop-view-"] .prec-container button i,
                [id^="prop-view-"] button[class*="btn-addon"] i {
                    font-size: 0.9rem !important;
                }

                /* Definir largura fixa de 28px para botões que contêm apenas ícones de busca, whatsapp e visualização */
                [id^="prop-view-"] form button[title*="Pesquisar"],
                [id^="prop-view-"] form button[onclick*="WhatsApp"],
                [id^="prop-view-"] form button[onclick*="abrirWhatsApp"],
                [id^="prop-view-"] form button[onclick*="CEP"],
                [id^="prop-view-"] form button[onclick*="CNPJ"],
                [id^="prop-view-"] form button[title*="Buscar"],
                [id^="prop-view-"] form button[onclick*="verDetalhesContato"],
                [id^="prop-view-"] form button[onclick*="recarregar"],
                [id^="prop-view-"] form button[title*="Recarregar"] {
                    width: 28px !important;
                    padding: 0 !important;
                }

                /* Compactar espaçamento vertical e horizontal nos grids e painéis */
                [id^="prop-view-"] div[style*="display:grid"],
                [id^="prop-view-"] div[style*="display: grid"] {
                    gap: 0.4rem 0.6rem !important;
                }
                [id^="prop-view-"] div[style*="margin-bottom:1rem"],
                [id^="prop-view-"] div[style*="margin-bottom: 1rem"],
                [id^="prop-view-"] div[style*="margin-bottom:0.85rem"],
                [id^="prop-view-"] div[style*="margin-bottom: 0.85rem"] {
                    margin-bottom: 0.5rem !important;
                }
                [id^="prop-view-"] div[style*="margin-top:1rem"],
                [id^="prop-view-"] div[style*="margin-top: 1rem"],
                [id^="prop-view-"] div[style*="margin-top:0.85rem"],
                [id^="prop-view-"] div[style*="margin-top: 0.85rem"] {
                    margin-top: 0.4rem !important;
                }
                /* Tabela de itens da proposta compactada */
                #form-proposta table {
                    font-size: 0.76rem !important;
                }
                #form-proposta table th,
                #form-proposta table td {
                    padding: 0.3rem 0.45rem !important;
                }
            </style>

            <!-- VIEW: LISTA -->
            <div id="prop-view-lista" style="display:${_currentPropostaTab === 'lista' ? 'block' : 'none'}; font-family:'Inter', sans-serif; background:#f8fafc; padding:1px 0.75rem 0.75rem 0.75rem; border-radius:14px; min-height:800px; box-sizing:border-box;">
                
                <!-- Top Toolbar Header -->
                <div id="prop-toolbar-principal" style="display:flex; justify-content:space-between; align-items:center; margin-top:-10px; margin-bottom:1.2rem; background:#fff; padding:0.8rem 1.2rem; border-radius:12px; border:1px solid #e2e8f0; box-shadow:0 1px 3px rgba(0,0,0,0.02); position:sticky; top:0; z-index:997;">
                    <!-- Lado Esquerdo: Dropdown de Navegação Principal -->
                    <div class="saas-dropdown-container">
                        <div class="saas-nav-item active" id="tab-prop-lista" onclick="switchPropostaTab('lista')" style="display: flex; align-items: center; gap: 0.25rem;">
                            <i class="ph ph-list-bullets"></i> Lista de Propostas <i class="ph ph-caret-down" style="font-size: 0.8rem; opacity: 0.7;"></i>
                        </div>
                        <div class="saas-dropdown-menu">
                            <div class="saas-dropdown-item" id="tab-prop-form" onclick="abrirFormProposta(null); event.stopPropagation();">
                                <i class="ph ph-pencil-simple"></i> Nova Proposta
                            </div>
                            <div class="saas-dropdown-item" id="tab-prop-cadastro-cliente" onclick="switchPropostaTab('cadastro-cliente'); event.stopPropagation();">
                                <i class="ph ph-user-plus"></i> Cadastro de Clientes
                            </div>
                            <div class="saas-dropdown-item" id="tab-prop-cadastro-contatos" onclick="switchPropostaTab('cadastro-contatos'); event.stopPropagation();">
                                <i class="ph ph-identification-card"></i> Cadastro de Contatos
                            </div>
                            <div class="saas-dropdown-item" id="tab-prop-enderecos" onclick="switchPropostaTab('enderecos'); event.stopPropagation();">
                                <i class="ph ph-map-pin"></i> Endereços
                            </div>
                            <div class="saas-dropdown-item" id="tab-prop-servicos-precificacao" onclick="switchPropostaTab('servicos-precificacao'); event.stopPropagation();">
                                <i class="ph ph-calculator"></i> Precificação de Serviços
                            </div>
                            <div class="saas-dropdown-item" id="tab-prop-modelos-contrato" onclick="switchPropostaTab('modelos-contrato'); event.stopPropagation();">
                                <i class="ph ph-file-text"></i> Modelos de Contrato
                            </div>
                        </div>
                    </div>
                    
                    <div style="display:flex; gap:0.5rem; align-items:center;">
                        <button onclick="window.abrirModalIshikawa()" style="
                            background:#fff; border:1px solid #cbd5e1; color:#3b4b60;
                            padding:0.6rem 1.2rem; border-radius:8px; cursor:pointer;
                            font-weight:600; display:flex; align-items:center; gap:0.5rem;
                            font-size:0.88rem; box-shadow:0 1px 3px rgba(0,0,0,0.02);
                            transition:all 0.2s;" onmouseover="this.style.background='#f8fafc'"
                            onmouseout="this.style.background='#fff'">
                            <i class="ph ph-graph" style="color:#7048e8;"></i> Mapa de Causas (Ishikawa)
                        </button>
                        <button onclick="abrirFormProposta(null)" style="
                            background:linear-gradient(135deg,#7048e8,#9775fa);
                            color:white; border:none; padding:0.6rem 1.2rem;
                            border-radius:8px; cursor:pointer; font-weight:600;
                            display:flex; align-items:center; gap:0.5rem;
                            font-size:0.88rem; box-shadow:0 4px 12px rgba(112,72,232,0.25);
                            transition:all 0.2s;" onmouseover="this.style.transform='translateY(-1px)'"
                            onmouseout="this.style.transform='translateY(0)'">
                            <i class="ph ph-plus-circle"></i> Nova Proposta
                        </button>
                    </div>
                </div>

                <!-- 1. Top Section (Critical Operations & Alarms KPI Cards) -->
                <div id="container-kpis-top" style="display:grid; grid-template-columns: repeat(4, 1fr); gap:0.75rem; margin-bottom:1rem;">
                    <!-- Preenchido via JS -->
                </div>

                <!-- 2. Middle-Top Section (Commercial Analytics & Quality Grid - 3 Colunas) -->
                <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:1rem; margin-bottom:1rem;">
                    
                    <!-- Coluna 1: Rosca Status -->
                    <div id="container-grafico-rosca" class="reveal-card" style="background:#fff; border:1px solid #e2e8f0; border-radius:14px; padding:1.1rem; box-shadow:0 1px 3px rgba(0,0,0,0.02); display:flex; flex-direction:column; align-items:center; min-height:260px; box-sizing:border-box;">
                        <!-- Preenchido via JS -->
                    </div>

                    <!-- Coluna 2: Comparativo Financeiro -->
                    <div id="container-grafico-conversao" class="reveal-card" style="background:#fff; border:1px solid #e2e8f0; border-radius:14px; padding:1.1rem; box-shadow:0 1px 3px rgba(0,0,0,0.02); display:flex; flex-direction:column; min-height:260px; box-sizing:border-box;">
                        <!-- Preenchido via JS -->
                    </div>

                    <!-- Coluna 3: Pareto Motivos -->
                    <div id="container-grafico-motivos" class="reveal-card" style="background:#fff; border:1px solid #e2e8f0; border-radius:14px; padding:1.1rem; box-shadow:0 1px 3px rgba(0,0,0,0.02); display:flex; flex-direction:column; min-height:260px; box-sizing:border-box;">
                        <!-- Preenchido via JS -->
                    </div>

                </div>

                <!-- 1.1 Curva ABC de Clientes -->
                <div class="reveal-card" style="background:#fff; border:1px solid #e2e8f0; border-radius:14px; padding:1.2rem; box-shadow:0 1px 3px rgba(0,0,0,0.02); margin-bottom:1rem;">
                    <h3 style="margin:0 0 1rem 0; font-size:0.95rem; font-weight:800; color:#1e293b; display:flex; align-items:center; gap:6px;">
                        <i class="ph ph-chart-bar" style="color:#7048e8;"></i> Classificação de Clientes - Curva ABC (BI)
                    </h3>
                    <div style="overflow-x:auto;">
                        <table style="width:100%; border-collapse:collapse; font-size:0.83rem; text-align:left;">
                            <thead>
                                <tr style="border-bottom:2px solid #e2e8f0; background:#f8fafc; color:#475569;">
                                    <th style="padding:0.6rem 0.75rem; font-weight:700;">Cliente</th>
                                    <th style="padding:0.6rem 0.75rem; font-weight:700;">Valor Total</th>
                                    <th style="padding:0.6rem 0.75rem; font-weight:700;">% Acumulado</th>
                                    <th style="padding:0.6rem 0.75rem; font-weight:700; text-align:center;">Classe</th>
                                </tr>
                            </thead>
                            <tbody id="tbody-curva-abc" style="color:#1e293b;">
                                <!-- Preenchido dinamicamente via window.atualizarTabelaCurvaABC -->
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- 2. Gestão de Qualidade: Kanban PDCA -->
                <div class="reveal-card" style="background:#fff; border:1px solid #e2e8f0; border-radius:14px; padding:1.2rem; box-shadow:0 1px 3px rgba(0,0,0,0.02); margin-bottom:1rem;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                        <h3 style="margin:0; font-size:0.95rem; font-weight:800; color:#1e293b; display:flex; align-items:center; gap:6px;">
                            <i class="ph ph-kanban" style="color:#7048e8;"></i> Kanban PDCA (Gestão de Qualidade)
                        </h3>
                        <button onclick="window.adicionarLinha5W2H()" style="background:#7048e8; color:white; border:none; padding:0.45rem 1rem; border-radius:6px; cursor:pointer; font-weight:600; font-size:0.8rem; display:inline-flex; align-items:center; gap:4px; transition:background 0.15s;" onmouseover="this.style.background='#5f3dc4'" onmouseout="this.style.background='#7048e8'">
                            <i class="ph ph-plus"></i> Nova Ação
                        </button>
                    </div>
                    
                    <!-- Kanban Board Grid: 4 Columns -->
                    <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:1rem; min-height:220px; box-sizing:border-box;">
                        
                        <!-- Column: Plan -->
                        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:0.8rem; display:flex; flex-direction:column; gap:0.8rem; box-sizing:border-box;">
                            <div style="border-bottom:2px solid #3b82f6; padding-bottom:4px; margin-bottom:0.25rem;">
                                <span style="font-weight:800; font-size:0.8rem; color:#1e293b; text-transform:uppercase; letter-spacing:0.02em;">📝 Plan (Planejar)</span>
                            </div>
                            <div id="kanban-plan" style="display:flex; flex-direction:column; gap:0.6rem; flex:1;"></div>
                        </div>

                        <!-- Column: Do -->
                        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:0.8rem; display:flex; flex-direction:column; gap:0.8rem; box-sizing:border-box;">
                            <div style="border-bottom:2px solid #f59e0b; padding-bottom:4px; margin-bottom:0.25rem;">
                                <span style="font-weight:800; font-size:0.8rem; color:#1e293b; text-transform:uppercase; letter-spacing:0.02em;">⚡ Do (Executar)</span>
                            </div>
                            <div id="kanban-do" style="display:flex; flex-direction:column; gap:0.6rem; flex:1;"></div>
                        </div>

                        <!-- Column: Check -->
                        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:0.8rem; display:flex; flex-direction:column; gap:0.8rem; box-sizing:border-box;">
                            <div style="border-bottom:2px solid #10b981; padding-bottom:4px; margin-bottom:0.25rem;">
                                <span style="font-weight:800; font-size:0.8rem; color:#1e293b; text-transform:uppercase; letter-spacing:0.02em;">🔍 Check (Verificar)</span>
                            </div>
                            <div id="kanban-check" style="display:flex; flex-direction:column; gap:0.6rem; flex:1;"></div>
                        </div>

                        <!-- Column: Act -->
                        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:0.8rem; display:flex; flex-direction:column; gap:0.8rem; box-sizing:border-box;">
                            <div style="border-bottom:2px solid #ef4444; padding-bottom:4px; margin-bottom:0.25rem;">
                                <span style="font-weight:800; font-size:0.8rem; color:#1e293b; text-transform:uppercase; letter-spacing:0.02em;">🔄 Act (Agir)</span>
                            </div>
                            <div id="kanban-act" style="display:flex; flex-direction:column; gap:0.6rem; flex:1;"></div>
                        </div>

                    </div>
                </div>

                <!-- 2.2 Painel IA: Análise Inteligente de Melhoria -->
                <div class="reveal-card" style="background:#fff; border:1px solid #e2e8f0; border-radius:14px; padding:1.2rem; box-shadow:0 1px 3px rgba(0,0,0,0.02); margin-bottom:1rem;">
                    <h3 style="margin:0 0 0.8rem 0; font-size:0.95rem; font-weight:800; color:#1e293b; display:flex; align-items:center; gap:6px;">
                        <i class="ph ph-sparkle" style="color:#7048e8;"></i> Análise Inteligente de Melhoria (IA)
                    </h3>
                    <div style="display:flex; flex-direction:column; gap:0.75rem;">
                        <textarea id="ia-observacoes" rows="4" style="width:100%; padding:0.65rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.85rem; resize:vertical; box-sizing:border-box; font-family:'Inter', sans-serif;" placeholder="Digite aqui observações adicionais sobre as perdas comerciais ou contexto de mercado para subsidiar a análise da IA..."></textarea>
                        <button onclick="window.analisarComIA()" style="background:linear-gradient(135deg,#7048e8,#9775fa); color:white; border:none; padding:0.6rem 1.2rem; border-radius:8px; cursor:pointer; font-weight:600; display:inline-flex; align-items:center; justify-content:center; gap:0.5rem; font-size:0.88rem; align-self:flex-start; box-shadow:0 4px 12px rgba(112,72,232,0.2); transition:all 0.2s;" onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform='translateY(0)'">
                            <i class="ph ph-cpu"></i> Analisar com IA
                        </button>
                        <div id="ia-resultado" style="display:none; margin-top:1rem; padding:1rem; border-radius:8px; background:#f8fafc; border:1px solid #e2e8f0; font-size:0.85rem; line-height:1.5; color:#334155;">
                        </div>
                    </div>
                </div>

                <!-- 3. Middle-Bottom Section (Active Operations & Revenue) -->
                <div style="display:grid; grid-template-columns: 1.1fr 0.9fr; gap:1rem; margin-bottom:1rem;">
                    <!-- Line Chart Container -->
                    <div id="container-grafico-linha" class="reveal-card" style="background:#fff; border:1px solid #e2e8f0; border-radius:14px; padding:1.1rem; box-shadow:0 1px 3px rgba(0,0,0,0.02); display:flex; flex-direction:column;">
                        <!-- Preenchido via JS -->
                    </div>
                    
                    <!-- Stacked Bar Chart Container -->
                    <div id="container-grafico-barra" class="reveal-card" style="background:#fff; border:1px solid #e2e8f0; border-radius:14px; padding:1.1rem; box-shadow:0 1px 3px rgba(0,0,0,0.02); display:flex; flex-direction:column;">
                        <!-- Preenchido via JS -->
                    </div>
                </div>

                <!-- 4. Bottom Section (Filtros e Tabela de Propostas) -->
                <div class="reveal-card" style="background:#fff; border:1px solid #e2e8f0; border-radius:14px; padding:1.1rem; box-shadow:0 1px 3px rgba(0,0,0,0.02); margin-bottom:1rem;">
                    <h3 style="margin:0 0 1rem 0; font-size:0.95rem; font-weight:800; color:#1e293b; display:flex; align-items:center; gap:6px;">
                        <i class="ph ph-file-text" style="color:#7048e8;"></i> Gestão de Propostas Comerciais
                    </h3>
                    
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
                            <button onclick="limparFiltrosPropostas()" style="padding:0.45rem 0.85rem; background:#cbd5e1; border:none; border-radius:6px; cursor:pointer; font-size:0.83rem; color:#1e293b; font-weight:600;">
                                ✕ Limpar
                            </button>
                        </div>
                    </div>

                    <!-- Tabela -->
                    <div style="background:#fff; border-radius:10px; border:1px solid #e2e8f0; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                        <div style="overflow-x:auto;">
                            <table style="width:100%; border-collapse:collapse; font-size:0.83rem; min-width:900px; text-align:left;">
                                <thead>
                                    <tr style="background:#f8fafc; border-bottom:2px solid #e2e8f0; color:#475569;">
                                        <th style="padding:0.6rem 0.75rem; font-weight:700; white-space:nowrap;">Código</th>
                                        <th style="padding:0.6rem 0.75rem; font-weight:700;">Cliente</th>
                                        <th style="padding:0.6rem 0.75rem; font-weight:700;">Tipo</th>
                                        <th style="padding:0.6rem 0.75rem; font-weight:700;">Fase</th>
                                        <th style="padding:0.6rem 0.75rem; font-weight:700; white-space:nowrap;">Valor Total</th>
                                        <th style="padding:0.6rem 0.75rem; font-weight:700; text-align:center; white-space:nowrap;">Ações</th>
                                    </tr>
                                </thead>
                                <tbody id="prop-tbody" style="color:#1e293b;">
                                    <!-- Preenchido dinamicamente via filtrarPropostas() -->
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:0.5rem;">
                        <span style="font-size:0.75rem; color:#94a3b8; font-style:italic;">* Clique nos ícones para Visualizar, Editar ou Excluir uma proposta.</span>
                        <p id="prop-count" style="font-size:0.8rem; color:#64748b; font-weight:700; margin:0;">
                            0 proposta(s) encontrada(s)
                        </p>
                    </div>
                </div>

                <!-- Footer Text -->
                <div style="text-align:center; font-size:0.75rem; color:#94a3b8; font-weight:600; margin-top:2rem; letter-spacing:0.02em;">
                    Monitoramento de Ativos & Performance Comercial - Relatório Gerencial
                </div>
            </div>            <!-- VIEW: FORMULÁRIO -->
            <div id="prop-view-form" style="display:${_currentPropostaTab === 'form' ? 'block' : 'none'};"></div>

            <!-- VIEW: CADASTRO CLIENTE -->
            <div id="prop-view-cadastro-cliente" style="display:${_currentPropostaTab === 'cadastro-cliente' ? 'block' : 'none'};"></div>

            <!-- VIEW: CADASTRO CONTATOS -->
            <div id="prop-view-cadastro-contatos" style="display:${_currentPropostaTab === 'cadastro-contatos' ? 'block' : 'none'};"></div>

            <!-- VIEW: ENDEREÇOS ENTREGA -->
            <div id="prop-view-enderecos" style="display:${_currentPropostaTab === 'enderecos' ? 'block' : 'none'};"></div>

            <!-- VIEW: PRECIFICACAO SERVICOS -->
            <div id="prop-view-servicos-precificacao" style="display:${_currentPropostaTab === 'servicos-precificacao' ? 'block' : 'none'};"></div>

            <!-- VIEW: MODELOS CONTRATO -->
            <div id="prop-view-modelos-contrato" style="display:${_currentPropostaTab === 'modelos-contrato' ? 'block' : 'none'};"></div>

        </div>
    `;

    if (_currentPropostaTab === 'form') {
        _renderFormPropostaInt();
    } else if (_currentPropostaTab === 'cadastro-cliente') {
        _renderCadastroClienteInt();
    } else if (_currentPropostaTab === 'cadastro-contatos') {
        _renderCadastroContatosInt();
    } else if (_currentPropostaTab === 'enderecos') {
        _renderEnderecosInt();
    } else if (_currentPropostaTab === 'servicos-precificacao') {
        _renderServicosPrecificacaoInt();
    } else if (_currentPropostaTab === 'modelos-contrato') {
        _renderModelosContratoInt();
    }

    setTimeout(() => {
        if (_currentPropostaTab === 'lista') {
            if (window.atualizarGraficosGlobais) window.atualizarGraficosGlobais();
            if (window.atualizarTabela5W2H) window.atualizarTabela5W2H();
            if (window.atualizarTabelaCurvaABC) window.atualizarTabelaCurvaABC();
            filtrarPropostas();
        }

        // Rolagem imediata e precisa para fixar a barra de ferramentas (SaaS header acima)
        const toolbarIdMap = {
            'lista': 'prop-toolbar-principal',
            'form': 'prop-toolbar-form',
            'cadastro-cliente': 'prop-toolbar-cliente',
            'cadastro-contatos': 'prop-toolbar-contatos',
            'enderecos': 'prop-toolbar-enderecos',
            'servicos-precificacao': 'prop-toolbar-servicos'
        };
        const toolbarId = toolbarIdMap[_currentPropostaTab];
        const toolbar = document.getElementById(toolbarId);
        if (toolbar) {
            const targetY = toolbar.getBoundingClientRect().top + window.scrollY;
            window.scrollTo({ top: targetY });
        } else {
            const activeContainer = document.getElementById(`prop-view-${_currentPropostaTab}`);
            if (activeContainer) {
                const targetY = activeContainer.getBoundingClientRect().top + window.scrollY;
                window.scrollTo({ top: targetY });
            }
        }
    }, 150);
}

window.switchPropostaTab = function(tab) {
    _currentPropostaTab = tab;
    
    const viewLista = document.getElementById('prop-view-lista');
    const viewForm = document.getElementById('prop-view-form');
    const viewCadastroCliente = document.getElementById('prop-view-cadastro-cliente');
    const viewCadastroContatos = document.getElementById('prop-view-cadastro-contatos');
    const viewEnderecos = document.getElementById('prop-view-enderecos');
    const viewServicosPrecificacao = document.getElementById('prop-view-servicos-precificacao');
    const viewModelosContrato = document.getElementById('prop-view-modelos-contrato');
    const tabLista = document.getElementById('tab-prop-lista');
    const tabForm = document.getElementById('tab-prop-form');
    const tabCadastroCliente = document.getElementById('tab-prop-cadastro-cliente');
    const tabCadastroContatos = document.getElementById('tab-prop-cadastro-contatos');
    const tabEnderecos = document.getElementById('tab-prop-enderecos');
    const tabServicosPrecificacao = document.getElementById('tab-prop-servicos-precificacao');
    const tabModelosContrato = document.getElementById('tab-prop-modelos-contrato');

    const elementsExist = viewLista && viewForm && viewCadastroCliente && viewCadastroContatos && viewEnderecos && viewServicosPrecificacao && viewModelosContrato;
    if (elementsExist) {
        if (tab === 'form' && viewForm.innerHTML.trim() === '') {
            _renderFormPropostaInt();
        }
        if (tab === 'cadastro-cliente' && viewCadastroCliente.innerHTML.trim() === '') {
            _renderCadastroClienteInt();
        }
        if (tab === 'cadastro-contatos' && viewCadastroContatos.innerHTML.trim() === '') {
            _renderCadastroContatosInt();
        }
        if (tab === 'enderecos' && viewEnderecos.innerHTML.trim() === '') {
            _renderEnderecosInt();
        }
        if (tab === 'servicos-precificacao' && viewServicosPrecificacao.innerHTML.trim() === '') {
            _renderServicosPrecificacaoInt();
        }
        if (tab === 'modelos-contrato' && viewModelosContrato.innerHTML.trim() === '') {
            _renderModelosContratoInt();
        }

        viewLista.style.display = tab === 'lista' ? 'block' : 'none';
        viewForm.style.display = tab === 'form' ? 'block' : 'none';
        viewCadastroCliente.style.display = tab === 'cadastro-cliente' ? 'block' : 'none';
        viewCadastroContatos.style.display = tab === 'cadastro-contatos' ? 'block' : 'none';
        viewEnderecos.style.display = tab === 'enderecos' ? 'block' : 'none';
        viewServicosPrecificacao.style.display = tab === 'servicos-precificacao' ? 'block' : 'none';
        viewModelosContrato.style.display = tab === 'modelos-contrato' ? 'block' : 'none';

        // Update active class in SaaS Header
        document.querySelectorAll('.saas-nav-item, .saas-dropdown-item').forEach(item => {
            item.classList.remove('active');
        });

        if (tab === 'lista') {
            document.querySelectorAll('#tab-prop-lista').forEach(el => el.classList.add('active'));
        } else {
            // Keep parent dropdown trigger active as indicator
            document.querySelectorAll('#tab-prop-lista').forEach(el => el.classList.add('active'));
            
            if (tab === 'form' && tabForm) tabForm.classList.add('active');
            else if (tab === 'cadastro-cliente' && tabCadastroCliente) tabCadastroCliente.classList.add('active');
            else if (tab === 'cadastro-contatos' && tabCadastroContatos) tabCadastroContatos.classList.add('active');
            else if (tab === 'enderecos' && tabEnderecos) tabEnderecos.classList.add('active');
            else if (tab === 'servicos-precificacao') {
                document.querySelectorAll('#tab-prop-servicos-precificacao').forEach(el => el.classList.add('active'));
            } else if (tab === 'modelos-contrato') {
                document.querySelectorAll('#tab-prop-modelos-contrato').forEach(el => el.classList.add('active'));
            }
        }
        if (tab === 'lista') {
            if (window.atualizarGraficosGlobais) window.atualizarGraficosGlobais();
            if (window.atualizarTabela5W2H) window.atualizarTabela5W2H();
            if (window.atualizarTabelaCurvaABC) window.atualizarTabelaCurvaABC();
            filtrarPropostas();
        }
        
        // Rolagem imediata e precisa na nova tela após ocultar a tela anterior (sem lag/pulos na antiga)
        setTimeout(() => {
            const toolbarIdMap = {
                'lista': 'prop-toolbar-principal',
                'form': 'prop-toolbar-form',
                'cadastro-cliente': 'prop-toolbar-cliente',
                'cadastro-contatos': 'prop-toolbar-contatos',
                'enderecos': 'prop-toolbar-enderecos',
                'servicos-precificacao': 'prop-toolbar-servicos'
            };
            const toolbarId = toolbarIdMap[tab];
            const toolbar = document.getElementById(toolbarId);
            if (toolbar) {
                const targetY = toolbar.getBoundingClientRect().top + window.scrollY;
                window.scrollTo({ top: targetY });
            } else {
                const activeContainer = document.getElementById(`prop-view-${tab}`);
                if (activeContainer) {
                    const targetY = activeContainer.getBoundingClientRect().top + window.scrollY;
                    window.scrollTo({ top: targetY });
                }
            }
        }, 10);
    } else {
        renderTelaPropostas();
    }
};

function _renderCardsResumoProp() {
    const cards = [
        { label: 'Total Sales', val: '16,328', trend: '+2.9%', trendColor: '#22c55e', bg: '#fff', text: '#64748b' },
        { label: 'Total Order', val: '1,321', trend: '+9.5%', trendColor: '#ea580c', bg: '#fff', text: '#64748b' },
        { label: 'Customer Count', val: '4,108', trend: '+4.5%', trendColor: '#22c55e', bg: '#fff', text: '#64748b' },
        { label: 'Product Returns', val: '2,156', trend: '+2.5%', trendColor: '#ef4444', bg: '#fff', text: '#64748b' }
    ];
    return cards.map(c => `
        <div style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:1.2rem; display:flex; flex-direction:column; justify-content:space-between; box-shadow:0 1px 3px rgba(0,0,0,0.02);">
            <div style="font-size:0.78rem; font-weight:600; color:#64748b; margin-bottom:0.4rem;">${c.label}</div>
            <div style="display:flex; align-items:baseline; gap:0.4rem;">
                <span style="font-size:1.35rem; font-weight:800; color:#1e293b; line-height:1;">${c.val}</span>
                <span style="font-size:0.75rem; font-weight:700; color:${c.trendColor};">${c.trend}</span>
            </div>
        </div>
    `).join('');
}

function _renderLinhasPropostas(lista) {
    if (!lista || lista.length === 0) {
        return `<tr><td colspan="6" style="padding:3rem; text-align:center; color:#94a3b8;">
            <i class="ph ph-file-dashed" style="font-size:2.5rem; display:block; margin-bottom:0.5rem;"></i>
            Nenhuma proposta encontrada.
        </td></tr>`;
    }

    return lista.map(p => {
        const fase = p.fase_negociacao || 'Em Elaboração';
        const faseStyle = PROP_STATUS_CORES[fase] || { bg: '#f1f5f9', text: '#64748b', icon: 'ph-circle' };
        
        // Format Total Value to Currency BRL
        const valorTotal = typeof p.valor_total === 'number' ? p.valor_total : parseFloat(p.valor_total) || 0;
        const valorFmt = valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        const regiaoHtml = p.regiao ? `
            <div style="margin-top: 3px;">
                <span style="font-size: 0.65rem; font-weight: 800; padding: 1px 6px; border-radius: 4px; display: inline-block; ${
                    p.regiao.includes('Central') ? 'background:#cffafe; color:#0891b2;' :
                    p.regiao.includes('Amarela') ? 'background:#fef9c3; color:#ca8a04;' :
                    p.regiao.includes('Vermelha') ? 'background:#f3e8ff; color:#7e22ce;' :
                    'background:#f1f5f9; color:#475569;'
                }">${p.regiao}</span>
            </div>
        ` : '';

        return `
        <tr style="border-bottom:1px solid #f1f5f9; transition:background 0.15s;" onmouseover="this.style.background='#fafbff'" onmouseout="this.style.background=''">
            <td style="padding:0.6rem 0.75rem; font-weight:700; color:#7048e8; white-space:nowrap;">
                ${p.codigo || '—'}
            </td>
            <td style="padding:0.6rem 0.75rem; color:#1e293b; font-weight:600; max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${p.cliente_nome||''}">
                <div>${p.cliente_nome || '<span style="color:#94a3b8">—</span>'}</div>
                ${regiaoHtml}
            </td>
            <td style="padding:0.6rem 0.75rem; color:#475569; font-size:0.83rem; max-width:160px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${p.tipo||''}">
                ${p.tipo || '—'}
            </td>
            <td style="padding:0.6rem 0.75rem;">
                <span style="background:${faseStyle.bg}; color:${faseStyle.text}; padding:3px 10px; border-radius:12px; font-size:0.78rem; font-weight:600; white-space:nowrap; display:inline-flex; align-items:center; gap:4px;">
                    <i class="ph ${faseStyle.icon}" style="font-size:0.85rem;"></i> ${fase}
                </span>
            </td>
            <td style="padding:0.6rem 0.75rem; color:#1e293b; font-weight:600; white-space:nowrap;">
                ${valorFmt}
            </td>
            <td style="padding:0.6rem 0.75rem; text-align:center; white-space:nowrap; font-size: 1.15rem; color: #64748b; display: flex; align-items: center; justify-content: center; gap: 8px;">
                <i class="ph ph-eye" title="Visualizar" style="color:#3b82f6; cursor:pointer; transition:opacity 0.15s;" onmouseover="this.style.opacity=0.7" onmouseout="this.style.opacity=1" onclick="imprimirProposta(${p.id})"></i>
                <i class="ph ph-pencil-simple" title="Editar" style="color:#7048e8; cursor:pointer; transition:opacity 0.15s;" onmouseover="this.style.opacity=0.7" onmouseout="this.style.opacity=1" onclick="abrirFormProposta(${p.id})"></i>
                <i class="ph ph-trash" title="Excluir" style="color:#ef4444; cursor:pointer; transition:opacity 0.15s;" onmouseover="this.style.opacity=0.7" onmouseout="this.style.opacity=1" onclick="excluirProposta(${p.id})"></i>
            </td>
        </tr>`;
    }).join('');
}

/* ── Atualização Dinâmica de KPIs e Gráficos de Tendência (Globais) ──────── */
window.atualizarGraficosGlobais = function() {
    const hoje = new Date();
    const limiteData = new Date();
    limiteData.setDate(hoje.getDate() + 7);

    const manutencoes = Array.isArray(window._manutencoesData) ? window._manutencoesData : [];
    const veiculos = Array.isArray(window._veiculosData) ? window._veiculosData : [];
    const clientes = Array.isArray(window._clientesData) ? window._clientesData : [];

    const manutCriticaCount = manutencoes.filter(m => {
        const statusVal = (m.status || '').toLowerCase();
        if (statusVal === 'concluida' || statusVal === 'concluído') return false;
        const criticidadeVal = (m.criticidade || '').toLowerCase();
        if (criticidadeVal === 'alta') return true;
        if (m.data_agendamento) {
            const dataAgend = new Date(m.data_agendamento);
            return dataAgend <= limiteData;
        }
        return false;
    }).length;

    // Taxa de Ocupação de Ativos
    const totalVeiculos = veiculos.length;
    const emManutencao = veiculos.filter(v => v.em_manutencao === 1 || v.em_manutencao === 'Sim').length;
    const occupancyRate = totalVeiculos > 0 ? (((totalVeiculos - emManutencao) / totalVeiculos) * 100).toFixed(1) : '88.5';
    const occupancyFmt = totalVeiculos > 0 ? `${occupancyRate}%` : '88.5%';

    // SLA de Serviços - Cumprimento
    const concluidas = manutencoes.filter(m => {
        const statusVal = (m.status || '').toLowerCase();
        return statusVal === 'concluida' || statusVal === 'concluído';
    });
    const noPrazo = concluidas.filter(m => {
        if (!m.data_agendamento || !m.data_conclusao) return true;
        const dataAgend = new Date(m.data_agendamento);
        const dataConcl = new Date(m.data_conclusao);
        return dataConcl <= dataAgend;
    }).length;
    const slaRate = concluidas.length > 0 ? ((noPrazo / concluidas.length) * 100).toFixed(1) : '96.2';
    const slaFmt = concluidas.length > 0 ? `${slaRate}%` : '96.2%';

    // Inadimplência Atual
    const totalClientes = clientes.length;
    const inativos = clientes.filter(c => c.inativo === 'Sim' || c.inativo === 1).length;
    const defaultRate = totalClientes > 0 ? ((inativos / totalClientes) * 100).toFixed(1) : '2.5';
    const defaultFmt = totalClientes > 0 ? `${defaultRate}%` : '2.5%';

    const containerKpis = document.getElementById('container-kpis-top');
    if (containerKpis) {
        containerKpis.innerHTML = `
            <!-- Card 1: Manutenção Crítica (Alerta Laranja) -->
            <div class="reveal-card" style="background:linear-gradient(135deg, #f97316, #ea580c); color:white; border-radius:14px; padding:0.8rem 1rem; display:flex; justify-content:space-between; align-items:center; box-shadow:0 10px 20px -5px rgba(234,88,12,0.3); transition: transform 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                <div>
                    <div style="font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:0.04em; opacity:0.9;">Manutenção Crítica - 7 Dias</div>
                    <div style="font-size:2rem; font-weight:900; margin-top:0.25rem; letter-spacing:-0.5px;">${manutCriticaCount}</div>
                </div>
                <div style="display:flex; justify-content:center; align-items:center; width:44px; height:44px; background:rgba(255,255,255,0.15); border-radius:10px; font-size:1.6rem; opacity:0.95;">
                    <i class="ph ph-wrench"></i>
                </div>
            </div>
            
            <!-- Card 2: Taxa de Ocupação de Ativos (Azul) -->
            <div class="reveal-card" style="background:#fff; border:1px solid #e2e8f0; border-radius:14px; padding:0.8rem 1rem; display:flex; justify-content:space-between; align-items:center; box-shadow:0 4px 6px -1px rgba(0,0,0,0.01), 0 2px 4px -1px rgba(0,0,0,0.01); transition: transform 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                <div>
                    <div style="font-size:0.75rem; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.04em;">Taxa Ocupação de Ativos</div>
                    <div style="font-size:2rem; font-weight:900; color:#1e293b; margin-top:0.25rem; display:flex; align-items:center; gap:0.5rem; letter-spacing:-0.5px;">
                        ${occupancyFmt}
                        <span style="font-size:0.78rem; font-weight:700; color:#3b82f6; background:#eff6ff; padding:2px 8px; border-radius:12px; display:inline-flex; align-items:center; gap:2px;"><i class="ph ph-trend-up"></i> +1.2%</span>
                    </div>
                </div>
                <div style="display:flex; justify-content:center; align-items:center; width:44px; height:44px; background:#eff6ff; color:#3b82f6; border-radius:10px; font-size:1.6rem; opacity:0.95;">
                    <i class="ph ph-package"></i>
                </div>
            </div>
            
            <!-- Card 3: SLA de Serviços - Cumprimento (Verde) -->
            <div class="reveal-card" style="background:#fff; border:1px solid #e2e8f0; border-radius:14px; padding:0.8rem 1rem; display:flex; justify-content:space-between; align-items:center; box-shadow:0 4px 6px -1px rgba(0,0,0,0.01), 0 2px 4px -1px rgba(0,0,0,0.01); transition: transform 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                <div>
                    <div style="font-size:0.75rem; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.04em;">SLA de Serviços - Cumprimento</div>
                    <div style="font-size:2rem; font-weight:900; color:#1e293b; margin-top:0.25rem; letter-spacing:-0.5px;">${slaFmt}</div>
                </div>
                <div style="display:flex; justify-content:center; align-items:center; width:44px; height:44px; background:#ecfdf5; color:#10b981; border-radius:10px; font-size:1.6rem; opacity:0.95;">
                    <i class="ph ph-check-circle"></i>
                </div>
            </div>
            
            <!-- Card 4: Inadimplência Atual (Vermelho/Rosa) -->
            <div class="reveal-card" style="background:#fff; border:1px solid #e2e8f0; border-radius:14px; padding:0.8rem 1rem; display:flex; justify-content:space-between; align-items:center; box-shadow:0 4px 6px -1px rgba(0,0,0,0.01), 0 2px 4px -1px rgba(0,0,0,0.01); transition: transform 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                <div>
                    <div style="font-size:0.75rem; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.04em;">Inadimplência Atual</div>
                    <div style="font-size:2rem; font-weight:900; color:#1e293b; margin-top:0.25rem; display:flex; align-items:center; gap:0.5rem; letter-spacing:-0.5px;">
                        ${defaultFmt}
                        <span style="font-size:0.78rem; font-weight:700; color:#ef4444; background:#fef2f2; padding:2px 8px; border-radius:12px; display:inline-flex; align-items:center; gap:2px;"><i class="ph ph-trend-down"></i> -0.4%</span>
                    </div>
                </div>
                <div style="display:flex; justify-content:center; align-items:center; width:44px; height:44px; background:#fef2f2; color:#ef4444; border-radius:10px; font-size:1.6rem; opacity:0.95;">
                    <i class="ph ph-warning-circle"></i>
                </div>
            </div>
        `;
    }

    // 2. Gráfico de Receita vs Custo (Últimos 6 Meses)
    const mesesAbreviados = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const ultimos6Meses = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
        const anoMes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        ultimos6Meses.push({
            key: anoMes,
            label: mesesAbreviados[d.getMonth()],
            receita: 0,
            custo: 0
        });
    }

    _propostasData.forEach(p => {
        if (!p.data_cadastro) return;
        const [ano, mes] = p.data_cadastro.split('-');
        const key = `${ano}-${mes}`;
        const match = ultimos6Meses.find(m => m.key === key);
        if (match) {
            const valor = typeof p.valor_total === 'number' ? p.valor_total : parseFloat(p.valor_total) || 0;
            const fase = p.fase_negociacao || 'Em Elaboração';
            if (fase === 'Aprovada' || fase === 'Convertida em OS') {
                match.receita += valor;
                match.custo += valor * 0.45;
            }
        }
    });

    const maxValor = Math.max(...ultimos6Meses.map(m => Math.max(m.receita, m.custo)), 1000);

    const formatarValorK = (val) => {
        if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M';
        if (val >= 1000) return (val / 1000).toFixed(0) + 'k';
        return val.toString();
    };

    const yMaxStr = formatarValorK(maxValor);
    const y75Str = formatarValorK(maxValor * 0.75);
    const y50Str = formatarValorK(maxValor * 0.50);
    const y25Str = formatarValorK(maxValor * 0.25);

    const revenuePoints = ultimos6Meses.map((m, idx) => {
        const x = 40 + idx * 80;
        const y = 160 - (m.receita / maxValor) * 140;
        return `${idx === 0 ? 'M' : 'L'} ${x},${y}`;
    }).join(' ');

    const costPoints = ultimos6Meses.map((m, idx) => {
        const x = 40 + idx * 80;
        const y = 160 - (m.custo / maxValor) * 140;
        return `${idx === 0 ? 'M' : 'L'} ${x},${y}`;
    }).join(' ');

    const areaRevenuePoints = revenuePoints + ` L ${40 + 5 * 80},160 L 40,160 Z`;
    const areaCostPoints = costPoints + ` L ${40 + 5 * 80},160 L 40,160 Z`;

    const pointsHtml = ultimos6Meses.map((m, idx) => {
        const x = 40 + idx * 80;
        const yRev = 160 - (m.receita / maxValor) * 140;
        const yCost = 160 - (m.custo / maxValor) * 140;
        return `
            <circle cx="${x}" cy="${yRev}" r="5" fill="#3b82f6" stroke="#fff" stroke-width="2" style="filter:drop-shadow(0 2px 4px rgba(59,130,246,0.3)); cursor:pointer;" title="Receita: ${formatarValorK(m.receita)}"/>
            <circle cx="${x}" cy="${yCost}" r="4" fill="#f97316" stroke="#fff" stroke-width="1.5" style="cursor:pointer;" title="Custo: ${formatarValorK(m.custo)}"/>
        `;
    }).join('');

    const containerLinha = document.getElementById('container-grafico-linha');
    if (containerLinha) {
        containerLinha.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.2rem;">
                <h3 style="margin:0; font-size:0.9rem; font-weight:800; color:#1e293b; display:flex; align-items:center; gap:6px;">
                    <i class="ph ph-chart-line-up" style="color:#3b82f6; font-size:1.1rem;"></i> Receita vs. Custo Operacional (6M)
                </h3>
                <div style="display:flex; gap:0.6rem; font-size:0.72rem; font-weight:700;">
                    <div style="display:flex; align-items:center; gap:4px; background:#eff6ff; color:#2563eb; padding:3px 8px; border-radius:12px;">
                        <span style="width:6px; height:6px; background:#3b82f6; display:inline-block; border-radius:50%;"></span>
                        <span>Receita</span>
                    </div>
                    <div style="display:flex; align-items:center; gap:4px; background:#fff7ed; color:#c2410c; padding:3px 8px; border-radius:12px;">
                        <span style="width:6px; height:2px; background:#f97316; display:inline-block;"></span>
                        <span>Custo</span>
                    </div>
                </div>
            </div>
            <div style="position:relative; height:180px; margin-top:0.5rem; font-family:'Inter', sans-serif;">
                <svg width="100%" height="180" viewBox="0 0 500 180" preserveAspectRatio="none" style="overflow: visible;">
                    <defs>
                        <linearGradient id="receita-area-grad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.2"/>
                            <stop offset="100%" stop-color="#3b82f6" stop-opacity="0.0"/>
                        </linearGradient>
                        <linearGradient id="custo-area-grad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stop-color="#f97316" stop-opacity="0.1"/>
                            <stop offset="100%" stop-color="#f97316" stop-opacity="0.0"/>
                        </linearGradient>
                    </defs>
                    <g stroke="#f1f5f9" stroke-width="1" stroke-dasharray="2 4">
                        <line x1="30" y1="20" x2="480" y2="20"/>
                        <line x1="30" y1="60" x2="480" y2="60"/>
                        <line x1="30" y1="100" x2="480" y2="100"/>
                        <line x1="30" y1="140" x2="480" y2="140"/>
                    </g>
                    <line x1="30" y1="160" x2="480" y2="160" stroke="#e2e8f0" stroke-width="1.5"/>
                    
                    <g fill="#94a3b8" font-size="8" text-anchor="end" font-weight="600">
                        <text x="22" y="23">${yMaxStr}</text>
                        <text x="22" y="63">${y75Str}</text>
                        <text x="22" y="103">${y50Str}</text>
                        <text x="22" y="143">${y25Str}</text>
                        <text x="22" y="163">0</text>
                    </g>
                    
                    <g fill="#64748b" font-size="9" text-anchor="middle" font-weight="700">
                        <text x="40" y="174">${ultimos6Meses[0].label}</text>
                        <text x="120" y="174">${ultimos6Meses[1].label}</text>
                        <text x="200" y="174">${ultimos6Meses[2].label}</text>
                        <text x="280" y="174">${ultimos6Meses[3].label}</text>
                        <text x="360" y="174">${ultimos6Meses[4].label}</text>
                        <text x="440" y="174">${ultimos6Meses[5].label}</text>
                    </g>
                    
                    <!-- Areas -->
                    <path d="${areaRevenuePoints}" fill="url(#receita-area-grad)" stroke="none"/>
                    <path d="${areaCostPoints}" fill="url(#custo-area-grad)" stroke="none"/>
                    
                    <!-- Lines -->
                    <path d="${revenuePoints}" fill="none" stroke="#3b82f6" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0px 4px 6px rgba(59, 130, 246, 0.25));"/>
                    <path d="${costPoints}" fill="none" stroke="#f97316" stroke-width="2" stroke-dasharray="4 4" stroke-linecap="round" stroke-linejoin="round"/>
                    
                    <!-- Interactive Circles -->
                    ${pointsHtml}
                </svg>
            </div>
        `;
    }

    // 3. Stacked Bar Chart (Últimos 3 Meses)
    const ultimos3Meses = ultimos6Meses.slice(3);
    const maxBarVal = Math.max(...ultimos3Meses.map(m => m.receita), 1000);

    const barsHtml = ultimos3Meses.map(m => {
        const pctPesado = m.receita > 0 ? 50 : 0;
        const pctLeves = m.receita > 0 ? 30 : 0;
        const pctTecnica = m.receita > 0 ? 20 : 0;

        const totalHeightPct = m.receita > 0 ? Math.round((m.receita / maxBarVal) * 100) : 0;
        const heightStyle = `height:${totalHeightPct}%;`;

        return `
            <div style="display:flex; flex-direction:column-reverse; width:38px; ${heightStyle} min-height:10px; transition: height 0.3s ease; box-shadow: 0 4px 10px rgba(0,0,0,0.05); border-radius:4px; overflow:hidden;">
                <div style="height:${pctPesado}%; background:linear-gradient(180deg, #60a5fa, #2563eb);" title="Eq. Pesado (${formatarValorK(m.receita * 0.5)})"></div>
                <div style="height:${pctLeves}%; background:linear-gradient(180deg, #34d399, #059669);" title="Veíc. Leves (${formatarValorK(m.receita * 0.3)})"></div>
                <div style="height:${pctTecnica}%; background:linear-gradient(180deg, #fb923c, #ea580c);" title="M.O. Técnica (${formatarValorK(m.receita * 0.2)})"></div>
            </div>
        `;
    }).join('');

    const containerBarra = document.getElementById('container-grafico-barra');
    if (containerBarra) {
        containerBarra.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.2rem;">
                <h3 style="margin:0; font-size:0.9rem; font-weight:800; color:#1e293b; display:flex; align-items:center; gap:6px;">
                    <i class="ph ph-chart-bar" style="color:#10b981; font-size:1.1rem;"></i> Categoria de Ativo (Mensal)
                </h3>
                <div style="display:flex; gap:0.4rem; font-size:0.65rem; font-weight:700;">
                    <span style="display:inline-flex; align-items:center; gap:4px; background:#eff6ff; color:#1e40af; padding:2px 8px; border-radius:12px;">
                        <span style="width:6px; height:6px; background:#3b82f6; display:inline-block; border-radius:50%;"></span>
                        Eq. Pesado
                    </span>
                    <span style="display:inline-flex; align-items:center; gap:4px; background:#ecfdf5; color:#065f46; padding:2px 8px; border-radius:12px;">
                        <span style="width:6px; height:6px; background:#10b981; display:inline-block; border-radius:50%;"></span>
                        Veículos
                    </span>
                </div>
            </div>
            <div style="position:relative; height:180px; margin-top:0.5rem; font-family:'Inter', sans-serif;">
                <div style="display:flex; justify-content:space-around; align-items:flex-end; height:140px; border-bottom:1px solid #cbd5e1; padding-bottom:5px; box-sizing:border-box; background:linear-gradient(180deg, rgba(248,250,252,0) 0%, rgba(248,250,252,0.8) 100%);">
                    ${barsHtml}
                </div>
                <div style="display:flex; justify-content:space-around; font-size:0.75rem; font-weight:700; color:#64748b; margin-top:8px;">
                    <span style="width:38px; text-align:center;">${ultimos3Meses[0].label}</span>
                    <span style="width:38px; text-align:center;">${ultimos3Meses[1].label}</span>
                    <span style="width:38px; text-align:center;">${ultimos3Meses[2].label}</span>
                </div>
            </div>
        `;
    }
};



/* ── Atualização Dinâmica de Gráficos e BI ──────────────────────────────── */
window.atualizarGraficosComerciais = function(lista) {
    if (!Array.isArray(lista)) return;

    // --- PROCESSAMENTO DE DADOS COMERCIAIS & BI ---
    const statusCounts = {};
    let totalPropostas = 0;
    let totalConvertido = 0;
    let totalReprovado = 0;
    const motivoCounts = {};

    lista.forEach(p => {
        const fase = p.fase_negociacao || 'Em Elaboração';
        statusCounts[fase] = (statusCounts[fase] || 0) + 1;
        totalPropostas++;

        const valor = typeof p.valor_total === 'number' ? p.valor_total : parseFloat(p.valor_total) || 0;
        const faseNorm = (p.fase_negociacao || '').trim().toLowerCase();
        if (faseNorm === 'convertida em os' || faseNorm === 'convertida para os' || faseNorm === 'ganho') {
            totalConvertido += valor;
        } else if (faseNorm === 'reprovada' || faseNorm === 'reprovadas' || faseNorm === 'cancelada' || faseNorm === 'canceladas' || faseNorm === 'perdida' || faseNorm === 'perdido') {
            totalReprovado += valor;
        }

        const motivo = p.motivo_reprovacao;
        if (motivo && motivo !== 'N/A' && motivo !== '') {
            motivoCounts[motivo] = (motivoCounts[motivo] || 0) + 1;
        }
    });

    // 1. Rosca Status
    const fasesLabels = ['Em Elaboração', 'Proposta Enviada', 'Em Negociação', 'Aguardando Aprovação', 'Aprovada', 'Reprovada', 'Cancelada', 'Convertida em OS'];
    const coresFases = {
        'Em Elaboração': '#94a3b8',
        'Proposta Enviada': '#eab308',
        'Em Negociação': '#f97316',
        'Aguardando Aprovação': '#a855f7',
        'Aprovada': '#10b981',
        'Reprovada': '#ef4444',
        'Cancelada': '#64748b',
        'Convertida em OS': '#3b82f6'
    };

    let currentPct = 0;
    const fatias = [];
    fasesLabels.forEach(f => {
        const count = statusCounts[f] || 0;
        if (count > 0 && totalPropostas > 0) {
            const pct = (count / totalPropostas) * 100;
            fatias.push({
                color: coresFases[f] || '#94a3b8',
                start: currentPct,
                end: currentPct + pct,
                fase: f,
                count: count
            });
            currentPct += pct;
        }
    });
    if (fatias.length === 0) {
        fatias.push({ color: '#e2e8f0', start: 0, end: 100, fase: 'Sem dados', count: 0 });
    }
    const gradientParts = fatias.map(f => `${f.color} ${f.start}% ${f.end}%`).join(', ');
    const conicGradientStyle = `background: conic-gradient(${gradientParts});`;
    
    const legendaHtml = fatias.map(f => `
        <div style="display:flex; align-items:center; gap:6px; font-size:0.68rem; color:#475569; font-weight:700; padding:2px 4px; border-radius:6px; transition:background 0.15s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background=''">
            <span style="width:8px; height:8px; background:${f.color}; display:inline-block; border-radius:50%; flex-shrink:0; box-shadow:0 0 4px ${f.color}80;"></span>
            <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:100px;" title="${f.fase}">${f.fase}</span>
            <span style="margin-left:auto; color:#1e293b; font-weight:800; background:#f1f5f9; padding:1px 6px; border-radius:10px; font-size:0.6rem;">${f.count}</span>
        </div>
    `).join('');

    const containerRosca = document.getElementById('container-grafico-rosca');
    if (containerRosca) {
        containerRosca.innerHTML = `
            <h3 style="margin:0 0 0.8rem 0; font-size:0.9rem; font-weight:800; color:#1e293b; align-self:flex-start; display:flex; align-items:center; gap:6px; width:100%;">
                <i class="ph ph-chart-pie" style="color:#7048e8; font-size:1.05rem;"></i> Status de Propostas
            </h3>
            <div style="display:flex; align-items:center; justify-content:space-between; width:100%; gap:0.5rem; flex:1; padding-top:0.25rem;">
                <div style="width:110px; height:110px; border-radius:50%; ${conicGradientStyle} display:flex; align-items:center; justify-content:center; margin:0 auto; box-shadow:0 4px 12px rgba(0,0,0,0.06); flex-shrink:0; position:relative;">
                    <div style="width:78px; height:78px; border-radius:50%; background:#ffffff; display:flex; flex-direction:column; align-items:center; justify-content:center; box-shadow:inset 0 2px 5px rgba(0,0,0,0.05);">
                        <span style="font-size:1.25rem; font-weight:900; color:#1e293b; letter-spacing:-0.5px;">${totalPropostas}</span>
                        <span style="font-size:0.55rem; color:#64748b; font-weight:700; text-transform:uppercase; letter-spacing:0.04em;">Total</span>
                    </div>
                </div>
                <div style="flex:1; display:flex; flex-direction:column; gap:4px; max-height:130px; overflow-y:auto; padding-left:0.5rem; border-left:1px solid #f1f5f9;">
                    ${legendaHtml}
                </div>
            </div>
        `;
    }

    // 2. Comparativo Financeiro
    const totalConvertidoFmt = totalConvertido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 });
    const totalReprovadoFmt = totalReprovado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 });
    const maxVal = Math.max(totalConvertido, totalReprovado, 1);
    const pctConvertido = (totalConvertido / maxVal) * 90;
    const pctReprovado = (totalReprovado / maxVal) * 90;

    const containerConversao = document.getElementById('container-grafico-conversao');
    if (containerConversao) {
        containerConversao.innerHTML = `
            <h3 style="margin:0 0 0.8rem 0; font-size:0.9rem; font-weight:800; color:#1e293b; display:flex; align-items:center; gap:6px;">
                <i class="ph ph-currency-dollar-simple" style="color:#10b981; font-size:1.05rem;"></i> Conversão Financeira
            </h3>
            <div style="display:flex; gap:1.5rem; justify-content:center; align-items:flex-end; height:105px; border-bottom:1px solid #cbd5e1; padding-bottom:8px; box-sizing:border-box; margin-bottom:8px; flex:1; background:linear-gradient(180deg, rgba(248,250,252,0) 0%, rgba(248,250,252,0.8) 100%);">
                <!-- Ganho -->
                <div style="display:flex; flex-direction:column; align-items:center; width:70px;">
                    <span style="font-size:0.68rem; font-weight:800; color:#16a34a; margin-bottom:4px; text-align:center; overflow:hidden; text-overflow:ellipsis; max-width:70px;" title="${totalConvertidoFmt}">${totalConvertidoFmt}</span>
                    <div style="width:28px; height:${Math.round(pctConvertido)}px; background:linear-gradient(180deg,#34d399,#059669); border-radius:5px 5px 0 0; box-shadow:0 4px 10px rgba(16,185,129,0.25);" title="Ganho"></div>
                </div>
                <!-- Perdido -->
                <div style="display:flex; flex-direction:column; align-items:center; width:70px;">
                    <span style="font-size:0.68rem; font-weight:800; color:#dc2626; margin-bottom:4px; text-align:center; overflow:hidden; text-overflow:ellipsis; max-width:70px;" title="${totalReprovadoFmt}">${totalReprovadoFmt}</span>
                    <div style="width:28px; height:${Math.round(pctReprovado)}px; background:linear-gradient(180deg,#f87171,#dc2626); border-radius:5px 5px 0 0; box-shadow:0 4px 10px rgba(220,38,38,0.25);" title="Perdido"></div>
                </div>
            </div>
            <div style="display:flex; gap:1.5rem; justify-content:center; font-size:0.75rem; font-weight:800; color:#64748b; margin-top:4px;">
                <span style="width:70px; text-align:center; color:#059669; background:#ecfdf5; padding:2px 8px; border-radius:12px;">Ganho</span>
                <span style="width:70px; text-align:center; color:#dc2626; background:#fef2f2; padding:2px 8px; border-radius:12px;">Perdido</span>
            </div>
        `;
    }

    // 3. Pareto Motivos
    const motivosOrdenados = Object.entries(motivoCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    const maxMotivoCount = motivosOrdenados.length > 0 ? motivosOrdenados[0][1] : 1;
    const paretoHtml = motivosOrdenados.length > 0 ? motivosOrdenados.map(([motivo, count]) => {
        const pct = (count / maxMotivoCount) * 100;
        return `
            <div style="display:flex; flex-direction:column; gap:4px; font-size:0.75rem; margin-bottom:0.5rem;">
                <div style="display:flex; justify-content:space-between; font-weight:700; color:#475569;">
                    <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:120px;" title="${motivo}">${motivo}</span>
                    <span style="color:#1e293b; background:#f1f5f9; font-size:0.65rem; font-weight:800; padding:1px 6px; border-radius:10px;">${count}</span>
                </div>
                <div style="background:#f1f5f9; border-radius:6px; height:8px; overflow:hidden; width:100%; box-shadow:inset 0 1px 2px rgba(0,0,0,0.05);">
                    <div style="width:${pct}%; background:linear-gradient(90deg, #6366f1, #a855f7); height:100%; border-radius:6px; box-shadow:0 1px 3px rgba(99,102,241,0.3);"></div>
                </div>
            </div>
        `;
    }).join('') : `<div style="text-align:center; padding:2.5rem 0; color:#94a3b8; font-style:italic; font-size:0.8rem;">Nenhum motivo registrado.</div>`;

    const containerMotivos = document.getElementById('container-grafico-motivos');
    if (containerMotivos) {
        containerMotivos.innerHTML = `
            <h3 style="margin:0 0 0.8rem 0; font-size:0.9rem; font-weight:800; color:#1e293b; display:flex; align-items:center; gap:6px;">
                <i class="ph ph-warning-circle" style="color:#ea580c; font-size:1.05rem;"></i> Top Motivos de Perda
            </h3>
            <div style="display:flex; flex-direction:column; justify-content:center; flex:1; overflow-y:auto; max-height:130px; padding-top:0.25rem;">
                ${paretoHtml}
            </div>
        `;
    }

    // 4. Curva ABC
    if (typeof window.atualizarTabelaCurvaABC === 'function') {
        window.atualizarTabelaCurvaABC(lista);
    }
};

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

    // Atualiza os gráficos de forma reativa a partir da lista ativa!
    window.atualizarGraficosComerciais(lista);
}

function limparFiltrosPropostas() {
    ['prop-filtro-texto','prop-filtro-fase','prop-filtro-de','prop-filtro-ate'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    filtrarPropostas();
}

window._carregarServicosPrecificadosList = async function() {
    try {
        _precificacaoServicosList = await apiGet('/servicos-precificacao') || [];
        _comercialViabilidades = await apiGet('/comercial/precificacao-viabilidade') || [];
    } catch (e) {
        console.error('[PROPOSTA] Erro ao carregar serviços precificados/viabilidades:', e);
    }
};

window._filtrarServicosPrecificadosPorTabela = function(tabelaPreco, selectedServiceId = null) {
    const selectServico = document.getElementById('prop-servico-precificado');
    if (!selectServico) return;

    // Save current selection if any
    const currentVal = selectedServiceId || selectServico.value;

    // Clear options except first placeholder
    selectServico.innerHTML = '<option value="">-- Nenhum Serviço Precificado Selecionado (Manter Valor Manual) --</option>';

    // Filter and populate
    (_precificacaoServicosList || []).forEach(s => {
        const code = `SVC-${String(s.id).padStart(4, '0')}`;
        const viab = (_comercialViabilidades || []).find(v => v.servico_codigo === code);
        
        let price = s.preco_venda || 0;
        let shouldInclude = true;

        const tp = (tabelaPreco || '').toUpperCase();
        if (tp.includes('DIÁRIA') || tp.includes('DIARIA') || tp.includes('EVENTO')) {
            price = viab ? viab.preco_sugerido_dia : 0;
            shouldInclude = price > 0;
        } else if (tp.includes('SEMANAL')) {
            price = viab ? viab.preco_sugerido_semana : 0;
            shouldInclude = price > 0;
        } else if (tp.includes('QUINZENAL')) {
            price = viab ? viab.preco_sugerido_semana * 2 : 0;
            shouldInclude = price > 0;
        } else if (tp.includes('MENSAL')) {
            price = viab ? viab.preco_sugerido_mes : 0;
            shouldInclude = price > 0;
        } else {
            // Outras tabelas (ex: TABELA DE PREÇO[1] ou PRODUTO VENDA[6]) -> usa o preço de venda padrão do serviço
            price = s.preco_venda || 0;
            shouldInclude = true;
        }

        if (shouldInclude) {
            const option = document.createElement('option');
            option.value = s.id;
            option.setAttribute('data-preco', price);
            const formattedPrice = Number(price).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
            option.textContent = `${s.nome} (R$ ${formattedPrice})`;
            if (String(s.id) === String(currentVal)) {
                option.selected = true;
            }
            selectServico.appendChild(option);
        }
    });
};

/* ── Formulário (Modal) ─────────────────────────────────────────────── */
window.abrirFormProposta = abrirFormProposta;
async function abrirFormProposta(id) {
    _propostasEditandoId = id;
    _currentPropostaTab = 'form';
    
    if (typeof _carregarServicosPrecificadosList === 'function') {
        await _carregarServicosPrecificadosList();
    }
    
    // Sempre re-renderiza o form ao abrir pelo botão de Editar ou Nova Proposta (para resetar dados)
    if (document.getElementById('prop-view-form')) {
        _renderFormPropostaInt();
    }
    window.switchPropostaTab('form');
}

function _renderFormPropostaInt() {
    const id = _propostasEditandoId;
    const prop = id ? _propostasData.find(p => p.id === id) : null;
    _propRegiaoIdentificada = prop && prop.regiao ? prop.regiao : '';
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

    window._propProdutosAdicionados = prop && prop.itens ? (typeof prop.itens === 'string' ? JSON.parse(prop.itens) : prop.itens) : [];

    const v = (campo) => prop ? (prop[campo] || '') : '';
    const vn = (campo, def='0') => prop ? (prop[campo] ?? def) : def;

    container.innerHTML = `
        <div style="background:#fff; width:100%; border-radius:14px; box-shadow:0 5px 20px rgba(0,0,0,0.05); overflow:visible; margin:0 auto; border: 1px solid #e2e8f0;">

            <!-- Toolbar -->
            <div id="prop-toolbar-form" style="background:#f8fafc; border-bottom:1px solid #e2e8f0; padding:0.65rem 1.5rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.6rem; position:sticky; top:0; z-index:997; border-top-left-radius:14px; border-top-right-radius:14px;">
                
                <!-- Badge Lado Esquerdo: Dropdown de Navegação -->
                <div class="saas-dropdown-container">
                    <div class="saas-nav-item active" id="tab-prop-lista" onclick="switchPropostaTab('lista')" style="display: flex; align-items: center; gap: 0.25rem;">
                        <i class="ph ph-list-bullets"></i> Lista de Propostas <i class="ph ph-caret-down" style="font-size: 0.8rem; opacity: 0.7;"></i>
                    </div>
                    <div class="saas-dropdown-menu">
                        <div class="saas-dropdown-item" onclick="abrirFormProposta(null); event.stopPropagation();">
                            <i class="ph ph-pencil-simple"></i> Nova Proposta
                        </div>
                        <div class="saas-dropdown-item" onclick="switchPropostaTab('cadastro-cliente'); event.stopPropagation();">
                            <i class="ph ph-user-plus"></i> Cadastro de Clientes
                        </div>
                        <div class="saas-dropdown-item" onclick="switchPropostaTab('cadastro-contatos'); event.stopPropagation();">
                            <i class="ph ph-identification-card"></i> Cadastro de Contatos
                        </div>
                        <div class="saas-dropdown-item" onclick="switchPropostaTab('enderecos'); event.stopPropagation();">
                            <i class="ph ph-map-pin"></i> Endereços
                        </div>
                        <div class="saas-dropdown-item" id="tab-prop-servicos-precificacao" onclick="switchPropostaTab('servicos-precificacao'); event.stopPropagation();">
                            <i class="ph ph-calculator"></i> Precificação de Serviços
                        </div>
                        <div class="saas-dropdown-item" id="tab-prop-modelos-contrato" onclick="switchPropostaTab('modelos-contrato'); event.stopPropagation();">
                            <i class="ph ph-file-text"></i> Modelos de Contrato
                        </div>
                    </div>
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
                    <button onclick="limparFormPropostaNovo(); if (typeof window.abrirModalPreenchimentoIA === 'function') window.abrirModalPreenchimentoIA();" style="background:#3b82f6; color:white; border:none; padding:0.45rem 1rem; border-radius:6px; cursor:pointer; font-weight:600; font-size:0.82rem; display:inline-flex; align-items:center; gap:5px; transition:background 0.15s;" onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'" onfocus="this.blur()">
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
            <div style="padding:1.5rem;">
                <form id="form-proposta" onsubmit="return false;">

                    <!-- Linha 1: Código, Tipo, Atendente -->
                    <div style="display:grid; grid-template-columns:1fr 2fr 1.5fr; gap:1rem; margin-bottom:1rem;">
                        <div>
                            <label class="prop-lbl">Código</label>
                            <div style="display:flex; gap:0.25rem; align-items:center;">
                                <input type="text" id="prop-codigo" value="${v('codigo') || (isNovo ? 'Auto' : '')}" readonly
                                    style="flex:1;padding:0.55rem;border:1px solid #e2e8f0;border-radius:6px;background:#f8fafc;color:#64748b;font-size:0.85rem;box-sizing:border-box; height:36px;">
                                <button type="button" onclick="window.abrirModalPesquisaPropostas()" style="background:#f1f5f9; border:1px solid #cbd5e1; border-radius:6px; width:36px; height:36px; display:inline-flex; align-items:center; justify-content:center; cursor:pointer; color:#475569; transition:all 0.2s;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'" title="Pesquisar Proposta">
                                    <i class="ph ph-magnifying-glass" style="font-size:1.1rem; font-weight:700;"></i>
                                </button>
                            </div>
                        </div>
                        <div>
                            <label class="prop-lbl">Tipo *</label>
                            <select id="prop-tipo" style="width:100%;padding:0.55rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;box-sizing:border-box;">
                                <option value="">-- Selecione --</option>
                                ${PROP_TIPOS.map(t => `<option value="${t}" ${v('tipo')===t?'selected':''}>${t}</option>`).join('')}
                            </select>
                            <a href="javascript:void(0)" onclick="window.abrirModalPreenchimentoIA()" style="color:#7048e8; font-size:0.75rem; font-weight:700; text-decoration:none; display:flex; align-items:center; gap:2px; margin-top:4px; justify-content:flex-end;">
                                <i class="ph ph-magic-wand"></i> IA: Atendimento
                            </a>
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
                            <select id="prop-fase" onchange="window.toggleMotivoReprovacao(this.value)" style="width:100%;padding:0.55rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;box-sizing:border-box;">
                                ${PROP_FASES.map(f => `<option value="${f}" ${v('fase_negociacao')===f?'selected':''}>${f}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="prop-lbl">Modelo de Impressão</label>
                            <select id="prop-modelo" style="width:100%;padding:0.55rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;box-sizing:border-box;">
                                <option value="">-- Selecione --</option>
                                ${(window._comercialModelosContrato && window._comercialModelosContrato.length > 0 ? window._comercialModelosContrato : PROP_MODELOS.map(x => ({ nome: x }))).map(m => `<option value="${m.nome}" ${v('modelo_impressao')===m.nome?'selected':''}>${m.nome}</option>`).join('')}
                            </select>
                        </div>
                    </div>

                    <!-- Motivo de Reprovação/Cancelamento (Exibido apenas se a Fase de Negociação for 'Reprovada' ou 'Cancelada') -->
                    <div id="wrapper-motivo-reprovacao" style="display: ${v('fase_negociacao') === 'Reprovada' || v('fase_negociacao') === 'Cancelada' ? 'block' : 'none'}; margin-bottom: 1rem;">
                        <label class="prop-lbl">${v('fase_negociacao') === 'Cancelada' ? 'Motivo de Cancelamento *' : 'Motivo de Reprovação *'}</label>
                        <select id="prop-motivo-reprovacao" style="width:100%;padding:0.55rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;box-sizing:border-box;">
                            <option value="">-- Selecione o Motivo --</option>
                            ${['Preço', 'Concorrência', 'Prazo', 'Especificação Técnica', 'Orçamento Esgotado', 'Outros'].map(opt => `<option value="${opt}" ${v('motivo_reprovacao')===opt?'selected':''}>${opt}</option>`).join('')}
                        </select>
                    </div>

                    <!-- Seção: Cliente e Contato -->
                    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:9px; padding:0.6rem 0.9rem; margin-bottom:0.6rem;">
                        <h4 style="margin:0 0 0.4rem; font-size:0.8rem; color:#475569; font-weight:700; display:flex; align-items:center; gap:6px;">
                            <i class="ph ph-buildings" style="color:#7048e8;"></i> Dados do Cliente
                        </h4>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.5rem 0.75rem;">
                            <div>
                                <label class="prop-lbl">Cliente</label>
                                <div style="display:flex; gap:0.4rem; align-items:center;">
                                    <input type="text" id="prop-cliente" value="${v('cliente_nome')}"
                                        style="flex:1;padding:0.55rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;box-sizing:border-box;" placeholder="Nome ou razão do cliente">
                                    <button type="button" onclick="pesquisarClienteProposta()" title="Pesquisar Cliente" style="background:#16a34a; color:white; border:none; width:28px; height:28px; border-radius:4px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; transition:background 0.15s; outline:none;" onmouseover="this.style.background='#15803d'" onmouseout="this.style.background='#16a34a'">
                                        <i class="ph ph-magnifying-glass" style="font-size:0.95rem;"></i>
                                    </button>
                                    <button type="button" onclick="verDetalhesClienteProposta()" title="Ver Detalhes do Cliente" style="background:#0ea5e9; color:white; border:none; width:28px; height:28px; border-radius:4px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; transition:background 0.15s; outline:none;" onmouseover="this.style.background='#0284c7'" onmouseout="this.style.background='#0ea5e9'">
                                        <i class="ph ph-eye" style="font-size:0.95rem;"></i>
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label class="prop-lbl">Contato</label>
                                <div style="display:flex; gap:0.4rem; align-items:center;">
                                    <input type="text" id="prop-contato" value="${v('contato_nome')}"
                                        style="flex:1;padding:0.55rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;box-sizing:border-box;" placeholder="Nome do contato">
                                    <button type="button" onclick="pesquisarContatoProposta()" title="Pesquisar Contato" style="background:#16a34a; color:white; border:none; width:28px; height:28px; border-radius:4px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; transition:background 0.15s; outline:none;" onmouseover="this.style.background='#15803d'" onmouseout="this.style.background='#16a34a'">
                                        <i class="ph ph-magnifying-glass" style="font-size:0.95rem;"></i>
                                    </button>
                                    <button type="button" onclick="verDetalhesContatoProposta()" title="Ver Detalhes do Contato" style="background:#0ea5e9; color:white; border:none; width:28px; height:28px; border-radius:4px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; transition:background 0.15s; outline:none;" onmouseover="this.style.background='#0284c7'" onmouseout="this.style.background='#0ea5e9'">
                                        <i class="ph ph-eye" style="font-size:0.95rem;"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Seção: Período e Preços -->
                    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:9px; padding:0.6rem 0.9rem; margin-bottom:0.6rem;">
                        <h4 style="margin:0 0 0.4rem; font-size:0.8rem; color:#475569; font-weight:700; display:flex; align-items:center; gap:6px;">
                            <i class="ph ph-calendar-blank" style="color:#7048e8;"></i> Período e Condições
                        </h4>
                        <div style="display:grid; grid-template-columns:1.2fr 1.2fr 0.8fr 1.8fr; gap:0.5rem 0.75rem; margin-bottom:0.4rem;">
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
                                <select id="prop-tabela" onchange="window._filtrarServicosPrecificadosPorTabela(this.value)" style="width:100%;padding:0.55rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;box-sizing:border-box;">
                                    <option value="">-- Selecione --</option>
                                    ${PROP_TABELAS.map(t => `<option value="${t}" ${v('tabela_precos')===t?'selected':''}>${t}</option>`).join('')}
                                </select>
                            </div>
                        </div>

                        <!-- Linha: Serviço Precificado -->
                        <div style="display:grid; grid-template-columns:1fr; gap:0.5rem 0.75rem; margin-bottom:0.4rem;">
                            <div>
                                <label class="prop-lbl">Serviço Precificado (Composição de Custo/Preço)</label>
                                <select id="prop-servico-precificado" onchange="window.calcularValorTotalProposta()" style="width:100%;padding:0.55rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;box-sizing:border-box;font-weight:600;color:#1e293b;background:#fff;">
                                    <option value="">-- Nenhum Serviço Precificado Selecionado (Manter Valor Manual) --</option>
                                </select>
                            </div>
                        </div>

                        <!-- Linha: Desconto %, Desconto R$, Condição Pagamento -->
                        <div style="display:grid; grid-template-columns:1fr 1fr 1.5fr; gap:0.5rem 0.75rem; margin-bottom:0.6rem;">
                            <div>
                                <label class="prop-lbl">Desconto (%)</label>
                                <input type="number" id="prop-desc-pct" value="${vn('desconto_percent','0')}" min="0" max="100" step="0.01"
                                    oninput="calcularDescontoReais()"
                                    style="width:100%;padding:0.55rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;box-sizing:border-box;">
                            </div>
                            <div>
                                <label class="prop-lbl">Desconto (R$)</label>
                                <input type="number" id="prop-desc-rs" value="${vn('desconto_reais','0')}" min="0" step="0.01"
                                    oninput="document.getElementById('prop-desc-pct').value = '0'; window.calcularValorTotalProposta();"
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

                        <!-- Linha: Endereço de Instalação, Manutenções e Dias da Semana (Largura Total da Linha) -->
                        <div style="display:flex; gap:0.5rem; align-items:center; flex-wrap:wrap; background:#f8fafc; padding:0.35rem 0.6rem; border:1px solid #e2e8f0; border-radius:6px; box-sizing:border-box; width:100%; margin-bottom:0.6rem;">
                            
                            <!-- Endereço de Instalação -->
                            <div style="display:flex; align-items:center; gap:6px; flex:1; min-width:320px;">
                                <span style="font-size:0.85rem; font-weight:700; color:#475569; white-space:nowrap;">Instalação:</span>
                                <input type="text" id="prop-endereco" value="${v('endereco_instalacao')}"
                                    onchange="window.classificarRegiaoEDias()"
                                    oninput="window.classificarRegiaoEDiasDebounced()"
                                    style="flex:1;padding:0 0.45rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;box-sizing:border-box;height:28px;" placeholder="Rua, número, cidade, estado">
                                <button type="button" onclick="window.abrirModalEnderecosEntrega()" style="background:#e2e8f0; color:#475569; border:none; padding:0; width:28px; height:28px; border-radius:4px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; transition:0.15s; outline:none;" onmouseover="this.style.background='#cbd5e1'" onmouseout="this.style.background='#e2e8f0'" title="Consultar Endereços de Instalação">
                                    <i class="ph ph-magnifying-glass" style="font-size:0.95rem;"></i>
                                </button>
                                <span id="prop-regiao-ia-badge" style="display:none; font-weight:800; font-size:0.7rem; padding:2px 6px; border-radius:10px; font-family:'Inter',sans-serif; white-space:nowrap;"></span>
                            </div>

                            <!-- Divisor Vertical -->
                            <div style="width:1px; height:20px; background:#e2e8f0; margin:0 4px;"></div>

                            <!-- Manutenção e Dias -->
                            <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
                                <i class="ph ph-wrench" style="color:#7048e8; font-size:0.9rem;"></i>
                                <select id="prop-qtd-manutencoes" onchange="window.classificarRegiaoEDias()" style="border:1px solid #cbd5e1; border-radius:4px; padding:2px; font-size:0.72rem; color:#475569; font-weight:700; background:#fff; cursor:pointer; font-family:'Inter',sans-serif; outline:none; margin-right:4px;">
                                    <option value="1">1 Manut./Semana</option>
                                    <option value="2">2 Manut./Semana</option>
                                    <option value="3">3 Manut./Semana</option>
                                </select>
                                <div style="display:flex; gap:0.4rem; align-items:center; flex-wrap:wrap; font-size:0.75rem; color:#475569; font-weight:600; font-family:'Inter',sans-serif;">
                                    <label style="display:inline-flex; align-items:center; gap:2px; cursor:pointer;"><input type="checkbox" id="chk-dia-seg" value="Segunda" style="cursor:pointer;" onchange="window.atualizarDiasManutencaoObs()"> Seg</label>
                                    <label style="display:inline-flex; align-items:center; gap:2px; cursor:pointer;"><input type="checkbox" id="chk-dia-ter" value="Terça" style="cursor:pointer;" onchange="window.atualizarDiasManutencaoObs()"> Ter</label>
                                    <label style="display:inline-flex; align-items:center; gap:2px; cursor:pointer;"><input type="checkbox" id="chk-dia-qua" value="Quarta" style="cursor:pointer;" onchange="window.atualizarDiasManutencaoObs()"> Qua</label>
                                    <label style="display:inline-flex; align-items:center; gap:2px; cursor:pointer;"><input type="checkbox" id="chk-dia-qui" value="Quinta" style="cursor:pointer;" onchange="window.atualizarDiasManutencaoObs()"> Qui</label>
                                    <label style="display:inline-flex; align-items:center; gap:2px; cursor:pointer;"><input type="checkbox" id="chk-dia-sex" value="Sexta" style="cursor:pointer;" onchange="window.atualizarDiasManutencaoObs()"> Sex</label>
                                    <label style="display:inline-flex; align-items:center; gap:2px; cursor:pointer;"><input type="checkbox" id="chk-dia-sab" value="Sábado" style="cursor:pointer;" onchange="window.atualizarDiasManutencaoObs()"> Sáb</label>
                                    <label style="display:inline-flex; align-items:center; gap:2px; cursor:pointer;"><input type="checkbox" id="chk-dia-dom" value="Domingo" style="cursor:pointer;" onchange="window.atualizarDiasManutencaoObs()"> Dom</label>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Seção: Produtos da Proposta -->
                    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:9px; padding:0.6rem 0.9rem; margin-bottom:0.6rem;">
                        <h4 style="margin:0 0 0.4rem; font-size:0.8rem; color:#475569; font-weight:700; display:flex; align-items:center; gap:6px;">
                            <i class="ph ph-package" style="color:#7048e8;"></i> Produtos da Proposta
                        </h4>
                        
                        <!-- Inputs para adicionar produto -->
                        <div style="display:grid; grid-template-columns:1.5fr 3fr 1fr auto; gap:0.5rem 0.75rem; align-items:flex-end; margin-bottom:0.6rem;">
                            <div>
                                <label class="prop-lbl">Código do Produto</label>
                                <div style="display:flex; gap:0.25rem; align-items:center;">
                                    <input type="text" id="prop-prod-codigo" placeholder="Código" style="width:100%; padding:0.55rem; border:1px solid #cbd5e1; border-radius:6px; font-size:0.85rem; box-sizing:border-box; height:28px;">
                                    <button type="button" onclick="window.abrirModalBuscaProdutos()" style="background:#f1f5f9; border:1px solid #cbd5e1; border-radius:4px; width:28px; height:28px; display:inline-flex; align-items:center; justify-content:center; cursor:pointer; color:#475569; transition:all 0.2s;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'" title="Pesquisar Produto">
                                        <i class="ph ph-magnifying-glass" style="font-size:0.95rem; font-weight:700;"></i>
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label class="prop-lbl">Descrição</label>
                                <input type="text" id="prop-prod-descricao" placeholder="Descrição do produto..." style="width:100%; padding:0.55rem; border:1px solid #cbd5e1; border-radius:6px; font-size:0.85rem; box-sizing:border-box; height:28px;">
                            </div>
                            <div>
                                <label class="prop-lbl">Quantidade</label>
                                <input type="number" id="prop-prod-quantidade" value="1" min="1" style="width:100%; padding:0.55rem; border:1px solid #cbd5e1; border-radius:6px; font-size:0.85rem; box-sizing:border-box; height:28px;">
                            </div>
                            <div>
                                <button type="button" onclick="window.adicionarProdutoProposta()" style="background:#7048e8; color:#fff; border:none; border-radius:4px; padding:0 1.2rem; height:28px; font-size:0.76rem; font-weight:700; cursor:pointer; transition:all 0.2s; display:inline-flex; align-items:center; justify-content:center; gap:4px;" onmouseover="this.style.background='#5f3dc4'" onmouseout="this.style.background='#7048e8'">
                                    <i class="ph ph-plus-circle" style="font-size:0.95rem;"></i> Adicionar
                                </button>
                            </div>
                        </div>

                        <!-- GridView com produtos adicionados -->
                        <div style="border:1px solid #e2e8f0; border-radius:8px; background:#fff; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.02);">
                            <table style="width:100%; border-collapse:collapse; font-size:0.82rem; text-align:left;">
                                <thead>
                                    <tr style="background:#f8fafc; border-bottom:2px solid #cbd5e1; color:#475569; font-size:0.72rem; text-transform:uppercase; letter-spacing:0.03em;">
                                        <th style="padding:10px 12px; font-weight:700; width:120px; text-align:center;">Código</th>
                                        <th style="padding:10px 12px; font-weight:700;">Descrição</th>
                                        <th style="padding:10px 12px; font-weight:700; width:100px; text-align:center;">Quantidade</th>
                                        <th style="padding:10px 12px; font-weight:700; width:80px; text-align:center;">Ações</th>
                                    </tr>
                                </thead>
                                <tbody id="prop-produtos-tbody">
                                    <tr>
                                        <td colspan="4" style="text-align:center; color:#94a3b8; padding:1.5rem; font-size:0.85rem; font-style:italic;">Nenhum produto adicionado à proposta.</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Seção: Adicionais de Logística (Zona & KM) -->
                    <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:9px; padding:0.6rem 0.9rem; margin-bottom:0.6rem;">
                        <h4 style="margin:0 0 0.4rem; font-size:0.8rem; color:#166534; font-weight:700; display:flex; align-items:center; gap:6px;">
                            <i class="ph ph-map-trifold" style="color:#16a34a;"></i> Adicionais de Logística (Zona & KM)
                        </h4>
                        <div style="display:grid; grid-template-columns:1fr 1fr 1fr 1fr 1fr; gap:0.5rem 0.75rem;">
                            <div>
                                <label class="prop-lbl">Percentual Zona (%)</label>
                                <input type="number" id="prop-percentual-zona" value="${vn('percentual_zona','0')}" min="0" max="100" step="0.1"
                                    oninput="window.calcularValorTotalProposta()"
                                    style="width:100%;padding:0.55rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;box-sizing:border-box;">
                            </div>
                            <div>
                                <label class="prop-lbl">Acréscimo Zona (R$)</label>
                                <input type="text" id="prop-valor-zona-calculado" value="R$ 0,00" readonly
                                    style="width:100%;padding:0.55rem;border:1px solid #e2e8f0;border-radius:6px;background:#f8fafc;color:#64748b;font-size:0.85rem;box-sizing:border-box;font-weight:600;">
                            </div>
                            <div>
                                <label class="prop-lbl">Valor por KM (R$)</label>
                                <input type="number" id="prop-valor-km" value="${vn('valor_km','0')}" min="0" step="0.01"
                                    oninput="window.calcularValorTotalProposta()"
                                    style="width:100%;padding:0.55rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;box-sizing:border-box;">
                            </div>
                            <div>
                                <label class="prop-lbl">Distância (KM)</label>
                                <input type="text" id="prop-distancia-km" value="0.00 km" readonly
                                    style="width:100%;padding:0.55rem;border:1px solid #e2e8f0;border-radius:6px;background:#f8fafc;color:#64748b;font-size:0.85rem;box-sizing:border-box;font-weight:600;">
                            </div>
                            <div>
                                <label class="prop-lbl">Acréscimo KM (R$)</label>
                                <input type="text" id="prop-valor-distancia-calculado" value="R$ 0,00" readonly
                                    style="width:100%;padding:0.55rem;border:1px solid #e2e8f0;border-radius:6px;background:#f8fafc;color:#64748b;font-size:0.85rem;box-sizing:border-box;font-weight:600;">
                            </div>
                        </div>
                    </div>

                    <!-- Seção: Representante, Frete e Valor -->
                    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:9px; padding:0.6rem 0.9rem; margin-bottom:0.6rem;">
                        <h4 style="margin:0 0 0.4rem; font-size:0.8rem; color:#475569; font-weight:700; display:flex; align-items:center; gap:6px;">
                            <i class="ph ph-user-check" style="color:#7048e8;"></i> Representante e Dados do Pedido
                        </h4>
                        <div style="display:grid; grid-template-columns:1fr 1fr 1fr 1fr 1fr 1fr; gap:0.5rem 0.75rem;">
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
                                    oninput="window.calcularValorTotalProposta()"
                                    style="width:100%;padding:0.55rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;box-sizing:border-box;">
                            </div>
                            <div>
                                <label class="prop-lbl">Frete Volta (R$)</label>
                                <input type="number" id="prop-frete-volta" value="${vn('valor_frete_volta','0')}" min="0" step="0.01"
                                    oninput="window.calcularValorTotalProposta()"
                                    style="width:100%;padding:0.55rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;box-sizing:border-box;">
                            </div>
                        </div>
                        <div style="margin-top:0.6rem; display:grid; grid-template-columns:1fr 1fr; gap:0.5rem 0.75rem;">
                            <div>
                                <label class="prop-lbl">Valor Total (R$)</label>
                                <input type="number" id="prop-valor-total" value="${vn('valor_total','0')}" min="0" step="0.01"
                                    style="width:100%;padding:0.35rem 0.65rem;border:2px solid #7048e8;border-radius:6px;font-size:0.88rem;font-weight:700;color:#4c1d95;box-sizing:border-box;height:30px;">
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
    
    if (typeof window.renderizarProdutosPropostaGrid === 'function') {
        window.renderizarProdutosPropostaGrid();
    }

    // Filter services based on loaded proposal's table pricing
    const initialTabela = prop && prop.tabela_precos ? prop.tabela_precos : '';
    const initialServicoId = prop && prop.servico_precificacao_id ? prop.servico_precificacao_id : null;
    if (typeof window._filtrarServicosPrecificadosPorTabela === 'function') {
        window._filtrarServicosPrecificadosPorTabela(initialTabela, initialServicoId);
    }
    
    // Auto-trigger region classification if address is already pre-filled
    if (typeof window.classificarRegiaoEDias === 'function') {
        window.classificarRegiaoEDias();
    }

    if (typeof window.calcularValorTotalProposta === 'function') {
        window.calcularValorTotalProposta();
    }
}

window.toggleMotivoReprovacao = function(fase) {
    const wrapper = document.getElementById('wrapper-motivo-reprovacao');
    if (wrapper) {
        const isReprovada = (fase === 'Reprovada');
        const isCancelada = (fase === 'Cancelada');
        wrapper.style.display = (isReprovada || isCancelada) ? 'block' : 'none';
        
        const label = wrapper.querySelector('.prop-lbl');
        if (label) {
            if (isReprovada) {
                label.textContent = 'Motivo de Reprovação *';
            } else if (isCancelada) {
                label.textContent = 'Motivo de Cancelamento *';
            }
        }
        
        if (!isReprovada && !isCancelada) {
            const select = document.getElementById('prop-motivo-reprovacao');
            if (select) select.value = '';
        }
    }
};

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
let _redirectAfterContactSaveToClient = false;

window.selecionarContatoParaCliente = async function(contatoJsonStr) {
    const c = JSON.parse(decodeURIComponent(contatoJsonStr));
    
    // Check if already in _clienteContatos
    const exists = _clienteContatos.some(exist => 
        exist.nome === c.nome || 
        (exist.identificacao && exist.identificacao == c.codigo)
    );
    
    if (exists) {
        Swal.fire({
            title: 'Aviso',
            text: 'Este contato já está na lista deste cliente.',
            icon: 'info',
            confirmButtonColor: '#3b82f6',
            confirmButtonText: 'Ok'
        });
        return;
    }

    const mapped = {
        id: c.id,
        identificacao: c.codigo || '',
        nome: c.nome || '',
        departamento: c.departamento || '',
        celular: c.celular || '',
        telefone_ramal: c.telefone ? (c.ramal ? `${c.telefone} Ramal ${c.ramal}` : c.telefone) : '',
        email: c.email || '',
        dono: c.representante || '',
        cargo: c.cargo || '',
        situacao: c.inativo === 1 ? 'Inativo' : 'Ativo',
        nfe: c.email_nfe === 1 ? 'Sim' : 'Não',
        cobranca: c.email_cobranca === 1 ? 'Sim' : 'Não',
        os: c.email_os === 1 ? 'Sim' : 'Não',
        contrato: c.email_contrato === 1 ? 'Sim' : 'Não',
        origem: c.origem || '',
        inativo: c.inativo === 1 ? 'Sim' : 'Não'
    };

    _clienteContatos.push(mapped);
    _renderTabelaContatos();

    // If client is already saved, link in database too
    if (_clienteEditandoId) {
        try {
            const payload = {
                id: c.id,
                codigo: c.codigo,
                nome: c.nome,
                tipo: c.tipo || '',
                representante: c.representante || '',
                departamento: c.departamento || '',
                cargo: c.cargo || '',
                origem: c.origem || '',
                influenciador: c.influenciador || '',
                classificacao: c.classificacao || '',
                data_nascimento: c.data_nascimento || '',
                ramo_atividade: c.ramo_atividade || '',
                regiao: c.regiao || '',
                sexo: c.sexo || '',
                celular: c.celular || '',
                telefone: c.telefone || '',
                ramal: c.ramal || '',
                nextel: c.nextel || '',
                email: c.email || '',
                outra_comunicacao: c.outra_comunicacao || '',
                inativo: c.inativo || 0,
                email_cobranca: c.email_cobranca || 0,
                email_nfe: c.email_nfe || 0,
                email_os: c.email_os || 0,
                email_contrato: c.email_contrato || 0,
                empresa_cliente: {
                    id: _clienteEditandoId,
                    cpf_cnpj: document.getElementById('cli-cpf-cnpj').value,
                    nome_razao_social: document.getElementById('cli-razao-social').value
                }
            };
            await apiPut(`/contatos/${c.id}`, payload);
        } catch (err) {
            console.error('Erro ao atualizar cliente_id do contato:', err);
        }
    }

    Swal.close();
    if (typeof mostrarToastSucesso === 'function') {
        mostrarToastSucesso('Contato adicionado ao cliente com sucesso!');
    }
};

window.editarContatoDeCliente = async function(id) {
    if (!id) return;
    window.limparFormContato();
    _redirectAfterContactSaveToClient = true;
    window.switchPropostaTab('cadastro-contatos');
    await window.carregarContatoParaEdicao(id);
};

window.pesquisarClienteProposta = async function() {
    const query = document.getElementById('prop-cliente')?.value.trim() || '';

    try {
        // Show loading indicator
        Swal.fire({
            title: 'Carregando clientes...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        // Fetch all clients
        const clientes = await apiGet('/clientes') || [];
        Swal.close();

        // If no clients exist at all
        if (clientes.length === 0) {
            const confirmCad = await Swal.fire({
                title: 'Nenhum cliente cadastrado',
                text: 'Não há cadastro para o cliente. Deseja realizar o cadastro?',
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Sim',
                cancelButtonText: 'Não',
                confirmButtonColor: '#16a34a',
                cancelButtonColor: '#64748b'
            });
            if (confirmCad.isConfirmed) {
                window.abrirModalCadastroCliente(null, query);
            }
            return;
        }

        // If there's a search term, let's pre-check if there are any matches
        if (query) {
            const queryClean = query.replace(/\D/g, '');
            const initialMatches = clientes.filter(c => {
                const matchNome = c.nome_razao_social && c.nome_razao_social.toLowerCase().includes(query.toLowerCase());
                const matchCodigo = c.codigo && c.codigo.toString() === query;
                const matchCnpjRaw = c.cpf_cnpj && c.cpf_cnpj.toLowerCase().includes(query.toLowerCase());
                const matchCnpjClean = c.cpf_cnpj && queryClean && c.cpf_cnpj.replace(/\D/g, '').includes(queryClean);
                return matchNome || matchCodigo || matchCnpjRaw || matchCnpjClean;
            });

            // If no match found for the typed text
            if (initialMatches.length === 0) {
                const confirmCad = await Swal.fire({
                    title: 'Cliente não encontrado',
                    text: 'Não há cadastro para o cliente. Deseja realizar o cadastro?',
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonText: 'Sim',
                    cancelButtonText: 'Não',
                    confirmButtonColor: '#16a34a',
                    cancelButtonColor: '#64748b'
                });
                if (confirmCad.isConfirmed) {
                    window.abrirModalCadastroCliente(null, query);
                }
                return;
            }
        }

        // Render the search modal
        window._tempClientesParaPesquisa = clientes;

        Swal.fire({
            title: 'Pesquisa de Clientes',
            width: '800px',
            html: `
                <div style="text-align:left; font-family:'Inter', sans-serif;">
                    <!-- Filtros -->
                    <div style="display:grid; grid-template-columns: 1fr 1.5fr 2fr; gap:0.5rem; margin-bottom:1rem;">
                        <div>
                            <label style="font-size:0.7rem; font-weight:bold; color:#475569; text-transform:uppercase; display:block; margin-bottom:2px;">Código</label>
                            <input type="text" id="filtro-cli-codigo" oninput="window.filtrarClientesGrid()" placeholder="Filtrar por código" style="width:100%; padding:0.45rem; border:1px solid #cbd5e1; border-radius:4px; font-size:0.8rem; box-sizing:border-box;">
                        </div>
                        <div>
                            <label style="font-size:0.7rem; font-weight:bold; color:#475569; text-transform:uppercase; display:block; margin-bottom:2px;">CNPJ / CPF</label>
                            <input type="text" id="filtro-cli-cnpj" oninput="window.filtrarClientesGrid()" placeholder="Filtrar por CNPJ/CPF" style="width:100%; padding:0.45rem; border:1px solid #cbd5e1; border-radius:4px; font-size:0.8rem; box-sizing:border-box;">
                        </div>
                        <div>
                            <label style="font-size:0.7rem; font-weight:bold; color:#475569; text-transform:uppercase; display:block; margin-bottom:2px;">Razão Social / Nome</label>
                            <input type="text" id="filtro-cli-razao" oninput="window.filtrarClientesGrid()" placeholder="Filtrar por Razão Social" style="width:100%; padding:0.45rem; border:1px solid #cbd5e1; border-radius:4px; font-size:0.8rem; box-sizing:border-box;">
                        </div>
                    </div>

                    <!-- Tabela Gridview -->
                    <div style="max-height:350px; overflow-y:auto; border:1px solid #cbd5e1; border-radius:6px; background:#fff;">
                        <table style="width:100%; border-collapse:collapse; font-size:0.8rem; text-align:left;">
                            <thead>
                                <tr style="background:#f8fafc; border-bottom:2px solid #cbd5e1; color:#475569; position:sticky; top:0; z-index:1;">
                                    <th style="padding:0.6rem; width:80px;">Código</th>
                                    <th style="padding:0.6rem;">Razão Social / Nome</th>
                                    <th style="padding:0.6rem; width:150px;">CNPJ / CPF</th>
                                    <th style="padding:0.6rem; width:100px;">Cidade/UF</th>
                                </tr>
                            </thead>
                            <tbody id="grid-clientes-body">
                                <!-- Dynamic rows -->
                            </tbody>
                        </table>
                    </div>
                </div>
            `,
            showConfirmButton: false,
            showCancelButton: true,
            cancelButtonText: 'Fechar',
            cancelButtonColor: '#64748b',
            didOpen: () => {
                const filtroRazao = document.getElementById('filtro-cli-razao');
                const filtroCnpj = document.getElementById('filtro-cli-cnpj');
                const filtroCodigo = document.getElementById('filtro-cli-codigo');

                if (query) {
                    if (/^\d+$/.test(query)) {
                        if (filtroCodigo) filtroCodigo.value = query;
                    } else if (query.replace(/\D/g, '').length >= 11) {
                        if (filtroCnpj) filtroCnpj.value = query;
                    } else {
                        if (filtroRazao) filtroRazao.value = query;
                    }
                }
                window.filtrarClientesGrid();
            }
        });

    } catch (err) {
        console.error(err);
        Swal.fire('Erro', 'Não foi possível carregar os clientes: ' + err.message, 'error');
    }
};

window.filtrarClientesGrid = function() {
    const codVal = document.getElementById('filtro-cli-codigo')?.value.trim().toLowerCase() || '';
    const cnpjVal = document.getElementById('filtro-cli-cnpj')?.value.trim().toLowerCase() || '';
    const razaoVal = document.getElementById('filtro-cli-razao')?.value.trim().toLowerCase() || '';

    const cleanCnpjVal = cnpjVal.replace(/\D/g, '');

    const filtered = (window._tempClientesParaPesquisa || []).filter(c => {
        if (codVal) {
            const codeStr = String(c.codigo || '').toLowerCase();
            if (!codeStr.includes(codVal)) return false;
        }
        if (cnpjVal) {
            const cnpjStr = String(c.cpf_cnpj || '').toLowerCase();
            const cleanCnpjStr = cnpjStr.replace(/\D/g, '');
            if (!cnpjStr.includes(cnpjVal) && !cleanCnpjStr.includes(cleanCnpjVal)) return false;
        }
        if (razaoVal) {
            const nameStr = String(c.nome_razao_social || '').toLowerCase();
            const fantStr = String(c.nome_fantasia || '').toLowerCase();
            if (!nameStr.includes(razaoVal) && !fantStr.includes(razaoVal)) return false;
        }
        return true;
    });

    const tbody = document.getElementById('grid-clientes-body');
    if (!tbody) return;

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" style="padding:2rem; text-align:center; color:#64748b;">
                    <div style="font-weight:600; margin-bottom:0.5rem;">Nenhum cliente correspondente aos filtros.</div>
                    <button type="button" onclick="window.confirmarCriarNovoClienteFiltro()" style="background:#16a34a; color:#fff; border:none; padding:0.4rem 0.8rem; border-radius:4px; font-weight:600; cursor:pointer; font-size:0.75rem;">
                        <i class="ph ph-plus-circle"></i> Cadastrar Novo Cliente?
                    </button>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = filtered.map(c => `
        <tr onclick="window.selecionarClienteGrid('${c.nome_razao_social.replace(/'/g, "\\'")}')" style="cursor:pointer; border-bottom:1px solid #e2e8f0;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background=''">
            <td style="padding:0.55rem; font-weight:bold; color:#7048e8;">${c.codigo}</td>
            <td style="padding:0.55rem; font-weight:600; color:#1e293b;">${c.nome_razao_social}</td>
            <td style="padding:0.55rem; color:#475569;">${c.cpf_cnpj || '—'}</td>
            <td style="padding:0.55rem; color:#475569;">${c.cidade || '—'}/${c.uf || '—'}</td>
        </tr>
    `).join('');
};

window.selecionarClienteGrid = function(razaoSocial) {
    const input = document.getElementById('prop-cliente');
    if (input) {
        input.value = razaoSocial;
        input.dispatchEvent(new Event('input'));
        input.dispatchEvent(new Event('change'));
    }
    Swal.close();
};

window.confirmarCriarNovoClienteFiltro = async function() {
    Swal.close();
    setTimeout(async () => {
        const query = document.getElementById('prop-cliente')?.value.trim() || '';
        const confirmCad = await Swal.fire({
            title: 'Cliente não encontrado',
            text: 'Não há cadastro para o cliente. Deseja realizar o cadastro?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sim',
            cancelButtonText: 'Não',
            confirmButtonColor: '#16a34a',
            cancelButtonColor: '#64748b'
        });
        if (confirmCad.isConfirmed) {
            window.abrirModalCadastroCliente(null, query);
        }
    }, 300);
};

window.abrirModalCadastroCliente = async function(clientId = null, prefilledName = '') {
    let client = null;
    let _modalClienteEditandoId = clientId;

    if (_modalClienteEditandoId) {
        try {
            client = await apiGet(`/clientes/${_modalClienteEditandoId}`);
        } catch (err) {
            console.error(err);
            Swal.fire('Erro', 'Não foi possível carregar dados do cliente.', 'error');
            return;
        }
    }

    const hoje = new Date().toISOString().split('T')[0];
    const dataCadastro = client ? (client.data_cadastro || hoje) : hoje;
    const inativoChecked = client ? (client.inativo === 1 ? 'checked' : '') : '';
    const ufSelect = (selectedUf) => {
        const ufs = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
        return ufs.map(uf => `<option value="${uf}" ${selectedUf === uf ? 'selected' : ''}>dots ${uf}</option>`).join('').replace(/\.\.\. /g, '');
    };

    const enquadramentoOptions = (selectedVal) => {
        const options = ['Simples Nacional', 'Lucro Presumido', 'Lucro Real'];
        return options.map(opt => `<option value="${opt}" ${selectedVal === opt ? 'selected' : ''}>${opt}</option>`).join('');
    };

    const grupoOptions = (selectedVal) => {
        const options = ['1 - Diamante', '2 - Ouro', '3 - Prata', '4 - Bronze'];
        return options.map(opt => `<option value="${opt}" ${selectedVal === opt ? 'selected' : ''}>${opt}</option>`).join('');
    };

    let parametros = { limite: false, retencao: false };
    if (client && client.parametros) {
        try {
            parametros = JSON.parse(client.parametros);
        } catch (e) {
            console.error(e);
        }
    }

    let fiscal = { enquadramento: 'Simples Nacional', regime_iss: '', cnae: '' };
    if (client && client.fiscal) {
        try {
            fiscal = JSON.parse(client.fiscal);
        } catch (e) {
            console.error(e);
        }
    }

    window._modalClienteContatos = [];
    if (client && client.contatos) {
        try {
            window._modalClienteContatos = JSON.parse(client.contatos || '[]');
        } catch (e) {
            console.error(e);
        }
    }

    Swal.fire({
        title: '',
        width: '1700px',
        customClass: {
            popup: 'custom-swal-client-modal'
        },
        showConfirmButton: false,
        html: `
            <style>
                .mcli-container {
                    background: #fff;
                    width: 100%;
                    text-align: left;
                    font-family: 'Inter', sans-serif;
                }
                .mcli-toolbar {
                    background: #f8fafc;
                    border-bottom: 1px solid #e2e8f0;
                    padding: 0.4rem 0.8rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 0.4rem;
                    position: sticky;
                    top: 0;
                    z-index: 997;
                    border-top-left-radius: 12px;
                    border-top-right-radius: 12px;
                }
                .mcli-form-body {
                    padding: 0.8rem 1.0rem;
                    max-height: 420px;
                    overflow-y: auto;
                }
                .mcli-section-title {
                    font-size: 0.8rem !important;
                    font-weight: 800 !important;
                    color: #475569 !important;
                    text-transform: uppercase !important;
                    letter-spacing: 0.04em !important;
                    border-bottom: 2px solid #e2e8f0 !important;
                    padding-bottom: 0.25rem !important;
                    margin: 0.8rem 0 0.5rem 0 !important;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                .mcli-section-title.first {
                    margin-top: 0 !important;
                }
                .mcli-grid {
                    display: grid;
                    gap: 0.4rem 0.6rem;
                }
                .mcli-field {
                    display: flex;
                    flex-direction: column;
                    gap: 0.2rem;
                }
                .mcli-field label {
                    font-size: 0.7rem !important;
                    font-weight: 700 !important;
                    color: #64748b !important;
                    text-transform: uppercase !important;
                    letter-spacing: 0.02em !important;
                    margin-bottom: 2px !important;
                }
                .mcli-input, .mcli-select {
                    padding: 0.15rem 0.45rem !important;
                    border: 1px solid #cbd5e1 !important;
                    border-radius: 4px !important;
                    font-size: 0.76rem !important;
                    background: #fff !important;
                    color: #1e293b !important;
                    outline: none !important;
                    transition: all 0.2s !important;
                    box-sizing: border-box !important;
                    width: 100% !important;
                    height: 28px !important;
                    font-family: 'Inter', sans-serif !important;
                }
                .mcli-input:focus, .mcli-select:focus {
                    border-color: #3b82f6 !important;
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15) !important;
                }
                .mcli-input[readonly] {
                    background: #f1f5f9 !important;
                    color: #64748b !important;
                    cursor: not-allowed !important;
                }
                .mcli-input-group {
                    display: flex;
                    gap: 0.35rem;
                    width: 100%;
                }
                .mcli-btn-addon {
                    background: #16a34a;
                    color: #fff;
                    border: none;
                    padding: 0.2rem 0.5rem;
                    border-radius: 4px;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 600;
                    font-size: 0.76rem;
                    transition: all 0.2s;
                    height: 28px;
                    box-sizing: border-box;
                }
                .mcli-btn-addon:hover {
                    background: #15803d;
                }
                .mcli-btn-addon.secondary {
                    background: #475569;
                }
                .mcli-btn-addon.secondary:hover {
                    background: #334155;
                }
            </style>
            <div class="mcli-container">
                <!-- Toolbar/Header -->
                <div class="mcli-toolbar">
                    <!-- Título do Modal à esquerda -->
                    <div style="font-size:0.95rem; font-weight:800; color:#1e293b; display:flex; align-items:center; gap:6px; font-family:'Inter', sans-serif;">
                        <i class="ph ph-user-plus" style="color:#7048e8; font-size:1.2rem;"></i>
                        <span>${_modalClienteEditandoId ? 'Editar Cliente' : 'Cadastrar Novo Cliente'}</span>
                    </div>

                    <div style="display:flex; gap:0.4rem; align-items:center;">
                        <button onclick="window.modalRecarregarCliente(${_modalClienteEditandoId || 'null'})" title="Recarregar" style="background:#e2e8f0; color:#475569; border:none; width:34px; height:34px; border-radius:6px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; transition:all 0.15s; outline:none; box-sizing:border-box;" onmouseover="this.style.background='#cbd5e1'" onmouseout="this.style.background='#e2e8f0'">
                            <i class="ph ph-arrows-clockwise" style="font-size:1.15rem;"></i>
                        </button>
                        <div style="width: 4px;"></div>
                        <button onclick="window.modalSalvarCliente(${_modalClienteEditandoId || 'null'})" style="background:#16a34a; color:white; border:none; padding:0.45rem 1rem; border-radius:6px; cursor:pointer; font-weight:600; font-size:0.82rem; display:inline-flex; align-items:center; gap:5px; height:34px; transition:background 0.15s;" onmouseover="this.style.background='#15803d'" onmouseout="this.style.background='#16a34a'">
                            <i class="ph ph-check" style="font-size:1rem;"></i> Salvar
                        </button>
                        <button onclick="window.modalExcluirCliente(${_modalClienteEditandoId || 'null'})" style="background:#dc2626; color:white; border:none; padding:0.45rem 1rem; border-radius:6px; cursor:pointer; font-weight:600; font-size:0.82rem; display:inline-flex; align-items:center; gap:5px; height:34px; transition:background 0.15s;" onmouseover="this.style.background='#b91c1c'" onmouseout="this.style.background='#dc2626'">
                            <i class="ph ph-trash" style="font-size:1rem;"></i> Excluir
                        </button>
                        <button onclick="window.modalVerificarCliente()" style="background:#64748b; color:white; border:none; padding:0.45rem 1rem; border-radius:6px; cursor:pointer; font-weight:600; font-size:0.82rem; display:inline-flex; align-items:center; gap:5px; height:34px; transition:background 0.15s;" onmouseover="this.style.background='#475569'" onmouseout="this.style.background='#64748b'">
                            <i class="ph ph-shield-check" style="font-size:1rem;"></i> Verificar
                        </button>
                        <div style="width: 4px;"></div>
                        <button onclick="Swal.close()" title="Fechar" style="background:#475569; color:white; border:none; width:34px; height:34px; border-radius:6px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; transition:background 0.15s; box-sizing:border-box;" onmouseover="this.style.background='#334155'" onmouseout="this.style.background='#475569'">
                            <i class="ph ph-x" style="font-size:1.15rem;"></i>
                        </button>
                    </div>
                </div>

                <!-- Form Body -->
                <div class="mcli-form-body">
                    <!-- Info bar -->
                    <div style="display:flex; justify-content:space-between; align-items:center; background:#f0f7ff; border:1px solid #c2e0ff; padding:0.6rem 1.2rem; border-radius:6px; margin-bottom:1rem; font-size:0.85rem; color:#1e40af; flex-wrap:wrap; gap:0.5rem;">
                        <div style="font-weight:600; display:flex; align-items:center; gap:6px;">
                            <i class="ph ph-info" style="font-size:1.1rem;"></i>
                            Pesquise pelo CNPJ para completar o cadastro.
                        </div>
                        <label style="display:flex; align-items:center; gap:5px; cursor:pointer; font-weight:600; color:#1e293b; text-transform:uppercase; font-size:0.75rem; margin:0;">
                            <input type="checkbox" id="modal-cli-inativo" ${inativoChecked} style="accent-color:#3b82f6;"> Inativo?
                        </label>
                    </div>

                    <!-- Main Grid: Campos -->
                    <div style="margin-bottom:0.85rem; display:grid; gap:0.85rem;">
                        <!-- Linha 1: Código, Data Cadastro, CPF/CNPJ, IE -->
                        <div style="display:grid; grid-template-columns:1.2fr 1fr 1.5fr 1.5fr; gap:0.75rem;">
                            <div class="mcli-field">
                                <label>Código</label>
                                <div style="display:flex; gap:3px;">
                                    <input type="text" id="modal-cli-codigo" readonly value="${client ? (client.codigo || '') : ''}" placeholder="Auto" class="mcli-input">
                                    <button type="button" onclick="window.modalAbrirPesquisaCliente()" title="Buscar Cliente" class="mcli-btn-addon" style="background:#16a34a;"><i class="ph ph-magnifying-glass"></i></button>
                                    <button type="button" onclick="window.modalLimparFormCliente()" title="Limpar/Novo" class="mcli-btn-addon" style="background:#475569;"><i class="ph ph-arrows-counter-clockwise"></i></button>
                                </div>
                            </div>
                            <div class="mcli-field">
                                <label>Data de Cadastro</label>
                                <input type="date" id="modal-cli-data-cadastro" value="${dataCadastro}" class="mcli-input">
                            </div>
                            <div class="mcli-field">
                                <label>CPF / CNPJ *</label>
                                <div class="mcli-input-group">
                                    <input type="text" id="modal-cli-cpf-cnpj" value="${client ? (client.cpf_cnpj || '') : ''}" placeholder="Apenas números" class="mcli-input">
                                    <button type="button" onclick="window.modalBuscarCNPJ()" id="modal-btn-busca-cnpj" class="mcli-btn-addon" title="Buscar CNPJ">
                                        <i class="ph ph-magnifying-glass"></i>
                                    </button>
                                </div>
                            </div>
                            <div class="mcli-field">
                                <label>Inscrição Estadual</label>
                                <input type="text" id="modal-cli-ie" value="${client ? (client.inscricao_estadual || '') : ''}" placeholder="ISENTO" class="mcli-input">
                            </div>
                        </div>

                        <!-- Linha 2: IM, Grupo, Centralizador -->
                        <div style="display:grid; grid-template-columns:1.2fr 1.5fr 2.3fr; gap:0.75rem;">
                            <div class="mcli-field">
                                <label>Inscrição Municipal</label>
                                <input type="text" id="modal-cli-im" value="${client ? (client.inscricao_municipal || '') : ''}" class="mcli-input">
                            </div>
                            <div class="mcli-field">
                                <label>Grupo de Clientes</label>
                                <select id="modal-cli-grupo" class="mcli-select">
                                    <option value="">-- Selecione --</option>
                                    ${grupoOptions(client ? client.grupo_clientes : '')}
                                </select>
                            </div>
                            <div class="mcli-field">
                                <label>Cliente Centralizador</label>
                                <select id="modal-cli-centralizador" class="mcli-select">
                                    <option value="">-- Selecione --</option>
                                </select>
                            </div>
                        </div>

                        <!-- Linha 3: Razão Social -->
                        <div class="mcli-field">
                            <label>Nome / Razão Social *</label>
                            <input type="text" id="modal-cli-razao-social" value="${client ? (client.nome_razao_social || '') : prefilledName}" class="mcli-input">
                        </div>

                        <!-- Linha 4: Nome Fantasia -->
                        <div class="mcli-field">
                            <label>Nome Fantasia</label>
                            <input type="text" id="modal-cli-nome-fantasia" value="${client ? (client.nome_fantasia || '') : ''}" class="mcli-input">
                        </div>
                    </div>

                    <!-- Linha 5 CEP, Endereço, Número, Complemento -->
                    <div style="display:grid; grid-template-columns:1.2fr 3fr 1fr 1.5fr; gap:0.75rem; margin-top:0.85rem;">
                        <div class="mcli-field">
                            <label>CEP</label>
                            <div class="mcli-input-group">
                                <input type="text" id="modal-cli-cep" value="${client ? (client.cep || '') : ''}" placeholder="00000-000" class="mcli-input">
                                <button type="button" onclick="window.modalBuscarCEP()" class="mcli-btn-addon" title="Buscar CEP">
                                    <i class="ph ph-magnifying-glass"></i>
                                </button>
                            </div>
                        </div>
                        <div class="mcli-field">
                            <label>Endereço</label>
                            <input type="text" id="modal-cli-endereco" value="${client ? (client.endereco || '') : ''}" class="mcli-input">
                        </div>
                        <div class="mcli-field">
                            <label>Número</label>
                            <input type="text" id="modal-cli-numero" value="${client ? (client.numero || '') : ''}" class="mcli-input">
                        </div>
                        <div class="mcli-field">
                            <label>Complemento</label>
                            <input type="text" id="modal-cli-complemento" value="${client ? (client.complemento || '') : ''}" class="mcli-input">
                        </div>
                    </div>

                    <!-- Linha 6 Bairro, UF, Município, País -->
                    <div style="display:grid; grid-template-columns:2fr 1fr 2fr 1fr; gap:0.75rem; margin-top:0.85rem;">
                        <div class="mcli-field">
                            <label>Bairro</label>
                            <input type="text" id="modal-cli-bairro" value="${client ? (client.bairro || '') : ''}" class="mcli-input">
                        </div>
                        <div class="mcli-field">
                            <label>UF</label>
                            <select id="modal-cli-uf" class="mcli-select">
                                <option value="">--</option>
                                ${ufSelect(client ? client.uf : '')}
                            </select>
                        </div>
                        <div class="mcli-field">
                            <label>Município</label>
                            <input type="text" id="modal-cli-municipio" value="${client ? (client.municipio || '') : ''}" class="mcli-input">
                        </div>
                        <div class="mcli-field">
                            <label>País</label>
                            <input type="text" id="modal-cli-pais" value="${client ? (client.pais || 'BRASIL') : 'BRASIL'}" class="mcli-input">
                        </div>
                    </div>

                    <!-- Linha 7 Contatos: Telefone, Celular, Whatsapp, CRM -->
                    <div style="display:grid; grid-template-columns:1.5fr 2fr auto 1.5fr; gap:0.75rem; margin-top:0.85rem; align-items:end;">
                        <div class="mcli-field">
                            <label>Telefone</label>
                            <input type="text" id="modal-cli-telefone" value="${client ? (client.telefone || '') : ''}" class="mcli-input">
                        </div>
                        <div class="mcli-field">
                            <label>Celular</label>
                            <input type="text" id="modal-cli-celular" value="${client ? (client.celular || '') : ''}" placeholder="(XX)XXXXX-XXXX" class="mcli-input">
                        </div>
                        <div>
                            <button type="button" onclick="window.abrirWhatsApp()" style="background:#25d366;color:white;border:none;padding:0.5rem;border-radius:4px;cursor:pointer;font-size:1.15rem;display:flex;align-items:center;justify-content:center;height:28px;width:38px;box-sizing:border-box;"><i class="ph ph-whatsapp-logo"></i></button>
                        </div>
                        <div>
                            <button type="button" onclick="alert('Abrindo CRM...')" style="background:#3b5bdb;color:white;border:none;padding:0.45rem 1rem;border-radius:4px;font-weight:600;font-size:0.78rem;cursor:pointer;display:flex;align-items:center;gap:5px;height:28px;justify-content:center;width:100%;box-sizing:border-box;"><i class="ph ph-briefcase"></i> Abrir no CRM</button>
                        </div>
                    </div>

                    <!-- ACORDEÕES EXPANSÍVEIS -->
                    <div style="display:flex; flex-direction:column; gap:0.5rem; margin-top:1.5rem;">
                        <!-- Parâmetros -->
                        <div style="border:1px solid #e2e8f0; border-radius:6px; overflow:hidden;">
                            <div onclick="window.modalToggleAccordion('modal-acc-parametros')" style="background:#f8fafc; padding:0.75rem 1rem; display:flex; justify-content:space-between; align-items:center; cursor:pointer; font-weight:bold; font-size:0.88rem; color:#475569;">
                                <span>▶ Parâmetros <i class="ph ph-gear-six"></i></span>
                                <span id="modal-acc-parametros-arrow" style="transition:transform 0.2s;">▶</span>
                            </div>
                            <div id="modal-acc-parametros" style="display:none; padding:1rem; border-top:1px solid #e2e8f0; font-size:0.85rem;">
                                <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
                                    <label style="display:flex; align-items:center; gap:5px; cursor:pointer;"><input type="checkbox" id="modal-cli-p-limite" ${parametros.limite ? 'checked' : ''}> Bloquear faturamento por limite de crédito</label>
                                    <label style="display:flex; align-items:center; gap:5px; cursor:pointer;"><input type="checkbox" id="modal-cli-p-retencao" ${parametros.retencao ? 'checked' : ''}> Exigir retenção de impostos em notas fiscais</label>
                                </div>
                            </div>
                        </div>

                        <!-- Fiscal -->
                        <div style="border:1px solid #e2e8f0; border-radius:6px; overflow:hidden;">
                            <div onclick="window.modalToggleAccordion('modal-acc-fiscal')" style="background:#f8fafc; padding:0.75rem 1rem; display:flex; justify-content:space-between; align-items:center; cursor:pointer; font-weight:bold; font-size:0.88rem; color:#475569;">
                                <span>▶ Fiscal <i class="ph ph-wrench"></i></span>
                                <span id="modal-acc-fiscal-arrow" style="transition:transform 0.2s;">▶</span>
                            </div>
                            <div id="modal-acc-fiscal" style="display:none; padding:1rem; border-top:1px solid #e2e8f0; font-size:0.85rem;">
                                <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:0.75rem;">
                                    <div>
                                        <label style="font-size: 0.7rem; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:2px; display:block;">Enquadramento Tributário</label>
                                        <select id="modal-cli-f-tributario" class="mcli-select">
                                            ${enquadramentoOptions(fiscal.enquadramento)}
                                        </select>
                                    </div>
                                    <div>
                                        <label style="font-size: 0.7rem; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:2px; display:block;">Regime Especial ISS</label>
                                        <input type="text" id="modal-cli-f-iss" value="${fiscal.regime_iss}" placeholder="Ex: Nenhum" class="mcli-input">
                                    </div>
                                    <div>
                                        <label style="font-size: 0.7rem; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:2px; display:block;">CNAE Principal</label>
                                        <input type="text" id="modal-cli-f-cnae" value="${fiscal.cnae}" class="mcli-input">
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Contatos (Expandido por padrão) -->
                        <div style="border:1px solid #e2e8f0; border-radius:6px; overflow:hidden;">
                            <div onclick="window.modalToggleAccordion('modal-acc-contatos')" style="background:#f8fafc; padding:0.75rem 1rem; display:flex; justify-content:space-between; align-items:center; cursor:pointer; font-weight:bold; font-size:0.88rem; color:#475569;">
                                <span>▼ Contatos <i class="ph ph-users-three"></i></span>
                                <span id="modal-acc-contatos-arrow" style="transition:transform 0.2s;">▼</span>
                            </div>
                            <div id="modal-acc-contatos" style="display:block; padding:1.2rem; border-top:1px solid #e2e8f0; font-size:0.85rem;">
                                <!-- Controles de e-mail e botão novo contato -->
                                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; flex-wrap:wrap; gap:0.5rem;">
                                    <div style="display:flex; align-items:center; gap:8px; font-weight:600; font-family:'Inter', sans-serif; font-size:0.85rem; color:#475569;">
                                        <span>E-mail de Cobrança: Enviar</span>
                                        <input type="number" id="modal-cli-email-cob-antecedencia" value="${client ? (client.email_cob_antecedencia || 5) : 5}" style="width:45px; text-align:center; padding:4px; border:1px solid #cbd5e1; border-radius:6px; height:30px; box-sizing:border-box; outline:none; font-family:'Inter', sans-serif;">
                                        <span>dias antes e</span>
                                        <input type="number" id="modal-cli-email-cob-posterior" value="${client ? (client.email_cob_posterior || 5) : 5}" style="width:45px; text-align:center; padding:4px; border:1px solid #cbd5e1; border-radius:6px; height:30px; box-sizing:border-box; outline:none; font-family:'Inter', sans-serif;">
                                        <span>dias após o vencimento</span>
                                    </div>
                                    <div style="display:flex; gap:0.5rem; align-items:center;">
                                        <button type="button" onclick="window.modalAbrirPesquisaContatoCliente()" style="background:#e2e8f0; color:#475569; border:none; padding:0.45rem 1rem; border-radius:6px; font-weight:600; font-size:0.83rem; cursor:pointer; display:flex; align-items:center; gap:5px; transition:all 0.15s; height:28px;" onmouseover="this.style.background='#cbd5e1'" onmouseout="this.style.background='#e2e8f0'">
                                            <i class="ph ph-magnifying-glass" style="font-size:1rem;"></i> Pesquisar Contato
                                        </button>
                                        <button type="button" onclick="document.getElementById('modal-cli-contato-form').style.display='flex'" style="background:#3b82f6; color:white; border:none; padding:0.45rem 1rem; border-radius:6px; font-weight:600; font-size:0.83rem; cursor:pointer; display:flex; align-items:center; gap:5px; transition:background 0.15s; height:28px;" onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'">
                                            <i class="ph ph-plus-bold" style="font-size:1rem;"></i> Novo Contato
                                        </button>
                                    </div>
                                </div>

                                <!-- Formulário Inline de Novo Contato -->
                                <div id="modal-cli-contato-form" style="display:none; background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; padding:0.8rem; margin-bottom:1rem; gap:0.5rem; flex-direction:column; text-align:left;">
                                    <div style="display:grid; grid-template-columns:1.5fr 1.5fr 1.5fr 1fr; gap:0.75rem;">
                                        <div class="mcli-field">
                                            <label>Nome *</label>
                                            <input type="text" id="modal-new-con-nome" class="mcli-input">
                                        </div>
                                        <div class="mcli-field">
                                            <label>Celular</label>
                                            <input type="text" id="modal-new-con-celular" class="mcli-input" placeholder="(XX)XXXXX-XXXX">
                                        </div>
                                        <div class="mcli-field">
                                            <label>E-mail</label>
                                            <input type="text" id="modal-new-con-email" class="mcli-input">
                                        </div>
                                        <div class="mcli-field">
                                            <label>Cargo</label>
                                            <input type="text" id="modal-new-con-cargo" class="mcli-input">
                                        </div>
                                    </div>
                                    <div style="display:flex; justify-content:flex-end; gap:0.4rem; margin-top:0.6rem;">
                                        <button type="button" onclick="window.modalSalvarContatoInline()" style="background:#16a34a; color:white; border:none; padding:0.35rem 0.75rem; border-radius:4px; font-weight:600; font-size:0.78rem; cursor:pointer; height:28px;">Confirmar</button>
                                        <button type="button" onclick="document.getElementById('modal-cli-contato-form').style.display='none'" style="background:#dc2626; color:white; border:none; padding:0.35rem 0.75rem; border-radius:4px; font-weight:600; font-size:0.78rem; cursor:pointer; height:28px;">Cancelar</button>
                                    </div>
                                </div>

                                <!-- Tabela de contatos cadastrados -->
                                <div style="background:#fff; border-radius:10px; border:1px solid #e2e8f0; overflow-x:auto; box-shadow:0 1px 3px rgba(0,0,0,0.02);">
                                    <table style="width:100%; border-collapse:collapse; font-size:0.82rem; font-family:'Inter', sans-serif;">
                                        <thead>
                                            <tr style="background:#f8fafc; border-bottom:2px solid #cbd5e1; text-align:left; color:#475569; font-size:0.75rem; text-transform:uppercase; letter-spacing:0.02em;">
                                                <th style="padding:0.75rem 1rem; font-weight:700; width:30%;">Nome</th>
                                                <th style="padding:0.75rem 1rem; font-weight:700; width:20%; white-space:nowrap;">Cargo</th>
                                                <th style="padding:0.75rem 1rem; font-weight:700; width:15%; white-space:nowrap;">Celular</th>
                                                <th style="padding:0.75rem 1rem; font-weight:700; width:30%;">E-mail</th>
                                                <th style="padding:0.75rem 1rem; font-weight:700; width:5%; text-align:center; white-space:nowrap;">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody id="modal-cli-contatos-tbody">
                                            <!-- Populado dinamicamente -->
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <!-- Validação de Dados (DataValid) -->
                        <div style="border:1px solid #e2e8f0; border-radius:6px; overflow:hidden;">
                            <div onclick="window.modalToggleAccordion('modal-acc-validacao')" style="background:#f8fafc; padding:0.75rem 1rem; display:flex; justify-content:space-between; align-items:center; cursor:pointer; font-weight:bold; font-size:0.88rem; color:#475569;">
                                <span>▶ Validação de Dados (DataValid) <i class="ph ph-check-circle"></i></span>
                                <span id="modal-acc-validacao-arrow" style="transition:transform 0.2s;">▶</span>
                            </div>
                            <div id="modal-acc-validacao" style="display:none; padding:1rem; border-top:1px solid #e2e8f0; font-size:0.85rem;">
                                <div style="color:#155724; background-color:#d4edda; border:1px solid #c3e6cb; padding:0.75rem 1.25rem; border-radius:4px; font-weight:600; display:flex; align-items:center; gap:5px;">
                                    <i class="ph ph-check-circle-bold" style="font-size:1.2rem;"></i> Todos os dados cadastrais estão de acordo com a Receita Federal e Sintegra.
                                </div>
                            </div>
                        </div>

                        <!-- Anexo de Arquivos -->
                        <div style="border:1px solid #e2e8f0; border-radius:6px; overflow:hidden;">
                            <div onclick="window.modalToggleAccordion('modal-acc-anexos')" style="background:#f8fafc; padding:0.75rem 1rem; display:flex; justify-content:space-between; align-items:center; cursor:pointer; font-weight:bold; font-size:0.88rem; color:#475569;">
                                <span>▶ Anexo de Arquivos <i class="ph ph-file-arrow-up"></i></span>
                                <span id="modal-acc-anexos-arrow" style="transition:transform 0.2s;">▶</span>
                            </div>
                            <div id="modal-acc-anexos" style="display:none; padding:1rem; border-top:1px solid #e2e8f0; font-size:0.85rem;">
                                <input type="file" id="modal-cli-anexo-file" style="margin-bottom:0.5rem; display:block;">
                                <span style="color:#64748b; font-size:0.75rem;">(Formatos permitidos: PDF, PNG, JPG até 5MB)</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `,
        didOpen: async () => {
            // Populate Cliente Centralizador
            try {
                const clientesList = await apiGet('/clientes') || [];
                const selectCentralizador = document.getElementById('modal-cli-centralizador');
                if (selectCentralizador) {
                    selectCentralizador.innerHTML = '<option value="">-- Selecione --</option>' + 
                        clientesList.map(c => `<option value="${c.nome_razao_social}" ${client && client.cliente_centralizador === c.nome_razao_social ? 'selected' : ''}>${c.nome_razao_social}</option>`).join('').replace(/\.\.\./g, '');
                }
            } catch (e) {
                console.error('Erro ao carregar centralizadores no modal:', e);
            }

            // Populate contacts table
            window.modalRenderTabelaContatos();
        }
    });
};

window.modalToggleAccordion = function(id) {
    const el = document.getElementById(id);
    const arrow = document.getElementById(id + '-arrow');
    if (el) {
        if (el.style.display === 'none') {
            el.style.display = 'block';
            if (arrow) arrow.innerText = id.includes('contatos') ? '▼' : '▼';
        } else {
            el.style.display = 'none';
            if (arrow) arrow.innerText = id.includes('contatos') ? '▶' : '▶';
        }
    }
};

window.modalRenderTabelaContatos = function() {
    const tbody = document.getElementById('modal-cli-contatos-tbody');
    if (!tbody) return;
    
    if (!window._modalClienteContatos || window._modalClienteContatos.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="padding:1rem; text-align:center; color:#94a3b8;">
                    Nenhum contato adicionado.
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = window._modalClienteContatos.map((c, idx) => `
        <tr style="border-bottom:1px solid #f1f5f9; transition:background 0.15s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''">
            <td style="padding:0.75rem 1rem; color:#1e293b; font-weight:600; word-break:break-word;">${c.nome}</td>
            <td style="padding:0.75rem 1rem; color:#475569; white-space:nowrap;">${c.cargo || '—'}</td>
            <td style="padding:0.75rem 1rem; color:#475569; white-space:nowrap;">${c.celular || '—'}</td>
            <td style="padding:0.75rem 1rem; color:#475569; word-break:break-all;">${c.email || '—'}</td>
            <td style="padding:0.75rem 1rem; text-align:center; white-space:nowrap;">
                <button type="button" onclick="window.modalRemoverContato(${idx})" style="background:#ffe3e3; color:#e03131; border:none; padding:5px 8px; border-radius:6px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; transition:all 0.15s;" onmouseover="this.style.background='#fa5252'; this.style.color='#fff';" onmouseout="this.style.background='#ffe3e3'; this.style.color='#e03131';" title="Remover Contato">
                    <i class="ph ph-trash" style="font-size:0.95rem;"></i>
                </button>
            </td>
        </tr>
    `).join('');
};

window.modalSalvarContatoInline = function() {
    const nome = document.getElementById('modal-new-con-nome')?.value.trim() || '';
    const celular = document.getElementById('modal-new-con-celular')?.value.trim() || '';
    const email = document.getElementById('modal-new-con-email')?.value.trim() || '';
    const cargo = document.getElementById('modal-new-con-cargo')?.value.trim() || '';

    if (!nome) {
        Swal.fire('Aviso', 'Por favor, preencha o Nome do contato.', 'warning');
        return;
    }

    const newContact = {
        identificacao: 'Direto',
        nome: nome,
        departamento: 'Comercial',
        celular: celular,
        telefone_ramal: '',
        email: email,
        dono: window.currentUser?.nome || '',
        cargo: cargo,
        situacao: 'Ativo',
        nfe: 'Sim',
        cobranca: 'Sim',
        os: 'Sim',
        contrato: 'Sim',
        origem: 'Cadastro Modal',
        inativo: 'Não'
    };

    window._modalClienteContatos.push(newContact);
    window.modalRenderTabelaContatos();

    // Reset fields
    document.getElementById('modal-new-con-nome').value = '';
    document.getElementById('modal-new-con-celular').value = '';
    document.getElementById('modal-new-con-email').value = '';
    document.getElementById('modal-new-con-cargo').value = '';
    document.getElementById('modal-cli-contato-form').style.display = 'none';
};

window.modalRemoverContato = function(idx) {
    window._modalClienteContatos.splice(idx, 1);
    window.modalRenderTabelaContatos();
};

window.modalAbrirPesquisaContatoCliente = function() {
    Swal.fire('Aviso', 'Utilize o botão "Novo Contato" para adicionar contatos a este cliente diretamente.', 'info');
};

window.modalRecarregarCliente = function(clientId) {
    if (clientId) {
        window.abrirModalCadastroCliente(clientId, '');
    } else {
        window.abrirModalCadastroCliente(null, '');
    }
};

window.modalAbrirPesquisaCliente = async function() {
    try {
        const clientes = await apiGet('/clientes');
        if (!clientes || clientes.length === 0) {
            Swal.fire('Aviso', 'Nenhum cliente cadastrado ainda.', 'info');
            return;
        }

        const rowsHtml = clientes.map(c => `
            <tr onclick="window.modalSelectClientePesquisa(${c.id})" style="cursor:pointer; border-bottom:1px solid #e2e8f0;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background=''">
                <td style="padding:0.5rem; text-align:left; font-weight:bold; color:#7048e8;">${c.codigo}</td>
                <td style="padding:0.5rem; text-align:left;">${c.nome_razao_social}</td>
                <td style="padding:0.5rem; text-align:left;">${c.cpf_cnpj}</td>
            </tr>
        `).join('');

        window.modalSelectClientePesquisa = function(id) {
            Swal.close();
            setTimeout(() => {
                window.abrirModalCadastroCliente(id, '');
            }, 300);
        };

        Swal.fire({
            title: 'Pesquisar Cliente',
            html: `
                <div style="max-height:400px; overflow-y:auto; width:100%;">
                    <table style="width:100%; border-collapse:collapse; font-size:0.85rem; font-family:'Inter', sans-serif;">
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
        Swal.fire('Erro', 'Erro ao carregar lista de clientes: ' + e.message, 'error');
    }
};

window.modalLimparFormCliente = function() {
    window.abrirModalCadastroCliente(null, '');
};

window.modalBuscarCNPJ = async function() {
    const cnpjRaw = document.getElementById('modal-cli-cpf-cnpj')?.value || '';
    const cnpj = cnpjRaw.replace(/\D/g, '');
    if (cnpj.length !== 14) {
        Swal.fire('Aviso', 'Por favor, informe um CNPJ válido com 14 dígitos para buscar.', 'warning');
        return;
    }
    
    const btn = document.getElementById('modal-btn-busca-cnpj');
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
            document.getElementById('modal-cli-razao-social').value = data.razao_social || '';
            document.getElementById('modal-cli-nome-fantasia').value = data.estabelecimento?.nome_fantasia || '';
            document.getElementById('modal-cli-cep').value = data.estabelecimento?.cep || '';
            
            // Endereço
            const logradouro = data.estabelecimento?.logradouro || '';
            const tipoLogradouro = data.estabelecimento?.tipo_logradouro || '';
            const numero = data.estabelecimento?.numero || '';
            const compl = data.estabelecimento?.complemento || '';
            
            document.getElementById('modal-cli-endereco').value = `${tipoLogradouro} ${logradouro}`.trim() + (numero ? ', ' + numero : '');
            document.getElementById('modal-cli-complemento').value = compl;
            document.getElementById('modal-cli-bairro').value = data.estabelecimento?.bairro || '';
            document.getElementById('modal-cli-uf').value = data.estabelecimento?.estado?.sigla || '';
            document.getElementById('modal-cli-municipio').value = data.estabelecimento?.cidade?.nome || '';
            document.getElementById('modal-cli-pais').value = 'BRASIL';
            
            // Telefone
            if (data.estabelecimento?.ddd1 && data.estabelecimento?.telefone1) {
                document.getElementById('modal-cli-telefone').value = `(${data.estabelecimento.ddd1}) ${data.estabelecimento.telefone1}`;
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
            document.getElementById('modal-cli-ie').value = ie;

        } else {
            // Source: brasilapi
            document.getElementById('modal-cli-razao-social').value = data.razao_social || '';
            document.getElementById('modal-cli-nome-fantasia').value = data.nome_fantasia || '';
            document.getElementById('modal-cli-cep').value = data.cep || '';
            document.getElementById('modal-cli-endereco').value = (data.logradouro || '') + (data.numero ? ', ' + data.numero : '');
            document.getElementById('modal-cli-bairro').value = data.bairro || '';
            document.getElementById('modal-cli-uf').value = data.uf || '';
            document.getElementById('modal-cli-municipio').value = data.municipio || '';
            document.getElementById('modal-cli-pais').value = 'BRASIL';
            
            if (data.ddd_telefone_1) {
                document.getElementById('modal-cli-telefone').value = `(${data.ddd_telefone_1.substring(0,2)}) ${data.ddd_telefone_1.substring(2)}`;
            }
            document.getElementById('modal-cli-ie').value = 'ISENTO';
        }

        // Atualizar opções do centralizador
        try {
            const clientesList = await apiGet('/clientes') || [];
            const selectCentralizador = document.getElementById('modal-cli-centralizador');
            if (selectCentralizador) {
                selectCentralizador.innerHTML = '<option value="">-- Selecione --</option>' + 
                    clientesList.map(c => `<option value="${c.nome_razao_social}">${c.nome_razao_social}</option>`).join('');
            }
        } catch (e) {
            console.error(e);
        }

        if (typeof mostrarToastSucesso === 'function') {
            const extra = source === 'cnpjws' ? '' : ' (Inscrição Estadual indisponível no fallback)';
            mostrarToastSucesso('Dados do CNPJ importados com sucesso!' + extra);
        }
    } catch(e) {
        console.error(e);
        Swal.fire('Erro', 'Erro ao buscar CNPJ: ' + (e.message || 'Erro desconhecido.'), 'error');
    } finally {
        btn.innerHTML = origText;
        btn.disabled = false;
    }
};

window.modalBuscarCEP = async function() {
    const cepRaw = document.getElementById('modal-cli-cep')?.value || '';
    const cep = cepRaw.replace(/\D/g, '');
    if (cep.length !== 8) {
        Swal.fire('Aviso', 'Por favor, informe um CEP válido com 8 dígitos.', 'warning');
        return;
    }
    
    try {
        const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        if (!res.ok) throw new Error('CEP não encontrado.');
        const data = await res.json();
        if (data.erro) throw new Error('CEP inexistente.');
        
        document.getElementById('modal-cli-endereco').value = data.logradouro || '';
        document.getElementById('modal-cli-bairro').value = data.bairro || '';
        document.getElementById('modal-cli-uf').value = data.uf || '';
        document.getElementById('modal-cli-municipio').value = data.localidade || '';
        document.getElementById('modal-cli-pais').value = 'BRASIL';
        
        if (typeof mostrarToastSucesso === 'function') {
            mostrarToastSucesso('Endereço importado com sucesso!');
        }
    } catch(e) {
        console.error(e);
        Swal.fire('Erro', 'Erro ao buscar CEP: ' + e.message, 'error');
    }
};

window.modalSalvarCliente = async function(clientId) {
    const cpfCnpj = document.getElementById('modal-cli-cpf-cnpj')?.value || '';
    const razaoSocial = document.getElementById('modal-cli-razao-social')?.value || '';
    
    if (!cpfCnpj) {
        Swal.fire('Aviso', 'Por favor, informe o CPF / CNPJ.', 'warning');
        return;
    }
    if (!razaoSocial) {
        Swal.fire('Aviso', 'Por favor, informe a Razão Social.', 'warning');
        return;
    }

    const parametros = {
        limite: document.getElementById('modal-cli-p-limite')?.checked || false,
        retencao: document.getElementById('modal-cli-p-retencao')?.checked || false
    };

    const fiscal = {
        enquadramento: document.getElementById('modal-cli-f-tributario')?.value || 'Simples Nacional',
        regime_iss: document.getElementById('modal-cli-f-iss')?.value || '',
        cnae: document.getElementById('modal-cli-f-cnae')?.value || ''
    };

    const payload = {
        codigo: document.getElementById('modal-cli-codigo')?.value || null,
        data_cadastro: document.getElementById('modal-cli-data-cadastro')?.value || '',
        inativo: document.getElementById('modal-cli-inativo')?.checked ? 1 : 0,
        cpf_cnpj: cpfCnpj,
        inscricao_estadual: document.getElementById('modal-cli-ie')?.value || '',
        inscricao_municipal: document.getElementById('modal-cli-im')?.value || '',
        rg: '',
        data_nascimento: '',
        grupo_clientes: document.getElementById('modal-cli-grupo')?.value || '',
        cliente_centralizador: document.getElementById('modal-cli-centralizador')?.value || '',
        nome_razao_social: razaoSocial,
        nome_fantasia: document.getElementById('modal-cli-nome-fantasia')?.value || '',
        cep: document.getElementById('modal-cli-cep')?.value || '',
        endereco: document.getElementById('modal-cli-endereco')?.value || '',
        numero: document.getElementById('modal-cli-numero')?.value || '',
        complemento: document.getElementById('modal-cli-complemento')?.value || '',
        bairro: document.getElementById('modal-cli-bairro')?.value || '',
        uf: document.getElementById('modal-cli-uf')?.value || '',
        municipio: document.getElementById('modal-cli-municipio')?.value || '',
        pais: document.getElementById('modal-cli-pais')?.value || 'BRASIL',
        telefone: document.getElementById('modal-cli-telefone')?.value || '',
        ramal: document.getElementById('modal-cli-ramal')?.value || '',
        telefone_2: document.getElementById('modal-cli-telefone2')?.value || '',
        ramal_2: document.getElementById('modal-cli-ramal2')?.value || '',
        fax: document.getElementById('modal-cli-fax')?.value || '',
        website: document.getElementById('modal-cli-website')?.value || '',
        celular_ddi: document.getElementById('modal-cli-celular-ddi')?.value || '',
        celular: document.getElementById('modal-cli-celular')?.value || '',
        parametros: JSON.stringify(parametros),
        fiscal: JSON.stringify(fiscal),
        contatos: JSON.stringify(window._modalClienteContatos || []),
        validacao_dados: '',
        anexo_arquivos: '',
        criado_por: window.currentUser?.nome || window.currentUser?.email || ''
    };

    try {
        let res;
        if (clientId) {
            res = await apiPut(`/clientes/${clientId}`, payload);
        } else {
            res = await apiPost('/clientes', payload);
        }

        if (res && res.success) {
            _clientesCache = []; // Limpar cache para atualizar centralizadores
            if (typeof mostrarToastSucesso === 'function') {
                mostrarToastSucesso(clientId ? 'Cliente atualizado com sucesso!' : 'Cliente cadastrado com sucesso!');
            }
            // Atualizar o input de cliente na tela de proposta principal
            const propClienteInput = document.getElementById('prop-cliente');
            if (propClienteInput) propClienteInput.value = razaoSocial;
            
            Swal.close();
        } else {
            Swal.fire('Erro', 'Erro ao salvar cliente: ' + (res?.error || 'Erro desconhecido.'), 'error');
        }
    } catch (e) {
        console.error(e);
        Swal.fire('Erro', 'Erro de comunicação com o servidor.', 'error');
    }
};

window.modalExcluirCliente = async function(clientId) {
    if (!clientId) {
        Swal.fire('Aviso', 'Selecione um cliente cadastrado para poder excluir.', 'warning');
        return;
    }
    
    const confirmRes = await Swal.fire({
        title: 'Confirmação',
        text: 'Deseja realmente excluir este cliente permanentemente?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sim, excluir',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#64748b'
    });
    
    if (!confirmRes.isConfirmed) return;
    
    try {
        const res = await apiDelete(`/clientes/${clientId}`);
        if (res && res.success) {
            _clientesCache = []; // Limpar cache
            if (typeof mostrarToastSucesso === 'function') {
                mostrarToastSucesso('Cliente excluído com sucesso.');
            }
            const propClienteInput = document.getElementById('prop-cliente');
            if (propClienteInput) propClienteInput.value = '';
            
            Swal.close();
        } else {
            Swal.fire('Erro', 'Erro ao excluir cliente: ' + (res?.error || 'Erro desconhecido.'), 'error');
        }
    } catch (e) {
        console.error(e);
        Swal.fire('Erro', 'Erro de comunicação com o servidor.', 'error');
    }
};

window.modalVerificarCliente = function() {
    const cpfCnpj = document.getElementById('modal-cli-cpf-cnpj')?.value || '';
    const razaoSocial = document.getElementById('modal-cli-razao-social')?.value || '';
    
    if (!cpfCnpj) {
        Swal.fire('Aviso', 'Falta preencher: CPF / CNPJ.', 'warning');
        return;
    }
    if (!razaoSocial) {
        Swal.fire('Aviso', 'Falta preencher: Nome / Razão Social.', 'warning');
        return;
    }
    
    Swal.fire('Sucesso', 'Campos validados com sucesso! Pronto para salvar.', 'success');
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

window.verDetalhesClienteProposta = async function() {
    const clienteNome = document.getElementById('prop-cliente').value.trim();
    if (!clienteNome) {
        Swal.fire('Aviso', 'Por favor, selecione um cliente cadastrado primeiro.', 'warning');
        return;
    }

    try {
        // Show loading indicator
        Swal.fire({
            title: 'Carregando detalhes do cliente...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        const clientes = await apiGet('/clientes') || [];
        const client = clientes.find(c => c.nome_razao_social.toLowerCase() === clienteNome.toLowerCase());
        
        Swal.close();

        if (client) {
            window.abrirModalCadastroCliente(client.id, '');
        } else {
            Swal.fire('Aviso', 'Cliente não cadastrado ou não encontrado.', 'warning');
        }
    } catch(e) {
        console.error(e);
        Swal.fire('Erro', 'Não foi possível carregar os detalhes do cliente.', 'error');
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
    const servicoSelect = document.getElementById('prop-servico-precificado');
    let precoServico = 0;
    if (servicoSelect && servicoSelect.value) {
        const selectedOption = servicoSelect.options[servicoSelect.selectedIndex];
        precoServico = parseFloat(selectedOption.getAttribute('data-preco') || 0);
    }
    const freteIda = parseFloat(document.getElementById('prop-frete-ida')?.value || 0);
    const freteVolta = parseFloat(document.getElementById('prop-frete-volta')?.value || 0);
    const subtotal = precoServico + freteIda + freteVolta;

    const rsEl = document.getElementById('prop-desc-rs');
    if (rsEl && subtotal > 0) {
        rsEl.value = (subtotal * pct / 100).toFixed(2);
    }

    if (typeof window.calcularValorTotalProposta === 'function') {
        window.calcularValorTotalProposta();
    }
}

window.calcularValorTotalProposta = function() {
    const servicoSelect = document.getElementById('prop-servico-precificado');
    const freteIdaEl = document.getElementById('prop-frete-ida');
    const freteVoltaEl = document.getElementById('prop-frete-volta');
    const descPctEl = document.getElementById('prop-desc-pct');
    const descRsEl = document.getElementById('prop-desc-rs');
    const totalEl = document.getElementById('prop-valor-total');

    if (!totalEl) return;

    if (!servicoSelect || !servicoSelect.value) {
        totalEl.removeAttribute('readonly');
        totalEl.style.background = '#fff';
        return;
    }

    totalEl.setAttribute('readonly', 'true');
    totalEl.style.background = '#f1f5f9';

    const selectedOption = servicoSelect.options[servicoSelect.selectedIndex];
    const precoServico = parseFloat(selectedOption.getAttribute('data-preco') || 0);
    const freteIda = parseFloat(freteIdaEl?.value || 0);
    const freteVolta = parseFloat(freteVoltaEl?.value || 0);

    // Adicionais de Logística (Zona & KM)
    const pctZona = parseFloat(document.getElementById('prop-percentual-zona')?.value || 0);
    const valorKm = parseFloat(document.getElementById('prop-valor-km')?.value || 0);
    const endereco = document.getElementById('prop-endereco')?.value || '';

    let distancia = 0;
    if (endereco.trim()) {
        const cacheKey = endereco.trim();
        if (window._enderecoCoordenadasCache && window._enderecoCoordenadasCache[cacheKey]) {
            const coords = window._enderecoCoordenadasCache[cacheKey];
            // Depot Point A: -23.433829134957392, -46.42011977802175
            distancia = calcularDistanciaHaversine(-23.433829134957392, -46.42011977802175, coords.lat, coords.lon);
        } else {
            // Trigger geocoding asynchronously so it populates the cache and updates later
            obterCoordenadasEnderecoAsync(cacheKey);
        }
    }

    // Atualizar inputs de visualização de distância e adicionais
    const distEl = document.getElementById('prop-distancia-km');
    if (distEl) {
        distEl.value = `${distancia.toFixed(2).replace('.', ',')} km`;
    }

    const valorZona = precoServico * (pctZona / 100);
    const valZonaEl = document.getElementById('prop-valor-zona-calculado');
    if (valZonaEl) {
        valZonaEl.value = `R$ ${valorZona.toFixed(2).replace('.', ',')}`;
    }

    const valorDist = distancia * valorKm;
    const valDistEl = document.getElementById('prop-valor-distancia-calculado');
    if (valDistEl) {
        valDistEl.value = `R$ ${valorDist.toFixed(2).replace('.', ',')}`;
    }

    const subtotal = precoServico + freteIda + freteVolta + valorZona + valorDist;

    let desconto = 0;
    if (descPctEl && parseFloat(descPctEl.value) > 0) {
        desconto = subtotal * parseFloat(descPctEl.value) / 100;
    } else if (descRsEl && parseFloat(descRsEl.value) > 0) {
        desconto = parseFloat(descRsEl.value);
    }

    const totalCalculado = Math.max(0, subtotal - desconto);
    totalEl.value = totalCalculado.toFixed(2);
};

/* ── Botões CRUD e Envio ─────────────────────────────────────────────── */
window.limparFormPropostaNovo = function() {
    _propostasEditandoId = null;
    _renderFormPropostaInt();
    
    // Rolar até o topo do formulário onde a toolbar se torna fixa (sticky)
    const container = document.getElementById('prop-view-form');
    if (container) {
        const targetY = container.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({ top: targetY, behavior: 'smooth' });
    }

    if (typeof mostrarToastSucesso === 'function') {
        mostrarToastSucesso('Campos limpos. Pronto para criar nova proposta.');
    }
};

window.salvarPropostaNova = async function() {
    console.log('[DEBUG] salvarPropostaNova called. _propostasEditandoId =', _propostasEditandoId);
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
        motivo_reprovacao: obter('prop-motivo-reprovacao'),
        criado_por: window.currentUser?.nome || window.currentUser?.email || '',
        itens: window._propProdutosAdicionados || [],
        servico_precificacao_id: document.getElementById('prop-servico-precificado')?.value ? parseInt(document.getElementById('prop-servico-precificado').value) : null,
        regiao: _propRegiaoIdentificada || null,
        percentual_zona: obterN('prop-percentual-zona'),
        valor_km: obterN('prop-valor-km'),
        distancia_km: parseFloat(obter('prop-distancia-km').replace(' km', '').replace(',', '.')) || 0,
        valor_zona_calculado: parseFloat(obter('prop-valor-zona-calculado').replace('R$ ', '').replace(',', '.')) || 0,
        valor_distancia_calculado: parseFloat(obter('prop-valor-distancia-calculado').replace('R$ ', '').replace(',', '.')) || 0
    };

    // Cache payload for save confirm call
    window._cachedProposalPayload = payload;

    // Show loading
    Swal.fire({
        title: 'Processando demonstrativos...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    (async () => {
        try {
            const dre = await window.obterDadosDREProposta(payload);

            const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            const pctPart = (part, total) => total > 0 ? `${((part / total) * 100).toFixed(2).replace('.', ',')}%` : '0,00%';

            const selectServico = document.getElementById('prop-servico-precificado');
            const selectedOption = selectServico ? selectServico.options[selectServico.selectedIndex] : null;
            const precoServico = parseFloat(selectedOption ? (selectedOption.getAttribute('data-preco') || 0) : 0);
            
            const totalReceita = precoServico + payload.valor_zona_calculado + payload.valor_distancia_calculado + payload.valor_frete_ida + payload.valor_frete_volta;
            const desconto = payload.desconto_reais || (totalReceita * payload.desconto_percent / 100);
            const receitaLiquida = totalReceita - desconto;
            const custoVariavelTotal = dre.custoVariavel + dre.despesaVariavel + payload.valor_distancia_calculado;
            const margemContrib = receitaLiquida - custoVariavelTotal;
            const custosFixosTotais = dre.custoFixo + dre.despesaFixa + dre.rateioDespesasFixas;
            const lucroLiquido = margemContrib - custosFixosTotais;

            const itensHtml = (payload.itens || []).map((item, idx) => `
                <tr style="border-bottom:1px solid #cbd5e1;">
                    <td style="text-align:center; padding:0.35rem 0.6rem;">${idx + 1}</td>
                    <td style="padding:0.35rem 0.6rem;">${item.descricao || item.nome || 'Item'}</td>
                    <td style="text-align:center; padding:0.35rem 0.6rem;">${item.quantidade || 1}</td>
                    <td style="text-align:right; padding:0.35rem 0.6rem;">${fmt(item.valor_unitario)}</td>
                    <td style="text-align:right; font-weight:bold; padding:0.35rem 0.6rem;">${fmt((item.quantidade || 1) * (item.valor_unitario || 0))}</td>
                </tr>
            `).join('');

            const code = selectServico && selectServico.value ? `SVC-${String(selectServico.value).padStart(4, '0')}` : 'MANUAL';

            Swal.fire({
                title: '',
                width: '850px',
                customClass: {
                    popup: 'custom-swal-padding-zero'
                },
                html: `
                    <style>
                        .rf-box {
                            border: 2px solid #065f46;
                            border-radius: 8px;
                            font-family: 'Inter', sans-serif;
                            background: #fff;
                            color: #000;
                            text-align: left;
                            margin: 1rem 0;
                            overflow: hidden;
                        }
                        .rf-header {
                            background: #065f46;
                            color: #fff;
                            padding: 0.6rem;
                            text-align: center;
                            font-weight: bold;
                            font-size: 0.85rem;
                            line-height: 1.2;
                        }
                        .rf-header-title {
                            font-size: 1rem;
                            letter-spacing: 0.05em;
                            margin-bottom: 2px;
                        }
                        .rf-section-title {
                            background: #f0fdf4;
                            color: #166534;
                            font-weight: bold;
                            font-size: 0.8rem;
                            padding: 0.35rem 0.6rem;
                            border-top: 2px solid #065f46;
                            border-bottom: 1px solid #cbd5e1;
                            text-transform: uppercase;
                        }
                        .rf-grid {
                            display: grid;
                            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                            border-bottom: 1px solid #cbd5e1;
                        }
                        .rf-grid-cell {
                            padding: 0.4rem 0.6rem;
                            border-right: 1px solid #cbd5e1;
                            box-sizing: border-box;
                        }
                        .rf-grid-cell:last-child {
                            border-right: none;
                        }
                        .rf-label {
                            font-size: 0.65rem;
                            color: #475569;
                            text-transform: uppercase;
                            font-weight: bold;
                            margin-bottom: 2px;
                            display: block;
                        }
                        .rf-value {
                            font-size: 0.82rem;
                            font-weight: bold;
                            color: #0f172a;
                        }
                        .rf-table {
                            width: 100%;
                            border-collapse: collapse;
                            font-size: 0.78rem;
                        }
                        .rf-table th {
                            background: #f1f5f9;
                            border-bottom: 1.5px solid #cbd5e1;
                            padding: 0.35rem 0.6rem;
                            font-weight: bold;
                            color: #475569;
                            text-transform: uppercase;
                            font-size: 0.65rem;
                        }
                        .rf-table td {
                            padding: 0.35rem 0.6rem;
                            border-bottom: 1px solid #cbd5e1;
                        }
                    </style>
                    <div style="text-align:left; font-family:'Inter', sans-serif; background:#fff; border-radius:12px; overflow:hidden;">
                        <!-- Header Tabs -->
                        <div style="display:flex; border-bottom: 2px solid #cbd5e1; background:#f8fafc;">
                            <button type="button" onclick="window.toggleResumoModalTab('simplificado')" id="btn-resumo-simplificado" style="flex:1; padding: 0.8rem; background: #f1f5f9; border: none; border-bottom: 3px solid #3b82f6; font-weight: bold; cursor: pointer; font-size: 0.9rem; outline:none; font-family:'Inter', sans-serif;">Resumo Simplificado</button>
                            <button type="button" onclick="window.toggleResumoModalTab('detalhado')" id="btn-resumo-detalhado" style="flex:1; padding: 0.8rem; background: transparent; border: none; font-weight: normal; cursor: pointer; font-size: 0.9rem; color: #64748b; outline:none; font-family:'Inter', sans-serif;">Resumo Detalhado (DRE)</button>
                        </div>

                        <div style="padding: 1.2rem 1.5rem; max-height:550px; overflow-y:auto;">
                            
                            <!-- BOX RECEITA FEDERAL SIMPLIFICADO -->
                            <div id="panel-resumo-simplificado" style="display:block;">
                                <div class="rf-box">
                                    <div class="rf-header">
                                        <div class="rf-header-title">AMERICA RENTAL LOCAÇÃO DE EQUIPAMENTOS</div>
                                        <div>SISTEMA DE PROPOSTAS COMERCIAIS &bull; RESUMO DA DECLARAÇÃO</div>
                                    </div>
                                    
                                    <div class="rf-section-title">Seção I - Identificação da Proposta</div>
                                    <div class="rf-grid">
                                        <div class="rf-grid-cell"><span class="rf-label">Código</span><span class="rf-value">${_propostasEditandoId ? 'EDITANDO ID: ' + _propostasEditandoId : 'NOVA PROPOSTA'}</span></div>
                                        <div class="rf-grid-cell"><span class="rf-label">Data Emissão</span><span class="rf-value">${dataCad.split('-').reverse().join('/')}</span></div>
                                        <div class="rf-grid-cell"><span class="rf-label">Fase</span><span class="rf-value">${fase}</span></div>
                                        <div class="rf-grid-cell"><span class="rf-label">Tipo</span><span class="rf-value">${tipo}</span></div>
                                    </div>
                                    <div class="rf-grid">
                                        <div class="rf-grid-cell"><span class="rf-label">Atendente</span><span class="rf-value">${payload.atendente || '—'}</span></div>
                                        <div class="rf-grid-cell"><span class="rf-label">Tabela de Preço</span><span class="rf-value">${payload.tabela_precos || '—'}</span></div>
                                        <div class="rf-grid-cell"><span class="rf-label">Modelo Impressão</span><span class="rf-value">${payload.modelo_impressao || '—'}</span></div>
                                    </div>

                                    <div class="rf-section-title">Seção II - Dados do Contratante</div>
                                    <div class="rf-grid">
                                        <div class="rf-grid-cell" style="grid-column: span 2;"><span class="rf-label">Nome / Razão Social</span><span class="rf-value">${payload.cliente_nome || '—'}</span></div>
                                        <div class="rf-grid-cell"><span class="rf-label">Contato</span><span class="rf-value">${payload.contato_nome || '—'}</span></div>
                                    </div>
                                    <div class="rf-grid">
                                        <div class="rf-grid-cell" style="grid-column: span 3;"><span class="rf-label">Endereço de Instalação</span><span class="rf-value">${payload.endereco_instalacao || '—'}</span></div>
                                    </div>

                                    <div class="rf-section-title">Seção III - Período Contratual</div>
                                    <div class="rf-grid">
                                        <div class="rf-grid-cell"><span class="rf-label">Início</span><span class="rf-value">${payload.periodo_inicio ? payload.periodo_inicio.split('-').reverse().join('/') : '—'}</span></div>
                                        <div class="rf-grid-cell"><span class="rf-label">Fim</span><span class="rf-value">${payload.periodo_fim ? payload.periodo_fim.split('-').reverse().join('/') : '—'}</span></div>
                                        <div class="rf-grid-cell"><span class="rf-label">Dias Contrato</span><span class="rf-value">${payload.dias_contrato} dias</span></div>
                                    </div>

                                    <div class="rf-section-title">Seção IV - Composição da Proposta</div>
                                    <table class="rf-table">
                                        <thead>
                                            <tr>
                                                <th style="text-align:center; width:40px;">#</th>
                                                <th>Descrição</th>
                                                <th style="text-align:center; width:60px;">Qtd</th>
                                                <th style="text-align:right; width:120px;">Unitário</th>
                                                <th style="text-align:right; width:120px;">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${itensHtml || `<tr><td colspan="5" style="text-align:center; color:#94a3b8; padding:1rem;">Nenhum produto/item adicionado.</td></tr>`}
                                        </tbody>
                                    </table>

                                    <div class="rf-section-title">Seção V - Resumo de Valores</div>
                                    <div class="rf-grid">
                                        <div class="rf-grid-cell"><span class="rf-label">Serviço/Equipamento</span><span class="rf-value">${fmt(precoServico)}</span></div>
                                        <div class="rf-grid-cell"><span class="rf-label">Total Frete</span><span class="rf-value">${fmt(payload.valor_frete_ida + payload.valor_frete_volta)}</span></div>
                                        <div class="rf-grid-cell"><span class="rf-label">Adicionais (Zona & KM)</span><span class="rf-value">${fmt(payload.valor_zona_calculado + payload.valor_distancia_calculado)}</span></div>
                                        <div class="rf-grid-cell" style="background:#f0fdf4; border-left: 1px solid #cbd5e1;"><span class="rf-label" style="color:#166534;">Valor Total Final</span><span class="rf-value" style="color:#166534; font-size:1rem;">${fmt(payload.valor_total)}</span></div>
                                    </div>
                                </div>
                            </div>

                            <!-- BOX RECEITA FEDERAL DETALHADO (DRE) -->
                            <div id="panel-resumo-detalhado" style="display:none;">
                                <div class="rf-box" style="border-color:#1e3a8a;">
                                    <div class="rf-header" style="background:#1e3a8a;">
                                        <div class="rf-header-title">AMERICA RENTAL LOCAÇÃO DE EQUIPAMENTOS</div>
                                        <div>DEMONSTRATIVO DE VIABILIDADE FINANCEIRA (DRE OPERACIONAL)</div>
                                    </div>
                                    
                                    <div class="rf-section-title" style="background:#eff6ff; color:#1e40af; border-top-color:#1e3a8a;">Seção I - Detalhes de Rateio e Ficha Técnica</div>
                                    <div class="rf-grid">
                                        <div class="rf-grid-cell"><span class="rf-label">Código Ficha</span><span class="rf-value">${code}</span></div>
                                        <div class="rf-grid-cell"><span class="rf-label">Tempo Execução</span><span class="rf-value">${dre.tempoExecucao} h</span></div>
                                        <div class="rf-grid-cell"><span class="rf-label">Despesas Fixas Mensais</span><span class="rf-value">${fmt(dre.despesasFixasMensais)}</span></div>
                                        <div class="rf-grid-cell"><span class="rf-label">Modelo de Cálculo</span><span class="rf-value" style="text-transform:uppercase;">${dre.modeloCalculo.replace('_', ' ')}</span></div>
                                    </div>

                                    <div class="rf-section-title" style="background:#eff6ff; color:#1e40af; border-top-color:#1e3a8a;">Seção II - Estrutura de Custos, Despesas e Margem (DRE)</div>
                                    
                                    <table class="rf-table" style="font-size:0.8rem;">
                                        <thead>
                                            <tr style="background:#f1f5f9; border-bottom: 2px solid #cbd5e1;">
                                                <th style="text-align:left;">Conta / Descritivo do DRE</th>
                                                <th style="text-align:right; width:130px;">Valor</th>
                                                <th style="text-align:right; width:80px;">% Part.</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td style="font-weight:bold; color:#0f172a;">(+) RECEITA OPERACIONAL BRUTA (Serviços/Equipamentos)</td>
                                                <td style="text-align:right; font-weight:bold; color:#0f172a;">${fmt(precoServico)}</td>
                                                <td style="text-align:right; color:#64748b;">${pctPart(precoServico, totalReceita)}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding-left:1.5rem; color:#475569;">(+) Adicional de Zona (Região de Instalação)</td>
                                                <td style="text-align:right; color:#475569;">${fmt(payload.valor_zona_calculado)}</td>
                                                <td style="text-align:right; color:#64748b;">${pctPart(payload.valor_zona_calculado, totalReceita)}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding-left:1.5rem; color:#475569;">(+) Transporte e Deslocamento (Distância KM)</td>
                                                <td style="text-align:right; color:#475569;">${fmt(payload.valor_distancia_calculado)}</td>
                                                <td style="text-align:right; color:#64748b;">${pctPart(payload.valor_distancia_calculado, totalReceita)}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding-left:1.5rem; color:#475569;">(+) Frete de Ida / Volta</td>
                                                <td style="text-align:right; color:#475569;">${fmt(payload.valor_frete_ida + payload.valor_frete_volta)}</td>
                                                <td style="text-align:right; color:#64748b;">${pctPart(payload.valor_frete_ida + payload.valor_frete_volta, totalReceita)}</td>
                                            </tr>
                                            <tr style="background:#f8fafc; border-top:1px solid #cbd5e1; border-bottom:1.5px solid #94a3b8;">
                                                <td style="font-weight:bold; color:#0f172a;">(=) RECEITA BRUTA OPERACIONAL TOTAL</td>
                                                <td style="text-align:right; font-weight:bold; color:#0f172a;">${fmt(totalReceita)}</td>
                                                <td style="text-align:right; color:#64748b;">100,00%</td>
                                            </tr>
                                            <tr>
                                                <td style="font-weight:bold; color:#b91c1c;">(-) DEDUÇÕES DA RECEITA (Descontos)</td>
                                                <td style="text-align:right; font-weight:bold; color:#b91c1c;">${fmt(desconto)}</td>
                                                <td style="text-align:right; color:#64748b;">${pctPart(desconto, totalReceita)}</td>
                                            </tr>
                                            <tr style="background:#f1f5f9; border-top:1.5px solid #cbd5e1; border-bottom:1.5px solid #cbd5e1;">
                                                <td style="font-weight:bold; color:#1e3a8a;">(=) RECEITA LÍQUIDA OPERACIONAL</td>
                                                <td style="text-align:right; font-weight:bold; color:#1e3a8a;">${fmt(receitaLiquida)}</td>
                                                <td style="text-align:right; font-weight:bold; color:#1e3a8a;">${pctPart(receitaLiquida, totalReceita)}</td>
                                            </tr>
                                            <tr>
                                                <td style="font-weight:bold; color:#b91c1c;">(-) CUSTOS VARIÁVEIS OPERACIONAIS</td>
                                                <td style="text-align:right; font-weight:bold; color:#b91c1c;">${fmt(custoVariavelTotal)}</td>
                                                <td style="text-align:right; color:#64748b;">${pctPart(custoVariavelTotal, totalReceita)}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding-left:1.5rem; color:#475569;">(-) Custos Variáveis de Ficha (MDO/Insumo)</td>
                                                <td style="text-align:right; color:#475569;">${fmt(dre.custoVariavel)}</td>
                                                <td style="text-align:right; color:#64748b;">${pctPart(dre.custoVariavel, totalReceita)}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding-left:1.5rem; color:#475569;">(-) Despesas Variáveis de Ficha</td>
                                                <td style="text-align:right; color:#475569;">${fmt(dre.despesaVariavel)}</td>
                                                <td style="text-align:right; color:#64748b;">${pctPart(dre.despesaVariavel, totalReceita)}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding-left:1.5rem; color:#475569;">(-) Custo Variável de Transporte (KM)</td>
                                                <td style="text-align:right; color:#475569;">${fmt(payload.valor_distancia_calculado)}</td>
                                                <td style="text-align:right; color:#64748b;">${pctPart(payload.valor_distancia_calculado, totalReceita)}</td>
                                            </tr>
                                            <tr style="background:#f0fdf4; border-top:1px solid #cbd5e1; border-bottom:1.5px solid #cbd5e1;">
                                                <td style="font-weight:bold; color:#15803d;">(=) MARGEM DE CONTRIBUIÇÃO LÍQUIDA</td>
                                                <td style="text-align:right; font-weight:bold; color:#15803d;">${fmt(margemContrib)}</td>
                                                <td style="text-align:right; font-weight:bold; color:#15803d;">${pctPart(margemContrib, totalReceita)}</td>
                                            </tr>
                                            <tr>
                                                <td style="font-weight:bold; color:#b91c1c;">(-) CUSTOS E DESPESAS FIXAS PROPORCIONAIS</td>
                                                <td style="text-align:right; font-weight:bold; color:#b91c1c;">${fmt(custosFixosTotais)}</td>
                                                <td style="text-align:right; color:#64748b;">${pctPart(custosFixosTotais, totalReceita)}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding-left:1.5rem; color:#475569;">(-) Custos Fixos de Ficha (MDO/Insumo)</td>
                                                <td style="text-align:right; color:#475569;">${fmt(dre.custoFixo)}</td>
                                                <td style="text-align:right; color:#64748b;">${pctPart(dre.custoFixo, totalReceita)}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding-left:1.5rem; color:#475569;">(-) Despesas Fixas Ficha (Administrativo)</td>
                                                <td style="text-align:right; color:#475569;">${fmt(dre.despesaFixa)}</td>
                                                <td style="text-align:right; color:#64748b;">${pctPart(dre.despesaFixa, totalReceita)}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding-left:1.5rem; color:#475569;">(-) Rateio de Despesas Fixas do Período</td>
                                                <td style="text-align:right; color:#475569;">${fmt(dre.rateioDespesasFixas)}</td>
                                                <td style="text-align:right; color:#64748b;">${pctPart(dre.rateioDespesasFixas, totalReceita)}</td>
                                            </tr>
                                            <tr style="background:#ecfdf5; border-top:2px solid #065f46; border-bottom:2px solid #065f46;">
                                                <td style="font-weight:bold; color:#065f46; font-size:0.85rem;">(=) RESULTADO OPERACIONAL LÍQUIDO (Lucro Estimado)</td>
                                                <td style="text-align:right; font-weight:bold; color:#065f46; font-size:0.85rem;">${fmt(lucroLiquido)}</td>
                                                <td style="text-align:right; font-weight:bold; color:#065f46; font-size:0.85rem;">${pctPart(lucroLiquido, totalReceita)}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                        </div>

                        <!-- Footer Actions -->
                        <div style="display:flex; justify-content: flex-end; gap:0.55rem; padding: 0.75rem 1.5rem; background: #f8fafc; border-top: 1px solid #e2e8f0; border-bottom-left-radius: 12px; border-bottom-right-radius: 12px;">
                            <button type="button" onclick="window.imprimirPropostaResumo()" style="background:#3b82f6; color:#fff; border:none; padding:0.5rem 1.1rem; border-radius:6px; font-weight:600; font-size:0.82rem; cursor:pointer; display:inline-flex; align-items:center; gap:5px; outline:none;" onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'"><i class="ph ph-printer"></i> Salvar e Imprimir</button>
                            <button type="button" onclick="Swal.close()" style="background:#94a3b8; color:#fff; border:none; padding:0.5rem 1.1rem; border-radius:6px; font-weight:600; font-size:0.82rem; cursor:pointer; outline:none;" onmouseover="this.style.background='#64748b'" onmouseout="this.style.background='#94a3b8'">Cancelar</button>
                            <button type="button" onclick="window.confirmarSalvarProposta(false)" style="background:#16a34a; color:#fff; border:none; padding:0.5rem 1.1rem; border-radius:6px; font-weight:600; font-size:0.82rem; cursor:pointer; display:inline-flex; align-items:center; gap:5px; outline:none;" onmouseover="this.style.background='#15803d'" onmouseout="this.style.background='#16a34a'"><i class="ph ph-check"></i> Confirmar e Salvar</button>
                        </div>
                    </div>
                `,
                showConfirmButton: false
            });
        } catch (dreErr) {
            console.error(dreErr);
            Swal.fire('Erro', 'Erro ao processar demonstrativos DRE: ' + dreErr.message, 'error');
        }
    })();
};

window.obterDadosDREProposta = async function(payload) {
    let result = {
        custoFixo: 0,
        custoVariavel: 0,
        despesaFixa: 0,
        despesaVariavel: 0,
        despesasFixasMensais: 0,
        rateioDespesasFixas: 0,
        tempoExecucao: 0,
        margemLucro: 0,
        modeloCalculo: 'por_fora'
    };

    if (!payload.servico_precificacao_id) {
        return result;
    }

    const s = _precificacaoServicosList.find(x => x.id == payload.servico_precificacao_id);
    if (!s) return result;

    const code = `SVC-${String(s.id).padStart(4, '0')}`;
    try {
        const viab = _comercialViabilidades.find(v => v.servico_codigo === code) || 
                     await apiGet(`/comercial/precificacao-viabilidade/${code}`);
        const fichaDetalhes = _comercialFichas.find(f => f.servico_codigo === code) || 
                              await apiGet(`/comercial/servicos-ficha/${code}`);
        
        if (viab) {
            result.despesasFixasMensais = viab.despesas_fixas_mensais || 0;
            result.rateioDespesasFixas = viab.rateio_despesas_fixas || 0;
            result.margemLucro = viab.margem_lucro || 0;
            result.modeloCalculo = viab.modelo_calculo || 'por_fora';
        }

        if (fichaDetalhes) {
            result.tempoExecucao = fichaDetalhes.tempo_execucao || 0;
            
            let itens = fichaDetalhes.itens;
            if (!itens) {
                const fullFicha = await apiGet(`/comercial/servicos-ficha/${code}`);
                if (fullFicha) itens = fullFicha.itens;
            }

            if (itens) {
                itens.forEach(item => {
                    const itemObj = _comercialItensCusto.find(i => i.id == item.item_custo_id);
                    if (itemObj) {
                        const custoHora = _obterCustoHoraItem(itemObj);
                        const isHourly = (itemObj.unidade_medida || '').toUpperCase() === 'H' || itemObj.categoria === 'MDO' || itemObj.natureza === 'Fixo';
                        const itemTotal = (item.qtd_padrao || 0) * custoHora * (isHourly ? result.tempoExecucao : 1);
                        
                        const isCusto = ['MDO', 'Insumo'].includes(itemObj.categoria);
                        if (isCusto) {
                            if (itemObj.natureza === 'Fixo') {
                                result.custoFixo += itemTotal;
                            } else {
                                result.custoVariavel += itemTotal;
                            }
                        } else {
                            if (itemObj.natureza === 'Fixo') {
                                result.despesaFixa += itemTotal;
                            } else {
                                result.despesaVariavel += itemTotal;
                            }
                        }
                    }
                });
            }
        }
    } catch(err) {
        console.error("Erro ao obter dados DRE da proposta:", err);
    }
    return result;
};

window.toggleResumoModalTab = function(tab) {
    const sPanel = document.getElementById('panel-resumo-simplificado');
    const dPanel = document.getElementById('panel-resumo-detalhado');
    const sBtn = document.getElementById('btn-resumo-simplificado');
    const dBtn = document.getElementById('btn-resumo-detalhado');

    if (tab === 'simplificado') {
        if (sPanel) sPanel.style.display = 'block';
        if (dPanel) dPanel.style.display = 'none';
        if (sBtn) {
            sBtn.style.background = '#f1f5f9';
            sBtn.style.borderBottom = '3px solid #3b82f6';
            sBtn.style.fontWeight = 'bold';
            sBtn.style.color = '#0f172a';
        }
        if (dBtn) {
            dBtn.style.background = 'transparent';
            dBtn.style.borderBottom = 'none';
            dBtn.style.fontWeight = 'normal';
            dBtn.style.color = '#64748b';
        }
    } else {
        if (sPanel) sPanel.style.display = 'none';
        if (dPanel) dPanel.style.display = 'block';
        if (dBtn) {
            dBtn.style.background = '#f1f5f9';
            dBtn.style.borderBottom = '3px solid #3b82f6';
            dBtn.style.fontWeight = 'bold';
            dBtn.style.color = '#0f172a';
        }
        if (sBtn) {
            sBtn.style.background = 'transparent';
            sBtn.style.borderBottom = 'none';
            sBtn.style.fontWeight = 'normal';
            sBtn.style.color = '#64748b';
        }
    }
};

window.imprimirPropostaResumo = function() {
    window.confirmarSalvarProposta(true);
};

window.confirmarSalvarProposta = async function(shouldPrint = false) {
    Swal.fire({
        title: 'Salvando Proposta...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    try {
        let resp;
        if (_propostasEditandoId) {
            resp = await apiPut(`/propostas/${_propostasEditandoId}`, window._cachedProposalPayload);
        } else {
            resp = await apiPost('/propostas', window._cachedProposalPayload);
        }

        if (resp && (resp.success || resp.id)) {
            fecharFormProposta();
            await carregarPropostas();
            renderTelaPropostas();
            
            const finalId = _propostasEditandoId || resp.id;
            
            if (typeof mostrarToastSucesso === 'function') {
                mostrarToastSucesso(_propostasEditandoId ? 'Proposta atualizada com sucesso!' : 'Proposta salva com sucesso!');
            }

            Swal.close();

            if (shouldPrint && finalId) {
                imprimirProposta(finalId);
            }
        } else {
            Swal.fire('Erro', 'Erro ao salvar proposta: ' + (resp?.error || 'Erro desconhecido'), 'error');
        }
    } catch(err) {
        console.error(err);
        Swal.fire('Erro', 'Erro ao comunicar com o servidor: ' + err.message, 'error');
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
        motivo_reprovacao: obter('prop-motivo-reprovacao'),
        criado_por: window.currentUser?.nome || window.currentUser?.email || '',
        itens: window._propProdutosAdicionados || [],
        servico_precificacao_id: document.getElementById('prop-servico-precificado')?.value ? parseInt(document.getElementById('prop-servico-precificado').value) : null,
        regiao: _propRegiaoIdentificada || null
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
async function imprimirProposta(id) {
    const p = _propostasData.find(pr => pr.id === id);
    if (!p) { alert('Proposta não encontrada.'); return; }

    Swal.fire({
        title: 'Preparando impressão...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    let modelObj = null;
    let textosLegais = [];
    let cnpj = '—';

    try {
        const models = await apiGet('/comercial/modelos-contrato') || [];
        modelObj = models.find(m => m.nome === p.modelo_impressao);
        
        if (modelObj) {
            textosLegais = await apiGet('/comercial/textos-legais') || [];
            const clients = await apiGet('/clientes') || [];
            const client = clients.find(c => c.nome_razao_social === p.cliente_nome || c.nome_fantasia === p.cliente_nome);
            if (client) {
                cnpj = client.cpf_cnpj || '—';
            }
        }
        Swal.close();
    } catch (err) {
        Swal.close();
        console.error("Erro ao carregar dados para impressão do contrato:", err);
    }

    const win = window.open('', '_blank', 'width=900,height=700');
    const fmtMoeda = (v) => 'R$ ' + Number(v||0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    const fmtData = (s) => _fmtData(s);

    if (modelObj) {
        // Render custom contract layout
        let caputs = [];
        try {
            caputs = JSON.parse(modelObj.caputs || '[]');
        } catch (e) {
            console.error("Erro ao fazer parse dos caputs:", e);
        }

        let clausesHtml = '';
        caputs.forEach((cpt, idx) => {
            let text = cpt.conteudo || '';
            if (cpt.tipo === 'TEXTO_LEGAL') {
                const legal = textosLegais.find(l => l.id === Number(cpt.textoLegalId));
                text = legal ? legal.texto_legal : '—';
            }

            // Replace placeholders
            text = text.replace(/\{\{CLIENTE_RAZAO\}\}/g, p.cliente_nome || '—')
                       .replace(/\{\{CLIENTE_NOME\}\}/g, p.cliente_nome || '—')
                       .replace(/\{\{CLIENTE_CNPJ\}\}/g, cnpj)
                       .replace(/\{\{CLIENTE_ENDERECO\}\}/g, p.endereco_instalacao || '—')
                       .replace(/\{\{VALOR_TOTAL\}\}/g, fmtMoeda(p.valor_total))
                       .replace(/\{\{VALOR_EXTENSO\}\}/g, valorPorExtenso(p.valor_total))
                       .replace(/\{\{TABELA_PRECO\}\}/g, p.tabela_precos || '—')
                       .replace(/\{\{CONDICAO_PAGAMENTO\}\}/g, p.condicao_pagamento || '—')
                       .replace(/\{\{PERIODO_INICIO\}\}/g, fmtData(p.periodo_inicio))
                       .replace(/\{\{PERIODO_FIM\}\}/g, fmtData(p.periodo_fim))
                       .replace(/\{\{DIAS_CONTRATO\}\}/g, p.dias_contrato || 0);

            clausesHtml += `
                <div class="section" style="margin-bottom: 20px; line-height: 1.5; text-align: justify;">
                    <h3 style="font-size: 11pt; font-weight: bold; color: #1e293b; text-transform: uppercase; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px;">
                        Cláusula ${idx + 1}ª: ${cpt.titulo || ''}
                    </h3>
                    <p style="margin: 0; font-size: 10.5pt; color: #334155;">${text}</p>
                </div>
            `;
        });

        win.document.write(`<!DOCTYPE html><html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <title>Contrato - ${p.codigo}</title>
            <style>
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; color: #111827; background: #fff; padding: 40px; }
                .header-contrato { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #111827; padding-bottom: 15px; }
                .header-contrato h1 { font-size: 15pt; font-weight: bold; text-transform: uppercase; margin-bottom: 5px; }
                .header-contrato p { font-size: 10pt; color: #4b5563; }
                .signatures { margin-top: 50px; display: grid; grid-template-columns: 1fr 1fr; gap: 50px; page-break-inside: avoid; }
                .sig-box { border-top: 1px solid #111827; padding-top: 8px; text-align: center; }
                .sig-box p { font-size: 10pt; font-weight: bold; }
                .sig-box span { font-size: 9pt; color: #4b5563; display: block; margin-top: 2px; }
                @media print { body { padding: 20px; } .no-print { display: none; } }
            </style>
        </head>
        <body>
            <div class="header-contrato">
                <h1>Instrumento Particular de Contrato de Locação</h1>
                <p>Vinculado à Proposta Comercial nº ${p.codigo || '—'} · América Rental Equipamentos</p>
            </div>

            <div class="contrato-body" style="margin-top: 15px;">
                ${clausesHtml}
            </div>

            <div class="signatures">
                <div class="sig-box">
                    <p>CONTRATANTE</p>
                    <span>${p.cliente_nome}</span>
                    <span>CNPJ/CPF: ${cnpj}</span>
                </div>
                <div class="sig-box">
                    <p>CONTRATADA</p>
                    <span>AMÉRICA RENTAL EQUIPAMENTOS LTDA</span>
                    <span>CNPJ: 02.089.969/0001-06</span>
                </div>
            </div>

            <div class="no-print" style="text-align:center; margin-top:40px;">
                <button onclick="window.print(); window.close();" style="background:#111827;color:white;border:none;padding:10px 24px;border-radius:6px;cursor:pointer;font-size:11pt;font-weight:700;">
                    🖨️ Imprimir Contrato / Salvar PDF
                </button>
            </div>
        </body></html>`);
    } else {
        // Fallback default simple layout
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
    }

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
                padding: 0.15rem 0.45rem !important;
                border: 1px solid #cbd5e1 !important;
                border-radius: 4px !important;
                font-size: 0.76rem !important;
                background: #fff !important;
                color: #1e293b !important;
                outline: none !important;
                transition: all 0.2s !important;
                box-sizing: border-box !important;
                width: 100% !important;
                height: 28px !important;
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
                border-radius: 4px !important;
                height: 28px !important;
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
                width: 28px !important;
                padding: 0 !important;
            }
            #form-cadastro-cliente button[title="Buscar Cliente"]:hover,
            #form-cadastro-cliente button[id="btn-busca-cnpj"]:hover,
            #form-cadastro-cliente button[title="Buscar CEP"]:hover {
                background-color: #15803d !important;
            }
            #form-cadastro-cliente button[title="Limpar/Novo"] {
                background-color: #475569 !important;
                font-size: 0.76rem !important;
                padding: 0 0.65rem !important;
            }
            #form-cadastro-cliente button[title="Limpar/Novo"]:hover {
                background-color: #334155 !important;
            }
        </style>
        <div style="background:#fff; width:100%; border-radius:14px; box-shadow:0 5px 20px rgba(0,0,0,0.05); overflow:visible; margin:0 auto; border: 1px solid #e2e8f0; font-family:'Inter', sans-serif;">
            
            <!-- Toolbar -->
            <div id="prop-toolbar-cliente" style="background:#f8fafc; border-bottom:1px solid #e2e8f0; padding:0.65rem 1.5rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.6rem; position:sticky; top:0; z-index:997; border-top-left-radius:14px; border-top-right-radius:14px;">
                
                <!-- Badge Lado Esquerdo: Dropdown de Navegação -->
                <div class="saas-dropdown-container">
                    <div class="saas-nav-item active" id="tab-prop-lista" onclick="switchPropostaTab('lista')" style="display: flex; align-items: center; gap: 0.25rem;">
                        <i class="ph ph-list-bullets"></i> Lista de Propostas <i class="ph ph-caret-down" style="font-size: 0.8rem; opacity: 0.7;"></i>
                    </div>
                    <div class="saas-dropdown-menu">
                        <div class="saas-dropdown-item" onclick="abrirFormProposta(null); event.stopPropagation();">
                            <i class="ph ph-pencil-simple"></i> Nova Proposta
                        </div>
                        <div class="saas-dropdown-item" onclick="switchPropostaTab('cadastro-cliente'); event.stopPropagation();">
                            <i class="ph ph-user-plus"></i> Cadastro de Clientes
                        </div>
                        <div class="saas-dropdown-item" onclick="switchPropostaTab('cadastro-contatos'); event.stopPropagation();">
                            <i class="ph ph-identification-card"></i> Cadastro de Contatos
                        </div>
                        <div class="saas-dropdown-item" onclick="switchPropostaTab('enderecos'); event.stopPropagation();">
                            <i class="ph ph-map-pin"></i> Endereços
                        </div>
                        <div class="saas-dropdown-item" id="tab-prop-servicos-precificacao" onclick="switchPropostaTab('servicos-precificacao'); event.stopPropagation();">
                            <i class="ph ph-calculator"></i> Precificação de Serviços
                        </div>
                        <div class="saas-dropdown-item" id="tab-prop-modelos-contrato" onclick="switchPropostaTab('modelos-contrato'); event.stopPropagation();">
                            <i class="ph ph-file-text"></i> Modelos de Contrato
                        </div>
                    </div>
                </div>

                <!-- Botões de Ação (Lado Direito) -->
                <div style="display:flex; gap:0.4rem; align-items:center; flex-wrap:wrap;">
                    <button onclick="recarregarCliente()" title="Recarregar" style="background:#e2e8f0; color:#475569; border:none; width:34px; height:34px; border-radius:6px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; transition:all 0.15s; outline:none;" onmouseover="this.style.background='#cbd5e1'" onmouseout="this.style.background='#e2e8f0'">
                        <i class="ph ph-arrows-clockwise" style="font-size:1.15rem;"></i>
                    </button>

                    <!-- Spacer -->
                    <div style="width: 4px;"></div>

                    <button onclick="salvarCliente()" style="background:#16a34a; color:white; border:none; padding:0.45rem 1rem; border-radius:6px; cursor:pointer; font-weight:600; font-size:0.82rem; display:inline-flex; align-items:center; gap:5px; transition:background 0.15s;" onmouseover="this.style.background='#15803d'" onmouseout="this.style.background='#16a34a'" onfocus="this.blur()">
                        <i class="ph ph-check" style="font-size:1rem;"></i> Salvar
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
            <div style="padding:1.5rem;">
                
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
                    
                    <!-- Grid Principal: Campos -->
                    <div style="margin-bottom:1.5rem; display:grid; gap:0.85rem;">
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

                    <!-- Contatos: Telefone, Celular, Whatsapp, CRM -->
                    <div style="display:grid; grid-template-columns:1.5fr 2fr auto 1.5fr; gap:0.75rem; margin-top:0.85rem; align-items:end;">
                        <div>
                            <label class="prop-lbl">Telefone</label>
                            <input type="text" id="cli-telefone" style="width:100%;padding:0.45rem;border:1px solid #cbd5e1;border-radius:4px;font-size:0.85rem;box-sizing:border-box;">
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
                                    <span>E-mail de Cobrança: Enviar</span>
                                    <input type="number" id="cli-email-cob-antecedencia" value="5" style="width:45px; text-align:center; padding:4px; border:1px solid #cbd5e1; border-radius:6px; height:30px; box-sizing:border-box; outline:none; font-family:'Inter', sans-serif;">
                                    <span>dias antes e</span>
                                    <input type="number" id="cli-email-cob-posterior" value="5" style="width:45px; text-align:center; padding:4px; border:1px solid #cbd5e1; border-radius:6px; height:30px; box-sizing:border-box; outline:none; font-family:'Inter', sans-serif;">
                                    <span>dias após o vencimento</span>
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
                                <table style="width:100%; border-collapse:collapse; font-size:0.82rem; font-family:'Inter', sans-serif;">
                                    <thead>
                                        <tr style="background:#f8fafc; border-bottom:2px solid #cbd5e1; text-align:left;">
                                            <th style="padding:0.75rem 1rem; font-weight:700; color:#475569; font-size:0.75rem; text-transform:uppercase; letter-spacing:0.02em; width:30%;">Nome</th>
                                            <th style="padding:0.75rem 1rem; font-weight:700; color:#475569; font-size:0.75rem; text-transform:uppercase; letter-spacing:0.02em; width:20%; white-space:nowrap;">Cargo</th>
                                            <th style="padding:0.75rem 1rem; font-weight:700; color:#475569; font-size:0.75rem; text-transform:uppercase; letter-spacing:0.02em; width:15%; white-space:nowrap;">Celular</th>
                                            <th style="padding:0.75rem 1rem; font-weight:700; color:#475569; font-size:0.75rem; text-transform:uppercase; letter-spacing:0.02em; width:30%;">E-mail</th>
                                            <th style="padding:0.75rem 1rem; font-weight:700; color:#475569; font-size:0.75rem; text-transform:uppercase; letter-spacing:0.02em; text-align:center; width:5%; white-space:nowrap;">Ações</th>
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
        const setElVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
        setElVal('cli-ramal', c.ramal || '');
        setElVal('cli-telefone2', c.telefone_2 || '');
        setElVal('cli-ramal2', c.ramal_2 || '');
        setElVal('cli-fax', c.fax || '');
        setElVal('cli-website', c.website || '');
        setElVal('cli-celular-ddi', c.celular_ddi || '+55 (BRASIL)');
        document.getElementById('cli-celular').value = c.celular || '';

        // Carregar contatos e acordeões com mesclagem da tabela contatos
        try {
            const allContatos = await apiGet('/contatos') || [];
            const clientContatos = allContatos.filter(con => con.cliente_id === c.id);
            const mappedContatos = clientContatos.map(con => ({
                id: con.id,
                identificacao: con.codigo || '',
                nome: con.nome || '',
                departamento: con.departamento || '',
                celular: con.celular || '',
                telefone_ramal: con.telefone ? (con.ramal ? `${con.telefone} Ramal ${con.ramal}` : con.telefone) : '',
                email: con.email || '',
                dono: con.representante || '',
                cargo: con.cargo || '',
                situacao: con.inativo === 1 ? 'Inativo' : 'Ativo',
                nfe: con.email_nfe === 1 ? 'Sim' : 'Não',
                cobranca: con.email_cobranca === 1 ? 'Sim' : 'Não',
                os: con.email_os === 1 ? 'Sim' : 'Não',
                contrato: con.email_contrato === 1 ? 'Sim' : 'Não',
                origem: con.origem || '',
                inativo: con.inativo === 1 ? 'Sim' : 'Não'
            }));

            let jsonContatos = [];
            try {
                jsonContatos = JSON.parse(c.contatos || '[]');
            } catch(e) {}

            const merged = [...mappedContatos];
            jsonContatos.forEach(jc => {
                if (jc && jc.nome && !merged.some(dc => dc.nome.toLowerCase() === jc.nome.toLowerCase())) {
                    merged.push(jc);
                }
            });
            _clienteContatos = merged;
        } catch(e) {
            console.error('Erro ao carregar contatos da tabela:', e);
            try {
                _clienteContatos = JSON.parse(c.contatos || '[]');
            } catch(err) {
                _clienteContatos = [];
            }
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
                <td colspan="5" style="padding:1rem; text-align:center; color:#94a3b8;">
                    Nenhum contato adicionado.
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = _clienteContatos.map((c, idx) => `
        <tr ondblclick="if (${c.id || 0}) window.editarContatoDeCliente(${c.id || 0})" style="border-bottom:1px solid #f1f5f9; transition:background 0.15s; cursor:pointer;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''" title="Duplo clique para editar contato">
            <td style="padding:0.75rem 1rem; color:#1e293b; font-weight:600; word-break:break-word;">${c.nome}</td>
            <td style="padding:0.75rem 1rem; color:#475569; white-space:nowrap;">${c.cargo || '—'}</td>
            <td style="padding:0.75rem 1rem; color:#475569; white-space:nowrap;">${c.celular || '—'}</td>
            <td style="padding:0.75rem 1rem; color:#475569; word-break:break-all;">${c.email || '—'}</td>
            <td style="padding:0.75rem 1rem; text-align:center; white-space:nowrap;">
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

    const razaoInput = document.getElementById('cli-razao-social');
    const rawRazao = razaoInput ? razaoInput.value.trim().toLowerCase() : '';

    if (!_clienteEditandoId && (cleanCnpj || rawRazao)) {
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

    try {
        const clientes = await apiGet('/clientes') || [];
        const client = clientes.find(c => c.id === _clienteEditandoId);

        if (!client) {
            Swal.fire({
                title: 'Erro',
                text: 'Cliente selecionado não foi encontrado no banco de dados.',
                icon: 'error',
                confirmButtonColor: '#ef4444',
                confirmButtonText: 'Ok'
            });
            return;
        }

        Swal.fire({
            title: '',
            width: '1100px',
            customClass: {
                popup: 'custom-swal-height-large'
            },
            showConfirmButton: false,
            html: `
                <style>
                    .mcon-container {
                        background: #fff;
                        width: 100%;
                        text-align: left;
                        font-family: 'Inter', sans-serif;
                    }
                    .mcon-toolbar {
                        background: #f8fafc;
                        border-bottom: 1px solid #e2e8f0;
                        padding: 0.4rem 0.8rem;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        flex-wrap: wrap;
                        gap: 0.4rem;
                        position: sticky;
                        top: 0;
                        z-index: 997;
                        border-top-left-radius: 12px;
                        border-top-right-radius: 12px;
                    }
                    .mcon-form-body {
                        padding: 0.8rem 1.0rem;
                        max-height: 420px;
                        overflow-y: auto;
                    }
                    .mcon-section-title {
                        font-size: 0.8rem !important;
                        font-weight: 800 !important;
                        color: #475569 !important;
                        text-transform: uppercase !important;
                        letter-spacing: 0.04em !important;
                        border-bottom: 2px solid #e2e8f0 !important;
                        padding-bottom: 0.25rem !important;
                        margin: 0.8rem 0 0.5rem 0 !important;
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                    }
                    .mcon-section-title.first {
                        margin-top: 0 !important;
                    }
                    .mcon-grid {
                        display: grid;
                        gap: 0.4rem 0.6rem;
                    }
                    .mcon-grid-contact-row1 {
                        grid-template-columns: 1.5fr 3.5fr 2fr 2fr;
                    }
                    .mcon-grid-contact-row2 {
                        grid-template-columns: 1.5fr 1.5fr 1.5fr 1.2fr 1.2fr 1.5fr;
                    }
                    .mcon-grid-contact-row3 {
                        grid-template-columns: 1.5fr 1.5fr 1.2fr 1.8fr 1.2fr 1.2fr;
                    }
                    .mcon-grid-contact-row4 {
                        grid-template-columns: 1.5fr 0.8fr 4fr;
                    }
                    .mcon-grid-company-row1 {
                        grid-template-columns: 4fr 2fr 1.5fr;
                    }
                    .mcon-grid-company-row2 {
                        grid-template-columns: 3.5fr 1fr 2fr 2.5fr 1fr;
                    }
                    .mcon-grid-company-row3 {
                        grid-template-columns: 1.5fr 0.8fr 1.5fr 1.5fr 0.8fr 2fr;
                    }
                    .mcon-field {
                        display: flex;
                        flex-direction: column;
                        gap: 0.2rem;
                    }
                    .mcon-field label {
                        font-size: 0.7rem !important;
                        font-weight: 700 !important;
                        color: #64748b !important;
                        text-transform: uppercase !important;
                        letter-spacing: 0.02em !important;
                        margin-bottom: 2px !important;
                    }
                    .mcon-input, .mcon-select {
                        padding: 0.15rem 0.45rem !important;
                        border: 1px solid #cbd5e1 !important;
                        border-radius: 4px !important;
                        font-size: 0.76rem !important;
                        background: #fff !important;
                        color: #1e293b !important;
                        outline: none !important;
                        transition: all 0.2s !important;
                        box-sizing: border-box !important;
                        width: 100% !important;
                        height: 28px !important;
                        font-family: 'Inter', sans-serif !important;
                    }
                    .mcon-input:focus, .mcon-select:focus {
                        border-color: #3b82f6 !important;
                        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15) !important;
                    }
                    .mcon-input[readonly] {
                        background: #f1f5f9 !important;
                        color: #64748b !important;
                        cursor: not-allowed !important;
                    }
                    .mcon-input-group {
                        display: flex;
                        gap: 0.35rem;
                        width: 100%;
                    }
                    .mcon-btn-addon {
                        background: #16a34a;
                        color: #fff;
                        border: none;
                        padding: 0.2rem 0.5rem;
                        border-radius: 4px;
                        cursor: pointer;
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        font-weight: 600;
                        font-size: 0.76rem;
                        transition: all 0.2s;
                        height: 28px;
                        box-sizing: border-box;
                    }
                    .mcon-btn-addon:hover {
                        background: #15803d;
                    }
                    .mcon-btn-addon.secondary {
                        background: #475569;
                    }
                    .mcon-btn-addon.secondary:hover {
                        background: #334155;
                    }
                    .mcon-btn-addon.success {
                        background: #25d366;
                    }
                    .mcon-btn-addon.success:hover {
                        background: #20ba5a;
                    }
                    .mcon-ribbon-checkboxes {
                        display: flex;
                        gap: 12px;
                        font-size: 0.76rem;
                        align-items: center;
                        font-weight: 600;
                        font-family: 'Inter', sans-serif;
                    }
                    .mcon-ribbon-checkboxes label {
                        display: inline-flex;
                        align-items: center;
                        gap: 4px;
                        cursor: pointer;
                    }
                </style>

                <div class="mcon-container">
                    <!-- Toolbar Superior -->
                    <div class="mcon-toolbar">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span style="font-weight:800; font-size:0.85rem; color:#1e293b; text-transform:uppercase;">
                                <i class="ph ph-user-plus" style="color:#7048e8; font-size:1.1rem; vertical-align:middle;"></i> Novo Contato
                            </span>
                        </div>
                        <div class="mcon-ribbon-checkboxes" style="color:#475569;">
                            <label><input type="checkbox" id="mcon-email-nfe"> Envio NFe</label>
                            <label><input type="checkbox" id="mcon-email-cobranca"> Cobrança</label>
                            <label><input type="checkbox" id="mcon-email-os"> OS</label>
                            <label><input type="checkbox" id="mcon-email-contrato"> Contrato</label>
                            <label style="margin-left:8px; border-left:1px solid #cbd5e1; padding-left:12px;"><input type="checkbox" id="mcon-inativo"> Inativo</label>
                        </div>
                        <div style="display:flex; gap:0.4rem; align-items:center;">
                            <button onclick="window.modalSalvarNovoContato()" style="background:#16a34a; color:white; border:none; padding:0.35rem 0.8rem; border-radius:4px; cursor:pointer; font-weight:600; font-size:0.76rem; display:inline-flex; align-items:center; gap:4px; height:28px; box-sizing:border-box;" onmouseover="this.style.background='#15803d'" onmouseout="this.style.background='#16a34a'">
                                <i class="ph ph-check" style="font-size:0.9rem;"></i> Salvar
                            </button>
                            <button onclick="Swal.close()" style="background:#e2e8f0; color:#475569; border:none; padding:0.35rem 0.8rem; border-radius:4px; cursor:pointer; font-weight:600; font-size:0.76rem; display:inline-flex; align-items:center; gap:4px; height:28px; box-sizing:border-box;" onmouseover="this.style.background='#cbd5e1'" onmouseout="this.style.background='#e2e8f0'">
                                <i class="ph ph-x" style="font-size:0.9rem;"></i> Fechar
                            </button>
                        </div>
                    </div>

                    <!-- Corpo do Modal -->
                    <div class="mcon-form-body">
                        <!-- DADOS DO CONTATO -->
                        <div class="mcon-section-title first">
                            <i class="ph ph-identification-card"></i> Dados do Contato
                        </div>
                        <div class="mcon-grid" style="display:flex; flex-direction:column; gap:0.5rem;">
                            <!-- Linha 1 -->
                            <div class="mcon-grid mcon-grid-contact-row1">
                                <div class="mcon-field">
                                    <label>Código</label>
                                    <input type="text" id="mcon-codigo" readonly placeholder="Auto" class="mcon-input" style="text-align:center; font-weight:bold; color:#7048e8;">
                                </div>
                                <div class="mcon-field">
                                    <label>Nome *</label>
                                    <input type="text" id="mcon-nome" placeholder="Nome Completo" class="mcon-input">
                                </div>
                                <div class="mcon-field">
                                    <label>Celular</label>
                                    <input type="text" id="mcon-celular" placeholder="(XX) XXXXX-XXXX" class="mcon-input">
                                </div>
                                <div class="mcon-field">
                                    <label>E-mail *</label>
                                    <input type="email" id="mcon-email" placeholder="nome@empresa.com" class="mcon-input">
                                </div>
                            </div>

                            <!-- Linha 2 -->
                            <div class="mcon-grid mcon-grid-contact-row2">
                                <div class="mcon-field">
                                    <label>Tipo</label>
                                    <select id="mcon-tipo" class="mcon-select">
                                        <option value="">-- Selecione --</option>
                                        <option value="1 - Principal">1 - Principal</option>
                                        <option value="2 - Financeiro">2 - Financeiro</option>
                                        <option value="3 - Comercial">3 - Comercial</option>
                                        <option value="4 - Técnico">4 - Técnico</option>
                                        <option value="5 - Diretoria">5 - Diretoria</option>
                                        <option value="6 - Outros">6 - Outros</option>
                                    </select>
                                </div>
                                <div class="mcon-field">
                                    <label>Representante</label>
                                    <input type="text" id="mcon-representante" class="mcon-input">
                                </div>
                                <div class="mcon-field">
                                    <label>Cargo</label>
                                    <input type="text" id="mcon-cargo" class="mcon-input">
                                </div>
                                <div class="mcon-field">
                                    <label>Sexo</label>
                                    <select id="mcon-sexo" class="mcon-select">
                                        <option value="">--</option>
                                        <option value="M">Masculino</option>
                                        <option value="F">Feminino</option>
                                        <option value="O">Outro</option>
                                    </select>
                                </div>
                                <div class="mcon-field">
                                    <label>Nascimento</label>
                                    <input type="date" id="mcon-nascimento" class="mcon-input">
                                </div>
                                <div class="mcon-field">
                                    <label>Departamento</label>
                                    <input type="text" id="mcon-departamento" class="mcon-input">
                                </div>
                            </div>

                            <!-- Linha 3 -->
                            <div class="mcon-grid mcon-grid-contact-row3">
                                <div class="mcon-field">
                                    <label>Origem</label>
                                    <input type="text" id="mcon-origem" class="mcon-input">
                                </div>
                                <div class="mcon-field">
                                    <label>Influenciador</label>
                                    <select id="mcon-influenciador" class="mcon-select">
                                        <option value="">-- Selecione --</option>
                                        <option value="Sim">Sim</option>
                                        <option value="Não">Não</option>
                                    </select>
                                </div>
                                <div class="mcon-field">
                                    <label>Classificação</label>
                                    <select id="mcon-classificacao" class="mcon-select">
                                        <option value="">-- Selecione --</option>
                                        <option value="1 - Diamante">1 - Diamante</option>
                                        <option value="2 - Ouro">2 - Ouro</option>
                                        <option value="3 - Prata">3 - Prata</option>
                                        <option value="4 - Bronze">4 - Bronze</option>
                                    </select>
                                </div>
                                <div class="mcon-field">
                                    <label>Ramo de Atividade</label>
                                    <input type="text" id="mcon-ramo-atividade" class="mcon-input">
                                </div>
                                <div class="mcon-field">
                                    <label>Região</label>
                                    <input type="text" id="mcon-regiao" class="mcon-input">
                                </div>
                                <div class="mcon-field">
                                    <label>Nextel</label>
                                    <input type="text" id="mcon-nextel" class="mcon-input">
                                </div>
                            </div>

                            <!-- Linha 4 -->
                            <div class="mcon-grid mcon-grid-contact-row4">
                                <div class="mcon-field">
                                    <label>Telefone</label>
                                    <input type="text" id="mcon-telefone" placeholder="(XX) XXXX-XXXX" class="mcon-input">
                                </div>
                                <div class="mcon-field">
                                    <label>Ramal</label>
                                    <input type="text" id="mcon-ramal" class="mcon-input">
                                </div>
                                <div class="mcon-field">
                                    <label>Outras Comunicações</label>
                                    <input type="text" id="mcon-outra-comunicacao" class="mcon-input">
                                </div>
                            </div>
                        </div>

                        <!-- EMPRESA CLIENTE -->
                        <div class="mcon-section-title">
                            <i class="ph ph-buildings"></i> Empresa Cliente
                        </div>
                        <div class="mcon-grid" style="display:flex; flex-direction:column; gap:0.5rem;">
                            <!-- Linha 1 -->
                            <div class="mcon-grid mcon-grid-company-row1">
                                <div class="mcon-field">
                                    <label>Cliente (Razão Social) *</label>
                                    <div class="mcon-input-group">
                                        <input type="text" id="memp-codigo" readonly class="mcon-input" style="width: 80px; font-weight: bold; text-align: center;" value="${client.codigo || ''}">
                                        <input type="text" id="memp-razao-social" readonly class="mcon-input" value="${client.nome_razao_social || ''}">
                                    </div>
                                </div>
                                <div class="mcon-field">
                                    <label>CNPJ *</label>
                                    <input type="text" id="memp-cnpj" readonly class="mcon-input" value="${client.cpf_cnpj || ''}">
                                </div>
                                <div class="mcon-field">
                                    <label>CEP</label>
                                    <input type="text" id="memp-cep" readonly class="mcon-input" value="${client.cep || ''}">
                                </div>
                            </div>

                            <!-- Linha 2 -->
                            <div class="mcon-grid mcon-grid-company-row2">
                                <div class="mcon-field">
                                    <label>Endereço</label>
                                    <input type="text" id="memp-endereco" readonly class="mcon-input" value="${client.endereco || ''}">
                                </div>
                                <div class="mcon-field">
                                    <label>Número</label>
                                    <input type="text" id="memp-numero" readonly class="mcon-input" value="${client.numero || ''}">
                                </div>
                                <div class="mcon-field">
                                    <label>Bairro</label>
                                    <input type="text" id="memp-bairro" readonly class="mcon-input" value="${client.bairro || ''}">
                                </div>
                                <div class="mcon-field">
                                    <label>Cidade</label>
                                    <input type="text" id="memp-cidade" readonly class="mcon-input" value="${client.municipio || ''}">
                                </div>
                                <div class="mcon-field">
                                    <label>UF</label>
                                    <input type="text" id="memp-uf" readonly class="mcon-input" value="${client.uf || ''}">
                                </div>
                            </div>

                            <!-- Linha de controle -->
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                                <div class="mcon-field">
                                    <label>Grupo de Clientes</label>
                                    <input type="text" id="memp-grupo" readonly class="mcon-input" value="${client.grupo_clientes || ''}">
                                </div>
                                <div class="mcon-field">
                                    <label>Cliente Centralizador</label>
                                    <input type="text" id="memp-centralizador" readonly class="mcon-input" value="${client.cliente_centralizador || ''}">
                                </div>
                            </div>

                            <!-- Linha 3 -->
                            <div class="mcon-grid mcon-grid-company-row3">
                                <div class="mcon-field">
                                    <label>Telefone</label>
                                    <input type="text" id="memp-telefone" readonly class="mcon-input" value="${client.telefone || ''}">
                                </div>
                                <div class="mcon-field">
                                    <label>Ramal</label>
                                    <input type="text" id="memp-ramal" readonly class="mcon-input" value="${client.ramal || ''}">
                                </div>
                                <div class="mcon-field">
                                    <label>Telefone 2</label>
                                    <input type="text" id="memp-telefone2" readonly class="mcon-input" value="${client.telefone_2 || ''}">
                                </div>
                                <div class="mcon-field">
                                    <label>Ramal 2</label>
                                    <input type="text" id="memp-ramal2" readonly class="mcon-input" value="${client.ramal_2 || ''}">
                                </div>
                                <div class="mcon-field">
                                    <label>Fax</label>
                                    <input type="text" id="memp-fax" readonly class="mcon-input" value="${client.fax || ''}">
                                </div>
                                <div class="mcon-field">
                                    <label>Website (Site)</label>
                                    <input type="text" id="memp-site" readonly class="mcon-input" value="${client.website || ''}">
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `,
            didOpen: () => {
                const conCelular = document.getElementById('mcon-celular');
                if (conCelular) {
                    conCelular.addEventListener('input', (e) => {
                        let x = e.target.value.replace(/\D/g, '').match(/(\d{0,2})(\d{0,5})(\d{0,4})/);
                        e.target.value = !x[2] ? x[1] : '(' + x[1] + ') ' + x[2] + (x[3] ? '-' + x[3] : '');
                    });
                }
                const conTelefone = document.getElementById('mcon-telefone');
                if (conTelefone) {
                    conTelefone.addEventListener('input', (e) => {
                        let x = e.target.value.replace(/\D/g, '').match(/(\d{0,2})(\d{0,4})(\d{0,4})/);
                        e.target.value = !x[2] ? x[1] : '(' + x[1] + ') ' + x[2] + (x[3] ? '-' + x[3] : '');
                    });
                }
            }
        });
    } catch(err) {
        console.error(err);
        Swal.fire('Erro', 'Ocorreu um erro ao carregar o cliente para o contato.', 'error');
    }
};

window.modalSalvarNovoContato = async function() {
    const conNome = document.getElementById('mcon-nome')?.value || '';
    const conEmail = document.getElementById('mcon-email')?.value || '';
    const empCnpj = document.getElementById('memp-cnpj')?.value || '';
    const empRazao = document.getElementById('memp-razao-social')?.value || '';

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

    const empresa_cliente = {
        id: _clienteEditandoId,
        codigo: document.getElementById('memp-codigo')?.value || '',
        cpf_cnpj: empCnpj,
        nome_razao_social: empRazao,
        cep: document.getElementById('memp-cep')?.value || '',
        endereco: document.getElementById('memp-endereco')?.value || '',
        numero: document.getElementById('memp-numero')?.value || '',
        bairro: document.getElementById('memp-bairro')?.value || '',
        municipio: document.getElementById('memp-cidade')?.value || '',
        uf: document.getElementById('memp-uf')?.value || '',
        grupo_clientes: document.getElementById('memp-grupo')?.value || '',
        cliente_centralizador: document.getElementById('memp-centralizador')?.value || '',
        telefone: document.getElementById('memp-telefone')?.value || '',
        ramal: document.getElementById('memp-ramal')?.value || '',
        telefone_2: document.getElementById('memp-telefone2')?.value || '',
        ramal_2: document.getElementById('memp-ramal2')?.value || '',
        fax: document.getElementById('memp-fax')?.value || '',
        website: document.getElementById('memp-site')?.value || '',
        criado_por: window.currentUser?.nome || window.currentUser?.email || ''
    };

    const payload = {
        codigo: null,
        nome: conNome,
        tipo: document.getElementById('mcon-tipo')?.value || '',
        representante: document.getElementById('mcon-representante')?.value || '',
        departamento: document.getElementById('mcon-departamento')?.value || '',
        cargo: document.getElementById('mcon-cargo')?.value || '',
        origem: document.getElementById('mcon-origem')?.value || '',
        influenciador: document.getElementById('mcon-influenciador')?.value || '',
        classificacao: document.getElementById('mcon-classificacao')?.value || '',
        data_nascimento: document.getElementById('mcon-nascimento')?.value || '',
        ramo_atividade: document.getElementById('mcon-ramo-atividade')?.value || '',
        regiao: document.getElementById('mcon-regiao')?.value || '',
        sexo: document.getElementById('mcon-sexo')?.value || '',
        celular: document.getElementById('mcon-celular')?.value || '',
        telefone: document.getElementById('mcon-telefone')?.value || '',
        ramal: document.getElementById('mcon-ramal')?.value || '',
        nextel: document.getElementById('mcon-nextel')?.value || '',
        email: conEmail,
        outra_comunicacao: document.getElementById('mcon-outra-comunicacao')?.value || '',
        inativo: document.getElementById('mcon-inativo')?.checked ? 1 : 0,
        email_cobranca: document.getElementById('mcon-email-cobranca')?.checked ? 1 : 0,
        email_nfe: document.getElementById('mcon-email-nfe')?.checked ? 1 : 0,
        email_os: document.getElementById('mcon-email-os')?.checked ? 1 : 0,
        email_contrato: document.getElementById('mcon-email-contrato')?.checked ? 1 : 0,
        criado_por: window.currentUser?.nome || window.currentUser?.email || '',
        cliente_id: _clienteEditandoId,
        empresa_cliente: empresa_cliente
    };

    try {
        const res = await apiPost('/contatos', payload);
        if (res && res.success) {
            _clientesCache = []; // Limpar cache
            Swal.close();
            
            // Reload parent client to refresh contacts grid table
            await window.carregarClienteParaEdicao(_clienteEditandoId);

            if (typeof mostrarToastSucesso === 'function') {
                mostrarToastSucesso('Contato cadastrado com sucesso!');
            }
        } else {
            alert('Erro ao salvar contato: ' + (res?.error || 'Erro desconhecido.'));
        }
    } catch (e) {
        console.error(e);
        alert('Erro ao salvar contato.');
    }
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

        // Fetch all contacts to allow searching and selecting
        const allContatos = await apiGet('/contatos') || [];
        window._modalAllContatos = allContatos;

        Swal.fire({
            title: '<div style="font-size:1.15rem; font-weight:700; color:#1e293b; text-align:left; border-bottom:2px solid #e2e8f0; padding-bottom:8px;"><i class="ph ph-magnifying-glass"></i> Pesquisar Contatos do Cliente</div>',
            html: `
                <div style="text-align:left; font-family:'Inter', sans-serif; height:320px; display:flex; flex-direction:column;">
                    <div style="font-size:0.75rem; color:#64748b; margin-bottom:8px;">* Dê um duplo clique na linha para adicionar o contato ao cliente atual.</div>
                    <input type="text" id="modal-search-contato" placeholder="Digite parte do nome, empresa ou e-mail para buscar..." style="width:100%; padding:0.55rem 0.75rem; border:1px solid #cbd5e1; border-radius:6px; font-size:0.85rem; margin-bottom:12px; box-sizing:border-box; outline:none; height:38px; flex-shrink:0;" oninput="window.filtrarContatosModal(this.value)">
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

    const sourceList = window._modalAllContatos || [];
    const filtered = sourceList.filter(c => 
        (c.nome && c.nome.toLowerCase().includes(term.toLowerCase())) ||
        (c.codigo && c.codigo.toString().includes(term)) ||
        (c.departamento && c.departamento.toLowerCase().includes(term.toLowerCase())) ||
        (c.email && c.email.toLowerCase().includes(term.toLowerCase())) ||
        (c.cliente_nome && c.cliente_nome.toLowerCase().includes(term.toLowerCase()))
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
                    <th style="padding:0.65rem 1rem; font-weight:700;">Cód</th>
                    <th style="padding:0.65rem 1rem; font-weight:700;">Nome</th>
                    <th style="padding:0.65rem 1rem; font-weight:700;">Departamento</th>
                    <th style="padding:0.65rem 1rem; font-weight:700;">Celular</th>
                    <th style="padding:0.65rem 1rem; font-weight:700;">E-mail</th>
                    <th style="padding:0.65rem 1rem; font-weight:700;">Empresa Atual</th>
                </tr>
            </thead>
            <tbody>
                ${filtered.map(c => `
                    <tr ondblclick="window.selecionarContatoParaCliente('${encodeURIComponent(JSON.stringify(c))}')" style="border-bottom:1px solid #f1f5f9; transition:background 0.15s; cursor:pointer;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''" title="Duplo clique para adicionar ao cliente">
                        <td style="padding:0.65rem 1rem; color:#475569;">${c.codigo || '—'}</td>
                        <td style="padding:0.65rem 1rem; color:#1e293b; font-weight:600;">${c.nome}</td>
                        <td style="padding:0.65rem 1rem; color:#475569;">${c.departamento || '—'}</td>
                        <td style="padding:0.65rem 1rem; color:#475569;">${c.celular || '—'}</td>
                        <td style="padding:0.65rem 1rem; color:#475569;">${c.email || '—'}</td>
                        <td style="padding:0.65rem 1rem; color:#475569;">${c.cliente_nome || '—'}</td>
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
                top: 0;
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
            <div id="prop-toolbar-contatos" class="cc-toolbar">
                <!-- Badge Lado Esquerdo: Dropdown de Navegação -->
                <div class="saas-dropdown-container">
                    <div class="saas-nav-item active" id="tab-prop-lista" onclick="switchPropostaTab('lista')" style="display: flex; align-items: center; gap: 0.25rem;">
                        <i class="ph ph-list-bullets"></i> Lista de Propostas <i class="ph ph-caret-down" style="font-size: 0.8rem; opacity: 0.7;"></i>
                    </div>
                    <div class="saas-dropdown-menu">
                        <div class="saas-dropdown-item" onclick="abrirFormProposta(null); event.stopPropagation();">
                            <i class="ph ph-pencil-simple"></i> Nova Proposta
                        </div>
                        <div class="saas-dropdown-item" onclick="switchPropostaTab('cadastro-cliente'); event.stopPropagation();">
                            <i class="ph ph-user-plus"></i> Cadastro de Clientes
                        </div>
                        <div class="saas-dropdown-item" onclick="switchPropostaTab('cadastro-contatos'); event.stopPropagation();">
                            <i class="ph ph-identification-card"></i> Cadastro de Contatos
                        </div>
                        <div class="saas-dropdown-item" onclick="switchPropostaTab('enderecos'); event.stopPropagation();">
                            <i class="ph ph-map-pin"></i> Endereços
                        </div>
                        <div class="saas-dropdown-item" onclick="switchPropostaTab('servicos-precificacao'); event.stopPropagation();">
                            <i class="ph ph-calculator"></i> Precificação de Serviços
                        </div>
                        <div class="saas-dropdown-item" id="tab-prop-modelos-contrato" onclick="switchPropostaTab('modelos-contrato'); event.stopPropagation();">
                            <i class="ph ph-file-text"></i> Modelos de Contrato
                        </div>
                    </div>
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
                                    <input type="text" id="con-codigo" readonly placeholder="Auto" class="cc-input" style="text-align: center; font-weight: bold; color: #7048e8;">
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

            if (_redirectAfterContactSaveToClient) {
                _redirectAfterContactSaveToClient = false;
                if (resolvedId) {
                    await window.carregarClienteParaEdicao(resolvedId);
                }
                window.switchPropostaTab('cadastro-cliente');
            } else if (_redirectAfterContactSave) {
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

window.abrirModalEnderecosEntrega = async function(preSelectedClient = null) {
    const propClienteInput = document.getElementById('prop-cliente');
    const clientName = propClienteInput ? propClienteInput.value.trim() : '';

    let matchedClient = preSelectedClient;
    if (!matchedClient && clientName) {
        try {
            const clientes = await apiGet('/clientes') || [];
            matchedClient = clientes.find(c => c.nome_razao_social && c.nome_razao_social.trim() === clientName);
        } catch(e) {
            console.error('Erro ao buscar cliente da proposta:', e);
        }
    }

    Swal.fire({
        title: '',
        html: `
            <style>
                .cc-container-modal {
                    background: #fff;
                    width: 100%;
                    text-align: left;
                    font-family: 'Inter', sans-serif;
                }
                .cc-toolbar-modal {
                    background: #f8fafc;
                    border-bottom: 1px solid #e2e8f0;
                    padding: 0.4rem 0.8rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 0.4rem;
                    position: sticky;
                    top: 0;
                    z-index: 997;
                    border-top-left-radius: 12px;
                    border-top-right-radius: 12px;
                }
                .cc-form-body-modal {
                    padding: 0.8rem 1.0rem;
                    max-height: 420px;
                    overflow-y: auto;
                }
                .cc-section-title-modal {
                    font-size: 0.8rem !important;
                    font-weight: 800 !important;
                    color: #475569 !important;
                    text-transform: uppercase !important;
                    letter-spacing: 0.04em !important;
                    border-bottom: 2px solid #e2e8f0 !important;
                    padding-bottom: 0.25rem !important;
                    margin: 0.8rem 0 0.5rem 0 !important;
                    display: flex !important;
                    align-items: center !important;
                    gap: 0.4rem !important;
                    font-family: 'Inter', sans-serif !important;
                }
                .cc-section-title-modal.first {
                    margin-top: 0;
                }
                .cc-input-modal, .cc-select-modal {
                    padding: 0.15rem 0.45rem !important;
                    border: 1px solid #cbd5e1 !important;
                    border-radius: 4px !important;
                    font-size: 0.76rem !important;
                    background: #fff !important;
                    color: #1e293b !important;
                    outline: none !important;
                    transition: all 0.2s !important;
                    box-sizing: border-box !important;
                    width: 100% !important;
                    height: 28px !important;
                    font-family: 'Inter', sans-serif !important;
                }
                .cc-input-modal:focus, .cc-select-modal:focus {
                    border-color: #3b82f6 !important;
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15) !important;
                }
                .cc-input-modal[readonly] {
                    background: #f1f5f9 !important;
                    color: #64748b !important;
                    cursor: not-allowed !important;
                }
                .cc-grid-modal {
                    display: grid;
                    gap: 0.4rem 0.6rem;
                }
                .cc-grid-modal-row1 {
                    grid-template-columns: 1.2fr 3.5fr 2fr 2fr;
                }
                .cc-grid-modal-row2 {
                    grid-template-columns: 1.5fr 3.5fr 1fr 2.5fr 2.5fr;
                    align-items: end;
                }
                .cc-grid-modal-row3 {
                    grid-template-columns: 4.5fr 1fr 4.5fr;
                }
                .cc-grid-modal-row4 {
                    grid-template-columns: 4fr 4fr 2fr;
                }
                @media (max-width: 992px) {
                    .cc-grid-modal-row1, .cc-grid-modal-row2, .cc-grid-modal-row3, .cc-grid-modal-row4 {
                        grid-template-columns: 1fr 1fr !important;
                        align-items: stretch !important;
                    }
                }
                @media (max-width: 576px) {
                    .cc-grid-modal-row1, .cc-grid-modal-row2, .cc-grid-modal-row3, .cc-grid-modal-row4 {
                        grid-template-columns: 1fr !important;
                    }
                }
                .prop-lbl-modal {
                    font-size: 0.7rem !important;
                    font-weight: 700 !important;
                    color: #475569 !important;
                    text-transform: uppercase !important;
                    letter-spacing: 0.03em !important;
                    display: block !important;
                    margin-bottom: 2px !important;
                    font-family: 'Inter', sans-serif !important;
                }
            </style>

            <div class="cc-container-modal">
                <!-- Barra de Ferramentas -->
                <div class="cc-toolbar-modal">
                    <!-- Badge Lado Esquerdo -->
                    <div style="background:#2e58a6; color:white; padding:0.25rem 0.6rem; border-radius:4px; font-weight:700; font-size:0.76rem; display:flex; align-items:center; gap:0.3rem; font-family:'Inter', sans-serif; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                        <i class="ph ph-map-pin" style="font-size:1.0rem;"></i>
                        Clientes - Endereços Entrega
                    </div>

                    <!-- Estatísticas de Regiões e Quilometragem (Centro) -->
                    <div id="modal-enderecos-estatisticas" style="display:flex; gap:0.5rem; align-items:center; font-family:'Inter', sans-serif; font-size:0.72rem; color:#475569; font-weight:600; flex:1; justify-content:center; flex-wrap:wrap; margin:0 1rem;">
                    </div>

                    <!-- Botões de Ação (Lado Direito) -->
                    <div style="display:flex; gap:0.4rem; align-items:center; flex-wrap:wrap;">
                        <button type="button" onclick="window.modalCarregarEnderecos(window._modalSelectedClienteId)" title="Recarregar" style="background:#e2e8f0; color:#475569; border:none; width:28px; height:28px; border-radius:4px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; transition:all 0.15s; outline:none;" onmouseover="this.style.background='#cbd5e1'" onmouseout="this.style.background='#e2e8f0'">
                            <i class="ph ph-arrows-clockwise" style="font-size:1.0rem;"></i>
                        </button>

                        <!-- Spacer -->
                        <div style="width: 4px;"></div>

                        <button type="button" onclick="window.modalNovoEndereco()" style="background:#3b82f6; color:white; border:none; padding:0 0.65rem; border-radius:4px; height:28px; cursor:pointer; font-weight:600; font-size:0.76rem; display:inline-flex; align-items:center; gap:6px; transition:background 0.15s;" onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'">
                            <i class="ph ph-file-text" style="font-size:1.0rem;"></i> Novo
                        </button>
                        <button type="button" onclick="window.modalSalvarEndereco()" style="background:#16a34a; color:white; border:none; padding:0 0.65rem; border-radius:4px; height:28px; cursor:pointer; font-weight:600; font-size:0.76rem; display:inline-flex; align-items:center; gap:6px; transition:background 0.15s;" onmouseover="this.style.background='#15803d'" onmouseout="this.style.background='#16a34a'">
                            <i class="ph ph-check" style="font-size:1.0rem;"></i> Salvar
                        </button>
                    </div>
                </div>

                <!-- Corpo do Modal -->
                <div class="cc-form-body-modal">
                    <!-- Seção 1: Cliente -->
                    <div class="cc-section-title-modal first">
                        <i class="ph ph-user"></i> Dados do Cliente
                    </div>
                    <div class="cc-grid-modal cc-grid-modal-row1" style="margin-bottom: 0.8rem;">
                        <div>
                            <label class="prop-lbl-modal">Código</label>
                            <div style="display:flex; gap:0.35rem;">
                                <input type="text" id="modal-cli-codigo" readonly class="cc-input-modal" style="text-align:center;">
                                <button type="button" onclick="window.modalBuscarCliente()" style="background:#334155; color:#fff; border:none; padding:0 8px; border-radius:4px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; transition:all 0.2s; height:28px;" onmouseover="this.style.background='#1e293b'" onmouseout="this.style.background='#334155'" title="Buscar Cliente"><i class="ph ph-magnifying-glass" style="font-size:0.9rem;"></i></button>
                            </div>
                        </div>
                        <div>
                            <label class="prop-lbl-modal">Razão Social</label>
                            <input type="text" id="modal-cli-razao" readonly class="cc-input-modal">
                        </div>
                        <div>
                            <label class="prop-lbl-modal">Nome Fantasia</label>
                            <input type="text" id="modal-cli-fantasia" readonly class="cc-input-modal">
                        </div>
                        <div>
                            <label class="prop-lbl-modal">Data de Cadastro</label>
                            <input type="text" id="modal-cli-data" readonly class="cc-input-modal" style="text-align:center;">
                        </div>
                    </div>

                    <!-- Seção 2: Cadastro de Endereço -->
                    <div class="cc-section-title-modal">
                        <i class="ph ph-map-pin"></i> Detalhes do Endereço de Entrega
                    </div>
                    <div class="cc-grid-modal cc-grid-modal-row1" style="margin-bottom: 0.4rem;">
                        <div>
                            <label class="prop-lbl-modal">Seq.</label>
                            <input type="text" id="modal-end-seq" readonly value="1" class="cc-input-modal" style="text-align:center; font-weight:bold;">
                        </div>
                        <div>
                            <label class="prop-lbl-modal">Nome do Local *</label>
                            <div style="display:flex; gap:0.35rem;">
                                <input type="text" id="modal-end-nome" class="cc-input-modal" placeholder="Ex: FILIAL CAMPINAS" style="flex:1;">
                                <button type="button" onclick="window.modalBuscarPorNomeLocal()" style="background:#334155; color:#fff; border:none; padding:0 8px; border-radius:4px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; transition:all 0.2s; height:28px;" onmouseover="this.style.background='#1e293b'" onmouseout="this.style.background='#334155'" title="Buscar por Nome do Local"><i class="ph ph-magnifying-glass" style="font-size:0.9rem;"></i></button>
                            </div>
                        </div>
                        <div>
                            <label class="prop-lbl-modal">CPF/CNPJ</label>
                            <div style="display:flex; gap:0.35rem;">
                                <input type="text" id="modal-end-cnpj" class="cc-input-modal" style="flex:1;">
                                <button type="button" onclick="window.modalBuscarPorCNPJLocal()" style="background:#334155; color:#fff; border:none; padding:0 8px; border-radius:4px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; transition:all 0.2s; height:28px;" onmouseover="this.style.background='#1e293b'" onmouseout="this.style.background='#334155'" title="Buscar CNPJ"><i class="ph ph-magnifying-glass" style="font-size:0.9rem;"></i></button>
                            </div>
                        </div>
                        <div>
                            <label class="prop-lbl-modal">Inscrição Estadual</label>
                            <input type="text" id="modal-end-ie" class="cc-input-modal">
                        </div>
                    </div>

                    <div class="cc-grid-modal cc-grid-modal-row2" style="margin-bottom: 0.4rem;">
                        <div>
                            <label class="prop-lbl-modal">CEP *</label>
                            <div style="display:flex; gap:0.35rem;">
                                <input type="text" id="modal-end-cep" class="cc-input-modal" placeholder="00000-000">
                                <button type="button" onclick="window.modalBuscarCEPEntrega()" style="background:#334155; color:#fff; border:none; padding:0 8px; border-radius:4px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; transition:all 0.2s; height:28px;" onmouseover="this.style.background='#1e293b'" onmouseout="this.style.background='#334155'" title="Buscar CEP"><i class="ph ph-magnifying-glass" style="font-size:0.9rem;"></i></button>
                            </div>
                        </div>
                        <div>
                            <label class="prop-lbl-modal">Endereço *</label>
                            <input type="text" id="modal-end-rua" class="cc-input-modal">
                        </div>
                        <div>
                            <label class="prop-lbl-modal">Número *</label>
                            <input type="text" id="modal-end-num" class="cc-input-modal">
                        </div>
                        <div>
                            <label class="prop-lbl-modal">Complemento</label>
                            <input type="text" id="modal-end-comp" class="cc-input-modal">
                        </div>
                        <div>
                            <label class="prop-lbl-modal">Lat/Long (Google Maps)</label>
                            <div style="display:flex; gap:0.35rem;">
                                <input type="text" id="modal-end-coords" class="cc-input-modal" placeholder="-23.55052, -46.633308" style="flex:1;">
                                <button type="button" onclick="window.modalBuscarPorCoords()" style="background:#334155; color:#fff; border:none; padding:0 8px; border-radius:4px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; transition:all 0.2s; height:28px;" onmouseover="this.style.background='#1e293b'" onmouseout="this.style.background='#334155'" title="Buscar por Coordenadas"><i class="ph ph-magnifying-glass" style="font-size:0.9rem;"></i></button>
                            </div>
                        </div>
                    </div>

                    <div class="cc-grid-modal cc-grid-modal-row3" style="margin-bottom: 0.4rem;">
                        <div>
                            <label class="prop-lbl-modal">Bairro *</label>
                            <input type="text" id="modal-end-bairro" class="cc-input-modal">
                        </div>
                        <div>
                            <label class="prop-lbl-modal">UF *</label>
                            <input type="text" id="modal-end-uf" maxlength="2" class="cc-input-modal" style="text-align:center; text-transform:uppercase;">
                        </div>
                        <div>
                            <label class="prop-lbl-modal">Município *</label>
                            <input type="text" id="modal-end-cidade" class="cc-input-modal">
                        </div>
                    </div>

                    <div class="cc-grid-modal cc-grid-modal-row4" style="margin-bottom: 0.8rem;">
                        <div>
                            <label class="prop-lbl-modal">Contato</label>
                            <input type="text" id="modal-end-contato" class="cc-input-modal">
                        </div>
                        <div>
                            <label class="prop-lbl-modal">Telefone</label>
                            <input type="text" id="modal-end-fone" class="cc-input-modal">
                        </div>
                        <div>
                            <label class="prop-lbl-modal">Ramal</label>
                            <input type="text" id="modal-end-ramal" class="cc-input-modal">
                        </div>
                    </div>

                    <!-- Seção 3: Tabela de Endereços -->
                    <div class="cc-section-title-modal">
                        <i class="ph ph-list-bullets"></i> Endereços Cadastrados
                    </div>
                    <div style="font-size:0.75rem; color:#64748b; margin-bottom:0.5rem;">
                        * Clique duas vezes sobre uma linha para selecionar o endereço de instalação, ou clique uma vez para carregar para edição.
                    </div>
                    <div style="border:1px solid #e2e8f0; border-radius:8px; overflow:hidden; background:#fff; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
                        <table style="width:100%; border-collapse:collapse; font-size:0.76rem; text-align:left;">
                            <thead>
                                <tr style="background:#f8fafc; border-bottom:2px solid #cbd5e1; color:#475569;">
                                    <th style="padding:6px 8px; font-weight:700; font-size:0.7rem; text-transform:uppercase; letter-spacing:0.05em; color:#64748b; width:50px; text-align:center;">#</th>
                                    <th style="padding:6px 8px; font-weight:700; font-size:0.7rem; text-transform:uppercase; letter-spacing:0.05em; color:#64748b; width:200px;">Nome</th>
                                    <th style="padding:6px 8px; font-weight:700; font-size:0.7rem; text-transform:uppercase; letter-spacing:0.05em; color:#64748b;">Endereço</th>
                                    <th style="padding:6px 8px; font-weight:700; font-size:0.7rem; text-transform:uppercase; letter-spacing:0.05em; color:#64748b; width:150px;">Município / UF</th>
                                    <th style="padding:6px 8px; font-weight:700; font-size:0.7rem; text-transform:uppercase; letter-spacing:0.05em; color:#64748b; width:80px; text-align:center;">Ações</th>
                                </tr>
                            </thead>
                            <tbody id="modal-end-tbody">
                                <!-- Endereços renderizados dinamicamente -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `,
        showConfirmButton: false,
        width: '1100px',
        customClass: {
            popup: 'custom-swal-height-large'
        },
        didOpen: () => {
            window._modalSelectedClienteId = null;
            window._modalEnderecos = [];
            window._modalEnderecoEditandoId = null;

            if (matchedClient) {
                window._modalSelectedClienteId = matchedClient.id;
                document.getElementById('modal-cli-codigo').value = matchedClient.codigo || '';
                document.getElementById('modal-cli-razao').value = matchedClient.nome_razao_social || '';
                document.getElementById('modal-cli-fantasia').value = matchedClient.nome_fantasia || '';
                document.getElementById('modal-cli-data').value = matchedClient.data_cadastro ? matchedClient.data_cadastro.split('-').reverse().join('/') : '';
                window.modalCarregarEnderecos(matchedClient.id);
            } else {
                window.modalRenderEnderecos();
            }
        }
    });
};window.modalCarregarEnderecos = async function(clienteId) {
    try {
        const res = await apiGet(`/clientes/${clienteId}/enderecos`) || [];
        window._modalEnderecos = res;
        window.modalRenderEnderecos();
        window.modalNovoEndereco();
    } catch(err) {
        console.error(err);
    }
};

window.modalRenderEnderecos = function() {
    const tbody = document.getElementById('modal-end-tbody');
    if (!tbody) return;

    // Refresh route statistics
    if (typeof window.atualizarEstatisticasModal === 'function') {
        window.atualizarEstatisticasModal();
    }

    if (!window._modalEnderecos || window._modalEnderecos.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="padding:1rem; text-align:center; color:#94a3b8;">
                    Nenhum endereço de entrega cadastrado.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = window._modalEnderecos.map((e, idx) => `
        <tr onclick="window.modalCarregarEnderecoForm(${idx})" ondblclick="window.modalSelecionarEndereco(${idx})" style="border-bottom:1px solid #f1f5f9; transition:background 0.15s; cursor:pointer;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''">
            <td style="padding:5px 8px; text-align:center; color:#475569; font-weight:bold;">${e.sequencia}</td>
            <td style="padding:5px 8px; color:#1e293b; font-weight:600;">${e.nome_local || '—'}</td>
            <td style="padding:5px 8px; color:#475569;">${e.endereco || ''}${e.numero ? ', ' + e.numero : ''}${e.bairro ? ' - ' + e.bairro : ''}</td>
            <td style="padding:5px 8px; color:#475569;">${e.municipio || ''} / ${e.uf || ''}</td>
            <td style="padding:5px 8px; text-align:center;">
                <button type="button" onclick="event.stopPropagation(); window.modalExcluirEndereco(${idx})" style="background:#fee2e2; color:#ef4444; border:none; width:22px; height:22px; border-radius:4px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; transition:0.15s; outline:none;" onmouseover="this.style.background='#ef4444'; this.style.color='#fff';" onmouseout="this.style.background='#fee2e2'; this.style.color='#ef4444';" title="Excluir Endereço">
                    <i class="ph ph-trash" style="font-size:0.8rem;"></i>
                </button>
            </td>
        </tr>
    `).join('');
};

window.modalCarregarEnderecoForm = function(idx) {
    const e = window._modalEnderecos[idx];
    if (!e) return;

    window._modalEnderecoEditandoId = e.id;
    document.getElementById('modal-end-seq').value = e.sequencia || '1';
    document.getElementById('modal-end-nome').value = e.nome_local || '';
    document.getElementById('modal-end-cnpj').value = e.cpf_cnpj || '';
    document.getElementById('modal-end-ie').value = e.inscricao_estadual || '';
    document.getElementById('modal-end-cep').value = e.cep || '';
    document.getElementById('modal-end-rua').value = e.endereco || '';
    document.getElementById('modal-end-num').value = e.numero || '';
    document.getElementById('modal-end-comp').value = e.complemento || '';
    document.getElementById('modal-end-bairro').value = e.bairro || '';
    document.getElementById('modal-end-uf').value = e.uf || '';
    document.getElementById('modal-end-cidade').value = e.municipio || '';
    document.getElementById('modal-end-coords').value = e.coordenadas || '';
    document.getElementById('modal-end-contato').value = e.contato || '';
    document.getElementById('modal-end-fone').value = e.telefone || '';
    document.getElementById('modal-end-ramal').value = e.ramal || '';
};

window.modalNovoEndereco = function() {
    window._modalEnderecoEditandoId = null;
    let nextSeq = 1;
    if (window._modalEnderecos && window._modalEnderecos.length > 0) {
        nextSeq = Math.max(...window._modalEnderecos.map(e => e.sequencia || 0)) + 1;
    }

    document.getElementById('modal-end-seq').value = nextSeq;
    document.getElementById('modal-end-nome').value = '';
    document.getElementById('modal-end-cnpj').value = '';
    document.getElementById('modal-end-ie').value = '';
    document.getElementById('modal-end-cep').value = '';
    document.getElementById('modal-end-rua').value = '';
    document.getElementById('modal-end-num').value = '';
    document.getElementById('modal-end-comp').value = '';
    document.getElementById('modal-end-bairro').value = '';
    document.getElementById('modal-end-uf').value = '';
    document.getElementById('modal-end-cidade').value = '';
    document.getElementById('modal-end-coords').value = '';
    document.getElementById('modal-end-contato').value = '';
    document.getElementById('modal-end-fone').value = '';
    document.getElementById('modal-end-ramal').value = '';
};

window.modalSalvarEndereco = async function() {
    if (!window._modalSelectedClienteId) {
        Swal.fire('Aviso', 'Selecione um cliente primeiro.', 'warning');
        return;
    }

    const seqVal = parseInt(document.getElementById('modal-end-seq').value);
    const nomeVal = document.getElementById('modal-end-nome').value.trim();
    const cepVal = document.getElementById('modal-end-cep').value.trim();
    const ruaVal = document.getElementById('modal-end-rua').value.trim();
    const numVal = document.getElementById('modal-end-num').value.trim();
    const bairroVal = document.getElementById('modal-end-bairro').value.trim();
    const ufVal = document.getElementById('modal-end-uf').value.trim().toUpperCase();
    const cidadeVal = document.getElementById('modal-end-cidade').value.trim();

    if (!nomeVal) {
        alert('Por favor, preencha o Nome do Local.');
        return;
    }
    if (!cepVal) {
        alert('Por favor, preencha o CEP.');
        return;
    }
    if (!ruaVal) {
        alert('Por favor, preencha o Endereço.');
        return;
    }
    if (!numVal) {
        alert('Por favor, preencha o Número.');
        return;
    }
    if (!bairroVal) {
        alert('Por favor, preencha o Bairro.');
        return;
    }
    if (!ufVal) {
        alert('Por favor, preencha a UF.');
        return;
    }
    if (!cidadeVal) {
        alert('Por favor, preencha o Município.');
        return;
    }

    const payload = {
        id: window._modalEnderecoEditandoId,
        sequencia: seqVal,
        nome_local: nomeVal,
        cpf_cnpj: document.getElementById('modal-end-cnpj').value.trim(),
        inscricao_estadual: document.getElementById('modal-end-ie').value.trim(),
        cep: cepVal,
        endereco: ruaVal,
        numero: numVal,
        complemento: document.getElementById('modal-end-comp').value.trim(),
        bairro: bairroVal,
        uf: ufVal,
        municipio: cidadeVal,
        coordenadas: document.getElementById('modal-end-coords').value.trim(),
        contato: document.getElementById('modal-end-contato').value.trim(),
        telefone: document.getElementById('modal-end-fone').value.trim(),
        ramal: document.getElementById('modal-end-ramal').value.trim()
    };

    try {
        const res = await apiPost(`/clientes/${window._modalSelectedClienteId}/enderecos`, payload);
        if (res && res.success) {
            if (typeof mostrarToastSucesso === 'function') {
                mostrarToastSucesso('Endereço salvo com sucesso!');
            }
            window.modalCarregarEnderecos(window._modalSelectedClienteId);
        } else {
            alert('Erro ao salvar endereço: ' + (res && res.error ? res.error : 'Resposta inválida do servidor.'));
        }
    } catch(err) {
        console.error(err);
        alert('Erro ao salvar endereço: ' + err.message);
    }
};

window.modalExcluirEndereco = async function(idx) {
    const e = window._modalEnderecos[idx];
    if (!e) return;

    if (!confirm(`Deseja realmente excluir o endereço "${e.nome_local}"?`)) {
        return;
    }

    try {
        const res = await apiDelete(`/clientes/${window._modalSelectedClienteId}/enderecos/${e.id}`);
        if (res && res.success) {
            if (typeof mostrarToastSucesso === 'function') {
                mostrarToastSucesso('Endereço excluído com sucesso!');
            }
            window.modalCarregarEnderecos(window._modalSelectedClienteId);
        }
    } catch(err) {
        console.error(err);
        alert('Erro ao excluir endereço: ' + err.message);
    }
};

window.modalBuscarCEP = async function() {
    const cepRaw = document.getElementById('modal-end-cep')?.value || '';
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

        document.getElementById('modal-end-rua').value = data.logradouro || '';
        document.getElementById('modal-end-bairro').value = data.bairro || '';
        document.getElementById('modal-end-uf').value = data.uf || '';
        document.getElementById('modal-end-cidade').value = data.localidade || '';

        if (typeof mostrarToastSucesso === 'function') {
            mostrarToastSucesso('Endereço importado com sucesso!');
        }
    } catch(e) {
        console.error(e);
        alert('Erro ao buscar CEP: ' + e.message);
    }
};

window.modalBuscarCliente = async function() {
    try {
        const clientes = await apiGet('/clientes') || [];
        if (clientes.length === 0) {
            Swal.fire('Aviso', 'Nenhum cliente cadastrado.', 'info');
            return;
        }

        const rowsHtml = clientes.map(c => `
            <tr onclick="window.modalSelecionarClienteBusca('${encodeURIComponent(JSON.stringify(c))}')" style="cursor:pointer; border-bottom:1px solid #e2e8f0;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background=''">
                <td style="padding:0.5rem; text-align:center; font-weight:bold; color:#2e58a6;">${c.codigo}</td>
                <td style="padding:0.5rem; text-align:left; font-weight:600; color:#1e293b;">${c.nome_razao_social}</td>
                <td style="padding:0.5rem; text-align:left; color:#475569;">${c.cpf_cnpj || '—'}</td>
            </tr>
        `).join('');

        Swal.fire({
            title: '',
            html: `
                <div style="text-align:left; font-family:'Inter', sans-serif; display:flex; flex-direction:column; padding:0; border-radius:12px; overflow:hidden;">
                    <!-- Title Bar -->
                    <div style="font-size:1.05rem; font-weight:800; color:#1e293b; border-bottom:1px solid #e2e8f0; padding:12px 16px; background:#f8fafc; display:flex; align-items:center; gap:6px;">
                        <i class="ph ph-user-focus" style="color:#7c3aed; font-size:1.2rem;"></i> Selecionar Cliente
                    </div>
                    <!-- Body Content -->
                    <div style="padding:16px; display:flex; flex-direction:column; gap:10px; background:#f1f5f9;">
                        <input type="text" id="submodal-search-cliente" placeholder="Filtrar por nome..." style="width:100%; padding:0 12px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.85rem; height:38px; box-sizing:border-box; outline:none; transition:border-color 0.15s;" onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='#cbd5e1'" oninput="window.submodalFiltrarClientes(this.value)">
                        <div style="height:220px; overflow-y:auto; border:1px solid #e2e8f0; border-radius:8px; background:#fff; box-shadow:0 1px 3px rgba(0,0,0,0.02);">
                            <table style="width:100%; border-collapse:collapse; font-size:0.82rem; text-align:left;">
                                <thead>
                                    <tr style="background:#f8fafc; border-bottom:2px solid #cbd5e1; color:#475569;">
                                        <th style="padding:10px 12px; font-weight:700; font-size:0.7rem; text-transform:uppercase; letter-spacing:0.05em; color:#64748b; text-align:center; width:60px; position:sticky; top:0; background:#f8fafc; z-index:1;">Cód</th>
                                        <th style="padding:10px 12px; font-weight:700; font-size:0.7rem; text-transform:uppercase; letter-spacing:0.05em; color:#64748b; position:sticky; top:0; background:#f8fafc; z-index:1;">Razão Social</th>
                                        <th style="padding:10px 12px; font-weight:700; font-size:0.7rem; text-transform:uppercase; letter-spacing:0.05em; color:#64748b; width:120px; position:sticky; top:0; background:#f8fafc; z-index:1;">CNPJ</th>
                                    </tr>
                                </thead>
                                <tbody id="submodal-cliente-tbody">
                                    ${rowsHtml}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `,
            showConfirmButton: false,
            width: '500px',
            customClass: {
                popup: 'custom-swal-padding-zero'
            }
        });

        window.submodalFiltrarClientes = function(term) {
            const tbody = document.getElementById('submodal-cliente-tbody');
            if (!tbody) return;
            const query = term.toLowerCase();
            const filtered = clientes.filter(c => 
                (c.nome_razao_social && c.nome_razao_social.toLowerCase().includes(query)) ||
                (c.codigo && c.codigo.toString().includes(query)) ||
                (c.cpf_cnpj && c.cpf_cnpj.includes(query))
            );
            tbody.innerHTML = filtered.map(c => `
                <tr onclick="window.modalSelecionarClienteBusca('${encodeURIComponent(JSON.stringify(c))}')" style="cursor:pointer; border-bottom:1px solid #e2e8f0;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background=''">
                    <td style="padding:0.5rem; text-align:center; font-weight:bold; color:#2e58a6;">${c.codigo}</td>
                    <td style="padding:0.5rem; text-align:left; font-weight:600; color:#1e293b;">${c.nome_razao_social}</td>
                    <td style="padding:0.5rem; text-align:left; color:#475569;">${c.cpf_cnpj || '—'}</td>
                </tr>
            `).join('');
        };

        window.modalSelecionarClienteBusca = function(jsonStr) {
            const c = JSON.parse(decodeURIComponent(jsonStr));
            window.abrirModalEnderecosEntrega(c);
        };
    } catch(err) {
        console.error(err);
    }
};

window.modalSelecionarEndereco = function(idx) {
    const e = window._modalEnderecos[idx];
    if (!e) return;

    const fullAddress = `${e.nome_local} - ${e.endereco}, ${e.numero}${e.complemento ? ' (' + e.complemento + ')' : ''} - ${e.bairro} - ${e.municipio}/${e.uf}`;
    
    // Save coordinates to cache immediately if present
    if (e.coordenadas && e.coordenadas.trim()) {
        const parts = e.coordenadas.split(',');
        if (parts.length === 2) {
            const lat = parseFloat(parts[0].trim());
            const lon = parseFloat(parts[1].trim());
            if (!isNaN(lat) && !isNaN(lon)) {
                window._enderecoCoordenadasCache[fullAddress.trim()] = { lat, lon };
            }
        }
    }

    const propEnderecoInput = document.getElementById('prop-endereco');
    if (propEnderecoInput) {
        propEnderecoInput.value = fullAddress;
        
        // Trigger classification and checkbox mapping immediately
        if (typeof window.classificarRegiaoEDias === 'function') {
            window.classificarRegiaoEDias();
        }
    }

    Swal.close();
};

function _renderEnderecosInt() {
    const container = document.getElementById('prop-view-enderecos');
    if (!container) return;

    container.innerHTML = `
        <style>
            .cc-container-end {
                background: #fff;
                width: 100%;
                border-radius: 14px;
                box-shadow: 0 5px 20px rgba(0,0,0,0.05);
                overflow: visible;
                margin: 0 auto;
                border: 1px solid #e2e8f0;
                font-family: 'Inter', sans-serif;
            }
            .cc-toolbar-end {
                background: #f8fafc;
                border-bottom: 1px solid #e2e8f0;
                padding: 0.65rem 1.5rem;
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-wrap: wrap;
                gap: 0.6rem;
                position: sticky;
                top: 0;
                z-index: 997;
                border-top-left-radius: 14px;
                border-top-right-radius: 14px;
            }
            .cc-form-body-end {
                padding: 1.5rem;
            }
            .cc-section-title-end {
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
            .cc-section-title-end.first {
                margin-top: 0;
            }
            .cc-input-end, .cc-select-end {
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
            .cc-input-end:focus, .cc-select-end:focus {
                border-color: #3b82f6;
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
            }
            .cc-input-end[readonly] {
                background: #f1f5f9;
                color: #64748b;
                cursor: not-allowed;
            }
            .cc-grid-end {
                display: grid;
                gap: 0.75rem 1rem;
            }
            .cc-grid-end-row1 {
                grid-template-columns: 1.2fr 3.5fr 2fr 2fr;
            }
            .cc-grid-end-row2 {
                grid-template-columns: 1.5fr 3.5fr 1fr 2.5fr 2.5fr;
                align-items: end;
            }
            .cc-grid-end-row3 {
                grid-template-columns: 4.5fr 1fr 4.5fr;
            }
            .cc-grid-end-row4 {
                grid-template-columns: 4fr 4fr 2fr;
            }
            @media (max-width: 992px) {
                .cc-grid-end-row1, .cc-grid-end-row2, .cc-grid-end-row3, .cc-grid-end-row4 {
                    grid-template-columns: 1fr 1fr !important;
                    align-items: stretch !important;
                }
            }
            @media (max-width: 576px) {
                .cc-grid-end-row1, .cc-grid-end-row2, .cc-grid-end-row3, .cc-grid-end-row4 {
                    grid-template-columns: 1fr !important;
                }
            }
            .prop-lbl-end {
                font-size: 0.75rem;
                font-weight: 700;
                color: #475569;
                text-transform: uppercase;
                letter-spacing: 0.04em;
                display: block;
                margin-bottom: 5px;
            }
        </style>

        <div class="cc-container-end">
            <!-- Barra de Ferramentas -->
            <div id="prop-toolbar-enderecos" class="cc-toolbar-end">
                <!-- Badge Lado Esquerdo: Dropdown de Navegação -->
                <div class="saas-dropdown-container">
                    <div class="saas-nav-item active" id="tab-prop-lista" onclick="switchPropostaTab('lista')" style="display: flex; align-items: center; gap: 0.25rem;">
                        <i class="ph ph-list-bullets"></i> Lista de Propostas <i class="ph ph-caret-down" style="font-size: 0.8rem; opacity: 0.7;"></i>
                    </div>
                    <div class="saas-dropdown-menu">
                        <div class="saas-dropdown-item" onclick="abrirFormProposta(null); event.stopPropagation();">
                            <i class="ph ph-pencil-simple"></i> Nova Proposta
                        </div>
                        <div class="saas-dropdown-item" onclick="switchPropostaTab('cadastro-cliente'); event.stopPropagation();">
                            <i class="ph ph-user-plus"></i> Cadastro de Clientes
                        </div>
                        <div class="saas-dropdown-item" onclick="switchPropostaTab('cadastro-contatos'); event.stopPropagation();">
                            <i class="ph ph-identification-card"></i> Cadastro de Contatos
                        </div>
                        <div class="saas-dropdown-item" onclick="switchPropostaTab('enderecos'); event.stopPropagation();">
                            <i class="ph ph-map-pin"></i> Endereços
                        </div>
                        <div class="saas-dropdown-item" onclick="switchPropostaTab('servicos-precificacao'); event.stopPropagation();">
                            <i class="ph ph-calculator"></i> Precificação de Serviços
                        </div>
                        <div class="saas-dropdown-item" id="tab-prop-modelos-contrato" onclick="switchPropostaTab('modelos-contrato'); event.stopPropagation();">
                            <i class="ph ph-file-text"></i> Modelos de Contrato
                        </div>
                    </div>
                </div>

                <!-- Botões de Ação (Lado Direito) -->
                <div style="display:flex; gap:0.4rem; align-items:center; flex-wrap:wrap;">
                    <button type="button" onclick="window.pageCarregarEnderecos(window._pageSelectedClienteId)" title="Recarregar" style="background:#e2e8f0; color:#475569; border:none; width:38px; height:38px; border-radius:6px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; transition:all 0.15s; outline:none;" onmouseover="this.style.background='#cbd5e1'" onmouseout="this.style.background='#e2e8f0'">
                        <i class="ph ph-arrows-clockwise" style="font-size:1.15rem;"></i>
                    </button>

                    <!-- Spacer -->
                    <div style="width: 4px;"></div>

                    <button type="button" onclick="window.pageNovoEndereco()" style="background:#3b82f6; color:white; border:none; padding:0 1rem; border-radius:6px; height:38px; cursor:pointer; font-weight:600; font-size:0.85rem; display:inline-flex; align-items:center; gap:6px; transition:background 0.15s;" onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'">
                        <i class="ph ph-file-text" style="font-size:1.1rem;"></i> Novo
                    </button>
                    <button type="button" onclick="window.pageSalvarEndereco()" style="background:#16a34a; color:white; border:none; padding:0 1rem; border-radius:6px; height:38px; cursor:pointer; font-weight:600; font-size:0.85rem; display:inline-flex; align-items:center; gap:6px; transition:background 0.15s;" onmouseover="this.style.background='#15803d'" onmouseout="this.style.background='#16a34a'">
                        <i class="ph ph-check" style="font-size:1.15rem;"></i> Salvar
                    </button>
                </div>
            </div>

            <!-- Corpo da Tela -->
            <div class="cc-form-body-end">
                <!-- Seção 1: Cliente -->
                <div class="cc-section-title-end first">
                    <i class="ph ph-user"></i> Dados do Cliente
                </div>
                <div class="cc-grid-end cc-grid-end-row1" style="margin-bottom: 1.5rem;">
                    <div>
                        <label class="prop-lbl-end">Código</label>
                        <div style="display:flex; gap:0.35rem;">
                            <input type="text" id="page-cli-codigo" readonly class="cc-input-end" style="text-align:center;">
                            <button type="button" onclick="window.pageBuscarCliente()" style="background:#334155; color:#fff; border:none; padding:0 12px; border-radius:6px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; transition:all 0.2s; height:38px;" onmouseover="this.style.background='#1e293b'" onmouseout="this.style.background='#334155'" title="Buscar Cliente"><i class="ph ph-magnifying-glass" style="font-size:1rem;"></i></button>
                        </div>
                    </div>
                    <div>
                        <label class="prop-lbl-end">Razão Social</label>
                        <input type="text" id="page-cli-razao" readonly class="cc-input-end">
                    </div>
                    <div>
                        <label class="prop-lbl-end">Nome Fantasia</label>
                        <input type="text" id="page-cli-fantasia" readonly class="cc-input-end">
                    </div>
                    <div>
                        <label class="prop-lbl-end">Data de Cadastro</label>
                        <input type="text" id="page-cli-data" readonly class="cc-input-end" style="text-align:center;">
                    </div>
                </div>

                <!-- Seção 2: Cadastro de Endereço -->
                <div class="cc-section-title-end">
                    <i class="ph ph-map-pin"></i> Detalhes do Endereço de Entrega
                </div>
                <div class="cc-grid-end cc-grid-end-row1" style="margin-bottom: 0.75rem;">
                    <div>
                        <label class="prop-lbl-end">Seq.</label>
                        <input type="text" id="page-end-seq" readonly value="1" class="cc-input-end" style="text-align:center; font-weight:bold;">
                    </div>
                    <div>
                        <label class="prop-lbl-end">Nome do Local *</label>
                        <div style="display:flex; gap:0.35rem;">
                            <input type="text" id="page-end-nome" class="cc-input-end" placeholder="Ex: FILIAL CAMPINAS" style="flex:1;">
                            <button type="button" onclick="window.pageBuscarPorNomeLocal()" style="background:#334155; color:#fff; border:none; padding:0 12px; border-radius:6px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; transition:all 0.2s; height:38px;" onmouseover="this.style.background='#1e293b'" onmouseout="this.style.background='#334155'" title="Buscar por Nome do Local"><i class="ph ph-magnifying-glass" style="font-size:1rem;"></i></button>
                        </div>
                    </div>
                    <div>
                        <label class="prop-lbl-end">CPF/CNPJ</label>
                        <div style="display:flex; gap:0.35rem;">
                            <input type="text" id="page-end-cnpj" class="cc-input-end" style="flex:1;">
                            <button type="button" onclick="window.pageBuscarPorCNPJLocal()" style="background:#334155; color:#fff; border:none; padding:0 12px; border-radius:6px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; transition:all 0.2s; height:38px;" onmouseover="this.style.background='#1e293b'" onmouseout="this.style.background='#334155'" title="Buscar CNPJ"><i class="ph ph-magnifying-glass" style="font-size:1rem;"></i></button>
                        </div>
                    </div>
                    <div>
                        <label class="prop-lbl-end">Inscrição Estadual</label>
                        <input type="text" id="page-end-ie" class="cc-input-end">
                    </div>
                </div>

                <div class="cc-grid-end cc-grid-end-row2" style="margin-bottom: 0.75rem;">
                    <div>
                        <label class="prop-lbl-end">CEP *</label>
                        <div style="display:flex; gap:0.35rem;">
                            <input type="text" id="page-end-cep" class="cc-input-end" placeholder="00000-000">
                            <button type="button" onclick="window.pageBuscarCEP()" style="background:#334155; color:#fff; border:none; padding:0 12px; border-radius:6px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; transition:all 0.2s; height:38px;" onmouseover="this.style.background='#1e293b'" onmouseout="this.style.background='#334155'" title="Buscar CEP"><i class="ph ph-magnifying-glass" style="font-size:1rem;"></i></button>
                        </div>
                    </div>
                    <div>
                        <label class="prop-lbl-end">Endereço *</label>
                        <input type="text" id="page-end-rua" class="cc-input-end">
                    </div>
                    <div>
                        <label class="prop-lbl-end">Número *</label>
                        <input type="text" id="page-end-num" class="cc-input-end">
                    </div>
                    <div>
                        <label class="prop-lbl-end">Complemento</label>
                        <input type="text" id="page-end-comp" class="cc-input-end">
                    </div>
                    <div>
                        <label class="prop-lbl-end">Lat/Long (Google Maps)</label>
                        <div style="display:flex; gap:0.35rem;">
                            <input type="text" id="page-end-coords" class="cc-input-end" placeholder="-23.55052, -46.633308" style="flex:1;">
                            <button type="button" onclick="window.pageBuscarPorCoords()" style="background:#334155; color:#fff; border:none; padding:0 12px; border-radius:6px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; transition:all 0.2s; height:38px;" onmouseover="this.style.background='#1e293b'" onmouseout="this.style.background='#334155'" title="Buscar por Coordenadas"><i class="ph ph-magnifying-glass" style="font-size:1rem;"></i></button>
                        </div>
                    </div>
                </div>

                <div class="cc-grid-end cc-grid-end-row3" style="margin-bottom: 0.75rem;">
                    <div>
                        <label class="prop-lbl-end">Bairro *</label>
                        <input type="text" id="page-end-bairro" class="cc-input-end">
                    </div>
                    <div>
                        <label class="prop-lbl-end">UF *</label>
                        <input type="text" id="page-end-uf" maxlength="2" class="cc-input-end" style="text-align:center; text-transform:uppercase;">
                    </div>
                    <div>
                        <label class="prop-lbl-end">Município *</label>
                        <input type="text" id="page-end-cidade" class="cc-input-end">
                    </div>
                </div>

                <div class="cc-grid-end cc-grid-end-row4" style="margin-bottom: 1.5rem;">
                    <div>
                        <label class="prop-lbl-end">Contato</label>
                        <input type="text" id="page-end-contato" class="cc-input-end">
                    </div>
                    <div>
                        <label class="prop-lbl-end">Telefone</label>
                        <input type="text" id="page-end-fone" class="cc-input-end">
                    </div>
                    <div>
                        <label class="prop-lbl-end">Ramal</label>
                        <input type="text" id="page-end-ramal" class="cc-input-end">
                    </div>
                </div>

                <!-- Seção 3: Tabela de Endereços -->
                <div class="cc-section-title-end">
                    <i class="ph ph-list-bullets"></i> Endereços Cadastrados
                </div>
                <div style="font-size:0.75rem; color:#64748b; margin-bottom:0.5rem; font-family:'Inter', sans-serif;">
                    * Clique em uma linha da tabela abaixo para carregar os dados para edição ou exclusão.
                </div>
                <div style="border:1px solid #e2e8f0; border-radius:8px; overflow:hidden; background:#fff; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
                    <table style="width:100%; border-collapse:collapse; font-size:0.83rem; text-align:left; font-family:'Inter', sans-serif;">
                        <thead>
                            <tr style="background:#f8fafc; border-bottom:2px solid #cbd5e1; color:#475569;">
                                <th style="padding:12px 16px; font-weight:700; font-size:0.75rem; text-transform:uppercase; letter-spacing:0.05em; color:#64748b; width:50px; text-align:center;">#</th>
                                <th style="padding:12px 16px; font-weight:700; font-size:0.75rem; text-transform:uppercase; letter-spacing:0.05em; color:#64748b; width:200px;">Nome</th>
                                <th style="padding:12px 16px; font-weight:700; font-size:0.75rem; text-transform:uppercase; letter-spacing:0.05em; color:#64748b;">Endereço</th>
                                <th style="padding:12px 16px; font-weight:700; font-size:0.75rem; text-transform:uppercase; letter-spacing:0.05em; color:#64748b; width:150px;">Município / UF</th>
                                <th style="padding:12px 16px; font-weight:700; font-size:0.75rem; text-transform:uppercase; letter-spacing:0.05em; color:#64748b; width:80px; text-align:center;">Ações</th>
                            </tr>
                        </thead>
                        <tbody id="page-end-tbody">
                            <!-- Endereços renderizados dinamicamente -->
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    // Initialize state
    window._pageSelectedClienteId = null;
    window._pageEnderecos = [];
    window._pageEnderecoEditandoId = null;

    const propClienteInput = document.getElementById('prop-cliente');
    const clientName = propClienteInput ? propClienteInput.value.trim() : '';

    if (clientName) {
        apiGet('/clientes').then(clientes => {
            const matchedClient = (clientes || []).find(c => c.nome_razao_social && c.nome_razao_social.trim() === clientName);
            if (matchedClient) {
                window._pageSelectedClienteId = matchedClient.id;
                document.getElementById('page-cli-codigo').value = matchedClient.codigo || '';
                document.getElementById('page-cli-razao').value = matchedClient.nome_razao_social || '';
                document.getElementById('page-cli-fantasia').value = matchedClient.nome_fantasia || '';
                document.getElementById('page-cli-data').value = matchedClient.data_cadastro ? matchedClient.data_cadastro.split('-').reverse().join('/') : '';
                window.pageCarregarEnderecos(matchedClient.id);
            } else {
                window.pageRenderEnderecos();
            }
        }).catch(err => {
            console.error(err);
            window.pageRenderEnderecos();
        });
    } else {
        window.pageRenderEnderecos();
    }
}
window.pageCarregarEnderecos = async function(clienteId) {
    try {
        const res = await apiGet(`/clientes/${clienteId}/enderecos`) || [];
        window._pageEnderecos = res;
        window.pageRenderEnderecos();
        window.pageNovoEndereco();
    } catch(err) {
        console.error(err);
    }
};

window.pageRenderEnderecos = function() {
    const tbody = document.getElementById('page-end-tbody');
    if (!tbody) return;

    if (!window._pageEnderecos || window._pageEnderecos.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="padding:1rem; text-align:center; color:#94a3b8;">
                    Nenhum endereço de entrega cadastrado.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = window._pageEnderecos.map((e, idx) => `
        <tr onclick="window.pageCarregarEnderecoForm(${idx})" style="border-bottom:1px solid #f1f5f9; transition:background 0.15s; cursor:pointer;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''">
            <td style="padding:10px 12px; text-align:center; color:#475569; font-weight:bold;">${e.sequencia}</td>
            <td style="padding:10px 12px; color:#1e293b; font-weight:600;">${e.nome_local || '—'}</td>
            <td style="padding:10px 12px; color:#475569;">${e.endereco || ''}${e.numero ? ', ' + e.numero : ''}${e.bairro ? ' - ' + e.bairro : ''}</td>
            <td style="padding:10px 12px; color:#475569;">${e.municipio || ''} / ${e.uf || ''}</td>
            <td style="padding:10px 12px; text-align:center;">
                <button type="button" onclick="event.stopPropagation(); window.pageExcluirEndereco(${idx})" style="background:#fee2e2; color:#ef4444; border:none; padding:6px 8px; border-radius:6px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; transition:0.15s; outline:none;" onmouseover="this.style.background='#ef4444'; this.style.color='#fff';" onmouseout="this.style.background='#fee2e2'; this.style.color='#ef4444';" title="Excluir Endereço">
                    <i class="ph ph-trash" style="font-size:0.9rem;"></i>
                </button>
            </td>
        </tr>
    `).join('');
};

window.pageCarregarEnderecoForm = function(idx) {
    const e = window._pageEnderecos[idx];
    if (!e) return;

    window._pageEnderecoEditandoId = e.id;
    document.getElementById('page-end-seq').value = e.sequencia || '1';
    document.getElementById('page-end-nome').value = e.nome_local || '';
    document.getElementById('page-end-cnpj').value = e.cpf_cnpj || '';
    document.getElementById('page-end-ie').value = e.inscricao_estadual || '';
    document.getElementById('page-end-cep').value = e.cep || '';
    document.getElementById('page-end-rua').value = e.endereco || '';
    document.getElementById('page-end-num').value = e.numero || '';
    document.getElementById('page-end-comp').value = e.complemento || '';
    document.getElementById('page-end-bairro').value = e.bairro || '';
    document.getElementById('page-end-uf').value = e.uf || '';
    document.getElementById('page-end-cidade').value = e.municipio || '';
    document.getElementById('page-end-coords').value = e.coordenadas || '';
    document.getElementById('page-end-contato').value = e.contato || '';
    document.getElementById('page-end-fone').value = e.telefone || '';
    document.getElementById('page-end-ramal').value = e.ramal || '';
};

window.pageNovoEndereco = function() {
    window._pageEnderecoEditandoId = null;
    let nextSeq = 1;
    if (window._pageEnderecos && window._pageEnderecos.length > 0) {
        nextSeq = Math.max(...window._pageEnderecos.map(e => e.sequencia || 0)) + 1;
    }

    document.getElementById('page-end-seq').value = nextSeq;
    document.getElementById('page-end-nome').value = '';
    document.getElementById('page-end-cnpj').value = '';
    document.getElementById('page-end-ie').value = '';
    document.getElementById('page-end-cep').value = '';
    document.getElementById('page-end-rua').value = '';
    document.getElementById('page-end-num').value = '';
    document.getElementById('page-end-comp').value = '';
    document.getElementById('page-end-bairro').value = '';
    document.getElementById('page-end-uf').value = '';
    document.getElementById('page-end-cidade').value = '';
    document.getElementById('page-end-coords').value = '';
    document.getElementById('page-end-contato').value = '';
    document.getElementById('page-end-fone').value = '';
    document.getElementById('page-end-ramal').value = '';
};

window.pageSalvarEndereco = async function() {
    if (!window._pageSelectedClienteId) {
        Swal.fire('Aviso', 'Selecione um cliente primeiro.', 'warning');
        return;
    }

    const seqVal = parseInt(document.getElementById('page-end-seq').value);
    const nomeVal = document.getElementById('page-end-nome').value.trim();
    const cepVal = document.getElementById('page-end-cep').value.trim();
    const ruaVal = document.getElementById('page-end-rua').value.trim();
    const numVal = document.getElementById('page-end-num').value.trim();
    const bairroVal = document.getElementById('page-end-bairro').value.trim();
    const ufVal = document.getElementById('page-end-uf').value.trim().toUpperCase();
    const cidadeVal = document.getElementById('page-end-cidade').value.trim();

    if (!nomeVal) {
        alert('Por favor, preencha o Nome do Local.');
        return;
    }
    if (!cepVal) {
        alert('Por favor, preencha o CEP.');
        return;
    }
    if (!ruaVal) {
        alert('Por favor, preencha o Endereço.');
        return;
    }
    if (!numVal) {
        alert('Por favor, preencha o Número.');
        return;
    }
    if (!bairroVal) {
        alert('Por favor, preencha o Bairro.');
        return;
    }
    if (!ufVal) {
        alert('Por favor, preencha a UF.');
        return;
    }
    if (!cidadeVal) {
        alert('Por favor, preencha o Município.');
        return;
    }

    const payload = {
        id: window._pageEnderecoEditandoId,
        sequencia: seqVal,
        nome_local: nomeVal,
        cpf_cnpj: document.getElementById('page-end-cnpj').value.trim(),
        inscricao_estadual: document.getElementById('page-end-ie').value.trim(),
        cep: cepVal,
        endereco: ruaVal,
        numero: numVal,
        complemento: document.getElementById('page-end-comp').value.trim(),
        bairro: bairroVal,
        uf: ufVal,
        municipio: cidadeVal,
        coordenadas: document.getElementById('page-end-coords').value.trim(),
        contato: document.getElementById('page-end-contato').value.trim(),
        telefone: document.getElementById('page-end-fone').value.trim(),
        ramal: document.getElementById('page-end-ramal').value.trim()
    };

    try {
        const res = await apiPost(`/clientes/${window._pageSelectedClienteId}/enderecos`, payload);
        if (res && res.success) {
            if (typeof mostrarToastSucesso === 'function') {
                mostrarToastSucesso('Endereço salvo com sucesso!');
            }
            window.pageCarregarEnderecos(window._pageSelectedClienteId);
        } else {
            alert('Erro ao salvar endereço: ' + (res && res.error ? res.error : 'Resposta inválida do servidor.'));
        }
    } catch(err) {
        console.error(err);
        alert('Erro ao salvar endereço: ' + err.message);
    }
};

window.pageExcluirEndereco = async function(idx) {
    const e = window._pageEnderecos[idx];
    if (!e) return;

    if (!confirm(`Deseja realmente excluir o endereço "${e.nome_local}"?`)) {
        return;
    }

    try {
        const res = await apiDelete(`/clientes/${window._pageSelectedClienteId}/enderecos/${e.id}`);
        if (res && res.success) {
            if (typeof mostrarToastSucesso === 'function') {
                mostrarToastSucesso('Endereço excluído com sucesso!');
            }
            window.pageCarregarEnderecos(window._pageSelectedClienteId);
        }
    } catch(err) {
        console.error(err);
        alert('Erro ao excluir endereço: ' + err.message);
    }
};

window.pageBuscarCEP = async function() {
    const cepRaw = document.getElementById('page-end-cep')?.value || '';
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

        document.getElementById('page-end-rua').value = data.logradouro || '';
        document.getElementById('page-end-bairro').value = data.bairro || '';
        document.getElementById('page-end-uf').value = data.uf || '';
        document.getElementById('page-end-cidade').value = data.localidade || '';

        // Buscar coordenadas via OSM Nominatim
        try {
            const nomRes = await fetch(`https://nominatim.openstreetmap.org/search?postalcode=${cep}&country=Brazil&format=json`, {
                headers: { 'User-Agent': 'SistemaAmerica/1.0' }
            });
            if (nomRes.ok) {
                const geo = await nomRes.json();
                if (geo && geo.length > 0) {
                    const lat = parseFloat(geo[0].lat).toFixed(6);
                    const lon = parseFloat(geo[0].lon).toFixed(6);
                    document.getElementById('page-end-coords').value = `${lat}, ${lon}`;
                }
            }
        } catch (e) {
            console.warn('Erro ao obter coordenadas do CEP:', e);
        }

        if (typeof mostrarToastSucesso === 'function') {
            mostrarToastSucesso('Endereço importado com sucesso!');
        }
    } catch(e) {
        console.error(e);
        alert('Erro ao buscar CEP: ' + e.message);
    }
};

window.pageBuscarCliente = async function() {
    try {
        const clientes = await apiGet('/clientes') || [];
        if (clientes.length === 0) {
            Swal.fire('Aviso', 'Nenhum cliente cadastrado.', 'info');
            return;
        }

        const rowsHtml = clientes.map(c => `
            <tr onclick="window.pageSelecionarClienteBusca('${encodeURIComponent(JSON.stringify(c))}')" style="cursor:pointer; border-bottom:1px solid #e2e8f0;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background=''">
                <td style="padding:0.5rem; text-align:center; font-weight:bold; color:#2e58a6;">${c.codigo}</td>
                <td style="padding:0.5rem; text-align:left; font-weight:600; color:#1e293b;">${c.nome_razao_social}</td>
                <td style="padding:0.5rem; text-align:left; color:#475569;">${c.cpf_cnpj || '—'}</td>
            </tr>
        `).join('');

        Swal.fire({
            title: '',
            html: `
                <div style="text-align:left; font-family:'Inter', sans-serif; display:flex; flex-direction:column; padding:0; border-radius:12px; overflow:hidden;">
                    <div style="font-size:1.05rem; font-weight:800; color:#1e293b; border-bottom:1px solid #e2e8f0; padding:12px 16px; background:#f8fafc; display:flex; align-items:center; gap:6px;">
                        <i class="ph ph-user-focus" style="color:#7c3aed; font-size:1.2rem;"></i> Selecionar Cliente
                    </div>
                    <div style="padding:16px; display:flex; flex-direction:column; gap:10px; background:#f1f5f9;">
                        <input type="text" id="page-submodal-search-cliente" placeholder="Filtrar por nome..." style="width:100%; padding:0 12px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.85rem; height:38px; box-sizing:border-box; outline:none; transition:border-color 0.15s;" onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='#cbd5e1'" oninput="window.pageSubmodalFiltrarClientes(this.value)">
                        <div style="height:220px; overflow-y:auto; border:1px solid #e2e8f0; border-radius:8px; background:#fff; box-shadow:0 1px 3px rgba(0,0,0,0.02);">
                            <table style="width:100%; border-collapse:collapse; font-size:0.82rem; text-align:left;">
                                <thead>
                                    <tr style="background:#f8fafc; border-bottom:2px solid #cbd5e1; color:#475569;">
                                        <th style="padding:10px 12px; font-weight:700; font-size:0.7rem; text-transform:uppercase; letter-spacing:0.05em; color:#64748b; text-align:center; width:60px; position:sticky; top:0; background:#f8fafc; z-index:1;">Cód</th>
                                        <th style="padding:10px 12px; font-weight:700; font-size:0.7rem; text-transform:uppercase; letter-spacing:0.05em; color:#64748b; position:sticky; top:0; background:#f8fafc; z-index:1;">Razão Social</th>
                                        <th style="padding:10px 12px; font-weight:700; font-size:0.7rem; text-transform:uppercase; letter-spacing:0.05em; color:#64748b; width:120px; position:sticky; top:0; background:#f8fafc; z-index:1;">CNPJ</th>
                                    </tr>
                                </thead>
                                <tbody id="page-submodal-cliente-tbody">
                                    ${rowsHtml}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `,
            showConfirmButton: false,
            width: '500px',
            customClass: {
                popup: 'custom-swal-padding-zero'
            }
        });

        window.pageSubmodalFiltrarClientes = function(term) {
            const tbody = document.getElementById('page-submodal-cliente-tbody');
            if (!tbody) return;
            const query = term.toLowerCase();
            const filtered = clientes.filter(c => 
                (c.nome_razao_social && c.nome_razao_social.toLowerCase().includes(query)) ||
                (c.codigo && c.codigo.toString().includes(query)) ||
                (c.cpf_cnpj && c.cpf_cnpj.includes(query))
            );
            tbody.innerHTML = filtered.map(c => `
                <tr onclick="window.pageSelecionarClienteBusca('${encodeURIComponent(JSON.stringify(c))}')" style="cursor:pointer; border-bottom:1px solid #e2e8f0;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background=''">
                    <td style="padding:0.5rem; text-align:center; font-weight:bold; color:#2e58a6;">${c.codigo}</td>
                    <td style="padding:0.5rem; text-align:left; font-weight:600; color:#1e293b;">${c.nome_razao_social}</td>
                    <td style="padding:0.5rem; text-align:left; color:#475569;">${c.cpf_cnpj || '—'}</td>
                </tr>
            `).join('');
        };

        window.pageSelecionarClienteBusca = function(jsonStr) {
            const c = JSON.parse(decodeURIComponent(jsonStr));
            window._pageSelectedClienteId = c.id;
            
            document.getElementById('page-cli-codigo').value = c.codigo || '';
            document.getElementById('page-cli-razao').value = c.nome_razao_social || '';
            document.getElementById('page-cli-fantasia').value = c.nome_fantasia || '';
            document.getElementById('page-cli-data').value = c.data_cadastro ? c.data_cadastro.split('-').reverse().join('/') : '';
            
            window.pageCarregarEnderecos(c.id);
            Swal.close();
        };
    } catch(err) {
        console.error(err);
    }
};

console.log('[PROPOSTAS] Módulo frontend de proposta carregado.');
console.log('[CONTATOS] Módulo frontend de cadastro de contatos carregado.');

// --- GESTÃO DE QUALIDADE (5W2H & IA) ---
if (typeof window._acoes5W2H === 'undefined') {
    window._acoes5W2H = [
        { gargalo: 'Preço Elevado', oQue: 'Revisar tabela de preços e margem para locações de longo prazo', quem: 'Comercial / Diretoria', prazo: '2026-07-20', pdca: 'Plan' },
        { gargalo: 'Prazo de Mobilização', oQue: 'Otimizar o fluxo de revisão de frota na oficina para acelerar entrega', quem: 'Operações / Frota', prazo: '2026-07-15', pdca: 'Do' }
    ];
}

window.adicionarLinha5W2H = function() {
    if (typeof Swal === 'undefined') {
        alert('Erro: SweetAlert2 não carregado.');
        return;
    }
    Swal.fire({
        title: 'Nova Ação 5W2H',
        html: `
            <div style="text-align:left; font-family:'Inter',sans-serif; display:flex; flex-direction:column; gap:0.75rem;">
                <div>
                    <label style="font-size:0.75rem; font-weight:700; color:#475569; text-transform:uppercase;">Gargalo (Ishikawa) *</label>
                    <input type="text" id="swal-5w2h-gargalo" class="swal2-input" style="width:100%; margin:4px 0; box-sizing:border-box; font-size:0.85rem;" placeholder="Ex: Preço elevado">
                </div>
                <div>
                    <label style="font-size:0.75rem; font-weight:700; color:#475569; text-transform:uppercase;">O quê (Ação Corretiva) *</label>
                    <input type="text" id="swal-5w2h-oque" class="swal2-input" style="width:100%; margin:4px 0; box-sizing:border-box; font-size:0.85rem;" placeholder="Ex: Oferecer desconto progressivo">
                </div>
                <div>
                    <label style="font-size:0.75rem; font-weight:700; color:#475569; text-transform:uppercase;">Quem (Responsável) *</label>
                    <input type="text" id="swal-5w2h-quem" class="swal2-input" style="width:100%; margin:4px 0; box-sizing:border-box; font-size:0.85rem;" placeholder="Ex: João da Silva">
                </div>
                <div>
                    <label style="font-size:0.75rem; font-weight:700; color:#475569; text-transform:uppercase;">Prazo *</label>
                    <input type="date" id="swal-5w2h-prazo" class="swal2-input" style="width:100%; margin:4px 0; box-sizing:border-box; font-size:0.85rem;">
                </div>
                <div>
                    <label style="font-size:0.75rem; font-weight:700; color:#475569; text-transform:uppercase;">Etapa PDCA *</label>
                    <select id="swal-5w2h-pdca" class="swal2-select" style="width:100%; margin:4px 0; box-sizing:border-box; padding:0.5rem; border-radius:6px; border:1px solid #cbd5e1; font-size:0.85rem;">
                        <option value="Plan">Plan (Planejar)</option>
                        <option value="Do">Do (Executar)</option>
                        <option value="Check">Check (Verificar)</option>
                        <option value="Act">Act (Agir)</option>
                    </select>
                </div>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Adicionar',
        cancelButtonText: 'Cancelar',
        preConfirm: () => {
            const gargalo = document.getElementById('swal-5w2h-gargalo').value.trim();
            const oQue = document.getElementById('swal-5w2h-oque').value.trim();
            const quem = document.getElementById('swal-5w2h-quem').value.trim();
            const prazo = document.getElementById('swal-5w2h-prazo').value;
            const pdca = document.getElementById('swal-5w2h-pdca').value;
            
            if (!gargalo || !oQue || !quem || !prazo) {
                Swal.showValidationMessage('Todos os campos são obrigatórios!');
                return false;
            }
            return { gargalo, oQue, quem, prazo, pdca };
        }
    }).then((result) => {
        if (result.isConfirmed) {
            window._acoes5W2H.push(result.value);
            window.atualizarTabela5W2H();
            if (typeof mostrarToastSucesso === 'function') {
                mostrarToastSucesso('Ação adicionada ao Plano 5W2H!');
            }
        }
    });
};

window.atualizarTabela5W2H = function() {
    const planCol = document.getElementById('kanban-plan');
    const doCol = document.getElementById('kanban-do');
    const checkCol = document.getElementById('kanban-check');
    const actCol = document.getElementById('kanban-act');
    
    if (planCol && doCol && checkCol && actCol) {
        planCol.innerHTML = '';
        doCol.innerHTML = '';
        checkCol.innerHTML = '';
        actCol.innerHTML = '';
        
        window._acoes5W2H.forEach((a, idx) => {
            const cardHtml = `
                <div style="background:#fff; border:1px solid #e2e8f0; border-radius:8px; padding:0.65rem; box-shadow:0 1px 3px rgba(0,0,0,0.05); display:flex; flex-direction:column; gap:0.4rem; box-sizing:border-box;">
                    <div style="font-weight:700; font-size:0.78rem; color:#1e293b; display:flex; justify-content:space-between; align-items:center;">
                        <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:105px;" title="${a.gargalo}">${a.gargalo}</span>
                        <i class="ph ph-trash" onclick="window.removerAcaoKanban(${idx})" style="color:#ef4444; cursor:pointer; font-size:0.85rem;" title="Remover Ação"></i>
                    </div>
                    <div style="font-size:0.72rem; color:#475569; line-height:1.25; overflow:hidden; display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;" title="${a.oQue}">${a.oQue}</div>
                    <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.65rem; color:#64748b; margin-top:0.15rem; border-top:1px dashed #e2e8f0; padding-top:4px;">
                        <span>👤 <b>${a.quem}</b></span>
                        <span>📅 ${a.prazo.split('-').reverse().join('/')}</span>
                    </div>
                    <div style="display:flex; align-items:center; justify-content:space-between; margin-top:0.15rem; font-size:0.65rem; border-top:1px solid #f1f5f9; padding-top:4px;">
                        <span style="font-weight:700; color:#94a3b8;">ETAPA:</span>
                        <select onchange="window.moverCardKanban(${idx}, this.value)" style="font-size:0.65rem; border:1px solid #cbd5e1; border-radius:4px; padding:1px; color:#475569; background:#fff; cursor:pointer; font-family:'Inter',sans-serif;">
                            <option value="Plan" ${a.pdca === 'Plan' ? 'selected' : ''}>Plan</option>
                            <option value="Do" ${a.pdca === 'Do' ? 'selected' : ''}>Do</option>
                            <option value="Check" ${a.pdca === 'Check' ? 'selected' : ''}>Check</option>
                            <option value="Act" ${a.pdca === 'Act' ? 'selected' : ''}>Act</option>
                        </select>
                    </div>
                </div>
            `;
            
            if (a.pdca === 'Plan') planCol.innerHTML += cardHtml;
            else if (a.pdca === 'Do') doCol.innerHTML += cardHtml;
            else if (a.pdca === 'Check') checkCol.innerHTML += cardHtml;
            else if (a.pdca === 'Act') actCol.innerHTML += cardHtml;
        });

        const emptyMsg = '<div style="text-align:center; padding:1.2rem 0.2rem; color:#cbd5e1; font-style:italic; font-size:0.7rem;">Sem ações</div>';
        if (!planCol.innerHTML) planCol.innerHTML = emptyMsg;
        if (!doCol.innerHTML) doCol.innerHTML = emptyMsg;
        if (!checkCol.innerHTML) checkCol.innerHTML = emptyMsg;
        if (!actCol.innerHTML) actCol.innerHTML = emptyMsg;
    }
};

window.removerAcaoKanban = function(idx) {
    window._acoes5W2H.splice(idx, 1);
    window.atualizarTabela5W2H();
};

window.removerAcao5W2H = window.removerAcaoKanban;

window.moverCardKanban = function(idx, novaEtapa) {
    if (window._acoes5W2H[idx]) {
        window._acoes5W2H[idx].pdca = novaEtapa;
        window.atualizarTabela5W2H();
        if (typeof mostrarToastSucesso === 'function') {
            mostrarToastSucesso(`Ação movida para etapa ${novaEtapa}!`);
        }
    }
};

window.analisarComIA = async function() {
    const obs = document.getElementById('ia-observacoes')?.value || '';
    const resultDiv = document.getElementById('ia-resultado');
    if (!resultDiv) return;
    
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = `
        <div style="display:flex; align-items:center; gap:8px; color:#64748b; font-family:'Inter', sans-serif;">
            <i class="ph ph-circle-notch" style="font-size:1.2rem; animation: spin 1s linear infinite;"></i>
            <span>IA está analisando o diagnóstico do Ishikawa e gerando plano de ação 5W2H...</span>
        </div>
    `;
    
    let dados = {
        "Metodo": 12,
        "Maquina": 2,
        "Medida": 25,
        "MeioAmbiente": 18,
        "MaodeObra": 6,
        "Material": 14
    };
    try {
        const res = await apiGet('/ia/diagnostico-ishikawa');
        if (res && typeof res === 'object') {
            dados = res;
        }
    } catch(e) {
        console.error("Erro ao obter diagnóstico de Ishikawa para IA:", e);
    }
    
    setTimeout(() => {
        // Identificar a categoria do Ishikawa com a maior frequência
        const entries = Object.entries(dados);
        entries.sort((a, b) => b[1] - a[1]);
        const maiorCategoria = entries[0][0];
        const freq = entries[0][1];
        
        let gargalo = "";
        let oQue = "";
        let quem = "";
        let prazo = "";
        let justificativa = "";
        
        // Regra de Negócio: Mapear ação 5W2H focada para o maior gargalo (Ishikawa)
        if (maiorCategoria === 'Medida') {
            gargalo = 'Perda por Preço / Orçamento';
            oQue = 'Implementar política de descontos progressivos baseada no volume de locação';
            quem = 'Diretoria Comercial';
            prazo = '2026-07-30';
            justificativa = 'Combater as perdas por precificação alta ou estouro de orçamento do cliente.';
        } else if (maiorCategoria === 'MeioAmbiente') {
            gargalo = 'Perda por Concorrência';
            oQue = 'Realizar benchmark semanal de tarifas praticadas pelos concorrentes da região';
            quem = 'Analista de Inteligência de Mercado';
            prazo = '2026-07-25';
            justificativa = 'Identificar desvios de tarifas de locação em relação aos concorrentes locais.';
        } else if (maiorCategoria === 'Material') {
            gargalo = 'Especificação Técnica';
            oQue = 'Revisar portfólio de ativos e atualizar fichas técnicas no catálogo comercial';
            quem = 'Gerente de Engenharia / Ativos';
            prazo = '2026-08-05';
            justificativa = 'Garantir que a especificação dos geradores e equipamentos atenda a demanda técnica do cliente.';
        } else if (maiorCategoria === 'Metodo') {
            gargalo = 'Perda por Prazos / Processos';
            oQue = 'Desenvolver fluxo de SLA prioritário de proposta comercial de até 4 horas';
            quem = 'Equipe Comercial';
            prazo = '2026-07-20';
            justificativa = 'Reduzir perdas por lentidão no envio de orçamentos e follow-ups de leads.';
        } else if (maiorCategoria === 'MaodeObra') {
            gargalo = 'Treinamento de Equipe';
            oQue = 'Realizar treinamento de técnicas de negociação para vendedores com baixa conversão';
            quem = 'Recursos Humanos / Comercial';
            prazo = '2026-08-10';
            justificativa = 'Capacitar a equipe comercial nas tratativas de objeções no fechamento.';
        } else {
            gargalo = 'Falha de Equipamento / Máquina';
            oQue = 'Otimizar o fluxo de checklist preventivo de entrega de geradores e máquinas';
            quem = 'Oficina / Frota';
            prazo = '2026-07-15';
            justificativa = 'Evitar reprovação ou cancelamento de contratos devido a falhas pré-locação.';
        }
        
        const novaAcao = {
            gargalo: gargalo,
            oQue: oQue,
            quem: quem,
            prazo: prazo,
            pdca: 'Plan' // Adicionado ao Plan stage do Kanban
        };
        
        // Evitar duplicidade na lista de ações
        const existe = window._acoes5W2H.some(a => a.gargalo === gargalo);
        if (!existe) {
            window._acoes5W2H.push(novaAcao);
            window.atualizarTabela5W2H();
        }
        
        resultDiv.innerHTML = `
            <div style="font-weight:700; color:#1e293b; margin-bottom:8px; display:flex; align-items:center; gap:6px;">
                <i class="ph ph-sparkle" style="color:#7048e8;"></i> INSIGHTS GERADOS COM IA (Ishikawa 6M):
            </div>
            <p style="margin:0 0 8px 0;">Análise concluída com base no diagnóstico do Ishikawa: <b>${JSON.stringify(dados)}</b>.</p>
            <p style="margin:0 0 8px 0;">A categoria com maior frequência de perdas comerciais é <b>"${maiorCategoria}" (${freq} ocorrências)</b>.</p>
            
            <div style="background:#e0f2fe; border:1px solid #bae6fd; border-radius:8px; padding:0.8rem; margin:10px 0; font-size:0.8rem;">
                <div style="font-weight:800; color:#0369a1; margin-bottom:4px; text-transform:uppercase;">Plano de Ação 5W2H Sugerido & Adicionado ao Kanban:</div>
                <div style="display:grid; grid-template-columns: 80px 1fr; gap:4px;">
                    <b>Gargalo:</b> <span>${gargalo}</span>
                    <b>O quê:</b> <span>${oQue}</span>
                    <b>Quem:</b> <span>${quem}</span>
                    <b>Prazo:</b> <span>${prazo.split('-').reverse().join('/')}</span>
                    <b>Por quê:</b> <span>${justificativa}</span>
                </div>
            </div>
            
            <p style="margin:0; font-size:0.75rem; color:#64748b;"><i>* Nota: O card de melhoria foi inserido na coluna <b>Plan (Planejar)</b> do Kanban para acompanhamento das etapas de PDCA.</i></p>
        `;
    }, 2000);
};

window.calcularCurvaABC = function(dados) {
    const agrupado = {};
    dados.forEach(p => {
        const cliente = p.cliente_nome || 'N/A';
        const valor = typeof p.valor_total === 'number' ? p.valor_total : parseFloat(p.valor_total) || 0;
        agrupado[cliente] = (agrupado[cliente] || 0) + valor;
    });

    const lista = Object.entries(agrupado).map(([cliente, valor]) => ({
        cliente_nome: cliente,
        valor_total: valor
    }));

    lista.sort((a, b) => b.valor_total - a.valor_total);

    const totalGeral = lista.reduce((a, b) => a + b.valor_total, 0);
    let acumulado = 0;

    return lista.map(item => {
        acumulado += item.valor_total;
        const pct = totalGeral > 0 ? (acumulado / totalGeral) * 100 : 0;
        const classe = pct <= 80 ? 'A' : (pct <= 95 ? 'B' : 'C');
        return {
            cliente_nome: item.cliente_nome,
            valor: item.valor_total,
            percentual: pct.toFixed(2),
            classe: classe
        };
    });
};

window.atualizarTabelaCurvaABC = function(lista) {
    const tbody = document.getElementById('tbody-curva-abc');
    if (tbody) {
        const dataset = lista || _propostasData;
        const curva = window.calcularCurvaABC(dataset);
        if (curva.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="padding:1.5rem; text-align:center; color:#94a3b8; font-style:italic;">Nenhum dado encontrado para gerar a Curva ABC.</td></tr>';
            return;
        }
        tbody.innerHTML = curva.map(c => `
            <tr style="border-bottom:1px solid #f1f5f9; transition:background 0.15s;" onmouseover="this.style.background='#fafbff'" onmouseout="this.style.background=''">
                <td style="padding:0.6rem 0.75rem; font-weight:700; color:#1e293b;">${c.cliente_nome}</td>
                <td style="padding:0.6rem 0.75rem; font-weight:600; color:#475569;">${c.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                <td style="padding:0.6rem 0.75rem; color:#64748b;">${c.percentual}%</td>
                <td style="padding:0.6rem 0.75rem; text-align:center;">
                    <span style="background:${c.classe === 'A' ? '#dcfce7' : c.classe === 'B' ? '#fef3c7' : '#fee2e2'}; color:${c.classe === 'A' ? '#15803d' : c.classe === 'B' ? '#b45309' : '#b91c1c'}; padding:3px 10px; border-radius:12px; font-weight:800; font-size:0.75rem;">
                        Classe ${c.classe}
                    </span>
                </td>
            </tr>
        `).join('');
    }
};

window.renderIshikawa = function(dados) {
    return `
        <!-- Main spine -->
        <line x1="30" y1="190" x2="680" y2="190" stroke="#1e293b" stroke-width="4"/>
        <!-- Fish head -->
        <polygon points="680,160 740,190 680,220" fill="#1e293b"/>
        <text x="690" y="195" fill="#fff" font-size="9" font-weight="900">PERDAS</text>
        
        <!-- 1. Método (top left) -->
        <line id="M-Metodo" x1="180" y1="190" x2="${180 + (dados.Metodo * 8)}" y2="${190 - (dados.Metodo * 12)}" stroke="#3b82f6" stroke-width="${1.5 + (dados.Metodo / 10)}" style="transition:all 0.5s;"/>
        <text x="${180 + (dados.Metodo * 8) - 10}" y="${190 - (dados.Metodo * 12) - 10}" fill="#1e293b" font-weight="800" font-size="11">MÉTODO (${dados.Metodo})</text>
        
        <!-- 2. Máquina (top center) -->
        <line id="M-Maquina" x1="360" y1="190" x2="${360 + (dados.Maquina * 8)}" y2="${190 - (dados.Maquina * 12)}" stroke="#64748b" stroke-width="${1.5 + (dados.Maquina / 10)}" style="transition:all 0.5s;"/>
        <text x="${360 + (dados.Maquina * 8) - 10}" y="${190 - (dados.Maquina * 12) - 10}" fill="#1e293b" font-weight="800" font-size="11">MÁQUINA (${dados.Maquina})</text>

        <!-- 3. Medida (top right) -->
        <line id="M-Medida" x1="540" y1="190" x2="${540 + (dados.Medida * 5)}" y2="${190 - (dados.Medida * 6)}" stroke="#f59e0b" stroke-width="${1.5 + (dados.Medida / 10)}" style="transition:all 0.5s;"/>
        <text x="${540 + (dados.Medida * 5) - 10}" y="${190 - (dados.Medida * 6) - 10}" fill="#1e293b" font-weight="800" font-size="11">MEDIDA (${dados.Medida})</text>

        <!-- 4. Meio Ambiente (bottom left) -->
        <line id="M-MeioAmbiente" x1="180" y1="190" x2="${180 - (dados.MeioAmbiente * 5)}" y2="${190 + (dados.MeioAmbiente * 8)}" stroke="#10b981" stroke-width="${1.5 + (dados.MeioAmbiente / 10)}" style="transition:all 0.5s;"/>
        <text x="${180 - (dados.MeioAmbiente * 5) - 30}" y="${190 + (dados.MeioAmbiente * 8) + 15}" fill="#1e293b" font-weight="800" font-size="11">MEIO AMBIENTE (${dados.MeioAmbiente})</text>

        <!-- 5. Mão de Obra (bottom center) -->
        <line id="M-MaodeObra" x1="360" y1="190" x2="${360 - (dados.MaodeObra * 8)}" y2="${190 + (dados.MaodeObra * 12)}" stroke="#ef4444" stroke-width="${1.5 + (dados.MaodeObra / 10)}" style="transition:all 0.5s;"/>
        <text x="${360 - (dados.MaodeObra * 8) - 20}" y="${190 + (dados.MaodeObra * 12) + 15}" fill="#1e293b" font-weight="800" font-size="11">MÃO DE OBRA (${dados.MaodeObra})</text>

        <!-- 6. Material (bottom right) -->
        <line id="M-Material" x1="540" y1="190" x2="${540 - (dados.Material * 5)}" y2="${190 + (dados.Material * 8)}" stroke="#7048e8" stroke-width="${1.5 + (dados.Material / 10)}" style="transition:all 0.5s;"/>
        <text x="${540 - (dados.Material * 5) - 20}" y="${190 + (dados.Material * 8) + 15}" fill="#1e293b" font-weight="800" font-size="11">MATERIAL (${dados.Material})</text>
    `;
};

window.abrirModalIshikawa = async function() {
    let dados = {
        "Metodo": 12,
        "Maquina": 2,
        "Medida": 25,
        "MeioAmbiente": 18,
        "MaodeObra": 6,
        "Material": 14
    };
    try {
        const res = await apiGet('/ia/diagnostico-ishikawa');
        if (res && typeof res === 'object') {
            dados = res;
        }
    } catch(e) {
        console.error("Erro ao carregar diagnóstico do Ishikawa da IA:", e);
    }

    const svgContent = window.renderIshikawa(dados);

    Swal.fire({
        title: 'Diagrama de Causa e Efeito (Ishikawa - 6M)',
        html: `
            <div style="background:#fff; border-radius:8px; padding:0.5rem; box-sizing:border-box;">
                <p style="font-size:0.8rem; color:#64748b; margin-bottom:1rem; text-align:center;">Agrupamento das principais causas de perda comercial mapeadas no ERP</p>
                <div style="display:flex; justify-content:center; gap:10px; margin-bottom:1rem; font-size:0.75rem; font-weight:700; flex-wrap:wrap;">
                    <span style="background:#e0f2fe; color:#0369a1; padding:2px 8px; border-radius:4px;">Método: ${dados.Metodo}</span>
                    <span style="background:#f1f5f9; color:#475569; padding:2px 8px; border-radius:4px;">Máquina: ${dados.Maquina}</span>
                    <span style="background:#fef3c7; color:#b45309; padding:2px 8px; border-radius:4px;">Medida: ${dados.Medida}</span>
                    <span style="background:#dcfce7; color:#15803d; padding:2px 8px; border-radius:4px;">Meio Ambiente: ${dados.MeioAmbiente}</span>
                    <span style="background:#fee2e2; color:#b91c1c; padding:2px 8px; border-radius:4px;">Mão de Obra: ${dados.MaodeObra}</span>
                    <span style="background:#f3e8ff; color:#6d28d9; padding:2px 8px; border-radius:4px;">Material: ${dados.Material}</span>
                </div>
                <svg viewBox="0 0 800 380" width="100%" height="320px" style="font-family:'Inter', sans-serif; overflow:visible;">
                    ${svgContent}
                </svg>
            </div>
        `,
        width: '800px',
        confirmButtonText: 'Fechar'
    });
};

window.abrirModalPreenchimentoIA = function() {
    Swal.fire({
        title: 'IA: Classificar Atendimento',
        html: `
            <div style="text-align:left; font-family:'Inter', sans-serif;">
                <p style="font-size:0.8rem; color:#64748b; margin-bottom:0.8rem;">
                    Descreva em detalhes a demanda inicial do cliente. A IA analisará o texto para sugerir a melhor categoria de proposta e preencherá automaticamente o campo de Observações.
                </p>
                <textarea id="ia-atendimento-input" rows="6" placeholder="Ex: Cliente entrou em contato solicitando a locação de um gerador de 150 kVA para canteiro de obras pelo período fixo de 6 meses..." 
                    style="width:100%; padding:0.65rem; border:1px solid #cbd5e1; border-radius:6px; font-size:0.85rem; resize:vertical; box-sizing:border-box; font-family:'Inter', sans-serif; line-height:1.4;"></textarea>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Analisar e Preencher',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#7048e8',
        cancelButtonColor: '#94a3b8',
        preConfirm: () => {
            const txt = document.getElementById('ia-atendimento-input')?.value || '';
            if (!txt.trim()) {
                Swal.showValidationMessage('Por favor, descreva o atendimento.');
                return false;
            }
            return txt;
        }
    }).then(async (result) => {
        if (result.isConfirmed && result.value) {
            Swal.fire({
                title: 'IA Analisando...',
                html: 'Aguarde enquanto identificamos o tipo de proposta...',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            try {
                const res = await apiPost('/ia/classificar-tipo', { texto: result.value });
                Swal.close();

                if (res && res.tipo_sugerido) {
                    const tipoSelect = document.getElementById('prop-tipo');
                    const obsTextarea = document.getElementById('prop-obs');

                    if (tipoSelect) {
                        tipoSelect.value = res.tipo_sugerido;
                    }
                    if (obsTextarea) {
                        obsTextarea.value = res.observacao_formatada;
                    }

                    const manutSelect = document.getElementById('prop-qtd-manutencoes');
                    if (manutSelect && res.qtd_manutencoes) {
                        manutSelect.value = res.qtd_manutencoes.toString();
                        if (typeof window.classificarRegiaoEDias === 'function') {
                            window.classificarRegiaoEDias();
                        }
                    }

                    if (res.produtos_sugeridos && res.produtos_sugeridos.length > 0) {
                        window._propProdutosAdicionados = res.produtos_sugeridos;
                        if (typeof window.renderizarProdutosPropostaGrid === 'function') {
                            window.renderizarProdutosPropostaGrid();
                        }
                    }

                    if (typeof mostrarToastSucesso === 'function') {
                        mostrarToastSucesso(`Classificado como: ${res.tipo_sugerido}!`);
                    }
                } else {
                    Swal.fire('Erro', 'Não foi possível classificar o atendimento.', 'error');
                }
            } catch (e) {
                console.error("Erro na classificação da IA:", e);
                Swal.fire('Erro', 'Houve uma falha ao contatar o servidor de IA.', 'error');
            }
        }
    });
};

window.classificarRegiaoEDias = async function() {
    const endereco = document.getElementById('prop-endereco')?.value || '';
    const qtdManut = parseInt(document.getElementById('prop-qtd-manutencoes')?.value) || 1;
    const badge = document.getElementById('prop-regiao-ia-badge');

    const chkSeg = document.getElementById('chk-dia-seg');
    const chkTer = document.getElementById('chk-dia-ter');
    const chkQua = document.getElementById('chk-dia-qua');
    const chkQui = document.getElementById('chk-dia-qui');
    const chkSex = document.getElementById('chk-dia-sex');
    const chkSab = document.getElementById('chk-dia-sab');
    const chkDom = document.getElementById('chk-dia-dom');

    if (chkSeg) chkSeg.checked = false;
    if (chkTer) chkTer.checked = false;
    if (chkQua) chkQua.checked = false;
    if (chkQui) chkQui.checked = false;
    if (chkSex) chkSex.checked = false;
    if (chkSab) chkSab.checked = false;
    if (chkDom) chkDom.checked = false;

    if (!endereco.trim()) {
        if (badge) badge.style.display = 'none';
        return;
    }

    obterCoordenadasEnderecoAsync(endereco);

    try {
        const res = await apiPost('/ia/classificar-regiao', { endereco });
        if (res && res.regiao) {
            const regiao = res.regiao;
            _propRegiaoIdentificada = regiao;

            if (badge) {
                badge.style.display = 'inline-block';
                badge.innerText = `Região: ${regiao} (IA)`;
                
                if (regiao.includes('Central')) {
                    badge.style.background = '#cffafe';
                    badge.style.color = '#0891b2';
                } else if (regiao.includes('Amarela')) {
                    badge.style.background = '#fef9c3';
                    badge.style.color = '#ca8a04';
                } else if (regiao.includes('Vermelha') || regiao.includes('Roxa')) {
                    badge.style.background = '#f3e8ff';
                    badge.style.color = '#7e22ce';
                } else {
                    badge.style.background = '#f1f5f9';
                    badge.style.color = '#475569';
                    badge.innerText = 'Outra Região';
                }
            }

            // Regras temporárias de dias conforme Qtd. de Manutenções Semanais e Região
            if (regiao.includes('Central')) {
                // Zona Central - Segunda, quarta e sexta
                if (qtdManut >= 1 && chkSeg) chkSeg.checked = true;
                if (qtdManut >= 2 && chkQua) chkQua.checked = true;
                if (qtdManut >= 3 && chkSex) chkSex.checked = true;
            } else if (regiao.includes('Amarela')) {
                // Zona Amarela - Terça e Quinta
                if (qtdManut >= 1 && chkTer) chkTer.checked = true;
                if (qtdManut >= 2 && chkQui) chkQui.checked = true;
            } else if (regiao.includes('Vermelha') || regiao.includes('Roxa')) {
                // Zona Vermelha - Segunda e Sexta
                if (qtdManut >= 1 && chkSeg) chkSeg.checked = true;
                if (qtdManut >= 2 && chkSex) chkSex.checked = true;
            }
            
            // Atualizar o campo de observações com o planejamento sugerido
            window.atualizarDiasManutencaoObs();

            // Carregar automaticamente percentual e valor_km da configuração se for nova proposta ou se o endereço mudou
            const propOriginal = _propostasEditandoId ? _propostasData.find(p => p.id === _propostasEditandoId) : null;
            const enderecoOriginal = propOriginal ? (propOriginal.endereco_instalacao || '') : '';
            if (!_propostasEditandoId || endereco.trim() !== enderecoOriginal.trim()) {
                try {
                    const configs = await apiGet('/config/logistica');
                    if (configs) {
                        let pct = 0;
                        if (regiao.includes('Central')) pct = configs.logistica_porcentagem_central;
                        else if (regiao.includes('Amarela')) pct = configs.logistica_porcentagem_amarela;
                        else if (regiao.includes('Vermelha') || regiao.includes('Roxa')) pct = configs.logistica_porcentagem_vermelha;
                        else pct = configs.logistica_porcentagem_outra;

                        const pctInput = document.getElementById('prop-percentual-zona');
                        if (pctInput) pctInput.value = pct;

                        const kmInput = document.getElementById('prop-valor-km');
                        if (kmInput) kmInput.value = configs.logistica_valor_km;

                        if (typeof window.calcularValorTotalProposta === 'function') {
                            window.calcularValorTotalProposta();
                        }
                    }
                } catch (cfgErr) {
                    console.error("Erro ao carregar configurações de logística para autocompletar:", cfgErr);
                }
            }
        }
    } catch(e) {
        console.error("Erro ao classificar região da proposta:", e);
    }
};

window.atualizarDiasManutencaoObs = function() {
    const dias = [];
    if (document.getElementById('chk-dia-seg')?.checked) dias.push('Segunda');
    if (document.getElementById('chk-dia-ter')?.checked) dias.push('Terça');
    if (document.getElementById('chk-dia-qua')?.checked) dias.push('Quarta');
    if (document.getElementById('chk-dia-qui')?.checked) dias.push('Quinta');
    if (document.getElementById('chk-dia-sex')?.checked) dias.push('Sexta');
    if (document.getElementById('chk-dia-sab')?.checked) dias.push('Sábado');
    if (document.getElementById('chk-dia-dom')?.checked) dias.push('Domingo');

    const obsTextarea = document.getElementById('prop-obs');
    const badgeText = document.getElementById('prop-regiao-ia-badge')?.innerText || '';
    if (obsTextarea) {
        let val = obsTextarea.value || '';
        // Remove blocos de manutenção antigos
        val = val.replace(/\n*--- Planejamento de Manutenções ---\n[\s\S]*?\n---------------------------------------/, '');
        
        if (dias.length > 0) {
            const block = `\n--- Planejamento de Manutenções ---\nDias: ${dias.join(', ')}\n${badgeText ? badgeText + '\n' : ''}---------------------------------------`;
            obsTextarea.value = val + block;
        } else {
            obsTextarea.value = val;
        }
    }
};

let classificarDebounceTimeout = null;
window.classificarRegiaoEDiasDebounced = function() {
    clearTimeout(classificarDebounceTimeout);
    classificarDebounceTimeout = setTimeout(() => {
        window.classificarRegiaoEDias();
    }, 800);
};

// local helper functions for route calculation and statistics
window._enderecoCoordenadasCache = window._enderecoCoordenadasCache || {};
window._geocodingQueue = window._geocodingQueue || {};

function obterRegiaoLocal(enderecoCompleto) {
    const e = enderecoCompleto.toLowerCase();
    
    const centralKw = [
        "guarulhos", "gopouva", "gopóuva", "cumbica", "pimentas", "macedo", "cecilia", "cecília", 
        "gru", "bosque maia", "taboao", "taboão", "vila galvão", "vila galvao", "bonsucesso", 
        "lavras", "soberana", "haras", "recreio", "parque cecap", "cecap",
        "mooca", "moóca", 
        "belém", "belem", "belenzinho", "bras", "brás", "pari", "cambuci", "sé", "se", "republica", "república", 
        "bela vista", "consolação", "consolacao", "santa cecilia", "santa cecília", "bom retiro",
        "santana", "tucuruvi", "casa verde", "limao", "limão", "freguesia do o", "freguesia do ó", "tremembe", 
        "tremembé", "mandaqui", "vila maria", "vila guilherme", "medeiros", "vila medeiros", "parada inglesa", 
        "jardim sao paulo", "jardim são paulo",
        "penha", "tatuape", "tatuapé", "carrão", "carrao", "vila formosa", "aricanduva", "cangaiba", "cangaíba", 
        "vila prudente", "itaquera", "artur alvim", "arthur alvim", "patriarca", "sao miguel", "são miguel", 
        "itaim paulista", "ermelino matarazzo", "ermelino", "cidade lider", "cidade líder", "cidade tiradentes", 
        "tiradentes", "guaianases", "jardim helena", "helena", "parque do carmo"
    ];
    
    const amarelaKw = [
        "butanta", "butantã", "rio pequeno", "raposo tavares", "bonfiglioli", "vila sonia", "vila sônia", 
        "jaguare", "jaguaré", "jardim paulista", "cerqueira cesar", "cerqueira césar",
        "campo limpo", "capao redondo", "capão redondo", "vila andrade", "andrade",
        "jabaquara", "cidade ademar", "socorro",
        "sapopemba", "sao rafael", "são rafael", "iguatemi",
        "pirituba",
        "aruja", "arujá", "itaquaquecetuba", "itaquá", "poa", "poá", "ferraz de vasconcelos", "ferraz", 
        "taboao da serra", "taboão da serra",
        "sao caetano do sul", "são caetano do sul", "são caetano", "sao caetano",
        "lapa", "perdizes", "barra funda", "pinheiros", "alto de pinheiros", "vila madalena",
        "vila mariana", "ipiranga", "sacoma", "sacomã", "cursino", "saude", "saúde", "moema", "itaim bibi", 
        "vila olimpia", "vila olímpia", "chacara santo antonio", "chácara santo antônio", "brooklin", "campo belo", "santo amaro",
        "sao mateus", "são mateus"
    ];
    
    const vermelhaKw = [
        "osasco", "barueri", "santana de parnaiba", "santana de parnaíba", "cajamar", "caieiras", 
        "franco da rocha", "francisco morato", "mairipora", "mairiporã", "santa isabel",
        "cotia", "granja viana", "itapevi", "jandira", "carapicuiba", "carapicuíba", "alphaville", 
        "tambore", "tamboré", "embu das artes", "embu", "itapecerica da serra", "itapecerica", 
        "embu-guaçu", "embu-guacu", "são lourenço da serra", "sao lourenço da serra",
        "diadema", "sao bernardo do campo", "são bernardo do campo", "sbc", "santo andre", "santo andré", 
        "maua", "mauá", "ribeirao pires", "ribeirão pires", "rio grande da serra",
        "suzano", "mogi das cruzes", "mogi",
        "perus", "jaragua", "jaraguá", "anhaguera", "brasilandia", "brasilândia", "cachoeirinha", 
        "grajau", "grajaú", "parelheiros", "marsilac", "cidade dutra", "jardim angela", "jardim ângela", "pedreira"
    ];

    const classes = [
        { name: "Zona Central", keywords: centralKw },
        { name: "Zona Amarela", keywords: amarelaKw },
        { name: "Zona Roxa", keywords: vermelhaKw }
    ];

    let maxScore = -1;
    let regiao = 'Outra';
    
    classes.forEach(c => {
        let score = 0;
        c.keywords.forEach(kw => {
            const regex = new RegExp(kw, 'gi');
            const matches = e.match(regex);
            if (matches) {
                score += matches.length;
            }
        });
        if (score > maxScore && score > 0) {
            maxScore = score;
            regiao = c.name;
        }
    });

    return regiao;
}

function calcularDistanciaHaversine(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c;
    return d; // Distance in km
}

async function obterCoordenadasEnderecoAsync(enderecoCompleto) {
    const key = enderecoCompleto.trim();
    if (!key) return;
    if (window._enderecoCoordenadasCache[key]) return;
    if (window._geocodingQueue[key]) return;

    window._geocodingQueue[key] = true;

    // Clean up the query string to send to Nominatim
    let cleanQuery = key;
    if (key.includes(' - ')) {
        const parts = key.split(' - ');
        const firstPartLower = parts[0].toLowerCase();
        const addressKeywords = ['rua', 'r.', 'avenida', 'av.', 'alameda', 'al.', 'rodovia', 'rod.', 'travessa', 'trv.', 'praça', 'praca', 'pça.', 'estrada', 'est.'];
        const hasKeyword = addressKeywords.some(kw => firstPartLower.includes(kw)) || /^\d+$/.test(parts[0]);
        if (!hasKeyword && parts.length > 1) {
            cleanQuery = parts.slice(1).join(' - ');
        }
    }

    try {
        const query = encodeURIComponent(cleanQuery);
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${query}`;
        
        // Respect rate limit (1.2 seconds delay)
        await new Promise(resolve => setTimeout(resolve, 1200));

        const response = await fetch(url, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'SistemaAmericaRental/1.0 (derek.oliveira@gmail.com)'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data && data.length > 0) {
                const coordsObj = {
                    lat: parseFloat(data[0].lat),
                    lon: parseFloat(data[0].lon)
                };
                window._enderecoCoordenadasCache[key] = coordsObj;
                window._enderecoCoordenadasCache[cleanQuery] = coordsObj;
                
                // Refresh rendering to calculate real distances
                if (typeof window.atualizarEstatisticasModal === 'function') {
                    window.atualizarEstatisticasModal();
                }
                if (typeof window.calcularValorTotalProposta === 'function') {
                    window.calcularValorTotalProposta();
                }
            }
        }
    } catch(err) {
        console.error("Erro geocode background:", err);
    } finally {
        delete window._geocodingQueue[key];
    }
}

window.atualizarEstatisticasModal = function() {
    const statsContainer = document.getElementById('modal-enderecos-estatisticas');
    if (!statsContainer) return;

    if (!window._modalEnderecos || window._modalEnderecos.length === 0) {
        statsContainer.innerHTML = `
            <div style="background:#f1f5f9; color:#64748b; padding:4px 8px; border-radius:6px; font-size:0.72rem;">
                Nenhum endereço cadastrado
            </div>
        `;
        return;
    }

    const regioesCount = {
        'Zona Central': 0,
        'Zona Amarela': 0,
        'Zona Roxa': 0,
        'Outra': 0
    };

    const regioesKm = {
        'Zona Central': 0,
        'Zona Amarela': 0,
        'Zona Roxa': 0,
        'Outra': 0
    };

    const LAT_A = -23.433765;
    const LON_A = -46.420206;

    window._modalEnderecos.forEach(e => {
        const fullAddress = `${e.endereco || ''}, ${e.numero || ''} - ${e.bairro || ''} - ${e.municipio || ''}/${e.uf || ''}`;
        const reg = obterRegiaoLocal(fullAddress);
        
        regioesCount[reg] = (regioesCount[reg] || 0) + 1;
        
        let distance = 0;
        const cacheKey = fullAddress.trim();
        
        if (window._enderecoCoordenadasCache[cacheKey]) {
            const coords = window._enderecoCoordenadasCache[cacheKey];
            distance = calcularDistanciaHaversine(LAT_A, LON_A, coords.lat, coords.lon);
        } else {
            // Fallback estimates
            if (reg.includes('Central')) {
                distance = (fullAddress.toLowerCase().includes('guarulhos') ? 7 : 12);
            }
            else if (reg.includes('Amarela')) distance = 18;
            else if (reg.includes('Vermelha') || reg.includes('Roxa')) distance = 28;
            else distance = 15;

            obterCoordenadasEnderecoAsync(cacheKey);
        }
        
        regioesKm[reg] += distance;
    });

    const totalCount = Object.values(regioesCount).reduce((a, b) => a + b, 0);
    const totalKm = Object.values(regioesKm).reduce((a, b) => a + b, 0);

    statsContainer.innerHTML = `
        <div style="display:flex; gap:0.6rem; align-items:center; flex-wrap:wrap; font-family:'Inter',sans-serif; font-size:0.72rem;">
            <div style="background:#f1f5f9; color:#475569; padding:4px 8px; border-radius:6px; display:inline-flex; align-items:center; gap:4px; border:1px solid #e2e8f0;">
                <i class="ph ph-hash" style="font-weight:700;"></i> Total: <b>${totalCount}</b>
            </div>
            
            <div style="background:#cffafe; color:#0891b2; padding:4px 8px; border-radius:6px; display:inline-flex; align-items:center; gap:4px; border:1px solid #a5f3fc;">
                <span style="display:inline-block; width:6px; height:6px; background:#0891b2; border-radius:50%;"></span> Zona Central: <b>${regioesCount['Zona Central']}</b> (${regioesKm['Zona Central'].toFixed(1)} km)
            </div>
            
            <div style="background:#fef9c3; color:#ca8a04; padding:4px 8px; border-radius:6px; display:inline-flex; align-items:center; gap:4px; border:1px solid #fef08a;">
                <span style="display:inline-block; width:6px; height:6px; background:#ca8a04; border-radius:50%;"></span> Zona Amarela: <b>${regioesCount['Zona Amarela']}</b> (${regioesKm['Zona Amarela'].toFixed(1)} km)
            </div>
            
            <div style="background:#f3e8ff; color:#7e22ce; padding:4px 8px; border-radius:6px; display:inline-flex; align-items:center; gap:4px; border:1px solid #e9d5ff;">
                <span style="display:inline-block; width:6px; height:6px; background:#7e22ce; border-radius:50%;"></span> Zona Roxa: <b>${regioesCount['Zona Roxa']}</b> (${regioesKm['Zona Roxa'].toFixed(1)} km)
            </div>
            
            <div style="background:#eceff1; color:#37474f; padding:4px 8px; border-radius:6px; display:inline-flex; align-items:center; gap:4px; border:1px solid #cfd8dc; font-weight:700;">
                <i class="ph ph-navigation-arrow"></i> Total KM: <b>${totalKm.toFixed(1)} km</b>
            </div>
        </div>
    `;
};

let _precificacaoInsumos = [];
let _precificacaoCustosFixos = [];
let _precificacaoServicosList = [];
let _comercialViabilidades = [];


// NEW STATE VARIABLES FOR COMMERCIAL COSTS AND PRICING
let _precSubTab = 'itens-custo'; // 'itens-custo', 'rateio-custo', 'ficha-tecnica', 'precificacao'
let _comercialItensCusto = [];
let _itemCustoEditandoId = null;
let _comercialFichas = [];
let _fichaEditandoId = null;
let _fichaItens = [];
let _precificacaoServicoCodigo = '';
let _precificacaoDados = {
    rateio_despesas_fixas: 0,
    margem_lucro: 20,
    despesas_fixas_mensais: 30000,
    custo_direto_total: 0,
    modelo_calculo: 'por_fora'
};
let _precificacaoValores = {
    custoFixo: 0,
    custoVariavel: 0,
    despesaFixa: 0,
    despesaVariavel: 0
};

window._renderServicosPrecificacaoInt = async function() {
    const container = document.getElementById('prop-view-servicos-precificacao');
    if (!container) return;

    Swal.fire({
        title: 'Carregando dados comercial...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    try {
        // Load data from backend APIs
        _comercialItensCusto = await apiGet('/comercial/itens-custo') || [];
        _comercialFichas = await apiGet('/comercial/servicos-ficha') || [];
        _precificacaoServicosList = await apiGet('/servicos-precificacao') || [];
        await _loadRateioData();
        Swal.close();
    } catch (e) {
        Swal.close();
        console.error('[CUSTOS] Erro ao carregar dados:', e);
    }

    _renderPrecificacaoBaseLayout();
};

function _renderPrecificacaoBaseLayout() {
    const container = document.getElementById('prop-view-servicos-precificacao');
    if (!container) return;

    container.innerHTML = `
        <style>
            .prec-subtab-bar {
                display: flex;
                gap: 1.5rem;
                border-bottom: 2px solid #e2e8f0;
                margin-bottom: 1.25rem;
                padding-bottom: 0.25rem;
            }
            .prec-subtab-item {
                font-size: 0.85rem;
                font-weight: 700;
                color: #64748b;
                cursor: pointer;
                padding: 0.5rem 0.25rem;
                position: relative;
                transition: all 0.2s;
            }
            .prec-subtab-item:hover {
                color: #7048e8;
            }
            .prec-subtab-item.active {
                color: #7048e8;
            }
            .prec-subtab-item.active::after {
                content: '';
                position: absolute;
                bottom: -4px;
                left: 0;
                right: 0;
                height: 3px;
                background: #7048e8;
                border-radius: 2px;
            }
            .saas-card {
                background: #fff;
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
                margin-bottom: 1.5rem;
            }
            .saas-card-header {
                padding: 1rem 1.25rem;
                border-bottom: 1px solid #f1f5f9;
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: #f8fafc;
                border-top-left-radius: 12px;
                border-top-right-radius: 12px;
            }
            .saas-card-title {
                font-size: 0.95rem;
                font-weight: 700;
                color: #1e293b;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .saas-card-body {
                padding: 1.25rem;
            }
            .prec-input-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 1rem;
            }
            .prec-input-group {
                display: flex;
                flex-direction: column;
                gap: 0.4rem;
            }
            .prec-input-group label {
                font-size: 0.76rem;
                font-weight: 700;
                color: #475569;
            }
            .prec-input-group input,
            .prec-input-group select {
                height: 36px;
                padding: 0 0.75rem;
                border: 1px solid #cbd5e1;
                border-radius: 6px;
                outline: none;
                font-size: 0.8rem;
                font-weight: 500;
                color: #1e293b;
                background: #fff;
                transition: border-color 0.2s;
            }
            .prec-input-group input:focus,
            .prec-input-group select:focus {
                border-color: #7048e8;
                box-shadow: 0 0 0 3px rgba(112, 72, 232, 0.15);
            }
            .prec-input-group input[readonly] {
                background: #f1f5f9;
                color: #64748b;
                cursor: not-allowed;
            }
            .prec-btn {
                height: 32px;
                padding: 0 1rem;
                border-radius: 6px;
                font-size: 0.78rem;
                font-weight: 700;
                display: inline-flex;
                align-items: center;
                gap: 6px;
                cursor: pointer;
                border: none;
                outline: none;
                transition: all 0.2s;
            }
            .prec-btn-primary {
                background: #7048e8;
                color: #fff;
            }
            .prec-btn-primary:hover {
                background: #5f3dc4;
            }
            .prec-btn-secondary {
                background: #f1f5f9;
                color: #475569;
                border: 1px solid #cbd5e1;
            }
            .prec-btn-secondary:hover {
                background: #e2e8f0;
            }
            .prec-btn-success {
                background: #22c55e;
                color: #fff;
            }
            .prec-btn-success:hover {
                background: #16a34a;
            }
            .prec-btn-danger {
                background: #dc2626;
                color: #fff;
            }
            .prec-btn-danger:hover {
                background: #b91c1c;
            }
            .prec-sidebar-list {
                max-height: 500px;
                overflow-y: auto;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
            }
            .prec-sidebar-item {
                padding: 0.6rem 1rem;
                border-bottom: 1px solid #e2e8f0;
                cursor: pointer;
                transition: all 0.2s;
                font-size: 0.78rem;
            }
            .prec-sidebar-item:hover {
                background: #f1f5f9;
            }
            .prec-sidebar-item.active {
                background: #ede9fc;
                border-left: 4px solid #7048e8;
                font-weight: 600;
            }
        </style>
        <div style="background:#fff; width:100%; border-radius:14px; box-shadow:0 5px 20px rgba(0,0,0,0.05); overflow:visible; margin:0 auto; border: 1px solid #e2e8f0; font-family:'Inter', sans-serif; padding:1.25rem;">
            
            <!-- Tab Switcher Bar -->
            <div class="prec-subtab-bar">
                <div class="prec-subtab-item ${_precSubTab === 'itens-custo' ? 'active' : ''}" onclick="_switchPrecSubTab('itens-custo')">
                    <i class="ph ph-tag" style="margin-right:4px;"></i> 1. Cadastro de Itens de Custo
                </div>
                <div class="prec-subtab-item ${_precSubTab === 'rateio-custo' ? 'active' : ''}" onclick="_switchPrecSubTab('rateio-custo')">
                    <i class="ph ph-percent" style="margin-right:4px;"></i> 2. Rateio de Custos
                </div>
                <div class="prec-subtab-item ${_precSubTab === 'ficha-tecnica' ? 'active' : ''}" onclick="_switchPrecSubTab('ficha-tecnica')">
                    <i class="ph ph-file-text" style="margin-right:4px;"></i> 3. Ficha Técnica do Serviço
                </div>
                <div class="prec-subtab-item ${_precSubTab === 'precificacao' ? 'active' : ''}" onclick="_switchPrecSubTab('precificacao')">
                    <i class="ph ph-calculator" style="margin-right:4px;"></i> 4. Precificação e Viabilidade
                </div>
                <div class="prec-subtab-item ${_precSubTab === 'config-logistica' ? 'active' : ''}" onclick="_switchPrecSubTab('config-logistica')">
                    <i class="ph ph-gear" style="margin-right:4px;"></i> 5. Parâmetros de Logística
                </div>
            </div>

            <!-- Tab Contents Container -->
            <div id="prec-subtab-contents"></div>

        </div>
    `;

    _renderActivePrecSubTab();
}

window._switchPrecSubTab = function(tab) {
    _precSubTab = tab;
    _renderPrecificacaoBaseLayout();
};

function _renderActivePrecSubTab() {
    const container = document.getElementById('prec-subtab-contents');
    if (!container) return;

    if (_precSubTab === 'itens-custo') {
        _renderTabItensCusto(container);
    } else if (_precSubTab === 'rateio-custo') {
        _renderTabRateioCusto(container);
    } else if (_precSubTab === 'ficha-tecnica') {
        _renderTabFichaTecnica(container);
    } else if (_precSubTab === 'precificacao') {
        _renderTabPrecificacao(container);
    } else if (_precSubTab === 'config-logistica') {
        _renderTabConfigLogistica(container);
    }
}

async function _renderTabConfigLogistica(container) {
    container.innerHTML = `
        <div class="saas-card" style="max-width:800px; margin: 0 auto;">
            <div class="saas-card-header" style="background:rgba(22, 163, 74, 0.04);">
                <div class="saas-card-title">
                    <i class="ph ph-map-trifold" style="color:#16a34a; font-size:1.1rem;"></i>
                    Configuração de Parâmetros de Logística (Zona & KM)
                </div>
            </div>
            <div class="saas-card-body" style="padding:1.5rem; display:flex; flex-direction:column; gap:1.25rem;">
                <p style="font-size:0.8rem; color:#64748b; margin:0;">
                    Cadastre os valores padrão de acréscimo percentual para cada zona do mapa e o valor por quilômetro. 
                    Estes valores serão carregados de forma automática no formulário de Propostas após a IA identificar a região do endereço de instalação.
                </p>
                
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1.25rem;">
                    <!-- Bloco: Percentuais de Zona -->
                    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:1rem; display:flex; flex-direction:column; gap:0.75rem;">
                        <h5 style="margin:0 0 0.25rem; font-size:0.82rem; color:#1e293b; font-weight:700;">Acréscimos por Zona do Mapa (%)</h5>
                        
                        <div class="prec-input-group">
                            <label style="display:flex; align-items:center; gap:6px;">
                                <span style="display:inline-block; width:8px; height:8px; background:#0891b2; border-radius:50%;"></span>
                                Zona Central (Ciano) *
                            </label>
                            <input type="number" id="cfg-pct-central" value="0" min="0" max="100" step="0.1">
                        </div>
                        
                        <div class="prec-input-group">
                            <label style="display:flex; align-items:center; gap:6px;">
                                <span style="display:inline-block; width:8px; height:8px; background:#ca8a04; border-radius:50%;"></span>
                                Zona Amarela (Amarelo) *
                            </label>
                            <input type="number" id="cfg-pct-amarela" value="0" min="0" max="100" step="0.1">
                        </div>
                        
                        <div class="prec-input-group">
                            <label style="display:flex; align-items:center; gap:6px;">
                                <span style="display:inline-block; width:8px; height:8px; background:#7e22ce; border-radius:50%;"></span>
                                Zona Vermelha (Roxo) *
                            </label>
                            <input type="number" id="cfg-pct-vermelha" value="0" min="0" max="100" step="0.1">
                        </div>
                        
                        <div class="prec-input-group">
                            <label style="display:flex; align-items:center; gap:6px;">
                                <span style="display:inline-block; width:8px; height:8px; background:#64748b; border-radius:50%;"></span>
                                Outra Região (Cinza) *
                            </label>
                            <input type="number" id="cfg-pct-outra" value="0" min="0" max="100" step="0.1">
                        </div>
                    </div>
                    
                    <!-- Bloco: Quilometragem -->
                    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:1rem; display:flex; flex-direction:column; gap:0.75rem;">
                        <h5 style="margin:0 0 0.25rem; font-size:0.82rem; color:#1e293b; font-weight:700;">Parâmetro de Quilometragem (KM)</h5>
                        
                        <div class="prec-input-group">
                            <label>Valor padrão por KM (R$) *</label>
                            <input type="number" id="cfg-valor-km" value="0" min="0" step="0.01">
                        </div>
                        
                        <div style="margin-top:auto; padding-top:1rem; border-top:1px dashed #cbd5e1; font-size:0.75rem; color:#64748b; line-height:1.4;">
                            <i class="ph ph-info" style="color:#7048e8; font-size:0.95rem; vertical-align:middle; margin-right:4px;"></i>
                            O cálculo do valor por KM multiplicará esta taxa pela distância calculada via fórmula geodésica do depósito até o local do serviço.
                        </div>
                    </div>
                </div>
                
                <div style="text-align:right; border-top:1px solid #e2e8f0; padding-top:1rem;">
                    <button class="prec-btn prec-btn-success" onclick="_salvarConfigLogistica()" style="height:36px; padding:0 1.5rem; font-size:0.82rem;">
                        <i class="ph ph-floppy-disk"></i> Salvar Configurações
                    </button>
                </div>
            </div>
        </div>
    `;

    // Carregar configurações atuais
    Swal.fire({
        title: 'Carregando configurações...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    try {
        const res = await apiGet('/config/logistica');
        Swal.close();
        if (res) {
            document.getElementById('cfg-pct-central').value = res.logistica_porcentagem_central || 0;
            document.getElementById('cfg-pct-amarela').value = res.logistica_porcentagem_amarela || 0;
            document.getElementById('cfg-pct-vermelha').value = res.logistica_porcentagem_vermelha || 0;
            document.getElementById('cfg-pct-outra').value = res.logistica_porcentagem_outra || 0;
            document.getElementById('cfg-valor-km').value = res.logistica_valor_km || 0;
        }
    } catch (e) {
        Swal.close();
        console.error("Erro ao obter configurações de logística:", e);
    }
}

window._salvarConfigLogistica = async function() {
    const payload = {
        logistica_porcentagem_central: parseFloat(document.getElementById('cfg-pct-central')?.value || 0),
        logistica_porcentagem_amarela: parseFloat(document.getElementById('cfg-pct-amarela')?.value || 0),
        logistica_porcentagem_vermelha: parseFloat(document.getElementById('cfg-pct-vermelha')?.value || 0),
        logistica_porcentagem_outra: parseFloat(document.getElementById('cfg-pct-outra')?.value || 0),
        logistica_valor_km: parseFloat(document.getElementById('cfg-valor-km')?.value || 0)
    };

    Swal.fire({
        title: 'Salvando configurações...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    try {
        const res = await apiPut('/config/logistica', payload);
        Swal.close();
        if (res && res.success) {
            Swal.fire('Sucesso', 'Configurações de Logística salvas com sucesso!', 'success');
        } else {
            Swal.fire('Erro', 'Houve uma falha ao salvar as configurações.', 'error');
        }
    } catch(e) {
        Swal.close();
        console.error(e);
        Swal.fire('Erro', 'Não foi possível salvar as configurações devido a um erro de rede.', 'error');
    }
};

/* =====================================================================
   TAB 1: CADASTRO DE ITENS DE CUSTO (CRUD)
   ===================================================================== */
function _renderTabItensCusto(container) {
    container.innerHTML = `
        <div style="display:flex; gap:1.25rem; width:100%; box-sizing:border-box;">
            
            <!-- Left Side: Form -->
            <div style="width:60%; box-sizing:border-box;">
                <div class="saas-card">
                    <div class="saas-card-header">
                        <div class="saas-card-title">
                            <i class="ph ph-tag" style="color:#7048e8; font-size:1.1rem;"></i>
                            Item de Custo
                        </div>
                        <div style="display:flex; gap:0.4rem;">
                            <button class="prec-btn prec-btn-secondary" onclick="_limparFormItemCusto()">
                                <i class="ph ph-plus"></i> Novo
                            </button>
                            <button class="prec-btn prec-btn-success" onclick="_salvarItemCusto()">
                                <i class="ph ph-check"></i> Salvar
                            </button>
                            <button class="prec-btn prec-btn-danger" id="btn-excluir-item-custo" onclick="_excluirItemCusto()" style="display:none;">
                                <i class="ph ph-trash"></i> Excluir
                            </button>
                        </div>
                    </div>
                    <div class="saas-card-body">
                        <form id="form-item-custo" onsubmit="return false;">
                            <div class="prec-input-grid" style="grid-template-columns: 1fr 1fr; margin-bottom:1rem;">
                                <div class="prec-input-group">
                                    <label>Código (Automático)</label>
                                    <input type="text" id="ic-codigo" placeholder="Gerado ao salvar" readonly>
                                </div>
                                <div class="prec-input-group">
                                    <label>Descrição do Insumo/Despesa *</label>
                                    <input type="text" id="ic-descricao" placeholder="Ex: Técnico Mecânico, Óleo Lubrificante" required>
                                </div>
                            </div>
                            
                            <div class="prec-input-grid" style="grid-template-columns: 1fr 1fr; margin-bottom:1rem;">
                                <div class="prec-input-group">
                                    <label>Tipo de Dado Financeiro *</label>
                                    <select id="ic-tipo-financeiro" onchange="_onTipoFinanceiroChange(this.value)" required>
                                        <option value="Manual">Manual</option>
                                        <option value="Planilha MDO">Planilha MDO</option>
                                        <option value="PDF Fatura">PDF Fatura</option>
                                        <option value="Nota XML">Nota XML</option>
                                    </select>
                                </div>
                                <div class="prec-input-group">
                                    <label>Natureza do Custo *</label>
                                    <div style="display:flex; gap:1.25rem; align-items:center; height:36px; padding-left:2px;">
                                        <label style="font-weight:500; font-size:0.8rem; display:flex; align-items:center; gap:4px; cursor:pointer;">
                                            <input type="radio" name="ic-natureza" value="Fixo" checked style="height:auto; width:auto; margin:0;"> Fixo
                                        </label>
                                        <label style="font-weight:500; font-size:0.8rem; display:flex; align-items:center; gap:4px; cursor:pointer;">
                                            <input type="radio" name="ic-natureza" value="Variável" style="height:auto; width:auto; margin:0;"> Variável
                                        </label>
                                    </div>
                                </div>
                                <!-- dynamic file upload container -->
                                <div class="prec-input-group" id="import-upload-container" style="display:none; grid-column: span 2; margin-top: 0.5rem; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 6px; padding: 0.75rem;">
                                    <label id="import-upload-label" style="font-weight:700; color:#475569; display:block; margin-bottom:0.4rem;">Importar Arquivo (.xlsx/.csv)</label>
                                    <div style="display:flex; gap:0.5rem; align-items:center;">
                                        <input type="file" id="import-file-input" style="flex:1; height:32px !important; padding:4px !important; font-size:0.75rem !important;" onchange="_onImportFileSelected()">
                                        <button type="button" class="prec-btn prec-btn-secondary" id="btn-processar-import" onclick="_processarImportacaoArquivo()" style="height:32px !important; font-size:0.75rem; font-weight:700; display:none;">
                                            <i class="ph ph-upload-simple" style="margin-right:2px;"></i> Processar
                                        </button>
                                    </div>
                                    <div style="font-size:0.7rem; color:#64748b; margin-top:0.3rem;" id="import-helper-text">Mapeamento automático de colunas padrão (Descrição, Valor).</div>
                                </div>
                            </div>

                            <div class="prec-input-grid" style="grid-template-columns: 1fr 1fr; margin-bottom:1rem;">
                                <div class="prec-input-group">
                                    <label>Categoria *</label>
                                    <select id="ic-categoria" required>
                                        <option value="MDO">MDO (Mão de Obra)</option>
                                        <option value="Insumo">Insumo</option>
                                        <option value="Imposto">Imposto</option>
                                        <option value="Frete">Frete</option>
                                    </select>
                                </div>
                                <div class="prec-input-group">
                                    <label>Unidade de Medida *</label>
                                    <input type="text" id="ic-unidade" placeholder="Ex: UN, H, L, KG" required>
                                </div>
                            </div>

                            <div class="prec-input-grid" style="grid-template-columns: 1fr 1fr 1fr; margin-bottom:0.5rem;">
                                <div class="prec-input-group">
                                    <label>Custo Unitário (R$) *</label>
                                    <input type="number" id="ic-custo-unitario" placeholder="0.00" step="0.01" value="0.00" required>
                                </div>
                                <div class="prec-input-group">
                                    <label>Centro de Custo</label>
                                    <input type="text" id="ic-centro-custo" placeholder="Ex: CC-COMERCIAL">
                                </div>
                                <div class="prec-input-group">
                                    <label>Vigência da Taxa</label>
                                    <input type="date" id="ic-vigencia">
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            
            <!-- Right Side: Items List -->
            <div style="width:40%; box-sizing:border-box;">
                <div class="saas-card">
                    <div class="saas-card-header">
                        <div class="saas-card-title">
                            <i class="ph ph-list-bullets" style="color:#7048e8; font-size:1.1rem;"></i>
                            Insumos e Custos Cadastrados
                        </div>
                    </div>
                    <div class="saas-card-body" style="padding:0.75rem;">
                        <div class="prec-sidebar-list">
                            ${_comercialItensCusto.length === 0 ? 
                                `<div style="padding:2rem; text-align:center; color:#94a3b8; font-size:0.8rem;">Nenhum item de custo cadastrado.</div>` :
                                _comercialItensCusto.map(item => {
                                    const activeClass = _itemCustoEditandoId === item.id ? 'active' : '';
                                    return `
                                        <div class="prec-sidebar-item ${activeClass}" onclick="_carregarItemCustoParaEdicao(${item.id})">
                                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;">
                                                <strong style="color:#1e293b;">${item.descricao}</strong>
                                                <span style="font-weight:700; color:#7048e8;">R$ ${(item.custo_unitario || 0).toFixed(2).replace('.', ',')} / ${item.unidade_medida}</span>
                                            </div>
                                            <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.7rem; color:#64748b;">
                                                <span>${item.codigo} | ${item.categoria}</span>
                                                <span class="badge" style="background:${item.natureza === 'Fixo' ? '#e2e8f0' : '#fee2e2'}; color:${item.natureza === 'Fixo' ? '#475569' : '#991b1b'}; padding:2px 6px; border-radius:4px; font-weight:600;">${item.natureza}</span>
                                            </div>
                                        </div>
                                    `;
                                }).join('')
                            }
                        </div>
                    </div>
                </div>
            </div>

        </div>
    `;

    // Make sure date of vigencia is set to today if blank
    const vigInput = document.getElementById('ic-vigencia');
    if (vigInput && !vigInput.value) {
        vigInput.value = new Date().toISOString().substring(0, 10);
    }
}

window._limparFormItemCusto = function() {
    _itemCustoEditandoId = null;
    const form = document.getElementById('form-item-custo');
    if (form) form.reset();
    
    const btnExcluir = document.getElementById('btn-excluir-item-custo');
    if (btnExcluir) btnExcluir.style.display = 'none';

    const codeInput = document.getElementById('ic-codigo');
    if (codeInput) codeInput.value = '';

    const vigInput = document.getElementById('ic-vigencia');
    if (vigInput) vigInput.value = new Date().toISOString().substring(0, 10);

    // Reset upload container
    if (window._onTipoFinanceiroChange) {
        _onTipoFinanceiroChange('Manual');
    }

    document.querySelectorAll('.prec-sidebar-item').forEach(el => el.classList.remove('active'));
};

window._carregarItemCustoParaEdicao = function(id) {
    _itemCustoEditandoId = id;
    const item = _comercialItensCusto.find(i => i.id === id);
    if (!item) return;

    _renderActivePrecSubTab();

    document.getElementById('ic-codigo').value = item.codigo || '';
    document.getElementById('ic-descricao').value = item.descricao || '';
    document.getElementById('ic-tipo-financeiro').value = item.tipo_dado_financeiro || 'Manual';
    if (window._onTipoFinanceiroChange) {
        _onTipoFinanceiroChange(item.tipo_dado_financeiro || 'Manual');
    }
    document.getElementById('ic-categoria').value = item.categoria || 'MDO';
    document.getElementById('ic-unidade').value = item.unidade_medida || '';
    document.getElementById('ic-custo-unitario').value = (item.custo_unitario || 0).toFixed(2);
    document.getElementById('ic-centro-custo').value = item.centro_custo || '';
    document.getElementById('ic-vigencia').value = item.vigencia || '';

    const radios = document.getElementsByName('ic-natureza');
    radios.forEach(r => {
        r.checked = (r.value === item.natureza);
    });

    const btnExcluir = document.getElementById('btn-excluir-item-custo');
    if (btnExcluir) btnExcluir.style.display = 'inline-flex';
};

window._salvarItemCusto = async function() {
    const descricao = document.getElementById('ic-descricao')?.value.trim();
    const tipo_dado_financeiro = document.getElementById('ic-tipo-financeiro')?.value;
    const categoria = document.getElementById('ic-categoria')?.value;
    const unidade_medida = document.getElementById('ic-unidade')?.value.trim();
    const custo_unitario = parseFloat(document.getElementById('ic-custo-unitario')?.value) || 0;
    const centro_custo = document.getElementById('ic-centro-custo')?.value.trim();
    const vigencia = document.getElementById('ic-vigencia')?.value;

    let natureza = 'Fixo';
    const radios = document.getElementsByName('ic-natureza');
    radios.forEach(r => {
        if (r.checked) natureza = r.value;
    });

    if (!descricao) { Swal.fire('Aviso', 'Por favor, digite a descrição do item.', 'warning'); return; }
    if (!unidade_medida) { Swal.fire('Aviso', 'Por favor, digite a unidade de medida.', 'warning'); return; }

    const payload = {
        id: _itemCustoEditandoId,
        descricao,
        tipo_dado_financeiro,
        natureza,
        categoria,
        unidade_medida,
        custo_unitario,
        centro_custo,
        vigencia
    };

    try {
        const res = await apiPost('/comercial/itens-custo', payload);
        if (res && res.success) {
            Swal.fire('Sucesso', 'Item de custo salvo com sucesso!', 'success');
            _comercialItensCusto = await apiGet('/comercial/itens-custo') || [];
            _limparFormItemCusto();
            _renderActivePrecSubTab();
        } else {
            Swal.fire('Erro', 'Falha ao salvar: ' + (res ? res.error : 'Erro desconhecido'), 'error');
        }
    } catch(e) {
        console.error(e);
        Swal.fire('Erro', 'Erro de comunicação com o servidor.', 'error');
    }
};

window._excluirItemCusto = async function() {
    if (!_itemCustoEditandoId) return;

    const result = await Swal.fire({
        title: 'Excluir Item de Custo?',
        text: 'Esta ação não poderá ser desfeita!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Sim, excluir!',
        cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
        try {
            const res = await apiDelete(`/comercial/itens-custo/${_itemCustoEditandoId}`);
            if (res && res.success) {
                Swal.fire('Excluído!', 'O item foi excluído.', 'success');
                _comercialItensCusto = await apiGet('/comercial/itens-custo') || [];
                _limparFormItemCusto();
                _renderActivePrecSubTab();
            } else {
                Swal.fire('Erro', 'Falha ao excluir: ' + (res ? res.error : 'Erro desconhecido'), 'error');
            }
        } catch(e) {
            console.error(e);
            Swal.fire('Erro', 'Erro ao excluir item de custo.', 'error');
        }
    }
};

window._onTipoFinanceiroChange = function(value) {
    const container = document.getElementById('import-upload-container');
    const label = document.getElementById('import-upload-label');
    const helper = document.getElementById('import-helper-text');
    const fileInput = document.getElementById('import-file-input');
    const btnProcessar = document.getElementById('btn-processar-import');

    if (!container) return;

    if (value === 'Manual') {
        container.style.display = 'none';
        if (fileInput) fileInput.value = '';
        if (btnProcessar) btnProcessar.style.display = 'none';
    } else {
        container.style.display = 'block';
        if (btnProcessar) btnProcessar.style.display = 'none';
        if (fileInput) {
            fileInput.value = '';
            if (value === 'Planilha MDO') {
                label.innerText = 'Importar Planilha MDO (.xlsx, .csv) *';
                helper.innerText = 'Mapeamento automático das colunas contendo "Descrição" e "Valor".';
                fileInput.accept = '.xlsx, .xls, .csv';
            } else if (value === 'PDF Fatura') {
                label.innerText = 'Importar PDF Fatura (.pdf) *';
                helper.innerText = 'Extração automática do Valor Total e Descrição da fatura.';
                fileInput.accept = '.pdf';
            } else if (value === 'Nota XML') {
                label.innerText = 'Importar Nota XML (.xml) *';
                helper.innerText = 'Extrator automático de tags de produto (<xProd>) e valores (<vNF>, <vUnCom>).';
                fileInput.accept = '.xml';
            }
        }
    }
};

window._onImportFileSelected = function() {
    const fileInput = document.getElementById('import-file-input');
    const btnProcessar = document.getElementById('btn-processar-import');
    if (fileInput && fileInput.files && fileInput.files.length > 0) {
        btnProcessar.style.display = 'inline-flex';
    } else {
        btnProcessar.style.display = 'none';
    }
};

window._processarImportacaoArquivo = async function() {
    const fileInput = document.getElementById('import-file-input');
    const btnProcessar = document.getElementById('btn-processar-import');
    const tipo = document.getElementById('ic-tipo-financeiro').value;

    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        Swal.fire('Aviso', 'Por favor, selecione um arquivo para importar.', 'warning');
        return;
    }

    const file = fileInput.files[0];
    const extension = file.name.split('.').pop().toLowerCase();

    // Validate extension matching the select box value
    if (tipo === 'Planilha MDO' && !['xlsx', 'xls', 'csv'].includes(extension)) {
        Swal.fire('Erro no formato do arquivo', 'Por favor, envie uma planilha válida (.xlsx, .xls, .csv).', 'error');
        return;
    }
    if (tipo === 'PDF Fatura' && extension !== 'pdf') {
        Swal.fire('Erro no formato do arquivo', 'Por favor, envie um arquivo PDF válido (.pdf).', 'error');
        return;
    }
    if (tipo === 'Nota XML' && extension !== 'xml') {
        Swal.fire('Erro no formato do arquivo', 'Por favor, envie um arquivo XML de NFe válido (.xml).', 'error');
        return;
    }

    Swal.fire({
        title: 'Importando e Processando...',
        html: 'Lendo dados estruturados do arquivo...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    const formData = new FormData();
    formData.append('arquivo', file);
    formData.append('tipo', tipo);

    try {
        const token = window.currentToken || localStorage.getItem('erp_token');
        const headers = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const apiUrl = window.API_URL || '/api';
        const response = await fetch(`${apiUrl}/comercial/itens-custo/importar`, {
            method: 'POST',
            headers: headers,
            body: formData
        });

        const res = await response.json();
        Swal.close();

        if (response.ok && res.success && res.itens && res.itens.length > 0) {
            let htmlTable = `
            <div style="text-align: left; margin-bottom: 1rem; font-size: 0.9rem; color: #475569;">
                <p>Identificamos <strong>${res.itens.length}</strong> itens de custo nesta fatura. Você pode revisar e ajustar todos os dados diretamente na tabela abaixo antes de confirmar o salvamento:</p>
            </div>
            <div style="max-height: 400px; overflow-y: auto; overflow-x: auto; width: 100%; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05); background-color: #fff;">
                <table style="width: 100%; border-collapse: collapse; font-family: inherit; font-size: 0.8rem; min-width: 950px; text-align: left;">
                    <thead>
                        <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0; color: #475569;">
                            <th style="padding: 10px 8px; font-weight: 600;">Descrição do Insumo/Despesa *</th>
                            <th style="padding: 10px 8px; font-weight: 600; width: 100px;">Custo Unit. (R$) *</th>
                            <th style="padding: 10px 8px; font-weight: 600; width: 80px;">Unidade *</th>
                            <th style="padding: 10px 8px; font-weight: 600; width: 110px;">Natureza *</th>
                            <th style="padding: 10px 8px; font-weight: 600; width: 130px;">Categoria *</th>
                            <th style="padding: 10px 8px; font-weight: 600; width: 120px;">Centro Custo</th>
                            <th style="padding: 10px 8px; font-weight: 600; width: 120px;">Vigência *</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            res.itens.forEach((it, idx) => {
                htmlTable += `
                <tr class="swal-import-row" style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 6px 4px;">
                        <input type="text" class="swal-item-desc" style="width: 100%; padding: 6px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.8rem;" value="${it.descricao || ''}" required>
                    </td>
                    <td style="padding: 6px 4px;">
                        <input type="number" step="0.01" class="swal-item-valor" style="width: 100%; padding: 6px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.8rem;" value="${parseFloat(it.valor || 0).toFixed(2)}" required>
                    </td>
                    <td style="padding: 6px 4px;">
                        <input type="text" class="swal-item-unidade" style="width: 100%; padding: 6px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.8rem;" value="${it.unidade || 'UN'}" required>
                    </td>
                    <td style="padding: 6px 4px;">
                        <select class="swal-item-natureza" style="width: 100%; padding: 6px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.8rem; background: white; height: 31px;">
                            <option value="Fixo" ${it.natureza === 'Fixo' ? 'selected' : ''}>Fixo</option>
                            <option value="Variável" ${it.natureza === 'Variável' ? 'selected' : ''}>Variável</option>
                        </select>
                    </td>
                    <td style="padding: 6px 4px;">
                        <select class="swal-item-categoria" style="width: 100%; padding: 6px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.8rem; background: white; height: 31px;">
                            <option value="MDO" ${it.categoria === 'MDO' ? 'selected' : ''}>Mão-de-obra</option>
                            <option value="Insumo" ${it.categoria === 'Insumo' ? 'selected' : ''}>Insumos</option>
                            <option value="Imposto" ${it.categoria === 'Imposto' ? 'selected' : ''}>Imposto</option>
                            <option value="Frete" ${it.categoria === 'Frete' ? 'selected' : ''}>Frete</option>
                        </select>
                    </td>
                    <td style="padding: 6px 4px;">
                        <input type="text" class="swal-item-cc" style="width: 100%; padding: 6px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.8rem;" value="CC-IMPORTACAO">
                    </td>
                    <td style="padding: 6px 4px;">
                        <input type="date" class="swal-item-vigencia" style="width: 100%; padding: 6px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.8rem;" value="${new Date().toISOString().substring(0, 10)}" required>
                    </td>
                </tr>
                `;
            });

            htmlTable += `
                    </tbody>
                </table>
            </div>
            `;

            const resultConfirm = await Swal.fire({
                title: 'Revisar Itens Importados',
                html: htmlTable,
                width: '1100px',
                showCancelButton: true,
                confirmButtonText: 'Confirmar e Salvar Tudo',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#7048e8',
                cancelButtonColor: '#64748b',
                allowOutsideClick: false,
                preConfirm: () => {
                    const rows = document.querySelectorAll('.swal-import-row');
                    const items = [];
                    let hasError = false;

                    rows.forEach((row, idx) => {
                        const desc = row.querySelector('.swal-item-desc').value.trim();
                        const val = parseFloat(row.querySelector('.swal-item-valor').value) || 0;
                        const un = row.querySelector('.swal-item-unidade').value.trim();
                        const nat = row.querySelector('.swal-item-natureza').value;
                        const cat = row.querySelector('.swal-item-categoria').value;
                        const cc = row.querySelector('.swal-item-cc').value.trim();
                        const vig = row.querySelector('.swal-item-vigencia').value;

                        if (!desc) {
                            Swal.showValidationMessage(`Linha ${idx + 1}: Descrição do item é obrigatória.`);
                            hasError = true;
                        }
                        if (val < 0) {
                            Swal.showValidationMessage(`Linha ${idx + 1}: Custo unitário inválido.`);
                            hasError = true;
                        }
                        if (!un) {
                            Swal.showValidationMessage(`Linha ${idx + 1}: Unidade de medida é obrigatória.`);
                            hasError = true;
                        }
                        if (!vig) {
                            Swal.showValidationMessage(`Linha ${idx + 1}: Vigência da taxa é obrigatória.`);
                            hasError = true;
                        }

                        items.push({
                            descricao: desc,
                            tipo_dado_financeiro: tipo,
                            natureza: nat,
                            categoria: cat,
                            unidade_medida: un,
                            custo_unitario: val,
                            centro_custo: cc || 'CC-IMPORTACAO',
                            vigencia: vig
                        });
                    });

                    if (hasError) return false;
                    return items;
                }
            });

            if (resultConfirm.isConfirmed && resultConfirm.value) {
                Swal.fire({
                    title: 'Salvando...',
                    text: 'Cadastrando itens de custo no banco de dados...',
                    allowOutsideClick: false,
                    didOpen: () => Swal.showLoading()
                });

                let importados = 0;
                for (const it of resultConfirm.value) {
                    try {
                        const postRes = await apiPost('/comercial/itens-custo', it);
                        if (postRes && postRes.success) {
                            importados++;
                        }
                    } catch (err) {
                        console.error("Erro ao salvar item importado:", it, err);
                    }
                }

                Swal.close();

                if (importados > 0) {
                    Swal.fire({
                        title: 'Importação Concluída!',
                        text: `Importamos ${importados} de ${resultConfirm.value.length} itens com sucesso.`,
                        icon: 'success'
                    });
                    _comercialItensCusto = await apiGet('/comercial/itens-custo') || [];
                    _limparFormItemCusto();
                    _renderActivePrecSubTab();
                } else {
                    Swal.fire('Erro', 'Nenhum item pôde ser importado devido a falhas de comunicação.', 'error');
                }
            }

            // Clear file input
            fileInput.value = '';
            if (btnProcessar) btnProcessar.style.display = 'none';

        } else {
            Swal.fire('Falha na Importação', res.error || 'Erro ao processar arquivo no servidor.', 'error');
        }
    } catch(e) {
        Swal.close();
        console.error('[IMPORT-CLIENT-ERROR]', e);
        Swal.fire('Erro', 'Ocorreu um erro ao enviar o arquivo para processamento.', 'error');
    }
};

/* =====================================================================
   TAB 2: RATEIO DE CUSTOS E DESPESAS POR HORA
   ===================================================================== */
let _rateioPeriodo = new Date().toISOString().substring(0, 7);
let _rateioHorasFixas = {};
let _rateioHorasVariaveis = {};

async function _loadRateioData() {
    try {
        const savedRateio = await apiGet(`/comercial/rateio-custo?periodo=${_rateioPeriodo}`) || [];
        _rateioHorasFixas = {};
        _rateioHorasVariaveis = {};
        
        savedRateio.forEach(r => {
            if (r.tipo === 'Fixo') {
                _rateioHorasFixas[r.centro_custo] = r.horas_periodo;
            } else if (r.tipo === 'Variável') {
                _rateioHorasVariaveis[r.centro_custo] = r.horas_periodo;
            }
        });
    } catch (e) {
        console.error('[RATEIO] Erro ao carregar rateio:', e);
    }
}

function _obterCustoHoraItem(itemObj) {
    if (!itemObj) return 0;
    const sector = itemObj.centro_custo || 'Sem Centro de Custo';
    const nature = itemObj.natureza; // 'Fixo' ou 'Variável'
    
    let hours = 220; // default fallback if no rateio or not configured
    if (nature === 'Fixo') {
        if (_rateioHorasFixas[sector] !== undefined) {
            hours = _rateioHorasFixas[sector];
        }
    } else {
        if (_rateioHorasVariaveis[sector] !== undefined) {
            hours = _rateioHorasVariaveis[sector];
        }
    }
    
    return hours > 0 ? (itemObj.custo_unitario / hours) : itemObj.custo_unitario;
}


window._renderTabRateioCusto = async function(container) {
    Swal.fire({
        title: 'Carregando Rateio...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });
    
    await _loadRateioData();
    Swal.close();

    // Group items from _comercialItensCusto by sector and nature
    const fixedBySector = {};
    const variableBySector = {};
    
    // Extract distinct sectors
    const sectorsSet = new Set();
    
    _comercialItensCusto.forEach(item => {
        const sector = item.centro_custo || 'Sem Centro de Custo';
        sectorsSet.add(sector);
        
        if (item.natureza === 'Fixo') {
            if (!fixedBySector[sector]) fixedBySector[sector] = [];
            fixedBySector[sector].push(item);
        } else {
            if (!variableBySector[sector]) variableBySector[sector] = [];
            variableBySector[sector].push(item);
        }
    });
    
    const sectors = Array.from(sectorsSet).sort();
    
    // Render the container HTML
    container.innerHTML = `
        <style>
            .rateio-grid {
                display: flex;
                gap: 1.25rem;
                width: 100%;
                box-sizing: border-box;
            }
            .rateio-column-left {
                width: 60%;
                box-sizing: border-box;
            }
            .rateio-column-right {
                width: 40%;
                box-sizing: border-box;
            }
            .rateio-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 0.8rem;
                margin-top: 0.5rem;
            }
            .rateio-table th {
                background: #f8fafc;
                color: #475569;
                font-weight: 700;
                padding: 0.6rem 0.5rem;
                border-bottom: 2px solid #e2e8f0;
                text-align: left;
            }
            .rateio-table td {
                padding: 0.6rem 0.5rem;
                border-bottom: 1px solid #f1f5f9;
                vertical-align: middle;
            }
            .rateio-hour-input {
                width: 80px;
                height: 28px;
                padding: 0 0.5rem;
                border: 1px solid #cbd5e1;
                border-radius: 4px;
                font-size: 0.8rem;
                text-align: right;
            }
            .rateio-hour-input:focus {
                border-color: #7048e8;
                outline: none;
            }
            /* Style for Details summary accordion */
            details.rateio-tree {
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                margin-bottom: 0.5rem;
                background: #fff;
                overflow: hidden;
            }
            details.rateio-tree[open] {
                border-color: #cbd5e1;
            }
            summary.rateio-tree-header {
                padding: 0.75rem 1rem;
                font-weight: 700;
                color: #1e293b;
                background: #f8fafc;
                cursor: pointer;
                user-select: none;
                list-style: none;
                display: flex;
                justify-content: space-between;
                align-items: center;
                transition: background 0.2s;
            }
            summary.rateio-tree-header::-webkit-details-marker {
                display: none;
            }
            summary.rateio-tree-header:hover {
                background: #f1f5f9;
            }
            summary.rateio-tree-header .ph-caret-down {
                transition: transform 0.2s ease;
                color: #64748b;
            }
            details.rateio-tree[open] > summary.rateio-tree-header .ph-caret-down {
                transform: rotate(180deg);
                color: #7048e8;
            }
            .rateio-tree-body {
                padding: 0.75rem 1rem;
                border-top: 1px solid #e2e8f0;
                background: #fff;
            }
            .rateio-item-row {
                display: flex;
                justify-content: space-between;
                padding: 0.4rem 0.5rem;
                border-bottom: 1px dashed #f1f5f9;
                font-size: 0.75rem;
                color: #475569;
            }
            .rateio-item-row:last-child {
                border-bottom: none;
            }
        </style>
        
        <!-- Period Bar -->
        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:0.75rem 1rem; display:flex; justify-content:space-between; align-items:center; margin-bottom:1.25rem;">
            <div style="display:flex; align-items:center; gap:10px;">
                <label style="font-size:0.8rem; font-weight:700; color:#475569;">Período de Referência:</label>
                <input type="month" id="rateio-periodo-select" value="${_rateioPeriodo}" onchange="_onRateioPeriodoChange(this.value)" style="height:32px; padding:0 0.5rem; border:1px solid #cbd5e1; border-radius:6px; outline:none; font-size:0.8rem; font-weight:600; color:#1e293b;">
            </div>
            <div>
                <button class="prec-btn prec-btn-success" onclick="_salvarRateioCompleto()">
                    <i class="ph ph-check-square"></i> Salvar Configuração de Rateio
                </button>
            </div>
        </div>
        
        <div class="rateio-grid">
            <!-- LEFT COLUMN: FORMS -->
            <div class="rateio-column-left">
                <!-- FORM 1: FIXED COSTS -->
                <div class="saas-card">
                    <div class="saas-card-header">
                        <div class="saas-card-title">
                            <i class="ph ph-lock-key" style="color:#7048e8; font-size:1.1rem;"></i>
                            Rateio de Custos e Despesas Fixos por Hora
                        </div>
                    </div>
                    <div class="saas-card-body" style="padding:1rem;">
                        <table class="rateio-table" id="table-rateio-fixo">
                            <thead>
                                <tr>
                                    <th>Centro de Custo (Setor)</th>
                                    <th style="text-align:right;">Valor Fixo Total</th>
                                    <th style="text-align:right; width:120px;">Horas do Período</th>
                                    <th style="text-align:right; width:120px;">Valor por Hora</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${sectors.map(sec => {
                                    const items = fixedBySector[sec] || [];
                                    const totalVal = items.reduce((sum, item) => sum + (item.custo_unitario || 0), 0);
                                    if (totalVal === 0) return ''; // skip sector if it has no fixed costs
                                    
                                    const savedHours = _rateioHorasFixas[sec] !== undefined ? _rateioHorasFixas[sec] : 220;
                                    const valHora = savedHours > 0 ? (totalVal / savedHours) : 0;
                                    
                                    // Keep tracks in local UI state
                                    _rateioHorasFixas[sec] = savedHours;
                                    
                                    return `
                                        <tr data-sector="${sec}">
                                            <td style="font-weight:600; color:#1e293b;">${sec}</td>
                                            <td style="text-align:right; font-weight:500; color:#475569;">R$ ${totalVal.toFixed(2).replace('.', ',')}</td>
                                            <td style="text-align:right;">
                                                <input type="number" class="rateio-hour-input" value="${savedHours}" min="0.1" step="0.1" oninput="_recalcularRateioItem('Fixo', '${sec}', this.value, ${totalVal})">
                                            </td>
                                            <td style="text-align:right; font-weight:700; color:#7048e8;" id="rateio-fixo-val-${sec}">
                                                R$ ${valHora.toFixed(2).replace('.', ',')}
                                            </td>
                                        </tr>
                                    `;
                                }).join('') || `<tr><td colspan="4" style="text-align:center; padding:1.5rem; color:#94a3b8;">Nenhum custo fixo cadastrado.</td></tr>`}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <!-- FORM 2: VARIABLE COSTS -->
                <div class="saas-card">
                    <div class="saas-card-header">
                        <div class="saas-card-title">
                            <i class="ph ph-activity" style="color:#7048e8; font-size:1.1rem;"></i>
                            Rateio de Custos e Despesas Variáveis por Hora
                        </div>
                    </div>
                    <div class="saas-card-body" style="padding:1rem;">
                        <table class="rateio-table" id="table-rateio-variavel">
                            <thead>
                                <tr>
                                    <th>Centro de Custo (Setor)</th>
                                    <th style="text-align:right;">Valor Variável Total</th>
                                    <th style="text-align:right; width:120px;">Horas do Período</th>
                                    <th style="text-align:right; width:120px;">Valor por Hora</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${sectors.map(sec => {
                                    const items = variableBySector[sec] || [];
                                    const totalVal = items.reduce((sum, item) => sum + (item.custo_unitario || 0), 0);
                                    if (totalVal === 0) return ''; // skip sector if it has no variable costs
                                    
                                    const savedHours = _rateioHorasVariaveis[sec] !== undefined ? _rateioHorasVariaveis[sec] : 220;
                                    const valHora = savedHours > 0 ? (totalVal / savedHours) : 0;
                                    
                                    // Keep tracks in local UI state
                                    _rateioHorasVariaveis[sec] = savedHours;
                                    
                                    return `
                                        <tr data-sector="${sec}">
                                            <td style="font-weight:600; color:#1e293b;">${sec}</td>
                                            <td style="text-align:right; font-weight:500; color:#475569;">R$ ${totalVal.toFixed(2).replace('.', ',')}</td>
                                            <td style="text-align:right;">
                                                <input type="number" class="rateio-hour-input" value="${savedHours}" min="0.1" step="0.1" oninput="_recalcularRateioItem('Variável', '${sec}', this.value, ${totalVal})">
                                            </td>
                                            <td style="text-align:right; font-weight:700; color:#7048e8;" id="rateio-variavel-val-${sec}">
                                                R$ ${valHora.toFixed(2).replace('.', ',')}
                                            </td>
                                        </tr>
                                    `;
                                }).join('') || `<tr><td colspan="4" style="text-align:center; padding:1.5rem; color:#94a3b8;">Nenhum custo variável cadastrado.</td></tr>`}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            
            <!-- RIGHT COLUMN: EXPANDABLE LISTVIEW -->
            <div class="rateio-column-right">
                <div class="saas-card" style="min-height:400px;">
                    <div class="saas-card-header">
                        <div class="saas-card-title">
                            <i class="ph ph-tree-structure" style="color:#7048e8; font-size:1.1rem;"></i>
                            Estrutura Detalhada de Custos
                        </div>
                    </div>
                    <div class="saas-card-body" style="padding:1rem;" id="rateio-expandable-tree-container">
                        ${_renderExpandableTree(fixedBySector, variableBySector)}
                    </div>
                </div>
            </div>
        </div>
    `;
};

// Global switcher function when reference period changes
window._onRateioPeriodoChange = function(val) {
    _rateioPeriodo = val;
    _renderActivePrecSubTab();
};

// Recalculates cost/hour reactively when user updates sector hours in UI
window._recalcularRateioItem = function(natureza, sector, hoursVal, totalVal) {
    const hours = parseFloat(hoursVal) || 0;
    const valHora = hours > 0 ? (totalVal / hours) : 0;
    
    // Update local variables
    if (natureza === 'Fixo') {
        _rateioHorasFixas[sector] = hours;
    } else {
        _rateioHorasVariaveis[sector] = hours;
    }
    
    // Update UI cell value
    const cellId = natureza === 'Fixo' ? `rateio-fixo-val-${sector}` : `rateio-variavel-val-${sector}`;
    const cellEl = document.getElementById(cellId);
    if (cellEl) {
        cellEl.innerText = `R$ ${valHora.toFixed(2).replace('.', ',')}`;
    }
    
    // Reactively update the text inside the expandable listview header for this sector
    const labelId = natureza === 'Fixo' ? `lbl-tree-fixo-sec-${sector}` : `lbl-tree-variavel-sec-${sector}`;
    const labelEl = document.getElementById(labelId);
    if (labelEl) {
        labelEl.innerHTML = `<strong>${sector}</strong> <span>R$ ${totalVal.toFixed(2).replace('.', ',')} (${hours > 0 ? 'R$ ' + valHora.toFixed(2).replace('.', ',') + '/h' : 'Sem horas'})</span>`;
    }
    
    // Update overall totals in the ListView
    _recalcularTreeTotals(natureza);
};

// Internal function to recalculate the main categories sum
function _recalcularTreeTotals(natureza) {
    let totalVal = 0;
    _comercialItensCusto.forEach(item => {
        if (item.natureza === natureza) {
            totalVal += (item.custo_unitario || 0);
        }
    });
    
    const labelId = natureza === 'Fixo' ? 'lbl-tree-root-fixo' : 'lbl-tree-root-variavel';
    const labelEl = document.getElementById(labelId);
    if (labelEl) {
        labelEl.innerText = `Custos e Despesas ${natureza}s (Total: R$ ${totalVal.toFixed(2).replace('.', ',')})`;
    }
}

// Renders the details/summary tree hierarchy dynamically
function _renderExpandableTree(fixedBySector, variableBySector) {
    // 1. Calculate general fixed cost sum
    let totalFixo = 0;
    Object.keys(fixedBySector).forEach(sec => {
        totalFixo += fixedBySector[sec].reduce((sum, item) => sum + (item.custo_unitario || 0), 0);
    });
    
    // 2. Calculate general variable cost sum
    let totalVariavel = 0;
    Object.keys(variableBySector).forEach(sec => {
        totalVariavel += variableBySector[sec].reduce((sum, item) => sum + (item.custo_unitario || 0), 0);
    });
    
    return `
        <!-- LEVEL 1: ROOT FIXED COSTS -->
        <details class="rateio-tree" open>
            <summary class="rateio-tree-header">
                <span id="lbl-tree-root-fixo">Custos e Despesas Fixas (Total: R$ ${totalFixo.toFixed(2).replace('.', ',')})</span>
                <i class="ph ph-caret-down"></i>
            </summary>
            <div class="rateio-tree-body" style="padding-left:0.75rem;">
                ${Object.keys(fixedBySector).length === 0 ? 
                    '<div style="font-size:0.75rem; color:#94a3b8; text-align:center;">Nenhum item fixo cadastrado.</div>' :
                    Object.keys(fixedBySector).map(sec => {
                        const items = fixedBySector[sec];
                        const secSum = items.reduce((sum, i) => sum + (i.custo_unitario || 0), 0);
                        const hours = _rateioHorasFixas[sec] || 220;
                        const valHora = hours > 0 ? (secSum / hours) : 0;
                        
                        return `
                            <!-- LEVEL 2: SECTOR FIXED -->
                            <details class="rateio-tree" style="margin-left:0.5rem;" open>
                                <summary class="rateio-tree-header" id="lbl-tree-fixo-sec-${sec}" style="padding:0.5rem 0.75rem; font-size:0.78rem; font-weight:normal; background:#fafafa;">
                                    <strong>${sec}</strong>
                                    <span>R$ ${secSum.toFixed(2).replace('.', ',')} (${hours > 0 ? 'R$ ' + valHora.toFixed(2).replace('.', ',') + '/h' : 'Sem horas'})</span>
                                </summary>
                                <div class="rateio-tree-body" style="padding:0.4rem 0.5rem; background:#fff;">
                                    <!-- LEVEL 3: INDIVIDUAL ITEMS -->
                                    ${items.map(item => `
                                        <div class="rateio-item-row">
                                            <span>${item.descricao} (${item.codigo})</span>
                                            <strong>R$ ${(item.custo_unitario || 0).toFixed(2).replace('.', ',')} / ${item.unidade_medida}</strong>
                                        </div>
                                    `).join('')}
                                </div>
                            </details>
                        `;
                    }).join('')
                }
            </div>
        </details>
        
        <!-- LEVEL 1: ROOT VARIABLE COSTS -->
        <details class="rateio-tree" open style="margin-top:1rem;">
            <summary class="rateio-tree-header">
                <span id="lbl-tree-root-variavel">Custos e Despesas Variáveis (Total: R$ ${totalVariavel.toFixed(2).replace('.', ',')})</span>
                <i class="ph ph-caret-down"></i>
            </summary>
            <div class="rateio-tree-body" style="padding-left:0.75rem;">
                ${Object.keys(variableBySector).length === 0 ? 
                    '<div style="font-size:0.75rem; color:#94a3b8; text-align:center;">Nenhum item variável cadastrado.</div>' :
                    Object.keys(variableBySector).map(sec => {
                        const items = variableBySector[sec];
                        const secSum = items.reduce((sum, i) => sum + (i.custo_unitario || 0), 0);
                        const hours = _rateioHorasVariaveis[sec] || 220;
                        const valHora = hours > 0 ? (secSum / hours) : 0;
                        
                        return `
                            <!-- LEVEL 2: SECTOR VARIABLE -->
                            <details class="rateio-tree" style="margin-left:0.5rem;" open>
                                <summary class="rateio-tree-header" id="lbl-tree-variavel-sec-${sec}" style="padding:0.5rem 0.75rem; font-size:0.78rem; font-weight:normal; background:#fafafa;">
                                    <strong>${sec}</strong>
                                    <span>R$ ${secSum.toFixed(2).replace('.', ',')} (${hours > 0 ? 'R$ ' + valHora.toFixed(2).replace('.', ',') + '/h' : 'Sem horas'})</span>
                                </summary>
                                <div class="rateio-tree-body" style="padding:0.4rem 0.5rem; background:#fff;">
                                    <!-- LEVEL 3: INDIVIDUAL ITEMS -->
                                    ${items.map(item => `
                                        <div class="rateio-item-row">
                                            <span>${item.descricao} (${item.codigo})</span>
                                            <strong>R$ ${(item.custo_unitario || 0).toFixed(2).replace('.', ',')} / ${item.unidade_medida}</strong>
                                        </div>
                                    `).join('')}
                                </div>
                            </details>
                        `;
                    }).join('')
                }
            </div>
        </details>
    `;
}

// Saves the entire rateio configuration to database via bulk POST request
window._salvarRateioCompleto = async function() {
    // Build payload array
    const payload = [];
    
    // Add Fixed Cost items
    Object.keys(_rateioHorasFixas).forEach(sec => {
        const totalVal = _comercialItensCusto
            .filter(item => (item.centro_custo || 'Sem Centro de Custo') === sec && item.natureza === 'Fixo')
            .reduce((sum, item) => sum + (item.custo_unitario || 0), 0);
            
        const hours = _rateioHorasFixas[sec];
        const valHora = hours > 0 ? (totalVal / hours) : 0;
        
        payload.push({
            periodo: _rateioPeriodo,
            centro_custo: sec,
            tipo: 'Fixo',
            horas_periodo: hours,
            valor_total: totalVal,
            valor_hora: valHora
        });
    });
    
    // Add Variable Cost items
    Object.keys(_rateioHorasVariaveis).forEach(sec => {
        const totalVal = _comercialItensCusto
            .filter(item => (item.centro_custo || 'Sem Centro de Custo') === sec && item.natureza === 'Variável')
            .reduce((sum, item) => sum + (item.custo_unitario || 0), 0);
            
        const hours = _rateioHorasVariaveis[sec];
        const valHora = hours > 0 ? (totalVal / hours) : 0;
        
        payload.push({
            periodo: _rateioPeriodo,
            centro_custo: sec,
            tipo: 'Variável',
            horas_periodo: hours,
            valor_total: totalVal,
            valor_hora: valHora
        });
    });
    
    if (payload.length === 0) {
        Swal.fire('Aviso', 'Não há itens de custo cadastrados para ratear.', 'warning');
        return;
    }
    
    Swal.fire({
        title: 'Salvando Rateio...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });
    
    try {
        const res = await apiPost('/comercial/rateio-custo', payload);
        Swal.close();
        if (res && res.success) {
            Swal.fire('Sucesso', 'Configuração de rateio salva com sucesso!', 'success');
        } else {
            Swal.fire('Erro', 'Falha ao salvar rateio.', 'error');
        }
    } catch (e) {
        Swal.close();
        console.error('[RATEIO] Erro ao salvar:', e);
        Swal.fire('Erro', 'Erro de conexão ao salvar rateio.', 'error');
    }
};

/* =====================================================================
   TAB 3: ESTRUTURA DO SERVIÇO (FICHA TÉCNICA)
   ===================================================================== */
function _renderTabFichaTecnica(container) {
    container.innerHTML = `
        <div class="saas-card">
            <!-- Toolbar -->
            <div class="saas-card-header">
                <div class="saas-card-title">
                    <i class="ph ph-file-text" style="color:#7048e8; font-size:1.1rem;"></i>
                    Composição e Estrutura do Serviço
                </div>
                <div style="display:flex; gap:0.4rem;">
                    <button class="prec-btn prec-btn-secondary" onclick="_limparFormFicha()">
                        <i class="ph ph-plus"></i> Novo
                    </button>
                    <button class="prec-btn prec-btn-success" onclick="_salvarFicha()">
                        <i class="ph ph-check"></i> Salvar
                    </button>
                    <button class="prec-btn prec-btn-danger" id="btn-excluir-ficha" onclick="_excluirFicha()" style="display:none;">
                        <i class="ph ph-trash"></i> Excluir
                    </button>
                </div>
            </div>
            
            <div class="saas-card-body">
                <!-- Header Fields -->
                <div class="prec-input-grid" style="grid-template-columns: 2fr 1fr 1fr; margin-bottom:1.5rem; border-bottom:1px dashed #e2e8f0; padding-bottom:1.25rem;">
                    <div class="prec-input-group">
                        <label>Vincular com Serviço Existente *</label>
                        <div style="display:flex; gap:0.5rem; align-items:center;">
                            <select id="ficha-servico-select" onchange="_selecionarServicoFicha(this.value)" style="flex:1;">
                                <option value="">-- Selecione o Serviço --</option>
                                ${_precificacaoServicosList.map(s => `<option value="${s.id}">${s.nome} (${s.tabela_precos})</option>`).join('')}
                            </select>
                            <button class="prec-btn prec-btn-secondary" onclick="_cadastrarNovoServicoMestre()" style="height:30px !important; padding:0 8px; font-weight:700; font-size:0.75rem; flex-shrink:0;" title="Cadastrar Novo Serviço">
                                <i class="ph ph-plus" style="margin-right:2px;"></i> Novo Serviço
                            </button>
                        </div>
                    </div>
                    <div class="prec-input-group">
                        <label>Código do Serviço *</label>
                        <input type="text" id="ficha-servico-codigo" readonly placeholder="SVC-XXXX">
                    </div>
                    <div class="prec-input-group">
                        <label>Tempo de Execução Total (Horas)</label>
                        <input type="number" id="ficha-tempo-execucao" placeholder="0.0" step="0.1" value="0.0" oninput="_recalcularFichaTotal()">
                    </div>
                </div>

                <div style="display:none;" id="ficha-detalhe-nome-container" style="margin-bottom:1rem;">
                    <strong style="font-size:0.85rem; color:#475569;">Nome do Serviço: </strong>
                    <span id="ficha-servico-nome" style="font-size:0.85rem; font-weight:700; color:#1e293b;"></span>
                </div>

                <!-- Grid Table of Items -->
                <div style="font-size:0.8rem; font-weight:700; color:#334155; margin-bottom:0.75rem; display:flex; justify-content:space-between; align-items:center;">
                    <span>Grid de Itens de Custo</span>
                    <button class="prec-btn prec-btn-secondary" onclick="_adicionarFichaItemRow()" style="height:28px !important; font-size:0.75rem;">
                        <i class="ph ph-plus-circle"></i> Adicionar Item de Custo
                    </button>
                </div>
                
                <table class="prec-table-grid" style="margin-bottom:1.5rem;">
                    <thead>
                        <tr>
                            <th style="width: 45%;">Item de Custo</th>
                            <th style="width: 15%; text-align: right;">Qtd. Padrão</th>
                            <th style="width: 10%; text-align: center;">Unidade</th>
                            <th style="width: 15%; text-align: right;">Custo Unitário (R$)</th>
                            <th style="width: 10%; text-align: right;">Total (R$)</th>
                            <th style="width: 5%; text-align: center;"></th>
                        </tr>
                    </thead>
                    <tbody id="tbody-ficha-itens">
                        <tr>
                            <td colspan="6" style="text-align:center; padding:1.5rem; color:#94a3b8;">
                                Nenhum item de custo adicionado à composição.
                            </td>
                        </tr>
                    </tbody>
                </table>

                <!-- Footer Summary Info -->
                <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:1rem; display:flex; justify-content:space-between; align-items:center; font-weight:700; font-size:0.9rem; color:#334155;">
                    <div>
                        Tempo Execução: <span id="span-ficha-tempo-total" style="color:#7048e8; margin-right:1.5rem;">0.0 hrs</span>
                        Soma das Horas MDO: <span id="span-ficha-soma-mdo" style="color:#22c55e;">0.0 hrs</span>
                    </div>
                    <div style="font-size:1rem;">
                        Total Custo Direto: <span id="span-ficha-custo-direto" style="color:#1e3a8a; font-size:1.15rem; margin-left:6px;">R$ 0,00</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

window._limparFormFicha = function() {
    _fichaEditandoId = null;
    _fichaItens = [];
    
    const sel = document.getElementById('ficha-servico-select');
    if (sel) sel.value = '';
    
    const code = document.getElementById('ficha-servico-codigo');
    if (code) code.value = '';
    
    const time = document.getElementById('ficha-tempo-execucao');
    if (time) time.value = '0.0';

    const lblNome = document.getElementById('ficha-servico-nome');
    if (lblNome) lblNome.innerText = '';
    
    const containerNome = document.getElementById('ficha-detalhe-nome-container');
    if (containerNome) containerNome.style.display = 'none';

    const btnExcluir = document.getElementById('btn-excluir-ficha');
    if (btnExcluir) btnExcluir.style.display = 'none';

    _renderFichaItensTable();
    _recalcularFichaTotal();
};

window._selecionarServicoFicha = async function(servicoId) {
    _limparFormFicha();
    if (!servicoId) return;

    const s = _precificacaoServicosList.find(item => item.id == servicoId);
    if (!s) return;

    const servCodigo = `SVC-${String(s.id).padStart(4, '0')}`;
    document.getElementById('ficha-servico-codigo').value = servCodigo;
    document.getElementById('ficha-servico-nome').innerText = s.nome;
    document.getElementById('ficha-detalhe-nome-container').style.display = 'block';

    Swal.fire({
        title: 'Carregando Ficha Técnica...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    try {
        const ficha = await apiGet(`/comercial/servicos-ficha/${servCodigo}`);
        Swal.close();
        if (ficha) {
            _fichaEditandoId = ficha.id;
            document.getElementById('ficha-tempo-execucao').value = (ficha.tempo_execucao || 0).toFixed(1);
            _fichaItens = ficha.itens || [];
            
            const btnExcluir = document.getElementById('btn-excluir-ficha');
            if (btnExcluir) btnExcluir.style.display = 'inline-flex';
        } else {
            _fichaEditandoId = null;
            _fichaItens = [];
        }
    } catch(e) {
        Swal.close();
        console.error(e);
    }

    _renderFichaItensTable();
    _recalcularFichaTotal();
};

window._adicionarFichaItemRow = function() {
    _fichaItens.push({ item_custo_id: '', qtd_padrao: 1 });
    _renderFichaItensTable();
    _recalcularFichaTotal();
};

window._excluirFichaItemRow = function(idx) {
    _fichaItens.splice(idx, 1);
    _renderFichaItensTable();
    _recalcularFichaTotal();
};

window._renderFichaItensTable = function() {
    const tbody = document.getElementById('tbody-ficha-itens');
    if (!tbody) return;

    if (_fichaItens.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:1.5rem; color:#94a3b8;">Nenhum item de custo adicionado à composição.</td></tr>`;
        return;
    }

    const tempoExec = parseFloat(document.getElementById('ficha-tempo-execucao')?.value) || 0;

    tbody.innerHTML = _fichaItens.map((item, idx) => {
        const itemObj = _comercialItensCusto.find(i => i.id == item.item_custo_id);
        const unidade = itemObj ? itemObj.unidade_medida : '-';
        const custoUnitario = itemObj ? _obterCustoHoraItem(itemObj) : 0;
        const isHourly = itemObj && ((itemObj.unidade_medida || '').toUpperCase() === 'H' || itemObj.categoria === 'MDO' || itemObj.natureza === 'Fixo');
        const total = (item.qtd_padrao || 0) * custoUnitario * (isHourly ? tempoExec : 1);

        return `
            <tr>
                <td>
                    <select onchange="_atualizarFichaItem(${idx}, 'item_custo_id', this.value)" style="height:30px; width:100%; border:1px solid #cbd5e1; border-radius:4px; font-size:0.78rem;">
                        <option value="">-- Selecione o Item --</option>
                        ${_comercialItensCusto.map(ic => {
                            const isSel = (ic.id == item.item_custo_id) ? 'selected' : '';
                            return `<option value="${ic.id}" ${isSel}>${ic.descricao} (${ic.codigo})</option>`;
                        }).join('')}
                    </select>
                </td>
                <td>
                    <input type="number" value="${item.qtd_padrao}" step="any" min="0.0001" oninput="_atualizarFichaItem(${idx}, 'qtd_padrao', parseFloat(this.value) || 0); _recalcularFichaTotal();" style="height:30px; text-align:right; width:100%; border:1px solid #cbd5e1; border-radius:4px; padding:0 6px; font-size:0.78rem; box-sizing:border-box;">
                </td>
                <td style="text-align:center; font-weight:600; color:#64748b;">${unidade}</td>
                <td style="text-align:right; color:#475569;">R$ ${custoUnitario.toFixed(2).replace('.', ',')}</td>
                <td id="ficha-row-total-${idx}" style="text-align:right; font-weight:700; color:#1e293b;">R$ ${total.toFixed(2).replace('.', ',')}</td>
                <td style="text-align:center;">
                    <i class="ph ph-trash" onclick="_excluirFichaItemRow(${idx})" style="color:#ef4444; font-size:1.15rem; cursor:pointer;" title="Remover Item"></i>
                </td>
            </tr>
        `;
    }).join('');
};

window._atualizarFichaItem = function(idx, field, val) {
    if (_fichaItens[idx]) {
        _fichaItens[idx][field] = val;
        if (field === 'item_custo_id') {
            _renderFichaItensTable();
            _recalcularFichaTotal();
        }
    }
};

window._recalcularFichaTotal = function() {
    const tempoExec = parseFloat(document.getElementById('ficha-tempo-execucao')?.value) || 0;
    let custoDireto = 0;
    let somaMDO = 0;

    _fichaItens.forEach((item, idx) => {
        const itemObj = _comercialItensCusto.find(i => i.id == item.item_custo_id);
        if (itemObj) {
            const custoUnitario = _obterCustoHoraItem(itemObj);
            const isHourly = (itemObj.unidade_medida || '').toUpperCase() === 'H' || itemObj.categoria === 'MDO' || itemObj.natureza === 'Fixo';
            const total = (item.qtd_padrao || 0) * custoUnitario * (isHourly ? tempoExec : 1);
            custoDireto += total;

            if (itemObj.categoria === 'MDO' || (itemObj.unidade_medida || '').toUpperCase() === 'H') {
                somaMDO += (item.qtd_padrao || 0) * tempoExec;
            }

            // Update row total cell directly without complete table re-rendering
            const totalCell = document.getElementById(`ficha-row-total-${idx}`);
            if (totalCell) {
                totalCell.innerText = `R$ ${total.toFixed(2).replace('.', ',')}`;
            }
        }
    });

    const spanCusto = document.getElementById('span-ficha-custo-direto');
    if (spanCusto) spanCusto.innerText = `R$ ${custoDireto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const spanTempo = document.getElementById('span-ficha-tempo-total');
    if (spanTempo) spanTempo.innerText = `${tempoExec.toFixed(1)} hrs`;

    const spanMDO = document.getElementById('span-ficha-soma-mdo');
    if (spanMDO) spanMDO.innerText = `${somaMDO.toFixed(1)} hrs`;
};

window._salvarFicha = async function() {
    const servico_codigo = document.getElementById('ficha-servico-codigo')?.value;
    const servico_nome = document.getElementById('ficha-servico-nome')?.innerText;
    const tempo_execucao = parseFloat(document.getElementById('ficha-tempo-execucao')?.value) || 0;

    if (!servico_codigo) { Swal.fire('Aviso', 'Selecione ou vincule um Serviço para preencher a Ficha Técnica.', 'warning'); return; }

    let custoDireto = 0;
    _fichaItens.forEach(item => {
        const itemObj = _comercialItensCusto.find(i => i.id == item.item_custo_id);
        if (itemObj) {
            const custoUnitario = _obterCustoHoraItem(itemObj);
            const isHourly = (itemObj.unidade_medida || '').toUpperCase() === 'H' || itemObj.categoria === 'MDO' || itemObj.natureza === 'Fixo';
            custoDireto += (item.qtd_padrao || 0) * custoUnitario * (isHourly ? tempo_execucao : 1);
        }
    });

    const payload = {
        id: _fichaEditandoId,
        servico_codigo,
        servico_nome,
        tempo_execucao,
        custo_direto_total: custoDireto,
        itens: _fichaItens.filter(i => i.item_custo_id !== '')
    };

    try {
        const res = await apiPost('/comercial/servicos-ficha', payload);
        if (res && res.success) {
            Swal.fire('Sucesso', 'Ficha Técnica do serviço salva com sucesso!', 'success');
            _comercialFichas = await apiGet('/comercial/servicos-ficha') || [];
            _limparFormFicha();
        } else {
            Swal.fire('Erro', 'Falha ao salvar ficha: ' + (res ? res.error : 'Erro desconhecido'), 'error');
        }
    } catch(e) {
        console.error(e);
        Swal.fire('Erro', 'Erro ao salvar Ficha Técnica.', 'error');
    }
};

window._excluirFicha = async function() {
    const servico_codigo = document.getElementById('ficha-servico-codigo')?.value;
    if (!servico_codigo) return;

    const result = await Swal.fire({
        title: 'Excluir Ficha Técnica?',
        text: 'Todos os itens de composição associados a este serviço serão removidos.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Sim, excluir!',
        cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
        try {
            const res = await apiDelete(`/comercial/servicos-ficha/${servico_codigo}`);
            if (res && res.success) {
                Swal.fire('Excluído!', 'A Ficha Técnica foi excluída.', 'success');
                _comercialFichas = await apiGet('/comercial/servicos-ficha') || [];
                _limparFormFicha();
            } else {
                Swal.fire('Erro', 'Falha ao excluir: ' + (res ? res.error : 'Erro desconhecido'), 'error');
            }
        } catch(e) {
            console.error(e);
            Swal.fire('Erro', 'Erro ao excluir Ficha Técnica.', 'error');
        }
    }
};

window._cadastrarNovoServicoMestre = async function() {
    const { value: formValues } = await Swal.fire({
        title: 'Cadastrar Novo Serviço Mestre',
        html:
            '<div style="text-align:left; font-family:\'Inter\', sans-serif;">' +
            '  <label style="display:block; font-size:0.75rem; font-weight:700; color:#475569; margin-bottom:4px;">Nome do Serviço *</label>' +
            '  <input id="swal-serv-nome" class="swal2-input" placeholder="Ex: Manutenção Preventiva Gerador" style="width:100%; margin:0 0 1rem 0; height:36px; box-sizing:border-box; font-size:0.8rem; border:1px solid #cbd5e1; border-radius:6px; outline:none; padding: 0 10px;">' +
            '  <label style="display:block; font-size:0.75rem; font-weight:700; color:#475569; margin-bottom:4px;">Tabela de Preços *</label>' +
            '  <select id="swal-serv-tabela" class="swal2-select" style="width:100%; margin:0; height:36px; box-sizing:border-box; font-size:0.8rem; border:1px solid #cbd5e1; border-radius:6px; outline:none; padding: 0 10px;">' +
            '    <option value="Tabela Padrão">Tabela Padrão</option>' +
            '    <option value="Tabela Acordo">Tabela Acordo</option>' +
            '    <option value="Tabela Especial">Tabela Especial</option>' +
            '  </select>' +
            '</div>',
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonColor: '#7048e8',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Cadastrar',
        cancelButtonText: 'Cancelar',
        preConfirm: () => {
            const nome = document.getElementById('swal-serv-nome').value.trim();
            const tabela = document.getElementById('swal-serv-tabela').value;
            if (!nome) {
                Swal.showValidationMessage('Por favor, informe o nome do serviço.');
                return false;
            }
            return { nome, tabela_precos: tabela };
        }
    });

    if (formValues) {
        Swal.fire({
            title: 'Salvando serviço...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        try {
            const payload = {
                nome: formValues.nome,
                tabela_precos: formValues.tabela_precos,
                estrutura_produto: '[]',
                custo_insumos: 0,
                custos_fixos: '[]',
                custo_mao_obra: 0,
                markup_prc: 20,
                markup_valores: '{}',
                markup_tipo: 'divisor',
                preco_venda: 0,
                observacoes: 'Cadastrado via Ficha Técnica'
            };

            const res = await apiPost('/servicos-precificacao', payload);
            Swal.close();

            if (res && res.success) {
                Swal.fire('Sucesso!', 'Serviço cadastrado com sucesso.', 'success');
                // Reload list from backend
                _precificacaoServicosList = await apiGet('/servicos-precificacao') || [];
                
                // Re-render Tab 2 to update the select list
                _renderActivePrecSubTab();
                
                // Automatically select the newly created service
                const selectElement = document.getElementById('ficha-servico-select');
                if (selectElement) {
                    selectElement.value = res.id;
                    _selecionarServicoFicha(res.id);
                }
            } else {
                Swal.fire('Erro', 'Falha ao salvar: ' + (res ? res.error : 'Erro desconhecido'), 'error');
            }
        } catch(e) {
            Swal.close();
            console.error(e);
            Swal.fire('Erro', 'Erro ao conectar com o servidor.', 'error');
        }
    }
};


/* =====================================================================
   TAB 3: PRECIFICAÇÃO E VIABILIDADE (PONTO DE EQUILÍBRIO)
   ===================================================================== */
function _renderTabPrecificacao(container) {
    container.innerHTML = `
        <div class="saas-card">
            <div class="saas-card-header">
                <div class="saas-card-title">
                    <i class="ph ph-calculator" style="color:#7048e8; font-size:1.1rem;"></i>
                    Precificação Final e Ponto de Equilíbrio
                </div>
                <div>
                    <button class="prec-btn prec-btn-success" onclick="_salvarPrecificacaoViabilidade()">
                        <i class="ph ph-check-square"></i> Salvar Precificação
                    </button>
                </div>
            </div>
            
            <div class="saas-card-body">
                <!-- Dropdown selector of composed service -->
                <div style="margin-bottom:1.5rem; border-bottom:1px dashed #e2e8f0; padding-bottom:1rem;">
                    <div class="prec-input-group" style="max-width:500px;">
                        <label>Selecione o Serviço Estruturado (Ficha Técnica) *</label>
                        <select id="prec-servico-select" onchange="_selecionarServicoPrec(this.value)">
                            <option value="">-- Selecione o Serviço Composto --</option>
                            ${_comercialFichas.map(f => `<option value="${f.servico_codigo}">${f.servico_nome} (${f.servico_codigo})</option>`).join('')}
                        </select>
                    </div>
                </div>

                <!-- 3 Columns Main Blocks Layout -->
                <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:1.25rem;">
                    
                    <!-- BLOCK 1: CUSTO BASE -->
                    <div class="saas-card" style="margin-bottom:0;">
                        <div class="saas-card-header" style="background:rgba(112, 72, 232, 0.04);">
                            <div class="saas-card-title"><i class="ph ph-money" style="color:#7048e8;"></i> Bloco 1: Custo Base</div>
                        </div>
                        <div class="saas-card-body" style="display:flex; flex-direction:column; gap:0.75rem;">
                            <div class="prec-input-group">
                                <label>Custo Fixo</label>
                                <input type="text" id="p-custo-fixo" readonly value="R$ 0,00" style="font-weight:600; color:#475569;">
                            </div>
                            <div class="prec-input-group">
                                <label>Custo Variável</label>
                                <input type="text" id="p-custo-variavel" readonly value="R$ 0,00" style="font-weight:600; color:#475569;">
                            </div>
                            <div class="prec-input-group">
                                <label>Despesa Fixa</label>
                                <input type="text" id="p-despesa-fixa" readonly value="R$ 0,00" style="font-weight:600; color:#475569;">
                            </div>
                            <div class="prec-input-group">
                                <label>Despesa Variável</label>
                                <input type="text" id="p-despesa-variavel" readonly value="R$ 0,00" style="font-weight:600; color:#475569;">
                            </div>
                            <div style="border-top: 1px dashed #cbd5e1; padding-top: 0.5rem;" class="prec-input-group">
                                <label>Custo Total Unitário (Calculado)</label>
                                <input type="text" id="p-custo-total" readonly value="R$ 0,00" style="font-weight:700; color:#1e3a8a; font-size:0.9rem;">
                            </div>
                        </div>
                    </div>

                    <!-- BLOCK 2: MARGEM E VENDA -->
                    <div class="saas-card" style="margin-bottom:0;">
                        <div class="saas-card-header" style="background:rgba(22, 163, 74, 0.04);">
                            <div class="saas-card-title"><i class="ph ph-trend-up" style="color:#16a34a;"></i> Bloco 2: Margem e Venda</div>
                        </div>
                        <div class="saas-card-body" style="display:flex; flex-direction:column; gap:0.75rem;">
                            <div class="prec-input-group">
                                <label>Margem de Lucro Desejada (%) *</label>
                                <input type="number" id="p-margem-lucro" value="20" min="0" max="100" step="0.1" oninput="_recalcularPrecificacaoViabilidade()">
                            </div>
                            <div class="prec-input-group">
                                <label>Modelo de Cálculo *</label>
                                <select id="p-modelo-calculo" onchange="_recalcularPrecificacaoViabilidade()" style="width:100%; border:1px solid #cbd5e1; border-radius:6px; height:34px; padding:0 8px; font-size:0.8rem; outline:none; background:#fff;">
                                    <option value="por_fora">Margem por Fora (Margem sobre Custo)</option>
                                    <option value="por_dentro">Margem por Dentro (Margem sobre Venda)</option>
                                </select>
                            </div>
                            
                            <div style="border-top:1px dashed #cbd5e1; padding-top:0.5rem; display:flex; flex-direction:column; gap:6px;">
                                <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.75rem; color:#475569;">
                                    <span>Preço Sugerido DIA:</span>
                                    <strong style="color:#1e293b; font-size:0.85rem;" id="p-sug-dia">R$ 0,00</strong>
                                </div>
                                <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.75rem; color:#475569;">
                                    <span>Preço Sugerido SEMANA:</span>
                                    <strong style="color:#1e293b; font-size:0.85rem;" id="p-sug-semana">R$ 0,00</strong>
                                </div>
                                <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.8rem; color:#1e293b;">
                                    <strong>Preço Sugerido MÊS:</strong>
                                    <strong style="color:#7048e8; font-size:1.1rem; font-weight:800;" id="p-sug-mes">R$ 0,00</strong>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- BLOCK 3: PONTO DE EQUILÍBRIO -->
                    <div class="saas-card" style="margin-bottom:0;">
                        <div class="saas-card-header" style="background:rgba(220, 38, 38, 0.04);">
                            <div class="saas-card-title"><i class="ph ph-scales" style="color:#dc2626;"></i> Bloco 3: Viabilidade</div>
                        </div>
                        <div class="saas-card-body" style="display:flex; flex-direction:column; gap:1rem;">
                            <div class="prec-input-group">
                                <label>Total Despesas Fixas Mensais (R$) *</label>
                                <input type="number" id="p-despesas-fixas-mensais" value="30000.00" step="0.01" oninput="_recalcularPrecificacaoViabilidade()">
                            </div>
                            <div class="prec-input-group">
                                <label>Margem Contribuição Unitária (Mês)</label>
                                <input type="text" id="p-margem-contribuicao" readonly value="R$ 0,00" style="font-weight:700; color:#475569;">
                            </div>
                            <div class="prec-input-group">
                                <label>Ponto de Equilíbrio (Qtd Serviços/Mês)</label>
                                <input type="text" id="p-ponto-equilibrio" readonly value="0 serviços" style="font-weight:800; color:#dc2626; font-size:0.95rem;">
                            </div>
                        </div>
                    </div>

                </div>

                <!-- Commercial Proposal Generator Button -->
                <div style="margin-top:1.5rem; text-align:right; border-top:1px solid #e2e8f0; padding-top:1.25rem;" id="prec-gerar-proposta-container">
                    <button class="prec-btn prec-btn-primary" onclick="_gerarPropostaDePrecificacao()" style="background:#2563eb; height:40px; padding:0 1.25rem;">
                        <i class="ph ph-handshake" style="font-size:1.1rem;"></i> Gerar Proposta Comercial
                    </button>
                </div>
            </div>
        </div>
    `;

    _recalcularPrecificacaoViabilidade();
}

window._selecionarServicoPrec = async function(codigo) {
    if (!codigo) {
        _precificacaoServicoCodigo = '';
        _precificacaoDados = {
            rateio_despesas_fixas: 0,
            margem_lucro: 20,
            despesas_fixas_mensais: 30000,
            custo_direto_total: 0,
            modelo_calculo: 'por_fora'
        };
        _precificacaoValores = {
            custoFixo: 0,
            custoVariavel: 0,
            despesaFixa: 0,
            despesaVariavel: 0
        };
        // Reset inputs
        const fields = ['p-custo-fixo', 'p-custo-variavel', 'p-despesa-fixa', 'p-despesa-variavel', 'p-custo-total'];
        fields.forEach(f => {
            const el = document.getElementById(f);
            if (el) el.value = 'R$ 0,00';
        });
        const dFm = document.getElementById('p-despesas-fixas-mensais');
        if (dFm) dFm.value = '30000,00';
        const mL = document.getElementById('p-margem-lucro');
        if (mL) mL.value = '20.0';
        const pMod = document.getElementById('p-modelo-calculo');
        if (pMod) pMod.value = 'por_fora';
        
        _recalcularPrecificacaoViabilidade();
        return;
    }

    _precificacaoServicoCodigo = codigo;
    const ficha = _comercialFichas.find(f => f.servico_codigo === codigo);
    const custoDireto = ficha ? (ficha.custo_direto_total || 0) : 0;

    _precificacaoDados.custo_direto_total = custoDireto;

    Swal.fire({
        title: 'Carregando Viabilidade...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    let viab = null;
    let somaDespesasFixas = 0;
    
    // Reset values
    _precificacaoValores = {
        custoFixo: 0,
        custoVariavel: 0,
        despesaFixa: 0,
        despesaVariavel: 0
    };

    try {
        viab = await apiGet(`/comercial/precificacao-viabilidade/${codigo}`);
        
        // Fetch Ficha details to sum proportional monthly fixed costs
        const fichaDetalhes = await apiGet(`/comercial/servicos-ficha/${codigo}`);
        const tempoExec = fichaDetalhes ? (fichaDetalhes.tempo_execucao || 0) : 0;
        
        if (fichaDetalhes && fichaDetalhes.itens) {
            fichaDetalhes.itens.forEach(item => {
                const itemObj = _comercialItensCusto.find(i => i.id == item.item_custo_id);
                if (itemObj) {
                    // 1. Calculate proportional monthly fixed cost for the despesas_fixas_mensais field
                    if (itemObj.natureza === 'Fixo') {
                        somaDespesasFixas += (item.qtd_padrao || 0) * (itemObj.custo_unitario || 0);
                    }
                    
                    // 2. Calculate hourly cost for this specific item in the Ficha
                    const custoHora = _obterCustoHoraItem(itemObj);
                    const isHourly = (itemObj.unidade_medida || '').toUpperCase() === 'H' || itemObj.categoria === 'MDO' || itemObj.natureza === 'Fixo';
                    const itemTotal = (item.qtd_padrao || 0) * custoHora * (isHourly ? tempoExec : 1);
                    
                    // 3. Classify as Custo or Despesa
                    const isCusto = ['MDO', 'Insumo'].includes(itemObj.categoria);
                    if (isCusto) {
                        if (itemObj.natureza === 'Fixo') {
                            _precificacaoValores.custoFixo += itemTotal;
                        } else {
                            _precificacaoValores.custoVariavel += itemTotal;
                        }
                    } else {
                        if (itemObj.natureza === 'Fixo') {
                            _precificacaoValores.despesaFixa += itemTotal;
                        } else {
                            _precificacaoValores.despesaVariavel += itemTotal;
                        }
                    }
                }
            });
        }
        
        Swal.close();
        
        if (viab) {
            _precificacaoDados.rateio_despesas_fixas = viab.rateio_despesas_fixas || 0;
            _precificacaoDados.margem_lucro = viab.margem_lucro || 20;
            _precificacaoDados.despesas_fixas_mensais = (somaDespesasFixas > 0) ? somaDespesasFixas : (viab.despesas_fixas_mensais || 30000);
            _precificacaoDados.modelo_calculo = viab.modelo_calculo || 'por_fora';
        } else {
            _precificacaoDados.rateio_despesas_fixas = 0;
            _precificacaoDados.margem_lucro = 20;
            _precificacaoDados.despesas_fixas_mensais = (somaDespesasFixas > 0) ? somaDespesasFixas : 30000;
            _precificacaoDados.modelo_calculo = 'por_fora';
        }
    } catch(e) {
        Swal.close();
        console.error(e);
    }

    // Set values in inputs
    const pCustoFixo = document.getElementById('p-custo-fixo');
    if (pCustoFixo) pCustoFixo.value = `R$ ${_precificacaoValores.custoFixo.toFixed(2).replace('.', ',')}`;
    
    const pCustoVariavel = document.getElementById('p-custo-variavel');
    if (pCustoVariavel) pCustoVariavel.value = `R$ ${_precificacaoValores.custoVariavel.toFixed(2).replace('.', ',')}`;
    
    const pDespesaFixa = document.getElementById('p-despesa-fixa');
    if (pDespesaFixa) pDespesaFixa.value = `R$ ${_precificacaoValores.despesaFixa.toFixed(2).replace('.', ',')}`;
    
    const pDespesaVariavel = document.getElementById('p-despesa-variavel');
    if (pDespesaVariavel) pDespesaVariavel.value = `R$ ${_precificacaoValores.despesaVariavel.toFixed(2).replace('.', ',')}`;

    document.getElementById('p-despesas-fixas-mensais').value = _precificacaoDados.despesas_fixas_mensais.toFixed(2);
    document.getElementById('p-margem-lucro').value = _precificacaoDados.margem_lucro.toFixed(1);
    
    const pMod = document.getElementById('p-modelo-calculo');
    if (pMod) pMod.value = _precificacaoDados.modelo_calculo || 'por_fora';

    _recalcularPrecificacaoViabilidade();
};

window._recalcularPrecificacaoViabilidade = function() {
    const custoFixo = _precificacaoValores.custoFixo || 0;
    const custoVariavel = _precificacaoValores.custoVariavel || 0;
    const despesaFixa = _precificacaoValores.despesaFixa || 0;
    const despesaVariavel = _precificacaoValores.despesaVariavel || 0;
    const margemLucro = parseFloat(document.getElementById('p-margem-lucro')?.value) || 0;
    const despesasFixasMensais = parseFloat(document.getElementById('p-despesas-fixas-mensais')?.value) || 0;
    const modeloCalculo = document.getElementById('p-modelo-calculo')?.value || 'por_fora';

    _precificacaoDados.margem_lucro = margemLucro;
    _precificacaoDados.despesas_fixas_mensais = despesasFixasMensais;
    _precificacaoDados.modelo_calculo = modeloCalculo;

    // 1. Custo Total Unitário
    const custoTotalUnitario = custoFixo + custoVariavel + despesaFixa + despesaVariavel;
    const pCustoTotal = document.getElementById('p-custo-total');
    if (pCustoTotal) pCustoTotal.value = `R$ ${custoTotalUnitario.toFixed(2).replace('.', ',')}`;

    // 2. Preços Sugeridos (Escala)
    let precoDia = 0;
    if (modeloCalculo === 'por_dentro') {
        const divisor = 1 - (margemLucro / 100);
        if (divisor <= 0) {
            precoDia = custoTotalUnitario / 0.01;
        } else {
            precoDia = custoTotalUnitario / divisor;
        }
    } else {
        precoDia = custoTotalUnitario * (1 + (margemLucro / 100));
    }

    // SEMANA (Fator 5x com desconto de 12% por fidelidade/volume)
    const precoSemana = precoDia * 5 * 0.88;

    // MÊS (Fator 20x com desconto de 25% por fidelidade/volume)
    const precoMes = precoDia * 20 * 0.75;

    const spanSugDia = document.getElementById('p-sug-dia');
    if (spanSugDia) spanSugDia.innerText = `R$ ${precoDia.toFixed(2).replace('.', ',')}`;

    const spanSugSemana = document.getElementById('p-sug-semana');
    if (spanSugSemana) spanSugSemana.innerText = `R$ ${precoSemana.toFixed(2).replace('.', ',')}`;

    const spanSugMes = document.getElementById('p-sug-mes');
    if (spanSugMes) spanSugMes.innerText = `R$ ${precoMes.toFixed(2).replace('.', ',')}`;

    // 3. Ponto de Equilíbrio
    // Margem de Contribuição Unitária (Mês) = Preço Mês - Custo Total Unitário
    const margemContrib = precoMes - custoTotalUnitario;
    const pMargemContrib = document.getElementById('p-margem-contribuicao');
    if (pMargemContrib) pMargemContrib.value = `R$ ${margemContrib.toFixed(2).replace('.', ',')}`;

    // PE Qtd = Despesas Fixas Mensais / Margem de Contribuição
    let peQtd = 0;
    if (margemContrib > 0) {
        peQtd = Math.ceil(despesasFixasMensais / margemContrib);
    }

    const pPE = document.getElementById('p-ponto-equilibrio');
    if (pPE) {
        if (margemContrib <= 0) {
            pPE.value = "Inviável (Margem Negativa)";
            pPE.style.color = '#dc2626';
        } else {
            pPE.value = `${peQtd} serviço(s) / mês`;
            pPE.style.color = peQtd > 50 ? '#e67700' : '#16a34a';
        }
    }
};

window._salvarPrecificacaoViabilidade = async function() {
    if (!_precificacaoServicoCodigo) {
        Swal.fire('Aviso', 'Selecione um serviço estruturado para salvar a precificação.', 'warning');
        return;
    }

    const fixedSum = _precificacaoValores.custoFixo + _precificacaoValores.despesaFixa;
    const margem_lucro = parseFloat(document.getElementById('p-margem-lucro')?.value) || 0;
    const despesas_fixas_mensais = parseFloat(document.getElementById('p-despesas-fixas-mensais')?.value) || 0;
    const modelo_calculo = document.getElementById('p-modelo-calculo')?.value || 'por_fora';

    const custoTotalUnitario = _precificacaoValores.custoFixo + _precificacaoValores.custoVariavel + _precificacaoValores.despesaFixa + _precificacaoValores.despesaVariavel;

    let precoDia = 0;
    if (modelo_calculo === 'por_dentro') {
        const divisor = 1 - (margem_lucro / 100);
        if (divisor <= 0) precoDia = custoTotalUnitario / 0.01;
        else precoDia = custoTotalUnitario / divisor;
    } else {
        precoDia = custoTotalUnitario * (1 + (margem_lucro / 100));
    }

    const precoSemana = precoDia * 5 * 0.88;
    const precoMes = precoDia * 20 * 0.75;

    const payload = {
        servico_codigo: _precificacaoServicoCodigo,
        rateio_despesas_fixas: fixedSum,
        margem_lucro,
        preco_sugerido_dia: precoDia,
        preco_sugerido_semana: precoSemana,
        preco_sugerido_mes: precoMes,
        despesas_fixas_mensais,
        modelo_calculo
    };

    try {
        const res = await apiPost('/comercial/precificacao-viabilidade', payload);
        if (res && res.success) {
            Swal.fire('Sucesso', 'Precificação e Viabilidade salvas com sucesso!', 'success');
            _precificacaoServicosList = await apiGet('/servicos-precificacao') || [];
        } else {
            Swal.fire('Erro', 'Erro ao salvar dados de viabilidade: ' + (res ? res.error : 'Erro desconhecido'), 'error');
        }
    } catch(e) {
        console.error(e);
        Swal.fire('Erro', 'Erro de rede ou comunicação com o servidor.', 'error');
    }
};

window._gerarPropostaDePrecificacao = function() {
    if (!_precificacaoServicoCodigo) {
        Swal.fire('Aviso', 'Selecione um serviço estruturado com preços calculados primeiro.', 'warning');
        return;
    }

    const ficha = _comercialFichas.find(f => f.servico_codigo === _precificacaoServicoCodigo);
    if (!ficha) return;

    const margem_lucro = parseFloat(document.getElementById('p-margem-lucro')?.value) || 0;
    const modelo_calculo = document.getElementById('p-modelo-calculo')?.value || 'por_fora';
    const custoTotalUnitario = _precificacaoValores.custoFixo + _precificacaoValores.custoVariavel + _precificacaoValores.despesaFixa + _precificacaoValores.despesaVariavel;

    let precoDia = 0;
    if (modelo_calculo === 'por_dentro') {
        const divisor = 1 - (margem_lucro / 100);
        if (divisor <= 0) precoDia = custoTotalUnitario / 0.01;
        else precoDia = custoTotalUnitario / divisor;
    } else {
        precoDia = custoTotalUnitario * (1 + (margem_lucro / 100));
    }

    const precoMes = precoDia * 20 * 0.75;

    Swal.fire({
        title: 'Gerar Proposta Comercial?',
        text: `Deseja criar uma nova proposta para o serviço "${ficha.servico_nome}" com o preço mensal sugerido de R$ ${precoMes.toFixed(2).replace('.', ',')}?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#2563eb',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Sim, criar proposta!',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            abrirFormProposta(null);

            setTimeout(() => {
                const inputServico = document.getElementById('prop-nome-projeto');
                if (inputServico) inputServico.value = `Proposta Comercial: ${ficha.servico_nome}`;

                const inputValor = document.getElementById('prop-valor-global');
                if (inputValor) inputValor.value = precoMes.toFixed(2);

                const txtDesc = document.getElementById('prop-descricao');
                if (txtDesc) txtDesc.value = `Prestação de serviço: ${ficha.servico_nome}\nTempo estimado de execução: ${ficha.tempo_execucao} horas.\nCálculo de custos efetuado através da Ficha Técnica ${ficha.servico_codigo}.`;

                Swal.fire('Proposta Iniciada!', 'Preenchemos o nome, descrição e valor da proposta baseados nos cálculos de viabilidade. Escolha o cliente e salve a proposta.', 'success');
            }, 300);
        }
    });
};


/* ── Modal de Pesquisa de Propostas ───────────────────────────────────── */

window.abrirModalPesquisaPropostas = async function() {
    Swal.fire({
        title: 'Carregando propostas...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    try {
        await carregarPropostas();
        const clientes = await apiGet('/clientes') || [];
        Swal.close();

        // Mapeamento de Razão Social -> CNPJ
        const clientCnpjMap = {};
        clientes.forEach(c => {
            if (c.nome_razao_social) {
                clientCnpjMap[c.nome_razao_social.toLowerCase().trim()] = c.cpf_cnpj || '';
            }
        });

        // Adiciona CNPJ localmente a cada proposta
        const propostasComCnpj = _propostasData.map(p => {
            const cnpj = p.cliente_nome ? (clientCnpjMap[p.cliente_nome.toLowerCase().trim()] || '') : '';
            return {
                ...p,
                cliente_cnpj: cnpj
            };
        });

        const renderRows = (list) => {
            if (list.length === 0) {
                return `<tr><td colspan="7" style="text-align:center; color:#94a3b8; padding:1.5rem; font-size:0.85rem;">Nenhuma proposta encontrada.</td></tr>`;
            }
            return list.map(p => {
                const total = p.valor_total || 0;
                const totalFmt = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                const dataFmt = p.data_cadastro ? p.data_cadastro.split('-').reverse().join('/') : '';
                return `
                    <tr ondblclick="window.selecionarPropostaBusca(${p.id})" style="cursor:pointer; border-bottom:1px solid #e2e8f0; transition: background 0.15s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background=''">
                        <td style="padding:10px 12px; font-weight:bold; color:#7048e8; text-align:center; white-space:nowrap;">${p.codigo || '—'}</td>
                        <td style="padding:10px 12px; font-weight:600; color:#1e293b;">${p.cliente_nome || '—'}</td>
                        <td style="padding:10px 12px; color:#475569; white-space:nowrap;">${p.cliente_cnpj || '—'}</td>
                        <td style="padding:10px 12px; color:#475569; text-align:center; white-space:nowrap;">${dataFmt}</td>
                        <td style="padding:10px 12px; font-weight:700; color:#16a34a; text-align:right; white-space:nowrap;">${totalFmt}</td>
                        <td style="padding:10px 12px; color:#475569; text-align:center; white-space:nowrap;">${p.fase_negociacao || '—'}</td>
                        <td style="padding:10px 12px; color:#475569; text-align:center; white-space:nowrap;">${p.status || '—'}</td>
                    </tr>
                `;
            }).join('');
        };

        Swal.fire({
            title: '',
            html: `
                <div style="text-align:left; font-family:'Inter', sans-serif; display:flex; flex-direction:column; padding:0; border-radius:12px; overflow:hidden;">
                    
                    <!-- Header -->
                    <div style="font-size:1.1rem; font-weight:800; color:#1e293b; border-bottom:1px solid #e2e8f0; padding:14px 18px; background:#f8fafc; display:flex; align-items:center; gap:6px;">
                        <i class="ph ph-file-search" style="color:#7048e8; font-size:1.3rem;"></i> Pesquisar Propostas
                    </div>
                    
                    <!-- Body/Filters -->
                    <div style="padding:16px; background:#f1f5f9; display:flex; flex-direction:column; gap:12px;">
                        
                        <!-- Inputs -->
                        <div style="display:grid; grid-template-columns: 1fr 2fr 1.5fr; gap:0.75rem;">
                            <div>
                                <label style="display:block; font-size:0.75rem; font-weight:700; color:#475569; margin-bottom:4px;">Código</label>
                                <input type="text" id="modal-search-codigo" placeholder="Ex: Auto ou CT" style="width:100%; padding:8px 12px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.8rem; box-sizing:border-box; outline:none; height:36px;">
                            </div>
                            <div>
                                <label style="display:block; font-size:0.75rem; font-weight:700; color:#475569; margin-bottom:4px;">Razão Social</label>
                                <input type="text" id="modal-search-razao" placeholder="Nome do cliente..." style="width:100%; padding:8px 12px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.8rem; box-sizing:border-box; outline:none; height:36px;">
                            </div>
                            <div>
                                <label style="display:block; font-size:0.75rem; font-weight:700; color:#475569; margin-bottom:4px;">CNPJ do Cliente</label>
                                <input type="text" id="modal-search-cnpj" placeholder="CNPJ..." style="width:100%; padding:8px 12px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.8rem; box-sizing:border-box; outline:none; height:36px;">
                            </div>
                        </div>

                        <!-- GridView Container -->
                        <div style="max-height:300px; overflow-y:auto; border:1px solid #e2e8f0; border-radius:8px; background:#fff; box-shadow:0 1px 3px rgba(0,0,0,0.02);">
                            <table style="width:100%; border-collapse:collapse; font-size:0.8rem; text-align:left;">
                                <thead>
                                    <tr style="background:#f8fafc; border-bottom:2px solid #cbd5e1; color:#475569; font-size:0.72rem; text-transform:uppercase; letter-spacing:0.03em;">
                                        <th style="padding:10px 12px; font-weight:700; position:sticky; top:0; background:#f8fafc; z-index:2; text-align:center; width:110px; white-space:nowrap;">Código</th>
                                        <th style="padding:10px 12px; font-weight:700; position:sticky; top:0; background:#f8fafc; z-index:2;">Razão Social</th>
                                        <th style="padding:10px 12px; font-weight:700; position:sticky; top:0; background:#f8fafc; z-index:2; width:130px; white-space:nowrap;">CNPJ</th>
                                        <th style="padding:10px 12px; font-weight:700; position:sticky; top:0; background:#f8fafc; z-index:2; text-align:center; width:120px; white-space:nowrap;">Data</th>
                                        <th style="padding:10px 12px; font-weight:700; position:sticky; top:0; background:#f8fafc; z-index:2; text-align:center !important; width:130px; white-space:nowrap;"><div style="text-align:center !important; display:block !important; width:100% !important; margin:0 auto !important; padding:0 !important;">Valor</div></th>
                                        <th style="padding:10px 12px; font-weight:700; position:sticky; top:0; background:#f8fafc; z-index:2; text-align:center; width:180px; white-space:nowrap;">Fase</th>
                                        <th style="padding:10px 12px; font-weight:700; position:sticky; top:0; background:#f8fafc; z-index:2; text-align:center; width:90px; white-space:nowrap;">Status</th>
                                    </tr>
                                </thead>
                                <tbody id="modal-proposta-tbody">
                                    ${renderRows(propostasComCnpj)}
                                </tbody>
                            </table>
                        </div>
                        
                        <div style="font-size:0.75rem; color:#64748b; font-style:italic; display:flex; justify-content:space-between; align-items:center;">
                            <span>Dica: Clique duas vezes (Double Click) em uma linha para abrir a proposta no formulário.</span>
                            <span id="modal-proposta-count" style="font-weight:700; color:#475569;">Total: ${propostasComCnpj.length} proposta(s)</span>
                        </div>
                    </div>
                </div>
            `,
            showConfirmButton: false,
            width: '1200px',
            customClass: {
                popup: 'custom-swal-padding-zero'
            },
            didOpen: () => {
                const inputCodigo = document.getElementById('modal-search-codigo');
                const inputRazao = document.getElementById('modal-search-razao');
                const inputCnpj = document.getElementById('modal-search-cnpj');
                const tbody = document.getElementById('modal-proposta-tbody');
                const countSpan = document.getElementById('modal-proposta-count');

                const filterProps = () => {
                    const codVal = (inputCodigo?.value || '').toLowerCase().trim();
                    const razVal = (inputRazao?.value || '').toLowerCase().trim();
                    const cnpjVal = (inputCnpj?.value || '').replace(/\D/g, '');

                    const filtered = propostasComCnpj.filter(p => {
                        const matchCodigo = !codVal || (p.codigo && p.codigo.toLowerCase().includes(codVal));
                        const matchRazao = !razVal || (p.cliente_nome && p.cliente_nome.toLowerCase().includes(razVal));
                        
                        const cnpjClean = p.cliente_cnpj ? p.cliente_cnpj.replace(/\D/g, '') : '';
                        const matchCnpj = !cnpjVal || cnpjClean.includes(cnpjVal);

                        return matchCodigo && matchRazao && matchCnpj;
                    });

                    if (tbody) tbody.innerHTML = renderRows(filtered);
                    if (countSpan) countSpan.textContent = `Total: ${filtered.length} proposta(s)`;
                };

                [inputCodigo, inputRazao, inputCnpj].forEach(input => {
                    input?.addEventListener('input', filterProps);
                });
            }
        });

        window.selecionarPropostaBusca = function(id) {
            abrirFormProposta(id);
            Swal.close();
        };

    } catch (e) {
        Swal.close();
        console.error(e);
        Swal.fire('Erro', 'Houve uma falha ao abrir a busca de propostas.', 'error');
    }
};

/* ── Módulo de Produtos da Proposta ─────────────────────────────────── */
window.abrirModalBuscaProdutos = async function() {
    Swal.fire({
        title: 'Carregando produtos...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    try {
        const produtos = await apiGet('/estoque') || [];
        Swal.close();

        const renderRows = (list) => {
            if (list.length === 0) {
                return `<tr><td colspan="4" style="text-align:center; color:#94a3b8; padding:1.5rem; font-size:0.85rem;">Nenhum produto encontrado.</td></tr>`;
            }
            return list.map(p => {
                return `
                    <tr ondblclick="window.selecionarProdutoBusca('${p.id}', '${p.nome.replace(/'/g, "\\'")}')" style="cursor:pointer; border-bottom:1px solid #e2e8f0; transition: background 0.15s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background=''">
                        <td style="padding:10px 12px; font-weight:bold; color:#7048e8; text-align:center;">${p.id}</td>
                        <td style="padding:10px 12px; font-weight:600; color:#1e293b;">${p.nome}</td>
                        <td style="padding:10px 12px; color:#475569;">${p.categoria || '—'}</td>
                        <td style="padding:10px 12px; color:#475569; text-align:center;">${p.quantidade_atual || 0}</td>
                    </tr>
                `;
            }).join('');
        };

        Swal.fire({
            title: '',
            html: `
                <div style="text-align:left; font-family:'Inter', sans-serif; display:flex; flex-direction:column; padding:0; border-radius:12px; overflow:hidden;">
                    <!-- Header -->
                    <div style="font-size:1.1rem; font-weight:800; color:#1e293b; border-bottom:1px solid #e2e8f0; padding:14px 18px; background:#f8fafc; display:flex; align-items:center; gap:6px;">
                        <i class="ph ph-magnifying-glass" style="color:#7048e8; font-size:1.3rem;"></i> Pesquisar Produtos
                    </div>
                    
                    <!-- Body/Filters -->
                    <div style="padding:16px; background:#f1f5f9; display:flex; flex-direction:column; gap:12px;">
                        <div style="display:grid; grid-template-columns: 1fr 2fr; gap:0.75rem;">
                            <div>
                                <label style="display:block; font-size:0.75rem; font-weight:700; color:#475569; margin-bottom:4px;">Código</label>
                                <input type="text" id="modal-prod-search-codigo" placeholder="Filtrar por código..." style="width:100%; padding:8px 12px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.8rem; box-sizing:border-box; outline:none; height:36px;">
                            </div>
                            <div>
                                <label style="display:block; font-size:0.75rem; font-weight:700; color:#475569; margin-bottom:4px;">Descrição</label>
                                <input type="text" id="modal-prod-search-descricao" placeholder="Filtrar por descrição..." style="width:100%; padding:8px 12px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.8rem; box-sizing:border-box; outline:none; height:36px;">
                            </div>
                        </div>

                        <!-- GridView Container -->
                        <div style="max-height:280px; overflow-y:auto; border:1px solid #e2e8f0; border-radius:8px; background:#fff; box-shadow:0 1px 3px rgba(0,0,0,0.02);">
                            <table style="width:100%; border-collapse:collapse; font-size:0.8rem; text-align:left;">
                                <thead>
                                    <tr style="background:#f8fafc; border-bottom:2px solid #cbd5e1; color:#475569; font-size:0.72rem; text-transform:uppercase; letter-spacing:0.03em;">
                                        <th style="padding:10px 12px; font-weight:700; position:sticky; top:0; background:#f8fafc; z-index:2; text-align:center; width:80px;">Código</th>
                                        <th style="padding:10px 12px; font-weight:700; position:sticky; top:0; background:#f8fafc; z-index:2;">Descrição</th>
                                        <th style="padding:10px 12px; font-weight:700; position:sticky; top:0; background:#f8fafc; z-index:2; width:130px;">Categoria</th>
                                        <th style="padding:10px 12px; font-weight:700; position:sticky; top:0; background:#f8fafc; z-index:2; text-align:center; width:100px;">Qtd Atual</th>
                                    </tr>
                                </thead>
                                <tbody id="modal-prod-tbody">
                                    ${renderRows(produtos)}
                                </tbody>
                            </table>
                        </div>
                        
                        <div style="font-size:0.75rem; color:#64748b; font-style:italic; display:flex; justify-content:space-between; align-items:center;">
                            <span>Dica: Clique duas vezes (Double Click) em um produto para selecioná-lo.</span>
                            <span id="modal-prod-count" style="font-weight:700; color:#475569;">Total: ${produtos.length} produto(s)</span>
                        </div>
                    </div>
                </div>
            `,
            showConfirmButton: false,
            width: '650px',
            customClass: {
                popup: 'custom-swal-padding-zero'
            },
            didOpen: () => {
                const inputCodigo = document.getElementById('modal-prod-search-codigo');
                const inputDescricao = document.getElementById('modal-prod-search-descricao');
                const tbody = document.getElementById('modal-prod-tbody');
                const countSpan = document.getElementById('modal-prod-count');

                const filterProds = () => {
                    const codVal = (inputCodigo?.value || '').toLowerCase().trim();
                    const descVal = (inputDescricao?.value || '').toLowerCase().trim();

                    const filtered = produtos.filter(p => {
                        const matchCodigo = !codVal || (p.id && p.id.toString().includes(codVal));
                        const matchDesc = !descVal || (p.nome && p.nome.toLowerCase().includes(descVal));
                        return matchCodigo && matchDesc;
                    });

                    if (tbody) tbody.innerHTML = renderRows(filtered);
                    if (countSpan) countSpan.textContent = `Total: ${filtered.length} produto(s)`;
                };

                [inputCodigo, inputDescricao].forEach(input => {
                    input?.addEventListener('input', filterProds);
                });
            }
        });

        window.selecionarProdutoBusca = function(id, nome) {
            const inputCodigo = document.getElementById('prop-prod-codigo');
            const inputDescricao = document.getElementById('prop-prod-descricao');
            if (inputCodigo) inputCodigo.value = id;
            if (inputDescricao) inputDescricao.value = nome;
            Swal.close();
        };

    } catch (e) {
        Swal.close();
        console.error(e);
        Swal.fire('Erro', 'Houve uma falha ao buscar produtos.', 'error');
    }
};

window.adicionarProdutoProposta = function() {
    const inputCodigo = document.getElementById('prop-prod-codigo');
    const inputDescricao = document.getElementById('prop-prod-descricao');
    const inputQuantidade = document.getElementById('prop-prod-quantidade');

    const codigo = inputCodigo?.value?.trim() || '';
    const descricao = inputDescricao?.value?.trim() || '';
    const quantidade = parseInt(inputQuantidade?.value) || 0;

    if (!codigo) {
        alert('Por favor, informe ou selecione o código do produto.');
        return;
    }
    if (!descricao) {
        alert('Por favor, informe a descrição do produto.');
        return;
    }
    if (quantidade <= 0) {
        alert('A quantidade deve ser maior que zero.');
        return;
    }

    if (!window._propProdutosAdicionados) {
        window._propProdutosAdicionados = [];
    }

    // Check if product with same code is already added
    const index = window._propProdutosAdicionados.findIndex(p => p.codigo === codigo);
    if (index !== -1) {
        window._propProdutosAdicionados[index].quantidade += quantidade;
    } else {
        window._propProdutosAdicionados.push({ codigo, descricao, quantidade });
    }

    // Reset inputs
    if (inputCodigo) inputCodigo.value = '';
    if (inputDescricao) inputDescricao.value = '';
    if (inputQuantidade) inputQuantidade.value = '1';

    window.renderizarProdutosPropostaGrid();
};

window.removerProdutoProposta = function(idx) {
    if (window._propProdutosAdicionados && window._propProdutosAdicionados[idx]) {
        window._propProdutosAdicionados.splice(idx, 1);
        window.renderizarProdutosPropostaGrid();
    }
};

window.renderizarProdutosPropostaGrid = function() {
    const tbody = document.getElementById('prop-produtos-tbody');
    if (!tbody) return;

    const list = window._propProdutosAdicionados || [];
    if (list.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align:center; color:#94a3b8; padding:1.5rem; font-size:0.85rem; font-style:italic;">Nenhum produto adicionado à proposta.</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = list.map((p, idx) => `
        <tr style="border-bottom:1px solid #e2e8f0;">
            <td style="padding:10px 12px; font-weight:700; color:#7048e8; text-align:center;">${p.codigo}</td>
            <td style="padding:10px 12px; font-weight:600; color:#1e293b;">${p.descricao}</td>
            <td style="padding:10px 12px; font-weight:700; color:#475569; text-align:center;">${p.quantidade}</td>
            <td style="padding:10px 12px; text-align:center;">
                <button type="button" onclick="window.removerProdutoProposta(${idx})" style="background:#fee2e2; color:#ef4444; border:none; width:28px; height:28px; border-radius:6px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; transition:all 0.15s;" onmouseover="this.style.background='#fecaca'" onmouseout="this.style.background='#fee2e2'" title="Remover Produto">
                    <i class="ph ph-trash" style="font-size:0.95rem;"></i>
                </button>
            </td>
        </tr>
    `).join('');
};








// ══════════════════════════════════════════════════════════════════════
// GEOLOCATION & GEOCONVERSION HELPERS (OPENSTREETMAP / NOMINATIM)
// ══════════════════════════════════════════════════════════════════════
const ufMapping = {
    'acre': 'AC', 'alagoas': 'AL', 'amapá': 'AP', 'amazonas': 'AM', 'bahia': 'BA',
    'ceará': 'CE', 'distrito federal': 'DF', 'espírito santo': 'ES', 'goiás': 'GO',
    'maranhão': 'MA', 'mato grosso': 'MT', 'mato grosso do sul': 'MS', 'minas gerais': 'MG',
    'pará': 'PA', 'paraíba': 'PB', 'paraná': 'PR', 'pernambuco': 'PE', 'piauí': 'PI',
    'rio de janeiro': 'RJ', 'rio grande do norte': 'RN', 'rio grande do sul': 'RS',
    'rondônia': 'RO', 'roraima': 'RR', 'santa catarina': 'SC', 'são paulo': 'SP',
    'sergipe': 'SE', 'tocantins': 'TO'
};

function formatCEP(cepStr) {
    if (!cepStr) return '';
    const clean = cepStr.replace(/\D/g, '');
    if (clean.length === 8) {
        return clean.substring(0, 5) + '-' + clean.substring(5);
    }
    return cepStr;
}

// ─── 1. BUSCA POR CEP ENTREGA NO MODAL ────────────────────────────────
window.modalBuscarCEPEntrega = async function() {
    const cepRaw = document.getElementById('modal-end-cep')?.value || '';
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

        document.getElementById('modal-end-rua').value = data.logradouro || '';
        document.getElementById('modal-end-bairro').value = data.bairro || '';
        document.getElementById('modal-end-uf').value = data.uf || '';
        document.getElementById('modal-end-cidade').value = data.localidade || '';

        // Buscar coordenadas via OSM Nominatim
        try {
            const nomRes = await fetch(`https://nominatim.openstreetmap.org/search?postalcode=${cep}&country=Brazil&format=json`, {
                headers: { 'User-Agent': 'SistemaAmerica/1.0' }
            });
            if (nomRes.ok) {
                const geo = await nomRes.json();
                if (geo && geo.length > 0) {
                    const lat = parseFloat(geo[0].lat).toFixed(6);
                    const lon = parseFloat(geo[0].lon).toFixed(6);
                    document.getElementById('modal-end-coords').value = `${lat}, ${lon}`.replace(/\.\.\. /g, '').replace(/\.\.\./g, '');
                }
            }
        } catch (e) {
            console.warn('Erro ao obter coordenadas do CEP:', e);
        }

        if (typeof mostrarToastSucesso === 'function') {
            mostrarToastSucesso('Endereço importado com sucesso!');
        }
    } catch(e) {
        console.error(e);
        alert('Erro ao buscar CEP: ' + e.message);
    }
};

// ─── 2. BUSCA POR NOME DO LOCAL (FORWARD GEOCONDING) ────────────────
window.modalBuscarPorNomeLocal = async function() {
    const query = document.getElementById('modal-end-nome')?.value.trim() || '';
    if (!query) {
        alert('Por favor, digite o Nome do Local para pesquisar.');
        return;
    }

    try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&country=Brazil&format=json&addressdetails=1&limit=1`;
        const res = await fetch(url, { headers: { 'User-Agent': 'SistemaAmerica/1.0' } });
        if (!res.ok) throw new Error('Serviço de busca indisponível.');
        const data = await res.json();
        if (!data || data.length === 0) {
            alert('Nenhum local encontrado para a pesquisa informada.');
            return;
        }

        const info = data[0];
        const addr = info.address;
        
        // Coordenadas
        const lat = parseFloat(info.lat).toFixed(6);
        const lon = parseFloat(info.lon).toFixed(6);
        document.getElementById('modal-end-coords').value = `${lat}, ${lon}`.replace(/\.\.\. /g, '').replace(/\.\.\./g, '');

        // Endereço
        if (addr.road) document.getElementById('modal-end-rua').value = addr.road;
        if (addr.suburb || addr.neighbourhood) {
            document.getElementById('modal-end-bairro').value = addr.suburb || addr.neighbourhood;
        }
        if (addr.city || addr.town || addr.village) {
            document.getElementById('modal-end-cidade').value = addr.city || addr.town || addr.village;
        }
        if (addr.state) {
            const stateLower = addr.state.toLowerCase();
            document.getElementById('modal-end-uf').value = ufMapping[stateLower] || addr.state.substring(0,2).toUpperCase();
        }
        if (addr.postcode) {
            document.getElementById('modal-end-cep').value = formatCEP(addr.postcode);
        }
        if (addr.house_number) {
            document.getElementById('modal-end-num').value = addr.house_number;
        }

        if (typeof mostrarToastSucesso === 'function') {
            mostrarToastSucesso('Local e coordenadas preenchidos com sucesso!');
        }
    } catch (e) {
        console.error(e);
        alert('Erro ao buscar local: ' + e.message);
    }
};

window.pageBuscarPorNomeLocal = async function() {
    const query = document.getElementById('page-end-nome')?.value.trim() || '';
    if (!query) {
        alert('Por favor, digite o Nome do Local para pesquisar.');
        return;
    }

    try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&country=Brazil&format=json&addressdetails=1&limit=1`;
        const res = await fetch(url, { headers: { 'User-Agent': 'SistemaAmerica/1.0' } });
        if (!res.ok) throw new Error('Serviço de busca indisponível.');
        const data = await res.json();
        if (!data || data.length === 0) {
            alert('Nenhum local encontrado para a pesquisa informada.');
            return;
        }

        const info = data[0];
        const addr = info.address;
        
        // Coordenadas
        const lat = parseFloat(info.lat).toFixed(6);
        const lon = parseFloat(info.lon).toFixed(6);
        document.getElementById('page-end-coords').value = `${lat}, ${lon}`.replace(/\.\.\. /g, '').replace(/\.\.\./g, '');

        // Endereço
        if (addr.road) document.getElementById('page-end-rua').value = addr.road;
        if (addr.suburb || addr.neighbourhood) {
            document.getElementById('page-end-bairro').value = addr.suburb || addr.neighbourhood;
        }
        if (addr.city || addr.town || addr.village) {
            document.getElementById('page-end-cidade').value = addr.city || addr.town || addr.village;
        }
        if (addr.state) {
            const stateLower = addr.state.toLowerCase();
            document.getElementById('page-end-uf').value = ufMapping[stateLower] || addr.state.substring(0,2).toUpperCase();
        }
        if (addr.postcode) {
            document.getElementById('page-end-cep').value = formatCEP(addr.postcode);
        }
        if (addr.house_number) {
            document.getElementById('page-end-num').value = addr.house_number;
        }

        if (typeof mostrarToastSucesso === 'function') {
            mostrarToastSucesso('Local e coordenadas preenchidos com sucesso!');
        }
    } catch (e) {
        console.error(e);
        alert('Erro ao buscar local: ' + e.message);
    }
};

// ─── 3. BUSCA POR COORDENADAS (REVERSE GEOCONDING) ───────────────────
window.modalBuscarPorCoords = async function() {
    const coordsRaw = document.getElementById('modal-end-coords')?.value.trim() || '';
    if (!coordsRaw) {
        alert('Por favor, informe a latitude e longitude separadas por vírgula (Ex: -23.55052, -46.633308).');
        return;
    }

    const parts = coordsRaw.split(',').map(p => p.trim());
    if (parts.length < 2) {
        alert('Formato inválido. Use: latitude, longitude');
        return;
    }

    const lat = parseFloat(parts[0]);
    const lon = parseFloat(parts[1]);
    if (isNaN(lat) || isNaN(lon)) {
        alert('Coordenadas numéricas inválidas.');
        return;
    }

    try {
        const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`;
        const res = await fetch(url, { headers: { 'User-Agent': 'SistemaAmerica/1.0' } });
        if (!res.ok) throw new Error('Serviço de busca reversa indisponível.');
        const data = await res.json();
        if (!data || !data.address) {
            alert('Nenhum endereço encontrado para essas coordenadas.');
            return;
        }

        const addr = data.address;
        
        // Preencher
        if (addr.road) document.getElementById('modal-end-rua').value = addr.road;
        if (addr.suburb || addr.neighbourhood) {
            document.getElementById('modal-end-bairro').value = addr.suburb || addr.neighbourhood;
        }
        if (addr.city || addr.town || addr.village) {
            document.getElementById('modal-end-cidade').value = addr.city || addr.town || addr.village;
        }
        if (addr.state) {
            const stateLower = addr.state.toLowerCase();
            document.getElementById('modal-end-uf').value = ufMapping[stateLower] || addr.state.substring(0,2).toUpperCase();
        }
        if (addr.postcode) {
            document.getElementById('modal-end-cep').value = formatCEP(addr.postcode);
        }
        if (addr.house_number) {
            document.getElementById('modal-end-num').value = addr.house_number;
        }

        if (typeof mostrarToastSucesso === 'function') {
            mostrarToastSucesso('Endereço importado a partir das coordenadas!');
        }
    } catch (e) {
        console.error(e);
        alert('Erro na busca reversa por coordenadas: ' + e.message);
    }
};

window.pageBuscarPorCoords = async function() {
    const coordsRaw = document.getElementById('page-end-coords')?.value.trim() || '';
    if (!coordsRaw) {
        alert('Por favor, informe a latitude e longitude separadas por vírgula (Ex: -23.55052, -46.633308).');
        return;
    }

    const parts = coordsRaw.split(',').map(p => p.trim());
    if (parts.length < 2) {
        alert('Formato inválido. Use: latitude, longitude');
        return;
    }

    const lat = parseFloat(parts[0]);
    const lon = parseFloat(parts[1]);
    if (isNaN(lat) || isNaN(lon)) {
        alert('Coordenadas numéricas inválidas.');
        return;
    }

    try {
        const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`;
        const res = await fetch(url, { headers: { 'User-Agent': 'SistemaAmerica/1.0' } });
        if (!res.ok) throw new Error('Serviço de busca reversa indisponível.');
        const data = await res.json();
        if (!data || !data.address) {
            alert('Nenhum endereço encontrado para essas coordenadas.');
            return;
        }

        const addr = data.address;
        
        // Preencher
        if (addr.road) document.getElementById('page-end-rua').value = addr.road;
        if (addr.suburb || addr.neighbourhood) {
            document.getElementById('page-end-bairro').value = addr.suburb || addr.neighbourhood;
        }
        if (addr.city || addr.town || addr.village) {
            document.getElementById('page-end-cidade').value = addr.city || addr.town || addr.village;
        }
        if (addr.state) {
            const stateLower = addr.state.toLowerCase();
            document.getElementById('page-end-uf').value = ufMapping[stateLower] || addr.state.substring(0,2).toUpperCase();
        }
        if (addr.postcode) {
            document.getElementById('page-end-cep').value = formatCEP(addr.postcode);
        }
        if (addr.house_number) {
            document.getElementById('page-end-num').value = addr.house_number;
        }

        if (typeof mostrarToastSucesso === 'function') {
            mostrarToastSucesso('Endereço importado a partir das coordenadas!');
        }
    } catch (e) {
        console.error(e);
        alert('Erro na busca reversa por coordenadas: ' + e.message);
    }
};

// ─── 4. BUSCA POR CNPJ DO LOCAL ──────────────────────────────────────
window.modalBuscarPorCNPJLocal = async function() {
    const cnpjRaw = document.getElementById('modal-end-cnpj')?.value || '';
    const cnpj = cnpjRaw.replace(/\D/g, '');
    if (cnpj.length !== 14) {
        alert('Por favor, informe um CNPJ válido com 14 dígitos para buscar.');
        return;
    }

    try {
        const result = await apiGet('/consulta-cnpj/' + cnpj);
        if (!result || !result.data) {
            throw new Error('Retorno inválido do servidor.');
        }

        const data = result.data;
        const source = result.source;

        if (source === 'cnpjws') {
            document.getElementById('modal-end-nome').value = data.estabelecimento?.nome_fantasia || data.razao_social || '';
            document.getElementById('modal-end-cep').value = formatCEP(data.estabelecimento?.cep) || '';

            const logradouro = data.estabelecimento?.logradouro || '';
            const tipoLogradouro = data.estabelecimento?.tipo_logradouro || '';
            const numero = data.estabelecimento?.numero || '';
            
            document.getElementById('modal-end-rua').value = `${tipoLogradouro} ${logradouro}`.trim();
            document.getElementById('modal-end-num').value = numero || '';
            document.getElementById('modal-end-comp').value = data.estabelecimento?.complemento || '';
            document.getElementById('modal-end-bairro').value = data.estabelecimento?.bairro || '';
            document.getElementById('modal-end-uf').value = data.estabelecimento?.estado?.sigla || '';
            document.getElementById('modal-end-cidade').value = data.estabelecimento?.cidade?.nome || '';
            
            // Buscar coordenadas via CEP
            if (data.estabelecimento?.cep) {
                try {
                    const nomRes = await fetch(`https://nominatim.openstreetmap.org/search?postalcode=${data.estabelecimento.cep.replace(/\D/g,'')}&country=Brazil&format=json`, {
                        headers: { 'User-Agent': 'SistemaAmerica/1.0' }
                    });
                    if (nomRes.ok) {
                        const geo = await nomRes.json();
                        if (geo && geo.length > 0) {
                            const lat = parseFloat(geo[0].lat).toFixed(6);
                            const lon = parseFloat(geo[0].lon).toFixed(6);
                            document.getElementById('modal-end-coords').value = `${lat}, ${lon}`.replace(/\.\.\. /g, '').replace(/\.\.\./g, '');
                        }
                    }
                } catch(e) {}
            }
        } else {
            // brasilapi
            document.getElementById('modal-end-nome').value = data.razao_social || '';
            document.getElementById('modal-end-cep').value = formatCEP(data.cep) || '';
            document.getElementById('modal-end-rua').value = data.logradouro || '';
            document.getElementById('modal-end-num').value = data.numero || '';
            document.getElementById('modal-end-bairro').value = data.bairro || '';
            document.getElementById('modal-end-uf').value = data.uf || '';
            document.getElementById('modal-end-cidade').value = data.municipio || '';

            // Buscar coordenadas via CEP
            if (data.cep) {
                try {
                    const nomRes = await fetch(`https://nominatim.openstreetmap.org/search?postalcode=${data.cep.replace(/\D/g,'')}&country=Brazil&format=json`, {
                        headers: { 'User-Agent': 'SistemaAmerica/1.0' }
                    });
                    if (nomRes.ok) {
                        const geo = await nomRes.json();
                        if (geo && geo.length > 0) {
                            const lat = parseFloat(geo[0].lat).toFixed(6);
                            const lon = parseFloat(geo[0].lon).toFixed(6);
                            document.getElementById('modal-end-coords').value = `${lat}, ${lon}`.replace(/\.\.\. /g, '').replace(/\.\.\./g, '');
                        }
                    }
                } catch(e) {}
            }
        }

        if (typeof mostrarToastSucesso === 'function') {
            mostrarToastSucesso('Dados do CNPJ importados com sucesso!');
        }
    } catch(e) {
        console.error(e);
        alert('Erro ao buscar CNPJ: ' + (e.message || 'Erro desconhecido.'));
    }
};

window.pageBuscarPorCNPJLocal = async function() {
    const cnpjRaw = document.getElementById('page-end-cnpj')?.value || '';
    const cnpj = cnpjRaw.replace(/\D/g, '');
    if (cnpj.length !== 14) {
        alert('Por favor, informe um CNPJ válido com 14 dígitos para buscar.');
        return;
    }

    try {
        const result = await apiGet('/consulta-cnpj/' + cnpj);
        if (!result || !result.data) {
            throw new Error('Retorno inválido do servidor.');
        }

        const data = result.data;
        const source = result.source;

        if (source === 'cnpjws') {
            document.getElementById('page-end-nome').value = data.estabelecimento?.nome_fantasia || data.razao_social || '';
            document.getElementById('page-end-cep').value = formatCEP(data.estabelecimento?.cep) || '';

            const logradouro = data.estabelecimento?.logradouro || '';
            const tipoLogradouro = data.estabelecimento?.tipo_logradouro || '';
            const numero = data.estabelecimento?.numero || '';
            
            document.getElementById('page-end-rua').value = `${tipoLogradouro} ${logradouro}`.trim();
            document.getElementById('page-end-num').value = numero || '';
            document.getElementById('page-end-comp').value = data.estabelecimento?.complemento || '';
            document.getElementById('page-end-bairro').value = data.estabelecimento?.bairro || '';
            document.getElementById('page-end-uf').value = data.estabelecimento?.estado?.sigla || '';
            document.getElementById('page-end-cidade').value = data.estabelecimento?.cidade?.nome || '';
            
            // Buscar coordenadas via CEP
            if (data.estabelecimento?.cep) {
                try {
                    const nomRes = await fetch(`https://nominatim.openstreetmap.org/search?postalcode=${data.estabelecimento.cep.replace(/\D/g,'')}&country=Brazil&format=json`, {
                        headers: { 'User-Agent': 'SistemaAmerica/1.0' }
                    });
                    if (nomRes.ok) {
                        const geo = await nomRes.json();
                        if (geo && geo.length > 0) {
                            const lat = parseFloat(geo[0].lat).toFixed(6);
                            const lon = parseFloat(geo[0].lon).toFixed(6);
                            document.getElementById('page-end-coords').value = `${lat}, ${lon}`.replace(/\.\.\. /g, '').replace(/\.\.\./g, '');
                        }
                    }
                } catch(e) {}
            }
        } else {
            // brasilapi
            document.getElementById('page-end-nome').value = data.razao_social || '';
            document.getElementById('page-end-cep').value = formatCEP(data.cep) || '';
            document.getElementById('page-end-rua').value = data.logradouro || '';
            document.getElementById('page-end-num').value = data.numero || '';
            document.getElementById('page-end-bairro').value = data.bairro || '';
            document.getElementById('page-end-uf').value = data.uf || '';
            document.getElementById('page-end-cidade').value = data.municipio || '';

            // Buscar coordenadas via CEP
            if (data.cep) {
                try {
                    const nomRes = await fetch(`https://nominatim.openstreetmap.org/search?postalcode=${data.cep.replace(/\D/g,'')}&country=Brazil&format=json`, {
                        headers: { 'User-Agent': 'SistemaAmerica/1.0' }
                    });
                    if (nomRes.ok) {
                        const geo = await nomRes.json();
                        if (geo && geo.length > 0) {
                            const lat = parseFloat(geo[0].lat).toFixed(6);
                            const lon = parseFloat(geo[0].lon).toFixed(6);
                            document.getElementById('page-end-coords').value = `${lat}, ${lon}`.replace(/\.\.\. /g, '').replace(/\.\.\./g, '');
                        }
                    }
                } catch(e) {}
            }
        }

        if (typeof mostrarToastSucesso === 'function') {
            mostrarToastSucesso('Dados do CNPJ importados com sucesso!');
        }
    } catch(e) {
        console.error(e);
        alert('Erro ao buscar CNPJ: ' + (e.message || 'Erro desconhecido.'));
    }
};

/* ── Modelos de Contrato & Cláusulas ────────────────────────────────── */
function valorPorExtenso(valor) {
    const unidades = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"];
    const dezenas = ["", "dez", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
    const dezoito = ["dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
    const centenas = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

    const singular = ["centavo", "real", "milhão", "bilhão"];
    const plural = ["centavos", "reais", "milhões", "bilhões"];

    let valorStr = String(Number(valor).toFixed(2));
    let partes = valorStr.split('.');
    let inteiro = parseInt(partes[0], 10);
    let centavos = parseInt(partes[1], 10);

    if (inteiro === 0 && centavos === 0) return "zero reais";

    let texto = "";

    function escreverGrupo(valorGrupo) {
        let u = valorGrupo % 10;
        let d = Math.floor((valorGrupo % 100) / 10);
        let c = Math.floor(valorGrupo / 100);
        let t = "";

        if (c > 0) {
            if (c === 1 && d === 0 && u === 0) {
                t += "cem";
            } else {
                t += centenas[c];
            }
        }

        if (d > 0) {
            if (t !== "") t += " e ";
            if (d === 1) {
                t += dezoito[u];
                return t;
            } else {
                t += dezenas[d];
            }
        }

        if (u > 0) {
            if (t !== "") t += " e ";
            t += unidades[u];
        }

        return t;
    }

    if (inteiro > 0) {
        let milhoes = Math.floor((inteiro % 1000000000) / 1000000);
        let milhares = Math.floor((inteiro % 1000000) / 1000);
        let unidadesSimples = inteiro % 1000;

        let partsArr = [];

        if (milhoes > 0) {
            partsArr.push(escreverGrupo(milhoes) + " " + (milhoes === 1 ? singular[2] : plural[2]));
        }
        if (milhares > 0) {
            partsArr.push(escreverGrupo(milhares) + " mil");
        }
        if (unidadesSimples > 0 || partsArr.length === 0) {
            partsArr.push(escreverGrupo(unidadesSimples));
        }

        texto += partsArr.join(" e ");
        texto += " " + (inteiro === 1 ? singular[1] : plural[1]);
    }

    if (centavos > 0) {
        if (texto !== "") texto += " e ";
        texto += escreverGrupo(centavos) + " " + (centavos === 1 ? singular[0] : plural[0]);
    }

    return texto;
}

window._renderModelosContratoInt = async function() {
    const container = document.getElementById('prop-view-modelos-contrato');
    if (!container) return;

    Swal.fire({
        title: 'Carregando Modelos e Cláusulas...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    try {
        window._modelosContratoList = await apiGet('/comercial/modelos-contrato') || [];
        window._textosLegaisList = await apiGet('/comercial/textos-legais') || [];
        Swal.close();
    } catch (e) {
        Swal.close();
        console.error('[CONTRATOS] Erro ao carregar dados:', e);
        Swal.fire('Erro', 'Erro ao carregar dados de modelos/cláusulas: ' + e.message, 'error');
    }

    _renderModelosContratoBaseLayout();
};

function _renderModelosContratoBaseLayout() {
    const container = document.getElementById('prop-view-modelos-contrato');
    if (!container) return;

    container.innerHTML = `
        <div style="font-family:'Inter', sans-serif; padding:1.5rem; background:#f8fafc; border-radius:12px; box-sizing:border-box;">
            <!-- Subtabs -->
            <div style="display:flex; gap:1.5rem; border-bottom:2px solid #e2e8f0; margin-bottom:1.5rem; padding-bottom:0.25rem;">
                <span id="subtab-modelos" onclick="switchModelosSubtab('modelos')" style="font-size:0.88rem; font-weight:700; color:#4f46e5; cursor:pointer; border-bottom:2px solid #4f46e5; padding:0.5rem 0.25rem; margin-bottom:-6px; transition:all 0.2s;">
                    Modelos de Contrato <i class="ph ph-file-text"></i>
                </span>
                <span id="subtab-textos" onclick="switchModelosSubtab('textos')" style="font-size:0.88rem; font-weight:700; color:#64748b; cursor:pointer; padding:0.5rem 0.25rem; transition:all 0.2s;">
                    Textos Legais (Cláusulas) <i class="ph ph-shield-check"></i>
                </span>
            </div>

            <!-- PANEL: MODELOS -->
            <div id="panel-modelos-contrato" style="display:flex; gap:1.5rem; flex-wrap:wrap;">
                <!-- Left Column: List -->
                <div style="flex: 0 0 320px; background:white; padding:1.25rem; border-radius:10px; border:1px solid #e2e8f0; box-shadow:0 2px 4px rgba(0,0,0,0.02); box-sizing:border-box;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                        <h3 style="font-size:0.95rem; font-weight:700; color:#1e293b; margin:0;">Meus Modelos</h3>
                        <button onclick="criarNovoModeloContrato()" style="background:#4f46e5; color:white; border:none; padding:0.4rem 0.75rem; border-radius:6px; cursor:pointer; font-weight:600; font-size:0.78rem; display:flex; align-items:center; gap:4px; height:28px;">
                            <i class="ph ph-plus"></i> Novo
                        </button>
                    </div>
                    <div id="modelos-lista-container" style="display:flex; flex-direction:column; gap:0.5rem; max-height:600px; overflow-y:auto;">
                        <!-- Filled dynamically -->
                    </div>
                </div>

                <!-- Right Column: Editor -->
                <div id="modelo-editor-container" style="flex:1; min-width:400px; background:white; padding:1.5rem; border-radius:10px; border:1px solid #e2e8f0; box-shadow:0 2px 4px rgba(0,0,0,0.02); box-sizing:border-box; display:none;">
                    <!-- Active Model Editor filled dynamically -->
                </div>
                <div id="modelo-editor-empty" style="flex:1; min-width:400px; background:white; padding:3rem; border-radius:10px; border:1px solid #e2e8f0; box-shadow:0 2px 4px rgba(0,0,0,0.02); text-align:center; color:#64748b; box-sizing:border-box; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:0.75rem;">
                    <i class="ph ph-file-text" style="font-size:3rem; color:#cbd5e1;"></i>
                    <p style="margin:0; font-weight:600; font-size:0.92rem;">Nenhum modelo selecionado.</p>
                    <p style="margin:0; font-size:0.8rem; color:#94a3b8;">Escolha um modelo na lista à esquerda ou crie um novo para editá-lo.</p>
                </div>
            </div>

            <!-- PANEL: TEXTOS LEGAIS -->
            <div id="panel-textos-legais" style="display:none; background:white; padding:1.5rem; border-radius:10px; border:1px solid #e2e8f0; box-shadow:0 2px 4px rgba(0,0,0,0.02); box-sizing:border-box;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.25rem;">
                    <div>
                        <h3 style="font-size:1.05rem; font-weight:700; color:#1e293b; margin:0;">Textos Legais Cadastrados</h3>
                        <p style="margin:0.25rem 0 0 0; font-size:0.78rem; color:#64748b;">Cláusulas e termos do ERP que podem ser adicionados aos seus modelos de contrato.</p>
                    </div>
                    <button onclick="abrirModalTextoLegal(null)" style="background:#4f46e5; color:white; border:none; padding:0.45rem 1rem; border-radius:6px; cursor:pointer; font-weight:600; font-size:0.82rem; display:flex; align-items:center; gap:6px; height:32px;">
                        <i class="ph ph-plus"></i> Novo Texto Legal
                    </button>
                </div>
                <div style="overflow-x:auto;">
                    <table class="saas-table" style="width:100%; border-collapse:collapse; text-align:left; font-size:0.82rem;">
                        <thead>
                            <tr style="background:#f8fafc; border-bottom:2px solid #e2e8f0;">
                                <th style="padding:0.75rem 1rem; font-weight:700; color:#475569; width:80px;">Código</th>
                                <th style="padding:0.75rem 1rem; font-weight:700; color:#475569; width:220px;">Descrição</th>
                                <th style="padding:0.75rem 1rem; font-weight:700; color:#475569;">Resumo do Texto</th>
                                <th style="padding:0.75rem 1rem; font-weight:700; color:#475569; width:100px; text-align:center;">Ações</th>
                            </tr>
                        </thead>
                        <tbody id="textos-legais-tbody">
                            <!-- Filled dynamically -->
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    // Render Left List of Models
    const listContainer = document.getElementById('modelos-lista-container');
    if (listContainer) {
        listContainer.innerHTML = '';
        if (window._modelosContratoList.length === 0) {
            listContainer.innerHTML = '<div style="text-align:center; padding:1.5rem; color:#94a3b8; font-size:0.8rem; font-style:italic;">Nenhum modelo cadastrado.</div>';
        } else {
            window._modelosContratoList.forEach(m => {
                const isActive = window._activeModel && window._activeModel.id === m.id;
                const row = document.createElement('div');
                row.className = 'modelo-item-row';
                row.style.cssText = `
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 0.65rem 0.85rem;
                    border: 1px solid ${isActive ? '#c7d2fe' : '#e2e8f0'};
                    background: ${isActive ? '#f5f7ff' : 'white'};
                    border-radius: 6px;
                    cursor: pointer;
                    transition: all 0.15s;
                    margin-bottom: 0.25rem;
                `;
                row.innerHTML = `
                    <span style="font-size:0.82rem; font-weight:600; color:${isActive ? '#4338ca' : '#334155'}; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1;" onclick="selecionarModeloContrato(${m.id})">
                        ${m.nome}
                    </span>
                    <div style="display:flex; gap:6px; align-items:center;">
                        <i class="ph ph-trash" title="Excluir Modelo" onclick="excluirModeloContrato(${m.id}); event.stopPropagation();" style="font-size:0.95rem; color:#ef4444; cursor:pointer; opacity:0.75; padding:2px;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.75"></i>
                    </div>
                `;
                listContainer.appendChild(row);
            });
        }
    }
    
    // Render Legal Texts table
    _renderTextosLegaisTable();
    
    if (window._activeModel) {
        window.selecionarModeloContrato(window._activeModel.id);
    }
}

window.switchModelosSubtab = function(subtab) {
    const tabModelos = document.getElementById('subtab-modelos');
    const tabTextos = document.getElementById('subtab-textos');
    const panelModelos = document.getElementById('panel-modelos-contrato');
    const panelTextos = document.getElementById('panel-textos-legais');

    if (subtab === 'modelos') {
        tabModelos.style.color = '#4f46e5';
        tabModelos.style.borderBottom = '2px solid #4f46e5';
        tabTextos.style.color = '#64748b';
        tabTextos.style.borderBottom = 'none';
        panelModelos.style.display = 'flex';
        panelTextos.style.display = 'none';
    } else {
        tabTextos.style.color = '#4f46e5';
        tabTextos.style.borderBottom = '2px solid #4f46e5';
        tabModelos.style.color = '#64748b';
        tabModelos.style.borderBottom = 'none';
        panelModelos.style.display = 'none';
        panelTextos.style.display = 'block';
        _renderTextosLegaisTable();
    }
};

function _renderLeftListActiveOnly(activeId) {
    document.querySelectorAll('.modelo-item-row').forEach(row => {
        row.style.background = 'white';
        row.style.borderColor = '#e2e8f0';
        const span = row.querySelector('span');
        if (span) span.style.color = '#334155';
    });
    
    const rows = document.querySelectorAll('.modelo-item-row');
    rows.forEach(row => {
        const span = row.querySelector('span');
        if (span && span.getAttribute('onclick') && span.getAttribute('onclick').includes(activeId)) {
            row.style.background = '#f5f7ff';
            row.style.borderColor = '#c7d2fe';
            span.style.color = '#4338ca';
        }
    });
}

window.selecionarModeloContrato = function(id) {
    const model = window._modelosContratoList.find(m => m.id === id);
    if (!model) return;
    
    window._activeModel = model;
    window._activeModelCaputs = JSON.parse(model.caputs || '[]');
    
    // Show editor
    document.getElementById('modelo-editor-empty').style.display = 'none';
    const editor = document.getElementById('modelo-editor-container');
    editor.style.display = 'block';
    
    editor.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #f1f5f9; padding-bottom:0.75rem; margin-bottom:1.25rem;">
            <h3 style="font-size:1rem; font-weight:700; color:#1e293b; margin:0;">Editar Modelo de Contrato</h3>
            <div style="display:flex; gap:8px;">
                <button onclick="salvarModeloContrato()" style="background:#16a34a; color:white; border:none; padding:0.45rem 1rem; border-radius:6px; cursor:pointer; font-weight:600; font-size:0.82rem; display:flex; align-items:center; gap:5px; height:32px;">
                    <i class="ph ph-floppy-disk"></i> Salvar Alterações
                </button>
            </div>
        </div>

        <div style="margin-bottom:1.25rem;">
            <label style="display:block; font-size:0.78rem; font-weight:700; color:#475569; text-transform:uppercase; margin-bottom:0.35rem;">Nome do Modelo *</label>
            <input type="text" id="editor-modelo-nome" value="${model.nome}" style="width:100%; padding:0.5rem; border:1px solid #cbd5e1; border-radius:6px; font-size:0.85rem; box-sizing:border-box;">
        </div>

        <div>
            <label style="display:block; font-size:0.78rem; font-weight:700; color:#475569; text-transform:uppercase; margin-bottom:0.5rem;">Estrutura do Contrato (Arrastar para reordenar)</label>
            
            <!-- Adicionar Caputs Buttons -->
            <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:1rem; background:#f8fafc; padding:0.5rem; border-radius:8px; border:1px solid #e2e8f0;">
                <button onclick="adicionarCaputAoModelo('CONTRATANTE')" style="background:white; border:1px solid #cbd5e1; color:#334155; padding:0.35rem 0.65rem; border-radius:4px; font-size:0.75rem; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:3px;">
                    <i class="ph ph-user-circle-plus" style="color:#2563eb;"></i> + Contratante
                </button>
                <button onclick="adicionarCaputAoModelo('CONTRATADO')" style="background:white; border:1px solid #cbd5e1; color:#334155; padding:0.35rem 0.65rem; border-radius:4px; font-size:0.75rem; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:3px;">
                    <i class="ph ph-buildings" style="color:#059669;"></i> + Contratado
                </button>
                <button onclick="adicionarCaputAoModelo('VALORES')" style="background:white; border:1px solid #cbd5e1; color:#334155; padding:0.35rem 0.65rem; border-radius:4px; font-size:0.75rem; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:3px;">
                    <i class="ph ph-currency-dollar" style="color:#d97706;"></i> + Valores
                </button>
                <button onclick="adicionarCaputAoModelo('TEXTO_LEGAL')" style="background:white; border:1px solid #cbd5e1; color:#334155; padding:0.35rem 0.65rem; border-radius:4px; font-size:0.75rem; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:3px;">
                    <i class="ph ph-shield-check" style="color:#7c3aed;"></i> + Texto Legal
                </button>
                <button onclick="adicionarCaputAoModelo('CUSTOM')" style="background:white; border:1px solid #cbd5e1; color:#334155; padding:0.35rem 0.65rem; border-radius:4px; font-size:0.75rem; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:3px;">
                    <i class="ph ph-plus" style="color:#4b5563;"></i> + Personalizada
                </button>
            </div>

            <!-- List of blocks -->
            <div id="editor-blocos-list" style="display:flex; flex-direction:column; gap:0.75rem; min-height:100px; background:#f8fafc; border:2px dashed #cbd5e1; border-radius:8px; padding:0.75rem; box-sizing:border-box;">
                <!-- Block items rendered here -->
            </div>
        </div>
    `;

    _renderEditorBlocksList();
    _renderLeftListActiveOnly(id);
};

function _renderEditorBlocksList() {
    const listContainer = document.getElementById('editor-blocos-list');
    if (!listContainer) return;

    listContainer.innerHTML = '';
    const caputs = window._activeModelCaputs || [];

    if (caputs.length === 0) {
        listContainer.innerHTML = `
            <div style="text-align:center; padding:2rem; color:#94a3b8; font-size:0.8rem; font-style:italic;">
                Nenhuma cláusula adicionada. Clique nos botões acima para estruturar o seu contrato.
            </div>
        `;
        return;
    }

    caputs.forEach((cpt, idx) => {
        const item = document.createElement('div');
        item.className = 'editor-block-item';
        item.setAttribute('draggable', 'true');
        item.style.cssText = `
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 0.85rem;
            box-shadow: 0 1px 3px rgba(0,0,0,0.02);
            cursor: grab;
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            position: relative;
        `;

        // Drag events
        item.ondragstart = (e) => {
            e.dataTransfer.setData("text/plain", idx);
            item.style.opacity = '0.5';
        };
        item.ondragend = () => {
            item.style.opacity = '1';
        };
        item.ondragover = (e) => {
            e.preventDefault();
        };
        item.ondrop = (e) => {
            e.preventDefault();
            const sourceIndex = parseInt(e.dataTransfer.getData("text/plain"));
            if (sourceIndex !== idx && !isNaN(sourceIndex)) {
                const dragged = window._activeModelCaputs.splice(sourceIndex, 1)[0];
                window._activeModelCaputs.splice(idx, 0, dragged);
                _renderEditorBlocksList();
            }
        };

        let badgeColor = '#4b5563';
        if (cpt.tipo === 'CONTRATANTE') badgeColor = '#2563eb';
        else if (cpt.tipo === 'CONTRATADO') badgeColor = '#059669';
        else if (cpt.tipo === 'VALORES') badgeColor = '#d97706';
        else if (cpt.tipo === 'TEXTO_LEGAL') badgeColor = '#7c3aed';

        let innerContent = '';
        if (cpt.tipo === 'TEXTO_LEGAL') {
            const options = window._textosLegaisList.map(tl => `
                <option value="${tl.id}" ${Number(cpt.textoLegalId) === tl.id ? 'selected' : ''}>[${tl.codigo}] ${tl.descricao}</option>
            `).join('');
            innerContent = `
                <div style="margin-top:0.25rem;">
                    <label style="display:block; font-size:0.75rem; color:#64748b; font-weight:600; margin-bottom:2px;">Selecionar Texto Legal:</label>
                    <select onchange="window.updateCaputTextoLegal(${idx}, this.value)" style="width:100%; padding:0.4rem; border:1px solid #cbd5e1; border-radius:4px; font-size:0.8rem; box-sizing:border-box;">
                        <option value="">-- Selecione a Cláusula --</option>
                        ${options}
                    </select>
                </div>
            `;
        } else {
            innerContent = `
                <div style="margin-top:0.25rem;">
                    <textarea oninput="window.updateCaputConteudo(${idx}, this.value)" style="width:100%; min-height:80px; padding:0.4rem; border:1px solid #cbd5e1; border-radius:4px; font-size:0.8rem; font-family:sans-serif; box-sizing:border-box; resize:vertical;">${cpt.conteudo || ''}</textarea>
                </div>
            `;
        }

        item.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #f1f5f9; padding-bottom:0.35rem; pointer-events:none;">
                <div style="display:flex; align-items:center; gap:8px;">
                    <i class="ph ph-dots-six-vertical" style="font-size:1.15rem; color:#94a3b8; cursor:grab;"></i>
                    <span style="font-size:0.78rem; font-weight:700; color:${badgeColor}; background:${badgeColor}15; padding:2px 8px; border-radius:4px;">
                        ${cpt.tipo}
                    </span>
                    <span style="font-size:0.82rem; font-weight:700; color:#334155; pointer-events:auto;">
                        Cláusula ${idx + 1}ª: 
                        <input type="text" value="${cpt.titulo || ''}" oninput="window.updateCaputTitulo(${idx}, this.value)" style="border:none; border-bottom:1px dashed #cbd5e1; font-size:0.82rem; font-weight:700; color:#334155; padding:1px 4px; outline:none; width:180px;">
                    </span>
                </div>
                <div style="display:flex; gap:6px; align-items:center; pointer-events:auto;">
                    <button onclick="window.moverCaputDoModelo(${idx}, -1)" title="Mover para Cima" style="background:#f1f5f9; border:none; padding:4px 6px; border-radius:4px; cursor:pointer;"><i class="ph ph-arrow-up" style="font-size:0.8rem;"></i></button>
                    <button onclick="window.moverCaputDoModelo(${idx}, 1)" title="Mover para Baixo" style="background:#f1f5f9; border:none; padding:4px 6px; border-radius:4px; cursor:pointer;"><i class="ph ph-arrow-down" style="font-size:0.8rem;"></i></button>
                    <button onclick="window.removerCaputDoModelo(${idx})" title="Remover Cláusula" style="background:#fee2e2; color:#ef4444; border:none; padding:4px 6px; border-radius:4px; cursor:pointer; display:flex; align-items:center; justify-content:center;"><i class="ph ph-trash" style="font-size:0.88rem;"></i></button>
                </div>
            </div>
            <div style="pointer-events:auto;">
                ${innerContent}
            </div>
        `;

        listContainer.appendChild(item);
    });
}

window.updateCaputTitulo = function(idx, val) {
    if (window._activeModelCaputs[idx]) {
        window._activeModelCaputs[idx].titulo = val;
    }
};

window.updateCaputConteudo = function(idx, val) {
    if (window._activeModelCaputs[idx]) {
        window._activeModelCaputs[idx].conteudo = val;
    }
};

window.updateCaputTextoLegal = function(idx, val) {
    if (window._activeModelCaputs[idx]) {
        window._activeModelCaputs[idx].textoLegalId = val;
    }
};

window.adicionarCaputAoModelo = function(tipo) {
    if (!window._activeModelCaputs) window._activeModelCaputs = [];
    
    let defaultTitle = '';
    let defaultContent = '';
    
    if (tipo === 'CONTRATANTE') {
        defaultTitle = 'CONTRATANTE';
        defaultContent = 'CONTRATANTE: {{CLIENTE_RAZAO}}, inscrito(a) no CNPJ/CPF sob nº {{CLIENTE_CNPJ}}, com sede/endereço de instalação em {{CLIENTE_ENDERECO}}.';
    } else if (tipo === 'CONTRATADO') {
        defaultTitle = 'CONTRATADO';
        defaultContent = 'CONTRATADO: AMERICA RENTAL EQUIPAMENTOS LTDA, inscrita no CNPJ sob nº 02.089.969/0001-06, com sede na Rua Bom Jardim, 201 - Residencial Parque Cumbica, Guarulhos - SP.';
    } else if (tipo === 'VALORES') {
        defaultTitle = 'DO VALOR E CONDIÇÕES';
        defaultContent = 'Os valores locatícios dos equipamentos e serviços estão detalhados na proposta comercial. O montante estimado é de {{VALOR_TOTAL}} ({{VALOR_EXTENSO}}), faturado de acordo com a tabela de preços {{TABELA_PRECO}} e condições de pagamento pactuadas em {{CONDICAO_PAGAMENTO}}.';
    } else if (tipo === 'TEXTO_LEGAL') {
        defaultTitle = 'DADOS LEGAIS';
    } else {
        defaultTitle = 'CLÁUSULA PERSONALIZADA';
        defaultContent = 'Texto da cláusula personalizada...';
    }
    
    const newCaput = {
        id: "cpt_" + Date.now() + "_" + Math.floor(Math.random()*1000),
        tipo: tipo,
        titulo: defaultTitle,
        conteudo: defaultContent
    };
    
    if (tipo === 'TEXTO_LEGAL') {
        newCaput.textoLegalId = '';
    }
    
    window._activeModelCaputs.push(newCaput);
    _renderEditorBlocksList();
};

window.removerCaputDoModelo = function(index) {
    window._activeModelCaputs.splice(index, 1);
    _renderEditorBlocksList();
};

window.moverCaputDoModelo = function(index, direcao) {
    const newIndex = index + direcao;
    if (newIndex < 0 || newIndex >= window._activeModelCaputs.length) return;
    
    const temp = window._activeModelCaputs[index];
    window._activeModelCaputs[index] = window._activeModelCaputs[newIndex];
    window._activeModelCaputs[newIndex] = temp;
    
    _renderEditorBlocksList();
};

window.salvarModeloContrato = async function() {
    const nome = document.getElementById('editor-modelo-nome').value.trim();
    if (!nome) {
        Swal.fire('Aviso', 'Por favor, insira o nome do modelo.', 'warning');
        return;
    }

    Swal.fire({
        title: 'Salvando modelo...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    try {
        const body = {
            nome: nome,
            caputs: window._activeModelCaputs
        };
        
        if (window._activeModel.id === 'NEW') {
            const res = await apiPost('/comercial/modelos-contrato', body);
            if (res && res.success) {
                Swal.fire('Sucesso', 'Modelo criado com sucesso!', 'success');
                window._modelosContratoList = await apiGet('/comercial/modelos-contrato') || [];
                const newModel = window._modelosContratoList.find(m => m.id === res.id);
                if (newModel) {
                    window.selecionarModeloContrato(newModel.id);
                } else {
                    window._activeModel = null;
                }
            } else {
                throw new Error(res.error || 'Erro desconhecido');
            }
        } else {
            const res = await apiPut(`/comercial/modelos-contrato/${window._activeModel.id}`, body);
            if (res && res.success) {
                Swal.fire('Sucesso', 'Modelo atualizado com sucesso!', 'success');
                window._modelosContratoList = await apiGet('/comercial/modelos-contrato') || [];
                const updated = window._modelosContratoList.find(m => m.id === window._activeModel.id);
                if (updated) window._activeModel = updated;
            } else {
                throw new Error(res.error || 'Erro desconhecido');
            }
        }
        
        window._comercialModelosContrato = await apiGet('/comercial/modelos-contrato') || [];
        
        _renderModelosContratoBaseLayout();
        if (window._activeModel) {
            window.selecionarModeloContrato(window._activeModel.id);
        }
    } catch (e) {
        console.error(e);
        Swal.fire('Erro', 'Erro ao salvar modelo: ' + e.message, 'error');
    }
};

window.criarNovoModeloContrato = function() {
    window._activeModel = { id: 'NEW', nome: 'Novo Modelo' };
    window._activeModelCaputs = [];
    
    document.getElementById('modelo-editor-empty').style.display = 'none';
    const editor = document.getElementById('modelo-editor-container');
    editor.style.display = 'block';
    
    editor.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #f1f5f9; padding-bottom:0.75rem; margin-bottom:1.25rem;">
            <h3 style="font-size:1rem; font-weight:700; color:#1e293b; margin:0;">Criar Novo Modelo de Contrato</h3>
            <div style="display:flex; gap:8px;">
                <button onclick="salvarModeloContrato()" style="background:#16a34a; color:white; border:none; padding:0.45rem 1rem; border-radius:6px; cursor:pointer; font-weight:600; font-size:0.82rem; display:flex; align-items:center; gap:5px; height:32px;">
                    <i class="ph ph-floppy-disk"></i> Salvar Modelo
                </button>
            </div>
        </div>

        <div style="margin-bottom:1.25rem;">
            <label style="display:block; font-size:0.78rem; font-weight:700; color:#475569; text-transform:uppercase; margin-bottom:0.35rem;">Nome do Modelo *</label>
            <input type="text" id="editor-modelo-nome" value="Novo Modelo" style="width:100%; padding:0.5rem; border:1px solid #cbd5e1; border-radius:6px; font-size:0.85rem; box-sizing:border-box;">
        </div>

        <div>
            <label style="display:block; font-size:0.78rem; font-weight:700; color:#475569; text-transform:uppercase; margin-bottom:0.5rem;">Estrutura do Contrato (Arrastar para reordenar)</label>
            
            <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:1rem; background:#f8fafc; padding:0.5rem; border-radius:8px; border:1px solid #e2e8f0;">
                <button onclick="adicionarCaputAoModelo('CONTRATANTE')" style="background:white; border:1px solid #cbd5e1; color:#334155; padding:0.35rem 0.65rem; border-radius:4px; font-size:0.75rem; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:3px;">
                    <i class="ph ph-user-circle-plus" style="color:#2563eb;"></i> + Contratante
                </button>
                <button onclick="adicionarCaputAoModelo('CONTRATADO')" style="background:white; border:1px solid #cbd5e1; color:#334155; padding:0.35rem 0.65rem; border-radius:4px; font-size:0.75rem; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:3px;">
                    <i class="ph ph-buildings" style="color:#059669;"></i> + Contratado
                </button>
                <button onclick="adicionarCaputAoModelo('VALORES')" style="background:white; border:1px solid #cbd5e1; color:#334155; padding:0.35rem 0.65rem; border-radius:4px; font-size:0.75rem; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:3px;">
                    <i class="ph ph-currency-dollar" style="color:#d97706;"></i> + Valores
                </button>
                <button onclick="adicionarCaputAoModelo('TEXTO_LEGAL')" style="background:white; border:1px solid #cbd5e1; color:#334155; padding:0.35rem 0.65rem; border-radius:4px; font-size:0.75rem; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:3px;">
                    <i class="ph ph-shield-check" style="color:#7c3aed;"></i> + Texto Legal
                </button>
                <button onclick="adicionarCaputAoModelo('CUSTOM')" style="background:white; border:1px solid #cbd5e1; color:#334155; padding:0.35rem 0.65rem; border-radius:4px; font-size:0.75rem; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:3px;">
                    <i class="ph ph-plus" style="color:#4b5563;"></i> + Personalizada
                </button>
            </div>

            <div id="editor-blocos-list" style="display:flex; flex-direction:column; gap:0.75rem; min-height:100px; background:#f8fafc; border:2px dashed #cbd5e1; border-radius:8px; padding:0.75rem; box-sizing:border-box;">
                <!-- Block items -->
            </div>
        </div>
    `;
    
    _renderEditorBlocksList();
};

window.excluirModeloContrato = async function(id) {
    const model = window._modelosContratoList.find(m => m.id === id);
    if (!model) return;

    const confirm = await Swal.fire({
        title: 'Excluir modelo?',
        text: `Deseja realmente excluir o modelo "${model.nome}"?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sim, excluir!',
        cancelButtonText: 'Cancelar'
    });

    if (confirm.isConfirmed) {
        Swal.fire({
            title: 'Excluindo modelo...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        try {
            const res = await apiDelete(`/comercial/modelos-contrato/${id}`);
            if (res && res.success) {
                Swal.fire('Excluído!', 'O modelo foi excluído.', 'success');
                window._modelosContratoList = await apiGet('/comercial/modelos-contrato') || [];
                window._comercialModelosContrato = await apiGet('/comercial/modelos-contrato') || [];
                if (window._activeModel && window._activeModel.id === id) {
                    window._activeModel = null;
                    document.getElementById('modelo-editor-container').style.display = 'none';
                    document.getElementById('modelo-editor-empty').style.display = 'flex';
                }
                _renderModelosContratoBaseLayout();
            } else {
                throw new Error(res.error || 'Erro desconhecido');
            }
        } catch (e) {
            console.error(e);
            Swal.fire('Erro', 'Erro ao excluir modelo: ' + e.message, 'error');
        }
    }
};

function _renderTextosLegaisTable() {
    const tbody = document.getElementById('textos-legais-tbody');
    if (!tbody) return;

    tbody.innerHTML = '';
    if (window._textosLegaisList.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align:center; padding:1.5rem; color:#94a3b8; font-style:italic;">
                    Nenhum texto legal cadastrado.
                </td>
            </tr>
        `;
        return;
    }

    window._textosLegaisList.forEach(tl => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid #f1f5f9';
        
        const maxLen = 120;
        const textPreview = tl.texto_legal.length > maxLen ? tl.texto_legal.substring(0, maxLen) + '...' : tl.texto_legal;
        
        tr.innerHTML = `
            <td style="padding:0.75rem 1rem; color:#334155; font-weight:600;">${tl.codigo}</td>
            <td style="padding:0.75rem 1rem; color:#334155; font-weight:700;">${tl.descricao}</td>
            <td style="padding:0.75rem 1rem; color:#64748b; max-width:400px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${tl.texto_legal.replace(/"/g, '&quot;')}">${textPreview}</td>
            <td style="padding:0.75rem 1rem; text-align:center;">
                <div style="display:inline-flex; gap:8px;">
                    <i class="ph ph-pencil-simple" title="Editar Texto" onclick="abrirModalTextoLegal(${tl.id})" style="font-size:1.1rem; color:#4f46e5; cursor:pointer; opacity:0.8;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.8"></i>
                    <i class="ph ph-trash" title="Excluir Texto" onclick="excluirTextoLegal(${tl.id})" style="font-size:1.1rem; color:#ef4444; cursor:pointer; opacity:0.8;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.8"></i>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.abrirModalTextoLegal = async function(id) {
    const isEdit = id !== null;
    let tl = { codigo: '', descricao: '', texto_legal: '' };
    
    if (isEdit) {
        tl = window._textosLegaisList.find(x => x.id === id);
        if (!tl) return;
    } else {
        const maxCode = window._textosLegaisList.reduce((max, item) => item.codigo > max ? item.codigo : max, 0);
        tl.codigo = maxCode + 1;
    }

    const { value: formValues } = await Swal.fire({
        title: isEdit ? 'Editar Texto Legal' : 'Novo Texto Legal',
        html: `
            <div style="text-align:left; font-family:'Inter', sans-serif;">
                <div style="margin-bottom:0.75rem;">
                    <label style="display:block; font-size:0.75rem; font-weight:700; color:#475569; text-transform:uppercase; margin-bottom:0.25rem;">Código</label>
                    <input id="swal-tl-codigo" type="number" class="swal2-input" value="${tl.codigo}" style="width:100%; margin:0; height:36px; font-size:0.85rem;" ${isEdit ? 'disabled' : ''}>
                </div>
                <div style="margin-bottom:0.75rem;">
                    <label style="display:block; font-size:0.75rem; font-weight:700; color:#475569; text-transform:uppercase; margin-bottom:0.25rem;">Descrição / Identificação *</label>
                    <input id="swal-tl-descricao" type="text" class="swal2-input" value="${tl.descricao}" style="width:100%; margin:0; height:36px; font-size:0.85rem;" placeholder="Ex: Proposta Evento">
                </div>
                <div>
                    <label style="display:block; font-size:0.75rem; font-weight:700; color:#475569; text-transform:uppercase; margin-bottom:0.25rem;">Texto Legal / Cláusula Contratual *</label>
                    <textarea id="swal-tl-texto" class="swal2-textarea" style="width:100%; margin:0; height:180px; font-size:0.85rem; font-family:sans-serif; box-sizing:border-box; padding:8px;" placeholder="Digite o texto legal completo...">${tl.texto_legal}</textarea>
                </div>
            </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Confirmar',
        cancelButtonText: 'Cancelar',
        preConfirm: () => {
            return {
                codigo: document.getElementById('swal-tl-codigo').value,
                descricao: document.getElementById('swal-tl-descricao').value.trim(),
                texto_legal: document.getElementById('swal-tl-texto').value.trim()
            }
        }
    });

    if (formValues) {
        if (!formValues.descricao || !formValues.texto_legal) {
            Swal.fire('Erro', 'Descrição e Texto Legal são obrigatórios.', 'error');
            return;
        }

        Swal.fire({
            title: 'Salvando...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        try {
            if (isEdit) {
                const res = await apiPut(`/comercial/textos-legais/${id}`, {
                    descricao: formValues.descricao,
                    texto_legal: formValues.texto_legal
                });
                if (res && res.success) {
                    Swal.fire('Sucesso', 'Texto legal atualizado!', 'success');
                } else {
                    throw new Error(res.error || 'Erro desconhecido');
                }
            } else {
                const res = await apiPost('/comercial/textos-legais', formValues);
                if (res && res.success) {
                    Swal.fire('Sucesso', 'Texto legal cadastrado!', 'success');
                } else {
                    throw new Error(res.error || 'Erro desconhecido');
                }
            }
            window._textosLegaisList = await apiGet('/comercial/textos-legais') || [];
            _renderTextosLegaisTable();
            
            if (window._activeModel) {
                _renderEditorBlocksList();
            }
        } catch (e) {
            console.error(e);
            Swal.fire('Erro', 'Erro ao salvar texto legal: ' + e.message, 'error');
        }
    }
};

window.excluirTextoLegal = async function(id) {
    const tl = window._textosLegaisList.find(x => x.id === id);
    if (!tl) return;

    const confirm = await Swal.fire({
        title: 'Excluir texto legal?',
        text: `Deseja realmente excluir a cláusula "${tl.descricao}"?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sim, excluir!',
        cancelButtonText: 'Cancelar'
    });

    if (confirm.isConfirmed) {
        Swal.fire({
            title: 'Excluindo...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        try {
            const res = await apiDelete(`/comercial/textos-legais/${id}`);
            if (res && res.success) {
                Swal.fire('Excluído!', 'O texto legal foi removido.', 'success');
                window._textosLegaisList = await apiGet('/comercial/textos-legais') || [];
                _renderTextosLegaisTable();
                if (window._activeModel) {
                    _renderEditorBlocksList();
                }
            } else {
                throw new Error(res.error || 'Erro desconhecido');
            }
        } catch (e) {
            console.error(e);
            Swal.fire('Erro', 'Erro ao excluir: ' + e.message, 'error');
        }
    }
};

