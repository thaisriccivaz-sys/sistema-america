const express = require('express');
const router = express.Router();
const axios = require('axios');

// Variáveis de ambiente ou credenciais
const RHID_EMAIL = process.env.RHID_EMAIL || 'thais.ricci@americarental.com.br';
const RHID_PASSWORD = process.env.RHID_PASSWORD || 'g@31DOMt';
const RHID_BASE_URL = 'https://www.rhid.com.br/v2/api.svc';

// Estado local para cachear o token em memória (dura 4h na API, vamos renovar caso precise)
let currentToken = null;
let tokenExpiresAt = null; // Armazena timestamp

/**
 * Autentica no RHID e retorna o Bearer token
 * Faz cache em memória por 3 horas e 50 minutos.
 */
async function getRHIDToken() {
    // Se o token existe e ainda não expirou, retorna o cacheado
    if (currentToken && tokenExpiresAt && Date.now() < tokenExpiresAt) {
        return currentToken;
    }

    try {
        const response = await axios.post(`${RHID_BASE_URL}/login`, {
            email: RHID_EMAIL,
            password: RHID_PASSWORD
        }, {
            headers: { 'Content-Type': 'application/json' }
        });

        if (response.data && response.data.accessToken) {
            currentToken = response.data.accessToken;
            // Define validade de 3 horas e 50 minutos (API dura 4h)
            tokenExpiresAt = Date.now() + (3 * 60 * 60 * 1000) + (50 * 60 * 1000);
            console.log('[ControlID] Novo token RHID gerado com sucesso.');
            return currentToken;
        } else {
            throw new Error('Falha ao obter accessToken na resposta.');
        }
    } catch (error) {
        console.error('[ControlID] Erro ao autenticar no RHID:', error.response?.data || error.message);
        throw new Error('Não foi possível autenticar na API do RHID.');
    }
}

// ROTA: Teste de Conexão e Status do Token
router.get('/status', async (req, res) => {
    try {
        const token = await getRHIDToken();
        res.json({
            status: 'Conectado',
            token_valido: true,
            expires_in_minutes: Math.round((tokenExpiresAt - Date.now()) / 60000)
        });
    } catch (error) {
        res.status(500).json({
            status: 'Desconectado',
            token_valido: false,
            error: error.message
        });
    }
});

// ROTA: Forçar Login / Reautenticação Manual
router.post('/login', async (req, res) => {
    try {
        // Limpa cache para forçar novo request
        currentToken = null;
        tokenExpiresAt = null;
        
        await getRHIDToken();
        res.json({ success: true, message: 'Autenticado com sucesso na Control iD (RHID).' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Exemplo base para sincronização futura
router.post('/sync-funcionarios', async (req, res) => {
    try {
        const token = await getRHIDToken();
        // Aqui entrará a lógica de buscar funcionários no BD e enviar para o endpoint do RHID (ex: /employee)
        res.json({ success: true, message: 'Sincronização iniciada.', count: 0 });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
