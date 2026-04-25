const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('backend/data/hr_system_v2.sqlite');
const signPdfPfx = require('./backend/sign_pdf_pfx');

db.all("SELECT id, signed_file_path FROM documentos WHERE assinafy_status = 'Assinado' AND signed_file_path IS NOT NULL ORDER BY id DESC LIMIT 50", async (err, rows) => {
    if(err) return console.log(err);
    if(!signPdfPfx.verificarDisponibilidade().disponivel) return console.log("PFX indisponível localmente");
    
    // Como o ambiente PFX na Render é diferete, vou injetar uma rota pra forçar a re-assinatura de tudo que estiver sem assinatura.
});
