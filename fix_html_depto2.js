const fs = require('fs');
let html = fs.readFileSync('frontend/index.html', 'utf8');

// Find the string "<!-- TAB 2"
let startMarker = html.indexOf('<!-- TAB 2');
if(startMarker !== -1) {
    let endMarker = html.indexOf('</section>', startMarker);
    if(endMarker !== -1) {
        let oldPart = html.substring(startMarker, endMarker);
        
        // Extract the content inside tab-content-departamentos
        let contentStart = oldPart.indexOf('<div id="tab-content-departamentos"');
        let formStart = oldPart.indexOf('>', contentStart) + 1;
        let lastDiv = oldPart.lastIndexOf('</div>');
        let deptoHtml = oldPart.substring(formStart, lastDiv).trim();
        // Remove one more </div>
        deptoHtml = deptoHtml.substring(0, deptoHtml.lastIndexOf('</div>')).trim();

        const newSection = `</section>

                <section id="view-departamentos" class="content-view">
                    <div class="page-header flex-between" style="position: sticky; top: 60px; z-index: 20; background: var(--bg-main); padding: 1rem 0; margin-top: -1.5rem; margin-bottom: 1.5rem; border-bottom: 1px solid var(--border-color);">
                        <div style="display: flex; align-items: center; gap: 1.5rem;">
                            <div style="width: 80px; height: 80px; border-radius: 50%; border: 2px dashed #cbd5e0; display: flex; align-items: center; justify-content: center; background: #fff5f5; color: #c92a2a; font-size: 2rem;">
                                <i class="ph ph-buildings"></i>
                            </div>
                            <div>
                                <h2 style="margin: 0; font-size: 1.4rem;">Gestão de Departamentos</h2>
                                <p style="margin: 4px 0 0; color: #64748b; font-size: 0.85rem;">Gerencie a estrutura organizacional e responsáveis.</p>
                            </div>
                        </div>
                    </div>
                    ${deptoHtml}
                </section>`;
        
        // Replace
        html = html.substring(0, startMarker) + newSection + html.substring(endMarker + 10);
    }
}

// Remove the tabs
let tabsStart = html.indexOf('<!-- ABAS INTERNAS');
if (tabsStart !== -1) {
    let tabsEnd = html.indexOf('<div id="tab-content-cargos">', tabsStart);
    if (tabsEnd !== -1) {
        html = html.substring(0, tabsStart) + html.substring(tabsEnd + '<div id="tab-content-cargos">'.length);
    }
}

// Ensure the closing tags for view-cargos match
html = html.replace('</div>\r\n                    </div>\r\n                    </div>\r\n\r\n                </section>', '</div>\r\n                    </div>\r\n                </section>');
html = html.replace('</div>\n                    </div>\n                    </div>\n\n                </section>', '</div>\n                    </div>\n                </section>');

fs.writeFileSync('frontend/index.html', html);
