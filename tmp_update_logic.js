const fs = require('fs');
let code = fs.readFileSync('frontend/recibos.js', 'utf8');

const oldLogic = `                    let tipo2 = '';
                    if (d.isHoliday) {
                        tipo2 = hT2 >= MIN_VR ? '' : 'folga'; // Feriado: se trabalhou 6h+ não desconta
                    } else if (d.idJustification) {
                        const ob2 = (d.toolTipAlert || '').toLowerCase();
                        const abr2 = (d.abreviationJustification || '').toLowerCase().trim();
                        const st2  = (d.status || d.situacao || d.tipo || '').toString().toLowerCase();
                        const isErroP2  = ob2.includes('erro no ponto');
                        const isExterno2 = ob2.includes('trabalho externo') || ob2.includes('trab. externo')
                                        || ob2.includes('trab externo') || ob2.includes('externo')
                                        || (ob2.includes('servi') && ob2.includes('externo'))
                                        // Campo status/situacao do RHID
                                        || st2.includes('externo') || st2.includes('trab. ext')
                                        || st2 === 'te'
                                        // Abreviação do RHID (ex: "TE", "T.E.", "TRAB.EXT.")
                                        || abr2 === 'te' || abr2 === 't.e.' || abr2.startsWith('te ')
                                        || abr2.includes('ext')
                                        // ── Texto nas entradas de marcação (listAfdtManutencao) ──────────
                                        // O RHID escreve "Trabalho Externo" como texto nas marcações
                                        || (d.listAfdtManutencao || d.marcacoes || []).some(m => {
                                            const _j = JSON.stringify(m || '').toLowerCase();
                                            return _j.includes('externo') || _j.includes('trabalho ext');
                                        });
                        if (isErroP2 || isExterno2 || hT2 > 0) {
                            tipo2 = ''; // Trabalhado (erro de ponto / trabalho externo → não conta falta)
                        } else {
                            tipo2 = 'justificado'; // Falta justificada genuína
                        }
                    } else if (isFolgaSt2 || isFolgaFlag2 || isDSR2) {
                        tipo2 = hT2 >= MIN_VR ? '' : 'folga';
                    } else if (semHor2 && trb2) {
                        // Dia de descanso (sem horário) mas trabalhou:
                        // SAB: precisa de 6h (360min) para ganhar VR; abaixo disso = ainda é folga descontada
                        // DOM / outros: precisa de 2h (120min)
                        const dStr2 = String(d.date || d.dateTimeStr || '').substring(0, 10);
                        const dParsed2 = new Date(dStr2 + 'T12:00:00');
                        const isSat2 = !isNaN(dParsed2) && dParsed2.getDay() === 6;
                        const vrLimite2 = isSat2 ? 360 : 120;
                        if (hT2 < vrLimite2) tipo2 = 'folga'; // trabalho insuficiente → folga
                        // else tipo2 = '' (trabalhou o suficiente → conta como VR)
                    } else if (semHor2 && !trb2) {
                        tipo2 = 'folga'; // Dia de descanso sem trabalho
                    } else if (d.faltaDiaInteiro || (!trb2 && !semHor2)) {
                        tipo2 = 'falta';
                    }

                    if (tipo2 === 'justificado' || tipo2 === 'falta') faltasTotal++;
                    if (tipo2 === 'justificado') faltasJustificadasTotal++; // faltas c/ justificativa real
                    if (tipo2 === 'folga') folgasTotal++;`;

const newLogic = `                    const ob2 = (d.toolTipAlert || '').toLowerCase();
                    const abr2 = (d.abreviationJustification || '').toLowerCase().trim();
                    const stAux = (d.status || d.situacao || d.tipo || '').toString().toLowerCase();
                    const isErroP2 = ob2.includes('erro no ponto');
                    const isExterno2 = ob2.includes('trabalho externo') || ob2.includes('trab. externo') || ob2.includes('trab externo') || ob2.includes('externo') || (ob2.includes('servi') && ob2.includes('externo')) || stAux.includes('externo') || stAux.includes('trab. ext') || stAux === 'te' || abr2 === 'te' || abr2 === 't.e.' || abr2.startsWith('te ') || abr2.includes('ext') || (d.listAfdtManutencao || d.marcacoes || []).some(m => { const _j = JSON.stringify(m || '').toLowerCase(); return _j.includes('externo') || _j.includes('trabalho ext'); });

                    let tipoVR = '';
                    let tipoVT = '';

                    const dStr2 = String(d.date || d.dateTimeStr || '').substring(0, 10);
                    const dParsed2 = new Date(dStr2 + 'T12:00:00');
                    const isSat2 = !isNaN(dParsed2) && dParsed2.getDay() === 6;
                    
                    const isSabAlternado = ((c.escala_tipo || '').trim() === 'padrao_sab_alternado');

                    // 1. Logica VR
                    if (d.isHoliday) {
                        tipoVR = hT2 >= MIN_VR ? '' : 'folga';
                    } else if (d.idJustification) {
                        if (isErroP2 || isExterno2 || hT2 > 0) {
                            tipoVR = '';
                        } else {
                            tipoVR = 'justificado';
                        }
                    } else if (isFolgaSt2 || isFolgaFlag2 || isDSR2) {
                        tipoVR = hT2 >= MIN_VR ? '' : 'folga';
                    } else if (semHor2 && trb2) {
                        let vrLimite2 = isSat2 ? 360 : 120;
                        if (isSat2 && isSabAlternado) vrLimite2 = 120; // Regra SAB alternado: >2h ganha VR no sabado
                        if (hT2 < vrLimite2) tipoVR = 'folga';
                    } else if (semHor2 && !trb2) {
                        tipoVR = 'folga';
                    } else if (d.faltaDiaInteiro || (!trb2 && !semHor2)) {
                        tipoVR = 'falta';
                    }

                    // 2. Logica VT/VC
                    // "a partir do momento que o colaborador registrou um apontamento, o sistema deve considerar como pagamento"
                    if (d.idJustification) {
                        if (isErroP2 || isExterno2 || hT2 > 0) {
                            tipoVT = ''; // VT garantido
                        } else {
                            tipoVT = 'justificado';
                        }
                    } else if (isFolgaSt2 || isFolgaFlag2 || isDSR2) {
                        tipoVT = hT2 > 0 ? '' : 'folga';
                    } else if (semHor2 && trb2) {
                        tipoVT = ''; // Qualque hora ja ganha VT
                    } else if (semHor2 && !trb2) {
                        tipoVT = 'folga';
                    } else if (d.faltaDiaInteiro || (!trb2 && !semHor2)) {
                        tipoVT = 'falta';
                    } else if (d.isHoliday) {
                        tipoVT = hT2 > 0 ? '' : 'folga';
                    }

                    if (tipoVR === 'justificado' || tipoVR === 'falta') faltasVR++;
                    if (tipoVR === 'folga') folgasVR++;
                    
                    if (tipoVT === 'justificado' || tipoVT === 'falta') faltasVT++;
                    if (tipoVT === 'justificado') faltasJustificadasTotal++;
                    if (tipoVT === 'folga') folgasVT++;`;

code = code.replace(oldLogic, newLogic);

// We need to initialize the new accumulators before the loop:
code = code.replace('let folgasTotal = 0;', 'let folgasTotal = 0;\\n                let folgasVR = 0, faltasVR = 0, folgasVT = 0, faltasVT = 0;');

// We need to save the accumulators into the selecoes after the loop
// Replace `faltasJanela = faltasTotal;` area:
const oldAssign = `                faltasJanela = faltasTotal; // será aplicado em s.faltas abaixo
                const faltasJustificadasJanela = faltasJustificadasTotal; // só justificadas (supervisão)`;
const newAssign = `                const faltasJustificadasJanela = faltasJustificadasTotal;`;
code = code.replace(oldAssign, newAssign);

// Assign directly to s
const oldSave = `                s.diasTrabalhados = diasCredito; // dias de escala p/ VT/VC`;
const newSave = `                s.diasTrabalhados = diasCredito; // dias de escala p/ VT/VC
                s.folgasVR = folgasVR;
                s.faltasVR = faltasVR;
                s.folgasVT = folgasVT;
                s.faltasVT = faltasVT;`;
code = code.replace(oldSave, newSave);

fs.writeFileSync('frontend/recibos.js', code, 'utf8');
console.log('Update done!');
