const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/data/hr_system_v2.sqlite');

function haversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

const targetLat = -23.4349504;
const targetLng = -46.4195917;

db.all("SELECT numero_os, cliente, endereco, lat, lng FROM os_logistica WHERE lat IS NOT NULL AND lng IS NOT NULL AND status = 'ativo'", [], (err, rows) => {
    if (err) throw err;
    let count = 0;
    const proximas = [];
    rows.forEach(r => {
        const lat = parseFloat(r.lat);
        const lng = parseFloat(r.lng);
        if (isNaN(lat) || isNaN(lng)) return;
        const dist = haversineKm(targetLat, targetLng, lat, lng);
        if (dist <= 5) {
            count++;
            proximas.push({ ...r, dist: dist.toFixed(2) });
        }
    });
    console.log('Encontradas <= 5km:', count);
    if (count === 0) {
        const sorted = rows.map(r => ({...r, dist: haversineKm(targetLat, targetLng, parseFloat(r.lat), parseFloat(r.lng))}))
                           .sort((a,b) => a.dist - b.dist);
        console.log('Mais próximas (qq raio):');
        console.log(sorted.slice(0, 5).map(r => r.numero_os + ' - ' + r.cliente + ' - Dist: ' + r.dist.toFixed(2) + 'km'));
    } else {
        console.log(proximas.sort((a,b) => a.dist - b.dist).slice(0, 10)); 
    }
});
