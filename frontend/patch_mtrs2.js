const fs = require('fs');
const path = require('path');

const filepath = path.join(__dirname, 'index.html');
let c = fs.readFileSync(filepath, 'utf8');

// 1. Substituir o botão com alert() pelo botão real
c = c.replace(
  /onclick="alert\('Funcionalidade em desenvolvimento\. Aguardando integra[^']*'\)"/,
  `onclick="window.abrirModalGerarMTR()"`
);

// 2. Atualizar tbody da tabela com id correto e adicionar coluna Gerador
c = c.replace(
  /<thead>\s*<tr>\s*<th>Número MTR<\/th>[\s\S]*?<\/thead>\s*<tbody>[\s\S]*?<\/tbody>/,
  `<thead>
                                    <tr>
                                        <th>Número MTR</th>
                                        <th>Data Geração</th>
                                        <th>Status</th>
                                        <th>Resíduo</th>
                                        <th>Gerador</th>
                                        <th style="text-align: right;">Ações</th>
                                    </tr>
                                </thead>
                                <tbody id="mtr-tbody">
                                    <tr><td colspan="6" style="text-align:center;color:#64748b;padding:2rem;">Carregando...</td></tr>
                                </tbody>`
);

// 3. Atualizar input de busca com oninput
c = c.replace(
  /placeholder="Pesquisar MTR por número, OS ou gerador\.\.\."/,
  `placeholder="Pesquisar MTR por número, OS ou gerador..." oninput="window.filtrarMTR(this.value)"`
);

// 4. Adicionar modal e script antes de </section> da view MTR
const modalMTR = `
                    <!-- Modal Gerar MTR -->
                    <div id="modal-gerar-mtr" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;align-items:center;justify-content:center;">
                        <div style="background:#fff;border-radius:16px;padding:2rem;width:560px;max-width:95vw;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;">
                                <h3 id="mtr-modal-titulo" style="margin:0;font-size:1.2rem;color:#1e293b;"><i class="ph ph-leaf" style="color:#10b981;"></i> Gerar Nova MTR</h3>
                                <button onclick="window.fecharModalMTR()" style="background:none;border:none;cursor:pointer;font-size:1.4rem;color:#64748b;">&times;</button>
                            </div>
                            <form id="mtr-form" onsubmit="window.submitGerarMTR(event)">
                                <input type="hidden" id="mtr-complementar-de">
                                <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem;">
                                    <div style="grid-column:1/-1;">
                                        <label style="font-size:0.82rem;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Nome do Gerador *</label>
                                        <input type="text" id="mtr-gerador-nome" required placeholder="Razão social do gerador" style="width:100%;padding:0.6rem 0.75rem;border:1px solid #e2e8f0;border-radius:8px;font-size:0.9rem;box-sizing:border-box;">
                                    </div>
                                    <div>
                                        <label style="font-size:0.82rem;font-weight:600;color:#475569;display:block;margin-bottom:4px;">CNPJ do Gerador *</label>
                                        <input type="text" id="mtr-gerador-cnpj" required placeholder="00.000.000/0001-00" style="width:100%;padding:0.6rem 0.75rem;border:1px solid #e2e8f0;border-radius:8px;font-size:0.9rem;box-sizing:border-box;">
                                    </div>
                                    <div>
                                        <label style="font-size:0.82rem;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Quantidade *</label>
                                        <input type="number" step="0.001" id="mtr-quantidade" required placeholder="Ex: 1.500" style="width:100%;padding:0.6rem 0.75rem;border:1px solid #e2e8f0;border-radius:8px;font-size:0.9rem;box-sizing:border-box;">
                                    </div>
                                    <div>
                                        <label style="font-size:0.82rem;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Unidade *</label>
                                        <select id="mtr-unidade" required style="width:100%;padding:0.6rem 0.75rem;border:1px solid #e2e8f0;border-radius:8px;font-size:0.9rem;background:#fff;box-sizing:border-box;">
                                            <option value="">Selecione...</option>
                                            <option value="TON">Tonelada (TON)</option>
                                            <option value="KG">Quilograma (KG)</option>
                                            <option value="L">Litro (L)</option>
                                            <option value="M3">Metro Cúbico (M³)</option>
                                        </select>
                                    </div>
                                    <div style="grid-column:1/-1;">
                                        <label style="font-size:0.82rem;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Resíduo *</label>
                                        <select id="mtr-residuo" required style="width:100%;padding:0.6rem 0.75rem;border:1px solid #e2e8f0;border-radius:8px;font-size:0.9rem;background:#fff;box-sizing:border-box;">
                                            <option value="">Carregando resíduos...</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style="font-size:0.82rem;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Estado Físico *</label>
                                        <select id="mtr-estado-fisico" required style="width:100%;padding:0.6rem 0.75rem;border:1px solid #e2e8f0;border-radius:8px;font-size:0.9rem;background:#fff;box-sizing:border-box;">
                                            <option value="">Selecione...</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style="font-size:0.82rem;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Acondicionamento *</label>
                                        <select id="mtr-acondicionamento" required style="width:100%;padding:0.6rem 0.75rem;border:1px solid #e2e8f0;border-radius:8px;font-size:0.9rem;background:#fff;box-sizing:border-box;">
                                            <option value="">Selecione...</option>
                                        </select>
                                    </div>
                                    <div style="grid-column:1/-1;">
                                        <label style="font-size:0.82rem;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Forma de Tratamento *</label>
                                        <select id="mtr-tratamento" required style="width:100%;padding:0.6rem 0.75rem;border:1px solid #e2e8f0;border-radius:8px;font-size:0.9rem;background:#fff;box-sizing:border-box;">
                                            <option value="">Selecione...</option>
                                        </select>
                                    </div>
                                    <div style="grid-column:1/-1;">
                                        <label style="font-size:0.82rem;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Observação</label>
                                        <textarea id="mtr-observacao" rows="2" placeholder="Observações adicionais..." style="width:100%;padding:0.6rem 0.75rem;border:1px solid #e2e8f0;border-radius:8px;font-size:0.9rem;box-sizing:border-box;resize:vertical;"></textarea>
                                    </div>
                                </div>
                                <div style="display:flex;gap:0.75rem;justify-content:flex-end;">
                                    <button type="button" onclick="window.fecharModalMTR()" class="btn btn-secondary">Cancelar</button>
                                    <button type="submit" id="mtr-btn-gerar" class="btn btn-primary" style="background:#10b981;"><i class="ph ph-leaf"></i> Gerar MTR</button>
                                </div>
                            </form>
                        </div>
                    </div>`;

c = c.replace(
  /(<\/section>\s*<!-- VIEW: CLIENTES ITINERANTES -->)/,
  modalMTR + '\n                $1'
);

// 5. Adicionar script mtr.js antes de </head>
if (!c.includes('mtr.js')) {
  c = c.replace(
    /<script src="rh_agenda\.js"/,
    `<script src="mtr.js" defer></script>\n    <script src="rh_agenda.js"`
  );
}

fs.writeFileSync(filepath, c);
console.log('Feito.');
