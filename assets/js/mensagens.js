/*
 * Mensagens de WhatsApp — um único ponto de geração.
 *
 * Todos os botões abrem a mesma central (config.central.whatsapp). Só o texto muda.
 * O link é https://wa.me/<numero>?text=<encodeURIComponent(mensagem)>, codificado uma única vez.
 * Abrir o link não envia nada nem confirma vaga: a pessoa ainda precisa enviar a mensagem.
 *
 * PONTO DE INTEGRAÇÃO FUTURA (agenda / automação do WhatsApp — NÃO implementada):
 * `encaminharPedido(pedido)` recebe o pedido estruturado com IDs internos e hoje devolve o link.
 * Uma integração futura pode trocar só esta função. `registrarIntencao` guarda o pedido apenas
 * na memória da página (window.CorujinhasEventos) e dispara o evento "corujinhas:intencao";
 * nada é enviado para fora e nenhum dado clínico é coletado.
 */
(function () {
  const C = window.CORUJINHAS_CONFIG;
  const CENTRAL_WHATSAPP = C.central.whatsapp;
  const ABERTURA = "Olá! Vim pelo site do Instituto Corujinhas";

  const link = (mensagem) => `https://wa.me/${CENTRAL_WHATSAPP}?text=${encodeURIComponent(mensagem)}`;

  // Profissional na área escolhida.
  const criarLinkConsulta = ({ nome, area }) =>
    link(`${ABERTURA} e gostaria de agendar uma consulta com ${nome}, para ${area}. Podem me orientar sobre a disponibilidade?`);

  // Área anunciada sem profissional nominal: pede orientação.
  const criarLinkArea = ({ area }) =>
    link(`${ABERTURA} e gostaria de consultar os profissionais e a disponibilidade para ${area}. Podem me orientar?`);

  // Consulta de urgência, teleconsulta e convênio: textos de ADAPTACAO_SITE/SERVICOS_E_BOTOES.json.
  const criarLinkServico = (intencao) => link(C.servicos[intencao].mensagem);

  const criarLinkAcompanhamento = () => link(C.acompanhamentoAdulto.mensagem);

  // Botão geral. A unidade só entra quando a pessoa escolhe uma preferência.
  const criarLinkGeral = ({ unidade } = {}) =>
    link(`${ABERTURA} e gostaria de agendar uma consulta.${unidade ? ` Tenho preferência pela unidade ${unidade}.` : ""} Podem me orientar sobre os atendimentos e a disponibilidade?`);

  /*
   * pedido:
   *  { tipo: "profissional", profissionalId, areaId, nome, area }
   *  { tipo: "area", areaId, area }
   *  { tipo: "servico", intencao }            // consulta_urgencia | teleconsulta | consultar_convenio
   *  { tipo: "acompanhamento_adulto" }
   *  { tipo: "geral" }
   * Todos aceitam unidadeId/unidade e paciente { nome, tipo, nascimento, cpf, responsavel, atendimento }.
   */
  // Pré-cadastro (opcional): dados de identificação para adiantar o atendimento. Nada clínico.
  function blocoPaciente(p) {
    if (!p) return "";
    const linhas = [`• Paciente: ${p.nome}`];
    if (p.nascimento) {
      const [a, m, d] = p.nascimento.split("-");
      linhas.push(`• Nascimento: ${d}/${m}/${a}${p.tipo ? ` (${p.tipo === "crianca" ? "criança" : "adulto"})` : ""}`);
    }
    if (p.cpf) linhas.push(`• CPF: ${p.cpf}`);
    if (p.responsavel) linhas.push(`• Responsável: ${p.responsavel}`);
    if (p.atendimento) linhas.push(`• Atendimento: ${p.atendimento}`);
    return `\n\nDados para o cadastro:\n${linhas.join("\n")}`;
  }

  function encaminharPedido(pedido) {
    // Unidade escolhida e dados do paciente entram no fim de qualquer mensagem (o botão geral já traz a unidade no texto).
    const sufixo = (pedido.unidade && pedido.tipo !== "geral" ? ` Unidade de preferência: ${pedido.unidade}.` : "") + blocoPaciente(pedido.paciente);
    const comUnidade = (url) => (sufixo ? url + encodeURIComponent(sufixo) : url);
    switch (pedido.tipo) {
      case "profissional": return comUnidade(criarLinkConsulta(pedido));
      case "area": return comUnidade(criarLinkArea(pedido));
      case "servico": return comUnidade(criarLinkServico(pedido.intencao));
      case "acompanhamento_adulto": return comUnidade(criarLinkAcompanhamento());
      default: return criarLinkGeral(pedido);
    }
  }

  const eventos = (window.CorujinhasEventos = []);
  function registrarIntencao(pedido) {
    const registro = { ...pedido, momento: new Date().toISOString() };
    delete registro.nome; // só IDs e rótulos de serviço
    delete registro.paciente; // dados pessoais não entram no registro de intenção
    eventos.push(registro);
    if (eventos.length > 50) eventos.shift();
    window.dispatchEvent(new CustomEvent("corujinhas:intencao", { detail: registro }));
  }

  window.CorujinhasMensagens = {
    CENTRAL_WHATSAPP, criarLinkConsulta, criarLinkArea, criarLinkServico, criarLinkAcompanhamento, criarLinkGeral,
    encaminharPedido, registrarIntencao
  };
})();
