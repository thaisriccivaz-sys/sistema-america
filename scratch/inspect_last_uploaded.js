const fs = require('fs');
const { PDFParse } = require('pdf-parse');

async function test() {
  const filePath = 'backend/last_uploaded_fatura.pdf';
  if (!fs.existsSync(filePath)) {
    console.error(`Error: File ${filePath} not found yet. Please upload it first via the UI!`);
    return;
  }
  
  const buffer = fs.readFileSync(filePath);
  const parser = new PDFParse({ verbosity: 0, data: buffer });
  const pdfData = await parser.getText();
  const text = pdfData.text || '';
  
  console.log("=== RAW PDF TEXT ===");
  console.log(text);
  console.log("====================\n");

  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  console.log(`Parsed lines count: ${lines.length}`);

  const regexWithB = /(?:r\$\s*)?([\d.]+[.,]\d{2})\b/i;
  const regexWithoutB = /(?:r\$\s*)?([\d.]+[.,]\d{2})/i;

  console.log("\n--- LINE-BY-LINE ANALYSIS ---");
  lines.forEach((line, idx) => {
    const matchWithB = line.match(regexWithB);
    const matchWithoutB = line.match(regexWithoutB);

    console.log(`\nLine ${idx + 1}: "${line}"`);
    if (matchWithB) {
      console.log(`  [Regex WITH \\b]: MATCHED "${matchWithB[0]}" group1="${matchWithB[1]}"`);
    } else {
      console.log(`  [Regex WITH \\b]: NO MATCH`);
    }

    if (matchWithoutB) {
      console.log(`  [Regex WITHOUT \\b]: MATCHED "${matchWithoutB[0]}" group1="${matchWithoutB[1]}"`);
    } else {
      console.log(`  [Regex WITHOUT \\b]: NO MATCH`);
    }
  });
}

test().catch(console.error);
