const fs = require('fs');
const { PDFParse } = require('pdf-parse');

async function test() {
  const buffer = fs.readFileSync('out_test.pdf');
  const parser = new PDFParse({ verbosity: 0, data: buffer });
  const pdfData = await parser.getText();
  console.log("=== PDF TEXT ===");
  console.log(pdfData.text);
  console.log("================");
}

test().catch(console.error);
