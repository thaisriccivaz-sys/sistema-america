// ══════════════════════════════════════════════════════════════
//  RESUMO DE ROTA  –  Logística América Rental
// ══════════════════════════════════════════════════════════════

const RR_EQ = {
    'STD O':  { nome: 'STD OBRA',              icon: '💙' },
    'STD E':  { nome: 'STD EVENTO',            icon: '💜' },
    'LX O':   { nome: 'LX OBRA',               icon: '🟦' },
    'LX E':   { nome: 'LX EVENTO',             icon: '🟪' },
    'ELX O':  { nome: 'ELX OBRA',              icon: '🔵' },
    'ELX E':  { nome: 'ELX EVENTO',            icon: '🟣' },
    'SLX O':  { nome: 'ELX OBRA',              icon: '🔵' },
    'SLX E':  { nome: 'ELX EVENTO',            icon: '🟣' },
    'PCD O':  { nome: 'PCD OBRA',              icon: '♿' },
    'PCD E':  { nome: 'PCD EVENTO',            icon: '🧑🏾‍🦽' },
    'CHUVEIRO O':  { nome: 'CHUVEIRO OBRA',    icon: '🚿' },
    'CHUVEIRO E':  { nome: 'CHUVEIRO EVENTO',  icon: '🚿' },
    'HIDRAULICO O':{ nome: 'HIDRÁULICO OBRA',  icon: '🚽' },
    'HIDRAULICO E':{ nome: 'HIDRÁULICO EVENTO',icon: '🚽' },
    'MICTORIO O':  { nome: 'MICTÓRIO OBRA',    icon: '💦' },
    'MICTORIO E':  { nome: 'MICTÓRIO EVENTO',  icon: '💦' },
    'PIA II O':    { nome: 'PBII OBRA',         icon: '🧼' },
    'PIA II E':    { nome: 'PBII EVENTO',       icon: '🧼' },
    'PIA III O':   { nome: 'PBIII OBRA',        icon: '🧼' },
    'PIA III E':   { nome: 'PBIII EVENTO',      icon: '🧼' },
    'PBII O':    { nome: 'PBII OBRA',         icon: '🧼' },
    'PBII E':    { nome: 'PBII EVENTO',       icon: '🧼' },
    'PBIII O':   { nome: 'PBIII OBRA',        icon: '🧼' },
    'PBIII E':   { nome: 'PBIII EVENTO',      icon: '🧼' },
    'PB II O':    { nome: 'PBII OBRA',         icon: '🧼' },
    'PB II E':    { nome: 'PBII EVENTO',       icon: '🧼' },
    'PB III O':   { nome: 'PBIII OBRA',        icon: '🧼' },
    'PB III E':   { nome: 'PBIII EVENTO',      icon: '🧼' },
    'GUARITA INDIVIDUAL O': { nome: 'GUARITA INDIVIDUAL OBRA',  icon: '⬜' },
    'GUARITA INDIVIDUAL E': { nome: 'GUARITA INDIVIDUAL EVENTO',icon: '⬜' },
    'GUARITA DUPLA O': { nome: 'GUARITA DUPLA OBRA',   icon: '⚪' },
    'GUARITA DUPLA E': { nome: 'GUARITA DUPLA EVENTO', icon: '⚪' },
    'LIMPA FOSSA':    { nome: 'LIMPA FOSSA',    icon: '💧' },
    'VISITA TECNICA': { nome: 'VISITA TÉCNICA', icon: '⚙️' },
    'CARRINHO':       { nome: 'CARRINHO',        icon: '🛞' },
};

const RR_VAR_ICONS = {
    'LEVAR CARRINHO':          '🛒',
    'NOTURNO':                 '🌘',
    'INFORMACOES IMPORTANTES': '🚨',
    'INFORMAÇÕES IMPORTANTES': '🚨',
    '🚨':                      '🚨',
    'ATENCAO AO HORARIO':      '⏰',
    'ATENÇÃO AO HORÁRIO':      '⏰',
    '⏰':                      '⏰',
    'LEVAR EXTENSORA':         '🌀',
    '🌀':                      '🌀',
    'VAC':                     '🏗️',
    '🏗️':                      '🏗️',
    'CARRETINHA':              '🔗',
    '🔗':                      '🔗',
    'LEVAR EPI':               '🦺',
    '🦺':                      '🦺',
    'TROCA DE CABINE':         '♻️',
    '♻️':                      '♻️',
    'INTEGRACAO':              '👷',
    'INTEGRAÇÃO':              '👷',
    '👷':                      '👷',
    'APOIO DE SUCCAO':         '💧',
    '💧':                      '💧',
    'AVULSO':                  '❗',
    '❗':                      '❗',
};

function _rrObsIcon(t) {
    const up = (t || '').toUpperCase();
    for (const [k, ic] of Object.entries(RR_VAR_ICONS)) {
        if (up.includes(k)) return ic;
    }
    return '';
}

function _rrEquip(codigo) {
    const original = (codigo || '').trim().toUpperCase();
    const c = original.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    if (RR_EQ[c]) return RR_EQ[c];
    for (const [k, v] of Object.entries(RR_EQ)) {
        if (c.startsWith(k)) return v;
    }
    return { nome: original, icon: '' };
}

function _rrTipoServico(s) {
    const u = (s || '').toUpperCase();
    if (u.includes('ENTREGA'))   return 'ENTREGA';
    if (u.includes('RETIRADA'))  return 'RETIRADA';
    if (u.includes('MANUTENCAO AVULSA') || u.includes('MANUTENÇÃO AVULSA')) return 'AVULSA';
    if (u.includes('MANUTENCAO') || u.includes('MANUTENÇÃO')) return 'MANUTENCAO';
    if (u.includes('COMPRAS'))   return 'COMPRAS';
    return 'OUTROS';
}

function _rrParseProduto(p) {
    const m = (p || '').trim().match(/^(\d+)\s+(.+)/);
    if (m) return { qtd: parseInt(m[1]), codigo: m[2].trim() };
    return null;
}

function _rrParseNotas(notas) {
    // Formato real do SimpliRoute:
    // Linha 1: Observação livre (ex: "IR DE CARRETINHA")
    // Linha 2: Tipo de serviço (ex: "ENTREGA EVENTO" / "⭕ RETIRADA EVENTO TOTAL")
    // Linha 3: Produto com qtd (ex: "18 STD EVENTO")
    // Pode haver múltiplas linhas de produto

    // Normaliza quebras de linha (\r\r\n → \n)
    const normalizado = (notas || '')
        .replace(/\r\r\n/g, '\n')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n');

    const linhas = normalizado.split('\n').map(l => l.trim()).filter(Boolean);

    let servico  = '';
    let obs      = '';
    const prodParts = [];

    for (const linha of linhas) {
        const upLinha = linha.toUpperCase();

        // Linha de tipo de serviço
        if (upLinha.includes('ENTREGA')  || upLinha.includes('RETIRADA') ||
            upLinha.includes('MANUTENCAO') || upLinha.includes('MANUTENÇÃO') ||
            upLinha.includes('COMPRAS')  ||
            upLinha.includes('VISITA')   || upLinha.includes('LIMPA FOSSA') ||
            upLinha.includes('SUCCAO')   || upLinha.includes('SUCÇÃO')) {
            if (!servico) servico = linha;
            continue;
        }

        // Linha de produto: começa com número(s) seguido de espaço e texto
        // Ex: "18 STD EVENTO", "1 LX O", "22 STD EVENTO"
        if (/^\d+\s+\S/.test(linha)) {
            prodParts.push(linha);
            continue;
        }

        // Ignorar linha de dias da semana do Pipeline (ex: "2X - TER, SEX")
        if (/^\d+X\s*-/.test(upLinha)) {
            continue;
        }

        // Resto é observação livre
        if (!obs) obs = linha;
    }

    return {
        servico,
        produto:  prodParts[0] || '',
        produtos: prodParts,
        obs,
    };
}

function _rrAgruparProdutos(lista) {
    const ag = {};
    lista.forEach(os => {
        // Suporta array de produtos (novo) ou produto único (retrocompativel)
        const prods = (os.produtos && os.produtos.length > 0) ? os.produtos : [os.produto];
        prods.forEach(prodStr => {
            const prod = _rrParseProduto(prodStr);
            if (!prod) return;
            const eq = _rrEquip(prod.codigo);
            const nome = eq.nome || prod.codigo;
            if (!ag[nome]) ag[nome] = { qtd: 0, icon: eq.icon };
            ag[nome].qtd += prod.qtd;
        });
    });
    return ag;
}

function _rrTipoObraEvento(lista) {
    const s = lista.map(o => (o.servico || '').toUpperCase()).join(' ');
    if (s.includes('EVENTO')) return 'EVENTO';
    return 'OBRA';
}

function _rrMontarColB(v) {
    const lines = [];

    // 1. OBS + Ícone de informações importantes (sem duplicatas)
    const obsLinhasSet = new Set();
    const obsLinhas = [];
    v.os.forEach(os => {
        // Determina ícone: checa tanto obs quanto notas_raw (habilidades/variáveis)
        const textoParaIcone = [os.obs, os.notas_raw].filter(Boolean).join(' ');
        let icon = _rrObsIcon(textoParaIcone);

        // Se tem ícone de informações importantes, mostra o cliente MESMO SEM obs
        const temInfoImportante = textoParaIcone.toUpperCase().includes('INFORMA') && textoParaIcone.toUpperCase().includes('IMPORTANTE');
        if (!os.obs && !temInfoImportante) return;

        let nome = (os.cliente || '').trim();
        // Remove emojis do nome do cliente (inclui ⭕ U+2B55 explicitamente)
        nome = nome.replace(/^[\u{1F000}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2B00}-\u{2BFF}\uFE0F\s\u26BD\u23D5\u25C6\u267B\u267F\u26AA\u26AB\u26FC]+/gu, '').trim();
        nome = nome.replace(/^[\ud83c\udf00-\ud83e\uddff\u2600-\u27bf\u{1F000}-\u{1FFFF}\u2b00-\u2bff\uFE0F\s]+/gu, '').trim();

        let obsLimpa = (os.obs || '').replace(/^[\u{1F000}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\uFE0F\s\u{1F6D2}]+/gu, '').trim().toUpperCase();

        if (obsLimpa) {
            const linhaObs = `${icon ? icon + ' ' : ''}${nome}: ${obsLimpa}`;
            if (!obsLinhasSet.has(linhaObs)) { obsLinhasSet.add(linhaObs); obsLinhas.push(linhaObs); }
        } else if (temInfoImportante) {
            const linhaObs = `🚨 ${nome}`;
            if (!obsLinhasSet.has(linhaObs)) { obsLinhasSet.add(linhaObs); obsLinhas.push(linhaObs); }
        }
    });
    if (obsLinhas.length) { lines.push(...obsLinhas); lines.push(''); }

    // 2. ENTREGAS
    const entregas = v.os.filter(o => o.tipo === 'ENTREGA');
    if (entregas.length) {
        const ag = _rrAgruparProdutos(entregas);
        lines.push('ENTREGA:');
        for (const [nome, { qtd, icon }] of Object.entries(ag))
            lines.push(`   ${icon}${qtd} ${nome}`);
        lines.push('');
    }

    // 3. RETIRADAS
    const retiradas = v.os.filter(o => o.tipo === 'RETIRADA');
    if (retiradas.length) {
        const ag = _rrAgruparProdutos(retiradas);
        lines.push('⭕ RETIRADA:');
        for (const [nome, { qtd, icon }] of Object.entries(ag))
            lines.push(`   ${qtd} ${nome}`);
        lines.push('');
    }

    // 4. AVULSA
    const avulsas = v.os.filter(o => o.tipo === 'AVULSA');
    if (avulsas.length) {
        const ag = _rrAgruparProdutos(avulsas);
        lines.push('❗ MANUTENÇÃO AVULSA:');
        for (const [nome, { qtd, icon }] of Object.entries(ag))
            lines.push('   ' + qtd + ' × ' + nome);
        lines.push('');
    }

    // 5. MANUTENÇÕES
    const manut = v.os.filter(o => o.tipo === 'MANUTENCAO');
    if (manut.length) {
        const ag = _rrAgruparProdutos(manut);
        lines.push('MANUTENÇÃO:');
        for (const [nome, { qtd, icon }] of Object.entries(ag))
            lines.push(`   ${qtd} × ${nome}`);
        lines.push('');
    }

    // 6. OUTROS
    const outros = v.os.filter(o => o.tipo === 'OUTROS');
    if (outros.length) {
        outros.forEach(o => lines.push(o.servico.toUpperCase()));
        lines.push('');
    }

    // 7. COMPRAS
    const compras = v.os.filter(o => o.tipo === 'COMPRAS');
    if (compras.length) {
        lines.push('💳Compras América:');
        compras.forEach(o => {
            const cliente = (o.cliente || '').substring(0, 25).trim();
            if (cliente) lines.push(`   ${cliente}`);
        });
        lines.push('');
    }

    return lines.join('\n');
}

// ── Estado global ──────────────────────────────────────────────
let _rrVeiculos      = [];
let _rrCurrentId     = null;
let _rrHistoricoList = [];
let _rrSearchTerm = '';
let _rrDate = null;
let _rrColabDisponiveisObs = {};
let _rrPeriodoSelecionado = 'todos'; // todos, diurno, noturno
window._rrOriginalFileBase64 = null;
window._rrOriginalFileName   = null;
window._rrDefaultNomeResumo  = '';

window._rrChangePeriodo = function(val) {
    window._rrPeriodoSelecionado = val;
    window._rrRenderColabDisponiveis();
};
window._rrColabFotoMap = {};
window._rrColabNomes   = [];

// ── Token helper ───────────────────────────────────────────────
function _rrAuthHeaders() {
    const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
    return { 'Authorization': 'Bearer ' + token };
}

// ══════════════════════════════════════════════════════════════
//  RENDER DA TELA
// ══════════════════════════════════════════════════════════════
window.renderResumoRota = function() {
    const container = document.getElementById('resumo-rota-container');
    if (!container) return;
    container.innerHTML = `
    <div style="background:#2d9e5f;padding:20px 24px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
        <div style="display:flex;align-items:center;gap:14px;">
            <div style="background:rgba(255,255,255,0.15);border-radius:12px;padding:10px 14px;">
                <i class="ph ph-list-bullets" style="font-size:1.8rem;color:#fff;"></i>
            </div>
            <div>
                <h2 style="margin:0;color:#fff;font-size:1.4rem;font-weight:700;">Resumo de Rota</h2>
                <select id="rr-historico-select" onchange="window.rrCarregarHistorico(this.value)"
                    style="margin-top:4px;padding:4px 10px;border-radius:4px;border:none;outline:none;font-size:0.85rem;color:#1e293b;background:#fff;cursor:pointer;min-width:220px;">
                    <option value="">Carregando histórico...</option>
                </select>
            </div>
        </div>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
            <label style="background:#fff;color:#2d9e5f;border-radius:8px;padding:9px 18px;font-weight:700;font-size:0.9rem;cursor:pointer;display:flex;align-items:center;gap:7px;box-shadow:0 2px 8px rgba(0,0,0,0.15);">
                <i class="ph ph-upload-simple"></i> Importar Planilha
                <input type="file" accept=".xlsx" style="display:none;" onchange="window.rrImportarPlanilha(this)">
            </label>
            <button id="rr-btn-limpar-resumo" onclick="window.rrLimparResumo()"
                style="background:rgba(255,255,255,0.15);color:#fff;border:1px solid rgba(255,255,255,0.4);border-radius:8px;padding:9px 18px;font-weight:700;font-size:0.9rem;cursor:pointer;display:flex;align-items:center;gap:7px;" title="Limpa o resumo atual da tela">
                <i class="ph ph-eraser"></i> Limpar
            </button>
            <button id="rr-btn-salvar" onclick="window.rrSalvarResumo()"
                style="background:#2563eb;color:#fff;border:1px solid #1d4ed8;border-radius:8px;padding:9px 18px;font-weight:700;font-size:0.9rem;cursor:pointer;display:none;align-items:center;gap:7px;box-shadow:0 2px 8px rgba(37,99,235,0.4);">
                <i class="ph ph-floppy-disk"></i> Salvar
            </button>
            <button id="rr-btn-exportar" onclick="window.rrExportarExcel()"
                style="background:rgba(255,255,255,0.2);color:#fff;border:1px solid rgba(255,255,255,0.4);border-radius:8px;padding:9px 18px;font-weight:700;font-size:0.9rem;cursor:pointer;display:none;align-items:center;gap:7px;">
                <i class="ph ph-microsoft-excel-logo"></i> Exportar Resumo
            </button>
            <button id="rr-btn-baixar-original" onclick="window.rrBaixarOriginal()"
                style="background:rgba(255,255,255,0.2);color:#fff;border:1px solid rgba(255,255,255,0.4);border-radius:8px;padding:9px 18px;font-weight:700;font-size:0.9rem;cursor:pointer;display:none;align-items:center;gap:7px;">
                <i class="ph ph-file-xls"></i> Baixar Rota Original
            </button>
        </div>
    </div>
    <div id="rr-corpo" style="padding:20px;"></div>`;

    if (!document.getElementById('rr-colabs-list')) {
        const dl = document.createElement('datalist');
        dl.id = 'rr-colabs-list';
        document.body.appendChild(dl);
    }
    if (!window._rrColabNomes.length) {
        window._rrCarregarDicionarioColaboradores();
    } else {
        window._rrAtualizarDatalistColabs();
    }

    _rrRenderCorpo();
    window.rrListarHistorico();
};

// ══════════════════════════════════════════════════════════════
//  HISTÓRICO
// ══════════════════════════════════════════════════════════════
window.rrListarHistorico = async function() {
    const sel = document.getElementById('rr-historico-select');
    if (!sel) return;
    try {
        const res = await fetch('/api/logistica/resumo-rota', { headers: _rrAuthHeaders() });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        _rrHistoricoList = await res.json();

        if (!_rrHistoricoList.length) {
            sel.innerHTML = '<option value="">Nenhum resumo salvo ainda</option>';
            return;
        }
        sel.innerHTML = '<option value="">Selecione um resumo anterior...</option>';
        _rrHistoricoList.forEach(h => {
            const opt = document.createElement('option');
            opt.value = h.id;
            opt.textContent = h.nome + (h.usuario_nome ? ' (' + h.usuario_nome + ')' : '');
            sel.appendChild(opt);
        });
        if (_rrCurrentId) sel.value = _rrCurrentId;
    } catch (e) {
        console.error('[RR] Erro ao listar histórico:', e);
        sel.innerHTML = '<option value="">Erro ao carregar histórico</option>';
    }
};

window.rrCarregarHistorico = async function(id) {
    const btnExportar = document.getElementById('rr-btn-exportar');
    const btnOrig     = document.getElementById('rr-btn-baixar-original');

    if (!id) {
        _rrVeiculos  = [];
        _rrCurrentId = null;
        window._rrOriginalFileBase64 = null;
        window._rrOriginalFileName   = null;
        window._rrDataRotaAtual = null;
        _rrRenderCorpo();
        if (typeof window._rrCapturarSnapshot === "function") window._rrCapturarSnapshot();
        const btnSalvar = document.getElementById('rr-btn-salvar');
        if (btnSalvar) btnSalvar.style.display = 'none';
        if (btnExportar) btnExportar.style.display = 'none';
        if (btnOrig)     btnOrig.style.display = 'none';
        return;
    }

    try {
        const res = await fetch('/api/logistica/resumo-rota/' + id, { headers: _rrAuthHeaders() });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        if (!data || !data.dados) throw new Error('Sem dados');

        const dadosObj = JSON.parse(data.dados);
        if (Array.isArray(dadosObj)) {
            _rrVeiculos = dadosObj;
            window._rrOriginalFileBase64 = null;
            window._rrOriginalFileName   = null;
        } else {
            _rrVeiculos = dadosObj.veiculos || [];
            window._rrOriginalFileBase64 = dadosObj.originalFileBase64 || null;
            window._rrOriginalFileName   = dadosObj.originalFileName   || null;
        }

        // Limpa disponibilidade antiga (pode estar desatualizada se o resumo é de outro dia)
        _rrVeiculos.forEach(v => { v._dispMotorista = null; v._dispAjudante = null; });

        // Tenta extrair a data do nome (formato "DD-MM-YYYY ...") para re-consultar disponibilidade
        const nomeResumo = data.nome || '';
        const mData = nomeResumo.match(/(\d{2})-(\d{2})-(\d{4})/);
        const dataHistorico = mData ? `${mData[3]}-${mData[2]}-${mData[1]}` : null;
        window._rrDataRotaAtual = dataHistorico;

        _rrCurrentId = data.id;
        _rrRenderCorpo(); // renderiza sem disp (limpo)
        const btnSalvar = document.getElementById('rr-btn-salvar');
        if (btnSalvar) btnSalvar.style.display = 'flex';
        if (btnExportar) btnExportar.style.display = 'flex';
        if (btnOrig) btnOrig.style.display = window._rrOriginalFileBase64 ? 'flex' : 'none';

        // Re-consulta disponibilidade em background se tiver data detectada
        if (dataHistorico) {
            const nomesRota = new Set();
            _rrVeiculos.forEach(v => {
                if (v.motorista && v.motorista.trim()) nomesRota.add(v.motorista.trim());
                if (v.ajudante  && v.ajudante.trim())  nomesRota.add(v.ajudante.trim());
            });
            if (nomesRota.size > 0) {
                try {
                    const nomesParam = Array.from(nomesRota).join(',');
                    const resDisp = await fetch(
                        `/api/logistica/disponibilidade-rota?data=${dataHistorico}&nomes=${encodeURIComponent(nomesParam)}`,
                        { headers: _rrAuthHeaders() }
                    );
                    if (resDisp.ok) {
                        const dispMap = await resDisp.json();
                        _rrVeiculos.forEach(v => {
                            const motKey = (v.motorista || '').trim().toLowerCase();
                            const ajuKey = (v.ajudante  || '').trim().toLowerCase();
                            v._dispMotorista = dispMap[motKey] || null;
                            v._dispAjudante  = dispMap[ajuKey] || null;
                        });
                        _rrRenderCorpo(); // re-renderiza com disponibilidade atualizada
                    }
                } catch(e) {
                    console.warn('[RR] Não foi possível verificar disponibilidade no histórico:', e.message);
                }
            }
        }

        showToast('Resumo carregado!', 'success');
    } catch (e) {
        console.error('[RR] Erro ao carregar histórico:', e);
        showToast('Erro ao carregar resumo: ' + e.message, 'error');
    }
};



window.rrBaixarOriginal = function() {
    if (!window._rrOriginalFileBase64) {
        showToast('Planilha original não disponível neste resumo.', 'error');
        return;
    }
    const a = document.createElement('a');
    a.href     = window._rrOriginalFileBase64;
    a.download = window._rrOriginalFileName || 'SimpliRoute_Original.xlsx';
    document.body.appendChild(a);
    a.click();
    a.remove();
};

// ══════════════════════════════════════════════════════════════
//  IMPORTAR E PROCESSAR
// ══════════════════════════════════════════════════════════════
// Limpa o resumo atual sem recarregar a página
window.rrLimparResumo = function() {
    _rrVeiculos  = [];
    _rrCurrentId = null;
    window._rrOriginalFileBase64 = null;
    window._rrOriginalFileName   = null;
    _rrRenderCorpo();
    if (typeof window._rrCapturarSnapshot === "function") window._rrCapturarSnapshot();
    const btnSalvar = document.getElementById('rr-btn-salvar');
    const btnExp  = document.getElementById('rr-btn-exportar');
    const btnOrig = document.getElementById('rr-btn-baixar-original');
    if (btnSalvar) btnSalvar.style.display = 'none';
    if (btnExp)  btnExp.style.display  = 'none';
    if (btnOrig) btnOrig.style.display = 'none';
    const sel = document.getElementById('rr-historico-select');
    if (sel) sel.value = '';
    showToast('Resumo limpo.', 'success');
};

window.rrImportarPlanilha = async function(input) {
    const file = input.files[0];
    if (!file) return;

    // Limpa o resumo atual antes de carregar a nova planilha
    _rrVeiculos  = [];
    _rrCurrentId = null;
    window._rrOriginalFileBase64 = null;
    window._rrOriginalFileName   = null;
    _rrRenderCorpo(); // mostra estado vazio enquanto processa

    // Salvar Base64 do arquivo original para histórico
    const reader = new FileReader();
    reader.onload = e => {
        window._rrOriginalFileBase64 = e.target.result;
        window._rrOriginalFileName   = file.name;
    };
    reader.readAsDataURL(file);

    const buf = await file.arrayBuffer();
    let rows = [];
    try {
        const wb = new ExcelJS.Workbook();
        await wb.xlsx.load(buf);
        const ws = wb.worksheets[0];
        ws.eachRow((row, n) => { if (n > 1) rows.push(row.values); });
    } catch(e) {
        showToast('Erro ao ler planilha: ' + e.message, 'error');
        return;
    }
    if (!rows.length) { showToast('Planilha vazia.', 'error'); return; }

    const map = {};
    rows.forEach(r => {
        // ExcelJS row.values é 1-based
        // Col 7  = Veículo
        // Col 5  = Motorista
        // Col 6  = Co-pilotos (Ajudante)
        // Col 8  = Título (cliente / nome da OS)
        // Col 29 = Observações
        // Col 36 = Notas (tipo de serviço + produto)
        const veiculo   = (r[7]  || '').toString().trim();
        if (!veiculo) return;
        const motorista = (r[5]  || '').toString().replace(/^[\p{Emoji}\u{1F300}-\u{1FFFF}\u2600-\u26FF\u2700-\u27BF\s]+/u, '').trim();
        const ajudante  = (r[6]  || '').toString().replace(/^[\p{Emoji}\u{1F300}-\u{1FFFF}\u2600-\u26FF\u2700-\u27BF\s]+/u, '').trim();
        const cliente   = (r[8]  || '').toString().trim();
        const obsCol    = (r[29] || '').toString().trim();
        const notas     = (r[36] || '').toString().trim();

        if (!map[veiculo]) map[veiculo] = { veiculo, motorista, ajudante, os: [] };
        // Atualiza motorista se estiver vazio (primeiras linhas podem ter emoji diferente)
        if (!map[veiculo].motorista && motorista) map[veiculo].motorista = motorista;
        if (!map[veiculo].ajudante  && ajudante)  map[veiculo].ajudante  = ajudante;

        const p = _rrParseNotas(notas);
        if (!p.servico && !p.produtos.length && !p.obs) return; // linha sem info relevante
        map[veiculo].os.push({
            cliente,
            tipo:     _rrTipoServico(p.servico),
            servico:  p.servico,
            produto:  p.produto,
            produtos: p.produtos,
            obs:      obsCol || p.obs,
            notas_raw: notas, // guarda notas brutas para detectar habilidades (ex: INFORMAÇÕES IMPORTANTES)
        });
    });

    _rrVeiculos  = Object.values(map).sort((a, b) => (a.veiculo || '').localeCompare(b.veiculo || '', 'pt-BR', { sensitivity: 'base' }));
    _rrCurrentId = null;

    // --- DETECTAR DATA DA ROTA (col 4 = Coluna D, ou col 25 = "Data agendada") ---
    let _rrDataRota = null;
    for (const r of rows) {
        // Tenta Coluna D (r[4]) primeiro, depois Coluna Y (r[25])
        const dataCells = [r[4], r[25]];
        for (const dataCell of dataCells) {
            if (dataCell) {
                let dt = null;
                if (dataCell instanceof Date) {
                    dt = dataCell.toISOString().split('T')[0];
                } else {
                    const s = String(dataCell).trim();
                    // Pode vir com hora junto: 15/05/2026 08:00 ou 2026-05-15 08:00
                    const dataParte = s.split(' ')[0]; 
                    
                    const m = dataParte.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
                    if (m) dt = `${m[3]}-${m[2]}-${m[1]}`;
                    else if (/^\d{4}-\d{2}-\d{2}$/.test(dataParte)) dt = dataParte;
                }
                if (dt) { 
                    _rrDataRota = dt; 
                    break; 
                }
            }
        }
        if (_rrDataRota) break;
    }
    // Se não achou na planilha, usa data de hoje
    if (!_rrDataRota) {
        const hoje = new Date();
        _rrDataRota = hoje.toISOString().split('T')[0];
    }

    // --- CARREGAR FOTOS E CAPACIDADES EM PARALELO ---
    let frotaMap = {}; // placa_norm -> capacidade_carga
    let fotoMap  = {}; // nome_lower -> foto_base64
    try {
        const [resFrota, resColab] = await Promise.all([
            fetch('/api/frota/veiculos',      { headers: _rrAuthHeaders() }),
            fetch('/api/colaboradores/resumo', { headers: _rrAuthHeaders() }),
        ]);
        if (resFrota.ok) {
            const list = await resFrota.json();
            list.forEach(item => {
                const placaNorm = (item.placa || '').replace(/[-\s]/g, '').toUpperCase();
                frotaMap[placaNorm] = { carga: parseInt(item.capacidade_carga) || 0, temCadastro: item.capacidade_carga !== null && item.capacidade_carga !== '' };
            });
        }
        if (resColab.ok) {
            const list = await resColab.json();
            // Usa URL do endpoint de foto (suporta foto_base64 E foto_path)
            list.forEach(c => { fotoMap[(c.nome_completo || '').toLowerCase().trim()] = `/api/colaboradores/foto/${c.id}`; });
        }
    } catch(e) {
        console.error('[RR] Erro ao buscar dados para insights', e);
    }

    // Salvar foto e capacidade nos objetos de veículo
    _rrVeiculos.forEach(v => {
        // Fotos dos tripulantes
        v._fotoMotorista = fotoMap[(v.motorista || '').toLowerCase().trim()] || null;
        v._fotoAjudante  = fotoMap[(v.ajudante  || '').toLowerCase().trim()] || null;

        // Capacidade
        const placaNorm = (v.veiculo || '').split(' ')[0].replace(/[-\s]/g, '').toUpperCase();
        const info = frotaMap[placaNorm];
        v._maxCarga = info ? info.carga : null;
        v._temCadastroCarga = info ? info.temCadastro : false;
    });

    // --- INSIGHT 1: CAPACIDADE DE CARGA ---
    // Helper: soma todos os produtos de uma OS
    function _rrSomaProdutos(os) {
        const prods = (os.produtos && os.produtos.length > 0) ? os.produtos : [os.produto];
        let total = 0;
        prods.forEach(prodStr => { const p = _rrParseProduto(prodStr); if (p) total += p.qtd; });
        return total;
    }

    _rrVeiculos.forEach(v => {
        if (!v._temCadastroCarga) return; // Sem capacidade cadastrada no sistema, sem verificação

        let totalEntregas = 0;
        v.os.forEach(os => {
            // COMPRAS não ocupa capacidade e não gera tempo de serviço
            if (os.tipo === 'COMPRAS') return;
            if (os.tipo === 'ENTREGA') totalEntregas += _rrSomaProdutos(os);
        });

        let cargaAtual = totalEntregas;
        let sobrecarga = false;
        let erroAtingido = 0;

        if (cargaAtual > v._maxCarga) { sobrecarga = true; erroAtingido = cargaAtual; }

        v.os.forEach(os => {
            if (sobrecarga) return;
            const qtd = _rrSomaProdutos(os);
            if (!qtd) return;
            if (os.tipo === 'ENTREGA') {
                cargaAtual -= qtd;
            } else if (os.tipo === 'RETIRADA') {
                cargaAtual += qtd;
                if (cargaAtual > v._maxCarga) { sobrecarga = true; erroAtingido = cargaAtual; }
            }
        });

        if (sobrecarga) {
            v.alertaCarga = `Capacidade excedida! Este veículo suporta ${v._maxCarga} banheiros, mas a rota projeta ${erroAtingido} simultâneos. Verifique a rota.`;
        }
    });


    // Nome sugerido
    let isNoturno = false;
    _rrVeiculos.forEach(v => v.os.forEach(o => {
        if (o.obs && _rrObsIcon(o.obs) === '🌘') isNoturno = true;
    }));
    const dateStr = (_rrDataRota
        ? new Date(_rrDataRota + 'T12:00:00').toLocaleDateString('pt-BR')
        : new Date().toLocaleDateString('pt-BR')).replace(/\//g, '-');
    window._rrDefaultNomeResumo = dateStr + ' ' + (isNoturno ? 'NOTURNO' : 'PADRÃO');
    window._rrDataRotaAtual = _rrDataRota;

    // --- INSIGHT 2: DISPONIBILIDADE DE COLABORADORES ---
    // Coletar todos os nomes únicos de motoristas e ajudantes
    const nomesRota = new Set();
    _rrVeiculos.forEach(v => {
        if (v.motorista && v.motorista.trim()) nomesRota.add(v.motorista.trim());
        if (v.ajudante  && v.ajudante.trim())  nomesRota.add(v.ajudante.trim());
    });

    if (nomesRota.size > 0 && _rrDataRota) {
        const nomesParam = Array.from(nomesRota).join(',');
        try {
            const resDisp = await fetch(
                `/api/logistica/disponibilidade-rota?data=${_rrDataRota}&nomes=${encodeURIComponent(nomesParam)}`,
                { headers: _rrAuthHeaders() }
            );
            if (resDisp.ok) {
                const dispMap = await resDisp.json();
                // Armazenar disponibilidade em cada veículo
                _rrVeiculos.forEach(v => {
                    const motKey = (v.motorista || '').trim().toLowerCase();
                    const ajuKey = (v.ajudante  || '').trim().toLowerCase();
                    v._dispMotorista = dispMap[motKey] || null;
                    v._dispAjudante  = dispMap[ajuKey] || null;
                });
            }
        } catch(e) {
            console.warn('[RR] Não foi possível verificar disponibilidade:', e.message);
        }
    }

    _rrRenderCorpo();
    if (typeof window._rrCapturarSnapshot === "function") window._rrCapturarSnapshot();
    const btnSalvar = document.getElementById('rr-btn-salvar');
    if (btnSalvar) btnSalvar.style.display = 'flex';
    const btnExportar = document.getElementById('rr-btn-exportar');
    if (btnExportar) btnExportar.style.display = 'flex';
    const btnOrig = document.getElementById('rr-btn-baixar-original');
    if (btnOrig) btnOrig.style.display = 'none'; // só aparece após salvar

    showToast(`✅ ${_rrVeiculos.length} veículos carregados! Edite e clique em Exportar para salvar.`, 'success');
};

// ══════════════════════════════════════════════════════════════
//  RENDER PREVIEW
// ══════════════════════════════════════════════════════════════
function _rrRenderCorpo() {
    const corpo = document.getElementById('rr-corpo');
    if (!corpo) return;
    if (!_rrVeiculos.length) {
        corpo.innerHTML = `<div style="text-align:center;padding:60px;color:#94a3b8;">
            <i class="ph ph-list-bullets" style="font-size:3rem;"></i>
            <p>Importe uma planilha do SimpliRoute ou selecione um resumo no histórico acima.</p>
        </div>`;
        return;
    }

    // Mostrar data da rota detectada
    const dataRota = window._rrDataRotaAtual;
    const dataRotaLabel = dataRota
        ? `<div style="background:#e0f2fe;color:#0369a1;padding:8px 20px;font-size:0.83rem;font-weight:600;display:flex;align-items:center;gap:8px;border-bottom:1px solid #bae6fd;">
               <i class="ph ph-calendar-check"></i> Data da rota detectada: <b>${new Date(dataRota + 'T12:00:00').toLocaleDateString('pt-BR', {weekday:'long', year:'numeric', month:'long', day:'numeric'})}</b>
               — Verificando disponibilidade dos colaboradores para este dia
           </div>`
        : '';

    corpo.innerHTML = dataRotaLabel + _rrVeiculos.map((v, i) => {
        const colA   = `${v.veiculo} - Saída`;
        const colB   = v.colBEditado || _rrMontarColB(v);
        const total  = v.os.length;
        const nLines = (colB.match(/\n/g) || []).length + 2;
        const h      = Math.max(120, nLines * 20);
        
        // Helper de avatar (foto ou inicial) — cor diferente para motorista e ajudante
        const _avatarMot = (foto, nome) => foto
            ? `<img src="${foto}" title="${nome||''}" style="width:34px;height:34px;border-radius:50%;object-fit:cover;border:3px solid #1d4ed8;box-shadow:0 0 0 1px #93c5fd;">`
            : `<div style="width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;font-size:0.9rem;font-weight:700;color:#fff;border:3px solid #1d4ed8;">${(nome&&nome.trim()) ? nome.trim()[0].toUpperCase() : '+'}</div>`;
        const _avatarAju = (foto, nome) => foto
            ? `<img src="${foto}" title="${nome||''}" style="width:34px;height:34px;border-radius:50%;object-fit:cover;border:3px solid #d97706;box-shadow:0 0 0 1px #fcd34d;">`
            : `<div style="width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;font-size:0.9rem;font-weight:700;color:#fff;border:3px solid #d97706;">${(nome&&nome.trim()) ? nome.trim()[0].toUpperCase() : '+'}</div>`;

        // Helper de input editável inline (sempre visível, inclusive se vazio) com datalist
        const _inp = (campo, val, placeholder) =>
            `<input value="${(val||'').replace(/"/g,'&quot;')}" placeholder="${placeholder}" list="rr-colabs-list"
                style="font-size:0.78rem;color:#fff;background:rgba(0,0,0,0.12);border:none;border-bottom:1px dashed rgba(255,255,255,0.5);outline:none;width:150px;padding:2px 5px;border-radius:3px;"
                onfocus="this.style.background='rgba(0,0,0,0.25)'"
                onblur="this.style.background='rgba(0,0,0,0.12)'"
                onchange="window._rrAtualizarVeiculo(${i},'${campo}',this.value)"
                title="Editar ${placeholder}">`;

        const fotosMot = `<div style="display:flex;align-items:center;gap:6px;" title="Motorista">
            <span id="rr-avatar-mot-${i}">${_avatarMot(v._fotoMotorista, v.motorista)}</span>
            ${_inp('motorista', v.motorista, 'Motorista...')}</div>`;
        const fotosAju = `<div style="display:flex;align-items:center;gap:6px;" title="Ajudante">
            <span id="rr-avatar-aju-${i}">${_avatarAju(v._fotoAjudante, v.ajudante)}</span>
            ${_inp('ajudante', v.ajudante, 'Ajudante...')}</div>`;
        const fotosDiv = `<div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap;">${fotosMot}${fotosAju}</div>`;

        // Badge de capacidade
        let capacidadeBadge = '';
        if (v._temCadastroCarga) {
            // Mostra a capacidade cadastrada, inclusive se for 0 (não carrega nada)
            capacidadeBadge = `<span style="background:rgba(255,255,255,0.15);border-radius:6px;padding:3px 10px;font-size:0.8rem;color:#fff;"><i class="ph ph-truck"></i> Carga máx: ${v._maxCarga}</span>`;
        } else {
            capacidadeBadge = `<span style="background:rgba(255,165,0,0.3);border-radius:6px;padding:3px 10px;font-size:0.8rem;color:#ffe0a0;" title="Cadastre a capacidade na tela Frota"><i class="ph ph-warning"></i> Cap. não cadastrada</span>`;
        }

        const badgeAlerta = v.alertaCarga 
            ? `<div style="background:#fef2f2;color:#dc2626;padding:10px 18px;border-bottom:1px solid #fecaca;font-size:0.85rem;font-weight:700;display:flex;align-items:center;gap:8px;">
                 <i class="ph ph-warning" style="font-size:1.1rem;"></i> ${v.alertaCarga}
               </div>` 
            : '';

        // Badge de disponibilidade por colaborador
        const _dispInfo = (disp, nome) => {
            if (!disp || !nome || !nome.trim()) return null;
            const { status, motivo } = disp;
            if (status === 'disponivel') return null; // só alerta se indisponível

            // Colaborador desligado — banner diferenciado, mais urgente
            if (status === 'desligado') {
                return `<div style="background:#7f1d1d;color:#fca5a5;padding:10px 16px;border-bottom:2px solid #991b1b;font-size:0.83rem;font-weight:700;display:flex;align-items:center;gap:8px;">
                    <i class="ph ph-user-minus" style="font-size:1.1rem;color:#f87171;"></i>
                    <span><b style="color:#fff;">${nome}</b> — <span style="color:#fde047;letter-spacing:0.03em;">⚠️ COLABORADOR DESLIGADO</span> — Este colaborador não faz mais parte do quadro de funcionários</span>
                </div>`;
            }

            if (status === 'terapia') {
                return `<div style="background:#fdf2f8;color:#db2777;padding:8px 16px;border-bottom:1px solid #fbcfe8;font-size:0.82rem;font-weight:600;display:flex;align-items:center;gap:8px;">
                    <i class="ph ph-brain" style="font-size:1rem;"></i>
                    <span><b>${nome}</b> — Terapia${motivo && motivo !== 'Terapia' && motivo !== 'Terapia agendada para hoje' ? ': ' + motivo : ' agendada para o dia da rota'}</span>
                </div>`;
            }

            const label = {
                'ferias':   'Férias',
                'afastado': 'Afastado',
                'falta':    'Falta',
                'folga':    'Folga',
                'aso':      'ASO Agendado',
            }[status] || status;
            return `<div style="background:#fef2f2;color:#dc2626;padding:8px 16px;border-bottom:1px solid #fecaca;font-size:0.82rem;font-weight:600;display:flex;align-items:center;gap:8px;">
                <i class="ph ph-warning-circle" style="font-size:1rem;"></i>
                <span><b>${nome}</b> — ${label}${motivo && motivo !== label ? ': ' + motivo : ''}</span>
            </div>`;
        };


        const _motDisp = _dispInfo(v._dispMotorista, v.motorista);
        const _ajuDisp = _dispInfo(v._dispAjudante,  v.ajudante);
        const badgeDisp = [_motDisp, _ajuDisp].filter(Boolean).join('');

        // Badges de Aviso da Agenda Logística
        const _avisoInfo = (disp, nome) => {
            if (!disp || !nome || !nome.trim()) return null;
            const avisos = disp.avisos || [];
            if (!avisos.length) return null;
            return avisos.map(titulo => `<div style="background:#fef2f2;color:#dc2626;padding:8px 16px;border-bottom:1px solid #fecaca;font-size:0.82rem;font-weight:600;display:flex;align-items:center;gap:8px;">
                <i class="ph ph-warning-circle" style="font-size:1rem;"></i>
                <span><b>${nome}</b> — Aviso: ${titulo}</span>
            </div>`).join('');
        };
        const _motAviso = _avisoInfo(v._dispMotorista, v.motorista);
        const _ajuAviso = _avisoInfo(v._dispAjudante,  v.ajudante);
        const badgeAviso = [_motAviso, _ajuAviso].filter(Boolean).join('');

        return `
        <div style="background:#fff;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,0.07);margin-bottom:16px;overflow:hidden;border:1px solid #e2e8f0;">
            <div style="background:#2d9e5f;padding:12px 18px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
                <div style="display:flex;flex-direction:column;gap:8px;">
                    <div style="display:flex;align-items:center;gap:8px;">
                        <i class="ph ph-truck" style="color:rgba(255,255,255,0.7);font-size:0.9rem;"></i>
                        <input value="${v.veiculo.replace(/"/g,'&quot;')}"
                            style="color:#fff;font-weight:700;font-size:1rem;background:transparent;border:none;border-bottom:1px dashed rgba(255,255,255,0.4);outline:none;min-width:120px;max-width:240px;"
                            onfocus="this.style.borderBottomColor='rgba(255,255,255,0.9)'"
                            onblur="this.style.borderBottomColor='rgba(255,255,255,0.4)'"
                            onchange="window._rrAtualizarVeiculo(${i},'veiculo',this.value)"
                            title="Editar placa / veículo">
                        <span style="color:rgba(255,255,255,0.6);font-size:0.9rem;">- Saída</span>
                    </div>
                    ${fotosDiv}
                </div>
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                    ${capacidadeBadge}
                    <div style="background:rgba(255,255,255,0.2);border-radius:6px;padding:4px 12px;color:#fff;font-size:0.85rem;">${total} OS</div>
                </div>
            </div>
            ${badgeAlerta}
            ${badgeDisp}
            ${badgeAviso}
            <div style="display:flex;gap:0;border-top:1px solid #e2e8f0;">
                <div style="flex:1 1 40%;padding:14px 18px;background:#f8fafc;border-right:1px solid #e2e8f0;">
                    <div style="font-size:0.7rem;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;">Resumo da Rota</div>
                    <textarea class="rr-textarea-edit" data-index="${i}" spellcheck="false"
                        style="width:100%;height:${h}px;border:1px solid #cbd5e1;border-radius:6px;padding:12px;font-size:0.85rem;color:#1e293b;line-height:1.7;font-family:monospace;resize:vertical;outline:none;box-sizing:border-box;"
                        onfocus="this.style.borderColor='#2d9e5f';this.style.boxShadow='0 0 0 3px rgba(45,158,95,0.1)'"
                        onblur="this.style.borderColor='#cbd5e1';this.style.boxShadow='none'"
                    >${colB}</textarea>
                </div>
                <div style="flex:0 0 30%;max-width:30%;padding:14px 14px;background:#fff;border-right:1px solid #e2e8f0;">
                    <div style="font-size:0.7rem;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;">Observações do Roteirizador <span style="color:#dc2626;">*</span></div>
                    <textarea class="rr-textarea-obs" data-index="${i}" spellcheck="false"
                        placeholder="Digite as observações do roteirizador (obrigatório)..."
                        style="width:100%;height:${h}px;border:1px solid #cbd5e1;border-radius:6px;padding:12px;font-size:0.85rem;color:#1e293b;line-height:1.7;font-family:sans-serif;resize:vertical;outline:none;box-sizing:border-box;background:#fefce8;"
                        onfocus="this.style.borderColor='#ca8a04';this.style.boxShadow='0 0 0 3px rgba(202,138,4,0.1)'"
                        onblur="this.style.borderColor='#cbd5e1';this.style.boxShadow='none'; window._rrAtualizarVeiculo(${i}, 'obsRoteirizador', this.value);"
                        required
                    >${v.obsRoteirizador || ''}</textarea>
                </div>
                <div style="flex:0 0 30%;max-width:30%;padding:14px 14px;background:#fff;">
                    <div style="font-size:0.7rem;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;">Observações de Alterações</div>
                    <textarea class="rr-textarea-alt" data-index="${i}" spellcheck="false"
                        placeholder="Observações de alterações (opcional)..."
                        style="width:100%;height:${h}px;border:1px solid #cbd5e1;border-radius:6px;padding:12px;font-size:0.85rem;color:#1e293b;line-height:1.7;font-family:sans-serif;resize:vertical;outline:none;box-sizing:border-box;background:#f8fafc;"
                        onfocus="this.style.borderColor='#3b82f6';this.style.boxShadow='0 0 0 3px rgba(59,130,246,0.1)'"
                        onblur="this.style.borderColor='#cbd5e1';this.style.boxShadow='none'; window._rrAtualizarVeiculo(${i}, 'obsAlteracoes', this.value);"
                    >${v.obsAlteracoes || ''}</textarea>
                </div>
            </div>
        </div>
        `;
    }).join('');

    // Append painel de colaboradores disponíveis
    _rrRenderColabDisponiveis();
}

// ══════════════════════════════════════════════════════════════
//  PAINEL: COLABORADORES DISPONÍVEIS NO DIA
// ══════════════════════════════════════════════════════════════
window._rrColabDisponiveisObs = window._rrColabDisponiveisObs || {}; // id -> { obs, obsAlt }

async function _rrRenderColabDisponiveis() {
    const corpo = document.getElementById('rr-corpo');
    if (!corpo) return;

    // Insere container placeholder se não existir
    let painel = document.getElementById('rr-colab-disp-painel');
    if (!painel) {
        painel = document.createElement('div');
        painel.id = 'rr-colab-disp-painel';
        corpo.appendChild(painel);
    }
    painel.innerHTML = `<div style="display:flex;align-items:center;gap:10px;padding:16px 0 8px;"
        ><i class="ph ph-users" style="font-size:1.4rem;color:#2d9e5f;"></i
        ><span style="font-size:1rem;font-weight:700;color:#1e293b;">Colaboradores Disponíveis para Trabalho hoje</span
        ><span id="rr-colab-disp-loading" style="font-size:0.8rem;color:#94a3b8;margin-left:6px;">carregando...</span></div>`;

    // Dados da rota para cruzar nomes na rota
    const dataRota = window._rrDataRotaAtual || new Date().toISOString().split('T')[0];
    const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token') || '';
    const headers = { 'Authorization': 'Bearer ' + token };

    let colabs = [];
    try {
        const res = await fetch(`/api/equipes/colaboradores-disponiveis?data=${dataRota}`, { headers });
        if (res.ok) colabs = await res.json();
    } catch(e) {
        console.error('[RR] Erro ao carregar colaboradores disponíveis:', e);
    }

    // Função para checar se está de folga no dia
    function _rrIsFolga(c, dataStr) {
        const hoje = new Date(dataStr + 'T00:00:00');
        const ds = hoje.getDay();
        const escalaTipo = (c.escala_tipo || '').trim();
        if (!escalaTipo || escalaTipo === 'null') return ds === 0 || ds === 6;
        if (escalaTipo === 'padrao_seis_dias' || escalaTipo === 'padrao_sab_4h') return ds === 0;
        if (escalaTipo === 'padrao_sab_alternado') {
            if (ds === 0) return true;
            if (ds === 6) {
                if (!c.escala_ciclo_inicio) return false;
                const MS_SEMANA = 7 * 24 * 60 * 60 * 1000;
                const refSab = new Date(c.escala_ciclo_inicio + 'T00:00:00');
                while (refSab.getDay() !== 6) refSab.setDate(refSab.getDate() + 1);
                const semanas = Math.round((hoje - refSab) / MS_SEMANA);
                return ((semanas % 2) + 2) % 2 !== 0;
            }
            return false;
        }
        if (escalaTipo === 'escala_duas_folgas') {
            let folgas = [];
            try { folgas = JSON.parse(c.escala_folgas || '[]'); } catch(e) {}
            const DIAS_NOME = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
            const diasFolgaFixos = folgas.map(f => DIAS_NOME.indexOf(f)).filter(n => n >= 0);
            if (diasFolgaFixos.includes(ds)) return true;
            if (ds === 0) {
                if (!c.escala_ciclo_inicio) return false;
                const MS_SEMANA = 7 * 24 * 60 * 60 * 1000;
                const refDom = new Date(c.escala_ciclo_inicio + 'T00:00:00');
                while (refDom.getDay() !== 0) refDom.setDate(refDom.getDate() + 1);
                const semanas = Math.round((hoje - refDom) / MS_SEMANA);
                return ((semanas % 3) + 3) % 3 === 2;
            }
            return false;
        }
        if (escalaTipo === 'escala_12x36') {
            if (!c.escala_ciclo_inicio) return false;
            const MS_DIA = 24 * 60 * 60 * 1000;
            const ref = new Date(c.escala_ciclo_inicio + 'T00:00:00');
            const diasDif = Math.round((hoje - ref) / MS_DIA);
            return Math.abs(diasDif) % 2 !== 0;
        }
        if (escalaTipo === 'padrao_seg_sexta') return ds === 0 || ds === 6;
        return ds === 0 || ds === 6;
    }

    function _rrIsFeriasAfastado(c, dataStr) {
        const st = (c.colab_status || '').toLowerCase();
        if (st.includes('afastado')) return 'afastado';
        if (c.ferias_programadas_inicio && c.ferias_programadas_fim) {
            const parse = d => { if (!d) return null; if (d.includes('/')) { const p = d.split('/'); return new Date(`${p[2]}-${p[1]}-${p[0]}T00:00:00`); } return new Date(d + 'T00:00:00'); };
            const ini = parse(c.ferias_programadas_inicio), fim = parse(c.ferias_programadas_fim);
            const ref = new Date(dataStr + 'T00:00:00');
            if (ini && fim && ref >= ini && ref <= fim) return 'ferias';
        }
        return null;
    }

    // Nomes que estão na rota
    const nomesNaRota = new Set();
    (_rrVeiculos || []).forEach(v => {
        if (v.motorista && v.motorista.trim()) nomesNaRota.add(v.motorista.trim().toLowerCase());
        if (v.ajudante && v.ajudante.trim()) nomesNaRota.add(v.ajudante.trim().toLowerCase());
    });

    // Filtrar: remover folga, férias, afastados e intermitentes
    let disponiveis = colabs.filter(c => {
        if ((c.tipo_contrato || '').toLowerCase().includes('intermitente')) return false;
        const indisponivel = _rrIsFeriasAfastado(c, dataRota);
        if (indisponivel) return false;
        if (_rrIsFolga(c, dataRota)) return false;
        return true;
    });

    // Filtro por Período
    if (window._rrPeriodoSelecionado && window._rrPeriodoSelecionado !== 'todos') {
        disponiveis = disponiveis.filter(c => {
            let isNoturno = false;
            const eqNome = (c.equipe_nome || '').toLowerCase();
            if (eqNome.includes('noturn')) {
                isNoturno = true;
            } else if (eqNome.includes('lider') || eqNome.includes('líder')) {
                // Checa lideranca
                const entrada = c.horario_entrada || '';
                if (entrada >= '17:00' || entrada >= '18:00' || entrada >= '19:00' || entrada >= '20:00') {
                    isNoturno = true;
                }
                const nomeLower = (c.nome_completo || '').toLowerCase();
                if (nomeLower.includes('vitor leandro')) {
                    isNoturno = true; // explicitly noturno according to user
                } else if (nomeLower.includes('vivian') || nomeLower.includes('eduardo') || nomeLower.includes('joaquim')) {
                    isNoturno = false;
                }
            }
            if (window._rrPeriodoSelecionado === 'noturno') {
                return isNoturno;
            } else if (window._rrPeriodoSelecionado === 'diurno') {
                return !isNoturno;
            }
            return true;
        });
    }

    // Separar em rota vs sem atribuição
    const naRota = disponiveis.filter(c => nomesNaRota.has((c.nome_completo || '').toLowerCase().trim()));
    const semAtribuicao = disponiveis.filter(c => !nomesNaRota.has((c.nome_completo || '').toLowerCase().trim()));

    const fotoUrl = c => c.foto_path ? `/api/colaboradores/foto/${c.id}` : null;
    const avatarHtml = c => {
        const f = fotoUrl(c);
        const iniciais = (c.nome_completo || '?').split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase();
        const bg = ['#6366f1','#8b5cf6','#ec4899','#14b8a6','#f97316','#84cc16'][c.id % 6];
        return f
            ? `<img src="${f}" alt="${c.nome_completo}" style="width:52px;height:52px;border-radius:50%;object-fit:cover;border:2px solid #e2e8f0;" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"><div style="width:52px;height:52px;border-radius:50%;background:${bg};display:none;align-items:center;justify-content:center;font-size:1.1rem;font-weight:700;color:#fff;flex-shrink:0;">${iniciais}</div>`
            : `<div style="width:52px;height:52px;border-radius:50%;background:${bg};display:flex;align-items:center;justify-content:center;font-size:1.1rem;font-weight:700;color:#fff;flex-shrink:0;">${iniciais}</div>`;
    };

    const cardRota = c => {
        const cargo = (c.cargo || c.funcao || '').replace(/Motorista/i,'Mot.').replace(/Ajudante/i,'Aj.');
        return `<div style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:10px 8px;background:#f0fdf4;border-radius:10px;border:1.5px solid #bbf7d0;min-width:90px;max-width:110px;text-align:center;">
            <div style="display:flex;justify-content:center;">${avatarHtml(c)}</div>
            <div style="font-size:0.72rem;font-weight:700;color:#15803d;line-height:1.2;">${(c.nome_completo||'').split(' ').slice(0,2).join(' ')}</div>
            ${cargo ? `<div style="font-size:0.65rem;color:#6b7280;background:#d1fae5;padding:2px 6px;border-radius:4px;">${cargo}</div>` : ''}
            <div style="font-size:0.62rem;color:#22c55e;font-weight:600;"><i class="ph ph-check-circle"></i> Na Rota</div>
        </div>`;
    };

    const cardSemAtribuicao = c => {
        const savedObs = (window._rrColabDisponiveisObs[c.id] || {});
        const cargo = (c.cargo || '').replace(/Motorista/i,'Mot.').replace(/Ajudante/i,'Aj.');
        return `<div style="display:flex;flex-direction:column;gap:8px;padding:12px;background:#fff;border-radius:10px;border:1.5px solid #e2e8f0;min-width:200px;max-width:240px;">
            <div style="display:flex;align-items:center;gap:10px;">
                <div style="flex-shrink:0;display:flex;">${avatarHtml(c)}</div>
                <div>
                    <div style="font-size:0.8rem;font-weight:700;color:#1e293b;line-height:1.3;">${c.nome_completo||''}</div>
                    ${cargo ? `<div style="font-size:0.68rem;color:#6b7280;margin-top:2px;">${cargo}</div>` : ''}
                    <div style="font-size:0.65rem;color:#f59e0b;font-weight:600;margin-top:2px;"><i class="ph ph-warning"></i> Sem atribuição</div>
                </div>
            </div>
            <div>
                <div style="font-size:0.65rem;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:3px;">Obs. Roteirizador</div>
                <textarea rows="2" data-colab-id="${c.id}" data-colab-field="obs"
                    placeholder="Observação para este colaborador..."
                    style="width:100%;border:1px solid #e2e8f0;border-radius:6px;padding:6px 8px;font-size:0.75rem;color:#1e293b;resize:vertical;outline:none;box-sizing:border-box;background:#fefce8;"
                    onfocus="this.style.borderColor='#ca8a04'"
                    onblur="this.style.borderColor='#e2e8f0'; window._rrSalvarColabObs(${c.id},'obs',this.value)"
                >${savedObs.obs || ''}</textarea>
            </div>
            <div>
                <div style="font-size:0.65rem;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:3px;">Obs. Alterações</div>
                <textarea rows="2" data-colab-id="${c.id}" data-colab-field="obsAlt"
                    placeholder="Obs. de alterações..."
                    style="width:100%;border:1px solid #e2e8f0;border-radius:6px;padding:6px 8px;font-size:0.75rem;color:#1e293b;resize:vertical;outline:none;box-sizing:border-box;background:#f8fafc;"
                    onfocus="this.style.borderColor='#3b82f6'"
                    onblur="this.style.borderColor='#e2e8f0'; window._rrSalvarColabObs(${c.id},'obsAlt',this.value)"
                >${savedObs.obsAlt || ''}</textarea>
            </div>
        </div>`;
    };

    const dataLabel = new Date(dataRota + 'T12:00:00').toLocaleDateString('pt-BR', {weekday:'long', day:'numeric', month:'long'});
    const totalDisp = disponiveis.length;
    const totalFora = semAtribuicao.length;

    painel.innerHTML = `
    <div style="margin-top:24px;border-radius:14px;overflow:hidden;border:1.5px solid #e2e8f0;background:#fff;">
        <div style="background:linear-gradient(135deg,#2d9e5f 0%,#1a7a48 100%);padding:14px 20px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
            <div style="display:flex;align-items:center;gap:12px;">
                <i class="ph ph-users" style="font-size:1.5rem;color:rgba(255,255,255,0.9);"></i>
                <div>
                    <div style="color:#fff;font-weight:800;font-size:1rem;">Colaboradores Disponíveis para Trabalho</div>
                    <div style="color:rgba(255,255,255,0.75);font-size:0.78rem;margin-top:2px;"><i class="ph ph-calendar"></i> ${dataLabel}</div>
                </div>
            </div>
            <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
                <div style="color:rgba(255,255,255,0.95);font-size:0.8rem;font-weight:600;display:flex;gap:16px;margin-right:12px;">
                    <label style="cursor:pointer;display:flex;align-items:center;gap:4px;" title="Mostrar todos">
                        <input type="radio" name="rr_periodo" value="todos" ${window._rrPeriodoSelecionado==='todos'?'checked':''} onchange="window._rrChangePeriodo(this.value)"> Todos
                    </label>
                    <label style="cursor:pointer;display:flex;align-items:center;gap:4px;" title="Diurnos">
                        <input type="radio" name="rr_periodo" value="diurno" ${window._rrPeriodoSelecionado==='diurno'?'checked':''} onchange="window._rrChangePeriodo(this.value)"> Diurno
                    </label>
                    <label style="cursor:pointer;display:flex;align-items:center;gap:4px;" title="Noturnos">
                        <input type="radio" name="rr_periodo" value="noturno" ${window._rrPeriodoSelecionado==='noturno'?'checked':''} onchange="window._rrChangePeriodo(this.value)"> Noturno
                    </label>
                </div>
                <div style="background:rgba(255,255,255,0.15);border-radius:8px;padding:6px 14px;text-align:center;">
                    <div style="color:#fff;font-size:1.2rem;font-weight:800;">${totalDisp}</div>
                    <div style="color:rgba(255,255,255,0.75);font-size:0.7rem;">disponíveis</div>
                </div>
                <div style="background:rgba(255,255,255,0.15);border-radius:8px;padding:6px 14px;text-align:center;">
                    <div style="color:#fff;font-size:1.2rem;font-weight:800;">${naRota.length}</div>
                    <div style="color:rgba(255,255,255,0.75);font-size:0.7rem;">na rota</div>
                </div>
                <div style="background:rgba(255,165,0,0.3);border-radius:8px;padding:6px 14px;text-align:center;">
                    <div style="color:#fde047;font-size:1.2rem;font-weight:800;">${totalFora}</div>
                    <div style="color:rgba(255,255,255,0.75);font-size:0.7rem;">sem atribuição</div>
                </div>
            </div>
        </div>

        ${semAtribuicao.length ? `
        <div style="padding:16px 20px;">
            <div style="font-size:0.7rem;font-weight:700;color:#d97706;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:12px;display:flex;align-items:center;gap:6px;">
                <i class="ph ph-warning-circle"></i> Sem Atribuição — Aguardam Designação (${semAtribuicao.length})
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:12px;">${semAtribuicao.map(cardSemAtribuicao).join('')}</div>
        </div>` : `
        <div style="padding:20px;text-align:center;color:#22c55e;font-size:0.9rem;">
            <i class="ph ph-check-circle" style="font-size:1.5rem;"></i>
            <p>Todos os colaboradores disponíveis hoje estão com atribuição na rota! 🎉</p>
        </div>`}
    </div>`;
}

window._rrSalvarColabObs = function(colabId, field, value) {
    if (!window._rrColabDisponiveisObs[colabId]) window._rrColabDisponiveisObs[colabId] = {};
    window._rrColabDisponiveisObs[colabId][field] = value;
};

window._rrAtualizarVeiculo = function(idx, campo, valor) {
    if (!_rrVeiculos[idx]) return;
    _rrVeiculos[idx][campo] = valor;

    if (campo === 'motorista' || campo === 'ajudante') {
        const fotoKey = campo === 'motorista' ? '_fotoMotorista' : '_fotoAjudante';
        const ringColor = campo === 'motorista' ? '#1d4ed8' : '#d97706';
        const ringGlow  = campo === 'motorista' ? '#93c5fd' : '#fcd34d';
        const spanId  = campo === 'motorista' ? `rr-avatar-mot-${idx}` : `rr-avatar-aju-${idx}`;
        const nomeLower = (valor || '').trim().toLowerCase();
        
        // Atualiza a foto se houver correspondência exata no datalist
        if (window._rrColabFotoMap && window._rrColabFotoMap[nomeLower]) {
            _rrVeiculos[idx][fotoKey] = window._rrColabFotoMap[nomeLower];
        } else {
            _rrVeiculos[idx][fotoKey] = null; // Remove foto se apagou ou não achou
        }

        // Atualiza o DOM do avatar diretamente (preserva foco/tab)
        const spanEl = document.getElementById(spanId);
        if (spanEl) {
            const f = _rrVeiculos[idx][fotoKey];
            const n = valor;
            spanEl.innerHTML = f 
                ? `<img src="${f}" title="${n||''}" style="width:34px;height:34px;border-radius:50%;object-fit:cover;border:2px solid rgba(255,255,255,0.6);">`
                : `<div style="width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;font-size:0.9rem;font-weight:700;color:#fff;border:1px dashed rgba(255,255,255,0.5);">${(n&&n.trim()) ? n.trim()[0].toUpperCase() : '+'}</div>`;
        }

        // Sincroniza no textarea de colB
        const ta = document.querySelector(`.rr-textarea-edit[data-index="${idx}"]`);
        if (ta) {
            const label  = campo === 'motorista' ? 'Motorista' : 'Ajudante';
            const regex  = new RegExp(`^${label}: .+$`, 'm');
            let txt = ta.value;
            if (regex.test(txt)) {
                txt = valor
                    ? txt.replace(regex, `${label}: ${valor}`)
                    : txt.replace(regex, '').replace(/\n{3,}/g, '\n\n');
            } else if (valor) {
                txt = txt.trimEnd() + `\n${label}: ${valor}`;
            }
            ta.value = txt;
            _rrVeiculos[idx].colBEditado = txt;
        }
    }
};

window._rrCarregarDicionarioColaboradores = async function() {
    try {
        const res = await fetch('/api/colaboradores/resumo', { headers: _rrAuthHeaders() });
        if (!res.ok) return;
        const list = await res.json();
        window._rrColabNomes = [];
        window._rrColabFotoMap = {};
        list.forEach(c => {
            const nome = (c.nome_completo || '').trim();
            if (nome) {
                window._rrColabNomes.push(nome);
                window._rrColabFotoMap[nome.toLowerCase()] = `/api/colaboradores/foto/${c.id}`;
            }
        });
        window._rrAtualizarDatalistColabs();
    } catch(e) {
        console.error('[RR] Erro ao carregar dicionário de colaboradores globais', e);
    }
};

window._rrAtualizarDatalistColabs = function() {
    const dl = document.getElementById('rr-colabs-list');
    if (!dl) return;
    dl.innerHTML = '';
    window._rrColabNomes.forEach(nome => {
        const opt = document.createElement('option');
        opt.value = nome;
        dl.appendChild(opt);
    });
};

// ══════════════════════════════════════════════════════════════
//  EXPORTAR EXCEL E SALVAR NO HISTÓRICO
// ══════════════════════════════════════════════════════════════
window.rrExportarExcel = async function() {
    if (!_rrVeiculos.length) {
        showToast('Importe uma planilha primeiro.', 'error');
        return;
    }

    // Captura edições manuais e valida campos obrigatórios
    let faltouObs = false;
    _rrVeiculos.forEach((v, i) => {
        const ta = document.querySelector(`.rr-textarea-edit[data-index="${i}"]`);
        if (ta) v.colBEditado = ta.value;
        const to = document.querySelector(`.rr-textarea-obs[data-index="${i}"]`);
        if (to) {
            v.obsRoteirizador = to.value;
            if (!v.obsRoteirizador || !v.obsRoteirizador.trim()) {
                faltouObs = true;
                to.style.borderColor = '#dc2626';
            } else {
                to.style.borderColor = '#cbd5e1';
            }
        }
        const taAlt = document.querySelector(`.rr-textarea-alt[data-index="${i}"]`);
        if (taAlt) v.obsAlteracoes = taAlt.value;
    });

    if (faltouObs) {
        showToast('Preencha as Observações do Roteirizador para todas as saídas!', 'error');
        return;
    }

    // ── Se já veio do histórico, apenas baixa sem pedir nome ou salvar ──
    if (_rrCurrentId) {
        await _rrGerarExcel();
        return;
    }

    // ── Novo importe: verifica nome duplicado ─────────────────────────
    const nomeDefault = window._rrDefaultNomeResumo || 'Resumo de Rota';
    const nomeExistente = _rrHistoricoList.find(h => h.nome === nomeDefault);

    let nomeFinal;
    if (nomeExistente) {
        const { value, isConfirmed } = await Swal.fire({
            title: 'Nome já utilizado',
            html: `Já existe um resumo salvo com o nome <b>"${nomeDefault}"</b>.<br>Deseja salvar com um nome diferente?`,
            input: 'text',
            inputValue: nomeDefault + ' (2)',
            showCancelButton: true,
            confirmButtonText: 'Salvar com novo nome',
            cancelButtonText: 'Só baixar (sem salvar)',
            confirmButtonColor: '#2d9e5f',
        });
        if (!isConfirmed) { await _rrGerarExcel(); return; }
        nomeFinal = value || nomeDefault + ' (2)';
    } else {
        const { value, isConfirmed } = await Swal.fire({
            title: 'Salvar Resumo de Rota',
            input: 'text',
            inputLabel: 'Nome do resumo',
            inputValue: nomeDefault,
            showCancelButton: true,
            confirmButtonText: 'Exportar & Salvar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#2d9e5f',
        });
        if (!isConfirmed) return;
        nomeFinal = value || nomeDefault;
    }

    // Salvar no banco
    try {
        const payload = {
            nome: nomeFinal,
            dados: {
                veiculos: _rrVeiculos,
                originalFileBase64: window._rrOriginalFileBase64 || null,
                originalFileName:   window._rrOriginalFileName   || null,
            }
        };
        const res = await fetch('/api/logistica/resumo-rota', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ..._rrAuthHeaders() },
            body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success) {
            _rrCurrentId = data.id;
            window.rrListarHistorico();
            showToast('Resumo salvo no histórico com sucesso!', 'success');
        } else {
            showToast('Erro ao salvar resumo.', 'error');
        }
    } catch (e) {
        console.error(e);
        showToast('Erro de conexão ao salvar resumo.', 'error');
    }

    await _rrGerarExcel();
};

window.rrSalvarResumo = async function() {
    // Captura snapshot antes de ler os textareas (para detectar mudanças)
    if (!_rrVeiculos.length) {
        showToast('Importe uma planilha primeiro.', 'error');
        return;
    }

    // Captura edições manuais e valida campos obrigatórios
    let faltouObs = false;
    _rrVeiculos.forEach((v, i) => {
        const ta = document.querySelector(`.rr-textarea-edit[data-index="${i}"]`);
        if (ta) v.colBEditado = ta.value;
        const to = document.querySelector(`.rr-textarea-obs[data-index="${i}"]`);
        if (to) {
            v.obsRoteirizador = to.value;
            if (!v.obsRoteirizador || !v.obsRoteirizador.trim()) {
                faltouObs = true;
                to.style.borderColor = '#dc2626';
            } else {
                to.style.borderColor = '#cbd5e1';
            }
        }
        const taAlt = document.querySelector(`.rr-textarea-alt[data-index="${i}"]`);
        if (taAlt) v.obsAlteracoes = taAlt.value;
    });

    if (faltouObs) {
        showToast('Preencha as Observações do Roteirizador para todas as saídas!', 'error');
        return;
    }

    let nomeFinal = window._rrDefaultNomeResumo || 'Resumo de Rota';

    // Se é um resumo novo
    if (!_rrCurrentId) {
        const nomeExistente = _rrHistoricoList.find(h => h.nome === nomeFinal);
        if (nomeExistente) {
            const { value, isConfirmed } = await Swal.fire({
                title: 'Nome já utilizado',
                html: `Já existe um resumo salvo com o nome <b>"${nomeFinal}"</b>.<br>Deseja salvar com um nome diferente?`,
                input: 'text',
                inputValue: nomeFinal + ' (2)',
                showCancelButton: true,
                confirmButtonText: 'Salvar com novo nome',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#2d9e5f',
            });
            if (!isConfirmed) return;
            nomeFinal = value || nomeFinal + ' (2)';
        } else {
            const { value, isConfirmed } = await Swal.fire({
                title: 'Salvar Resumo de Rota',
                input: 'text',
                inputLabel: 'Nome do resumo',
                inputValue: nomeFinal,
                showCancelButton: true,
                confirmButtonText: 'Salvar',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#2d9e5f',
            });
            if (!isConfirmed) return;
            nomeFinal = value || nomeFinal;
        }
    }

    try {
        const payload = {
            id: _rrCurrentId,
            nome: nomeFinal,
            dados: {
                veiculos: _rrVeiculos,
                originalFileBase64: window._rrOriginalFileBase64 || null,
                originalFileName:   window._rrOriginalFileName   || null,
            }
        };
        const res = await fetch('/api/logistica/resumo-rota', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ..._rrAuthHeaders() },
            body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success) {
            _rrCurrentId = data.id;
            await window.rrListarHistorico();
            await window._rrRegistrarAlteracoes(nomeFinal);
            if (typeof window._rrCapturarSnapshot === "function") window._rrCapturarSnapshot();
            const sel = document.getElementById('rr-historico-select');
            if (sel) sel.value = _rrCurrentId;
            const btnOrig = document.getElementById('rr-btn-baixar-original');
            if (btnOrig) btnOrig.style.display = window._rrOriginalFileBase64 ? 'flex' : 'none';
        }
    } catch (e) {
        console.error('[RR] Erro ao salvar resumo:', e);
        showToast('Aviso: não foi possível salvar no histórico.', 'error');
    }

    await _rrGerarExcel();
};

// ══════════════════════════════════════════════════════════════
//  GERAR IMAGENS PNG DA ROTA  (1080 × 1920)
// ══════════════════════════════════════════════════════════════
async function _rrGerarImagensRota() {
    const W = 1080, H = 1920;
    const PAD = 28;
    const HDR_H = 96;          // altura do cabeçalho de página
    const V_HDR_H = 54;        // altura do header do card de veículo
    const CREW_R = 38;         // raio da foto circular
    const CREW_ROW_H = 90;     // altura por tripulante
    const LEFT_W = 270;        // largura da coluna esquerda (equipe)
    const RIGHT_X = PAD + LEFT_W + 16;
    const RIGHT_W = W - RIGHT_X - PAD;
    const SRV_LH = 30;         // line-height dos serviços
    const BODY_PAD_V = 18;     // padding vertical interno do card
    const CREW_H = BODY_PAD_V + CREW_ROW_H * 2 + 8 + BODY_PAD_V;
    const CARD_GAP = 10;

    // ── Pre-carregar fotos via fetch + auth ─────────────────────
    const cache = {};
    const toLoad = new Set();
    _rrVeiculos.forEach(v => {
        if (v._fotoMotorista) toLoad.add(v._fotoMotorista);
        if (v._fotoAjudante)  toLoad.add(v._fotoAjudante);
    });
    await Promise.allSettled([...toLoad].map(async url => {
        try {
            const r = await fetch(url, { headers: _rrAuthHeaders() });
            if (!r.ok) throw 0;
            const b = await r.blob();
            const bu = URL.createObjectURL(b);
            await new Promise((ok, fail) => {
                const im = new Image();
                im.onload = () => { cache[url] = im; URL.revokeObjectURL(bu); ok(); };
                im.onerror = () => { cache[url] = null; ok(); };
                im.src = bu;
            });
        } catch { cache[url] = null; }
    }));

    // ── Estimativa de altura do card ─────────────────────────────
    function cardH(v) {
        const colB = v.colBEditado || _rrMontarColB(v);
        let sh = BODY_PAD_V;
        colB.split('\n').forEach(l => { sh += l.trim() ? SRV_LH + 3 : 8; });
        sh += BODY_PAD_V;
        return V_HDR_H + 1 + Math.max(CREW_H, sh) + 2 + CARD_GAP;
    }

    // ── Paginação ─────────────────────────────────────────────────
    const AVAIL = H - HDR_H - PAD;
    const pages = [[]];
    let used = 0;
    for (const v of _rrVeiculos) {
        const h = cardH(v);
        if (used + h > AVAIL && pages[pages.length - 1].length > 0) {
            pages.push([]);
            used = 0;
        }
        pages[pages.length - 1].push(v);
        used += h;
    }

    // ── Helpers de desenho ────────────────────────────────────────
    function roundRect(ctx, x, y, w, h, r, fill) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.arcTo(x + w, y, x + w, y + r, r);
        ctx.lineTo(x + w, y + h - r);
        ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
        ctx.lineTo(x + r, y + h);
        ctx.arcTo(x, y + h, x, y + h - r, r);
        ctx.lineTo(x, y + r);
        ctx.arcTo(x, y, x + r, y, r);
        ctx.closePath();
        if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    }

    function drawPhoto(ctx, img, cx, cy, r, initials, ring) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        // NÃO chamar closePath() para arco completo — evita linha diagonal na foto
        if (img) {
            ctx.clip();
            ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
        } else {
            ctx.fillStyle = ring || '#16a34a';
            ctx.fill();
            ctx.clip();
            ctx.fillStyle = '#fff';
            ctx.font = `bold ${Math.floor(r * 0.74)}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(initials || '?').substring(0, 2).toUpperCase(), cx, cy + 1);
        }
        ctx.restore();
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, r + 2.5, 0, Math.PI * 2);
        ctx.strokeStyle = ring || '#16a34a';
        ctx.lineWidth = 3.5;
        ctx.stroke();
        ctx.restore();
    }

    function lineStyle(line) {
        const u = line.toUpperCase().trim();
        if (u.startsWith('⭕') || (u.includes('RETIRADA') && !/^\s+\d/.test(line)))
            return { color: '#b91c1c', bold: true };
        if (u.includes('ENTREGA') && !/^\s+\d/.test(line))
            return { color: '#1e40af', bold: true };
        if (u.includes('MANUTENCAO') || u.includes('MANUTENÇÃO'))
            return { color: '#78350f', bold: true };
        if (/^[🚨❗⏰🌀🛒🦺♻️👷💧🏗]/.test(line.trim()))
            return { color: '#7c2d12', bold: false };
        return { color: '#1e293b', bold: false };
    }

    // ── Renderizar páginas ────────────────────────────────────────
    const canvases = [];

    for (let pi = 0; pi < pages.length; pi++) {
        const cv = document.createElement('canvas');
        cv.width = W; cv.height = H;
        const ctx = cv.getContext('2d');

        // Fundo da página
        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(0, 0, W, H);

        // Cabeçalho verde
        const hg = ctx.createLinearGradient(0, 0, 0, HDR_H);
        hg.addColorStop(0, '#155d38');
        hg.addColorStop(1, '#2d9e5f');
        ctx.fillStyle = hg;
        ctx.fillRect(0, 0, W, HDR_H);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 40px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('AMÉRICA RENTAL', PAD + 6, HDR_H * 0.37);

        const ds = window._rrDataRotaAtual
            ? new Date(window._rrDataRotaAtual + 'T12:00:00').toLocaleDateString('pt-BR', {weekday:'long', day:'2-digit', month:'long', year:'numeric'})
            : new Date().toLocaleDateString('pt-BR', {weekday:'long', day:'2-digit', month:'long', year:'numeric'});
        ctx.font = '22px Arial';
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.fillText('Resumo de Rota — ' + ds.charAt(0).toUpperCase() + ds.slice(1), PAD + 6, HDR_H * 0.7);

        ctx.font = 'bold 22px Arial';
        ctx.fillStyle = 'rgba(255,255,255,0.65)';
        ctx.textAlign = 'right';
        ctx.fillText(`${pi + 1} / ${pages.length}`, W - PAD, HDR_H * 0.5);

        // Veículos
        let cy = HDR_H + PAD;

        for (const v of pages[pi]) {
            const colB = v.colBEditado || _rrMontarColB(v);
            const lines = colB.split('\n');

            let sh = BODY_PAD_V;
            lines.forEach(l => { sh += l.trim() ? SRV_LH + 3 : 8; });
            sh += BODY_PAD_V;
            const bodyH = Math.max(CREW_H, sh);
            const totalH = V_HDR_H + 1 + bodyH;

            // Sombra suave + fundo branco do card
            ctx.shadowColor = 'rgba(0,0,0,0.09)';
            ctx.shadowBlur = 10;
            ctx.shadowOffsetY = 3;
            roundRect(ctx, PAD, cy, W - PAD * 2, totalH, 10, '#ffffff');
            ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

            // Borda do card
            ctx.save();
            roundRect(ctx, PAD, cy, W - PAD * 2, totalH, 10);
            ctx.strokeStyle = '#dde3ea';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.restore();

            // Header do veículo (cinza)
            ctx.fillStyle = '#e8edf2';
            roundRect(ctx, PAD, cy, W - PAD * 2, V_HDR_H, 10, '#e8edf2');
            ctx.fillStyle = '#e8edf2';
            ctx.fillRect(PAD, cy + 10, W - PAD * 2, V_HDR_H - 10);

            ctx.fillStyle = '#0f172a';
            ctx.font = 'bold 26px Arial';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText('🚚  ' + (v.veiculo || ''), PAD + 18, cy + V_HDR_H / 2);

            // Linha divisória após header do veículo
            ctx.fillStyle = '#cdd5df';
            ctx.fillRect(PAD, cy + V_HDR_H, W - PAD * 2, 1);

            const bodyY = cy + V_HDR_H + 1;

            // Divisor vertical esquerda|direita
            ctx.fillStyle = '#e9eef3';
            ctx.fillRect(PAD + LEFT_W, bodyY, 1, bodyH);

            // ── Esquerda: Equipe ──
            let crY = bodyY + BODY_PAD_V;

            const drawMember = (nome, cargo, fotoUrl, ring) => {
                const photoX = PAD + CREW_R + 12;
                const photoY = crY + CREW_R + 4;
                const img = fotoUrl ? (cache[fotoUrl] || null) : null;
                const ini = (nome || '?').split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase();
                drawPhoto(ctx, img, photoX, photoY, CREW_R, ini, ring);

                const tx = PAD + CREW_R * 2 + 22;
                const tw = LEFT_W - CREW_R * 2 - 30;

                ctx.fillStyle = '#0f172a';
                ctx.font = 'bold 21px Arial';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'top';
                let displayNome = (nome || '—').replace(/\s+/g, ' ').trim();
                if (ctx.measureText(displayNome).width > tw) {
                    const parts = displayNome.split(' ');
                    displayNome = parts.slice(0, 2).join(' ');
                    if (ctx.measureText(displayNome).width > tw) displayNome = parts[0];
                }
                ctx.fillText(displayNome, tx, crY + 10);

                ctx.fillStyle = '#64748b';
                ctx.font = '18px Arial';
                ctx.fillText(cargo || '', tx, crY + 37);
                crY += CREW_ROW_H;
            };

            drawMember(v.motorista, 'Motorista', v._fotoMotorista, '#1d4ed8');

            // Separador entre motorista e ajudante — desenhado ENTRE as duas fotos
            // crY após motor = bodyY + BODY_PAD_V + CREW_ROW_H
            // motor foto bottom = crY - CREW_ROW_H + CREW_R*2 + 4  
            // aju foto top    = crY + 4
            // meio da lacuna = crY - (CREW_ROW_H - CREW_R*2 - 4) / 2 = crY - 3
            ctx.strokeStyle = '#e9eef3';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(PAD + 10, crY - 4);
            ctx.lineTo(PAD + LEFT_W - 8, crY - 4);
            ctx.stroke();

            drawMember(v.ajudante, 'Ajudante Geral', v._fotoAjudante, '#d97706'); // amarelo

            // ── Direita: Serviços ──
            let sy = bodyY + BODY_PAD_V;
            for (const line of lines) {
                if (!line.trim()) { sy += 8; continue; }
                const { color, bold } = lineStyle(line);
                const isIndent = /^\s{2,}/.test(line);
                const dx = isIndent ? 18 : 0;
                ctx.fillStyle = color;
                ctx.font = `${bold ? 'bold ' : ''}${bold ? 21 : 20}px Arial`;
                ctx.textAlign = 'left';
                ctx.textBaseline = 'top';
                ctx.fillText(line.trim(), RIGHT_X + dx, sy, RIGHT_W - dx - 8);
                sy += SRV_LH + 3;
                if (sy > bodyY + bodyH - 10) break;
            }

            cy += totalH + CARD_GAP;
        }

        // Rodapé
        ctx.fillStyle = '#94a3b8';
        ctx.font = '19px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText('América Rental Equipamentos — Logística', W / 2, H - 20);

        canvases.push(cv);
    }

    return canvases;
}

// ── Gera e baixa o arquivo Excel ──────────────
async function _rrGerarExcel() {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'América Rental';
    const ws = wb.addWorksheet('Resumo de Rota');

    // ─── Cabeçalhos exatos da nova planilha de exemplo (26 colunas) ──────────
    const SR_HEADERS = [
        "Titulo*    Solicitado", "endereço completo*    Solicitado", "Carga",
        "Janela de horário inicial", "Janela de horário final", "Tempo de serviço",
        "Anotações", "Latitude", "Longitude", "Identificação de referência",
        "Habilidade necessária", "Habilidade opcional", "Pessoa de contato",
        "Telefone de contato", "Janela de horário inicial 2", "Janela de horário final 2",
        "Capacidade 2", "Capacidade 3", "Prioridade", "SMS", "Correio eletrônico de contato",
        "Carga pick", "Carga pick 2", "Carga pick 3", "Data agendada", "Tipo de visita"
    ];
    const ANOTACOES_COL = 7; // 1-based index of "Anotações" = column G
    const LAT_COL = 8;       // 1-based index of "Latitude" = column H
    const LON_COL = 9;       // 1-based index of "Longitude" = column I

    const darkGreen = { argb: 'FF1A3C2E' };
    const lightGreen = { argb: 'FFF0FBF4' };
    const borderThin = { style: 'thin', color: { argb: 'FFCBD5E1' } };
    const borderStyle = { top: borderThin, bottom: borderThin, left: borderThin, right: borderThin };

    // Adiciona os cabeçalhos na linha 1
    const hdr1 = ws.addRow(SR_HEADERS);
    SR_HEADERS.forEach((_, ci) => {
        const cell = hdr1.getCell(ci + 1);
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: darkGreen };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = borderStyle;
    });
    hdr1.height = 22;

    // Ordena veículos em ordem alfabética na planilha
    const veiculosOrdenados = [..._rrVeiculos].sort((a, b) => (a.veiculo || '').localeCompare(b.veiculo || '', 'pt-BR', { sensitivity: 'base' }));

    veiculosOrdenados.forEach((v, i) => {
        const colB = v.colBEditado || _rrMontarColB(v);
        const nLines = (colB.match(/\n/g) || []).length + 1;
        const rowH   = Math.max(20, nLines * 14);
        const zebra  = i % 2 === 0 ? lightGreen : null;
        const enderecoBase = `Rua Salto da Divisa, ${97 + i} - Pq. Alvorada - Guarulhos`;

        // --- Saída ---
        const dataSaida = new Array(26).fill('');
        dataSaida[0] = `${v.veiculo} - Saída`; // Coluna A (Titulo)
        dataSaida[1] = enderecoBase;                    // Coluna B
        dataSaida[ANOTACOES_COL - 1] = colB;            // Coluna G
        dataSaida[LAT_COL - 1] = '-23.433853765885214'; // Coluna H
        dataSaida[LON_COL - 1] = '-46.42011440858504';  // Coluna I

        const rowSaida = ws.addRow(dataSaida);
        rowSaida.getCell(1).font = { bold: true, size: 9 };
        rowSaida.getCell(ANOTACOES_COL).alignment = { vertical: 'top', wrapText: true };
        rowSaida.height = rowH;
        if (zebra) {
            [1, 2, ANOTACOES_COL, LAT_COL, LON_COL].forEach(c => {
                rowSaida.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: zebra };
            });
        }
        [1, 2, ANOTACOES_COL, LAT_COL, LON_COL].forEach(c => { rowSaida.getCell(c).border = borderStyle; });

        // --- Retorno ---
        const dataRetorno = new Array(26).fill('');
        dataRetorno[0] = `${v.veiculo} - Retorno`;
        dataRetorno[1] = enderecoBase;                    // Coluna B
        dataRetorno[LAT_COL - 1] = '-23.433853765885214'; // Coluna H
        dataRetorno[LON_COL - 1] = '-46.42011440858504';  // Coluna I

        const rowRetorno = ws.addRow(dataRetorno);
        rowRetorno.getCell(1).font = { bold: true, size: 9 };
        rowRetorno.height = 30;
        if (zebra) {
            [1, 2, LAT_COL, LON_COL].forEach(c => {
                rowRetorno.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: zebra };
            });
        }
        [1, 2, LAT_COL, LON_COL].forEach(c => { rowRetorno.getCell(c).border = borderStyle; });
    });

    // Larguras
    ws.getColumn(1).width = 38;  // A: Titulo
    ws.getColumn(2).width = 20;  // B: endereço completo
    ws.getColumn(3).width = 15;  // C: Carga
    ws.getColumn(4).width = 15;  // D: Janela inicial
    ws.getColumn(5).width = 15;  // E: Janela final
    ws.getColumn(6).width = 15;  // F: Tempo de serviço
    ws.getColumn(ANOTACOES_COL).width = 70; // G: Anotações/Resumo
    ws.getColumn(LAT_COL).width = 20; // H: Latitude
    ws.getColumn(LON_COL).width = 20; // I: Longitude
    
    // Demais colunas com largura padrão
    for (let c = 10; c <= 26; c++) {
        ws.getColumn(c).width = 12;
    }

    const buf  = await wb.xlsx.writeBuffer();
    const hoje = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
    const nomeBase = `Resumo_Rota_${hoje}`;

    // ── Gerar imagens e empacotar com Excel ────────────────────────
    showToast('⏳ Gerando imagens da rota...', 'info');
    try {
        const canvases = await _rrGerarImagensRota();
        const excelBlob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

        // Baixa Excel primeiro
        saveAs(excelBlob, `${nomeBase}.xlsx`);

        // Baixa cada imagem individualmente (sem ZIP)
        for (let i = 0; i < canvases.length; i++) {
            await new Promise(res => canvases[i].toBlob(b => {
                saveAs(b, `${nomeBase}_img${String(i + 1).padStart(2, '0')}.png`);
                res();
            }, 'image/png'));
            if (i < canvases.length - 1) {
                await new Promise(r => setTimeout(r, 400)); // pausa entre downloads
            }
        }

        showToast(`✅ Planilha + ${canvases.length} imagem(ns) exportadas com sucesso!`, 'success');
    } catch (imgErr) {
        console.error('[RR] Erro ao gerar imagens:', imgErr);
        // Fallback: baixa só o Excel
        const excelBlob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(excelBlob, `${nomeBase}.xlsx`);
        showToast('✅ Planilha exportada. Erro ao gerar imagens: ' + imgErr.message, 'warning');
    }
}


window._rrAbrirHistoricoAlteracoes = async function() {
    const overlay = document.createElement('div');
    overlay.id = 'rr-hist-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.7);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:40px 20px;backdrop-filter:blur(3px);overflow-y:auto;';
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
    overlay.innerHTML = `<div style="background:#fff;border-radius:16px;width:100%;max-width:1100px;box-shadow:0 25px 60px rgba(0,0,0,.35);animation:rrHistSlide .25s ease;">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:1.2rem 1.5rem;background:linear-gradient(135deg,#2d9e5f,#1a7a46);border-radius:16px 16px 0 0;position:sticky;top:0;z-index:1;">
            <div style="display:flex;align-items:center;gap:10px;">
                <i class="ph ph-clock-counter-clockwise" style="font-size:1.4rem;color:rgba(255,255,255,0.8);"></i>
                <span style="color:#fff;font-weight:700;font-size:1.05rem;">Histórico de Alterações — Resumo de Rota</span>
            </div>
            <button onclick="document.getElementById('rr-hist-overlay').remove()" style="background:rgba(255,255,255,.2);border:none;border-radius:8px;color:#fff;width:32px;height:32px;cursor:pointer;font-size:1.1rem;display:flex;align-items:center;justify-content:center;">✕</button>
        </div>
        <div style="padding:1.5rem;" id="rr-hist-body"><div style="text-align:center;padding:2rem;color:#94a3b8;">Carregando...</div></div>
    </div>
    <style>@keyframes rrHistSlide{from{transform:translateY(-20px);opacity:0}to{transform:translateY(0);opacity:1}}</style>`;
    document.body.appendChild(overlay);

    try {
        const token = window.currentToken || localStorage.getItem('erp_token') || '';
        const res = await fetch('/api/logistica/resumo-rota-auditoria', {
            headers: { Authorization: 'Bearer ' + token }
        });
        const rows = await res.json();
        const body = document.getElementById('rr-hist-body');
        if (!rows || !rows.length) {
            body.innerHTML = '<div style="text-align:center;padding:3rem;color:#94a3b8;"><i class="ph ph-clock" style="font-size:3rem;opacity:0.4;"></i><p style="margin-top:1rem;">Nenhuma alteração registrada ainda.</p></div>';
            return;
        }
        body.innerHTML = `<table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
            <thead><tr style="background:#f1f5f9;">
                <th style="padding:10px 12px;text-align:left;font-size:0.75rem;text-transform:uppercase;color:#64748b;border-bottom:2px solid #e2e8f0;">Data/Hora</th>
                <th style="padding:10px 12px;text-align:left;font-size:0.75rem;text-transform:uppercase;color:#64748b;border-bottom:2px solid #e2e8f0;">Dia da Rota</th>
                <th style="padding:10px 12px;text-align:left;font-size:0.75rem;text-transform:uppercase;color:#64748b;border-bottom:2px solid #e2e8f0;">Veículo</th>
                <th style="padding:10px 12px;text-align:left;font-size:0.75rem;text-transform:uppercase;color:#64748b;border-bottom:2px solid #e2e8f0;">Campo</th>
                <th style="padding:10px 12px;text-align:left;font-size:0.75rem;text-transform:uppercase;color:#64748b;border-bottom:2px solid #e2e8f0;">Usuário</th>
                <th style="padding:10px 12px;text-align:left;font-size:0.75rem;text-transform:uppercase;color:#64748b;border-bottom:2px solid #e2e8f0;">Conteúdo Anterior</th>
                <th style="padding:10px 12px;text-align:left;font-size:0.75rem;text-transform:uppercase;color:#64748b;border-bottom:2px solid #e2e8f0;">Conteúdo Atual</th>
            </tr></thead>
            <tbody>${rows.map((r, i) => {
                const dataFmt = r.data_rota ? r.data_rota.split('-').reverse().join('/') : '—';
                return `<tr style="background:${i%2===0?'#fff':'#f8fafc'};border-bottom:1px solid #f1f5f9;">
                    <td style="padding:10px 12px;color:#475569;white-space:nowrap;">${(r.created_at||'').slice(0,16).replace('T',' ')}</td>
                    <td style="padding:10px 12px;font-weight:600;color:#1e293b;">${dataFmt}</td>
                    <td style="padding:10px 12px;color:#475569;">${r.veiculo||'—'}</td>
                    <td style="padding:10px 12px;"><span style="background:#f0fdf4;color:#16a34a;border-radius:6px;padding:2px 8px;font-size:0.8rem;">${r.campo||'—'}</span></td>
                    <td style="padding:10px 12px;color:#7c3aed;font-weight:600;">${r.usuario_nome||'—'}</td>
                    <td style="padding:10px 12px;font-size:0.8rem;color:#ef4444;max-width:200px;overflow:hidden;text-overflow:ellipsis;">${r.valor_anterior||'—'}</td>
                    <td style="padding:10px 12px;font-size:0.8rem;color:#10b981;max-width:200px;overflow:hidden;text-overflow:ellipsis;">${r.valor_atual||'—'}</td>
                </tr>`;
            }).join('')}</tbody>
        </table>`;
    } catch(e) {
        document.getElementById('rr-hist-body').innerHTML = '<div style="text-align:center;padding:2rem;color:#dc2626;">Erro ao carregar histórico: ' + e.message + '</div>';
    }
};

window._rrSnapshot = null;
window._rrCapturarSnapshot = function() {
    window._rrSnapshot = JSON.parse(JSON.stringify(_rrVeiculos || []));
};

window._rrRegistrarAlteracoes = async function(nomeFinal) {
    if (!window._rrSnapshot) return;
    const token = window.currentToken || localStorage.getItem('erp_token') || '';
    const hoje = new Date().toISOString().split('T')[0];
    
    let dataRota = hoje;
    const infoData = document.getElementById('rr-data-info');
    if (infoData && infoData.innerText) {
        const m = infoData.innerText.match(/(\d{1,2})\s+de\s+([a-zA-Zç]+)\s+de\s+(\d{4})/);
        if (m) {
            const meses = {janeiro:'01',fevereiro:'02','março':'03',abril:'04',maio:'05',junho:'06',julho:'07',agosto:'08',setembro:'09',outubro:'10',novembro:'11',dezembro:'12'};
            dataRota = `${m[3]}-${meses[m[2].toLowerCase()]}-${m[1].padStart(2,'0')}`;
        }
    }

    const promises = [];
    _rrVeiculos.forEach((v, i) => {
        const snap = window._rrSnapshot[i];
        if (!snap) return;
        const placa = (v.veiculo || 'N/A').split(' ')[0];

        const checkDiff = (campo, oldVal, newVal) => {
            if ((oldVal || '') !== (newVal || '')) {
                promises.push(fetch('/api/logistica/resumo-rota-auditoria', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
                    body: JSON.stringify({
                        data_rota: dataRota,
                        nome_resumo: nomeFinal,
                        veiculo: placa,
                        campo: campo,
                        valor_anterior: oldVal || '',
                        valor_atual: newVal || ''
                    })
                }));
            }
        };

        checkDiff('Resumo da Rota', snap.colBEditado, v.colBEditado);
        checkDiff('Observações do Roteirizador', snap.obsRoteirizador, v.obsRoteirizador);
        checkDiff('Observações de Alterações', snap.obsAlteracoes, v.obsAlteracoes);
        checkDiff('Motorista', snap.motorista, v.motorista);
        checkDiff('Ajudante', snap.ajudante, v.ajudante);
        checkDiff('Veículo', snap.veiculo, v.veiculo);
    });

    if (promises.length === 0) {
        promises.push(fetch('/api/logistica/resumo-rota-auditoria', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
            body: JSON.stringify({
                data_rota: dataRota,
                nome_resumo: nomeFinal,
                veiculo: _rrVeiculos[0] ? _rrVeiculos[0].veiculo.split(' ')[0] : 'N/A',
                campo: 'SISTEMA',
                valor_anterior: '0',
                valor_atual: 'Salvo sem alterações'
            })
        }));
    }

    if (promises.length) {
        try {
            const resList = await Promise.all(promises);
            const badRes = resList.find(r => !r.ok);
            if (badRes) {
                if (typeof showToast === 'function') showToast('DEBUG: Backend Error HTTP ' + badRes.status, 'error');
            } else {
                if (typeof showToast === 'function') showToast('DEBUG: Auditoria registrada com sucesso!', 'success');
            }
            console.log('[RR] Auditoria salva:', promises.length, 'alterações');
        } catch (e) {
            console.error('Erro ao registrar auditoria de Resumo Rota', e);
            if (typeof showToast === 'function') showToast('DEBUG: Erro de rede na auditoria: ' + e.message, 'error');
        }
    } else {
        if (typeof showToast === 'function') showToast('DEBUG: Nenhuma alteração detectada (snapshot idêntico)', 'info');
    }
};
