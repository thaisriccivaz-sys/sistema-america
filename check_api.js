const db = require('./backend/database');

const sqlColabs = `
  SELECT c.id, c.nome_completo, c.departamento, c.cargo, c.status,
         d.tipo AS departamento_tipo
  FROM colaboradores c
  LEFT JOIN departamentos d ON c.departamento = d.nome
  WHERE c.status != 'Desligado'
  ORDER BY c.nome_completo ASC
`;

setTimeout(() => {
  db.all(sqlColabs, [], (err, colabs) => {
    if (err) console.error(err);
    else console.log(colabs.slice(0, 3));
    process.exit(0);
  });
}, 1000);
