(function(){
function getMesVenc(placa){const c=(placa||'').trim().slice(-1).toUpperCase();return({'1':7,'2':7,'3':8,'4':8,'5':9,'6':9,'7':10,'8':10,'9':11,'0':12})[c]||null;}
function alertaPlaca(placa,exercicio){
  const hoje=new Date();
  const anoVencimento = parseInt(exercicio) + 1; // Exercício 2025 -> vence em 2026
  const mesVencimento = getMesVenc(placa);
  if(!mesVencimento||!anoVencimento) return null;
  // Expirado se: estamos em um ano maior que o ano de vencimento OR estamos no mesmo ano de vencimento e o mês atual já PASSOU o mês de vencimento
  const expirado = (hoje.getFullYear() > anoVencimento) || (hoje.getFullYear() === anoVencimento && hoje.getMonth() + 1 > mesVencimento);
  return expirado ? 'expirado' : null;
}
async function extrairCRLV(file){
  return new Promise(resolve=>{
    const fr=new FileReader();
    fr.onload=async e=>{
      try{
        const lib=window.pdfjsLib;if(!lib){resolve({});return;}
        const pdf=await lib.getDocument({data:new Uint8Array(e.target.result)}).promise;
        let txt='';
        for(let i=1;i<=pdf.numPages;i++){const pg=await pdf.getPage(i);const ct=await pg.getTextContent();txt+=ct.items.map(x=>x.str).join('\n')+'\n';}
        console.log('[CRLV raw]',txt);
        const linhas=txt.split('\n').map(l=>l.trim()).filter(l=>l.length>0);
        console.log('[CRLV linhas]',linhas);
        const d={};
        // PLACA: formato ABC1234 ou Mercosul ABC1D23
        let placaIdx=-1;
        for(let i=0;i<linhas.length;i++){if(/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(linhas[i])){d.placa=linhas[i];placaIdx=i;break;}}
        // Após placa: próximo ano (4 dígitos) = EXERCÍCIO
        if(placaIdx>=0){
          for(let i=placaIdx+1;i<Math.min(placaIdx+8,linhas.length);i++){
            if(/^\d{4}$/.test(linhas[i])&&parseInt(linhas[i])>=2020){d.exercicio=linhas[i];
              // Próximo 4 dígitos = ANO FABRICAÇÃO
              for(let j=i+1;j<Math.min(i+8,linhas.length);j++){
                if(/^\d{4}$/.test(linhas[j])&&parseInt(linhas[j])>=1950){d.ano_fabricacao=linhas[j];
                  // Próximo 4 dígitos = ANO MODELO
                  for(let k=j+1;k<Math.min(j+8,linhas.length);k++){
                    if(/^\d{4}$/.test(linhas[k])&&parseInt(linhas[k])>=1950){d.ano_modelo=linhas[k];break;}
                  }break;}
              }break;}
          }
        }
        // RENAVAM: linha com 9-11 dígitos somente
        for(const l of linhas){if(/^\d{9,11}$/.test(l)&&l!==d.placa&&l!==d.exercicio&&l!==d.ano_fabricacao&&l!==d.ano_modelo){d.renavam=l;break;}}
        // COR: lista de cores conhecidas
        const cores=['BRANCA','PRETA','CINZA','VERMELHA','AZUL','VERDE','AMARELA','LARANJA','MARROM','BEGE','PRATA','DOURADA','VINHO','BEGE'];
        for(const l of linhas){const u=l.toUpperCase();for(const c of cores){if(u===c||u.startsWith(c)){d.cor=c;break;}}if(d.cor)break;}
        // MARCA/MODELO: linha com "/" que não seja chassi/motor, após placa
        const excl=/^(BRANCA|PRETA|CINZA|VERMELHA|AZUL|VERDE|AMARELA|LARANJA|MARROM|BEGE|PRATA|DOURADA|VINHO|PARTICULAR|COMERCIAL|CARROCERIA|CARGA|SEM OBS|AMERICA|GUARULHOS|DETRAN|SENATRAN|INFORMACOES|REPASSE|CUSTO|VALOR|TOTAL|ESPECIE|COMBUSTIVEL|LOCAL|DATA|CPF|CNPJ|SP|MG|RJ|PR|SC|RS|BA|GO)/i;
        for(let i=placaIdx>0?placaIdx:0;i<linhas.length;i++){const l=linhas[i];if(l.includes('/')&&!/^\*/.test(l)&&!/^\d/.test(l)&&l.length>4&&!excl.test(l)&&/[A-Z]{2}/.test(l)){d.marca_modelo_versao=l;break;}}
        resolve(d);
      }catch(err){console.error('[CRLV]',err);resolve({});}
    };
    fr.readAsArrayBuffer(file);
  });
}
function b64(file){return new Promise(r=>{const fr=new FileReader();fr.onload=e=>r(e.target.result);fr.readAsDataURL(file);});}
window._frotaB64=null;window._frotaFN=null;
window.processarCRLV=async function(inp,modo){
  const file=inp.files[0];if(!file)return;
  await carregarPDFjs();
  const statusId=modo==='update'?'crlv-upd-status':'crlv-status';
  const st=document.getElementById(statusId);
  if(st)st.innerHTML='<i class="ph ph-circle-notch"></i> Lendo PDF...';
  window._frotaB64=await b64(file);window._frotaFN=file.name;
  const d=await extrairCRLV(file);
  console.log('[CRLV dados]',d);
  let n=0;
  const set=(id,v)=>{if(!v)return;const el=document.getElementById(id);if(el){el.value=v;n++;}};
  if(modo==='update'){
    set('fv-exercicio-upd',d.exercicio);
    if(st)st.innerHTML=n>0?`<span style="color:#16a34a;font-weight:600">✅ Exercício extraído: ${d.exercicio||'não encontrado'}</span>`:`<span style="color:#f59e0b;font-weight:600">⚠️ Preencha o exercício manualmente</span>`;
  }else{
    if(d.placa){const el=document.getElementById('fv-placa');if(el){el.value=d.placa;n++;}}
    set('fv-marca',d.marca_modelo_versao);set('fv-cor',d.cor);set('fv-anomodelo',d.ano_modelo);set('fv-exercicio',d.exercicio);set('fv-renavam',d.renavam);
    if(st)st.innerHTML=n>0?`<span style="color:#16a34a;font-weight:600">✅ ${n} campo(s) preenchido(s)</span>`:`<span style="color:#f59e0b;font-weight:600">⚠️ PDF processado mas dados não identificados</span>`;
  }
};
window._frotaDados = [];
window._frotaSort = { col: '', dir: 'asc' };
window._frotaSearch = '';

window.ordenarFrota = function(col) {
  if (window._frotaSort.col === col) {
    window._frotaSort.dir = window._frotaSort.dir === 'asc' ? 'desc' : 'asc';
  } else {
    window._frotaSort.col = col;
    window._frotaSort.dir = 'asc';
  }
  renderTabelaFrota();
};

window.filtrarFrota = function(val) {
  window._frotaSearch = (val || '').trim().toLowerCase();
  renderTabelaFrota();
};

function renderTabelaFrota() {
  const tb = document.getElementById('frota-tbody');
  if (!tb) return;
  const ths = document.querySelectorAll('#frota-thead th');
  ths.forEach(th => {
    const s = th.querySelector('.ph-caret-down, .ph-caret-up');
    if (s) {
      if (th.dataset.col === window._frotaSort.col) {
        s.className = window._frotaSort.dir === 'asc' ? 'ph ph-caret-up' : 'ph ph-caret-down';
        s.style.color = '#2d9e5f';
      } else {
        s.className = 'ph ph-caret-down';
        s.style.color = '#cbd5e1';
      }
    }
  });

  let rows = [...window._frotaDados];
  
  if (window._frotaSearch) {
    const s = window._frotaSearch;
    rows = rows.filter(v => {
      const p = v.placa || '';
      const m = v.marca_modelo_versao || '';
      const c = v.cor_predominante || '';
      const a = String(v.ano_modelo || '');
      const e = String(v.exercicio || '');
      const r = v.renavam || '';
      const t = String(v.capacidade_tanque || '');
      const cg = String(v.capacidade_carga || '');
      const tp = v.tipo_veiculo || '';
      return p.toLowerCase().includes(s) || m.toLowerCase().includes(s) || 
             c.toLowerCase().includes(s) || a.includes(s) || e.includes(s) || 
             r.toLowerCase().includes(s) || t.includes(s) || cg.includes(s) || 
             tp.toLowerCase().includes(s);
    });
  }
  if (window._frotaSort.col) {
    rows.sort((a, b) => {
      let va = a[window._frotaSort.col] || '';
      let vb = b[window._frotaSort.col] || '';
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (window._frotaSort.col === 'ano_modelo') {
        va = parseInt(va) || 0; vb = parseInt(vb) || 0;
      } else if (window._frotaSort.col === 'exercicio') {
        let vaAno = parseInt(a.exercicio) || 0;
        let vbAno = parseInt(b.exercicio) || 0;
        let vaMes = getMesVenc(a.placa) || 0;
        let vbMes = getMesVenc(b.placa) || 0;
        va = vaAno * 100 + vaMes;
        vb = vbAno * 100 + vbMes;
      }
      if (va < vb) return window._frotaSort.dir === 'asc' ? -1 : 1;
      if (va > vb) return window._frotaSort.dir === 'asc' ? 1 : -1;
      return 0;
    });
  }

  const meses = ['','Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  if (!rows || !rows.length) {
    tb.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:2rem;color:#94a3b8;">Nenhum veículo cadastrado</td></tr>';
    return;
  }
  tb.innerHTML = rows.map((v, i) => {
    const alerta = alertaPlaca(v.placa, v.exercicio);
    const mesV = getMesVenc(v.placa);
    const anoVencimento = parseInt(v.exercicio) + 1;
    const exStr = v.exercicio + (mesV && anoVencimento ? ` (vence em ${meses[mesV]} / ${anoVencimento})` : '');
    const exStyle = alerta ? 'color:#dc2626;font-weight:700;' : '';
    return `<tr style="background:${i%2===0?'#fff':'#f8fafc'};border-bottom:none;">
<td style="padding:10px 12px;font-weight:700;color:#2d9e5f;">${v.placa||''}</td>
<td style="padding:10px 12px;">${v.marca_modelo_versao||''}</td>
<td style="padding:10px 12px;">${v.cor_predominante||''}</td>
<td style="padding:10px 12px;">${v.ano_modelo||''}</td>
<td style="padding:10px 12px;"><span style="${exStyle}">${alerta?'⚠️ ':''}${exStr}</span></td>
<td style="padding:10px 12px;">${v.renavam||''}</td>
<td style="padding:10px 12px;">${v.capacidade_tanque?v.capacidade_tanque+' L':'-'}</td>
<td style="padding:10px 12px;">${v.capacidade_carga?v.capacidade_carga+' kg':'-'}</td>
<td style="padding:10px 12px;">${v.tipo_veiculo||''}</td>
<td style="padding:10px 12px;text-align:center;white-space:nowrap;">
<button onclick="window.abrirModalFrota(${v.id})" style="background:#2563eb;color:#fff;border:none;border-radius:6px;padding:5px 10px;cursor:pointer;margin-right:4px;" title="Editar"><i class="ph ph-pencil"></i></button>
<button onclick="window.excluirVeiculoFrota(${v.id},'${v.placa}')" style="background:#dc2626;color:#fff;border:none;border-radius:6px;padding:5px 10px;cursor:pointer;" title="Excluir"><i class="ph ph-trash"></i></button>
</td></tr>`;
  }).join('');
}

window.initFrotaVeiculos = async function() {
  const c = document.getElementById('frota-veiculos-container'); if (!c) return;
  await carregarPDFjs();
  const tok = window.currentToken || localStorage.getItem('token');
  
  const thStyle = "position:sticky;top:0;background:#fafafa;padding:12px;text-align:left;color:#475569;font-weight:700;border-bottom:1px solid #e2e8f0;cursor:pointer;user-select:none;z-index:2;";
  const st = (col, label) => `<th data-col="${col}" onclick="window.ordenarFrota('${col}')" style="${thStyle}">
    <div style="display:flex;align-items:center;gap:4px;">${label} <i class="ph ph-caret-down" style="color:#cbd5e1;font-size:0.9rem;"></i></div>
  </th>`;

  c.innerHTML = `<div style="padding:1.5rem;background:#f1f5f9;height:100%;">
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;flex-wrap:wrap;gap:1rem;">
<h2 style="margin:0;color:#1e293b;display:flex;align-items:center;gap:8px;"><i class="ph ph-truck" style="color:#2d9e5f;"></i> Frota de Veículos</h2>
<div style="display:flex;align-items:center;gap:12px;">
  <div style="position:relative;">
    <i class="ph ph-magnifying-glass" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:#94a3b8;"></i>
    <input type="text" placeholder="Buscar veículo..." onkeyup="window.filtrarFrota(this.value)" style="padding:0.6rem 1rem 0.6rem 2.2rem;border:1px solid #cbd5e1;border-radius:8px;font-size:0.88rem;width:250px;outline:none;" onfocus="this.style.borderColor='#2d9e5f'" onblur="this.style.borderColor='#cbd5e1'">
  </div>
  <button onclick="window.abrirModalFrota(null)" style="background:#2d9e5f;color:#fff;border:none;border-radius:8px;padding:0.6rem 1.2rem;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:6px;white-space:nowrap;"><i class="ph ph-plus"></i> Novo Veículo</button>
</div>
</div>
<div style="background:#fff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.08);overflow-y:auto;height:calc(100vh - 260px);">
<table style="width:100%;border-collapse:collapse;font-size:0.86rem;">
<thead id="frota-thead"><tr>
${st('placa', 'Placa')}
${st('marca_modelo_versao', 'Marca/Modelo/Versão')}
${st('cor_predominante', 'Cor')}
${st('ano_modelo', 'Ano Modelo')}
${st('exercicio', 'Exercício / Vencimento')}
${st('renavam', 'RENAVAM')}
${st('capacidade_tanque', 'Tanque')}
${st('capacidade_carga', 'Carga')}
${st('tipo_veiculo', 'Tipo')}
<th style="${thStyle.replace('cursor:pointer;','')} text-align:center;">Ações</th>
</tr></thead>
<tbody id="frota-tbody"><tr><td colspan="10" style="text-align:center;padding:2rem;color:#94a3b8;">Carregando...</td></tr></tbody>
</table></div></div>`;
  try {
    const res = await fetch('/api/frota/veiculos', { headers: { Authorization: 'Bearer ' + tok } });
    const rows = await res.json();
    window._frotaDados = rows || [];
    renderTabelaFrota();
  } catch (e) {
    const tb = document.getElementById('frota-tbody');
    if (tb) tb.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:2rem;color:#dc2626;">Erro: ${e.message}</td></tr>`;
  }
};

window.abrirModalFrota=async function(id){
  const tok = window.currentToken || localStorage.getItem('token');
  let v={};
  if(id){const r=await fetch('/api/frota/veiculos/'+id,{headers:{Authorization:'Bearer '+tok}});v=await r.json();}
  window._frotaB64=null;window._frotaFN=null;
  let ov=document.getElementById('modal-frota-ov');if(ov)ov.remove();
  ov=document.createElement('div');ov.id='modal-frota-ov';
  ov.style.cssText='position:fixed;inset:0;background:rgba(15,23,42,.75);z-index:9999;display:flex;align-items:center;justify-content:center;';
  const tipos=['caminhão','caminhonete','utilitário','carretinha','caminhão tanque'];
  const optT=tipos.map(t=>`<option value="${t}"${(v.tipo_veiculo||'caminhão')===t?' selected':''}>${t.charAt(0).toUpperCase()+t.slice(1)}</option>`).join('');
  const inp=(id,val,ph,type)=>`<input id="${id}" value="${val||''}" placeholder="${ph||''}" type="${type||'text'}" style="width:100%;padding:.55rem;border:1px solid #e2e8f0;border-radius:8px;box-sizing:border-box;font-size:.85rem;">`;
  const lbl=t=>`<label style="font-size:.76rem;font-weight:600;color:#475569;display:block;margin-bottom:3px;">${t}</label>`;
  const alerta=alertaPlaca(v.placa,v.exercicio);
  const alertaHtml=alerta&&id?`<div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:.75rem 1rem;margin-bottom:1rem;color:#dc2626;font-weight:600;font-size:.85rem;">⚠️ CRLV vencido ou a vencer — atualize o documento</div>`:'';
  ov.innerHTML=`<div style="background:#fff;border-radius:16px;width:95vw;max-width:900px;max-height:90vh;overflow-y:auto;box-shadow:0 25px 60px rgba(0,0,0,.4);display:flex;flex-direction:column;">
<div style="padding:1rem 1.5rem;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;background:#f8fafc;border-radius:16px 16px 0 0;position:sticky;top:0;z-index:2;">
<div style="font-size:1rem;font-weight:700;color:#1e293b;display:flex;align-items:center;gap:8px;"><i class="ph ph-truck" style="color:#2d9e5f;"></i>${id?'Editar Veículo':'Novo Veículo'}</div>
<button onclick="document.getElementById('modal-frota-ov').remove()" style="background:none;border:none;font-size:1.5rem;cursor:pointer;color:#64748b;"><i class="ph ph-x"></i></button>
</div>
<div style="padding:1.5rem;">
${alertaHtml}
<div style="background:linear-gradient(135deg,#ecfdf5,#d1fae5);border:2px dashed #6ee7b7;border-radius:12px;padding:1rem;margin-bottom:1.25rem;text-align:center;">
<i class="ph ph-file-pdf" style="font-size:1.8rem;color:#2d9e5f;display:block;margin-bottom:.4rem;"></i>
<p style="margin:0 0 .5rem;font-weight:600;color:#065f46;font-size:.88rem;">📄 Importar dados do CRLV (PDF)</p>
<label style="background:#2d9e5f;color:#fff;padding:.45rem 1rem;border-radius:8px;cursor:pointer;font-weight:600;font-size:.85rem;display:inline-flex;align-items:center;gap:6px;">
<i class="ph ph-upload-simple"></i> Selecionar CRLV
<input type="file" accept=".pdf" style="display:none;" onchange="window.processarCRLV(this,'new')">
</label>
<div id="crlv-status" style="margin-top:.6rem;font-size:.8rem;color:#6b7280;"></div>
</div>
<p style="font-weight:700;color:#334155;margin:0 0 .6rem;font-size:.88rem;border-bottom:2px solid #e2e8f0;padding-bottom:.3rem;">🚛 Dados do Veículo</p>
<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:.85rem;margin-bottom:.85rem;">
<div>${lbl('Placa *')}${inp('fv-placa',v.placa,'ABC1234')}</div>
<div style="grid-column:span 2;">${lbl('Marca / Modelo / Versão')}${inp('fv-marca',v.marca_modelo_versao,'Ex: FORD/CARGO 2429 E')}</div>
<div>${lbl('Cor Predominante')}${inp('fv-cor',v.cor_predominante,'BRANCA')}</div>
<div>${lbl('Ano Modelo')}${inp('fv-anomodelo',v.ano_modelo,'2025')}</div>
<div>${lbl('Exercício (Ano Validade)')}${inp('fv-exercicio',v.exercicio,'2025')}</div>
<div>${lbl('Código RENAVAM')}${inp('fv-renavam',v.renavam,'00000000000')}</div>
<div>${lbl('Capacidade Tanque (L)')}${inp('fv-tanque',v.capacidade_tanque,'','number')}</div>
<div>${lbl('Capacidade Carga (kg)')}${inp('fv-carga',v.capacidade_carga,'','number')}</div>
<div>${lbl('Tipo de Veículo')}<select id="fv-tipo" style="width:100%;padding:.55rem;border:1px solid #e2e8f0;border-radius:8px;background:#fff;box-sizing:border-box;font-size:.85rem;">${optT}</select></div>
</div>
<p style="font-weight:700;color:#334155;margin:0 0 .6rem;font-size:.88rem;border-bottom:2px solid #e2e8f0;padding-bottom:.3rem;">📐 Medidas</p>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:.85rem;margin-bottom:1.5rem;">
<div>${lbl('Altura c/ Banheiro (m)')}${inp('fv-alt-c',v.altura_com_banheiro,'','number')}</div>
<div>${lbl('Altura s/ Banheiro (m)')}${inp('fv-alt-s',v.altura_sem_banheiro,'','number')}</div>
<div>${lbl('Largura c/ Banheiro (m)')}${inp('fv-larg-c',v.largura_com_banheiro,'','number')}</div>
<div>${lbl('Largura s/ Banheiro (m)')}${inp('fv-larg-s',v.largura_sem_banheiro,'','number')}</div>
<div>${lbl('Profundidade c/ Banheiro (m)')}${inp('fv-prof-c',v.profundidade_com_banheiro,'','number')}</div>
<div>${lbl('Profundidade s/ Banheiro (m)')}${inp('fv-prof-s',v.profundidade_sem_banheiro,'','number')}</div>
</div>
<div style="display:flex;gap:.75rem;justify-content:flex-end;">
<button onclick="document.getElementById('modal-frota-ov').remove()" style="background:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;padding:.55rem 1.1rem;font-weight:600;cursor:pointer;color:#475569;font-size:.85rem;">Cancelar</button>
${id?`<button onclick="window.abrirAtualizarCRLV(${id})" style="background:#f59e0b;color:#fff;border:none;border-radius:8px;padding:.55rem 1.1rem;font-weight:600;cursor:pointer;font-size:.85rem;display:inline-flex;align-items:center;gap:6px;"><i class="ph ph-arrows-clockwise"></i> Atualizar CRLV</button>`:''}
<button onclick="window.salvarVeiculoFrota(${id||'null'})" style="background:#2d9e5f;color:#fff;border:none;border-radius:8px;padding:.55rem 1.2rem;font-weight:600;cursor:pointer;font-size:.85rem;display:inline-flex;align-items:center;gap:6px;"><i class="ph ph-floppy-disk"></i> Salvar</button>
</div></div></div>`;
  document.body.appendChild(ov);
  ov.addEventListener('click',e=>{if(e.target===ov)ov.remove();});
};

window.abrirAtualizarCRLV=function(id){
  let ov2=document.getElementById('modal-upd-crlv');if(ov2)ov2.remove();
  ov2=document.createElement('div');ov2.id='modal-upd-crlv';
  ov2.style.cssText='position:fixed;inset:0;background:rgba(15,23,42,.85);z-index:10000;display:flex;align-items:center;justify-content:center;';
  ov2.innerHTML=`<div style="background:#fff;border-radius:16px;width:92vw;max-width:520px;box-shadow:0 25px 60px rgba(0,0,0,.4);overflow:hidden;">
<div style="padding:1rem 1.5rem;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;background:#fff7ed;">
<div style="font-weight:700;color:#92400e;display:flex;align-items:center;gap:8px;"><i class="ph ph-arrows-clockwise" style="color:#f59e0b;"></i>Atualizar CRLV</div>
<button onclick="document.getElementById('modal-upd-crlv').remove()" style="background:none;border:none;font-size:1.4rem;cursor:pointer;color:#64748b;"><i class="ph ph-x"></i></button>
</div>
<div style="padding:1.5rem;">
<p style="color:#475569;font-size:.88rem;margin:0 0 1rem;">Selecione o novo PDF do CRLV. O sistema vai extrair automaticamente o Exercício do documento.</p>
<div style="background:#fffbeb;border:2px dashed #fcd34d;border-radius:10px;padding:1rem;text-align:center;margin-bottom:1rem;">
<label style="background:#f59e0b;color:#fff;padding:.5rem 1.1rem;border-radius:8px;cursor:pointer;font-weight:600;font-size:.85rem;display:inline-flex;align-items:center;gap:6px;">
<i class="ph ph-upload-simple"></i> Selecionar novo PDF
<input type="file" accept=".pdf" style="display:none;" onchange="window.processarCRLV(this,'update')">
</label>
<div id="crlv-upd-status" style="margin-top:.6rem;font-size:.82rem;color:#6b7280;"></div>
</div>
<div style="margin-bottom:1rem;">
<label style="font-size:.78rem;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Novo Exercício (Ano)</label>
<input id="fv-exercicio-upd" placeholder="Ex: 2026" style="width:100%;padding:.6rem;border:1px solid #e2e8f0;border-radius:8px;box-sizing:border-box;font-size:.88rem;">
</div>
<div style="display:flex;gap:.75rem;justify-content:flex-end;">
<button onclick="document.getElementById('modal-upd-crlv').remove()" style="background:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;padding:.55rem 1rem;font-weight:600;cursor:pointer;color:#475569;font-size:.85rem;">Cancelar</button>
<button onclick="window.confirmarAtualizarCRLV(${id})" style="background:#f59e0b;color:#fff;border:none;border-radius:8px;padding:.55rem 1.2rem;font-weight:600;cursor:pointer;font-size:.85rem;display:inline-flex;align-items:center;gap:6px;"><i class="ph ph-check"></i> Confirmar Atualização</button>
</div>
</div></div>`;
  document.body.appendChild(ov2);
};

window.confirmarAtualizarCRLV=async function(id){
  const tok = window.currentToken || localStorage.getItem('token');
  const exEl=document.getElementById('fv-exercicio-upd');
  const novoExercicio=exEl?exEl.value.trim():'';
  if(!novoExercicio){alert('Informe o ano de exercício do novo CRLV');return;}
  if(!window._frotaB64){alert('Selecione o PDF do novo CRLV');return;}
  try{
    const res=await fetch('/api/frota/veiculos/'+id,{method:'PUT',headers:{'Content-Type':'application/json',Authorization:'Bearer '+tok},body:JSON.stringify({exercicio:novoExercicio,crlv_base64:window._frotaB64,crlv_filename:window._frotaFN})});
    const data=await res.json();
    if(!res.ok)throw new Error(data.error||'Erro ao atualizar');
    document.getElementById('modal-upd-crlv').remove();
    document.getElementById('modal-frota-ov').remove();
    window.initFrotaVeiculos();
    window._frotaB64=null;window._frotaFN=null;
  }catch(e){alert('Erro: '+e.message);}
};

window.salvarVeiculoFrota=async function(id){
  const tok = window.currentToken || localStorage.getItem('token');
  const g=sel=>{const el=document.getElementById(sel);return el?el.value.trim():'';};
  const placa=g('fv-placa');if(!placa){alert('Placa é obrigatória');return;}
  const body={placa,marca_modelo_versao:g('fv-marca'),cor_predominante:g('fv-cor'),ano_modelo:g('fv-anomodelo'),exercicio:g('fv-exercicio'),renavam:g('fv-renavam'),capacidade_tanque:g('fv-tanque'),capacidade_carga:g('fv-carga'),tipo_veiculo:g('fv-tipo'),altura_com_banheiro:g('fv-alt-c'),altura_sem_banheiro:g('fv-alt-s'),largura_com_banheiro:g('fv-larg-c'),largura_sem_banheiro:g('fv-larg-s'),profundidade_com_banheiro:g('fv-prof-c'),profundidade_sem_banheiro:g('fv-prof-s'),crlv_base64:window._frotaB64||null,crlv_filename:window._frotaFN||null};
  try{
    const res=await fetch(id?'/api/frota/veiculos/'+id:'/api/frota/veiculos',{method:id?'PUT':'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+tok},body:JSON.stringify(body)});
    const data=await res.json();
    if(!res.ok)throw new Error(data.error||'Erro ao salvar');
    document.getElementById('modal-frota-ov').remove();
    window._frotaB64=null;window._frotaFN=null;
    window.initFrotaVeiculos();
  }catch(e){alert('Erro: '+e.message);}
};

window.excluirVeiculoFrota=async function(id,placa){
  if(!confirm('Excluir o veículo '+placa+'?'))return;
  const tok = window.currentToken || localStorage.getItem('token');
  await fetch('/api/frota/veiculos/'+id,{method:'DELETE',headers:{Authorization:'Bearer '+tok}});
  window.initFrotaVeiculos();
};
})();

function b64(file){return new Promise((r,j)=>{const f=new FileReader();f.onload=()=>r(f.result.split(',')[1]);f.onerror=j;f.readAsDataURL(file);});}
async function carregarPDFjs() {
  if (window.pdfjsLib) return;
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js';
    script.onload = () => {
      window.pdfjsLib = window['pdfjs-dist/build/pdf'];
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
      resolve();
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}
