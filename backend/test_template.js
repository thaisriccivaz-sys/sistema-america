const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('../data/hr_system_v2.sqlite');

db.all('SELECT * FROM epi_templates', (err, templates) => {
    templates.forEach(t => t.departamentos = JSON.parse(t.departamentos_json || '[]'));
    
    db.all(`SELECT id, nome_completo, cargo, departamento FROM colaboradores WHERE nome_completo LIKE '%Walace%' OR nome_completo LIKE '%Levi%'`, (err, colabs) => {
        colabs.forEach(viewedColaborador => {
            const dept = viewedColaborador?.departamento || '';
            const cargo = viewedColaborador?.cargo || '';

            const SETORES_ADMIN = ['Comercial', 'Financeiro', 'Logística', 'Logistica', 'Administrativo', 'RH'];
            const isSetorAdmin = SETORES_ADMIN.includes(dept) || SETORES_ADMIN.includes(cargo);

            let templateDoColab = templates.find(t => (t.departamentos || []).includes(dept) || (t.departamentos || []).includes(cargo)) ||
                templates.find(t => t.grupo === dept || t.grupo === cargo) ||
                (isSetorAdmin ? templates.find(t => t.categoria === 'Administrativo') : null) ||
                templates[0];

            console.log(`Colab: ${viewedColaborador.nome_completo}`);
            console.log(`Cargo: ${cargo}, Dept: ${dept}`);
            console.log(`Template Selecionado: ${templateDoColab.grupo} (ID ${templateDoColab.id})\n`);
        });
        db.close();
    });
});
