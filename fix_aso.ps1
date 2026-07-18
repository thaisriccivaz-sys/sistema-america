$file = "c:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\frontend\app.js"
$content = Get-Content $file -Raw
$content = $content -replace "window\.carregarStatusCertificado\('cert-digital-banner-aso'\);", "if (typeof window.carregarStatusCertificado === 'function') { window.carregarStatusCertificado('cert-digital-banner-aso'); }"
Set-Content $file $content
