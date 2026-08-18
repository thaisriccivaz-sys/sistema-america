const c = require('fs').readFileSync('frontend/sac.js', 'utf8');
const r = (label, test) => console.log((test ? '[OK]' : '[FAIL]'), label);

r('Checklist _canAll guard', c.includes("_p['sac-atribuidos']!==true)"));
r('canEdit no creator bypass', !c.includes("ticket.timeline[0].user === cUser) return true;"));
r('canEdit canSeeAll guard', c.includes('_pea["sac-atribuidos"] !== true')) ;
r('canMove gestors', c.includes('Gestores de qualquer departamento'));
r('isManager active tasks only', c.includes('!t[taskKey].isCompleted'));
r('isCreator non-gestor only', c.includes('!myManagedDepts.length && t.timeline'));
r('openDetail exists', c.includes('function openDetail'));
r('renderDetailModal exists', c.includes('function renderDetailModal'));
