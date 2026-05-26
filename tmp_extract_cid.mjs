import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';

async function main() {
  const filePath = 'C:/A/OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA/Documentos - America Rental/Diretoria/Teste Sistema/Exemplos/Tabela-de-doencas-e-cid.pdf';
  const data = new Uint8Array(readFileSync(filePath));
  
  const loadingTask = getDocument({ data });
  const pdf = await loadingTask.promise;
  
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map(item => item.str).join(' ');
    fullText += pageText + '\n';
  }
  
  writeFileSync('./tmp_cid_extraido.txt', fullText, 'utf8');
  console.log('OK - paginas:', pdf.numPages, 'chars:', fullText.length);
}

main().catch(e => console.error('ERRO:', e.message));
