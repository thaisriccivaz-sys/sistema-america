const fs = require('fs');
let code = fs.readFileSync('frontend/end-produto.js', 'utf8');

// Fix salvarEndProduto to clear cache and update table
const oldSalvar = `        Swal.fire({ icon: 'success', title: 'Endereço atualizado!', timer: 1400, showConfirmButton: false });
        window.renderEndProdutoTable();
    } catch(e) { Swal.fire('Erro', e.message, 'error'); }
};`;

const newSalvar = `        Swal.fire({ icon: 'success', title: 'Endereço atualizado!', timer: 1400, showConfirmButton: false });
        window._estoqueEnderecos = []; // clear cache
        if (typeof window.renderEstoqueTable === 'function') window.renderEstoqueTable();
        window.renderEndProdutoTable();
    } catch(e) { Swal.fire('Erro', e.message, 'error'); }
};`;

code = code.replace(oldSalvar, newSalvar);

// Fix excluirEndProduto to clear cache and update table
const oldExcluir = `        if (!r.ok) { const e = await r.json(); throw new Error(e.error || 'Erro'); }
        window.renderEndProdutoTable();
    } catch(e) { Swal.fire('Erro', e.message, 'error'); }
};`;

const newExcluir = `        if (!r.ok) { const e = await r.json(); throw new Error(e.error || 'Erro'); }
        window._estoqueEnderecos = []; // clear cache
        if (typeof window.renderEstoqueTable === 'function') window.renderEstoqueTable();
        window.renderEndProdutoTable();
    } catch(e) { Swal.fire('Erro', e.message, 'error'); }
};`;

code = code.replace(oldExcluir, newExcluir);

fs.writeFileSync('frontend/end-produto.js', code, 'utf8');
console.log('end-produto.js fixed!');
