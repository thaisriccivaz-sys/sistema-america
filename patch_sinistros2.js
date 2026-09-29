const fs = require('fs');

const path = 'C:/Users/thais/.gemini/antigravity/scratch/sistema-america/frontend/sinistros.js';
let txt = fs.readFileSync(path, 'utf8');

const rx = /\/\/\s*Observação inicial\r?\n\s*\(sinistro\.observacoes \? '<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:8px 12px;margin-bottom:8px;">' \+\r?\n\s*'<p style="margin:0 0 2px;font-size:0\.72rem;color:#92400e;font-weight:700;">Observação inicial<\/p>' \+\r?\n\s*'<p style="margin:0;font-size:0\.85rem;color:#334155;">' \+ sinistro\.observacoes \+ '<\/p><\/div>' : ''\) \+/;

const replacement = `// Observação inicial
        (function() {
            if (!sinistro.observacoes) return '';
            var _dtIni = '';
            try {
                if (sinistro.created_at) {
                    var _dObj = new Date(sinistro.created_at);
                    _dtIni = _dObj.toLocaleDateString('pt-BR') + ' às ' + _dObj.toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'});
                }
            } catch(_) {}
            return '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:8px 10px;margin-bottom:8px;">' +
                   '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">' +
                   '<span style="font-size:0.73rem;font-weight:700;color:#6366f1;"><i class="ph ph-user-circle"></i> ' + (sinistro.usuario_abertura || 'Sistema') + '</span>' +
                   '<span style="font-size:0.68rem;color:#94a3b8;white-space:nowrap;margin-left:6px;">' + _dtIni + '</span>' +
                   '</div>' +
                   '<p style="margin:0;font-size:0.83rem;color:#334155;line-height:1.5;">' + sinistro.observacoes.replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</p>' +
                   '</div>';
        })() +`;

if(rx.test(txt)) {
    txt = txt.replace(rx, replacement);
    fs.writeFileSync(path, txt);
    console.log("Success");
} else {
    console.log("Regex not found");
}
