# Instituto de Saúde Corujinhas — site

Site estático (HTML, CSS e JavaScript puro, sem build) do Instituto de Saúde Corujinhas, Ipatinga/MG.
Publicado em https://corujinhas.islandcompany.space pela Vercel.

- `index.html` — página única
- `assets/js/config.js` — dados (profissionais, áreas, convênios, avaliações, unidades)
- `assets/js/mensagens.js` — geração das mensagens de WhatsApp da central
- `assets/js/app.js` — interações (seletor de atendimento, agendamento com pré-cadastro, convênios, unidades)
- `assets/js/mapas.js` — ruas do OpenStreetMap (© colaboradores do OpenStreetMap, ODbL) para os minimapas
- `NOTA_TECNICA.md` — decisões, fontes e pendências

Para editar textos e dados, altere `assets/js/config.js`. Não há banco de dados: o pré-cadastro fica só no aparelho de quem agenda (localStorage).

Feito pela Island Company.
