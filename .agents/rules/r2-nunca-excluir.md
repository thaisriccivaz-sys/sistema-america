---
trigger: always_on
---

# Cloudflare R2 — NUNCA Apagar Arquivos do R2 (Regra Obrigatória)

**Nada nunca deve ser apagado do Cloudflare R2 pelo sistema depois de ser armazenado lá.**
- Ao excluir ou substituir qualquer registro no sistema (cursos, aulas, materiais, anexos, documentos, fotos, certificados, prêmios, etc.), o sistema deve **apenas excluir ou atualizar o registro no banco de dados / tela**, mantendo todos os arquivos intactos no Cloudflare R2.
- **NUNCA** chamar `r2.deleteFromR2(...)` em rotas de exclusão (`DELETE`) ou atualização (`PUT`/`POST`).
