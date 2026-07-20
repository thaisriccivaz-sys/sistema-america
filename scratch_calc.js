const fs = require('fs');
const res = {
  "Ambiente de trabalho": { "0": "4", "1": "4", "2": "3", "3": "5" },
  "Condições de trabalho e equipamentos": { "0": "4", "1": "5", "2": "4", "3": "5" },
  "__obs__": {
    "Ambiente de trabalho": { "2": "As pessoas precisam agir..." }
  }
};

let totalQ = 40;
let ansQ = 0;
const categories = ["Ambiente de trabalho", "Condições de trabalho e equipamentos", "C", "D", "E", "F", "G", "H", "I", "J"];

categories.forEach(cat => {
    if (res[cat]) Object.values(res[cat]).forEach(v => { if (v) ansQ++; });
});
let perc = totalQ > 0 ? Math.round((ansQ/totalQ)*100) : 0;
console.log("ansQ:", ansQ, "perc:", perc);
