const fs = require('fs');
let code = fs.readFileSync('frontend/sac.js', 'utf8');

const regexComment = /async addComment\(ticketId\) \{\s*const t = _tickets\.find\(x => x\.id === ticketId\);\s*if \(\!t\) return;\s*const textInput = document\.getElementById\('new-comment-text'\);\s*const text = textInput \? textInput\.value\.trim\(\) : '';\s*if \(\!text\) return;/;

const newComment = `async addComment(ticketId) {
      let tLocal = _tickets.find(x => x.id === ticketId);
      if (!tLocal) return;
      const textInput = document.getElementById('new-comment-text');
      const text = textInput ? textInput.value.trim() : '';
      if (!text) return;

      const token = localStorage.getItem('erp_token')||localStorage.getItem('token');
      let t = tLocal;
      try {
          const resp = await fetch('/api/sac/tickets/' + ticketId, { headers: { 'Authorization': \`Bearer \${token}\` } });
          if (resp.ok) {
              t = await resp.json();
          }
      } catch (e) { console.error('Erro ao buscar versão mais recente do ticket', e); }`;

code = code.replace(regexComment, newComment);
fs.writeFileSync('frontend/sac.js', code);
console.log('Replaced successfully');
