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

/* ── Inicialização ──────────────────────────────────────────────────── */
async function inicializarPropostas() {
    await carregarPropostas();
    renderTelaPropostas();
}

async function carregarPropostas() {
    try {
        const data = await apiGet('/api/propostas');
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
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; flex-wrap:wrap; gap:1rem;">
                <div>
                    <h2 style="margin:0; color:#1e293b; font-size:1.4rem; font-weight:700; display:flex; align-items:center; gap:0.5rem;">
                        <i class="ph ph-file-text" style="color:#7048e8;"></i> Propostas Comerciais
                    </h2>
                    <p style="margin:0.25rem 0 0; color:#64748b; font-size:0.88rem;">
                        Gerencie as propostas de locação da América Rental
                    </p>
                </div>
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
    `;
}

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
    const prop = id ? _propostasData.find(p => p.id === id) : null;
    const isNovo = !prop;
    const hoje = new Date().toISOString().split('T')[0];
    const titulo = isNovo ? '📄 Nova Proposta' : `✏️ Editar Proposta — ${prop.codigo}`;

    const container = document.getElementById('view-form-proposta');
    if (!container) return;

    const v = (campo) => prop ? (prop[campo] || '') : '';
    const vn = (campo, def='0') => prop ? (prop[campo] ?? def) : def;

    container.innerHTML = `
        <div style="background:#fff; width:100%; max-width:1100px; border-radius:14px; box-shadow:0 5px 20px rgba(0,0,0,0.05); overflow:hidden; margin:auto; border: 1px solid #e2e8f0;">

            <!-- Header -->
            <div style="background:linear-gradient(135deg,#4c1d95,#7048e8); padding:1.2rem 1.5rem; display:flex; justify-content:space-between; align-items:center;">
                <div style="display:flex; align-items:center; gap:0.75rem;">
                    <div style="width:40px;height:40px;background:rgba(255,255,255,0.15);border-radius:10px;display:flex;align-items:center;justify-content:center;">
                        <i class="ph ph-file-text" style="color:white;font-size:1.3rem;"></i>
                    </div>
                    <div>
                        <h3 style="margin:0;color:white;font-size:1.05rem;font-weight:700;">${titulo}</h3>
                        <p style="margin:0;color:rgba(255,255,255,0.7);font-size:0.78rem;">Proposta de Locação — América Rental</p>
                    </div>
                </div>
                <button onclick="fecharFormProposta()" style="background:rgba(255,255,255,0.15);border:none;color:white;width:34px;height:34px;border-radius:8px;cursor:pointer;font-size:1.2rem;display:flex;align-items:center;justify-content:center;">&times;</button>
            </div>

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

    // Abre a aba no sistema
    if (typeof window._openPropostaTab === 'function') {
        window._openPropostaTab(id, prop ? prop.codigo : null);
    }
}

window.fecharFormProposta = function() {
    const tabId = _propostasEditandoId ? 'form-proposta-' + _propostasEditandoId : 'form-proposta-nova';
    if (typeof window.closeAppTab === 'function') {
        window.closeAppTab(tabId);
    }
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
            resp = await apiPut(`/api/propostas/${_propostasEditandoId}`, payload);
        } else {
            resp = await apiPost('/api/propostas', payload);
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
        const resp = await apiDelete(`/api/propostas/${id}`);
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

console.log('[PROPOSTAS] Módulo frontend carregado.');
