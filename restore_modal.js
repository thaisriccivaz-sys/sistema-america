const cp = require('child_process');
const stdout = cp.execSync('git show HEAD~4:frontend/index.html').toString();
const idx = stdout.indexOf('id="modal-cred-colab"');
if (idx !== -1) {
    const start = stdout.lastIndexOf('<!--', idx);
    const end = stdout.indexOf('<!-- MODAL: SELECIONAR VEICULO PARA CREDENCIAMENTO -->', idx);
    console.log(stdout.substring(start, end));
} else {
    console.log('Not found');
}
