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
                    <i class="ph ph-users-three"></i> Cadastro de Contatos
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

let _contatoEditandoId = null;
let _empresaSelecionadaId = null;
let _empresaSelecionadaCodigo = null;

function _renderCadastroClienteInt() {
    const container = document.getElementById('prop-view-cadastro-cliente');
    if (!container) return;
    
    container.innerHTML = `
        <style>
            .cc-container {
                background: #fff;
                width: 100%;
                border-radius: 12px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.06);
                overflow: hidden;
                margin: auto;
                border: 1px solid #e2e8f0;
                font-family: 'Inter', sans-serif;
            }
            .cc-toolbar {
                background: #f8fafc;
                border-bottom: 1px solid #e2e8f0;
                padding: 0.75rem 1.5rem;
                display: flex;
                gap: 0.75rem;
                flex-wrap: wrap;
                align-items: center;
            }
            .cc-toolbar-btn {
                display: inline-flex;
                align-items: center;
                gap: 0.5rem;
                background: #fff;
                border: 1px solid #cbd5e1;
                color: #334155;
                padding: 0.5rem 1.1rem;
                border-radius: 6px;
                font-weight: 600;
                font-size: 0.85rem;
                cursor: pointer;
                transition: all 0.2s;
            }
            .cc-toolbar-btn:hover {
                background: #f1f5f9;
                border-color: #94a3b8;
            }
            .cc-toolbar-btn.primary {
                background: #7048e8;
                color: #fff;
                border-color: #7048e8;
            }
            .cc-toolbar-btn.primary:hover {
                background: #5f3dc4;
            }
            .cc-toolbar-btn.danger {
                background: #ffe3e3;
                color: #e03131;
                border-color: #ffc9c9;
            }
            .cc-toolbar-btn.danger:hover {
                background: #fa5252;
                color: #fff;
                border-color: #fa5252;
            }
            .cc-ribbon {
                background: linear-gradient(135deg, #7048e8, #5f3dc4);
                color: #fff;
                padding: 0.75rem 1.5rem;
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-wrap: wrap;
                gap: 1rem;
            }
            .cc-ribbon-title {
                font-size: 1.1rem;
                font-weight: 700;
                display: flex;
                align-items: center;
                gap: 0.5rem;
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
                accent-color: #fff;
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
                padding: 0.5rem 0.75rem;
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
                border-color: #7048e8;
                box-shadow: 0 0 0 3px rgba(112, 72, 232, 0.15);
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
                background: #7048e8;
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
                background: #5f3dc4;
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
                <button onclick="recarregarContato()" class="cc-toolbar-btn">
                    <i class="ph ph-arrows-counter-clockwise"></i> Recarregar
                </button>
                <button onclick="limparFormContato()" class="cc-toolbar-btn">
                    <i class="ph ph-plus"></i> Novo
                </button>
                <button onclick="salvarContato()" class="cc-toolbar-btn primary">
                    <i class="ph ph-check-square-offset"></i> Processar
                </button>
                <button onclick="excluirContato()" class="cc-toolbar-btn danger">
                    <i class="ph ph-trash"></i> Excluir
                </button>
            </div>

            <!-- Cabeçalho Roxo da Tela -->
            <div class="cc-ribbon">
                <div class="cc-ribbon-title">
                    <i class="ph ph-user-focus"></i> Cadastro de Contatos
                </div>
                <div class="cc-ribbon-checkboxes">
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
                    <label>
                        <input type="checkbox" id="con-inativo"> Inativo
                    </label>
                </div>
            </div>

            <!-- Formulário -->
            <div class="cc-form-body">
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
                                    <button onclick="abrirWhatsApp()" class="cc-btn-addon success" title="WhatsApp"><i class="ph ph-whatsapp-logo" style="font-size: 1.2rem;"></i></button>
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
                                    <button onclick="buscarCNPJ()" id="btn-busca-cnpj" class="cc-btn-addon" title="Buscar CNPJ no WebService"><i class="ph ph-magnifying-glass"></i></button>
                                </div>
                            </div>
                            <div class="cc-field">
                                <label>CEP</label>
                                <div class="cc-input-group">
                                    <input type="text" id="emp-cep" placeholder="00000-000" class="cc-input">
                                    <button onclick="buscarCEP()" class="cc-btn-addon" title="Buscar CEP"><i class="ph ph-magnifying-glass"></i></button>
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

window.buscarCNPJ = async function() {
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

window.buscarCEP = async function() {
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

window.abrirWhatsApp = function() {
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
                <input type="text" id="swal-busca-contato" oninput="filtrarContatosTabela()" placeholder="Digite para filtrar..." style="width:100%; padding:0.5rem; margin-bottom:1rem; border:1px solid #cbd5e1; border-radius:6px; font-size:0.875rem; box-sizing:border-box;">
                <div style="max-height:300px; overflow-y:auto;">
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
            `,
            showConfirmButton: false,
            showCancelButton: true,
            cancelButtonText: 'Fechar'
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

    const empresa_cliente = {
        id: _empresaSelecionadaId,
        codigo: _empresaSelecionadaCodigo,
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
