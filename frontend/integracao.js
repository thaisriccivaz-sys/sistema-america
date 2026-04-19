window.downloadDatabase = function() {
    const token = localStorage.getItem('token');
    window.window.location.href = `${window.location.origin}/api/maintenance/download-db?token=${token}`;
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
                'Authorization': `Bearer ${localStorage.getItem('token')}`
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
