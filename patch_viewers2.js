const fs = require('fs');
let js = fs.readFileSync('backend/server.js', 'utf8');

const t1 = `                                const dl = await fetch(signedUrl, { headers: { 'X-Api-Key': ASSINAFY_CONFIG.apiKey } });
                                if (dl.ok) {
                                    const arrayBuffer = await dl.arrayBuffer();
                                    res.setHeader('Content-Type', 'application/pdf');
                                    res.setHeader('Content-Disposition', \`attachment; filename="\${encodeURIComponent(row.file_name || 'documento.pdf')}"\`);
                                    return res.send(Buffer.from(arrayBuffer));
                                }`;
const r1 = `                                const dl = await fetch(signedUrl, { headers: { 'X-Api-Key': ASSINAFY_CONFIG.apiKey } });
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

const t2 = `                                const dl = await fetch(signedUrl, { headers: { 'X-Api-Key': ASSINAFY_CONFIG.apiKey } });
                                if (dl.ok) {
                                    const arrayBuffer = await dl.arrayBuffer();
                                    res.setHeader('Content-Type', 'application/pdf');
                                    return res.send(Buffer.from(arrayBuffer));
                                }`;
const r2 = `                                const dl = await fetch(signedUrl, { headers: { 'X-Api-Key': ASSINAFY_CONFIG.apiKey } });
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

js = js.split(t1).join(r1);
js = js.split(t2).join(r2);

const tLog = `console.warn('[POLL-ADMISSAO] OneDrive sync falhou:', odErr.message);`;
const rLog = `console.warn('[POLL-ADMISSAO] OneDrive sync falhou:', odErr.message);
                        try {
                            db.run("CREATE TABLE IF NOT EXISTS system_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, msg TEXT, ts DATETIME DEFAULT CURRENT_TIMESTAMP)", () => {
                                db.run("INSERT INTO system_logs (msg) VALUES (?)", ['OneDrive Sync Error: ' + odErr.message + ' | Path: ' + targetDir]);
                            });
                        } catch(e) {}`;

js = js.split(tLog).join(rLog);

fs.writeFileSync('backend/server.js', js, 'utf8');
