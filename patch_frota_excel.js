const fs = require('fs');

let c = fs.readFileSync('frontend/frota.js', 'utf8');

// Replace icons
c = c.replace(/<i class="ph ph-gas-pump" style="color:#64748b;font-size:1\.1rem;"><\/i>/g, '<img src="/assets/icon_tanque.png" style="width:18px;height:18px;opacity:0.8;">');
c = c.replace(/<i class="ph ph-package" style="color:#64748b;font-size:1\.1rem;"><\/i>/g, '<img src="/assets/icon_carga.png" style="width:18px;height:18px;opacity:0.8;">');

// Add Import button next to Baixar Excel
const btnExportStr = `<button onclick="window.exportarFrotaExcel()" style="background:#fff;color:#475569;border:1px solid #cbd5e1;border-radius:10px;padding:0.7rem 1.2rem;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:6px;box-shadow:0 2px 4px rgba(0,0,0,0.02);transition:0.2s;" onmouseover="this.style.background='#f1f5f9'"><i class="ph ph-download-simple"></i> Baixar Excel</button>`;
const btnsNovos = `${btnExportStr}
        <label style="background:#0284c7;color:#fff;border:none;border-radius:10px;padding:0.7rem 1.2rem;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:6px;box-shadow:0 4px 10px rgba(2,132,199,0.25);transition:0.2s;" onmouseover="this.style.background='#0369a1'">
            <i class="ph ph-upload-simple"></i> Importar Excel
            <input type="file" accept=".xlsx" style="display:none;" onchange="window.importarFrotaExcel(this)">
        </label>`;

c = c.replace(btnExportStr, btnsNovos);

// Add window.importarFrotaExcel function before window.exportarFrotaExcel
const funcImport = `
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
      
      alert(\`Importação concluída!\\n\\nAtualizados: \${atualizados}\\nNovos inseridos: \${inseridos}\\nErros: \${erros}\`);
      window.initFrotaVeiculos();
  } catch(e) {
      alert('Erro ao importar: ' + e.message);
      window.initFrotaVeiculos();
  }
  input.value = ''; // clear
};

`;

c = c.replace('window.exportarFrotaExcel =', funcImport + 'window.exportarFrotaExcel =');

fs.writeFileSync('frontend/frota.js', c);
