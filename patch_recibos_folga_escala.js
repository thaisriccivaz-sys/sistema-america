const fs = require('fs');
let c = fs.readFileSync('frontend/recibos.js', 'utf8');

// Detect line endings
const hasCRLF = c.includes('\r\n');
const NL = hasCRLF ? '\r\n' : '\n';

let changes = 0;

function rep(oldStr, newStr, label) {
    if (c.includes(oldStr)) {
        const count = c.split(oldStr).length - 1;
        if (count > 1) { console.log(label + ' MULTI-MATCH (' + count + ') — skip'); return false; }
        c = c.replace(oldStr, newStr);
        changes++;
        console.log(label + ' OK');
        return true;
    }
    const altOld = oldStr.replace(/\r\n/g, '\n');
    if (c.includes(altOld)) {
        const altNew = newStr.replace(/\r\n/g, '\n');
        const count = c.split(altOld).length - 1;
        if (count > 1) { console.log(label + ' MULTI-MATCH LF — skip'); return false; }
        c = c.replace(altOld, altNew);
        changes++;
        console.log(label + ' OK (LF)');
        return true;
    }
    console.log(label + ' MISS — "' + oldStr.substring(0, 60).replace(/\r\n/g, ' ') + '"');
    return false;
}

// ─────────────────────────────────────────────────────────────────
// PASSO 1: Inserir a função _ehDiaFolgaEscala() ANTES de _calcularDiasEscala
//
// Esta função recebe o objeto colaborador e uma data (string YYYY-MM-DD)
// e retorna TRUE se aquele dia é folga programada pela escala do colaborador.
// Se for folga → dia justificado deve ser reclassificado como folga (sem desconto).
// ─────────────────────────────────────────────────────────────────

const funcaoFolgaEscala = `/**${NL}` +
` * Retorna true se a data (string 'YYYY-MM-DD') é um dia de FOLGA PROGRAMADA${NL}` +
` * pela escala do colaborador. Usado para não descontar VR/VT/VC em dias de${NL}` +
` * atestado/justificativa que caem em folgas da escala.${NL}` +
` *${NL}` +
` * Escalas suportadas:${NL}` +
` *   padrao_seg_sexta / null → folga = Sáb e Dom${NL}` +
` *   padrao_seis_dias / padrao_sab_4h → folga = Dom${NL}` +
` *   padrao_sab_alternado → folga = Dom + Sábs ímpares (pelo ciclo)${NL}` +
` *   escala_duas_folgas → folga = dias fixos + domingos rotativos${NL}` +
` *   12x36 → folga = dias de descanso de 36h (calculado pelo ciclo)${NL}` +
` *   24x72 → folga = dias de descanso de 72h (calculado pelo ciclo)${NL}` +
` */` + NL +
`function _ehDiaFolgaEscala(colab, dateStr) {${NL}` +
`    if (!dateStr) return false;${NL}` +
`    const d = new Date(dateStr + 'T12:00:00');${NL}` +
`    if (isNaN(d)) return false;${NL}` +
`    const ds = d.getDay(); // 0=Dom, 1=Seg ... 6=Sáb${NL}` +
`    const escalaTipo = (colab.escala_tipo || '').trim().toLowerCase();${NL}` +
`    const cicloRef = colab.escala_ciclo_inicio${NL}` +
`        ? new Date(colab.escala_ciclo_inicio + 'T00:00:00')${NL}` +
`        : null;${NL}` +
`${NL}` +
`    // ── 12x36: dia de trabalho ou folga baseado no ciclo ──────────────────${NL}` +
`    // Ciclo: [TRABALHO, FOLGA, TRABALHO, FOLGA, ...] alternando por dia${NL}` +
`    // O ciclo_inicio marca um dia de TRABALHO (dia 0 do ciclo).${NL}` +
`    // Dias pares do ciclo = trabalho, dias ímpares = folga.${NL}` +
`    if (escalaTipo === '12x36' || escalaTipo.includes('12x36')) {${NL}` +
`        if (!cicloRef) return false; // sem referência, não é possível determinar${NL}` +
`        const MS_DIA = 24 * 60 * 60 * 1000;${NL}` +
`        // Zerar horas para comparação de dias${NL}` +
`        const refDay = new Date(cicloRef.getFullYear(), cicloRef.getMonth(), cicloRef.getDate());${NL}` +
`        const curDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());${NL}` +
`        const diffDias = Math.round((curDay - refDay) / MS_DIA);${NL}` +
`        // diffDias par = mesmo ciclo que ciclo_inicio (dia de TRABALHO)${NL}` +
`        // diffDias ímpar = dia de FOLGA (36h de descanso)${NL}` +
`        const ehFolga12x36 = ((diffDias % 2) + 2) % 2 === 1;${NL}` +
`        return ehFolga12x36;${NL}` +
`    }${NL}` +
`${NL}` +
`    // ── 24x72: folga nos 3 dias de descanso após 1 dia de trabalho ─────────${NL}` +
`    if (escalaTipo === '24x72' || escalaTipo.includes('24x72')) {${NL}` +
`        if (!cicloRef) return false;${NL}` +
`        const MS_DIA = 24 * 60 * 60 * 1000;${NL}` +
`        const refDay = new Date(cicloRef.getFullYear(), cicloRef.getMonth(), cicloRef.getDate());${NL}` +
`        const curDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());${NL}` +
`        const diffDias = Math.round((curDay - refDay) / MS_DIA);${NL}` +
`        // Ciclo de 4 dias: [TRABALHO=0, FOLGA=1, FOLGA=2, FOLGA=3]${NL}` +
`        const posNoCiclo = ((diffDias % 4) + 4) % 4;${NL}` +
`        return posNoCiclo !== 0; // 1,2,3 = folga; 0 = trabalho${NL}` +
`    }${NL}` +
`${NL}` +
`    // ── padrao_seis_dias / padrao_sab_4h: Seg-Sáb, folga = Dom ──────────${NL}` +
`    if (escalaTipo === 'padrao_seis_dias' || escalaTipo === 'padrao_sab_4h') {${NL}` +
`        return ds === 0; // Domingo = folga${NL}` +
`    }${NL}` +
`${NL}` +
`    // ── padrao_sab_alternado: Seg-Sex + Sábs alternados ───────────────────${NL}` +
`    if (escalaTipo === 'padrao_sab_alternado') {${NL}` +
`        if (ds === 0) return true; // Dom sempre folga${NL}` +
`        if (ds !== 6) return false; // Seg-Sex nunca folga${NL}` +
`        // Sáb: verificar ciclo (par=trabalho, ímpar=folga)${NL}` +
`        if (!cicloRef) return false;${NL}` +
`        const MS_SEMANA = 7 * 24 * 60 * 60 * 1000;${NL}` +
`        const refSab = new Date(cicloRef);${NL}` +
`        while (refSab.getDay() !== 6) refSab.setDate(refSab.getDate() + 1);${NL}` +
`        const semanas = Math.round((d - refSab) / MS_SEMANA);${NL}` +
`        return ((semanas % 2) + 2) % 2 !== 0; // ímpar = folga${NL}` +
`    }${NL}` +
`${NL}` +
`    // ── escala_duas_folgas: folgas fixas + domingos rotativos ─────────────${NL}` +
`    if (escalaTipo === 'escala_duas_folgas') {${NL}` +
`        const DIAS_NOME = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];${NL}` +
`        let diasFolgaFixos = [];${NL}` +
`        let temDomingoNasFolgas = false;${NL}` +
`        try {${NL}` +
`            const folgas = JSON.parse(colab.escala_folgas || '[]');${NL}` +
`            temDomingoNasFolgas = folgas.some(f => f.toLowerCase() === 'dom');${NL}` +
`            diasFolgaFixos = folgas.map(f => DIAS_NOME.indexOf(f)).filter(n => n > 0);${NL}` +
`        } catch(e) {}${NL}` +
`        if (diasFolgaFixos.includes(ds)) return true; // folga fixa${NL}` +
`        if (ds === 0 && temDomingoNasFolgas) {${NL}` +
`            // Dom rotativo: posição 2 no ciclo de 3 = folga${NL}` +
`            if (!cicloRef) return false;${NL}` +
`            const MS_SEMANA = 7 * 24 * 60 * 60 * 1000;${NL}` +
`            const refDom = new Date(cicloRef);${NL}` +
`            while (refDom.getDay() !== 0) refDom.setDate(refDom.getDate() + 1);${NL}` +
`            const semanas = Math.round((d - refDom) / MS_SEMANA);${NL}` +
`            const pos = ((semanas % 3) + 3) % 3;${NL}` +
`            return pos === 2; // posição 2 = folga no ciclo${NL}` +
`        }${NL}` +
`        return false;${NL}` +
`    }${NL}` +
`${NL}` +
`    // ── padrao_seg_sexta / null / padrão → folga = Sáb e Dom ────────────${NL}` +
`    return ds === 0 || ds === 6; // Sábado e Domingo = folga${NL}` +
`}${NL}` +
`${NL}`;

// Inserir antes da função _calcularDiasEscala
const anchor = `/**${NL} * ─── NOVA REGRA DE CRÉDITO`;
if (c.includes(anchor)) {
    c = c.replace(anchor, funcaoFolgaEscala + anchor);
    changes++;
    console.log('PASSO 1: _ehDiaFolgaEscala inserida OK');
} else {
    // Try LF version
    const anchorLF = anchor.replace(/\r\n/g, '\n');
    if (c.includes(anchorLF)) {
        c = c.replace(anchorLF, funcaoFolgaEscala.replace(/\r\n/g, '\n') + anchorLF);
        changes++;
        console.log('PASSO 1: _ehDiaFolgaEscala inserida OK (LF)');
    } else {
        console.log('PASSO 1: MISS anchor para _calcularDiasEscala');
    }
}

// ─────────────────────────────────────────────────────────────────
// PASSO 2: Na classificação diária (linha ~1638), antes de classificar
//          idJustification como 'justificado', verificar se o dia
//          é folga da escala. Se for folga → 'folga' (sem desconto).
// ─────────────────────────────────────────────────────────────────

rep(
`                    } else if (d.idJustification) {` + NL +
`                        const ob2 = (d.toolTipAlert || '').toLowerCase();` + NL +
`                        const abr2 = (d.abreviationJustification || '').toLowerCase().trim();` + NL +
`                        const st2  = (d.status || d.situacao || d.tipo || '').toString().toLowerCase();` + NL +
`                        const isErroP2  = ob2.includes('erro no ponto');` + NL +
`                        const isExterno2 = ob2.includes('trabalho externo') || ob2.includes('trab. externo')` + NL +
`                                        || ob2.includes('trab externo') || ob2.includes('externo')` + NL +
`                                        || (ob2.includes('servi') && ob2.includes('externo'))` + NL +
`                                        // Campo status/situacao do RHID` + NL +
`                                        || st2.includes('externo') || st2.includes('trab. ext')` + NL +
`                                        || st2 === 'te'` + NL +
`                                        // Abreviação do RHID (ex: "TE", "T.E.", "TRAB.EXT.")` + NL +
`                                        || abr2 === 'te' || abr2 === 't.e.' || abr2.startsWith('te ')` + NL +
`                                        || abr2.includes('ext')` + NL +
`                                        // ── Texto nas entradas de marcação (listAfdtManutencao) ──────────` + NL +
`                                        // O RHID escreve "Trabalho Externo" como texto nas marcações` + NL +
`                                        || (d.listAfdtManutencao || d.marcacoes || []).some(m => {` + NL +
`                                            const _j = JSON.stringify(m || '').toLowerCase();` + NL +
`                                            return _j.includes('externo') || _j.includes('trabalho ext');` + NL +
`                                        });` + NL +
`                        if (isErroP2 || isExterno2 || hT2 > 0) {` + NL +
`                            tipo2 = ''; // Trabalhado (erro de ponto / trabalho externo → não conta falta)` + NL +
`                        } else {` + NL +
`                            tipo2 = 'justificado'; // Falta justificada genuína` + NL +
`                        }`,

`                    } else if (d.idJustification) {` + NL +
`                        const ob2 = (d.toolTipAlert || '').toLowerCase();` + NL +
`                        const abr2 = (d.abreviationJustification || '').toLowerCase().trim();` + NL +
`                        const st2  = (d.status || d.situacao || d.tipo || '').toString().toLowerCase();` + NL +
`                        const isErroP2  = ob2.includes('erro no ponto');` + NL +
`                        const isExterno2 = ob2.includes('trabalho externo') || ob2.includes('trab. externo')` + NL +
`                                        || ob2.includes('trab externo') || ob2.includes('externo')` + NL +
`                                        || (ob2.includes('servi') && ob2.includes('externo'))` + NL +
`                                        // Campo status/situacao do RHID` + NL +
`                                        || st2.includes('externo') || st2.includes('trab. ext')` + NL +
`                                        || st2 === 'te'` + NL +
`                                        // Abreviação do RHID (ex: "TE", "T.E.", "TRAB.EXT.")` + NL +
`                                        || abr2 === 'te' || abr2 === 't.e.' || abr2.startsWith('te ')` + NL +
`                                        || abr2.includes('ext')` + NL +
`                                        // ── Texto nas entradas de marcação (listAfdtManutencao) ──────────` + NL +
`                                        // O RHID escreve "Trabalho Externo" como texto nas marcações` + NL +
`                                        || (d.listAfdtManutencao || d.marcacoes || []).some(m => {` + NL +
`                                            const _j = JSON.stringify(m || '').toLowerCase();` + NL +
`                                            return _j.includes('externo') || _j.includes('trabalho ext');` + NL +
`                                        });` + NL +
`                        // ── NOVA REGRA: dia de folga da escala NÃO desconta VR/VT/VC ──` + NL +
`                        // Se o atestado/justificativa cobre um dia que é folga programada` + NL +
`                        // pela escala do colaborador, tratar como folga (sem desconto).` + NL +
`                        const dStr2Just = String(d.date || d.dateTimeStr || '').substring(0, 10);` + NL +
`                        const isFolgaEscala2 = typeof _ehDiaFolgaEscala === 'function'` + NL +
`                            && _ehDiaFolgaEscala(c, dStr2Just);` + NL +
`                        if (isFolgaEscala2) {` + NL +
`                            tipo2 = 'folga'; // Folga da escala → não desconta mesmo com justificativa` + NL +
`                        } else if (isErroP2 || isExterno2 || hT2 > 0) {` + NL +
`                            tipo2 = ''; // Trabalhado (erro de ponto / trabalho externo → não conta falta)` + NL +
`                        } else {` + NL +
`                            tipo2 = 'justificado'; // Falta justificada genuína` + NL +
`                        }`,
'PASSO 2: verificar folga escala antes de classificar justificado'
);

// ─────────────────────────────────────────────────────────────────
// PASSO 3: Salvar e verificar
// ─────────────────────────────────────────────────────────────────
fs.writeFileSync('frontend/recibos.js', c, 'utf8');
console.log('\nTotal de mudanças aplicadas:', changes);

const cf = fs.readFileSync('frontend/recibos.js', 'utf8');
console.log('\nVerificações:');
console.log('_ehDiaFolgaEscala definida:', cf.indexOf('function _ehDiaFolgaEscala') > 0);
console.log('12x36 tratado:', cf.indexOf('12x36') > 0);
console.log('24x72 tratado:', cf.indexOf('24x72') > 0);
console.log('isFolgaEscala2 no loop:', cf.indexOf('isFolgaEscala2') > 0);
console.log('escala_duas_folgas tratado:', cf.indexOf('escala_duas_folgas') > 0);
console.log('Folga da escala nao desconta:', cf.indexOf('Folga da escala') > 0);
