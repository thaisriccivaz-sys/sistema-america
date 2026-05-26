const fs = require('fs');
let html = fs.readFileSync('frontend/index.html', 'utf8');
const modals = ['modal-cred-colab', 'modal-cred-veic', 'modal-cred-licenca'];
modals.forEach(id => {
    html = html.replace('id="' + id + '" class="modal"', 'id="' + id + '" class="modal" style="z-index:9999;"');
});
fs.writeFileSync('frontend/index.html', html, 'utf8');
console.log('z-index updated for modals');
