const XLSX = require('xlsx');

function parsePlanilha(filePath, turno) {
    const wb = XLSX.readFile(filePath);
    const ws = wb.Sheets['OS'] || wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws, {header:1, defval:''});
    
    const records = [];
    
    for(let i=1; i<data.length; i++) {
        const r = data[i];
        if (!r || r.length < 10) continue;
        if (!r[10] || !r[1]) continue; // needs numero_os e cliente
        
        const numero_os = (r[10] || '').toString().trim();
        const cliente = (r[1] || '').toString().trim();
        const enderecoCompleto = (r[2] || '').toString().trim();
        let endereco = enderecoCompleto;
        let cep = '';
        if (enderecoCompleto.includes('CEP:')) {
            const parts = enderecoCompleto.split('CEP:');
            endereco = parts[0].replace(/\|\s*$/, '').trim();
            cep = parts[1].trim();
        }

        const lat = r[8] || null;
        const lng = r[9] || null;
        
        let data_os = '';
        const dOS = r[25] || '';
        if (dOS && dOS.includes('/')) {
            const [dd, mm, yyyy] = dOS.split('/');
            if (yyyy && mm && dd) data_os = `${yyyy}-${mm}-${dd}`;
        }

        const responsavel = r[13] || '';
        const telefone = r[14] || '';
        const email = r[21] || '';
        const hora_inicio = r[4] || '';
        const hora_fim = r[5] || '';
        
        const observacoes_internas = r[0] || '';
        const habilidades = r[11] || '';

        const ano = r[7] || '';
        const parts = ano.split('|').map(x => x.trim());
        
        let tipo_servico = parts[0] || r[26] || '';
        let prodsStr = parts[1] || '';
        let diasStr = parts[2] || '';
        let observacoes = parts[3] || '';
        
        // Se a anotação não tem barras verticais suficientes, pegar observações de outro jeito?
        if (parts.length < 4 && !diasStr.includes('X')) {
            observacoes = diasStr;
            diasStr = '';
        }

        let produtos = [];
        if (prodsStr) {
            const prodItems = prodsStr.split(/[-;,]+/).map(x=>x.trim());
            prodItems.forEach(pi => {
                const m = pi.match(/^(\d+)\s+(.+)$/);
                if (m) {
                    produtos.push({qtd: parseInt(m[1]), desc: m[2]});
                } else if (pi) {
                    produtos.push({qtd: 1, desc: pi}); // fallback
                }
            });
        }

        let dias_semana = [];
        if (diasStr.includes('X')) {
            const dStr = diasStr.split('X')[1];
            if (dStr) {
                dias_semana = dStr.split(',').map(x => {
                    const d = x.trim().toUpperCase();
                    if (d === 'SEGUNDA' || d === 'SEG') return 'Segunda';
                    if (d === 'TERCA' || d === 'TERÇA' || d === 'TER') return 'Terça';
                    if (d === 'QUARTA' || d === 'QUA') return 'Quarta';
                    if (d === 'QUINTA' || d === 'QUI') return 'Quinta';
                    if (d === 'SEXTA' || d === 'SEX') return 'Sexta';
                    if (d === 'SABADO' || d === 'SÁBADO' || d === 'SAB') return 'Sábado';
                    if (d === 'DOMINGO' || d === 'DOM') return 'Domingo';
                    return d;
                }).filter(Boolean);
            }
        }

        // Tipo OS
        let tipo_os = 'Avulsa';
        if (tipo_servico.toUpperCase().includes('MANUTEN')) tipo_os = 'Manutenção';
        else if (tipo_servico.toUpperCase().includes('ENTREGA')) tipo_os = 'Entrega';
        else if (tipo_servico.toUpperCase().includes('RETIRADA')) tipo_os = 'Retirada';

        records.push({
            numero_os,
            tipo_os,
            cliente,
            endereco,
            cep,
            lat,
            lng,
            data_os,
            responsavel,
            telefone,
            email,
            tipo_servico,
            hora_inicio,
            hora_fim,
            turno,
            dias_semana,
            produtos,
            observacoes,
            observacoes_internas,
            habilidades
        });
    }
    return records;
}

const diurno = parsePlanilha('C:/A/OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA/Documentos - America Rental/Diretoria/Teste Sistema/Planilhas/OS_Diurno_ (1).xlsx', 'Diurno');
const noturno = parsePlanilha('C:/A/OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA/Documentos - America Rental/Diretoria/Teste Sistema/Planilhas/OS_Noturno_.xlsx', 'Noturno');

const allRecords = [...diurno, ...noturno];
console.log(`Total parsed: ${diurno.length} diurno + ${noturno.length} noturno = ${allRecords.length}`);

const fs = require('fs');
fs.writeFileSync('backend/import_data.json', JSON.stringify(allRecords, null, 2));
console.log('Saved to backend/import_data.json');

