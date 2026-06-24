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

/* ── Inicialização ──────────────────────────────────────────────────── */
async function inicializarPropostas() {
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

            <!-- Cabeçalho -->
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; flex-wrap:wrap; gap:1rem;">
                <div>
                    <h2 style="margin:0; color:#1e293b; font-size:1.4rem; font-weight:700; display:flex; align-items:center; gap:0.5rem;">
                        <i class="ph ph-file-text" style="color:#7048e8;"></i> Propostas Comerciais
                    </h2>
                    <p style="margin:0.25rem 0 0; color:#64748b; font-size:0.88rem;">
                        Gerencie as propostas de locação da América Rental
                    </p>
                </div>
            </div>

            <!-- ABAS INTERNAS -->
            <div style="display:flex; gap:1rem; border-bottom:1px solid #e2e8f0; margin-bottom:1.5rem;">
                <button id="tab-prop-lista" onclick="switchPropostaTab('lista')" style="background:none; border:none; border-bottom:2px solid ${_currentPropostaTab === 'lista' ? '#7048e8' : 'transparent'}; color:${_currentPropostaTab === 'lista' ? '#7048e8' : '#64748b'}; font-weight:600; padding:0.5rem 1rem; cursor:pointer; font-size:1rem; outline:none; transition:all 0.2s;">
                    <i class="ph ph-list-bullets"></i> Lista de Propostas
                </button>
                <button id="tab-prop-form" onclick="switchPropostaTab('form')" style="background:none; border:none; border-bottom:2px solid ${_currentPropostaTab === 'form' ? '#7048e8' : 'transparent'}; color:${_currentPropostaTab === 'form' ? '#7048e8' : '#64748b'}; font-weight:600; padding:0.5rem 1rem; cursor:pointer; font-size:1rem; outline:none; transition:all 0.2s;">
                    <i class="ph ph-pencil-simple"></i> <span id="tab-prop-form-text">${_propostasEditandoId ? 'Editar Proposta' : 'Nova Proposta'}</span>
                </button>
                <button id="tab-prop-cadastro-cliente" onclick="switchPropostaTab('cadastro-cliente')" style="background:none; border:none; border-bottom:2px solid ${_currentPropostaTab === 'cadastro-cliente' ? '#7048e8' : 'transparent'}; color:${_currentPropostaTab === 'cadastro-cliente' ? '#7048e8' : '#64748b'}; font-weight:600; padding:0.5rem 1rem; cursor:pointer; font-size:1rem; outline:none; transition:all 0.2s;">
                    <i class="ph ph-user"></i> Cadastro de Cliente
                </button>
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

        </div>
    `;

    if (_currentPropostaTab === 'form') {
        _renderFormPropostaInt();
    }
}

window.switchPropostaTab = function(tab) {
    _currentPropostaTab = tab;
    
    const viewLista = document.getElementById('prop-view-lista');
    const viewForm = document.getElementById('prop-view-form');
    const viewCadastroCliente = document.getElementById('prop-view-cadastro-cliente');
    const tabLista = document.getElementById('tab-prop-lista');
    const tabForm = document.getElementById('tab-prop-form');
    const tabCadastroCliente = document.getElementById('tab-prop-cadastro-cliente');

    if (viewLista && viewForm && viewCadastroCliente && tabLista && tabForm && tabCadastroCliente) {
        if (tab === 'form' && viewForm.innerHTML.trim() === '') {
            _renderFormPropostaInt();
        }
        if (tab === 'cadastro-cliente' && viewCadastroCliente.innerHTML.trim() === '') {
            _renderCadastroClienteInt();
        }

        viewLista.style.display = tab === 'lista' ? 'block' : 'none';
        viewForm.style.display = tab === 'form' ? 'block' : 'none';
        viewCadastroCliente.style.display = tab === 'cadastro-cliente' ? 'block' : 'none';

        tabLista.style.borderBottom = tab === 'lista' ? '2px solid #7048e8' : 'transparent';
        tabLista.style.color = tab === 'lista' ? '#7048e8' : '#64748b';

        tabForm.style.borderBottom = tab === 'form' ? '2px solid #7048e8' : 'transparent';
        tabForm.style.color = tab === 'form' ? '#7048e8' : '#64748b';
        if (tab === 'form') {
            const span = document.getElementById('tab-prop-form-text');
            if (span) span.innerText = _propostasEditandoId ? 'Editar Proposta' : 'Nova Proposta';
        }

        tabCadastroCliente.style.borderBottom = tab === 'cadastro-cliente' ? '2px solid #7048e8' : 'transparent';
        tabCadastroCliente.style.color = tab === 'cadastro-cliente' ? '#7048e8' : '#64748b';
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
    const titulo = isNovo ? '📄 Nova Proposta' : `✏️ Editar Proposta — ${prop.codigo}`;

    const container = document.getElementById('prop-view-form');
    if (!container) return;

    const v = (campo) => prop ? (prop[campo] || '') : '';
    const vn = (campo, def='0') => prop ? (prop[campo] ?? def) : def;

    container.innerHTML = `
        <div style="background:#fff; width:100%; border-radius:14px; box-shadow:0 5px 20px rgba(0,0,0,0.05); overflow:hidden; margin:auto; border: 1px solid #e2e8f0;">

            <!-- Toolbar -->
            <div style="background:#f8fafc; border-bottom:1px solid #e2e8f0; padding:0.65rem 1.5rem; display:flex; gap:0.6rem; flex-wrap:wrap;">
                <button onclick="salvarProposta()" style="background:#16a34a;color:white;border:none;padding:0.5rem 1rem;border-radius:7px;cursor:pointer;font-weight:600;font-size:0.84rem;display:flex;align-items:center;gap:5px;">
                    <i class="ph ph-floppy-disk"></i> Salvar
                </button>
                <button onclick="fecharFormProposta()" style="background:#64748b;color:white;border:none;padding:0.5rem 1rem;border-radius:7px;cursor:pointer;font-weight:600;font-size:0.84rem;display:flex;align-items:center;gap:5px;">
                    <i class="ph ph-x"></i> Cancelar
                </button>
                ${!isNovo ? `
                <button onclick="imprimirProposta(${id})" style="background:#0ea5e9;color:white;border:none;padding:0.5rem 1rem;border-radius:7px;cursor:pointer;font-weight:600;font-size:0.84rem;display:flex;align-items:center;gap:5px;">
                    <i class="ph ph-printer"></i> Imprimir
                </button>
                <button onclick="if(confirm('Excluir esta proposta?')) excluirProposta(${id})" style="background:#dc2626;color:white;border:none;padding:0.5rem 1rem;border-radius:7px;cursor:pointer;font-weight:600;font-size:0.84rem;display:flex;align-items:center;gap:5px;">
                    <i class="ph ph-trash"></i> Excluir
                </button>` : ''}
            </div>

            <!-- Corpo do formulário -->
            <div style="padding:1.5rem; overflow-y:auto; max-height:78vh;">
                <form id="form-proposta" onsubmit="return false;">

                    <!-- Linha 1: Código, Local, Tipo, Atendente -->
                    <div style="display:grid; grid-template-columns:1fr 1.5fr 2fr 1.5fr; gap:1rem; margin-bottom:1rem;">
                        <div>
                            <label class="prop-lbl">Código</label>
                            <input type="text" id="prop-codigo" value="${v('codigo') || (isNovo ? 'Auto' : '')}" readonly
                                style="width:100%;padding:0.55rem;border:1px solid #e2e8f0;border-radius:6px;background:#f8fafc;color:#64748b;font-size:0.85rem;box-sizing:border-box;">
                        </div>
                        <div>
                            <label class="prop-lbl">Local *</label>
                            <select id="prop-local" style="width:100%;padding:0.55rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;box-sizing:border-box;">
                                ${PROP_LOCAIS.map(l => `<option value="${l}" ${v('local')===l?'selected':''}>${l}</option>`).join('')}
                            </select>
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
                            <input type="text" id="prop-atendente" value="${v('atendente')}"
                                style="width:100%;padding:0.55rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;box-sizing:border-box;" placeholder="Nome do atendente">
                        </div>
                    </div>

                    <!-- Linha 2: Datas cadastro, previsão, fase, modelo -->
                    <div style="display:grid; grid-template-columns:1fr 1fr 1.5fr 1.5fr; gap:1rem; margin-bottom:1rem;">
                        <div>
                            <label class="prop-lbl">Data Cadastro *</label>
                            <input type="date" id="prop-data-cadastro" value="${v('data_cadastro') || hoje}"
                                style="width:100%;padding:0.55rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;box-sizing:border-box;">
                        </div>
                        <div>
                            <label class="prop-lbl">Previsão Fechamento</label>
                            <input type="date" id="prop-previsao" value="${v('previsao_fechamento')}"
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
                                <input type="text" id="prop-cliente" value="${v('cliente_nome')}"
                                    style="width:100%;padding:0.55rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;box-sizing:border-box;" placeholder="Nome do cliente">
                            </div>
                            <div>
                                <label class="prop-lbl">Contato</label>
                                <input type="text" id="prop-contato" value="${v('contato_nome')}"
                                    style="width:100%;padding:0.55rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;box-sizing:border-box;" placeholder="Nome do contato">
                            </div>
                        </div>
                    </div>

                    <!-- Seção: Período e Preços -->
                    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:9px; padding:1rem 1.2rem; margin-bottom:1rem;">
                        <h4 style="margin:0 0 0.85rem; font-size:0.88rem; color:#475569; font-weight:700; display:flex; align-items:center; gap:6px;">
                            <i class="ph ph-calendar-blank" style="color:#7048e8;"></i> Período e Condições
                        </h4>
                        <div style="display:grid; grid-template-columns:1fr 1fr 0.7fr 0.7fr 0.7fr 1.5fr; gap:1rem; margin-bottom:0.85rem;">
                            <div>
                                <label class="prop-lbl">Período Início *</label>
                                <input type="date" id="prop-periodo-ini" value="${v('periodo_inicio')}"
                                    onchange="calcularDiasContrato()"
                                    style="width:100%;padding:0.55rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;box-sizing:border-box;">
                            </div>
                            <div>
                                <label class="prop-lbl">Período Fim</label>
                                <input type="date" id="prop-periodo-fim" value="${v('periodo_fim')}"
                                    onchange="calcularDiasContrato()"
                                    style="width:100%;padding:0.55rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;box-sizing:border-box;">
                            </div>
                            <div>
                                <label class="prop-lbl">Hora Início</label>
                                <input type="time" id="prop-hora-ini" value="${v('hora_inicio')||'00:00'}"
                                    style="width:100%;padding:0.55rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;box-sizing:border-box;">
                            </div>
                            <div>
                                <label class="prop-lbl">Hora Fim</label>
                                <input type="time" id="prop-hora-fim" value="${v('hora_fim')||'00:00'}"
                                    style="width:100%;padding:0.55rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;box-sizing:border-box;">
                            </div>
                            <div>
                                <label class="prop-lbl">Dias Contrato</label>
                                <input type="number" id="prop-dias" value="${vn('dias_contrato','0')}" min="0"
                                    style="width:100%;padding:0.55rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;box-sizing:border-box;">
                            </div>
                            <div>
                                <label class="prop-lbl">Tabela de Preços</label>
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
                                <input type="text" id="prop-representante" value="${v('representante')}"
                                    style="width:100%;padding:0.55rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;box-sizing:border-box;" placeholder="Nome do representante">
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

window.fecharFormProposta = function() {
    _propostasEditandoId = null;
    const viewForm = document.getElementById('prop-view-form');
    if (viewForm) viewForm.innerHTML = '';
    window.switchPropostaTab('lista');
};

/* ── Cálculos auxiliares ────────────────────────────────────────────── */
function calcularDiasContrato() {
    const ini = document.getElementById('prop-periodo-ini')?.value;
    const fim = document.getElementById('prop-periodo-fim')?.value;
    const diasEl = document.getElementById('prop-dias');
    if (!ini || !fim || !diasEl) return;
    const diff = Math.ceil((new Date(fim) - new Date(ini)) / (1000 * 60 * 60 * 24));
    if (diff >= 0) diasEl.value = diff;
}

function calcularDescontoReais() {
    const pct = parseFloat(document.getElementById('prop-desc-pct')?.value || 0);
    const total = parseFloat(document.getElementById('prop-valor-total')?.value || 0);
    const rsEl = document.getElementById('prop-desc-rs');
    if (rsEl && total > 0) rsEl.value = (total * pct / 100).toFixed(2);
}

/* ── Salvar proposta ────────────────────────────────────────────────── */
async function salvarProposta() {
    const obter = (id) => document.getElementById(id)?.value || '';
    const obterN = (id) => parseFloat(document.getElementById(id)?.value || 0);

    const tipo = obter('prop-tipo');
    const fase = obter('prop-fase');
    const dataCad = obter('prop-data-cadastro');

    if (!tipo) { alert('Selecione o Tipo da proposta.'); return; }
    if (!dataCad) { alert('Informe a Data de Cadastro.'); return; }

    const payload = {
        local: obter('prop-local'),
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
        let resp;
        if (_propostasEditandoId) {
            resp = await apiPut(`/propostas/${_propostasEditandoId}`, payload);
        } else {
            resp = await apiPost('/propostas', payload);
        }

        if (resp && (resp.success || resp.id)) {
            fecharFormProposta();
            await carregarPropostas();
            renderTelaPropostas();
            if (typeof mostrarToastSucesso === 'function') {
                mostrarToastSucesso(_propostasEditandoId ? 'Proposta atualizada com sucesso!' : `Proposta ${resp.codigo} criada com sucesso!`);
            }
        } else {
            alert('Erro ao salvar proposta: ' + (resp?.error || 'Erro desconhecido'));
        }
    } catch (e) {
        console.error('[PROPOSTAS] Erro ao salvar:', e);
        alert('Erro ao comunicar com o servidor.');
    }
}

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

        ${p.observacoes ? `
        <div class="section">
            <h3>Observações</h3>
            <div class="obs">${p.observacoes}</div>
        </div>` : ''}

        <div class="valor-box">
            <div class="label">Valor Total da Proposta</div>
            <div class="val">${fmtMoeda(p.valor_total)}</div>
        </div>

        <div class="footer">
            Proposta gerada em ${new Date().toLocaleString('pt-BR')} · América Rental Equipamentos Ltda.
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

/* Injetar CSS das labels do formulário */
(function injetarCssProposta() {
    if (document.getElementById('style-proposta')) return;
    const style = document.createElement('style');
    style.id = 'style-proposta';
    style.textContent = `
        .prop-lbl {
            display: block;
            font-size: 0.76rem;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            margin-bottom: 0.3rem;
        }
    `;
    document.head.appendChild(style);
})();

/* ── Hook de inicialização ──────────────────────────────────────────── */
window.inicializarPropostas   = inicializarPropostas;
window.abrirFormProposta      = abrirFormProposta;
window.salvarProposta         = salvarProposta;
window.excluirProposta        = excluirProposta;
window.filtrarPropostas       = filtrarPropostas;
window.limparFiltrosPropostas = limparFiltrosPropostas;
window.imprimirProposta       = imprimirProposta;
window.calcularDiasContrato   = calcularDiasContrato;
window.calcularDescontoReais  = calcularDescontoReais;

// ══════════════════════════════════════════════════════════════════════
// CADASTRO DE CLIENTES: RENDER & EVENT HANDLERS
// ══════════════════════════════════════════════════════════════════════

function _renderCadastroClienteInt() {
    const container = document.getElementById('prop-view-cadastro-cliente');
    if (!container) return;
    
    const hoje = new Date().toISOString().split('T')[0];
    
    container.innerHTML = `
        <div style="background:#fff; width:100%; border-radius:14px; box-shadow:0 5px 20px rgba(0,0,0,0.05); overflow:hidden; margin:auto; border: 1px solid #e2e8f0; font-family:'Inter', sans-serif;">
            
            <!-- Barra de Ferramentas (Toolbar Azul/Roxa da imagem) -->
            <div style="background:#3b5bdb; border-bottom:1px solid #e2e8f0; padding:0.65rem 1.5rem; display:flex; gap:0.6rem; flex-wrap:wrap; align-items:center;">
                <button onclick="recarregarCliente()" style="background:#4c6ef5;color:white;border:none;padding:0.5rem 1rem;border-radius:5px;cursor:pointer;font-weight:600;font-size:0.84rem;display:flex;align-items:center;gap:5px;transition:background 0.2s;" onmouseover="this.style.background='#3b5bdb'" onmouseout="this.style.background='#4c6ef5'">
                    <i class="ph ph-arrows-counter-clockwise"></i> Recarregar
                </button>
                <button onclick="salvarCliente()" style="background:#4c6ef5;color:white;border:none;padding:0.5rem 1rem;border-radius:5px;cursor:pointer;font-weight:600;font-size:0.84rem;display:flex;align-items:center;gap:5px;transition:background 0.2s;" onmouseover="this.style.background='#3b5bdb'" onmouseout="this.style.background='#4c6ef5'">
                    <i class="ph ph-check-square-offset"></i> Processar
                </button>
                <button onclick="excluirCliente()" style="background:#4c6ef5;color:white;border:none;padding:0.5rem 1rem;border-radius:5px;cursor:pointer;font-weight:600;font-size:0.84rem;display:flex;align-items:center;gap:5px;transition:background 0.2s;" onmouseover="this.style.background='#3b5bdb'" onmouseout="this.style.background='#4c6ef5'">
                    <i class="ph ph-trash"></i> Excluir
                </button>
                <button onclick="verificarCliente()" style="background:#4c6ef5;color:white;border:none;padding:0.5rem 1rem;border-radius:5px;cursor:pointer;font-weight:600;font-size:0.84rem;display:flex;align-items:center;gap:5px;transition:background 0.2s;" onmouseover="this.style.background='#3b5bdb'" onmouseout="this.style.background='#4c6ef5'">
                    <i class="ph ph-shield-check"></i> Verificar
                </button>
            </div>

            <!-- Corpo da Tela -->
            <div style="padding:1.5rem; overflow-y:auto; max-height:80vh;">
                
                <!-- Cabeçalho Roxo da Tela -->
                <div style="display:flex; justify-content:space-between; align-items:center; background:#7048e8; padding:0.6rem 1.2rem; border-radius:8px 8px 0 0; color:white; margin-bottom:1rem; flex-wrap:wrap; gap:0.5rem;">
                    <div style="font-weight:bold; font-size:1.05rem; display:flex; align-items:center; gap:0.5rem;">
                        <i class="ph ph-user-focus"></i> Cadastro de Cliente
                    </div>
                    <div style="display:flex; align-items:center; gap:0.8rem; font-size:0.85rem;">
                        <span style="background:rgba(255,255,255,0.2); padding:0.35rem 0.75rem; border-radius:5px; font-weight:600;">
                            Pesquise pelo CNPJ para completar o cadastro.
                        </span>
                        <label style="display:flex; align-items:center; gap:5px; cursor:pointer; font-weight:600;">
                            <input type="checkbox" id="cli-inativo" style="accent-color:#7048e8;"> Inativo?
                        </label>
                    </div>
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
                                <div style="display:flex; align-items:center; gap:8px; font-weight:600;">
                                    <span>Dados para Envio de E-Mail Cobranças: Enviar com</span>
                                    <input type="number" id="cli-email-cob-antecedencia" value="5" style="width:45px; text-align:center; padding:3px; border:1px solid #cbd5e1; border-radius:4px;">
                                    <span>dias de antecedência e</span>
                                    <input type="number" id="cli-email-cob-posterior" value="5" style="width:45px; text-align:center; padding:3px; border:1px solid #cbd5e1; border-radius:4px;">
                                    <span>dias posterior ao Vencimento</span>
                                </div>
                                <button onclick="abrirModalNovoContato()" style="background:#007bff; color:white; border:none; padding:0.45rem 1rem; border-radius:4px; font-weight:bold; font-size:0.83rem; cursor:pointer; display:flex; align-items:center; gap:5px;">
                                    <i class="ph ph-plus-bold"></i> Novo Contato
                                </button>
                            </div>

                            <!-- Tabela de contatos cadastrados -->
                            <div style="background:#fff; border-radius:8px; border:1px solid #e2e8f0; overflow-x:auto;">
                                <table style="width:100%; border-collapse:collapse; font-size:0.8rem; min-width:1200px;">
                                    <thead>
                                        <tr style="background:#007bff; color:white; text-align:left;">
                                            <th style="padding:0.5rem; border-bottom:1px solid #e2e8f0; font-weight:600;">Identificação</th>
                                            <th style="padding:0.5rem; border-bottom:1px solid #e2e8f0; font-weight:600;">Nome</th>
                                            <th style="padding:0.5rem; border-bottom:1px solid #e2e8f0; font-weight:600;">Departamento</th>
                                            <th style="padding:0.5rem; border-bottom:1px solid #e2e8f0; font-weight:600;">Celular</th>
                                            <th style="padding:0.5rem; border-bottom:1px solid #e2e8f0; font-weight:600;">Telefone/Ramal</th>
                                            <th style="padding:0.5rem; border-bottom:1px solid #e2e8f0; font-weight:600;">E-mail</th>
                                            <th style="padding:0.5rem; border-bottom:1px solid #e2e8f0; font-weight:600;">Dono</th>
                                            <th style="padding:0.5rem; border-bottom:1px solid #e2e8f0; font-weight:600;">Cargo</th>
                                            <th style="padding:0.5rem; border-bottom:1px solid #e2e8f0; font-weight:600;">Situação</th>
                                            <th style="padding:0.5rem; border-bottom:1px solid #e2e8f0; font-weight:600;">Recebe E-mail de NFe - XML e Danfe</th>
                                            <th style="padding:0.5rem; border-bottom:1px solid #e2e8f0; font-weight:600;">Recebe E-mail de Cobrança e Boleto</th>
                                            <th style="padding:0.5rem; border-bottom:1px solid #e2e8f0; font-weight:600;">Recebe E-mail de Situação de OS</th>
                                            <th style="padding:0.5rem; border-bottom:1px solid #e2e8f0; font-weight:600;">Recebe E-mail de Situação de Contrato</th>
                                            <th style="padding:0.5rem; border-bottom:1px solid #e2e8f0; font-weight:600;">Origem</th>
                                            <th style="padding:0.5rem; border-bottom:1px solid #e2e8f0; font-weight:600;">Inativo</th>
                                            <th style="padding:0.5rem; border-bottom:1px solid #e2e8f0; font-weight:600; text-align:center;">Ações</th>
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
            <td style="padding:0.5rem; color:#475569;">${c.identificacao}</td>
            <td style="padding:0.5rem; color:#1e293b; font-weight:600;">${c.nome}</td>
            <td style="padding:0.5rem; color:#475569;">${c.departamento || '—'}</td>
            <td style="padding:0.5rem; color:#475569;">${c.celular || '—'}</td>
            <td style="padding:0.5rem; color:#475569;">${c.telefone_ramal || '—'}</td>
            <td style="padding:0.5rem; color:#475569;">${c.email}</td>
            <td style="padding:0.5rem; color:#475569;">${c.dono || '—'}</td>
            <td style="padding:0.5rem; color:#475569;">${c.cargo || '—'}</td>
            <td style="padding:0.5rem; color:#475569;">${c.situacao || '—'}</td>
            <td style="padding:0.5rem; color:#475569;">${c.nfe || 'Não'}</td>
            <td style="padding:0.5rem; color:#475569;">${c.cobranca || 'Não'}</td>
            <td style="padding:0.5rem; color:#475569;">${c.os || 'Não'}</td>
            <td style="padding:0.5rem; color:#475569;">${c.contrato || 'Não'}</td>
            <td style="padding:0.5rem; color:#475569;">${c.origem || '—'}</td>
            <td style="padding:0.5rem; color:#475569;">${c.inativo || 'Não'}</td>
            <td style="padding:0.5rem; text-align:center;">
                <button onclick="removerContato(${idx})" style="background:#ffe3e3; color:#e03131; border:none; padding:3px 6px; border-radius:4px; cursor:pointer;" title="Remover Contato"><i class="ph ph-trash"></i></button>
            </td>
        </tr>
    `).join('');
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
