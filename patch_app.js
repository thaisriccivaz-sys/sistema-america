const fs = require('fs');
let app = fs.readFileSync('frontend/app.js', 'utf8');

const targetStr = `    // Rota Redonda — container visível
    const viewRotaRedondaInterval = document.getElementById('rota-redonda-container');
    const isRotaRedondaActive = viewRotaRedondaInterval && viewRotaRedondaInterval.offsetParent !== null;

    const shouldShow = isColabActive || isGerActive || isCargosActive ||
        isFaculdadeActive || isEpiActive || isAvaliacoesActive ||
        isDissidioActive || isSenhasActive || isRotaRedondaActive || isAgendaActive || isRhAgendaActive;

    btnHistory.style.display = shouldShow ? 'flex' : 'none';

    // Redireciona o onclick para a função correta
    if (isSenhasActive) {
        btnHistory.onclick = () => typeof window.abrirHistoricoSenhas === 'function' ? window.abrirHistoricoSenhas() : null;
    } else {
        btnHistory.onclick = () => window.showHistoryPopup();
    }`;

const replaceStr = `    // Rota Redonda — container visível
    const viewRotaRedondaInterval = document.getElementById('rota-redonda-container');
    const isRotaRedondaActive = viewRotaRedondaInterval && viewRotaRedondaInterval.offsetParent !== null;

    const viewResumoRota = document.getElementById('view-logistica-resumo-rota');
    const isResumoRotaActive = viewResumoRota && viewResumoRota.classList.contains('active');

    const shouldShow = isColabActive || isGerActive || isCargosActive ||
        isFaculdadeActive || isEpiActive || isAvaliacoesActive ||
        isDissidioActive || isSenhasActive || isRotaRedondaActive || isAgendaActive || isRhAgendaActive || isResumoRotaActive;

    btnHistory.style.display = shouldShow ? 'flex' : 'none';

    // Redireciona o onclick para a função correta
    if (isSenhasActive) {
        btnHistory.onclick = () => typeof window.abrirHistoricoSenhas === 'function' ? window.abrirHistoricoSenhas() : null;
    } else if (isResumoRotaActive && typeof window._rrAbrirHistoricoAlteracoes === 'function') {
        btnHistory.onclick = () => window._rrAbrirHistoricoAlteracoes();
    } else if (isRhAgendaActive && typeof window.rhAgendaAbrirHistorico === 'function') {
        btnHistory.onclick = () => window.rhAgendaAbrirHistorico();
    } else if (isAgendaActive && typeof window.agendaAbrirHistorico === 'function') {
        btnHistory.onclick = () => window.agendaAbrirHistorico();
    } else {
        btnHistory.onclick = () => window.showHistoryPopup();
    }`;

let fixedApp = app.replace(targetStr, replaceStr);
if(fixedApp === app) {
    fixedApp = app.replace(targetStr.replace(/\r\n/g,'\n'), replaceStr.replace(/\r\n/g,'\n'));
}

if(fixedApp !== app) {
    fs.writeFileSync('frontend/app.js', fixedApp, 'utf8');
    console.log('Successfully patched app.js');
} else {
    console.log('Target string not found!');
}
