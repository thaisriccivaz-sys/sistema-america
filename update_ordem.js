const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./backend/data/hr_system_v2.sqlite');

const orderMap = {
  'Equipe Padrão': 1,
  'Equipe folga 2d semana': 2,
  'Ajudante pátio': 3,
  'Equipe Noturna': 4,
  'Equipe Intermitente': 5,
  'Equipe Reserva': 6,
  'Líderes': 7,
  'Ajudantes noturnos 12x36': 8
};

db.serialize(() => {
  for (const [nome, ordem] of Object.entries(orderMap)) {
    db.run('UPDATE equipes SET ordem = ? WHERE nome = ?', [ordem, nome], (err) => {
      if (err) console.error(err);
      else console.log(`Updated ${nome} to ordem ${ordem}`);
    });
  }
});
db.close();
