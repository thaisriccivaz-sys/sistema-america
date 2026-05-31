const express = require('express');
const router = express.Router();
const axios = require('axios');

const RHID_BASE_URL = 'https://www.rhid.com.br/v2/api.svc';

// Credenciais padrão (fallback para variáveis de ambiente)
const DEFAULT_EMAIL = process.env.RHID_EMAIL || 'thais.ricci@americarental.com.br';
const DEFAULT_PASSWORD = process.env.RHID_PASSWORD || 'g@31DOMt';

// Cache do token em memória
let currentToken = null;
let tokenExpiresAt = null;

/**
 * Busca as credenciais salvas no banco de dados.
 * Se não houver, usa as credenciais padrão.
 */
function getCredentialsFromDB(db) {
    return new Promise((resolve) => {
        db.all(
            "SELECT chave, valor FROM configuracoes_sistema WHERE chave IN ('rhid_email', 'rhid_password')",
            [],
            (err, rows) => {
                if (err || !rows || rows.length === 0) {
                    return resolve({ email: DEFAULT_EMAIL, password: DEFAULT_PASSWORD });
                }
                const map = {};
                rows.forEach(r => { map[r.chave] = r.valor; });
                resolve({
                    email: map['rhid_email'] || DEFAULT_EMAIL,
                    password: map['rhid_password'] || DEFAULT_PASSWORD
                });
            }
        );
    });
}

/**
 * Autentica no RHID e retorna o Bearer token.
 * Faz cache em memória por 3h50m.
 */
async function getRHIDToken(db) {
    if (currentToken && tokenExpiresAt && Date.now() < tokenExpiresAt) {
        return currentToken;
    }

    const { email, password } = await getCredentialsFromDB(db);

    try {
        const response = await axios.post(`${RHID_BASE_URL}/login`, {
            email,
            password
        }, {
            headers: { 'Content-Type': 'application/json' }
        });

        if (response.data && response.data.accessToken) {
            currentToken = response.data.accessToken;
            tokenExpiresAt = Date.now() + (3 * 60 * 60 * 1000) + (50 * 60 * 1000);
            console.log('[ControlID] Novo token RHID gerado com sucesso.');
            return currentToken;
        } else {
            throw new Error('Falha ao obter accessToken na resposta.');
        }
    } catch (error) {
        console.error('[ControlID] Erro ao autenticar no RHID:', error.response?.data || error.message);
        throw new Error('Não foi possível autenticar na API do RHID. Verifique as credenciais.');
    }
}

// ROTA: Buscar credenciais salvas (retorna só o email, nunca a senha)
router.get('/credenciais', (req, res) => {
    const db = req.app.get('db');
    db.all(
        "SELECT chave, valor FROM configuracoes_sistema WHERE chave IN ('rhid_email', 'rhid_password')",
        [],
        (err, rows) => {
            const map = {};
            if (rows) rows.forEach(r => { map[r.chave] = r.valor; });
            res.json({
                email: map['rhid_email'] || DEFAULT_EMAIL,
                // Indica se há senha salva no banco, mas NÃO retorna ela
                tem_senha_salva: !!map['rhid_password']
            });
        }
    );
});

// ROTA: Salvar credenciais no banco
router.post('/credenciais', (req, res) => {
    const db = req.app.get('db');
    const { email, password } = req.body;

    if (!email) {
        return res.status(400).json({ success: false, message: 'Email é obrigatório.' });
    }

    const updates = [];
    updates.push(new Promise((resolve, reject) => {
        db.run(
            "INSERT OR REPLACE INTO configuracoes_sistema (chave, valor) VALUES ('rhid_email', ?)",
            [email.trim()],
            (err) => err ? reject(err) : resolve()
        );
    }));

    if (password && password.trim() !== '') {
        updates.push(new Promise((resolve, reject) => {
            db.run(
                "INSERT OR REPLACE INTO configuracoes_sistema (chave, valor) VALUES ('rhid_password', ?)",
                [password.trim()],
                (err) => err ? reject(err) : resolve()
            );
        }));
    }

    Promise.all(updates)
        .then(() => {
            // Invalida o cache para forçar nova autenticação com as novas credenciais
            currentToken = null;
            tokenExpiresAt = null;
            console.log('[ControlID] Credenciais atualizadas. Cache de token invalidado.');
            res.json({ success: true, message: 'Credenciais salvas com sucesso!' });
        })
        .catch(err => {
            console.error('[ControlID] Erro ao salvar credenciais:', err.message);
            res.status(500).json({ success: false, message: 'Erro ao salvar no banco de dados.' });
        });
});

// ROTA: Status do token
router.get('/status', async (req, res) => {
    const db = req.app.get('db');
    try {
        await getRHIDToken(db);
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

// ROTA: Forçar novo login (invalida cache e reautentica)
router.post('/login', async (req, res) => {
    const db = req.app.get('db');
    try {
        currentToken = null;
        tokenExpiresAt = null;
        await getRHIDToken(db);
        res.json({ success: true, message: 'Autenticado com sucesso na Control iD (RHID).' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ROTA: Sincronização futura
router.post('/sync-funcionarios', async (req, res) => {
    const db = req.app.get('db');
    try {
        await getRHIDToken(db);
        res.json({ success: true, message: 'Sincronização iniciada.', count: 0 });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
