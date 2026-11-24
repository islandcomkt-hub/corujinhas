# Instituto Corujinhas — nota técnica (versão 5)

Site estático, sem SQL, banco de dados, login, painel ou API de IA. Construído pelo Claude Opus 5.5, o modelo em uso neste ambiente. A preferência por outro motor citada no briefing não muda o modelo que executou o trabalho.

## Como abrir

Publique a pasta inteira em qualquer hospedagem estática ou abra `index.html` no navegador. As fontes (Nunito e Figtree) vêm do Google Fonts.

```
index.html
assets/css/styles.css          visual, paleta, animações e responsivo
assets/js/config.js            dados: profissionais (cadastro único por ID), áreas, serviços, convênios, avaliações, unidades
assets/js/mensagens.js         geração única das mensagens de WhatsApp + registro local de intenção
assets/js/app.js               seletor de atendimento, agendamento com pré-cadastro, convênios, unidades, abertura, mascote
assets/js/mapas.js             ruas simplificadas do OpenStreetMap para os minimapas das unidades
assets/convenios/              logos dos convênios e parcerias (recortadas do destaque do Instagram)
assets/marca/letras/           camadas da logo, letra por letra, usadas na abertura
assets/mascote/corujinha-animada.webp    personagem animado (do vídeo enviado, sem áudio e com fundo transparente)
assets/mascote/corujinha-animada-1.webp  1º quadro parado, usado com movimento reduzido
assets/icones/                 atlas 4×4 e 2×2 dos identificadores (sprite CSS)
assets/equipe/                 retratos dos cards (recorte 496×440) e retrato de destaque da Dra. Sheila
assets/cards/                  cards originais, abertos em "Card original"
assets/marca/                  logo horizontal corrigida (webp) e logo circular original
```

`config.js` foi gerado a partir de `ATUALIZACOES_SITE/CONFIGURACAO_ATENDIMENTOS.json`, `ADAPTACAO_SITE/SERVICOS_E_BOTOES.json` e `CONVENIOS_PENDENTES.json`. Edite direto nele.

## Versão 5 (24/11/2026)

- **Agendamento com pré-cadastro:** todo botão de agendar abre um cartão com a unidade (chips) e o paciente.
  - Na primeira vez, pede um cadastro rápido: criança ou adulto, nome completo, data de nascimento, CPF (opcional para criança), responsável (só para criança) e atendimento (particular, convênio ou parceria). "Salvar e agendar consulta" abre o WhatsApp da central com esses dados no fim da mensagem.
  - Da próxima vez, aparece "Agendar para" com os pacientes salvos: um toque abre o WhatsApp direto. "Cadastrar outra pessoa" refaz o cadastro, e cada paciente pode ser removido.
  - Os dados ficam só no aparelho (localStorage), com a opção "Lembrar neste aparelho" e "Apagar dados salvos". Nada é enviado para servidor. Nenhum dado clínico é pedido.
  - O CPF tem máscara e conferência dos dígitos verificadores.
  - Todos os pedidos vão para o WhatsApp da central, como no briefing. O site não tem o WhatsApp individual de cada profissional; a mensagem diz o nome dele.
- **Convênios e parcerias:** Cemig Saúde, Cenibra, Usisaúde, Abertta Saúde, AMMP, Postal Saúde (convênios) e Cartão Corujinhas, Dental Kids, Qualicard (parcerias), com as logos do destaque do Instagram. Sem barra de busca e sem botão de consulta (pedido do usuário em 24/11).
- **Unidades:** cada cartão tem um minimapa desenhado com as ruas reais do OpenStreetMap em volta do endereço, com a rua da unidade em destaque, um pino que cai e pulsa e um carrinho passando. Endereço curto (sem MG e CEP) e três botões: Ver mapa, Ligar agora e Agendar (já com a unidade marcada). No Horto, a odontologia tem WhatsApp e Ligar próprios.
- **Urgência:** atalho central da hero com sirene, farol girando e "Fale agora"; botão "Pedir consulta de urgência" com sirene. O SAMU 192 continua separado.
- **Personagem:** recorte refeito quadro a quadro (24 por segundo, antes 12), sem névoa dentro do coração e sem sombra.
- **Abertura:** cerca de 3 s, com a coruja do "O" inteira (as letras agora são camadas recortadas pela forma, não por faixas).
- **Hero:** um só botão ("Agendar consulta", com agenda animada), sem o "Falar com a central" e sem a frase "Você escolhe o atendimento…". Crachá da Dra. Sheila não sai mais do cartão no celular; atalhos flutuantes menores.
- **"Card original"** saiu dos cards dos profissionais.
- **Entradas mais fluidas (24/11, 08h):** títulos entram palavra por palavra com fade e leve desfoque, subindo, sem máscara cortando; parágrafos, selos, listas (em cascata), cards de serviço, unidades e profissionais seguem a mesma linguagem, com curva de saída suave. Hover com leve zoom em fotos, logos e cartões.
- **Publicação:** GitHub `islandcomkt-hub/corujinhas` (branch `main`) ligado à Vercel; cada envio para `main` publica sozinho em https://corujinhas.islandcompany.space.
- **Ajustes finais (24/11, 07h50):** notas do Google centralizadas no cartão, os três atalhos da hero com a mesma altura ("Fale agora" virou selo em cima do de urgência) e menos espaço vazio entre a hero e "Qual atendimento você procura?".
- **Compartilhamento:** título, descrição, imagem para WhatsApp/redes (`assets/marca/compartilhar.jpg`), ícone e dados estruturados das 4 unidades.

## Versão 4 (24/11/2026)

- **Botão principal da hero:** agora é "Agendar consulta" e leva até a escolha do atendimento, sem abrir o WhatsApp. Ao lado fica "Falar com a central" (mensagem geral). A Dra. Sheila continua na hero e entra no agendamento por "Consulta médica" ou "Acompanhamento adulto".
- **Atalhos Urgência, Teleconsulta e Convênios:** três cartões do mesmo tamanho, centralizados na largura do site.
- **Abertura:** a logo real foi fatiada letra por letra. A coruja do "O" aparece primeiro, com zoom. Depois o zoom recua, as outras letras surgem a partir dela, "Instituto de Saúde" se revela e a logo voa até o topo. Leva cerca de 1,6 s, não bloqueia cliques, aparece uma vez por sessão e é pulada com movimento reduzido.
- **Mascote animado:** o vídeo virou WebP animado com fundo transparente (1,7 MB, só carrega quando a seção chega perto). Ele aparece no seletor de atendimentos e na faixa da central. O arquivo não leva nome nem marca do vídeo. Com movimento reduzido, mostra o quadro parado.
- **Celular:** cabeçalhos e textos centralizados. As categorias viram duas linhas que deslizam na horizontal, com a dica "deslize →". As unidades viram cartões deslizáveis.
- **Urgência:** linha de batimento animada, selo "Fale agora com a central" pulsando, anéis no ícone e pulso no botão. O SAMU continua separado.
- **Botões com identidade:** borda arco-íris pastel no "Agendar consulta", ícone do WhatsApp que acena, brilho passando em "Consultar meu convênio" e no acompanhamento adulto, sinal no de teleconsulta e telefone que vibra no SAMU.
- **Linha do topo:** degradê arco-íris pastel que corre com brilho suave.
- **Animações:** todas as seções e o rodapé têm entrada. Os fundos ganharam formas claras que derivam em laço.
- **Avaliações:** faixa contínua em laço infinito (pausa com o mouse em cima). Mostra as notas do Google por unidade (Horto 4,7 · Shopping 5,0 · Fabriciano 4,8 · 292 avaliações, lidas em 24/11/2026) e 7 comentários de 5 estrelas com primeiro nome + inicial e unidade, mais os 2 do print. Sem foto de perfil (LGPD). Sem login, o Google mostra só parte dos comentários. Ficaram de fora os que descrevem resultado de tratamento (emagrecimento, composição corporal), por cuidado com a publicidade médica (CFM 2.336/2023), e um de quem disse nunca ter consultado.
- **Endereços:** Fabriciano (R. Dr. Moacir Birro, 325 A — Centro) e Bom Jardim (R. Papoula, 143), tirados das fichas do Google Maps. O do Shopping ganhou rua e andar.

## Versão 3 (24/11/2026)

- **Mascote:** o 3D saiu. Entrou o personagem em PNG (`MASCOTE_3D/CORUJINHA_REFERENCIA_ESTUDIO.png`), com o fundo removido. Ele respira e cumprimenta quando a pessoa escolhe uma área. Saíram também o three.js, o GLB e o carregamento de código 3D.
- **Hero:** retrato maior da Dra. Sheila e um crachá enxuto ("Médica · CRM 76044-MG"). Em volta da foto flutuam atalhos de área (Pediatria, Odontopediatria, Psicologia, Nutrição) que abrem a área direto no seletor. A linha "Cuidado para…" gira, o título entra palavra por palavra e a imagem acompanha levemente o mouse.
- **Ressalva:** a hero e a seção adulta não citam mais a pós-graduação. Pela Resolução CFM 2.336/2023, qualquer citação de pós-graduação lato sensu precisa vir seguida de "NÃO ESPECIALISTA" em caixa alta. Por isso, o card dela na seção de equipe continua com a descrição completa do card original.
- **Seções por cor:** azul (atendimentos), verde (acompanhamento adulto), rosa (urgência e teleconsulta), céu (convênios), pêssego (avaliações) e creme (unidades). Cada faixa sobe sobre a anterior com cantos arredondados e começa com um selo e ícone próprios.
- **Animações:** cada título entra palavra por palavra. O hero sobe com opacidade, as categorias giram em perspectiva, o acompanhamento abre em círculo, as unidades e as avaliações entram em sequência e a central sobe. Os fundos derivam devagar, os atalhos flutuam e as categorias inclinam sob o mouse. Tudo pausa fora da tela e respeita `prefers-reduced-motion`.
- **Avaliações:** só os dois comentários de 5 estrelas do print, como você pediu, com a indicação "Comentários selecionados do Google".
- **Unidades:** quatro cartões com a mesma estrutura (Horário, Telefone, Endereço) e a divergência do Horto numa nota única. A central de agendamento fica numa faixa própria, logo abaixo.
- **Convênios:** a lista ainda não foi obtida (veja as pendências). Quando chegar, basta preencher `convenios.itens` em `config.js`.

## O que mudou na versão 2

- **Seletor de atendimento:** a página abre só com as 17 categorias, cada uma com ícone e rótulo. Ao escolher uma, aparece apenas a equipe daquela área. Só essa área é desenhada na página, e cada profissional aparece uma vez. "Trocar tipo de consulta" fica fixo no topo do painel enquanto se rola, volta às categorias e devolve o foco para a categoria anterior. `Esc` faz o mesmo.
- **Dra. Sheila na primeira dobra**, no celular e no computador, com CTA próprio. O crachá traz CRM 76044-MG, RQE 60126 e "Médica pós graduanda em Nutrologia — NÃO ESPECIALISTA". O RQE não foi ligado a nenhuma especialidade. "À frente do Instituto Corujinhas" vem do seu briefing.
- **Seção "Um acompanhamento que considera você por inteiro"**, com o CTA "Conversar sobre acompanhamento adulto". Sem protocolo, remédio, preço, prazo ou resultado.
- **Teleconsulta, Consulta de urgência e orientação de emergência:** a orientação "Em caso de emergência, ligue 192 ou procure um pronto-socorro" tem um botão separado, **SAMU 192** (`tel:192`).
- **Convênios:** enquanto a lista estiver vazia, aparece "Consulte a cobertura do seu convênio com nossa equipe" e um CTA. Quando os dados chegarem, os itens já se separam em convênio de saúde, parceria empresarial e desconto.
- **Avaliações:** os três trechos do print do Google aparecem como estão, inclusive o de 1 estrela, sem nomes nem nota geral.
- **Identidade:** logo horizontal corrigida, base creme, textos em azul-profundo e as cores da marca em doses pequenas (faixa no topo, tons claros nas categorias, detalhe coração-estetoscópio). Saíram o botão "Reduzir movimento" e as imagens ilustrativas antigas.
- **Abertura:** a logo real é revelada em cerca de 840 ms, uma vez por sessão. A camada não recebe cliques e não espera o 3D. Não aparece ao voltar pelo histórico nem com movimento reduzido no sistema.
- **Mascote:** um único canvas 3D, carregado depois do conteúdo e só quando a seção se aproxima. Faz o "Idle" em repouso e o "Aceno" ao escolher uma área ou ao passar o mouse, com intervalo mínimo entre acenos. Pausa fora da tela e com a aba oculta. O PNG frontal fica como reserva. O GLB não carrega a interface Rigify; ela continua no `.blend` do pacote.
- **Movimento:** cada contexto tem sua entrada (abertura com elevação, categorias com perspectiva, profissionais deslizando, seção adulta com máscara, convênios curtos, avaliações com elevação), todas entre 180 e 360 ms. O `prefers-reduced-motion` do sistema é respeitado sem botão na tela.

## WhatsApp e integração futura

- Todos os botões abrem `wa.me/553123000757` com o texto codificado uma única vez por `encodeURIComponent`. Os textos de profissional, área sem equipe, urgência, teleconsulta, convênio e acompanhamento adulto são os do pacote. A diferença para os links prontos do JSON é só de codificação: o `!` aparece sem `%21`.
- `encaminharPedido(pedido)` (em `mensagens.js`) é o ponto de troca para a futura agenda. `registrarIntencao` guarda a intenção apenas na memória da página (`window.CorujinhasEventos` e o evento `corujinhas:intencao`), sem nome de paciente, dado clínico ou envio externo. **Agenda e automação não estão implementadas.**

## Retratos

- Para 11 profissionais, o site usa as versões reconstruídas por IA do pacote. Comparei uma a uma com os cards e não vi mudança relevante de fisionomia na escala analisada. Isso não garante identidade pixel a pixel, então cada profissional deve aprovar a própria imagem.
- **Aline Nunes Silva:** a versão do pacote afinava o rosto. Usei o retrato enviado por você em 24/11/2026, que está coerente com o card.
- **Kamilla:** a lateral da cabeça foi completada pela IA, porque estava cortada na fonte.
- Todo card tem "Card original" para conferir a peça de divulgação.

## Pendências que dependem do instituto

- **Convênios:** a lista veio do print do destaque. Confirmar regras de cobertura por convênio (o site sempre orienta confirmar com a central). As logos são recortes do print, em baixa resolução; vale pedir os arquivos originais.
- **Pré-cadastro:** confirmar com o instituto se os campos atendem à recepção (ex.: incluir número da carteirinha do convênio).
- **Mais avaliações:** com login no Google pelo navegador do app, dá para ler todas as avaliações de 4 e 5 estrelas, não só as que aparecem sem login.
- Prints e condições de urgência e teleconsulta: quais profissionais, unidades e horários.
- Novos depoimentos (destaque Feedbacks).
- Profissionais além dos 12 cards. Os 4 nomes vistos no feed não foram cadastrados.
- Profissionais nominais de neuropediatria, psicopedagogia, otorrino, psiquiatria adulto, nutrologia e endocrinologia.
- Sigla "CRF 10061" (Adila) e região do "CRP 78522" (Aline), mantidas como nos cards. Nenhum registro foi conferido nos conselhos.
- Horto: o card diz 08h às 20h e (31) 2300-0278; o Google mostrou 22h e (31) 2300-0757. O site exibe a divergência.
- Confirmar os endereços de Fabriciano e Bom Jardim (vindos do Google Maps).
- Aprovação dos retratos reconstruídos pelos próprios profissionais.

## Verificado (Chromium, 1366 px, 700 px e 390 px)

- Estado inicial só com as categorias. Cada uma das 17 áreas mostra exatamente os IDs do JSON, sem duplicata e sem outros cards na página.
- "Trocar tipo de consulta" volta às categorias com o foco na anterior. No celular, fica visível no topo durante a rolagem.
- Os 15 botões de profissional e os 6 das áreas sem equipe têm o mesmo texto dos links do JSON, depois de decodificados. Acompanhamento adulto, urgência, teleconsulta e convênio também foram conferidos.
- SAMU 192 é uma ação separada, com `tel:192`.
- O arraste do mouse rola a fileira sem abrir o WhatsApp, mesmo começando sobre o botão. Setas e teclado funcionam. No toque, o deslize horizontal move só a fileira e o vertical rola a página.
- A abertura monta a logo com as 10 letras, não bloqueia cliques, some em cerca de 1,7 s e não repete na sessão.
- "Agendar consulta" rola até os atendimentos e não abre o WhatsApp.
- Com movimento reduzido, não há abertura nem animação passiva, e as avaliações viram uma lista que rola à mão.
- Mascote animado (quadro parado com movimento reduzido), sem canvas 3D. Sem erros de console e sem rolagem horizontal da página. Atalhos da hero abrem a área certa e a faixa de avaliações só tem 4 ou 5 estrelas, em laço.
- O site **não** foi publicado em domínio próprio. A prévia é privada até ser compartilhada.
