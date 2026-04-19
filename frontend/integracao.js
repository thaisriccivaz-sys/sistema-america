window.downloadDatabase = async function() {
    const token = window.currentToken || localStorage.getItem('erp_token');
    if (!token) {
        alert('Sessão expirada. Faça login novamente.');
        return;
    }

    try {
        const btn = document.querySelector('[onclick="window.downloadDatabase()"]');
        if (btn) { btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Baixando...'; btn.disabled = true; }

        const res = await fetch(`${window.location.origin}/api/maintenance/download-db`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) {
            const err = await res.json();
            alert('Erro: ' + (err.error || 'Falha no download'));
            return;
        }

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'hr_system_v2.sqlite';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        if (btn) { btn.innerHTML = '<i class="ph ph-download-simple"></i> Baixar Banco de Dados'; btn.disabled = false; }
    } catch(e) {
        alert('Erro no download: ' + e.message);
    }
};

window.uploadDatabase = async function() {
    const fileInput = document.getElementById('db-upload-file');
    const file = fileInput.files[0];
    if (!file) {
        return alert('Selecione um arquivo .sqlite primeiro!');
    }
    
    if (!confirm('ATENÇÃO: Isso vai SOBRESCREVER TODO O BANCO DE DADOS ATUAL deste servidor e reiniciá-lo. Você tem certeza absoluta?')) return;
    
    const formData = new FormData();
    formData.append('database', file);
    
    const btn = document.getElementById('btn-upload-db');
    btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Enviando...';
    btn.disabled = true;
    
    try {
        const res = await fetch(`${window.location.origin}/api/maintenance/upload-db`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${window.currentToken || localStorage.getItem('erp_token')}`
            },
            body: formData
        });
        
        const data = await res.json();
        if (res.ok) {
            alert('Banco de dados substituído com sucesso! O servidor está reiniciando...');
            setTimeout(() => {
                window.location.reload();
            }, 3000);
        } else {
            alert('Erro: ' + (data.error || 'Erro desconhecido'));
        }
    } catch(e) {
        alert('Erro na requisição: ' + e.message);
    } finally {
        btn.innerHTML = '<i class="ph ph-upload-simple"></i> Enviar';
        btn.disabled = false;
    }
};
