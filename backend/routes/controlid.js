const express = require('express');
const router = express.Router();
const axios = require('axios');

const RHID_BASE_URL = 'https://www.rhid.com.br/v2/api.svc';

// Headers padrão para chamadas RHID
const RHID_GET_HEADERS  = { 'Accept': 'application/json' };                                    // GET não deve ter Content-Type
const RHID_POST_HEADERS = { 'Accept': 'application/json', 'Content-Type': 'application/json' }; // POST/PUT precisam de Content-Type

// Sanitiza erros do RHID (remove HTML/CSS de páginas de erro)
function rhidSanitize(d) {
    if (!d) return null;
    if (typeof d === 'string') {
        return d
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 300);
    }
    if (typeof d === 'object') {
        return (d.message || d.detail || d.title || d.error || JSON.stringify(d)).toString().substring(0, 300);
    }
    return String(d).substring(0, 300);
}

// Credenciais padrão (fallback para variáveis de ambiente)
const DEFAULT_EMAIL    = process.env.RHID_EMAIL     || 'thais.ricci@americarental.com.br';
const DEFAULT_PASSWORD = process.env.RHID_PASSWORD  || 'g@31DOMt';

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
            headers: RHID_POST_HEADERS
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

// ─── ROTA: Diagnóstico da API RHID ────────────────────────────────────────────
// GET /diretoria/controlid/diagnostico
// Testa vários endpoints do RHID e retorna as respostas brutas para debug.
// Acesse em: /api/diretoria/controlid/diagnostico
router.get('/diagnostico', async (req, res) => {
    const db = req.app.get('db');
    const resultados = [];

    let authHeader;
    try {
        const token = await getRHIDToken(db);
        authHeader = `Bearer ${token}`;
        resultados.push({ endpoint: 'LOGIN', status: 'OK', info: 'Token obtido com sucesso' });
    } catch (e) {
        return res.json({ erro: 'Falha no login: ' + e.message, resultados });
    }

    // Lista de tentativas a explorar
    const tentativas = [
        { label: 'GET /person (sem params)',     method: 'get', url: `${RHID_BASE_URL}/person`,          params: {} },
        { label: 'GET /person?start=0&length=5', method: 'get', url: `${RHID_BASE_URL}/person`,          params: { start: 0, length: 5 } },
        { label: 'GET /person?cpf=',             method: 'get', url: `${RHID_BASE_URL}/person`,          params: { cpf: '00000000000' } },
        { label: 'GET /persons',                 method: 'get', url: `${RHID_BASE_URL}/persons`,         params: {} },
        { label: 'GET /employee',                method: 'get', url: `${RHID_BASE_URL}/employee`,        params: {} },
        { label: 'GET /employees',               method: 'get', url: `${RHID_BASE_URL}/employees`,       params: {} },
        { label: 'GET /timecard',                method: 'get', url: `${RHID_BASE_URL}/timecard`,        params: {} },
        { label: 'GET /apuracao_ponto (sem id)', method: 'get', url: `${RHID_BASE_URL}/apuracao_ponto`,  params: {} },
    ];

    for (const t of tentativas) {
        try {
            const r = await axios.get(t.url, {
                headers: { ...RHID_GET_HEADERS, Authorization: authHeader },
                params: t.params,
                validateStatus: () => true // não lança erro em 4xx/5xx
            });
            const bodyPreview = typeof r.data === 'string'
                ? rhidSanitize(r.data).substring(0, 200)
                : JSON.stringify(r.data).substring(0, 300);
            resultados.push({
                endpoint: t.label,
                status: r.status,
                contentType: r.headers['content-type'] || '?',
                body: bodyPreview
            });
        } catch (e) {
            resultados.push({ endpoint: t.label, status: 'EXCEPTION', body: e.message });
        }
    }

    return res.json({ resultados });
});


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

// ─── HELPER: remove pontuação do CPF ─────────────────────────────────────────
function normalizarCPF(cpf) {
    if (!cpf) return '';
    return String(cpf).replace(/\D/g, '').replace(/^0+/, '');
}

// ─── ROTA: Buscar ponto de um colaborador pelo CPF e mês/ano ─────────────────
// GET /diretoria/controlid/ponto-colaborador?cpf=12345678901&mes=6&ano=2025
router.get('/ponto-colaborador', async (req, res) => {
    const db = req.app.get('db');
    const { cpf, mes, ano } = req.query;

    if (!cpf || !mes || !ano) {
        return res.status(400).json({ success: false, message: 'Parâmetros obrigatórios: cpf, mes, ano.' });
    }

    const cpfLimpo = normalizarCPF(cpf);
    if (!cpfLimpo || cpfLimpo.length < 8) {
        return res.status(400).json({ success: false, message: 'CPF inválido.' });
    }

    try {
        const token = await getRHIDToken(db);
        const authHeader = `Bearer ${token}`;

        // ── PASSO 1: Encontrar o idPerson pelo CPF ─────────────────────────────────
        let idPerson = null;
        let nomeRHID = null;

        const getHeaders = { ...RHID_GET_HEADERS, Authorization: authHeader };

        // Busca paginada pelo CPF
        // NOTA: /person sem parâmetros retorna 500; /person?cpf=x também retorna 500.
        // Só funciona com start + length (máx ~50 por página).
        // O CPF no RHID é armazenado como NÚMERO, então pode perder zeros à esquerda.
        {
            let start = 0;
            const pageSize = 50; // valor seguro conforme testado no /diagnostico
            let encontrado = false;
            const maxPaginas = 100; // limite de segurança (5000 pessoas)
            let pagina = 0;

            while (!encontrado && pagina < maxPaginas) {
                pagina++;
                let pessoasRes;
                try {
                    pessoasRes = await axios.get(`${RHID_BASE_URL}/person`, {
                        headers: getHeaders,
                        params: { start, length: pageSize }
                    });
                } catch (personErr) {
                    const msg = rhidSanitize(personErr.response?.data) || personErr.message;
                    throw new Error(`Falha ao buscar pessoas no RHID (pág ${pagina}): ${msg}`);
                }

                const registros = pessoasRes.data?.records || (Array.isArray(pessoasRes.data) ? pessoasRes.data : []);
                if (!Array.isArray(registros) || registros.length === 0) break;

                const pessoa = registros.find(p => {
                    // RHID armazena CPF como número — pode perder zero à esquerda.
                    // Normalizamos ambos: string só com dígitos, sem padding.
                    const cpfRHID = String(p.cpf || '').replace(/\D/g, '').replace(/^0+/, '') || '0';
                    const cpfBusca = cpfLimpo.replace(/^0+/, '') || '0';
                    return cpfRHID === cpfBusca;
                });

                if (pessoa) {
                    idPerson = pessoa.id;
                    nomeRHID = pessoa.name;
                    encontrado = true;
                } else if (registros.length < pageSize) {
                    break; // última página
                } else {
                    start += pageSize;
                }
            }
        }

        if (!idPerson) {
            return res.json({
                success: false,
                encontrado: false,
                message: `Colaborador com CPF ${cpf} não encontrado no RHID. Verifique se o CPF está cadastrado no sistema de ponto.`
            });
        }

        // ── PASSO 2: Calcular o período do mês ───────────────────────────────
        const mesNum = parseInt(mes, 10);
        const anoNum = parseInt(ano, 10);
        const dataIni = `${anoNum}-${String(mesNum).padStart(2, '0')}-01`;
        const ultimoDia = new Date(anoNum, mesNum, 0).getDate();
        const dataFinal = `${anoNum}-${String(mesNum).padStart(2, '0')}-${ultimoDia}`;

        // ── PASSO 3: Buscar apuração do ponto ────────────────────────────────
        let apuracaoData = null;
        let apuracaoErro = null;
        try {
            const apuracaoRes = await axios.get(`${RHID_BASE_URL}/apuracao_ponto`, {
                headers: { ...RHID_GET_HEADERS, Authorization: authHeader },
                params: { dataIni, dataFinal, idPerson }
            });
            apuracaoData = apuracaoRes.data;
        } catch (apErr) {
            // Captura o erro da apuração mas NÃO deixa derrubar toda a resposta.
            // O colaborador foi encontrado no RHID; só a apuração falhou.
            const rhidMsg = apErr.response?.data?.message || apErr.response?.data || apErr.message;
            apuracaoErro = `Apuração indisponível no RHID para ${dataIni} a ${dataFinal}: ${rhidMsg}`;
            console.warn('[ControlID] Erro ao buscar apuracao_ponto:', rhidMsg);
        }

        // ── PASSO 3b: Enriquecer dias de férias com nome da justificativa ────
        // O ControlID não retorna toolTipAlert preenchido nos dias de férias.
        // Tentamos buscar o nome via API de justificativas; se funcionar, ótimo.
        // Independentemente, sempre rodamos a detecção por padrão de campos.
        if (Array.isArray(apuracaoData) && apuracaoData.length > 0) {
            // Tentativa 1: lookup de nome da justificativa via API
            try {
                const justRes = await axios.get(`${RHID_BASE_URL}/justification`, {
                    headers: { ...RHID_GET_HEADERS, Authorization: authHeader },
                    params: { start: 0, length: 200 }
                });
                const justList = Array.isArray(justRes.data) ? justRes.data
                    : (justRes.data?.data || justRes.data?.list || justRes.data?.items || []);
                const justMap = {};
                justList.forEach(j => {
                    if (j.id != null) {
                        justMap[j.id] = (j.name || j.nome || j.descricao || j.description || '');
                    }
                });
                apuracaoData.forEach(d => {
                    if (d.idJustification && justMap[d.idJustification]) {
                        d.nomeJustificativa = justMap[d.idJustification];
                        const nomeLow = d.nomeJustificativa.toLowerCase();
                        if (nomeLow.includes('férias') || nomeLow.includes('ferias') || nomeLow.includes('vacation')) {
                            d.toolTipAlert = d.nomeJustificativa;
                            d.isFerias = true;
                        }
                    }
                });
                console.log(`[ControlID] Justificativas mapeadas: ${Object.keys(justMap).length} IDs.`);
            } catch (jErr) {
                console.warn('[ControlID] Não foi possível buscar lista de justificativas:', jErr.message);
            }

            // Detecção 2 (SEMPRE roda): Férias por padrão de campos do RHID
            // Critério: tem idJustification + zero trabalho real + TODAS marcações _typeRegister='I'
            // Dias de esquecimento de ponto NÃO passam nesse filtro porque têm marcações 'O' (batidas reais)
            apuracaoData.forEach(d => {
                if (d.isFerias) return; // já marcado pela lookup acima
                if (!d.idJustification) return; // sem justificativa → não é férias
                const marcacoesF = d.listAfdtManutencao || [];
                const todasI = marcacoesF.length > 0 && marcacoesF.every(m => m._typeRegister === 'I');
                const semTrabalho = (d.diasTrabalhados || 0) === 0 && (d.totalHorasTrabalhadas || 0) === 0;
                // Finais de semana no meio das férias também recebem essas batidas automáticas, então não filtramos por folga
                if (todasI && semTrabalho) {
                    d.isFerias = true;
                    d.toolTipAlert = 'Férias'; // propaga para detecção downstream
                    console.log(`[ControlID] Férias detectada por padrão: ${d.date || d.dateTimeStr} idJust=${d.idJustification}`);
                }
            });
        }

        // ── PASSO 4: Processar resposta ───────────────────────────────────────
        const resultado = processarApuracao(apuracaoData, mesNum, anoNum, idPerson, nomeRHID);

        // Se houve erro na apuração, sobrescreve o aviso com o erro real do RHID
        if (apuracaoErro && !resultado.aviso) {
            resultado.aviso = apuracaoErro;
        } else if (apuracaoErro) {
            resultado.aviso = apuracaoErro + ' | ' + resultado.aviso;
        }

        return res.json({
            success: true,
            encontrado: true,
            idRHID: idPerson,
            nomeRHID,
            dataIni,
            dataFinal,
            apuracaoRaw: apuracaoData, // incluído para debug/exploração
            apuracaoErro,              // detalhe do erro da apuração para o frontend
            ...resultado
        });

    } catch (error) {
        // Erro na autenticação RHID ou na busca de pessoa — esse sim é 500
        const detalhe = rhidSanitize(error.response?.data) || error.message;
        console.error('[ControlID] Erro em /ponto-colaborador:', detalhe);
        return res.status(500).json({
            success: false,
            message: 'Erro RHID: ' + detalhe
        });
    }
});

// ─── Helper: extrai horas trabalhadas de um registro diário do RHID ─────────────
function parsearHorasDia(d) {
    // Tenta vários nomes de campo que a API RHID pode usar
    const candidatos = [
        d.horasTrabalhadas, d.horas_trabalhadas, d.totalHoras, d.total_horas,
        d.hrsTrab, d.horasLiquidas, d.horas_liquidas, d.workedHours,
        d.horasNormais, d.horas_normais, d.horasApuradas, d.horas_apuradas,
        d.totalHorasTrabalhadas, d.horasTotalNaoExtra
    ];
    for (const v of candidatos) {
        if (v == null || v === '') continue;
        if (typeof v === 'number') return v > 60 ? v / 60 : v; // minutos ou horas
        if (typeof v === 'string') {
            const m = v.match(/^(\d+):(\d+)/);
            if (m) return parseInt(m[1]) + parseInt(m[2]) / 60; // "08:30"
            const n = parseFloat(v);
            if (!isNaN(n)) return n > 60 ? n / 60 : n;
        }
    }
    // Fallback: calcular por entrada/saída se disponíveis
    if (d.entrada && d.saida) {
        try {
            const [hE, mE] = String(d.entrada).split(':').map(Number);
            const [hS, mS] = String(d.saida).split(':').map(Number);
            if (!isNaN(hE) && !isNaN(hS)) {
                return Math.max(0, ((hS * 60 + mS) - (hE * 60 + mE)) / 60);
            }
        } catch (_) {}
    }
    return null; // não foi possível determinar
}

// ─── Processador flexível da apuração ─────────────────────────────────────────
const fs = require('fs');
const path = require('path');

function processarApuracao(data, mes, ano, idPerson, nomeRHID) {
    // Dias úteis do mês (seg-sáb)
    const diasNoMes = new Date(ano, mes, 0).getDate();
    let diasUteisTotal = 0;
    for (let d = 1; d <= diasNoMes; d++) {
        const ds = new Date(ano, mes - 1, d).getDay();
        if (ds !== 0) diasUteisTotal++; // exclui domingo
    }

    if (!data) {
        return {
            diasUteis: diasUteisTotal,
            diasTrabalhados: null,
            faltas: null,
            diasComHoraExtra: null,
            aviso: 'Apuração não disponível no RHID para o período informado. Preencha manualmente.'
        };
    }

    // Tenta extrair dos campos mais comuns que a API RHID pode retornar
    let diasTrabalhados = null; // TODOS os dias com presença (base para VT)
    let diasVR          = null; // Dias com >6h trabalhadas (base para VR)
    let faltas          = null;
    let diasComHoraExtra = null; // Dias com ≥3h extra (janta)

    // O RHID pode retornar a resposta como uma string JSON dupla (stringificada)
    if (typeof data === 'string') {
        try {
            data = JSON.parse(data);
        } catch(e) {}
    }

    // ── Caso seja um array de registros diários ──────────────────────────────
    if (Array.isArray(data)) {
        const diasComPresenca = data.filter(d => {
            const status = (d.status || d.situacao || d.tipo || '').toString().toLowerCase();
            return status === 'normal' || status === 'trabalhado' || status === '1' ||
                   (d.entrada && d.saida) || (d.marcacoes && d.marcacoes.length >= 2) ||
                   (d.totalHorasTrabalhadas > 0) || (d.horasTotalNaoExtra > 0) || (d.diasTrabalhados > 0);
        });

        diasTrabalhados = diasComPresenca.length; // VT: todos os dias com presença

        // VR: dias com > 6h trabalhadas (ou >= 2h se for sábado da escala)
        diasVR = diasComPresenca.filter(d => {
            const h = parsearHorasDia(d);
            if (h !== null) {
                let isSabado = false;
                if (d.date || d.dateTimeStr) {
                    const diaStr = String(d.date || d.dateTimeStr || '').substring(0,10);
                    if (diaStr.includes('-')) {
                        const p = diaStr.split('-');
                        if (p.length === 3) {
                            const dtStr = p[0].length === 4 ? `${p[0]}-${p[1]}-${p[2]}T12:00:00` : `${p[2]}-${p[1]}-${p[0]}T12:00:00`;
                            const dt = new Date(dtStr);
                            if (!isNaN(dt.getTime()) && dt.getDay() === 6) isSabado = true;
                        }
                    }
                }
                const isFolga = (d.dsrConsideradoMinutos > 0 || (d.diasTrabalhados === 0 && (d.horasUteis || 0) === 0));
                
                if (isSabado && !isFolga) {
                    return h >= 2;
                }
                return h > 6;
            }
            // Sem info de horas — fallback conservador: conta como VR
            return true;
        }).length;

        faltas = data.filter(d => {
            const status = (d.status || d.situacao || d.tipo || '').toString().toLowerCase();
            
            // Se for explicitamente folga, dsr ou feriado, não é falta!
            // ATENÇÃO: NÃO usar d.compensado aqui, pois ele fica true em dias normais de trabalho em certas escalas.
            if (status.includes('folga') || status.includes('dsr') || status.includes('feriado') ||
                d.folga === true || d.isHoliday === 1 || d.isHoliday === true) {
                return false;
            }

            // NOVA LÓGICA: Se não há previsão de horário contratual e não houve trabalho, é folga/dsr!
            // O RHID pode colocar status de "falta" ou "faltasDiasInteiro" indevidamente para folgas de escalas flexíveis.
            const idHorario = d.idHorarioContratual || 0;
            const strHorario = d.strHorarioContratualSimples || '';
            const semHorarioPrevisto = (idHorario === 0 && strHorario.trim() === '');

            if (semHorarioPrevisto && (!d.diasTrabalhados || d.diasTrabalhados === 0)) {
                return false; // Não tem turno programado para hoje, portanto é folga, não falta!
            }

            // Falta explícita, atestado ou licença
            if (status === 'falta' || status === 'ausente' || status === '3' ||
                status.includes('falt') || status.includes('atestado') || status.includes('afastamento') || 
                status.includes('licença') || status.includes('licenca') || status.includes('justificad') || 
                (d.faltaDiaInteiro === true) || (d.faltasDiasInteiro > 0)) {
                return true;
            }

            // Tratamento para justificativas genéricas (d.idJustification != null)
            if (d.idJustification != null && (!d.diasTrabalhados || d.diasTrabalhados === 0)) {
                // Se tinha horário previsto e justificou sem trabalhar, conta como ausência (que será tratada pelo RH)
                if (!semHorarioPrevisto) {
                    return true;
                }
            }

            return false;
        }).length;

        diasComHoraExtra = data.filter(d => {
            const he    = parseFloat(d.horasExtras || d.horas_extras || d.extra || d.overtime || 0);
            const heMin = parseInt(d.minHE || d.minutos_extras || d.horasExtrasCalculadas || ((d.extraDiurna || 0) + (d.extraNoturna || 0)) || 0);
            const hTotais = parseInt(d.totalHorasTrabalhadas || 0);
            
            let isSabado = false;
            if (d.date || d.dateTimeStr) {
                const diaStr = String(d.date || d.dateTimeStr || '').substring(0,10);
                if (diaStr.includes('-')) {
                    const p = diaStr.split('-');
                    if (p.length === 3) {
                        const dtStr = p[0].length === 4 ? `${p[0]}-${p[1]}-${p[2]}T12:00:00` : `${p[2]}-${p[1]}-${p[0]}T12:00:00`;
                        const dt = new Date(dtStr);
                        if (!isNaN(dt.getTime()) && dt.getDay() === 6) isSabado = true;
                    }
                }
            }
            const isFolga = (d.dsrConsideradoMinutos > 0 || (d.diasTrabalhados === 0 && (d.horasUteis || 0) === 0));

            if (isFolga || isSabado) {
                return hTotais > 720; // Mais de 12 horas (em minutos)
            } else {
                return (he >= 3 || heMin >= 180) && hTotais >= 540;
            }
        }).length;
    }

    // ── Caso seja um objeto com totais ──────────────────────────────────────
    if (data && typeof data === 'object' && !Array.isArray(data)) {
        const keys = Object.keys(data);
        const find = (...names) => {
            for (const n of names) {
                const k = keys.find(k => k.toLowerCase().includes(n.toLowerCase()));
                if (k !== undefined && data[k] !== null && data[k] !== undefined) return data[k];
            }
            return null;
        };

        diasTrabalhados  = find('diasTrabalhados', 'dias_trabalhados', 'trabalhados', 'worked', 'daysWorked');
        diasVR           = find('diasVR', 'dias_vr', 'diasRefeicao', 'dias_refeicao', 'diasMaisSeis', 'dias6h', 'diasSeis');
        faltas           = find('faltas', 'ausencias', 'absences', 'falt', 'absent');
        diasComHoraExtra = find('diasHE', 'dias_he', 'horaExtra', 'overtime', 'extra', 'janta');

        // Se tiver array de dias dentro do objeto — processa também
        const arrKey = keys.find(k => Array.isArray(data[k]) && data[k].length > 0);
        if (arrKey && diasTrabalhados === null) {
            const arr = data[arrKey];
            const diasComPresenca = arr.filter(d => {
                const s = (d.status || d.situacao || '').toString().toLowerCase();
                return s === 'normal' || s === 'trabalhado' || (d.entrada && d.saida);
            });
            diasTrabalhados = diasComPresenca.length;
            diasVR = diasComPresenca.filter(d => {
                const h = parsearHorasDia(d);
                return h !== null ? h > 6 : true;
            }).length;
        }

        // Fallback: se não encontrou diasVR mas tem diasTrabalhados, usa como estimativa
        if (diasVR === null && diasTrabalhados !== null) {
            diasVR = diasTrabalhados;
        }
    }

    let payloadDebug = '';
    try {
        if (Array.isArray(data) && data.length > 0) {
            payloadDebug = 'Exemplo Dia 1: ' + JSON.stringify(data[0]).substring(0, 800);
            try { fs.writeFileSync(path.join(__dirname, '../../frontend/apuracao.txt'), JSON.stringify(data[0])); } catch(e){}
            // DEBUG AMPLIADO: gravar todos os dias para inspecionar dias de férias
            try {
                // Procura dias suspeitos de férias: toolTipAlert, justificativas, ou dias mid/late-month
                const diasSuspeitos = data.filter(d => {
                    const tip = (d.toolTipAlert || '').toLowerCase();
                    const abr = (d.abreviationJustification || '').toLowerCase();
                    const nome = (d.nomeJustificativa || '').toLowerCase();
                    const marcacoes = d.listAfdtManutencao || [];
                    const todasI = marcacoes.length > 0 && marcacoes.every(m => m._typeRegister === 'I');
                    return tip.includes('rias') || tip.includes('vacat') || abr.includes('fe') || nome.includes('rias')
                        || d.idJustification || todasI;
                });
                const debugData = {
                    totalDias: data.length,
                    diasSuspeitos: diasSuspeitos.map(d => ({
                        date: d.date || d.dateTimeStr,
                        toolTipAlert: d.toolTipAlert,
                        idJustification: d.idJustification,
                        abreviationJustification: d.abreviationJustification,
                        nomeJustificativa: d.nomeJustificativa,
                        status: d.status,
                        situacao: d.situacao,
                        tipo: d.tipo,
                        diasTrabalhados: d.diasTrabalhados,
                        totalHorasTrabalhadas: d.totalHorasTrabalhadas,
                        listAfdtManutencao: (d.listAfdtManutencao || []).map(m => ({
                            hora: m.hora, _typeRegister: m._typeRegister, isPreAssigned: m.isPreAssigned,
                            idJustification: m.idJustification, reason: m.reason
                        }))
                    })),
                    // Também salvar o dia 14 e 15 de qualquer mês para comparação
                    dia14a16: data.filter(d => {
                        const dt = String(d.date || d.dateTimeStr || '').substring(8, 10);
                        return ['14','15','16'].includes(dt);
                    }).map(d => ({
                        date: d.date || d.dateTimeStr,
                        toolTipAlert: d.toolTipAlert,
                        idJustification: d.idJustification,
                        abreviationJustification: d.abreviationJustification,
                        nomeJustificativa: d.nomeJustificativa,
                        status: d.status, diasTrabalhados: d.diasTrabalhados,
                        listAfdtManutencao: (d.listAfdtManutencao || []).map(m => ({
                            hora: m.hora, _typeRegister: m._typeRegister,
                            isPreAssigned: m.isPreAssigned, reason: m.reason,
                            idJustification: m.idJustification
                        }))
                    }))
                };
                fs.writeFileSync(path.join(__dirname, '../../frontend/apuracao_ferias_debug.txt'), JSON.stringify(debugData, null, 2));
            } catch(e){ console.warn('Debug ferias write error:', e.message); }
        } else {
            payloadDebug = JSON.stringify(data).substring(0, 800);
            try { fs.writeFileSync(path.join(__dirname, '../../frontend/apuracao.txt'), JSON.stringify(data)); } catch(e){}
        }
    } catch(e) { payloadDebug = String(data).substring(0, 800); }

    return {
        diasUteis: diasUteisTotal,
        diasTrabalhados,
        diasVR,
        faltas,
        diasComHoraExtra,
        aviso: (diasTrabalhados === null)
            ? 'Não foi possível interpretar a resposta do RHID. ' + payloadDebug
            : null
    };
}

module.exports = router;

