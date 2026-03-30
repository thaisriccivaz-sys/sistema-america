
async function testOneDriveConnection() {
    try {
        const res = await fetch('/api/maintenance/onedrive-test');
        const data = await res.json();
        
        if (data.sucesso) {
            let sitesList = data.foundSites.map(s => `• ${s.name} (${s.drives?.length || 0} bibliotecas)`).join(', ') || 'Nenhum';
            let basePathList = data.basePathItems.join(', ') || '(Pasta vazia)';

            let msg = `✅ CONEXÃO OK!\n\n` +
                      `Drive Ativo: ${data.driveName}\n` +
                      `Drive ID: ${data.config.driveId || 'Padrão (Pessoal)'}\n\n` +
                      `CONTEÚDO DA PASTA SISTEMA:\n${basePathList}\n\n` +
                      `SITES DETECTADOS: ${sitesList}\n\n` +
                      `CAMINHO BASE: ${data.config.basePath}`;
            alert(msg);
        } else {
            let errorMsg = `❌ ${data.error}\n`;
            if (data.details) errorMsg += `Detalhes: ${data.details}`;
            alert(errorMsg);
        }
    } catch (e) {
        alert("Erro ao testar OneDrive: " + e.message);
    }
}
