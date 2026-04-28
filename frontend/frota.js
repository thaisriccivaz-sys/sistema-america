window.initFrotaVeiculos = async function() {
    const c = document.getElementById('frota-veiculos-container');
    if (!c) return;
    const tok = window.currentToken || localStorage.getItem('erp_token');
    c.innerHTML = `
    <div style="padding:1.5rem;background:#f1f5f9;min-height:100vh;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;">
        <h2 style="margin:0;color:#1e293b;display:flex;align-items:center;gap:8px;"><i class="ph ph-truck" style="color:#2d9e5f;"></i> Frota de Veículos</h2>
        <button onclick="window.abrirModalFrota(null)" style="background:#2d9e5f;color:#fff;border:none;border-radius:8px;padding:0.6rem 1.2rem;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;"><i class="ph ph-plus"></i> Novo Veículo</button>
      </div>
      <div class="card" style="overflow:auto;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <table style="width:100%;border-collapse:collapse;font-size:0.88rem;">
          <thead>
            <tr style="background:#1e293b;color:#fff;">
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
            </tr>
          </thead>
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
            const venc = isNaN(ano) ? null : new Date(ano, 11, 31);
            const diff = venc ? Math.ceil((venc - hoje) / 86400000) : null;
            const excStyle = diff !== null && diff <= 30 ? 'color:#dc2626;font-weight:700;' : '';
            const bg = i % 2 === 0 ? '#fff' : '#f8fafc';
            return `<tr style="background:${bg};border-bottom:1px solid #e2e8f0;">
              <td style="padding:9px 12px;font-weight:700;color:#2d9e5f;">${v.placa || ''}</td>
              <td style="padding:9px 12px;">${v.marca_modelo_versao || ''}</td>
              <td style="padding:9px 12px;">${v.cor_predominante || ''}</td>
              <td style="padding:9px 12px;">${v.ano_modelo || ''}</td>
              <td style="padding:9px 12px;${excStyle}">${v.exercicio || ''}${diff !== null && diff <= 30 ? ' ⚠️' : ''}</td>
              <td style="padding:9px 12px;">${v.renavam || ''}</td>
              <td style="padding:9px 12px;">${v.capacidade_tanque ? v.capacidade_tanque + ' L' : ''}</td>
              <td style="padding:9px 12px;">${v.capacidade_carga ? v.capacidade_carga + ' kg' : ''}</td>
              <td style="padding:9px 12px;">${v.tipo_veiculo || ''}</td>
              <td style="padding:9px 12px;text-align:center;display:flex;gap:6px;justify-content:center;">
                <button onclick="window.abrirModalFrota(${v.id})" style="background:#2563eb;color:#fff;border:none;border-radius:6px;padding:5px 10px;cursor:pointer;" title="Editar"><i class="ph ph-pencil"></i></button>
                <button onclick="window.excluirVeiculoFrota(${v.id},'${v.placa}')" style="background:#dc2626;color:#fff;border:none;border-radius:6px;padding:5px 10px;cursor:pointer;" title="Excluir"><i class="ph ph-trash"></i></button>
              </td>
            </tr>`;
        }).join('');
    } catch(e) {
        const tb = document.getElementById('frota-tbody');
        if (tb) tb.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:2rem;color:#dc2626;">Erro ao carregar veículos</td></tr>';
    }
};

window.abrirModalFrota = async function(id) {
    const tok = window.currentToken || localStorage.getItem('erp_token');
    let v = {};
    if (id) {
        const r = await fetch('/api/frota/veiculos/' + id, { headers: { Authorization: 'Bearer ' + tok } });
        v = await r.json();
    }
    let ov = document.getElementById('modal-frota-overlay');
    if (ov) ov.remove();
    ov = document.createElement('div');
    ov.id = 'modal-frota-overlay';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;';
    const tipos = ['caminhão','caminhonete','utilitário','carretinha','caminhão tanque'];
    const sel = (val) => tipos.map(t => `<option value="${t}" ${v.tipo_veiculo === t ? 'selected' : ''}>${t.charAt(0).toUpperCase()+t.slice(1)}</option>`).join('');
    ov.innerHTML = `
    <div style="background:#fff;border-radius:16px;width:95vw;max-width:860px;max-height:90vh;overflow-y:auto;box-shadow:0 25px 60px rgba(0,0,0,0.4);">
      <div style="padding:1.25rem 1.5rem;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;background:#f8fafc;border-radius:16px 16px 0 0;position:sticky;top:0;z-index:2;">
        <h3 style="margin:0;color:#1e293b;"><i class="ph ph-truck" style="color:#2d9e5f;"></i> ${id ? 'Editar Veículo' : 'Novo Veículo'}</h3>
        <button onclick="document.getElementById('modal-frota-overlay').remove()" style="background:none;border:none;font-size:1.5rem;cursor:pointer;color:#64748b;"><i class="ph ph-x"></i></button>
      </div>
      <div style="padding:1.5rem;">
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;margin-bottom:1rem;">
          <div><label style="font-size:0.8rem;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Placa *</label><input id="fv-placa" value="${v.placa||''}" style="width:100%;padding:0.6rem;border:1px solid #e2e8f0;border-radius:8px;box-sizing:border-box;text-transform:uppercase;" placeholder="ABC1234"></div>
          <div><label style="font-size:0.8rem;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Marca/Modelo/Versão</label><input id="fv-marca" value="${v.marca_modelo_versao||''}" style="width:100%;padding:0.6rem;border:1px solid #e2e8f0;border-radius:8px;box-sizing:border-box;" placeholder="Ex: FORD CARGO 2429"></div>
          <div><label style="font-size:0.8rem;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Cor Predominante</label><input id="fv-cor" value="${v.cor_predominante||''}" style="width:100%;padding:0.6rem;border:1px solid #e2e8f0;border-radius:8px;box-sizing:border-box;"></div>
          <div><label style="font-size:0.8rem;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Ano Modelo</label><input id="fv-anomodelo" value="${v.ano_modelo||''}" style="width:100%;padding:0.6rem;border:1px solid #e2e8f0;border-radius:8px;box-sizing:border-box;" placeholder="2025"></div>
          <div><label style="font-size:0.8rem;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Exercício (Ano Validade)</label><input id="fv-exercicio" value="${v.exercicio||''}" style="width:100%;padding:0.6rem;border:1px solid #e2e8f0;border-radius:8px;box-sizing:border-box;" placeholder="2025"></div>
          <div><label style="font-size:0.8rem;font-weight:600;color:#475569;display:block;margin-bottom:4px;">RENAVAM</label><input id="fv-renavam" value="${v.renavam||''}" style="width:100%;padding:0.6rem;border:1px solid #e2e8f0;border-radius:8px;box-sizing:border-box;"></div>
          <div><label style="font-size:0.8rem;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Capacidade Tanque (L)</label><input id="fv-tanque" type="number" step="0.1" value="${v.capacidade_tanque||''}" style="width:100%;padding:0.6rem;border:1px solid #e2e8f0;border-radius:8px;box-sizing:border-box;"></div>
          <div><label style="font-size:0.8rem;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Capacidade Carga (kg)</label><input id="fv-carga" type="number" value="${v.capacidade_carga||''}" style="width:100%;padding:0.6rem;border:1px solid #e2e8f0;border-radius:8px;box-sizing:border-box;"></div>
          <div><label style="font-size:0.8rem;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Tipo de Veículo</label><select id="fv-tipo" style="width:100%;padding:0.6rem;border:1px solid #e2e8f0;border-radius:8px;background:#fff;box-sizing:border-box;">${sel()}</select></div>
        </div>
        <p style="font-weight:700;color:#475569;margin:1rem 0 0.5rem;">Medidas</p>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;">
          <div><label style="font-size:0.8rem;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Altura c/ Banheiro (m)</label><input id="fv-alt-c" type="number" step="0.01" value="${v.altura_com_banheiro||''}" style="width:100%;padding:0.6rem;border:1px solid #e2e8f0;border-radius:8px;box-sizing:border-box;"></div>
          <div><label style="font-size:0.8rem;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Altura s/ Banheiro (m)</label><input id="fv-alt-s" type="number" step="0.01" value="${v.altura_sem_banheiro||''}" style="width:100%;padding:0.6rem;border:1px solid #e2e8f0;border-radius:8px;box-sizing:border-box;"></div>
          <div><label style="font-size:0.8rem;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Largura c/ Banheiro (m)</label><input id="fv-larg-c" type="number" step="0.01" value="${v.largura_com_banheiro||''}" style="width:100%;padding:0.6rem;border:1px solid #e2e8f0;border-radius:8px;box-sizing:border-box;"></div>
          <div><label style="font-size:0.8rem;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Largura s/ Banheiro (m)</label><input id="fv-larg-s" type="number" step="0.01" value="${v.largura_sem_banheiro||''}" style="width:100%;padding:0.6rem;border:1px solid #e2e8f0;border-radius:8px;box-sizing:border-box;"></div>
          <div><label style="font-size:0.8rem;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Profundidade c/ Banheiro (m)</label><input id="fv-prof-c" type="number" step="0.01" value="${v.profundidade_com_banheiro||''}" style="width:100%;padding:0.6rem;border:1px solid #e2e8f0;border-radius:8px;box-sizing:border-box;"></div>
          <div><label style="font-size:0.8rem;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Profundidade s/ Banheiro (m)</label><input id="fv-prof-s" type="number" step="0.01" value="${v.profundidade_sem_banheiro||''}" style="width:100%;padding:0.6rem;border:1px solid #e2e8f0;border-radius:8px;box-sizing:border-box;"></div>
        </div>
        <div style="display:flex;gap:1rem;justify-content:flex-end;margin-top:1.5rem;">
          <button onclick="document.getElementById('modal-frota-overlay').remove()" style="background:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;padding:0.6rem 1.2rem;font-weight:600;cursor:pointer;color:#475569;">Cancelar</button>
          <button onclick="window.salvarVeiculoFrota(${id||'null'})" style="background:#2d9e5f;color:#fff;border:none;border-radius:8px;padding:0.6rem 1.4rem;font-weight:600;cursor:pointer;"><i class="ph ph-floppy-disk"></i> Salvar</button>
        </div>
      </div>
    </div>`;
    document.body.appendChild(ov);
    ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
};

window.salvarVeiculoFrota = async function(id) {
    const tok = window.currentToken || localStorage.getItem('erp_token');
    const get = (sel) => { const el = document.getElementById(sel); return el ? el.value.trim() : ''; };
    const placa = get('fv-placa');
    if (!placa) { alert('Placa é obrigatória'); return; }
    const body = {
        placa, marca_modelo_versao: get('fv-marca'), cor_predominante: get('fv-cor'),
        ano_modelo: get('fv-anomodelo'), exercicio: get('fv-exercicio'), renavam: get('fv-renavam'),
        capacidade_tanque: get('fv-tanque'), capacidade_carga: get('fv-carga'),
        tipo_veiculo: get('fv-tipo'), altura_com_banheiro: get('fv-alt-c'), altura_sem_banheiro: get('fv-alt-s'),
        largura_com_banheiro: get('fv-larg-c'), largura_sem_banheiro: get('fv-larg-s'),
        profundidade_com_banheiro: get('fv-prof-c'), profundidade_sem_banheiro: get('fv-prof-s')
    };
    const url = id ? '/api/frota/veiculos/' + id : '/api/frota/veiculos';
    const method = id ? 'PUT' : 'POST';
    try {
        const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok }, body: JSON.stringify(body) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao salvar');
        document.getElementById('modal-frota-overlay').remove();
        window.initFrotaVeiculos();
    } catch(e) { alert('Erro: ' + e.message); }
};

window.excluirVeiculoFrota = async function(id, placa) {
    if (!confirm('Excluir o veículo ' + placa + '?')) return;
    const tok = window.currentToken || localStorage.getItem('erp_token');
    await fetch('/api/frota/veiculos/' + id, { method: 'DELETE', headers: { Authorization: 'Bearer ' + tok } });
    window.initFrotaVeiculos();
};
