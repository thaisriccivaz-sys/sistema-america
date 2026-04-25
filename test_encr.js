const PDFDocument = require('pdf-lib').PDFDocument;
const fs = require('fs');
async function run() {
    let buf = fs.readFileSync('backend/temp_test.pdf');
    try {
        const doc = await PDFDocument.load(buf, {ignoreEncryption: true});
        const out = await doc.save({useObjectStreams: false});
        fs.writeFileSync('out_test.pdf', out);
        console.log("PDF-lib saved!");
    } catch(e) { console.error("ERR", e.message); }
}
run();
