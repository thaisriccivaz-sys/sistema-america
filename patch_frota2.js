const fs = require('fs');

let c = fs.readFileSync('frontend/frota.js', 'utf8');

const regexAlerta = /function alertaPlaca\([\s\S]*?\}\nasync function extrairCRLV/;
const novaAlerta = `function alertaPlaca(placa,exercicio){
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
async function extrairCRLV`;

c = c.replace(regexAlerta, novaAlerta);

const regexRender = /function renderCardsFrota\(\) \{[\s\S]*?window\.visualizarCRLV = async function\(id\)/;

const novoRender = `function renderCardsFrota() {
  const tb = document.getElementById('frota-grid');
  if (!tb) return;

  let rows = [...window._frotaDados];
  if (window._frotaSearch) {
    const s = window._frotaSearch;
    rows = rows.filter(v => {
      const p = v.placa || '';
      const m = v.marca_modelo_versao || '';
      const c = v.cor_predominante || '';
      return p.toLowerCase().includes(s) || m.toLowerCase().includes(s) || c.toLowerCase().includes(s);
    });
  }

  rows.sort((a,b) => {
      const expA = alertaPlaca(a.placa, a.exercicio) === 'expirado' ? 1 : 0;
      const expB = alertaPlaca(b.placa, b.exercicio) === 'expirado' ? 1 : 0;
      if (expA !== expB) return expB - expA;
      return (a.placa||'').localeCompare(b.placa||'');
  });

  if (!rows || !rows.length) {
    tb.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:3rem;color:#94a3b8;font-size:1.1rem;">Nenhum veículo encontrado</div>';
    return;
  }

  tb.innerHTML = rows.map(v => {
    const alerta = alertaPlaca(v.placa, v.exercicio);
    
    let borderColor = '#2d9e5f'; // verde
    let statusLabel = 'OK';
    let textColor = '#fff';
    
    if (alerta === 'expirado') {
        borderColor = '#dc2626'; // vermelho
        statusLabel = '✖';
    } else if (alerta === 'vencendo' || !v.exercicio) {
        borderColor = '#f59e0b'; // amarelo
        statusLabel = '!';
        textColor = '#fff';
    }

    const placeholder = 'https://via.placeholder.com/400x250/e2e8f0/94a3b8?text=Sem+Foto';
    const foto = v.foto_base64 || placeholder;
    const marcaCompleta = v.marca_modelo_versao || 'N/D';

    return \`
    <div style="background:#fff;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.08);overflow:hidden;border:1px solid #e2e8f0;position:relative;display:flex;flex-direction:column;transition:transform 0.2s, box-shadow 0.2s;" onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 12px 20px rgba(0,0,0,0.12)';" onmouseout="this.style.transform='none';this.style.boxShadow='0 4px 12px rgba(0,0,0,0.08)';">
        
        <div style="position:absolute;top:0;right:0;width:0;height:0;border-top:60px solid \${borderColor};border-left:60px solid transparent;z-index:2;"></div>
        <div style="position:absolute;top:8px;right:6px;z-index:3;color:\${textColor};font-size:0.9rem;font-weight:900;transform:rotate(45deg);letter-spacing:1px;width:30px;text-align:center;">
            \${statusLabel}
        </div>

        <div style="height:140px;width:100%;background-image:url('\${foto}');background-size:cover;background-position:center;border-bottom:1px solid #e2e8f0;"></div>
        
        <div style="padding:1rem;flex:1;display:flex;flex-direction:column;gap:0.5rem;font-size:0.85rem;color:#475569;">
            
            <div style="display:flex;flex-direction:column;gap:0.1rem;margin-bottom:0.3rem;">
                <span style="font-weight:600;color:#94a3b8;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.5px;">Placa</span>
                <span style="font-weight:800;color:#2d9e5f;font-size:1.1rem;">\${v.placa||'N/D'}</span>
            </div>
            
            <div style="display:flex;flex-direction:column;gap:0.1rem;border-bottom:1px solid #f1f5f9;padding-bottom:0.5rem;margin-bottom:0.2rem;">
                <span style="font-weight:600;color:#94a3b8;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.5px;">Marca / Modelo / Versão</span>
                <span style="font-weight:700;color:#1e293b;line-height:1.2;">\${marcaCompleta}</span>
            </div>
            
            <div style="display:flex;justify-content:space-between;border-bottom:1px solid #f1f5f9;padding-bottom:0.3rem;">
                <span style="font-weight:600;color:#94a3b8;">Cor:</span>
                <span style="font-weight:700;color:#1e293b;">\${v.cor_predominante||'N/D'}</span>
            </div>
            
            <div style="display:flex;justify-content:space-between;border-bottom:1px solid #f1f5f9;padding-bottom:0.3rem;">
                <span style="font-weight:600;color:#94a3b8;">Exercício:</span>
                <span style="font-weight:700;color:\${alerta==='expirado'?'#dc2626':(alerta==='vencendo'?'#d97706':'#1e293b')};">\${v.exercicio||'N/D'} \${alerta==='vencendo'?'(Vencendo)':''}</span>
            </div>
            
            <div style="display:flex;justify-content:space-between;align-items:center;background:#f8fafc;padding:0.6rem;border-radius:8px;margin-top:0.2rem;border:1px solid #e2e8f0;">
                <div style="display:flex;align-items:center;gap:6px;">
                    <i class="ph ph-gas-pump" style="color:#64748b;font-size:1.1rem;"></i>
                    <span style="font-weight:700;color:#1e293b;">\${v.capacidade_tanque?v.capacidade_tanque+' L':'N/D'}</span>
                </div>
                <div style="width:1px;height:20px;background:#cbd5e1;"></div>
                <div style="display:flex;align-items:center;gap:6px;">
                    <i class="ph ph-package" style="color:#64748b;font-size:1.1rem;"></i>
                    <span style="font-weight:700;color:#1e293b;">\${v.capacidade_carga?v.capacidade_carga+' un':'N/D'}</span>
                </div>
            </div>
        </div>

        <div style="background:#f8fafc;padding:0.75rem 1rem;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;">
            <div style="font-weight:800;color:#cbd5e1;font-size:0.75rem;letter-spacing:1px;text-transform:uppercase;">
                \${v.tipo_veiculo||'VEÍCULO'}
            </div>
            <div style="display:flex;gap:4px;">
                \${v.crlv_filename ? \`<button onclick="window.visualizarCRLV(\${v.id})" style="background:#0891b2;color:#fff;border:none;border-radius:6px;width:32px;height:32px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:0.2s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'" title="Visualizar CRLV"><i class="ph ph-file-pdf"></i></button>\` : \`<button disabled style="background:#e2e8f0;color:#fff;border:none;border-radius:6px;width:32px;height:32px;display:flex;align-items:center;justify-content:center;cursor:not-allowed;" title="Sem CRLV"><i class="ph ph-file-pdf"></i></button>\`}
                <button onclick="window.abrirModalFrota(\${v.id})" style="background:#2563eb;color:#fff;border:none;border-radius:6px;width:32px;height:32px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:0.2s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'" title="Editar"><i class="ph ph-pencil"></i></button>
                <button onclick="window.excluirVeiculoFrota(\${v.id},'\${v.placa}')" style="background:#dc2626;color:#fff;border:none;border-radius:6px;width:32px;height:32px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:0.2s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'" title="Excluir"><i class="ph ph-trash"></i></button>
            </div>
        </div>
    </div>
    \`;
  }).join('');
}

window.visualizarCRLV = async function(id)`;

c = c.replace(regexRender, novoRender);
fs.writeFileSync('frontend/frota.js', c);
