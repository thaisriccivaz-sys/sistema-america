'use strict';
// =====================================================================
// CATALOGO UNICO DE MANUTENCAO DA FROTA (4 categorias -> 39 subcategorias -> 353 servicos)
// Fonte unica usada por: criar manutencao, editar manutencao e tela de sinistro.
// =====================================================================

const GRUPOS = [
    {
        "grupo": "FUNILARIA, LATARIA E ESTÉTICA",
        "icone": "paint-brush",
        "subcategorias": [
            {
                "nome": "Funilaria (amassados)",
                "icone": "hammer",
                "servicos": [
                    "Lataria - Alinhamento",
                    "Lataria - Reparo de amassado",
                    "Peça de lataria - Reparo",
                    "Peça de lataria - Substituição",
                    "Riscos e arranhões - Reparo",
                    "Lataria - Reparo de corrosão"
                ]
            },
            {
                "nome": "Adesivo",
                "icone": "tag",
                "servicos": [
                    "Adesivo - Aplicação",
                    "Adesivo - Remoção",
                    "Adesivo - Substituição",
                    "Adesivo - Reparo de descolamento",
                    "Resíduos de cola - Remoção"
                ]
            },
            {
                "nome": "Pintura",
                "icone": "paint-brush",
                "servicos": [
                    "Peça - Pintura",
                    "Veículo - Pintura geral",
                    "Pintura - Polimento",
                    "Pintura - Retoque",
                    "Pintura - Recuperação de riscos",
                    "Pintura - Tratamento anticorrosivo"
                ]
            },
            {
                "nome": "Para-choque dianteiro",
                "icone": "shield",
                "servicos": [
                    "Para-choque dianteiro - Reparo",
                    "Para-choque dianteiro - Pintura",
                    "Para-choque dianteiro - Substituição",
                    "Para-choque dianteiro - Alinhamento",
                    "Fixação do para-choque dianteiro - Reparo"
                ]
            },
            {
                "nome": "Para-choque traseiro",
                "icone": "shield-check",
                "servicos": [
                    "Para-choque traseiro - Reparo",
                    "Para-choque traseiro - Pintura",
                    "Para-choque traseiro - Substituição",
                    "Para-choque traseiro - Alinhamento",
                    "Fixação do para-choque traseiro - Reparo"
                ]
            },
            {
                "nome": "Capô",
                "icone": "arrow-up-right",
                "servicos": [
                    "Capô - Reparo",
                    "Capô - Pintura",
                    "Capô - Substituição",
                    "Dobradiças do capô - Reparo",
                    "Fechadura do capô - Reparo",
                    "Cabo de abertura do capô - Substituição"
                ]
            },
            {
                "nome": "Porta",
                "icone": "door",
                "servicos": [
                    "Porta - Reparo",
                    "Porta - Pintura",
                    "Porta - Substituição",
                    "Fechadura da porta - Reparo",
                    "Maçaneta da porta - Substituição",
                    "Dobradiças da porta - Reparo",
                    "Limitador da porta - Substituição",
                    "Borracha de vedação da porta - Substituição"
                ]
            },
            {
                "nome": "Paralama",
                "icone": "arrows-horizontal",
                "servicos": [
                    "Paralama - Reparo",
                    "Paralama - Pintura",
                    "Paralama - Substituição",
                    "Parabarro - Reparo",
                    "Parabarro - Substituição",
                    "Fixação do paralama - Reparo"
                ]
            },
            {
                "nome": "Tampa traseira",
                "icone": "arrow-down-left",
                "servicos": [
                    "Tampa traseira - Reparo",
                    "Tampa traseira - Pintura",
                    "Tampa traseira - Substituição",
                    "Fechadura da tampa traseira - Reparo",
                    "Maçaneta da tampa traseira - Substituição",
                    "Dobradiças da tampa traseira - Reparo",
                    "Amortecedor da tampa traseira - Substituição"
                ]
            },
            {
                "nome": "Retrovisor",
                "icone": "eye",
                "servicos": [
                    "Retrovisor - Reparo",
                    "Retrovisor - Substituição",
                    "Espelho do retrovisor - Substituição",
                    "Capa do retrovisor - Substituição",
                    "Retrovisor elétrico - Reparo",
                    "Motor de regulagem do retrovisor - Substituição"
                ]
            },
            {
                "nome": "Faróis",
                "icone": "flashlight",
                "servicos": [
                    "Farol - Substituição",
                    "Lâmpada do farol - Substituição",
                    "Farol - Polimento/restauração",
                    "Farol - Regulagem",
                    "Farol - Reparo de fixação",
                    "Farol - Reparo elétrico"
                ]
            },
            {
                "nome": "Lanternas",
                "icone": "lamp",
                "servicos": [
                    "Lanterna - Substituição",
                    "Lâmpada da lanterna - Substituição",
                    "Lanterna - Reparo",
                    "Lanterna - Reparo de fixação",
                    "Lanterna - Reparo elétrico"
                ]
            },
            {
                "nome": "Setas",
                "icone": "arrows-left-right",
                "servicos": [
                    "Seta - Substituição",
                    "Lâmpada da seta - Substituição",
                    "Seta - Reparo",
                    "Relé da seta - Substituição",
                    "Comando de seta - Reparo/substituição"
                ]
            },
            {
                "nome": "Para-brisa",
                "icone": "square-half",
                "servicos": [
                    "Para-brisa - Reparo de trinca/estrela",
                    "Para-brisa - Substituição",
                    "Para-brisa - Reparo de vedação",
                    "Borracha do para-brisa - Substituição",
                    "Limpador do para-brisa - Reparo",
                    "Palheta do limpador - Substituição"
                ]
            },
            {
                "nome": "Vidros",
                "icone": "frame-corners",
                "servicos": [
                    "Vidro lateral - Substituição",
                    "Vidro traseiro - Substituição",
                    "Vidros - Aplicação de película",
                    "Máquina de vidro - Reparo",
                    "Motor do vidro elétrico - Substituição",
                    "Interruptor do vidro elétrico - Substituição",
                    "Canaleta do vidro - Substituição",
                    "Vidro - Reparo de vedação"
                ]
            }
        ]
    },
    {
        "grupo": "MECÂNICA",
        "icone": "wrench",
        "subcategorias": [
            {
                "nome": "Suspensão",
                "icone": "activity",
                "servicos": [
                    "Amortecedor - Substituição",
                    "Mola de suspensão - Substituição",
                    "Bandeja de suspensão - Substituição",
                    "Bieleta - Substituição",
                    "Barra estabilizadora - Reparo/substituição",
                    "Bucha de suspensão - Substituição",
                    "Pivô de suspensão - Substituição",
                    "Coxim de amortecedor - Substituição",
                    "Rolamento de roda - Substituição",
                    "Feixe de molas - Reparo/substituição",
                    "Suspensão - Inspeção de folgas",
                    "Suspensão - Diagnóstico de ruídos"
                ]
            },
            {
                "nome": "Direção",
                "icone": "compass",
                "servicos": [
                    "Caixa de direção - Reparo",
                    "Caixa de direção - Substituição",
                    "Bomba de direção - Reparo",
                    "Bomba de direção - Substituição",
                    "Terminal de direção - Substituição",
                    "Barra de direção - Substituição",
                    "Fluido da direção - Troca",
                    "Coifa da direção - Substituição",
                    "Direção - Regulagem",
                    "Direção - Diagnóstico de folgas/ruídos"
                ]
            },
            {
                "nome": "Alinhamento",
                "icone": "ruler",
                "servicos": [
                    "Rodas - Alinhamento",
                    "Direção - Alinhamento",
                    "Geometria da suspensão - Verificação",
                    "Cambagem - Regulagem",
                    "Caster - Regulagem"
                ]
            },
            {
                "nome": "Balanceamento",
                "icone": "scales",
                "servicos": [
                    "Rodas - Balanceamento",
                    "Rodas - Balanceamento de conjunto",
                    "Rodas - Verificação de vibração"
                ]
            },
            {
                "nome": "Pneus",
                "icone": "circle-notch",
                "servicos": [
                    "Pneu - Troca",
                    "Pneu - Reparo de furo",
                    "Pneus - Rodízio",
                    "Pneus - Calibragem",
                    "Pneu - Substituição por desgaste",
                    "Pneu - Inspeção de danos",
                    "Pneus - Inspeção de profundidade dos sulcos",
                    "Válvula do pneu - Substituição",
                    "Pneu - Recapagem",
                    "Pneu - Verificação de pressão"
                ]
            },
            {
                "nome": "Rodas",
                "icone": "disc",
                "servicos": [
                    "Roda - Reparo",
                    "Roda - Substituição",
                    "Parafusos de roda - Substituição",
                    "Porcas de roda - Substituição",
                    "Cubo de roda - Reparo",
                    "Cubo de roda - Substituição",
                    "Rolamento de roda - Substituição",
                    "Roda - Inspeção de danos"
                ]
            },
            {
                "nome": "Freios",
                "icone": "hand-palm",
                "servicos": [
                    "Pastilhas de freio - Troca",
                    "Disco de freio - Troca",
                    "Lonas de freio - Troca",
                    "Tambor de freio - Reparo/substituição",
                    "Fluido de freio - Troca",
                    "Sistema de freio - Sangria",
                    "Pinça de freio - Reparo",
                    "Cilindro mestre de freio - Substituição",
                    "Cilindro de roda - Substituição",
                    "Flexível de freio - Substituição",
                    "Cabo do freio de mão - Substituição",
                    "Freio de estacionamento - Regulagem/reparo",
                    "Servo-freio - Reparo/substituição",
                    "Sistema ABS - Diagnóstico",
                    "Sistema ABS - Reparo",
                    "Sistema de freio - Inspeção"
                ]
            },
            {
                "nome": "Radiador",
                "icone": "thermometer-hot",
                "servicos": [
                    "Radiador - Reparo",
                    "Radiador - Substituição",
                    "Tampa do radiador - Substituição",
                    "Reservatório de expansão - Substituição",
                    "Radiador - Limpeza",
                    "Radiador - Teste de estanqueidade",
                    "Condensador - Reparo/substituição"
                ]
            },
            {
                "nome": "Arrefecimento",
                "icone": "snowflake",
                "servicos": [
                    "Bomba d'água - Substituição",
                    "Válvula termostática - Substituição",
                    "Mangueira de arrefecimento - Substituição",
                    "Ventoinha - Substituição",
                    "Eletroventilador - Reparo",
                    "Líquido de arrefecimento - Troca",
                    "Sistema de arrefecimento - Limpeza",
                    "Sistema de arrefecimento - Verificação de vazamentos",
                    "Sensor de temperatura - Substituição",
                    "Correia da bomba d'água - Substituição"
                ]
            },
            {
                "nome": "Motor",
                "icone": "gear-six",
                "servicos": [
                    "Motor - Diagnóstico",
                    "Motor - Reparo",
                    "Motor - Substituição",
                    "Motor - Retífica",
                    "Junta do cabeçote - Substituição",
                    "Junta do cárter - Substituição",
                    "Correia dentada - Troca",
                    "Correia auxiliar - Troca",
                    "Tensionador da correia - Substituição",
                    "Velas de ignição - Substituição",
                    "Válvulas do motor - Regulagem",
                    "Coxins do motor - Substituição",
                    "Retentores do motor - Substituição",
                    "Cárter - Reparo/substituição",
                    "Motor - Teste de compressão",
                    "Motor - Verificação de vazamentos",
                    "Óleo do motor - Troca",
                    "Filtro de óleo - Troca",
                    "Filtro de ar do motor - Troca",
                    "Filtro de combustível - Troca",
                    "Bicos injetores - Limpeza"
                ]
            },
            {
                "nome": "Câmbio",
                "icone": "sliders",
                "servicos": [
                    "Câmbio - Diagnóstico",
                    "Câmbio - Reparo",
                    "Câmbio - Substituição",
                    "Óleo do câmbio - Troca",
                    "Filtro do câmbio - Troca",
                    "Retentor do câmbio - Substituição",
                    "Trambulador - Reparo",
                    "Seletor de marchas - Reparo",
                    "Câmbio - Verificação de vazamentos"
                ]
            },
            {
                "nome": "Transmissão",
                "icone": "shuffle",
                "servicos": [
                    "Kit de embreagem - Troca",
                    "Cilindro mestre da embreagem - Substituição",
                    "Cilindro auxiliar da embreagem - Substituição",
                    "Junta homocinética - Substituição",
                    "Coifa da homocinética - Substituição",
                    "Cardã - Reparo",
                    "Cardã - Balanceamento",
                    "Cruzeta do cardã - Substituição",
                    "Diferencial - Reparo",
                    "Diferencial - Substituição",
                    "Óleo do diferencial - Troca",
                    "Transmissão - Diagnóstico",
                    "Transmissão - Reparo",
                    "Transmissão - Verificação de vazamentos"
                ]
            },
            {
                "nome": "Sistema elétrico",
                "icone": "lightning",
                "servicos": [
                    "Sistema elétrico - Diagnóstico",
                    "Chicote elétrico - Reparo",
                    "Fiação elétrica - Reparo",
                    "Fusível - Substituição",
                    "Relé - Substituição",
                    "Alternador - Substituição",
                    "Motor de partida - Substituição",
                    "Sensor elétrico/eletrônico - Substituição",
                    "Módulo eletrônico - Diagnóstico",
                    "Módulo eletrônico - Reparo",
                    "Painel de instrumentos - Reparo",
                    "Buzina - Reparo",
                    "Limpador elétrico - Reparo",
                    "Rastreador - Instalação/reparo",
                    "Sistema elétrico - Verificação geral"
                ]
            },
            {
                "nome": "Bateria",
                "icone": "battery-charging",
                "servicos": [
                    "Bateria - Teste",
                    "Bateria - Troca",
                    "Bateria - Recarga",
                    "Bateria - Reparo de terminais",
                    "Terminal da bateria - Substituição",
                    "Cabo da bateria - Substituição",
                    "Sistema de carga - Teste",
                    "Alternador - Teste",
                    "Bateria - Verificação de fixação"
                ]
            }
        ]
    },
    {
        "grupo": "OPERACIONAL",
        "icone": "gear-six",
        "subcategorias": [
            {
                "nome": "Tanque",
                "icone": "gas-can",
                "servicos": [
                    "Tanque - Limpeza",
                    "Tanque - Higienização",
                    "Tanque - Reparo",
                    "Tanque - Inspeção estrutural",
                    "Tanque - Teste de estanqueidade",
                    "Tanque - Inspeção de corrosão",
                    "Tanque - Inspeção de trincas",
                    "Tampa do tanque - Reparo",
                    "Tampa do tanque - Substituição",
                    "Vedação do tanque - Substituição",
                    "Suporte do tanque - Reparo",
                    "Componentes do tanque - Substituição"
                ]
            },
            {
                "nome": "Bomba de sucção",
                "icone": "fan",
                "servicos": [
                    "Bomba de sucção - Revisão",
                    "Bomba de sucção - Reparo",
                    "Bomba de sucção - Substituição",
                    "Bomba de sucção - Lubrificação",
                    "Bomba de sucção - Teste de funcionamento",
                    "Bomba de sucção - Teste de vácuo",
                    "Bomba de sucção - Verificação de ruído/vibração",
                    "Bomba de sucção - Verificação de vazamentos",
                    "Bomba de sucção - Verificação do nível de óleo",
                    "Bomba de sucção - Substituição de componentes"
                ]
            },
            {
                "nome": "Motor de sucção",
                "icone": "power",
                "servicos": [
                    "Motor de sucção - Revisão",
                    "Motor de sucção - Reparo",
                    "Motor de sucção - Substituição",
                    "Motor de sucção - Troca de óleo",
                    "Filtro do motor de sucção - Troca",
                    "Motor de sucção - Diagnóstico",
                    "Motor de sucção - Teste de funcionamento",
                    "Motor de sucção - Verificação de ruído/vibração",
                    "Motor de sucção - Verificação de vazamentos",
                    "Acionamento do motor de sucção - Reparo"
                ]
            },
            {
                "nome": "Mangotes",
                "icone": "link",
                "servicos": [
                    "Mangote - Reparo",
                    "Mangote - Substituição",
                    "Abraçadeira do mangote - Substituição",
                    "Conexão do mangote - Substituição",
                    "Mangote - Desobstrução",
                    "Mangote - Inspeção de desgaste",
                    "Mangote - Verificação de vazamentos",
                    "Vedação do mangote - Substituição"
                ]
            },
            {
                "nome": "Válvulas",
                "icone": "funnel",
                "servicos": [
                    "Válvula - Reparo",
                    "Válvula - Substituição",
                    "Válvula - Inspeção",
                    "Válvula - Limpeza",
                    "Válvula - Desobstrução",
                    "Válvula - Teste de funcionamento",
                    "Válvula - Verificação de vedação",
                    "Acionamento da válvula - Reparo",
                    "Vedação da válvula - Substituição"
                ]
            },
            {
                "nome": "Sistema hidráulico",
                "icone": "drop",
                "servicos": [
                    "Sistema hidráulico - Revisão",
                    "Sistema hidráulico - Reparo",
                    "Sistema hidráulico - Diagnóstico",
                    "Sistema hidráulico - Teste de pressão",
                    "Sistema hidráulico - Verificação de vazamentos",
                    "Óleo hidráulico - Troca",
                    "Filtro hidráulico - Troca",
                    "Mangueira hidráulica - Substituição",
                    "Bomba hidráulica - Reparo",
                    "Bomba hidráulica - Substituição",
                    "Cilindro hidráulico - Reparo",
                    "Cilindro hidráulico - Substituição",
                    "Válvula hidráulica - Reparo/substituição",
                    "Conexão hidráulica - Substituição"
                ]
            },
            {
                "nome": "Estrutura",
                "icone": "grid-four",
                "servicos": [
                    "Estrutura - Inspeção",
                    "Estrutura - Reparo",
                    "Estrutura - Solda/reforço",
                    "Estrutura - Alinhamento",
                    "Estrutura - Pintura preventiva",
                    "Estrutura - Tratamento anticorrosivo",
                    "Estrutura - Verificação de ferrugem",
                    "Suporte de equipamento - Reparo",
                    "Fixação de equipamento - Reparo",
                    "Estrutura - Verificação de trincas"
                ]
            },
            {
                "nome": "Chassi",
                "icone": "truck",
                "servicos": [
                    "Chassi - Inspeção",
                    "Chassi - Alinhamento",
                    "Chassi - Reparo",
                    "Chassi - Solda/reforço",
                    "Chassi - Tratamento anticorrosivo",
                    "Chassi - Verificação de ferrugem",
                    "Chassi - Verificação de trincas",
                    "Suporte do tanque - Reparo",
                    "Suporte da bomba - Reparo",
                    "Chassi - Avaliação de danos estruturais"
                ]
            }
        ]
    },
    {
        "grupo": "OUTROS",
        "icone": "dots-three-circle",
        "subcategorias": [
            {
                "nome": "Revisão geral pós-sinistro",
                "icone": "clipboard-text",
                "servicos": [
                    "Veículo - Diagnóstico geral pós-sinistro",
                    "Veículo - Inspeção de segurança pós-sinistro",
                    "Veículo - Revisão geral pós-sinistro",
                    "Veículo - Avaliação de danos mecânicos",
                    "Veículo - Avaliação de danos elétricos",
                    "Veículo - Avaliação de danos estruturais",
                    "Veículo - Verificação de alinhamento após colisão",
                    "Veículo - Inspeção final para liberação"
                ]
            },
            {
                "nome": "Outros",
                "icone": "dots-three-circle",
                "servicos": [
                    "Veículo - Revisão geral",
                    "Veículo - Inspeção preventiva",
                    "Veículo - Diagnóstico de falha",
                    "Veículo - Teste de rodagem",
                    "Veículo - Verificação de ruídos/vibrações",
                    "Veículo - Verificação de vazamentos",
                    "Veículo - Checklist pré-viagem",
                    "Veículo - Checklist pós-viagem",
                    "Veículo - Instalação de acessório",
                    "Veículo - Remoção de acessório",
                    "Veículo - Guincho/remoção",
                    "Veículo - Socorro mecânico emergencial",
                    "Veículo - Avaliação técnica para orçamento",
                    "Serviço diverso - Especificação necessária",
                    "Extintor - Inspeção",
                    "Extintor - Recarga/substituição",
                    "Tacógrafo - Inspeção",
                    "Tacógrafo - Aferição",
                    "Tacógrafo - Manutenção",
                    "Veículo - Inspeção ambiental",
                    "Veículo - Licenciamento anual",
                    "Veículo - Inspeção de equipamentos obrigatórios",
                    "Veículo - Regularização documental"
                ]
            }
        ]
    }
];

const CATEGORIAS = [];
GRUPOS.forEach(g => {
    g.subcategorias.forEach(sub => {
        CATEGORIAS.push({
            nome: sub.nome,
            icone: sub.icone,
            grupo: g.grupo,
            grupo_icone: g.icone,
            tipo: 'Corretiva',
            servicos: sub.servicos
        });
    });
});

// Equivalencia de nomes antigos (preventivos originais e versoes anteriores do catalogo) para o nome revisado
const RENOMEIA = {
    // ---- preventivos originais
    'Troca de óleo do motor': 'Óleo do motor - Troca',
    'Troca do filtro de óleo': 'Filtro de óleo - Troca',
    'Troca do filtro de ar': 'Filtro de ar do motor - Troca',
    'Troca do filtro de combustível': 'Filtro de combustível - Troca',
    'Troca do filtro cabine/ar-cond.': 'Veículo - Revisão geral',
    'Troca de correia dentada': 'Correia dentada - Troca',
    'Troca da correia auxiliar': 'Correia auxiliar - Troca',
    'Limpeza de bicos injetores': 'Bicos injetores - Limpeza',
    'Regulagem de válvulas': 'Válvulas do motor - Regulagem',
    'Troca do líquido de arrefecimento': 'Líquido de arrefecimento - Troca',
    'Verificação de vazamentos': 'Motor - Verificação de vazamentos',
    'Troca de pastilhas de freio': 'Pastilhas de freio - Troca',
    'Troca de lonas': 'Lonas de freio - Troca',
    'Troca de disco de freio': 'Disco de freio - Troca',
    'Sangria do sistema de freio': 'Sistema de freio - Sangria',
    'Troca de fluido de freio': 'Fluido de freio - Troca',
    'Regulagem de freio': 'Freio de estacionamento - Regulagem/reparo',
    'Verificação de mangueiras': 'Sistema de freio - Inspeção',
    'Rodízio de pneus': 'Pneus - Rodízio',
    'Alinhamento': 'Rodas - Alinhamento',
    'Balanceamento': 'Rodas - Balanceamento',
    'Calibragem': 'Pneus - Calibragem',
    'Troca de pneus': 'Pneu - Troca',
    'Troca de amortecedores': 'Amortecedor - Substituição',
    'Troca de buchas': 'Bucha de suspensão - Substituição',
    'Lubrificação de suspensão': 'Suspensão - Inspeção de folgas',
    'Troca de pivôs': 'Pivô de suspensão - Substituição',
    'Troca de óleo do câmbio': 'Óleo do câmbio - Troca',
    'Troca de filtro do câmbio': 'Filtro do câmbio - Troca',
    'Troca de kit embreagem': 'Kit de embreagem - Troca',
    'Troca de óleo diferencial': 'Óleo do diferencial - Troca',
    'Teste de bateria': 'Bateria - Teste',
    'Troca de bateria': 'Bateria - Troca',
    'Verificação elétrica geral': 'Sistema elétrico - Verificação geral',
    'Higienização do ar-cond.': 'Veículo - Revisão geral',
    'Recarga de gás': 'Condensador - Reparo/substituição',
    'Troca de filtro cabine': 'Veículo - Revisão geral',
    'Troca de óleo hidráulico': 'Óleo hidráulico - Troca',
    'Troca de filtro hidráulico': 'Filtro hidráulico - Troca',
    'Lubrificação de bomba': 'Bomba de sucção - Lubrificação',
    'Revisão de bomba de sucção': 'Bomba de sucção - Revisão',
    'Verificação de mangotes': 'Mangote - Inspeção de desgaste',
    'Limpeza de tanque': 'Tanque - Limpeza',
    'Revisão do motor de sucção': 'Motor de sucção - Revisão',
    'Troca de óleo do motor de sucção': 'Motor de sucção - Troca de óleo',
    'Troca de filtro do motor de sucção': 'Filtro do motor de sucção - Troca',
    'Revisão da bomba de vácuo': 'Bomba de sucção - Teste de vácuo',
    'Higienização do tanque': 'Tanque - Higienização',
    'Verificação de válvulas': 'Válvula - Inspeção',
    'Verificação do sistema hidráulico do tanque': 'Sistema hidráulico - Revisão',
    'Inspeção estrutural do tanque': 'Tanque - Inspeção estrutural',
    'Inspeção estrutural': 'Estrutura - Inspeção',
    'Pintura preventiva': 'Estrutura - Pintura preventiva',
    'Verificação de ferrugem': 'Estrutura - Verificação de ferrugem',
    'Extintor': 'Extintor - Recarga/substituição',
    'Tacógrafo': 'Tacógrafo - Aferição',
    'Licenciamento': 'Veículo - Licenciamento anual',
    'Inspeção ambiental': 'Veículo - Inspeção ambiental',
    // ---- versoes anteriores do catalogo corretivo
    'Adesivo danificado - Substituição': 'Adesivo - Substituição',
    'Amassado - Reparo': 'Lataria - Reparo de amassado',
    'Corrosão da carroceria - Reparo': 'Lataria - Reparo de corrosão',
    'Pintura - Polimento e retoque': 'Pintura - Polimento',
    'Faróis - Polimento/restauração': 'Farol - Polimento/restauração',
    'Faróis - Regulagem': 'Farol - Regulagem',
    'Faróis - Regulagem de altura': 'Farol - Regulagem',
    'Espelho/lente do retrovisor - Substituição': 'Espelho do retrovisor - Substituição',
    'Fechadura/maçaneta da porta - Reparo': 'Fechadura da porta - Reparo',
    'Vidro - Substituição': 'Vidro lateral - Substituição',
    'Borrachas de vedação de portas e vidros - Substituição': 'Borracha de vedação da porta - Substituição',
    'Dobradiças e limitadores de portas - Reparo': 'Dobradiças da porta - Reparo',
    'Limpador/lavador do para-brisa - Reparo': 'Limpador do para-brisa - Reparo',
    'Motor - Diagnóstico de falha': 'Motor - Diagnóstico',
    'Junta do motor - Substituição': 'Junta do cabeçote - Substituição',
    'Velas do motor - Substituição': 'Velas de ignição - Substituição',
    'Tensionador/polia do motor - Substituição': 'Tensionador da correia - Substituição',
    'Tampa do reservatório/radiador - Substituição': 'Tampa do radiador - Substituição',
    'Sistema de lubrificação - Verificação de vazamentos': 'Motor - Verificação de vazamentos',
    'Cilindro/pinça de freio - Reparo': 'Pinça de freio - Reparo',
    'Freios - Regulagem': 'Freio de estacionamento - Regulagem/reparo',
    'Mangueiras de freio - Verificação': 'Sistema de freio - Inspeção',
    'Sistema ABS - Inspeção': 'Sistema ABS - Diagnóstico',
    'Freio de estacionamento - Reparo': 'Freio de estacionamento - Regulagem/reparo',
    'Pneus - Troca': 'Pneu - Troca',
    'Rodas - Reparo': 'Roda - Reparo',
    'Rodas - Substituição': 'Roda - Substituição',
    'Parafusos/porcas de roda - Substituição': 'Parafusos de roda - Substituição',
    'Pneus de carga - Recapagem': 'Pneu - Recapagem',
    'Pneus - Inspeção de desgaste e profundidade dos sulcos': 'Pneus - Inspeção de profundidade dos sulcos',
    'Pneus - Inspeção de danos, bolhas e cortes': 'Pneu - Inspeção de danos',
    'Amortecedores - Troca': 'Amortecedor - Substituição',
    'Buchas de suspensão - Troca': 'Bucha de suspensão - Substituição',
    'Pivôs de suspensão - Troca': 'Pivô de suspensão - Substituição',
    'Barra estabilizadora/bieleta - Substituição': 'Bieleta - Substituição',
    'Feixe de molas - Substituição': 'Feixe de molas - Reparo/substituição',
    'Direção e suspensão - Inspeção de folgas': 'Suspensão - Inspeção de folgas',
    'Terminal/barra de direção - Substituição': 'Terminal de direção - Substituição',
    'Cilindro mestre/auxiliar da embreagem - Substituição': 'Cilindro mestre da embreagem - Substituição',
    'Diferencial - Reparo/substituição': 'Diferencial - Reparo',
    'Trambulador/seletor de marchas - Reparo': 'Trambulador - Reparo',
    'Transmissão automática/automatizada - Diagnóstico': 'Transmissão - Diagnóstico',
    'Sistema elétrico - Diagnóstico eletrônico': 'Sistema elétrico - Diagnóstico',
    'Chicote/fiação - Reparo': 'Chicote elétrico - Reparo',
    'Fusíveis/relés - Substituição': 'Fusível - Substituição',
    'Módulos eletrônicos - Diagnóstico': 'Módulo eletrônico - Diagnóstico',
    'Sensores - Substituição': 'Sensor elétrico/eletrônico - Substituição',
    'Limpadores elétricos - Reparo': 'Limpador elétrico - Reparo',
    'Rastreador/telemetria - Instalação/reparo': 'Rastreador - Instalação/reparo',
    'Abraçadeiras/conexões - Substituição': 'Abraçadeira do mangote - Substituição',
    'Sistemas hidráulico/pneumático - Verificação de vazamentos': 'Sistema hidráulico - Verificação de vazamentos',
    'Bomba de sucção - Lubrificação e revisão': 'Bomba de sucção - Revisão',
    'Bomba de vácuo - Revisão': 'Bomba de sucção - Teste de vácuo',
    'Óleo do motor de sucção - Troca': 'Motor de sucção - Troca de óleo',
    'Válvulas - Verificação': 'Válvula - Inspeção',
    'Sistema hidráulico do tanque - Verificação': 'Sistema hidráulico - Revisão',
    'Tampa/vedação do tanque - Reparo': 'Tampa do tanque - Reparo',
    'Juntas/vedações - Substituição': 'Vedação do tanque - Substituição',
    'Tanque - Inspeção de trincas e corrosão interna': 'Tanque - Inspeção de trincas',
    'Bomba - Verificação do nível e condição do óleo': 'Bomba de sucção - Verificação do nível de óleo',
    'Bomba - Verificação de ruído e vibração': 'Bomba de sucção - Verificação de ruído/vibração',
    'Veículo - Pintura preventiva': 'Estrutura - Pintura preventiva',
    'Chassi/estrutura - Verificação de ferrugem': 'Estrutura - Verificação de ferrugem',
    'Suportes/fixações de equipamentos - Reparo': 'Suporte de equipamento - Reparo',
    'Chassi/estrutura - Tratamento anticorrosivo': 'Chassi - Tratamento anticorrosivo',
    'Suporte do tanque/bomba - Reparo': 'Suporte do tanque - Reparo',
    'Componentes - Inspeção preventiva': 'Veículo - Inspeção preventiva',
    'Veículo - Verificação de ruídos e vibrações': 'Veículo - Verificação de ruídos/vibrações',
    'Veículo - Verificação de vazamentos gerais': 'Veículo - Verificação de vazamentos',
    'Veículo - Teste de rodagem após reparo': 'Veículo - Teste de rodagem',
    'Tacógrafo - Aferição/ensaio': 'Tacógrafo - Aferição',
    'Veículo - Renovação/regularização documental': 'Veículo - Regularização documental',
    'Estrutura - Avaliação de danos': 'Veículo - Avaliação de danos estruturais',
    'Motor/transmissão - Avaliação de danos mecânicos': 'Veículo - Avaliação de danos mecânicos',
    'Sistema elétrico - Avaliação de danos': 'Veículo - Avaliação de danos elétricos',
    'Rodas/suspensão - Verificação de alinhamento e geometria após colisão': 'Veículo - Verificação de alinhamento após colisão',
    'Veículo - Diagnóstico de falha sem reparo executado': 'Veículo - Diagnóstico de falha',
    'Acessório - Instalação': 'Veículo - Instalação de acessório',
    'Acessório - Remoção': 'Veículo - Remoção de acessório',
    // ---- nomes antigos com prefixo de subcategoria
    'Funilaria (amassados) - Reparo de amassado': 'Lataria - Reparo de amassado',
    'Funilaria (amassados) - Alinhamento de lataria': 'Lataria - Alinhamento',
    'Funilaria (amassados) - Substituição de peça de lataria': 'Peça de lataria - Substituição',
    'Adesivo - Aplicação de adesivo': 'Adesivo - Aplicação',
    'Adesivo - Remoção de adesivo': 'Adesivo - Remoção',
    'Adesivo - Substituição de adesivo danificado': 'Adesivo - Substituição',
    'Pintura - Pintura de peça': 'Peça - Pintura',
    'Pintura - Pintura geral': 'Veículo - Pintura geral',
    'Porta - Reparo de fechadura/maçaneta': 'Fechadura da porta - Reparo',
    'Retrovisor - Substituição do retrovisor': 'Retrovisor - Substituição',
    'Retrovisor - Substituição do espelho/lente': 'Espelho do retrovisor - Substituição',
    'Retrovisor - Substituição da capa': 'Capa do retrovisor - Substituição',
    'Faróis - Substituição do farol': 'Farol - Substituição',
    'Faróis - Substituição de lâmpada': 'Lâmpada do farol - Substituição',
    'Faróis - Regulagem do farol': 'Farol - Regulagem',
    'Lanternas - Substituição da lanterna': 'Lanterna - Substituição',
    'Lanternas - Substituição de lâmpada': 'Lâmpada da lanterna - Substituição',
    'Setas - Substituição da seta': 'Seta - Substituição',
    'Setas - Substituição de lâmpada': 'Lâmpada da seta - Substituição',
    'Para-brisa - Substituição do para-brisa': 'Para-brisa - Substituição',
    'Vidros - Substituição de vidro': 'Vidro lateral - Substituição',
    'Vidros - Reparo do elevador (máquina de vidro)': 'Máquina de vidro - Reparo',
    'Suspensão - Substituição de amortecedor': 'Amortecedor - Substituição',
    'Suspensão - Substituição de mola': 'Mola de suspensão - Substituição',
    'Suspensão - Substituição de bucha': 'Bucha de suspensão - Substituição',
    'Suspensão - Substituição de pivô': 'Pivô de suspensão - Substituição',
    'Suspensão - Substituição de bandeja': 'Bandeja de suspensão - Substituição',
    'Suspensão - Substituição de barra estabilizadora/bieleta': 'Bieleta - Substituição',
    'Suspensão - Substituição de rolamento de roda': 'Rolamento de roda - Substituição',
    'Direção - Substituição de terminal/barra de direção': 'Terminal de direção - Substituição',
    'Direção - Reparo da caixa de direção': 'Caixa de direção - Reparo',
    'Direção - Reparo da bomba de direção': 'Bomba de direção - Reparo',
    'Direção - Troca de fluido da direção': 'Fluido da direção - Troca',
    'Alinhamento - Alinhamento de direção': 'Direção - Alinhamento',
    'Balanceamento - Balanceamento de rodas': 'Rodas - Balanceamento',
    'Pneus - Substituição de pneu': 'Pneu - Troca',
    'Pneus - Reparo de pneu (furo)': 'Pneu - Reparo de furo',
    'Pneus - Rodízio de pneus': 'Pneus - Rodízio',
    'Rodas - Reparo de roda': 'Roda - Reparo',
    'Rodas - Substituição de roda': 'Roda - Substituição',
    'Rodas - Substituição de parafusos/porcas': 'Parafusos de roda - Substituição',
    'Freios - Substituição de pastilhas': 'Pastilhas de freio - Troca',
    'Freios - Substituição de lonas': 'Lonas de freio - Troca',
    'Freios - Substituição de discos/tambores': 'Disco de freio - Troca',
    'Freios - Reparo de cilindro/pinça': 'Pinça de freio - Reparo',
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
    'Motor - Substituição de junta': 'Junta do cabeçote - Substituição',
    'Motor - Troca de óleo e filtros': 'Óleo do motor - Troca',
    'Motor - Substituição de velas': 'Velas de ignição - Substituição',
    'Motor - Substituição de correia': 'Correia dentada - Troca',
    'Câmbio - Reparo do câmbio': 'Câmbio - Reparo',
    'Câmbio - Substituição de retentor': 'Retentor do câmbio - Substituição',
    'Câmbio - Troca de óleo do câmbio': 'Óleo do câmbio - Troca',
    'Transmissão - Reparo da transmissão': 'Transmissão - Reparo',
    'Transmissão - Substituição de embreagem': 'Kit de embreagem - Troca',
    'Transmissão - Substituição de junta homocinética': 'Junta homocinética - Substituição',
    'Sistema elétrico - Reparo de chicote/fiação': 'Chicote elétrico - Reparo',
    'Sistema elétrico - Substituição do motor de partida': 'Motor de partida - Substituição',
    'Sistema elétrico - Substituição do alternador': 'Alternador - Substituição',
    'Sistema elétrico - Substituição de fusíveis/relés': 'Fusível - Substituição',
    'Bateria - Substituição de bateria': 'Bateria - Troca',
    'Bateria - Teste/carga de bateria': 'Bateria - Teste',
    'Mangotes - Substituição de mangote': 'Mangote - Substituição',
    'Mangotes - Reparo de mangote': 'Mangote - Reparo',
    'Mangotes - Substituição de abraçadeiras/conexões': 'Abraçadeira do mangote - Substituição',
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
    'Motor de sucção - Troca de óleo e filtro': 'Motor de sucção - Troca de óleo',
    'Válvulas - Reparo de válvula': 'Válvula - Reparo',
    'Válvulas - Substituição de válvula': 'Válvula - Substituição',
    'Estrutura - Reparo estrutural': 'Estrutura - Reparo',
    'Chassi - Reparo do chassi': 'Chassi - Reparo',
    'Chassi - Alinhamento do chassi': 'Chassi - Alinhamento',
    'Tampa traseira - Reparo de fechadura': 'Fechadura da tampa traseira - Reparo',
    'Revisão geral pós-sinistro - Revisão geral': 'Veículo - Revisão geral pós-sinistro',
    'Revisão geral pós-sinistro - Inspeção de segurança': 'Veículo - Inspeção de segurança pós-sinistro',
    'Revisão geral pós-sinistro - Diagnóstico geral': 'Veículo - Diagnóstico geral pós-sinistro',
    'Outros - Serviço diverso': 'Serviço diverso - Especificação necessária'
};

// Categoria antiga => subcategoria nova
const CATEGORIA_ANTIGA = {
    'Motor': 'Motor',
    'Motor e distribuição': 'Motor',
    'Lubrificação e filtros': 'Motor',
    'Sistema de combustível e injeção': 'Motor',
    'Freios': 'Freios',
    'Pneus e Rodagem': 'Pneus',
    'Pneus e rodas': 'Pneus',
    'Suspensão e Direção': 'Suspensão',
    'Suspensão e direção': 'Suspensão',
    'Transmissão': 'Transmissão',
    'Câmbio, embreagem e transmissão': 'Transmissão',
    'Sistema Elétrico': 'Sistema elétrico',
    'Sistema elétrico e eletrônico': 'Sistema elétrico',
    'Ar Condicionado': 'Radiador',
    'Ar-condicionado e ventilação': 'Radiador',
    'Hidráulica / Operacional': 'Sistema hidráulico',
    'Sistema hidráulico e pneumático': 'Sistema hidráulico',
    'Sistema de Sucção': 'Tanque',
    'Tanque, bomba de sucção e sistema de vácuo': 'Tanque',
    'Estrutura / Carroceria': 'Estrutura',
    'Chassi, estrutura e implementos': 'Chassi',
    'Segurança e Legalização': 'Outros',
    'Inspeções, segurança e documentação': 'Outros',
    'Manutenção preventiva e revisão geral': 'Outros',
    'Funilaria': 'Funilaria (amassados)',
    'Carroceria, funilaria e pintura': 'Funilaria (amassados)',
    'Adesivagem e identidade visual': 'Adesivo',
    'Iluminação e sinalização': 'Faróis',
    'Vidros, portas e retrovisores': 'Vidros',
    'Limpeza e higienização técnica': 'Tanque',
    'Lataria e Estética (Corretiva)': 'Funilaria (amassados)',
    'Mecânica (Corretiva)': 'Motor',
    'Operacional (Corretiva)': 'Sistema hidráulico',
    'Outros': 'Outros',
    'Outros serviços': 'Outros',
    'Outros (Corretiva)': 'Outros'
};

// Itens solicitados na tela de sinistro / alterar lista => subcategoria (as 39 subcategorias)
const ITEM_SINISTRO = {};
CATEGORIAS.forEach(c => { ITEM_SINISTRO[c.nome] = c.nome; });
Object.assign(ITEM_SINISTRO, {
    'Carroceria, funilaria e pintura': 'Funilaria (amassados)',
    'Adesivagem e identidade visual': 'Adesivo',
    'Iluminação e sinalização': 'Faróis',
    'Vidros, portas e retrovisores': 'Vidros',
    'Motor e distribuição': 'Motor',
    'Lubrificação e filtros': 'Motor',
    'Pneus e rodas': 'Pneus',
    'Suspensão e direção': 'Suspensão',
    'Câmbio, embreagem e transmissão': 'Câmbio',
    'Sistema elétrico e eletrônico': 'Sistema elétrico',
    'Ar-condicionado e ventilação': 'Radiador',
    'Sistema de combustível e injeção': 'Motor',
    'Sistema hidráulico e pneumático': 'Sistema hidráulico',
    'Tanque, bomba de sucção e sistema de vácuo': 'Tanque',
    'Chassi, estrutura e implementos': 'Chassi',
    'Manutenção preventiva e revisão geral': 'Outros',
    'Inspeções, segurança e documentação': 'Outros',
    'Limpeza e higienização técnica': 'Tanque',
    'Outros serviços': 'Outros'
});

const MANTER_EM = {};

function norm(t) {
    return String(t == null ? '' : t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}
function normMap(obj) { const o = {}; Object.keys(obj).forEach(k => { o[norm(k)] = obj[k]; }); return o; }
const RENOMEIA_N = normMap(RENOMEIA), CATEGORIA_ANTIGA_N = normMap(CATEGORIA_ANTIGA), ITEM_SINISTRO_N = normMap(ITEM_SINISTRO);

// Reconhece tanto as 39 subcategorias quanto os nomes antigos que continham virgula
const NOMES_CONHECIDOS = Array.from(new Set(
    CATEGORIAS.map(c => c.nome).concat(Object.keys(ITEM_SINISTRO))
)).sort((a, b) => b.length - a.length);

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
        for (const n of NOMES_CONHECIDOS) {
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
function itemParaCategoria(nome) {
    const s = String(nome || '').trim();
    if (s.startsWith('Outros:')) return s;
    return ITEM_SINISTRO_N[norm(s)] || s;
}
function converterItens(lista) {
    const vistos = {}, saida = [];
    lista.forEach(n => { const c = itemParaCategoria(n); const k = norm(c); if (!vistos[k]) { vistos[k] = 1; saida.push(c); } });
    return saida;
}

// ---------- migracao do catalogo (idempotente) ----------
async function organizar(h) {
    const { all, get, run } = h;
    const resumo = { renomeados: 0, unidos: 0, criados: 0, removidos: 0, categoriasNovas: 0, solicitadosConvertidos: 0 };

    // 0) garante colunas auxiliares de hierarquia e ordenacao
    try { await run('ALTER TABLE frota_categorias_manutencao ADD COLUMN grupo TEXT'); } catch (e) {}
    try { await run('ALTER TABLE frota_categorias_manutencao ADD COLUMN grupo_icone TEXT'); } catch (e) {}
    try { await run('ALTER TABLE frota_servicos_catalogo ADD COLUMN item_ref TEXT'); } catch (e) {}
    try { await run('ALTER TABLE frota_servicos_catalogo ADD COLUMN ordem INTEGER'); } catch (e) {}

    // 1) as 39 subcategorias (reaproveita a existente quando o nome bate)
    const existentes = await all('SELECT id, nome FROM frota_categorias_manutencao ORDER BY id');
    const catId = {};
    const idsCatsAtivas = new Set();
    for (let idx = 0; idx < CATEGORIAS.length; idx++) {
        const c = CATEGORIAS[idx];
        const achada = existentes.find(e => norm(e.nome) === norm(c.nome) && !idsCatsAtivas.has(e.id));
        if (achada) {
            await run('UPDATE frota_categorias_manutencao SET nome = ?, icone = ?, grupo = ?, grupo_icone = ?, ordem = ?, ativo = 1 WHERE id = ?',
                [c.nome, c.icone, c.grupo, c.grupo_icone, idx + 1, achada.id]);
            catId[c.nome] = achada.id;
            idsCatsAtivas.add(achada.id);
        } else {
            const r = await run('INSERT INTO frota_categorias_manutencao(nome, icone, grupo, grupo_icone, ordem, ativo) VALUES(?,?,?,?,?,1)',
                [c.nome, c.icone, c.grupo, c.grupo_icone, idx + 1]);
            catId[c.nome] = r.lastID;
            idsCatsAtivas.add(r.lastID);
            resumo.categoriasNovas++;
        }
    }

    // 2) indice dos 353 servicos revisados
    const porNome = {};
    CATEGORIAS.forEach((c, idx) => c.servicos.forEach((nome, sIdx) => {
        const k = norm(nome);
        (porNome[k] = porNome[k] || []).push({ cat: c, idx, sIdx, nome });
    }));
    const escolher = (lista, catAtual, canonAtual) => {
        if (!lista || !lista.length) return null;
        // prefere uma ocorrencia que ainda nao tenha registro canonico
        const livres = lista.filter(e => !canonAtual[e.idx + '|' + norm(e.nome)]);
        const pool = livres.length ? livres : lista;
        return pool.find(e => norm(e.cat.nome) === norm(catAtual))
            || pool.find(e => CATEGORIA_ANTIGA_N[norm(catAtual)] && norm(e.cat.nome) === norm(CATEGORIA_ANTIGA_N[norm(catAtual)]))
            || pool[0];
    };
    const canon = {};
    const catPorId = {};
    (await all('SELECT id, nome FROM frota_categorias_manutencao')).forEach(c => { catPorId[c.id] = c.nome; });

    // 3) aproveita servicos existentes que correspondem a lista revisada (prioriza os que tem periodicidade_padrao > 0)
    const servicos = await all('SELECT id, nome, categoria_id, item_ref, ordem, ativo, COALESCE(periodicidade_padrao, 0) AS per FROM frota_servicos_catalogo ORDER BY CASE WHEN COALESCE(periodicidade_padrao, 0) > 0 THEN 0 ELSE 1 END, id');
    const sobras = [];
    for (const s of servicos) {
        const k = norm(s.nome);
        const novoNome = (porNome[k] ? porNome[k][0].nome : null) || RENOMEIA_N[k];
        const entry = novoNome ? escolher(porNome[norm(novoNome)], catPorId[s.categoria_id], canon) : null;
        if (entry) {
            const chave = entry.idx + '|' + norm(entry.nome);
            const cid = catId[entry.cat.nome];
            const ord = entry.sIdx + 1;
            if (!canon[chave]) {
                canon[chave] = { id: s.id, nome: entry.nome };
                if (s.nome !== entry.nome || s.categoria_id !== cid || s.item_ref !== entry.cat.nome || s.ordem !== ord || s.ativo !== 1) {
                    await run('UPDATE frota_servicos_catalogo SET nome = ?, categoria_id = ?, item_ref = ?, ordem = ?, ativo = 1 WHERE id = ?',
                        [entry.nome, cid, entry.cat.nome, ord, s.id]);
                    if (s.nome !== entry.nome) {
                        await run('UPDATE frota_manutencao_servicos SET nome = ?, item_ref = ? WHERE catalogo_id = ? AND nome = ?', [entry.nome, entry.cat.nome, s.id, s.nome]);
                        await run("UPDATE frota_manutencoes SET servico_catalogo_id = ? WHERE servico_catalogo_id IS NULL AND descricao = ? AND tipo = 'preventiva'", [s.id, s.nome]);
                        await run('UPDATE frota_manutencoes SET descricao = ? WHERE servico_catalogo_id = ? AND descricao = ?', [entry.nome, s.id, s.nome]);
                    }
                    resumo.renomeados++;
                }
            } else {
                const keep = canon[chave];
                await run('UPDATE frota_manutencao_servicos SET catalogo_id = ?, nome = ?, item_ref = ? WHERE catalogo_id = ?', [keep.id, keep.nome, entry.cat.nome, s.id]);
                await run("UPDATE frota_manutencoes SET servico_catalogo_id = ? WHERE servico_catalogo_id IS NULL AND descricao = ? AND tipo = 'preventiva'", [keep.id, s.nome]);
                await run('UPDATE frota_manutencoes SET servico_catalogo_id = ? WHERE servico_catalogo_id = ?', [keep.id, s.id]);
                await run('UPDATE frota_manutencoes SET descricao = ? WHERE servico_catalogo_id = ? AND descricao = ?', [keep.nome, keep.id, s.nome]);
                await run('DELETE FROM frota_servicos_catalogo WHERE id = ?', [s.id]);
                resumo.unidos++;
            }
        } else {
            sobras.push(s);
        }
    }

    // 4) cria os servicos da lista revisada que ainda nao existiam
    for (let idx = 0; idx < CATEGORIAS.length; idx++) {
        const c = CATEGORIAS[idx];
        const cid = catId[c.nome];
        for (let sIdx = 0; sIdx < c.servicos.length; sIdx++) {
            const nome = c.servicos[sIdx];
            const chave = idx + '|' + norm(nome);
            if (canon[chave]) continue;
            const r = await run(
                "INSERT INTO frota_servicos_catalogo(categoria_id,nome,tipo_controle,periodicidade_padrao,unidade,criticidade,tempo_medio_horas,exige_parada,obrigatorio,impede_operacao,padrao,item_ref,ordem,ativo) VALUES(?,?,?,0,'km','Media',NULL,0,0,0,0,?,?,1)",
                [cid, nome, c.tipo, c.nome, sIdx + 1]
            );
            canon[chave] = { id: r.lastID, nome };
            resumo.criados++;
        }
    }

    // 5) limpa servicos antigos que nao fazem parte da lista revisada
    for (const s of sobras) {
        const ref1 = await get('SELECT COUNT(*) AS n FROM frota_manutencao_servicos WHERE catalogo_id = ?', [s.id]);
        const ref2 = await get('SELECT COUNT(*) AS n FROM frota_manutencoes WHERE servico_catalogo_id = ?', [s.id]);
        if ((ref1 && ref1.n > 0) || (ref2 && ref2.n > 0)) {
            await run('UPDATE frota_servicos_catalogo SET ativo = 0 WHERE id = ?', [s.id]);
        } else {
            await run('DELETE FROM frota_servicos_catalogo WHERE id = ?', [s.id]);
        }
        resumo.removidos++;
    }

    // 6) desativa ou remove categorias antigas fora das 39 subcategorias
    for (const c of await all('SELECT id FROM frota_categorias_manutencao')) {
        if (idsCatsAtivas.has(c.id)) continue;
        const n = await get('SELECT COUNT(*) AS n FROM frota_servicos_catalogo WHERE categoria_id = ?', [c.id]);
        if (!n || !n.n) {
            await run('DELETE FROM frota_categorias_manutencao WHERE id = ?', [c.id]);
        } else {
            await run('UPDATE frota_categorias_manutencao SET ativo = 0 WHERE id = ?', [c.id]);
        }
    }

    // 7) converte itens "solicitados" que estavam com os nomes das 22 categorias para as 39 subcategorias
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

module.exports = { GRUPOS, CATEGORIAS, RENOMEIA, MANTER_EM, CATEGORIA_ANTIGA, ITEM_SINISTRO, norm, splitSolicitados, converterItens, organizar };
