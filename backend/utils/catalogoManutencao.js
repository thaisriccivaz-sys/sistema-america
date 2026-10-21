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
                    "Alinhamento de lataria",
                    "Reparo de amassado na lataria",
                    "Reparo de peça de lataria",
                    "Substituição de peça de lataria",
                    "Reparo de riscos e arranhões",
                    "Reparo de corrosão na lataria"
                ]
            },
            {
                "nome": "Adesivo",
                "icone": "tag",
                "servicos": [
                    "Aplicação de adesivo",
                    "Remoção de adesivo",
                    "Substituição de adesivo",
                    "Reparo de descolamento de adesivo",
                    "Remoção de resíduos de cola"
                ]
            },
            {
                "nome": "Pintura",
                "icone": "paint-brush",
                "servicos": [
                    "Pintura de peça",
                    "Pintura geral do veículo",
                    "Polimento de pintura",
                    "Retoque de pintura",
                    "Recuperação de riscos na pintura",
                    "Tratamento anticorrosivo de pintura"
                ]
            },
            {
                "nome": "Para-choque dianteiro",
                "icone": "shield",
                "servicos": [
                    "Reparo do para-choque dianteiro",
                    "Pintura do para-choque dianteiro",
                    "Substituição do para-choque dianteiro",
                    "Alinhamento do para-choque dianteiro",
                    "Reparo da fixação do para-choque dianteiro"
                ]
            },
            {
                "nome": "Para-choque traseiro",
                "icone": "shield-check",
                "servicos": [
                    "Reparo do para-choque traseiro",
                    "Pintura do para-choque traseiro",
                    "Substituição do para-choque traseiro",
                    "Alinhamento do para-choque traseiro",
                    "Reparo da fixação do para-choque traseiro"
                ]
            },
            {
                "nome": "Capô",
                "icone": "arrow-up-right",
                "servicos": [
                    "Reparo do capô",
                    "Pintura do capô",
                    "Substituição do capô",
                    "Reparo das dobradiças do capô",
                    "Reparo da fechadura do capô",
                    "Substituição do cabo de abertura do capô"
                ]
            },
            {
                "nome": "Porta",
                "icone": "door",
                "servicos": [
                    "Reparo de porta",
                    "Pintura de porta",
                    "Substituição de porta",
                    "Reparo da fechadura da porta",
                    "Substituição da maçaneta da porta",
                    "Reparo das dobradiças da porta",
                    "Substituição do limitador da porta",
                    "Substituição da borracha de vedação da porta"
                ]
            },
            {
                "nome": "Paralama",
                "icone": "arrows-horizontal",
                "servicos": [
                    "Reparo do paralama",
                    "Pintura do paralama",
                    "Substituição do paralama",
                    "Reparo do parabarro",
                    "Substituição do parabarro",
                    "Reparo da fixação do paralama"
                ]
            },
            {
                "nome": "Tampa traseira",
                "icone": "arrow-down-left",
                "servicos": [
                    "Reparo da tampa traseira",
                    "Pintura da tampa traseira",
                    "Substituição da tampa traseira",
                    "Reparo da fechadura da tampa traseira",
                    "Substituição da maçaneta da tampa traseira",
                    "Reparo das dobradiças da tampa traseira",
                    "Substituição do amortecedor da tampa traseira"
                ]
            },
            {
                "nome": "Retrovisor",
                "icone": "eye",
                "servicos": [
                    "Reparo do retrovisor",
                    "Substituição do retrovisor",
                    "Substituição do espelho do retrovisor",
                    "Substituição da capa do retrovisor",
                    "Reparo do retrovisor elétrico",
                    "Substituição do motor de regulagem do retrovisor"
                ]
            },
            {
                "nome": "Faróis",
                "icone": "flashlight",
                "servicos": [
                    "Substituição do farol",
                    "Substituição da lâmpada do farol",
                    "Polimento e restauração do farol",
                    "Regulagem do farol",
                    "Reparo de fixação do farol",
                    "Reparo elétrico do farol"
                ]
            },
            {
                "nome": "Lanternas",
                "icone": "lamp",
                "servicos": [
                    "Substituição da lanterna",
                    "Substituição da lâmpada da lanterna",
                    "Reparo da lanterna",
                    "Reparo de fixação da lanterna",
                    "Reparo elétrico da lanterna"
                ]
            },
            {
                "nome": "Setas",
                "icone": "arrows-left-right",
                "servicos": [
                    "Substituição da seta",
                    "Substituição da lâmpada da seta",
                    "Reparo da seta",
                    "Substituição do relé da seta",
                    "Reparo ou substituição do comando de seta"
                ]
            },
            {
                "nome": "Para-brisa",
                "icone": "square-half",
                "servicos": [
                    "Reparo de trinca/estrela no para-brisa",
                    "Substituição do para-brisa",
                    "Reparo de vedação do para-brisa",
                    "Substituição da borracha do para-brisa",
                    "Reparo do limpador do para-brisa",
                    "Substituição da palheta do limpador"
                ]
            },
            {
                "nome": "Vidros",
                "icone": "frame-corners",
                "servicos": [
                    "Substituição do vidro lateral",
                    "Substituição do vidro traseiro",
                    "Aplicação de película nos vidros",
                    "Reparo da máquina de vidro",
                    "Substituição do motor do vidro elétrico",
                    "Substituição do interruptor do vidro elétrico",
                    "Substituição da canaleta do vidro",
                    "Reparo de vedação do vidro"
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
                    "Substituição de amortecedor",
                    "Substituição de mola de suspensão",
                    "Substituição de bandeja de suspensão",
                    "Substituição de bieleta",
                    "Reparo ou substituição da barra estabilizadora",
                    "Substituição de bucha de suspensão",
                    "Substituição de pivô de suspensão",
                    "Substituição de coxim de amortecedor",
                    "Substituição de rolamento de roda",
                    "Reparo ou substituição do feixe de molas",
                    "Inspeção de folgas na suspensão",
                    "Diagnóstico de ruídos na suspensão"
                ]
            },
            {
                "nome": "Direção",
                "icone": "compass",
                "servicos": [
                    "Reparo da caixa de direção",
                    "Substituição da caixa de direção",
                    "Reparo da bomba de direção",
                    "Substituição da bomba de direção",
                    "Substituição do terminal de direção",
                    "Substituição da barra de direção",
                    "Troca do fluido da direção",
                    "Substituição da coifa da direção",
                    "Regulagem da direção",
                    "Diagnóstico de folgas e ruídos na direção"
                ]
            },
            {
                "nome": "Alinhamento",
                "icone": "ruler",
                "servicos": [
                    "Alinhamento de rodas",
                    "Alinhamento de direção",
                    "Verificação da geometria da suspensão",
                    "Regulagem de cambagem",
                    "Regulagem de caster"
                ]
            },
            {
                "nome": "Balanceamento",
                "icone": "scales",
                "servicos": [
                    "Balanceamento de rodas",
                    "Balanceamento do conjunto de rodas",
                    "Verificação de vibração nas rodas"
                ]
            },
            {
                "nome": "Pneus",
                "icone": "circle-notch",
                "servicos": [
                    "Troca de pneu",
                    "Reparo de furo",
                    "Rodízio de pneus",
                    "Calibragem de pneus",
                    "Substituição de pneu por desgaste",
                    "Inspeção de danos no pneu",
                    "Inspeção de profundidade dos sulcos",
                    "Substituição da válvula do pneu",
                    "Recapagem de pneu",
                    "Verificação de pressão dos pneus"
                ]
            },
            {
                "nome": "Rodas",
                "icone": "disc",
                "servicos": [
                    "Reparo de roda",
                    "Substituição de roda",
                    "Substituição de parafusos de roda",
                    "Substituição de porcas de roda",
                    "Reparo do cubo de roda",
                    "Substituição do cubo de roda",
                    "Substituição de rolamento de roda",
                    "Inspeção de danos na roda"
                ]
            },
            {
                "nome": "Freios",
                "icone": "hand-palm",
                "servicos": [
                    "Troca de pastilhas de freio",
                    "Troca de disco de freio",
                    "Troca de lonas de freio",
                    "Reparo ou substituição do tambor de freio",
                    "Troca do fluido de freio",
                    "Sangria do sistema de freio",
                    "Reparo da pinça de freio",
                    "Substituição do cilindro mestre de freio",
                    "Substituição do cilindro de roda",
                    "Substituição do flexível de freio",
                    "Substituição do cabo do freio de mão",
                    "Regulagem ou reparo do freio de estacionamento",
                    "Reparo ou substituição do servo-freio",
                    "Diagnóstico do sistema ABS",
                    "Reparo do sistema ABS",
                    "Inspeção do sistema de freio"
                ]
            },
            {
                "nome": "Radiador",
                "icone": "thermometer-hot",
                "servicos": [
                    "Reparo do radiador",
                    "Substituição do radiador",
                    "Substituição da tampa do radiador",
                    "Substituição do reservatório de expansão",
                    "Limpeza do radiador",
                    "Teste de estanqueidade do radiador",
                    "Reparo ou substituição do condensador"
                ]
            },
            {
                "nome": "Arrefecimento",
                "icone": "snowflake",
                "servicos": [
                    "Substituição da bomba d'água",
                    "Substituição da válvula termostática",
                    "Substituição de mangueira de arrefecimento",
                    "Substituição da ventoinha",
                    "Reparo do eletroventilador",
                    "Troca do líquido de arrefecimento",
                    "Limpeza do sistema de arrefecimento",
                    "Verificação de vazamentos no arrefecimento",
                    "Substituição do sensor de temperatura",
                    "Substituição da correia da bomba d'água"
                ]
            },
            {
                "nome": "Motor",
                "icone": "gear-six",
                "servicos": [
                    "Diagnóstico do motor",
                    "Reparo do motor",
                    "Substituição do motor",
                    "Retífica do motor",
                    "Substituição da junta do cabeçote",
                    "Substituição da junta do cárter",
                    "Troca da correia dentada",
                    "Troca da correia auxiliar",
                    "Substituição do tensionador da correia",
                    "Substituição das velas de ignição",
                    "Regulagem das válvulas do motor",
                    "Substituição dos coxins do motor",
                    "Substituição dos retentores do motor",
                    "Reparo ou substituição do cárter",
                    "Teste de compressão do motor",
                    "Verificação de vazamentos no motor",
                    "Troca de óleo do motor",
                    "Troca do filtro de óleo",
                    "Troca do filtro de ar do motor",
                    "Troca do filtro de combustível",
                    "Limpeza de bicos injetores"
                ]
            },
            {
                "nome": "Câmbio",
                "icone": "sliders",
                "servicos": [
                    "Diagnóstico do câmbio",
                    "Reparo do câmbio",
                    "Substituição do câmbio",
                    "Troca de óleo do câmbio",
                    "Troca do filtro do câmbio",
                    "Substituição do retentor do câmbio",
                    "Reparo do trambulador",
                    "Reparo do seletor de marchas",
                    "Verificação de vazamentos no câmbio"
                ]
            },
            {
                "nome": "Transmissão",
                "icone": "shuffle",
                "servicos": [
                    "Troca do kit de embreagem",
                    "Substituição do cilindro mestre da embreagem",
                    "Substituição do cilindro auxiliar da embreagem",
                    "Substituição da junta homocinética",
                    "Substituição da coifa da homocinética",
                    "Reparo do cardã",
                    "Balanceamento do cardã",
                    "Substituição da cruzeta do cardã",
                    "Reparo do diferencial",
                    "Substituição do diferencial",
                    "Troca de óleo do diferencial",
                    "Diagnóstico da transmissão",
                    "Reparo da transmissão",
                    "Verificação de vazamentos na transmissão"
                ]
            },
            {
                "nome": "Sistema elétrico",
                "icone": "lightning",
                "servicos": [
                    "Diagnóstico do sistema elétrico",
                    "Reparo do chicote elétrico",
                    "Reparo da fiação elétrica",
                    "Substituição de fusível",
                    "Substituição de relé",
                    "Substituição do alternador",
                    "Substituição do motor de partida",
                    "Substituição de sensor elétrico/eletrônico",
                    "Diagnóstico de módulo eletrônico",
                    "Reparo de módulo eletrônico",
                    "Reparo do painel de instrumentos",
                    "Reparo da buzina",
                    "Reparo do limpador elétrico",
                    "Instalação ou reparo do rastreador",
                    "Verificação elétrica geral"
                ]
            },
            {
                "nome": "Bateria",
                "icone": "battery-charging",
                "servicos": [
                    "Teste de bateria",
                    "Troca de bateria",
                    "Recarga de bateria",
                    "Reparo de terminais da bateria",
                    "Substituição de terminal da bateria",
                    "Substituição do cabo da bateria",
                    "Teste do sistema de carga",
                    "Teste do alternador",
                    "Verificação de fixação da bateria"
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
                    "Limpeza do tanque",
                    "Higienização do tanque",
                    "Reparo do tanque",
                    "Inspeção estrutural do tanque",
                    "Teste de estanqueidade do tanque",
                    "Inspeção de corrosão no tanque",
                    "Inspeção de trincas no tanque",
                    "Reparo da tampa do tanque",
                    "Substituição da tampa do tanque",
                    "Substituição da vedação do tanque",
                    "Reparo do suporte do tanque",
                    "Substituição de componentes do tanque"
                ]
            },
            {
                "nome": "Bomba de sucção",
                "icone": "fan",
                "servicos": [
                    "Revisão da bomba de sucção",
                    "Reparo da bomba de sucção",
                    "Substituição da bomba de sucção",
                    "Lubrificação da bomba de sucção",
                    "Teste de funcionamento da bomba de sucção",
                    "Teste de vácuo da bomba de sucção",
                    "Verificação de ruído e vibração na bomba de sucção",
                    "Verificação de vazamentos na bomba de sucção",
                    "Verificação do nível de óleo da bomba de sucção",
                    "Substituição de componentes da bomba de sucção"
                ]
            },
            {
                "nome": "Motor de sucção",
                "icone": "power",
                "servicos": [
                    "Revisão do motor de sucção",
                    "Reparo do motor de sucção",
                    "Substituição do motor de sucção",
                    "Troca de óleo do motor de sucção",
                    "Troca do filtro do motor de sucção",
                    "Diagnóstico do motor de sucção",
                    "Teste de funcionamento do motor de sucção",
                    "Verificação de ruído e vibração no motor de sucção",
                    "Verificação de vazamentos no motor de sucção",
                    "Reparo do acionamento do motor de sucção"
                ]
            },
            {
                "nome": "Mangotes",
                "icone": "link",
                "servicos": [
                    "Reparo de mangote",
                    "Substituição de mangote",
                    "Substituição de abraçadeira do mangote",
                    "Substituição de conexão do mangote",
                    "Desobstrução de mangote",
                    "Inspeção de desgaste do mangote",
                    "Verificação de vazamentos no mangote",
                    "Substituição da vedação do mangote"
                ]
            },
            {
                "nome": "Válvulas",
                "icone": "funnel",
                "servicos": [
                    "Reparo de válvula",
                    "Substituição de válvula",
                    "Inspeção de válvula",
                    "Limpeza de válvula",
                    "Desobstrução de válvula",
                    "Teste de funcionamento da válvula",
                    "Verificação de vedação da válvula",
                    "Reparo do acionamento da válvula",
                    "Substituição da vedação da válvula"
                ]
            },
            {
                "nome": "Sistema hidráulico",
                "icone": "drop",
                "servicos": [
                    "Revisão do sistema hidráulico",
                    "Reparo do sistema hidráulico",
                    "Diagnóstico do sistema hidráulico",
                    "Teste de pressão do sistema hidráulico",
                    "Verificação de vazamentos no sistema hidráulico",
                    "Troca de óleo hidráulico",
                    "Troca do filtro hidráulico",
                    "Substituição de mangueira hidráulica",
                    "Reparo da bomba hidráulica",
                    "Substituição da bomba hidráulica",
                    "Reparo do cilindro hidráulico",
                    "Substituição do cilindro hidráulico",
                    "Reparo ou substituição de válvula hidráulica",
                    "Substituição de conexão hidráulica"
                ]
            },
            {
                "nome": "Estrutura",
                "icone": "grid-four",
                "servicos": [
                    "Inspeção da estrutura",
                    "Reparo da estrutura",
                    "Solda e reforço da estrutura",
                    "Alinhamento da estrutura",
                    "Pintura preventiva da estrutura",
                    "Tratamento anticorrosivo da estrutura",
                    "Verificação de ferrugem na estrutura",
                    "Reparo de suporte de equipamento",
                    "Reparo de fixação de equipamento",
                    "Verificação de trincas na estrutura"
                ]
            },
            {
                "nome": "Chassi",
                "icone": "truck",
                "servicos": [
                    "Inspeção do chassi",
                    "Alinhamento do chassi",
                    "Reparo do chassi",
                    "Solda e reforço do chassi",
                    "Tratamento anticorrosivo do chassi",
                    "Verificação de ferrugem no chassi",
                    "Verificação de trincas no chassi",
                    "Reparo do suporte do tanque",
                    "Reparo do suporte da bomba",
                    "Avaliação de danos estruturais no chassi"
                ]
            },
            {
                "nome": "Câmeras e Rastreadores",
                "icone": "video-camera",
                "servicos": [
                    "Troca de câmera",
                    "Manutenção de câmera"
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
                    "Diagnóstico geral pós-sinistro",
                    "Inspeção de segurança pós-sinistro",
                    "Revisão geral pós-sinistro",
                    "Avaliação de danos mecânicos",
                    "Avaliação de danos elétricos",
                    "Avaliação de danos estruturais",
                    "Verificação de alinhamento após colisão",
                    "Inspeção final para liberação"
                ]
            },
            {
                "nome": "Outros",
                "icone": "dots-three-circle",
                "servicos": [
                    "Revisão geral do veículo",
                    "Inspeção preventiva do veículo",
                    "Diagnóstico de falha",
                    "Teste de rodagem",
                    "Verificação de ruídos e vibrações",
                    "Verificação geral de vazamentos",
                    "Checklist pré-viagem",
                    "Checklist pós-viagem",
                    "Instalação de acessório",
                    "Remoção de acessório",
                    "Guincho / remoção do veículo",
                    "Socorro mecânico emergencial",
                    "Avaliação técnica para orçamento",
                    "Serviço diverso (especificar)",
                    "Inspeção do extintor",
                    "Recarga ou substituição do extintor",
                    "Inspeção do tacógrafo",
                    "Aferição do tacógrafo",
                    "Manutenção do tacógrafo",
                    "Inspeção ambiental",
                    "Licenciamento anual",
                    "Inspeção de equipamentos obrigatórios",
                    "Regularização documental"
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

const RENOMEIA_V2 = {
    "Lataria - Alinhamento": "Alinhamento de lataria",
    "Lataria - Reparo de amassado": "Reparo de amassado na lataria",
    "Peça de lataria - Reparo": "Reparo de peça de lataria",
    "Peça de lataria - Substituição": "Substituição de peça de lataria",
    "Riscos e arranhões - Reparo": "Reparo de riscos e arranhões",
    "Lataria - Reparo de corrosão": "Reparo de corrosão na lataria",
    "Adesivo - Aplicação": "Aplicação de adesivo",
    "Adesivo - Remoção": "Remoção de adesivo",
    "Adesivo - Substituição": "Substituição de adesivo",
    "Adesivo - Reparo de descolamento": "Reparo de descolamento de adesivo",
    "Resíduos de cola - Remoção": "Remoção de resíduos de cola",
    "Peça - Pintura": "Pintura de peça",
    "Veículo - Pintura geral": "Pintura geral do veículo",
    "Pintura - Polimento": "Polimento de pintura",
    "Pintura - Retoque": "Retoque de pintura",
    "Pintura - Recuperação de riscos": "Recuperação de riscos na pintura",
    "Pintura - Tratamento anticorrosivo": "Tratamento anticorrosivo de pintura",
    "Para-choque dianteiro - Reparo": "Reparo do para-choque dianteiro",
    "Para-choque dianteiro - Pintura": "Pintura do para-choque dianteiro",
    "Para-choque dianteiro - Substituição": "Substituição do para-choque dianteiro",
    "Para-choque dianteiro - Alinhamento": "Alinhamento do para-choque dianteiro",
    "Fixação do para-choque dianteiro - Reparo": "Reparo da fixação do para-choque dianteiro",
    "Para-choque traseiro - Reparo": "Reparo do para-choque traseiro",
    "Para-choque traseiro - Pintura": "Pintura do para-choque traseiro",
    "Para-choque traseiro - Substituição": "Substituição do para-choque traseiro",
    "Para-choque traseiro - Alinhamento": "Alinhamento do para-choque traseiro",
    "Fixação do para-choque traseiro - Reparo": "Reparo da fixação do para-choque traseiro",
    "Capô - Reparo": "Reparo do capô",
    "Capô - Pintura": "Pintura do capô",
    "Capô - Substituição": "Substituição do capô",
    "Dobradiças do capô - Reparo": "Reparo das dobradiças do capô",
    "Fechadura do capô - Reparo": "Reparo da fechadura do capô",
    "Cabo de abertura do capô - Substituição": "Substituição do cabo de abertura do capô",
    "Porta - Reparo": "Reparo de porta",
    "Porta - Pintura": "Pintura de porta",
    "Porta - Substituição": "Substituição de porta",
    "Fechadura da porta - Reparo": "Reparo da fechadura da porta",
    "Maçaneta da porta - Substituição": "Substituição da maçaneta da porta",
    "Dobradiças da porta - Reparo": "Reparo das dobradiças da porta",
    "Limitador da porta - Substituição": "Substituição do limitador da porta",
    "Borracha de vedação da porta - Substituição": "Substituição da borracha de vedação da porta",
    "Paralama - Reparo": "Reparo do paralama",
    "Paralama - Pintura": "Pintura do paralama",
    "Paralama - Substituição": "Substituição do paralama",
    "Parabarro - Reparo": "Reparo do parabarro",
    "Parabarro - Substituição": "Substituição do parabarro",
    "Fixação do paralama - Reparo": "Reparo da fixação do paralama",
    "Tampa traseira - Reparo": "Reparo da tampa traseira",
    "Tampa traseira - Pintura": "Pintura da tampa traseira",
    "Tampa traseira - Substituição": "Substituição da tampa traseira",
    "Fechadura da tampa traseira - Reparo": "Reparo da fechadura da tampa traseira",
    "Maçaneta da tampa traseira - Substituição": "Substituição da maçaneta da tampa traseira",
    "Dobradiças da tampa traseira - Reparo": "Reparo das dobradiças da tampa traseira",
    "Amortecedor da tampa traseira - Substituição": "Substituição do amortecedor da tampa traseira",
    "Retrovisor - Reparo": "Reparo do retrovisor",
    "Retrovisor - Substituição": "Substituição do retrovisor",
    "Espelho do retrovisor - Substituição": "Substituição do espelho do retrovisor",
    "Capa do retrovisor - Substituição": "Substituição da capa do retrovisor",
    "Retrovisor elétrico - Reparo": "Reparo do retrovisor elétrico",
    "Motor de regulagem do retrovisor - Substituição": "Substituição do motor de regulagem do retrovisor",
    "Farol - Substituição": "Substituição do farol",
    "Lâmpada do farol - Substituição": "Substituição da lâmpada do farol",
    "Farol - Polimento/restauração": "Polimento e restauração do farol",
    "Farol - Regulagem": "Regulagem do farol",
    "Farol - Reparo de fixação": "Reparo de fixação do farol",
    "Farol - Reparo elétrico": "Reparo elétrico do farol",
    "Lanterna - Substituição": "Substituição da lanterna",
    "Lâmpada da lanterna - Substituição": "Substituição da lâmpada da lanterna",
    "Lanterna - Reparo": "Reparo da lanterna",
    "Lanterna - Reparo de fixação": "Reparo de fixação da lanterna",
    "Lanterna - Reparo elétrico": "Reparo elétrico da lanterna",
    "Seta - Substituição": "Substituição da seta",
    "Lâmpada da seta - Substituição": "Substituição da lâmpada da seta",
    "Seta - Reparo": "Reparo da seta",
    "Relé da seta - Substituição": "Substituição do relé da seta",
    "Comando de seta - Reparo/substituição": "Reparo ou substituição do comando de seta",
    "Para-brisa - Reparo de trinca/estrela": "Reparo de trinca/estrela no para-brisa",
    "Para-brisa - Substituição": "Substituição do para-brisa",
    "Para-brisa - Reparo de vedação": "Reparo de vedação do para-brisa",
    "Borracha do para-brisa - Substituição": "Substituição da borracha do para-brisa",
    "Limpador do para-brisa - Reparo": "Reparo do limpador do para-brisa",
    "Palheta do limpador - Substituição": "Substituição da palheta do limpador",
    "Vidro lateral - Substituição": "Substituição do vidro lateral",
    "Vidro traseiro - Substituição": "Substituição do vidro traseiro",
    "Vidros - Aplicação de película": "Aplicação de película nos vidros",
    "Máquina de vidro - Reparo": "Reparo da máquina de vidro",
    "Motor do vidro elétrico - Substituição": "Substituição do motor do vidro elétrico",
    "Interruptor do vidro elétrico - Substituição": "Substituição do interruptor do vidro elétrico",
    "Canaleta do vidro - Substituição": "Substituição da canaleta do vidro",
    "Vidro - Reparo de vedação": "Reparo de vedação do vidro",
    "Amortecedor - Substituição": "Substituição de amortecedor",
    "Mola de suspensão - Substituição": "Substituição de mola de suspensão",
    "Bandeja de suspensão - Substituição": "Substituição de bandeja de suspensão",
    "Bieleta - Substituição": "Substituição de bieleta",
    "Barra estabilizadora - Reparo/substituição": "Reparo ou substituição da barra estabilizadora",
    "Bucha de suspensão - Substituição": "Substituição de bucha de suspensão",
    "Pivô de suspensão - Substituição": "Substituição de pivô de suspensão",
    "Coxim de amortecedor - Substituição": "Substituição de coxim de amortecedor",
    "Rolamento de roda - Substituição": "Substituição de rolamento de roda",
    "Feixe de molas - Reparo/substituição": "Reparo ou substituição do feixe de molas",
    "Suspensão - Inspeção de folgas": "Inspeção de folgas na suspensão",
    "Suspensão - Diagnóstico de ruídos": "Diagnóstico de ruídos na suspensão",
    "Caixa de direção - Reparo": "Reparo da caixa de direção",
    "Caixa de direção - Substituição": "Substituição da caixa de direção",
    "Bomba de direção - Reparo": "Reparo da bomba de direção",
    "Bomba de direção - Substituição": "Substituição da bomba de direção",
    "Terminal de direção - Substituição": "Substituição do terminal de direção",
    "Barra de direção - Substituição": "Substituição da barra de direção",
    "Fluido da direção - Troca": "Troca do fluido da direção",
    "Coifa da direção - Substituição": "Substituição da coifa da direção",
    "Direção - Regulagem": "Regulagem da direção",
    "Direção - Diagnóstico de folgas/ruídos": "Diagnóstico de folgas e ruídos na direção",
    "Rodas - Alinhamento": "Alinhamento de rodas",
    "Direção - Alinhamento": "Alinhamento de direção",
    "Geometria da suspensão - Verificação": "Verificação da geometria da suspensão",
    "Cambagem - Regulagem": "Regulagem de cambagem",
    "Caster - Regulagem": "Regulagem de caster",
    "Rodas - Balanceamento": "Balanceamento de rodas",
    "Rodas - Balanceamento de conjunto": "Balanceamento do conjunto de rodas",
    "Rodas - Verificação de vibração": "Verificação de vibração nas rodas",
    "Pneu - Troca": "Troca de pneu",
    "Pneu - Reparo de furo": "Reparo de furo",
    "Pneus - Rodízio": "Rodízio de pneus",
    "Pneus - Calibragem": "Calibragem de pneus",
    "Pneu - Substituição por desgaste": "Substituição de pneu por desgaste",
    "Pneu - Inspeção de danos": "Inspeção de danos no pneu",
    "Pneus - Inspeção de profundidade dos sulcos": "Inspeção de profundidade dos sulcos",
    "Válvula do pneu - Substituição": "Substituição da válvula do pneu",
    "Pneu - Recapagem": "Recapagem de pneu",
    "Pneu - Verificação de pressão": "Verificação de pressão dos pneus",
    "Roda - Reparo": "Reparo de roda",
    "Roda - Substituição": "Substituição de roda",
    "Parafusos de roda - Substituição": "Substituição de parafusos de roda",
    "Porcas de roda - Substituição": "Substituição de porcas de roda",
    "Cubo de roda - Reparo": "Reparo do cubo de roda",
    "Cubo de roda - Substituição": "Substituição do cubo de roda",
    "Roda - Inspeção de danos": "Inspeção de danos na roda",
    "Pastilhas de freio - Troca": "Troca de pastilhas de freio",
    "Disco de freio - Troca": "Troca de disco de freio",
    "Lonas de freio - Troca": "Troca de lonas de freio",
    "Tambor de freio - Reparo/substituição": "Reparo ou substituição do tambor de freio",
    "Fluido de freio - Troca": "Troca do fluido de freio",
    "Sistema de freio - Sangria": "Sangria do sistema de freio",
    "Pinça de freio - Reparo": "Reparo da pinça de freio",
    "Cilindro mestre de freio - Substituição": "Substituição do cilindro mestre de freio",
    "Cilindro de roda - Substituição": "Substituição do cilindro de roda",
    "Flexível de freio - Substituição": "Substituição do flexível de freio",
    "Cabo do freio de mão - Substituição": "Substituição do cabo do freio de mão",
    "Freio de estacionamento - Regulagem/reparo": "Regulagem ou reparo do freio de estacionamento",
    "Servo-freio - Reparo/substituição": "Reparo ou substituição do servo-freio",
    "Sistema ABS - Diagnóstico": "Diagnóstico do sistema ABS",
    "Sistema ABS - Reparo": "Reparo do sistema ABS",
    "Sistema de freio - Inspeção": "Inspeção do sistema de freio",
    "Radiador - Reparo": "Reparo do radiador",
    "Radiador - Substituição": "Substituição do radiador",
    "Tampa do radiador - Substituição": "Substituição da tampa do radiador",
    "Reservatório de expansão - Substituição": "Substituição do reservatório de expansão",
    "Radiador - Limpeza": "Limpeza do radiador",
    "Radiador - Teste de estanqueidade": "Teste de estanqueidade do radiador",
    "Condensador - Reparo/substituição": "Reparo ou substituição do condensador",
    "Bomba d'água - Substituição": "Substituição da bomba d'água",
    "Válvula termostática - Substituição": "Substituição da válvula termostática",
    "Mangueira de arrefecimento - Substituição": "Substituição de mangueira de arrefecimento",
    "Ventoinha - Substituição": "Substituição da ventoinha",
    "Eletroventilador - Reparo": "Reparo do eletroventilador",
    "Líquido de arrefecimento - Troca": "Troca do líquido de arrefecimento",
    "Sistema de arrefecimento - Limpeza": "Limpeza do sistema de arrefecimento",
    "Sistema de arrefecimento - Verificação de vazamentos": "Verificação de vazamentos no arrefecimento",
    "Sensor de temperatura - Substituição": "Substituição do sensor de temperatura",
    "Correia da bomba d'água - Substituição": "Substituição da correia da bomba d'água",
    "Motor - Diagnóstico": "Diagnóstico do motor",
    "Motor - Reparo": "Reparo do motor",
    "Motor - Substituição": "Substituição do motor",
    "Motor - Retífica": "Retífica do motor",
    "Junta do cabeçote - Substituição": "Substituição da junta do cabeçote",
    "Junta do cárter - Substituição": "Substituição da junta do cárter",
    "Correia dentada - Troca": "Troca da correia dentada",
    "Correia auxiliar - Troca": "Troca da correia auxiliar",
    "Tensionador da correia - Substituição": "Substituição do tensionador da correia",
    "Velas de ignição - Substituição": "Substituição das velas de ignição",
    "Válvulas do motor - Regulagem": "Regulagem das válvulas do motor",
    "Coxins do motor - Substituição": "Substituição dos coxins do motor",
    "Retentores do motor - Substituição": "Substituição dos retentores do motor",
    "Cárter - Reparo/substituição": "Reparo ou substituição do cárter",
    "Motor - Teste de compressão": "Teste de compressão do motor",
    "Motor - Verificação de vazamentos": "Verificação de vazamentos no motor",
    "Óleo do motor - Troca": "Troca de óleo do motor",
    "Filtro de óleo - Troca": "Troca do filtro de óleo",
    "Filtro de ar do motor - Troca": "Troca do filtro de ar do motor",
    "Filtro de combustível - Troca": "Troca do filtro de combustível",
    "Bicos injetores - Limpeza": "Limpeza de bicos injetores",
    "Câmbio - Diagnóstico": "Diagnóstico do câmbio",
    "Câmbio - Reparo": "Reparo do câmbio",
    "Câmbio - Substituição": "Substituição do câmbio",
    "Óleo do câmbio - Troca": "Troca de óleo do câmbio",
    "Filtro do câmbio - Troca": "Troca do filtro do câmbio",
    "Retentor do câmbio - Substituição": "Substituição do retentor do câmbio",
    "Trambulador - Reparo": "Reparo do trambulador",
    "Seletor de marchas - Reparo": "Reparo do seletor de marchas",
    "Câmbio - Verificação de vazamentos": "Verificação de vazamentos no câmbio",
    "Kit de embreagem - Troca": "Troca do kit de embreagem",
    "Cilindro mestre da embreagem - Substituição": "Substituição do cilindro mestre da embreagem",
    "Cilindro auxiliar da embreagem - Substituição": "Substituição do cilindro auxiliar da embreagem",
    "Junta homocinética - Substituição": "Substituição da junta homocinética",
    "Coifa da homocinética - Substituição": "Substituição da coifa da homocinética",
    "Cardã - Reparo": "Reparo do cardã",
    "Cardã - Balanceamento": "Balanceamento do cardã",
    "Cruzeta do cardã - Substituição": "Substituição da cruzeta do cardã",
    "Diferencial - Reparo": "Reparo do diferencial",
    "Diferencial - Substituição": "Substituição do diferencial",
    "Óleo do diferencial - Troca": "Troca de óleo do diferencial",
    "Transmissão - Diagnóstico": "Diagnóstico da transmissão",
    "Transmissão - Reparo": "Reparo da transmissão",
    "Transmissão - Verificação de vazamentos": "Verificação de vazamentos na transmissão",
    "Sistema elétrico - Diagnóstico": "Diagnóstico do sistema elétrico",
    "Chicote elétrico - Reparo": "Reparo do chicote elétrico",
    "Fiação elétrica - Reparo": "Reparo da fiação elétrica",
    "Fusível - Substituição": "Substituição de fusível",
    "Relé - Substituição": "Substituição de relé",
    "Alternador - Substituição": "Substituição do alternador",
    "Motor de partida - Substituição": "Substituição do motor de partida",
    "Sensor elétrico/eletrônico - Substituição": "Substituição de sensor elétrico/eletrônico",
    "Módulo eletrônico - Diagnóstico": "Diagnóstico de módulo eletrônico",
    "Módulo eletrônico - Reparo": "Reparo de módulo eletrônico",
    "Painel de instrumentos - Reparo": "Reparo do painel de instrumentos",
    "Buzina - Reparo": "Reparo da buzina",
    "Limpador elétrico - Reparo": "Reparo do limpador elétrico",
    "Rastreador - Instalação/reparo": "Instalação ou reparo do rastreador",
    "Sistema elétrico - Verificação geral": "Verificação elétrica geral",
    "Bateria - Teste": "Teste de bateria",
    "Bateria - Troca": "Troca de bateria",
    "Bateria - Recarga": "Recarga de bateria",
    "Bateria - Reparo de terminais": "Reparo de terminais da bateria",
    "Terminal da bateria - Substituição": "Substituição de terminal da bateria",
    "Cabo da bateria - Substituição": "Substituição do cabo da bateria",
    "Sistema de carga - Teste": "Teste do sistema de carga",
    "Alternador - Teste": "Teste do alternador",
    "Bateria - Verificação de fixação": "Verificação de fixação da bateria",
    "Tanque - Limpeza": "Limpeza do tanque",
    "Tanque - Higienização": "Higienização do tanque",
    "Tanque - Reparo": "Reparo do tanque",
    "Tanque - Inspeção estrutural": "Inspeção estrutural do tanque",
    "Tanque - Teste de estanqueidade": "Teste de estanqueidade do tanque",
    "Tanque - Inspeção de corrosão": "Inspeção de corrosão no tanque",
    "Tanque - Inspeção de trincas": "Inspeção de trincas no tanque",
    "Tampa do tanque - Reparo": "Reparo da tampa do tanque",
    "Tampa do tanque - Substituição": "Substituição da tampa do tanque",
    "Vedação do tanque - Substituição": "Substituição da vedação do tanque",
    "Suporte do tanque - Reparo": "Reparo do suporte do tanque",
    "Componentes do tanque - Substituição": "Substituição de componentes do tanque",
    "Bomba de sucção - Revisão": "Revisão da bomba de sucção",
    "Bomba de sucção - Reparo": "Reparo da bomba de sucção",
    "Bomba de sucção - Substituição": "Substituição da bomba de sucção",
    "Bomba de sucção - Lubrificação": "Lubrificação da bomba de sucção",
    "Bomba de sucção - Teste de funcionamento": "Teste de funcionamento da bomba de sucção",
    "Bomba de sucção - Teste de vácuo": "Teste de vácuo da bomba de sucção",
    "Bomba de sucção - Verificação de ruído/vibração": "Verificação de ruído e vibração na bomba de sucção",
    "Bomba de sucção - Verificação de vazamentos": "Verificação de vazamentos na bomba de sucção",
    "Bomba de sucção - Verificação do nível de óleo": "Verificação do nível de óleo da bomba de sucção",
    "Bomba de sucção - Substituição de componentes": "Substituição de componentes da bomba de sucção",
    "Motor de sucção - Revisão": "Revisão do motor de sucção",
    "Motor de sucção - Reparo": "Reparo do motor de sucção",
    "Motor de sucção - Substituição": "Substituição do motor de sucção",
    "Motor de sucção - Troca de óleo": "Troca de óleo do motor de sucção",
    "Filtro do motor de sucção - Troca": "Troca do filtro do motor de sucção",
    "Motor de sucção - Diagnóstico": "Diagnóstico do motor de sucção",
    "Motor de sucção - Teste de funcionamento": "Teste de funcionamento do motor de sucção",
    "Motor de sucção - Verificação de ruído/vibração": "Verificação de ruído e vibração no motor de sucção",
    "Motor de sucção - Verificação de vazamentos": "Verificação de vazamentos no motor de sucção",
    "Acionamento do motor de sucção - Reparo": "Reparo do acionamento do motor de sucção",
    "Mangote - Reparo": "Reparo de mangote",
    "Mangote - Substituição": "Substituição de mangote",
    "Abraçadeira do mangote - Substituição": "Substituição de abraçadeira do mangote",
    "Conexão do mangote - Substituição": "Substituição de conexão do mangote",
    "Mangote - Desobstrução": "Desobstrução de mangote",
    "Mangote - Inspeção de desgaste": "Inspeção de desgaste do mangote",
    "Mangote - Verificação de vazamentos": "Verificação de vazamentos no mangote",
    "Vedação do mangote - Substituição": "Substituição da vedação do mangote",
    "Válvula - Reparo": "Reparo de válvula",
    "Válvula - Substituição": "Substituição de válvula",
    "Válvula - Inspeção": "Inspeção de válvula",
    "Válvula - Limpeza": "Limpeza de válvula",
    "Válvula - Desobstrução": "Desobstrução de válvula",
    "Válvula - Teste de funcionamento": "Teste de funcionamento da válvula",
    "Válvula - Verificação de vedação": "Verificação de vedação da válvula",
    "Acionamento da válvula - Reparo": "Reparo do acionamento da válvula",
    "Vedação da válvula - Substituição": "Substituição da vedação da válvula",
    "Sistema hidráulico - Revisão": "Revisão do sistema hidráulico",
    "Sistema hidráulico - Reparo": "Reparo do sistema hidráulico",
    "Sistema hidráulico - Diagnóstico": "Diagnóstico do sistema hidráulico",
    "Sistema hidráulico - Teste de pressão": "Teste de pressão do sistema hidráulico",
    "Sistema hidráulico - Verificação de vazamentos": "Verificação de vazamentos no sistema hidráulico",
    "Óleo hidráulico - Troca": "Troca de óleo hidráulico",
    "Filtro hidráulico - Troca": "Troca do filtro hidráulico",
    "Mangueira hidráulica - Substituição": "Substituição de mangueira hidráulica",
    "Bomba hidráulica - Reparo": "Reparo da bomba hidráulica",
    "Bomba hidráulica - Substituição": "Substituição da bomba hidráulica",
    "Cilindro hidráulico - Reparo": "Reparo do cilindro hidráulico",
    "Cilindro hidráulico - Substituição": "Substituição do cilindro hidráulico",
    "Válvula hidráulica - Reparo/substituição": "Reparo ou substituição de válvula hidráulica",
    "Conexão hidráulica - Substituição": "Substituição de conexão hidráulica",
    "Estrutura - Inspeção": "Inspeção da estrutura",
    "Estrutura - Reparo": "Reparo da estrutura",
    "Estrutura - Solda/reforço": "Solda e reforço da estrutura",
    "Estrutura - Alinhamento": "Alinhamento da estrutura",
    "Estrutura - Pintura preventiva": "Pintura preventiva da estrutura",
    "Estrutura - Tratamento anticorrosivo": "Tratamento anticorrosivo da estrutura",
    "Estrutura - Verificação de ferrugem": "Verificação de ferrugem na estrutura",
    "Suporte de equipamento - Reparo": "Reparo de suporte de equipamento",
    "Fixação de equipamento - Reparo": "Reparo de fixação de equipamento",
    "Estrutura - Verificação de trincas": "Verificação de trincas na estrutura",
    "Chassi - Inspeção": "Inspeção do chassi",
    "Chassi - Alinhamento": "Alinhamento do chassi",
    "Chassi - Reparo": "Reparo do chassi",
    "Chassi - Solda/reforço": "Solda e reforço do chassi",
    "Chassi - Tratamento anticorrosivo": "Tratamento anticorrosivo do chassi",
    "Chassi - Verificação de ferrugem": "Verificação de ferrugem no chassi",
    "Chassi - Verificação de trincas": "Verificação de trincas no chassi",
    "Suporte da bomba - Reparo": "Reparo do suporte da bomba",
    "Chassi - Avaliação de danos estruturais": "Avaliação de danos estruturais no chassi",
    "Câmera - troca": "Troca de câmera",
    "Câmera - manutenção": "Manutenção de câmera",
    "Veículo - Diagnóstico geral pós-sinistro": "Diagnóstico geral pós-sinistro",
    "Veículo - Inspeção de segurança pós-sinistro": "Inspeção de segurança pós-sinistro",
    "Veículo - Revisão geral pós-sinistro": "Revisão geral pós-sinistro",
    "Veículo - Avaliação de danos mecânicos": "Avaliação de danos mecânicos",
    "Veículo - Avaliação de danos elétricos": "Avaliação de danos elétricos",
    "Veículo - Avaliação de danos estruturais": "Avaliação de danos estruturais",
    "Veículo - Verificação de alinhamento após colisão": "Verificação de alinhamento após colisão",
    "Veículo - Inspeção final para liberação": "Inspeção final para liberação",
    "Veículo - Revisão geral": "Revisão geral do veículo",
    "Veículo - Inspeção preventiva": "Inspeção preventiva do veículo",
    "Veículo - Diagnóstico de falha": "Diagnóstico de falha",
    "Veículo - Teste de rodagem": "Teste de rodagem",
    "Veículo - Verificação de ruídos/vibrações": "Verificação de ruídos e vibrações",
    "Veículo - Verificação de vazamentos": "Verificação geral de vazamentos",
    "Veículo - Checklist pré-viagem": "Checklist pré-viagem",
    "Veículo - Checklist pós-viagem": "Checklist pós-viagem",
    "Veículo - Instalação de acessório": "Instalação de acessório",
    "Veículo - Remoção de acessório": "Remoção de acessório",
    "Veículo - Guincho/remoção": "Guincho / remoção do veículo",
    "Veículo - Socorro mecânico emergencial": "Socorro mecânico emergencial",
    "Veículo - Avaliação técnica para orçamento": "Avaliação técnica para orçamento",
    "Serviço diverso - Especificação necessária": "Serviço diverso (especificar)",
    "Extintor - Inspeção": "Inspeção do extintor",
    "Extintor - Recarga/substituição": "Recarga ou substituição do extintor",
    "Tacógrafo - Inspeção": "Inspeção do tacógrafo",
    "Tacógrafo - Aferição": "Aferição do tacógrafo",
    "Tacógrafo - Manutenção": "Manutenção do tacógrafo",
    "Veículo - Inspeção ambiental": "Inspeção ambiental",
    "Veículo - Licenciamento anual": "Licenciamento anual",
    "Veículo - Inspeção de equipamentos obrigatórios": "Inspeção de equipamentos obrigatórios",
    "Veículo - Regularização documental": "Regularização documental"
};
Object.keys(RENOMEIA).forEach(k => {
    if (RENOMEIA_V2[RENOMEIA[k]]) RENOMEIA[k] = RENOMEIA_V2[RENOMEIA[k]];
});
Object.assign(RENOMEIA, RENOMEIA_V2);

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
