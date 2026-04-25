const db = require('../backend/database');
const fs = require('fs');
const path = require('path');

// Caminhos configuráveis conforme server.js
const LOCAL_ONEDRIVE_PATH = "C:\\A\\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\\Documentos - America Rental\\Diretoria\\Teste Sistema\\Colaboradores";
const BASE_PATH = process.env.STORAGE_PATH || (process.platform === 'win32' ? LOCAL_ONEDRIVE_PATH : path.join(__dirname, '..', 'backend', 'data', 'Colaboradores'));

console.log("--- INICIANDO LIMPEZA DE DADOS ---");
console.log("Caminho de Arquivos:", BASE_PATH);

db.serialize(() => {
    // 1. Deletar registros
    db.run("DELETE FROM colaboradores", (err) => {
        if (err) console.error("Erro ao deletar colaboradores:", err.message);
        else console.log("Tabela 'colaboradores' limpa.");
    });

    db.run("DELETE FROM documentos", (err) => {
        if (err) console.error("Erro ao deletar documentos:", err.message);
        else console.log("Tabela 'documentos' limpa.");
    });

    db.run("DELETE FROM dependentes", (err) => {
        if (err) console.error("Erro ao deletar dependentes:", err.message);
        else console.log("Tabela 'dependentes' limpa.");
    });

    db.run("DELETE FROM colaborador_chaves", (err) => {
        if (err) console.error("Erro ao deletar chaves:", err.message);
        else console.log("Tabela 'colaborador_chaves' limpa.");
    });

    // 2. Tentar deletar pastas (apenas se desejado)
    if (fs.existsSync(BASE_PATH)) {
        try {
            const files = fs.readdirSync(BASE_PATH);
            files.forEach(file => {
                const fullPath = path.join(BASE_PATH, file);
                if (fs.lstatSync(fullPath).isDirectory()) {
                    fs.rmSync(fullPath, { recursive: true, force: true });
                } else {
                    fs.unlinkSync(fullPath);
                }
            });
            console.log("Pastas de colaboradores apagadas do disco.");
        } catch (e) {
            console.warn("Aviso ao limpar pastas físicas:", e.message);
        }
    }

    console.log("--- LIMPEZA CONCLUÍDA ---");
    process.exit(0);
});
