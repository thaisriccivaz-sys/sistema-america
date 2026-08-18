const fs = require('fs');
let code = fs.readFileSync('backend/server.js', 'utf8');

const regexGET = /app\.get\('\/api\/sac\/tickets', authenticateToken, \(req, res\) => \{.*?\n\}\);/s;

const newGET = `app.get('/api/sac/tickets', authenticateToken, (req, res) => {
    db.all("SELECT * FROM sac_tickets ORDER BY created_at DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const parsed = rows.map(r => ({
            ...r,
            timeline: JSON.parse(r.timeline||'[]'),
            costCenters: JSON.parse(r.cost_centers||'[]'),
            attachments: JSON.parse(r.attachments||'[]'),
            checklist: JSON.parse(r.checklist||'[]'),
            logisticsTask: JSON.parse(r.logistics_task||'null'),
            commercialTask: JSON.parse(r.commercial_task||'null'),
            financialTask: JSON.parse(r.financial_task||'null'),
            occurrences: JSON.parse(r.occurrences||'[]'),
            comments: JSON.parse(r.comments||'[]'),
            tags: JSON.parse(r.tags||'[]'),
            isUrgent: r.is_urgent === 1,
            nextSteps: r.next_steps,
            clientName: r.client_name,
            cnpjCpf: r.cnpj_cpf,
            osNumber: r.os_number,
            contactName: r.contact_name,
            contactPhone: r.contact_phone,
            contactEmail: r.contact_email,
            typeKey: r.type_key,
            openDate: r.created_at,
            closeDate: r.close_date,
            slaFrozenAt: r.sla_frozen_at,
            slaElapsedMs: r.sla_elapsed_ms,
            followUpDeadline: r.follow_up_deadline,
            followUpNotified: r.follow_up_notified === 1,
            followUpPendingJustification: r.follow_up_pending_justification === 1,
            aguardDeadline: r.aguard_deadline,
            aguardNotified: r.aguard_notified === 1,
            aguardPendingJustification: r.aguard_pending_justification === 1,
            slaOverdueNotified: r.sla_overdue_notified === 1,
            slaOverduePendingJustification: r.sla_overdue_pending_justification === 1,
            gestorSetor: (r.logistics_task ? JSON.parse(r.logistics_task).gestorSetor : null) || (r.commercial_task ? JSON.parse(r.commercial_task).gestorSetor : null) || (r.financial_task ? JSON.parse(r.financial_task).gestorSetor : null)
        }));
        res.json(parsed);
    });
});

app.get('/api/sac/tickets/:id', authenticateToken, (req, res) => {
    db.get("SELECT * FROM sac_tickets WHERE id = ?", [req.params.id], (err, r) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!r) return res.status(404).json({ error: 'Not found' });
        const parsed = {
            ...r,
            timeline: JSON.parse(r.timeline||'[]'),
            costCenters: JSON.parse(r.cost_centers||'[]'),
            attachments: JSON.parse(r.attachments||'[]'),
            checklist: JSON.parse(r.checklist||'[]'),
            logisticsTask: JSON.parse(r.logistics_task||'null'),
            commercialTask: JSON.parse(r.commercial_task||'null'),
            financialTask: JSON.parse(r.financial_task||'null'),
            occurrences: JSON.parse(r.occurrences||'[]'),
            comments: JSON.parse(r.comments||'[]'),
            tags: JSON.parse(r.tags||'[]'),
            isUrgent: r.is_urgent === 1,
            nextSteps: r.next_steps,
            clientName: r.client_name,
            cnpjCpf: r.cnpj_cpf,
            osNumber: r.os_number,
            contactName: r.contact_name,
            contactPhone: r.contact_phone,
            contactEmail: r.contact_email,
            typeKey: r.type_key,
            openDate: r.created_at,
            closeDate: r.close_date,
            slaFrozenAt: r.sla_frozen_at,
            slaElapsedMs: r.sla_elapsed_ms,
            followUpDeadline: r.follow_up_deadline,
            followUpNotified: r.follow_up_notified === 1,
            followUpPendingJustification: r.follow_up_pending_justification === 1,
            aguardDeadline: r.aguard_deadline,
            aguardNotified: r.aguard_notified === 1,
            aguardPendingJustification: r.aguard_pending_justification === 1,
            slaOverdueNotified: r.sla_overdue_notified === 1,
            slaOverduePendingJustification: r.sla_overdue_pending_justification === 1,
            gestorSetor: (r.logistics_task ? JSON.parse(r.logistics_task).gestorSetor : null) || (r.commercial_task ? JSON.parse(r.commercial_task).gestorSetor : null) || (r.financial_task ? JSON.parse(r.financial_task).gestorSetor : null)
        };
        res.json(parsed);
    });
});`;

code = code.replace(regexGET, newGET);
fs.writeFileSync('backend/server.js', code);
console.log('Replaced successfully');
