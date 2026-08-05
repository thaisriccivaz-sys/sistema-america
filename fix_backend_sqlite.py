import sys

with open('backend/server.js', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "await pool.query(",
    "await new Promise((resolve, reject) => db.run("
)
content = content.replace(
    "    [id]\n            );",
    "    [id], (err) => err ? reject(err) : resolve()\n            ));"
)

with open('backend/server.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated backend/server.js")
