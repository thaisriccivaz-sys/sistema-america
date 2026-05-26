const xlsx = require('xlsx');

const fileLegado = 'C:\\A\\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\\Documentos - America Rental\\Diretoria\\Teste Sistema\\Exemplos\\Comparativos\\OS_Noturno_ (1).xlsx';
const fileNovo = 'C:\\A\\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\\Documentos - America Rental\\Diretoria\\Teste Sistema\\Exemplos\\Comparativos\\SimpliRoute_2026-05-03_a_2027-05-03 (2).xlsx';

const wb1 = xlsx.readFile(fileLegado);
const rows1 = xlsx.utils.sheet_to_json(wb1.Sheets['OS']);
const wb2 = xlsx.readFile(fileNovo);
const rows2 = xlsx.utils.sheet_to_json(wb2.Sheets['OS']);

const idsLegado = [...new Set(rows1.map(r => String(r['Identificação de referência'] || r['ID'] || '').trim()))].filter(Boolean);
const idsNovo = [...new Set(rows2.map(r => String(r['Identificação de referência'] || r['ID'] || '').trim()))].filter(Boolean);

const mapLegado = {};
rows1.forEach(r => {
    const id = String(r['Identificação de referência'] || r['ID'] || '').trim();
    if (!id) return;
    if (!mapLegado[id]) mapLegado[id] = { obs: [], desc: r['Titulo'] || r['Nome'] || '' };
    mapLegado[id].obs.push((r['Anotações2'] || r['Anotacoes2'] || '').toUpperCase());
});

const mapNovo = {};
rows2.forEach(r => {
    const id = String(r['Identificação de referência'] || r['ID'] || '').trim();
    if (!id) return;
    if (!mapNovo[id]) mapNovo[id] = { obs: [], desc: r['Titulo'] || r['Nome'] || '' };
    mapNovo[id].obs.push((r['Anotações2'] || r['Anotacoes2'] || '').toUpperCase());
});

let divergencias = 0;

const regexProds = /([0-9]+)\s+(STD|LX|ELX|EXL|SLX|PNE|MICTORIO|GUARITA|LAVATORIO|PIA|BEBEDOURO|PBII)/g;

idsLegado.forEach(id => {
    if (idsNovo.includes(id)) {
        // Produtos
        const countProds = (arr) => {
            const counts = {};
            arr.forEach(a => {
                let m;
                while ((m = regexProds.exec(a)) !== null) {
                    let p = m[2];
                    if (p === 'SLX') p = 'EXL';
                    if (p === 'PIA') p = 'PBII';
                    if (!counts[p]) counts[p] = 0;
                    counts[p] += parseInt(m[1]);
                }
            });
            return counts;
        };

        const p1 = countProds(mapLegado[id].obs);
        const p2 = countProds(mapNovo[id].obs);
        
        // Dias
        const parseDias = (arr) => {
            const diasSet = new Set();
            const diasMapFull = { 'SEGUNDA': 'SEG', 'TERCA': 'TER', 'QUARTA': 'QUA', 'QUINTA': 'QUI', 'SEXTA': 'SEX', 'SABADO': 'SAB', 'DOMINGO': 'DOM' };
            const diasAbbrRegex = /\b(SEG|TER|QUA|QUI|SEX|SAB|DOM)\b/g;

            arr.forEach(a => {
                // Legado has full names, novo has abbr. Let's just find all abbr
                for (const full in diasMapFull) {
                    if (a.includes(full)) diasSet.add(diasMapFull[full]);
                }
                
                let m;
                while ((m = diasAbbrRegex.exec(a)) !== null) {
                    diasSet.add(m[1]);
                }
            });
            return Array.from(diasSet).sort();
        };

        const d1 = parseDias(mapLegado[id].obs);
        const d2 = parseDias(mapNovo[id].obs);

        let isDiff = false;
        let diffReasons = [];

        const keysP = new Set([...Object.keys(p1), ...Object.keys(p2)]);
        keysP.forEach(k => {
            if (p1[k] !== p2[k]) { isDiff = true; diffReasons.push('Produto divergente: ' + k + ' (Legado: ' + (p1[k]||0) + ', Novo: ' + (p2[k]||0) + ')'); }
        });

        if (d1.join(',') !== d2.join(',')) {
            isDiff = true;
            diffReasons.push('Dias divergentes (Legado: ' + d1.join(',') + ', Novo: ' + d2.join(',') + ')');
        }

        if (isDiff) {
            divergencias++;
            console.log('\nID:', id, '| Cliente:', mapLegado[id].desc);
            diffReasons.forEach(r => console.log('  ->', r));
        }
    }
});

if (divergencias === 0) {
    console.log('Comparação concluída: AS DUAS PLANILHAS SÃO EXATAMENTE IGUAIS EM PRODUTOS E DIAS DA SEMANA!');
} else {
    console.log('\nTotal de IDs com divergências nos produtos e dias da semana:', divergencias);
}
