'use strict';
// =====================================================================
// CATALOGO UNICO DE MANUTENCAO DA FROTA (22 categorias)
// Fonte unica usada por: criar manutencao, editar manutencao e tela de sinistro.
// Nome do servico = "Item - Servico". item_ref = nome da categoria.
// =====================================================================

const CATEGORIAS = [
    { nome: 'Carroceria, funilaria e pintura', icone: 'paint-brush', tipo: 'Corretiva', servicos: [
        'Adesivo - Aplicação', 'Adesivo - Remoção', 'Adesivo danificado - Substituição',
        'Capô - Pintura', 'Capô - Reparo', 'Capô - Substituição',
        'Para-choque dianteiro - Pintura', 'Para-choque dianteiro - Reparo', 'Para-choque dianteiro - Substituição',
        'Para-choque traseiro - Pintura', 'Para-choque traseiro - Reparo', 'Para-choque traseiro - Substituição',
        'Paralama - Pintura', 'Paralama - Reparo', 'Paralama - Substituição',
        'Porta - Pintura', 'Porta - Reparo', 'Porta - Substituição',
        'Tampa traseira - Pintura', 'Tampa traseira - Reparo', 'Tampa traseira - Substituição',
        'Lataria - Alinhamento', 'Amassado - Reparo', 'Peça de lataria - Substituição', 'Peça - Pintura',
        'Veículo - Pintura geral', 'Pintura - Polimento e retoque', 'Riscos e arranhões - Reparo',
        'Peças plásticas - Recuperação', 'Corrosão da carroceria - Reparo'
    ] },
    { nome: 'Iluminação e sinalização', icone: 'flashlight', tipo: 'Corretiva', servicos: [
        'Faróis - Polimento/restauração', 'Faróis - Regulagem', 'Lâmpada do farol - Substituição', 'Farol - Substituição',
        'Lanterna - Substituição', 'Lâmpada da lanterna - Substituição', 'Seta - Substituição', 'Lâmpada da seta - Substituição',
        'Faróis - Regulagem de altura', 'Luz de freio - Substituição', 'Luz de ré - Substituição', 'Luz de placa - Substituição',
        'Sinalizadores e luzes de emergência - Reparo'
    ] },
    { nome: 'Vidros, portas e retrovisores', icone: 'frame-corners', tipo: 'Corretiva', servicos: [
        'Para-brisa - Reparo de trinca/estrela', 'Para-brisa - Substituição', 'Vidro - Substituição', 'Vidros - Aplicação de película',
        'Máquina de vidro - Reparo', 'Fechadura/maçaneta da porta - Reparo', 'Capa do retrovisor - Substituição',
        'Espelho/lente do retrovisor - Substituição', 'Retrovisor - Substituição', 'Trava elétrica - Reparo',
        'Borrachas de vedação de portas e vidros - Substituição', 'Dobradiças e limitadores de portas - Reparo',
        'Limpador/lavador do para-brisa - Reparo'
    ] },
    { nome: 'Motor e distribuição', icone: 'gear-six', tipo: 'Corretiva', servicos: [
        'Motor - Diagnóstico de falha', 'Motor - Reparo', 'Motor - Substituição', 'Motor - Retífica', 'Junta do motor - Substituição',
        'Velas do motor - Substituição', 'Válvulas do motor - Regulagem', 'Correia dentada - Troca', 'Correia auxiliar - Troca',
        'Tensionador/polia do motor - Substituição', 'Coxins do motor - Substituição', 'Retentores do motor - Substituição',
        'Motor - Teste de compressão'
    ] },
    { nome: 'Arrefecimento', icone: 'thermometer-hot', tipo: 'Corretiva', servicos: [
        "Bomba d'água - Substituição", 'Mangueira de arrefecimento - Substituição', 'Válvula termostática - Substituição',
        'Radiador - Reparo', 'Radiador - Substituição', 'Ventoinha - Substituição', 'Líquido de arrefecimento - Troca',
        'Sistema de arrefecimento - Verificação de vazamentos', 'Sistema de arrefecimento - Limpeza', 'Eletroventilador - Reparo',
        'Reservatório de expansão - Substituição', 'Tampa do reservatório/radiador - Substituição'
    ] },
    { nome: 'Lubrificação e filtros', icone: 'drop', tipo: 'Corretiva', servicos: [
        'Óleo do motor - Troca', 'Filtro de óleo - Troca', 'Filtro de ar do motor - Troca', 'Filtro de cabine/ar-condicionado - Troca',
        'Filtro de combustível - Troca', 'Filtro hidráulico - Troca', 'Óleo - Verificação do nível',
        'Sistema de lubrificação - Verificação de vazamentos', 'Sistema de lubrificação - Limpeza', 'Junta do cárter - Substituição',
        'Cárter - Reparo/substituição', 'Óleo da caixa de transferência - Troca'
    ] },
    { nome: 'Freios', icone: 'hand-palm', tipo: 'Corretiva', servicos: [
        'Cilindro/pinça de freio - Reparo', 'Cabo do freio de mão - Substituição', 'Freios - Regulagem', 'Sistema de freio - Sangria',
        'Disco de freio - Troca', 'Fluido de freio - Troca', 'Lonas de freio - Troca', 'Pastilhas de freio - Troca',
        'Mangueiras de freio - Verificação', 'Cilindro mestre de freio - Substituição', 'Cilindro de roda - Substituição',
        'Flexível de freio - Substituição', 'Servo-freio - Reparo/substituição', 'Sistema ABS - Inspeção', 'Sistema ABS - Diagnóstico',
        'Freio de estacionamento - Reparo', 'Freio pneumático - Regulagem', 'Freios de carreta/reboque - Inspeção'
    ] },
    { nome: 'Pneus e rodas', icone: 'circle-notch', tipo: 'Corretiva', servicos: [
        'Rodas - Alinhamento', 'Rodas - Balanceamento', 'Pneus - Calibragem', 'Pneu - Reparo de furo', 'Rodas - Reparo',
        'Parafusos/porcas de roda - Substituição', 'Rodas - Substituição', 'Pneus - Rodízio', 'Pneus - Troca', 'Pneus de carga - Conserto',
        'Pneus de carga - Recapagem', 'Pneus - Inspeção de desgaste e profundidade dos sulcos', 'Pneus - Inspeção de danos, bolhas e cortes',
        'Válvula do pneu - Verificação de vazamento', 'Válvula do pneu - Substituição'
    ] },
    { nome: 'Suspensão e direção', icone: 'activity', tipo: 'Corretiva', servicos: [
        'Bomba de direção - Reparo', 'Caixa de direção - Reparo', 'Terminal/barra de direção - Substituição', 'Fluido da direção - Troca',
        'Suspensão - Lubrificação', 'Bandeja de suspensão - Substituição', 'Barra estabilizadora/bieleta - Substituição',
        'Mola de suspensão - Substituição', 'Rolamento de roda - Substituição', 'Amortecedores - Troca', 'Buchas de suspensão - Troca',
        'Pivôs de suspensão - Troca', 'Coifa da homocinética - Substituição', 'Coxim de amortecedor - Substituição',
        'Direção hidráulica - Reparo', 'Direção e suspensão - Inspeção de folgas', 'Feixe de molas - Substituição',
        'Barra de torção - Reparo/substituição'
    ] },
    { nome: 'Câmbio, embreagem e transmissão', icone: 'sliders', tipo: 'Corretiva', servicos: [
        'Câmbio - Reparo', 'Retentor do câmbio - Substituição', 'Transmissão - Reparo', 'Junta homocinética - Substituição',
        'Filtro do câmbio - Troca', 'Kit de embreagem - Troca', 'Óleo do câmbio - Troca', 'Óleo do diferencial - Troca',
        'Cilindro mestre/auxiliar da embreagem - Substituição', 'Embreagem - Regulagem', 'Cardã - Reparo', 'Cardã - Balanceamento',
        'Cruzeta do cardã - Substituição', 'Diferencial - Reparo/substituição', 'Trambulador/seletor de marchas - Reparo',
        'Transmissão automática/automatizada - Diagnóstico'
    ] },
    { nome: 'Sistema elétrico e eletrônico', icone: 'lightning', tipo: 'Corretiva', servicos: [
        'Sistema elétrico - Diagnóstico eletrônico', 'Chicote/fiação - Reparo', 'Fusíveis/relés - Substituição', 'Alternador - Substituição',
        'Motor de partida - Substituição', 'Bateria - Teste', 'Bateria - Troca', 'Sistema elétrico - Verificação geral',
        'Sistema de carga - Reparo', 'Sistema de partida - Reparo', 'Módulos eletrônicos - Diagnóstico', 'Sensores/atuadores - Reparo',
        'Sensores - Substituição', 'Painel de instrumentos - Reparo', 'Buzina - Reparo', 'Limpadores elétricos - Reparo',
        'Rastreador/telemetria - Instalação/reparo', 'Câmera/sensor de ré - Reparo', 'Tomadas/conectores elétricos - Reparo'
    ] },
    { nome: 'Ar-condicionado e ventilação', icone: 'snowflake', tipo: 'Corretiva', servicos: [
        'Ar-condicionado - Higienização', 'Gás refrigerante - Recarga', 'Filtro de cabine - Troca', 'Ar-condicionado - Diagnóstico',
        'Compressor do ar-condicionado - Reparo', 'Compressor do ar-condicionado - Substituição',
        'Mangueiras/conexões do ar-condicionado - Reparo', 'Condensador/evaporador - Reparo', 'Ventilador interno - Reparo',
        'Sistema de ar-condicionado - Teste de vazamento'
    ] },
    { nome: 'Sistema de combustível e injeção', icone: 'gas-can', tipo: 'Corretiva', servicos: [
        'Bicos injetores - Limpeza', 'Sistema de injeção eletrônica - Diagnóstico', 'Corpo de borboleta - Limpeza',
        'Bomba de combustível - Substituição', 'Tanque de combustível - Reparo/substituição', 'Tanque de combustível - Limpeza',
        'Mangueiras/tubulações de combustível - Reparo', 'Sensores de injeção - Substituição',
        'Sistema de combustão - Diagnóstico de falha', 'Sistema de combustível - Inspeção de vazamentos'
    ] },
    { nome: 'Sistema hidráulico e pneumático', icone: 'link', tipo: 'Corretiva', servicos: [
        'Sistema hidráulico - Reparo', 'Mangueira hidráulica - Substituição', 'Óleo hidráulico - Troca', 'Filtro hidráulico - Troca',
        'Mangote - Reparo', 'Mangote - Substituição', 'Abraçadeiras/conexões - Substituição', 'Cilindro hidráulico - Reparo',
        'Cilindro hidráulico - Substituição', 'Bomba hidráulica - Reparo', 'Bomba hidráulica - Substituição',
        'Válvula hidráulica - Reparo/substituição', 'Sistema hidráulico - Teste de pressão', 'Sistema pneumático - Reparo',
        'Compressor de ar - Reparo', 'Válvulas/conexões pneumáticas - Reparo', 'Sistemas hidráulico/pneumático - Verificação de vazamentos'
    ] },
    { nome: 'Tanque, bomba de sucção e sistema de vácuo', icone: 'fan', tipo: 'Corretiva', servicos: [
        'Tanque - Limpeza', 'Tanque - Higienização', 'Tanque - Inspeção estrutural', 'Tanque - Reparo', 'Componentes do tanque - Substituição',
        'Bomba de sucção - Lubrificação e revisão', 'Bomba de sucção - Reparo', 'Bomba de sucção - Substituição', 'Bomba de vácuo - Revisão',
        'Motor de sucção - Reparo', 'Motor de sucção - Revisão', 'Filtro do motor de sucção - Troca', 'Óleo do motor de sucção - Troca',
        'Válvula - Reparo', 'Válvula - Substituição', 'Válvulas - Verificação', 'Sistema hidráulico do tanque - Verificação',
        'Tubulação de sucção - Reparo', 'Tubulação de sucção - Desobstrução', 'Tanque - Teste de estanqueidade',
        'Sistema de vácuo - Teste de vácuo e pressão operacional', 'Conexões/bocais de descarga - Reparo', 'Tampa/vedação do tanque - Reparo',
        'Juntas/vedações - Substituição', 'Acionamento da bomba - Reparo', 'Tanque - Inspeção de trincas e corrosão interna',
        'Bomba - Verificação do nível e condição do óleo', 'Bomba - Verificação de ruído e vibração'
    ] },
    { nome: 'Chassi, estrutura e implementos', icone: 'truck', tipo: 'Corretiva', servicos: [
        'Chassi - Alinhamento', 'Chassi - Reparo', 'Chassi - Solda/reforço', 'Estrutura - Reparo', 'Estrutura - Solda/reforço',
        'Estrutura - Inspeção', 'Veículo - Pintura preventiva', 'Chassi/estrutura - Verificação de ferrugem', 'Para-lamas de caminhão - Reparo',
        'Para-barros - Reparo', 'Degraus/estribos - Reparo', 'Suportes/fixações de equipamentos - Reparo', 'Carroceria/baú - Reparo',
        'Plataforma elevatória - Reparo', 'Engate/sistema de acoplamento - Reparo', 'Chassi/estrutura - Tratamento anticorrosivo',
        'Suporte do tanque/bomba - Reparo'
    ] },
    { nome: 'Manutenção preventiva e revisão geral', icone: 'clipboard-text', tipo: 'Inspecao', servicos: [
        'Veículo - Revisão periódica por quilometragem', 'Veículo - Revisão periódica por tempo de uso', 'Veículo - Revisão geral',
        'Componentes - Inspeção preventiva', 'Óleo/filtros - Troca conforme plano de manutenção', 'Veículo - Checklist pré-viagem',
        'Veículo - Checklist pós-viagem', 'Veículo - Inspeção de segurança', 'Veículo - Diagnóstico preventivo por scanner',
        'Fluidos - Verificação de níveis', 'Correias/mangueiras - Verificação', 'Veículo - Verificação de ruídos e vibrações',
        'Veículo - Verificação de vazamentos gerais', 'Manutenção corretiva - Serviço não especificado',
        'Veículo - Reavaliação após manutenção', 'Veículo - Teste de rodagem após reparo'
    ] },
    { nome: 'Inspeções, segurança e documentação', icone: 'shield-check', tipo: 'Inspecao', servicos: [
        'Extintor - Inspeção', 'Extintor - Recarga/substituição', 'Veículo - Inspeção ambiental', 'Veículo - Licenciamento anual',
        'Tacógrafo - Inspeção', 'Tacógrafo - Aferição/ensaio', 'Tacógrafo - Manutenção', 'Veículo - Inspeção de equipamentos obrigatórios',
        'Cintos de segurança - Verificação', 'Triângulo/macaco/chave de roda - Verificação',
        'Cintas/correntes/acessórios de amarração - Inspeção', 'Veículo - Inspeção para requisitos específicos',
        'Veículo - Renovação/regularização documental', 'Veículo - Inspeção de emissões/opacidade'
    ] },
    { nome: 'Adesivagem e identidade visual', icone: 'tag', tipo: 'Corretiva', servicos: [
        'Adesivo - Aplicação', 'Adesivo - Remoção', 'Adesivo danificado - Substituição', 'Comunicação visual - Substituição completa',
        'Adesivo - Reparo de descolamento', 'Resíduos de cola - Remoção'
    ] },
    { nome: 'Limpeza e higienização técnica', icone: 'sparkle', tipo: 'Corretiva', servicos: [
        'Veículo - Lavagem externa', 'Cabine - Limpeza interna', 'Cabine - Higienização interna', 'Ar-condicionado - Higienização',
        'Motor - Limpeza técnica', 'Tanque de combustível - Limpeza', 'Tanque de sucção - Limpeza',
        'Tanque/equipamentos operacionais - Descontaminação externa'
    ] },
    { nome: 'Revisão geral pós-sinistro', icone: 'hammer', tipo: 'Corretiva', servicos: [
        'Veículo - Diagnóstico geral pós-sinistro', 'Veículo - Inspeção de segurança pós-sinistro', 'Veículo - Revisão geral pós-sinistro',
        'Estrutura - Avaliação de danos', 'Motor/transmissão - Avaliação de danos mecânicos', 'Sistema elétrico - Avaliação de danos',
        'Airbags/pré-tensionadores - Verificação', 'Rodas/suspensão - Verificação de alinhamento e geometria após colisão',
        'Veículo - Inspeção final para liberação'
    ] },
    { nome: 'Outros serviços', icone: 'dots-three-circle', tipo: 'Corretiva', servicos: [
        'Serviço diverso - Especificação necessária', 'Veículo - Diagnóstico de falha sem reparo executado',
        'Mão de obra externa especializada - Contratação', 'Acessório - Instalação', 'Acessório - Remoção', 'Veículo - Guincho/remoção',
        'Veículo - Socorro mecânico emergencial', 'Veículo - Avaliação técnica para orçamento'
    ] }
];

// Servicos que ja existiam (nomes antigos) => nome novo. Nada e apagado: o servico antigo e RENOMEADO (mantem id,
// periodicidade e historico) ou, se ja existir equivalente, unido a ele.
const RENOMEIA = {
    // ---- preventivos originais
    'Troca de óleo do motor': 'Óleo do motor - Troca',
    'Troca do filtro de óleo': 'Filtro de óleo - Troca',
    'Troca do filtro de ar': 'Filtro de ar do motor - Troca',
    'Troca do filtro de combustível': 'Filtro de combustível - Troca',
    'Troca do filtro cabine/ar-cond.': 'Filtro de cabine/ar-condicionado - Troca',
    'Troca de correia dentada': 'Correia dentada - Troca',
    'Troca da correia auxiliar': 'Correia auxiliar - Troca',
    'Limpeza de bicos injetores': 'Bicos injetores - Limpeza',
    'Regulagem de válvulas': 'Válvulas do motor - Regulagem',
    'Troca do líquido de arrefecimento': 'Líquido de arrefecimento - Troca',
    'Verificação de vazamentos': 'Sistema de lubrificação - Verificação de vazamentos',
    'Troca de pastilhas de freio': 'Pastilhas de freio - Troca',
    'Troca de lonas': 'Lonas de freio - Troca',
    'Troca de disco de freio': 'Disco de freio - Troca',
    'Sangria do sistema de freio': 'Sistema de freio - Sangria',
    'Troca de fluido de freio': 'Fluido de freio - Troca',
    'Regulagem de freio': 'Freios - Regulagem',
    'Verificação de mangueiras': 'Mangueiras de freio - Verificação',
    'Rodízio de pneus': 'Pneus - Rodízio',
    'Alinhamento': 'Rodas - Alinhamento',
    'Balanceamento': 'Rodas - Balanceamento',
    'Calibragem': 'Pneus - Calibragem',
    'Troca de pneus': 'Pneus - Troca',
    'Troca de amortecedores': 'Amortecedores - Troca',
    'Troca de buchas': 'Buchas de suspensão - Troca',
    'Lubrificação de suspensão': 'Suspensão - Lubrificação',
    'Troca de pivôs': 'Pivôs de suspensão - Troca',
    'Troca de óleo do câmbio': 'Óleo do câmbio - Troca',
    'Troca de filtro do câmbio': 'Filtro do câmbio - Troca',
    'Troca de kit embreagem': 'Kit de embreagem - Troca',
    'Troca de óleo diferencial': 'Óleo do diferencial - Troca',
    'Teste de bateria': 'Bateria - Teste',
    'Troca de bateria': 'Bateria - Troca',
    'Verificação elétrica geral': 'Sistema elétrico - Verificação geral',
    'Higienização do ar-cond.': 'Ar-condicionado - Higienização',
    'Recarga de gás': 'Gás refrigerante - Recarga',
    'Troca de filtro cabine': 'Filtro de cabine - Troca',
    'Troca de óleo hidráulico': 'Óleo hidráulico - Troca',
    'Troca de filtro hidráulico': 'Filtro hidráulico - Troca',
    'Revisão de bomba de sucção': 'Bomba de sucção - Lubrificação e revisão',
    'Limpeza de tanque': 'Tanque - Limpeza',
    'Revisão do motor de sucção': 'Motor de sucção - Revisão',
    'Troca de óleo do motor de sucção': 'Óleo do motor de sucção - Troca',
    'Troca de filtro do motor de sucção': 'Filtro do motor de sucção - Troca',
    'Revisão da bomba de vácuo': 'Bomba de vácuo - Revisão',
    'Higienização do tanque': 'Tanque - Higienização',
    'Verificação de válvulas': 'Válvulas - Verificação',
    'Verificação do sistema hidráulico do tanque': 'Sistema hidráulico do tanque - Verificação',
    'Inspeção estrutural do tanque': 'Tanque - Inspeção estrutural',
    'Inspeção estrutural': 'Estrutura - Inspeção',
    'Pintura preventiva': 'Veículo - Pintura preventiva',
    'Verificação de ferrugem': 'Chassi/estrutura - Verificação de ferrugem',
    'Extintor': 'Extintor - Recarga/substituição',
    'Tacógrafo': 'Tacógrafo - Aferição/ensaio',
    'Licenciamento': 'Veículo - Licenciamento anual',
    'Inspeção ambiental': 'Veículo - Inspeção ambiental',
    // ---- corretivos (lista anterior "Item - Servico")
    'Funilaria (amassados) - Reparo de amassado': 'Amassado - Reparo',
    'Funilaria (amassados) - Alinhamento de lataria': 'Lataria - Alinhamento',
    'Funilaria (amassados) - Substituição de peça de lataria': 'Peça de lataria - Substituição',
    'Adesivo - Aplicação de adesivo': 'Adesivo - Aplicação',
    'Adesivo - Remoção de adesivo': 'Adesivo - Remoção',
    'Adesivo - Substituição de adesivo danificado': 'Adesivo danificado - Substituição',
    'Pintura - Pintura de peça': 'Peça - Pintura',
    'Pintura - Pintura geral': 'Veículo - Pintura geral',
    'Porta - Reparo de fechadura/maçaneta': 'Fechadura/maçaneta da porta - Reparo',
    'Retrovisor - Substituição do retrovisor': 'Retrovisor - Substituição',
    'Retrovisor - Substituição do espelho/lente': 'Espelho/lente do retrovisor - Substituição',
    'Retrovisor - Substituição da capa': 'Capa do retrovisor - Substituição',
    'Faróis - Substituição do farol': 'Farol - Substituição',
    'Faróis - Substituição de lâmpada': 'Lâmpada do farol - Substituição',
    'Faróis - Regulagem do farol': 'Faróis - Regulagem',
    'Lanternas - Substituição da lanterna': 'Lanterna - Substituição',
    'Lanternas - Substituição de lâmpada': 'Lâmpada da lanterna - Substituição',
    'Setas - Substituição da seta': 'Seta - Substituição',
    'Setas - Substituição de lâmpada': 'Lâmpada da seta - Substituição',
    'Para-brisa - Substituição do para-brisa': 'Para-brisa - Substituição',
    'Vidros - Substituição de vidro': 'Vidro - Substituição',
    'Vidros - Reparo do elevador (máquina de vidro)': 'Máquina de vidro - Reparo',
    'Suspensão - Substituição de amortecedor': 'Amortecedores - Troca',
    'Suspensão - Substituição de mola': 'Mola de suspensão - Substituição',
    'Suspensão - Substituição de bucha': 'Buchas de suspensão - Troca',
    'Suspensão - Substituição de pivô': 'Pivôs de suspensão - Troca',
    'Suspensão - Substituição de bandeja': 'Bandeja de suspensão - Substituição',
    'Suspensão - Substituição de barra estabilizadora/bieleta': 'Barra estabilizadora/bieleta - Substituição',
    'Suspensão - Substituição de rolamento de roda': 'Rolamento de roda - Substituição',
    'Direção - Substituição de terminal/barra de direção': 'Terminal/barra de direção - Substituição',
    'Direção - Reparo da caixa de direção': 'Caixa de direção - Reparo',
    'Direção - Reparo da bomba de direção': 'Bomba de direção - Reparo',
    'Direção - Troca de fluido da direção': 'Fluido da direção - Troca',
    'Alinhamento - Alinhamento de direção': 'Rodas - Alinhamento',
    'Balanceamento - Balanceamento de rodas': 'Rodas - Balanceamento',
    'Pneus - Substituição de pneu': 'Pneus - Troca',
    'Pneus - Reparo de pneu (furo)': 'Pneu - Reparo de furo',
    'Pneus - Rodízio de pneus': 'Pneus - Rodízio',
    'Rodas - Reparo de roda': 'Rodas - Reparo',
    'Rodas - Substituição de roda': 'Rodas - Substituição',
    'Rodas - Substituição de parafusos/porcas': 'Parafusos/porcas de roda - Substituição',
    'Freios - Substituição de pastilhas': 'Pastilhas de freio - Troca',
    'Freios - Substituição de lonas': 'Lonas de freio - Troca',
    'Freios - Substituição de discos/tambores': 'Disco de freio - Troca',
    'Freios - Reparo de cilindro/pinça': 'Cilindro/pinça de freio - Reparo',
    'Freios - Sangria do sistema': 'Sistema de freio - Sangria',
    'Freios - Substituição de cabo do freio de mão': 'Cabo do freio de mão - Substituição',
    'Radiador - Substituição do radiador': 'Radiador - Substituição',
    'Radiador - Reparo do radiador': 'Radiador - Reparo',
    'Radiador - Substituição de ventoinha': 'Ventoinha - Substituição',
    'Arrefecimento - Substituição de mangueira': 'Mangueira de arrefecimento - Substituição',
    "Arrefecimento - Substituição da bomba d'água": "Bomba d'água - Substituição",
    'Arrefecimento - Substituição do termostato': 'Válvula termostática - Substituição',
    'Arrefecimento - Troca do líquido de arrefecimento': 'Líquido de arrefecimento - Troca',
    'Motor - Reparo do motor': 'Motor - Reparo',
    'Motor - Substituição de junta': 'Junta do motor - Substituição',
    'Motor - Troca de óleo e filtros': 'Óleo do motor - Troca',
    'Motor - Substituição de velas': 'Velas do motor - Substituição',
    'Câmbio - Reparo do câmbio': 'Câmbio - Reparo',
    'Câmbio - Substituição de retentor': 'Retentor do câmbio - Substituição',
    'Câmbio - Troca de óleo do câmbio': 'Óleo do câmbio - Troca',
    'Transmissão - Reparo da transmissão': 'Transmissão - Reparo',
    'Transmissão - Substituição de embreagem': 'Kit de embreagem - Troca',
    'Transmissão - Substituição de junta homocinética': 'Junta homocinética - Substituição',
    'Sistema elétrico - Reparo de chicote/fiação': 'Chicote/fiação - Reparo',
    'Sistema elétrico - Substituição do motor de partida': 'Motor de partida - Substituição',
    'Sistema elétrico - Substituição do alternador': 'Alternador - Substituição',
    'Sistema elétrico - Substituição de fusíveis/relés': 'Fusíveis/relés - Substituição',
    'Bateria - Substituição de bateria': 'Bateria - Troca',
    'Bateria - Teste/carga de bateria': 'Bateria - Teste',
    'Mangotes - Substituição de mangote': 'Mangote - Substituição',
    'Mangotes - Reparo de mangote': 'Mangote - Reparo',
    'Mangotes - Substituição de abraçadeiras/conexões': 'Abraçadeiras/conexões - Substituição',
    'Sistema hidráulico - Reparo do sistema hidráulico': 'Sistema hidráulico - Reparo',
    'Sistema hidráulico - Substituição de mangueira hidráulica': 'Mangueira hidráulica - Substituição',
    'Sistema hidráulico - Troca de óleo hidráulico': 'Óleo hidráulico - Troca',
    'Tanque - Reparo do tanque': 'Tanque - Reparo',
    'Tanque - Higienização do tanque': 'Tanque - Higienização',
    'Tanque - Substituição de componente do tanque': 'Componentes do tanque - Substituição',
    'Bomba de sucção - Reparo da bomba': 'Bomba de sucção - Reparo',
    'Bomba de sucção - Substituição da bomba': 'Bomba de sucção - Substituição',
    'Motor de sucção - Reparo do motor de sucção': 'Motor de sucção - Reparo',
    'Motor de sucção - Revisão do motor de sucção': 'Motor de sucção - Revisão',
    'Motor de sucção - Troca de óleo e filtro': 'Óleo do motor de sucção - Troca',
    'Válvulas - Reparo de válvula': 'Válvula - Reparo',
    'Válvulas - Substituição de válvula': 'Válvula - Substituição',
    'Estrutura - Reparo estrutural': 'Estrutura - Reparo',
    'Chassi - Reparo do chassi': 'Chassi - Reparo',
    'Chassi - Alinhamento do chassi': 'Chassi - Alinhamento',
    'Revisão geral pós-sinistro - Revisão geral': 'Veículo - Revisão geral pós-sinistro',
    'Revisão geral pós-sinistro - Inspeção de segurança': 'Veículo - Inspeção de segurança pós-sinistro',
    'Revisão geral pós-sinistro - Diagnóstico geral': 'Veículo - Diagnóstico geral pós-sinistro',
    'Outros - Serviço diverso': 'Serviço diverso - Especificação necessária'
};

// Servicos antigos SEM equivalente na lista nova: nao sao apagados, ficam na categoria indicada
const MANTER_EM = {
    'Lubrificação de bomba': 'Tanque, bomba de sucção e sistema de vácuo',
    'Verificação de mangotes': 'Sistema hidráulico e pneumático',
    'Motor - Substituição de correia': 'Motor e distribuição',
    'Tampa traseira - Reparo de fechadura': 'Vidros, portas e retrovisores'
};

// Categoria antiga => categoria nova (para servicos antigos que ficaram sem equivalente)
const CATEGORIA_ANTIGA = {
    'Motor': 'Motor e distribuição',
    'Freios': 'Freios',
    'Pneus e Rodagem': 'Pneus e rodas',
    'Suspensão e Direção': 'Suspensão e direção',
    'Transmissão': 'Câmbio, embreagem e transmissão',
    'Sistema Elétrico': 'Sistema elétrico e eletrônico',
    'Ar Condicionado': 'Ar-condicionado e ventilação',
    'Hidráulica / Operacional': 'Sistema hidráulico e pneumático',
    'Sistema de Sucção': 'Tanque, bomba de sucção e sistema de vácuo',
    'Estrutura / Carroceria': 'Chassi, estrutura e implementos',
    'Segurança e Legalização': 'Inspeções, segurança e documentação',
    'Funilaria': 'Carroceria, funilaria e pintura',
    'Lataria e Estética (Corretiva)': 'Carroceria, funilaria e pintura',
    'Mecânica (Corretiva)': 'Motor e distribuição',
    'Operacional (Corretiva)': 'Sistema hidráulico e pneumático',
    'Outros': 'Outros serviços',
    'Outros (Corretiva)': 'Outros serviços'
};

// Itens antigos da tela de sinistro => categoria nova
const ITEM_SINISTRO = {
    'Funilaria (amassados)': 'Carroceria, funilaria e pintura', 'Pintura': 'Carroceria, funilaria e pintura',
    'Para-choque dianteiro': 'Carroceria, funilaria e pintura', 'Para-choque traseiro': 'Carroceria, funilaria e pintura',
    'Capô': 'Carroceria, funilaria e pintura', 'Porta': 'Carroceria, funilaria e pintura', 'Paralama': 'Carroceria, funilaria e pintura',
    'Tampa traseira': 'Carroceria, funilaria e pintura', 'Adesivo': 'Adesivagem e identidade visual',
    'Faróis': 'Iluminação e sinalização', 'Lanternas': 'Iluminação e sinalização', 'Setas': 'Iluminação e sinalização',
    'Retrovisor': 'Vidros, portas e retrovisores', 'Para-brisa': 'Vidros, portas e retrovisores', 'Vidros': 'Vidros, portas e retrovisores',
    'Suspensão': 'Suspensão e direção', 'Direção': 'Suspensão e direção',
    'Alinhamento': 'Pneus e rodas', 'Balanceamento': 'Pneus e rodas', 'Pneus': 'Pneus e rodas', 'Rodas': 'Pneus e rodas',
    'Freios': 'Freios', 'Radiador': 'Arrefecimento', 'Arrefecimento': 'Arrefecimento', 'Motor': 'Motor e distribuição',
    'Câmbio': 'Câmbio, embreagem e transmissão', 'Transmissão': 'Câmbio, embreagem e transmissão',
    'Sistema elétrico': 'Sistema elétrico e eletrônico', 'Bateria': 'Sistema elétrico e eletrônico',
    'Tanque': 'Tanque, bomba de sucção e sistema de vácuo', 'Bomba de sucção': 'Tanque, bomba de sucção e sistema de vácuo',
    'Motor de sucção': 'Tanque, bomba de sucção e sistema de vácuo', 'Válvulas': 'Tanque, bomba de sucção e sistema de vácuo',
    'Mangotes': 'Sistema hidráulico e pneumático', 'Sistema hidráulico': 'Sistema hidráulico e pneumático',
    'Estrutura': 'Chassi, estrutura e implementos', 'Chassi': 'Chassi, estrutura e implementos',
    'Revisão geral pós-sinistro': 'Revisão geral pós-sinistro'
};

function norm(t) {
    return String(t == null ? '' : t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}
function normMap(obj) { const o = {}; Object.keys(obj).forEach(k => { o[norm(k)] = obj[k]; }); return o; }
const RENOMEIA_N = normMap(RENOMEIA), MANTER_EM_N = normMap(MANTER_EM), CATEGORIA_ANTIGA_N = normMap(CATEGORIA_ANTIGA), ITEM_SINISTRO_N = normMap(ITEM_SINISTRO);

// ---------- itens "solicitados" do sinistro ----------
// O texto guarda os itens separados por ", " e varias categorias tem virgula no nome (ex.: "Carroceria, funilaria e pintura"),
// por isso o separador so vale fora dos nomes de categoria conhecidos. "Outros: texto livre" e sempre o ultimo.
const NOMES_CATEGORIA = CATEGORIAS.map(c => c.nome).sort((a, b) => b.length - a.length);
function splitSolicitados(texto) {
    const t = String(texto || '').trim();
    if (!t) return [];
    let base = t, outros = '';
    const idx = t.indexOf('Outros:');
    if (idx !== -1) { base = t.substring(0, idx).replace(/[,\s]+$/, ''); outros = t.substring(idx).trim(); }
    const itens = [];
    let i = 0;
    while (i < base.length) {
        while (i < base.length && (base[i] === ',' || base[i] === ' ')) i++;
        if (i >= base.length) break;
        let achou = null;
        for (const n of NOMES_CATEGORIA) {
            if (base.startsWith(n, i)) {
                const f = i + n.length;
                if (f === base.length || base[f] === ',') { achou = n; break; }
            }
        }
        if (achou) { itens.push(achou); i += achou.length; continue; }
        let j = base.indexOf(', ', i);
        if (j === -1) j = base.length;
        const tok = base.substring(i, j).trim();
        if (tok) itens.push(tok);
        i = j;
    }
    if (outros) itens.push(outros);
    return itens;
}
function itemParaCategoria(nome) { return ITEM_SINISTRO_N[norm(nome)] || nome; }
function converterItens(lista) {
    const vistos = {}, saida = [];
    lista.forEach(n => { const c = itemParaCategoria(n); const k = norm(c); if (!vistos[k]) { vistos[k] = 1; saida.push(c); } });
    return saida;
}

// ---------- migracao do catalogo (idempotente) ----------
async function organizar(h) {
    const { all, get, run } = h;
    const resumo = { renomeados: 0, unidos: 0, criados: 0, categoriasNovas: 0, mantidos: 0, solicitadosConvertidos: 0 };

    // 1) as 22 categorias (reaproveita a existente quando o nome ja bate: ex. "Freios")
    const existentes = await all('SELECT id, nome FROM frota_categorias_manutencao');
    const catId = {};
    for (let idx = 0; idx < CATEGORIAS.length; idx++) {
        const c = CATEGORIAS[idx];
        const achada = existentes.find(e => norm(e.nome) === norm(c.nome));
        if (achada) {
            await run('UPDATE frota_categorias_manutencao SET nome = ?, icone = ?, ordem = ?, ativo = 1 WHERE id = ?', [c.nome, c.icone, idx + 1, achada.id]);
            catId[c.nome] = achada.id;
        } else {
            const r = await run('INSERT INTO frota_categorias_manutencao(nome,icone,ordem) VALUES(?,?,?)', [c.nome, c.icone, idx + 1]);
            catId[c.nome] = r.lastID;
            resumo.categoriasNovas++;
        }
    }

    // 2) indice dos servicos novos (o mesmo nome pode existir em mais de uma categoria, ex.: "Adesivo - Aplicação")
    const porNome = {};            // nome normalizado => lista de ocorrencias
    CATEGORIAS.forEach((c, idx) => c.servicos.forEach(nome => { const k = norm(nome); (porNome[k] = porNome[k] || []).push({ cat: c, idx, nome }); }));
    // escolhe a ocorrencia: 1) categoria onde o servico ja esta; 2) categoria equivalente a antiga; 3) a primeira
    const escolher = (lista, catAtual) => {
        if (!lista) return null;
        return lista.find(e => norm(e.cat.nome) === norm(catAtual))
            || lista.find(e => CATEGORIA_ANTIGA_N[norm(catAtual)] && norm(e.cat.nome) === norm(CATEGORIA_ANTIGA_N[norm(catAtual)]))
            || lista[0];
    };
    const canon = {};               // "idxCategoria|nome normalizado" => servico que vale
    const catPorId = {};
    (await all('SELECT id, nome FROM frota_categorias_manutencao')).forEach(c => { catPorId[c.id] = c.nome; });

    // 3) renomeia / une / move os servicos que ja existem (nenhum e apagado sem equivalente)
    const servicos = await all('SELECT id, nome, categoria_id, item_ref FROM frota_servicos_catalogo WHERE ativo = 1 ORDER BY id');
    for (const s of servicos) {
        const k = norm(s.nome);
        const novoNome = RENOMEIA_N[k] || (porNome[k] ? porNome[k][0].nome : null);
        const entry = novoNome ? escolher(porNome[norm(novoNome)], catPorId[s.categoria_id]) : null;
        if (entry) {
            const chave = entry.idx + '|' + norm(entry.nome);
            if (!canon[chave]) {
                canon[chave] = { id: s.id, nome: entry.nome };
                if (s.nome !== entry.nome || s.categoria_id !== catId[entry.cat.nome] || s.item_ref !== entry.cat.nome) {
                    await run('UPDATE frota_servicos_catalogo SET nome = ?, categoria_id = ?, item_ref = ? WHERE id = ?', [entry.nome, catId[entry.cat.nome], entry.cat.nome, s.id]);
                    if (s.nome !== entry.nome) {
                        await run('UPDATE frota_manutencao_servicos SET nome = ? WHERE catalogo_id = ? AND nome = ?', [entry.nome, s.id, s.nome]);
                        await run("UPDATE frota_manutencoes SET servico_catalogo_id = ? WHERE servico_catalogo_id IS NULL AND descricao = ? AND tipo = 'preventiva'", [s.id, s.nome]);
                        await run('UPDATE frota_manutencoes SET descricao = ? WHERE servico_catalogo_id = ? AND descricao = ?', [entry.nome, s.id, s.nome]);
                    }
                    resumo.renomeados++;
                }
            } else {
                const keep = canon[chave];
                await run('UPDATE frota_manutencao_servicos SET catalogo_id = ?, nome = ? WHERE catalogo_id = ?', [keep.id, keep.nome, s.id]);
                await run("UPDATE frota_manutencoes SET servico_catalogo_id = ? WHERE servico_catalogo_id IS NULL AND descricao = ? AND tipo = 'preventiva'", [s.id, s.nome]);
                await run('UPDATE frota_manutencoes SET servico_catalogo_id = ? WHERE servico_catalogo_id = ?', [keep.id, s.id]);
                await run('UPDATE frota_manutencoes SET descricao = ? WHERE servico_catalogo_id = ? AND descricao = ?', [keep.nome, keep.id, s.nome]);
                await run('DELETE FROM frota_servicos_catalogo WHERE id = ?', [s.id]);
                resumo.unidos++;
            }
            continue;
        }
        // sem equivalente: continua existindo, so muda de categoria
        const catNova = MANTER_EM_N[k] || CATEGORIA_ANTIGA_N[norm(catPorId[s.categoria_id])];
        if (catNova && catId[catNova] && (s.categoria_id !== catId[catNova] || s.item_ref !== catNova)) {
            await run('UPDATE frota_servicos_catalogo SET categoria_id = ?, item_ref = ? WHERE id = ?', [catId[catNova], catNova, s.id]);
            resumo.mantidos++;
        }
    }

    // 4) cria o que ainda nao existe
    for (let idx = 0; idx < CATEGORIAS.length; idx++) {
        const c = CATEGORIAS[idx];
        for (const nome of c.servicos) {
            if (canon[idx + '|' + norm(nome)]) continue;
            const r = await run("INSERT INTO frota_servicos_catalogo(categoria_id,nome,tipo_controle,periodicidade_padrao,unidade,criticidade,tempo_medio_horas,exige_parada,obrigatorio,impede_operacao,padrao,item_ref) SELECT ?,?,?,0,'km','Media',NULL,0,0,0,0,? WHERE NOT EXISTS (SELECT 1 FROM frota_servicos_catalogo WHERE categoria_id = ? AND nome = ?)",
                [catId[c.nome], nome, c.tipo, c.nome, catId[c.nome], nome]);
            if (r.changes) resumo.criados++;
        }
    }

    // 5) categorias antigas que ficaram vazias saem da lista
    const nomesNovos = CATEGORIAS.map(c => norm(c.nome));
    for (const c of await all('SELECT id, nome FROM frota_categorias_manutencao WHERE ativo = 1')) {
        if (nomesNovos.indexOf(norm(c.nome)) !== -1) continue;
        if (CATEGORIA_ANTIGA_N[norm(c.nome)] === undefined) continue; // categoria criada pelo usuario: nao mexe
        const n = await get('SELECT COUNT(*) AS n FROM frota_servicos_catalogo WHERE categoria_id = ?', [c.id]);
        if (!n || !n.n) await run('UPDATE frota_categorias_manutencao SET ativo = 0 WHERE id = ?', [c.id]);
    }

    // 6) itens "solicitados" gravados com os nomes antigos passam para as categorias novas
    try {
        const grupos = await all("SELECT DISTINCT manutencao_id FROM frota_manutencao_servicos WHERE tipo = 'solicitado'");
        for (const g of grupos) {
            const linhas = await all("SELECT id, nome FROM frota_manutencao_servicos WHERE manutencao_id = ? AND tipo = 'solicitado' ORDER BY id", [g.manutencao_id]);
            const antes = linhas.map(l => l.nome);
            const depois = converterItens(antes);
            if (JSON.stringify(antes) === JSON.stringify(depois)) continue;
            await run("DELETE FROM frota_manutencao_servicos WHERE manutencao_id = ? AND tipo = 'solicitado'", [g.manutencao_id]);
            for (const nome of depois) await run("INSERT INTO frota_manutencao_servicos (manutencao_id, tipo, nome) VALUES (?, 'solicitado', ?)", [g.manutencao_id, nome]);
            resumo.solicitadosConvertidos++;
        }
        const sins = await all("SELECT id, manutencao_item, manutencao_obs FROM sinistros WHERE manutencao_item IS NOT NULL AND TRIM(manutencao_item) <> ''");
        for (const s of sins) {
            const antes = splitSolicitados(s.manutencao_item);
            const depois = converterItens(antes);
            if (JSON.stringify(antes) === JSON.stringify(depois)) continue;
            const texto = depois.join(', ');
            await run('UPDATE sinistros SET manutencao_item = ? WHERE id = ?', [texto, s.id]);
            const desc = 'Sinistro #' + s.id + ' - ' + texto + (s.manutencao_obs ? ': ' + s.manutencao_obs : '');
            await run("UPDATE frota_manutencoes SET descricao = ? WHERE sinistro_id = ? AND descricao LIKE ?", [desc, s.id, 'Sinistro #' + s.id + ' - %']);
        }
    } catch (e) { console.error('[CATALOGO] conversao dos itens solicitados:', e.message); }

    return resumo;
}

module.exports = { CATEGORIAS, RENOMEIA, MANTER_EM, CATEGORIA_ANTIGA, ITEM_SINISTRO, norm, splitSolicitados, converterItens, organizar };
