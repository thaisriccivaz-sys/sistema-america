Set WshShell = CreateObject("WScript.Shell")
' Define a pasta correta do sistema
WshShell.CurrentDirectory = "C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Sistema\Sistema 1\sistema-america"
' Mata processos antigos para não dar erro de porta 3000 em uso
WshShell.Run "taskkill /F /IM node.exe", 0, True
WScript.Sleep 1000
' Inicia o servidor em modo oculto (0) sem esperar finalizar (False)
WshShell.Run "node backend/server.js", 0, False
