import sys

with open('backend/server.js', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "UPDATE admissao_assinaturas \n                 SET assinafy_id = NULL, assinafy_status = NULL, assinafy_url = NULL, assinafy_sent_at = NULL, assinafy_signed_at = NULL \n                 WHERE id = ?",
    "UPDATE admissao_assinaturas \n                 SET assinafy_id = NULL, assinafy_status = NULL, assinafy_url = NULL, enviado_em = NULL, assinado_em = NULL \n                 WHERE id = ?"
)

with open('backend/server.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated backend/server.js")
