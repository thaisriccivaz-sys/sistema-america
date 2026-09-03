with open('frontend/sac.js', 'rb') as f:
    content = f.read().decode('utf-8')

old_block = "if (ticket.stage === 'aguardando_setores') {\r\n        alert('Um chamado em \"Aguardando Setores\" n\\u00e3o pode ser arrastado manualmente. Ele ser\\u00e1 movido para \"Respondido\" automaticamente quando o respons\\u00e1vel responder no card.');\r\n        _draggedId = null;\r\n        return;\r\n    }"

new_block = """if (ticket.stage === 'aguardando_setores') {
        // Bloqueia apenas se há alguém atribuído. Sem atribuição, libera movimentação.
        const hasAnyAssignee = (ticket.logisticsTask && ticket.logisticsTask.assignedTo) ||
                               (ticket.commercialTask && ticket.commercialTask.assignedTo) ||
                               (ticket.financialTask && ticket.financialTask.assignedTo);
        if (hasAnyAssignee) {
            alert('Um chamado em "Aguardando Setores" n\\u00e3o pode ser arrastado manualmente. Ele ser\\u00e1 movido para "Respondido" automaticamente quando o respons\\u00e1vel responder no card.');
            _draggedId = null;
            return;
        }
    }""".replace('\n', '\r\n')

if old_block in content:
    content = content.replace(old_block, new_block)
    with open('frontend/sac.js', 'wb') as f:
        f.write(content.encode('utf-8'))
    print('OK - substituicao feita com sucesso')
else:
    print('FALHA - bloco nao encontrado')
    print('Old repr:', repr(old_block[:100]))
