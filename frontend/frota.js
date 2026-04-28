// ===== MÓDULO FROTA DE VEÍCULOS =====
// Extrai dados do PDF CRLV usando PDF.js
async function extrairDadosCRLV(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = async function(e) {
            try {
                const pdfjsLib = window['pdfjs-dist/build/pdf'];
                if (!pdfjsLib) { resolve({}); return; }
                const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(e.target.result) }).promise;
                let fullText = '';
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const content = await page.getTextContent();
                    fullText += content.items.map(it => it.str).join('\n') + '\n';
                }
                console.log('[CRLV] Texto extraído:', fullText);
                const d = {};
                // PLACA: 3 letras + 4 alfanum
                const mPlaca = fullText.match(/\b([A-Z]{3}[0-9][A-Z0-9][0-9]{2})\b/);
                if (mPlaca) d.placa = mPlaca[1];
                // EXERCÍCIO: ano de 4 dígitos que aparece após a placa (ex: CRH84382025)
                if (mPlaca) {
                    const mEx = fullText.match(new RegExp(mPlaca[1] + '(\\d{4})'));
                    if (mEx) d.exercicio = mEx[1];
                }
                // RENAVAM: 9-11 dígitos
                const mRen = fullText.match(/\b(\d{9,11})\b/);
                if (mRen) d.renavam = mRen[1];
                // ANO FABRICAÇÃO / ANO MODELO: 8 dígitos seguidos = AAAABBBB
                const mAnos = fullText.match(/\b(\d{4})(\d{4})\b/);
                if (mAnos) { d.ano_fabricacao = mAnos[1]; d.ano_modelo = mAnos[2]; }
                // COR PREDOMINANTE: palavras comuns de cor
                const cores = ['BRANCA','PRETA','CINZA','VERMELHA','AZUL','VERDE','AMARELA','LARANJA','MARROM','BEGE','PRATA','DOURADA'];
                for (const cor of cores) { if (fullText.includes(cor)) { d.cor = cor; break; } }
                // MARCA/MODELO: linha após padrão "R/" ou texto antes de CARGA/ESPÉCIE
                const mMarca = fullText.match(/([A-Z][A-Z\/\s]{3,30}(?:HW|HL|HR|KB|FH|FMX|710|2429|F350|MASTER|SPRINTER|BOXER|DAILY|TECTOR|CARGO|TITAN|ACTROS|VON|VM)[^\n]*)/i);
                if (mMarca) d.marca_modelo_versao = mMarca[1].trim();
                resolve(d);
            } catch(err) { console.error('[CRLV] Erro:', err); resolve({}); }
        };
        reader.readAsArrayBuffer(file);
    });
}

// Converte arquivo para base64
function fileToBase64(file) {
    return new Promise((resolve) => {
        const r = new FileReader();
        r.onload = e => resolve(e.target.result);
        r.readAsDataURL(file);
    });
}

window.initFrotaVeiculos = async function() {
    const c = document.getElementById('frota-veiculos-container');
    if (!c) return;
    // Carregar PDF.js se necessário
    if (!window['pdfjs-dist/build/pdf']) {
        await new Promise(res => {
            const s = document.createElement('script');
            s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
            s.onload = () => {
                window['pdfjs-dist/build/pdf'] = window.pdfjsLib;
                if (window.pdfjsLib) window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                res();
            };
            document.head.appendChild(s);
        });
    }
    const tok = window.currentToken || localStorage.getItem('erp_token');
    c.innerHTML = `
    <div style="padding:1.5rem;background:#f1f5f9;min-height:100vh;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;">
        <h2 style="margin:0;color:#1e293b;"><i class="ph ph-truck" style="color:#2d9e5f;"></i> Frota de Veículos</h2>
        <button onclick="window.abrirModalFrota(null)" style="background:#2d9e5f;color:#fff;border:none;border-radius:8px;padding:0.6rem 1.2rem;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:6px;font-size:0.9rem;"><i class="ph ph-plus"></i> Novo Veículo</button>
      </div>
      <div style="background:#fff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.08);overflow:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
          <thead><tr style="background:#1e293b;color:#fff;">
            <th style="padding:10px 12px;text-align:left;">Placa</th>
            <th style="padding:10px 12px;text-align:left;">Marca/Modelo</th>
            <th style="padding:10px 12px;text-align:left;">Cor</th>
            <th style="padding:10px 12px;text-align:left;">Ano Modelo</th>
            <th style="padding:10px 12px;text-align:left;">Exercício</th>
            <th style="padding:10px 12px;text-align:left;">RENAVAM</th>
            <th style="padding:10px 12px;text-align:left;">Tanque</th>
            <th style="padding:10px 12px;text-align:left;">Carga</th>
            <th style="padding:10px 12px;text-align:left;">Tipo</th>
            <th style="padding:10px 12px;text-align:center;">Ações</th>
          </tr></thead>
          <tbody id="frota-tbody"><tr><td colspan="10" style="text-align:center;padding:2rem;color:#94a3b8;">Carregando...</td></tr></tbody>
        </table>
      </div>
    </div>`;
    try {
        const res = await fetch('/api/frota/veiculos', { headers: { Authorization: 'Bearer ' + tok } });
        const rows = await res.json();
        const tb = document.getElementById('frota-tbody');
        if (!tb) return;
        if (!rows.length) { tb.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:2rem;color:#94a3b8;">Nenhum veículo cadastrado</td></tr>'; return; }
        const hoje = new Date();
        tb.innerHTML = rows.map((v, i) => {
            const ano = parseInt(v.exercicio);
            const diff = isNaN(ano) ? null : Math.ceil((new Date(ano,11,31) - hoje) / 86400000);
            const alerta = diff !== null && diff <= 30;
            return `<tr style="background:${i%2===0?'#fff':'#f8fafc'};border-bottom:1px solid #e2e8f0;">
              <td style="padding:9px 12px;font-weight:700;color:#2d9e5f;">${v.placa||''}</td>
              <td style="padding:9px 12px;">${v.marca_modelo_versao||''}</td>
              <td style="padding:9px 12px;">${v.cor_predominante||''}</td>
              <td style="padding:9px 12px;">${v.ano_modelo||''}</td>
              <td style="padding:9px 12px;${alerta?'color:#dc2626;font-weight:700;':''}">${v.exercicio||''}${alerta?' ⚠️':''}</td>
              <td style="padding:9px 12px;">${v.renavam||''}</td>
              <td style="padding:9px 12px;">${v.capacidade_tanque?v.capacidade_tanque+' L':'-'}</td>
              <td style="padding:9px 12px;">${v.capacidade_carga?v.capacidade_carga+' kg':'-'}</td>
              <td style="padding:9px 12px;">${v.tipo_veiculo||''}</td>
              <td style="padding:9px 12px;white-space:nowrap;text-align:center;">
                <button onclick="window.abrirModalFrota(${v.id})" style="background:#2563eb;color:#fff;border:none;border-radius:6px;padding:5px 10px;cursor:pointer;margin-right:4px;" title="Editar"><i class="ph ph-pencil"></i></button>
                <button onclick="window.excluirVeiculoFrota(${v.id},'${v.placa}')" style="background:#dc2626;color:#fff;border:none;border-radius:6px;padding:5px 10px;cursor:pointer;" title="Excluir"><i class="ph ph-trash"></i></button>
              </td>
            </tr>`;
        }).join('');
    } catch(e) {
        const tb = document.getElementById('frota-tbody');
        if (tb) tb.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:2rem;color:#dc2626;">Erro: ${e.message}</td></tr>`;
    }
};

window._frotaCrlvBase64 = null;
window._frotaCrlvFilename = null;

window.abrirModalFrota = async function(id) {
    const tok = window.currentToken || localStorage.getItem('erp_token');
    let v = {};
    if (id) {
        const r = await fetch('/api/frota/veiculos/' + id, { headers: { Authorization: 'Bearer ' + tok } });
        v = await r.json();
    }
    window._frotaCrlvBase64 = null;
    window._frotaCrlvFilename = null;
    let ov = document.getElementById('modal-frota-ov');
    if (ov) ov.remove();
    ov = document.createElement('div');
    ov.id = 'modal-frota-ov';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.75);z-index:9999;display:flex;align-items:center;justify-content:center;';
    const tipos = ['caminhão','caminhonete','utilitário','carretinha','caminhão tanque'];
    const optTipo = tipos.map(t => `<option value="${t}"${(v.tipo_veiculo||'caminhão')===t?' selected':''}>${t.charAt(0).toUpperCase()+t.slice(1)}</option>`).join('');
    const inp = (id,val,ph,type='text') => `<input id="${id}" value="${val||''}" placeholder="${ph||''}" type="${type}" style="width:100%;padding:0.6rem;border:1px solid #e2e8f0;border-radius:8px;box-sizing:border-box;font-size:0.88rem;">`;
    ov.innerHTML = `
    <div style="background:#fff;border-radius:16px;width:95vw;max-width:900px;max-height:90vh;overflow-y:auto;box-shadow:0 25px 60px rgba(0,0,0,0.4);display:flex;flex-direction:column;">
      <div style="padding:1.1rem 1.5rem;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;background:#f8fafc;border-radius:16px 16px 0 0;position:sticky;top:0;z-index:2;">
        <div style="font-size:1.1rem;font-weight:700;color:#1e293b;display:flex;align-items:center;gap:8px;"><i class="ph ph-truck" style="color:#2d9e5f;"></i>${id?'Editar Veículo':'Novo Veículo'}</div>
        <button onclick="document.getElementById('modal-frota-ov').remove()" style="background:none;border:none;font-size:1.5rem;cursor:pointer;color:#64748b;"><i class="ph ph-x"></i></button>
      </div>
      <div style="padding:1.5rem;flex:1;">

        <!-- UPLOAD CRLV -->
        <div style="background:linear-gradient(135deg,#ecfdf5,#d1fae5);border:2px dashed #6ee7b7;border-radius:12px;padding:1.2rem;margin-bottom:1.5rem;text-align:center;">
          <i class="ph ph-file-pdf" style="font-size:2rem;color:#2d9e5f;display:block;margin-bottom:0.5rem;"></i>
          <p style="margin:0 0 0.75rem;font-weight:600;color:#065f46;">📄 Importar dados do CRLV (PDF)</p>
          <p style="margin:0 0 0.75rem;font-size:0.8rem;color:#6b7280;">Selecione o PDF do CRLV e os campos serão preenchidos automaticamente</p>
          <label style="background:#2d9e5f;color:#fff;padding:0.5rem 1.2rem;border-radius:8px;cursor:pointer;font-weight:600;font-size:0.88rem;display:inline-flex;align-items:center;gap:6px;">
            <i class="ph ph-upload-simple"></i> Selecionar CRLV (PDF)
            <input type="file" accept=".pdf" id="crlv-file-input" style="display:none;" onchange="window.processarCRLV(this)">
          </label>
          <div id="crlv-status" style="margin-top:0.75rem;font-size:0.82rem;color:#6b7280;"></div>
        </div>

        <!-- DADOS DO VEÍCULO -->
        <p style="font-weight:700;color:#334155;margin:0 0 0.75rem;font-size:0.9rem;border-bottom:2px solid #e2e8f0;padding-bottom:0.4rem;">🚛 Dados do Veículo</p>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;margin-bottom:1rem;">
          <div><label style="font-size:0.78rem;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Placa *</label>${inp('fv-placa',v.placa,'ABC1234')}</div>
          <div style="grid-column:span 2;"><label style="font-size:0.78rem;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Marca / Modelo / Versão</label>${inp('fv-marca',v.marca_modelo_versao,'Ex: FORD CARGO 2429 E')}</div>
          <div><label style="font-size:0.78rem;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Cor Predominante</label>${inp('fv-cor',v.cor_predominante,'BRANCA')}</div>
          <div><label style="font-size:0.78rem;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Ano Modelo</label>${inp('fv-anomodelo',v.ano_modelo,'2025')}</div>
          <div><label style="font-size:0.78rem;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Exercício (Validade)</label>${inp('fv-exercicio',v.exercicio,'2025')}</div>
          <div><label style="font-size:0.78rem;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Código RENAVAM</label>${inp('fv-renavam',v.renavam,'00000000000')}</div>
          <div><label style="font-size:0.78rem;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Capacidade Tanque (L)</label>${inp('fv-tanque',v.capacidade_tanque,'Ex: 200','number')}</div>
          <div><label style="font-size:0.78rem;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Capacidade Carga (kg)</label>${inp('fv-carga',v.capacidade_carga,'Ex: 3500','number')}</div>
          <div><label style="font-size:0.78rem;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Tipo de Veículo</label>
            <select id="fv-tipo" style="width:100%;padding:0.6rem;border:1px solid #e2e8f0;border-radius:8px;background:#fff;box-sizing:border-box;font-size:0.88rem;">${optTipo}</select>
          </div>
        </div>

        <p style="font-weight:700;color:#334155;margin:0 0 0.75rem;font-size:0.9rem;border-bottom:2px solid #e2e8f0;padding-bottom:0.4rem;">📐 Medidas</p>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;margin-bottom:1.5rem;">
          <div><label style="font-size:0.78rem;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Altura c/ Banheiro (m)</label>${inp('fv-alt-c',v.altura_com_banheiro,'','number')}</div>
          <div><label style="font-size:0.78rem;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Altura s/ Banheiro (m)</label>${inp('fv-alt-s',v.altura_sem_banheiro,'','number')}</div>
          <div style="background:#f1f5f9;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#64748b;font-size:0.78rem;font-weight:600;">Altura</div>
          <div><label style="font-size:0.78rem;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Largura c/ Banheiro (m)</label>${inp('fv-larg-c',v.largura_com_banheiro,'','number')}</div>
          <div><label style="font-size:0.78rem;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Largura s/ Banheiro (m)</label>${inp('fv-larg-s',v.largura_sem_banheiro,'','number')}</div>
          <div style="background:#f1f5f9;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#64748b;font-size:0.78rem;font-weight:600;">Largura</div>
          <div><label style="font-size:0.78rem;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Profundidade c/ Banheiro (m)</label>${inp('fv-prof-c',v.profundidade_com_banheiro,'','number')}</div>
          <div><label style="font-size:0.78rem;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Profundidade s/ Banheiro (m)</label>${inp('fv-prof-s',v.profundidade_sem_banheiro,'','number')}</div>
          <div style="background:#f1f5f9;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#64748b;font-size:0.78rem;font-weight:600;">Profundidade</div>
        </div>

        <div style="display:flex;gap:1rem;justify-content:flex-end;">
          <button onclick="document.getElementById('modal-frota-ov').remove()" style="background:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;padding:0.6rem 1.2rem;font-weight:600;cursor:pointer;color:#475569;font-size:0.88rem;">Cancelar</button>
          <button onclick="window.salvarVeiculoFrota(${id||'null'})" style="background:#2d9e5f;color:#fff;border:none;border-radius:8px;padding:0.6rem 1.4rem;font-weight:600;cursor:pointer;font-size:0.88rem;display:inline-flex;align-items:center;gap:6px;"><i class="ph ph-floppy-disk"></i> Salvar Veículo</button>
        </div>
      </div>
    </div>`;
    document.body.appendChild(ov);
    ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
};

window.processarCRLV = async function(input) {
    const file = input.files[0];
    if (!file) return;
    const status = document.getElementById('crlv-status');
    if (status) status.innerHTML = '<i class="ph ph-circle-notch" style="animation:spin 1s linear infinite;"></i> Lendo PDF...';
    window._frotaCrlvFilename = file.name;
    window._frotaCrlvBase64 = await fileToBase64(file);
    const dados = await extrairDadosCRLV(file);
    console.log('[CRLV] Dados extraídos:', dados);
    let preenchidos = 0;
    const set = (id, val) => { if (!val) return; const el = document.getElementById(id); if (el && (!el.value || el.value === '')) { el.value = val; preenchidos++; } };
    if (dados.placa) { const el = document.getElementById('fv-placa'); if (el) { el.value = dados.placa; preenchidos++; } }
    set('fv-marca', dados.marca_modelo_versao);
    set('fv-cor', dados.cor);
    set('fv-anomodelo', dados.ano_modelo);
    set('fv-exercicio', dados.exercicio);
    set('fv-renavam', dados.renavam);
    if (status) status.innerHTML = preenchidos > 0
        ? `<span style="color:#16a34a;font-weight:600;">✅ ${preenchidos} campo(s) preenchido(s) automaticamente</span>`
        : `<span style="color:#f59e0b;font-weight:600;">⚠️ PDF processado mas dados não identificados. Preencha manualmente.</span>`;
};

window.salvarVeiculoFrota = async function(id) {
    const tok = window.currentToken || localStorage.getItem('erp_token');
    const g = (sel) => { const el = document.getElementById(sel); return el ? el.value.trim() : ''; };
    const placa = g('fv-placa');
    if (!placa) { alert('Placa é obrigatória'); return; }
    const body = {
        placa, marca_modelo_versao: g('fv-marca'), cor_predominante: g('fv-cor'),
        ano_modelo: g('fv-anomodelo'), exercicio: g('fv-exercicio'), renavam: g('fv-renavam'),
        capacidade_tanque: g('fv-tanque'), capacidade_carga: g('fv-carga'), tipo_veiculo: g('fv-tipo'),
        altura_com_banheiro: g('fv-alt-c'), altura_sem_banheiro: g('fv-alt-s'),
        largura_com_banheiro: g('fv-larg-c'), largura_sem_banheiro: g('fv-larg-s'),
        profundidade_com_banheiro: g('fv-prof-c'), profundidade_sem_banheiro: g('fv-prof-s'),
        crlv_base64: window._frotaCrlvBase64 || null,
        crlv_filename: window._frotaCrlvFilename || null
    };
    const url = id ? '/api/frota/veiculos/' + id : '/api/frota/veiculos';
    try {
        const res = await fetch(url, {
            method: id ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok },
            body: JSON.stringify(body)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao salvar');
        document.getElementById('modal-frota-ov').remove();
        window.initFrotaVeiculos();
    } catch(e) { alert('Erro: ' + e.message); }
};

window.excluirVeiculoFrota = async function(id, placa) {
    if (!confirm('Excluir o veículo ' + placa + '?')) return;
    const tok = window.currentToken || localStorage.getItem('erp_token');
    await fetch('/api/frota/veiculos/' + id, { method: 'DELETE', headers: { Authorization: 'Bearer ' + tok } });
    window.initFrotaVeiculos();
};
