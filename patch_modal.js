const fs = require('fs');
let s = fs.readFileSync('frontend/frota_manutencao.js', 'utf8');

// Detect line ending
const crlf = s.includes('\r\n');
const NL = crlf ? '\r\n' : '\n';

// 1. Make modal fullscreen 2-col
const oldStyle = "ov.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.75);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:1rem;';";
const newStyle = "ov.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.75);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:1rem;';";
// style is same, focus on inner html

// 2. Replace ov.innerHTML block - find it
const startMark = "ov.innerHTML = `<div style=\"background:#fff;border-radius:16px;width:100%;max-width:600px;max-height:90vh;overflow-y:auto;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);\">"; 
const endMark = "    ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });";

const si = s.indexOf(startMark);
const ei = s.indexOf(endMark);
if (si === -1) { console.error('START NOT FOUND'); process.exit(1); }
if (ei === -1) { console.error('END NOT FOUND'); process.exit(1); }

console.log('Found at:', si, '->', ei + endMark.length);

const newHtml = `ov.innerHTML = \`<div style="background:#fff;border-radius:16px;width:100%;max-width:1100px;height:88vh;display:flex;flex-direction:column;box-shadow:0 25px 50px -12px rgba(0,0,0,0.35);overflow:hidden;">
<div style="padding:1rem 1.5rem;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;background:#fffbeb;flex-shrink:0;">
    <div style="font-size:1rem;font-weight:700;color:#92400e;display:flex;align-items:center;gap:8px;">
        <div style="background:#d97706;color:#fff;width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;"><i class="ph ph-wrench"></i></div>
        \${id ? 'Editar Manutenção' : (m.tipo==='preventiva' ? 'Nova Preventiva' : 'Nova Corretiva')}
    </div>
    <button onclick="document.getElementById('modal-manut-ov').remove()" style="background:none;border:none;font-size:1.4rem;cursor:pointer;color:#94a3b8;"><i class="ph ph-x"></i></button>
</div>
<div style="display:grid;grid-template-columns:1fr 1fr;flex:1;overflow:hidden;">
  <div style="padding:1.5rem;display:flex;flex-direction:column;gap:1rem;overflow-y:auto;border-right:1px solid #e2e8f0;">
    <datalist id="lista-fornecedores">\${fornListOpts}</datalist>
    <div>\${lbl('Veículo *')}<select id="mn-m-veiculo" onchange="window.mnModalVeiculoChanged()" style="width:100%;padding:0.6rem;border:1px solid #cbd5e1;border-radius:8px;background:#fff;box-sizing:border-box;font-size:0.9rem;outline:none;"><option value="">Selecione...</option>\${veicOpts}</select></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
        <div>\${lbl('Tipo *')}\${sel('mn-m-tipo', [{v:'preventiva',l:'Preventiva'},{v:'corretiva',l:'Corretiva'}], m.tipo, opts.tipo!==undefined)}</div>
        <div>\${lbl('Status *')}\${sel('mn-m-status', [{v:'programada',l:'Programada'},{v:'agendada',l:'Agendada'},{v:'em_andamento',l:'Em Andamento'},{v:'concluida',l:'Concluída'},{v:'cancelada',l:'Cancelada'}], m.status||'programada', false)}</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
        <div>\${lbl('Fornecedor / Oficina')}\${inp('mn-m-forn', m.fornecedor, 'Digite para buscar ou criar...', 'text', 'lista-fornecedores')}</div>
        <div>\${lbl('Data Agendamento')}\${inp('mn-m-data-ag', m.data_agendamento, '', 'date')}</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
        <div>\${lbl('KM Atual (Realizada em)')}\${inp('mn-m-km', m.km_na_manutencao, 'Ex: 120000', 'number')}</div>
        <div>\${lbl('KM de intervalo para a proxima')}\${inp('mn-m-intervalo', '', 'Ex: 10000', 'number')}</div>
    </div>
    <div style="flex:1;">\${lbl('Observações')}<textarea id="mn-m-obs" placeholder="Observações adicionais..." style="width:100%;padding:0.6rem;border:1px solid #cbd5e1;border-radius:8px;box-sizing:border-box;font-size:0.9rem;outline:none;min-height:100px;resize:vertical;">\${m.observacoes||''}</textarea></div>
    <div style="display:flex;gap:1rem;justify-content:flex-end;padding-top:0.75rem;border-top:1px solid #e2e8f0;">
        <button onclick="document.getElementById('modal-manut-ov').remove()" style="background:#f1f5f9;border:1px solid #cbd5e1;border-radius:8px;padding:0.6rem 1.2rem;font-weight:600;cursor:pointer;color:#475569;">Cancelar</button>
        <button onclick="window.salvarManutencao(\${id||'null'})" style="background:#d97706;color:#fff;border:none;border-radius:8px;padding:0.6rem 1.5rem;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;"><i class="ph ph-floppy-disk"></i> \${id ? 'Salvar Alterações' : 'Registrar'}</button>
    </div>
  </div>
  <div style="padding:1.5rem;display:flex;flex-direction:column;gap:1rem;overflow-y:auto;">
    <h4 style="margin:0;font-size:0.9rem;color:#1e293b;display:flex;align-items:center;gap:6px;"><i class="ph ph-list-plus" style="color:#0284c7;"></i> Serviços</h4>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:1rem;display:flex;flex-direction:column;gap:1rem;">
        <div>\${lbl('Categoria')}\${sel('mn-m-cat', catOpts, '', false, 'window.mnModalCatChanged()')}</div>
        <div id="mn-m-serv-container" style="display:none;flex-direction:column;gap:1rem;">
            <div>\${lbl('Selecione os Serviços')}<div id="mn-m-serv-checkboxes" style="background:#fff;border:1px solid #cbd5e1;border-radius:8px;padding:0.6rem;max-height:220px;overflow-y:auto;display:flex;flex-direction:column;gap:6px;"></div></div>
            <div id="mn-m-serv-novo-box" style="display:none;">\${lbl('Nome do Novo Serviço')}\${inp('mn-m-serv-novo', '', 'Ex: Troca de válvula específica...')}</div>
            <button id="mn-m-btn-add" onclick="window.mnModalAddServico()" style="background:#0284c7;color:#fff;border:none;border-radius:8px;padding:0.6rem;font-weight:600;cursor:pointer;font-size:0.85rem;">Adicionar Serviços Selecionados à Lista</button>
        </div>
    </div>
    <div id="mn-m-servicos-lista" style="display:flex;flex-direction:column;gap:6px;"></div>
  </div>
</div></div>\`;
    document.body.appendChild(ov);
    ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });`;

s = s.substring(0, si) + newHtml + s.substring(ei + endMark.length);
fs.writeFileSync('frontend/frota_manutencao.js', s);
console.log('DONE, new length:', s.length);
