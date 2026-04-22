const fs = require('fs');
let js = fs.readFileSync('frontend/app.js', 'utf8');

js = js.replace(/const labelsMeses = chartsData\.atestadosMes\.map\([\s\S]*?\}\);/g, `
            const labelsMeses = (chartsData.faltasAgrupadasMes || []).map(d => {
                const parts = d.mes.split('-');
                return parts.length === 2 ? \`\${parts[1]}/\${parts[0]}\` : d.mes;
            });
            const dataFaltas = (chartsData.faltasAgrupadasMes || []).map(d => d.faltas);
            const dataAtestados = (chartsData.faltasAgrupadasMes || []).map(d => d.atestados);

            chartAtestadosInst = new Chart(ctxAtestados, {
                type: 'bar',
                data: {
                    labels: labelsMeses.length ? labelsMeses : ['Sem dados'],
                    datasets: [
                    {
                        label: 'Faltas Injustificadas',
                        data: dataFaltas.length ? dataFaltas : [0],
                        backgroundColor: '#fa5252',
                        borderRadius: 4
                    },
                    {
                        label: 'Atestados',
                        data: dataAtestados.length ? dataAtestados : [0],
                        backgroundColor: '#228be6',
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom' } },
                    scales: { x: { stacked: false }, y: { beginAtZero: true, ticks: { precision: 0 } } }
                }
            });
`);

fs.writeFileSync('frontend/app.js', js, 'utf8');
