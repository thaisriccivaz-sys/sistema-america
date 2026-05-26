const fs = require('fs');
const xlsx = require('xlsx');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/data/hr_system_v2.sqlite');

const file = 'C:/A/OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA/Documentos - America Rental/Diretoria/Teste Sistema/Exemplos/OS_Noturno_ (1).xlsx';
const data = xlsx.utils.sheet_to_json(xlsx.readFile(file).Sheets['OS']);

const productRegex = /([0-9]+)\s+(STD|LX|ELX|EXL|SLX|PNE|MICTORIO|GUARITA|LAVATORIO|PIA|BEBEDOURO|PBII)/ig;
const daysMap = {
    'SEGUNDA': 'Segunda-feira',
    'TERCA': 'Terça-feira',
    'QUARTA': 'Quarta-feira',
    'QUINTA': 'Quinta-feira',
    'SEXTA': 'Sexta-feira',
    'SABADO': 'Sábado',
    'DOMINGO': 'Domingo'
};

const uniqueMap = {};
data.forEach(r => {
    const id = String(r['Identificação de referência']).trim();
    if (!uniqueMap[id]) uniqueMap[id] = [];
    uniqueMap[id].push(r);
});

let inserted = 0;
let errored = 0;

db.serialize(() => {
    const stmt = db.prepare("INSERT INTO os_logistica (numero_os, tipo_os, cliente, endereco, lat, lng, turno, hora_inicio, hora_fim, observacoes_internas, telefone, email, tipo_servico, dias_semana, produtos, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

    const keys = Object.keys(uniqueMap);
    console.log('Iniciando insert de', keys.length, 'OSs...');
    
    keys.forEach(id => {
        const rows = uniqueMap[id];
        const r = rows[0]; 
        
        let cliente = (r['Titulo'] || '').replace(/[\u{1F300}-\u{1F9FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}]/gu, '').trim();
        const endereco = r['Endereço completo'] || '';
        const lat = r['Latitude'] || null;
        const lng = r['Longitude'] || null;
        const hora_inicio = r['Janela de horário inicial'] || '18:00';
        const hora_fim = r['Janela de horário final'] || '05:00';
        const observacoes_internas = r['Observacoes_Internas'] || '';
        const telefone = r['Telefone de contato'] || '';
        const email = r['Correio eletrônico de contato'] || '';
        const tipo_servico = r['Tipo de visita'] || '';
        const tipo_os = tipo_servico; 
        
        const produtos = [];
        rows.forEach(row => {
            const matches = [...(row['Anotações2'] || '').matchAll(productRegex)];
            matches.forEach(m => {
                let desc = m[2].toUpperCase().trim();
                if (desc === 'SLX') desc = 'EXL';
                if (desc === 'PIA' || desc === 'PIA II') desc = 'PBII';
                if (desc === 'STD O' || desc === 'STD') desc = 'STD OBRA'; 
                produtos.push({ qtd: parseInt(m[1]), desc: desc });
            });
        });
        
        const prodMap = {};
        produtos.forEach(p => {
            if(!prodMap[p.desc]) prodMap[p.desc] = 0;
            prodMap[p.desc] += p.qtd;
        });
        const finalProdutos = Object.keys(prodMap).map(k => ({ qtd: prodMap[k], desc: k }));

        const diasSet = new Set();
        rows.forEach(row => {
            for (const d in daysMap) {
                if ((row['Anotações2'] || '').toUpperCase().includes(d)) {
                    diasSet.add(daysMap[d]);
                }
            }
        });
        const dias_semana = Array.from(diasSet);

        stmt.run(
            id, tipo_os, cliente, endereco, lat, lng, 'Noturno', hora_inicio, hora_fim,
            observacoes_internas, telefone, email, tipo_servico,
            JSON.stringify(dias_semana), JSON.stringify(finalProdutos), 'ativo',
            function(err) {
                if (err) { console.error('Erro na OS', id, err.message); errored++; }
                else inserted++;
            }
        );
    });
    
    stmt.finalize(() => {
        console.log('Finalizado via finalize. Sucesso:', inserted, 'Erros:', errored);
        db.close();
    });
});
