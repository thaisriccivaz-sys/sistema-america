const fs = require('fs');
let html = fs.readFileSync('frontend/fechamento.js', 'utf8');

const regexTabela = /<!-- Tabela principal -->[\s\S]*?<\/table>\s*<\/div>/;

const novaTabela = `<!-- Tabela principal -->
  <div id="fech-tabela-wrap" style="display:none;">
    <div id="fech-top-scroll" style="overflow-x:auto; overflow-y:hidden; height:14px; margin-bottom:4px;" onscroll="document.getElementById('fech-tabela-inner').scrollLeft = this.scrollLeft;">
      <div id="fech-top-scroll-content" style="height:14px;"></div>
    </div>
    <div id="fech-tabela-inner" style="overflow-x:auto; max-height: 65vh; overflow-y:auto; border-bottom:1px solid #e5e7eb;" onscroll="document.getElementById('fech-top-scroll').scrollLeft = this.scrollLeft;">
      <table id="fech-tabela" style="width:100%;border-collapse:separate; border-spacing:0; font-size:.8rem;min-width:1500px;">
        <thead style="position:sticky; top:0; z-index:10;">
          <tr style="background:#1e40af;color:#fff;">
            <th style="padding:.45rem .6rem;text-align:left;white-space:nowrap;position:sticky;left:0;top:0;background:#1e40af;z-index:20;box-shadow:inset -1px -1px 0 #cbd5e1, inset 0 -1px 0 #cbd5e1;">Colaborador</th>
            <th style="padding:.45rem .35rem;white-space:nowrap;position:sticky;top:0;background:#1e40af;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;">Cargo</th>
            <th style="padding:.45rem .35rem;white-space:nowrap;position:sticky;top:0;background:#1e40af;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;">Salário</th>
            <th style="padding:.45rem .35rem;white-space:nowrap;position:sticky;top:0;background:#1e40af;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;" title="Horas normais mensais">H.Normais</th>
            <th style="padding:.45rem .35rem;white-space:nowrap;position:sticky;top:0;background:#1e40af;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;" title="Horas trabalhadas">H.Trab.</th>
            <th style="padding:.45rem .35rem;white-space:nowrap;position:sticky;top:0;background:#1e40af;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;">Ext.60%</th>
            <th style="padding:.45rem .35rem;white-space:nowrap;position:sticky;top:0;background:#1e40af;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;">Ext.100%</th>
            <th style="padding:.45rem .35rem;white-space:nowrap;position:sticky;top:0;background:#1e40af;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;">DSR</th>
            <th style="padding:.45rem .35rem;white-space:nowrap;position:sticky;top:0;background:#1e40af;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;">Faltas</th>
            <th style="padding:.45rem .35rem;white-space:nowrap;position:sticky;top:0;background:#1e40af;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;">Atrasos</th>
            <th style="padding:.45rem .35rem;white-space:nowrap;position:sticky;top:0;background:#1e40af;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;">VT</th>
            <th style="padding:.45rem .35rem;white-space:nowrap;position:sticky;top:0;background:#0c4a6e;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;">Farmácia</th>
            <th style="padding:.45rem .35rem;white-space:nowrap;position:sticky;top:0;background:#78350f;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;">Mercado</th>
            <th style="padding:.45rem .35rem;white-space:nowrap;position:sticky;top:0;background:#7f1d1d;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;">Multas</th>
            <th style="padding:.45rem .35rem;white-space:nowrap;position:sticky;top:0;background:#1e40af;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;">Academia</th>
            <th style="padding:.45rem .35rem;white-space:nowrap;position:sticky;top:0;background:#4c1d95;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;">Consig.</th>
            <th style="padding:.45rem .35rem;white-space:nowrap;position:sticky;top:0;background:#1e40af;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;">Comissão</th>
            <th style="padding:.45rem .35rem;white-space:nowrap;position:sticky;top:0;background:#1e40af;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;">Bônus</th>
            <th style="padding:.45rem .35rem;white-space:nowrap;position:sticky;top:0;background:#14532d;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;">PLR</th>
            <th style="padding:.45rem .35rem;white-space:nowrap;position:sticky;top:0;background:#1e40af;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;">Prêmio</th>
            <th style="padding:.45rem .35rem;white-space:nowrap;position:sticky;top:0;background:#1e40af;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;">Outros</th>
            <th style="padding:.45rem .5rem;white-space:nowrap;position:sticky;top:0;background:#164e63;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;">Total Bruto</th>
            <th style="padding:.45rem .5rem;white-space:nowrap;position:sticky;top:0;background:#064e3b;z-index:10;box-shadow:inset 0 -1px 0 #cbd5e1;">Líquido</th>
          </tr>
        </thead>
        <tbody id="fech-tbody"></tbody>
      </table>
    </div>
  </div>`;

if (regexTabela.test(html)) {
    html = html.replace(regexTabela, novaTabela);
    console.log('Tabela HTML substituída.');
}

const renderFunctionAnchor = `            tbody.appendChild(tr);
        });
    }`;

const renderFunctionReplacement = `            tbody.appendChild(tr);
        });

        // Atualizar barra de rolagem superior
        setTimeout(() => {
            const t = document.getElementById('fech-tabela');
            const c = document.getElementById('fech-top-scroll-content');
            if (t && c) {
                c.style.width = t.offsetWidth + 'px';
            }
        }, 100);
    }`;

if (html.includes(renderFunctionAnchor)) {
    html = html.replace(renderFunctionAnchor, renderFunctionReplacement);
    console.log('Javascript modificado.');
}

// Ensure the first column cells (td) have a box-shadow border on right to match header.
const regexTrHtml = /<td style="padding:\.35rem \.5rem;white-space:nowrap;position:sticky;left:0;background:\$\{bgRow\|\|'#fff'\};font-weight:600;min-width:140px;z-index:1;"/g;
const replaceTrHtml = `<td style="padding:.35rem .5rem;white-space:nowrap;position:sticky;left:0;background:\${bgRow||'#fff'};font-weight:600;min-width:140px;z-index:1;box-shadow:inset -1px 0 0 #e5e7eb;"`;
html = html.replace(regexTrHtml, replaceTrHtml);


fs.writeFileSync('frontend/fechamento.js', html, 'utf8');
console.log('Sucesso!');
