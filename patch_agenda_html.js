const fs = require('fs');
let html = fs.readFileSync('frontend/index.html', 'utf8');

// 1. Adicionar nav item depois de Sinistros no menu
const sinistrosNav = `data-target="logistica-sinistros" onclick="navigateTo('logistica-sinistros'); return false;"><i class="ph ph-car-crash"></i> Sinistros</a>`;
if (!html.includes('logistica-agenda')) {
    html = html.replace(sinistrosNav, sinistrosNav + `
                    <a href="#" class="nav-item" data-target="logistica-agenda" onclick="navigateTo('logistica-agenda'); return false;"><i class="ph ph-calendar-check"></i> Agenda</a>`);
    console.log('Nav item adicionado');
} else {
    console.log('Nav item ja existe');
}

// 2. Adicionar a view da agenda (antes da view sinistros)
const sinistrosViewMarker = '<!-- VIEW: SINISTROS LOG';
if (!html.includes('view-logistica-agenda')) {
    html = html.replace(sinistrosViewMarker,
        '<!-- VIEW: AGENDA LOGISTICA -->\n    <section id="view-logistica-agenda" class="content-view" style="padding:0; background:#f0f4f8;">\n        <div id="logistica-agenda-container"></div>\n    </section>\n\n    ' + sinistrosViewMarker
    );
    console.log('View adicionada');
} else {
    console.log('View ja existe');
}

// 3. Adicionar script antes do </body>
if (!html.includes('logistica_agenda.js')) {
    html = html.replace('</body>', '    <script src="logistica_agenda.js"></script>\n</body>');
    console.log('Script adicionado');
} else {
    console.log('Script ja existe');
}

fs.writeFileSync('frontend/index.html', html);
console.log('DONE');
