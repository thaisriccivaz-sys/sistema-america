function safeStr(val) { return val ? val : ''; }

function getFichaAdmissaoHtml(colaborador) {
    const c = colaborador;
    
    // Determinar se é CLT ou Intermitente baseado no tipo de contrato
    const isIntermitente = c.tipo_contrato === 'Intermitente' ? '( X )' : '(   )';
    const isCLT = c.tipo_contrato === 'CLT' ? '( X )' : '(   )';
    
    // Parse dependentes
    let dependentes = [];
    try { if (c.dependentes) dependentes = (typeof c.dependentes === 'string') ? JSON.parse(c.dependentes) : c.dependentes; } catch(e) {}
    let conjuge = dependentes.find(d => d.grau_parentesco === 'Cônjuge') || {};
    let filhos = dependentes.filter(d => d.grau_parentesco !== 'Cônjuge');
    
    const html = `
    <!DOCTYPE html>
    <html lang=\"pt-BR\">
    <head>
        <meta charset=\"UTF-8\">
        <style>
            body { font-family: Arial, sans-serif; font-size: 11px; margin: 0; padding: 20px; line-height: 1.4; color: #000; }
            .header-img { display: block; margin: 0 auto 10px auto; max-width: 150px; }
            h2 { text-align: center; font-size: 14px; margin: 5px 0 20px 0; font-weight: bold; }
            .row { display: flex; flex-direction: row; margin-bottom: 4px; }
            .label { font-weight: bold; margin-right: 5px; white-space: nowrap; }
            .value { flex: 1; border-bottom: 1px solid #ccc;  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-bottom: 2px;}
            
            .box { border: 2px solid #000; padding: 10px; margin-top: 15px; margin-bottom: 15px; }
            .box-title { text-align: center; font-weight: bold; font-size: 11px; margin-top: -18px; margin-bottom: 10px; }
            .box-title span { background: #fff; padding: 0 5px; }
            
            .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
            .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
            
            .blue-header { background-color: #2F5597; color: white; text-align: center; padding: 6px; font-weight: bold; margin-top: 20px; margin-bottom: 15px; }
            
            .dependentes-row { display: flex; gap: 10px; margin-bottom: 8px; }
            .dependentes-row > div { flex: 1; border-bottom: 1px solid #000; height: 16px; align-items:flex-end; display:flex;}
            .red-text { color: red; font-weight: bold; }
            .bold { font-weight: bold; }
        </style>
    </head>
    <body>
        <img src=\"https://raw.githubusercontent.com/americarental/cadastro-colaboradores/main/frontend/assets/logo.png\" alt=\"Logo\" class=\"header-img\">
        <h2>FICHA DE ADMISSÃO DE COLABORADOR</h2>
        
        <div class=\"row\"><span class=\"label\">Colaborador:</span><div class=\"value bold\">${safeStr(c.nome_completo || c.nome)}</div></div>
        <div class=\"row\"><span class=\"label\">Empresa:</span><div class=\"value bold\">América Rental Equipamentos Ltda</div></div>
        
        <div class=\"grid-2\">
            <div class=\"row\"><span class=\"label\">Endereço:</span><div class=\"value\">${safeStr(c.endereco)}</div></div>
            <div class=\"row\"><span class=\"label\">Complemento:</span><div class=\"value\">-</div></div>
        </div>
        
        <div class=\"grid-3\">
            <div class=\"row\"><span class=\"label\">Bairro:</span><div class=\"value\"></div></div>
            <div class=\"row\"><span class=\"label\">Cidade:</span><div class=\"value\">Guarulhos</div></div>
            <div class=\"row\"><span class=\"label\">UF:</span><div class=\"value\">SP</div></div>
        </div>
        
        <div class=\"grid-2\">
            <div class=\"row\"><span class=\"label\">CEP:</span><div class=\"value\"></div></div>
            <div class=\"row\"><span class=\"label\">Telefone:</span><div class=\"value\">${safeStr(c.telefone)}</div></div>
        </div>
        
        <div class=\"row\" style=\"width:50%\"><span class=\"label\">Data de Nascimento:</span><div class=\"value\">${c.data_nascimento ? new Date(c.data_nascimento + 'T12:00:00').toLocaleDateString('pt-BR') : ''}</div></div>
        <div class=\"row\" style=\"width:50%\"><span class=\"label\">Estado Civil:</span><div class=\"value\">${safeStr(c.estado_civil)}</div></div>
        
        <div class=\"row\"><span class=\"label\">Nome do Pai:</span><div class=\"value\">${safeStr(c.nome_pai)}</div></div>
        <div class=\"row\"><span class=\"label\">Nome da Mãe:</span><div class=\"value\">${safeStr(c.nome_mae)}</div></div>
        
        <div class=\"grid-2\">
            <div class=\"row\"><span class=\"label\">Grau de Instrução:</span><div class=\"value\">${safeStr(c.grau_instrucao)}</div></div>
            <div class=\"row\"><span class=\"label\">Naturalidade:</span><div class=\"value\">${safeStr(c.local_nascimento)}</div></div>
        </div>
        
        <div class=\"box\">
            <div class=\"row\"><span class=\"label\">Cor da Pele:</span><span style=\"width: 150px;\">${safeStr(c.cor_raca)}</span> <i style=\"font-size:10px;\">(Como o colaborador se identifica)</i></div>
            <div class=\"row\" style=\"margin-top:5px;\"><span class=\"label\">Possui alguma doença ou é alérgico a algum tipo de remédio?</span> <span>${(c.alergias && c.alergias.trim()!=='') ? 'Sim' : 'Não'}</span></div>
            <div class=\"row\" style=\"margin-top:5px;\"><span class=\"label\">Em caso positivo indicar as providências:</span> </div>
            <div style=\"border-bottom:1px solid #000; height:18px;\">${safeStr(c.alergias)}</div>
            <div style=\"border-bottom:1px solid #000; height:18px; margin-top:5px;\"></div>
        </div>
        
        <div class=\"grid-3\">
            <div class=\"row\"><span class=\"label\">Cédula de Identidade:</span><div class=\"value\">${safeStr(c.rg)}</div></div>
            <div class=\"row\"><span class=\"label\">Emissão:</span><div class=\"value\">${c.rg_data_emissao ? new Date(c.rg_data_emissao + 'T12:00:00').toLocaleDateString('pt-BR') : ''}</div></div>
            <div class=\"row\"><span class=\"label\">CPF:</span><div class=\"value\">${safeStr(c.cpf)}</div></div>
        </div>
        
        <div class=\"grid-3\">
            <div class=\"row\"><span class=\"label\">Título de eleitor:</span><div class=\"value\">${safeStr(c.titulo_eleitoral)}</div></div>
            <div class=\"row\"><span class=\"label\">Zona:</span><div class=\"value\">${safeStr(c.titulo_zona)}</div></div>
            <div class=\"row\"><span class=\"label\">Seção:</span><div class=\"value\">${safeStr(c.titulo_secao)}</div></div>
        </div>
        
        <div class=\"row\" style=\"width:33%\"><span class=\"label\">Reservista:</span><div class=\"value\">${safeStr(c.certificado_militar || '')}</div></div>
        
        <div style=\"text-align:center; font-size:11px; margin-top:15px; font-weight:bold;\">
            Contrato Intermitente ${isIntermitente} &nbsp;&nbsp;&nbsp; Contrato CLT ${isCLT}
        </div>
        
        <div class=\"box\">
            <div class=\"box-title\"><span>INFORMAÇÕES À CONTABILIDADE</span></div>
            
            <div style=\"padding: 0 40px;\">
                <div class=\"row\"><span class=\"label\">Data de Admissão:</span> <span style=\"width:120px\">${c.data_admissao ? new Date(c.data_admissao+ 'T12:00:00').toLocaleDateString('pt-BR') : ''}</span></div>
                <div class=\"row\"><span class=\"label\">Função:</span> <span>${safeStr(c.cargo)}</span></div>
                <div class=\"row\"><span class=\"label\">Salário:</span> <span>${safeStr(c.salario)}</span></div>
                
                <div class=\"grid-2\" style=\"margin-top:5px;\">
                    <div class=\"row\"><span class=\"label\">Insalubridade:</span> <span>${c.insalubridade==='Sim'?'Sim':'Não'}</span></div>
                    <div class=\"row\"><span class=\"label\">Valor da Insalubridade:</span> <span></span></div>
                    
                    <div class=\"row\"><span class=\"label\">Vale Transporte:</span> <span>${c.meio_transporte==='Vale Transporte (VT)'?'Sim':'Não'}</span></div>
                    <div class=\"row\"><span class=\"label\">Valor VT:</span> <span>${c.meio_transporte==='Vale Transporte (VT)'?'6%':''}</span></div>
                    
                    <div class=\"row\"><span class=\"label\">Auxílio Combustível:</span> <span>${c.meio_transporte==='Vale Combustível (VC)'?'Sim':'Não'}</span></div>
                    <div class=\"row\"><span class=\"label\">Valor AC:</span> <span>${c.meio_transporte==='Vale Combustível (VC)'?safeStr(c.valor_transporte):'R$ 0,00'}</span></div>
                    
                    <div class=\"row\"><span class=\"label\">Vale Adiantamento:</span> <span>${c.adiantamento_salarial==='Sim'?'Sim':'Não'}</span></div>
                    <div class=\"row\"><span class=\"label\">Valor:</span> <span>${c.adiantamento_salarial==='Sim'?safeStr(c.adiantamento_valor):''}</span></div>
                </div>
                
                <div class=\"grid-2\" style=\"margin-top:5px;\">
                    <div class=\"row\"><span class=\"label\">Horário de Trabalho:</span> <span class=\"red-text\" style=\"font-size:10px\">${safeStr(c.horario_entrada)} as ${safeStr(c.horario_saida)}</span></div>
                    <div class=\"row\"><span class=\"label red-text\">Seg a Sexta</span> <span class=\"red-text\" style=\"font-size:10px\">Sabado ${safeStr(c.sabado_entrada)} as ${safeStr(c.sabado_saida)}</span></div>
                </div>
                
                <div class=\"row\"><span class=\"label\">Período de Experiência:</span> <span>45\\45</span></div>
            </div>
            
            <div style=\"border-top:1px solid #000; margin-top:10px; padding-top:5px;\" class=\"grid-3\">
                <div class=\"row\"><span class=\"label\">Banco:</span> <span>${safeStr(c.banco_nome)}</span></div>
                <div class=\"row\"><span class=\"label\">Agência:</span> <span>${safeStr(c.banco_agencia)}</span></div>
                <div class=\"row\"><span class=\"label\">Conta:</span> <span>${safeStr(c.banco_conta)}</span></div>
            </div>
        </div>
        
        <div class=\"blue-header\">Providenciar o Livro de Registro de Empregados</div>
        
        <div style=\"font-size:10px;\">
            <div class=\"dependentes-row\">
                <div style=\"flex:1.5; align-items:flex-end; display:flex;\"><span class=\"label\">Nome do Cônjuge:</span> ${safeStr(conjuge.nome)}</div>
                <div><span class=\"label\">CPF:</span> ${safeStr(conjuge.cpf)}</div>
                <div><span class=\"label\">Nascimento:</span> ${conjuge.data_nascimento ? new Date(conjuge.data_nascimento+'T12:00:00').toLocaleDateString('pt-BR'):''}</div>
            </div>
            <div class=\"dependentes-row\">
                <div style=\"flex:1.5\"><span class=\"label\">Nome do Dependente:</span> ${safeStr(filhos[0]?filhos[0].nome:'')}</div>
                <div><span class=\"label\">CPF:</span> ${safeStr(filhos[0]?filhos[0].cpf:'')}</div>
                <div><span class=\"label\">Nascimento:</span> ${filhos[0] && filhos[0].data_nascimento ? new Date(filhos[0].data_nascimento+'T12:00:00').toLocaleDateString('pt-BR'):''}</div>
            </div>
            <div class=\"dependentes-row\">
                <div style=\"flex:1.5\"><span class=\"label\">Nome do Dependente:</span> ${safeStr(filhos[1]?filhos[1].nome:'')}</div>
                <div><span class=\"label\">CPF:</span> ${safeStr(filhos[1]?filhos[1].cpf:'')}</div>
                <div><span class=\"label\">Nascimento:</span> ${filhos[1] && filhos[1].data_nascimento ? new Date(filhos[1].data_nascimento+'T12:00:00').toLocaleDateString('pt-BR'):''}</div>
            </div>
            <div class=\"dependentes-row\">
                <div style=\"flex:1.5\"><span class=\"label\">Nome do Dependente:</span> ${safeStr(filhos[2]?filhos[2].nome:'')}</div>
                <div><span class=\"label\">CPF:</span> ${safeStr(filhos[2]?filhos[2].cpf:'')}</div>
                <div><span class=\"label\">Nascimento:</span> ${filhos[2] && filhos[2].data_nascimento ? new Date(filhos[2].data_nascimento+'T12:00:00').toLocaleDateString('pt-BR'):''}</div>
            </div>
        </div>
        
    </body>
    </html>
    `;
    return html;
}

module.exports = { getFichaAdmissaoHtml };
