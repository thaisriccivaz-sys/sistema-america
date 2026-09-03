with open('frontend/app.js', 'rb') as f:
    c = f.read().decode('utf-8')

# Find the end of the pm-file-emprestimo div
idx = c.find('id="pm-file-emprestimo"')
if idx != -1:
    end_idx = c.find('</div>', idx) + 6
    
    new_div = """

                <div style="margin-bottom:1.5rem;padding:0.75rem;background:#f8fafc;border:1px solid #cbd5e1;border-radius:8px;">
                  <label style="font-size:0.8rem;font-weight:600;color:#334155;display:block;margin-bottom:4px;">
                    \uD83D\uDCE4 Comunica\u00e7\u00e3o (PDF \u00danico)
                    <span style="font-weight:400;color:#64748b;font-size:0.75rem;"> \u2014 opcional, enviado igual para todos, anexado no final</span>
                  </label>
                  <input id="pm-file-comunicacao" type="file" accept=".pdf" style="width:100%;padding:0.5rem;border:1px solid #cbd5e1;border-radius:6px;background:#fff;">
                </div>"""
    
    # Inject it if not already there
    if 'id="pm-file-comunicacao"' not in c:
        c = c[:end_idx] + new_div + c[end_idx:]
        with open('frontend/app.js', 'wb') as f:
            f.write(c.encode('utf-8'))
        print("Input inserido com sucesso!")
    else:
        print("Input já existia.")
else:
    print("pm-file-emprestimo não encontrado.")
