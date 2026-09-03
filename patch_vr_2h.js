/**
 * patch_vr_2h.js
 * Aplica a nova regra de VR: qualquer dia com >= 2h trabalhadas recebe VR,
 * independente do dia (folga, sábado, domingo) ou escala.
 *
 * Mudanças:
 *  1. MIN_VR: 360 → 120
 *  2. Remove bloco perdeVRPorHoras (cálculo)
 *  3. diasVR filter: idJustification + hT2>=120 → conta VR
 *  4. diasVR filter: simplifica regra domingo (unifica com regra geral)
 *  5. _ehDiaFolgaEscala: só aplica folga se hT2 < 120 (trabalhado ≥ 2h → VR)
 *  6. Remove perdeVRPorHorasUI (exibição visual) → substituído por cor de trabalho extra
 */

const fs = require('fs');
let c = fs.readFileSync('frontend/recibos.js', 'utf8');
const NL = c.includes('\r\n') ? '\r\n' : '\n';

let aplicadas = 0;
let erros = [];

function rep(label, oldStr, newStr) {
    // Tenta CRLF primeiro, depois LF
    const variants = [oldStr, oldStr.replace(/\r\n/g, '\n')];
    for (const v of variants) {
        if (c.includes(v)) {
            const count = c.split(v).length - 1;
            if (count > 1) {
                erros.push(label + ': MULTI-MATCH (' + count + ') — skip');
                return false;
            }
            const rep = v === oldStr ? newStr : newStr.replace(/\r\n/g, '\n');
            c = c.replace(v, rep);
            aplicadas++;
            console.log('✅ ' + label);
            return true;
        }
    }
    erros.push(label + ': MISS — não encontrado');
    console.log('❌ ' + label + ' — não encontrado');
    return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// MUDANÇA 1: MIN_VR de 360 → 120
// ─────────────────────────────────────────────────────────────────────────────
rep(
    '1. MIN_VR 360→120',
    `                const MIN_VR = 360; // 6 horas em minutos`,
    `                const MIN_VR = 120; // 2 horas em minutos — nova regra: qualquer dia com ≥ 2h trabalhadas gera VR`
);

// ─────────────────────────────────────────────────────────────────────────────
// MUDANÇA 2: Remove bloco perdeVRPorHoras (cálculo + acúmulo faltasVR/folgasVR)
// O trecho começa logo após o `}` que fecha o último else-if e vai até o `});`
// ─────────────────────────────────────────────────────────────────────────────
rep(
    '2. Remove bloco perdeVRPorHoras (cálculo)',
    `\r\n                    // --- NOVA REGRA DE CARGA HORÁRIA MÍNIMA PARA VR ---\r\n                    let perdeVRPorHoras = false;\r\n                    if (tipo2 === '' && trb2) {\r\n                        const dStr2 = String(d.date || d.dateTimeStr || '').substring(0, 10);\r\n                        const dParsed2 = new Date(dStr2 + 'T12:00:00');\r\n                        const isSat2 = !isNaN(dParsed2) && dParsed2.getDay() === 6;\r\n                        \r\n                        const escTipo = (c.escala_tipo || '').toLowerCase();\r\n                        const isEscalaExcecao = escTipo === 'padrao_sab_4h' || escTipo === 'padrao_sab_alternado';\r\n                        const isEscalaExcluidaDom = escTipo.includes('uma_folga') || escTipo.includes('duas_folgas') || escTipo.includes('12x36');\r\n                                                \r\n                        const limiteMinutos = (isSat2 && isEscalaExcecao) ? 180 : 360;\r\n                        \r\n                        if (hT2 < limiteMinutos) {\r\n                            perdeVRPorHoras = true;\r\n                        }\r\n                        \r\n                        // -- NOVA REGRA DOMINGO: Não perde VR se trabalhar qualquer hora no Domingo (min 2h já bateu tipo2='') --\r\n                        const isDom2 = !isNaN(dParsed2) && dParsed2.getDay() === 0;\r\n                        if (isDom2 && !isEscalaExcluidaDom) {\r\n                            perdeVRPorHoras = false;\r\n                        }\r\n                    }\r\n                    d.perdeVRPorHoras = perdeVRPorHoras; // Salva para exibir na conferência de ponto\r\n\r\n                    const mTr = (c.meio_transporte || '').toLowerCase();\r\n                    const isVC = typeof _isVC === 'function' ? _isVC(mTr) : false;\r\n\r\n                    if (tipo2 === 'justificado' || tipo2 === 'falta') {\r\n                        faltasTotal++;\r\n                        if (tipo2 === 'justificado') faltasJustificadasTotal++;\r\n                        faltasVR++;\r\n                        faltasVT++;\r\n                    } else if (tipo2 === 'folga') {\r\n                        folgasTotal++;\r\n                        folgasVR++;\r\n                        folgasVT++;\r\n                    } else if (tipo2 === 'ferias') {\r\n                        folgasTotal++; // Global accounts as folga\r\n                        folgasVR++; // Férias é folga no VR\r\n                        if (isVC) {\r\n                            faltasVT++; // Para Vale Combustível, Férias desconta (Falta)\r\n                        } else {\r\n                            folgasVT++; // Para Vale Transporte, Férias NÃO desconta (Folga)\r\n                        }\r\n                    }\r\n\r\n                    // Se trabalhou menos que o mínimo (nova regra) e não é atestado/falta normal, perde SÓ o VR\r\n                    if (perdeVRPorHoras) {\r\n                        const isInt = (c.tipo_contrato || '').toLowerCase().includes('intermitente');\r\n                        if (isInt) {\r\n                            folgasVR++;\r\n                        } else {\r\n                            faltasVR++;\r\n                        }\r\n                    }\r\n                });`,
    `\r\n                    d.perdeVRPorHoras = false; // Nova regra: ≥ 2h sempre gera VR — sem penalidade por horas\r\n\r\n                    const mTr = (c.meio_transporte || '').toLowerCase();\r\n                    const isVC = typeof _isVC === 'function' ? _isVC(mTr) : false;\r\n\r\n                    if (tipo2 === 'justificado' || tipo2 === 'falta') {\r\n                        faltasTotal++;\r\n                        if (tipo2 === 'justificado') faltasJustificadasTotal++;\r\n                        faltasVR++;\r\n                        faltasVT++;\r\n                    } else if (tipo2 === 'folga') {\r\n                        folgasTotal++;\r\n                        folgasVR++;\r\n                        folgasVT++;\r\n                    } else if (tipo2 === 'ferias') {\r\n                        folgasTotal++; // Global accounts as folga\r\n                        folgasVR++; // Férias é folga no VR\r\n                        if (isVC) {\r\n                            faltasVT++; // Para Vale Combustível, Férias desconta (Falta)\r\n                        } else {\r\n                            folgasVT++; // Para Vale Transporte, Férias NÃO desconta (Folga)\r\n                        }\r\n                    }\r\n                });`
);

// ─────────────────────────────────────────────────────────────────────────────
// MUDANÇA 3: diasVR filter — idJustification branch
// Antes: falta justificada com qualquer hora → return false (não conta VR)
// Depois: se trabalhou ≥ 2h mesmo com justificativa → conta VR (nova regra)
// ─────────────────────────────────────────────────────────────────────────────
rep(
    '3. diasVR idJustification: ≥2h → conta VR',
    `                            if (isExtVR) return true; // trab. externo → conta VR\r\n                            return false; // falta justificada → não conta VR`,
    `                            if (isExtVR) return true; // trab. externo → conta VR\r\n                            // Nova regra: se trabalhou ≥ 2h mesmo com justificativa → conta VR\r\n                            if ((d.totalHorasTrabalhadas || 0) >= MIN_VR) return true;\r\n                            return false; // falta justificada sem horas → não conta VR`
);

// ─────────────────────────────────────────────────────────────────────────────
// MUDANÇA 4: diasVR filter — simplificar regra domingo e fallback MIN_VR
// A regra especial de domingo (>= 120min) agora é igual à regra geral (MIN_VR = 120).
// Remove bloco especial e usa só o return final (que agora já usa MIN_VR = 120).
// ─────────────────────────────────────────────────────────────────────────────
rep(
    '4. diasVR simplifica regra domingo (MIN_VR já é 120)',
    `                        // FALLBACK: trabalhou >= 6h sem horário cadastrado\r\n                        const minTrabFallback = d.totalHorasTrabalhadas || 0;\r\n                        \r\n                        // -- NOVA REGRA DOMINGO --\r\n                        const dStr2 = String(d.date || d.dateTimeStr || '').substring(0, 10);\r\n                        const dParsed2 = new Date(dStr2 + 'T12:00:00');\r\n                        const isDom2 = !isNaN(dParsed2) && dParsed2.getDay() === 0;\r\n\r\n                        if (isDom2 && minTrabFallback >= 120) {\r\n                            const escTipo = (c.escala_tipo || '').toLowerCase();\r\n                            const isEscalaExcluidaDom = escTipo.includes('uma_folga') || escTipo.includes('duas_folgas') || escTipo.includes('12x36');\r\n                            if (!isEscalaExcluidaDom) {\r\n                                return true; // Domingo vale VR se trabalhou o mínimo e não é de escala excluída\r\n                            }\r\n                        }\r\n                        \r\n                        return minTrabFallback >= MIN_VR;`,
    `                        // FALLBACK: trabalhou >= 2h sem horário cadastrado (nova regra unificada — vale para todos os dias)\r\n                        const minTrabFallback = d.totalHorasTrabalhadas || 0;\r\n                        return minTrabFallback >= MIN_VR; // MIN_VR = 120min = 2h`
);

// ─────────────────────────────────────────────────────────────────────────────
// MUDANÇA 5: _ehDiaFolgaEscala — só aplica 'folga' se não trabalhou ≥ 2h
// Se o colaborador tinha justificativa em dia de folga MAS trabalhou ≥ 2h → VR
// ─────────────────────────────────────────────────────────────────────────────
rep(
    '5. _ehDiaFolgaEscala: folga só se hT2 < 120',
    `                        const isFolgaEscala2 = typeof _ehDiaFolgaEscala === 'function'\r\n                            && _ehDiaFolgaEscala(c, dStr2Just);\r\n                        if (isFolgaEscala2) {\r\n                            tipo2 = 'folga'; // Folga da escala → não desconta mesmo com justificativa\r\n                        } else if (isErroP2 || isExterno2 || hT2 > 0) {`,
    `                        const isFolgaEscala2 = typeof _ehDiaFolgaEscala === 'function'\r\n                            && _ehDiaFolgaEscala(c, dStr2Just);\r\n                        if (isFolgaEscala2 && hT2 < MIN_VR) {\r\n                            tipo2 = 'folga'; // Folga da escala sem horas suficientes → não desconta\r\n                        } else if (isErroP2 || isExterno2 || hT2 > 0) {`
);

// ─────────────────────────────────────────────────────────────────────────────
// MUDANÇA 6: perdeVRPorHorasUI (exibição visual) — remover bloco
// A cor amarela indicava "perdeu VR por horas". Com nova regra não existe mais.
// Mantemos a variável como false para não quebrar referência em linha 2959.
// ─────────────────────────────────────────────────────────────────────────────
rep(
    '6. Remove perdeVRPorHorasUI (UI visual)',
    `                // --- NOVA REGRA DE CARGA HORÁRIA MÍNIMA PARA VR (UI) ---\r\n                const escTipoUI = (c.escala_tipo || '').toLowerCase();\r\n                const isEscalaExcecaoUI = escTipoUI === 'padrao_sab_4h' || escTipoUI === 'padrao_sab_alternado';\r\n                const isEscalaExcluidaDomUI = escTipoUI.includes('uma_folga') || escTipoUI.includes('duas_folgas') || escTipoUI.includes('12x36');\r\n                const limiteMinutosUI = (isSat && isEscalaExcecaoUI) ? 180 : 360;\r\n                \r\n                const isAusenciaRegra = isFlt || tipo === 'justificado' || tipo === 'atestado' || d.idJustification;\r\n                let perdeVRPorHorasUI = !isAusenciaRegra && hTrab > 0 && hTrab < limiteMinutosUI;\r\n                \r\n                if (isSunday && !isEscalaExcluidaDomUI) {\r\n                    perdeVRPorHorasUI = false;\r\n                }`,
    `                // Nova regra: qualquer dia com >= 2h trabalhadas gera VR — sem penalidade por horas\r\n                const perdeVRPorHorasUI = false; // Regra de mínimo de horas removida`
);

// ─────────────────────────────────────────────────────────────────────────────
// MUDANÇA 7: Atualizar comentário do diasVR filter (linha ~1877)
// ─────────────────────────────────────────────────────────────────────────────
rep(
    '7. Atualiza comentário diasVR',
    `                // ── diasVR = dias com horário contratual agendado na janela RHID ──\r\n                // Regra VR: conta todo dia em que o colaborador tinha escala contratual.\r\n                // Exclui: FOLGA ESCALA sem horário (5x2/6x1), DSR puro de Domingo, FERIADO sem escala.\r\n                // Inclui: TRABALHADO, JUSTIFICADO, FALTA, DSR e FERIADO em dias agendados (7x0).\r\n                // FALLBACK: se RHID retorna idHorarioContratual=0 mas o colaborador trabalhou >= 6h\r\n                //   (ex: DSR marcado incorretamente), o dia conta como dia VR pelo trabalho realizado.\r\n                // Fallback final: sem dados RHID → usa dias de escala.\r\n                // MIN_VR já definido acima (360 min = 6h)`,
    `                // ── diasVR = dias com VR na janela RHID ──────────────────────────\r\n                // Regra VR (nova): todo dia em que o colaborador trabalhou >= 2h (MIN_VR = 120min) conta VR.\r\n                // Exclui: dias com idJustification e 0h trabalhadas (ausência real sem horas).\r\n                // Inclui: TRABALHADO qualquer horário ≥ 2h, DSR/Feriado ≥ 2h, dias agendados com horário.\r\n                // Fallback final: sem dados RHID → usa dias de escala.`
);

// ─────────────────────────────────────────────────────────────────────────────
// SALVAR
// ─────────────────────────────────────────────────────────────────────────────
fs.writeFileSync('frontend/recibos.js', c, 'utf8');

console.log('\n══════════════════════════════════════════');
console.log('Mudanças aplicadas: ' + aplicadas + '/7');
if (erros.length) {
    console.log('\nERROS:');
    erros.forEach(e => console.log('  ❌ ' + e));
} else {
    console.log('Nenhum erro.');
}

// ─────────────────────────────────────────────────────────────────────────────
// VERIFICAÇÕES
// ─────────────────────────────────────────────────────────────────────────────
const cf = fs.readFileSync('frontend/recibos.js', 'utf8');
console.log('\n── Verificações ──');
console.log('MIN_VR = 120:', cf.includes('const MIN_VR = 120;'));
console.log('perdeVRPorHoras=false (linha única):', cf.includes('d.perdeVRPorHoras = false;'));
console.log('perdeVRPorHorasUI=false (linha única):', cf.includes('const perdeVRPorHorasUI = false;'));
console.log('isFolgaEscala2 com hT2 < MIN_VR:', cf.includes('isFolgaEscala2 && hT2 < MIN_VR'));
console.log('diasVR MIN_VR = 120min comment:', cf.includes('MIN_VR = 120min = 2h'));
console.log('diasVR >=120 na just.:', cf.includes('>= MIN_VR) return true;'));
// Garante que o bloco antigo foi removido
console.log('perdeVRPorHoras block REMOVIDO:', !cf.includes('if (perdeVRPorHoras) {'));
console.log('limiteMinutos UI REMOVIDO:', !cf.includes('limiteMinutosUI'));
console.log('isEscalaExcecaoUI REMOVIDO:', !cf.includes('isEscalaExcecaoUI'));
console.log('Tamanho arquivo:', (cf.length / 1024).toFixed(1) + ' KB');
