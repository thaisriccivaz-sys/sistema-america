import sys

with open('backend/server.js', 'r', encoding='utf-8') as f:
    content = f.read()

endpoint = """
// ---------------------------------------------------------------------------------------------------------------------------------------------------------
// Rota Auxiliar (Assinaturas Digitais) - EXCLUIR Assinatura do Assinafy
// ---------------------------------------------------------------------------------------------------------------------------------------------------------
app.delete('/api/assinaturas/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { source } = req.query; // 'admissao' ou 'documento'
    
    if (!id || !source) {
        return res.status(400).json({ error: 'Parâmetros incompletos.' });
    }

    try {
        if (source === 'admissao') {
            await pool.query(
                `UPDATE admissao_assinaturas 
                 SET assinafy_id = NULL, assinafy_status = NULL, assinafy_url = NULL, assinafy_sent_at = NULL, assinafy_signed_at = NULL 
                 WHERE id = ?`,
                [id]
            );
        } else {
            await pool.query(
                `UPDATE documentos 
                 SET assinafy_id = NULL, assinafy_status = 'PENDENTE', assinafy_url = NULL, assinafy_sent_at = NULL, assinafy_signed_at = NULL 
                 WHERE id = ?`,
                [id]
            );
        }
        res.json({ sucesso: true, message: 'Pedido de assinatura excluído permanentemente.' });
    } catch (err) {
        console.error('Erro ao excluir assinatura:', err);
        res.status(500).json({ error: 'Falha interna ao excluir pedido de assinatura.' });
    }
});
"""

if "app.delete('/api/assinaturas/:id'" not in content:
    content = content.replace(
        "app.post('/api/assinaturas/reenviar', authenticateToken, async (req, res) => {",
        endpoint + "\napp.post('/api/assinaturas/reenviar', authenticateToken, async (req, res) => {"
    )
    with open('backend/server.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Backend update complete")
else:
    print("Endpoint already exists")
