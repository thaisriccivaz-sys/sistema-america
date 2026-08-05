import sys

def hide_delete_button(filename):
    with open(filename, 'r', encoding='latin-1') as f:
        content = f.read()

    # Find the exclude button and add display:none
    # The button starts with <button onclick="window.excluirAssinatura
    # We want to replace style="background:#ef4444; with style="display:none; background:#ef4444;
    content = content.replace(
        """<button onclick="window.excluirAssinatura(${d.id}, '${d.source}', this)" style="background:#ef4444;""",
        """<button onclick="window.excluirAssinatura(${d.id}, '${d.source}', this)" style="display:none; background:#ef4444;"""
    )
    
    with open(filename, 'w', encoding='latin-1') as f:
        f.write(content)

hide_delete_button('frontend/app.js')
hide_delete_button('frontend/app_homologacao.js')
print("Hide delete button applied")
