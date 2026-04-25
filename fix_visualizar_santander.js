const fs = require('fs');
let app = fs.readFileSync('frontend/app.js', 'utf8');

const OLD_VER = `window.verFichaSantander = function() {
    if (!window._santanderPreVHtml) {
        alert("Gere o documento primeiro."); return;
    }
    const html = window._santanderPreVHtml;
    // Abrir iframe preview / nova janela
    const win = window.open('', '_blank', 'width=820,height=900');
    win.document.write(html);
    win.document.close();
    win.focus();
    
    // Adicionar pequeno delay para print popup ao visualizar
    setTimeout(() => {
        // Option popup is better UI if not auto print, but we leave it to the user.
    }, 500);
};`;

const NEW_VER = `window.verFichaSantander = async function() {
    // Se tem cache: usa direto
    if (window._santanderPreVHtml) {
        const win = window.open('', '_blank', 'width=820,height=900');
        win.document.write(window._santanderPreVHtml);
        win.document.close();
        win.focus();
        return;
    }

    // Se não tem cache mas a ficha já foi gerada: regenera silenciosamente
    const colab = viewedColaborador || window._admissaoColabSelecionado;
    if (colab && colab.santander_ficha_data) {
        // Mostrar loading
        const btn = document.querySelector('[onclick*="verFichaSantander"]');
        if (btn) { btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Gerando...'; btn.disabled = true; }
        
        try {
            // Reutiliza a função de geração, mas sem exibir toast de sucesso
            window._silentSantanderGen = true;
            await window.gerarFichaSantander();
            window._silentSantanderGen = false;
            
            // Agora o cache deve estar preenchido
            if (window._santanderPreVHtml) {
                const win = window.open('', '_blank', 'width=820,height=900');
                win.document.write(window._santanderPreVHtml);
                win.document.close();
                win.focus();
            }
        } catch(e) {
            alert('Erro ao regenerar documento: ' + e.message);
        } finally {
            if (btn) { btn.innerHTML = '<i class="ph ph-eye"></i> Visualizar'; btn.disabled = false; }
        }
        return;
    }

    alert("Gere o documento primeiro.");
};`;

if (app.includes(OLD_VER)) {
    app = app.replace(OLD_VER, NEW_VER);
    console.log('✅ verFichaSantander: agora regenera silenciosamente quando cache está vazio');
} else {
    // Try without the comment/whitespace differences
    const idx = app.indexOf('window.verFichaSantander = function()');
    if (idx !== -1) {
        let depth = 0, end = idx;
        for (let i = idx; i < app.length; i++) {
            if (app[i] === '{') depth++;
            if (app[i] === '}') { depth--; if (depth === 0) { end = i+1; if (app[end] === ';') end++; break; } }
        }
        app = app.substring(0, idx) + NEW_VER + app.substring(end);
        console.log('✅ verFichaSantander: replaced via brace counting');
    } else {
        console.log('❌ verFichaSantander not found!');
    }
}

// Also fix gerarFichaSantander to respect _silentSantanderGen flag
// Find the toast call after generation
const OLD_TOAST = `        if (typeof showToast === 'function') {
            showToast('Ficha gerada com sucesso! Use o botão Visualizar para imprimir.', 'success');
        } else alert('Ficha gerada com sucesso! Use o botão Visualizar para imprimir.');`;

const NEW_TOAST = `        if (!window._silentSantanderGen) {
            if (typeof showToast === 'function') {
                showToast('Ficha gerada com sucesso! Use o botão Visualizar para imprimir.', 'success');
            } else alert('Ficha gerada com sucesso! Use o botão Visualizar para imprimir.');
        }`;

if (app.includes(OLD_TOAST)) {
    app = app.replace(OLD_TOAST, NEW_TOAST);
    console.log('✅ gerarFichaSantander: toast now respects silent mode');
} else {
    console.log('⚠️ Toast not found with expected content');
}

const originalSize = 672028;
const newSize = app.length;
const growth = newSize - originalSize;
console.log(`Size growth: ${growth > 0 ? '+' : ''}${growth} bytes`);

if (Math.abs(growth) > 15000) {
    console.log('❌ Too large! Aborting.');
    process.exit(1);
}

fs.writeFileSync('frontend/app.js', app);
console.log('Done. Lines:', app.split('\n').length);
