const fs = require('fs');
const txt = fs.readFileSync('backend/server.js', 'utf8');
const xlsx = require('xlsx');

const wb = xlsx.readFile('C:/A/OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA/Documentos - America Rental/Diretoria/Teste Sistema/Exemplos/Frota_Veiculos_2026-05-03 (1).xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = xlsx.utils.sheet_to_json(ws);
const payload = JSON.stringify(rows);

const inject = `
app.get('/api/dev/import-frota-once', (req, res) => {
  const data = ${payload};
  const clean = val => val === undefined || val === null || val === 'undefined' ? '' : val.toString();
  let count = 0;
  
  // Use a serializado para evitar travamentos
  db.serialize(() => {
    data.forEach(row => {
      const p = row['Placa'];
      if (!p) return;
      
      const updateData = [
          clean(row['Marca / Modelo / Versão']),
          clean(row['Cor Predominante']),
          clean(row['Ano Modelo']),
          clean(row['Exercício']),
          clean(row['RENAVAM']),
          clean(row['Capacidade Tanque (L)']),
          clean(row['Capacidade Carga (KG)']),
          clean(row['Tipo de Veículo']),
          clean(row['Altura c/ Banheiro']),
          clean(row['Altura s/ Banheiro']),
          clean(row['Largura c/ Banheiro']),
          clean(row['Largura s/ Banheiro']),
          clean(row['Profundidade c/ Banheiro']),
          clean(row['Profundidade s/ Banheiro']),
          p
      ];
      
      db.get('SELECT id FROM frota_veiculos WHERE placa = ?', [p], (err, ex) => {
          if (ex) {
              db.run('UPDATE frota_veiculos SET marca_modelo_versao=?, cor_predominante=?, ano_modelo=?, exercicio=?, renavam=?, capacidade_tanque=?, capacidade_carga=?, tipo_veiculo=?, altura_com_banheiro=?, altura_sem_banheiro=?, largura_com_banheiro=?, largura_sem_banheiro=?, profundidade_com_banheiro=?, profundidade_sem_banheiro=? WHERE placa=?', updateData);
          } else {
              db.run('INSERT INTO frota_veiculos (placa, marca_modelo_versao, cor_predominante, ano_modelo, exercicio, renavam, capacidade_tanque, capacidade_carga, tipo_veiculo, altura_com_banheiro, altura_sem_banheiro, largura_com_banheiro, largura_sem_banheiro, profundidade_com_banheiro, profundidade_sem_banheiro) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [p, ...updateData.slice(0, 14)]);
          }
      });
      count++;
    });
  });
  res.send('Imported ' + data.length + ' rows. Check DB.');
});
`;

fs.writeFileSync('backend/server.js', txt.replace(`app.get('/api/frota/veiculos', authenticateToken, (req, res) => {`, inject + `\napp.get('/api/frota/veiculos', authenticateToken, (req, res) => {`));

console.log("Injected endpoint /api/dev/import-frota-once into server.js");
