const fs = require('fs');
let js = fs.readFileSync('backend/server.js', 'utf8');

const search = 'feriasVencendo';
if (!js.includes('faltasAgrupadasMes')) {
    js = js.replace('res.json({', 
        const faltasBd = await new Promise((res, rej) => db.all("SELECT strftime('%Y-%m', data_falta) as mes, COUNT(*) as count FROM faltas GROUP BY mes", [], (e, r) => e ? rej(e) : res(r)));
        const atestadosBd = await new Promise((res, rej) => db.all("SELECT strftime('%Y-%m', upload_date) as mes, COUNT(*) as count FROM documentos WHERE (tab_name LIKE '%ATESTADO%' OR document_type LIKE '%Atestado%') GROUP BY mes", [], (e, r) => e ? rej(e) : res(r)));
        
        // agrupar ultimos 6 meses
        const mapMeses = {};
        for(let i=0; i<6; i++){
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const m = d.toISOString().split('T')[0].substring(0,7);
            mapMeses[m] = { mes: m, faltas: 0, atestados: 0 };
        }
        
        faltasBd.forEach(row => { if(mapMeses[row.mes]) mapMeses[row.mes].faltas += row.count; });
        atestadosBd.forEach(row => { if(mapMeses[row.mes]) mapMeses[row.mes].atestados += row.count; });
        
        const faltasAgrupadasMes = Object.values(mapMeses).sort((a,b) => a.mes.localeCompare(b.mes));

        res.json({
            faltasAgrupadasMes,
);
    fs.writeFileSync('backend/server.js', js, 'utf8');
    console.log('Modified server.js');
}
