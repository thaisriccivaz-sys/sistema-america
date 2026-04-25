const fs = require('fs');
let js = fs.readFileSync('backend/server.js', 'utf8');

const viewSearchStr = `app.get('/api/documentos/view/:id', authenticateToken, (req, res) => {`;
const viewIdx = js.indexOf(viewSearchStr);

if (viewIdx > -1) {
    const endViewIdx = js.indexOf('// ============================================', viewIdx);
    if (endViewIdx > -1) {
        let viewBlock = js.substring(viewIdx, endViewIdx);
        // We want to replace the `dl.ok` part inside `row.assinafy_id` fallback
        const target = `                                if (dl.ok) {\n                                    const arrayBuffer = await dl.arrayBuffer();\n                                    res.setHeader('Content-Type', 'application/pdf');\n                                    return res.send(Buffer.from(arrayBuffer));\n                                }`;
        const repl = `                                if (dl.ok) {\n                                    const arrayBuffer = await dl.arrayBuffer();\n                                    let finalBuf = Buffer.from(arrayBuffer);\n                                    try {\n                                        const signPdfPfx = require('./sign_pdf_pfx');\n                                        if (signPdfPfx.verificarDisponibilidade().disponivel) {\n                                            finalBuf = await signPdfPfx.assinarPDF(finalBuf, { motivo: 'Assinado eletronicamente pela empresa', nome: 'America Rental Equipamentos Ltda' });\n                                        }\n                                    } catch(e) {}\n                                    res.setHeader('Content-Type', 'application/pdf');\n                                    return res.send(finalBuf);\n                                }`;
        viewBlock = viewBlock.split(target).join(repl);
        js = js.substring(0, viewIdx) + viewBlock + js.substring(endViewIdx);
        
        fs.writeFileSync('backend/server.js', js, 'utf8');
        console.log("Patched view route successfully.");
    }
}
