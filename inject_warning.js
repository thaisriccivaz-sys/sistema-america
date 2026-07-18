const fs = require('fs');
let code = fs.readFileSync('c:/A/OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA/Documentos - America Rental/Diretoria/Teste Sistema/cadastro-colaboradores/frontend/app.js', 'utf8');

const target = `    if(card){card.style.border=qty>0?'2px solid #16a34a':'2px solid #e2e8f0';card.style.background=qty>0?'#f0fdf4':'#fff';const inp=card.querySelector('input[type="number"]');if(inp)inp.value=qty;const btnM=card.querySelectorAll('button')[0];if(btnM)btnM.style.background=qty>0?'#1e3a5f':'#e2e8f0';}
};`;

const replacement = `    if(card){card.style.border=qty>0?'2px solid #16a34a':'2px solid #e2e8f0';card.style.background=qty>0?'#f0fdf4':'#fff';const inp=card.querySelector('input[type="number"]');if(inp)inp.value=qty;const btnM=card.querySelectorAll('button')[0];if(btnM)btnM.style.background=qty>0?'#1e3a5f':'#e2e8f0';}

    // Aviso 15 dias: dispara apenas quando o usuario adiciona pela primeira vez (qty passa de 0 para 1)
    if (prevQty === 0 && qty === 1) {
        const todasEntregas = window._epiProntuarioData?.todasEntregas || [];
        const hoje15 = new Date(); hoje15.setHours(0, 0, 0, 0);
        const parseDt15 = str => {
            if (!str) return null;
            if (str.includes('/')) { const [d, m, y] = str.split('/'); return new Date(y, m - 1, d); }
            return new Date(str + 'T12:00:00');
        };
        const norm15 = s => (s || '').trim().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toUpperCase();
        const epiNorm = norm15(epi);
        const entregaAnterior = todasEntregas.find(e => {
            const histNorm = norm15(e.epi_nome);
            return histNorm === epiNorm || histNorm.startsWith(epiNorm) || epiNorm.startsWith(histNorm);
        });
        if (entregaAnterior) {
            const dataAnterior = parseDt15(entregaAnterior.data_entrega);
            if (dataAnterior) {
                const dias = Math.floor((hoje15 - dataAnterior) / (1000 * 60 * 60 * 24));
                if (dias <= 15) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'EPI Entregue Recentemente',
                        html: \`<b>"\${epi}"</b> foi entregue há <b>\${dias} dia\${dias !== 1 ? 's' : ''}</b> para este colaborador<br><small style="color:#64748b;">(em \${entregaAnterior.data_entrega})</small><br><br>O registro será feito normalmente.\`,
                        confirmButtonColor: '#e67700',
                        confirmButtonText: 'Entendido',
                        customClass: { popup: '' },
                        didOpen: () => {
                            const cont = document.querySelector('.swal2-container');
                            if (cont) { cont.style.zIndex = '9999999'; cont.style.position = 'fixed'; }
                        }
                    });
                }
            }
        }
    }
};`;

code = code.replace(target, replacement);
fs.writeFileSync('c:/A/OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA/Documentos - America Rental/Diretoria/Teste Sistema/cadastro-colaboradores/frontend/app.js', code, 'utf8');
console.log('Fixed EPI warning!');
