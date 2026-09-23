// ═══════════════════════════════════════════════════════════════════
// fechamento.js — Fechamento Mensal de Folha de Pagamento
// América Rental — versão 3.0 (2026-08-28) — Etapa 3
// ═══════════════════════════════════════════════════════════════════

window._fechamento = (function () {
    'use strict';

    // ─────────────────────────────────────────────────────────────────
    // ESTADO GLOBAL
    // ─────────────────────────────────────────────────────────────────
    let _dados = [];
    var _stateArquivos = { farmacia: false, mercado_texto: null, consignado: false };
    var _dadosPonto = {}; // { colaborador_id: dadosRHID } — persiste entre filtros
    var _dadosMercado = [];
    let _mes = null;
    let _ano = null;

    // ─────────────────────────────────────────────────────────────────
    // Helper: extrai versão slim do ponto (só campos usados na conferência)
    // Reduz os ~11MB da API RHID para ~200KB para guardar no banco
    // ─────────────────────────────────────────────────────────────────
    const _RHID_SLIM_FIELDS = ['records','listaDias','lista','itens','dias','data','items','apuracao','result','results'];
    function _extrairSlimPonto(dadosRHID) {
        if (!dadosRHID) return null;
        var raw = dadosRHID.apuracaoRaw;
        if (!raw) return null;
        var p = typeof raw === 'string' ? (function(){ try { return JSON.parse(raw); } catch(e){ return null; } })() : raw;
        if (!p) return null;
        var arr = null;
        if (Array.isArray(p) && p.length > 0) arr = p;
        else if (typeof p === 'object') {
            for (var f of _RHID_SLIM_FIELDS) { if (Array.isArray(p[f]) && p[f].length > 0) { arr = p[f]; break; } }
            if (!arr) { var k = Object.keys(p).find(function(k){ return Array.isArray(p[k]) && p[k].length > 0; }); if (k) arr = p[k]; }
            if (!arr && (p.date || p.dateTimeStr)) arr = [p];
        }
        if (!arr || arr.length === 0) return null;
        return arr.map(function(dia) {
            return {
                date: dia.date || dia.dateTimeStr,
                status: dia.status, situacao: dia.situacao, tipo: dia.tipo,
                folga: dia.folga, dsrConsideradoMinutos: dia.dsrConsideradoMinutos,
                idHorarioContratual: dia.idHorarioContratual,
                strHorarioContratualSimples: dia.strHorarioContratualSimples,
                totalHorasTrabalhadas: dia.totalHorasTrabalhadas,
                horasTotalNoturno: dia.horasTotalNoturno,
                diasTrabalhados: dia.diasTrabalhados,
                toolTipAlert: dia.toolTipAlert, isFerias: dia.isFerias,
                listAfdtManutencao: dia.listAfdtManutencao, marcacoes: dia.marcacoes,
                isHoliday: dia.isHoliday, holidayName: dia.holidayName,
                idJustification: dia.idJustification,
                faltaDiaInteiro: dia.faltaDiaInteiro, faltasDiasInteiro: dia.faltasDiasInteiro,
                horasFaltaAtraso: dia.horasFaltaAtraso,
                abreviationJustification: dia.abreviationJustification,
                nomeJustificativa: dia.nomeJustificativa,
                horasExtra60: dia.horasExtra60, horasExtra100: dia.horasExtra100,
                horasNoturnasNaoExtra: dia.horasNoturnasNaoExtra,
                percentuaisExtra: dia.percentuaisExtra, horaExtraDeCadaPercentual: dia.horaExtraDeCadaPercentual,
                extraDiurna: dia.extraDiurna, extraNoturna: dia.extraNoturna,
                extraAdicionadaDiurna: dia.extraAdicionadaDiurna, extraAdicionadaNoturna: dia.extraAdicionadaNoturna,
                horasExtrasCalculadas: dia.horasExtrasCalculadas
            };
        });
    }

    // ─────────────────────────────────────────────────────────────────
    // TABELA INSS 2026 (alíquota progressiva)
    // ─────────────────────────────────────────────────────────────────
    const FAIXAS_INSS = [
        { ate: 1412.00,    aliq: 0.075 },
        { ate: 2666.68,    aliq: 0.09  },
        { ate: 4000.03,    aliq: 0.12  },
        { ate: 7786.02,    aliq: 0.14  },
    ];
    const TETO_INSS = 7786.02;

    function calcINSS(salarioBruto) {
        let inss = 0;
        let base = Math.min(salarioBruto, TETO_INSS);
        let limite_ant = 0;
        for (const f of FAIXAS_INSS) {
            if (base <= limite_ant) break;
            const faixa = Math.min(base, f.ate) - limite_ant;
            inss += faixa * f.aliq;
            limite_ant = f.ate;
        }
        return Math.round(inss * 100) / 100;
    }

    // ─────────────────────────────────────────────────────────────────
    // TABELA IRRF 2026
    // ─────────────────────────────────────────────────────────────────
    const FAIXAS_IRRF = [
        { ate: 2259.20,  aliq: 0,     deducao: 0       },
        { ate: 2826.65,  aliq: 0.075, deducao: 169.44  },
        { ate: 3751.05,  aliq: 0.15,  deducao: 381.44  },
        { ate: 4664.68,  aliq: 0.225, deducao: 662.77  },
        { ate: Infinity, aliq: 0.275, deducao: 896.00  },
    ];

    function calcIRRF(baseCalculo) {
        if (baseCalculo <= 0) return 0;
        for (const f of FAIXAS_IRRF) {
            if (baseCalculo <= f.ate) {
                return Math.max(0, Math.round((baseCalculo * f.aliq - f.deducao) * 100) / 100);
            }
        }
        return 0;
    }

    // ─────────────────────────────────────────────────────────────────
    // CONVERSÃO DE HORAS
    // ─────────────────────────────────────────────────────────────────
    function horasParaFloat(str) {
        if (!str) return 0;
        const [h, m] = String(str).split(':').map(Number);
        return (h || 0) + (m || 0) / 60;
    }

    // ─────────────────────────────────────────────────────────────────
    // CALCULAR VALORES DO COLABORADOR
    // ─────────────────────────────────────────────────────────────────
    function calcularColaborador(row) {
        const salario = parseFloat(row.salario) || 0;
        const insalubridade = parseInt(row.folha_insalubridade) === 1 ? (parseFloat(row.folha_insalubridade_valor) || 0) : 0;
        const periculosidade = parseInt(row.folha_periculosidade) === 1 ? (parseFloat(row.folha_periculosidade_valor) || 0) : 0;
        const plr = parseFloat(row.plr) || 0;
        const horasNormais = horasParaFloat(row.horas_normais) || 220;
        const extra60h = horasParaFloat(row.extra_60);
        const extra100h = horasParaFloat(row.extra_100);
        const valorHora = salario / horasNormais;
        const valorExtra60 = extra60h * valorHora * 1.6;
        const valorExtra100 = extra100h * valorHora * 2.0;
        const totalBruto = salario + insalubridade + periculosidade + plr
                         + valorExtra60 + valorExtra100 + parseFloat(row.comissao || 0)
                         + parseFloat(row.bonus_comissao || 0) + parseFloat(row.premio || 0);
        const inss = calcINSS(totalBruto);
        const baseIRRF = totalBruto - inss;
        const irrf = calcIRRF(baseIRRF);
        const diasMes = horasNormais / 8;
        const descontoFalta = (parseInt(row.dias_falta) || 0) > 0 ? (salario / diasMes) * (parseInt(row.dias_falta) || 0) : 0;
        const descontoAtraso = horasParaFloat(row.horas_atraso) * valorHora;
        const vt = parseFloat(row.vt) || 0;
        const farmacia = parseFloat(row.farmacia) || 0;
        const mercado = parseFloat(row.mercado) || 0;
        const outros = parseFloat(row.outros) || 0;
        const multas = parseFloat(row.multas) || 0;
        const academia = parseFloat(row.academia) || 0;
        const consignado = parseFloat(row.consignado) || 0;
        const adiantamento = (row.adiantamento_salarial === 'Sim' || row.adiantamento_salarial === '1')
                            ? (parseFloat(row.adiantamento_valor) || 0) : 0;
        let pensao = 0;
        if (row.folha_pensao_tipo && parseFloat(row.folha_pensao_pct) > 0) {
            const pct = parseFloat(row.folha_pensao_pct) / 100;
            if (row.folha_pensao_tipo === 'bruto') {
                pensao = Math.round(totalBruto * pct * 100) / 100;
            } else {
                pensao = Math.round((totalBruto - inss - irrf) * pct * 100) / 100;
            }
        }
        const sindical = parseInt(row.folha_mensalidade_sindical) === 1 ? (parseFloat(row.folha_mensalidade_sindical_valor) || 0) : 0;
        const totalDescontos = inss + irrf + descontoFalta + descontoAtraso
                             + vt + farmacia + mercado + outros + multas
                             + academia + consignado + adiantamento + pensao + sindical;
        const liquido = Math.max(0, totalBruto - totalDescontos);
        return {
            totalBruto: Math.round(totalBruto * 100) / 100,
            inss: Math.round(inss * 100) / 100,
            irrf: Math.round(irrf * 100) / 100,
            descontoFalta: Math.round(descontoFalta * 100) / 100,
            descontoAtraso: Math.round(descontoAtraso * 100) / 100,
            valorExtra60: Math.round(valorExtra60 * 100) / 100,
            valorExtra100: Math.round(valorExtra100 * 100) / 100,
            pensao: Math.round(pensao * 100) / 100,
            totalDescontos: Math.round(totalDescontos * 100) / 100,
            liquido: Math.round(liquido * 100) / 100,
        };
    }

    // ─────────────────────────────────────────────────────────────────
    // CONFERÊNCIA DE PONTO
    // ─────────────────────────────────────────────────────────────────
    function abrirConferenciaPonto(idx = null) {
        // Garantir que _mes e _ano estejam definidos mesmo sem ter clicado em Buscar
        if (!_mes || !_ano) {
            const selMes = document.getElementById('fech-select-mes');
            const selAno = document.getElementById('fech-select-ano');
            if (selMes) _mes = parseInt(selMes.value);
            if (selAno) _ano = parseInt(selAno.value);
        }
        if (!_dadosPonto || Object.keys(_dadosPonto).length === 0) {
            try { var _ss = localStorage.getItem('_fech_dp_'+_mes+'_'+_ano); if (_ss) Object.assign(_dadosPonto, JSON.parse(_ss)); } catch(_e3) {}
        }

        // Se _dados ainda está vazio, precisamos buscar o fechamento do mês primeiro
        if (!_dados || _dados.length === 0) {
            buscar().then(function() { abrirConferenciaPonto(idx); });
            return;
        }

        const colabs = idx !== null ? [_dados[idx]] : _dados.filter(r => r.nome_completo);

        // ── Helper: extrair array de dias de apuracaoRaw (qualquer formato RHID) ──
        // Mesma lógica de extrairDiaria usada em recibos.js
        const _RHID_FIELDS = ['records','listaDias','lista','itens','dias','data','items','apuracao','result','results'];
        function extrairArr(raw2) {
            if (!raw2) return null;
            let p = typeof raw2 === 'string'
                ? (function(){ try { return JSON.parse(raw2); } catch(e){ return null; } })()
                : raw2;
            if (!p) return null;
            if (Array.isArray(p)) return p.length > 0 ? p : null;
            if (typeof p === 'object') {
                for (const f of _RHID_FIELDS) { if (Array.isArray(p[f]) && p[f].length > 0) return p[f]; }
                const anyKey = Object.keys(p).find(function(k){ return Array.isArray(p[k]) && p[k].length > 0; });
                if (anyKey) return p[anyKey];
                if (p.date || p.dateTimeStr) return [p];
            }
            return null;
        }

        // ── Helper: hora em HHMM → "HH:MM" (832 = "08:32") ──
        function fmtHHMM(hhmm) {
            const n = parseInt(hhmm) || 0;
            if (n === 0) return '';
            return String(Math.floor(n / 100)).padStart(2, '0') + ':' + String(n % 100).padStart(2, '0');
        }

        // ── Helper: minutos → "HH:MM" ──
        function fmtMin(min) {
            const m = parseInt(min) || 0;
            if (m === 0) return '';
            return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
        }

        const mesNome = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto',
                         'Setembro','Outubro','Novembro','Dezembro'][parseInt(_mes) - 1] || _mes;

        // ── Sem dados de sessão (F5): tabela resumo com totais salvos ──
        if (!_dadosPonto || Object.keys(_dadosPonto).length === 0) {
            let rows = '';
            colabs.forEach(function(row) {
                rows += `<tr style="border-bottom:1px solid #e2e8f0">
                    <td style="padding:5px 8px;text-align:left">${row.nome_completo}</td>
                    <td style="padding:5px 8px;text-align:center">${row.horas_noturnas || '—'}</td>
                    <td style="padding:5px 8px;text-align:center">${row.extra_60 || '—'}</td>
                    <td style="padding:5px 8px;text-align:center">${row.extra_100 || '—'}</td>
                    <td style="padding:5px 8px;text-align:center">${row.dias_falta || 0}</td>
                    <td style="padding:5px 8px;text-align:center">${row.horas_atraso || '—'}</td>
                    <td style="padding:5px 8px;text-align:center">${row.dsr || '—'}</td>
                </tr>`;
            });
            const html2 = `<div style="font-size:0.8rem;color:#64748b;margin-bottom:10px;text-align:center">
                ℹ️ Dados de ponto brutos são de sessão apenas. Para o detalhamento dia a dia, clique em <b>Buscar Ponto</b> novamente.<br>Exibindo totais salvos no fechamento:
            </div>
            <div style="max-height:60vh;overflow-y:auto">
            <table style="width:100%;border-collapse:collapse;font-size:0.82rem">
                <thead><tr style="background:#f1f5f9;font-weight:600">
                    <th style="padding:6px 8px;text-align:left">Colaborador</th>
                    <th style="padding:6px 8px">Noturnas</th><th style="padding:6px 8px">Ext.60%</th>
                    <th style="padding:6px 8px">Ext.100%</th><th style="padding:6px 8px">Faltas</th>
                    <th style="padding:6px 8px">Atraso</th><th style="padding:6px 8px">DSR</th>
                </tr></thead>
                <tbody>${rows}</tbody>
            </table></div>`;
            Swal.fire({ title: 'Conferência de Ponto (Totais)', html: html2, width: '900px', showCloseButton: true, confirmButtonText: 'Fechar', confirmButtonColor: '#0f172a' });
            return;
        }

        // ── Com dados de sessão: popup com tabela detalhada ──
        const _DIAS_SEM = ['DOM','SEG','TER','QUA','QUI','SEX','SAB'];
        let corpo = '';
        let achou = false;

        colabs.forEach(function(row) {
            const ponto = _dadosPonto[row.colaborador_id] || _dadosPonto[row.id];
            const apArr = extrairArr(ponto && ponto.apuracaoRaw);
            if (!apArr || apArr.length === 0) return;
            achou = true;

            const thSt = 'padding:5px 4px;border:1px solid #1a335a;text-align:center;font-size:10px;white-space:nowrap;';
            let rowsHtml = '';
            // Acumuladores para linha de Totais
            let totNoturno = 0, totFaltaAtraso = 0, totAbono = 0, totExtra60 = 0, totExtra100 = 0, _sumTrab = 0;

            apArr.forEach(function(dia) {
                const dtStr  = String(dia.date || dia.dateTimeStr || '').substring(0, 10);
                const diaNum = dtStr.substring(8, 10) || '?';
                const mesNum = dtStr.substring(5, 7) || '';
                const dtObj  = new Date(dtStr + 'T12:00:00');
                const diaSem = !isNaN(dtObj.getTime()) ? dtObj.getDay() : -1;
                const diaLabel = diaNum + '/' + mesNum + ' ' + (_DIAS_SEM[diaSem] || '');

                // ── Status do dia (var: sem TDZ) ─────────────────────────────
                var _stRaw     = (dia.status || dia.situacao || dia.tipo || '').toString().toLowerCase();
                var _isFolgaSt  = _stRaw.includes('folg') || _stRaw.includes('dsr');
                var _isFolgaFlag = dia.folga === true;
                var _isDSRMin   = (dia.dsrConsideradoMinutos || 0) > 0;
                var _semHorario  = ((dia.idHorarioContratual || 0) === 0 && (dia.strHorarioContratualSimples || '').trim() === '');
                var _horasTrab3  = (dia.totalHorasTrabalhadas || 0) + (dia.horasTotalNoturno || 0);
                var _trabalhou3  = (dia.diasTrabalhados || 0) > 0 || _horasTrab3 > 0;
                var _tipLow     = (dia.toolTipAlert || '').toLowerCase();
                var _isFerias3  = dia.isFerias === true || _tipLow.includes('férias') || _tipLow.includes('ferias') || _tipLow.includes('vacation');
                
                if (!_isFerias3) {
                    var _mF3 = dia.listAfdtManutencao || [];
                    var _semTrab3 = (dia.diasTrabalhados || 0) === 0 && (dia.totalHorasTrabalhadas || 0) === 0;
                    var _dtObj3 = new Date(String(dia.date || dia.dateTimeStr || '').substring(0,10) + 'T12:00:00');
                    var _diaSem3 = !isNaN(_dtObj3.getTime()) ? _dtObj3.getDay() : -1;
                    if (_semTrab3 && _mF3.length > 0) {
                        if (_mF3.every(function(m){ return m._typeRegister === 'I'; }) && dia.idJustification) _isFerias3 = true;
                    }
                }
                
                var diaFalta = parseInt(dia.faltaDiaInteiro) || parseInt(dia.faltasDiasInteiro) || 0;

                // Definir Status Baseado nas regras
                var _tipo = '';
                if (_isFerias3)                                                       _tipo = 'ferias';
                else if (dia.isHoliday)                                               _tipo = 'feriado';
                else if (dia.idJustification) {
                    if (_tipLow.includes('atestado') || _tipLow.includes('medic'))    _tipo = 'atestado';
                    else if (_tipLow.includes('externo') || _tipLow.includes('trab. ext')) _tipo = 'trab_externo';
                    else _tipo = 'justificado';
                }
                else if ((_isFolgaSt || _isFolgaFlag || _isDSRMin) && _horasTrab3 < 120) _tipo = 'folga';
                else if (_semHorario && !_trabalhou3)                                 _tipo = 'folga';
                else if (diaFalta > 0)                                                _tipo = 'falta';

                // Horário Previsto base
                var _prevStr = (dia.strHorarioContratualSimples || '').trim().replace(/[\r\n]+/g, ' ');
                var _prevTexto = _prevStr;
                
                // Marcações — hora no formato HHMM (832 = 08:32)
                let marcacoes = [];
                if (dia.listAfdtManutencao && dia.listAfdtManutencao.length > 0) {
                    marcacoes = dia.listAfdtManutencao.map(function(m) {
                        let suf = '';
                        if (m.isManual || m._typeRegister === 'I') suf += ' (I)';
                        else if (m.isPreAssigned || m.preAssigned || m._typeRegister === 'P') suf += ' (P)';
                        else if (m._typeRegister === 'M' || m._typeRegister === 'W' || m.isMobile || (m._typeRegister === 'O' && !m.pis)) suf += ' (M)';
                        else if (m._typeRegister === 'C' || m.isIdFace) suf += ' (C)';
                        
                        return fmtHHMM(m.hora) + suf;
                    });
                } else if (dia.marcacoes && Array.isArray(dia.marcacoes)) {
                    marcacoes = dia.marcacoes.map(function(m) { return m.hora || m.time || m; });
                }
                var e1 = marcacoes[0] || '';
                var s1 = marcacoes[1] || '';
                var e2 = marcacoes[2] || '';
                var s2 = marcacoes[3] || '';

                var hasPunches = (e1 !== '' || s1 !== '' || e2 !== '' || s2 !== '');

                // Textos Especiais
                var txtEspecial = '';
                if (_tipo === 'feriado') txtEspecial = 'Feriado' + (dia.holidayName ? ': ' + dia.holidayName : '');
                else if (_tipo === 'folga') txtEspecial = 'Folga';
                else if (_tipo === 'ferias') txtEspecial = 'Férias';
                else if (_tipo === 'atestado') txtEspecial = 'Atestado Médico';
                else if (_tipo === 'justificado') txtEspecial = dia.toolTipAlert ? dia.toolTipAlert.substring(0, 20) : 'Justificado';
                else if (_tipo === 'trab_externo') txtEspecial = 'Trab. Externo';
                else if (_tipo === 'falta') txtEspecial = 'Falta';

                var ent1='', sai1='', ent2='', sai2='';

                if (!hasPunches && txtEspecial) {
                    // Ausência Integral: O texto vai para o Dia Previsto. Colunas de batidas ficam vazias.
                    _prevTexto = txtEspecial;
                } else if (hasPunches) {
                    // Ausência Parcial ou Trabalho Normal
                    // Se folgou/feriado mas tem batida (hora extra), deixa previsto vazio.
                    _prevTexto = (_tipo === 'folga' || _tipo === 'feriado' || _tipo === 'ferias') ? '' : _prevStr;
                    
                    ent1 = e1; sai1 = s1; ent2 = e2; sai2 = s2;
                    
                    // Preencher buracos com o motivo se for falta parcial / justificativa parcial
                    if (_tipo === 'falta' || _tipo === 'justificado' || _tipo === 'atestado' || _tipo === 'trab_externo') {
                        if (!ent1) ent1 = txtEspecial;
                        if (!sai1) sai1 = txtEspecial;
                        if (!ent2) ent2 = txtEspecial;
                        if (!sai2) sai2 = txtEspecial;
                    }
                } else {
                    ent1 = e1; sai1 = s1; ent2 = e2; sai2 = s2;
                }

                // Totais
                const normaisMin = (dia.totalHorasTrabalhadas || 0) + (dia.horasTotalNoturno || 0);
                const normais = fmtMin(normaisMin);
                const noturnMin = (dia.totalHorasTrabalhadas > 0) ? (dia.horasNoturnasNaoExtra || 0) : 0;
                const noturn = fmtMin(noturnMin);

                // Atraso e Abono
                const faltaAtrMin = parseInt(dia.horasFaltaAtraso) || 0;
                const faltaAtr = fmtMin(faltaAtrMin);
                const abono = (dia.abreviationJustification || dia.nomeJustificativa || '').substring(0, 12);

                // Extra 60% / 100%
                const pcts  = Array.isArray(dia.percentuaisExtra) ? dia.percentuaisExtra : [];
                const hexts = Array.isArray(dia.horaExtraDeCadaPercentual) ? dia.horaExtraDeCadaPercentual : [];
                let min60 = 0, min100 = 0;
                pcts.forEach(function(pct, i) {
                    const p2 = Math.round(parseFloat(String(pct || '').trim().replace(',', '.').replace('%', '')) || 0);
                    if (p2 === 60)  min60  += parseInt(hexts[i]) || 0;
                    if (p2 === 100) min100 += parseInt(hexts[i]) || 0;
                });
                const extra60  = fmtMin(min60);
                const extra100 = fmtMin(min100);
                const totTrab  = fmtMin(dia.totalHorasTrabalhadas || 0);

                // ── Estética das Cores ─────────────────────────────────────────────                // 🔹 Estética das Cores 🔹
                // Fallback para horas extras caso o array de percentuais venha vazio
                // Prioridade 1: campos diretos do slim (banco)
                if (min60 === 0 && dia.horasExtra60) min60 = parseInt(dia.horasExtra60) || 0;
                if (min100 === 0 && dia.horasExtra100) min100 = parseInt(dia.horasExtra100) || 0;
                // Prioridade 2: outros campos legacy da API
                if (min60 === 0 && min100 === 0) {
                    const exTot = Math.max(0, dia.extraDiurna || dia.extraAdicionadaDiurna || 0) + Math.max(0, dia.extraNoturna || dia.extraAdicionadaNoturna || 0) || Math.max(0, dia.horasExtrasCalculadas || 0);
                    if (dia.isHoliday || _isFolgaFlag || _isFolgaSt || diaLabel.includes('DOM')) min100 = exTot;
                    else min60 = exTot;
                }

                // Variáveis para a hierarquia
                const isFaltaIntegral = (_tipo === 'falta' && !hasPunches);
                const isFerias = (_tipo === 'ferias');
                const isJustificado = (_tipo === 'justificado' || _tipo === 'atestado' || txtEspecial.includes('Justificado') || txtEspecial.includes('Atestado'));
                const isFolga = (_tipo === 'folga' || _tipo === 'feriado');
                const isEdicaoManual = marcacoes.some(m => typeof m === 'string' && m.includes('(I)'));
                
                // Cálculo para mais de 12h
                const minTotaisTrabalhados = normaisMin;
                const is12x36 = ((row.escala_tipo || '').toLowerCase().includes('12x36') || (_prevStr || '').toLowerCase().includes('12x36'));
                const isMaisDe12h = (minTotaisTrabalhados > 720 && !is12x36);
                const atrasoMinutos = (dia.horasFaltaAtraso || 0);
                // Acumular para linha de totais
                totNoturno     += noturnMin;
                totFaltaAtraso += (dia.horasFaltaAtraso || 0);
                totAbono       += (dia.horasAbono || dia.abono || 0);
                totExtra60     += min60;
                totExtra100    += min100;
                _sumTrab       += (dia.totalHorasTrabalhadas || 0);

                var bg = '#fff';
                if (isFaltaIntegral) bg = '#fe7884';      // 1. Falta Integral
                else if (isFerias) bg = '#fef9c3';        // 2. Férias
                else if (isJustificado) bg = '#fee2e2';   // 3. Justificado
                else if (isFolga && !hasPunches) bg = '#cdd1d4'; // 4. Folga
                else if (isEdicaoManual) bg = '#feae67';  // 5. Apontamento Manual
                else if (isMaisDe12h) bg = '#cb79ff';     // 6. > 12h seguidas
                else if (min100 > 15) bg = '#93c5fd';     // 7. Extra 100%
                else if (min60 > 15) bg = '#dbeafe';      // 8. Extra 60%
                else if (noturnMin > 0) bg = '#fbcfe8';   // 9. Noturno
                else if (atrasoMinutos > 15) bg = '#fde047'; // 10. Atraso

                // Negrito nas inserções manuais e nas batidas reais de dias justificados-parciais
                const isLogistica = (row.departamento || '').toLowerCase().includes('ajudante geral') || (row.departamento || '').toLowerCase().includes('motorista');

                const formatManual = (str, isTargetCol) => {
                    if (typeof str !== 'string' || !str) return str;
                    let out = str;
                    if (out.includes('(I)')) out = `<b>${out}</b>`;
                    else if (isJustificado && hasPunches && out !== 'Justificado' && out !== 'Falta') out = `<b>${out}</b>`;
                    
                    if (isLogistica && isTargetCol && out.includes('(M)')) {
                        out = `<span style="background-color: #fee2e2; color: #dc2626; padding: 2px 4px; border-radius: 4px; font-weight: 700; border: 1px solid #fca5a5; display: inline-block; line-height: 1;">${out}</span>`;
                    }
                    return out;
                };
                const ent1_td = formatManual(ent1, true);
                const sai1_td = formatManual(sai1, false);
                const ent2_td = formatManual(ent2, false);
                const sai2_td = formatManual(sai2, true);

                const fontColor = isJustificado ? '#b91c1c' : '#111';
                const tdSt = 'padding:4px 3px;border-bottom:1px solid #e2e8f0;text-align:center;font-size:10.5px;';
                const fC = diaFalta > 0 ? 'color:#111;font-weight:700;' : '';

                rowsHtml += `<tr style="background:${bg};color:${fontColor};">
                    <td style="${tdSt}text-align:left;white-space:nowrap;color:#111;">${diaLabel}</td>
                    <td style="${tdSt}font-size:9.5px;word-break:break-word;max-width:90px;">${_prevTexto}</td>
                    <td style="${tdSt}white-space:nowrap;">${ent1_td}</td>
                    <td style="${tdSt}white-space:nowrap;">${sai1_td}</td>
                    <td style="${tdSt}font-size:9.5px;">${ent2_td}</td>
                    <td style="${tdSt}white-space:nowrap;">${sai2_td}</td>
                    
                    <td style="${tdSt}">${noturn}</td>
                    
                    <td style="${tdSt}">${fmtMin(dia.horasFaltaAtraso || 0)}</td>
                    <td style="${tdSt}">${fmtMin(dia.horasAbono || dia.abono || 0)}</td>
                    <td style="${tdSt}">${fmtMin(min60)}</td>
                    <td style="${tdSt}">${fmtMin(min100)}</td>
                    <td style="${tdSt}font-weight:bold;color:#1d4ed8;">${totTrab}</td>
                </tr>`;
            });

            corpo += `
            <div style="page-break-after:always;padding:12px;">
              <h2 style="margin:0 0 3px;color:#1e293b;font-size:14px;">Conferência de Ponto — ${row.nome_completo}</h2>
              <p style="margin:0 0 10px;font-size:11px;color:#475569;">${mesNome}/${_ano}</p>
              <div style="overflow-x:auto;">
              <table style="width:100%;border-collapse:collapse;font-size:11px;table-layout:fixed;">
                <colgroup>
                  <col style="width:10%"><col style="width:18%">
                  <col style="width:7%"><col style="width:7%"><col style="width:7%"><col style="width:7%">
                  <col style="width:8%"><col style="width:8%"><col style="width:6%"><col style="width:7%">
                  <col style="width:7%"><col style="width:8%">
                </colgroup>
                <thead>
                  <tr style="background:#1e293b;color:#fff;">
                    <th style="${thSt}text-align:left;">DATA</th>
                    <th style="${thSt}">DIA PREVISTO</th>
                    <th style="${thSt}">ENT. 1</th>
                    <th style="${thSt}">SAÍ. 1</th>
                    <th style="${thSt}">ENT. 2</th>
                    <th style="${thSt}">SAÍ. 2</th>
                    
                    <th style="${thSt}">TOT. NOTURNO</th>
                    
                    <th style="${thSt}">FALTA/ATRASO</th>
                    <th style="${thSt}">ABONO</th>
                    <th style="${thSt}">EXTRA 60%</th>
                    <th style="${thSt}">EXTRA 100%</th>
                    <th style="${thSt}">TOT. TRAB.</th>
                  </tr>
                </thead>
                <tbody>${rowsHtml}<tr style="background:#0f172a;color:#fff;font-weight:700;"><td style="${thSt}text-align:left;border-color:#0f172a;" colspan="6">TOTAIS DO MÊS</td><td style="${thSt}">${fmtMin(totNoturno)}</td><td style="${thSt}">${fmtMin(totFaltaAtraso)}</td><td style="${thSt}">${fmtMin(totAbono)}</td><td style="${thSt}">${fmtMin(totExtra60)}</td><td style="${thSt}">${fmtMin(totExtra100)}</td><td style="${thSt}color:#93c5fd;">${fmtMin(_sumTrab)}</td></tr></tbody>
              </table>
              </div>
            </div>`;
        });

        // Legenda de cores atualizada (Popup Separado)
        const legenda = `
<script>
function abrirLegenda() {
    var w = window.open('', 'LegendaPonto', 'width=520,height=420,resizable=no,left=150,top=150');
    if(!w) return alert('Por favor, permita popups para abrir a legenda.');
    w.document.write('<html style="font-family:sans-serif;background:#f8fafc;padding:20px;">' +
    '<head><title>Legenda do Ponto</title></head>' +
    '<body style="margin:0;">' +
        '<h3 style="margin-top:0;font-size:16px;color:#1e293b;border-bottom:1px solid #e2e8f0;padding-bottom:10px;display:flex;align-items:center;gap:8px;">💡 Legenda do Ponto</h3>' +
        '<p style="font-size:11px;font-weight:700;color:#64748b;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.5px;">Cores da Tabela</p>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:12px;color:#334155;margin-bottom:20px;">' +
            '<span style="display:inline-flex;align-items:center;"><span style="display:inline-block;width:12px;height:12px;background:#fe7884;border:1px solid #dc2626;border-radius:3px;margin-right:8px;"></span> Falta Integral</span>' +
            '<span style="display:inline-flex;align-items:center;"><span style="display:inline-block;width:12px;height:12px;background:#fee2e2;border:1px solid #fca5a5;border-radius:3px;margin-right:8px;"></span> Justificado</span>' +
            '<span style="display:inline-flex;align-items:center;"><span style="display:inline-block;width:12px;height:12px;background:#fef9c3;border:1px solid #fde047;border-radius:3px;margin-right:8px;"></span> Férias</span>' +
            '<span style="display:inline-flex;align-items:center;"><span style="display:inline-block;width:12px;height:12px;background:#cdd1d4;border:1px solid #94a3b8;border-radius:3px;margin-right:8px;"></span> Folga</span>' +
            '<span style="display:inline-flex;align-items:center;"><span style="display:inline-block;width:12px;height:12px;background:#feae67;border:1px solid #f97316;border-radius:3px;margin-right:8px;"></span> Apont. Manual</span>' +
            '<span style="display:inline-flex;align-items:center;"><span style="display:inline-block;width:12px;height:12px;background:#cb79ff;border:1px solid #a855f7;border-radius:3px;margin-right:8px;"></span> > 12h Seguidas</span>' +
            '<span style="display:inline-flex;align-items:center;"><span style="display:inline-block;width:12px;height:12px;background:#93c5fd;border:1px solid #3b82f6;border-radius:3px;margin-right:8px;"></span> Extra 100%</span>' +
            '<span style="display:inline-flex;align-items:center;"><span style="display:inline-block;width:12px;height:12px;background:#dbeafe;border:1px solid #93c5fd;border-radius:3px;margin-right:8px;"></span> Extra 60%</span>' +
            '<span style="display:inline-flex;align-items:center;"><span style="display:inline-block;width:12px;height:12px;background:#fbcfe8;border:1px solid #f472b6;border-radius:3px;margin-right:8px;"></span> Noturno</span>' +
            '<span style="display:inline-flex;align-items:center;"><span style="display:inline-block;width:12px;height:12px;background:#fde047;border:1px solid #eab308;border-radius:3px;margin-right:8px;"></span> Atraso</span>' +
        '</div>' +
        '<p style="font-size:11px;font-weight:700;color:#64748b;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.5px;">Nomenclaturas de Marcação</p>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:12px;color:#334155;font-weight:600;">' +
            '<span>(I) = Incluído</span>' +
            '<span>(P) = Pré-assinalado</span>' +
            '<span>(M) = Coletor REP-P Mobile/Web</span>' +
            '<span>(C) = Coletor REP-P (iDFace/iDFlex)</span>' +
        '</div>' +
    '</body>' +
    '</html>');
    w.document.close();
}
</script>
`;

        const fullHtml = `<!DOCTYPE html><html><head>
            <title>Conferência de Ponto - ${mesNome}/${_ano}</title>
            <style>body{font-family:Arial,sans-serif;font-size:12px;color:#111;margin:0;}@media print{.no-print{display:none!important;}}</style>
        </head><body>
        ${legenda}
        <div class="no-print" style="background:#1e293b;color:#fff;padding:10px 20px;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;z-index:999;flex-wrap:wrap;gap:8px;">
            <span style="font-weight:700;font-size:14px;">Conferência de Ponto - ${mesNome}/${_ano}</span>
            <div style="display:flex; gap:12px; align-items:center;">
                <button onclick="abrirLegenda()" style="background:#334155;color:#f8fafc;border:1px solid #475569;padding:8px 16px;border-radius:6px;font-weight:600;cursor:pointer;font-size:13px;display:flex;align-items:center;gap:6px;transition:all 0.2s;" onmouseover="this.style.background='#475569'" onmouseout="this.style.background='#334155'">
                    💡 Ver Legenda
                </button>
                <button onclick="window.print()" style="background:#fff;color:#1e293b;border:none;padding:8px 20px;border-radius:6px;font-weight:700;cursor:pointer;font-size:13px;">🖨️ Imprimir / Salvar PDF</button>
            </div>
        </div>
        ${achou ? corpo : '<div style="padding:40px;text-align:center;color:#64748b;font-size:14px;">Nenhum detalhe de ponto diário disponível.<br>Os dados de apuração diária não foram encontrados na resposta do RHID.</div>'}
        </body></html>`;

        const win = window.open('', '_blank', 'width=' + screen.availWidth + ',height=' + screen.availHeight + ',top=0,left=0');
        if (win) { win.document.write(fullHtml); win.document.close(); }
        else {
            var _ov2 = document.getElementById('_conf-ponto-overlay'); if (_ov2) _ov2.remove();
            var _div2 = document.createElement('div');
            _div2.id = '_conf-ponto-overlay';
            _div2.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:#fff;z-index:99999;overflow-y:auto;font-family:Arial,sans-serif;';
            var _bar = document.createElement('div');
            _bar.style.cssText = 'background:#1e293b;color:#fff;padding:10px 16px;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;z-index:9999;gap:8px;flex-wrap:wrap;';
            _bar.innerHTML = '<span style="font-weight:700;font-size:13px;">Conf. de Ponto — ' + mesNome + '/' + _ano + '</span>';
            var _btnPrint = document.createElement('button');
            _btnPrint.textContent = '🖨 Imprimir PDF'; _btnPrint.onclick = function(){ window.print(); };
            _btnPrint.style.cssText = 'background:#fff;color:#1e293b;border:none;padding:6px 14px;border-radius:5px;font-weight:700;cursor:pointer;font-size:12px;';
            var _btnClose = document.createElement('button');
            _btnClose.textContent = '✕ Fechar'; _btnClose.onclick = function(){ document.getElementById('_conf-ponto-overlay').remove(); };
            _btnClose.style.cssText = 'background:#ef4444;color:#fff;border:none;padding:6px 14px;border-radius:5px;font-weight:700;cursor:pointer;font-size:12px;';
            var _btnBar = document.createElement('div'); _btnBar.style.cssText = 'display:flex;gap:8px;';
            _btnBar.appendChild(_btnPrint); _btnBar.appendChild(_btnClose);
            _bar.appendChild(_btnBar); _div2.appendChild(_bar);
            var _legDiv = document.createElement('div'); _legDiv.innerHTML = legenda; _div2.appendChild(_legDiv);
            var _bodyDiv = document.createElement('div'); _bodyDiv.innerHTML = achou ? corpo : '<div style="padding:40px;text-align:center;color:#64748b;">Nenhum detalhe disponível.</div>'; _div2.appendChild(_bodyDiv);
            document.body.appendChild(_div2);
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // FORMATAR MOEDA
    // ─────────────────────────────────────────────────────────────────
    function fmt(v) {
        return 'R$ ' + (parseFloat(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function getToken() {
        return window.currentToken || localStorage.getItem('erp_token') || '';
    }
    function fmtBRL(valor) {
        return 'R$ ' + parseFloat(valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    // ─────────────────────────────────────────────────────────────────
    // RENDERIZAR CONTAINER PRINCIPAL
    // ─────────────────────────────────────────────────────────────────
    function renderizarTela() {
        const container = document.getElementById('fechamento-container');
        if (!container) return;
        const hoje = new Date();
        const mesAtual = hoje.getMonth() + 1;
        const anoAtual = hoje.getFullYear();

        container.innerHTML = `
<div style="padding:1.5rem;max-width:100%;">

  <!-- HEADER: título + seletores -->
  <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem;margin-bottom:1rem;">
    <div>
    <div style="display:flex;align-items:center;gap:12px;">
      <h2 style="margin:0;color:#1e40af;font-size:1.4rem;">Fechamento Mensal de Folha</h2>
      <button onclick="window.mostrarRegrasFechamento()" title="Regras de Cores da Conferência"
        style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;background:#fef08a;color:#854d0e;border:1px solid #fde047;border-radius:8px;cursor:pointer;transition:background .2s;flex-shrink:0;padding:0;"
        onmouseover="this.style.background='#fde047'" onmouseout="this.style.background='#fef08a'">
        <i class="ph ph-lightbulb" style="font-size:1.1rem;"></i>
      </button>
    </div>
      <p style="margin:.2rem 0 0;color:#6b7280;font-size:.9rem;">Preencha os dados, faça uploads e gere a planilha para a contabilidade.</p>
    </div>
    <div style="display:flex;gap:.6rem;align-items:center;flex-wrap:wrap;">
      <select id="fech-select-mes" style="padding:.45rem .7rem;border:1px solid #d1d5db;border-radius:.5rem;font-size:.9rem;">
        ${['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'].map((m,i)=>
          `<option value="${i+1}" ${i+1===mesAtual?'selected':''}>${m}</option>`
        ).join('')}
      </select>
      <select id="fech-select-ano" style="padding:.45rem .7rem;border:1px solid #d1d5db;border-radius:.5rem;font-size:.9rem;">
        ${[anoAtual-1,anoAtual,anoAtual+1].map(a=>`<option value="${a}" ${a===anoAtual?'selected':''}>${a}</option>`).join('')}
      </select>
      <button onclick="window._fechamento.buscar()" style="background:#1e40af;color:#fff;border:none;padding:.5rem 1rem;border-radius:.5rem;font-size:.9rem;cursor:pointer;">
        <i class="ph ph-magnifying-glass"></i> Buscar
      </button>
    </div>
  </div>

  <!-- TOOLBAR DE AÇÕES (aparece após buscar) -->
  <div id="fech-toolbar" style="display:none;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:.75rem;padding:.75rem 1rem;margin-bottom:1rem;display:none;flex-wrap:wrap;gap:.5rem;align-items:center;">
    <span style="font-weight:600;color:#374151;font-size:.85rem;margin-right:.5rem;">Ações:</span>

    <!-- Upload Farmácia -->
    <label style="background:#0891b2;color:#fff;padding:.4rem .85rem;border-radius:.4rem;font-size:.82rem;cursor:pointer;display:flex;align-items:center;gap:.35rem;">
      <i class="ph ph-upload-simple"></i> Farmácia (PDF)
      <input type="file" accept=".pdf" style="display:none;" onchange="window._fechamento.uploadFarmacia(this)">
    </label>

    <!-- Olho Farmácia -->
    <button id="fech-btn-eye-farmacia" onclick="window._fechamento.verFarmacia()" style="background:#0e7490;color:#fff;border:none;padding:.4rem .5rem;border-radius:.4rem;font-size:.82rem;cursor:pointer;display:none;" title="Ver dados farmácia carregados"><i class="ph ph-eye"></i></button>

    <!-- Upload Consignado -->
    <label style="background:#7c3aed;color:#fff;padding:.4rem .85rem;border-radius:.4rem;font-size:.82rem;cursor:pointer;display:flex;align-items:center;gap:.35rem;">
      <i class="ph ph-upload-simple"></i> Consignado (XLSX)
      <input type="file" accept=".xlsx,.xls" style="display:none;" onchange="window._fechamento.uploadConsignado(this)">
    </label>

    <!-- Olho Consignado -->
    <button id="fech-btn-eye-consignado" onclick="window._fechamento.verConsignado()" style="background:#6d28d9;color:#fff;border:none;padding:.4rem .5rem;border-radius:.4rem;font-size:.82rem;cursor:pointer;display:none;" title="Ver consignado carregado"><i class="ph ph-eye"></i></button>

    <!-- Upload Mercado PDFs -->
    <label id="fech-label-mercado" style="background:#d97706;color:#fff;padding:.4rem .85rem;border-radius:.4rem;font-size:.82rem;cursor:pointer;display:flex;align-items:center;gap:.35rem;">
      <i class="ph ph-shopping-cart"></i> Mercado (PDFs)
      <input type="file" accept=".pdf" multiple style="display:none;" onchange="window._fechamento.uploadMercadoPdfs(this)">
    </label>

    <!-- Olho Mercado -->
    <button id="fech-btn-eye-mercado" onclick="window._fechamento.verMercado()" style="background:#b45309;color:#fff;border:none;padding:.4rem .5rem;border-radius:.4rem;font-size:.82rem;cursor:pointer;display:none;" title="Ver texto mercado carregado"><i class="ph ph-eye"></i></button>

    <!-- Multas prontuário -->
    <button onclick="window._fechamento.carregarMultas()" style="background:#dc2626;color:#fff;border:none;padding:.4rem .85rem;border-radius:.4rem;font-size:.82rem;cursor:pointer;">
      <i class="ph ph-warning"></i> Carregar Multas
    </button>

    <!-- PLR -->
    <button onclick="window._fechamento.carregarPLR()" style="background:#059669;color:#fff;border:none;padding:.4rem .85rem;border-radius:.4rem;font-size:.82rem;cursor:pointer;">
      <i class="ph ph-trophy"></i> Calcular PLR
    </button>

    <!-- Buscar Ponto RHID -->
    <button id="fech-btn-buscar-ponto" onclick="window._fechamento.buscarPontoTodos()" style="background:#0f172a;color:#fff;border:none;padding:.4rem .85rem;border-radius:.4rem;font-size:.82rem;cursor:pointer;display:flex;align-items:center;gap:.35rem;">
      <i class="ph ph-fingerprint"></i> Buscar Ponto (RHID)
    </button>
    <button onclick="window._fechamento.abrirConferenciaPonto()" style="background:#f8fafc;color:#475569;border:1px solid #cbd5e1;border-radius:.4rem;padding:.4rem .85rem;font-size:.82rem;cursor:pointer;display:flex;align-items:center;gap:.35rem;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='#f8fafc'">
      <i class="ph ph-list-numbers"></i> Conferência de Ponto
    </button>
    <span id="fech-badge-ponto" style="font-size:.75rem;color:#374151;display:none;"></span>

    <div style="flex:1;min-width:20px;"></div>

    <!-- Salvar -->
    <button id="fech-btn-salvar" onclick="window._fechamento.salvarTudo()" style="background:#16a34a;color:#fff;border:none;padding:.4rem .85rem;border-radius:.4rem;font-size:.82rem;cursor:pointer;">
      <i class="ph ph-floppy-disk"></i> Salvar
    </button>

    <!-- Gerar XLSX -->
    <button onclick="window._fechamento.gerarXlsx()" style="background:#1e40af;color:#fff;border:none;padding:.4rem .85rem;border-radius:.4rem;font-size:.82rem;cursor:pointer;">
      <i class="ph ph-file-xls"></i> Gerar XLSX
    </button>

    <!-- Enviar Email -->
    <button onclick="window._fechamento.abrirModalEmail()" style="background:#1e293b;color:#fff;border:none;padding:.4rem .85rem;border-radius:.4rem;font-size:.82rem;cursor:pointer;">
      <i class="ph ph-envelope"></i> Enviar Contabilidade
    </button>
  </div>

  <!-- Filtro por nome -->
  <div id="fech-filtro-wrap" style="margin-bottom:.75rem;display:none;">
    <input id="fech-busca-nome" type="text" placeholder="Filtrar por nome..." style="padding:.4rem .75rem;border:1px solid #d1d5db;border-radius:.5rem;width:260px;font-size:.85rem;" oninput="window._fechamento.filtrar(this.value)">
  </div>

  <!-- Tabela principal -->
  <div id="fech-tabela-wrap" style="display:none;">
    <div id="fech-top-scroll" style="overflow-x:auto; overflow-y:hidden; height:14px; margin-bottom:4px;" onscroll="document.getElementById('fech-tabela-inner').scrollLeft = this.scrollLeft;">
      <div id="fech-top-scroll-content" style="height:14px;"></div>
    </div>
    <div id="fech-tabela-inner" style="overflow-x:auto; max-height: 65vh; overflow-y:auto; border-bottom:1px solid #e5e7eb;" onscroll="document.getElementById('fech-top-scroll').scrollLeft = this.scrollLeft;">
      <table id="fech-tabela" style="width:100%;border-collapse:separate; border-spacing:0; font-size:.8rem;min-width:1500px;">
        <thead style="position:sticky; top:0; z-index:10;">
          <tr style="background:#1e40af;color:#fff;">
            <th style="padding:.4rem .6rem;text-align:left;white-space:nowrap;position:sticky;left:0;top:0;background:#1e40af;z-index:20;box-shadow:inset -1px -1px 0 #cbd5e1, inset 0 -1px 0 #cbd5e1;"><strong>Colaborador</strong></th>
            <th style="padding:.4rem .3rem;white-space:nowrap;position:sticky;top:0;background:#1e40af;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;text-align:center;line-height:1.3;text-align:left;"><strong>Cargo</strong><br><span style="font-size:.65rem;font-weight:400;opacity:.8;">—</span></th>
            <th style="display:none;"></th>
            <th style="display:none;"><strong>H.Normais</strong></th>
            <th id="fech-th-noturno" style="padding:.4rem .3rem;white-space:nowrap;position:sticky;top:0;background:#6d28d9;z-index:10;box-shadow:inset 0 -1px 0 #a78bfa;text-align:center;line-height:1.3;" title="Horas trabalhadas entre 22h e 5h"><strong>Total Noturno</strong><br><span style="font-size:.65rem;font-weight:400;opacity:.8;">HH:MM</span></th>
            <th id="fech-th-adic-noturno" style="padding:.4rem .3rem;white-space:nowrap;position:sticky;top:0;background:#6d28d9;z-index:10;box-shadow:inset 0 -1px 0 #a78bfa;text-align:center;line-height:1.3;" title="Adicional noturno 20% (hora reduzida 52,5 min)"><strong>Ad. Noturno</strong><br><span style="font-size:.65rem;font-weight:400;opacity:.8;">R$</span></th>
            <th style="padding:.4rem .3rem;white-space:nowrap;position:sticky;top:0;background:#1e40af;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;text-align:center;line-height:1.3;"><strong>Ext.60%</strong><br><span style="font-size:.65rem;font-weight:400;opacity:.8;">264</span></th>
            <th style="padding:.4rem .3rem;white-space:nowrap;position:sticky;top:0;background:#1e40af;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;text-align:center;line-height:1.3;"><strong>Ext.100%</strong><br><span style="font-size:.65rem;font-weight:400;opacity:.8;">200</span></th>
            <th style="padding:.4rem .3rem;white-space:nowrap;position:sticky;top:0;background:#1e40af;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;text-align:center;line-height:1.3;"><strong>DSR</strong><br><span style="font-size:.65rem;font-weight:400;opacity:.8;">—</span></th>
            <th style="padding:.4rem .3rem;white-space:nowrap;position:sticky;top:0;background:#1e40af;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;text-align:center;line-height:1.3;"><strong>Faltas</strong><br><span style="font-size:.65rem;font-weight:400;opacity:.8;">8792</span></th>\n            <th style="padding:.4rem .3rem;white-space:nowrap;position:sticky;top:0;background:#1e40af;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;text-align:center;line-height:1.3;"><strong>Dias Faltas</strong><br><span style="font-size:.65rem;font-weight:400;opacity:.8;">—</span></th>
            <th style="padding:.4rem .3rem;white-space:nowrap;position:sticky;top:0;background:#1e40af;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;text-align:center;line-height:1.3;"><strong>Atrasos</strong><br><span style="font-size:.65rem;font-weight:400;opacity:.8;">8060</span></th>
            <th style="padding:.4rem .3rem;white-space:nowrap;position:sticky;top:0;background:#1e40af;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;text-align:center;line-height:1.3;"><strong>VT</strong><br><span style="font-size:.65rem;font-weight:400;opacity:.8;">48</span></th>
            <th style="padding:.4rem .3rem;white-space:nowrap;position:sticky;top:0;background:#0c4a6e;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;text-align:center;line-height:1.3;"><strong>Farm&aacute;cia</strong><br><span style="font-size:.65rem;font-weight:400;opacity:.8;">238</span></th>
            <th style="padding:.4rem .3rem;white-space:nowrap;position:sticky;top:0;background:#78350f;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;text-align:center;line-height:1.3;"><strong>Mercado</strong><br><span style="font-size:.65rem;font-weight:400;opacity:.8;">279</span></th>
            <th style="padding:.4rem .3rem;white-space:nowrap;position:sticky;top:0;background:#7f1d1d;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;text-align:center;line-height:1.3;"><strong>Multas</strong><br><span style="font-size:.65rem;font-weight:400;opacity:.8;">302</span></th>
            <th style="padding:.4rem .3rem;white-space:nowrap;position:sticky;top:0;background:#1e40af;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;text-align:center;line-height:1.3;"><strong>Academia</strong><br><span style="font-size:.65rem;font-weight:400;opacity:.8;">278</span></th>
            <th style="padding:.4rem .3rem;white-space:nowrap;position:sticky;top:0;background:#4c1d95;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;text-align:center;line-height:1.3;"><strong>Consig.</strong><br><span style="font-size:.65rem;font-weight:400;opacity:.8;">9750</span></th>
            <th style="padding:.4rem .3rem;white-space:nowrap;position:sticky;top:0;background:#1e40af;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;text-align:center;line-height:1.3;"><strong>Comiss&atilde;o</strong><br><span style="font-size:.65rem;font-weight:400;opacity:.8;">37</span></th>
            <th style="padding:.4rem .3rem;white-space:nowrap;position:sticky;top:0;background:#1e40af;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;text-align:center;line-height:1.3;"><strong>B&ocirc;nus</strong><br><span style="font-size:.65rem;font-weight:400;opacity:.8;">—</span></th>
            <th style="padding:.4rem .3rem;white-space:nowrap;position:sticky;top:0;background:#14532d;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;text-align:center;line-height:1.3;"><strong>PLR</strong><br><span style="font-size:.65rem;font-weight:400;opacity:.8;">873</span></th>
            <th style="padding:.4rem .3rem;white-space:nowrap;position:sticky;top:0;background:#1e40af;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;text-align:center;line-height:1.3;"><strong>Pr&ecirc;mio</strong><br><span style="font-size:.65rem;font-weight:400;opacity:.8;">—</span></th>
            <th style="padding:.4rem .3rem;white-space:nowrap;position:sticky;top:0;background:#1e40af;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;text-align:center;line-height:1.3;"><strong>Outros</strong><br><span style="font-size:.65rem;font-weight:400;opacity:.8;">290</span></th>
          </tr>
        </thead>
        <tbody id="fech-tbody"></tbody>
      </table>
    </div>
  </div>

  <!-- ABAS: Fechamento | Comissão | Conferência Folha -->
  <div id="fech-abas" style="display:none;border-bottom:2px solid #e2e8f0;margin-bottom:1rem;display:none;gap:0;">
    <button id="fech-aba-fechamento" onclick="window._fechamento.mudarAba('fechamento')"
      style="padding:.5rem 1.2rem;border:none;background:none;cursor:pointer;font-size:.9rem;font-weight:600;color:#1e40af;border-bottom:2px solid #1e40af;margin-bottom:-2px;">
      📋 Fechamento
    </button>
    <button id="fech-aba-comissao" onclick="window._fechamento.mudarAba('comissao')"
      style="padding:.5rem 1.2rem;border:none;background:none;cursor:pointer;font-size:.9rem;font-weight:600;color:#6b7280;border-bottom:2px solid transparent;margin-bottom:-2px;">
      💰 Comissão
    </button>
    <button id="fech-aba-conferencia" onclick="window._fechamento.mudarAba('conferencia')"
      style="padding:.5rem 1.2rem;border:none;background:none;cursor:pointer;font-size:.9rem;font-weight:600;color:#6b7280;border-bottom:2px solid transparent;margin-bottom:-2px;">
      🔍 Conferência Folha
    </button>
  </div>

  <!-- SEÇÃO: Comissão -->
  <div id="fech-secao-comissao" style="display:none;padding:1rem 0;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;flex-wrap:wrap;gap:.5rem;">
      <div>
        <h3 style="margin:0;color:#1e40af;font-size:1.1rem;">💰 Comissão — Vendedores Comercial</h3>
        <p style="margin:.2rem 0 0;color:#6b7280;font-size:.82rem;">Gerencie os links de preenchimento enviados por email para os vendedores.</p>
      </div>
      <div style="display:flex;gap:.5rem;">
        <button onclick="window._fechamento.gerarLinksComissao()" style="background:#1e40af;color:#fff;border:none;padding:.45rem 1rem;border-radius:.4rem;font-size:.82rem;cursor:pointer;">
          <i class="ph ph-link"></i> Gerar Links
        </button>
        <button onclick="window._fechamento.enviarEmailsComissao()" style="background:#059669;color:#fff;border:none;padding:.45rem 1rem;border-radius:.4rem;font-size:.82rem;cursor:pointer;">
          <i class="ph ph-envelope"></i> Enviar Emails
        </button>
        <button onclick="window._fechamento.carregarStatusComissao()" style="background:#64748b;color:#fff;border:none;padding:.45rem 1rem;border-radius:.4rem;font-size:.82rem;cursor:pointer;">
          <i class="ph ph-arrows-clockwise"></i> Atualizar
        </button>
      </div>
    </div>
    <div id="fech-comissao-tabela" style="overflow-x:auto;">
      <p style="color:#6b7280;font-size:.9rem;">Clique em "Gerar Links" ou "Atualizar" para ver o status das comissões.</p>
    </div>
  </div>

  <!-- SEÇÃO: Conferência Folha -->
  <div id="fech-secao-conferencia" style="display:none;padding:1rem 0;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;flex-wrap:wrap;gap:.5rem;">
      <div>
        <h3 style="margin:0;color:#1e40af;font-size:1.1rem;">🔍 Conferência da Folha da Contabilidade</h3>
        <p style="margin:.2rem 0 0;color:#6b7280;font-size:.82rem;">Importe o PDF da folha recebida da contabilidade para identificar divergências.</p>
      </div>
      <label style="background:#7c3aed;color:#fff;padding:.45rem 1rem;border-radius:.4rem;font-size:.82rem;cursor:pointer;display:flex;align-items:center;gap:.35rem;">
        <i class="ph ph-upload-simple"></i> Importar PDF da Folha
        <input type="file" accept=".pdf" style="display:none;" onchange="window._fechamento.uploadFolhaContabilidade(this)">
      </label>
    </div>
    <div id="fech-conferencia-resultado" style="margin-top:.5rem;">
      <p style="color:#6b7280;font-size:.9rem;">Aguardando importação do PDF da folha da contabilidade.</p>
    </div>
  </div>

  <div id="fech-msg" style="text-align:center;color:#6b7280;padding:3rem;font-size:1rem;">
    <i class="ph ph-calendar-blank" style="font-size:2rem;display:block;margin-bottom:.5rem;"></i>
    Selecione mês/ano e clique em Buscar.
  </div>
</div>

<!-- MODAL: Mercado -->
<div id="fech-modal-mercado" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;align-items:center;justify-content:center;">
  <div style="background:#fff;border-radius:.75rem;padding:1.5rem;width:500px;max-width:95vw;box-shadow:0 20px 40px rgba(0,0,0,.3);">
    <h3 style="margin:0 0 .75rem;color:#92400e;"><i class="ph ph-shopping-cart"></i> Desconto Mercado</h3>
    <p style="margin:0 0 .75rem;color:#6b7280;font-size:.85rem;">Cole o texto da planilha no formato: <code>Nome R$valor</code> (uma linha por colaborador)</p>
    <textarea id="fech-mercado-texto" rows="10" style="width:100%;border:1px solid #d1d5db;border-radius:.5rem;padding:.6rem;font-size:.82rem;font-family:monospace;box-sizing:border-box;" placeholder="Ex:\nJOÃO DA SILVA R$85,00\nMARIA SOUZA R$120,50"></textarea>
    <div style="display:flex;gap:.5rem;margin-top:1rem;justify-content:flex-end;">
      <button onclick="window._fechamento.fecharModalMercado()" style="padding:.45rem 1rem;border:1px solid #d1d5db;background:#fff;border-radius:.4rem;cursor:pointer;">Cancelar</button>
      <button onclick="window._fechamento.parseMercado()" style="padding:.45rem 1rem;background:#d97706;color:#fff;border:none;border-radius:.4rem;cursor:pointer;font-weight:600;">Aplicar</button>
    </div>
  </div>
</div>

<!-- MODAL: Email -->
<div id="fech-modal-email" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;align-items:center;justify-content:center;">
  <div style="background:#fff;border-radius:.75rem;padding:1.5rem;width:480px;max-width:95vw;box-shadow:0 20px 40px rgba(0,0,0,.3);">
    <h3 style="margin:0 0 .75rem;color:#1e293b;"><i class="ph ph-envelope"></i> Enviar para Contabilidade</h3>
    <p style="margin:0 0 1rem;color:#6b7280;font-size:.85rem;">O arquivo XLSX de fechamento será enviado por email.</p>
    <div style="margin-bottom:.75rem;">
      <label style="display:block;font-weight:600;margin-bottom:.3rem;font-size:.85rem;">Email da Contabilidade:</label>
      <input id="fech-email-destino" type="email" placeholder="contabilidade@empresa.com" style="width:100%;padding:.5rem .75rem;border:1px solid #d1d5db;border-radius:.5rem;font-size:.9rem;box-sizing:border-box;">
    </div>
    <div id="fech-email-status" style="display:none;padding:.5rem .75rem;border-radius:.4rem;margin-bottom:.75rem;font-size:.85rem;"></div>
    <div style="display:flex;gap:.5rem;justify-content:flex-end;">
      <button onclick="window._fechamento.fecharModalEmail()" style="padding:.45rem 1rem;border:1px solid #d1d5db;background:#fff;border-radius:.4rem;cursor:pointer;">Cancelar</button>
      <button onclick="window._fechamento.enviarEmail()" id="fech-btn-enviar-email" style="padding:.45rem 1rem;background:#1e293b;color:#fff;border:none;border-radius:.4rem;cursor:pointer;font-weight:600;"><i class="ph ph-paper-plane-tilt"></i> Enviar</button>
    </div>
  </div>
</div>`;
    }

    // ─────────────────────────────────────────────────────────────────
    // BUSCAR DADOS
    // ─────────────────────────────────────────────────────────────────
    async function buscar() {
        _mes = parseInt(document.getElementById('fech-select-mes').value);
        _ano = parseInt(document.getElementById('fech-select-ano').value);

        // Limpa _dadosPonto e recarrega do localStorage para o mês/ano selecionado
        _dadosPonto = {};
        try {
            var _dpSalvo = localStorage.getItem('_fech_dp_'+_mes+'_'+_ano);
            if (_dpSalvo) Object.assign(_dadosPonto, JSON.parse(_dpSalvo));
        } catch(_eLs) {}
        const msg = document.getElementById('fech-msg');
        const wrap = document.getElementById('fech-tabela-wrap');
        const toolbar = document.getElementById('fech-toolbar');
        const filtroWrap = document.getElementById('fech-filtro-wrap');
        if (msg) { msg.style.display = 'block'; msg.innerHTML = '<i class="ph ph-spinner"></i> Carregando...'; }
        if (wrap) wrap.style.display = 'none';
        if (toolbar) toolbar.style.display = 'none';
        if (filtroWrap) filtroWrap.style.display = 'none';

        try {
            const resp = await fetch(`/api/fechamento/${_ano}/${_mes}`, {
                headers: { 'Authorization': 'Bearer ' + getToken() }
            });
            if (!resp.ok) throw new Error((await resp.json()).error || resp.statusText);
            _dados = await resp.json();
            // Reconstituir _dadosPonto a partir de apuracao_ponto salvo no banco
            _dadosPonto = {};
            _dados.forEach(function(row) {
                if (row.apuracao_ponto) {
                    try {
                        var slim = JSON.parse(row.apuracao_ponto);
                        _dadosPonto[row.colaborador_id] = { apuracaoRaw: slim };
                    } catch(e) {}
                }
            });
            console.log('[fechamento] Ponto reconstruído do banco para', Object.keys(_dadosPonto).length, 'colaboradores');
            renderizarTabela(_dados);
            // Restaurar eye buttons se há dados persistidos
            (function() {
                var tF = _dados.some(function(r) { return parseFloat(r.farmacia) > 0; });
                var tC = _dados.some(function(r) { return parseFloat(r.consignado) > 0; });
                var tM = _dados.some(function(r) { return parseFloat(r.mercado) > 0; });
                if (tF) { _stateArquivos.farmacia = true; var b = document.getElementById('fech-btn-eye-farmacia'); if (b) b.style.display = 'inline-flex'; }
                if (tC) { _stateArquivos.consignado = true; var b = document.getElementById('fech-btn-eye-consignado'); if (b) b.style.display = 'inline-flex'; }
            salvarSilencioso();
                if (tM) { _stateArquivos.mercado_pdfs = true; var b = document.getElementById('fech-btn-eye-mercado'); if (b) b.style.display = 'inline-flex'; }
            salvarSilencioso();
            })();
            if (wrap) wrap.style.display = 'block';
            if (msg) msg.style.display = 'none';
            if (toolbar) toolbar.style.display = 'flex';
            if (filtroWrap) filtroWrap.style.display = 'block';
        } catch (e) {
            if (msg) msg.innerHTML = `<span style="color:#dc2626;"><i class="ph ph-warning-circle"></i> Erro: ${e.message}</span>`;
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // RENDERIZAR TABELA
    // ─────────────────────────────────────────────────────────────────
    function renderizarTabela(dados) {
        const tbody = document.getElementById('fech-tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        dados.forEach((row, idx) => {
            const calc = calcularColaborador(row);
            const isAcad = row.academia_participa === 'Sim';
            const defaultAcad = isAcad ? (parseFloat(row.academia_desconto_valor) || 60) : 0;
            const defaultVT = row.meio_transporte === 'Vale Transporte' ? 1 : 0;
            // Preencher defaults no estado
            if (!_dados[idx].horas_normais) _dados[idx].horas_normais = '220:00';
            if (_dados[idx].vt == null) _dados[idx].vt = defaultVT;
            if (_dados[idx].academia == null) _dados[idx].academia = defaultAcad;

            const isFerias = (row.colab_status || '').toLowerCase().includes('férias');
            const bgRow = isFerias ? '#fff7ed' : '';

            const tr = document.createElement('tr');
            tr.style.cssText = `border-bottom:1px solid #e5e7eb;${bgRow ? 'background:' + bgRow + ';' : ''}`;
            tr.dataset.idx = idx;
            tr.dataset.nome = (row.nome_completo || '').substring(0, 60);
            tr.innerHTML = `
<td style="padding:.35rem .5rem;white-space:nowrap;position:sticky;left:0;background:${bgRow||'#fff'};font-weight:600;min-width:140px;z-index:1;box-shadow:inset -1px 0 0 #e5e7eb;" title="${row.nome_completo||''}">${(row.nome_completo||'—').substring(0,20)}${isFerias?' 🏖️':''}<button onclick="window.abrirObsFechamento(${idx})" title="${_dados[idx] && _dados[idx].observacao ? 'Obs: '+_dados[idx].observacao : 'Adicionar observacao'}" style="background:transparent;border:1px solid ${_dados[idx] && _dados[idx].observacao ? '#2563eb' : '#9ca3af'};border-radius:4px;color:${_dados[idx] && _dados[idx].observacao ? '#2563eb' : '#9ca3af'};cursor:pointer;padding:0 4px;font-size:0.75rem;margin-left:4px;display:inline-flex;align-items:center;vertical-align:middle;line-height:1;"><i class='ph ph-plus'></i></button></td>
<td style="padding:.35rem .3rem;white-space:nowrap;color:#6b7280;max-width:120px;overflow:hidden;text-overflow:ellipsis;">${row.cargo||'—'}</td>
<td style="display:none;"></td>
<td style="display:none;">${inpHora(idx,'horas_normais',row.horas_normais||'220:00')}</td>
<td id="fech-cell-noturno-${idx}" style="padding:.35rem .3rem;background:#f3f0ff;">${inpHora(idx,'horas_noturnas',row.horas_noturnas||'')}</td>
<td id="fech-cell-adic-noturno-${idx}" style="padding:.35rem .3rem;background:#f3f0ff;">${inpNum(idx,'adicional_noturno',row.adicional_noturno||0,'','0.01')}</td>
<td style="padding:.35rem .3rem;">${inpHora(idx,'extra_60',row.extra_60||'')}</td>
<td style="padding:.35rem .3rem;">${inpHora(idx,'extra_100',row.extra_100||'')}</td>
<td style="padding:.35rem .3rem;">${inpDsr(idx, row.dsr)}</td>
<td style="padding:.35rem .3rem;">${inpNum(idx,'dias_falta',row.dias_falta||0,'0')}</td>
<td style="padding:.35rem .3rem;">${inpText(idx,'data_faltas',row.data_faltas,'70px')}</td>
<td style="padding:.35rem .3rem;">${inpHora(idx,'horas_atraso',row.horas_atraso||'')}</td>
<td style="padding:.35rem .3rem;text-align:center;"><span style="font-size:.75rem;font-weight:600;color:${_dados[idx].vt ? '#16a34a' : '#9ca3af'};">${_dados[idx].vt ? 'Sim' : '—'}</span><input type="hidden" oninput="atualizar(${idx},'vt',this.value)" value="${_dados[idx].vt ? 1 : 0}"></td>
<td style="padding:.35rem .3rem;background:#f0f9ff;" id="fech-cell-farmacia-${idx}">${inpNum(idx,'farmacia',row.farmacia||0,'0.00','0.01')}</td>
<td style="padding:.35rem .3rem;background:#fffbeb;" id="fech-cell-mercado-${idx}">${inpNum(idx,'mercado',row.mercado||0,'0.00','0.01')}</td>
<td style="padding:.35rem .3rem;background:#fff1f2;" id="fech-cell-multas-${idx}">${inpNum(idx,'multas',row.multas||0,'0.00','0.01')}</td>
<td style="padding:.35rem .3rem;">${inpNum(idx,'academia',_dados[idx].academia,'0.00','0.01')}</td>
<td style="padding:.35rem .3rem;background:#faf5ff;" id="fech-cell-consig-${idx}">${inpNum(idx,'consignado',row.consignado||0,'0.00','0.01')}</td>
<td style="padding:.35rem .3rem;">${inpNum(idx,'comissao',row.comissao||0,'0.00','0.01')}</td>
<td style="padding:.35rem .3rem;">${inpNum(idx,'bonus_comissao',row.bonus_comissao||0,'0.00','0.01')}</td>
<td style="padding:.35rem .3rem;background:#f0fdf4;" id="fech-cell-plr-${idx}">${inpNum(idx,'plr',row.plr||0,'0.00','0.01')}</td>
<td style="padding:.35rem .3rem;">${inpNum(idx,'premio',row.premio||0,'0.00','0.01')}</td>
<td style="padding:.35rem .3rem;">${inpNum(idx,'outros',row.outros||0,'0.00','0.01')}</td>

`;
            tbody.appendChild(tr);
        });

        // Atualizar barra de rolagem superior
        setTimeout(() => {
            const t = document.getElementById('fech-tabela');
            const c = document.getElementById('fech-top-scroll-content');
            if (t && c) {
                c.style.width = t.offsetWidth + 'px';
            }
        }, 100);
    }

    
    function inpText(idx, campo, val, width) {
        var v = val || '';
        if (typeof v === 'string') {
            try { 
                var p = JSON.parse(v); 
                v = Array.isArray(p) ? p.join(', ') : (p === null ? '' : String(p));
            } catch(e) { }
        }
        if (Array.isArray(v)) v = v.join(', ');
        var oi = "window._fechamento.atualizar(" + idx + ",'" + campo + "',this.value)";
        return '<input type=\'text\' value=\'' + v.replace(/'/g, "&apos;") + '\''
            + ' style=\'width:' + (width || '70px') + ';padding:.2rem;border:1px solid #e5e7eb;border-radius:.3rem;text-align:left;font-size:.8rem;\' '
            + ' oninput=\'' + oi + '\'>';
    }
    function inpHora(idx, campo, val) {
        var v = (val && val !== '00:00' && val !== '0:00' && val !== '0') ? val : '';
        var oi = "window._fechamento.atualizar(" + idx + ",'" + campo + "',this.value)";
        var ob = "if(this.value==='00:00'||this.value==='0:00'||this.value==='0')this.value=''";
        return '<input type=\'text\' placeholder=\'\'  value=\'' + (v||'') + '\''
            + ' style=\'width:55px;padding:.2rem;border:1px solid #e5e7eb;border-radius:.3rem;text-align:center;font-size:.8rem;\''
            + ' oninput=\'' + oi + '\''
            + ' onblur=\'' + ob + '\'>';
    }
    function inpNum(idx, campo, val, placeholder, step) {
        var v = parseFloat(val);
        if (isNaN(v) || v === 0) v = '';
        var displayVal = '';
        var isMoney = step === '0.01';
        if (v !== '') {
            displayVal = isMoney ? parseFloat(v).toFixed(2) : String(v);
        }
        var stComum = 'padding:.2rem;border:1px solid #e5e7eb;border-radius:.3rem;text-align:right;font-size:.8rem;';
        var w = isMoney ? '58px' : '68px';
        var blurFn = isMoney
            ? "if(this.value && parseFloat(this.value)!==0){this.value=parseFloat(this.value).toFixed(2);}else{this.value='';}"
            : "if(this.value && parseFloat(this.value)===0){this.value='';}";
        var oiFn = "window._fechamento.atualizar(" + idx + ",'" + campo + "',parseFloat(this.value)||0)";
        var inp = '<input type=\'text\' inputmode=\'decimal\''
            + ' value=\'' + displayVal + '\''
            + ' placeholder=\'\'  '
            + ' style=\'width:' + w + ';' + stComum + '\''
            + ' oninput=\'' + oiFn + '\''
            + ' onblur=\'' + blurFn + '\'>';
        if (isMoney) {
            return '<div style=\'display:flex;align-items:center;gap:1px;\'>'
                + '<span style=\'color:#6b7280;font-size:.75rem;margin-right:1px;\'>R$</span>'
                + inp + '</div>';
        }
        return inp;
    }
    function inpDsr(idx, val) {
        return `<select style="width:45px;padding:.2rem;border:1px solid #e5e7eb;border-radius:.3rem;font-size:.8rem;" onchange="window._fechamento.atualizar(${idx},'dsr',this.value)">
            <option value="" ${(!val || (val!=='Sim' && val!=='Não'))?'selected':''}></option>
            <option value="Não" ${val==='Não'?'selected':''}>N</option>
            <option value="Sim" ${val==='Sim'?'selected':''}>S</option>
        </select>`;
    }

    // ─────────────────────────────────────────────────────────────────
    // ATUALIZAR E RECALCULAR
    // ─────────────────────────────────────────────────────────────────
    function atualizar(idx, campo, valor) {
        if (!_dados[idx]) return;
        _dados[idx][campo] = valor;
        const calc = calcularColaborador(_dados[idx]);
        
    }

    // ─────────────────────────────────────────────────────────────────
    // FILTRAR POR NOME
    // ─────────────────────────────────────────────────────────────────
    function filtrar(texto) {
        const rows = document.querySelectorAll('#fech-tbody tr');
        const t = texto.toLowerCase().trim();
        rows.forEach(tr => {
            const nome = (tr.querySelector('td')?.textContent || '').toLowerCase();
            tr.style.display = !t || nome.includes(t) ? '' : 'none';
        });
    }

    // ─────────────────────────────────────────────────────────────────
    // UPLOAD FARMÁCIA (PDF)
    // ─────────────────────────────────────────────────────────────────
    async function uploadFarmacia(input) {
        if (!input.files[0]) return;
        const formData = new FormData();
        formData.append('pdf', input.files[0]);
        formData.append('mes', _mes);
        formData.append('ano', _ano);
        try {
            Swal.fire({ title: 'Processando PDF...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            const resp = await fetch('/api/fechamento/upload-farmacia', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + getToken() },
                body: formData
            });
            const json = await resp.json();
            if (!json.ok) throw new Error(json.error);
            // Preencher coluna farmácia por CPF
            var atualizados = 0;
            // Índice de nomes normalizados do PDF para fallback por nome
            var normPdf = {};
            Object.keys(json.farmacia).forEach(function(cpfKey) {
                var nomePdf = (json.farmacia[cpfKey].nome || '').toUpperCase()
                    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
                normPdf[nomePdf] = cpfKey;
            });
            _dados.forEach((row, idx) => {
                var cpf = (row.cpf || '').replace(/[.\-]/g, '');
                var matchKey = null;
                // 1. Match por CPF
                if (json.farmacia[cpf]) {
                    matchKey = cpf;
                } else {
                    // 2. Fallback: match por nome normalizado
                    var nomeColab = (row.nome_completo || '').toUpperCase()
                        .normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
                    if (normPdf[nomeColab]) {
                        matchKey = normPdf[nomeColab];
                    } else {
                        // 3. Match parcial: >= 3 palavras em comum
                        Object.keys(normPdf).forEach(function(nomePdfKey) {
                            if (!matchKey) {
                                var pw = nomePdfKey.split(' ').filter(Boolean);
                                var pc = nomeColab.split(' ').filter(Boolean);
                                var matches = pw.filter(function(p) { return pc.includes(p); });
                                if (matches.length >= Math.min(3, pw.length)) {
                                    matchKey = normPdf[nomePdfKey];
                                }
                            }
                        });
                    }
                }
                if (matchKey !== null) {
                    var val = json.farmacia[matchKey].valor;
                    _dados[idx].farmacia = val;
                    var cell = document.getElementById('fech-cell-farmacia-' + idx);
                    if (cell) {
                        var inp = cell.querySelector('input');
                        if (inp) inp.value = parseFloat(val).toFixed(2);
                    }
                    atualizar(idx, 'farmacia', val);
                    atualizados++;
                }
            });
            var debugInfo = json.debug_cpfs && json.debug_cpfs.length
                ? '\n\nCPFs no PDF: ' + json.debug_cpfs.slice(0,5).join(', ') + (json.debug_cpfs.length>5 ? '...' : '')
                : '';
            _stateArquivos.farmacia = true;
            var _btnEF = document.getElementById('fech-btn-eye-farmacia');
            if (_btnEF) _btnEF.style.display = 'inline-flex';
            Swal.fire({ icon: 'success', title: 'Farmácia processada!', text: atualizados + ' colaboradores com desconto de ' + Object.keys(json.farmacia).length + ' no PDF.' + debugInfo, timer: 4000, showConfirmButton: false });
            salvarSilencioso();
        } catch(e) {
            Swal.fire({ icon: 'error', title: 'Erro no PDF de Farmácia', text: e.message });
        }
        input.value = '';
    }

    // ─────────────────────────────────────────────────────────────────
    // UPLOAD CONSIGNADO (XLSX)
    // ─────────────────────────────────────────────────────────────────
    async function uploadConsignado(input) {
        if (!input.files[0]) return;
        const formData = new FormData();
        formData.append('xlsx', input.files[0]);
        formData.append('mes', _mes);
        formData.append('ano', _ano);
        try {
            Swal.fire({ title: 'Processando XLSX...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            const resp = await fetch('/api/fechamento/upload-consignado', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + getToken() },
                body: formData
            });
            const json = await resp.json();
            if (!json.ok) throw new Error(json.error);
            // Preencher coluna consignado por CPF
            let atualizados = 0;
            _dados.forEach((row, idx) => {
                const cpf = (row.cpf || '').replace(/[.\-]/g, '');
                if (json.consignado[cpf]) {
                    const val = json.consignado[cpf].valor;
                    _dados[idx].consignado = val;
                    const cell = document.getElementById(`fech-cell-consig-${idx}`);
                    if (cell) cell.querySelector('input').value = val;
                    atualizar(idx, 'consignado', val);
                    atualizados++;
                }
            });
            _stateArquivos.consignado = true;
            var _btnEC = document.getElementById('fech-btn-eye-consignado');
            if (_btnEC) _btnEC.style.display = 'inline-flex';
            // Rule 21: auto-save obrigatorio apos upload para persistencia
            salvarSilencioso();
            Swal.fire({ icon: 'success', title: 'Consignado processado!', text: `${atualizados} colaboradores com desconto.`, timer: 3000, showConfirmButton: false });
        } catch(e) {
            Swal.fire({ icon: 'error', title: 'Erro no XLSX de Consignado', text: e.message });
        }
        input.value = '';
    }

    // ─────────────────────────────────────────────────────────────────
    // MODAL MERCADO
    // ─────────────────────────────────────────────────────────────────
    function abrirModalMercado() {
        const modal = document.getElementById('fech-modal-mercado');
        if (modal) modal.style.display = 'flex';
    }
    function fecharModalMercado() {
        const modal = document.getElementById('fech-modal-mercado');
        if (modal) modal.style.display = 'none';
    }
    // ─────────────────────────────────────────────────────────────────
    // UPLOAD MERCADO (MÚltiplos PDFs)
    // ─────────────────────────────────────────────────────────────────
    async function uploadMercadoPdfs(input) {
        if (!input.files || input.files.length === 0) return;
        var files = Array.from(input.files);
        var formData = new FormData();
        files.forEach(function(f) { formData.append('pdfs', f); });
        formData.append('mes', _mes);
        formData.append('ano', _ano);
        try {
            Swal.fire({ title: 'Processando ' + files.length + ' PDF(s) de Mercado...', allowOutsideClick: false, didOpen: function() { Swal.showLoading(); } });
            var resp = await fetch('/api/fechamento/upload-mercado-pdfs', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + getToken() },
                body: formData
            });
            var json = await resp.json();
            if (!json.ok) throw new Error(json.error);
            _dadosMercado = json.resultados || [];
            // Normalizar nomes do PDF
            var normRes = {};
            _dadosMercado.forEach(function(r) {
                var nNorm = (r.nome || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
                normRes[nNorm] = r;
            });
            // Preencher coluna mercado por nome do colaborador
            var atualizados = 0;
            _dados.forEach(function(row, idx) {
                var nColab = (row.nome_completo || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
                var match = normRes[nColab];
                if (!match) {
                    // Tentar match parcial com palavras
                    Object.keys(normRes).forEach(function(k) {
                        if (!match) {
                            var pw = k.split(' ').filter(Boolean);
                            var pc = nColab.split(' ').filter(Boolean);
                            var hits = pw.filter(function(p) { return pc.includes(p); });
                            if (hits.length >= Math.min(2, pw.length)) match = normRes[k];
                        }
                    });
                }
                if (match) {
                    var val = match.valor;
                    _dados[idx].mercado = val;
                    var cell = document.getElementById('fech-cell-mercado-' + idx);
                    if (cell) { var inp = cell.querySelector('input'); if (inp) inp.value = parseFloat(val).toFixed(2); }
                    atualizar(idx, 'mercado', val);
                    atualizados++;
                }
            });
            // Mostrar botão de olho
            _stateArquivos.mercado_pdfs = true;
            var _btnEM = document.getElementById('fech-btn-eye-mercado');
            if (_btnEM) _btnEM.style.display = 'inline-flex';
            // Resultado
            var totalPdfs = _dadosMercado.length;
            // Rule 21: auto-save obrigatorio apos upload para persistencia
            salvarSilencioso();
            Swal.fire({ icon: 'success', title: 'Mercado processado!', text: totalPdfs + ' PDF(s) importados. ' + atualizados + ' colaboradores com valor preenchido.', timer: 4000, showConfirmButton: false });
        } catch(e) {
            Swal.fire({ icon: 'error', title: 'Erro no Mercado', text: e.message });
        }
        input.value = '';
    }

    function parseMercado() {
        const texto = document.getElementById('fech-mercado-texto').value || '';
        const linhas = texto.split('\n').map(l => l.trim()).filter(Boolean);
        let atualizados = 0;
        const naoEncontrados = [];

        for (const linha of linhas) {
            // Formato: "NOME DO COLABORADOR R$150,00" ou "NOME R$ 150,00"
            const match = linha.match(/^(.+?)\s+R\$\s*([\d.,]+)\s*$/i);
            if (!match) continue;
            const nomeTexto = match[1].trim().toLowerCase();
            const valor = parseFloat(match[2].replace(',', '.')) || 0;

            // Buscar colaborador por nome (parcial)
            let melhorIdx = -1, melhorScore = 0;
            _dados.forEach((row, idx) => {
                const nomeColab = (row.nome_completo || '').toLowerCase();
                // Score: palavras do texto que aparecem no nome
                const palavras = nomeTexto.split(' ').filter(p => p.length > 2);
                const score = palavras.filter(p => nomeColab.includes(p)).length;
                if (score > melhorScore) { melhorScore = score; melhorIdx = idx; }
            });

            if (melhorIdx >= 0 && melhorScore >= 1) {
                _dados[melhorIdx].mercado = (_dados[melhorIdx].mercado || 0) + valor;
                const cell = document.getElementById(`fech-cell-mercado-${melhorIdx}`);
                if (cell) cell.querySelector('input').value = _dados[melhorIdx].mercado;
                atualizar(melhorIdx, 'mercado', _dados[melhorIdx].mercado);
                atualizados++;
            } else {
                naoEncontrados.push(nomeTexto);
            }
        }

        fecharModalMercado();
        let msg = `${atualizados} colaboradores atualizados.`;
        if (naoEncontrados.length) msg += `\n\nNão encontrados:\n• ${naoEncontrados.join('\n• ')}`;
        // Rule 21: auto-save obrigatorio apos input manual de mercado
        if (atualizados > 0) salvarSilencioso();
        Swal.fire({ icon: atualizados > 0 ? 'success' : 'warning', title: 'Mercado processado', text: msg });
    }

    // ─────────────────────────────────────────────────────────────────
    // CARREGAR MULTAS DO PRONTUÁRIO
    // ─────────────────────────────────────────────────────────────────
    async function carregarMultas() {
        // Garantir que _mes e _ano estejam definidos a partir dos selects
        _mes = parseInt(document.getElementById('fech-select-mes').value);
        _ano = parseInt(document.getElementById('fech-select-ano').value);

        // Se _dados ainda está vazio, buscar do banco primeiro (sem precisar de Buscar Ponto)
        if (!_dados || _dados.length === 0) {
            try {
                const resp = await fetch(`/api/fechamento/${_ano}/${_mes}`, {
                    headers: { 'Authorization': 'Bearer ' + getToken() }
                });
                if (!resp.ok) throw new Error((await resp.json()).error || resp.statusText);
                _dados = await resp.json();
                renderizarTabela(_dados);
                // Mostrar toolbar e tabela
                var wrap = document.getElementById('fech-tabela-wrap');
                var toolbar = document.getElementById('fech-toolbar');
                var filtroWrap = document.getElementById('fech-filtro-wrap');
                var msg = document.getElementById('fech-msg');
                if (wrap) wrap.style.display = 'block';
                if (toolbar) toolbar.style.display = 'flex';
                if (filtroWrap) filtroWrap.style.display = 'block';
                if (msg) msg.style.display = 'none';
            } catch(e) {
                Swal.fire({ icon: 'error', title: 'Erro ao carregar fechamento', text: e.message });
                return;
            }
        }

        try {
            const resp = await fetch(`/api/fechamento/multas-prontuario/${_ano}/${_mes}`, {
                headers: { 'Authorization': 'Bearer ' + getToken() }
            });
            const json = await resp.json();
            if (!Array.isArray(json)) throw new Error(json.error || 'Resposta inválida');
            
            // LIMPAR DADOS ANTIGOS ANTES DE PREENCHER OS NOVOS
            _dados.forEach((r, idx) => {
                _dados[idx].multas = 0;
                const cell = document.getElementById(`fech-cell-multas-${idx}`);
                if (cell) { const inp = cell.querySelector('input'); if (inp) inp.value = ''; }
                atualizar(idx, 'multas', 0);
            });

            if (json.length === 0) {
                salvarSilencioso();
                Swal.fire({ icon: 'info', title: 'Sem multas', text: 'Nenhuma multa com desconto em folha para este m\u00eas.' });
                return;
            }
        
            json.forEach(item => {
                const idx = _dados.findIndex(r => r.id === item.colaborador_id || r.colaborador_id === item.colaborador_id);
                if (idx >= 0) {
                    _dados[idx].multas = item.valor_total;
                    const cell = document.getElementById(`fech-cell-multas-${idx}`);
                    if (cell) { const inp = cell.querySelector('input'); if (inp) inp.value = parseFloat(item.valor_total).toFixed(2); }
                    atualizar(idx, 'multas', item.valor_total);
                }
            });
            // Rule 21: auto-save após carregar multas para persistência
            salvarSilencioso();
            Swal.fire({ icon: 'success', title: 'Multas carregadas!', text: `${json.length} colaborador(es) com desconto de multas.`, timer: 2500, showConfirmButton: false });
        } catch(e) {
            Swal.fire({ icon: 'error', title: 'Erro ao carregar multas', text: e.message });
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // CALCULAR PLR
    // ─────────────────────────────────────────────────────────────────
    async function carregarPLR() {
        try {
            const resp = await fetch(`/api/fechamento/plr/${_ano}/${_mes}`, {
                headers: { 'Authorization': 'Bearer ' + getToken() }
            });
            const json = await resp.json();
            if (!Array.isArray(json)) throw new Error(json.error || 'Resposta inválida');
            if (json.length === 0) {
                Swal.fire({ icon: 'info', title: 'PLR', text: 'Nenhum colaborador recebe PLR neste mês (PLR é pago em outubro e abril).' });
                return;
            }
            json.forEach(item => {
                const idx = _dados.findIndex(r => r.id === item.colaborador_id || r.colaborador_id === item.colaborador_id);
                if (idx >= 0) {
                    _dados[idx].plr = item.plr_valor;
                    const cell = document.getElementById(`fech-cell-plr-${idx}`);
                    if (cell) cell.querySelector('input').value = item.plr_valor;
                    atualizar(idx, 'plr', item.plr_valor);
                }
            });
            const total = json.reduce((s, i) => s + i.plr_valor, 0);
            Swal.fire({ icon: 'success', title: 'PLR calculado!', text: `${json.length} colaborador(es). Total: ${fmt(total)}.`, timer: 3000, showConfirmButton: false });
        } catch(e) {
            Swal.fire({ icon: 'error', title: 'Erro ao calcular PLR', text: e.message });
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // GERAR XLSX
    // ─────────────────────────────────────────────────────────────────
    async function gerarXlsx() {
        try {
            Swal.fire({ title: 'Gerando planilha...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            const resp = await fetch('/api/fechamento/gerar-xlsx', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + getToken(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ mes: _mes, ano: _ano })
            });
            if (!resp.ok) {
                const err = await resp.json();
                throw new Error(err.error || resp.statusText);
            }
            const blob = await resp.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `fechamento_${String(_mes).padStart(2,'0')}_${_ano}.xlsx`;
            a.click();
            URL.revokeObjectURL(url);
            Swal.close();
        } catch(e) {
            Swal.fire({ icon: 'error', title: 'Erro ao gerar XLSX', text: e.message });
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // MODAL EMAIL
    // ─────────────────────────────────────────────────────────────────
    function abrirModalEmail() {
        const modal = document.getElementById('fech-modal-email');
        if (modal) modal.style.display = 'flex';
        const statusEl = document.getElementById('fech-email-status');
        if (statusEl) statusEl.style.display = 'none';
    }
    function fecharModalEmail() {
        const modal = document.getElementById('fech-modal-email');
        if (modal) modal.style.display = 'none';
    }
    async function enviarEmail() {
        const emailDestino = document.getElementById('fech-email-destino').value.trim();
        if (!emailDestino || !emailDestino.includes('@')) {
            Swal.fire({ icon: 'warning', title: 'Email inválido', text: 'Informe um email válido.' });
            return;
        }
        const btn = document.getElementById('fech-btn-enviar-email');
        const statusEl = document.getElementById('fech-email-status');
        btn.disabled = true;
        btn.innerHTML = '<i class="ph ph-spinner"></i> Enviando...';
        if (statusEl) { statusEl.style.display = 'none'; }
        try {
            const resp = await fetch('/api/fechamento/enviar-email', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + getToken(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ mes: _mes, ano: _ano, email_destino: emailDestino })
            });
            const json = await resp.json();
            if (!json.ok) throw new Error(json.error);
            if (statusEl) {
                statusEl.style.cssText = 'display:block;background:#dcfce7;color:#166534;padding:.5rem .75rem;border-radius:.4rem;margin-bottom:.75rem;font-size:.85rem;';
                statusEl.innerHTML = `<i class="ph ph-check-circle"></i> ${json.mensagem}`;
            }
            btn.innerHTML = '<i class="ph ph-check"></i> Enviado!';
            setTimeout(() => fecharModalEmail(), 2500);
        } catch(e) {
            if (statusEl) {
                statusEl.style.cssText = 'display:block;background:#fee2e2;color:#991b1b;padding:.5rem .75rem;border-radius:.4rem;margin-bottom:.75rem;font-size:.85rem;';
                statusEl.innerHTML = `<i class="ph ph-warning-circle"></i> ${e.message}`;
            }
            btn.innerHTML = '<i class="ph ph-paper-plane-tilt"></i> Enviar';
            btn.disabled = false;
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // SALVAR TUDO
    // ─────────────────────────────────────────────────────────────────
    // Salvar silenciosamente (sem Swal de sucesso) — usado após imports automáticos
    async function salvarSilencioso() {
        if (!_mes || !_ano || !_dados || _dados.length === 0) return;
        try {
            const itens = _dados.map(function(row) {
                return {
                    colaborador_id: row.colaborador_id || row.id,
                    horas_normais: row.horas_normais,
                    horas_trabalhadas: row.horas_trabalhadas,
                    horas_noturnas: row.horas_noturnas,
                    adicional_noturno: row.adicional_noturno || 0,
                    dias_falta: parseInt(row.dias_falta) || 0,
                    data_faltas: row.data_faltas,
                    horas_atraso: row.horas_atraso,
                    extra_60: row.extra_60,
                    extra_100: row.extra_100,
                    dsr: row.dsr,
                    vt: parseFloat(row.vt) || 0,
                    farmacia: parseFloat(row.farmacia) || 0,
                    mercado: parseFloat(row.mercado) || 0,
                    outros: parseFloat(row.outros) || 0,
                    multas: parseFloat(row.multas) || 0,
                    academia: parseFloat(row.academia) || 0,
                    consignado: parseFloat(row.consignado) || 0,
                    comissao: parseFloat(row.comissao) || 0,
                    bonus_comissao: parseFloat(row.bonus_comissao) || 0,
                    premio: parseFloat(row.premio) || 0,
                    plr: parseFloat(row.plr) || 0,
                    insalubridade: parseFloat(row.folha_insalubridade_valor) || 0,
                    periculosidade: parseFloat(row.folha_periculosidade_valor) || 0,
                    pensao_pct: parseFloat(row.folha_pensao_pct) || 0,
                    dias_intermitente: parseInt(row.dias_intermitente) || 0,
                    observacao: row.observacao
                };
            });
            await fetch('/api/fechamento/salvar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
                body: JSON.stringify({ mes: _mes, ano: _ano, itens })
            });
            console.log('[fechamento] Auto-save realizado após import.');
        } catch(e) {
            console.warn('[fechamento] Auto-save falhou:', e.message);
        }
    }

    async function salvarTudo() {
        if (!_mes || !_ano) return;
        const btn = document.getElementById('fech-btn-salvar');
        const orig = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="ph ph-spinner"></i> Salvando...';

        const itens = _dados.map(row => {
            const calc = calcularColaborador(row);
            return {
                colaborador_id: row.colaborador_id || row.id,
                horas_normais: row.horas_normais,
                horas_trabalhadas: row.horas_trabalhadas,
                horas_noturnas: row.horas_noturnas,
                adicional_noturno: row.adicional_noturno || 0,
                dias_falta: parseInt(row.dias_falta) || 0,
                data_faltas: row.data_faltas,
                horas_atraso: row.horas_atraso,
                extra_60: row.extra_60,
                extra_100: row.extra_100,
                dsr: row.dsr,
                vt: parseFloat(row.vt) || 0,
                farmacia: parseFloat(row.farmacia) || 0,
                mercado: parseFloat(row.mercado) || 0,
                outros: parseFloat(row.outros) || 0,
                multas: parseFloat(row.multas) || 0,
                academia: parseFloat(row.academia) || 0,
                consignado: parseFloat(row.consignado) || 0,
                comissao: parseFloat(row.comissao) || 0,
                bonus_comissao: parseFloat(row.bonus_comissao) || 0,
                premio: parseFloat(row.premio) || 0,
                plr: parseFloat(row.plr) || 0,
                insalubridade: parseFloat(row.folha_insalubridade_valor) || 0,
                periculosidade: parseFloat(row.folha_periculosidade_valor) || 0,
                pensao_pct: parseFloat(row.folha_pensao_pct) || 0,
                dias_intermitente: parseInt(row.dias_intermitente) || 0,
                status: 'rascunho',
            };
        });

        try {
            const resp = await fetch('/api/fechamento/salvar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
                body: JSON.stringify({ mes: _mes, ano: _ano, itens })
            });
            const json = await resp.json();
            if (json.ok) {
                Swal.fire({ icon: 'success', title: 'Fechamento salvo!', timer: 2000, showConfirmButton: false });
            } else {
                Swal.fire({ icon: 'error', title: 'Erro ao salvar', text: json.error });
            }
        } catch (e) {
            Swal.fire({ icon: 'error', title: 'Erro', text: e.message });
        } finally {
            btn.disabled = false;
            btn.innerHTML = orig;
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // INIT
    // ─────────────────────────────────────────────────────────────────
    function init() {
        renderizarTela();
    }

    // ─────────────────────────────────────────────────────────────────
    // ETAPA 3 — ABAS
    // ─────────────────────────────────────────────────────────────────
    let _abaAtiva = 'fechamento';
    function mudarAba(aba) {
        _abaAtiva = aba;
        const abas = ['fechamento', 'comissao', 'conferencia'];
        abas.forEach(a => {
            const btn = document.getElementById('fech-aba-' + a);
            const sec = a === 'fechamento' ? null : document.getElementById('fech-secao-' + a);
            if (btn) {
                if (a === aba) {
                    btn.style.color = '#1e40af';
                    btn.style.borderBottomColor = '#1e40af';
                } else {
                    btn.style.color = '#6b7280';
                    btn.style.borderBottomColor = 'transparent';
                }
            }
            if (sec) sec.style.display = a === aba ? 'block' : 'none';
        });
        // Tabela principal e filtro
        const tabWrap = document.getElementById('fech-tabela-wrap');
        const filtroWrap = document.getElementById('fech-filtro-wrap');
        const toolbar = document.getElementById('fech-toolbar');
        if (aba === 'fechamento') {
            if (tabWrap && _dados.length) tabWrap.style.display = 'block';
            if (filtroWrap) filtroWrap.style.display = 'block';
            if (toolbar) toolbar.style.display = 'flex';
        } else {
            if (tabWrap) tabWrap.style.display = 'none';
            if (filtroWrap) filtroWrap.style.display = 'none';
            if (toolbar) toolbar.style.display = 'none';
            if (aba === 'comissao') carregarStatusComissao();
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // ETAPA 3 — COMISSÃO
    // ─────────────────────────────────────────────────────────────────
    async function gerarLinksComissao() {
        try {
            Swal.fire({ title: 'Gerando links...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            const resp = await fetch('/api/fechamento/gerar-links-comissao', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + getToken(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ mes: _mes, ano: _ano })
            });
            const json = await resp.json();
            if (!json.ok) throw new Error(json.error);
            Swal.fire({ icon: 'success', title: `${json.links.length} links gerados!`, text: 'Use "Enviar Emails" para notificar os vendedores.', timer: 2500, showConfirmButton: false });
            await carregarStatusComissao();
        } catch(e) {
            Swal.fire({ icon: 'error', title: 'Erro', text: e.message });
        }
    }

    async function carregarStatusComissao() {
        if (!_mes || !_ano) return;
        const cont = document.getElementById('fech-comissao-tabela');
        if (!cont) return;
        cont.innerHTML = '<p style="color:#6b7280;">Carregando...</p>';
        try {
            const resp = await fetch(`/api/fechamento/comissao-status/${_ano}/${_mes}`, {
                headers: { 'Authorization': 'Bearer ' + getToken() }
            });
            const rows = await resp.json();
            if (!rows.length) {
                cont.innerHTML = '<p style="color:#6b7280;">Nenhum registro de comissão para este mês. Clique em "Gerar Links" primeiro.</p>';
                return;
            }
            const appUrl = window.location.origin;
            let html = `<table style="width:100%;border-collapse:collapse;font-size:.85rem;">
              <thead><tr style="background:#1e40af;color:#fff;">
                <th style="padding:.5rem .75rem;text-align:left;">Vendedor</th>
                <th style="padding:.5rem;text-align:left;">Email</th>
                <th style="padding:.5rem;text-align:center;">Status</th>
                <th style="padding:.5rem;text-align:right;">Comissão</th>
                <th style="padding:.5rem;text-align:right;">Contratos</th>
                <th style="padding:.5rem;text-align:right;">Bônus</th>
                <th style="padding:.5rem;">Link</th>
                <th style="padding:.5rem;">Ações</th>
              </tr></thead><tbody>`;
            rows.forEach(r => {
                const preenchido = !!r.preenchido_em;
                const badge = preenchido
                    ? '<span style="background:#dcfce7;color:#166534;padding:.2rem .5rem;border-radius:9999px;font-size:.75rem;font-weight:600;">✅ Preenchido</span>'
                    : '<span style="background:#fef3c7;color:#92400e;padding:.2rem .5rem;border-radius:9999px;font-size:.75rem;font-weight:600;">⏳ Pendente</span>';
                const emailExib = r.email_corporativo || r.email || '—';
                const link = r.link_token ? `${appUrl}/comissao/${r.link_token}` : '—';
                const linkShort = r.link_token ? `...comissao/${r.link_token.substring(0,8)}...` : '—';
                html += `<tr style="border-bottom:1px solid #e5e7eb;">
                  <td style="padding:.4rem .75rem;font-weight:600;">${r.nome_completo}</td>
                  <td style="padding:.4rem .5rem;color:#6b7280;font-size:.8rem;">${emailExib}</td>
                  <td style="padding:.4rem .5rem;text-align:center;">${badge}</td>
                  <td style="padding:.4rem .5rem;text-align:right;">${preenchido ? fmt(r.valor_comissao) : '—'}</td>
                  <td style="padding:.4rem .5rem;text-align:right;">${preenchido ? (r.contratos_fechados||0) : '—'}</td>
                  <td style="padding:.4rem .5rem;text-align:right;">${r.bonus_primeiro_lugar && r.valor_bonus ? fmt(r.valor_bonus) : '—'}</td>
                  <td style="padding:.4rem .5rem;font-size:.75rem;max-width:150px;overflow:hidden;text-overflow:ellipsis;">
                    ${r.link_token ? `<a href="${link}" target="_blank" title="${link}" style="color:#1e40af;">${linkShort}</a>` : '—'}
                  </td>
                  <td style="padding:.4rem .5rem;">
                    ${!preenchido && r.link_token ? `<button onclick="window._fechamento.reenviarComissao('${r.link_token}')" style="background:#dc2626;color:#fff;border:none;padding:.2rem .6rem;border-radius:.3rem;font-size:.75rem;cursor:pointer;">Reenviar</button>` : ''}
                    ${preenchido ? `<button onclick="window._fechamento.importarComissaoParaFechamento(${r.colaborador_id}, ${r.valor_comissao||0}, ${r.valor_bonus||0})" style="background:#059669;color:#fff;border:none;padding:.2rem .6rem;border-radius:.3rem;font-size:.75rem;cursor:pointer;">Importar</button>` : ''}
                  </td>
                </tr>`;
            });
            html += '</tbody></table>';
            cont.innerHTML = html;
        } catch(e) {
            cont.innerHTML = `<p style="color:#dc2626;">Erro: ${e.message}</p>`;
        }
    }

    async function enviarEmailsComissao() {
        try {
            Swal.fire({ title: 'Enviando emails...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            const resp = await fetch('/api/fechamento/enviar-emails-comissao', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + getToken(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ mes: _mes, ano: _ano })
            });
            const json = await resp.json();
            if (!json.ok) throw new Error(json.error);
            let msg = `${json.enviados} email(s) enviado(s).`;
            if (json.erros && json.erros.length) msg += '\nErros: ' + json.erros.join(', ');
            Swal.fire({ icon: json.enviados > 0 ? 'success' : 'info', title: 'Emails de Comissão', text: msg });
        } catch(e) {
            Swal.fire({ icon: 'error', title: 'Erro', text: e.message });
        }
    }

    async function reenviarComissao(token) {
        try {
            const resp = await fetch('/api/fechamento/enviar-emails-comissao', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + getToken(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ mes: _mes, ano: _ano, link_tokens: [token] })
            });
            const json = await resp.json();
            Swal.fire({ icon: 'success', title: 'Email reenviado!', timer: 2000, showConfirmButton: false });
        } catch(e) {
            Swal.fire({ icon: 'error', title: 'Erro', text: e.message });
        }
    }

    function importarComissaoParaFechamento(colabId, valorComissao, valorBonus) {
        const idx = _dados.findIndex(r => r.id === colabId || r.colaborador_id === colabId);
        if (idx < 0) { Swal.fire({ icon: 'warning', title: 'Colaborador não encontrado na tabela de fechamento', text: 'Busque o mês antes de importar.' }); return; }
        _dados[idx].comissao = valorComissao;
        _dados[idx].bonus_comissao = valorBonus;
        const trEls = document.querySelectorAll('#fech-tbody tr');
        trEls.forEach(tr => {
            if (parseInt(tr.dataset.idx) === idx) {
                const inputs = tr.querySelectorAll('input[type=text],input[type=number]');
                // encontrar input de comissao e bonus_comissao pelas posições
                inputs.forEach(inp => {
                    if (inp.getAttribute('oninput').includes("'comissao'")) inp.value = valorComissao;
                    if (inp.getAttribute('oninput').includes("'bonus_comissao'")) inp.value = valorBonus;
                });
                atualizar(idx, 'comissao', valorComissao);
                atualizar(idx, 'bonus_comissao', valorBonus);
            }
        });
        Swal.fire({ icon: 'success', title: 'Comissão importada!', text: `${fmt(valorComissao)} + bônus ${fmt(valorBonus)} aplicados.`, timer: 2000, showConfirmButton: false });
        mudarAba('fechamento');
    }

    // ─────────────────────────────────────────────────────────────────
    // ETAPA 3 — CONFERÊNCIA DO PDF DA FOLHA
    // ─────────────────────────────────────────────────────────────────
    async function uploadFolhaContabilidade(input) {
        if (!input.files[0]) return;
        const formData = new FormData();
        formData.append('pdf', input.files[0]);
        try {
            Swal.fire({ title: 'Processando PDF da folha...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            const resp = await fetch('/api/fechamento/upload-folha-contabilidade', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + getToken() },
                body: formData
            });
            const json = await resp.json();
            if (!json.ok) throw new Error(json.error);
            Swal.close();
            // Agora conferir com os dados do fechamento salvo
            await conferirFolha(json.colaboradores);
        } catch(e) {
            Swal.fire({ icon: 'error', title: 'Erro ao processar PDF', text: e.message });
        }
        input.value = '';
    }

    async function conferirFolha(colaboradoresFolha) {
        const cont = document.getElementById('fech-conferencia-resultado');
        if (!cont) return;
        if (!colaboradoresFolha || !colaboradoresFolha.length) {
            cont.innerHTML = '<p style="color:#dc2626;">Nenhum colaborador identificado no PDF. O formato pode ser diferente do esperado.</p>';
            return;
        }
        cont.innerHTML = `<p style="color:#6b7280;">Conferindo ${colaboradoresFolha.length} colaboradores...</p>`;
        try {
            const resp = await fetch('/api/fechamento/conferir', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + getToken(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ mes: _mes, ano: _ano, colaboradores_folha: colaboradoresFolha })
            });
            const json = await resp.json();
            if (!json.ok) throw new Error(json.error);

            if (!json.divergencias.length) {
                cont.innerHTML = `<div style="background:#dcfce7;border:1px solid #bbf7d0;border-radius:.75rem;padding:1.5rem;text-align:center;">
                    <div style="font-size:2rem;">✅</div>
                    <h3 style="color:#166534;margin:.5rem 0;">Nenhuma divergência encontrada!</h3>
                    <p style="color:#15803d;margin:0;">${colaboradoresFolha.length} colaboradores verificados — tudo confere.</p>
                </div>`;
                return;
            }

            let html = `<div style="background:#fef3c7;border:1px solid #fde68a;border-radius:.5rem;padding:.75rem 1rem;margin-bottom:1rem;">
                <strong style="color:#92400e;">⚠️ ${json.total_divergencias} colaborador(es) com divergência</strong> 
                de ${colaboradoresFolha.length} verificados.
            </div>`;

            html += `<table style="width:100%;border-collapse:collapse;font-size:.82rem;">
              <thead><tr style="background:#dc2626;color:#fff;">
                <th style="padding:.5rem .75rem;text-align:left;">Colaborador</th>
                <th style="padding:.5rem;text-align:left;">Rubrica</th>
                <th style="padding:.5rem;text-align:right;">Valor Folha</th>
                <th style="padding:.5rem;text-align:right;">Fechamento</th>
                <th style="padding:.5rem;text-align:right;">Diferença</th>
              </tr></thead><tbody>`;

            for (const d of json.divergencias) {
                d.divergencias.forEach((div, i) => {
                    html += `<tr style="border-bottom:1px solid #e5e7eb;${i===0?'background:#fff7f7;':''}">
                        <td style="padding:.35rem .75rem;font-weight:${i===0?'600':'400'};color:${i===0?'#991b1b':'#6b7280'};">${i===0?d.nome:''}</td>
                        <td style="padding:.35rem .5rem;">[<b>${div.codigo}</b>] ${div.descricao}</td>
                        <td style="padding:.35rem .5rem;text-align:right;">${fmt(div.valor_folha)}</td>
                        <td style="padding:.35rem .5rem;text-align:right;">${fmt(div.valor_fechamento)}</td>
                        <td style="padding:.35rem .5rem;text-align:right;color:#dc2626;font-weight:600;">${fmt(div.diferenca)}</td>
                    </tr>`;
                });
            }
            html += '</tbody></table>';
            cont.innerHTML = html;
        } catch(e) {
            cont.innerHTML = `<p style="color:#dc2626;">Erro na conferência: ${e.message}</p>`;
        }
    }

    async function verFarmacia() {
        if (!_mes || !_ano) {
            Swal.fire({ icon: 'info', title: 'Farmácia', text: 'Selecione um mês primeiro.' });
            return;
        }
        var resumoFarm = _dados.filter(function(r) { return parseFloat(r.farmacia) > 0; });
        var linhas = resumoFarm.length > 0
            ? resumoFarm.map(function(r) { return r.nome_completo + ': ' + fmtBRL(r.farmacia); }).join('<br>')
            : '<em style="color:#6b7280">Nenhum colaborador com desconto neste mês.</em>';
        var total = resumoFarm.reduce(function(s, r) { return s + parseFloat(r.farmacia); }, 0);
        var downloadBtn = '';
        var farmPdfId = null;
        var farmPdfNome = 'farmacia.pdf';
        try {
            var chkResp = await fetch('/api/fechamento/farmacia-pdfs/' + _ano + '/' + _mes, {
                headers: { 'Authorization': 'Bearer ' + getToken() }
            });
            var chkLista = await chkResp.json();
            if (Array.isArray(chkLista) && chkLista.length > 0) {
                farmPdfId = chkLista[0].id;
                farmPdfNome = chkLista[0].nome_arquivo || 'farmacia.pdf';
                downloadBtn = '<div style="margin-top:1rem;text-align:center;">'
                    + '<button id="btn-dl-farmacia" style="display:inline-flex;align-items:center;gap:.4rem;padding:.55rem 1.2rem;background:#dc2626;color:#fff;border:none;border-radius:.5rem;font-weight:600;font-size:.85rem;cursor:pointer;">'
                    + '<i class="ph ph-file-pdf"></i> Baixar PDF da Farmácia</button></div>';
            }
        } catch(e) { /* sem arquivo */ }
        Swal.fire({
            icon: 'info',
            title: 'Farmácia — ' + resumoFarm.length + ' colaboradores',
            html: '<div style="text-align:left;font-size:.8rem;max-height:250px;overflow:auto;">' + linhas + '</div>'
                + (resumoFarm.length > 0 ? '<br><strong>Total: ' + fmtBRL(total) + '</strong>' : '')
                + downloadBtn,
            width: 520,
            didOpen: function() {
                var btnDl = document.getElementById('btn-dl-farmacia');
                if (btnDl && farmPdfId) {
                    btnDl.addEventListener('click', async function() {
                        btnDl.disabled = true;
                        btnDl.textContent = 'Baixando...';
                        try {
                            var r = await fetch('/api/fechamento/farmacia-pdf/' + farmPdfId, { headers: { 'Authorization': 'Bearer ' + getToken() } });
                            if (!r.ok) throw new Error('Erro ' + r.status);
                            var blob = await r.blob();
                            var url = URL.createObjectURL(blob);
                            var a = document.createElement('a');
                            a.href = url; a.download = farmPdfNome; a.click();
                            setTimeout(function() { URL.revokeObjectURL(url); }, 2000);
                        } catch(e) { alert('Erro ao baixar: ' + e.message); }
                        btnDl.disabled = false;
                        btnDl.innerHTML = '<i class="ph ph-file-pdf"></i> Baixar PDF da Farmácia';
                    });
                }
            }
        });
    }
    async function verConsignado() {
        if (!_mes || !_ano) {
            Swal.fire({ icon: 'info', title: 'Consignado', text: 'Selecione um mês primeiro.' });
            return;
        }
        // Montar lista de colaboradores com valores
        var resumoCons = _dados.filter(function(r) { return parseFloat(r.consignado) > 0; });
        var linhasCons = resumoCons.length > 0
            ? resumoCons.map(function(r) { return r.nome_completo + ': ' + fmtBRL(r.consignado); }).join('<br>')
            : '<em style="color:#6b7280">Nenhum colaborador com desconto neste mês.</em>';
        var totalCons = resumoCons.reduce(function(s, r) { return s + parseFloat(r.consignado); }, 0);
        // Verificar se existe XLSX no R2
        var downloadBtn = '';
        try {
            var chkResp = await fetch('/api/fechamento/check-consignado-xlsx/' + _ano + '/' + _mes, {
                headers: { 'Authorization': 'Bearer ' + getToken() }
            });
            var chkJson = await chkResp.json();
            if (chkJson.existe) {
                var xlsxUrl = '/api/fechamento/consignado-xlsx/' + _ano + '/' + _mes + '?token=' + encodeURIComponent(getToken());
                downloadBtn = '<div style="margin-top:1rem;text-align:center;">'
                    + '<a href="' + xlsxUrl + '" download style="display:inline-flex;align-items:center;gap:.4rem;padding:.55rem 1.2rem;background:#16a34a;color:#fff;border-radius:.5rem;font-weight:600;font-size:.85rem;text-decoration:none;">'
                    + '<i class="ph ph-file-xls"></i> Baixar XLSX do Consignado</a></div>';
            }
        } catch(e) { /* sem arquivo no R2 */ }
        Swal.fire({
            icon: 'info',
            title: 'Consignado — ' + resumoCons.length + ' colaboradores',
            html: '<div style="text-align:left;font-size:.8rem;max-height:250px;overflow:auto;">' + linhasCons + '</div>'
                + '<br><strong>Total: ' + fmtBRL(totalCons) + '</strong>'
                + downloadBtn,
            width: 520
        });
    }
    async function verMercado() {
        // Se não tem dados na sessão, buscar do banco
        if (!_dadosMercado || _dadosMercado.length === 0) {
            if (!_mes || !_ano) {
                Swal.fire({ icon: 'info', title: 'Mercado', text: 'Selecione um mês para ver os PDFs.' });
                return;
            }
            try {
                var resp = await fetch('/api/fechamento/mercado-pdfs/' + _ano + '/' + _mes, {
                    headers: { 'Authorization': 'Bearer ' + getToken() }
                });
                var json = await resp.json();
                if (Array.isArray(json) && json.length > 0) {
                    _dadosMercado = json.map(function(r) { return { id: r.id, nome: r.nome_no_pdf || r.nome_arquivo, valor: r.valor, r2_key: r.r2_key }; });
                }
            } catch(e) { console.error('Erro ao buscar PDFs mercado:', e); }
        }
        if (!_dadosMercado || _dadosMercado.length === 0) {
            Swal.fire({ icon: 'info', title: 'Mercado', text: 'Nenhum PDF de mercado encontrado para este mês.' });
            return;
        }
        var totalMercado = _dadosMercado.reduce(function(s, r) { return s + (parseFloat(r.valor) || 0); }, 0);
        var mercadoItens = _dadosMercado.map(function(r, idx) {
            var nomeRaw = (r.nome || '');
            var nomeFmt = nomeRaw.length > 0 ? nomeRaw.charAt(0).toUpperCase() + nomeRaw.slice(1).toLowerCase() : '';
            var nomeLabel = nomeFmt + (r.valor ? ' — ' + fmtBRL(r.valor) : '');
            var btnId = 'btn-dl-mercado-' + idx;
            var btnHtml = r.id
                ? '<button id="' + btnId + '" data-id="' + r.id + '" data-nome="' + (r.nome || 'mercado').replace(/"/g,'') + '.pdf" '
                    + 'style="padding:.2rem .6rem;background:#16a34a;color:#fff;border:none;border-radius:.3rem;font-size:.7rem;cursor:pointer;font-weight:600;white-space:nowrap;">'
                    + '<i class="ph ph-download"></i> Baixar</button>'
                : '';
            return '<div style="display:flex;align-items:center;justify-content:space-between;gap:.5rem;padding:.35rem .5rem;border-bottom:1px solid #f3f4f6;font-size:.8rem;text-align:left;">'
                + '<span style="flex:1;text-align:left;">' + nomeLabel + '</span>' + btnHtml + '</div>';
        }).join('');
        var zipBtn = '<div style="margin-top:.75rem;text-align:center;">'
            + '<button id="btn-dl-mercado-zip" style="display:inline-flex;align-items:center;gap:.4rem;padding:.45rem 1rem;background:#7c3aed;color:#fff;border:none;border-radius:.5rem;font-weight:600;font-size:.8rem;cursor:pointer;">'
            + '<i class="ph ph-archive-box"></i> Baixar Todos (ZIP)</button></div>';
        Swal.fire({
            title: 'PDFs do Mercado (' + _dadosMercado.length + ')',
            html: '<div style="max-height:55vh;overflow-y:auto;">' + mercadoItens + '</div>'
                + '<div style="padding:.6rem .5rem;font-weight:700;font-size:.85rem;border-top:2px solid #e5e7eb;margin-top:.25rem;text-align:left;">Total: ' + fmtBRL(totalMercado) + '</div>'
                + zipBtn,
            width: 640,
            showCloseButton: true,
            showConfirmButton: false,
            didOpen: function() {
                _dadosMercado.forEach(function(r, idx) {
                    if (!r.id) return;
                    var btn = document.getElementById('btn-dl-mercado-' + idx);
                    if (!btn) return;
                    btn.addEventListener('click', async function() {
                        btn.disabled = true;
                        btn.textContent = '...';
                        try {
                            var res = await fetch('/api/fechamento/mercado-pdf/' + r.id, { headers: { 'Authorization': 'Bearer ' + getToken() } });
                            if (!res.ok) throw new Error('Erro ' + res.status);
                            var blob = await res.blob();
                            var url = URL.createObjectURL(blob);
                            var a = document.createElement('a');
                            a.href = url; a.download = (r.nome || 'mercado') + '.pdf'; a.click();
                            setTimeout(function() { URL.revokeObjectURL(url); }, 2000);
                        } catch(e) { alert('Erro ao baixar: ' + e.message); }
                        btn.disabled = false;
                        btn.innerHTML = '<i class="ph ph-download"></i> Baixar';
                    });
                });
                var btnZip = document.getElementById('btn-dl-mercado-zip');
                if (btnZip) {
                    btnZip.addEventListener('click', async function() {
                        btnZip.disabled = true;
                        btnZip.innerHTML = '<i class="ph ph-spinner"></i> Gerando ZIP...';
                        try {
                            var res = await fetch('/api/fechamento/mercado-pdfs-zip/' + _ano + '/' + _mes, { headers: { 'Authorization': 'Bearer ' + getToken() } });
                            if (!res.ok) throw new Error('Erro ' + res.status);
                            var blob = await res.blob();
                            var url = URL.createObjectURL(blob);
                            var a = document.createElement('a');
                            a.href = url; a.download = 'mercado_' + String(_mes).padStart(2,'0') + '_' + _ano + '.zip'; a.click();
                            setTimeout(function() { URL.revokeObjectURL(url); }, 3000);
                        } catch(e) { alert('Erro ao gerar ZIP: ' + e.message); }
                        btnZip.disabled = false;
                        btnZip.innerHTML = '<i class="ph ph-archive-box"></i> Baixar Todos (ZIP)';
                    });
                }
            }
        });
    }

    // Converte minutos em HH:MM
    function minToHH(min) {
        if (!min && min !== 0) return "";
        var h = Math.floor(Math.abs(min) / 60);
        var m = Math.abs(min) % 60;
        return (min < 0 ? "-" : "") + String(h).padStart(2,"0") + ":" + String(m).padStart(2,"0");
    }

    // Aplica dados do RHID na linha do colaborador
    function aplicarPontoNaTabela(idx, dados) {
        if (!_dados[idx]) return;
        var _dbgNome = _dados[idx].nome_completo || idx;
        console.log('[PONTO] idx=' + idx + ' ' + _dbgNome + ' | noturnos=' + dados.minutosNoturnos + ' ext60=' + dados.minutosExt60 + ' ext100=' + dados.minutosExt100 + ' atraso=' + dados.minutosAtraso + ' faltas=' + dados.faltas + ' horasNot=' + dados.horasNoturnas + ' adNot=' + dados.adicionalNoturnoValor + ' aviso=' + (dados.aviso||'nenhum'));

        // Extrair dados do RHID
        var diasTrab = dados.diasTrabalhados;
        var faltas   = dados.faltas;

        // Converter diasTrabalhados em HH:MM (dias × 8h)
        var htrab = '';
        if (diasTrab !== null && diasTrab !== undefined && !isNaN(diasTrab)) {
            var totalMin = Math.round(diasTrab * 8 * 60);
            var hh = Math.floor(totalMin / 60);
            var mm = totalMin % 60;
            htrab = String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
        }

        // Atualizar _dados em memória
        if (htrab) _dados[idx].horas_trabalhadas = htrab;
        if (faltas !== null && faltas !== undefined) _dados[idx].dias_falta = faltas;
        if (dados.data_faltas !== undefined) _dados[idx].data_faltas = dados.data_faltas;
        // VT: marcar apenas "Sim" (1) para colaboradores com Vale Transporte -- sem valor monetario
        var meioTransp = (_dados[idx].meio_transporte || '').toLowerCase();
        var temVT = meioTransp.indexOf('vt') !== -1 || meioTransp.indexOf('vale transporte') !== -1;
        if (temVT) {
            _dados[idx].vt = 1;
        }

        // Atualizar DOM: encontrar tr por data-idx
        var trEls = document.querySelectorAll('#fech-tbody tr');
        for (var ti = 0; ti < trEls.length; ti++) {
            var tr = trEls[ti];
            if (parseInt(tr.dataset.idx) !== idx) continue;

            var inputs = tr.querySelectorAll('input');
            for (var ii = 0; ii < inputs.length; ii++) {
                var inp = inputs[ii];
                var oi = inp.getAttribute('oninput') || '';
                if (htrab && oi.indexOf('horas_trabalhadas') !== -1) inp.value = htrab;
                if (faltas !== null && faltas !== undefined && oi.indexOf('dias_falta') !== -1) inp.value = faltas;
                if (dados.data_faltas !== undefined && oi.indexOf('data_faltas') !== -1) {
                    try {
                        var p = JSON.parse(dados.data_faltas);
                        inp.value = Array.isArray(p) ? p.join(', ') : String(p || '');
                    } catch(e) {
                        inp.value = dados.data_faltas || '';
                    }
                }
            }
            break;
        }

        // Disparar atualizar para salvar no _dados
        // H.Normais: coluna ocultada — não preencher do ponto
        // Horas noturnas (todos os colaboradores)
        if (dados.horasNoturnas) {
            _dados[idx].horas_noturnas = dados.horasNoturnas;
            var cellNot = document.getElementById('fech-cell-noturno-' + idx);
            if (cellNot) { var inpNot = cellNot.querySelector('input'); if (inpNot) inpNot.value = dados.horasNoturnas; }
            atualizar(idx, 'horas_noturnas', dados.horasNoturnas);
        }
        if (dados.adicionalNoturnoValor !== undefined && dados.adicionalNoturnoValor !== null) {
            _dados[idx].adicional_noturno = dados.adicionalNoturnoValor;
            var cellAdicNot = document.getElementById('fech-cell-adic-noturno-' + idx);
            if (cellAdicNot) { var inpAdicNot = cellAdicNot.querySelector('input'); if (inpAdicNot) inpAdicNot.value = dados.adicionalNoturnoValor; }
            atualizar(idx, 'adicional_noturno', dados.adicionalNoturnoValor);
        }
        if (faltas !== null && faltas !== undefined) {
            _dados[idx].dias_falta = faltas;
            if (faltas > 0) {
                _dados[idx].dsr = 'Sim';
                atualizar(idx, 'dsr', 'Sim');
            }
            var trFalta = document.querySelectorAll('#fech-tbody tr');
            for (var ti = 0; ti < trFalta.length; ti++) {
                if (parseInt(trFalta[ti].dataset.idx) !== idx) continue;
                Array.from(trFalta[ti].querySelectorAll('input')).forEach(function(i) { if ((i.getAttribute('oninput')||'').indexOf("'dias_falta'") !== -1) i.value = faltas; });
                break;
            }
            atualizar(idx, 'dias_falta', faltas);
        }

        // H.Normais: coluna ocultada — não preencher do ponto

        // ── Ext 60% ───────────────────────────────────────────────────────────
        if (dados.minutosExt60 > 0) {
            var ext60 = minToHH(dados.minutosExt60);
            _dados[idx].extra_60 = ext60;
            var trE60 = document.querySelectorAll('#fech-tbody tr');
            for (var ti = 0; ti < trE60.length; ti++) {
                if (parseInt(trE60[ti].dataset.idx) !== idx) continue;
                Array.from(trE60[ti].querySelectorAll('input')).forEach(function(i) { if ((i.getAttribute('oninput')||'').indexOf("'extra_60'") !== -1) i.value = ext60; });
                break;
            }
            atualizar(idx, 'extra_60', ext60);
        }

        // ── Ext 100% ──────────────────────────────────────────────────────────
        if (dados.minutosExt100 > 0) {
            var ext100 = minToHH(dados.minutosExt100);
            _dados[idx].extra_100 = ext100;
            var trE100 = document.querySelectorAll('#fech-tbody tr');
            for (var ti = 0; ti < trE100.length; ti++) {
                if (parseInt(trE100[ti].dataset.idx) !== idx) continue;
                Array.from(trE100[ti].querySelectorAll('input')).forEach(function(i) { if ((i.getAttribute('oninput')||'').indexOf("'extra_100'") !== -1) i.value = ext100; });
                break;
            }
            atualizar(idx, 'extra_100', ext100);
        }

        // ── Atrasos ───────────────────────────────────────────────────────────
        if (dados.minutosAtraso > 0) {
            var atrStr = minToHH(dados.minutosAtraso);
            _dados[idx].horas_atraso = atrStr;
            var trAtr = document.querySelectorAll('#fech-tbody tr');
            for (var ti = 0; ti < trAtr.length; ti++) {
                if (parseInt(trAtr[ti].dataset.idx) !== idx) continue;
                Array.from(trAtr[ti].querySelectorAll('input')).forEach(function(i) { if ((i.getAttribute('oninput')||'').indexOf("'horas_atraso'") !== -1) i.value = atrStr; });
                break;
            }
            atualizar(idx, 'horas_atraso', atrStr);
        }
    }

    async function buscarPontoTodos() {
        if (!_mes || !_ano) { Swal.fire({ icon: "warning", text: "Busque um mês antes de carregar o ponto." }); return; }
        var btn = document.getElementById("fech-btn-buscar-ponto");
        var badge = document.getElementById("fech-badge-ponto");
        if (btn) { btn.disabled = true; btn.innerHTML = "<i class=\"ph ph-spinner\"></i> Buscando..."; }
        if (badge) badge.style.display = "none";

        var colabsComCpf = _dados.filter(function(r) { return r.cpf || r.colaborador_id; });
        var ok = 0, semCadastro = 0, erros = 0;
        var nomesOk = [], nomesSem = [];

        Swal.fire({ title: "Buscando ponto...", html: "0 / " + colabsComCpf.length + " colaboradores", allowOutsideClick: false, didOpen: function() { Swal.showLoading(); } });

        var total = colabsComCpf.length;
        var concluidos = 0;

        await Promise.allSettled(colabsComCpf.map(async function(row) {
            var cpf = (row.cpf || "").replace(/[.\-]/g, "");
            var idx = _dados.indexOf(row);
            if (!cpf) { semCadastro++; nomesSem.push(row.nome_completo); concluidos++; return; }
            try {
                var resp = await fetch("/api/diretoria/controlid/ponto-colaborador?cpf=" + encodeURIComponent(cpf) + "&mes=" + _mes + "&ano=" + _ano,
                    { headers: { "Authorization": "Bearer " + getToken() } });
                var dados = await resp.json();
                if (dados.success && dados.encontrado) {
                    _dadosPonto[row.colaborador_id || row.id] = dados;
                    aplicarPontoNaTabela(idx, dados);
                    ok++;
                    nomesOk.push(row.nome_completo);
                } else {
                    semCadastro++;
                    nomesSem.push(row.nome_completo + (dados.aviso ? ' (sem apuração)' : ''));
                }
            } catch(e) {
                erros++;
            }
            concluidos++;
            Swal.update({ html: concluidos + " / " + total + " colaboradores" });
        }));

        Swal.close();
        // Re-renderiza a tabela com os dados atualizados (_dados foi atualizado por aplicarPontoNaTabela)
        renderizarTabela(_dados);
        // Rule 21: auto-save obrigatorio apos busca de ponto para persistencia
        await salvarSilencioso();
        // Salvar apuração slim no banco (localStorage não comporta 11MB)
        (function() {
            var itensPonto = Object.keys(_dadosPonto).map(function(colabId) {
                var slim = _extrairSlimPonto(_dadosPonto[colabId]);
                return slim ? { colaborador_id: colabId, apuracao_ponto: JSON.stringify(slim) } : null;
            }).filter(Boolean);
            if (itensPonto.length > 0) {
                fetch('/api/fechamento/salvar-ponto', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
                    body: JSON.stringify({ mes: _mes, ano: _ano, itens: itensPonto })
                }).then(function(r){ console.log('[fechamento] Ponto slim salvo no banco:', itensPonto.length, 'colaboradores'); })
                  .catch(function(e){ console.warn('[fechamento] Erro ao salvar ponto no banco:', e); });
            }
        })();
        if (btn) { btn.disabled = false; btn.innerHTML = "<i class=\"ph ph-fingerprint\"></i> Buscar Ponto (RHID)"; }

        var mesFmt = String(_mes).padStart(2,"0") + "/" + _ano;
        if (badge) {
            badge.style.display = "inline";
            badge.innerHTML = ok + " encontrados" + (semCadastro > 0 ? " / " + semCadastro + " sem cadastro" : "") + (erros > 0 ? " / " + erros + " erros" : "");
        }

        var msgTipo = ok > 0 ? "success" : "warning";
        var msgTxt = ok + " colaborador(es) com ponto carregado.";
        if (semCadastro > 0) msgTxt += "\n" + semCadastro + " sem cadastro no RHID: " + nomesSem.slice(0,3).join(", ") + (nomesSem.length > 3 ? "..." : "");
        if (erros > 0) msgTxt += "\n" + erros + " erros de conexão.";
        Swal.fire({ icon: msgTipo, title: "Ponto " + mesFmt, text: msgTxt, timer: 5000, showConfirmButton: ok === 0 });
    }

    return {
        init, buscar, atualizar, filtrar, salvarTudo,
        abrirConferenciaPonto,
        uploadFarmacia, uploadConsignado, uploadMercadoPdfs, salvarSilencioso, verFarmacia, verConsignado, verMercado, buscarPontoTodos,
        abrirModalMercado, fecharModalMercado, parseMercado,
        carregarMultas, carregarPLR,
        gerarXlsx, abrirModalEmail, fecharModalEmail, enviarEmail,
        mudarAba, gerarLinksComissao, carregarStatusComissao, enviarEmailsComissao,
        reenviarComissao, importarComissaoParaFechamento,
        uploadFolhaContabilidade, conferirFolha,
        calcularColaborador, calcINSS, calcIRRF
    };
})();

// Hook no navigateTo
(function () {
    const _origNav = window.navigateTo;
    window.navigateTo = function (target) {
        if (_origNav) _origNav(target);
        if (target === 'fechamento') {
            setTimeout(() => window._fechamento.init(), 50);
        }
    };
})();



window.mostrarRegrasFechamento = function() {
    let modal = document.getElementById('modal-regras-fechamento');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-regras-fechamento';
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:99999;backdrop-filter:blur(2px);';
        
        modal.innerHTML = `
            <div style="background:#fff;border-radius:12px;width:600px;max-width:95%;box-shadow:0 10px 25px rgba(0,0,0,0.2);overflow:hidden;display:flex;flex-direction:column;text-align:left;">
                <div style="padding:15px 20px;border-bottom:1px solid #f1f5f9;display:flex;justify-content:space-between;align-items:center;background:#f8fafc;">
                    <h3 style="margin:0;font-size:1.1rem;color:#0f172a;font-weight:700;"><i class="ph ph-lightbulb" style="color:#eab308;margin-right:8px;"></i> Regras de Cores da Conferência</h3>
                    <button onclick="document.getElementById('modal-regras-fechamento').style.display='none'" style="background:none;border:none;font-size:1.5rem;color:#94a3b8;cursor:pointer;padding:0;">&times;</button>
                </div>
                <div style="padding:20px;overflow-y:auto;max-height:70vh;font-size:0.9rem;color:#334155;line-height:1.6;">
                    <p style="margin:0 0 15px;">Se um dia se encaixar em múltiplas regras, o sistema aplicará a cor da regra que estiver <strong>mais acima</strong> nesta lista (prioridade).</p>
                    <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:12px;">
                        <li style="display:flex;align-items:flex-start;gap:10px;">
                            <span style="display:inline-block;width:14px;height:14px;background:#fe7884;border:1px solid #dc2626;border-radius:3px;flex-shrink:0;margin-top:3px;"></span>
                            <div><strong>1. Falta Integral:</strong> Aplicado quando há falta o dia todo sem nenhuma batida de ponto e sem justificativa.</div>
                        </li>
                        <li style="display:flex;align-items:flex-start;gap:10px;">
                            <span style="display:inline-block;width:14px;height:14px;background:#fef9c3;border:1px solid #fde047;border-radius:3px;flex-shrink:0;margin-top:3px;"></span>
                            <div><strong>2. Férias:</strong> Aplicado nos dias marcados como férias para o colaborador.</div>
                        </li>
                        <li style="display:flex;align-items:flex-start;gap:10px;">
                            <span style="display:inline-block;width:14px;height:14px;background:#fee2e2;border:1px solid #fca5a5;border-radius:3px;flex-shrink:0;margin-top:3px;"></span>
                            <div><strong>3. Justificado / Atestado:</strong> Aplicado sempre que o RH insere um atestado ou justificativa de horas (total ou parcial) naquele dia no ControlID.</div>
                        </li>
                        <li style="display:flex;align-items:flex-start;gap:10px;">
                            <span style="display:inline-block;width:14px;height:14px;background:#cdd1d4;border:1px solid #94a3b8;border-radius:3px;flex-shrink:0;margin-top:3px;"></span>
                            <div><strong>4. Folga:</strong> Aplicado em dias de descanso e feriados onde não houve marcação de ponto.</div>
                        </li>
                        <li style="display:flex;align-items:flex-start;gap:10px;">
                            <span style="display:inline-block;width:14px;height:14px;background:#feae67;border:1px solid #f97316;border-radius:3px;flex-shrink:0;margin-top:3px;"></span>
                            <div><strong>5. Apontamento Manual:</strong> Aplicado quando o RH preenche uma batida esquecida manualmente. O horário modificado ficará em <b>negrito</b>.</div>
                        </li>
                        <li style="display:flex;align-items:flex-start;gap:10px;">
                            <span style="display:inline-block;width:14px;height:14px;background:#cb79ff;border:1px solid #a855f7;border-radius:3px;flex-shrink:0;margin-top:3px;"></span>
                            <div><strong>6. Mais de 12h Seguidas:</strong> Aplicado quando a soma de horas normais e extras ultrapassa 12 horas (exceto para colaboradores 12x36).</div>
                        </li>
                        <li style="display:flex;align-items:flex-start;gap:10px;">
                            <span style="display:inline-block;width:14px;height:14px;background:#93c5fd;border:1px solid #3b82f6;border-radius:3px;flex-shrink:0;margin-top:3px;"></span>
                            <div><strong>7. Extra 100%:</strong> Aplicado quando o colaborador faz mais de 15 minutos de hora extra em domingos, folgas ou feriados.</div>
                        </li>
                        <li style="display:flex;align-items:flex-start;gap:10px;">
                            <span style="display:inline-block;width:14px;height:14px;background:#dbeafe;border:1px solid #93c5fd;border-radius:3px;flex-shrink:0;margin-top:3px;"></span>
                            <div><strong>8. Extra 60%:</strong> Aplicado quando o colaborador faz mais de 15 minutos de hora extra em dias normais de trabalho.</div>
                        </li>
                        <li style="display:flex;align-items:flex-start;gap:10px;">
                            <span style="display:inline-block;width:14px;height:14px;background:#fbcfe8;border:1px solid #f472b6;border-radius:3px;flex-shrink:0;margin-top:3px;"></span>
                            <div><strong>9. Noturno:</strong> Aplicado se houve registro de adicional noturno trabalhado no dia.</div>
                        </li>
                        <li style="display:flex;align-items:flex-start;gap:10px;">
                            <span style="display:inline-block;width:14px;height:14px;background:#fde047;border:1px solid #eab308;border-radius:3px;flex-shrink:0;margin-top:3px;"></span>
                            <div><strong>10. Atraso / Saída Antecipada:</strong> Aplicado quando a soma de faltas parciais ou atrasos no dia supera 15 minutos.</div>
                        </li>
                    </ul>
                </div>
            </div>
        `;
        
        modal.addEventListener('click', function(e) {
            if (e.target === modal) modal.style.display = 'none';
        });
        
        document.body.appendChild(modal);
    }
    modal.style.display = 'flex';
};

// -- Observacao no Fechamento -----------------------------------------------
window.abrirObsFechamento = function(idx) {
    var trEl = document.querySelector('#fech-tbody tr[data-idx="' + idx + '"]');
    var nome = trEl ? (trEl.dataset.nome || '') : '';
    var obsAtual = (_dados[idx] || {}).observacao || '';
    var modal = document.getElementById('modal-obs-fechamento');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-obs-fechamento';
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;';
        modal.addEventListener('click', function(e) { if (e.target === modal) modal.style.display = 'none'; });
        document.body.appendChild(modal);
    }
    var excluirBtn = obsAtual
        ? '<button onclick="document.getElementById(\'obs-fech-texto\').value=\'\'; window.salvarObsFechamento(' + idx + ');" style="padding:8px 15px;border:none;background:#ef4444;color:#fff;border-radius:6px;cursor:pointer;font-weight:600;"><i class=\"ph ph-trash\"></i> Excluir</button>'
        : '';
    modal.innerHTML = '<div style="background:#fff;border-radius:12px;width:440px;max-width:93%;box-shadow:0 10px 25px rgba(0,0,0,0.2);overflow:hidden;">'
        + '<div style="padding:15px 20px;border-bottom:1px solid #f1f5f9;display:flex;justify-content:space-between;align-items:center;background:#f8fafc;">'
        + '<h3 style="margin:0;font-size:1.05rem;color:#0f172a;font-weight:700;">Observacao &mdash; Fechamento ' + _mes + '/' + _ano + '</h3>'
        + '<button onclick="document.getElementById(\'modal-obs-fechamento\').style.display=\'none\'" style="background:none;border:none;font-size:1.5rem;color:#94a3b8;cursor:pointer;padding:0;">&times;</button>'
        + '</div>'
        + '<div style="padding:20px;">'
        + '<p style="margin:0 0 10px 0;font-size:0.9rem;color:#64748b;">Colaborador: <strong>' + nome + '</strong></p>'
        + '<textarea id="obs-fech-texto" rows="4" style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px;font-size:0.9rem;font-family:inherit;resize:vertical;outline:none;box-sizing:border-box;" placeholder="Digite a observacao...">' + obsAtual.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</textarea>'
        + '</div>'
        + '<div style="padding:15px 20px;border-top:1px solid #f1f5f9;display:flex;justify-content:flex-end;gap:10px;">'
        + '<button onclick="document.getElementById(\'modal-obs-fechamento\').style.display=\'none\'" style="padding:8px 15px;border:1px solid #cbd5e1;background:#fff;border-radius:6px;cursor:pointer;font-weight:600;color:#64748b;">Cancelar</button>'
        + excluirBtn
        + '<button onclick="window.salvarObsFechamento(' + idx + ')" style="padding:8px 15px;border:none;background:#2563eb;color:#fff;border-radius:6px;cursor:pointer;font-weight:600;">Salvar</button>'
        + '</div>'
        + '</div>';
    modal.style.display = 'flex';
    setTimeout(function() { var ta = document.getElementById('obs-fech-texto'); if (ta) ta.focus(); }, 100);
};

window.salvarObsFechamento = function(idx) {
    var texto = (document.getElementById('obs-fech-texto').value || '').trim();
    if (_dados[idx]) _dados[idx].observacao = texto || null;
    document.getElementById('modal-obs-fechamento').style.display = 'none';
    // Atualizar cor do botao + sem re-renderizar a tabela inteira
    var trEl = document.querySelector('#fech-tbody tr[data-idx="' + idx + '"]');
    if (trEl) {
        var btn = trEl.querySelector('td:first-child button');
        if (btn) {
            var cor = texto ? '#2563eb' : '#9ca3af';
            btn.style.borderColor = cor;
            btn.style.color = cor;
            btn.title = texto ? 'Obs: ' + texto : 'Adicionar observacao';
        }
    }
    salvarSilencioso();
    if (typeof showToast !== 'undefined') showToast(texto ? 'Observacao salva!' : 'Observacao removida', 'success');
};
