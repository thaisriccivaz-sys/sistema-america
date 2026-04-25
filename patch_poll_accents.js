const fs = require('fs');
let js = fs.readFileSync('backend/server.js', 'utf8');

const t = `                            certSignedBuffer = await signPdfPfx.assinarPDF(pdfBuffer, {
                                motivo: \`Assinado eletronicamente pela empresa - ${doc.nome_documento || 'Documento'}\`,
                                nome: 'America Rental Equipamentos Ltda'
                            });`;
const r = `                            certSignedBuffer = await signPdfPfx.assinarPDF(pdfBuffer, {
                                motivo: 'Assinado eletronicamente pela empresa',
                                nome: 'America Rental Equipamentos Ltda'
                            });`;

js = js.replace(t, r);
fs.writeFileSync('backend/server.js', js, 'utf8');
