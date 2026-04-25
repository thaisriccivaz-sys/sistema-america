const fs = require('fs');
let js = fs.readFileSync('backend/server.js', 'utf8');

const target = `                                        if (signPdfPfx.verificarDisponibilidade().disponivel) {
                                            finalBuf = await signPdfPfx.assinarPDF(finalBuf, { motivo: 'Assinado eletronicamente pela empresa', nome: 'America Rental Equipamentos Ltda' });
                                        }
                                    } catch(e) {}`;

const repl = `                                        if (signPdfPfx.verificarDisponibilidade().disponivel) {
                                            finalBuf = await signPdfPfx.assinarPDF(finalBuf, { motivo: 'Assinado eletronicamente pela empresa', nome: 'America Rental Equipamentos Ltda' });
                                        }
                                    } catch(e) {
                                        console.error('PFX PROXY ERR:', e.message);
                                        try { db.run('INSERT INTO system_logs (msg) VALUES (?)', ['PFX PROXY ERR: ' + e.message]); } catch(z){}
                                    }`;

js = js.replace(target, repl);
fs.writeFileSync('backend/server.js', js, 'utf8');
