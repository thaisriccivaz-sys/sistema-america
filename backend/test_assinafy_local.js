const db = require('./database');
const { enviarDocumentoParaAssinafy } = require('./novo_processo_assinafy');

setTimeout(() => {
    db.all("SELECT id, colaborador_id, file_name FROM documentos WHERE document_type != 'Foto' ORDER BY ROWID DESC LIMIT 1", async (err, rows) => {
        if (err) throw err;
        if (rows.length === 0) return console.log('No documents found');
        
        // Pegar o último documento (geralmente o que deu erro de timeout)
        const docId = rows[0].id;
        const colabId = rows[0].colaborador_id;
        const fileName = rows[0].file_name;
        
        console.log(`\n===========================================`);
        console.log(`TESTANDO DOCUMENTO OFICIAL NO MODO SCRIPT`);
        console.log(`ID Doc: ${docId} | FileName: ${fileName}`);
        console.log(`Colab : ${colabId}`);
        console.log(`===========================================\n`);
        
        try {
            const result = await enviarDocumentoParaAssinafy(docId, colabId);
            console.log('\n✅ RESULTADO FINAL DE SUCESSO:');
            console.log(result);
            process.exit(0);
        } catch (e) {
            console.error('\n❌ ERRO DETECTADO NO PROCESSO ASSINAFY:');
            console.error(e);
            process.exit(1);
        }
    });
}, 1000);
