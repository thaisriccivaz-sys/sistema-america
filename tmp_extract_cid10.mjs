import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { readFileSync, writeFileSync } from 'fs';

async function main() {
  const filePath = 'C:/A/OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA/Documentos - America Rental/Diretoria/Teste Sistema/Exemplos/CID-10.pdf';
  const data = new Uint8Array(readFileSync(filePath));
  
  const loadingTask = getDocument({ data });
  const pdf = await loadingTask.promise;
  
  console.log('Total de páginas:', pdf.numPages);
  
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map(item => item.str).join(' ');
    fullText += pageText + '\n';
    if (i % 50 === 0) console.log(`Página ${i}/${pdf.numPages}...`);
  }
  
  writeFileSync('./tmp_cid10_completo.txt', fullText, 'utf8');
  console.log('OK - chars:', fullText.length);
}

main().catch(e => console.error('ERRO:', e.message));
