const fs = require('fs');
const { PDFParse } = require('pdf-parse');

async function testPdf() {
    try {
        const filePath = "C:\\A\\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\\Documentos - America Rental\\Diretoria\\Teste Sistema\\Exemplos\\22BoletimOcorrencia.pdf";
        const buffer = fs.readFileSync(filePath);
        const parser = new PDFParse({ data: buffer });
        const data = await parser.getText();
        const text = data.text;
        
        console.log("=== DATES ===");
        const dateMatches = text.matchAll(/(\d{2}\/\d{2}\/\d{4}).*?(\d{2}:\d{2})/gi);
        for (const match of dateMatches) {
            console.log("Found date:", match[0]);
        }

        console.log("\n=== PLATES ===");
        const plateMatches = text.matchAll(/Placa[^\w]*([A-Z]{3}[-\s]*\d[A-Z0-9]\d{2,3})/gi);
        for (const match of plateMatches) {
            console.log("Found plate:", match[1]);
        }
        
        console.log("\n=== FULL TEXT EXTRACT (First 1500 chars) ===");
        console.log(text.substring(0, 1500));

    } catch (e) {
        console.error("Error:", e);
    }
}

testPdf();
