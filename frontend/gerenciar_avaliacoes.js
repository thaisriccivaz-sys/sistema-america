// Nomes amigáveis para os grupos padrão
const GA_FRIENDLY_NAMES = {
    satisfacao: {
        motorista:  'Satisfação - Motoristas e Ajudantes',
        manutencao: 'Satisfação - Manutenção',
        escritorio: 'Satisfação - Escritório'
    },
    desempenho: {
        geral:     'Desempenho - Geral',
        lideranca: 'Desempenho - Liderança'
    },
    experiencia: {
        motorista: 'Experiência - Motoristas',
        ajudante:  'Experiência - Ajudantes'
    }
};

let gaTemplates = [];   // lista de templates carregados da API
let gaEditingId = null; // id do template em edição (null = novo)

function fetchGaTemplates() {
    return fetch('/api/avaliacao-templates', {
        headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
    }).then(r => r.json());
}

function gaApiCall(method, id, body) {
    const url = id ? `/api/avaliacao-templates/${id}` : '/api/avaliacao-templates';
    return fetch(url, {
        method,
        headers: {
            'Authorization': 'Bearer ' + localStorage.getItem('token'),
            'Content-Type': 'application/json'
        },
        body: body ? JSON.stringify(body) : undefined
    }).then(r => r.json());
}

window.renderGerenciarAvaliacoes = async function () {
    const container = document.getElementById('gerenciar-avaliacoes-container');
    if (!container) return;

    container.innerHTML = `<p style="padding:2rem;color:#94a3b8;">Carregando templates...</p>`;

    try {
        gaTemplates = await fetchGaTemplates();
    } catch (e) {
        container.innerHTML = `<p style="padding:2rem;color:#ef4444;">Erro ao carregar templates: ${e.message}</p>`;
        return;
    }

    // Mesclar com os templates padrão do AVALIACAO_QUESTIONS
    // Grupos que já estão no banco não serão duplicados (usa grupo_key como chave única)
    const dbKeys = new Set(gaTemplates.map(t => `${t.tipo}:${t.grupo_key}`));
    const defaultTemplates = [];

    if (typeof AVALIACAO_QUESTIONS !== 'undefined') {
        ['satisfacao', 'desempenho', 'experiencia'].forEach(tipo => {
            const grupos = AVALIACAO_QUESTIONS[tipo] || {};
            Object.keys(grupos).forEach(grupo_key => {
                const compositeKey = `${tipo}:${grupo_key}`;
                if (!dbKeys.has(compositeKey)) {
                    defaultTemplates.push({
                        id: null, // não está no banco ainda
                        nome: (GA_FRIENDLY_NAMES[tipo] && GA_FRIENDLY_NAMES[tipo][grupo_key]) ? GA_FRIENDLY_NAMES[tipo][grupo_key] : `${tipo.charAt(0).toUpperCase() + tipo.slice(1)} - ${grupo_key.charAt(0).toUpperCase() + grupo_key.slice(1)}`,
                        tipo: tipo,
                        grupo_key: grupo_key,
                        categorias_json: JSON.stringify(grupos[grupo_key]),
                        _isPadrao: true
                    });
                }
            });
        });
    }

    // Lista completa: banco + padrões não salvos
    const allTemplates = [...gaTemplates, ...defaultTemplates];

    renderGaListPage(allTemplates);
};

// ============================================================
// PÁGINA DE LISTAGEM
// ============================================================
function renderGaListPage(allTemplates) {
    const container = document.getElementById('gerenciar-avaliacoes-container');
    const templates = allTemplates || gaTemplates;

    // Separar por tipo
    const satisfacao = templates.filter(t => t.tipo === 'satisfacao');
    const desempenho = templates.filter(t => t.tipo === 'desempenho');
    const experiencia = templates.filter(t => t.tipo === 'experiencia');

    container.innerHTML = `
        <div style="padding:1.5rem;">
            <!-- CABEÇALHO DA TELA -->
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
                <div style="display:flex; align-items:center; gap:1rem;">
                    <div style="width:56px;height:56px;border-radius:12px;background:linear-gradient(135deg,#0f4c81,#1d6fb8);display:flex;align-items:center;justify-content:center;">
                        <i class="ph ph-clipboard-text" style="font-size:1.8rem;color:#fff;"></i>
                    </div>
                    <div>
                        <h2 style="margin:0;font-size:1.4rem;color:#0f172a;">Gerenciar Avaliações</h2>
                        <p style="margin:2px 0 0;color:#64748b;font-size:0.85rem;">Templates de perguntas por departamento</p>
                    </div>
                </div>
                <button onclick="window.gaAbrirFormNovo()" style="background:linear-gradient(135deg,#0f4c81,#1d6fb8);color:#fff;border:none;padding:0.65rem 1.4rem;border-radius:8px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:0.5rem;font-size:0.95rem;box-shadow:0 4px 12px rgba(15,76,129,0.35);transition:transform 0.1s;" onmousedown="this.style.transform='scale(0.97)'" onmouseup="this.style.transform='scale(1)'">
                    <i class="ph ph-plus-circle"></i> Novo Template
                </button>
            </div>

            <!-- AVISO INFORMATIVO -->
            <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:0.9rem 1.2rem;margin-bottom:1.5rem;display:flex;align-items:flex-start;gap:0.75rem;">
                <i class="ph ph-info" style="color:#3b82f6;font-size:1.3rem;flex-shrink:0;margin-top:1px;"></i>
                <div style="font-size:0.87rem;color:#1e3a5f;line-height:1.5;">
                    <strong>Como funciona:</strong> Cada template representa um grupo de colaboradores (ex: Motoristas, Manutenção, Escritório). A <em>Chave do Grupo</em> é usada para associar ao cargo/departamento.
                    Templates com badge <span style="background:#f59e0b;color:#fff;font-size:0.7rem;padding:1px 6px;border-radius:999px;">Padrão</span> são os templates do sistema — clique em <strong>Editar</strong> para personalizar e salvar.
                </div>
            </div>

            <!-- SEÇÃO AVALIAÇÃO DE SATISFAÇÃO -->
            <div style="margin-bottom:2rem;">
                <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1rem;padding-bottom:0.5rem;border-bottom:2px solid #e2e8f0;">
                    <div style="width:10px;height:10px;border-radius:50%;background:#8b5cf6;"></div>
                    <h3 style="margin:0;font-size:1rem;font-weight:700;color:#0f172a;">Avaliação de Satisfação</h3>
                    <span style="background:#8b5cf6;color:#fff;font-size:0.75rem;font-weight:700;padding:2px 10px;border-radius:999px;">${satisfacao.length} template${satisfacao.length !== 1 ? 's' : ''}</span>
                </div>
                ${renderGaCards(satisfacao, 'satisfacao')}
            </div>

            <!-- SEÇÃO AVALIAÇÃO DE DESEMPENHO -->
            <div style="margin-bottom:2rem;">
                <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1rem;padding-bottom:0.5rem;border-bottom:2px solid #e2e8f0;">
                    <div style="width:10px;height:10px;border-radius:50%;background:#0f4c81;"></div>
                    <h3 style="margin:0;font-size:1rem;font-weight:700;color:#0f172a;">Avaliação de Desempenho</h3>
                    <span style="background:#0f4c81;color:#fff;font-size:0.75rem;font-weight:700;padding:2px 10px;border-radius:999px;">${desempenho.length} template${desempenho.length !== 1 ? 's' : ''}</span>
                </div>
                ${renderGaCards(desempenho, 'desempenho')}
            </div>

            <!-- SEÇÃO AVALIAÇÃO DE EXPERIÊNCIA -->
            <div>
                <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1rem;padding-bottom:0.5rem;border-bottom:2px solid #e2e8f0;">
                    <div style="width:10px;height:10px;border-radius:50%;background:#f59e0b;"></div>
                    <h3 style="margin:0;font-size:1rem;font-weight:700;color:#0f172a;">Avaliação de Experiência</h3>
                    <span style="background:#f59e0b;color:#fff;font-size:0.75rem;font-weight:700;padding:2px 10px;border-radius:999px;">${experiencia.length} template${experiencia.length !== 1 ? 's' : ''}</span>
                </div>
                ${renderGaCards(experiencia, 'experiencia')}
            </div>
        </div>
    `;
}

function renderGaCards(templates, tipo) {
    if (!templates.length) {
        return `<div style="background:#f8fafc;border:1.5px dashed #cbd5e1;border-radius:12px;padding:2rem;text-align:center;color:#94a3b8;">
            <i class="ph ph-clipboard" style="font-size:2.5rem;display:block;margin-bottom:0.5rem;"></i>
            Nenhum template criado ainda. Clique em <strong>"Novo Template"</strong> para criar um.
        </div>`;
    }

    let color = '#0f4c81'; let bg = '#eff6ff';
    if (tipo === 'satisfacao') { color = '#8b5cf6'; bg = '#faf5ff'; }
    if (tipo === 'experiencia') { color = '#f59e0b'; bg = '#fffbeb'; }

    // Usar mapa estático global para evitar erro de aspas no onclick do HTML
    if (!window._gaCardMap) window._gaCardMap = {};

    return `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:1rem;">
        ${templates.map(t => {
            let cats = [];
            try { cats = Object.keys(JSON.parse(t.categorias_json)); } catch(e) {}
            const isPadrao = !!t._isPadrao;
            const safeNome = (t.nome || '').replace(/'/g, "\\'");
            
            // Cadastrar objeto no mapa 
            const mapKey = 't_' + Math.random().toString(36).substr(2, 9);
            window._gaCardMap[mapKey] = { id: t.id, nome: t.nome, tipo: t.tipo, grupo_key: t.grupo_key, categorias_json: t.categorias_json };

            return `
                <div style="background:#fff;border:1.5px solid ${isPadrao ? '#fed7aa' : '#e2e8f0'};border-radius:12px;overflow:hidden;box-shadow:0 2px 6px rgba(0,0,0,0.05);transition:box-shadow 0.2s;" onmouseover="this.style.boxShadow='0 6px 20px rgba(0,0,0,0.1)'" onmouseout="this.style.boxShadow='0 2px 6px rgba(0,0,0,0.05)'">
                    <div style="background:${isPadrao ? '#fff7ed' : bg};border-bottom:1.5px solid ${isPadrao ? '#fed7aa' : '#e2e8f0'};padding:0.9rem 1.1rem;display:flex;justify-content:space-between;align-items:center;">
                        <div style="flex:1;min-width:0;">
                            <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;">
                                <p style="margin:0;font-weight:700;color:#0f172a;font-size:0.97rem;">${t.nome}</p>
                                ${isPadrao ? `<span style="background:#f59e0b;color:#fff;font-size:0.68rem;padding:1px 7px;border-radius:999px;font-weight:700;">Padrão</span>` : ''}
                            </div>
                            <span style="font-size:0.75rem;color:#64748b;">Chave: <code style="background:#e2e8f0;padding:1px 6px;border-radius:4px;">${t.grupo_key}</code></span>
                        </div>
                        <div style="display:flex;gap:0.5rem;flex-shrink:0;">
                            <button onclick="window.gaDuplicarTemplate('${mapKey}')" title="Duplicar Template" style="background:#10b981;color:#fff;border:none;width:34px;height:34px;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:0.95rem;transition:opacity 0.2s;" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">
                                <i class="ph ph-copy"></i>
                            </button>
                            <button onclick="window.gaAbrirFormEditarTemplate('${mapKey}')" title="${isPadrao ? 'Personalizar e Salvar' : 'Editar'}" style="background:${color};color:#fff;border:none;width:34px;height:34px;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:0.95rem;transition:opacity 0.2s;" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">
                                <i class="ph ph-pencil-simple"></i>
                            </button>
                            ${!isPadrao ? `<button onclick="window.gaExcluirTemplate(${t.id},'${safeNome}')" title="Excluir" style="background:#ef4444;color:#fff;border:none;width:34px;height:34px;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:0.95rem;transition:opacity 0.2s;" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">
                                <i class="ph ph-trash"></i>
                            </button>` : ''}
                        </div>
                    </div>
                    <div style="padding:0.75rem 1.1rem;">
                        <p style="margin:0 0 0.5rem;font-size:0.8rem;color:#64748b;font-weight:600;">${cats.length} CATEGORIAS:</p>
                        <div style="display:flex;flex-wrap:wrap;gap:0.4rem;">
                            ${cats.map(c => `<span style="background:${bg};border:1px solid ${color}33;color:${color};font-size:0.75rem;padding:2px 8px;border-radius:999px;">${c}</span>`).join('')}
                        </div>
                    </div>
                </div>
            `;
        }).join('')}
    </div>`;
}

// Suporte a edição de templates referenciando o map cacheado
window.gaAbrirFormEditarTemplate = function(mapKey) {
    const tObj = window._gaCardMap[mapKey];
    if (!tObj) return;
    gaEditingId = tObj.id || null; // null = padrão ainda não salvo
    renderGaForm(tObj);
};


window.gaDuplicarTemplate = function(mapKey) {
    const tObj = window._gaCardMap[mapKey];
    if (!tObj) return;
    const duplicate = JSON.parse(JSON.stringify(tObj));
    gaEditingId = null; // Forces new
    duplicate.nome = duplicate.nome + ' (Cópia)';
    renderGaForm(duplicate);
};

window.gaChangeTipo = function(tipo) {
    const isExp = tipo === 'experiencia';
    document.querySelectorAll('.ga-pergunta-row-5, .ga-pergunta-row-6').forEach(el => {
        el.style.display = isExp ? 'flex' : 'none';
        if (!isExp) el.querySelector('input').value = ''; 
    });
};

// ============================================================
// FORMULÁRIO DE CRIAÇÃO/EDIÇÃO
// ============================================================
window.gaAbrirFormNovo = function () {
    gaEditingId = null;
    renderGaForm({ nome: '', tipo: 'experiencia', grupo_key: '', categorias_json: '{}' });
};

window.gaAbrirFormEditar = function (id) {
    const t = gaTemplates.find(x => x.id === id);
    if (!t) return;
    gaEditingId = id;
    renderGaForm(t);
};

async function renderGaForm(template) {
    const container = document.getElementById('gerenciar-avaliacoes-container');

    let categorias = {};
    try { categorias = JSON.parse(template.categorias_json || '{}'); } catch(e) {}

    // Gera blocos de categoria existentes
    const catKeys = Object.keys(categorias);

    container.innerHTML = `
        <div style="padding:1.5rem;">
            <!-- CABEÇALHO DO FORM -->
            <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.5rem;">
                <button onclick="window.renderGerenciarAvaliacoes()" style="background:#f1f5f9;border:none;color:#475569;padding:0.5rem 1rem;border-radius:8px;cursor:pointer;font-weight:600;display:flex;align-items:center;gap:0.5rem;">
                    <i class="ph ph-arrow-left"></i> Voltar
                </button>
                <h2 style="margin:0;font-size:1.3rem;color:#0f172a;">${gaEditingId ? 'Editar Template' : 'Novo Template de Avaliação'}</h2>
            </div>

            <!-- CAMPOS PRINCIPAIS -->
            <div style="background:#fff;border:1.5px solid #e2e8f0;border-radius:12px;padding:1.5rem;margin-bottom:1.5rem;">
                <div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:1rem;">
                    <div>
                        <label style="display:block;font-weight:600;font-size:0.85rem;color:#374151;margin-bottom:4px;">Nome do Template *</label>
                        <input id="ga-nome" type="text" value="${template.nome || ''}" placeholder="Ex: Avaliação de Satisfação - Motoristas" style="width:100%;padding:0.6rem 0.8rem;border:1.5px solid #d1d5db;border-radius:8px;font-size:0.9rem;outline:none;box-sizing:border-box;" onfocus="this.style.borderColor='#0f4c81'" onblur="this.style.borderColor='#d1d5db'">
                    </div>
                    <div>
                        <label style="display:block;font-weight:600;font-size:0.85rem;color:#374151;margin-bottom:4px;">Tipo *</label>
                        <select id="ga-tipo" style="width:100%;padding:0.6rem 0.8rem;border:1.5px solid #d1d5db;border-radius:8px;font-size:0.9rem;outline:none;box-sizing:border-box;" onchange="window.gaChangeTipo(this.value)">
                            <option value="experiencia" ${template.tipo === 'experiencia' ? 'selected' : ''}>Experiência (6 campos/Soma)</option>
                            <option value="desempenho" ${template.tipo === 'desempenho' ? 'selected' : ''}>Desempenho (4 campos/Média)</option>
                            <option value="satisfacao" ${template.tipo === 'satisfacao' ? 'selected' : ''}>Satisfação (4 campos/Média)</option>
                        </select>
                    </div>
                    <div>
                        <label style="display:block;font-weight:600;font-size:0.85rem;color:#374151;margin-bottom:4px;">
                            Departamentos *
                            <span title="Selecione um ou mais departamentos que utilizarão esta avaliação" style="cursor:help;color:#94a3b8;font-size:0.78rem;"> (?)</span>
                        </label>
                        <div id="ga-dept-container" style="border:1.5px solid #d1d5db;border-radius:8px;padding:0.5rem;max-height:100px;overflow-y:auto;background:#fafafa;font-size:0.85rem;display:grid;grid-template-columns:1fr 1fr;gap:4px;">
                            <span style="color:#94a3b8;font-style:italic;grid-column:1/-1;">Carregando...</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- CATEGORIAS -->
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
                <h3 style="margin:0;font-size:1rem;color:#0f172a;">Categorias e Perguntas</h3>
                <button onclick="window.gaAdicionarCategoria()" style="background:#0f4c81;color:#fff;border:none;padding:0.5rem 1.1rem;border-radius:8px;cursor:pointer;font-weight:600;display:flex;align-items:center;gap:0.5rem;font-size:0.85rem;">
                    <i class="ph ph-plus"></i> Adicionar Categoria
                </button>
            </div>

            <div id="ga-categorias-container">
                ${catKeys.length === 0 ? '<p style="color:#94a3b8;text-align:center;padding:2rem;">Nenhuma categoria ainda. Clique em "Adicionar Categoria".</p>' : ''}
                ${catKeys.map((cat, idx) => gaRenderCatBlock(cat, categorias[cat], idx, template.tipo)).join('')}
            </div>

            <!-- BOTÕES DE AÇÃO -->
            <div style="display:flex;justify-content:flex-end;gap:1rem;margin-top:2rem;padding-top:1.5rem;border-top:1.5px solid #e2e8f0;">
                <button onclick="window.renderGerenciarAvaliacoes()" style="background:#f1f5f9;border:none;color:#475569;padding:0.65rem 1.5rem;border-radius:8px;cursor:pointer;font-weight:600;">
                    Cancelar
                </button>
                <button onclick="window.gaSalvarTemplate()" style="background:linear-gradient(135deg,#0f4c81,#1d6fb8);color:#fff;border:none;padding:0.65rem 1.8rem;border-radius:8px;cursor:pointer;font-weight:700;display:flex;align-items:center;gap:0.6rem;font-size:0.95rem;box-shadow:0 4px 12px rgba(15,76,129,0.3);">
                    <i class="ph ph-floppy-disk"></i> Salvar Template
                </button>
            </div>
        </div>
    `;

    // Contador de categorias para IDs únicos
    window._gaCatIdx = catKeys.length;

    // Buscar departamentos para preencher o multi-select
    try {
        const fetchDeptsUrl = typeof window.apiGet === 'function' ? '/departamentos' : '/api/departamentos'; // Padrão app.js
        const deptsRes = await fetch(fetchDeptsUrl.startsWith('/api') ? fetchDeptsUrl : '/api' + fetchDeptsUrl, {
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
        });
        const depts = await deptsRes.json();

        const containerDept = document.getElementById('ga-dept-container');
        if (containerDept && Array.isArray(depts)) {
            const keysChecked = (template.grupo_key || '').split(',').map(k => k.trim().toLowerCase());
            
            // Caso seja edição de padrão, forçar marcação baseado na chave existente
            const chavesPadroesMulti = keysChecked.filter(k => k && !depts.find(d => d.nome.toLowerCase().includes(k)));
            
            containerDept.innerHTML = depts.map(d => {
                const norm = d.nome.toLowerCase().replace(/\s+/g, '_');
                const isSelected = keysChecked.includes(norm) || (keysChecked.includes('motorista') && norm.includes('motorista')) || (keysChecked.includes('ajudante') && norm.includes('ajudante'));
                return `<label style="display:flex;align-items:center;gap:4px;cursor:pointer;"><input type="checkbox" value="${norm}" class="ga-dept-check" ${isSelected ? 'checked' : ''}> ${d.nome}</label>`;
            }).join('');
            
            // Se tiver chaves manuais (ex: motorista, pátio) que não estão na BD, adicionar fake checkboxes ocultos pra não perdê-las se não recadastrar
            chavesPadroesMulti.forEach(cp => {
                if (cp) containerDept.innerHTML += `<input type="checkbox" style="display:none;" value="${cp}" class="ga-dept-check" checked>`;
            });
        }
    } catch(e) { 
        console.warn('Erro ao carregar depts form', e);
        const containerDept = document.getElementById('ga-dept-container');
        if(containerDept) containerDept.innerHTML = '<span style="color:#ef4444;font-size:0.8rem;">Erro ao carregar departamentos. Atualize a página.</span>';
    }
}

function gaRenderCatBlock(catNome, perguntas, idx, tipoReq = null) {
    const pArr = Array.isArray(perguntas) ? perguntas : (perguntas ? Object.values(perguntas) : []);
    const p6 = [0,1,2,3,4,5].map(i => pArr[i] || '');
    const isExp = tipoReq === 'experiencia';

    return `
        <div class="ga-cat-block" data-idx="${idx}" style="background:#fff;border:1.5px solid #e2e8f0;border-radius:12px;margin-bottom:1rem;overflow:hidden;">
            <!-- Header da Categoria -->
            <div style="background:linear-gradient(90deg,#f0f7ff,#fff);padding:0.85rem 1.1rem;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e2e8f0; gap: 1rem;">
                <div style="display:flex;align-items:center;gap:0.75rem;flex:1;">
                    <i class="ph ph-tag" style="color:#0f4c81;font-size:1.1rem;"></i>
                    <input class="ga-cat-nome" value="${catNome.replace(/"/g, '&quot;')}" placeholder="Título da categoria (Ex: Liderança, Segurança)" title="Clique para editar" style="border:1.5px solid #cbd5e1;border-radius:6px;padding:0.5rem 0.6rem;background:#fff;font-weight:700;font-size:0.95rem;color:#0f172a;outline:none;flex:1;min-width:0;transition:all 0.2s;box-shadow:inset 0 1px 2px rgba(0,0,0,0.02);" onfocus="this.style.borderColor='#0f4c81'; this.style.boxShadow='0 0 0 3px rgba(15,76,129,0.1)'" onblur="this.style.borderColor='#cbd5e1'; this.style.boxShadow='inset 0 1px 2px rgba(0,0,0,0.02)'" />
                </div>
                <button onclick="this.closest('.ga-cat-block').remove()" style="background:#fef2f2;border:1px solid #fecaca;color:#ef4444;width:32px;height:32px;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center; flex-shrink:0;" title="Remover categoria">
                    <i class="ph ph-trash"></i>
                </button>
            </div>
            <!-- Perguntas -->
            <div style="padding:1rem 1.1rem;display:grid;gap:0.6rem;">
                ${p6.map((p, qi) => `
                    <div class="ga-pergunta-row-${qi+1}" style="display:${(!isExp && qi >= 4) ? 'none' : 'flex'};align-items:center;gap:0.6rem;">
                        <span style="background:#eff6ff;color:#0f4c81;font-weight:700;font-size:0.78rem;min-width:24px;height:24px;border-radius:6px;display:flex;align-items:center;justify-content:center;">${qi+1}</span>
                        <input class="ga-pergunta" value="${p.replace(/"/g, '&quot;')}" placeholder="Pergunta ${qi+1}..." style="flex:1;border:1.5px solid #e2e8f0;border-radius:8px;padding:0.5rem 0.75rem;font-size:0.87rem;outline:none;" onfocus="this.style.borderColor='#0f4c81'" onblur="this.style.borderColor='#e2e8f0'">
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

window.gaAdicionarCategoria = function () {
    const container = document.getElementById('ga-categorias-container');
    const tipoAtual = document.getElementById('ga-tipo')?.value || 'experiencia';
    // Remove placeholder se existir
    const placeholder = container.querySelector('p');
    if (placeholder) placeholder.remove();

    const idx = window._gaCatIdx || 0;
    window._gaCatIdx = idx + 1;

    const div = document.createElement('div');
    div.innerHTML = gaRenderCatBlock('', ['','','','','',''], idx, tipoAtual);
    container.appendChild(div.firstElementChild);

    // Scroll para nova categoria e foca no nome
    const newBlock = container.lastElementChild;
    newBlock.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    newBlock.querySelector('.ga-cat-nome')?.focus();
};

// ============================================================
// SALVAR TEMPLATE
// ============================================================
window.gaSalvarTemplate = async function () {
    const nome = document.getElementById('ga-nome')?.value.trim();
    const tipo = document.getElementById('ga-tipo')?.value;
    
    // Obter os departamentos selecionados
    const checks = document.querySelectorAll('.ga-dept-check:checked');
    const checkedValues = Array.from(checks).map(c => c.value);
    const grupo_key = checkedValues.join(',');

    if (!nome || !tipo || !grupo_key) {
        alert('Preencha todos os campos obrigatórios (Nome, Tipo) e selecione pelo menos um departamento.');
        return;
    }

    // Coletar categorias
    const blocks = document.querySelectorAll('.ga-cat-block');
    if (blocks.length === 0) {
        alert('Adicione ao menos uma categoria com perguntas.');
        return;
    }

    const categorias = {};
    let hasError = false;

    blocks.forEach(block => {
        const catNome = block.querySelector('.ga-cat-nome')?.value.trim();
        if (!catNome) { hasError = true; return; }
        const perguntas = Array.from(block.querySelectorAll('.ga-pergunta')).map(inp => inp.value.trim());
        if (perguntas.filter(p => p).length < 1) { hasError = true; return; }
        categorias[catNome] = perguntas;
    });

    if (hasError) {
        alert('Certifique-se de que todas as categorias têm nome e ao menos uma pergunta preenchida.');
        return;
    }

    const payload = { nome, tipo, grupo_key, categorias_json: JSON.stringify(categorias) };

    try {
        const btn = document.querySelector('button[onclick="window.gaSalvarTemplate()"]');
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Salvando...'; }

        const result = await gaApiCall(gaEditingId ? 'PUT' : 'POST', gaEditingId, payload);

        if (result.error) throw new Error(result.error);

        // Recarregar lista
        gaTemplates = await fetchGaTemplates();

        // Re-sincronizar com o objeto global de avaliações em uso
        gaSyncAvaliacaoQuestions();

        renderGaListPage();
        window._gaToast('Template salvo com sucesso!', 'success');
    } catch (e) {
        alert('Erro ao salvar: ' + e.message);
    }
};

// ============================================================
// EXCLUIR TEMPLATE
// ============================================================
window.gaExcluirTemplate = async function (id, nome) {
    if (!confirm(`Excluir o template "${nome}"?\n\nIsso NÃO apaga avaliações já realizadas, apenas o template de perguntas.`)) return;
    try {
        await gaApiCall('DELETE', id, null);
        gaTemplates = await fetchGaTemplates();
        gaSyncAvaliacaoQuestions();
        renderGaListPage();
        window._gaToast('Template excluído.', 'warning');
    } catch (e) {
        alert('Erro ao excluir: ' + e.message);
    }
};

// ============================================================
// SINCRONIZAR COM AVALIACAO_QUESTIONS GLOBAL
// (Os templates do banco enriquecem o objeto padrão em tempo real)
// ============================================================
function gaSyncAvaliacaoQuestions() {
    if (typeof AVALIACAO_QUESTIONS === 'undefined') return;
    gaTemplates.forEach(t => {
        try {
            const cats = JSON.parse(t.categorias_json);
            if (!AVALIACAO_QUESTIONS[t.tipo]) AVALIACAO_QUESTIONS[t.tipo] = {};
            // Suportar chave múltipla (comma-separated departments)
            const chaves = (t.grupo_key || '').split(',').map(c => c.trim()).filter(Boolean);
            chaves.forEach(ch => AVALIACAO_QUESTIONS[t.tipo][ch] = cats);
        } catch(e) {}
    });
}

// ============================================================
// TOAST SIMPLES
// ============================================================
window._gaToast = function(msg, type = 'success') {
    const colors = { success: '#10b981', warning: '#f59e0b', error: '#ef4444' };
    const toast = document.createElement('div');
    toast.style.cssText = `position:fixed;bottom:24px;right:24px;background:${colors[type] || colors.success};color:#fff;padding:0.9rem 1.4rem;border-radius:10px;font-weight:600;font-size:0.9rem;z-index:999999;box-shadow:0 8px 24px rgba(0,0,0,0.2);display:flex;align-items:center;gap:0.6rem;animation:fadeIn 0.25s ease;`;
    toast.innerHTML = `<i class="ph ph-check-circle"></i> ${msg}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
};

// ============================================================
// HOOK: Sincronizar templates ao inicializar o app
// ============================================================
(async function gaBootstrap() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const templates = await fetch('/api/avaliacao-templates', {
            headers: { 'Authorization': 'Bearer ' + token }
        }).then(r => r.json()).catch(() => []);
        gaTemplates = Array.isArray(templates) ? templates : [];
        gaSyncAvaliacaoQuestions();
    } catch(e) { /* silencioso na carga inicial */ }
})();
