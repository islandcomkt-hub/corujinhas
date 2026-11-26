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

  /* ---------- Agenda online ---------- */
  const DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
  const dataBR = (iso) => { const [a, m, d] = iso.split("-"); return `${d}/${m}/${a}`; };
  const dataLonga = (iso) => `${DIAS[new Date(iso + "T12:00:00Z").getUTCDay()]}, ${dataBR(iso).slice(0, 5)}`;
  const foneBR = (t) => { const d = String(t || "").replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, ""); return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : d.length === 10 ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}` : d; };

  // Pedido feito pela agenda online: a atendente confere pelo código no painel e confirma.
  // O WhatsApp de quem envia já identifica o contato, então o número não entra no texto.
  function criarLinkAgendamento(r) {
    const p = r.paciente || {};
    const [a, m, d] = (p.nascimento || "--").split("-");
    const crianca = p.tipo === "crianca";
    const linhas = [
      `Olá! 👋 Vim pelo site do Instituto Corujinhas e reservei um horário pela agenda online.`,
      ``,
      `🔖 *Código:* ${r.codigo}`,
      ``,
      `📅 *Consulta*`,
      `Profissional: ${r.profissional}${r.area ? ` (${r.area})` : ""}`,
      `Data: ${dataLonga(r.data)}/${r.data.slice(0, 4)} às ${r.hora}`,
      `Unidade: ${r.unidade}`,
      ``,
      `${crianca ? "🧒" : "🙂"} *Paciente*`,
      `Nome: ${p.nome}`,
      p.nascimento ? `Nascimento: ${d}/${m}/${a} (${crianca ? "criança" : "adulto"})` : null,
      p.cpf ? `CPF: ${p.cpf}` : null,
      p.responsavel ? `Responsável: ${p.responsavel}` : null,
      p.atendimento ? `Atendimento: ${p.atendimento}` : null,
      ``,
      `Podem confirmar, por favor? 😊`
    ];
    return link(linhas.filter((l) => l !== null).join("\n"));
  }
  function criarLinkCancelamento(r) {
    const linhas = [
      `Olá! Vim pelo site do Instituto Corujinhas.`,
      ``,
      `❌ *Cancelei um agendamento*`,
      `🔖 Código: ${r.codigo}`,
      r.paciente ? `Paciente: ${r.paciente}` : null,
      `Profissional: ${r.profissional}`,
      `Data: ${dataLonga(r.data)} às ${r.hora}`,
      `Unidade: ${r.unidade}`,
      ``,
      `O horário já foi liberado na agenda. Obrigado! 🙏`
    ];
    return link(linhas.filter((l) => l !== null).join("\n"));
  }
  // Painel: mensagem da equipe para o WhatsApp do paciente.
  const criarLinkPaciente = (telefone, texto) => {
    let d = String(telefone || "").replace(/\D/g, "");
    if (d.length <= 11) d = "55" + d;
    return `https://wa.me/${d}?text=${encodeURIComponent(texto)}`;
  };

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
    encaminharPedido, registrarIntencao,
    criarLinkAgendamento, criarLinkCancelamento, criarLinkPaciente, util: { dataBR, dataLonga, foneBR, DIAS }
  };
})();
