const fs = require('fs');
const path = require('path');

const filepath = path.join(__dirname, 'index.html');
let c = fs.readFileSync(filepath, 'utf8');

c = c.replace(
  /<a href=\"#\" class=\"nav-item\" data-target=\"logistica-sinistros\"[\s\S]*?Sinistros<\/a>\s*<\/div>/,
  `<a href=\"#\" class=\"nav-item\" data-target=\"logistica-sinistros\"
                        onclick=\"navigateTo('logistica-sinistros'); return false;\"><i class=\"ph ph-warning\"></i>
                        Sinistros</a>
                    <a href=\"#\" class=\"nav-item\" data-target=\"logistica-mtrs\"
                        onclick=\"navigateTo('logistica-mtrs'); return false;\"><i class=\"ph ph-leaf\"></i> Gestão de MTRs</a>
                </div>`
);

c = c.replace(
  /<!-- VIEW: CLIENTES ITINERANTES -->/,
  `<!-- VIEW: GESTÃO MTRS -->
                <section id=\"view-logistica-mtrs\" class=\"content-view\" style=\"padding:1.5rem; background:#f1f5f9;\">
                    <div class=\"page-header flex-between\" style=\"position: sticky; top: 60px; z-index: 20; background: #f1f5f9; padding: 1rem 0; margin-top: -1.5rem; margin-bottom: 1.5rem; border-bottom: 1px solid #e2e8f0;\">
                        <div style=\"display: flex; align-items: center; gap: 1.5rem;\">
                            <div style=\"width: 80px; height: 80px; border-radius: 50%; border: 2px dashed #10b981; display: flex; align-items: center; justify-content: center; background: #d1fae5; color: #10b981; font-size: 2rem;\">
                                <i class=\"ph ph-leaf\"></i>
                            </div>
                            <div>
                                <h2 style=\"margin: 0; font-size: 1.4rem;\">Gestão de MTRs (SIGOR)</h2>
                                <p style=\"margin: 4px 0 0; color: #64748b; font-size: 0.85rem;\">Gerencie e emita Manifestos de Transporte de Resíduos.</p>
                            </div>
                        </div>
                        <div class=\"header-actions\" style=\"display: flex; gap: 0.75rem;\">
                            <button type=\"button\" class=\"btn btn-primary\" onclick=\"alert('Funcionalidade em desenvolvimento. Aguardando integração com o SIGOR.')\" style=\"font-weight: 600; background: #10b981;\">
                                <i class=\"ph ph-plus-circle\"></i> Gerar MTR
                            </button>
                        </div>
                    </div>
                    
                    <div class=\"card p-4\">
                        <div class=\"flex-between mb-3\">
                            <h3 style=\"font-size: 1.1rem; color: #475569;\">Lista de MTRs</h3>
                        </div>
                        <div class=\"mb-3\" style=\"position:relative;\">
                            <i class=\"ph ph-magnifying-glass\" style=\"position:absolute;left:10px;top:50%;transform:translateY(-50%);color:#94a3b8;font-size:1rem;\"></i>
                            <input type=\"text\" placeholder=\"Pesquisar MTR por número, OS ou gerador...\" style=\"width:100%;padding:0.55rem 0.75rem 0.55rem 2.2rem;border:1px solid #e2e8f0;border-radius:8px;font-size:0.9rem;outline:none;box-sizing:border-box;\">
                        </div>
                        <div class=\"table-responsive\">
                            <table class=\"table\">
                                <thead>
                                    <tr>
                                        <th>Número MTR</th>
                                        <th>Data Geração</th>
                                        <th>Status</th>
                                        <th>Resíduo</th>
                                        <th style=\"text-align: right;\">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td colspan=\"5\" style=\"text-align: center; color: #64748b; padding: 2rem;\">Nenhuma MTR encontrada. Integração pendente.</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>

                <!-- VIEW: CLIENTES ITINERANTES -->`
);

fs.writeFileSync(filepath, c);
console.log('Feito.');
