/*
 * Instituto Corujinhas — dados do site (versão 2, sem banco de dados).
 * Base editável: ATUALIZACOES_SITE/CONFIGURACAO_ATENDIMENTOS.json do pacote, convertida para este arquivo
 * para funcionar também ao abrir o index.html direto no navegador.
 *
 * - profissionais: cadastro único por ID. Uma área só referencia IDs.
 * - areas: ordem do seletor. "rotulo" é o texto curto do botão; "titulo" vai na mensagem do WhatsApp.
 * - convenios.itens: vazio até o instituto confirmar a lista. Formato de cada item:
 *   { nome, categoria: "convenio" | "parceria" | "desconto", restricoes }
 */
window.CORUJINHAS_CONFIG = {
  "versao": 2,
  "fonte": "ATUALIZACOES_SITE/CONFIGURACAO_ATENDIMENTOS.json (v1, 2026-11-24) + ADAPTACAO_SITE/*",
  "central": {
    "whatsapp": "553123000757",
    "exibicao": "(31) 2300-0757"
  },
  "marca": {
    "nome": "Instituto Corujinhas",
    "nomeCompleto": "Instituto de Saúde Corujinhas",
    "cnpj": "46.561.948/0001-17",
    "responsavelTecnica": "Dra. Sheila Tomaz — CRM 76044-MG",
    "instagram": "https://www.instagram.com/institutocorujinhas/"
  },
  "destaque": {
    "profissional": "dra_sheila_tomaz",
    "areaAgendamento": "consulta_medica",
    "chipsHero": [
      "pediatria",
      "odontopediatria",
      "psicologia",
      "nutricao"
    ],
    "retrato": "assets/equipe/sheila-destaque.webp"
  },
  "acompanhamentoAdulto": {
    "titulo": "Um acompanhamento que considera você por inteiro",
    "cta": "Conversar sobre acompanhamento adulto",
    "mensagem": "Olá! Vim pelo site do Instituto Corujinhas e gostaria de saber sobre o acompanhamento médico para emagrecimento em adultos com a Dra. Sheila Tomaz. Podem me orientar sobre o agendamento?"
  },
  "servicos": {
    "consulta_urgencia": {
      "rotulo": "Consulta de urgência",
      "mensagem": "Olá! Vim pelo site do Instituto Corujinhas. Gostaria de consultar a disponibilidade de uma consulta de urgência no instituto. Qual unidade pode me atender?"
    },
    "teleconsulta": {
      "rotulo": "Teleconsulta",
      "mensagem": "Olá! Vim pelo site do Instituto Corujinhas e gostaria de saber a disponibilidade de teleconsulta. Podem me orientar sobre os profissionais e o agendamento?"
    },
    "consultar_convenio": {
      "rotulo": "Consultar meu convênio",
      "mensagem": "Olá! Vim pelo site do Instituto Corujinhas e gostaria de confirmar se meu convênio é atendido. Podem me orientar sobre a cobertura para a consulta desejada?"
    }
  },
  "emergencia": {
    "rotulo": "SAMU 192",
    "href": "tel:192",
    "orientacao": "Em caso de emergência, ligue 192 ou procure um pronto-socorro",
    "separado_do_whatsapp_comercial": true,
    "fonte": "https://www.gov.br/saude/pt-br/composicao/saes/samu-192/"
  },
  "convenios": {
    "status": "confirmado",
    "fonte": "Destaque 'Convênios' do Instagram @institutocorujinhas (print enviado pelo usuário em 24/11/2026)",
    "categorias": {
      "convenio": "Convênios",
      "parceria": "Parcerias"
    },
    "itens": [
      {
        "id": "cemig",
        "nome": "Cemig Saúde",
        "categoria": "convenio",
        "logo": "assets/convenios/cemig-saude.webp",
        "busca": "cemig"
      },
      {
        "id": "cenibra",
        "nome": "Cenibra",
        "categoria": "convenio",
        "logo": "assets/convenios/cenibra.webp",
        "busca": "cenibra celulose"
      },
      {
        "id": "usisaude",
        "nome": "Usisaúde",
        "categoria": "convenio",
        "logo": "assets/convenios/usisaude.webp",
        "busca": "usisaude usiminas"
      },
      {
        "id": "abertta",
        "nome": "Abertta Saúde",
        "categoria": "convenio",
        "logo": "assets/convenios/abertta-saude.webp",
        "busca": "abertta aberta"
      },
      {
        "id": "ammp",
        "nome": "AMMP",
        "detalhe": "Associação Mineira do Ministério Público",
        "categoria": "convenio",
        "logo": "assets/convenios/ammp.webp",
        "busca": "ammp associacao mineira ministerio publico"
      },
      {
        "id": "postal",
        "nome": "Postal Saúde",
        "categoria": "convenio",
        "logo": "assets/convenios/postal-saude.webp",
        "busca": "postal correios"
      },
      {
        "id": "cartao_corujinhas",
        "nome": "Cartão Corujinhas",
        "categoria": "parceria",
        "logo": "assets/convenios/cartao-corujinhas.webp",
        "busca": "cartao corujinhas"
      },
      {
        "id": "dental_kids",
        "nome": "Dental Kids",
        "categoria": "parceria",
        "logo": "assets/convenios/dental-kids.webp",
        "busca": "dental kids odonto"
      },
      {
        "id": "qualicard",
        "nome": "Qualicard",
        "categoria": "parceria",
        "logo": "assets/convenios/qualicard.webp",
        "busca": "qualicard"
      }
    ],
    "textoPendente": "Consulte a cobertura do seu convênio com nossa equipe"
  },
  "avaliacoes": {
    "fonte": "Google Maps, fichas das unidades, lidas em 24/11/2026 sem login (o Google mostra só parte dos comentários sem login)",
    "link": "https://www.google.com/maps/search/Instituto+de+Sa%C3%BAde+Corujinhas+Ipatinga",
    "total": 292,
    "dataLeitura": "24/11/2026",
    "notas": [
      {
        "unidade": "Horto",
        "nota": "4,7",
        "total": 172
      },
      {
        "unidade": "Shopping",
        "nota": "5,0",
        "total": 70
      },
      {
        "unidade": "Fabriciano",
        "nota": "4,8",
        "total": 49
      }
    ],
    "selecao": "Somente 4–5 estrelas que falam de atendimento, equipe ou ambiente. Ficam de fora comentários que descrevem resultado de tratamento (publicidade médica, CFM 2.336/2023). Nome exibido: primeiro nome + inicial; sem foto de perfil.",
    "trechos": [
      {
        "nome": "Dalila T.",
        "unidade": "Shopping",
        "estrelas": 5,
        "texto": "Excelente atendimento! Equipe muito atenciosa, ambiente acolhedor e muita praticidade em todo o processo. Uma experiência muito positiva, desde a chegada até o atendimento. Recomendo!"
      },
      {
        "nome": "Natalia N.",
        "unidade": "Horto",
        "estrelas": 5,
        "texto": "Uma clínica maravilhosa desde o atendimento, recepção e profissionais maravilhosos."
      },
      {
        "nome": "Kenia S.",
        "unidade": "Shopping",
        "estrelas": 5,
        "texto": "Experiência excepcional do início ao fim. Desde o momento da chegada, a recepção foi extremamente gentil, ágil e acolhedora. O ambiente da clínica é muito limpo, moderno, organizado e transmite muita segurança. Não houve atraso significativo para a consulta, e os médicos são de um profissionalismo ímpar: escutam com calma, explicam tudo de forma clara, sem pressa, e demonstram um atendimento verdadeiramente humanizado. Recomendo de olhos fechados para quem busca um cuidado sério e de qualidade!"
      },
      {
        "nome": "Lais L.",
        "unidade": "Fabriciano",
        "estrelas": 5,
        "texto": "Ótimo atendimento e excelentes profissionais. Dra Sheila acompanha meu filho desde a maternidade, não troco de jeito nenhum! 🥰"
      },
      {
        "nome": "Kamila K.",
        "unidade": "Shopping",
        "estrelas": 5,
        "texto": "Um lugar incrível desde a recepção; um atendimento humanizado, acertivo e acolhedor, olhando não somente a queixa princial, mas olha tudo que envolve até chegar a raíz do problema."
      },
      {
        "nome": "Lidia A.",
        "unidade": "Fabriciano",
        "estrelas": 5,
        "texto": "Instituto Curujinhas chegou o que faltava em Coronel Fabriciano, para melhor atender nossos filhos com ótima equipe de pediatria e profissionais da área da saúde infantil em geral. Super indico! Venha conhecer !"
      },
      {
        "nome": "Ana C.",
        "unidade": "Shopping",
        "estrelas": 5,
        "texto": "Clínica ótima com ótimos profissionais. Atendimento de excelência em todos os aspectos. Atendimento rápido em situações de urgência. Lá conseguimos atendimento para toda a família pelo plano ou particular com mesma qualidade. Indico de olhos fechados."
      },
      {
        "nome": null,
        "unidade": null,
        "estrelas": 5,
        "texto": "Pessoas competentes e ambiente confortável e profissional."
      },
      {
        "nome": null,
        "unidade": null,
        "estrelas": 5,
        "texto": "Clínica muito linda e profissionais excepcionais"
      }
    ]
  },
  "unidades": [
    {
      "id": "unidade-horto",
      "nome": "Horto",
      "enderecoCurto": "Av. Castelo Branco, 807 · Sl 101 · Horto, Ipatinga",
      "mapaSvg": "horto",
      "cor": "pessego",
      "regiao": "Horto · Ipatinga",
      "horario": [
        "08h às 20h"
      ],
      "telefone": {
        "exibicao": "(31) 2300-0278",
        "tel": "+553123000278"
      },
      "endereco": "Av. Castelo Branco, 807 — Sl 101 — Horto, Ipatinga — MG, 35160-294",
      "mapa": "https://www.google.com/maps/search/?api=1&query=Instituto%20de%20Sa%C3%BAde%20Corujinhas%20Horto%20Ipatinga",
      "divergencia": "O Google mostrou fechamento às 22h e o telefone (31) 2300-0757",
      "extra": {
        "rotulo": "Odontologia",
        "exibicao": "(31) 98871-5572",
        "tel": "+5531988715572",
        "whatsapp": "5531988715572"
      }
    },
    {
      "id": "unidade-fabriciano",
      "nome": "Fabriciano",
      "enderecoCurto": "R. Dr. Moacir Birro, 325 A · Centro, Cel. Fabriciano",
      "mapaSvg": "fabriciano",
      "cor": "azul",
      "regiao": "Centro · Coronel Fabriciano",
      "horario": [
        "08h às 18h30"
      ],
      "telefone": {
        "exibicao": "(31) 2300-0286",
        "tel": "+553123000286"
      },
      "endereco": "R. Dr. Moacir Birro, 325 A — Centro, Coronel Fabriciano — MG, 35170-002",
      "fonteEndereco": "Google Maps, 24/11/2026",
      "mapa": "https://www.google.com/maps/search/?api=1&query=Instituto%20de%20Sa%C3%BAde%20Corujinhas%20Coronel%20Fabriciano"
    },
    {
      "id": "unidade-bom-jardim",
      "nome": "Bom Jardim",
      "enderecoCurto": "R. Papoula, 143 · Bom Jardim, Ipatinga",
      "mapaSvg": "bomjardim",
      "cor": "verde",
      "regiao": "Bom Jardim · Ipatinga",
      "horario": [
        "08h às 17h"
      ],
      "telefone": {
        "exibicao": "(31) 2300-0757",
        "tel": "+553123000757"
      },
      "endereco": "R. Papoula, 143 — Bom Jardim, Ipatinga — MG, 35162-292",
      "fonteEndereco": "Google Maps, 24/11/2026",
      "mapa": "https://www.google.com/maps/search/?api=1&query=Instituto%20de%20Sa%C3%BAde%20Corujinhas%20Bom%20Jardim%20Ipatinga"
    },
    {
      "id": "unidade-shopping",
      "nome": "Shopping Vale do Aço",
      "enderecoCurto": "Shopping Vale do Aço · 2º andar · Ipatinga",
      "mapaSvg": "shopping",
      "cor": "rosa",
      "regiao": "Shopping Vale do Aço · Ipatinga",
      "horario": [
        "08h às 22h",
        "Finais de semana: 08h às 18h"
      ],
      "telefone": {
        "exibicao": "(31) 2300-0757",
        "tel": "+553123000757"
      },
      "endereco": "Shopping Vale do Aço (2º andar) — Av. Pedro Linhares Gomes, 3900, Ipatinga — MG, 35160-291",
      "mapa": "https://www.google.com/maps/search/?api=1&query=Instituto%20de%20Sa%C3%BAde%20Corujinhas%20Shopping%20Vale%20do%20A%C3%A7o"
    }
  ],
  "profissionais": {
    "dra_sheila_tomaz": {
      "nome": "Dra. Sheila Tomaz",
      "descricao": "Médica pós graduanda em Nutrologia — NÃO ESPECIALISTA",
      "registro": "CRM 76044-MG",
      "rqe": "60126",
      "retrato": "assets/equipe/sheila-card.webp",
      "retratoOrigem": "reconstruído por IA a partir do card"
    },
    "dr_thyago_trigo": {
      "nome": "Dr. Thyago Trigo",
      "descricao": "Pediatra",
      "registro": "CRM 69847-MG",
      "rqe": "44013",
      "retrato": "assets/equipe/thyago-card.webp",
      "retratoOrigem": "reconstruído por IA a partir do card"
    },
    "dr_lucas_ayres": {
      "nome": "Dr. Lucas Ayres",
      "descricao": "Médico de família e comunidade",
      "registro": "CRM 86660-MG",
      "rqe": "68919",
      "retrato": "assets/equipe/lucas-card.webp",
      "retratoOrigem": "reconstruído por IA a partir do card"
    },
    "dr_romulo_armando": {
      "nome": "Dr. Romulo Armando",
      "descricao": "Médico",
      "registro": "CRM 109210-MG",
      "rqe": null,
      "retrato": "assets/equipe/romulo-card.webp",
      "retratoOrigem": "reconstruído por IA a partir do card"
    },
    "dra_keren_hapuck": {
      "nome": "Dra. Kéren Hapuck",
      "descricao": "Médica nuclear e pós graduanda em radiologia",
      "registro": "CRM 72823-MG",
      "rqe": "69406",
      "retrato": "assets/equipe/keren-card.webp",
      "retratoOrigem": "reconstruído por IA a partir do card"
    },
    "dra_carolina_rodrigues": {
      "nome": "Dra. Carolina Rodrigues",
      "descricao": "Médica pós graduanda em Endocrinologia — NÃO ESPECIALISTA",
      "registro": "CRM 105190-MG",
      "rqe": null,
      "retrato": "assets/equipe/carolina-card.webp",
      "retratoOrigem": "reconstruído por IA a partir do card"
    },
    "dra_leticia_nacife": {
      "nome": "Dra. Letícia Nacife",
      "descricao": "Pediatra",
      "registro": "CRM 81538-MG",
      "rqe": "65947",
      "retrato": "assets/equipe/leticia-card.webp",
      "retratoOrigem": "reconstruído por IA a partir do card"
    },
    "dra_rogeria_sampaio": {
      "nome": "Dra. Rogéria Sampaio",
      "descricao": "Odontopediatra; ortodontista; ortopedia funcional dos maxilares",
      "registro": "CRO MG 17382",
      "rqe": null,
      "retrato": "assets/equipe/rogeria-card.webp",
      "retratoOrigem": "reconstruído por IA a partir do card"
    },
    "dra_beatriz_andrade": {
      "nome": "Dra. Beatriz Andrade",
      "descricao": "Odontopediatra",
      "registro": "CRO MG 066410",
      "rqe": null,
      "retrato": "assets/equipe/beatriz-card.webp",
      "retratoOrigem": "reconstruído por IA a partir do card"
    },
    "aline_nunes_silva": {
      "nome": "Aline Nunes Silva",
      "descricao": "Psicóloga",
      "registro": "CRP 78522",
      "rqe": null,
      "retrato": "assets/equipe/aline-card.webp",
      "retratoOrigem": "retrato enviado pelo usuário em 24/11/2026",
      "observacao": "O card informa CRP 78522, sem região explícita."
    },
    "adila_santos": {
      "nome": "Adila Santos",
      "descricao": "Fonoaudióloga e teste da linguinha",
      "registro": "CRF 10061",
      "rqe": null,
      "retrato": "assets/equipe/adila-card.webp",
      "retratoOrigem": "reconstruído por IA a partir do card",
      "observacao": "A sigla CRF está impressa no card e foi preservada literalmente; não foi substituída por outra sigla."
    },
    "kamilla_oliveira": {
      "nome": "Kamilla Oliveira",
      "descricao": "Nutricionista infantil e adulto",
      "registro": "CRN 17670-MG",
      "rqe": null,
      "retrato": "assets/equipe/kamilla-card.webp",
      "retratoOrigem": "reconstruído por IA a partir do card"
    }
  },
  "areas": [
    {
      "id": "pediatria",
      "titulo": "Pediatria",
      "rotulo": "Pediatria",
      "descricao": "Acompanhamento da saúde de bebês, crianças e adolescentes.",
      "icone": "pediatria",
      "cor": "pessego",
      "profissionais": [
        "dr_thyago_trigo",
        "dra_leticia_nacife"
      ],
      "semEquipeNominal": false
    },
    {
      "id": "consulta_medica",
      "titulo": "Consulta médica",
      "rotulo": "Consulta médica",
      "descricao": "Consulta com médicos de formações diferentes. Confira a descrição de cada profissional.",
      "icone": "consulta_medica",
      "cor": "azul",
      "profissionais": [
        "dra_sheila_tomaz",
        "dr_romulo_armando",
        "dra_carolina_rodrigues"
      ],
      "semEquipeNominal": false,
      "ressalva": "Categoria genérica de consulta médica, sem atribuir especialidade clínica não comprovada. Mostrar a descrição original de cada profissional."
    },
    {
      "id": "acompanhamento_adulto",
      "titulo": "Acompanhamento médico para emagrecimento em adultos",
      "rotulo": "Acompanha­mento adulto",
      "descricao": "Acompanhamento médico para emagrecimento em adultos, com avaliação individual.",
      "icone": "acompanhamento_adulto",
      "cor": "verde",
      "profissionais": [
        "dra_sheila_tomaz"
      ],
      "semEquipeNominal": false,
      "origem": "Atendimento informado pelo usuário; não identificado como especialidade no card."
    },
    {
      "id": "familia_comunidade",
      "titulo": "Medicina de família e comunidade",
      "rotulo": "Medicina de família",
      "descricao": "Cuidado médico contínuo para pessoas de todas as idades.",
      "icone": "familia_comunidade",
      "cor": "rosa",
      "profissionais": [
        "dr_lucas_ayres"
      ],
      "semEquipeNominal": false
    },
    {
      "id": "psicologia",
      "titulo": "Psicologia",
      "rotulo": "Psicologia",
      "descricao": "Escuta e acompanhamento psicológico.",
      "icone": "psicologia",
      "cor": "ceu",
      "profissionais": [
        "aline_nunes_silva"
      ],
      "semEquipeNominal": false
    },
    {
      "id": "fonoaudiologia",
      "titulo": "Fonoaudiologia",
      "rotulo": "Fonoaudiologia",
      "descricao": "Fala, linguagem, comunicação e funções orais.",
      "icone": "fonoaudiologia",
      "cor": "pessego",
      "profissionais": [
        "adila_santos"
      ],
      "semEquipeNominal": false
    },
    {
      "id": "teste_linguinha",
      "titulo": "Teste da linguinha",
      "rotulo": "Teste da linguinha",
      "descricao": "Avaliação do freio da língua em bebês.",
      "icone": "teste_linguinha",
      "cor": "azul",
      "profissionais": [
        "adila_santos"
      ],
      "semEquipeNominal": false
    },
    {
      "id": "nutricao",
      "titulo": "Nutrição infantil e adulto",
      "rotulo": "Nutrição",
      "descricao": "Orientação alimentar para crianças e adultos.",
      "icone": "nutricao",
      "cor": "verde",
      "profissionais": [
        "kamilla_oliveira"
      ],
      "semEquipeNominal": false
    },
    {
      "id": "odontopediatria",
      "titulo": "Odontopediatria",
      "rotulo": "Odontopediatria",
      "descricao": "Saúde bucal de bebês e crianças.",
      "icone": "odontologia",
      "cor": "rosa",
      "profissionais": [
        "dra_rogeria_sampaio",
        "dra_beatriz_andrade"
      ],
      "semEquipeNominal": false
    },
    {
      "id": "ortodontia",
      "titulo": "Ortodontia e ortopedia funcional dos maxilares",
      "rotulo": "Ortodontia e orto­pedia funcional",
      "descricao": "Posição dos dentes, mordida e desenvolvimento dos maxilares.",
      "icone": "ortodontia",
      "cor": "ceu",
      "profissionais": [
        "dra_rogeria_sampaio"
      ],
      "semEquipeNominal": false
    },
    {
      "id": "medicina_nuclear",
      "titulo": "Medicina nuclear",
      "rotulo": "Medicina nuclear",
      "descricao": "Consulta com médica nuclear. A central explica como funciona o atendimento.",
      "icone": "medicina_nuclear",
      "cor": "pessego",
      "profissionais": [
        "dra_keren_hapuck"
      ],
      "semEquipeNominal": false
    },
    {
      "id": "neuropediatria",
      "titulo": "Neuropediatria",
      "rotulo": "Neuropediatria",
      "descricao": "Desenvolvimento neurológico de bebês e crianças.",
      "icone": "neuropediatria",
      "cor": "azul",
      "profissionais": [],
      "semEquipeNominal": true
    },
    {
      "id": "psicopedagogia",
      "titulo": "Psicopedagogia",
      "rotulo": "Psicopedagogia",
      "descricao": "Apoio aos processos de aprendizagem.",
      "icone": "psicopedagogia",
      "cor": "verde",
      "profissionais": [],
      "semEquipeNominal": true
    },
    {
      "id": "otorrinolaringologia",
      "titulo": "Otorrinolaringologia",
      "rotulo": "Otorrino­laringologia",
      "descricao": "Ouvido, nariz e garganta.",
      "icone": "otorrinolaringologia",
      "cor": "rosa",
      "profissionais": [],
      "semEquipeNominal": true
    },
    {
      "id": "psiquiatria_adulto",
      "titulo": "Psiquiatria adulto",
      "rotulo": "Psiquiatria adulto",
      "descricao": "Cuidado médico da saúde mental de adultos.",
      "icone": "psiquiatria_adulto",
      "cor": "ceu",
      "profissionais": [],
      "semEquipeNominal": true
    },
    {
      "id": "nutrologia",
      "titulo": "Nutrologia",
      "rotulo": "Nutrologia",
      "descricao": "Área médica dedicada à nutrição.",
      "icone": "nutrologia",
      "cor": "pessego",
      "profissionais": [],
      "semEquipeNominal": true,
      "ressalva": "Não atribuir título de especialista a médica com pós-graduação e ressalva de NÃO ESPECIALISTA. Consultar profissionais e disponibilidade com a central."
    },
    {
      "id": "endocrinologia",
      "titulo": "Endocrinologia",
      "rotulo": "Endocrinologia",
      "descricao": "Hormônios e metabolismo.",
      "icone": "endocrinologia",
      "cor": "azul",
      "profissionais": [],
      "semEquipeNominal": true,
      "ressalva": "Não atribuir título de especialista a médica com pós-graduação e ressalva de NÃO ESPECIALISTA. Consultar profissionais e disponibilidade com a central."
    }
  ],
  "automacaoWhatsapp": {
    "implementada": false,
    "fase_futura": "Atendimento e integração com agenda da central",
    "nao_confirmar_agendamento_no_clique": true
  }
};
