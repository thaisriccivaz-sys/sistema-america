const fs = require('fs');
let js = fs.readFileSync('backend/server.js', 'utf8');

// Patch viewer 1: /api/documentos/view/:id
js = js.replace(
    /const dl = await fetch\(signedUrl.*?\n.*?if \(dl\.ok\) {\n.*?const arrayBuffer = await dl\.arrayBuffer\(\);\n.*?res\.setHeader\('Content-Type', 'application\/pdf'\);\n.*?return res\.send\(Buffer\.from\(arrayBuffer\)\);\n.*?}/s,
    `const dl = await fetch(signedUrl, { headers: { 'X-Api-Key': ASSINAFY_CONFIG.apiKey } });
                                if (dl.ok) {
                                    const arrayBuffer = await dl.arrayBuffer();
                                    let finalBuf = Buffer.from(arrayBuffer);
                                    const signPdfPfx = require('./sign_pdf_pfx');
                                    if (signPdfPfx.verificarDisponibilidade().disponivel) {
                                        try { finalBuf = await signPdfPfx.assinarPDF(finalBuf, { motivo: 'Assinado eletronicamente pela empresa', nome: 'America Rental Equipamentos Ltda' }); } catch(e) {}
                                    }
                                    res.setHeader('Content-Type', 'application/pdf');
                                    return res.send(finalBuf);
                                }`
);

// Patch viewer 2: /api/admissao/assinaturas/view/:id
js = js.replace(
    /const dl = await fetch\(signedUrl.*?\n.*?if \(dl\.ok\) {\n.*?const arrayBuffer = await dl\.arrayBuffer\(\);\n.*?res\.setHeader\('Content-Type', 'application\/pdf'\);\n.*?return res\.send\(Buffer\.from\(arrayBuffer\)\);\n.*?}/s,
    `const dl = await fetch(signedUrl, { headers: { 'X-Api-Key': ASSINAFY_CONFIG.apiKey } });
                                if (dl.ok) {
                                    const arrayBuffer = await dl.arrayBuffer();
                                    let finalBuf = Buffer.from(arrayBuffer);
                                    const signPdfPfx = require('./sign_pdf_pfx');
                                    if (signPdfPfx.verificarDisponibilidade().disponivel) {
                                        try { finalBuf = await signPdfPfx.assinarPDF(finalBuf, { motivo: 'Assinado eletronicamente pela empresa', nome: 'America Rental Equipamentos Ltda' }); } catch(e) {}
                                    }
                                    res.setHeader('Content-Type', 'application/pdf');
                                    return res.send(finalBuf);
                                }`
);

fs.writeFileSync('backend/server.js', js, 'utf8');
