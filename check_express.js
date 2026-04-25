const express = require('express');
const app = express();
app.get('/api/documentos/view/:id', (req, res) => res.send('OK'));
const server = app.listen(0, () => {
  const fetch = require('node-fetch');
  fetch(`http://localhost:${server.address().port}/api/documentos/view/123`).then(r => r.text()).then(t => { console.log(t); server.close(); });
});
