const parseDate = (s) => {
    if (!s) return null;
    const d = new Date(String(s).split('T')[0] + 'T12:00:00');
    return isNaN(d.getTime()) ? null : d;
};
const diffDays = (a, b) => Math.floor((b - a) / 86400000);
const hj = () => { const d = new Date('2026-04-20T12:00:00'); return d; };

function calcularFerias(admissaoStr) {
    const admissao = parseDate(admissaoStr);
    if (!admissao) return null;
    const hoje = hj();

    const diasTotal = diffDays(admissao, hoje);
    const anosCompletos = Math.floor(diasTotal / 365);
    const periodos = [];
    for (let i = 0; i < anosCompletos; i++) {
        const inicio = new Date(admissao); inicio.setFullYear(inicio.getFullYear() + i);
        const fim = new Date(admissao);    fim.setFullYear(fim.getFullYear() + i + 1);
        const prazoGozo = new Date(fim);   prazoGozo.setFullYear(prazoGozo.getFullYear() + 1);
        const vencida = hoje > prazoGozo;
        const diasParaVencer = diffDays(hoje, prazoGozo);
        periodos.push({
            numero: i + 1,
            inicio: inicio.toISOString().split('T')[0],
            fim: fim.toISOString().split('T')[0],
            prazoGozo: prazoGozo.toISOString().split('T')[0],
            vencida,
            diasParaVencer,
        });
    }
    return { periodos, temDireitoAtual: true };
}
function agendadaDentroDoPeriodo(fIniStr, fFimStr, periodo) {
    if (!fIniStr || !periodo) return false;
    const ini = parseDate(fIniStr);
    const pFim = parseDate(periodo.fim);
    const pPrazo = parseDate(periodo.prazoGozo);
    return pFim && pPrazo && ini >= pFim && ini <= pPrazo;
}
const c = { data_admissao: '2024-06-20', ferias_programadas_inicio: '2026-04-26', ferias_programadas_fim: '2026-05-06' };
const hoje = hj();
const info = calcularFerias(c.data_admissao);
const fIni = parseDate(c.ferias_programadas_inicio);
console.log(info.periodos);
info.periodos.forEach((p, i) => {
    console.log('Período ' + i + ': vencida=' + p.vencida + ' dentro=' + agendadaDentroDoPeriodo(c.ferias_programadas_inicio, c.ferias_programadas_fim, p));
});
