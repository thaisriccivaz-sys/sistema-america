// Simulação exata do cálculo de jantar para Julio Cesar
// usando os dados da conferência fornecida pelo usuário

const dias = [
    // [data, previsto_str, total_normais_min, horasUteis_RHID_estimado]
    // TOTAL NORMAIS em minutos (da conferência)
    // horasUteis: RHID retorna 6h (360min) para "18:00-00:00"? — testamos as duas hipóteses

    // Days with "18:00-00:00" schedule
    { data: '01/08 SAB', previsto: '18:00-00:00', minTrab: 6*60+2,  isSat: true  },
    { data: '04/08 TER', previsto: '18:00-00:00', minTrab: 9*60+53, isSat: false },
    { data: '05/08 QUA', previsto: '18:00-00:00', minTrab: 9*60+47, isSat: false },
    { data: '06/08 QUI', previsto: '18:00-00:00', minTrab: 12*60+1, isSat: false },
    { data: '07/08 SEX', previsto: '18:00-00:00', minTrab: 6*60+5,  isSat: false },
    { data: '08/08 SAB', previsto: '18:00-00:00', minTrab: 10*60+31,isSat: true  },
    { data: '09/08 DOM', previsto: '18:00-00:00', minTrab: 12*60+41,isSat: false },
    { data: '10/08 SEG', previsto: '18:00-00:00', minTrab: 9*60+28, isSat: false },
    { data: '11/08 TER', previsto: '18:00-00:00', minTrab: 9*60+5,  isSat: false },
    { data: '12/08 QUA', previsto: '18:00-00:00', minTrab: 8*60+3,  isSat: false },
    { data: '23/08 DOM', previsto: '18:00-00:00', minTrab: 6*60+51, isSat: false },
    // Day without schedule (extra shift daytime)
    { data: '30/08 DOM', previsto: '',             minTrab: 9*60+3,  isSat: false },
];

// Função _parseHorasPrevistas — replica exata do código
function parseHorasPrevistas(d) {
    // Simular horasUteis RHID: se "18:00-00:00", RHID pode retornar 360min
    // CENÁRIO A: horasUteis = 360 (RHID informa horas úteis corretamente)
    // CENÁRIO B: horasUteis = 0 (RHID não informa, parser falha no horário meia-noite)
    return d._hPrev; // injetado abaixo
}

function verificaJantar(d, hPrev) {
    const minTrab = d.minTrab;
    if (hPrev > 0) {
        // SAB jornada curta <= 5h: exige 11h01 (661min)
        const minJantar = (d.isSat && hPrev <= 300) ? 661 : 540;
        const threshold = Math.max(hPrev + 180, minJantar);
        const ok = minTrab >= threshold;
        return { ok, threshold, hPrev, minJantar };
    }
    // Sem escala: mínimo 12h (720min)
    const ok = minTrab >= 720;
    return { ok, threshold: 720, hPrev: 0, minJantar: 0 };
}

// ── CENÁRIO A: horasUteis = 360 para "18:00-00:00" ──────────────────────────
console.log('\n══════════════════════════════════════════════════════');
console.log('CENÁRIO A: RHID retorna horasUteis = 360min (6h) para "18:00-00:00"');
console.log('── Limiar de jantar: max(360+180, 540) = 540min (9h) ──');
console.log('══════════════════════════════════════════════════════');
let totalA = 0;
dias.forEach(d => {
    const hPrev = d.previsto ? 360 : 0; // "18:00-00:00" → RHID informa 6h
    const r = verificaJantar(d, hPrev);
    const mark = r.ok ? '✅ JANTAR' : '❌';
    const hMin = `${Math.floor(d.minTrab/60)}h${String(d.minTrab%60).padStart(2,'0')}`;
    const hThr = `${Math.floor(r.threshold/60)}h${String(r.threshold%60).padStart(2,'0')}`;
    console.log(`${d.data.padEnd(12)} | trabalhado: ${hMin.padStart(7)} | threshold: ${hThr} | ${mark}`);
    if (r.ok) totalA++;
});
console.log(`\nTotal jantares CENÁRIO A: ${totalA}`);

// ── CENÁRIO B: horasUteis = 0 (parser falha em horário meia-noite) ──────────
console.log('\n══════════════════════════════════════════════════════');
console.log('CENÁRIO B: _parseHorasPrevistas retorna 0 (bug: "18:00-00:00" não parseia)');
console.log('── Limiar de jantar: 720min (12h) para todos ──');
console.log('══════════════════════════════════════════════════════');
let totalB = 0;
dias.forEach(d => {
    const hPrev = 0; // parser falha para horário meia-noite
    const r = verificaJantar(d, hPrev);
    const mark = r.ok ? '✅ JANTAR' : '❌';
    const hMin = `${Math.floor(d.minTrab/60)}h${String(d.minTrab%60).padStart(2,'0')}`;
    console.log(`${d.data.padEnd(12)} | trabalhado: ${hMin.padStart(7)} | threshold: 12h00 | ${mark}`);
    if (r.ok) totalB++;
});
console.log(`\nTotal jantares CENÁRIO B: ${totalB}`);

// ── VERIFICAÇÃO: O que dá exatamente 8? ──────────────────────────────────────
console.log('\n══════════════════════════════════════════════════════');
console.log('ANÁLISE: o que produz exatamente 8 jantares?');
console.log('══════════════════════════════════════════════════════');
// Cenário A dá quantos?
console.log('Cenário A (hPrev=360):', totalA, 'jantares');
console.log('Cenário B (hPrev=0):  ', totalB, 'jantares');
console.log('\nDias que ficam no limite (próximos do threshold 540):');
dias.forEach(d => {
    if (d.previsto) {
        const diff = d.minTrab - 540;
        if (diff > -60 && diff < 60) {
            console.log(`  ${d.data}: trabalhado=${d.minTrab}min, diff vs 540=${diff>0?'+':''}${diff}min`);
        }
    }
});
