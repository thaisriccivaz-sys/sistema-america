(function(){
function getMesVenc(placa){const c=(placa||'').trim().slice(-1).toUpperCase();return({'1':7,'2':7,'3':8,'4':8,'5':9,'6':9,'7':10,'8':10,'9':11,'0':12})[c]||null;}
function alertaPlaca(placa,exercicio){const hoje=new Date();const ano=parseInt(exercicio);const mes=getMesVenc(placa);if(!mes||!ano)return null;const expirado=(ano<hoje.getFullYear())||(ano===hoje.getFullYear()&&hoje.getMonth()+1>=mes);return expirado?'expirado':null;}
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
        const d={};
        const mP=txt.match(/([A-Z]{3}[0-9][A-Z0-9][0-9]{2})/);
        if(mP){d.placa=mP[1];const mE=txt.match(new RegExp(mP[1]+'(\\d{4})'));if(mE)d.exercicio=mE[1];}
        const mR=txt.match(/\b(\d{9,11})\b/);if(mR)d.renavam=mR[1];
        const mA=txt.match(/\b(\d{4})(\d{4})\b/);if(mA){d.ano_fabricacao=mA[1];d.ano_modelo=mA[2];}
        const cores=['BRANCA','PRETA','CINZA','VERMELHA','AZUL','VERDE','AMARELA','LARANJA','MARROM','BEGE','PRATA','DOURADA','VINHO'];
        for(const c of cores){if(txt.toUpperCase().includes(c)){d.cor=c;break;}}
        // Marca/Modelo: linha não numérica que contenha letras e "/" ou seja conhecida
        const linhas=txt.split('\n').map(l=>l.trim()).filter(l=>l.length>3);
        for(const l of linhas){
          if(/^[A-Z][A-Z0-9 \/\-\.]{3,40}$/.test(l)&&!/^(BRANCA|PRETA|CINZA|VERMELHA|AZUL|VERDE|AMARELA|LARANJA|MARROM|BEGE|PRATA|DOURADA|VINHO|PARTICULAR|COMERCIAL|CARROCERIA|CARGA|SEM|AMERICA|GUARULHOS|DETRAN|MINISTERIO|SENATRAN|INFORMACOES|MENSAGENS|DADOS|VOCE|SABIA|REPASSE|CUSTO|VALOR|TOTAL|CATEGORIA|ESPECIE|COMBUSTIVEL|MOTOR|CHASSI|NUMERO|LOCAL|DATA|CPF|CNPJ)/.test(l)&&l.includes('/')&&!/^\*/.test(l)){d.marca_modelo_versao=l;break;}
        }
        resolve(d);
      }catch(err){console.error('[CRLV]',err);resolve({});}
    };
    fr.readAsArrayBuffer(file);
  });
}
async function carregarPDFjs(){
  if(window.pdfjsLib)return;
  await new Promise(r=>{const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';s.onload=()=>{if(window.pdfjsLib)window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';r();};document.head.appendChild(s);});
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
window.initFrotaVeiculos=async function(){
  const c=document.getElementById('frota-veiculos-container');if(!c)return;
  await carregarPDFjs();
  const tok=window.currentToken||localStorage.getItem('erp_token');
  const meses=['','Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  c.innerHTML=`<div style="padding:1.5rem;background:#f1f5f9;min-height:100vh;">
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;">
<h2 style="margin:0;color:#1e293b;display:flex;align-items:center;gap:8px;"><i class="ph ph-truck" style="color:#2d9e5f;"></i> Frota de Veículos</h2>
<button onclick="window.abrirModalFrota(null)" style="background:#2d9e5f;color:#fff;border:none;border-radius:8px;padding:0.6rem 1.2rem;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:6px;"><i class="ph ph-plus"></i> Novo Veículo</button>
</div>
<div style="background:#fff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.08);overflow:auto;">
<table style="width:100%;border-collapse:collapse;font-size:0.84rem;">
<thead><tr style="background:#1e293b;color:#fff;">
<th style="padding:10px 12px;text-align:left;">Placa</th>
<th style="padding:10px 12px;text-align:left;">Marca/Modelo/Versão</th>
<th style="padding:10px 12px;text-align:left;">Cor</th>
<th style="padding:10px 12px;text-align:left;">Ano Modelo</th>
<th style="padding:10px 12px;text-align:left;">Exercício / Vencimento</th>
<th style="padding:10px 12px;text-align:left;">RENAVAM</th>
<th style="padding:10px 12px;text-align:left;">Tanque</th>
<th style="padding:10px 12px;text-align:left;">Carga</th>
<th style="padding:10px 12px;text-align:left;">Tipo</th>
<th style="padding:10px 12px;text-align:center;">Ações</th>
</tr></thead>
<tbody id="frota-tbody"><tr><td colspan="10" style="text-align:center;padding:2rem;color:#94a3b8;">Carregando...</td></tr></tbody>
</table></div></div>`;
  try{
    const res=await fetch('/api/frota/veiculos',{headers:{Authorization:'Bearer '+tok}});
    const rows=await res.json();
    const tb=document.getElementById('frota-tbody');if(!tb)return;
    if(!rows||!rows.length){tb.innerHTML='<tr><td colspan="10" style="text-align:center;padding:2rem;color:#94a3b8;">Nenhum veículo cadastrado</td></tr>';return;}
    tb.innerHTML=rows.map((v,i)=>{
      const alerta=alertaPlaca(v.placa,v.exercicio);
      const mesV=getMesVenc(v.placa);
      const exStr=v.exercicio+(mesV?` (vence ${meses[mesV]})`:'');
      const exStyle=alerta?'background:#fef2f2;color:#dc2626;font-weight:700;border-radius:6px;padding:3px 8px;white-space:nowrap;':'';
      return `<tr style="background:${i%2===0?'#fff':'#f8fafc'};border-bottom:1px solid #e2e8f0;${alerta?'outline:2px solid #fca5a5;':''}" >
<td style="padding:9px 12px;font-weight:700;color:#2d9e5f;">${v.placa||''}</td>
<td style="padding:9px 12px;">${v.marca_modelo_versao||''}</td>
<td style="padding:9px 12px;">${v.cor_predominante||''}</td>
<td style="padding:9px 12px;">${v.ano_modelo||''}</td>
<td style="padding:9px 12px;"><span style="${exStyle}">${alerta?'⚠️ ':' '}${exStr}</span></td>
<td style="padding:9px 12px;">${v.renavam||''}</td>
<td style="padding:9px 12px;">${v.capacidade_tanque?v.capacidade_tanque+' L':'-'}</td>
<td style="padding:9px 12px;">${v.capacidade_carga?v.capacidade_carga+' kg':'-'}</td>
<td style="padding:9px 12px;">${v.tipo_veiculo||''}</td>
<td style="padding:9px 12px;text-align:center;white-space:nowrap;">
<button onclick="window.abrirModalFrota(${v.id})" style="background:#2563eb;color:#fff;border:none;border-radius:6px;padding:5px 10px;cursor:pointer;margin-right:4px;" title="Editar"><i class="ph ph-pencil"></i></button>
<button onclick="window.excluirVeiculoFrota(${v.id},'${v.placa}')" style="background:#dc2626;color:#fff;border:none;border-radius:6px;padding:5px 10px;cursor:pointer;" title="Excluir"><i class="ph ph-trash"></i></button>
</td></tr>`;
    }).join('');
  }catch(e){const tb=document.getElementById('frota-tbody');if(tb)tb.innerHTML=`<tr><td colspan="10" style="text-align:center;padding:2rem;color:#dc2626;">Erro: ${e.message}</td></tr>`;}
};

window.abrirModalFrota=async function(id){
  const tok=window.currentToken||localStorage.getItem('erp_token');
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
  const tok=window.currentToken||localStorage.getItem('erp_token');
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
  const tok=window.currentToken||localStorage.getItem('erp_token');
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
  const tok=window.currentToken||localStorage.getItem('erp_token');
  await fetch('/api/frota/veiculos/'+id,{method:'DELETE',headers:{Authorization:'Bearer '+tok}});
  window.initFrotaVeiculos();
};
})();
