const fs = require('fs');
let code = fs.readFileSync('frontend/sac.js', 'utf8');

const target = `                  document.getElementById('new-comment-text').value = txt;
                  SAC.addComment(${'`\\${ticket.id}`'});`;
const replacement = `                  const commentBox = document.getElementById('new-comment-text');
                  if (commentBox) commentBox.value = txt;
                  SAC.addComment(${'`\\${ticket.id}`'}, txt);`;

code = code.replace(target, replacement);

const target2 = `async function addComment(ticketId) {`;
const replacement2 = `async function addComment(ticketId, directText = null) {`;

code = code.replace(target2, replacement2);

const target3 = `      const textInput = document.getElementById('new-comment-text');
      const text = textInput ? textInput.value.trim() : '';
      if (!text) return;`;
const replacement3 = `      const textInput = document.getElementById('new-comment-text');
      const text = directText ? directText.trim() : (textInput ? textInput.value.trim() : '');
      if (!text) return;`;

code = code.replace(target3, replacement3);

const target4 = `    addComment(ticketId) { return addComment(ticketId); },`;
const replacement4 = `    addComment(ticketId, txt) { return addComment(ticketId, txt); },`;

code = code.replace(target4, replacement4);

fs.writeFileSync('frontend/sac.js', code);
console.log('Fixed addComment logic');
