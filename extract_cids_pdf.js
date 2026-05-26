const { PDFParse } = require('pdf-parse');
const fs = require('fs');

async function main() {
  const buf = fs.readFileSync('C:/A/OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA/Documentos - America Rental/Diretoria/Teste Sistema/Exemplos/Tabela-de-doencas-e-cid.pdf');
  
  const parser = new PDFParse();
  const data = await parser.parse(buf);
  
  const text = data.text;
  console.log('=== TEXTO EXTRAÍDO DO PDF ===');
  console.log(text.substring(0, 10000));
}

main().catch(console.error);
