// ============================================================
// MÓDULO DE FICHA DE EPI - v3
// ============================================================

let epiTemplates = [];
let editingEpiId = null;
let allDepartamentos = [];

const GRUPOS_OPERACIONAL = ['Manutenção', 'Limpeza', 'Motorista', 'Ajudante', 'Ajudante Pátio']; // legado — usado como fallback
const GRUPOS_ADMIN      = ['Escritório'];

const TERMO_PADRAO = '•Confirmo perante minha assinatura que recebi o Equipamento de Proteção Individual - EPI, da Empresa: AMERICA RENTAL EQUIPAMENTOS LTDA. Vinculada ao CNPJ: 03.434.448/0001-01 de Inscrição estadual IE: 336.715.410.116 conforme descrito abaixo, para uso exclusivo no local de trabalho, conforme regulamentação da Norma Regulamentadora Nº 6, do Ministério do Trabalho e Emprego.\n•Declaro que estou ciente da obrigatoriedade do uso do EPI e da responsabilidade de usá-lo e conservá-lo. Minha recusa injustificada na utilização deste equipamento ou seu mau uso, constitui ato faltoso, conforme disposto no artigo 158 da CLT.\n•Declaro estar ciente da obrigatoriedade da devolução do Equipamento atual, quando da troca ou substituição dos mesmos.';

// ============================================================
// BANCO LOCAL DE CAs CONHECIDOS
// ============================================================
const CA_DATABASE = {
    '42291':  'BOTA DE PVC CA 42.291',
    '43339':  'BOTA BICO DE AÇO CA 43.339',
    '31469':  'CAPACETE CA 31.469',
    '31413':  'CAPA DE CHUVA CA 31.413',
    '19176':  'ÓCULOS DE PROTEÇÃO CA 19.176',
    '34570':  'LUVA DE PVC VERDE CA34570',
    '5774':   'LUVA DE NEOLATEX CURTA EXG CA 5.774',
    '14781':  'RESPIRADOR PURIFICADOR DE AR CA 14.781',
    '39238':  'RESPIRADOR PURIFICADOR DE AR AZUL CA 39.238',
    '36817':  'PROTETOR AUDITIVO CA 36.817',
    '37931':  'LUVA DE HELANCA CA 37.931',
    '38975':  'LUVA NITRILICA CA 38.975',
    '34106':  'LUVA DE RASPA CA 34.106',
    '45596':  'MÁSCARA DE SOLDA CA 45.596',
    '11168':  'CINTO DE SEGURANÇA CA 11.168',
    '10015':  'PROTETOR SOLAR FPS30',
    '35941':  'AVENTAL DE RASPA CA 35.941',
    '18082':  'AVENTAL DE PLÁSTICO CA 18.082',
    '15819':  'LUVA DE NEOLATEX M CA 15.819',
    '28949':  'SAPATO ANTIDERRAPANTE CA 28.949',
    '37456':  'BOTA DE BICO DE PVC CA 37.456',
    '16311':  'ÓCULOS DE PROTEÇÃO CA 16.311',
};

function lookupCA(raw) {
    const key = raw.replace(/[.\s-]/g, '');
    return CA_DATABASE[key] || null;
}

window.onCaInput = function(input) {
    const match = lookupCA(input.value);
    const hint = document.getElementById('ca-lookup-hint');
    const addBtn = document.getElementById('ca-add-btn');
    const readonlyNome = document.getElementById('ca-nome-readonly');
    if (match) {
        hint.textContent = '✓ Encontrado na base';
        hint.style.color = '#16a34a';
        if(readonlyNome) readonlyNome.value = match;
        addBtn.disabled = false;
        addBtn.dataset.epiName = match;
    } else if (input.value.replace(/[.\s-]/g, '').length >= 4) {
        hint.textContent = 'CA não encontrado na base local — digite o nome manualmente';
        hint.style.color = '#f59e0b';
        if(readonlyNome) readonlyNome.value = '';
        addBtn.disabled = false;
        addBtn.dataset.epiName = '';
    } else {
        hint.textContent = '';
        if(readonlyNome) readonlyNome.value = '';
        addBtn.disabled = true;
        addBtn.dataset.epiName = '';
    }
};

window.addCaToList = function() {
    const input = document.getElementById('ca-numero-input');
    const addBtn = document.getElementById('ca-add-btn');
    const name = addBtn.dataset.epiName || '';
    if (name) {
        addEpiRow(name);
    } else {
    // CA não encontrado - abre linha vazia com CA pré-preenchido
        const caRaw = input.value.trim();
        addEpiRow(caRaw ? `CA ${caRaw}` : '');
    }
    input.value = '';
    const readonlyNome = document.getElementById('ca-nome-readonly');
    if(readonlyNome) readonlyNome.value = '';
    document.getElementById('ca-lookup-hint').textContent = '';
    addBtn.disabled = true;
    addBtn.dataset.epiName = '';
};

let headerLogoBase64 = null;
let headerLogoAspect = 0.11;
let _logoLoadPromise = null;

function ensureHeaderLogo() {
    if (headerLogoBase64) return Promise.resolve();
    if (_logoLoadPromise) return _logoLoadPromise;
    _logoLoadPromise = new Promise(resolve => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = `${API_URL.replace('/api', '')}/assets/logo-header.png`;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            canvas.getContext('2d').drawImage(img, 0, 0);
            headerLogoBase64 = canvas.toDataURL('image/png');
            headerLogoAspect = img.height / img.width;
            resolve();
        };
        img.onerror = () => resolve(); // fallback sem logo
    });
    return _logoLoadPromise;
}
window.ensureHeaderLogo = ensureHeaderLogo;

window.initEpiModule = function() {
    loadEpiTemplates();
    loadDeptList();
    ensureHeaderLogo();
};

// Restaura Ajudante se tiver sido editado incorretamente (chamado manualmente se necessário)
window.restaurarAjudante = async function() {
    const epis = ['BOTA DE PVC CA 42.291','BOTA BICO DE AÇO CA 43.339','CAPACETE CA 31.469','CAPA DE CHUVA CA 31.413','ÓCULOS DE PROTEÇÃO CA 19.176','LUVA DE PVC VERDE CA34570','LUVA DE NEOLATEX CURTA EXG CA 5.774','RESPIRADOR PURIFICADOR DE AR CA 14.781','PROTETOR SOLAR FPS30','PROTETOR AUDITIVO CA 36.817','BONÉ','CALÇA','CAMISETA MANGA CURTA','CAMISETA MANGA LONGA'];
    const grupos = ['Ajudante', 'Ajudante Pátio'];
    const depts  = { 'Ajudante': ['Ajudante'], 'Ajudante Pátio': ['Ajudante Pátio'] };
    for (const g of grupos) {
        const t = epiTemplates.find(x => x.grupo === g);
        if (!t) continue;
        await fetch(`${API_URL}/epi-templates/${t.id}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${currentToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ grupo: g, departamentos: depts[g], epis, termo_texto: TERMO_PADRAO, rodape_texto: 'LIBERAÇÃO DO EQUIPAMENTO DE SEGURANÇA SOMENTE APÓS ASSINATURA DESTE TERMO.' })
        });
    }
    await loadEpiTemplates();
    alert('Ajudante e Ajudante Pátio restaurados com sucesso!');
};

async function loadEpiTemplates() {
    try {
        const res = await fetch(`${API_URL}/epi-templates`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        epiTemplates = await res.json();
        renderEpiPage();
    } catch (e) {
        const c = document.getElementById('epi-cards-container');
        if (c) c.innerHTML = `<div class="alert alert-danger">Erro ao carregar templates de EPI.</div>`;
    }
}

async function loadDeptList() {
    try {
        const res = await fetch(`${API_URL}/departamentos`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        const depts = await res.json();
        allDepartamentos = depts.map(d => d.nome).sort();
    } catch (e) {}
}

// ============================================================
// RENDERIZAÇÃO PRINCIPAL - Layout com seções
// ============================================================
function renderEpiPage() {
    const container = document.getElementById('epi-cards-container');
    if (!container) return;

    // Agrupar usando campo 'categoria' (persistido no banco); fallback para listas legadas
    const getCat = (t) => {
        if (t.categoria === 'Operacional') return 'Operacional';
        if (t.categoria === 'Administrativo') return 'Administrativo';
        // fallback para templates sem categoria no banco
        if (GRUPOS_OPERACIONAL.includes(t.grupo)) return 'Operacional';
        if (GRUPOS_ADMIN.includes(t.grupo)) return 'Administrativo';
        return 'Outros';
    };
    const operacional = epiTemplates.filter(t => getCat(t) === 'Operacional');
    const admin       = epiTemplates.filter(t => getCat(t) === 'Administrativo');
    const outros      = epiTemplates.filter(t => getCat(t) === 'Outros');

    function renderSection(title, color, dot, templates, showEmpty) {
        const cards = templates.length ? `
            <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(320px, 1fr)); gap:1rem;">
                ${templates.map(t => renderEpiCard(t)).join('')}
            </div>` :
            (showEmpty ? `<div style="background:#f8fafc;border:1.5px dashed #cbd5e1;border-radius:12px;padding:2rem;text-align:center;color:#94a3b8;">
                <i class="ph ph-shield-check" style="font-size:2.5rem;display:block;margin-bottom:0.5rem;"></i>
                Nenhum template nesta categoria. Clique em <strong>"Novo Grupo"</strong> para criar.
            </div>` : '');

        return `
            <div style="margin-bottom:2rem;">
                <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1rem;padding-bottom:0.5rem;border-bottom:2px solid #e2e8f0;">
                    <div style="width:10px;height:10px;border-radius:50%;background:${dot};"></div>
                    <h3 style="margin:0;font-size:1rem;font-weight:700;color:#0f172a;">${title}</h3>
                    <span style="background:${dot};color:#fff;font-size:0.75rem;font-weight:700;padding:2px 10px;border-radius:999px;">${templates.length} grupo${templates.length !== 1 ? 's' : ''}</span>
                </div>
                ${cards}
            </div>`;
    }

    let html = renderSection('Equipe Operacional', '#0f4c81', '#0f4c81', operacional, true);
    html    += renderSection('Equipe Administrativa', '#8b5cf6', '#8b5cf6', admin, true);
    if (outros.length) {
        html += renderSection('Outros', '#64748b', '#64748b', outros, false);
    }

    container.innerHTML = `<div style="padding:0.5rem 0;">${html}</div>`;
}

function renderEpiCard(t) {
    if (!window._epiCardMap) window._epiCardMap = {};
    const mapKey = 'e_' + Math.random().toString(36).substr(2, 9);
    window._epiCardMap[mapKey] = t.id;

    return `
        <div style="background:#fff;border:1.5px solid #e2e8f0;border-radius:12px;overflow:hidden;box-shadow:0 2px 6px rgba(0,0,0,0.05);transition:box-shadow 0.2s;"
             onmouseover="this.style.boxShadow='0 6px 20px rgba(0,0,0,0.1)'" onmouseout="this.style.boxShadow='0 2px 6px rgba(0,0,0,0.05)'">
            <div style="background:#f8fafc;border-bottom:1.5px solid #e2e8f0;padding:0.85rem 1rem;display:flex;justify-content:space-between;align-items:center;">
                <div style="flex:1;min-width:0;">
                    <p style="margin:0;font-weight:700;color:#0f172a;font-size:0.95rem;">${t.grupo}</p>
                    <span style="font-size:0.75rem;color:#64748b;">${(t.departamentos||[]).join(', ') || '—'}</span>
                </div>
                <div style="display:flex;gap:0.35rem;flex-shrink:0;">
                    <button onclick="window.openEpiVizualizarModal('${mapKey}')" title="Visualizar modelo da ficha"
                            class="btn btn-secondary btn-sm" style="height:32px;width:32px;padding:0;display:flex;align-items:center;justify-content:center;">
                        <i class="ph ph-eye"></i>
                    </button>
                    <button onclick="window.openEpiModal(${t.id})" title="Editar template"
                            class="btn btn-sm" style="background:#f59e0b;color:#fff;border:none;height:32px;width:32px;padding:0;display:flex;align-items:center;justify-content:center;">
                        <i class="ph ph-pencil-simple"></i>
                    </button>
                </div>
            </div>
            <div style="padding:0.7rem 1rem;">
                <p style="margin:0 0 0.4rem;font-size:0.75rem;color:#64748b;font-weight:600;">${(t.epis||[]).length} EPI(S):</p>
                <div style="display:flex;flex-wrap:wrap;gap:0.3rem;">
                    ${(t.epis||[]).map(e => `<span style="background:#eff6ff;border:1px solid #bfdbfe33;color:#1e40af;font-size:0.73rem;padding:2px 8px;border-radius:999px;">${e}</span>`).join('')}
                </div>
            </div>
        </div>`;
}

// ============================================================
// VISUALIZAR MODELO (sem colaborador) — ícone 👁️
// ============================================================
window.openEpiVizualizarModal = function(mapKey) {
    const id = window._epiCardMap[mapKey];
    const template = epiTemplates.find(t => t.id === id);
    if (!template) return;

    // Preview com dados de modelo
    const colabModelo = {
        nome: 'NOME DO COLABORADOR',
        rg: '00.000.000-0',
        cpf: '000.000.000-00',
        cargo: template.departamentos[0] || template.grupo,
        dept: template.grupo.toUpperCase(),
        admissao: ''
    };
    abrirPreviewEpi(template, colabModelo);
};

// GERAR para colaborador específico — ícone 👤
window.abrirGerarParaColab = function(mapKey) {
    const id = window._epiCardMap[mapKey];
    window.gerarFichaEpi(id);
};

window.gerarFichaEpi = function(templateId) {
    const template = epiTemplates.find(t => t.id === templateId);
    if (!template) return;

    const modal = document.getElementById('modal-epi-gerar');
    if (!modal) return;

    document.getElementById('epi-gerar-template-id').value = templateId;
    document.getElementById('epi-gerar-grupo-label').textContent = `${template.grupo} — ${(template.epis||[]).length} EPI(s)`;

    loadColaboradoresParaEpi(template.departamentos || []);
    modal.style.display = 'flex';
};

async function loadColaboradoresParaEpi(departamentos) {
    const select = document.getElementById('epi-gerar-colab-select');
    select.innerHTML = '<option value="">Carregando...</option>';
    try {
        const res = await fetch(`${API_URL}/colaboradores`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        const colaboradores = await res.json();
        const filtered = colaboradores
            .filter(c => !departamentos.length || departamentos.includes(c.departamento))
            .sort((a, b) => a.nome_completo.localeCompare(b.nome_completo));

        if (!filtered.length) {
            select.innerHTML = '<option value="">Nenhum colaborador neste departamento</option>';
            return;
        }
        select.innerHTML = '<option value="">Selecione o colaborador...</option>' +
            filtered.map(c => `<option value="${c.id}"
                data-nome="${c.nome_completo}"
                data-rg="${c.rg||''}" data-cpf="${c.cpf||''}"
                data-cargo="${c.cargo||''}" data-dept="${c.departamento||''}"
                data-admissao="${c.data_admissao||''}"
            >${c.nome_completo} — ${c.departamento || ''}</option>`).join('');
    } catch (e) {
        select.innerHTML = '<option value="">Erro ao carregar</option>';
    }
}

window.closeEpiGerarModal = function() {
    const modal = document.getElementById('modal-epi-gerar');
    if (modal) modal.style.display = 'none';
};

window.confirmarGerarFichaEpi = function() {
    const templateId = parseInt(document.getElementById('epi-gerar-template-id').value);
    const template = epiTemplates.find(t => t.id === templateId);
    if (!template) return;

    const select = document.getElementById('epi-gerar-colab-select');
    const opt = select.options[select.selectedIndex];
    if (!opt || !opt.value) return alert('Selecione um colaborador.');

    const colab = {
        nome: opt.dataset.nome, rg: opt.dataset.rg, cpf: opt.dataset.cpf,
        cargo: opt.dataset.cargo, dept: opt.dataset.dept, admissao: opt.dataset.admissao
    };

    window.closeEpiGerarModal();
    // Gera PDF e abre preview 100% tela
    abrirPreviewEpi(template, colab);
};

// ============================================================
// PREVIEW FULLSCREEN
// ============================================================
function abrirPreviewEpi(template, colab) {
    const { jsPDF } = window.jspdf;
    const doc = gerarDocEpi(template, colab, jsPDF);
    const dataUri = doc.output('datauristring');
    const nomeArq = `Ficha_EPI_${template.grupo.replace(/\s+/g,'_')}_${colab.nome.replace(/\s+/g,'_')}.pdf`;

    // Remove overlay anterior se existir
    const old = document.getElementById('epi-preview-overlay');
    if (old) old.remove();

    const overlay = document.createElement('div');
    overlay.id = 'epi-preview-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#1e293b;display:flex;flex-direction:column;';

    overlay.innerHTML = `
        <div style="background:#0f172a;padding:0.75rem 1.5rem;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #334155;flex-shrink:0;">
            <div style="display:flex;align-items:center;gap:0.75rem;">
                <i class="ph ph-shield-check" style="color:#60a5fa;font-size:1.3rem;"></i>
                <span style="color:#f1f5f9;font-weight:700;font-size:0.97rem;">Ficha de EPI — ${template.grupo}</span>
                <span style="color:#94a3b8;font-size:0.82rem;">${colab.nome}</span>
            </div>
            <div style="display:flex;gap:0.75rem;align-items:center;">
                <a href="${dataUri}" download="${nomeArq}"
                   style="background:#0f4c81;color:#fff;border:none;padding:0.5rem 1.25rem;border-radius:8px;font-weight:700;font-size:0.88rem;cursor:pointer;display:flex;align-items:center;gap:0.5rem;text-decoration:none;">
                    <i class="ph ph-download"></i> Baixar PDF
                </a>
                <button onclick="document.getElementById('epi-preview-overlay').remove()"
                        style="background:#334155;color:#f1f5f9;border:none;padding:0.5rem 1.1rem;border-radius:8px;font-weight:700;font-size:0.88rem;cursor:pointer;display:flex;align-items:center;gap:0.5rem;">
                    <i class="ph ph-x"></i> Fechar
                </button>
            </div>
        </div>
        <iframe src="${dataUri}" style="flex:1;border:none;width:100%;"></iframe>
    `;

    document.body.appendChild(overlay);
}

// ============================================================
// MODAL EDITAR TEMPLATE EPI
// ============================================================
window.openEpiModal = function(id) {
    editingEpiId = id || null;
    const t = id ? epiTemplates.find(x => x.id === id) : null;

    const modal = document.getElementById('modal-epi');
    if (!modal) return;

    document.getElementById('epi-modal-title').textContent = t ? `Editar: ${t.grupo}` : 'Novo Grupo de EPI';
    document.getElementById('epi-grupo-input').value = t ? t.grupo : '';
    document.getElementById('epi-termo-input').value = t ? (t.termo_texto || TERMO_PADRAO) : TERMO_PADRAO;
    document.getElementById('epi-rodape-input').value = t ? (t.rodape_texto || '') : 'LIBERAÇÃO DO EQUIPAMENTO DE SEGURANÇA SOMENTE APÓS ASSINATURA DESTE TERMO.';

    const deptContainer = document.getElementById('epi-dept-checkboxes');
    const selectedDepts = t ? (t.departamentos || []) : [];
    deptContainer.innerHTML = allDepartamentos.map(d => {
        const checked = selectedDepts.includes(d);
        return `<label style="display:flex;align-items:center;gap:6px;font-size:0.85rem;cursor:pointer;padding:4px 10px;border-radius:6px;
            background:${checked ? '#eff6ff' : '#f8fafc'};border:1px solid ${checked ? '#bfdbfe' : '#e2e8f0'};white-space:nowrap;">
            <input type="checkbox" value="${d}" ${checked ? 'checked' : ''}
                onchange="this.closest('label').style.background=this.checked?'#eff6ff':'#f8fafc';this.closest('label').style.borderColor=this.checked?'#bfdbfe':'#e2e8f0';"> ${d}
        </label>`;
    }).join('');

    // Só mostra "Departamentos vinculados" para grupo Escritório ou novos grupos
    const grupoAtual = t ? t.grupo : '';
    const isEscritorioOuNovo = !t || GRUPOS_ADMIN.includes(grupoAtual);
    const deptSection = deptContainer.parentElement;
    if (deptSection) deptSection.style.display = isEscritorioOuNovo ? '' : 'none';

    const episList = document.getElementById('epi-items-list');
    episList.innerHTML = '';
    (t ? (t.epis || []) : []).forEach(epi => addEpiRow(epi));

    // Guardar categoria para preservar ao salvar (não deixa mudar de equipe por troca de nome)
    document.getElementById('epi-grupo-input').dataset.categoria = t ? (t.categoria || '') : '';

    modal.style.display = 'flex';
};

function addEpiRow(value = '') {
    const list = document.getElementById('epi-items-list');
    const row = document.createElement('div');
    row.style.cssText = 'display:flex; gap:0.5rem; margin-bottom:0.4rem; align-items:center;';
    row.innerHTML = `
        <i class="ph ph-dots-six-vertical" style="cursor:grab;color:#94a3b8;font-size:1.1rem;flex-shrink:0;"></i>
        <input type="text" class="form-control epi-item-input" value="${value.replace(/"/g, '&quot;')}"
               placeholder="Nome do EPI..." style="height:36px;font-size:0.87rem;flex:1;">
        <button type="button" onclick="this.closest('div').remove()"
                style="background:none;border:none;color:#e03131;cursor:pointer;font-size:1.1rem;flex-shrink:0;">
            <i class="ph ph-x-circle"></i>
        </button>`;
    list.appendChild(row);
}

window.addEpiItemRow = function() { addEpiRow(); };

window.addEpiManual = function() {
    const caInput = document.getElementById('ca-manual-input');
    const nomeInput = document.getElementById('epi-nome-manual');
    const ca = (caInput ? caInput.value.trim() : '');
    const nome = (nomeInput ? nomeInput.value.trim() : '');
    if (!nome) { if(nomeInput) nomeInput.focus(); return; }
    const label = ca ? `${nome} CA ${ca}` : nome;
    addEpiRow(label);
    if(caInput) caInput.value = '';
    if(nomeInput) { nomeInput.value = ''; nomeInput.focus(); }
};

window.closeEpiModal = function() {
    const modal = document.getElementById('modal-epi');
    if (modal) modal.style.display = 'none';
    editingEpiId = null;
};

window.saveEpiTemplate = async function() {
    const grupo = document.getElementById('epi-grupo-input').value.trim();
    if (!grupo) return alert('Informe o nome do grupo.');

    const departamentos = [...document.querySelectorAll('#epi-dept-checkboxes input:checked')].map(cb => cb.value);
    const epis = [...document.querySelectorAll('.epi-item-input')].map(i => i.value.trim()).filter(Boolean);
    const termo_texto = document.getElementById('epi-termo-input').value.trim();
    const rodape_texto = document.getElementById('epi-rodape-input').value.trim();

    const categoriaAtual = document.getElementById('epi-grupo-input').dataset.categoria || '';
    const payload = { grupo, departamentos, epis, termo_texto, rodape_texto, categoria: categoriaAtual || undefined };
    const url    = editingEpiId ? `${API_URL}/epi-templates/${editingEpiId}` : `${API_URL}/epi-templates`;
    const method = editingEpiId ? 'PUT' : 'POST';

    try {
        const res = await fetch(url, {
            method, headers: { 'Authorization': `Bearer ${currentToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error();
        window.closeEpiModal();
        await loadEpiTemplates();
    } catch (e) {
        alert('Erro ao salvar template.');
    }
};

window.deleteEpiTemplate = async function(id) {
    if (!confirm('Excluir este template de EPI?')) return;
    await fetch(`${API_URL}/epi-templates/${id}`, {
        method: 'DELETE', headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    await loadEpiTemplates();
};

// ============================================================
// GERADOR PDF - FRENTE E VERSO
// ============================================================
function fmtData(str) {
    if (!str) return '—';
    const p = str.split('-');
    return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : str;
}

function pdfHeader(doc, W) {
    let y = 8;
    
    if (headerLogoBase64 && headerLogoAspect) {
        let lW = W - 26;
        let lH = lW * headerLogoAspect;
        if (lH > 28) { lH = 28; lW = lH / headerLogoAspect; }
        doc.addImage(headerLogoBase64, 'PNG', W/2 - lW/2, y, lW, lH);
        y += lH + 4;
    } else {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(13, 71, 161);
        doc.text('AMERICA Rental', W / 2, y, { align: 'center' });
        y += 8;
    }
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text('RECURSOS HUMANOS - NR 06', W / 2, y, { align: 'center' });
    y += 5;
    doc.text('FICHA OBRIGATÓRIA DE E.P.I (RECIBO DE ENTREGA)', W / 2, y, { align: 'center' });
    return y + 4;
}

function pdfColabBox(doc, W, margin, y, colab) {
    const boxH = 18;
    doc.setLineWidth(0.3);
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, W - margin * 2, 6, 'FD');
    doc.rect(margin, y, W - margin * 2, boxH);
    
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(30, 41, 59);
    doc.text('DADOS DO COLABORADOR', margin + 3, y + 4.2);
    
    y += 6;
    const col1 = margin + 3;
    const col2 = W / 2 + 10;
    
    // Row 1
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(0, 0, 0);
    doc.text(`NOME:`, col1, y + 4.5);
    doc.setFont('helvetica', 'normal');
    doc.text(colab.nome || '—', col1 + 10, y + 4.5);
    
    doc.setFont('helvetica', 'bold');
    doc.text(`ADMISSÃO:`, col2, y + 4.5);
    doc.setFont('helvetica', 'normal');
    doc.text(fmtData(colab.admissao), col2 + 18, y + 4.5);
    
    // Row 2
    doc.setFont('helvetica', 'bold');
    doc.text(`RG:`, col1, y + 9.5);
    doc.setFont('helvetica', 'normal');
    doc.text(colab.rg || '—', col1 + 6, y + 9.5);
    
    doc.setFont('helvetica', 'bold');
    doc.text(`CPF:`, col1 + 40, y + 9.5);
    doc.setFont('helvetica', 'normal');
    // Align CPF right next to its label safely
    doc.text(colab.cpf || '—', col1 + 48, y + 9.5);
    
    doc.setFont('helvetica', 'bold');
    doc.text(`CARGO:`, col2, y + 9.5);
    doc.setFont('helvetica', 'normal');
    doc.text(colab.cargo || '—', col2 + 13, y + 9.5);
    
    return y + boxH - 6 + 4;
}

function pdfEntregaTable(doc, W, margin, y, linhas) {
    // linhas: array of {data, descricao, assinatura_base64} or null for blank rows
    const colW = [28, 110, W - margin * 2 - 138];
    const heads = ['DATA', 'DESCRIÇÃO DE E.P.I', 'Ass. do Colaborador'];
    const hH = 8, rH = 10;
    let cx = margin;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(0, 0, 0);
    heads.forEach((h, i) => {
        doc.setFillColor(228, 235, 245);
        doc.setLineWidth(0.3); doc.rect(cx, y, colW[i], hH, 'FD');
        doc.text(h, cx + colW[i] / 2, y + 5, { align: 'center' }); cx += colW[i];
    });
    y += hH;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    linhas.forEach(ln => {
        cx = margin;
        colW.forEach(w => { doc.setLineWidth(0.2); doc.rect(cx, y, w, rH); cx += w; });
        if (ln && typeof ln === 'object') {
            if (ln.data) doc.text(ln.data, margin + 2, y + 6.5);
            if (ln.descricao) {
                const wrapped = doc.splitTextToSize(ln.descricao, colW[1] - 4);
                doc.text(wrapped[0] + (wrapped.length > 1 ? '...' : ''), margin + colW[0] + 2, y + 6.5);
            }
            if (ln.assinatura_base64) {
                try {
                    const sigX = margin + colW[0] + colW[1] + 2;
                    const maxH = rH - 1;
                    const maxW = colW[2] - 4;
                    const imgW = maxH * 3 > maxW ? maxW : maxH * 3;
                    const imgH = maxH * 3 > maxW ? maxW / 3 : maxH;
                    const offsetX = sigX + (colW[2] - imgW) / 2 - 1;
                    const offsetY = y + (rH - imgH) / 2;
                    doc.addImage(ln.assinatura_base64, 'PNG', offsetX, offsetY, imgW, imgH);
                } catch(e) {}
            }
        }
        y += rH;
    });
    return y;
}

window.gerarDocEpi = function gerarDocEpi(template, colab, jsPDF, linhasFilled) {
    const entries = linhasFilled || [];
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = 210, margin = 13;

    // FRENTE
    let y = pdfHeader(doc, W);
    y = pdfColabBox(doc, W, margin, y, colab);

    const epis = template.epis || [];
    const colMid = W / 2 + 4;
    const hdrH = 8, rowH = 6.8;
    const numBodyRows = epis.length;
    const bodyH = numBodyRows * rowH;
    const tableTop = y;

    doc.setFillColor(228, 235, 245);
    doc.setLineWidth(0.3);
    doc.rect(margin, tableTop, colMid - margin, hdrH, 'FD');
    doc.rect(colMid, tableTop, W - margin - colMid, hdrH, 'FD');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(0, 0, 0);
    doc.text('LISTA DE E.P.I NESCESSÁRIO', (margin + colMid) / 2, tableTop + 5.5, { align: 'center' });
    doc.text('TERMO DE RESPONSABILIDADE', (colMid + W - margin) / 2, tableTop + 5.5, { align: 'center' });
    y = tableTop + hdrH;

    doc.setLineWidth(0.25);
    doc.rect(margin, y, colMid - margin, bodyH);
    doc.rect(colMid, y, W - margin - colMid, bodyH);

    const toTitleCase = s => s.replace(/wS*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());

    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    epis.forEach((epi, i) => {
        const ry = y + (i * rowH) + rowH - 2;
        doc.text(toTitleCase(epi), margin + 2, ry);
        doc.setLineWidth(0.1);
        doc.line(margin, y + (i + 1) * rowH, colMid, y + (i + 1) * rowH);
    });

    const termoItems = (template.termo_texto || TERMO_PADRAO).split('\n');
    let termoY = y + 5;
    doc.setFontSize(8.5);
    termoItems.forEach(linha => {
        const wrapped = doc.splitTextToSize(linha, W - margin - colMid - 5);
        wrapped.forEach(l => {
            if (termoY < y + bodyH - 20) { doc.text(l, colMid + 2.5, termoY); termoY += 4.2; }
        });
        termoY += 2;
    });

    // Assinatura do empregado
    const assinY = y + bodyH - 8;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    doc.text('X', colMid + 8, assinY - 1);
    doc.setLineWidth(0.3); doc.line(colMid + 8, assinY, W - margin - 4, assinY);
    doc.text('ASSINATURA DO EMPREGADO', (colMid + W - margin) / 2, assinY + 5, { align: 'center' });
    if (entries.length > 0 && entries[0].assinatura_base64) {
        try {
            const sigW = W - margin - 4 - (colMid + 8);
            const imgH = 9;
            const imgW = imgH * 3 > sigW ? sigW : imgH * 3;
            const offsetX = colMid + 8 + (sigW - imgW) / 2;
            doc.addImage(entries[0].assinatura_base64, 'PNG', offsetX, assinY - 9, imgW, imgH);
        } catch(e) {}
    }

    y = y + bodyH + 6;

    const bottomSafe = 20;
    const availableHFront = 297 - y - bottomSafe;
    const rH_entry = 10;
    const rowsPage1 = Math.max(4, Math.floor((availableHFront - 8) / rH_entry));

    const entriesPage1 = entries.slice(0, rowsPage1);
    const blanksPage1 = rowsPage1 - entriesPage1.length;
    const linhasPage1 = [...entriesPage1, ...Array(blanksPage1).fill(null)];
    y = pdfEntregaTable(doc, W, margin, y, linhasPage1);

    const rodapeY1 = 297 - 14;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
    doc.text(template.rodape_texto || 'LIBERAÇÃO DO EQUIPAMENTO DE SEGURANÇA SOMENTE APÓS ASSINATURA DESTE TERMO.', W / 2, rodapeY1, { align: 'center' });

    // VERSO e PÁGINAS ADICIONAIS INFINITAS
    let remainingEntries = entries.slice(rowsPage1);
    
    while (remainingEntries.length > 0) {
        doc.addPage();
        let currY = pdfHeader(doc, W);
        currY = pdfColabBox(doc, W, margin, currY, colab);

        const stampReserve = 52;
        const availableHBack = 297 - currY - stampReserve;
        const rowsPageN = Math.max(12, Math.floor((availableHBack - 8) / rH_entry));
        
        const entriesPageN = remainingEntries.slice(0, rowsPageN);
        const blanksPageN = rowsPageN - entriesPageN.length;
        const linhasPageN = [...entriesPageN, ...Array(Math.max(0, blanksPageN)).fill(null)];
        
        currY = pdfEntregaTable(doc, W, margin, currY, linhasPageN);
        remainingEntries = remainingEntries.slice(rowsPageN);

        const rodapeYN = 297 - stampReserve + 2;
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(0,0,0);
        doc.text(template.rodape_texto || 'LIBERAÇÃO DO EQUIPAMENTO DE SEGURANÇA SOMENTE APÓS ASSINATURA DESTE TERMO.', W / 2, rodapeYN, { align: 'center' });

        const stampW = 85, stampX = W / 2 - stampW / 2;
        let stampY = rodapeYN + 6;
        if (headerLogoBase64 && headerLogoAspect) {
            let slW = 42, slH = slW * headerLogoAspect;
            if (slH > 14) { slH = 14; slW = slH / headerLogoAspect; }
            doc.addImage(headerLogoBase64, 'PNG', stampX + stampW/2 - slW/2, stampY, slW, slH);
            let my = stampY + slH + 3;
            doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5);
            doc.text('AMÉRICA RENTAL EQUIPAMENTOS LTDA - ME', stampX + stampW/2, my, { align: 'center' });
            doc.setFontSize(7);
            doc.text('CNPJ: 03.434.448/0001-01', stampX + stampW/2, my + 4, { align: 'center' });
        } else {
            doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
            doc.text('AMERICA RENTAL EQUIPAMENTOS LTDA', stampX + stampW/2, stampY + 8, { align: 'center' });
            doc.setFontSize(7.5);
            doc.text('CNPJ: 03.434.448/0001-01', stampX + stampW/2, stampY + 13, { align: 'center' });
        }
    }

    return doc;
}
