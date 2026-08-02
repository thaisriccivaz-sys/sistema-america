const db=require('./backend/database');
db.get("SELECT * FROM sac_tickets WHERE protocol='0003'",(err,row)=>{
    console.log(row);
});
