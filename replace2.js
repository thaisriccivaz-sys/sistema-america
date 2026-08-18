const fs = require('fs');
let code = fs.readFileSync('frontend/sac.js', 'utf8');

// Define _stripEmojis
if (!code.includes('window._stripEmojis =')) {
    code = code.replace(
        'window._tickets = [];',
        `window._stripEmojis = (str) => (str||'').replace(/^[^a-zA-Z0-9À-ÿ]+/, '').replace(/[\\u{1F300}-\\u{1F9FF}\\u{2600}-\\u{26FF}\\u{2700}-\\u{27BF}\\u{1F600}-\\u{1F64F}\\u{1F680}-\\u{1F6FF}\\u{1F1E0}-\\u{1F1FF}]/gu, '').trim();\n  window._tickets = [];`
    );
}

// 1. _sacProcessarResultadoBusca: fix _clienteLimpo
code = code.replace(
    /const _clienteLimpo = clienteNome\.replace\(\/\^\[\\s\\S\]\*\?\(\[A-Z\\u00C0-\\u024F\]\)\/u, '\$1'\)\.trim\(\);/g,
    'const _clienteLimpo = window._stripEmojis(clienteNome);'
);

// 2. Refactor _sacBuscarOSLogistica fetch block
const osLogRegex = /const rawLista = await resp\.json\(\);[\s\S]*?renderWizard\(\);\n    \} catch\(e\) \{/m;
const osLogRepl = `const rawLista = await resp.json();
      await _sacProcessarResultadoBusca(rawLista, num, false);
    } catch(e) {`;
if (osLogRegex.test(code)) {
    code = code.replace(osLogRegex, osLogRepl);
}

// 3. Update existing regex in card rendering (line 1741 aprox)
code = code.replace(
    /\(t\.clientName \|\| ''\)\.replace\(\/\[\\u\{1F300\}-\\u\{1F9FF\}\\u\{2600\}-\\u\{26FF\}\\u\{2700\}-\\u\{27BF\}\\u\{1F600\}-\\u\{1F64F\}\\u\{1F680\}-\\u\{1F6FF\}\\u\{1F1E0\}-\\u\{1F1FF\}\]\/gu, ''\)\.trim\(\)/g,
    'window._stripEmojis(t.clientName)'
);

// Update existing regex in duplicate ticket card (existingTickets map)
code = code.replace(
    /const clientInfo = t\.clientName \? \`<div.*?\\\$\\{t\.clientName\\}.*?<\/div>\` : '';/g,
    'const clientInfo = t.clientName ? `<div style="font-size:0.8rem;color:#334155;margin-bottom:4px;display:flex;align-items:flex-start;gap:4px;"><i class="ph ph-user" style="margin-top:2px;color:#94a3b8;"></i><span style="font-weight:600;flex:1;line-height:1.3;">${window._stripEmojis(t.clientName)}</span></div>` : \'\';'
);

// Also replace ${t.clientName} directly in tickets list (line 881 aprox)
code = code.replace(
    /white-space:nowrap;">\$\{t\.clientName\}<\/td>/g,
    'white-space:nowrap;">${window._stripEmojis(t.clientName)}</td>'
);

fs.writeFileSync('frontend/sac.js', code, 'utf8');
console.log('Replaced successfully');
