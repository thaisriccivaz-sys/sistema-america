$filePath = "backend\server.js"
$content = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)

$startMarker = "// ── POST /api/sac/notificar-atribuicao ────────────────────────────────────────`r`n// Notifica por e-mail + popup interno o colaborador atribuído a um chamado de SAC`r`napp.post('/api/sac/notificar-atribuicao'"
$endMarker = "// ── POST /api/sac/notificar-novo-chamado"

$startIdx = $content.IndexOf($startMarker)
$endIdx = $content.IndexOf($endMarker, $startIdx)

if ($startIdx -lt 0) { Write-Error "Start marker not found!"; exit 1 }
if ($endIdx -lt 0) { Write-Error "End marker not found!"; exit 1 }

Write-Host "Replacing block from $startIdx to $endIdx (length $($endIdx - $startIdx))"

$newBlock = @'
// ── POST /api/sac/notificar-atribuicao ────────────────────────────────────────
// Notifica por e-mail + popup interno o colaborador atribuído a um chamado de SAC
app.post('/api/sac/notificar-atribuicao', authenticateToken, async (req, res) => {
    const { ticketId, protocol, clientName, setor, assignedUsername, assignedUserNome } = req.body;
    console.log(`[SAC notif-atrib] Recebido: assignedUsername="${assignedUsername}", assignedUserNome="${assignedUserNome}", setor="${setor}", protocol="${protocol}"`);
    if (!assignedUsername) return res.status(400).json({ error: 'assignedUsername obrigatorio' });

    const logoPath = require('path').join(__dirname, '..', 'frontend', 'assets', 'logo-header.png');
    const sectorLabels = { logisticsTask: 'Logistica', commercialTask: 'Comercial', financialTask: 'Financeiro',
                          'Logistica': 'Logistica', 'Comercial': 'Comercial', 'Financeiro': 'Financeiro' };
    const sectorName = sectorLabels[setor] || setor || 'SAC';
    const systemUrl = 'https://sistema-america.onrender.com/';

    const searchTerm = assignedUsername.toLowerCase().trim();
    const searchNome = (assignedUserNome || assignedUsername).toLowerCase().trim();

    db.get(`
        SELECT u.id, u.nome, u.username, u.email as uemail,
               c.email_corporativo as ec, c.email as ce, c.departamento
        FROM usuarios u
        LEFT JOIN colaboradores c ON LOWER(TRIM(c.nome_completo)) = LOWER(TRIM(u.nome))
        WHERE u.ativo = 1 AND (
            LOWER(TRIM(u.username)) = ?
            OR LOWER(TRIM(u.nome)) = ?
            OR LOWER(REPLACE(TRIM(u.username), '.', ' ')) = ?
            OR LOWER(REPLACE(TRIM(u.nome), ' ', '.')) = ?
        )
        LIMIT 1
    `, [searchTerm, searchNome, searchNome, searchTerm], async (err, user) => {
        if (err) { console.error('[SAC notif-atrib] Erro ao buscar usuario:', err.message); return res.status(500).json({ error: err.message }); }
        console.log('[SAC notif-atrib] Usuario encontrado:', user ? `id=${user.id} nome="${user.nome}" ec="${user.ec}" ce="${user.ce}" uemail="${user.uemail}" dept="${user.departamento}"` : 'NAO ENCONTRADO');

        const msgNotif = `Voce foi atribuido ao chamado <strong>No ${protocol}</strong> - ${clientName} (${sectorName}). <a href="${systemUrl}" style="color:#dc2626;font-weight:700;">Acessar SAC</a>`;

        if (user) {
            db.run(`INSERT INTO notificacoes_usuarios (usuario_id, tipo, mensagem, dados) VALUES (?, ?, ?, ?)`,
                [user.id, 'sac_atribuicao', msgNotif, JSON.stringify({ ticketId, protocol, clientName, setor: sectorName })],
                (errIns) => {
                    if (errIns) console.error('[SAC notif-atrib] Erro ao inserir popup colab:', errIns.message);
                    else console.log(`[SAC notif-atrib] Popup inserido para usuario_id=${user.id}`);
                });
        } else {
            console.warn(`[SAC notif-atrib] Usuario "${assignedUsername}" / "${assignedUserNome}" nao encontrado. Popup nao enviado.`);
        }

        const emailDest = user ? (user.ec || user.ce || user.uemail || null) : null;
        console.log(`[SAC notif-atrib] Email destinatario colaborador: "${emailDest}"`);

        if (emailDest && emailDest.includes('@')) {
            try {
                await sendMailHelper({
                    to: emailDest,
                    subject: `SAC - Novo chamado atribuido a voce: No ${protocol}`,
                    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #ddd;border-radius:8px;overflow:hidden;">
                        <div style="text-align:center;background:#fff;border-bottom:1px solid #eee;">
                            <img src="cid:empresa-logo" alt="America Rental" style="width:100%;max-width:600px;height:auto;display:block;">
                        </div>
                        <div style="padding:24px;">
                            <div style="background:#dc2626;border-radius:10px;padding:16px 20px;margin-bottom:20px;text-align:center;">
                                <span style="color:#fff;font-size:1.3rem;font-weight:800;">Novo Chamado Atribuido a Voce</span>
                            </div>
                            <p style="font-size:1rem;color:#1e293b;">Ola, <strong>${assignedUserNome || assignedUsername}</strong>!</p>
                            <p>Voce foi atribuido a um chamado de SAC. Acesse o sistema para verificar os detalhes.</p>
                            <div style="background:#fef2f2;padding:16px;border-radius:8px;margin:16px 0;border-left:4px solid #dc2626;">
                                <p style="margin:4px 0;"><strong>Protocolo:</strong> No ${protocol}</p>
                                <p style="margin:4px 0;"><strong>Cliente:</strong> ${(clientName || 'Cliente')}</p>
                                <p style="margin:4px 0;"><strong>Setor:</strong> ${sectorName}</p>
                            </div>
                            <div style="text-align:center;margin-top:20px;">
                                <a href="${systemUrl}" style="display:inline-block;padding:12px 28px;background:#dc2626;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:0.95rem;">Acessar o Chamado</a>
                            </div>
                        </div>
                    </div>`,
                    attachments: [{ filename: 'logo-header.png', path: logoPath, cid: 'empresa-logo' }]
                });
                console.log(`[SAC notif-atrib] Email enviado para colaborador: ${emailDest}`);
            } catch (mailErr) {
                console.error('[SAC notif-atrib] Erro ao enviar email para colaborador:', mailErr.message);
            }
        } else {
            console.warn(`[SAC notif-atrib] Nenhum email valido para o colaborador "${assignedUsername}".`);
        }

        // Busca o gestor DIRETAMENTE pelo setor informado (nao depende do departamento do colaborador)
        db.get(`
            SELECT u.id, u.nome, u.email as uemail, c.email_corporativo as ec, c.email as ce
            FROM departamentos d
            LEFT JOIN colaboradores gestor_c ON gestor_c.id = d.responsavel_id
            LEFT JOIN usuarios u ON LOWER(TRIM(u.nome)) = LOWER(TRIM(gestor_c.nome_completo)) AND u.ativo = 1
            WHERE LOWER(d.nome) LIKE LOWER(?)
            LIMIT 1
        `, [`%${sectorName}%`], async (errG, gestor) => {
            console.log(`[SAC notif-atrib] Gestor para setor "${sectorName}":`, gestor ? `id=${gestor.id} nome="${gestor.nome}" ec="${gestor.ec}" uemail="${gestor.uemail}"` : 'NAO ENCONTRADO');
            if (errG) { console.error('[SAC notif-atrib] Erro ao buscar gestor:', errG.message); }

            if (!errG && gestor && gestor.id && (!user || gestor.id !== user.id)) {
                const msgGestor = `O colaborador <strong>${assignedUserNome || assignedUsername}</strong> foi atribuido ao chamado SAC <strong>No ${protocol}</strong> (${clientName}). <a href="${systemUrl}" style="color:#dc2626;font-weight:700;">Acessar SAC</a>`;
                db.run(`INSERT INTO notificacoes_usuarios (usuario_id, tipo, mensagem, dados) VALUES (?, ?, ?, ?)`,
                    [gestor.id, 'sac_atribuicao_gestor', msgGestor, JSON.stringify({ ticketId, protocol, clientName, setor: sectorName, assignedTo: assignedUserNome || assignedUsername })],
                    (errInsG) => {
                        if (errInsG) console.error('[SAC notif-atrib] Erro ao inserir popup gestor:', errInsG.message);
                        else console.log(`[SAC notif-atrib] Popup gestor inserido para usuario_id=${gestor.id}`);
                    });

                const emailGestor = gestor.ec || gestor.ce || gestor.uemail || '';
                console.log(`[SAC notif-atrib] Email gestor: "${emailGestor}"`);
                if (emailGestor.includes('@')) {
                    try {
                        await sendMailHelper({
                            to: emailGestor,
                            subject: `SAC - Novo chamado atribuido ao setor ${sectorName}: No ${protocol}`,
                            html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #ddd;border-radius:8px;overflow:hidden;">
                                <div style="text-align:center;background:#fff;border-bottom:1px solid #eee;">
                                    <img src="cid:empresa-logo" alt="America Rental" style="width:100%;max-width:600px;height:auto;display:block;">
                                </div>
                                <div style="padding:24px;">
                                    <div style="background:#dc2626;border-radius:10px;padding:16px 20px;margin-bottom:20px;text-align:center;">
                                        <span style="color:#fff;font-size:1.3rem;font-weight:800;">Novo SAC atribuido ao setor</span>
                                    </div>
                                    <p style="font-size:1rem;color:#1e293b;">Ola, <strong>${gestor.nome}</strong>!</p>
                                    <p>Um chamado de SAC foi atribuido ao colaborador <strong>${assignedUserNome || assignedUsername}</strong> no setor <strong>${sectorName}</strong>.</p>
                                    <div style="background:#fef2f2;padding:16px;border-radius:8px;margin:16px 0;border-left:4px solid #dc2626;">
                                        <p style="margin:4px 0;"><strong>Protocolo:</strong> No ${protocol}</p>
                                        <p style="margin:4px 0;"><strong>Cliente:</strong> ${(clientName || 'Cliente')}</p>
                                        <p style="margin:4px 0;"><strong>Setor:</strong> ${sectorName}</p>
                                        <p style="margin:4px 0;"><strong>Atribuido a:</strong> ${assignedUserNome || assignedUsername}</p>
                                    </div>
                                    <div style="text-align:center;margin-top:20px;">
                                        <a href="${systemUrl}" style="display:inline-block;padding:12px 28px;background:#dc2626;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:0.95rem;">Acessar o Chamado</a>
                                    </div>
                                </div>
                            </div>`,
                            attachments: [{ filename: 'logo-header.png', path: logoPath, cid: 'empresa-logo' }]
                        });
                        console.log(`[SAC notif-atrib] Email enviado para gestor: ${emailGestor}`);
                    } catch (mailErr) {
                        console.error('[SAC notif-atrib] Erro ao enviar email para gestor:', mailErr.message);
                    }
                } else {
                    console.warn(`[SAC notif-atrib] Nenhum email valido para o gestor do setor "${sectorName}".`);
                }
            }
        });

        res.json({ success: true });
    });
});

'@

$before = $content.Substring(0, $startIdx)
$after = $content.Substring($endIdx)
$newContent = $before + $newBlock + $after

[System.IO.File]::WriteAllText($filePath, $newContent, [System.Text.Encoding]::UTF8)
Write-Host "Done! File rewritten."
