-- Migração para adicionar a coluna motivo_reprovacao à tabela propostas
ALTER TABLE propostas ADD COLUMN motivo_reprovacao TEXT;
