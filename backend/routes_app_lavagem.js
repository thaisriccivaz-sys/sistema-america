/**
 * Rotas de Backend para o módulo:
 * APP -> Liderança -> Lavagem de Veículos
 *
 * Regras de negócio:
 * - Cronograma ativo somente de Segunda a Sexta-feira (Sábado e Domingo não possuem veículos pendentes).
 * - Carretinhas e veículos parados (em manutenção corretiva com veiculo_rodando='nao' ou revisão em andamento) não entram no cronograma.
 * - Lavagem Simples (diária, Seg a Sex):
 *     Todos os veículos que saíram para a rota durante o dia (diurno D), mais os veículos que saíram na rota noturna anterior
 *     (noturno D-1; na segunda-feira entram também sexta à noite e fim de semana).
 * - Lavagem Detalhada (cronograma automático Seg a Sex, 2 veículos por dia útil):
 *     - Todo dia útil: 1 veículo utilitário
 *     - Alternando dia a dia: 1 caminhonete / no outro dia: 1 caminhão
 *     - 1 vez a cada 15 dias (a cada 10 dias úteis / quinzena): 1 caminhão tanque no lugar da caminhonete/caminhão (1 utilitário + 1 caminhão tanque).
 * - Checklist com fotos salvas no Cloudflare R2 (nunca apaga arquivos do R2).
 */

const crypto = require('crypto');
const escalaUtil = require('./utils/lideranca_escala');

module.exports = function registerAppLavagemRoutes(app, db, authenticateToken, r2) {
    const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve({ lastID: this.lastID, changes: this.changes });
        });
    });
    const dbGet = (sql, params = []) => new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
    });
    const dbAll = (sql, params = []) => new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || [])));
    });

    // ─── Criação de Tabelas e Migração de Permissões ──────────────────────────
    db.serialize(() => {
        db.run(`
            CREATE TABLE IF NOT EXISTS app_lavagem_checklist (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                data_programada TEXT NOT NULL,
                tipo_lavagem TEXT NOT NULL,
                veiculo_placa TEXT NOT NULL,
                veiculo_nome TEXT,
                categoria_veiculo TEXT,
                origem_rota TEXT,
                status TEXT DEFAULT 'pendente',
                itens_json TEXT DEFAULT '{}',
                observacoes TEXT,
                responsavel_uid INTEGER,
                responsavel_nome TEXT,
                iniciado_em TEXT,
                concluido_em TEXT,
                updated_at TEXT DEFAULT (datetime('now','localtime')),
                UNIQUE(data_programada, tipo_lavagem, veiculo_placa)
            )
        `);

        db.run(`CREATE INDEX IF NOT EXISTS idx_app_lavagem_data ON app_lavagem_checklist(data_programada)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_app_lavagem_status ON app_lavagem_checklist(status)`);

        db.run(`
            CREATE TABLE IF NOT EXISTS app_lavagem_midias (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                checklist_id INTEGER,
                data_programada TEXT NOT NULL,
                tipo_lavagem TEXT NOT NULL,
                veiculo_placa TEXT NOT NULL,
                item_key TEXT NOT NULL,
                r2_key TEXT NOT NULL,
                mime_type TEXT DEFAULT 'image/jpeg',
                tamanho_bytes INTEGER DEFAULT 0,
                created_by_uid INTEGER,
                created_by_nome TEXT,
                created_at TEXT DEFAULT (datetime('now','localtime'))
            )
        `);

        db.run(`CREATE INDEX IF NOT EXISTS idx_app_lavagem_midias_lookup ON app_lavagem_midias(data_programada, tipo_lavagem, veiculo_placa)`);

        // Concede permissão 'app-lideranca-lavagem' automaticamente a quem já possui acesso a telas de APP -> Liderança
        db.all(`SELECT id, telas_permitidas FROM grupos_permissao`, [], (err, grupos) => {
            if (!err && Array.isArray(grupos)) {
                grupos.forEach(g => {
                    try {
                        const telas = JSON.parse(g.telas_permitidas || '[]');
                        const temLideranca = telas.some(t =>
                            t === 'app-lideranca-entregas' ||
                            t === 'app-lideranca-retiradas' ||
                            t === 'app-lideranca-resumo-rota' ||
                            t === 'app-lideranca-candidatos'
                        );
                        if (temLideranca && !telas.includes('app-lideranca-lavagem')) {
                            telas.push('app-lideranca-lavagem');
                            db.run(`UPDATE grupos_permissao SET telas_permitidas = ? WHERE id = ?`, [JSON.stringify(telas), g.id]);
                        }
                    } catch (_) {}
                });
            }
        });
    });

    // ─── Helpers de Data e Categorias ─────────────────────────────────────────
    function getHojeISO() {
        const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    function addDaysISO(iso, delta) {
        const [y, m, d] = String(iso).split('-').map(Number);
        const dt = new Date(y, m - 1, d, 12, 0, 0);
        dt.setDate(dt.getDate() + delta);
        const yy = dt.getFullYear();
        const mm = String(dt.getMonth() + 1).padStart(2, '0');
        const dd = String(dt.getDate()).padStart(2, '0');
        return `${yy}-${mm}-${dd}`;
    }

    function getDayOfWeek(iso) {
        const [y, m, d] = String(iso).split('-').map(Number);
        return new Date(y, m - 1, d, 12, 0, 0).getDay(); // 0=Dom .. 6=Sab
    }

    function normTxt(s) {
        return String(s || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim();
    }

    function normPlaca(s) {
        return String(s || '')
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '')
            .trim();
    }

    function formatarPlacaExibicao(placaNorm) {
        const p = normPlaca(placaNorm);
        if (p.length === 7) return `${p.slice(0, 3)}-${p.slice(3)}`;
        return p;
    }

    function classificarCategoriaVeiculo(tipoVeiculo, marcaModelo) {
        const t = normTxt(tipoVeiculo);
        const m = normTxt(marcaModelo);
        const full = `${t} ${m}`;

        if (t.includes('carretinha') || m.includes('carretinha') || m.includes('reboque') || m.startsWith('r/')) {
            return 'carretinha';
        }
        if (t.includes('tanque') || m.includes('tanque')) {
            return 'caminhao_tanque';
        }
        if (t.includes('caminhonete') || m.includes('express') || m.includes('daily') || m.includes('caminhonete') || m.includes('hr') || m.includes('bongo') || m.includes('hilux') || m.includes('s10') || m.includes('ranger')) {
            return 'caminhonete';
        }
        if (t.includes('caminhao') || m.includes('9.170') || m.includes('8.150') || m.includes('tector') || m.includes('accelo') || m.includes('atego') || m.includes('worker') || m.includes('cargo') || m.includes('vw/') || m.includes('m.benz')) {
            return 'caminhao';
        }
        if (t.includes('utilitario') || m.includes('strada') || m.includes('courier') || m.includes('fiorino') || m.includes('saveiro') || m.includes('montana') || m.includes('kangoo') || m.includes('partner')) {
            return 'utilitario';
        }
        return 'utilitario';
    }

    function labelCategoriaVeiculo(cat) {
        if (cat === 'caminhao_tanque') return 'Caminhão Tanque';
        if (cat === 'caminhao') return 'Caminhão';
        if (cat === 'caminhonete') return 'Caminhonete';
        if (cat === 'utilitario') return 'Utilitário';
        if (cat === 'carretinha') return 'Carretinha';
        return 'Veículo';
    }

    // Itens oficiais do checklist de acordo com a categoria do veículo
    const ITENS_PADRAO = [
        { key: 'externo_motorista',  label: 'Externo motorista',  icon: 'ph-car-profile',    obrigatorio: true },
        { key: 'externo_passageiro', label: 'Externo passageiro', icon: 'ph-car-profile',    obrigatorio: true },
        { key: 'frente',             label: 'Frente',             icon: 'ph-car',            obrigatorio: true },
        { key: 'traseira',           label: 'Traseira',           icon: 'ph-truck',          obrigatorio: true },
        { key: 'carroceria',         label: 'Carroceria',         icon: 'ph-package',        obrigatorio: true },
        { key: 'rodas',              label: 'Rodas',              icon: 'ph-tire',           obrigatorio: true },
        { key: 'interno_motorista',  label: 'Interno motorista',  icon: 'ph-steering-wheel', obrigatorio: true },
        { key: 'interno_passageiro', label: 'Interno passageiro', icon: 'ph-armchair',       obrigatorio: true },
        { key: 'tanque_se_houver',   label: 'Tanque se houver',   icon: 'ph-drop',           obrigatorio: false }
    ];

    const ITENS_CAMINHAO_TANQUE = [
        { key: 'externo_motorista',  label: 'Externo motorista',  icon: 'ph-truck',          obrigatorio: true },
        { key: 'externo_passageiro', label: 'Externo passageiro', icon: 'ph-truck',          obrigatorio: true },
        { key: 'frente',             label: 'Frente',             icon: 'ph-car',            obrigatorio: true },
        { key: 'traseira',           label: 'Traseira',           icon: 'ph-truck',          obrigatorio: true },
        { key: 'rodas',              label: 'Rodas',              icon: 'ph-tire',           obrigatorio: true },
        { key: 'interno_motorista',  label: 'Interno motorista',  icon: 'ph-steering-wheel', obrigatorio: true },
        { key: 'interno_passageiro', label: 'Interno passageiro', icon: 'ph-armchair',       obrigatorio: true },
        { key: 'tanque',             label: 'Tanque',             icon: 'ph-drop',           obrigatorio: true }
    ];

    function getItensChecklistPorCategoria(categoria) {
        return categoria === 'caminhao_tanque' ? ITENS_CAMINHAO_TANQUE : ITENS_PADRAO;
    }

    // ─── Frota Ativa (Excluindo Carretinhas e Veículos Parados) ───────────────
    async function carregarFrotaAtivaMap() {
        let rows = [];
        try {
            rows = await dbAll(`
                SELECT fv.id, fv.placa, fv.marca_modelo_versao, fv.tipo_veiculo, fv.foto_url,
                    CASE
                        WHEN EXISTS (
                            SELECT 1 FROM frota_manutencoes fm0
                            WHERE fm0.veiculo_id = fv.id
                              AND fm0.tipo = 'corretiva'
                              AND fm0.status IN ('agendada','em_andamento','aguardando')
                              AND COALESCE(fm0.veiculo_rodando, CASE WHEN fm0.status='em_andamento' THEN 'nao' ELSE 'sim' END) = 'nao'
                        ) OR EXISTS (
                            SELECT 1 FROM frota_revisoes fr0
                            WHERE fr0.veiculo_id = fv.id
                              AND fr0.status = 'agendada'
                              AND (fr0.data_revisao IS NULL OR TRIM(fr0.data_revisao) = '' OR substr(TRIM(fr0.data_revisao), 1, 10) <= date('now', '-3 hours'))
                        ) THEN 1
                        ELSE 0
                    END AS em_manutencao
                FROM frota_veiculos fv
                ORDER BY fv.placa ASC, fv.id ASC
            `);
        } catch (_) {
            rows = await dbAll(`SELECT id, placa, marca_modelo_versao, tipo_veiculo, foto_url, 0 AS em_manutencao FROM frota_veiculos ORDER BY placa ASC, id ASC`);
        }

        const byPlaca = new Map();
        const grupos = {
            utilitario: [],
            caminhonete: [],
            caminhao: [],
            caminhao_tanque: []
        };

        for (const r of rows) {
            const placaNorm = normPlaca(r.placa);
            if (!placaNorm) continue;
            const categoria = classificarCategoriaVeiculo(r.tipo_veiculo, r.marca_modelo_versao);
            const parado = Number(r.em_manutencao) === 1;
            const info = {
                id: r.id,
                placa: placaNorm,
                placa_fmt: formatarPlacaExibicao(placaNorm),
                modelo: r.marca_modelo_versao || '',
                nome_exibicao: `${formatarPlacaExibicao(placaNorm)} — ${r.marca_modelo_versao || labelCategoriaVeiculo(categoria)}`,
                categoria,
                categoria_label: labelCategoriaVeiculo(categoria),
                foto_url: r.foto_url || null,
                parado
            };
            byPlaca.set(placaNorm, info);

            if (!parado && categoria !== 'carretinha' && grupos[categoria]) {
                grupos[categoria].push(info);
            }
        }

        return { byPlaca, grupos };
    }

    // ─── Cálculo do Cronograma de Lavagem Detalhada para uma Data (Seg-Sex) ───
    // Âncora de referência: Segunda-feira, 05/01/2026
    function calcularVeiculosDetalhadaDia(dataISO, grupos) {
        const dow = getDayOfWeek(dataISO);
        if (dow === 0 || dow === 6) return []; // Sábado e Domingo não têm cronograma

        const [y, m, d] = String(dataISO).split('-').map(Number);
        const dt = new Date(y, m - 1, d, 12, 0, 0);
        const anchor = new Date(2026, 0, 5, 12, 0, 0); // 2026-01-05 (Segunda-feira)
        const diffDays = Math.round((dt.getTime() - anchor.getTime()) / 86400000);
        const weekIndex = Math.floor(diffDays / 7);
        const dayInWeek = dow - 1; // 0=Seg .. 4=Sex
        const weekdayIndex = weekIndex * 5 + dayInWeek;

        const selecionados = [];
        const utilitarios = grupos.utilitario || [];
        const caminhonetes = grupos.caminhonete || [];
        const caminhoes = grupos.caminhao || [];
        const tanques = grupos.caminhao_tanque || [];

        const pickCyclic = (arr, idx) => {
            if (!arr || arr.length === 0) return null;
            const i = ((idx % arr.length) + arr.length) % arr.length;
            return arr[i];
        };

        // Slot 1: Todo dia útil (Seg a Sex) tem 1 veículo utilitário
        const vUtil = pickCyclic(utilitarios, weekdayIndex);
        if (vUtil) {
            selecionados.push({
                ...vUtil,
                tipo_lavagem: 'detalhada',
                origem_rota: 'Cronograma Detalhado (1 Utilitário/dia)'
            });
        }

        // Slot 2:
        // - 1 vez a cada 15 dias (a cada 10 dias úteis, ex.: segundas-feiras de semanas pares): 1 caminhão tanque
        // - Nos demais dias úteis: alterna diariamente entre 1 caminhonete e 1 caminhão
        const isDiaTanque = (((weekdayIndex % 10) + 10) % 10) === 0 && tanques.length > 0;
        if (isDiaTanque) {
            const cicloTanque = Math.floor(weekdayIndex / 10);
            const vTanque = pickCyclic(tanques, cicloTanque);
            if (vTanque) {
                selecionados.push({
                    ...vTanque,
                    tipo_lavagem: 'detalhada',
                    origem_rota: 'Cronograma Detalhado (Quinzenal Caminhão Tanque)'
                });
            }
        } else {
            // Conta quantos dias úteis "não-tanque" se passaram para alternar exatamente 1 caminhonete / 1 caminhão
            const qtdTanquesAntes = tanques.length > 0 ? Math.floor((weekdayIndex + 9) / 10) : 0;
            const nonTanqueIdx = weekdayIndex - qtdTanquesAntes;
            const isDiaCaminhonete = (((nonTanqueIdx % 2) + 2) % 2) === 0;
            const parIdx = Math.floor(nonTanqueIdx / 2);

            if (isDiaCaminhonete) {
                const vCam = pickCyclic(caminhonetes.length ? caminhonetes : caminhoes, parIdx);
                if (vCam) {
                    selecionados.push({
                        ...vCam,
                        tipo_lavagem: 'detalhada',
                        origem_rota: 'Cronograma Detalhado (Alternância Caminhonete)'
                    });
                }
            } else {
                const vCaminhao = pickCyclic(caminhoes.length ? caminhoes : caminhonetes, parIdx);
                if (vCaminhao) {
                    selecionados.push({
                        ...vCaminhao,
                        tipo_lavagem: 'detalhada',
                        origem_rota: 'Cronograma Detalhado (Alternância Caminhão)'
                    });
                }
            }
        }

        return selecionados;
    }

    // ─── Cálculo dos Veículos de Rota para Lavagem Simples (Seg-Sex) ──────────
    function extrairPlacaDeRotuloRota(veiculoStr) {
        const s = String(veiculoStr || '').trim().toUpperCase();
        if (!s) return null;
        // Padrão: "BXR-4663 DELIVERY (TER)" ou "BXR4663 ..."
        const m = s.match(/^([A-Z]{3}[\-\s]?[0-9][A-Z0-9][0-9]{2})\b/);
        if (m) return normPlaca(m[1]);
        const firstToken = normPlaca(s.split(/\s+/)[0]);
        if (firstToken.length === 7) return firstToken;
        return null;
    }

    function isTurnoNoturnoResumo(nomeRota) {
        const n = normTxt(nomeRota);
        return n.includes('noite') || n.includes('noturn');
    }

    function extrairDataISODeNomeResumo(nome) {
        const m = String(nome || '').trim().match(/^(\d{2})[-/](\d{2})[-/](\d{4})/);
        if (m) return `${m[3]}-${m[2]}-${m[1]}`;
        const mIso = String(nome || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (mIso) return `${mIso[1]}-${mIso[2]}-${mIso[3]}`;
        return null;
    }

    async function buscarVeiculosSimplesRotaPorDatas(datasLista, frotaInfo) {
        if (!datasLista || datasLista.length === 0) return new Map();

        const sorted = [...datasLista].sort();
        const minDate = addDaysISO(sorted[0], -3);
        const maxDate = sorted[sorted.length - 1];

        const todosResumos = await dbAll(
            `SELECT id, nome, dados
             FROM logistica_resumo_rota
             ORDER BY id ASC`
        );

        // Agrupa por data_rota mantendo o resumo mais recente de cada turno (diurno e noturno)
        const resumosPorData = new Map();
        for (const r of todosResumos) {
            const dtIso = extrairDataISODeNomeResumo(r.nome);
            if (!dtIso || dtIso < minDate || dtIso > maxDate) continue;
            if (!resumosPorData.has(dtIso)) {
                resumosPorData.set(dtIso, { diurno: null, noturno: null });
            }
            const grp = resumosPorData.get(dtIso);
            if (isTurnoNoturnoResumo(r.nome)) {
                grp.noturno = r;
            } else {
                grp.diurno = r;
            }
        }

        const resultadoPorData = new Map();

        for (const dataISO of datasLista) {
            const dow = getDayOfWeek(dataISO);
            if (dow === 0 || dow === 6) {
                resultadoPorData.set(dataISO, []);
                continue;
            }

            // Fontes de rota para a lavagem simples da noite de dataISO:
            // 1. Rota DIURNA do próprio dia (dataISO)
            // 2. Rota NOTURNA do dia anterior (dataISO - 1)
            // 3. Se dataISO for Segunda-feira (dow === 1), inclui também:
            //    - Sexta-feira à noite (dataISO - 3, noturno)
            //    - Sábado (dataISO - 2, diurno e noturno)
            //    - Domingo (dataISO - 1, diurno e noturno)
            const fontes = [];
            const grpHoje = resumosPorData.get(dataISO);
            if (grpHoje && grpHoje.diurno) {
                fontes.push({ resumo: grpHoje.diurno, labelOrigem: `Rota Diurna (${dataISO.split('-').reverse().slice(0, 2).join('/')})` });
            }

            if (dow === 1) {
                const sexISO = addDaysISO(dataISO, -3);
                const sabISO = addDaysISO(dataISO, -2);
                const domISO = addDaysISO(dataISO, -1);
                const grpSex = resumosPorData.get(sexISO);
                if (grpSex && grpSex.noturno) {
                    fontes.push({ resumo: grpSex.noturno, labelOrigem: `Rota Noturna (${sexISO.split('-').reverse().slice(0, 2).join('/')})` });
                }
                const grpSab = resumosPorData.get(sabISO);
                if (grpSab) {
                    if (grpSab.diurno) fontes.push({ resumo: grpSab.diurno, labelOrigem: `Rota Diurna (${sabISO.split('-').reverse().slice(0, 2).join('/')})` });
                    if (grpSab.noturno) fontes.push({ resumo: grpSab.noturno, labelOrigem: `Rota Noturna (${sabISO.split('-').reverse().slice(0, 2).join('/')})` });
                }
                const grpDom = resumosPorData.get(domISO);
                if (grpDom) {
                    if (grpDom.diurno) fontes.push({ resumo: grpDom.diurno, labelOrigem: `Rota Diurna (${domISO.split('-').reverse().slice(0, 2).join('/')})` });
                    if (grpDom.noturno) fontes.push({ resumo: grpDom.noturno, labelOrigem: `Rota Noturna (${domISO.split('-').reverse().slice(0, 2).join('/')})` });
                }
            } else {
                const ontemISO = addDaysISO(dataISO, -1);
                const grpOntem = resumosPorData.get(ontemISO);
                if (grpOntem && grpOntem.noturno) {
                    fontes.push({ resumo: grpOntem.noturno, labelOrigem: `Rota Noturna (${ontemISO.split('-').reverse().slice(0, 2).join('/')})` });
                }
            }

            const veiculosMap = new Map();
            for (const f of fontes) {
                let parsed = null;
                try { parsed = JSON.parse(f.resumo.dados || '[]'); } catch (_) { parsed = []; }
                const arr = Array.isArray(parsed)
                    ? parsed
                    : (parsed && Array.isArray(parsed.veiculos) ? parsed.veiculos : []);
                if (!Array.isArray(arr)) continue;

                for (const item of arr) {
                    const nomeBruto = String(item.veiculo || '').trim();
                    if (!nomeBruto) continue;
                    const normNome = normTxt(nomeBruto);
                    if (normNome.includes('fora de rota') || normNome.includes('reserva') || normNome.includes('carretinha')) continue;

                    const placa = extrairPlacaDeRotuloRota(nomeBruto);
                    if (!placa) continue;

                    const cad = frotaInfo.byPlaca.get(placa);
                    if (cad) {
                        if (cad.parado || cad.categoria === 'carretinha') continue;
                        if (!veiculosMap.has(placa)) {
                            veiculosMap.set(placa, {
                                ...cad,
                                tipo_lavagem: 'simples',
                                origens: [f.labelOrigem],
                                motorista_rota: item.motorista || ''
                            });
                        } else {
                            const ex = veiculosMap.get(placa);
                            if (!ex.origens.includes(f.labelOrigem)) ex.origens.push(f.labelOrigem);
                            if (!ex.motorista_rota && item.motorista) ex.motorista_rota = item.motorista;
                        }
                    } else {
                        const catInferida = classificarCategoriaVeiculo('', nomeBruto);
                        if (catInferida === 'carretinha') continue;
                        if (!veiculosMap.has(placa)) {
                            veiculosMap.set(placa, {
                                id: null,
                                placa,
                                placa_fmt: formatarPlacaExibicao(placa),
                                modelo: nomeBruto,
                                nome_exibicao: nomeBruto,
                                categoria: catInferida,
                                categoria_label: labelCategoriaVeiculo(catInferida),
                                foto_url: null,
                                parado: false,
                                tipo_lavagem: 'simples',
                                origens: [f.labelOrigem],
                                motorista_rota: item.motorista || ''
                            });
                        }
                    }
                }
            }

            const listaSimples = Array.from(veiculosMap.values()).map(v => ({
                ...v,
                origem_rota: v.origens.join(' + ')
            }));
            resultadoPorData.set(dataISO, listaSimples);
        }

        return resultadoPorData;
    }

    // ─── Monta a programação completa de uma data + mescla com os checklists ──
    async function montarProgramacaoDia(dataISO, frotaInfoOpt = null, simplesMapOpt = null) {
        const dow = getDayOfWeek(dataISO);
        if (dow === 0 || dow === 6) {
            return []; // Sábado e Domingo: não devem aparecer veículos pendentes
        }

        const frotaInfo = frotaInfoOpt || await carregarFrotaAtivaMap();
        const simplesMap = simplesMapOpt || await buscarVeiculosSimplesRotaPorDatas([dataISO], frotaInfo);

        const simplesDia = simplesMap.get(dataISO) || [];
        const detalhadaDia = calcularVeiculosDetalhadaDia(dataISO, frotaInfo.grupos);

        const combinados = [...detalhadaDia, ...simplesDia];

        // Busca checklists e mídias salvos para esta data
        const salvos = await dbAll(
            `SELECT * FROM app_lavagem_checklist WHERE data_programada = ?`,
            [dataISO]
        );
        const midias = await dbAll(
            `SELECT id, checklist_id, data_programada, tipo_lavagem, veiculo_placa, item_key, mime_type, created_by_nome, created_at
             FROM app_lavagem_midias
             WHERE data_programada = ?
             ORDER BY id ASC`,
            [dataISO]
        );

        const salvosMap = new Map();
        for (const s of salvos) {
            salvosMap.set(`${s.tipo_lavagem}::${normPlaca(s.veiculo_placa)}`, s);
        }

        const midiasMap = new Map();
        for (const m of midias) {
            const k = `${m.tipo_lavagem}::${normPlaca(m.veiculo_placa)}`;
            if (!midiasMap.has(k)) midiasMap.set(k, []);
            midiasMap.get(k).push({
                ...m,
                url: `/api/app/lavagem/midia/${m.id}`
            });
        }

        const hojeISO = getHojeISO();

        return combinados.map(item => {
            const key = `${item.tipo_lavagem}::${normPlaca(item.placa)}`;
            const salvo = salvosMap.get(key);
            const listaMidias = midiasMap.get(key) || [];
            const itensDef = getItensChecklistPorCategoria(item.categoria);

            let itensState = {};
            try { itensState = JSON.parse((salvo && salvo.itens_json) || '{}'); } catch (_) { itensState = {}; }

            let totalObrigatorios = 0;
            let concluidosObrigatorios = 0;
            let algumPreenchido = listaMidias.length > 0;

            const itensDetalhados = itensDef.map(def => {
                const st = itensState[def.key] || {};
                const fotosItem = listaMidias.filter(m => m.item_key === def.key);
                const statusItem = st.status || (fotosItem.length > 0 ? 'ok' : '');
                if (statusItem) algumPreenchido = true;

                if (def.obrigatorio) {
                    totalObrigatorios++;
                    if (statusItem === 'ok' && fotosItem.length > 0) {
                        concluidosObrigatorios++;
                    }
                } else {
                    // Item opcional ("Tanque se houver"): se marcou 'ok' ou 'na', conta no progresso visual
                }

                return {
                    key: def.key,
                    label: def.label,
                    icon: def.icon,
                    obrigatorio: def.obrigatorio,
                    status: statusItem,
                    observacao: st.observacao || '',
                    updated_at: st.updated_at || null,
                    updated_by: st.updated_by || null,
                    fotos: fotosItem
                };
            });

            let statusFinal = salvo ? salvo.status : 'pendente';
            if (statusFinal !== 'concluido') {
                if (algumPreenchido || concluidosObrigatorios > 0) {
                    statusFinal = 'em_andamento';
                } else {
                    statusFinal = 'pendente';
                }
            }

            const atrasado = statusFinal !== 'concluido' && dataISO < hojeISO;

            return {
                checklist_id: salvo ? salvo.id : null,
                data_programada: dataISO,
                tipo_lavagem: item.tipo_lavagem,
                tipo_lavagem_label: item.tipo_lavagem === 'detalhada' ? 'Lavagem Detalhada' : 'Lavagem Simples',
                placa: item.placa,
                placa_fmt: item.placa_fmt,
                modelo: item.modelo,
                nome_exibicao: item.nome_exibicao,
                categoria: item.categoria,
                categoria_label: item.categoria_label,
                foto_url: item.foto_url,
                origem_rota: item.origem_rota || (salvo && salvo.origem_rota) || '',
                motorista_rota: item.motorista_rota || '',
                status: statusFinal,
                atrasado,
                progresso: {
                    concluidos: concluidosObrigatorios,
                    total: totalObrigatorios,
                    fotos_total: listaMidias.length
                },
                itens: itensDetalhados,
                observacoes: (salvo && salvo.observacoes) || '',
                responsavel_uid: (salvo && salvo.responsavel_uid) || null,
                responsavel_nome: (salvo && salvo.responsavel_nome) || null,
                iniciado_em: (salvo && salvo.iniciado_em) || null,
                concluido_em: (salvo && salvo.concluido_em) || null
            };
        });
    }

    // ─── GET /api/app/lavagem/agenda ──────────────────────────────────────────
    // Retorna contagens por dia no período [inicio, fim] para o calendário Semana/Mês
    app.get('/api/app/lavagem/agenda', authenticateToken, async (req, res) => {
        try {
            const hoje = getHojeISO();
            const inicio = String(req.query.inicio || addDaysISO(hoje, -7)).slice(0, 10);
            const fim = String(req.query.fim || addDaysISO(hoje, 14)).slice(0, 10);

            const datas = [];
            let cur = inicio;
            let guard = 0;
            while (cur <= fim && guard < 62) {
                datas.push(cur);
                cur = addDaysISO(cur, 1);
                guard++;
            }

            const frotaInfo = await carregarFrotaAtivaMap();
            const simplesMap = await buscarVeiculosSimplesRotaPorDatas(datas, frotaInfo);

            const salvosPeriodo = await dbAll(
                `SELECT data_programada, tipo_lavagem, veiculo_placa, status, itens_json
                 FROM app_lavagem_checklist
                 WHERE data_programada >= ? AND data_programada <= ?`,
                [inicio, fim]
            );
            const salvosPorChave = new Map();
            for (const s of salvosPeriodo) {
                salvosPorChave.set(`${s.data_programada}::${s.tipo_lavagem}::${normPlaca(s.veiculo_placa)}`, s);
            }

            const dias = {};
            for (const dt of datas) {
                const dow = getDayOfWeek(dt);
                if (dow === 0 || dow === 6) {
                    dias[dt] = { total: 0, simples: 0, detalhada: 0, concluidos: 0, em_andamento: 0, pendentes: 0 };
                    continue;
                }
                const det = calcularVeiculosDetalhadaDia(dt, frotaInfo.grupos);
                const simp = simplesMap.get(dt) || [];
                const todos = [...det, ...simp];

                let concluidos = 0;
                let em_andamento = 0;
                let pendentes = 0;

                for (const v of todos) {
                    const stRow = salvosPorChave.get(`${dt}::${v.tipo_lavagem}::${normPlaca(v.placa)}`);
                    if (stRow && stRow.status === 'concluido') concluidos++;
                    else if (stRow && stRow.status === 'em_andamento') em_andamento++;
                    else pendentes++;
                }

                dias[dt] = {
                    total: todos.length,
                    simples: simp.length,
                    detalhada: det.length,
                    concluidos,
                    em_andamento,
                    pendentes
                };
            }

            res.json({ ok: true, hoje, inicio, fim, dias });
        } catch (err) {
            console.error('[APP-LAVAGEM] Erro em GET /agenda:', err);
            res.status(500).json({ error: err.message });
        }
    });

    // ─── GET /api/app/lavagem ─────────────────────────────────────────────────
    // Retorna os veículos programados para a data selecionada + escala de liderança + resumo da semana
    app.get('/api/app/lavagem', authenticateToken, async (req, res) => {
        try {
            const hoje = getHojeISO();
            const dataSel = String(req.query.data || hoje).slice(0, 10);

            const frotaInfo = await carregarFrotaAtivaMap();

            // Calcula a semana (Seg a Sex) da data selecionada para exibir o quadro do cronograma semanal
            const dow = getDayOfWeek(dataSel);
            const offsetToMonday = dow === 0 ? -6 : (1 - dow);
            const segISO = addDaysISO(dataSel, offsetToMonday);
            const datasSemana = [0, 1, 2, 3, 4].map(i => addDaysISO(segISO, i));
            const todasDatasConsulta = Array.from(new Set([dataSel, ...datasSemana]));

            const simplesMap = await buscarVeiculosSimplesRotaPorDatas(todasDatasConsulta, frotaInfo);
            const itensDia = await montarProgramacaoDia(dataSel, frotaInfo, simplesMap);

            // Cronograma detalhado da semana (Seg a Sex) para fácil visualização pela liderança
            const nomesDia = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
            const cronogramaSemana = [];
            for (const dtSem of datasSemana) {
                const detSem = calcularVeiculosDetalhadaDia(dtSem, frotaInfo.grupos);
                cronogramaSemana.push({
                    data: dtSem,
                    dia_nome: nomesDia[getDayOfWeek(dtSem)],
                    veiculos: detSem.map(v => ({
                        placa: v.placa,
                        placa_fmt: v.placa_fmt,
                        modelo: v.modelo,
                        categoria: v.categoria,
                        categoria_label: v.categoria_label,
                        origem_rota: v.origem_rota
                    }))
                });
            }

            // Escala de líderes do dia (a lavagem é feita à noite, mas exibimos Diurno e Noturno como nas demais telas)
            let escalaDia = null;
            try {
                escalaDia = await escalaUtil.obterEscalaLideresNoDia(db, dataSel, req.user?.id);
            } catch (_) {}

            res.json({
                ok: true,
                hoje,
                data: dataSel,
                fim_de_semana: (dow === 0 || dow === 6),
                escala: escalaDia,
                itens: itensDia,
                cronograma_semana: cronogramaSemana,
                frota_resumo: {
                    utilitarios: frotaInfo.grupos.utilitario.length,
                    caminhonetes: frotaInfo.grupos.caminhonete.length,
                    caminhoes: frotaInfo.grupos.caminhao.length,
                    tanques: frotaInfo.grupos.caminhao_tanque.length
                }
            });
        } catch (err) {
            console.error('[APP-LAVAGEM] Erro em GET /api/app/lavagem:', err);
            res.status(500).json({ error: err.message });
        }
    });

    // ─── Helper para garantir que o registro pai exista em app_lavagem_checklist ──
    async function ensureChecklistRow({ data_programada, tipo_lavagem, veiculo_placa, veiculo_nome, categoria_veiculo, origem_rota, user }) {
        const placa = normPlaca(veiculo_placa);
        let row = await dbGet(
            `SELECT * FROM app_lavagem_checklist WHERE data_programada = ? AND tipo_lavagem = ? AND veiculo_placa = ?`,
            [data_programada, tipo_lavagem, placa]
        );
        if (!row) {
            const nowStr = new Date().toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' });
            await dbRun(
                `INSERT INTO app_lavagem_checklist
                 (data_programada, tipo_lavagem, veiculo_placa, veiculo_nome, categoria_veiculo, origem_rota, status, itens_json, responsavel_uid, responsavel_nome, iniciado_em, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, 'em_andamento', '{}', ?, ?, ?, ?)`,
                [
                    data_programada,
                    tipo_lavagem,
                    placa,
                    veiculo_nome || placa,
                    categoria_veiculo || 'utilitario',
                    origem_rota || '',
                    user?.id || null,
                    user?.nome || user?.username || 'Líder',
                    nowStr,
                    nowStr
                ]
            );
            row = await dbGet(
                `SELECT * FROM app_lavagem_checklist WHERE data_programada = ? AND tipo_lavagem = ? AND veiculo_placa = ?`,
                [data_programada, tipo_lavagem, placa]
            );
        }
        return row;
    }

    // ─── POST /api/app/lavagem/item (Autosave de item ou observação) ──────────
    app.post('/api/app/lavagem/item', authenticateToken, async (req, res) => {
        try {
            const { data_programada, tipo_lavagem, veiculo_placa, veiculo_nome, categoria_veiculo, origem_rota, item_key, status, observacao, observacoes_gerais } = req.body || {};
            if (!data_programada || !tipo_lavagem || !veiculo_placa) {
                return res.status(400).json({ error: 'Parâmetros obrigatórios ausentes.' });
            }

            const row = await ensureChecklistRow({
                data_programada,
                tipo_lavagem,
                veiculo_placa,
                veiculo_nome,
                categoria_veiculo,
                origem_rota,
                user: req.user
            });

            let itensObj = {};
            try { itensObj = JSON.parse(row.itens_json || '{}'); } catch (_) { itensObj = {}; }

            const nowStr = new Date().toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' });
            const userName = req.user?.nome || req.user?.username || 'Líder';

            if (item_key) {
                const prev = itensObj[item_key] || {};
                itensObj[item_key] = {
                    status: status !== undefined ? status : (prev.status || 'ok'),
                    observacao: observacao !== undefined ? observacao : (prev.observacao || ''),
                    updated_at: nowStr,
                    updated_by: userName
                };
            }

            const novaObsGeral = observacoes_gerais !== undefined ? observacoes_gerais : (row.observacoes || '');
            const novoStatus = row.status === 'concluido' ? 'concluido' : 'em_andamento';

            await dbRun(
                `UPDATE app_lavagem_checklist
                 SET itens_json = ?, observacoes = ?, status = ?, responsavel_uid = COALESCE(responsavel_uid, ?), responsavel_nome = COALESCE(responsavel_nome, ?), updated_at = ?
                 WHERE id = ?`,
                [JSON.stringify(itensObj), novaObsGeral, novoStatus, req.user?.id || null, userName, nowStr, row.id]
            );

            res.json({ ok: true, checklist_id: row.id, status: novoStatus, itens_json: itensObj });
        } catch (err) {
            console.error('[APP-LAVAGEM] Erro em POST /item:', err);
            res.status(500).json({ error: err.message });
        }
    });

    // ─── POST /api/app/lavagem/midia (Upload de foto para Cloudflare R2) ──────
    app.post('/api/app/lavagem/midia', authenticateToken, async (req, res) => {
        try {
            const { data_programada, tipo_lavagem, veiculo_placa, veiculo_nome, categoria_veiculo, origem_rota, item_key, base64 } = req.body || {};
            if (!data_programada || !tipo_lavagem || !veiculo_placa || !item_key || !base64) {
                return res.status(400).json({ error: 'Dados da foto incompletos.' });
            }

            if (!r2 || !r2.isReady()) {
                return res.status(503).json({ error: 'Armazenamento Cloudflare R2 não está disponível no momento.' });
            }

            const m = String(base64).match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
            const mimeType = m ? m[1] : 'image/jpeg';
            const rawB64 = m ? m[2] : String(base64).replace(/^data:[^;]+;base64,/, '');
            const buffer = Buffer.from(rawB64, 'base64');

            if (!buffer || buffer.length === 0) {
                return res.status(400).json({ error: 'Imagem inválida ou vazia.' });
            }

            const placa = normPlaca(veiculo_placa);
            const row = await ensureChecklistRow({
                data_programada,
                tipo_lavagem,
                veiculo_placa: placa,
                veiculo_nome,
                categoria_veiculo,
                origem_rota,
                user: req.user
            });

            const [yyyy, mm, dd] = String(data_programada).split('-');
            const ext = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg';
            const rand = crypto.randomBytes(4).toString('hex');
            const safeItem = String(item_key).replace(/[^a-zA-Z0-9_-]/g, '');
            const r2Key = `lavagem-veiculos/${yyyy || '2026'}/${mm || '01'}/${dd || '01'}/${tipo_lavagem}_${placa}_${safeItem}_${Date.now()}_${rand}.${ext}`;

            await r2.uploadToR2(r2Key, buffer, mimeType);

            const nowStr = new Date().toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' });
            const userName = req.user?.nome || req.user?.username || 'Líder';

            const ins = await dbRun(
                `INSERT INTO app_lavagem_midias
                 (checklist_id, data_programada, tipo_lavagem, veiculo_placa, item_key, r2_key, mime_type, tamanho_bytes, created_by_uid, created_by_nome, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [row.id, data_programada, tipo_lavagem, placa, item_key, r2Key, mimeType, buffer.length, req.user?.id || null, userName, nowStr]
            );

            // Marca automaticamente o item como 'ok' ao enviar a foto
            let itensObj = {};
            try { itensObj = JSON.parse(row.itens_json || '{}'); } catch (_) { itensObj = {}; }
            const prev = itensObj[item_key] || {};
            itensObj[item_key] = {
                status: 'ok',
                observacao: prev.observacao || '',
                updated_at: nowStr,
                updated_by: userName
            };

            await dbRun(
                `UPDATE app_lavagem_checklist
                 SET itens_json = ?, status = CASE WHEN status = 'concluido' THEN 'concluido' ELSE 'em_andamento' END, updated_at = ?
                 WHERE id = ?`,
                [JSON.stringify(itensObj), nowStr, row.id]
            );

            res.json({
                ok: true,
                midia: {
                    id: ins.lastID,
                    checklist_id: row.id,
                    item_key,
                    url: `/api/app/lavagem/midia/${ins.lastID}`,
                    created_by_nome: userName,
                    created_at: nowStr
                }
            });
        } catch (err) {
            console.error('[APP-LAVAGEM] Erro em POST /midia:', err);
            res.status(500).json({ error: err.message });
        }
    });

    // ─── GET /api/app/lavagem/midia/:id (Stream via Cloudflare R2) ────────────
    app.get('/api/app/lavagem/midia/:id', async (req, res) => {
        try {
            const row = await dbGet(`SELECT * FROM app_lavagem_midias WHERE id = ?`, [req.params.id]);
            if (!row || !row.r2_key) return res.status(404).send('Mídia não encontrada.');
            if (!r2 || !r2.isReady()) return res.status(503).send('R2 indisponível.');

            const { stream, contentType } = await r2.downloadStreamFromR2(row.r2_key);
            res.setHeader('Content-Type', row.mime_type || contentType || 'image/jpeg');
            res.setHeader('Cache-Control', 'public, max-age=31536000');
            stream.pipe(res);
        } catch (err) {
            console.error('[APP-LAVAGEM] Erro ao servir mídia:', err.message);
            res.status(404).send('Erro ao carregar mídia.');
        }
    });

    // ─── DELETE /api/app/lavagem/midia/:id ────────────────────────────────────
    // REGRA OBRIGATÓRIA: NUNCA apagar arquivos do Cloudflare R2 (apenas remove do banco)
    app.delete('/api/app/lavagem/midia/:id', authenticateToken, async (req, res) => {
        try {
            const row = await dbGet(`SELECT * FROM app_lavagem_midias WHERE id = ?`, [req.params.id]);
            if (!row) return res.status(404).json({ error: 'Foto não encontrada.' });

            await dbRun(`DELETE FROM app_lavagem_midias WHERE id = ?`, [req.params.id]);
            res.json({ ok: true });
        } catch (err) {
            console.error('[APP-LAVAGEM] Erro ao remover foto:', err);
            res.status(500).json({ error: err.message });
        }
    });

    // ─── POST /api/app/lavagem/concluir ───────────────────────────────────────
    app.post('/api/app/lavagem/concluir', authenticateToken, async (req, res) => {
        try {
            const { data_programada, tipo_lavagem, veiculo_placa, veiculo_nome, categoria_veiculo, origem_rota, observacoes } = req.body || {};
            if (!data_programada || !tipo_lavagem || !veiculo_placa) {
                return res.status(400).json({ error: 'Dados incompletos para concluir a lavagem.' });
            }

            const placa = normPlaca(veiculo_placa);
            const row = await ensureChecklistRow({
                data_programada,
                tipo_lavagem,
                veiculo_placa: placa,
                veiculo_nome,
                categoria_veiculo,
                origem_rota,
                user: req.user
            });

            const cat = categoria_veiculo || row.categoria_veiculo || 'utilitario';
            const itensDef = getItensChecklistPorCategoria(cat);
            const midias = await dbAll(
                `SELECT item_key FROM app_lavagem_midias WHERE data_programada = ? AND tipo_lavagem = ? AND veiculo_placa = ?`,
                [data_programada, tipo_lavagem, placa]
            );
            const fotosPorItem = new Set(midias.map(m => m.item_key));

            const faltandoFoto = itensDef.filter(it => it.obrigatorio && !fotosPorItem.has(it.key));
            if (faltandoFoto.length > 0) {
                return res.status(400).json({
                    error: `Falta anexar foto em ${faltandoFoto.length} item(ns) obrigatório(s): ${faltandoFoto.map(f => f.label).join(', ')}.`,
                    faltando: faltandoFoto.map(f => f.key)
                });
            }

            const nowStr = new Date().toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' });
            const userName = req.user?.nome || req.user?.username || 'Líder';

            let itensObj = {};
            try { itensObj = JSON.parse(row.itens_json || '{}'); } catch (_) { itensObj = {}; }
            for (const it of itensDef) {
                if (fotosPorItem.has(it.key)) {
                    itensObj[it.key] = {
                        ...(itensObj[it.key] || {}),
                        status: 'ok',
                        updated_at: nowStr,
                        updated_by: userName
                    };
                }
            }

            await dbRun(
                `UPDATE app_lavagem_checklist
                 SET status = 'concluido',
                     itens_json = ?,
                     observacoes = COALESCE(?, observacoes),
                     responsavel_uid = ?,
                     responsavel_nome = ?,
                     concluido_em = ?,
                     updated_at = ?
                 WHERE id = ?`,
                [JSON.stringify(itensObj), observacoes !== undefined ? observacoes : null, req.user?.id || null, userName, nowStr, nowStr, row.id]
            );

            res.json({ ok: true, status: 'concluido', concluido_em: nowStr, responsavel_nome: userName });
        } catch (err) {
            console.error('[APP-LAVAGEM] Erro em POST /concluir:', err);
            res.status(500).json({ error: err.message });
        }
    });
};
