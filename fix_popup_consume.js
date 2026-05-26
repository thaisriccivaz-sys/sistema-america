const fs = require('fs');

let app = fs.readFileSync('frontend/app.js', 'utf8');

// Add global helper functions for marking read
const helpers = `
window.markExpNotifLida = function(id) {
    const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
    fetch('/api/experiencia/notificacoes/' + id + '/lida', { method: 'PUT', headers: { 'Authorization': 'Bearer ' + token } }).catch(()=>{});
};
window.markLogNotifLida = function(id) {
    const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
    fetch('/api/logistica/notificacoes/' + id + '/lida', { method: 'PUT', headers: { 'Authorization': 'Bearer ' + token } }).catch(()=>{});
};
`;

if (!app.includes('markLogNotifLida')) {
    app = app.replace('// --- POLLING', helpers + '\n// --- POLLING');
}

// Fix Experiencia
app = app.replace(
    `<button onclick="navigateTo('experiencia'); this.closest('[data-notif-id]').remove();"`,
    `<button onclick="window.markExpNotifLida(${'`${notif.id}`'}); navigateTo('experiencia'); this.closest('[data-notif-id]').remove();"`
);
app = app.replace(
    `<button onclick="this.closest('[data-notif-id]').remove();"`,
    `<button onclick="window.markExpNotifLida(${'`${notif.id}`'}); this.closest('[data-notif-id]').remove();"`
);

// Fix Logistica
app = app.replace(
    `<button onclick="navigateTo('logistica-credenciamento'); this.closest('[data-notif-id]').remove();"`,
    `<button onclick="window.markLogNotifLida(${'`${notif.id}`'}); navigateTo('logistica-credenciamento'); this.closest('[data-notif-id]').remove();"`
);
app = app.replace(
    `<button onclick="this.closest('[data-notif-id]').remove();"`,
    `<button onclick="window.markLogNotifLida(${'`${notif.id}`'}); this.closest('[data-notif-id]').remove();"`
);

// Remove the automatic fetches
app = app.replace(/fetch\(\`\/api\/experiencia\/notificacoes\/\$\{notif\.id\}\/lida\`\, \{\s*method\: \'PUT\'\,\s*headers\: \{ \'Authorization\'\: \`Bearer \$\{token\}\` \}\s*\}\)\.catch\(\(\) \=\> \{\}\)\;/g, '// markExpNotifLida removed from auto');
app = app.replace(/fetch\(\`\/api\/logistica\/notificacoes\/\$\{notif\.id\}\/lida\`\, \{\s*method\: \'PUT\'\,\s*headers\: \{ \'Authorization\'\: \`Bearer \$\{token\}\` \}\s*\}\)\.catch\(\(\) \=\> \{\}\)\;/g, '// markLogNotifLida removed from auto');

fs.writeFileSync('frontend/app.js', app);
