(function(){
function isCaminhaoTipo(tipoVeiculo){const t=String(tipoVeiculo||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();return /^caminh[^o]/.test(t);}
function getMesVenc(placa,tipoVeiculo){const c=(placa||'').trim().slice(-1).toUpperCase();if(isCaminhaoTipo(tipoVeiculo)){return({'1':9,'2':9,'3':10,'4':10,'5':10,'6':11,'7':11,'8':11,'9':12,'0':12})[c]||null;}return({'1':7,'2':7,'3':8,'4':8,'5':9,'6':9,'7':10,'8':10,'9':11,'0':12})[c]||null;}
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
function alertaPlaca(placa, exercicio, tipoVeiculo) {
    if (!exercicio) return null;
    const mesVencimento = getMesVenc(placa, tipoVeiculo);
    if (!mesVencimento) return null;
    
    const anoVencimento = parseInt(exercicio) + 1;
    const dtVenc = new Date(anoVencimento, mesVencimento, 0, 23, 59, 59);
    
    const hoje = new Date();
    hoje.setHours(0,0,0,0);
    dtVenc.setHours(0,0,0,0);
    
    const msPorDia = 24 * 60 * 60 * 1000;
    const diffDias = Math.floor((dtVenc.getTime() - hoje.getTime()) / msPorDia);
    
    if (diffDias < 0) {
        return 'expirado';
    }
    if (diffDias <= 30) {
        return 'vencendo';
    }
    return 'ok';
}
function getDataVencExercicioFmt(placa, exercicio, tipoVeiculo) {
    if (!exercicio) return '';
    const mesVencimento = getMesVenc(placa, tipoVeiculo);
    const exAno = parseInt(exercicio, 10);
    if (!mesVencimento || isNaN(exAno)) return '';
    const anoVencimento = exAno + 1;
    const dtVenc = new Date(anoVencimento, mesVencimento, 0);
    const dd = String(dtVenc.getDate()).padStart(2, '0');
    const mm = String(dtVenc.getMonth() + 1).padStart(2, '0');
    const aa = String(dtVenc.getFullYear()).slice(-2);
    return `${dd}/${mm}/${aa}`;
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
        for(const l of linhas){const u=l.trim().toUpperCase();if(/^[A-HJ-NPR-Z0-9]{17}$/.test(u)&&/[A-Z]/.test(u)&&/\d{4,}$/.test(u)){d.chassi=u;break;}}
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
    set('fv-marca',d.marca_modelo_versao);set('fv-cor',d.cor);set('fv-anomodelo',d.ano_modelo);set('fv-exercicio',d.exercicio);set('fv-renavam',d.renavam);set('fv-chassi',d.chassi);
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

  const typeWeight = (t) => {
      t = (t || '').toLowerCase();
      if (t === 'utilitário' || t === 'utilitario') return 1;
      if (t === 'caminhonete') return 2;
      if (t === 'caminhão' || t === 'caminhao') return 3;
      if (t === 'caminhão tanque' || t === 'caminhao tanque') return 4;
      if (t === 'carretinha') return 5;
      return 6;
  };

  rows.sort((a,b) => {
      const wA = typeWeight(a.tipo_veiculo);
      const wB = typeWeight(b.tipo_veiculo);
      if (wA !== wB) return wA - wB;
      return (a.placa || '').localeCompare(b.placa || '');
  });

  const ct = document.getElementById('frota-contador');
  if (ct) {
      const qtdParados = rows.filter(v => v.em_manutencao == 1 || v.em_manutencao === '1' || v.em_manutencao === true).length;
      const qtdRodando = rows.length - qtdParados;
      ct.innerHTML = `<i class="ph ph-truck" style="font-size:1.1rem;margin-right:6px;"></i>${rows.length} ${rows.length === 1 ? 'veículo' : 'veículos'} <span style="font-weight:600;color:#15803d;margin-left:4px;">(${qtdRodando} rodando${qtdParados > 0 ? ` • <span style="color:#dc2626;font-weight:800;">${qtdParados} parado${qtdParados > 1 ? 's' : ''}</span>` : ''})</span>`;
  }

  if (!rows || !rows.length) {
    tb.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:3rem;color:#94a3b8;font-size:1.1rem;">Nenhum veículo encontrado</div>';
    return;
  }

    tb.innerHTML = rows.map(v => {
    const alerta = alertaPlaca(v.placa, v.exercicio, v.tipo_veiculo);
    const emManutencao = (v.em_manutencao == 1 || v.em_manutencao === '1' || v.em_manutencao === true);
    
    let borderColor = '#2d9e5f'; 
    let statusLabel = 'OK';
    let textColor = '#fff';
    let placaColor = '#2d9e5f';
    
    if (alerta === 'expirado') {
        borderColor = '#dc2626';
        statusLabel = '\u2716';
        placaColor = '#dc2626';
    } else if (alerta === 'vencendo' || !v.exercicio) {
        borderColor = '#f59e0b';
        statusLabel = '!';
        textColor = '#fff';
        placaColor = '#d97706';
    }

    // Status ativo da manutenção: só existe quando o veículo está efetivamente parado (corretiva parado ou revisão em andamento)
    const statusManutAtivo = emManutencao ? (v.status_manutencao_ativo || 'em_andamento') : null;
    const manutRibbonCor = '#dc2626';

    const cardBg = emManutencao ? '#fff5f5' : '#fff';
    const cardBorder = emManutencao ? '2px solid #fca5a5' : '1px solid #e2e8f0';

    const manutRibbon = emManutencao ? `
        <div style="position:absolute;top:0;left:0;width:0;height:0;border-top:60px solid ${manutRibbonCor};border-right:60px solid transparent;z-index:2;"></div>
        <div style="position:absolute;top:8px;left:6px;z-index:3;color:#fff;font-size:1.1rem;transform:rotate(-45deg);width:30px;text-align:center;">
            <i class="ph ph-wrench"></i>
        </div>
    ` : '';


    const placeholder = 'https://via.placeholder.com/400x250/e2e8f0/94a3b8?text=Sem+Foto';
    const foto = v.foto_url || v.foto_base64 || placeholder;
    const marcaCompleta = v.marca_modelo_versao || 'N/D';
    const rodizio = getRodizio(v.placa);

    return `
    <div style="background:${cardBg};border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.08);overflow:hidden;border:${cardBorder};position:relative;display:flex;flex-direction:column;transition:transform 0.2s, box-shadow 0.2s;" onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 12px 20px rgba(0,0,0,0.12)';" onmouseout="this.style.transform='none';this.style.boxShadow='0 4px 12px rgba(0,0,0,0.08)';">
        
        ${manutRibbon}
        <div style="position:absolute;top:0;right:0;width:0;height:0;border-top:60px solid ${borderColor};border-left:60px solid transparent;z-index:2;"></div>
        <div style="position:absolute;top:8px;right:6px;z-index:3;color:${textColor};font-size:0.9rem;font-weight:900;transform:rotate(45deg);letter-spacing:1px;width:30px;text-align:center;">
            ${statusLabel}
        </div>

        <div onclick="window.abrirFotoVeiculoFrota(${v.id})" title="Clique para abrir e salvar a foto" style="height:140px;width:100%;background-image:url('${foto}');background-size:cover;background-position:center;border-bottom:1px solid #e2e8f0;cursor:pointer;"></div>
        
        <div style="padding:1rem;flex:1;display:flex;flex-direction:column;gap:0.5rem;font-size:0.85rem;color:#475569;">
            
            <!-- Placa (Cor dinamica baseada no status) + Badge de Veículo Parado -->
            <div style="display:flex;flex-direction:column;gap:0.1rem;margin-bottom:0.1rem;">
                <span style="font-weight:600;color:#94a3b8;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.5px;">Placa</span>
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                    <span style="font-weight:800;color:${placaColor};font-size:1.2rem;">${v.placa||'N/D'}</span>
                    ${emManutencao ? '<span style="background:#fee2e2;color:#dc2626;border:1px solid #fca5a5;padding:2px 8px;border-radius:999px;font-size:0.68rem;font-weight:800;display:inline-flex;align-items:center;gap:4px;letter-spacing:0.3px;"><i class="ph-fill ph-prohibit"></i> VEÍCULO PARADO</span>' : ''}
                </div>
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
                <span style="font-weight:600;color:#94a3b8;">Ano Modelo:</span>
                <span style="font-weight:700;color:#1e293b;">${v.ano_modelo||'N/D'}</span>
            </div>
            
            <div style="display:flex;justify-content:space-between;border-bottom:1px solid #f1f5f9;padding-bottom:0.3rem;">
                <span style="font-weight:600;color:#94a3b8;">Exercício:</span>
                <span style="font-weight:700;color:${alerta==='expirado'?'#dc2626':(alerta==='vencendo'?'#d97706':'#1e293b')};">${!v.exercicio ? 'N/D' : (alerta === 'vencendo' ? `${v.exercicio} (Vencendo ${getDataVencExercicioFmt(v.placa, v.exercicio, v.tipo_veiculo)})` : alerta === 'expirado' ? `${v.exercicio} (Vencido ${getDataVencExercicioFmt(v.placa, v.exercicio, v.tipo_veiculo)})` : `${v.exercicio}${getDataVencExercicioFmt(v.placa, v.exercicio, v.tipo_veiculo) ? ' (' + getDataVencExercicioFmt(v.placa, v.exercicio, v.tipo_veiculo) + ')' : ''}`)}</span>
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

        <!-- KM semanal -->
        ${(() => {
            if (/carretinha/i.test(String(v.tipo_veiculo || ''))) return '';
            const isComprasMode = Boolean(window._frotaModoCompras || (document.getElementById('frota-veiculos-container')?.parentElement?.id === 'view-compras-gestao-frota'));
            const kmVencida = !emManutencao && (v.km_vencida == 1 || v.km_vencida === true);
            if (isComprasMode) {
                const kmFormatado = (v.km_atual != null && v.km_atual !== '') ? Number(v.km_atual).toLocaleString('pt-BR') + ' km' : 'N/D';
                return `<div style="background:#f8fafc;padding:0.6rem 1rem;border-top:1px solid #e2e8f0;display:flex;align-items:center;gap:8px;" title="KM atual (editável somente pela Gestão de Frota da Logística)">
                    <i class="ph ph-gauge" style="color:#64748b;font-size:1rem;"></i>
                    <span style="font-size:0.78rem;color:#64748b;font-weight:600;white-space:nowrap;">KM atual:</span>
                    <span style="font-size:0.85rem;color:#1e293b;font-weight:700;">${kmFormatado}</span>
                </div>`;
            }
            return `<div style="background:${kmVencida ? '#fef2f2' : '#f8fafc'};padding:0.6rem 1rem;border-top:1px solid ${kmVencida ? '#fecaca' : '#e2e8f0'};display:flex;align-items:center;gap:8px;" title="${kmVencida ? 'KM vencida — mais de 7 dias sem atualizar. Atualize (ou salve a mesma KM).' : 'A KM deve ser atualizada no máximo a cada 7 dias'}">
                <i class="ph ph-gauge" style="color:${kmVencida ? '#dc2626' : '#d97706'};font-size:1rem;"></i>
                <span style="font-size:0.78rem;color:${kmVencida ? '#dc2626' : '#64748b'};font-weight:${kmVencida ? '800' : '600'};white-space:nowrap;">KM atual:</span>
                <input type="number" id="km-card-${v.id}" value="${v.km_atual != null && v.km_atual !== '' ? v.km_atual : ''}" placeholder="Digite KM" 
                    style="flex:1 1 0;min-width:0;width:100%;max-width:110px;padding:0.3rem 0.4rem;border:${kmVencida ? '1.5px solid #dc2626' : '1px solid #e2e8f0'};background:${kmVencida ? '#fff5f5' : '#fff'};color:${kmVencida ? '#dc2626' : '#1e293b'};font-weight:${kmVencida ? '800' : '600'};border-radius:6px;font-size:0.8rem;outline:none;" 
                    onkeydown="if(event.key==='Enter')window.salvarKmCard(${v.id})">
                <button onclick="window.salvarKmCard(${v.id})" 
                    style="flex:0 0 auto;margin-left:auto;background:${kmVencida ? '#dc2626' : '#d97706'};color:#fff;border:none;border-radius:6px;padding:0.3rem 0.6rem;font-size:0.75rem;cursor:pointer;font-weight:600;white-space:nowrap;">
                    Salvar
                </button>
            </div>`;
        })()}

        <div style="background:#f8fafc;padding:0.75rem 1rem;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;">
            <div style="font-weight:800;color:#cbd5e1;font-size:0.75rem;letter-spacing:1px;text-transform:uppercase;">
                ${v.tipo_veiculo||'VEÍCULO'}
            </div>
            <div style="display:flex;gap:4px;">
                <button onclick="window.abrirPopupManutencaoCard(${v.id}, ${emManutencao ? 1 : 0}, '${statusManutAtivo||''}')" style="background:${emManutencao ? (statusManutAtivo==='em_andamento' ? '#dc2626' : '#d97706') : '#94a3b8'};color:#fff;border:none;border-radius:6px;width:32px;height:32px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:0.2s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'" title="${emManutencao ? (statusManutAtivo==='em_andamento' ? '🔴 Em Manutenção — Finalizar' : '🟡 Manutenção Agendada — Finalizar') : 'Registrar Manutenção'}"><i class="ph ph-wrench"></i></button>
                ${v.crlv_filename ? `<button onclick="window.visualizarCRLV(${v.id})" style="background:#0891b2;color:#fff;border:none;border-radius:6px;width:32px;height:32px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:0.2s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'" title="Visualizar CRLV"><i class="ph ph-file-pdf"></i></button>` : `<button disabled style="background:#e2e8f0;color:#fff;border:none;border-radius:6px;width:32px;height:32px;display:flex;align-items:center;justify-content:center;cursor:not-allowed;" title="Sem CRLV"><i class="ph ph-file-pdf"></i></button>`}
                <button onclick="window.abrirModalFrota(${v.id})" style="background:#2563eb;color:#fff;border:none;border-radius:6px;width:32px;height:32px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:0.2s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'" title="Editar"><i class="ph ph-pencil"></i></button>
                ${(window._frotaModoCompras || (document.getElementById('frota-veiculos-container')?.parentElement?.id === 'view-compras-gestao-frota')) ? '' : `<button onclick="window.excluirVeiculoFrota(${v.id},'${v.placa}')" style="background:#dc2626;color:#fff;border:none;border-radius:6px;width:32px;height:32px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:0.2s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'" title="Excluir"><i class="ph ph-trash"></i></button>`}
            </div>
        </div>
    </div>
    `;
  }).join('');
}


// ── Formulário de Finalização de Manutenção (pelo Card) ─────────────────────
window.abrirFotoVeiculoFrota = function(vid) {
    const lista = (window._frotaDados && window._frotaDados.length) ? window._frotaDados : (window._manutFrota || []);
    const v = lista.find(x => String(x.id) === String(vid)) || {};
    const foto = v.foto_url || v.foto_base64 || '';
    if (!foto) {
        if (typeof mostrarToastAviso === 'function') mostrarToastAviso('⚠️ Este veículo não possui foto cadastrada.');
        else alert('Este veículo não possui foto cadastrada.');
        return;
    }
    const placa = v.placa || 'VEICULO';
    const modelo = v.marca_modelo_versao || '';
    let modal = document.getElementById('frota-foto-modal');
    if (modal) modal.remove();
    modal = document.createElement('div');
    modal.id = 'frota-foto-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.75);display:flex;align-items:center;justify-content:center;z-index:10050;padding:16px;';
    modal.innerHTML = `
    <div style="background:#fff;border-radius:16px;width:100%;max-width:680px;box-shadow:0 25px 60px rgba(0,0,0,0.35);overflow:hidden;display:flex;flex-direction:column;">
        <div style="background:linear-gradient(135deg,#1e293b,#334155);padding:14px 20px;display:flex;align-items:center;gap:12px;">
            <div style="background:#0284c7;border-radius:10px;width:36px;height:36px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:1.2rem;flex-shrink:0;">
                <i class="ph ph-image"></i>
            </div>
            <div style="min-width:0;flex:1;">
                <div style="color:#fff;font-weight:800;font-size:1rem;">${placa}</div>
                <div style="color:rgba(255,255,255,0.75);font-size:0.8rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${modelo}</div>
            </div>
            <button type="button" onclick="document.getElementById('frota-foto-modal').remove()" style="background:rgba(255,255,255,0.18);border:none;border-radius:50%;width:32px;height:32px;cursor:pointer;color:#fff;display:flex;align-items:center;justify-content:center;font-size:1rem;"><i class="ph ph-x"></i></button>
        </div>
        <div style="padding:20px;background:#f8fafc;display:flex;align-items:center;justify-content:center;max-height:70vh;overflow:auto;">
            <img src="${foto}" alt="${placa}" style="max-width:100%;max-height:62vh;object-fit:contain;border-radius:10px;background:#fff;box-shadow:0 4px 16px rgba(0,0,0,0.08);">
        </div>
        <div style="padding:14px 20px;background:#fff;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end;gap:10px;">
            <button type="button" onclick="document.getElementById('frota-foto-modal').remove()" style="padding:9px 18px;border:1.5px solid #cbd5e1;border-radius:8px;background:#fff;color:#475569;cursor:pointer;font-weight:700;">Fechar</button>
            <button type="button" onclick="window.baixarFotoVeiculoFrota(${v.id})" style="padding:9px 20px;border:none;border-radius:8px;background:#16a34a;color:#fff;cursor:pointer;font-weight:700;display:inline-flex;align-items:center;gap:6px;"><i class="ph ph-download-simple"></i> Salvar Foto</button>
        </div>
    </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', function(e) { if (e.target === modal) modal.remove(); });
};

window.baixarFotoVeiculoFrota = async function(vid) {
    const lista = (window._frotaDados && window._frotaDados.length) ? window._frotaDados : (window._manutFrota || []);
    const v = lista.find(x => String(x.id) === String(vid)) || {};
    const foto = v.foto_url || v.foto_base64 || '';
    if (!foto) return;
    const placa = String(v.placa || 'veiculo').replace(/[^a-zA-Z0-9_-]/g, '');
    try {
        let ext = 'png';
        if (foto.startsWith('data:image/')) {
            const m = foto.match(/^data:image\/([a-zA-Z0-9+]+);/);
            if (m && m[1]) ext = m[1] === 'jpeg' ? 'jpg' : m[1];
            const a = document.createElement('a');
            a.href = foto;
            a.download = 'veiculo_' + placa + '.' + ext;
            document.body.appendChild(a);
            a.click();
            a.remove();
            return;
        }
        const r = await fetch(foto);
        const blob = await r.blob();
        if (blob.type && blob.type.includes('jpeg')) ext = 'jpg';
        else if (blob.type && blob.type.includes('webp')) ext = 'webp';
        const urlObj = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = urlObj;
        a.download = 'veiculo_' + placa + '.' + ext;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(urlObj), 3000);
    } catch (e) {
        const a = document.createElement('a');
        a.href = foto;
        a.target = '_blank';
        a.download = 'veiculo_' + placa + '.png';
        document.body.appendChild(a);
        a.click();
        a.remove();
    }
};

async function _abrirFormFinalizacaoManutencao(vid, statusAtivo) {
    const v = (window._frotaDados || []).find(x => String(x.id) === String(vid)) || {};
    const tok = window.currentToken || localStorage.getItem('token') || localStorage.getItem('erp_token');
    window._manutTok = tok;
    if (!window._manutFrota || !window._manutFrota.length) {
        window._manutFrota = window._frotaDados || [];
    }

    let manutsAbertas = [];
    let dRev = null;
    let revsAgendadas = [];
    try {
        const [rMan, rRev] = await Promise.all([
            fetch(`/api/frota/manutencoes?veiculo_id=${vid}&_=${Date.now()}`, { headers: { Authorization: 'Bearer ' + tok }, cache: 'no-store' }).catch(() => null),
            fetch(`/api/frota/revisoes/${vid}?_=${Date.now()}`, { headers: { Authorization: 'Bearer ' + tok }, cache: 'no-store' }).catch(() => null)
        ]);
        if (rMan && rMan.ok) {
            const listaM = await rMan.json();
            if (Array.isArray(listaM)) {
                manutsAbertas = listaM.filter(m => m.status !== 'concluida' && m.status !== 'cancelada' && (m.tipo || 'corretiva') === 'corretiva');
            }
        }
        if (rRev && rRev.ok) {
            dRev = await rRev.json();
            const revs = Array.isArray(dRev.revisoes) ? dRev.revisoes : [];
            revsAgendadas = revs.filter(r => r.status === 'agendada');
        }
    } catch (e) { /* fallback abaixo */ }

    const abrirCorretiva = (id) => {
        document.getElementById('mn-finalizar-card-modal')?.remove();
        if (typeof window.mnCorrEditarInterno === 'function') {
            window.mnCorrEditarInterno(id);
        }
    };
    const abrirRevisao = (marcoKm, marcoMeses) => {
        document.getElementById('mn-finalizar-card-modal')?.remove();
        if (dRev) window._mnRevAtual = dRev;
        if (typeof window.mnRevAbrirModalMarco === 'function') {
            const pKm = typeof window._mnRevPassoKm === 'function' ? window._mnRevPassoKm(v) : (Number(v.uso_severo) === 1 ? 5000 : 10000);
            const pMeses = typeof window._mnRevPassoMeses === 'function' ? window._mnRevPassoMeses(v) : (Number(v.uso_severo) === 1 ? 6 : 12);
            const mesesCalc = Number(marcoMeses) || (Math.max(1, Math.round(Number(marcoKm) / pKm)) * pMeses);
            window.mnRevAbrirModalMarco(Number(marcoKm), mesesCalc);
        }
    };

    const totalAbertas = manutsAbertas.length + revsAgendadas.length;
    if (totalAbertas === 1) {
        if (manutsAbertas.length === 1) {
            abrirCorretiva(manutsAbertas[0].id);
        } else {
            abrirRevisao(revsAgendadas[0].marco_km, revsAgendadas[0].marco_meses);
        }
        return;
    }

    if (totalAbertas === 0) {
        if (typeof mostrarToastAviso === 'function') mostrarToastAviso('⚠️ Nenhuma manutenção ativa encontrada para este veículo.');
        else alert('Nenhuma manutenção ativa encontrada para este veículo.');
        return;
    }

    // Se houver mais de uma solicitação aberta/ativa para o veículo, exibe seletor para abrir a manutenção desejada
    const fmtData = (s) => {
        const iso = String(s || '').split('T')[0].split(' ')[0];
        const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        return m ? `${m[3]}/${m[2]}/${m[1]}` : (iso || '—');
    };
    const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    const cardsHtml = [
        ...manutsAbertas.map(m => {
            const parado = m.veiculo_rodando === 'nao';
            const stMap = {
                agendada: { l: 'Solicitada / Agendada', c: '#1d4ed8', bg: '#dbeafe', bd: '#93c5fd' },
                programada: { l: 'Programada', c: '#6d28d9', bg: '#ede9fe', bd: '#c4b5fd' },
                em_andamento: { l: 'Em Andamento', c: '#b45309', bg: '#fef3c7', bd: '#fcd34d' }
            };
            const st = stMap[m.status] || { l: m.status || 'Aberta', c: '#334155', bg: '#f1f5f9', bd: '#cbd5e1' };
            const dt = fmtData(m.data_solicitacao || m.data_inicio || m.created_at);
            return `<div onclick="window._mnSelecionarManutAtivaCard('corretiva', ${Number(m.id)}, 0)"
                style="border:1.5px solid ${parado ? '#fca5a5' : '#e2e8f0'};background:${parado ? '#fff5f5' : '#f8fafc'};border-radius:12px;padding:12px 14px;cursor:pointer;transition:all .15s;display:flex;flex-direction:column;gap:6px;"
                onmouseover="this.style.borderColor='#d97706';this.style.transform='translateY(-1px)'" onmouseout="this.style.borderColor='${parado ? '#fca5a5' : '#e2e8f0'}';this.style.transform='none'">
                <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">
                    <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                        <span style="font-size:0.75rem;font-weight:800;color:#9a3412;background:#ffedd5;border:1px solid #fed7aa;padding:2px 8px;border-radius:999px;"><i class="ph ph-wrench"></i> Corretiva #${m.id}</span>
                        <span style="font-size:0.72rem;font-weight:800;padding:2px 8px;border-radius:999px;background:${parado ? '#fee2e2' : '#dcfce7'};color:${parado ? '#b91c1c' : '#15803d'};border:1px solid ${parado ? '#fca5a5' : '#86efac'};">${parado ? '🛑 Veículo Parado' : '🟢 Veículo Andando'}</span>
                        <span style="font-size:0.72rem;font-weight:800;padding:2px 8px;border-radius:999px;background:${st.bg};color:${st.c};border:1px solid ${st.bd};">${esc(st.l)}</span>
                    </div>
                    <span style="font-size:0.75rem;color:#64748b;font-weight:700;"><i class="ph ph-calendar-blank"></i> ${esc(dt)}</span>
                </div>
                <div style="font-size:0.85rem;font-weight:700;color:#1e293b;line-height:1.35;">${esc(m.descricao || m.itens_solicitados || 'Sem descrição')}</div>
                <div style="font-size:0.76rem;font-weight:700;color:#d97706;display:flex;align-items:center;gap:4px;margin-top:2px;">
                    <i class="ph ph-arrow-square-out"></i> Abrir detalhes da manutenção para preencher e concluir →
                </div>
            </div>`;
        }),
        ...revsAgendadas.map(r => {
            const pKm = typeof window._mnRevPassoKm === 'function' ? window._mnRevPassoKm(v) : (Number(v.uso_severo) === 1 ? 5000 : 10000);
            const pMeses = typeof window._mnRevPassoMeses === 'function' ? window._mnRevPassoMeses(v) : (Number(v.uso_severo) === 1 ? 6 : 12);
            const n = Math.max(1, Math.round(Number(r.marco_km) / pKm));
            const meses = Number(r.marco_meses) || (n * pMeses);
            const dt = fmtData(r.data_revisao || r.data_solicitacao);
            return `<div onclick="window._mnSelecionarManutAtivaCard('revisao', ${Number(r.marco_km)}, ${Number(meses)})"
                style="border:1.5px solid #c4b5fd;background:#f5f3ff;border-radius:12px;padding:12px 14px;cursor:pointer;transition:all .15s;display:flex;flex-direction:column;gap:6px;"
                onmouseover="this.style.borderColor='#7c3aed';this.style.transform='translateY(-1px)'" onmouseout="this.style.borderColor='#c4b5fd';this.style.transform='none'">
                <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">
                    <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                        <span style="font-size:0.75rem;font-weight:800;color:#5b21b6;background:#ede9fe;border:1px solid #c4b5fd;padding:2px 8px;border-radius:999px;"><i class="ph ph-seal-check"></i> ${n}ª Revisão</span>
                        <span style="font-size:0.72rem;font-weight:800;padding:2px 8px;border-radius:999px;background:#dbeafe;color:#1d4ed8;border:1px solid #93c5fd;">Agendada</span>
                    </div>
                    <span style="font-size:0.75rem;color:#64748b;font-weight:700;"><i class="ph ph-calendar-blank"></i> ${esc(dt)}</span>
                </div>
                <div style="font-size:0.85rem;font-weight:700;color:#1e293b;">Marco ${Number(r.marco_km).toLocaleString('pt-BR')} km / ${meses} meses${r.observacoes ? ' — ' + esc(r.observacoes) : ''}</div>
                <div style="font-size:0.76rem;font-weight:700;color:#7c3aed;display:flex;align-items:center;gap:4px;margin-top:2px;">
                    <i class="ph ph-arrow-square-out"></i> Abrir detalhes da revisão para preencher e concluir →
                </div>
            </div>`;
        })
    ].join('');

    window._mnSelecionarManutAtivaCard = function(tipo, idOuKm, meses) {
        if (tipo === 'corretiva') abrirCorretiva(idOuKm);
        else abrirRevisao(idOuKm, meses);
    };

    let modal = document.getElementById('mn-finalizar-card-modal');
    if (modal) modal.remove();
    modal = document.createElement('div');
    modal.id = 'mn-finalizar-card-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.55);display:flex;align-items:center;justify-content:center;z-index:10050;padding:16px;';
    modal.innerHTML = `
    <div style="background:#fff;border-radius:16px;width:100%;max-width:560px;max-height:88vh;display:flex;flex-direction:column;box-shadow:0 25px 60px rgba(0,0,0,0.25);overflow:hidden;">
        <div style="background:linear-gradient(135deg,#1e293b,#334155);padding:16px 20px;display:flex;align-items:center;gap:12px;">
            <div style="background:#dc2626;border-radius:10px;width:38px;height:38px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                <i class="ph ph-wrench" style="color:#fff;font-size:1.25rem;"></i>
            </div>
            <div>
                <div style="color:#fff;font-weight:700;font-size:0.98rem;">Selecione a Manutenção para Preencher / Finalizar</div>
                <div style="color:rgba(255,255,255,0.75);font-size:0.78rem;">${esc(v.placa || 'Veículo')} — ${totalAbertas} solicitações em aberto</div>
            </div>
            <button onclick="document.getElementById('mn-finalizar-card-modal').remove()" style="margin-left:auto;background:rgba(255,255,255,0.15);border:none;border-radius:50%;width:32px;height:32px;cursor:pointer;color:#fff;display:flex;align-items:center;justify-content:center;"><i class="ph ph-x"></i></button>
        </div>
        <div style="padding:16px 20px;overflow-y:auto;display:flex;flex-direction:column;gap:10px;">
            ${cardsHtml}
        </div>
    </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

window._confirmarFinalizacaoManutencao = async function(vid) {
    const btn = document.getElementById('mn-fin-btn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ph ph-circle-notch ph-spin"></i> Finalizando...'; }
    const token = localStorage.getItem('erp_token') || localStorage.getItem('token');
    const km = document.getElementById('mn-fin-km')?.value || null;
    const custo = document.getElementById('mn-fin-custo')?.value || null;
    const fornecedor = document.getElementById('mn-fin-forn')?.value?.trim() || null;
    const observacoes = document.getElementById('mn-fin-obs')?.value?.trim() || null;
    try {
        const r = await fetch(`/api/frota/veiculos/${vid}/finalizar-manutencao`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ km_na_manutencao: km, custo, fornecedor, observacoes })
        });
        if (!r.ok) { const e = await r.json(); throw new Error(e.error || 'Erro ao finalizar'); }
        document.getElementById('mn-finalizar-card-modal')?.remove();
        mostrarToastAviso('✅ Manutenção finalizada com sucesso!');
        if (typeof window.checkUserNotificacoes === 'function') {
            window.checkUserNotificacoes();
            setTimeout(window.checkUserNotificacoes, 800);
        }
        window.initFrotaVeiculos();
    } catch(e) {
        mostrarToastAviso('❌ ' + e.message);
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ph ph-check-circle"></i> Finalizar Manutenção'; }
    }
};

// ── Categorias e Subcategorias para Solicitação de Manutenção no Card ──────
window._FROTA_CARD_GRUPOS_PADRAO = [
    {
        grupo: 'FUNILARIA, LATARIA E ESTÉTICA',
        icone: 'ph-paint-brush',
        itens: [
            { nome: 'Funilaria (amassados)', icone: 'ph-hammer' },
            { nome: 'Adesivo', icone: 'ph-tag' },
            { nome: 'Pintura', icone: 'ph-paint-brush' },
            { nome: 'Para-choque dianteiro', icone: 'ph-shield' },
            { nome: 'Para-choque traseiro', icone: 'ph-shield-check' },
            { nome: 'Capô', icone: 'ph-arrow-up-right' },
            { nome: 'Porta', icone: 'ph-door' },
            { nome: 'Paralama', icone: 'ph-arrows-horizontal' },
            { nome: 'Tampa traseira', icone: 'ph-arrow-down-left' },
            { nome: 'Retrovisor', icone: 'ph-eye' },
            { nome: 'Faróis', icone: 'ph-flashlight' },
            { nome: 'Lanternas', icone: 'ph-lamp' },
            { nome: 'Setas', icone: 'ph-arrows-left-right' },
            { nome: 'Para-brisa', icone: 'ph-square-half' },
            { nome: 'Vidros', icone: 'ph-frame-corners' }
        ]
    },
    {
        grupo: 'MECÂNICA',
        icone: 'ph-wrench',
        itens: [
            { nome: 'Suspensão', icone: 'ph-activity' },
            { nome: 'Direção', icone: 'ph-compass' },
            { nome: 'Alinhamento', icone: 'ph-ruler' },
            { nome: 'Balanceamento', icone: 'ph-scales' },
            { nome: 'Pneus', icone: 'ph-circle-notch' },
            { nome: 'Rodas', icone: 'ph-disc' },
            { nome: 'Freios', icone: 'ph-hand-palm' },
            { nome: 'Radiador', icone: 'ph-thermometer-hot' },
            { nome: 'Arrefecimento', icone: 'ph-snowflake' },
            { nome: 'Motor', icone: 'ph-gear-six' },
            { nome: 'Câmbio', icone: 'ph-sliders' },
            { nome: 'Transmissão', icone: 'ph-shuffle' },
            { nome: 'Sistema elétrico', icone: 'ph-lightning' },
            { nome: 'Bateria', icone: 'ph-battery-charging' }
        ]
    },
    {
        grupo: 'OPERACIONAL',
        icone: 'ph-gear-six',
        itens: [
            { nome: 'Tanque', icone: 'ph-gas-can' },
            { nome: 'Bomba de sucção', icone: 'ph-fan' },
            { nome: 'Motor de sucção', icone: 'ph-power' },
            { nome: 'Mangotes', icone: 'ph-link' },
            { nome: 'Válvulas', icone: 'ph-funnel' },
            { nome: 'Sistema hidráulico', icone: 'ph-drop' },
            { nome: 'Estrutura', icone: 'ph-grid-four' },
            { nome: 'Chassi', icone: 'ph-truck' },
            { nome: 'Câmeras e Rastreadores', icone: 'ph-video-camera' }
        ]
    },
    {
        grupo: 'OUTROS',
        icone: 'ph-dots-three-circle',
        itens: [
            { nome: 'Revisão geral pós-sinistro', icone: 'ph-clipboard-text' },
            { nome: 'Outros', icone: 'ph-dots-three-circle' }
        ]
    }
];

window._mnCardMontarGruposCategorias = function(cats) {
    if (!Array.isArray(cats) || !cats.length) return window._FROTA_CARD_GRUPOS_PADRAO;
    var mapaSub = {};
    window._FROTA_CARD_GRUPOS_PADRAO.forEach(function(g) {
        g.itens.forEach(function(it) { mapaSub[it.nome] = { grupo: g.grupo, grupoIcone: g.icone, icone: it.icone }; });
    });
    var grupos = {}, ordem = [];
    var vistos = {};
    cats.forEach(function(c) {
        var nome = c.nome === 'Outros serviços' ? 'Outros' : c.nome;
        var pad = mapaSub[nome] || {};
        var grp = c.grupo || pad.grupo || 'OUTROS';
        var grpIco = c.grupo_icone ? ('ph-' + String(c.grupo_icone).replace(/^ph-/, '')) : (pad.grupoIcone || 'ph-dots-three-circle');
        var ico = c.icone ? ('ph-' + String(c.icone).replace(/^ph-/, '')) : (pad.icone || 'ph-wrench');
        if (!grupos[grp]) { grupos[grp] = { grupo: grp, icone: grpIco, itens: [] }; ordem.push(grupos[grp]); }
        grupos[grp].itens.push({ nome: nome, rotulo: nome, icone: ico });
        vistos[nome] = 1;
    });
    window._FROTA_CARD_GRUPOS_PADRAO.forEach(function(g) {
        g.itens.forEach(function(it) {
            if (!vistos[it.nome]) {
                if (!grupos[g.grupo]) { grupos[g.grupo] = { grupo: g.grupo, icone: g.icone, itens: [] }; ordem.push(grupos[g.grupo]); }
                grupos[g.grupo].itens.push({ nome: it.nome, rotulo: it.nome, icone: it.icone });
                vistos[it.nome] = 1;
            }
        });
    });
    return ordem.length ? ordem : window._FROTA_CARD_GRUPOS_PADRAO;
};

window._mnCardCorrItemChange = function(cbEl) {
    if (cbEl && cbEl.closest('label')) {
        cbEl.closest('label').style.background = cbEl.checked ? '#fff7ed' : '#f8fafc';
        cbEl.closest('label').style.borderColor = cbEl.checked ? '#d97706' : '#e2e8f0';
    }
    var chkOutros = document.querySelector('input[name="mn-card-corr-item"][value="Outros"]:checked');
    var wrap = document.getElementById('mn-card-corr-outros-wrap');
    if (wrap) wrap.style.display = chkOutros ? 'block' : 'none';
};

// Abre/fecha o quadro de serviços de uma categoria (seta para baixo/cima)
window._mnCardToggleGrupo = function(gi) {
    var body = document.getElementById('mn-card-grp-body-' + gi);
    var arrow = document.getElementById('mn-card-grp-arrow-' + gi);
    if (!body) return;
    var abrir = body.style.display === 'none';
    body.style.display = abrir ? 'block' : 'none';
    if (arrow) arrow.style.transform = abrir ? 'rotate(180deg)' : 'rotate(0deg)';
};

// Seleção da categoria inteira (sem precisar escolher a subcategoria)
window._mnCardCorrGrupoChange = function(cbEl) {
    var box = cbEl && cbEl.parentElement;
    if (box) box.style.background = cbEl.checked ? '#fff7ed' : '#f8fafc';
};

// ── Popup de Manutenção no Card do Veículo (Corretiva ou Revisão) ──────────
window.abrirPopupManutencaoCard = async function(vid, emManutencao, statusAtivo) {
    const v = (window._frotaDados||[]).find(x => x.id === vid);
    if (!v) return;

    const tok = window.currentToken || localStorage.getItem('token') || localStorage.getItem('erp_token');

    // Buscar revisões do veículo e categorias de manutenção corretiva
    let revisoesVeic = [];
    let gruposCorretiva = window._FROTA_CARD_GRUPOS_PADRAO;
    try {
        const [rRev, rCats] = await Promise.all([
            fetch(`/api/frota/revisoes/${vid}`, { headers: { Authorization: 'Bearer ' + tok } }).catch(() => null),
            fetch('/api/frota/categorias', { headers: { Authorization: 'Bearer ' + tok } }).catch(() => null)
        ]);
        if (rRev && rRev.ok) {
            const dRev = await rRev.json();
            revisoesVeic = Array.isArray(dRev.revisoes) ? dRev.revisoes : [];
        }
        if (rCats && rCats.ok) {
            const cats = await rCats.json();
            gruposCorretiva = window._mnCardMontarGruposCategorias(cats);
        }
    } catch(e) {}

    // Montar lista de categorias e subcategorias da manutenção corretiva (grupos recolhíveis, categoria selecionável)
    let categoriasCorretivaHtml = '';
    gruposCorretiva.forEach(function(g, gi) {
        const gIco = g.icone || 'ph-wrench';
        const gSafe = String(g.grupo || '').replace(/"/g, '&quot;');
        categoriasCorretivaHtml += '<div style="border:1px solid #e2e8f0;border-radius:10px;margin:10px 0;overflow:hidden;">'
            + '<div onclick="window._mnCardToggleGrupo(' + gi + ')" style="display:flex;align-items:center;gap:8px;padding:9px 12px;background:#f8fafc;cursor:pointer;user-select:none;">'
            + '<input type="checkbox" name="mn-card-corr-grupo" value="' + gSafe + '" onclick="event.stopPropagation();window._mnCardCorrGrupoChange(this)" title="Selecionar apenas a categoria" style="width:16px;height:16px;accent-color:#d97706;cursor:pointer;flex-shrink:0;">'
            + '<i class="ph ' + gIco + '" style="font-size:1.05rem;color:#d97706;"></i>'
            + '<span style="flex:1;font-size:0.76rem;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:.05em;">' + g.grupo + '</span>'
            + '<span id="mn-card-grp-cnt-' + gi + '" style="font-size:0.7rem;color:#94a3b8;font-weight:700;">' + g.itens.length + ' serviços</span>'
            + '<i id="mn-card-grp-arrow-' + gi + '" class="ph ph-caret-down" style="font-size:1rem;color:#64748b;transition:transform .2s;"></i>'
            + '</div>'
            + '<div id="mn-card-grp-body-' + gi + '" style="display:none;padding:10px 12px;border-top:1px solid #e2e8f0;"><div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">';
        g.itens.forEach(function(it) {
            const valSafe = String(it.nome || '').replace(/"/g, '&quot;');
            categoriasCorretivaHtml += '<label style="display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid #e2e8f0;border-radius:8px;font-size:0.83rem;cursor:pointer;background:#f8fafc;transition:all .15s;user-select:none;">'
                + '<input type="checkbox" name="mn-card-corr-item" value="' + valSafe + '" onchange="window._mnCardCorrItemChange(this)" style="width:16px;height:16px;accent-color:#d97706;cursor:pointer;flex-shrink:0;">'
                + '<i class="ph ' + (it.icone || 'ph-wrench') + '" style="font-size:1.1rem;color:#d97706;flex-shrink:0;"></i>'
                + '<span style="color:#1e293b;font-weight:500;">' + (it.rotulo || it.nome) + '</span>'
                + '</label>';
        });
        categoriasCorretivaHtml += '</div></div></div>';
    });

    // Montar opções de marcos de Revisão do veículo
    const passoKm = typeof window._mnRevPassoKm === 'function' ? window._mnRevPassoKm(v) : (Number(v.uso_severo) === 1 ? 5000 : 10000);
    const passoMeses = typeof window._mnRevPassoMeses === 'function' ? window._mnRevPassoMeses(v) : (Number(v.uso_severo) === 1 ? 6 : 12);
    const kmAtual = Number(v.km_atual || 0);
    const maxMarco = Math.max(100000, Math.ceil((kmAtual + passoKm * 2) / passoKm) * passoKm);
    const mapRev = {};
    revisoesVeic.forEach(r => { mapRev[Number(r.marco_km)] = r; });
    let opcoesMarcosHtml = '';
    let proximoMarcoSugerido = null;
    for (let km = passoKm, idx = 1; km <= maxMarco; km += passoKm, idx++) {
        const reg = mapRev[km];
        if (reg && reg.status === 'realizada') continue;
        if (!proximoMarcoSugerido) proximoMarcoSugerido = km;
        const meses = idx * passoMeses;
        const stTxt = (reg && reg.status === 'agendada')
            ? ('Agendada' + (reg.data_revisao ? ' para ' + String(reg.data_revisao).split('T')[0].split('-').reverse().join('/') : ''))
            : (kmAtual >= km ? 'Vencida por KM' : 'Pendente');
        opcoesMarcosHtml += `<option value="${km}" data-meses="${meses}" ${km === proximoMarcoSugerido ? 'selected' : ''}>${idx}ª Revisão — ${km.toLocaleString('pt-BR')} km / ${meses} meses (${stTxt})</option>`;
    }

    const bannerEmManut = emManutencao ? `
        <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:10px 14px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">
            <div style="font-size:0.82rem;color:#9a3412;font-weight:600;">
                <i class="ph ph-warning-circle" style="margin-right:4px;"></i>Este veículo possui manutenção/revisão ativa com veículo parado.
            </div>
            <button type="button" onclick="document.getElementById('mn-card-popup').remove(); window._abrirFormFinalizacaoManutencaoCard(${vid}, '${statusAtivo||''}');"
                style="padding:6px 12px;border:none;border-radius:6px;background:#dc2626;color:#fff;font-size:0.78rem;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:4px;">
                <i class="ph ph-check-circle"></i> Finalizar Manutenção Ativa
            </button>
        </div>
    ` : '';

    // Criar overlay/modal
    let popup = document.getElementById('mn-card-popup');
    if (popup) popup.remove();
    popup = document.createElement('div');
    popup.id = 'mn-card-popup';
    popup.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.55);display:flex;align-items:center;justify-content:center;z-index:9999;padding:16px;';
    popup.innerHTML = `
    <div style="background:#fff;border-radius:16px;width:100%;max-width:680px;max-height:92vh;overflow-y:auto;box-shadow:0 25px 60px rgba(0,0,0,0.25);">
        <!-- Header -->
        <div style="background:linear-gradient(135deg,#1e293b,#334155);padding:18px 22px;border-radius:16px 16px 0 0;display:flex;align-items:center;gap:12px;position:sticky;top:0;z-index:5;">
            <div style="background:#d97706;border-radius:10px;width:40px;height:40px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                <i class="ph ph-wrench" style="color:#fff;font-size:1.3rem;"></i>
            </div>
            <div>
                <div style="color:#fff;font-weight:700;font-size:1rem;">Registrar Manutenção</div>
                <div style="color:rgba(255,255,255,0.65);font-size:0.8rem;">${v.placa} — ${(v.marca_modelo_versao||'').substring(0,40)}</div>
            </div>
            <button onclick="document.getElementById('mn-card-popup').remove()" style="margin-left:auto;background:rgba(255,255,255,0.12);border:none;border-radius:50%;width:32px;height:32px;cursor:pointer;color:#fff;display:flex;align-items:center;justify-content:center;">
                <i class="ph ph-x"></i>
            </button>
        </div>

        <!-- Body -->
        <div style="padding:20px 22px;">
            ${bannerEmManut}
            <!-- Tipo de manutenção: Corretiva ou Revisão -->
            <div style="margin-bottom:18px;">
                <p style="font-size:0.82rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin:0 0 10px;">Tipo de Manutenção</p>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                    <button id="mn-card-tipo-corr" onclick="window._mnCardSelecionarTipo('corretiva')"
                        style="padding:14px 10px;border:2px solid #e2e8f0;border-radius:10px;background:#f8fafc;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:6px;transition:.15s;">
                        <i class="ph ph-warning" style="font-size:1.8rem;color:#dc2626;"></i>
                        <span style="font-size:0.85rem;font-weight:700;color:#1e293b;">Corretiva</span>
                        <span style="font-size:0.72rem;color:#64748b;text-align:center;">Defeito / problema</span>
                    </button>
                    <button id="mn-card-tipo-rev" onclick="window._mnCardSelecionarTipo('revisao')"
                        style="padding:14px 10px;border:2px solid #e2e8f0;border-radius:10px;background:#f8fafc;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:6px;transition:.15s;">
                        <i class="ph ph-seal-check" style="font-size:1.8rem;color:#7c3aed;"></i>
                        <span style="font-size:0.85rem;font-weight:700;color:#1e293b;">Revisão</span>
                        <span style="font-size:0.72rem;color:#64748b;text-align:center;">Plano de revisão por KM</span>
                    </button>
                </div>
            </div>

            <!-- Data de início e Data de fim -->
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:18px;">
                <div>
                    <label style="font-size:0.82rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;display:block;margin-bottom:6px;">
                        <i class="ph ph-calendar" style="margin-right:4px;"></i>Data da Solicitação
                    </label>
                    <input type="date" id="mn-card-data" value="${(function(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');})()}"
                        style="width:100%;padding:10px 12px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:0.9rem;outline:none;box-sizing:border-box;">
                </div>
                <div id="mn-card-wrap-data-fim">
                    <label style="font-size:0.82rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;display:block;margin-bottom:6px;">
                        <i class="ph ph-calendar-check" style="margin-right:4px;color:#059669;"></i>Data de Fim <span style="font-weight:400;text-transform:none;font-size:0.72rem;color:#94a3b8;">(opcional)</span>
                    </label>
                    <input type="date" id="mn-card-data-fim" value=""
                        style="width:100%;padding:10px 12px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:0.9rem;outline:none;box-sizing:border-box;">
                </div>
            </div>

            <!-- Seção Corretiva: pergunta se está rodando + categorias/subcategorias + descrição do defeito -->
            <div id="mn-card-sec-corretiva" style="display:none;margin-bottom:18px;">
                <p style="margin:0 0 6px;font-size:0.78rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;">O veículo está rodando? *</p>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px;">
                    <label style="display:flex;align-items:center;gap:6px;padding:10px 12px;border:1.5px solid #22c55e;border-radius:8px;font-size:0.84rem;cursor:pointer;background:#dcfce7;color:#15803d;font-weight:600;">
                        <input type="radio" name="mn-card-corr-rodando" value="sim" style="width:16px;height:16px;accent-color:#16a34a;cursor:pointer;">
                        <span>VEÍCULO RODANDO <small style="color:#64748b;">(agendar)</small></span>
                    </label>
                    <label style="display:flex;align-items:center;gap:6px;padding:10px 12px;border:1.5px solid #ef4444;border-radius:8px;font-size:0.84rem;cursor:pointer;background:#fee2e2;color:#b91c1c;font-weight:600;">
                        <input type="radio" name="mn-card-corr-rodando" value="nao" style="width:16px;height:16px;accent-color:#dc2626;cursor:pointer;">
                        <span>VEÍCULO PARADO <small style="color:#64748b;">(indisponível)</small></span>
                    </label>
                </div>

                <p style="margin:14px 0 6px;font-size:0.78rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;">Quais manutenções são necessárias? (selecione uma ou mais) *</p>
                <div style="border:1px solid #e2e8f0;border-radius:10px;padding:6px 12px 12px;background:#fff;margin-bottom:14px;">
                    ${categoriasCorretivaHtml}
                </div>

                <div id="mn-card-corr-outros-wrap" style="display:none;margin-bottom:14px;width:100%;box-sizing:border-box;">
                    <label style="font-size:0.78rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;display:block;margin-bottom:6px;">
                        <i class="ph ph-pencil-simple" style="margin-right:4px;color:#d97706;"></i>Descreva a manutenção de "Outros" *
                    </label>
                    <textarea id="mn-card-corr-outros" rows="2" placeholder="Descreva detalhadamente a manutenção necessária..."
                        style="width:100%;padding:10px 12px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:0.88rem;outline:none;resize:vertical;box-sizing:border-box;font-family:inherit;"></textarea>
                </div>

                <label style="font-size:0.78rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;display:block;margin-bottom:6px;">
                    <i class="ph ph-note-pencil" style="margin-right:4px;color:#dc2626;"></i>Descrição do Defeito / Observação (opcional)
                </label>
                <textarea id="mn-card-defeito" rows="3" placeholder="Descreva o problema / defeito apresentado pelo veículo..."
                    style="width:100%;padding:10px 12px;border:1.5px solid #fca5a5;border-radius:8px;font-size:0.88rem;outline:none;resize:vertical;box-sizing:border-box;font-family:inherit;background:#fff5f5;"></textarea>
            </div>

            <!-- Seção Revisão: seleção do marco de KM da revisão -->
            <div id="mn-card-sec-revisao" style="display:none;margin-bottom:18px;">
                <div style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:10px;padding:14px;">
                    <label style="font-size:0.8rem;font-weight:700;color:#5b21b6;display:block;margin-bottom:6px;">
                        <i class="ph ph-seal-check" style="margin-right:4px;"></i>Selecione o Marco da Revisão *
                    </label>
                    <select id="mn-card-rev-marco" style="width:100%;padding:10px 12px;border:1.5px solid #c4b5fd;border-radius:8px;font-size:0.88rem;font-weight:700;color:#1e293b;background:#fff;margin-bottom:10px;">
                        ${opcoesMarcosHtml}
                    </select>
                    <label style="font-size:0.78rem;font-weight:700;color:#475569;display:block;margin-bottom:4px;">Observações da Revisão (opcional)</label>
                    <textarea id="mn-card-rev-obs" rows="2" placeholder="Concessionária, detalhes do agendamento..." style="width:100%;padding:8px 10px;border:1px solid #cbd5e1;border-radius:8px;font-size:0.85rem;box-sizing:border-box;font-family:inherit;"></textarea>
                    <div style="margin-top:10px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
                        <span style="font-size:0.75rem;color:#6d28d9;">Ao agendar para hoje ou data anterior, o veículo fica marcado como Parado até a conclusão da revisão.</span>
                        <button type="button" onclick="window._mnCardIrParaRevisao(${vid})" style="background:#fff;color:#7c3aed;border:1px solid #c4b5fd;border-radius:8px;padding:6px 12px;font-size:0.78rem;font-weight:700;cursor:pointer;">
                            Abrir Painel de Revisões →
                        </button>
                    </div>
                </div>
            </div>

            <!-- Aviso: escolha um tipo -->
            <div id="mn-card-aviso-tipo" style="text-align:center;padding:16px;background:#f8fafc;border-radius:10px;color:#94a3b8;font-size:0.85rem;margin-bottom:8px;">
                <i class="ph ph-arrow-up" style="display:block;font-size:1.5rem;margin-bottom:4px;"></i>
                Selecione o tipo de manutenção acima (Corretiva ou Revisão)
            </div>

            <!-- Botões de ação -->
            <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:4px;">
                <button onclick="document.getElementById('mn-card-popup').remove()"
                    style="padding:10px 20px;border:1.5px solid #e2e8f0;border-radius:8px;background:#fff;color:#64748b;cursor:pointer;font-weight:600;font-size:0.9rem;">
                    Cancelar
                </button>
                <button id="mn-card-btn-confirmar" onclick="window._mnCardConfirmar(${vid})"
                    style="padding:10px 22px;border:none;border-radius:8px;background:#d97706;color:#fff;cursor:pointer;font-weight:700;font-size:0.9rem;display:flex;align-items:center;gap:6px;opacity:0.5;pointer-events:none;">
                    <i class="ph ph-check"></i> Confirmar
                </button>
            </div>
        </div>
    </div>`;
    document.body.appendChild(popup);
    popup.addEventListener('click', e => { if (e.target === popup) popup.remove(); });
};
window._abrirFormFinalizacaoManutencaoCard = _abrirFormFinalizacaoManutencao;

window._mnCardIrParaRevisao = function(vid) {
    document.getElementById('mn-card-popup')?.remove();
    window._mnRevVeicId = vid;
    window._mnSubAba = 'revisao';
    window._mnSubAbaInicial = 'revisao';
    window.trocarAbaFrota('manutencoes');
};

window._mnCardSelecionarTipo = function(tipo) {
    const btnRev = document.getElementById('mn-card-tipo-rev');
    const btnCorr = document.getElementById('mn-card-tipo-corr');
    const secRev = document.getElementById('mn-card-sec-revisao');
    const secCorr = document.getElementById('mn-card-sec-corretiva');
    const wrapFim = document.getElementById('mn-card-wrap-data-fim');
    const aviso = document.getElementById('mn-card-aviso-tipo');
    const btnConf = document.getElementById('mn-card-btn-confirmar');
    window._mnCardTipoAtual = tipo;

    if (btnRev) { btnRev.style.borderColor = tipo==='revisao'?'#7c3aed':'#e2e8f0'; btnRev.style.background = tipo==='revisao'?'#f5f3ff':'#f8fafc'; }
    if (btnCorr) { btnCorr.style.borderColor = tipo==='corretiva'?'#dc2626':'#e2e8f0'; btnCorr.style.background = tipo==='corretiva'?'#fff5f5':'#f8fafc'; }
    if (secRev) secRev.style.display = tipo==='revisao'?'block':'none';
    if (secCorr) secCorr.style.display = tipo==='corretiva'?'block':'none';
    if (wrapFim) wrapFim.style.display = tipo==='revisao'?'none':'block';
    if (aviso) aviso.style.display = 'none';
    if (btnConf) { btnConf.style.opacity='1'; btnConf.style.pointerEvents='auto'; }
};

window._mnCardConfirmar = async function(vid) {
    const tipo = window._mnCardTipoAtual;
    if (!tipo) return;
    const data = document.getElementById('mn-card-data')?.value;
    const dataFim = document.getElementById('mn-card-data-fim')?.value;
    if (tipo === 'corretiva' && data && dataFim && dataFim < data) {
        alert('A Data de Fim não pode ser anterior à Data de Início.');
        return;
    }
    const token = localStorage.getItem('erp_token') || localStorage.getItem('token');
    const btn = document.getElementById('mn-card-btn-confirmar');

    let body = { veiculo_id: vid, tipo, data_inicio: data || null, data_fim: dataFim || null };
    if (tipo === 'corretiva') {
        const selRod = document.querySelector('input[name="mn-card-corr-rodando"]:checked');
        if (!selRod) {
            alert('Informe se o veículo está rodando ou parado ("O veículo está rodando? *").');
            return;
        }
        const chks = [...document.querySelectorAll('input[name="mn-card-corr-grupo"]:checked'), ...document.querySelectorAll('input[name="mn-card-corr-item"]:checked')];
        if (!chks.length) {
            alert('Selecione pelo menos uma categoria ou subcategoria de manutenção.');
            return;
        }
        const itensRaw = chks.map(c => c.value);
        const temOutros = itensRaw.includes('Outros');
        const outrosTxt = (document.getElementById('mn-card-corr-outros')?.value || '').trim();
        if (temOutros && !outrosTxt) {
            alert('Descreva a manutenção no campo "Outros".');
            return;
        }
        const partes = itensRaw.map(it => it === 'Outros' ? ('Outros: ' + outrosTxt) : it);
        const itensTexto = partes.join(', ');
        const defeitoObs = (document.getElementById('mn-card-defeito')?.value || '').trim();
        body.veiculo_rodando = selRod.value;
        body.itens_solicitados = itensTexto;
        body.observacoes = defeitoObs || null;
        body.descricao_corretiva = itensTexto + (defeitoObs ? ': ' + defeitoObs : '');
    } else if (tipo === 'revisao') {
        const selMarco = document.getElementById('mn-card-rev-marco');
        const marcoKm = parseInt(selMarco?.value || '0', 10);
        if (!marcoKm) {
            alert('Selecione o marco de KM da revisão.');
            return;
        }
        const opt = selMarco.options[selMarco.selectedIndex];
        body.marco_km = marcoKm;
        body.marco_meses = parseInt(opt?.getAttribute('data-meses') || '12', 10);
        body.observacoes = (document.getElementById('mn-card-rev-obs')?.value || '').trim() || null;
    }

    if (tipo === 'corretiva' && typeof window._mnChecarSolicitacaoExistente === 'function') {
        // Veiculo ja tem solicitacao aberta? O usuario decide entre reforcar a existente ou criar nova
        const ck = await window._mnChecarSolicitacaoExistente(vid, body.descricao_corretiva || '');
        if (ck.acao === 'cancelar') return;
        if (ck.acao === 'reforco') {
            document.getElementById('mn-card-popup')?.remove();
            window.initFrotaVeiculos();
            if (typeof window.mnCarregarCorretivas === 'function' && document.getElementById('mn-corr-tbody')) window.mnCarregarCorretivas();
            return;
        }
    }

    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ph ph-circle-notch ph-spin"></i> Salvando...'; }

    try {
        const r = await fetch('/api/frota/manutencoes/agendar-card', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
            body: JSON.stringify(body)
        });
        if (!r.ok) { const e = await r.json(); throw new Error(e.error || 'Erro'); }
        document.getElementById('mn-card-popup')?.remove();
        mostrarToastAviso(tipo === 'corretiva' ? '✅ Solicitação de manutenção corretiva criada!' : '✅ Revisão agendada com sucesso!');
        window.initFrotaVeiculos();
        if (typeof window.mnCarregarCorretivas === 'function' && document.getElementById('mn-corr-tbody')) {
            window.mnCarregarCorretivas();
        }
        if (typeof window.checkUserNotificacoes === 'function') {
            setTimeout(window.checkUserNotificacoes, 400);
        }
    } catch(e) {
        mostrarToastAviso('❌ Erro: ' + e.message);
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ph ph-check"></i> Confirmar'; }
    }
};

window.toggleManutencaoFrota = async function(vid, novoStatus) {
    if (!confirm(`Deseja ${novoStatus ? 'colocar este veículo em manutenção' : 'retirar este veículo da manutenção'}?`)) return;
    try {
        const token = localStorage.getItem('erp_token') || localStorage.getItem('token');
        const res = await fetch(`/api/frota/veiculos/${vid}/toggle-manutencao`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ status: novoStatus })
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Erro ao alterar status.');
        }
        mostrarToastAviso('✅ Status de manutenção atualizado!');
        window.initFrotaVeiculos();
    } catch (e) {
        mostrarToastAviso('❌ Erro: ' + e.message);
    }
}


window.salvarKmCard = async function(vid) {
    const inp = document.getElementById('km-card-' + vid);
    if (!inp || inp.value === '' || inp.value === null) {
        alert('Informe a KM do veículo para salvar.');
        return;
    }
    const km = parseInt(inp.value, 10);
    if (isNaN(km) || km < 0) {
        alert('Informe uma KM válida.');
        return;
    }
    const tok = window.currentToken || localStorage.getItem('token');
    try {
        const res = await fetch('/api/frota/veiculos/' + vid + '/km', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok },
            body: JSON.stringify({ km_atual: km })
        });
        const respData = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(respData.error || 'Erro ao salvar KM');
        // Update local data and clear overdue flag (mesmo quando a KM se mantém igual)
        const v = (window._frotaDados||[]).find(x => x.id === vid);
        if (v) {
            v.km_atual = km;
            v.km_vencida = 0;
            if (respData.km_updated_at) v.km_updated_at = respData.km_updated_at;
            if (respData.data) v.ultima_data_km = respData.data;
        }
        // Check alert status for this vehicle and re-render
        const alertRes = await fetch('/api/frota/veiculos/' + vid + '/alertas', { headers: { Authorization: 'Bearer ' + tok } }).catch(() => null);
        if (alertRes && alertRes.ok) {
            const alertData = await alertRes.json().catch(() => ({}));
            const temAlerta = alertData.tem_alerta;
            if (window._frotaStatusManut) {
                window._frotaStatusManut[vid] = {
                    ...(window._frotaStatusManut[vid]||{}),
                    km_atual: km,
                    alerta_manutencao: temAlerta ? 'proxima' : 'ok'
                };
            }
        }
        if (typeof mostrarToastAviso === 'function') mostrarToastAviso('✅ KM atualizada com sucesso!');
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
    if (!data.crlv_base64 && !data.crlv_url) throw new Error('Documento não encontrado.');

    if (data.crlv_url) {
      window.open(data.crlv_url, '_blank');
      return;
    }

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

// Contexto de exibicao da tela de Gestao de Frota: 'logistica' (padrao, com abas) ou 'compras' (Financeiro > Compras > Frota, sem a aba Manutencoes)
window._frotaModoCompras = false;
window._frotaMontarContexto = function(modo) {
    const cont = document.getElementById('frota-veiculos-container');
    if (!cont) return;
    const alvo = document.getElementById(modo === 'compras' ? 'view-compras-gestao-frota' : 'view-logistica-frota');
    if (alvo && cont.parentElement !== alvo) alvo.appendChild(cont);
    window._frotaModoCompras = (modo === 'compras');
    const btn = cont.querySelector('.frota-aba-btn');
    if (btn && btn.parentElement) btn.parentElement.style.display = window._frotaModoCompras ? 'none' : 'flex';
};

window.trocarAbaFrota = function(aba) {
    const _fpt = window.frotaPerms || { gestao: true, manutencao: true };
    if ((aba === 'manutencoes' && !_fpt.manutencao) || (aba === 'veiculos' && !_fpt.gestao)) return;
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

  // Abas visiveis conforme as liberacoes Frota (Gestao) e Frota (Manutencao)
  // No Financeiro > Compras > Frota > Gestao de Frota a MESMA tela e exibida, sem a aba Manutencoes
  const _fp = window._frotaModoCompras ? { gestao: true, manutencao: false } : (window.frotaPerms || { gestao: true, manutencao: true });
  const _tabBarCtx = outerC.querySelector('.frota-aba-btn');
  if (_tabBarCtx && _tabBarCtx.parentElement) _tabBarCtx.parentElement.style.display = window._frotaModoCompras ? 'none' : 'flex';
  document.querySelectorAll('.frota-aba-btn').forEach(b => {
      const ok = (b.dataset.aba === 'veiculos' && _fp.gestao) || (b.dataset.aba === 'manutencoes' && _fp.manutencao);
      b.style.display = ok ? 'flex' : 'none';
  });
  if (!_fp.gestao) {
      if (_fp.manutencao) { window.trocarAbaFrota('manutencoes'); }
      else { c.innerHTML = '<div style="padding:2rem;color:#dc2626;font-weight:600;">Voc\u00ea n\u00e3o tem libera\u00e7\u00e3o para esta tela.</div>'; }
      return;
  }

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
    const ts = Date.now();
    const [frotaRes, statusRes] = await Promise.all([
        fetch('/api/frota/veiculos?_=' + ts, { headers: { Authorization: 'Bearer ' + tok } }),
        fetch('/api/frota/status-manutencao?_=' + ts, { headers: { Authorization: 'Bearer ' + tok } }).catch(() => ({ json: () => [] }))
    ]);
    const rows = await frotaRes.json();
    const statusManut = await statusRes.json().catch(() => []);
    // Enrich vehicles with maintenance status
    window._frotaStatusManut = {};
    (statusManut || []).forEach(s => { window._frotaStatusManut[s.id] = s; });
    if (!Array.isArray(rows)) {
      console.error('[FROTA] API retornou dado inesperado:', rows);
      throw new Error(rows?.error || 'Resposta inválida do servidor');
    }
    window._frotaDados = rows;

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
  if(id){const r=await fetch('/api/frota/veiculos/'+id+'?_='+Date.now(),{headers:{Authorization:'Bearer '+tok},cache:'no-store'});v=await r.json();}
  
  window._frotaB64=null;
  window._frotaFN=null;
  window._frotaImgB64=v.foto_url||v.foto_base64||null;
  
  let ov=document.getElementById('modal-frota-ov');if(ov)ov.remove();
  ov=document.createElement('div');ov.id='modal-frota-ov';
  ov.style.cssText='position:fixed;inset:0;background:rgba(15,23,42,.75);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:1rem;';
  
  const tipos=['caminhão','caminhonete','utilitário','carretinha','caminhão tanque'];
  const optT=tipos.map(t=>`<option value="${t}"${(v.tipo_veiculo||'caminhão')===t?' selected':''}>${t.charAt(0).toUpperCase()+t.slice(1)}</option>`).join('');
  const inp=(id,val,ph,type)=>`<input id="${id}" value="${val||''}" placeholder="${ph||''}" type="${type||'text'}" style="width:100%;padding:0.6rem;border:1px solid #cbd5e1;border-radius:8px;box-sizing:border-box;font-size:0.9rem;outline:none;transition:0.2s;" onfocus="this.style.borderColor='#2d9e5f';this.style.boxShadow='0 0 0 3px rgba(45,158,95,0.1)'" onblur="this.style.borderColor='#cbd5e1';this.style.boxShadow='none'">`;
  const lbl=t=>`<label style="font-size:0.8rem;font-weight:600;color:#475569;display:block;margin-bottom:4px;">${t}</label>`;
  const alerta=alertaPlaca(v.placa,v.exercicio,v.tipo_veiculo);
  let alertaHtml = '';
  if (alerta === 'expirado') {
      alertaHtml = `<div style="background:#fef2f2;border-left:4px solid #ef4444;padding:0.75rem 1rem;margin-bottom:1.5rem;color:#b91c1c;font-weight:600;font-size:0.85rem;border-radius:4px;">⚠️ CRLV vencido (passou da data-limite) — atualize o documento para regularizar a situação no sistema.</div>`;
  } else if (alerta === 'vencendo') {
      alertaHtml = `<div style="background:#fffbeb;border-left:4px solid #f59e0b;padding:0.75rem 1rem;margin-bottom:1.5rem;color:#b45309;font-weight:600;font-size:0.85rem;border-radius:4px;">⚠️ CRLV a vencer (menos de 30 dias) — providencie a atualização.</div>`;
  }
  
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
            <div style="display:inline-flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap;">
                ${id ? '' : `<label style="background:#eab308;color:#fff;padding:0.6rem 1.2rem;border-radius:8px;cursor:pointer;font-weight:700;font-size:0.85rem;display:inline-flex;align-items:center;gap:6px;transition:0.2s;" onmouseover="this.style.background='#ca8a04'" onmouseout="this.style.background='#eab308'">
                    <i class="ph ph-upload-simple"></i> Selecionar PDF
                    <input type="file" accept=".pdf" style="display:none;" onchange="window.processarCRLV(this,'new')"> 
                </label>`}
                ${(id && (v.crlv_filename || v.crlv_r2_key || v.crlv_url || v.crlv_base64))
                    ? `<button type="button" onclick="window.baixarCRLV(${v.id}, '${String(v.placa||'').replace(/'/g,'')}')" title="Baixar CRLV (${v.crlv_filename || 'PDF'})" style="background:#2563eb;color:#fff;border:none;padding:0.6rem 0.95rem;border-radius:8px;cursor:pointer;font-weight:700;font-size:0.85rem;display:inline-flex;align-items:center;gap:6px;transition:0.2s;" onmouseover="this.style.background='#1d4ed8'" onmouseout="this.style.background='#2563eb'"><i class="ph ph-file-pdf" style="font-size:1.1rem;"></i> Baixar CRLV</button>`
                    : `<button type="button" disabled title="Nenhum CRLV anexado neste veículo" style="background:#93c5fd;color:#fff;border:none;padding:0.6rem 0.95rem;border-radius:8px;cursor:not-allowed;font-weight:700;font-size:0.85rem;display:inline-flex;align-items:center;gap:6px;opacity:0.65;"><i class="ph ph-file-pdf" style="font-size:1.1rem;"></i> Baixar CRLV</button>`}
            </div>
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
        <div>${lbl('Chassi')}${inp('fv-chassi',v.chassi,'Ex: 9BWZZZ...')}</div>
        <div>${lbl('Data de Garantia do Veículo')}${inp('fv-garantia-ate',String(v.garantia_fabrica_ate||'').split('T')[0],'','date')}</div>
        <div>${lbl('Tipo de Veículo')}<select id="fv-tipo" style="width:100%;padding:0.6rem;border:1px solid #cbd5e1;border-radius:8px;background:#fff;box-sizing:border-box;font-size:0.9rem;outline:none;transition:0.2s;" onfocus="this.style.borderColor='#2d9e5f';this.style.boxShadow='0 0 0 3px rgba(45,158,95,0.1)'" onblur="this.style.borderColor='#cbd5e1';this.style.boxShadow='none'">${optT}</select></div>
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

<div style="display:flex;gap:1rem;justify-content:flex-end;align-items:center;padding-top:1rem;border-top:1px solid #e2e8f0;flex-wrap:wrap;">
${id?`<div style="margin-right:auto;display:flex;gap:0.75rem;flex-wrap:wrap;">
    <button onclick="window.abrirHistoricoKmVeiculo(${id})" style="background:#fff;color:#0284c7;border:1px solid #0284c7;border-radius:8px;padding:0.6rem 1.2rem;font-weight:600;cursor:pointer;font-size:0.9rem;display:inline-flex;align-items:center;gap:6px;transition:0.2s;" onmouseover="this.style.background='#e0f2fe'" onmouseout="this.style.background='#fff'"><i class="ph ph-clock-counter-clockwise"></i> Histórico de KM</button>
    <button onclick="window.abrirAtualizarCRLV(${id})" style="background:#fff;color:#f59e0b;border:1px solid #f59e0b;border-radius:8px;padding:0.6rem 1.2rem;font-weight:600;cursor:pointer;font-size:0.9rem;display:inline-flex;align-items:center;gap:6px;transition:0.2s;" onmouseover="this.style.background='#fef3c7'" onmouseout="this.style.background='#fff'"><i class="ph ph-arrows-clockwise"></i> Atualizar apenas CRLV</button>
</div>`:''}
<button onclick="document.getElementById('modal-frota-ov').remove()" style="background:#f1f5f9;border:1px solid #cbd5e1;border-radius:8px;padding:0.6rem 1.2rem;font-weight:600;cursor:pointer;color:#475569;font-size:0.9rem;transition:0.2s;" onmouseover="this.style.background='#e2e8f0'">Cancelar</button>
<button onclick="window.salvarVeiculoFrota(${id||'null'})" style="background:#2d9e5f;color:#fff;border:none;border-radius:8px;padding:0.6rem 1.5rem;font-weight:600;cursor:pointer;font-size:0.9rem;display:inline-flex;align-items:center;gap:6px;box-shadow:0 4px 10px rgba(45,158,95,0.3);transition:0.2s;" onmouseover="this.style.background='#23824e'"><i class="ph ph-floppy-disk"></i> ${id?'Salvar Alterações':'Cadastrar Veículo'}</button>
</div>
</div></div>`;
  document.body.appendChild(ov);
  ov.addEventListener('click',e=>{if(e.target===ov)ov.remove();});
};

window.abrirHistoricoKmVeiculo = async function(id) {
  const tok = window.currentToken || localStorage.getItem('token');
  let ovH = document.getElementById('modal-hist-km');
  if (ovH) ovH.remove();
  ovH = document.createElement('div');
  ovH.id = 'modal-hist-km';
  ovH.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.82);z-index:10020;display:flex;align-items:center;justify-content:center;padding:1rem;';
  ovH.innerHTML = `<div style="background:#fff;border-radius:16px;width:94vw;max-width:560px;max-height:85vh;display:flex;flex-direction:column;box-shadow:0 25px 60px rgba(0,0,0,.4);overflow:hidden;">
    <div style="padding:1rem 1.5rem;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;background:#f0f9ff;">
      <div style="font-weight:700;color:#0369a1;display:flex;align-items:center;gap:8px;font-size:1rem;">
        <i class="ph ph-clock-counter-clockwise" style="font-size:1.25rem;color:#0284c7;"></i>
        <span id="modal-hist-km-titulo">Histórico de KM</span>
      </div>
      <button onclick="document.getElementById('modal-hist-km').remove()" style="background:none;border:none;font-size:1.4rem;cursor:pointer;color:#64748b;"><i class="ph ph-x"></i></button>
    </div>
    <div id="modal-hist-km-body" style="padding:1.25rem 1.5rem;overflow-y:auto;flex:1;">
      <div style="text-align:center;padding:2rem;color:#64748b;"><i class="ph ph-circle-notch ph-spin" style="font-size:1.6rem;"></i><br>Carregando histórico de KM...</div>
    </div>
    <div style="padding:0.9rem 1.5rem;border-top:1px solid #e2e8f0;background:#f8fafc;display:flex;justify-content:flex-end;">
      <button onclick="document.getElementById('modal-hist-km').remove()" style="background:#0284c7;color:#fff;border:none;border-radius:8px;padding:0.55rem 1.3rem;font-weight:600;cursor:pointer;font-size:0.88rem;">Fechar</button>
    </div>
  </div>`;
  document.body.appendChild(ovH);
  ovH.addEventListener('click', e => { if (e.target === ovH) ovH.remove(); });

  try {
    const res = await fetch('/api/frota/veiculos/' + id + '/km-historico?_=' + Date.now(), {
      headers: { Authorization: 'Bearer ' + tok }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao buscar histórico de KM');
    const veic = data.veiculo || {};
    const hist = Array.isArray(data.historico) ? data.historico : [];
    const titEl = document.getElementById('modal-hist-km-titulo');
    if (titEl && veic.placa) {
      titEl.textContent = `Histórico de KM — ${veic.placa}${veic.marca_modelo_versao ? ' (' + veic.marca_modelo_versao + ')' : ''}`;
    }
    const bodyEl = document.getElementById('modal-hist-km-body');
    if (!bodyEl) return;
    if (!hist.length) {
      bodyEl.innerHTML = `<div style="text-align:center;padding:2rem;color:#94a3b8;font-size:0.92rem;">Nenhuma atualização de KM registrada para este veículo até o momento.</div>`;
      return;
    }
    const fmtData = (dStr, cStr) => {
      const base = String(dStr || '').slice(0, 10);
      const dtFmt = base && base.includes('-') ? base.split('-').reverse().join('/') : (base || '-');
      const hora = cStr && String(cStr).length >= 16 ? String(cStr).replace('T', ' ').slice(11, 16) : '';
      return hora && hora !== '12:00' ? `${dtFmt} às ${hora}` : dtFmt;
    };
    const rowsHtml = hist.map((item, idx) => {
      const kmAtualNum = Number(item.km || 0);
      const proxAnt = hist[idx + 1];
      let diffHtml = '<span style="color:#94a3b8;font-size:0.75rem;">Registro inicial</span>';
      if (proxAnt) {
        const diff = kmAtualNum - Number(proxAnt.km || 0);
        if (diff > 0) diffHtml = `<span style="color:#16a34a;font-weight:700;font-size:0.78rem;">+${diff.toLocaleString('pt-BR')} km</span>`;
        else if (diff === 0) diffHtml = `<span style="color:#0284c7;font-weight:600;font-size:0.76rem;">Mesma KM (0 km)</span>`;
        else diffHtml = `<span style="color:#d97706;font-weight:600;font-size:0.76rem;">${diff.toLocaleString('pt-BR')} km</span>`;
      }
      return `<tr style="border-bottom:1px solid #f1f5f9;background:${idx === 0 ? '#f0f9ff' : '#fff'};">
        <td style="padding:10px 12px;font-weight:700;color:#0f172a;font-size:0.88rem;">
          ${fmtData(item.data, item.created_at)}
          ${idx === 0 ? '<span style="margin-left:6px;background:#0284c7;color:#fff;font-size:0.65rem;padding:2px 6px;border-radius:999px;font-weight:700;vertical-align:middle;">ATUAL</span>' : ''}
        </td>
        <td style="padding:10px 12px;text-align:right;font-weight:800;color:#0369a1;font-size:0.92rem;">${kmAtualNum.toLocaleString('pt-BR')} km</td>
        <td style="padding:10px 12px;text-align:right;">${diffHtml}</td>
      </tr>`;
    }).join('');

    bodyEl.innerHTML = `
      <div style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:#f8fafc;border-bottom:1px solid #e2e8f0;color:#475569;font-size:0.78rem;text-transform:uppercase;letter-spacing:0.4px;">
              <th style="padding:10px 12px;text-align:left;">Data da Atualização</th>
              <th style="padding:10px 12px;text-align:right;">KM Registrada</th>
              <th style="padding:10px 12px;text-align:right;">Variação</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>`;
  } catch (e) {
    const bodyEl = document.getElementById('modal-hist-km-body');
    if (bodyEl) bodyEl.innerHTML = `<div style="text-align:center;padding:1.5rem;color:#dc2626;font-weight:600;">Erro: ${e.message}</div>`;
  }
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
    const res=await fetch('/api/frota/veiculos/'+id+'/crlv',{method:'PUT',headers:{'Content-Type':'application/json',Authorization:'Bearer '+tok},body:JSON.stringify({exercicio:novoExercicio,crlv_base64:window._frotaB64,crlv_filename:window._frotaFN})});
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
    chassi:g('fv-chassi'),
    capacidade_tanque:g('fv-tanque'),
    capacidade_carga:g('fv-carga'),
    tipo_veiculo:g('fv-tipo'),
    garantia_fabrica:g('fv-garantia-ate')?1:0,
    garantia_fabrica_ate:g('fv-garantia-ate')||null,
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

window.baixarCRLV = async function(id, placa) {
  const tok = window.currentToken || localStorage.getItem('token');
  try {
    const res = await fetch(`/api/frota/veiculos/${id}/crlv`, { headers: { Authorization: 'Bearer ' + tok } });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao baixar CRLV');
    if (!data.crlv_base64 && !data.crlv_url) throw new Error('Documento CRLV não encontrado para este veículo.');
    const nomeArq = data.crlv_filename || (`CRLV_${placa || id}.pdf`);
    if (data.crlv_base64) {
      let b64 = data.crlv_base64;
      if (b64.includes(',')) b64 = b64.split(',')[1];
      const byteCharacters = atob(b64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
      const blob = new Blob([new Uint8Array(byteNumbers)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nomeArq;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1500);
      return;
    }
    if (data.crlv_url) {
      window.open(data.crlv_url, '_blank');
    }
  } catch (err) {
    alert('Erro ao baixar CRLV: ' + err.message);
  }
};

window.excluirVeiculoFrota=async function(id,placa){
  const pedirSenha = () => new Promise(resolve => {
    const ex = document.getElementById('frota-modal-senha-excl');
    if (ex) ex.remove();
    const ov = document.createElement('div');
    ov.id = 'frota-modal-senha-excl';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.75);z-index:10050;display:flex;align-items:center;justify-content:center;padding:1rem;';
    ov.innerHTML = `<div style="background:#fff;border-radius:14px;width:92vw;max-width:380px;padding:1.4rem;box-shadow:0 20px 50px rgba(0,0,0,0.35);">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:0.6rem;">
        <div style="width:38px;height:38px;border-radius:10px;background:#fef2f2;color:#dc2626;display:flex;align-items:center;justify-content:center;font-size:1.3rem;"><i class="ph ph-lock-key"></i></div>
        <div>
          <div style="font-weight:800;color:#1e293b;font-size:0.98rem;">Confirmar Exclusão</div>
          <div style="font-size:0.78rem;color:#64748b;">Excluir o veículo <b>${placa || ''}</b></div>
        </div>
      </div>
      <label style="display:block;font-size:0.78rem;font-weight:700;color:#475569;margin:0.8rem 0 0.35rem;">Digite a senha da Logística para excluir:</label>
      <input id="frota-inp-senha-excl" type="password" placeholder="Senha..." style="width:100%;padding:0.6rem 0.75rem;border:1.5px solid #cbd5e1;border-radius:8px;font-size:0.9rem;box-sizing:border-box;outline:none;">
      <div id="frota-err-senha-excl" style="color:#dc2626;font-size:0.76rem;font-weight:700;margin-top:6px;display:none;">Senha incorreta.</div>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:1.1rem;">
        <button type="button" id="frota-btn-cancel-excl" style="background:#f1f5f9;color:#475569;border:1px solid #e2e8f0;padding:0.5rem 1rem;border-radius:8px;font-weight:700;font-size:0.84rem;cursor:pointer;">Cancelar</button>
        <button type="button" id="frota-btn-ok-excl" style="background:#dc2626;color:#fff;border:none;padding:0.5rem 1.1rem;border-radius:8px;font-weight:700;font-size:0.84rem;cursor:pointer;display:inline-flex;align-items:center;gap:5px;"><i class="ph ph-trash"></i> Excluir</button>
      </div>
    </div>`;
    document.body.appendChild(ov);
    const inp = document.getElementById('frota-inp-senha-excl');
    const err = document.getElementById('frota-err-senha-excl');
    const fechar = (val) => { ov.remove(); resolve(val); };
    document.getElementById('frota-btn-cancel-excl').onclick = () => fechar(null);
    const confirmar = () => {
      const val = (inp.value || '').trim();
      if (val !== 'log123') {
        err.style.display = 'block';
        inp.style.borderColor = '#dc2626';
        inp.focus();
        return;
      }
      fechar(val);
    };
    document.getElementById('frota-btn-ok-excl').onclick = confirmar;
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') confirmar();
      if (e.key === 'Escape') fechar(null);
    });
    setTimeout(() => inp.focus(), 50);
  });

  const senha = await pedirSenha();
  if (!senha) return;
  const tok = window.currentToken || localStorage.getItem('token');
  const res = await fetch('/api/frota/veiculos/'+id,{
    method:'DELETE',
    headers:{'Content-Type':'application/json', Authorization:'Bearer '+tok},
    body: JSON.stringify({ senha })
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    alert(j.error || 'Erro ao excluir veículo.');
    return;
  }
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
