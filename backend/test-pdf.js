const fs = require('fs');
const { PDFParse } = require('pdf-parse');

async function testPdf() {
    try {
        const filePath = "C:\\A\\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\\Documentos - America Rental\\Diretoria\\Teste Sistema\\Exemplos\\22BoletimOcorrencia.pdf";
        const buffer = fs.readFileSync(filePath);
        const parser = new PDFParse({ data: buffer });
        const data = await parser.getText();
        console.log("PDF text extracted:");
        console.log(data.text.substring(0, 500));
        
        const cleanText = data.text.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ');
        console.log("Clean text:");
        console.log(cleanText.substring(0, 500));
        
        let boletim = '';
        const matBO = cleanText.match(/([A-Z]{2}\s*\d+[-]\d+\/\d{4})/i) || cleanText.match(/Boletim[^\d]*(\d+[-]\d+\/\d{4})/i);
        if (matBO) boletim = matBO[1].replace(/\s/g, '').toUpperCase();
        
        let dataHoraStr = '';
        const matOc = cleanText.match(/Ocorr[eê]ncia[:\s]+(\d{2}\/\d{2}\/\d{4})\s+[aà]s?\s+(\d{2}:\d{2})/i) || cleanText.match(/Data.*?Ocorr.*?:?\s*(\d{2}\/\d{2}\/\d{4}).*?(\d{2}:\d{2})/i) || cleanText.match(/(\d{2}\/\d{2}\/\d{4})\s*.*?(\d{2}:\d{2})/i);
        if (matOc) dataHoraStr = matOc[1] + ' às ' + matOc[2];
        
        let natureza = '';
        const matN = cleanText.match(/Naturezas? da Ocorr[eê]ncia\s*(.*?)(?:Dados da|Crime|\d+\s*-)/i);
        if (matN && matN[1].trim().length > 3) {
            natureza = matN[1].trim();
        } else {
            const matN2 = cleanText.match(/(Crime Consumado.*?)(?:Dados da Ocorr[eê]ncia)/i);
            if (matN2) natureza = matN2[1].trim();
        }
        
        let marcaModelo = '';
        const matMM = cleanText.match(/Marca\/Modelo[^\w]*([A-Z0-9\/\-\s]{3,30}?)(?:Ano\s|Cor\s|Chassi|Placa)/i);
        if (matMM) marcaModelo = matMM[1].trim();
        
        let placa = '';
        const matPl = cleanText.match(/Placa[^\w]*([A-Z]{3}[-\s]*\d[A-Z0-9]\d{2,3})/i) || cleanText.match(/Placa[^\w]*([A-Z]{3}[-\s]*\d{4,5})/i) || cleanText.match(/(?:^|\s)([A-Z]{3}[-\s]*[0-9][A-Z0-9]{3,4})(?:[-\s]|$)/i);
        if (matPl) {
            placa = matPl[1].replace(/[-\s]/g, '').toUpperCase();
            if (placa.length > 7) placa = placa.substring(0, 7);
        }
        
        console.log('\n--- EXTRACTED ---');
        console.log('boletim:', boletim);
        console.log('dataHoraStr:', dataHoraStr);
        console.log('natureza:', natureza);
        console.log('marcaModelo:', marcaModelo);
        console.log('placa:', placa);
    } catch (e) {
        console.error("Error:", e);
    }
}

testPdf();
