const cp = require('child_process');
for(let i=0; i<30; i++) {
    try {
        const stdout = cp.execSync('git show HEAD~' + i + ':frontend/index.html').toString();
        const idx = stdout.indexOf('id="modal-cred-colab"');
        if (idx !== -1) {
            console.log('Found in HEAD~' + i);
            const start = stdout.lastIndexOf('<!--', idx);
            const end = stdout.indexOf('<!-- MODAL: SELECIONAR VEICULO', idx);
            console.log(stdout.substring(start, end));
            break;
        }
    } catch(e) {}
}
