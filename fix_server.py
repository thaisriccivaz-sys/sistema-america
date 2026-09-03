import re

with open('backend/server.js', 'rb') as f:
    c = f.read().decode('utf-8')

# 1. Update /pendentes
c = c.replace(
    "d.tem_adiantamento, d.tem_pagamento, d.tem_emprestimo, d.assinafy_status,",
    "d.tem_adiantamento, d.tem_pagamento, d.tem_emprestimo, d.tem_comunicacao, d.assinafy_status,"
)
c = c.replace(
    "temEmprestimo:   r.tem_emprestimo   ? true : false,",
    "temEmprestimo:   r.tem_emprestimo   ? true : false,\n            temComunicacao:  r.tem_comunicacao  ? true : false,"
)

# 2. Update /preview-merge
old_preview = """        // Merge Empréstimo if provided (página inteira, sem recorte)
        if (pdfEmprestimo && paginaEmprestimo) {
            const bufEmpr = Buffer.from(pdfEmprestimo, 'base64');
            const bufExtraidaEmpr = await pagamentosMassa.extrairPagina(bufEmpr, paginaEmprestimo, false);
            const emprPdfDoc = await PDFDocument.load(bufExtraidaEmpr);
            const emprPages = await basePdfDoc.copyPages(emprPdfDoc, emprPdfDoc.getPageIndices());
            emprPages.forEach(p => basePdfDoc.addPage(p));
        }

        const mergedPdfBytes = await basePdfDoc.save();"""

new_preview = """        // Merge Empréstimo if provided (página inteira, sem recorte)
        if (pdfEmprestimo && paginaEmprestimo) {
            const bufEmpr = Buffer.from(pdfEmprestimo, 'base64');
            const bufExtraidaEmpr = await pagamentosMassa.extrairPagina(bufEmpr, paginaEmprestimo, false);
            const emprPdfDoc = await PDFDocument.load(bufExtraidaEmpr);
            const emprPages = await basePdfDoc.copyPages(emprPdfDoc, emprPdfDoc.getPageIndices());
            emprPages.forEach(p => basePdfDoc.addPage(p));
        }

        // Merge Comunicação (genérico) if provided (todas as páginas)
        const pdfComunicacao = req.body.pdfComunicacao;
        if (pdfComunicacao) {
            const bufCom = Buffer.from(pdfComunicacao, 'base64');
            const comPdfDoc = await PDFDocument.load(bufCom);
            const comPages = await basePdfDoc.copyPages(comPdfDoc, comPdfDoc.getPageIndices());
            comPages.forEach(p => basePdfDoc.addPage(p));
        }

        const mergedPdfBytes = await basePdfDoc.save();"""
c = c.replace(old_preview, new_preview)

# 3. Update /enviar
# 3.1 Extract bufCom
c = c.replace(
    "const bufEmpr = pdfDuploBase64.emprestimo ? Buffer.from(pdfDuploBase64.emprestimo, 'base64') : null;",
    "const bufEmpr = pdfDuploBase64.emprestimo ? Buffer.from(pdfDuploBase64.emprestimo, 'base64') : null;\n        const bufCom = pdfDuploBase64.comunicacao ? Buffer.from(pdfDuploBase64.comunicacao, 'base64') : null;"
)

# 3.2 forcarAnexar Block
old_forcar = """                if (bufEmpr && item.paginaEmprestimo) {
                    const bufExtraidaEmpr = await pagamentosMassa.extrairPagina(bufEmpr, item.paginaEmprestimo, false);
                    const emprPdfDoc = await PDFDocument.load(bufExtraidaEmpr);
                    const emprPages = await docForcar.copyPages(emprPdfDoc, emprPdfDoc.getPageIndices());
                    emprPages.forEach(p => docForcar.addPage(p));
                    temEmprFlag = true;
                }

                const pdfBytesForcar = await docForcar.save();"""
new_forcar = """                if (bufEmpr && item.paginaEmprestimo) {
                    const bufExtraidaEmpr = await pagamentosMassa.extrairPagina(bufEmpr, item.paginaEmprestimo, false);
                    const emprPdfDoc = await PDFDocument.load(bufExtraidaEmpr);
                    const emprPages = await docForcar.copyPages(emprPdfDoc, emprPdfDoc.getPageIndices());
                    emprPages.forEach(p => docForcar.addPage(p));
                    temEmprFlag = true;
                }

                let temComFlag = false;
                if (bufCom) {
                    const comPdfDoc = await PDFDocument.load(bufCom);
                    const comPages = await docForcar.copyPages(comPdfDoc, comPdfDoc.getPageIndices());
                    comPages.forEach(p => docForcar.addPage(p));
                    temComFlag = true;
                }

                const pdfBytesForcar = await docForcar.save();"""
c = c.replace(old_forcar, new_forcar)

# 3.3 normal merge Block
old_merge = """                if (bufEmpr && item.paginaEmprestimo) {
                    const bufExtraidaEmpr = await pagamentosMassa.extrairPagina(bufEmpr, item.paginaEmprestimo, false);
                    const emprPdfDoc = await PDFDocument.load(bufExtraidaEmpr);
                    const emprPages = await baseDocBase.copyPages(emprPdfDoc, emprPdfDoc.getPageIndices());
                    emprPages.forEach(p => baseDocBase.addPage(p));
                    temEmprMerged = true;
                }

                const pdfBytesMerged = await baseDocBase.save();"""
new_merge = """                if (bufEmpr && item.paginaEmprestimo) {
                    const bufExtraidaEmpr = await pagamentosMassa.extrairPagina(bufEmpr, item.paginaEmprestimo, false);
                    const emprPdfDoc = await PDFDocument.load(bufExtraidaEmpr);
                    const emprPages = await baseDocBase.copyPages(emprPdfDoc, emprPdfDoc.getPageIndices());
                    emprPages.forEach(p => baseDocBase.addPage(p));
                    temEmprMerged = true;
                }

                let temComMerged = false;
                if (bufCom) {
                    const comPdfDoc = await PDFDocument.load(bufCom);
                    const comPages = await baseDocBase.copyPages(comPdfDoc, comPdfDoc.getPageIndices());
                    comPages.forEach(p => baseDocBase.addPage(p));
                    temComMerged = true;
                }

                const pdfBytesMerged = await baseDocBase.save();"""
c = c.replace(old_merge, new_merge)

# 3.4 Update Database in /enviar (salvarDocumentoNoBanco and UPDATE)
c = c.replace(
    "temEmprestimo: temEmprFlag",
    "temEmprestimo: temEmprFlag,\n                            temComunicacao: temComFlag"
)
c = c.replace(
    "tem_emprestimo = ?",
    "tem_emprestimo = ?, tem_comunicacao = ?"
)
c = c.replace(
    "rowOld.tem_pagamento, temEmprFlag ? 1 : rowOld.tem_emprestimo, ",
    "rowOld.tem_pagamento, temEmprFlag ? 1 : rowOld.tem_emprestimo, temComFlag ? 1 : rowOld.tem_comunicacao, "
)
c = c.replace(
    "rowBase.tem_pagamento, temEmprMerged ? 1 : rowBase.tem_emprestimo,",
    "rowBase.tem_pagamento, temEmprMerged ? 1 : rowBase.tem_emprestimo, temComMerged ? 1 : rowBase.tem_comunicacao,"
)
c = c.replace(
    "temEmprestimo: temEmprMerged",
    "temEmprestimo: temEmprMerged,\n                                temComunicacao: temComMerged"
)
c = c.replace(
    "tem_emprestimo FROM documentos WHERE id = ?",
    "tem_emprestimo, tem_comunicacao FROM documentos WHERE id = ?"
)
c = c.replace(
    "let paginasHoleriteAnteriores = (rowOld.tem_adiantamento ? 1 : 0) + (rowOld.tem_pagamento ? 1 : 0) + (rowOld.tem_emprestimo ? 1 : 0);",
    "let paginasHoleriteAnteriores = (rowOld.tem_adiantamento ? 1 : 0) + (rowOld.tem_pagamento ? 1 : 0) + (rowOld.tem_emprestimo ? 1 : 0) + (rowOld.tem_comunicacao ? rowOld.tem_comunicacao_pages || 1 : 0); // Aproximado para comunicação"
)
c = c.replace(
    "let paginasHoleriteAnteriores = (rowBase.tem_adiantamento ? 1 : 0) + (rowBase.tem_pagamento ? 1 : 0) + (rowBase.tem_emprestimo ? 1 : 0);",
    "let paginasHoleriteAnteriores = (rowBase.tem_adiantamento ? 1 : 0) + (rowBase.tem_pagamento ? 1 : 0) + (rowBase.tem_emprestimo ? 1 : 0) + (rowBase.tem_comunicacao ? rowBase.tem_comunicacao_pages || 1 : 0);"
)

with open('backend/server.js', 'wb') as f:
    f.write(c.encode('utf-8'))
print('backend/server.js updated')
