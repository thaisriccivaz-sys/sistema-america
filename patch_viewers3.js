const fs = require('fs');
let js = fs.readFileSync('backend/server.js', 'utf8');

const target1 = `                                const dl = await fetch(signedUrl, { headers: { 'X-Api-Key': ASSINAFY_CONFIG.apiKey } });
                                if (dl.ok) {
                                    const arrayBuffer = await dl.arrayBuffer();
                                    res.setHeader('Content-Type', 'application/pdf');
                                    res.setHeader('Content-Disposition', \`attachment; filename="\${encodeURIComponent(row.file_name || 'documento.pdf')}"\`);
                                    return res.send(Buffer.from(arrayBuffer));
                                }`;
const repl1 = `                                const dl = await fetch(signedUrl, { headers: { 'X-Api-Key': ASSINAFY_CONFIG.apiKey } });
                                if (dl.ok) {
                                    const arrayBuffer = await dl.arrayBuffer();
                                    let finalBuf = Buffer.from(arrayBuffer);
                                    try {
                                        const signPdfPfx = require('./sign_pdf_pfx');
                                        if (signPdfPfx.verificarDisponibilidade().disponivel) {
                                            finalBuf = await signPdfPfx.assinarPDF(finalBuf, { motivo: 'Assinado eletronicamente pela empresa', nome: 'America Rental Equipamentos Ltda' });
                                        }
                                    } catch(e) {}
                                    res.setHeader('Content-Type', 'application/pdf');
                                    // Comentado para permitir visualização: res.setHeader('Content-Disposition', \`attachment; filename="\${encodeURIComponent(row.file_name || 'documento.pdf')}"\`);
                                    return res.send(finalBuf);
                                }`;

const target2 = `                                const dl = await fetch(signedUrl, { headers: { 'X-Api-Key': ASSINAFY_CONFIG.apiKey } });
                                if (dl.ok) {
                                    const arrayBuffer = await dl.arrayBuffer();
                                    res.setHeader('Content-Type', 'application/pdf');
                                    return res.send(Buffer.from(arrayBuffer));
                                }`;
const repl2 = `                                const dl = await fetch(signedUrl, { headers: { 'X-Api-Key': ASSINAFY_CONFIG.apiKey } });
                                if (dl.ok) {
                                    const arrayBuffer = await dl.arrayBuffer();
                                    let finalBuf = Buffer.from(arrayBuffer);
                                    try {
                                        const signPdfPfx = require('./sign_pdf_pfx');
                                        if (signPdfPfx.verificarDisponibilidade().disponivel) {
                                            finalBuf = await signPdfPfx.assinarPDF(finalBuf, { motivo: 'Assinado eletronicamente pela empresa', nome: 'America Rental Equipamentos Ltda' });
                                        }
                                    } catch(e) {}
                                    res.setHeader('Content-Type', 'application/pdf');
                                    return res.send(finalBuf);
                                }`;


js = js.replace(target1, repl1);
js = js.replace(target2, repl2);

fs.writeFileSync('backend/server.js', js, 'utf8');
