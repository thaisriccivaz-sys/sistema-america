const fs = require('fs');
let code = fs.readFileSync('frontend/fechamento.js', 'utf8');

const modalCode = `
window.mostrarRegrasFechamento = function() {
    let modal = document.getElementById('modal-regras-fechamento');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-regras-fechamento';
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:99999;backdrop-filter:blur(2px);';
        
        modal.innerHTML = \`
            <div style="background:#fff;border-radius:12px;width:600px;max-width:95%;box-shadow:0 10px 25px rgba(0,0,0,0.2);overflow:hidden;display:flex;flex-direction:column;text-align:left;">
                <div style="padding:15px 20px;border-bottom:1px solid #f1f5f9;display:flex;justify-content:space-between;align-items:center;background:#f8fafc;">
                    <h3 style="margin:0;font-size:1.1rem;color:#0f172a;font-weight:700;"><i class="ph ph-lightbulb" style="color:#eab308;margin-right:8px;"></i> Regras de Cores da Conferência</h3>
                    <button onclick="document.getElementById('modal-regras-fechamento').style.display='none'" style="background:none;border:none;font-size:1.5rem;color:#94a3b8;cursor:pointer;padding:0;">&times;</button>
                </div>
                <div style="padding:20px;overflow-y:auto;max-height:70vh;font-size:0.9rem;color:#334155;line-height:1.6;">
                    <p style="margin:0 0 15px;">Se um dia se encaixar em múltiplas regras, o sistema aplicará a cor da regra que estiver <strong>mais acima</strong> nesta lista (prioridade).</p>
                    <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:12px;">
                        <li style="display:flex;align-items:flex-start;gap:10px;">
                            <span style="display:inline-block;width:14px;height:14px;background:#fe7884;border:1px solid #dc2626;border-radius:3px;flex-shrink:0;margin-top:3px;"></span>
                            <div><strong>1. Falta Integral:</strong> Aplicado quando há falta o dia todo sem nenhuma batida de ponto e sem justificativa.</div>
                        </li>
                        <li style="display:flex;align-items:flex-start;gap:10px;">
                            <span style="display:inline-block;width:14px;height:14px;background:#fef9c3;border:1px solid #fde047;border-radius:3px;flex-shrink:0;margin-top:3px;"></span>
                            <div><strong>2. Férias:</strong> Aplicado nos dias marcados como férias para o colaborador.</div>
                        </li>
                        <li style="display:flex;align-items:flex-start;gap:10px;">
                            <span style="display:inline-block;width:14px;height:14px;background:#fee2e2;border:1px solid #fca5a5;border-radius:3px;flex-shrink:0;margin-top:3px;"></span>
                            <div><strong>3. Justificado / Atestado:</strong> Aplicado sempre que o RH insere um atestado ou justificativa de horas (total ou parcial) naquele dia no ControlID.</div>
                        </li>
                        <li style="display:flex;align-items:flex-start;gap:10px;">
                            <span style="display:inline-block;width:14px;height:14px;background:#cdd1d4;border:1px solid #94a3b8;border-radius:3px;flex-shrink:0;margin-top:3px;"></span>
                            <div><strong>4. Folga:</strong> Aplicado em dias de descanso e feriados onde não houve marcação de ponto.</div>
                        </li>
                        <li style="display:flex;align-items:flex-start;gap:10px;">
                            <span style="display:inline-block;width:14px;height:14px;background:#feae67;border:1px solid #f97316;border-radius:3px;flex-shrink:0;margin-top:3px;"></span>
                            <div><strong>5. Apontamento Manual:</strong> Aplicado quando o RH preenche uma batida esquecida manualmente. O horário modificado ficará em <b>negrito</b>.</div>
                        </li>
                        <li style="display:flex;align-items:flex-start;gap:10px;">
                            <span style="display:inline-block;width:14px;height:14px;background:#cb79ff;border:1px solid #a855f7;border-radius:3px;flex-shrink:0;margin-top:3px;"></span>
                            <div><strong>6. Mais de 12h Seguidas:</strong> Aplicado quando a soma de horas normais e extras ultrapassa 12 horas (exceto para colaboradores 12x36).</div>
                        </li>
                        <li style="display:flex;align-items:flex-start;gap:10px;">
                            <span style="display:inline-block;width:14px;height:14px;background:#93c5fd;border:1px solid #3b82f6;border-radius:3px;flex-shrink:0;margin-top:3px;"></span>
                            <div><strong>7. Extra 100%:</strong> Aplicado quando o colaborador faz mais de 15 minutos de hora extra em domingos, folgas ou feriados.</div>
                        </li>
                        <li style="display:flex;align-items:flex-start;gap:10px;">
                            <span style="display:inline-block;width:14px;height:14px;background:#dbeafe;border:1px solid #93c5fd;border-radius:3px;flex-shrink:0;margin-top:3px;"></span>
                            <div><strong>8. Extra 60%:</strong> Aplicado quando o colaborador faz mais de 15 minutos de hora extra em dias normais de trabalho.</div>
                        </li>
                        <li style="display:flex;align-items:flex-start;gap:10px;">
                            <span style="display:inline-block;width:14px;height:14px;background:#fbcfe8;border:1px solid #f472b6;border-radius:3px;flex-shrink:0;margin-top:3px;"></span>
                            <div><strong>9. Noturno:</strong> Aplicado se houve registro de adicional noturno trabalhado no dia.</div>
                        </li>
                        <li style="display:flex;align-items:flex-start;gap:10px;">
                            <span style="display:inline-block;width:14px;height:14px;background:#fde047;border:1px solid #eab308;border-radius:3px;flex-shrink:0;margin-top:3px;"></span>
                            <div><strong>10. Atraso / Saída Antecipada:</strong> Aplicado quando a soma de faltas parciais ou atrasos no dia supera 15 minutos.</div>
                        </li>
                    </ul>
                </div>
            </div>
        \`;
        
        modal.addEventListener('click', function(e) {
            if (e.target === modal) modal.style.display = 'none';
        });
        
        document.body.appendChild(modal);
    }
    modal.style.display = 'flex';
};
`;

code += '\n\n' + modalCode;
fs.writeFileSync('frontend/fechamento.js', code);
