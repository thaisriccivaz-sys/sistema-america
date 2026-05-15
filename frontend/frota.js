(function(){
function getMesVenc(placa){const c=(placa||'').trim().slice(-1).toUpperCase();return({'1':7,'2':7,'3':8,'4':8,'5':9,'6':9,'7':10,'8':10,'9':11,'0':12})[c]||null;}
function getRodizio(placa){
    if(!placa) return 'N/D';
    const c=placa.trim().slice(-1);
    if(['1','2'].includes(c)) return 'Segunda-feira';
    if(['3','4'].includes(c)) return 'Terça-feira';
    if(['5','6'].includes(c)) return 'Quarta-feira';
    if(['7','8'].includes(c)) return 'Quinta-feira';
    if(['9','0'].includes(c)) return 'Sexta-feira';
    return 'N/D';
}
function alertaPlaca(placa,exercicio){
  const hoje=new Date();
  const anoVencimento = parseInt(exercicio) + 1;
  const mesVencimento = getMesVenc(placa);
  if(!mesVencimento||!anoVencimento) return null;
  
  if ((hoje.getFullYear() > anoVencimento) || (hoje.getFullYear() === anoVencimento && hoje.getMonth() + 1 > mesVencimento)) {
      return 'expirado';
  }
  if (hoje.getFullYear() === anoVencimento && hoje.getMonth() + 1 === mesVencimento) {
      return 'vencendo';
  }
  return 'ok';
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
        const linhas=txt.split('\n').map(l=>l.trim()).filter(l=>l.length>0);
        const d={};
        let placaIdx=-1;
        for(let i=0;i<linhas.length;i++){if(/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(linhas[i])){d.placa=linhas[i];placaIdx=i;break;}}
        if(placaIdx>=0){
          for(let i=placaIdx+1;i<Math.min(placaIdx+8,linhas.length);i++){
            if(/^\d{4}$/.test(linhas[i])&&parseInt(linhas[i])>=2020){d.exercicio=linhas[i];
              for(let j=i+1;j<Math.min(i+8,linhas.length);j++){
                if(/^\d{4}$/.test(linhas[j])&&parseInt(linhas[j])>=1950){d.ano_fabricacao=linhas[j];
                  for(let k=j+1;k<Math.min(j+8,linhas.length);k++){
                    if(/^\d{4}$/.test(linhas[k])&&parseInt(linhas[k])>=1950){d.ano_modelo=linhas[k];break;}
                  }break;}
              }break;}
          }
        }
        for(const l of linhas){if(/^\d{9,11}$/.test(l)&&l!==d.placa&&l!==d.exercicio&&l!==d.ano_fabricacao&&l!==d.ano_modelo){d.renavam=l;break;}}
        const cores=['BRANCA','PRETA','CINZA','VERMELHA','AZUL','VERDE','AMARELA','LARANJA','MARROM','BEGE','PRATA','DOURADA','VINHO','BEGE'];
        for(const l of linhas){const u=l.toUpperCase();for(const c of cores){if(u===c||u.startsWith(c)){d.cor=c;break;}}if(d.cor)break;}
        const excl=/^(BRANCA|PRETA|CINZA|VERMELHA|AZUL|VERDE|AMARELA|LARANJA|MARROM|BEGE|PRATA|DOURADA|VINHO|PARTICULAR|COMERCIAL|CARROCERIA|CARGA|SEM OBS|AMERICA|GUARULHOS|DETRAN|SENATRAN|INFORMACOES|REPASSE|CUSTO|VALOR|TOTAL|ESPECIE|COMBUSTIVEL|LOCAL|DATA|CPF|CNPJ|SP|MG|RJ|PR|SC|RS|BA|GO)/i;
        for(let i=placaIdx>0?placaIdx:0;i<linhas.length;i++){const l=linhas[i];if(l.includes('/')&&!/^\*/.test(l)&&!/^\d/.test(l)&&l.length>4&&!excl.test(l)&&/[A-Z]{2}/.test(l)){d.marca_modelo_versao=l;break;}}
        resolve(d);
      }catch(err){console.error('[CRLV]',err);resolve({});}
    };
    fr.readAsArrayBuffer(file);
  });
}
function b64(file){return new Promise(r=>{const fr=new FileReader();fr.onload=e=>r(e.target.result);fr.readAsDataURL(file);});}

window._frotaB64=null;
window._frotaFN=null;
window._frotaImgB64=null;

window.processarCRLV=async function(inp,modo){
  const file=inp.files[0];if(!file)return;
  await carregarPDFjs();
  const statusId=modo==='update'?'crlv-upd-status':'crlv-status';
  const st=document.getElementById(statusId);
  if(st)st.innerHTML='<i class="ph ph-circle-notch ph-spin"></i> Lendo PDF...';
  window._frotaB64=await b64(file);window._frotaFN=file.name;
  const d=await extrairCRLV(file);
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

window.processarFotoVeiculo = async function(inp) {
    const file = inp.files[0];
    if (!file) return;
    const st = document.getElementById('foto-status');
    if (st) st.innerHTML = '<i class="ph ph-circle-notch ph-spin"></i> Processando foto...';
    
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (e) => {
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 800;
            const MAX_HEIGHT = 800;
            let width = img.width;
            let height = img.height;
            if (width > height) {
                if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
            } else {
                if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            window._frotaImgB64 = canvas.toDataURL('image/jpeg', 0.8);
            
            const prev = document.getElementById('fv-foto-preview');
            if (prev) {
                prev.src = window._frotaImgB64;
                prev.style.display = 'block';
            }
            if (st) st.innerHTML = '<span style="color:#16a34a;font-weight:600">✅ Foto carregada</span>';
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
};

window._frotaDados = [];

window.aplicarFiltrosFrota = function() {
  renderCardsFrota();
};

function renderCardsFrota() {
  const tb = document.getElementById('frota-grid');
  if (!tb) return;

  const fBusca = (document.getElementById('filtro-busca')?.value || '').trim().toLowerCase();
  const fTipo = document.getElementById('filtro-tipo')?.value || '';
  const fCor = document.getElementById('filtro-cor')?.value || '';
  const fRodizio = document.getElementById('filtro-rodizio')?.value || '';

  let rows = [...window._frotaDados];

  rows = rows.filter(v => {
    // Texto livre: Placa ou Modelo
    if (fBusca) {
      const p = v.placa || '';
      const m = v.marca_modelo_versao || '';
      if (!p.toLowerCase().includes(fBusca) && !m.toLowerCase().includes(fBusca)) return false;
    }
    // Tipo de Veículo
    if (fTipo) {
      const t = v.tipo_veiculo || '';
      if (t.toLowerCase() !== fTipo.toLowerCase()) return false;
    }
    // Cor
    if (fCor) {
      const c = v.cor_predominante || '';
      if (c.toLowerCase() !== fCor.toLowerCase()) return false;
    }
    // Rodízio
    if (fRodizio) {
      const r = getRodizio(v.placa);
      if (r !== fRodizio) return false;
    }
    return true;
  });

  rows.sort((a,b) => {
      const expA = alertaPlaca(a.placa, a.exercicio) === 'expirado' ? 1 : 0;
      const expB = alertaPlaca(b.placa, b.exercicio) === 'expirado' ? 1 : 0;
      if (expA !== expB) return expB - expA;
      return (a.placa||'').localeCompare(b.placa||'');
  });

  const ct = document.getElementById('frota-contador');
  if (ct) {
      ct.innerHTML = `<i class="ph ph-truck" style="font-size:1.1rem;margin-right:6px;"></i>${rows.length} ${rows.length === 1 ? 'veículo listado' : 'veículos listados'}`;
  }

  if (!rows || !rows.length) {
    tb.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:3rem;color:#94a3b8;font-size:1.1rem;">Nenhum veículo encontrado</div>';
    return;
  }

  tb.innerHTML = rows.map(v => {
    const alerta = alertaPlaca(v.placa, v.exercicio);
    const statusManut = (window._frotaStatusManut || {})[v.id] || {};
    const emManutencao = statusManut.manutencoes_ativas > 0 || v.em_manutencao;
    const kPatterns = (window._manutDados || []).filter(m => m.veiculo_id === v.id && m.status === 'agendada' && m.km_proxima_manutencao && v.km_atual && (m.km_proxima_manutencao - v.km_atual) <= 1000);
    const manutPreventivaPendente = kPatterns.length > 0;
    
    let borderColor = '#2d9e5f'; 
    let statusLabel = 'OK';
    let textColor = '#fff';
    let placaColor = '#2d9e5f';
    
    if (emManutencao) {
        borderColor = '#dc2626'; statusLabel = '\u26A0'; placaColor = '#dc2626';
    } else if (alerta === 'expirado') {
        borderColor = '#dc2626';
        statusLabel = '\u2716';
        placaColor = '#dc2626';
    } else if (manutPreventivaPendente || alerta === 'vencendo' || !v.exercicio) {
        borderColor = '#f59e0b';
        statusLabel = '!';
        textColor = '#fff';
        placaColor = '#d97706';
    }

    // Card background: amarelo quando houver alerta de manutenção preventiva
    const alertaManutStatus = statusManut.alerta_manutencao || 'ok';
    const cardBg = emManutencao ? '#fff5f5' : (alertaManutStatus === 'vencida' || alertaManutStatus === 'proxima' || manutPreventivaPendente) ? '#fffbeb' : '#fff';
    const cardBorder = emManutencao ? '2px solid #fca5a5' : (alertaManutStatus === 'vencida' || alertaManutStatus === 'proxima' || manutPreventivaPendente) ? '2px solid #fcd34d' : '1px solid #e2e8f0';

    const placeholder = 'https://via.placeholder.com/400x250/e2e8f0/94a3b8?text=Sem+Foto';
    const foto = v.foto_base64 || placeholder;
    const marcaCompleta = v.marca_modelo_versao || 'N/D';
    const rodizio = getRodizio(v.placa);

    return `
    <div style="background:${cardBg};border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.08);overflow:hidden;border:${cardBorder};position:relative;display:flex;flex-direction:column;transition:transform 0.2s, box-shadow 0.2s;" onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 12px 20px rgba(0,0,0,0.12)';" onmouseout="this.style.transform='none';this.style.boxShadow='0 4px 12px rgba(0,0,0,0.08)';">
        
        <div style="position:absolute;top:0;right:0;width:0;height:0;border-top:60px solid ${borderColor};border-left:60px solid transparent;z-index:2;"></div>
        <div style="position:absolute;top:8px;right:6px;z-index:3;color:${textColor};font-size:0.9rem;font-weight:900;transform:rotate(45deg);letter-spacing:1px;width:30px;text-align:center;">
            ${statusLabel}
        </div>

        <div style="height:140px;width:100%;background-image:url('${foto}');background-size:cover;background-position:center;border-bottom:1px solid #e2e8f0;"></div>
        
        <div style="padding:1rem;flex:1;display:flex;flex-direction:column;gap:0.5rem;font-size:0.85rem;color:#475569;">
            
            <!-- Placa (Cor dinamica baseada no status) -->
            <div style="display:flex;flex-direction:column;gap:0.1rem;margin-bottom:0.1rem;">
                <span style="font-weight:600;color:#94a3b8;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.5px;">Placa</span>
                <span style="font-weight:800;color:${placaColor};font-size:1.2rem;">${v.placa||'N/D'}</span>
            </div>
            
            <!-- Marca/Modelo/Versão sem label e com borda -->
            <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:0.6rem;border-radius:8px;margin-bottom:0.3rem;">
                <span style="font-weight:700;color:#1e293b;line-height:1.2;">${marcaCompleta}</span>
            </div>
            
            <div style="display:flex;justify-content:space-between;border-bottom:1px solid #f1f5f9;padding-bottom:0.3rem;">
                <span style="font-weight:600;color:#94a3b8;">Cor:</span>
                <span style="font-weight:700;color:#1e293b;">${v.cor_predominante||'N/D'}</span>
            </div>
            
            <div style="display:flex;justify-content:space-between;border-bottom:1px solid #f1f5f9;padding-bottom:0.3rem;">
                <span style="font-weight:600;color:#94a3b8;">Exercício:</span>
                <span style="font-weight:700;color:${alerta==='expirado'?'#dc2626':(alerta==='vencendo'?'#d97706':'#1e293b')};">${v.exercicio||'N/D'} ${alerta==='vencendo'?'(Vencendo)':''}</span>
            </div>

            <div style="display:flex;justify-content:space-between;border-bottom:1px solid #f1f5f9;padding-bottom:0.3rem;">
                <span style="font-weight:600;color:#94a3b8;">Rodízio (SP):</span>
                <span style="font-weight:700;color:#0369a1;">${rodizio}</span>
            </div>
            
            <div style="display:flex;justify-content:space-between;align-items:center;background:#f8fafc;padding:0.6rem;border-radius:8px;margin-top:0.2rem;border:1px solid #e2e8f0;">
                <div style="display:flex;align-items:center;gap:6px;">
                    <img src="/assets/icon_tanque.png" style="width:18px;height:18px;opacity:0.8;">
                    <span style="font-weight:700;color:#1e293b;">${v.capacidade_tanque?v.capacidade_tanque+' L':'N/D'}</span>
                </div>
                <div style="width:1px;height:20px;background:#cbd5e1;"></div>
                <div style="display:flex;align-items:center;gap:6px;">
                    <img src="/assets/icon_carga.png" style="width:18px;height:18px;opacity:0.8;">
                    <span style="font-weight:700;color:#1e293b;">${v.capacidade_carga?v.capacidade_carga+' un':'N/D'}</span>
                </div>
            </div>
        </div>

        <!-- KM diario -->
        <div style="background:#f8fafc;padding:0.6rem 1rem;border-top:1px solid #e2e8f0;display:flex;align-items:center;gap:8px;">
            <i class="ph ph-gauge" style="color:#d97706;font-size:1rem;"></i>
            <span style="font-size:0.78rem;color:#64748b;font-weight:600;">KM atual:</span>
            <input type="number" id="km-card-${v.id}" value="${v.km_atual||''}" placeholder="Digite KM" 
                style="flex:1;padding:0.3rem 0.5rem;border:1px solid #e2e8f0;border-radius:6px;font-size:0.8rem;outline:none;" 
                onkeydown="if(event.key==='Enter')window.salvarKmCard(${v.id})">
            <button onclick="window.salvarKmCard(${v.id})" 
                style="background:#d97706;color:#fff;border:none;border-radius:6px;padding:0.3rem 0.6rem;font-size:0.75rem;cursor:pointer;font-weight:600;white-space:nowrap;">
                Salvar
            </button>
        </div>

        <div style="background:#f8fafc;padding:0.75rem 1rem;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;">
            <div style="font-weight:800;color:#cbd5e1;font-size:0.75rem;letter-spacing:1px;text-transform:uppercase;">
                ${v.tipo_veiculo||'VEÍCULO'}
            </div>
            <div style="display:flex;gap:4px;">
                ${v.crlv_filename ? `<button onclick="window.visualizarCRLV(${v.id})" style="background:#0891b2;color:#fff;border:none;border-radius:6px;width:32px;height:32px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:0.2s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'" title="Visualizar CRLV"><i class="ph ph-file-pdf"></i></button>` : `<button disabled style="background:#e2e8f0;color:#fff;border:none;border-radius:6px;width:32px;height:32px;display:flex;align-items:center;justify-content:center;cursor:not-allowed;" title="Sem CRLV"><i class="ph ph-file-pdf"></i></button>`}
                <button onclick="window.abrirModalFrota(${v.id})" style="background:#2563eb;color:#fff;border:none;border-radius:6px;width:32px;height:32px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:0.2s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'" title="Editar"><i class="ph ph-pencil"></i></button>
                <button onclick="window.excluirVeiculoFrota(${v.id},'${v.placa}')" style="background:#dc2626;color:#fff;border:none;border-radius:6px;width:32px;height:32px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:0.2s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'" title="Excluir"><i class="ph ph-trash"></i></button>
            </div>
        </div>
    </div>
    `;
  }).join('');
}

window.salvarKmCard = async function(vid) {
    const inp = document.getElementById('km-card-' + vid);
    if (!inp || !inp.value) return;
    const km = parseInt(inp.value);
    const tok = window.currentToken || localStorage.getItem('token');
    try {
        const res = await fetch('/api/frota/veiculos/' + vid + '/km', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok },
            body: JSON.stringify({ km_atual: km })
        });
        if (!res.ok) throw new Error('Erro ao salvar KM');
        // Update local data and re-render
        const v = (window._frotaDados||[]).find(x => x.id === vid);
        if (v) v.km_atual = km;
        // Check alert status for this vehicle and re-render just this card's background
        const alertRes = await fetch('/api/frota/veiculos/' + vid + '/alertas', { headers: { Authorization: 'Bearer ' + tok } });
        const alertData = await alertRes.json();
        const temAlerta = alertData.tem_alerta;
        if (window._frotaStatusManut) {
            window._frotaStatusManut[vid] = {
                ...(window._frotaStatusManut[vid]||{}),
                km_atual: km,
                alerta_manutencao: temAlerta ? 'proxima' : 'ok'
            };
        }
        // Visual feedback
        inp.style.borderColor = '#2d9e5f';
        setTimeout(() => {
            if (inp) inp.style.borderColor = '#e2e8f0';
        }, 1500);
        // Full re-render to update card color
        renderCardsFrota();
    } catch(e) {
        alert('Erro ao salvar KM: ' + e.message);
    }
};

window.visualizarCRLV = async function(id) {

  const tok = window.currentToken || localStorage.getItem('token');
  try {
    const res = await fetch(`/api/frota/veiculos/${id}/crlv`, { headers: { Authorization: 'Bearer ' + tok } });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao baixar CRLV');
    if (!data.crlv_base64) throw new Error('Documento não encontrado.');

    let base64Data = data.crlv_base64;
    if (base64Data.includes(',')) base64Data = base64Data.split(',')[1];
    
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
    const blob = new Blob([new Uint8Array(byteNumbers)], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  } catch (err) { alert('Erro ao visualizar CRLV: ' + err.message); }
};


window.importarFrotaExcel = async function(input) {
  const file = input.files[0];
  if (!file) return;
  if (typeof ExcelJS === 'undefined') { alert('Biblioteca ExcelJS não carregada.'); return; }
  
  const tb = document.getElementById('frota-grid');
  if (tb) tb.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:3rem;color:#0ea5e9;"><i class="ph ph-circle-notch ph-spin" style="font-size:2rem;"></i><br>Lendo planilha e atualizando base...</div>';

  try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(file);
      const worksheet = workbook.getWorksheet(1);
      if (!worksheet) throw new Error('Planilha vazia ou inválida.');
      
      const rows = [];
      worksheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return; // skip header
          const getV = (col) => row.getCell(col).value ? row.getCell(col).value.toString().trim() : '';
          
          const placa = getV(1);
          if(!placa) return;
          
          rows.push({
              placa,
              marca_modelo_versao: getV(2),
              cor_predominante: getV(3),
              ano_modelo: getV(4),
              exercicio: getV(5),
              renavam: getV(6),
              capacidade_tanque: getV(7),
              capacidade_carga: getV(8),
              tipo_veiculo: getV(9),
              altura_com_banheiro: getV(10),
              altura_sem_banheiro: getV(11),
              largura_com_banheiro: getV(12),
              largura_sem_banheiro: getV(13),
              profundidade_com_banheiro: getV(14),
              profundidade_sem_banheiro: getV(15)
          });
      });
      
      const tok = window.currentToken || localStorage.getItem('token');
      
      let inseridos = 0;
      let atualizados = 0;
      let erros = 0;
      
      for(const item of rows) {
          const existing = window._frotaDados.find(v => v.placa === item.placa);
          if(existing) {
              // Update only data (no foto/crlv included, so backend won't overwrite them)
              try {
                  await fetch('/api/frota/veiculos/'+existing.id, {
                      method: 'PUT',
                      headers: {'Content-Type': 'application/json', Authorization: 'Bearer '+tok},
                      body: JSON.stringify(item)
                  });
                  atualizados++;
              } catch(e) { erros++; }
          } else {
              try {
                  await fetch('/api/frota/veiculos', {
                      method: 'POST',
                      headers: {'Content-Type': 'application/json', Authorization: 'Bearer '+tok},
                      body: JSON.stringify(item)
                  });
                  inseridos++;
              } catch(e) { erros++; }
          }
      }
      
      alert(`Importação concluída!\n\nAtualizados: ${atualizados}\nNovos inseridos: ${inseridos}\nErros: ${erros}`);
      window.initFrotaVeiculos();
  } catch(e) {
      alert('Erro ao importar: ' + e.message);
      window.initFrotaVeiculos();
  }
  input.value = ''; // clear
};

window.exportarFrotaExcel = async function() {
  if (!window._frotaDados || window._frotaDados.length === 0) { alert('Nenhum veículo para exportar.'); return; }
  if (typeof ExcelJS === 'undefined') { alert('Biblioteca ExcelJS não carregada.'); return; }

  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Frota');

    const HEADERS = ['Placa','Marca / Modelo / Versão','Cor Predominante','Ano Modelo','Exercício','RENAVAM','Capacidade Tanque (L)','Capacidade Carga (un)','Tipo de Veículo','Altura c/ Banheiro','Altura s/ Banheiro','Largura c/ Banheiro','Largura s/ Banheiro','Profundidade c/ Banheiro','Profundidade s/ Banheiro'];
    const headerRow = worksheet.addRow(HEADERS);
    headerRow.font = { bold: true };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1D5DB' } };

    window._frotaDados.forEach(v => {
      worksheet.addRow([
        v.placa||'', v.marca_modelo_versao||'', v.cor_predominante||'', v.ano_modelo||'', v.exercicio||'', v.renavam||'',
        v.capacidade_tanque||'', v.capacidade_carga||'', v.tipo_veiculo||'', v.altura_com_banheiro||'', v.altura_sem_banheiro||'',
        v.largura_com_banheiro||'', v.largura_sem_banheiro||'', v.profundidade_com_banheiro||'', v.profundidade_sem_banheiro||''
      ]);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `Frota_Veiculos_${new Date().toISOString().slice(0,10)}.xlsx`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch (err) { alert('Erro ao gerar o Excel: ' + err.message); }
};

function popularFiltros() {
    const corSelect = document.getElementById('filtro-cor');
    if(corSelect) {
        const cores = [...new Set(window._frotaDados.map(v => (v.cor_predominante||'').trim()).filter(c => c))];
        cores.sort();
        const options = cores.map(c => `<option value="${c}">${c}</option>`).join('');
        corSelect.innerHTML = '<option value="">Todas as Cores</option>' + options;
    }
}

window._frotaAbaAtiva = 'veiculos';

window.trocarAbaFrota = function(aba) {
    window._frotaAbaAtiva = aba;
    document.querySelectorAll('.frota-aba-btn').forEach(b => {
        const isActive = b.dataset.aba === aba;
        b.style.background = isActive ? '#2d9e5f' : '#fff';
        b.style.color = isActive ? '#fff' : '#475569';
        b.style.borderColor = isActive ? '#2d9e5f' : '#cbd5e1';
        b.style.fontWeight = isActive ? '700' : '600';
    });
    const inner = document.getElementById('frota-conteudo');
    if (!inner) return;
    if (aba === 'veiculos') _renderGestaoFrota(inner);
    else if (aba === 'manutencoes') { window._manutContainer = inner; window.initFrotaManutencoes(inner); }
};

// _renderGestaoFrota: renders fleet tab content into a given container
function _renderGestaoFrota(container) {
    // initFrotaVeiculos already renders into frota-conteudo, just call it
    window.initFrotaVeiculos();
}

window.initFrotaVeiculos = async function() {
  // Ensure the tab wrapper exists — render it if opening frota for the first time
  const outerC = document.getElementById('frota-veiculos-container');
  if (!outerC) return;
  
  // Build tab wrapper if not yet present
  if (!document.getElementById('frota-conteudo')) {
      outerC.innerHTML = `
      <div style="min-height:100%;">
        <div style="background:#fff;border-bottom:2px solid #e2e8f0;padding:0 1.5rem;display:flex;gap:4px;">
          <button class="frota-aba-btn" data-aba="veiculos" onclick="window.trocarAbaFrota('veiculos')" style="background:#2d9e5f;color:#fff;border:1px solid #2d9e5f;border-bottom:none;padding:0.75rem 1.5rem;font-weight:700;cursor:pointer;font-size:0.9rem;display:flex;align-items:center;gap:6px;border-radius:10px 10px 0 0;margin-top:4px;">
            <i class="ph ph-truck"></i> Gest\u00e3o de Frota
          </button>
          <button class="frota-aba-btn" data-aba="manutencoes" onclick="window.trocarAbaFrota('manutencoes')" style="background:#fff;color:#475569;border:1px solid #cbd5e1;border-bottom:none;padding:0.75rem 1.5rem;font-weight:600;cursor:pointer;font-size:0.9rem;display:flex;align-items:center;gap:6px;border-radius:10px 10px 0 0;margin-top:4px;">
            <i class="ph ph-wrench"></i> Manuten\u00e7\u00f5es
          </button>
        </div>
        <div id="frota-conteudo" style="min-height:400px;"></div>
      </div>`;
  } else {
      // Tabs already rendered — just reset active button
      document.querySelectorAll('.frota-aba-btn').forEach(b => {
          const isActive = b.dataset.aba === 'veiculos';
          b.style.background = isActive ? '#2d9e5f' : '#fff';
          b.style.color = isActive ? '#fff' : '#475569';
          b.style.borderColor = isActive ? '#2d9e5f' : '#cbd5e1';
      });
  }
  
  const c = document.getElementById('frota-conteudo');
  if (!c) return;
  window._frotaAbaAtiva = 'veiculos';
  await carregarPDFjs();
  const tok = window.currentToken || localStorage.getItem('token');
  
  c.innerHTML = `<div style="padding:1.5rem;background:#f8fafc;min-height:100%;">
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;flex-wrap:wrap;gap:1rem;">
    <h2 style="margin:0;color:#1e293b;display:flex;align-items:center;gap:12px;font-size:1.6rem;">
        <div style="background:#2d9e5f;color:#fff;width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 10px rgba(45,158,95,0.3);">
            <i class="ph ph-truck"></i>
        </div> 
        Gestão de Frota
    </h2>
    <div style="display:flex;align-items:center;gap:12px;">
        <button onclick="window.exportarFrotaExcel()" style="background:#fff;color:#475569;border:1px solid #cbd5e1;border-radius:10px;padding:0.7rem 1.2rem;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:6px;box-shadow:0 2px 4px rgba(0,0,0,0.02);transition:0.2s;" onmouseover="this.style.background='#f1f5f9'"><i class="ph ph-download-simple"></i> Baixar Excel</button>
        <label style="background:#0284c7;color:#fff;border:none;border-radius:10px;padding:0.7rem 1.2rem;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:6px;box-shadow:0 4px 10px rgba(2,132,199,0.25);transition:0.2s;" onmouseover="this.style.background='#0369a1'">
            <i class="ph ph-upload-simple"></i> Importar Excel
            <input type="file" accept=".xlsx" style="display:none;" onchange="window.importarFrotaExcel(this)">
        </label>
        <button onclick="window.abrirModalFrota(null)" style="background:#2d9e5f;color:#fff;border:none;border-radius:10px;padding:0.7rem 1.2rem;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:6px;box-shadow:0 4px 10px rgba(45,158,95,0.25);transition:0.2s;" onmouseover="this.style.background='#23824e'"><i class="ph ph-plus-circle"></i> Novo Veículo</button>
    </div>
</div>

<div style="background:#fff;padding:1rem;border-radius:12px;border:1px solid #e2e8f0;margin-bottom:1.5rem;display:flex;flex-wrap:wrap;gap:1rem;align-items:center;box-shadow:0 2px 4px rgba(0,0,0,0.02);">
    <div style="position:relative;flex:1;min-width:200px;">
        <i class="ph ph-magnifying-glass" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#94a3b8;font-size:1.1rem;"></i>
        <input type="text" id="filtro-busca" placeholder="Buscar por placa ou modelo..." onkeyup="window.aplicarFiltrosFrota()" style="padding:0.6rem 1rem 0.6rem 2.4rem;border:1px solid #cbd5e1;border-radius:8px;font-size:0.9rem;width:100%;box-sizing:border-box;outline:none;transition:0.2s;" onfocus="this.style.borderColor='#2d9e5f';" onblur="this.style.borderColor='#cbd5e1';">
    </div>
    <select id="filtro-tipo" onchange="window.aplicarFiltrosFrota()" style="padding:0.6rem 1rem;border:1px solid #cbd5e1;border-radius:8px;font-size:0.9rem;outline:none;background:#fff;cursor:pointer;min-width:140px;">
        <option value="">Todos os Tipos</option>
        <option value="caminhão">Caminhão</option>
        <option value="caminhonete">Caminhonete</option>
        <option value="utilitário">Utilitário</option>
        <option value="carretinha">Carretinha</option>
        <option value="caminhão tanque">Caminhão Tanque</option>
    </select>
    <select id="filtro-cor" onchange="window.aplicarFiltrosFrota()" style="padding:0.6rem 1rem;border:1px solid #cbd5e1;border-radius:8px;font-size:0.9rem;outline:none;background:#fff;cursor:pointer;min-width:140px;">
        <option value="">Todas as Cores</option>
    </select>
    <select id="filtro-rodizio" onchange="window.aplicarFiltrosFrota()" style="padding:0.6rem 1rem;border:1px solid #cbd5e1;border-radius:8px;font-size:0.9rem;outline:none;background:#fff;cursor:pointer;min-width:160px;">
        <option value="">Qualquer Rodízio</option>
        <option value="Segunda-feira">Segunda (1 e 2)</option>
        <option value="Terça-feira">Terça (3 e 4)</option>
        <option value="Quarta-feira">Quarta (5 e 6)</option>
        <option value="Quinta-feira">Quinta (7 e 8)</option>
        <option value="Sexta-feira">Sexta (9 e 0)</option>
    </select>
    <div id="frota-contador" style="font-weight:700;color:#2d9e5f;background:#ecfdf5;padding:0.6rem 1rem;border-radius:8px;font-size:0.9rem;border:1px solid #a7f3d0;margin-left:auto;display:flex;align-items:center;gap:6px;">
        <i class="ph ph-truck"></i> Aguarde...
    </div>
</div>

<!-- Grid de Cards -->
<div id="frota-grid" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(280px, 1fr));gap:1.5rem;padding-bottom:2rem;">
    <div style="grid-column:1/-1;text-align:center;padding:3rem;color:#94a3b8;"><i class="ph ph-circle-notch ph-spin" style="font-size:2rem;"></i><br>Carregando veículos...</div>
</div>
</div>`;

  try {
    const [frotaRes, statusRes] = await Promise.all([
        fetch('/api/frota/veiculos', { headers: { Authorization: 'Bearer ' + tok } }),
        fetch('/api/frota/status-manutencao', { headers: { Authorization: 'Bearer ' + tok } }).catch(() => ({ json: () => [] }))
    ]);
    const rows = await frotaRes.json();
    const statusManut = await statusRes.json().catch(() => []);
    // Enrich vehicles with maintenance status
    window._frotaStatusManut = {};
    (statusManut || []).forEach(s => { window._frotaStatusManut[s.id] = s; });
    window._frotaDados = rows || [];
    popularFiltros();
    renderCardsFrota();
  } catch (e) {
    const tb = document.getElementById('frota-grid');
    if (tb) tb.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:3rem;color:#dc2626;">Erro: ${e.message}</div>`;
  }
};

window.abrirModalFrota=async function(id){
  const tok = window.currentToken || localStorage.getItem('token');
  let v={};
  if(id){const r=await fetch('/api/frota/veiculos/'+id,{headers:{Authorization:'Bearer '+tok}});v=await r.json();}
  
  window._frotaB64=null;
  window._frotaFN=null;
  window._frotaImgB64=v.foto_base64||null;
  
  let ov=document.getElementById('modal-frota-ov');if(ov)ov.remove();
  ov=document.createElement('div');ov.id='modal-frota-ov';
  ov.style.cssText='position:fixed;inset:0;background:rgba(15,23,42,.75);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:1rem;';
  
  const tipos=['caminhão','caminhonete','utilitário','carretinha','caminhão tanque'];
  const optT=tipos.map(t=>`<option value="${t}"${(v.tipo_veiculo||'caminhão')===t?' selected':''}>${t.charAt(0).toUpperCase()+t.slice(1)}</option>`).join('');
  const inp=(id,val,ph,type)=>`<input id="${id}" value="${val||''}" placeholder="${ph||''}" type="${type||'text'}" style="width:100%;padding:0.6rem;border:1px solid #cbd5e1;border-radius:8px;box-sizing:border-box;font-size:0.9rem;outline:none;transition:0.2s;" onfocus="this.style.borderColor='#2d9e5f';this.style.boxShadow='0 0 0 3px rgba(45,158,95,0.1)'" onblur="this.style.borderColor='#cbd5e1';this.style.boxShadow='none'">`;
  const lbl=t=>`<label style="font-size:0.8rem;font-weight:600;color:#475569;display:block;margin-bottom:4px;">${t}</label>`;
  const alerta=alertaPlaca(v.placa,v.exercicio);
  const alertaHtml=alerta&&id?`<div style="background:#fef2f2;border-left:4px solid #ef4444;padding:0.75rem 1rem;margin-bottom:1.5rem;color:#b91c1c;font-weight:600;font-size:0.85rem;border-radius:4px;">⚠️ CRLV vencido ou a vencer — atualize o documento para regularizar a situação no sistema.</div>`:'';
  
  const placeholderFoto = window._frotaImgB64 || 'https://via.placeholder.com/400x250/e2e8f0/94a3b8?text=Sem+Foto';

  ov.innerHTML=`<div style="background:#fff;border-radius:16px;width:100%;max-width:900px;max-height:90vh;overflow-y:auto;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);display:flex;flex-direction:column;">
<div style="padding:1.25rem 1.5rem;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;background:#f8fafc;position:sticky;top:0;z-index:10;">
<div style="font-size:1.1rem;font-weight:700;color:#1e293b;display:flex;align-items:center;gap:10px;">
    <div style="background:#2d9e5f;color:#fff;width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;">
        <i class="ph ph-${id?'pencil':'plus'}"></i>
    </div>
    ${id?'Editar Veículo':'Novo Veículo'}
</div>
<button onclick="document.getElementById('modal-frota-ov').remove()" style="background:none;border:none;font-size:1.5rem;cursor:pointer;color:#94a3b8;transition:0.2s;" onmouseover="this.style.color='#ef4444'"><i class="ph ph-x"></i></button>
</div>

<div style="padding:1.5rem;background:#fff;">
${alertaHtml}

<div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;margin-bottom:2rem;">
    <div style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 2px 4px rgba(0,0,0,0.02);">
        <div style="background:#f8fafc;padding:0.75rem 1rem;border-bottom:1px solid #e2e8f0;font-weight:600;color:#475569;font-size:0.85rem;display:flex;align-items:center;gap:6px;">
            <i class="ph ph-camera" style="color:#2d9e5f;font-size:1.1rem;"></i> Foto do Veículo
        </div>
        <div style="padding:1rem;display:flex;flex-direction:column;align-items:center;background:#fff;flex:1;">
            <img id="fv-foto-preview" src="${placeholderFoto}" style="width:100%;height:140px;object-fit:cover;border-radius:8px;border:1px dashed #cbd5e1;margin-bottom:1rem;background:#f1f5f9;">
            <label style="background:#f1f5f9;color:#475569;border:1px solid #cbd5e1;padding:0.5rem 1rem;border-radius:8px;cursor:pointer;font-weight:600;font-size:0.85rem;display:inline-flex;align-items:center;gap:6px;transition:0.2s;width:100%;justify-content:center;" onmouseover="this.style.background='#e2e8f0'">
                <i class="ph ph-upload-simple"></i> Selecionar Imagem (JPEG/PNG)
                <input type="file" accept="image/*" style="display:none;" onchange="window.processarFotoVeiculo(this)">
            </label>
            <div id="foto-status" style="margin-top:0.5rem;font-size:0.75rem;color:#64748b;"></div>
        </div>
    </div>

    <div style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 2px 4px rgba(0,0,0,0.02);">
        <div style="background:#f8fafc;padding:0.75rem 1rem;border-bottom:1px solid #e2e8f0;font-weight:600;color:#475569;font-size:0.85rem;display:flex;align-items:center;gap:6px;">
            <i class="ph ph-file-pdf" style="color:#0891b2;font-size:1.1rem;"></i> Importar CRLV
        </div>
        <div style="padding:1rem;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#fff;flex:1;text-align:center;">
            <div style="background:#ecfeff;color:#0891b2;width:60px;height:60px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin-bottom:1rem;">
                <i class="ph ph-file-pdf" style="font-size:2rem;"></i>
            </div>
            <p style="margin:0 0 1rem;font-size:0.85rem;color:#64748b;padding:0 1rem;">O sistema extrai os dados automaticamente do documento original.</p>
            <label style="background:#0891b2;color:#fff;padding:0.6rem 1.2rem;border-radius:8px;cursor:pointer;font-weight:600;font-size:0.85rem;display:inline-flex;align-items:center;gap:6px;transition:0.2s;" onmouseover="this.style.background='#0e7490'">
                <i class="ph ph-upload-simple"></i> Selecionar PDF
                <input type="file" accept=".pdf" style="display:none;" onchange="window.processarCRLV(this,'new')">
            </label>
            <div id="crlv-status" style="margin-top:0.75rem;font-size:0.8rem;color:#64748b;font-weight:500;"></div>
        </div>
    </div>
</div>

<div style="background:#f8fafc;padding:1rem 1.5rem;border-radius:12px;border:1px solid #e2e8f0;margin-bottom:1.5rem;">
    <h3 style="margin:0 0 1rem;font-size:1rem;color:#1e293b;display:flex;align-items:center;gap:6px;"><i class="ph ph-identification-card" style="color:#64748b;"></i> Dados Básicos</h3>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;">
        <div>${lbl('Placa *')}${inp('fv-placa',v.placa,'ABC1234')}</div>
        <div style="grid-column:span 2;">${lbl('Marca / Modelo / Versão')}${inp('fv-marca',v.marca_modelo_versao,'Ex: FORD/CARGO 2429 E')}</div>
        <div>${lbl('Cor Predominante')}${inp('fv-cor',v.cor_predominante,'BRANCA')}</div>
        <div>${lbl('Ano Modelo')}${inp('fv-anomodelo',v.ano_modelo,'2025')}</div>
        <div>${lbl('Exercício (Validade CRLV)')}${inp('fv-exercicio',v.exercicio,'2025')}</div>
        <div>${lbl('Código RENAVAM')}${inp('fv-renavam',v.renavam,'00000000000')}</div>
        <div>${lbl('Tanque (Litros)')}${inp('fv-tanque',v.capacidade_tanque,'','number')}</div>
        <div>${lbl('Carga (Unidades)')}${inp('fv-carga',v.capacidade_carga,'','number')}</div>
        <div style="grid-column:span 3;">${lbl('Tipo de Veículo')}<select id="fv-tipo" style="width:100%;padding:0.6rem;border:1px solid #cbd5e1;border-radius:8px;background:#fff;box-sizing:border-box;font-size:0.9rem;outline:none;transition:0.2s;" onfocus="this.style.borderColor='#2d9e5f';this.style.boxShadow='0 0 0 3px rgba(45,158,95,0.1)'" onblur="this.style.borderColor='#cbd5e1';this.style.boxShadow='none'">${optT}</select></div>
    </div>
</div>

<div style="background:#f8fafc;padding:1rem 1.5rem;border-radius:12px;border:1px solid #e2e8f0;margin-bottom:1.5rem;">
    <h3 style="margin:0 0 1rem;font-size:1rem;color:#1e293b;display:flex;align-items:center;gap:6px;"><i class="ph ph-ruler" style="color:#64748b;"></i> Medidas (Opcional)</h3>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
        <div>${lbl('Altura c/ Banheiro (m)')}${inp('fv-alt-c',v.altura_com_banheiro,'','number')}</div>
        <div>${lbl('Altura s/ Banheiro (m)')}${inp('fv-alt-s',v.altura_sem_banheiro,'','number')}</div>
        <div>${lbl('Largura c/ Banheiro (m)')}${inp('fv-larg-c',v.largura_com_banheiro,'','number')}</div>
        <div>${lbl('Largura s/ Banheiro (m)')}${inp('fv-larg-s',v.largura_sem_banheiro,'','number')}</div>
        <div>${lbl('Profundidade c/ Banheiro (m)')}${inp('fv-prof-c',v.profundidade_com_banheiro,'','number')}</div>
        <div>${lbl('Profundidade s/ Banheiro (m)')}${inp('fv-prof-s',v.profundidade_sem_banheiro,'','number')}</div>
    </div>
</div>

<div style="display:flex;gap:1rem;justify-content:flex-end;padding-top:1rem;border-top:1px solid #e2e8f0;">
${id?`<button onclick="window.abrirAtualizarCRLV(${id})" style="background:#fff;color:#f59e0b;border:1px solid #f59e0b;border-radius:8px;padding:0.6rem 1.2rem;font-weight:600;cursor:pointer;font-size:0.9rem;display:inline-flex;align-items:center;gap:6px;transition:0.2s;margin-right:auto;" onmouseover="this.style.background='#fef3c7'"><i class="ph ph-arrows-clockwise"></i> Atualizar apenas CRLV</button>`:''}
<button onclick="document.getElementById('modal-frota-ov').remove()" style="background:#f1f5f9;border:1px solid #cbd5e1;border-radius:8px;padding:0.6rem 1.2rem;font-weight:600;cursor:pointer;color:#475569;font-size:0.9rem;transition:0.2s;" onmouseover="this.style.background='#e2e8f0'">Cancelar</button>
<button onclick="window.salvarVeiculoFrota(${id||'null'})" style="background:#2d9e5f;color:#fff;border:none;border-radius:8px;padding:0.6rem 1.5rem;font-weight:600;cursor:pointer;font-size:0.9rem;display:inline-flex;align-items:center;gap:6px;box-shadow:0 4px 10px rgba(45,158,95,0.3);transition:0.2s;" onmouseover="this.style.background='#23824e'"><i class="ph ph-floppy-disk"></i> ${id?'Salvar Alterações':'Cadastrar Veículo'}</button>
</div>
</div></div>`;
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
  const body={
    placa,
    marca_modelo_versao:g('fv-marca'),
    cor_predominante:g('fv-cor'),
    ano_modelo:g('fv-anomodelo'),
    exercicio:g('fv-exercicio'),
    renavam:g('fv-renavam'),
    capacidade_tanque:g('fv-tanque'),
    capacidade_carga:g('fv-carga'),
    tipo_veiculo:g('fv-tipo'),
    altura_com_banheiro:g('fv-alt-c'),
    altura_sem_banheiro:g('fv-alt-s'),
    largura_com_banheiro:g('fv-larg-c'),
    largura_sem_banheiro:g('fv-larg-s'),
    profundidade_com_banheiro:g('fv-prof-c'),
    profundidade_sem_banheiro:g('fv-prof-s'),
    crlv_base64:window._frotaB64||null,
    crlv_filename:window._frotaFN||null,
    foto_base64: window._frotaImgB64
  };
  try{
    const res=await fetch(id?'/api/frota/veiculos/'+id:'/api/frota/veiculos',{method:id?'PUT':'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+tok},body:JSON.stringify(body)});
    const data=await res.json();
    if(!res.ok)throw new Error(data.error||'Erro ao salvar');
    document.getElementById('modal-frota-ov').remove();
    window._frotaB64=null;
    window._frotaFN=null;
    window._frotaImgB64=null;
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
