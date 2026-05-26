const fs = require('fs');

// 1. Remove botao Historico incorreto do rh_agenda.js
const rhFile = 'frontend/rh_agenda.js';
let rhText = fs.readFileSync(rhFile, 'utf8');
const marker = 'class="ag-nav-btn" onclick="if(typeof window.showHistoryPopup===';
const idx = rhText.indexOf(marker);
if (idx >= 0) {
    // Encontrar o fim do botao (termina em "> ")
    const endMarker = '</button> ';
    const endIdx = rhText.indexOf(endMarker, idx);
    if (endIdx >= 0) {
        // Achar o inicio do <button
        const startIdx = rhText.lastIndexOf('<button', idx);
        rhText = rhText.substring(0, startIdx) + rhText.substring(endIdx + endMarker.length);
        console.log('Botao historico removido do rh_agenda.js');
    }
} else {
    console.log('Botao historico NAO encontrado no rh_agenda.js');
}
fs.writeFileSync(rhFile, rhText, 'utf8');

// 2. Adicionar view-rh-agenda no setInterval de visibilidade do btn-history-page no app.js
const appFile = 'frontend/app.js';
let appText = fs.readFileSync(appFile, 'utf8');

// No setInterval de visibilidade - adicionar isRhAgendaActive
const visOld = `    const isAgendaActive = viewAgenda && viewAgenda.classList.contains('active');

    // Cofre de Senhas — container visível (não tem classe active, verifica display)
    const isSenhasActive = viewSenhas && viewSenhas.offsetParent !== null;

    // Rota Redonda — container visível
    const viewRotaRedondaInterval = document.getElementById('rota-redonda-container');
    const isRotaRedondaActive = viewRotaRedondaInterval && viewRotaRedondaInterval.offsetParent !== null;

    const shouldShow = isColabActive || isGerActive || isCargosActive ||
        isFaculdadeActive || isEpiActive || isAvaliacoesActive ||
        isDissidioActive || isSenhasActive || isRotaRedondaActive || isAgendaActive;`;

const visNew = `    const isAgendaActive = viewAgenda && viewAgenda.classList.contains('active');
    const viewRhAgenda = document.getElementById('view-rh-agenda');
    const isRhAgendaActive = viewRhAgenda && viewRhAgenda.classList.contains('active');

    // Cofre de Senhas — container visível (não tem classe active, verifica display)
    const isSenhasActive = viewSenhas && viewSenhas.offsetParent !== null;

    // Rota Redonda — container visível
    const viewRotaRedondaInterval = document.getElementById('rota-redonda-container');
    const isRotaRedondaActive = viewRotaRedondaInterval && viewRotaRedondaInterval.offsetParent !== null;

    const shouldShow = isColabActive || isGerActive || isCargosActive ||
        isFaculdadeActive || isEpiActive || isAvaliacoesActive ||
        isDissidioActive || isSenhasActive || isRotaRedondaActive || isAgendaActive || isRhAgendaActive;`;

if (appText.includes(visOld)) {
    appText = appText.replace(visOld, visNew);
    console.log('setInterval visibilidade: isRhAgendaActive adicionado');
} else {
    console.log('ERRO: trecho de visibilidade nao encontrado');
}

// 3. Adicionar contexto RH Agenda no showHistoryPopup
const histOld = `        const isAgendaActive = viewAgenda && viewAgenda.classList.contains('active');`;
const histNew = `        const isAgendaActive = viewAgenda && viewAgenda.classList.contains('active');
        const viewRhAgendaHist = document.getElementById('view-rh-agenda');
        const isRhAgendaActive = viewRhAgendaHist && viewRhAgendaHist.classList.contains('active');`;

if (appText.includes(histOld)) {
    appText = appText.replace(histOld, histNew);
    console.log('showHistoryPopup: isRhAgendaActive adicionado');
} else {
    console.log('ERRO: trecho showHistoryPopup nao encontrado');
}

// 4. Adicionar caso Agenda RH no if-else do showHistoryPopup
const histCaseOld = `        } else if (isAgendaActive) {
            url += \`?programa=Agenda Logística\`;
            labelText = 'Tela: Agenda Logística';
        } else if (isRotaRedondaActive) {`;
const histCaseNew = `        } else if (isAgendaActive) {
            url += \`?programa=Agenda Logística\`;
            labelText = 'Tela: Agenda Logística';
        } else if (isRhAgendaActive) {
            url += \`?programa=Agenda RH\`;
            labelText = 'Tela: Agenda RH';
        } else if (isRotaRedondaActive) {`;

if (appText.includes(histCaseOld)) {
    appText = appText.replace(histCaseOld, histCaseNew);
    console.log('showHistoryPopup: caso Agenda RH adicionado');
} else {
    console.log('ERRO: caso agenda nao encontrado');
}

fs.writeFileSync(appFile, appText, 'utf8');
console.log('Concluido!');
