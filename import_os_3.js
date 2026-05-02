const XLSX = require('xlsx');
const https = require('https');

const EQUIPAMENTOS_DICT = {
    'STD OBRA':               { icone: '💙', codigo: 'STD O' },
    'STD EVENTO':             { icone: '💜', codigo: 'STD E' },
    'LX OBRA':                { icone: '🟦', codigo: 'LX O' },
    'LX EVENTO':              { icone: '🟣', codigo: 'LX E' },
    'EXL OBRA':               { icone: '🔵', codigo: 'EXL O' },
    'EXL EVENTO':             { icone: '🟣', codigo: 'EXL E' },
    'PCD OBRA':               { icone: '♿',  codigo: 'PCD O' },
    'PCD EVENTO':             { icone: '♿', codigo: 'PCD E' },
    'CHUVEIRO OBRA':          { icone: '🚿', codigo: 'CHUVEIRO O' },
    'CHUVEIRO EVENTO':        { icone: '🚿', codigo: 'CHUVEIRO E' },
    'HIDRÁULICO OBRA':        { icone: '🚽', codigo: 'HIDRÁULICO O' },
    'HIDRÁULICO EVENTO':      { icone: '🚽', codigo: 'HIDRÁULICO E' },
    'MICTÓRIO OBRA':          { icone: '💦', codigo: 'MICTÓRIO O' },
    'MICTÓRIO EVENTO':        { icone: '💦', codigo: 'MICTÓRIO E' },
    'PBII OBRA':              { icone: '🧼', codigo: 'PIA II O' },
    'PBII EVENTO':            { icone: '🧼', codigo: 'PIA II E' },
    'PBIII OBRA':             { icone: '🧼', codigo: 'PIA III O' },
    'PBIII EVENTO':           { icone: '🧼', codigo: 'PIA III E' },
    'GUARITA INDIVIDUAL OBRA':  { icone: '⬜', codigo: 'GUARITA INDIVIDUAL O' },
    'GUARITA INDIVIDUAL EVENTO':{ icone: '⬜', codigo: 'GUARITA INDIVIDUAL E' },
    'GUARITA DUPLA OBRA':     { icone: '⚪', codigo: 'GUARITA DUPLA O' },
    'GUARITA DUPLA EVENTO':   { icone: '⚪', codigo: 'GUARITA DUPLA E' },
    'LIMPA FOSSA OBRA':       { icone: '💧', codigo: 'LIMPA FOSSA OBRA' },
    'LIMPA FOSSA EVENTO':     { icone: '💧', codigo: 'LIMPA FOSSA EVENTO' },
    'CARRINHO':               { icone: '🛤', codigo: 'CARRINHO' },
    'CAIXA DAGUA':            { icone: '🧊', codigo: 'CAIXA DAGUA' },
};

function normalizeProduto(descBruto) {
    const raw = descBruto.toUpperCase().trim();
    // find by code
    for (const [nome, data] of Object.entries(EQUIPAMENTOS_DICT)) {
        if (data.codigo.toUpperCase() === raw || nome.toUpperCase() === raw) {
            return { desc: nome, icone: data.icone };
        }
    }
    return { desc: descBruto, icone: '📦' };
}

function parsePlanilha(filePath, turno) {
    const wb = XLSX.readFile(filePath);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws, {header:1, defval:''});
    
    const records = [];
    
    for(let i=1; i<data.length; i++) {
        const r = data[i];
        if (!r || r.length < 10) continue;
        if (!r[10] || !r[1]) continue;
        
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
        } else if (typeof dOS === 'number') {
            const utc_days  = Math.floor(dOS - 25569);
            const utc_value = utc_days * 86400;                                        
            const date_info = new Date(utc_value * 1000);
            const yyyy = date_info.getFullYear();
            const mm = String(date_info.getMonth() + 1).padStart(2, '0');
            const dd = String(date_info.getDate() + 1).padStart(2, '0');
            data_os = `${yyyy}-${mm}-${dd}`;
        }

        const responsavel = r[13] || '';
        const telefone = r[14] || '';
        const email = r[21] || '';
        const hora_inicio = r[4] || '';
        const hora_fim = r[5] || '';
        
        const observacoes_internas = r[0] || '';
        const habilidadesRaw = r[11] || '';
        const habilidades = habilidadesRaw ? habilidadesRaw.split(',').map(h => h.trim()) : [];

        const ano = r[7] || '';
        const parts = ano.split('|').map(x => x.trim());
        
        let tipo_servico = (parts[0] || r[26] || '').toUpperCase().trim();
        let prodsStr = parts[1] || '';
        let diasStr = parts[2] || '';
        let observacoes = parts[3] || '';
        
        if (parts.length < 4 && !diasStr.includes('X') && !diasStr.includes('x')) {
            observacoes = diasStr;
            diasStr = '';
        }

        let produtos = [];
        if (prodsStr) {
            const prodItems = prodsStr.split(/[-;,]+/).map(x=>x.trim());
            prodItems.forEach(pi => {
                const m = pi.match(/^(\d+)\s+(.+)$/);
                if (m) {
                    const norm = normalizeProduto(m[2]);
                    produtos.push({qtd: parseInt(m[1]), desc: norm.desc, icone: norm.icone});
                } else if (pi) {
                    const norm = normalizeProduto(pi);
                    produtos.push({qtd: 1, desc: norm.desc, icone: norm.icone});
                }
            });
        }

        let dias_semana = [];
        if (diasStr.toUpperCase().includes('X')) {
            const dStr = diasStr.toUpperCase().split('X')[1];
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

        let tipo_os = 'Avulsa';
        if (tipo_servico.includes('MANUTEN')) tipo_os = 'Manutenção';
        else if (tipo_servico.includes('ENTREGA')) tipo_os = 'Entrega';
        else if (tipo_servico.includes('RETIRADA')) tipo_os = 'Retirada';

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

const file = 'C:/A/OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA/Documentos - America Rental/Diretoria/Teste Sistema/Exemplos/OS_Diurno_ (3).xlsx';
const records = parsePlanilha(file, 'Diurno');

console.log(`Parsed ${records.length} OSs. Sending to API...`);

const data = JSON.stringify(records);

const options = {
  hostname: 'sistema-america.onrender.com',
  port: 443,
  path: '/api/logistica/import-bulk',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (d) => { body += d; });
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', body);
  });
});

req.on('error', (e) => {
  console.error('Error:', e);
});

req.write(data);
req.end();
