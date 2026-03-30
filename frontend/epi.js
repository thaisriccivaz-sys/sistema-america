// ============================================================
// MÓDULO DE FICHA DE EPI - v2 (frente e verso)
// ============================================================

let epiTemplates = [];
let editingEpiId = null;
let allDepartamentos = [];

window.initEpiModule = function() {
    loadEpiTemplates();
    loadDeptList();
};

async function loadEpiTemplates() {
    try {
        const res = await fetch(`${API_URL}/epi-templates`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        epiTemplates = await res.json();
        renderEpiCards();
    } catch (e) {
        console.error('Erro ao carregar templates EPI', e);
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

function renderEpiCards() {
    const container = document.getElementById('epi-cards-container');
    if (!container) return;

    if (!epiTemplates.length) {
        container.innerHTML = `<div class="alert alert-info"><i class="ph ph-info"></i> Nenhum template de EPI cadastrado. Clique em "+ Novo Grupo" para criar.</div>`;
        return;
    }

    container.innerHTML = epiTemplates.map(t => `
        <div class="card" style="margin-bottom:1rem; border-radius:12px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.07);">
            <div style="background: linear-gradient(135deg, #0f4c81, #1e6bb8); padding: 1rem 1.5rem; display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <h3 style="margin:0; font-size:1.1rem; color:#fff; font-weight:700;">
                        <i class="ph ph-shield-check" style="margin-right:0.5rem;"></i>${t.grupo}
                    </h3>
                    <p style="margin:4px 0 0; color:rgba(255,255,255,0.75); font-size:0.82rem;">
                        Departamentos: ${(t.departamentos || []).join(', ') || '—'} &nbsp;·&nbsp; ${(t.epis||[]).length} EPI(s)
                    </p>
                </div>
                <div style="display:flex; gap:0.5rem; flex-wrap:wrap; justify-content:flex-end;">
                    <button class="btn btn-secondary" onclick="window.openEpiModal(${t.id})" style="background:rgba(255,255,255,0.15); color:#fff; border:1px solid rgba(255,255,255,0.3); height:36px; font-size:0.82rem;">
                        <i class="ph ph-pencil"></i> Editar
                    </button>
                    <button class="btn btn-secondary" onclick="window.gerarFichaEpi(${t.id})" style="background:#f59e0b; color:#fff; border:none; height:36px; font-size:0.82rem;">
                        <i class="ph ph-file-pdf"></i> Gerar Ficha
                    </button>
                    <button class="btn btn-danger" onclick="window.deleteEpiTemplate(${t.id})" style="height:36px; font-size:0.82rem;">
                        <i class="ph ph-trash"></i>
                    </button>
                </div>
            </div>
            <div style="padding:0.75rem 1.5rem; background:#f8fafc; border-top:1px solid #e2e8f0;">
                <div style="display:flex; flex-wrap:wrap; gap:0.35rem;">
                    ${(t.epis || []).map(e => `<span style="background:#e0eaff; color:#1e40af; font-size:0.78rem; font-weight:600; padding:2px 8px; border-radius:20px;">${e}</span>`).join('')}
                </div>
            </div>
        </div>
    `).join('');
}

window.openEpiModal = function(id) {
    editingEpiId = id || null;
    const t = id ? epiTemplates.find(x => x.id === id) : null;

    const modal = document.getElementById('modal-epi');
    if (!modal) return;

    document.getElementById('epi-modal-title').textContent = t ? `Editar: ${t.grupo}` : 'Novo Grupo de EPI';
    document.getElementById('epi-grupo-input').value = t ? t.grupo : '';
    document.getElementById('epi-termo-input').value = t ? (t.termo_texto || '') : '•Confirmo perante minha assinatura que recebi o Equipamento de Proteção Individual - EPI, da Empresa: AMERICA RENTAL EQUIPAMENTOS LTDA.';
    document.getElementById('epi-rodape-input').value = t ? (t.rodape_texto || '') : 'LIBERAÇÃO DO EQUIPAMENTO DE SEGURANÇA SOMENTE APÓS ASSINATURA DESTE TERMO.';

    const deptContainer = document.getElementById('epi-dept-checkboxes');
    const selectedDepts = t ? (t.departamentos || []) : [];
    deptContainer.innerHTML = allDepartamentos.map(d => `
        <label style="display:flex; align-items:center; gap:6px; font-size:0.87rem; cursor:pointer; padding:4px 8px; border-radius:6px; background:${selectedDepts.includes(d) ? '#eff6ff' : '#f8fafc'}; border:1px solid ${selectedDepts.includes(d) ? '#bfdbfe' : '#e2e8f0'};">
            <input type="checkbox" value="${d}" ${selectedDepts.includes(d) ? 'checked' : ''} onchange="this.closest('label').style.background = this.checked ? '#eff6ff' : '#f8fafc'; this.closest('label').style.borderColor = this.checked ? '#bfdbfe' : '#e2e8f0';"> ${d}
        </label>
    `).join('');

    const episList = document.getElementById('epi-items-list');
    episList.innerHTML = '';
    (t ? (t.epis || []) : []).forEach(epi => addEpiRow(epi));

    modal.style.display = 'flex';
};

function addEpiRow(value = '') {
    const list = document.getElementById('epi-items-list');
    const row = document.createElement('div');
    row.style.cssText = 'display:flex; gap:0.5rem; margin-bottom:0.4rem; align-items:center;';
    row.innerHTML = `
        <i class="ph ph-dots-six-vertical" style="cursor:grab; color:#94a3b8; font-size:1.1rem;"></i>
        <input type="text" class="form-control epi-item-input" value="${value.replace(/"/g, '&quot;')}" placeholder="Nome do EPI..." style="height:36px; font-size:0.87rem;">
        <button type="button" onclick="this.closest('div').remove()" style="background:none; border:none; color:#e03131; cursor:pointer; font-size:1.1rem;"><i class="ph ph-x-circle"></i></button>
    `;
    list.appendChild(row);
}

window.addEpiItemRow = function() { addEpiRow(); };

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

    const payload = { grupo, departamentos, epis, termo_texto, rodape_texto };
    const url = editingEpiId ? `${API_URL}/epi-templates/${editingEpiId}` : `${API_URL}/epi-templates`;
    const method = editingEpiId ? 'PUT' : 'POST';

    try {
        const res = await fetch(url, {
            method,
            headers: { 'Authorization': `Bearer ${currentToken}`, 'Content-Type': 'application/json' },
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
    if (!confirm('Excluir este template de EPI? Essa ação não pode ser desfeita.')) return;
    await fetch(`${API_URL}/epi-templates/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    await loadEpiTemplates();
};

// ============================================================
// GERADOR DE PDF - SELEÇÃO DE COLABORADOR
// ============================================================
window.gerarFichaEpi = function(templateId) {
    const template = epiTemplates.find(t => t.id === templateId);
    if (!template) return;

    const modal = document.getElementById('modal-epi-gerar');
    if (!modal) return;

    document.getElementById('epi-gerar-template-id').value = templateId;
    document.getElementById('epi-gerar-grupo-label').textContent = `Grupo: ${template.grupo} — ${(template.epis||[]).length} EPI(s)`;

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
        const filtered = colaboradores.filter(c =>
            !departamentos.length || departamentos.includes(c.departamento)
        ).sort((a, b) => a.nome_completo.localeCompare(b.nome_completo));

        if (!filtered.length) {
            select.innerHTML = '<option value="">Nenhum colaborador neste departamento</option>';
            return;
        }
        select.innerHTML = '<option value="">Selecione o colaborador...</option>' +
            filtered.map(c => `<option value="${c.id}"
                data-nome="${c.nome_completo}"
                data-rg="${c.rg||''}"
                data-cpf="${c.cpf||''}"
                data-cargo="${c.cargo||''}"
                data-dept="${c.departamento||''}"
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
        nome: opt.dataset.nome,
        rg: opt.dataset.rg,
        cpf: opt.dataset.cpf,
        cargo: opt.dataset.cargo,
        dept: opt.dataset.dept,
        admissao: opt.dataset.admissao
    };

    window.closeEpiGerarModal();
    gerarPdfFichaEpi(template, colab);
};

// ============================================================
// PDF - FRENTE E VERSO
// ============================================================
function fmtData(str) {
    if (!str) return '—';
    const p = str.split('-');
    return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : str;
}

function drawHeader(doc, W, margin) {
    let y = 12;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(13, 71, 161);
    doc.text('AMERICA', W / 2 - 10, y, { align: 'center' });
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(15);
    doc.text(' Rental', W / 2 + 7, y, { align: 'center' });
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 100, 100);
    doc.text('desde 1999', W / 2, y, { align: 'center' });
    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text('RECURSOS HUMANOS - NR 06', W / 2, y, { align: 'center' });
    y += 5.5;
    doc.text('FICHA OBRIGATÓRIA DE E.P.I (RECIBO DE ENTREGA)', W / 2, y, { align: 'center' });
    return y + 6;
}

function drawColabBox(doc, W, margin, y, colab) {
    // Linha colaborador
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text('COLABORADOR:', margin, y);
    doc.setLineWidth(0.4);
    doc.line(margin + 28, y + 0.7, W - margin, y + 0.7);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(colab.nome || '—', margin + 30, y);
    y += 7;

    // Box dados
    const boxH = 25;
    doc.setLineWidth(0.3);
    doc.rect(margin, y, W - margin * 2, boxH);
    y += 4.5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('DADOS COLABORADOR:', margin + 2, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const cx = W / 2;
    doc.text(`PORTADOR DA CÉDULA DE IDENTIDADE RG Nº: ${colab.rg || '—'}`, cx, y, { align: 'center' }); y += 4;
    doc.text(`INSCRITO NO CPF SOB O Nº: ${colab.cpf || '—'}`, cx, y, { align: 'center' }); y += 4;
    doc.text(`CARGO: ${colab.cargo || '—'}`, cx, y, { align: 'center' }); y += 4;
    doc.text(`SETOR: ${(colab.dept || '').toUpperCase() || '—'}`, cx, y, { align: 'center' }); y += 4;
    doc.text(`DATA DE ADMISSÃO: ${fmtData(colab.admissao)}`, cx, y, { align: 'center' });
    return y + 8;
}

function drawEntregaTable(doc, W, margin, y, numRows) {
    const headers = ['DATA', 'QUANTIDADE', 'DESCRIÇÃO DE E.P.I', 'ASSINATURA DO COLABORADOR'];
    const colW = [28, 28, 84, W - margin * 2 - 28 - 28 - 84];
    const hH = 7, rH = 6;

    // header
    doc.setFillColor(225, 230, 240);
    let cx = margin;
    headers.forEach((h, i) => {
        doc.rect(cx, y, colW[i], hH, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(0, 0, 0);
        doc.text(h, cx + colW[i] / 2, y + 4.5, { align: 'center' });
        cx += colW[i];
    });
    y += hH;

    for (let r = 0; r < numRows; r++) {
        cx = margin;
        colW.forEach(w => { doc.setLineWidth(0.2); doc.rect(cx, y, w, rH); cx += w; });
        y += rH;
    }
    return y;
}

function drawRodape(doc, W, margin, y, rodapeTexto) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text(rodapeTexto || 'LIBERAÇÃO DO EQUIPAMENTO DE SEGURANÇA SOMENTE APÓS ASSINATURA DESTE TERMO.', W / 2, y, { align: 'center' });
}

function drawConferencia(doc, W, margin, y) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Conferência:', margin, y); y += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(13, 71, 161);
    doc.text('AMERICA RENTAL EQUIPAMENTOS LTDA', W / 2, y, { align: 'center' }); y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(80, 80, 80);
    doc.text('CNPJ: 03.434.449/0001-01', W / 2, y, { align: 'center' }); y += 3;
    doc.setLineWidth(0.5);
    doc.line(W / 2 - 30, y, W / 2 + 30, y);
}

function gerarPdfFichaEpi(template, colab) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = 210, margin = 13;

    // ==================== FRENTE (Página 1) ====================
    let y = drawHeader(doc, W, margin);
    y = drawColabBox(doc, W, margin, y, colab);

    // Tabela EPI + Termo lado a lado
    const epis = template.epis || [];
    const colMid = W / 2 + 4;
    const tableLeft = margin;
    const tableRight = W - margin;
    const hdrH = 7, rowH = 5.5;
    const numBodyRows = Math.max(epis.length + 5, 14);
    const bodyH = numBodyRows * rowH;

    // Cabeçalho da tabela
    const tableTop = y;
    doc.setFillColor(228, 235, 245);
    doc.rect(tableLeft, tableTop, colMid - tableLeft, hdrH, 'FD');
    doc.rect(colMid, tableTop, tableRight - colMid, hdrH, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(0, 0, 0);
    doc.text('LISTA DE E.P.I NESCESSÁRIO', (tableLeft + colMid) / 2, tableTop + 4.5, { align: 'center' });
    doc.text('TERMO DE RESPONSABILIDADE', (colMid + tableRight) / 2, tableTop + 4.5, { align: 'center' });
    y = tableTop + hdrH;

    // Corpo esquerdo - lista de EPIs
    doc.setLineWidth(0.25);
    doc.rect(tableLeft, y, colMid - tableLeft, bodyH);
    doc.rect(colMid, y, tableRight - colMid, bodyH);
    doc.line(colMid, y, colMid, y + bodyH);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    epis.forEach((epi, i) => {
        const ry = y + (i * rowH) + rowH - 1.5;
        doc.text(epi, tableLeft + 2, ry);
        if (i < epis.length - 1) {
            doc.setLineWidth(0.1);
            doc.line(tableLeft, y + (i + 1) * rowH, colMid, y + (i + 1) * rowH);
        }
    });

    // Corpo direito - termo
    const termoLinhas = (template.termo_texto || '').split('\n');
    let termoY = y + 4;
    doc.setFontSize(7.2);
    termoLinhas.forEach(linha => {
        const wrapped = doc.splitTextToSize(linha, tableRight - colMid - 4);
        wrapped.forEach(l => {
            if (termoY < y + bodyH - 20) {
                doc.text(l, colMid + 2, termoY);
                termoY += 3.5;
            }
        });
        termoY += 1;
    });

    // Assinatura no canto inferior direito da tabela
    const assinY = y + bodyH - 12;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('X', colMid + 8, assinY - 1);
    doc.setLineWidth(0.3);
    doc.line(colMid + 8, assinY, tableRight - 6, assinY);
    doc.text('ASSINATURA DO EMPREGADO', (colMid + tableRight) / 2, assinY + 4, { align: 'center' });

    y = y + bodyH + 4;

    // Texto descriminar
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(0, 0, 0);
    doc.text('DESCRIMINAR COM DATA, DESCRIÇÃO, QTD. Nº C.A E ASSINATURA DO RECEBEDOR ABAIXO.', W / 2, y, { align: 'center' });
    y += 6;

    // Tabela de entregas - frente (8 linhas)
    y = drawEntregaTable(doc, W, margin, y, 8);
    y += 5;

    drawRodape(doc, W, margin, y, template.rodape_texto);

    // ==================== VERSO (Página 2) ====================
    doc.addPage();
    y = drawHeader(doc, W, margin);
    y = drawColabBox(doc, W, margin, y, colab);

    // Tabela grande de entregas (22 linhas)
    y = drawEntregaTable(doc, W, margin, y, 22);
    y += 6;

    drawRodape(doc, W, margin, y, template.rodape_texto);
    y += 10;
    drawConferencia(doc, W, margin, y);

    // Salvar
    const nomeArquivo = `Ficha_EPI_${template.grupo.replace(/\s+/g, '_')}_${colab.nome.replace(/\s+/g, '_')}.pdf`;
    doc.save(nomeArquivo);
}
