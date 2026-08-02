const db=require('./backend/database');
db.all("SELECT id, protocol, stage, sla_frozen_at FROM sac_tickets", [], (err,rows)=>{
    console.log(rows);
});
