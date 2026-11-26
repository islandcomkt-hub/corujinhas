/*
 * Instituto Corujinhas — apresentação e interações (versão 2).
 * Dados: CORUJINHAS_CONFIG (config.js). Links: CorujinhasMensagens (mensagens.js).
 * Só a área escolhida é renderizada; o restante da página não é refeito.
 */
{
  const C = window.CORUJINHAS_CONFIG;
  const M = window.CorujinhasMensagens;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const movimentoReduzido = window.matchMedia("(prefers-reduced-motion: reduce)");
  const comportamento = () => (movimentoReduzido.matches ? "auto" : "smooth");
  const ehMouse = (e) => e.pointerType === "mouse";

  /* Liga um link ao pedido. O href já vem pronto (funciona sem JS); no clique, abre o mini card de unidade. */
  const pedidos = new WeakMap();
  function ligar(a, pedido) {
    a.href = M.encaminharPedido(pedido);
    pedidos.set(a, pedido);
  }
  const icone = (id, extra = "") => `<span class="icone ${extra}" data-icone="${esc(id)}" aria-hidden="true"></span>`;
  const contagem = (n) => (n === 0 ? "Fale com a central" : n === 1 ? "1 profissional" : `${n} profissionais`);
  const descricaoHTML = (d) => esc(d).replace("NÃO ESPECIALISTA", "<b>NÃO ESPECIALISTA</b>");

  /* ---------- Links fixos ---------- */
  // "Agendar consulta" da hero leva à escolha do atendimento (não abre o WhatsApp direto).
  $("#cta-agendar").addEventListener("click", (e) => {
    e.preventDefault();
    $("#atendimentos").scrollIntoView({ behavior: comportamento(), block: "start" });
    setTimeout(() => ($(".cat", categorias) || {}).focus?.({ preventScroll: true }), movimentoReduzido.matches ? 0 : 600);
  });
  ligar($("#cta-adulto"), { tipo: "acompanhamento_adulto" });
  ligar($("#cta-urgencia"), { tipo: "servico", intencao: "consulta_urgencia" });
  ligar($("#cta-teleconsulta"), { tipo: "servico", intencao: "teleconsulta" });

  function atualizarLinksGerais() {
    $$("[data-link-geral]").forEach((a) => ligar(a, { tipo: "geral" }));
  }

  /* ---------- Agendamento: unidade + paciente (pré-cadastro guardado só neste aparelho) ---------- */
  const dlg = $("#agendar");
  const form = $("#agenda-form");
  const CHAVE_PAC = "corujinhas-pacientes-v1", CHAVE_UNI = "corujinhas-unidade";
  const ler = (k, padrao) => { try { const v = localStorage.getItem(k); return v == null ? padrao : JSON.parse(v); } catch { return padrao; } };
  const gravar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };
  const apagar = (k) => { try { localStorage.removeItem(k); } catch { /* sem armazenamento */ } };
  let pacientes = ler(CHAVE_PAC, []);
  if (!Array.isArray(pacientes)) pacientes = [];
  // minimização de dados: cadastro salvo vale por até 12 meses neste aparelho; depois é descartado
  const VALIDADE = 365 * 24 * 60 * 60 * 1000;
  const validos = pacientes.filter((p) => p && typeof p.nome === "string" && (!p.salvoEm || Date.now() - p.salvoEm < VALIDADE));
  if (validos.length !== pacientes.length) { pacientes = validos; gravar(CHAVE_PAC, pacientes); }
  let pedidoAtual = null, origemAgenda = null;
  let unidadeId = ler(CHAVE_UNI, "");

  // Agenda online (agenda-api.js). "whatsapp" = fluxo antigo; "online" = escolhe dia e horário; "escolher" = falta escolher o profissional.
  const A = window.CorujinhasAgenda || { ativo: false };
  let fluxo = "whatsapp", ag = null;
  const profsOnline = A.ativo ? A.profissionais().then((l) => new Map(l.map((p) => [p.id, p]))).catch(() => new Map()) : Promise.resolve(null);
  let ajustes = { duracao_min: 30, tolerancia_min: 15, horizonte_dias: 60 };
  if (A.ativo) {
    document.documentElement.dataset.agenda = A.modo;
    A.ajustes().then((a) => { if (a) ajustes = { ...ajustes, ...a }; }).catch(() => {});
  }

  function rotuloPedido(p) {
    if (p.tipo === "profissional") return `${p.nome} · ${p.area}`;
    if (p.tipo === "area") return p.area;
    if (p.tipo === "servico") return C.servicos[p.intencao].rotulo;
    if (p.tipo === "acompanhamento_adulto") return "Acompanhamento adulto";
    return "Central de agendamento";
  }
  const unidadeAtual = () => C.unidades.find((u) => u.id === unidadeId) || null;
  const idade = (iso) => {
    if (!iso) return null;
    const n = new Date(iso + "T12:00:00"), h = new Date();
    let a = h.getFullYear() - n.getFullYear();
    if (h.getMonth() < n.getMonth() || (h.getMonth() === n.getMonth() && h.getDate() < n.getDate())) a--;
    return a;
  };
  const textoIdade = (a) => (a == null || a < 0 ? "" : a === 0 ? "menos de 1 ano" : a === 1 ? "1 ano" : `${a} anos`);
  const linkPara = (pac) => {
    const u = unidadeAtual();
    return M.encaminharPedido({ ...pedidoAtual, ...(u ? { unidadeId: u.id, unidade: u.nome } : {}), paciente: pac ? { ...pac } : undefined });
  };

  function renderUnidadesChips() {
    const op = [...C.unidades.map((u) => [u.id, u.nome.replace("Shopping Vale do Aço", "Shopping")]), ["", "Qualquer unidade"]];
    $("#agenda-unidades").innerHTML = op.map(([id, nome]) => `
      <label class="chip-uni" data-cor="${esc(C.unidades.find((u) => u.id === id)?.cor || "neutro")}">
        <input type="radio" name="agenda-unidade" value="${esc(id)}" ${id === unidadeId ? "checked" : ""}><span>${esc(nome)}</span></label>`).join("");
  }
  function renderPacientes() {
    const lista = $("#agenda-pacientes");
    const online = fluxo !== "whatsapp";
    lista.innerHTML = pacientes.map((p, i) => {
      const meta = [p.tipo === "crianca" ? "Criança" : "Adulto", textoIdade(idade(p.nascimento)), p.atendimento].filter(Boolean).join(" · ");
      if (online) return `<li style="--i:${i}">
        <button type="button" class="paciente" data-paciente="${esc(p.id)}">
          <span class="paciente__avatar" data-tipo="${esc(p.tipo)}" aria-hidden="true">${esc(p.nome.trim().charAt(0).toUpperCase())}</span>
          <span class="paciente__txt"><strong>${esc(p.nome)}</strong><small>${esc(meta)}</small></span>
          <span class="paciente__ir paciente__ir--agenda"><svg aria-hidden="true"><use href="#i-agenda"/></svg>Escolher horário</span>
        </button>
        <button type="button" class="paciente__remover" data-remover="${esc(p.id)}" aria-label="Remover ${esc(p.nome)} deste aparelho">×</button>
      </li>`;
      return `<li style="--i:${i}">
        <a class="paciente" href="${esc(linkPara(p))}" target="_blank" rel="noopener noreferrer" data-paciente="${esc(p.id)}">
          <span class="paciente__avatar" data-tipo="${esc(p.tipo)}" aria-hidden="true">${esc(p.nome.trim().charAt(0).toUpperCase())}</span>
          <span class="paciente__txt"><strong>${esc(p.nome)}</strong><small>${esc(meta)}</small></span>
          <span class="paciente__ir"><svg aria-hidden="true"><use href="#i-wa"/></svg>Agendar</span>
        </a>
        <button type="button" class="paciente__remover" data-remover="${esc(p.id)}" aria-label="Remover ${esc(p.nome)} deste aparelho">×</button>
      </li>`;
    }).join("");
    $("[data-apagar]", dlg).hidden = !pacientes.length;
  }
  function mostrarEtapa(nome) {
    $$(".agenda__etapa", dlg).forEach((e) => (e.hidden = e.dataset.etapa !== nome));
    const etapa = $(`[data-etapa="${nome}"]`, dlg);
    etapa.classList.remove("agenda__etapa--entra"); void etapa.offsetWidth; etapa.classList.add("agenda__etapa--entra");
    $("[data-voltar]", form).hidden = !pacientes.length;
    const alvo = { cadastro: () => $('[name="tipo"]:checked', form) || $('[name="tipo"]', form), pacientes: () => $(".paciente", dlg),
      profissional: () => $(".prof-op", dlg), horario: () => $(".ag-uni input:checked, .ag-uni input", dlg), pronto: () => $(".ag-pronto__titulo", dlg) }[nome];
    setTimeout(() => alvo?.()?.focus({ preventScroll: nome !== "pronto" }), 30);
    $(".agenda__caixa", dlg).scrollTop = 0;
  }
  function preencherAtendimento() {
    const conv = C.convenios.itens.filter((i) => i.categoria === "convenio"), parc = C.convenios.itens.filter((i) => i.categoria === "parceria");
    $("#agenda-atendimento").innerHTML = `<option value="Particular">Particular</option>
      <optgroup label="Convênios">${conv.map((i) => `<option value="Convênio ${esc(i.nome)}">${esc(i.nome)}</option>`).join("")}</optgroup>
      <optgroup label="Parcerias">${parc.map((i) => `<option value="${esc(i.nome)}">${esc(i.nome)}</option>`).join("")}</optgroup>
      <option value="Outro convênio (informo na conversa)">Outro convênio</option>`;
  }
  // Qual profissional o pedido já traz (card da equipe, área, acompanhamento adulto).
  function profDoPedido(p) {
    if (p.tipo === "profissional") return { id: p.profissionalId, areaId: p.areaId, area: p.area };
    if (p.tipo === "acompanhamento_adulto") {
      const a = C.areas.find((x) => x.id === "acompanhamento_adulto");
      return { id: C.destaque.profissional, areaId: a?.id || "", area: a?.titulo || "" };
    }
    return null;
  }
  function aplicarFluxo() {
    const on = fluxo !== "whatsapp";
    $(".agenda__unidades", dlg).hidden = on;
    $$("[data-so-online]", form).forEach((e) => (e.hidden = !on));
    $("[data-enviar]", form).innerHTML = on
      ? `<svg aria-hidden="true"><use href="#i-agenda"/></svg><span>Agendar agora</span>`
      : `<svg aria-hidden="true"><use href="#i-wa"/></svg><span>Salvar e agendar consulta</span>`;
    $("[data-priv]", dlg).textContent = on
      ? "Os dados de identificação vão para a agenda do instituto, só para marcar e confirmar a consulta. Nada de informação clínica."
      : "Os dados ficam só neste aparelho e vão na mensagem do WhatsApp, que você revisa antes de enviar.";
    $$("[data-demo]").forEach((e) => (e.hidden = A.modo !== "demo"));
  }
  async function abrirAgenda(a, pedido, uniFixa) {
    origemAgenda = a; pedidoAtual = pedido;
    if (uniFixa !== undefined) unidadeId = uniFixa;
    fluxo = "whatsapp"; ag = null;
    const online = A.ativo ? await Promise.race([profsOnline, new Promise((ok) => setTimeout(() => ok(null), 2500))]) : null;
    const alvo = profDoPedido(pedido);
    if (online && alvo && online.has(alvo.id)) {
      fluxo = "online";
      ag = { prof: { id: alvo.id, nome: online.get(alvo.id).nome }, areaId: alvo.areaId, area: alvo.area, uniFixa: uniFixa || "" };
    } else if (online && online.size && pedido.tipo === "geral") fluxo = "escolher";
    $("#agenda-contexto").textContent = rotuloPedido(pedido);
    aplicarFluxo();
    renderUnidadesChips(); renderPacientes();
    form.reset(); atualizarTipo(); $("#agenda-erro").textContent = "";
    if (typeof dlg.showModal === "function") { if (!dlg.open) dlg.showModal(); } else dlg.setAttribute("open", "");
    if (fluxo === "escolher") { renderProfs(online, uniFixa || ""); mostrarEtapa("profissional"); }
    else mostrarEtapa(pacientes.length ? "pacientes" : "cadastro");
  }
  function renderProfs(mapa, uniFixa) {
    const itens = [];
    mapa.forEach((p) => p.areas.forEach((areaId) => {
      const area = C.areas.find((a) => a.id === areaId);
      if (area) itens.push({ p, area });
    }));
    $("#agenda-profs").innerHTML = itens.map(({ p, area }, i) => {
      const foto = C.profissionais[p.id]?.retrato;
      return `<li style="--i:${i}"><button type="button" class="prof-op" data-prof="${esc(p.id)}" data-prof-area="${esc(area.id)}" data-uni-fixa="${esc(uniFixa)}">
        ${foto ? `<img src="${esc(foto)}" alt="" width="48" height="48" loading="lazy">` : `<span class="paciente__avatar" aria-hidden="true">${esc(p.nome.replace(/^Dra?\.\s*/, "").charAt(0))}</span>`}
        <span class="paciente__txt"><strong>${esc(p.nome)}</strong><small>${esc(area.rotulo.replace(/\u00ad/g, ""))}</small></span>
        <svg class="prof-op__seta" aria-hidden="true"><use href="#i-seta"/></svg></button></li>`;
    }).join("");
    $("[data-central]", dlg).href = M.criarLinkGeral(uniFixa ? { unidade: C.unidades.find((u) => u.id === uniFixa)?.nome } : {});
  }

  // CPF: máscara e dígitos verificadores
  const soDigitos = (v) => v.replace(/\D/g, "");
  const mascaraCPF = (v) => soDigitos(v).slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  function cpfValido(v) {
    const c = soDigitos(v);
    if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
    const dv = (n) => { let s = 0; for (let i = 0; i < n; i++) s += +c[i] * (n + 1 - i); const r = (s * 10) % 11; return r === 10 ? 0 : r; };
    return dv(9) === +c[9] && dv(10) === +c[10];
  }
  form.cpf.addEventListener("input", () => { form.cpf.value = mascaraCPF(form.cpf.value); });
  const mascaraFone = (v) => { const d = soDigitos(v).slice(0, 11); return d.length > 10 ? d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3") : d.replace(/(\d{2})(\d{0,4})(\d{0,4})/, (m, a, b, c) => `(${a}) ${b}${c ? "-" + c : ""}`).replace(/[\s(-]+$/, ""); };
  form.telefone.addEventListener("input", () => { form.telefone.value = mascaraFone(form.telefone.value); });
  function atualizarTipo() {
    const crianca = form.tipo.value === "crianca";
    $("[data-so-crianca]", form).hidden = !crianca;
    $("[data-cpf-opcional]", form).hidden = !crianca;
  }
  form.addEventListener("change", (e) => { if (e.target.name === "tipo") atualizarTipo(); });

  function validar() {
    const f = form, erros = [];
    const marcar = (el, ok) => el.closest(".campo, .agenda__tipo")?.classList.toggle("campo--erro", !ok);
    const tipo = f.tipo.value;
    marcar($(".agenda__tipo input", f), !!tipo); if (!tipo) erros.push("Escolha se é criança ou adulto.");
    const nome = f.nome.value.trim().replace(/\s+/g, " ");
    const nomeOk = nome.split(" ").length >= 2 && nome.length >= 5; marcar(f.nome, nomeOk); if (!nomeOk) erros.push("Informe o nome completo do paciente.");
    const id = idade(f.nascimento.value); const nascOk = id != null && id >= 0 && id < 120; marcar(f.nascimento, nascOk); if (!nascOk) erros.push("Informe a data de nascimento.");
    const cpf = f.cpf.value.trim(); const cpfOk = cpf ? cpfValido(cpf) : tipo === "crianca"; marcar(f.cpf, cpfOk);
    if (!cpfOk) erros.push(cpf ? "Confira o CPF." : "Informe o CPF do paciente.");
    const resp = f.responsavel.value.trim(); const respOk = tipo !== "crianca" || resp.split(/\s+/).length >= 2; marcar(f.responsavel, respOk);
    if (!respOk) erros.push("Informe o nome do responsável.");
    if (tipo === "crianca" && id != null && id >= 18) erros.push("Pela data de nascimento, o paciente é adulto. Confira o tipo.");
    const tel = soDigitos(f.telefone.value); const telOk = fluxo === "whatsapp" ? !tel || tel.length >= 10 : tel.length === 10 || tel.length === 11;
    marcar(f.telefone, telOk); if (!telOk) erros.push("Informe um WhatsApp com DDD para a confirmação.");
    $("#agenda-erro").textContent = erros[0] || "";
    if (erros.length) { $(".campo--erro input, .campo--erro select", f)?.focus(); return null; }
    return { id: `p${Date.now().toString(36)}`, tipo, nome, nascimento: f.nascimento.value, cpf: cpf ? mascaraCPF(cpf) : "", responsavel: tipo === "crianca" ? resp : "", atendimento: f.atendimento.value, telefone: tel ? mascaraFone(tel) : "" };
  }
  function abrirWhatsApp(url) {
    // abre em nova aba sem dar à página do WhatsApp acesso a esta (opener zerado);
    // só navega na própria aba se o navegador bloquear a nova
    const w = window.open(url, "_blank");
    if (w) { try { w.opener = null; } catch { /* já isolada */ } } else location.href = url;
    const aviso = $("#aviso-wa");
    aviso.textContent = "Abrindo o WhatsApp da central com a mensagem pronta…";
    aviso.classList.add("aviso-wa--on"); setTimeout(() => aviso.classList.remove("aviso-wa--on"), 3200);
  }
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const pac = validar();
    if (!pac) return;
    if (form.lembrar.checked) {
      const igual = pacientes.findIndex((p) => p.nome.toLowerCase() === pac.nome.toLowerCase() && p.nascimento === pac.nascimento);
      const registro = { ...pac, salvoEm: Date.now() };
      if (igual >= 0) pacientes[igual] = { ...registro, id: pacientes[igual].id }; else pacientes.push(registro);
      gravar(CHAVE_PAC, pacientes);
    }
    if (fluxo !== "whatsapp") return iniciarHorario(pac);
    const url = linkPara(pac);
    M.registrarIntencao({ ...pedidoAtual, unidadeId: unidadeId || null, cadastro: true });
    abrirWhatsApp(url);
    dlg.close();
  });
  dlg.addEventListener("change", (e) => {
    if (e.target.name === "ag-uni") return escolherUnidade(e.target.value);
    if (e.target.name !== "agenda-unidade") return;
    unidadeId = e.target.value; gravar(CHAVE_UNI, unidadeId);
    $$(".paciente", dlg).forEach((a) => { a.href = linkPara(pacientes.find((p) => p.id === a.dataset.paciente)); });
  });
  dlg.addEventListener("click", (e) => {
    if (e.target === dlg || e.target.closest("[data-fechar]")) return dlg.close();
    if (e.target.closest("[data-novo]")) return mostrarEtapa("cadastro");
    if (e.target.closest("[data-voltar]")) return mostrarEtapa("pacientes");
    const rem = e.target.closest("[data-remover]");
    if (rem) {
      pacientes = pacientes.filter((p) => p.id !== rem.dataset.remover); gravar(CHAVE_PAC, pacientes); renderPacientes();
      if (!pacientes.length) mostrarEtapa("cadastro");
      return;
    }
    if (e.target.closest("[data-apagar]")) { pacientes = []; apagar(CHAVE_PAC); renderPacientes(); return mostrarEtapa("cadastro"); }
    // ----- agenda online -----
    const po = e.target.closest("[data-prof]");
    if (po) {
      const area = C.areas.find((a) => a.id === po.dataset.profArea);
      profsOnline.then((mapa) => {
        const p = mapa.get(po.dataset.prof);
        fluxo = "online"; ag = { prof: { id: p.id, nome: p.nome }, areaId: area.id, area: area.titulo, uniFixa: po.dataset.uniFixa };
        $("#agenda-contexto").textContent = `${p.nome} · ${area.titulo}`;
        aplicarFluxo(); renderPacientes(); mostrarEtapa(pacientes.length ? "pacientes" : "cadastro");
      });
      return;
    }
    const pb = e.target.closest("button.paciente");
    if (pb) {
      const p = pacientes.find((x) => x.id === pb.dataset.paciente);
      if (!p.telefone) { // cadastro antigo, sem WhatsApp: completa antes
        form.reset();
        form.tipo.value = p.tipo; atualizarTipo();
        ["nome", "nascimento", "cpf", "responsavel", "atendimento"].forEach((k) => { if (p[k]) form[k].value = p[k]; });
        mostrarEtapa("cadastro"); setTimeout(() => form.telefone.focus(), 60);
        $("#agenda-erro").textContent = "Falta só o WhatsApp para a confirmação.";
        return;
      }
      return iniciarHorario(p);
    }
    if (e.target.closest("[data-ag-voltar]")) return mostrarEtapa(pacientes.length ? "pacientes" : "cadastro");
    if (e.target.closest("[data-ag-confirmar]")) return confirmarHorario();
    const mes = e.target.closest("[data-mes]"); if (mes) return mudarMes(+mes.dataset.mes);
    const dia = e.target.closest("[data-dia]"); if (dia) return escolherDia(dia.dataset.dia);
    const hora = e.target.closest("[data-hora]"); if (hora) return escolherHora(hora.dataset.hora);
    if (e.target.closest("[data-abrir-meus]")) { dlg.close(); return abrirMeus(); }
    const pac = e.target.closest("a.paciente");
    if (pac) {
      M.registrarIntencao({ ...pedidoAtual, unidadeId: unidadeId || null, pacienteSalvo: true });
      setTimeout(() => dlg.close(), 80);
    }
  });
  dlg.addEventListener("close", () => origemAgenda?.focus({ preventScroll: true }));
  preencherAtendimento();

  /* ---------- Agenda online: unidade → dia → horário → confirmar ---------- */
  const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  const DSEM = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const somaMin = (h, m) => { const [a, b] = h.split(":").map(Number), t = a * 60 + b + m; return `${String(Math.floor(t / 60) % 24).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`; };
  const listaDias = (dias) => { const n = dias.map((d) => DSEM[d]); return n.length > 1 ? `${n.slice(0, -1).join(", ")} e ${n.at(-1)}` : n[0] || ""; };
  const dataExtenso = (iso) => { const [a, m, d] = iso.split("-").map(Number); return `${M.util.DIAS[A.util.diaSemana(iso)]}, ${d} de ${MESES[m - 1]}`; };
  const agErro = (t) => { $("#ag-erro").textContent = t || ""; };
  let carga = 0;

  function renderQuem() {
    const p = ag.paciente;
    $("#ag-quem").innerHTML = `
      <span class="paciente__avatar" data-tipo="${esc(p.tipo)}" aria-hidden="true">${esc(p.nome.trim().charAt(0).toUpperCase())}</span>
      <span class="ag__quem-txt"><strong>${esc(p.nome)}</strong><small>com ${esc(ag.prof.nome)} · ${esc(ag.area)}</small></span>`;
  }
  async function iniciarHorario(pac) {
    ag.paciente = pac; ag.unidade = null; ag.dia = null; ag.hora = null; ag.unis = [];
    renderQuem(); agErro("");
    $("[data-ag-cal]", dlg).hidden = true; $("[data-ag-horas]", dlg).hidden = true; $("#ag-resumo").hidden = true;
    $("[data-ag-confirmar]", dlg).disabled = true;
    $("#ag-unidades").innerHTML = `<p class="ag__carregando">Carregando a agenda…</p>`;
    mostrarEtapa("horario");
    try {
      const unis = await A.unidades(ag.prof.id);
      ag.unis = unis;
      if (!unis.length) {
        $("#ag-unidades").innerHTML = `<p class="ag__vazio">A agenda online deste profissional ainda não foi liberada.
          <a href="${esc(M.encaminharPedido({ ...pedidoAtual, paciente: pac }))}" target="_blank" rel="noopener noreferrer">Agendar pela central</a></p>`;
        return;
      }
      $("#ag-unidades").innerHTML = unis.map((u, i) => `
        <label class="ag-uni" style="--i:${i}" data-cor="${esc(C.unidades.find((x) => x.id === u.unidade_id)?.cor || "neutro")}">
          <input type="radio" name="ag-uni" value="${esc(u.unidade_id)}">
          <span><strong>${esc(u.nome)}</strong><small>${esc(listaDias(u.dias))}</small></span>
        </label>`).join("");
      const pref = [ag.uniFixa, unidadeId].find((id) => id && unis.some((u) => u.unidade_id === id)) || (unis.length === 1 ? unis[0].unidade_id : "");
      if (pref) escolherUnidade(pref);
      setTimeout(() => $(".ag-uni input:checked, .ag-uni input", dlg)?.focus({ preventScroll: true }), 40);
    } catch (e) { $("#ag-unidades").innerHTML = ""; agErro(A.mensagemErro(e)); }
  }
  function escolherUnidade(id) {
    ag.unidade = id; ag.dia = null; ag.hora = null;
    const r = $(`.ag-uni input[value="${CSS.escape(id)}"]`, dlg); if (r) r.checked = true;
    unidadeId = id; gravar(CHAVE_UNI, unidadeId);
    $("[data-ag-cal]", dlg).hidden = false; $("[data-ag-horas]", dlg).hidden = true; $("#ag-resumo").hidden = true;
    $("[data-ag-confirmar]", dlg).disabled = true; agErro("");
    ag.mes = A.util.hojeSP().slice(0, 7);
    carregarMes(true);
  }
  const limiteAgenda = () => A.util.somaDias(A.util.hojeSP(), ajustes.horizonte_dias);
  const proxMes = (ym, n) => { let [a, m] = ym.split("-").map(Number); m += n; if (m > 12) { m = 1; a++; } if (m < 1) { m = 12; a--; } return `${a}-${String(m).padStart(2, "0")}`; };
  const fimDoMes = (ym) => { const [a, m] = ym.split("-").map(Number); return `${ym}-${String(new Date(Date.UTC(a, m, 0)).getUTCDate()).padStart(2, "0")}`; };
  function mudarMes(n) { ag.mes = proxMes(ag.mes, n); carregarMes(false); }
  async function carregarMes(auto) {
    const minha = ++carga, hoje = A.util.hojeSP(), lim = limiteAgenda();
    const de = `${ag.mes}-01` < hoje ? hoje : `${ag.mes}-01`, ate = fimDoMes(ag.mes) > lim ? lim : fimDoMes(ag.mes);
    renderCal(null);
    let dias = [];
    try { if (de <= ate) dias = await A.dias(ag.prof.id, ag.unidade, de, ate); }
    catch (e) { agErro(A.mensagemErro(e)); }
    if (minha !== carga) return;
    if (auto && !dias.some((d) => d.livres > 0) && `${proxMes(ag.mes, 1)}-01` <= lim) { ag.mes = proxMes(ag.mes, 1); return carregarMes(false); }
    renderCal(dias);
  }
  function renderCal(dias) {
    const [a, m] = ag.mes.split("-").map(Number), hoje = A.util.hojeSP(), lim = limiteAgenda();
    $("#ag-mes").textContent = `${MESES[m - 1].charAt(0).toUpperCase()}${MESES[m - 1].slice(1)} de ${a}`;
    $('[data-mes="-1"]', dlg).disabled = ag.mes <= hoje.slice(0, 7);
    $('[data-mes="1"]', dlg).disabled = `${proxMes(ag.mes, 1)}-01` > lim;
    const mapa = new Map((dias || []).map((d) => [typeof d.data === "string" ? d.data.slice(0, 10) : d.data, d.livres]));
    const total = Number(fimDoMes(ag.mes).slice(8)), vazio = A.util.diaSemana(`${ag.mes}-01`);
    let html = "<span></span>".repeat(vazio);
    for (let d = 1; d <= total; d++) {
      const iso = `${ag.mes}-${String(d).padStart(2, "0")}`, livres = mapa.get(iso);
      const hojeCls = iso === hoje ? " ag-dia--hoje" : "";
      if (!dias) html += `<span class="ag-dia ag-dia--carrega${hojeCls}">${d}</span>`;
      else if (livres > 0) html += `<button type="button" class="ag-dia ag-dia--livre${hojeCls}${iso === ag.dia ? " ag-dia--sel" : ""}" data-dia="${iso}" aria-pressed="${iso === ag.dia}"
          aria-label="${esc(dataExtenso(iso))}, ${livres} ${livres === 1 ? "horário" : "horários"}">${d}<i aria-hidden="true"></i></button>`;
      else if (livres === 0 && iso >= hoje) html += `<span class="ag-dia ag-dia--lotado${hojeCls}" title="Sem horários">${d}</span>`;
      else html += `<span class="ag-dia ag-dia--fora${hojeCls}">${d}</span>`;
    }
    $("#ag-cal").innerHTML = html;
    if (dias && !dias.some((x) => x.livres > 0)) $("#ag-cal").insertAdjacentHTML("beforeend", `<p class="ag__semvaga">Sem horários livres neste mês nesta unidade.</p>`);
  }
  async function escolherDia(iso) {
    ag.dia = iso; ag.hora = null; agErro("");
    $$(".ag-dia--livre", dlg).forEach((b) => { const on = b.dataset.dia === iso; b.classList.toggle("ag-dia--sel", on); b.setAttribute("aria-pressed", on); });
    const bloco = $("[data-ag-horas]", dlg); bloco.hidden = false;
    $("#ag-resumo").hidden = true; $("[data-ag-confirmar]", dlg).disabled = true;
    $("#ag-dia-rot").textContent = `3. Horário · ${dataExtenso(iso)}`;
    $("#ag-horas").innerHTML = `<p class="ag__carregando">Buscando horários…</p>`;
    $("#ag-nota").textContent = `Cada consulta dura cerca de ${ajustes.duracao_min} min. O horário pode atrasar até ${ajustes.tolerancia_min} min.`;
    const minha = ++carga;
    let horas = [];
    try { horas = await A.horarios(ag.prof.id, ag.unidade, iso); } catch (e) { agErro(A.mensagemErro(e)); }
    if (minha !== carga) return;
    if (!horas.length) { $("#ag-horas").innerHTML = `<p class="ag__vazio">Os horários deste dia acabaram de ser preenchidos. Escolha outro dia.</p>`; return; }
    const grupos = [["Manhã", (h) => h < "12:00"], ["Tarde", (h) => h >= "12:00" && h < "18:00"], ["Noite", (h) => h >= "18:00"]];
    $("#ag-horas").innerHTML = grupos.map(([nome, f]) => {
      const hs = horas.filter(f); if (!hs.length) return "";
      return `<div class="ag__grupo"><span class="ag__grupo-nome">${nome}</span><div class="ag__lista">${hs.map((h, i) => `
        <button type="button" class="ag-hora" style="--i:${i}" data-hora="${h}" aria-pressed="false" aria-label="${h}, pode atrasar até ${somaMin(h, ajustes.tolerancia_min)}">
          <strong>${h}</strong><small>até ${somaMin(h, ajustes.tolerancia_min)}</small></button>`).join("")}</div></div>`;
    }).join("");
    if (!movimentoReduzido.matches) bloco.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
  function escolherHora(h) {
    ag.hora = h; agErro("");
    $$(".ag-hora", dlg).forEach((b) => { const on = b.dataset.hora === h; b.classList.toggle("ag-hora--sel", on); b.setAttribute("aria-pressed", on); });
    const u = ag.unis.find((x) => x.unidade_id === ag.unidade), uc = C.unidades.find((x) => x.id === ag.unidade);
    const res = $("#ag-resumo");
    res.innerHTML = `
      <p class="ag__resumo-quando"><strong>${esc(dataExtenso(ag.dia))}</strong><span>${esc(h)}</span></p>
      <ul>
        <li><span>Paciente</span>${esc(ag.paciente.nome)}</li>
        <li><span>Profissional</span>${esc(ag.prof.nome)} · ${esc(ag.area)}</li>
        <li><span>Unidade</span>${esc(u.nome)}${uc?.enderecoCurto ? ` — ${esc(uc.enderecoCurto)}` : ""}</li>
      </ul>
      <p class="ag__tolerancia">O atendimento começa às ${esc(h)} e pode atrasar até ${esc(somaMin(h, ajustes.tolerancia_min))}.</p>`;
    res.hidden = false; res.classList.remove("ag__resumo--entra"); void res.offsetWidth; res.classList.add("ag__resumo--entra");
    $("[data-ag-confirmar]", dlg).disabled = false;
    if (!movimentoReduzido.matches) res.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
  async function confirmarHorario() {
    if (!ag?.hora) return;
    const btn = $("[data-ag-confirmar]", dlg), p = ag.paciente, u = ag.unis.find((x) => x.unidade_id === ag.unidade);
    btn.disabled = true; btn.classList.add("btn--carregando"); agErro("");
    try {
      const r = await A.criar({
        profissional_id: ag.prof.id, area_id: ag.areaId, area: ag.area, unidade_id: ag.unidade, data: ag.dia, hora: ag.hora,
        paciente_nome: p.nome, paciente_tipo: p.tipo, nascimento: p.nascimento, cpf: p.cpf || "", responsavel: p.responsavel || "",
        telefone: p.telefone, atendimento: p.atendimento || "Particular"
      });
      const info = { codigo: r.codigo, profissional: ag.prof.nome, area: ag.area, unidade: u.nome, data: ag.dia, hora: ag.hora, paciente: { ...p } };
      salvarMeu({ codigo: r.codigo, nascimento: p.nascimento, paciente: p.nome, profissional: ag.prof.nome, area: ag.area, unidade: u.nome, data: ag.dia, hora: ag.hora, status: r.status || "solicitado" });
      let url = M.criarLinkAgendamento(info);
      if (A.modo === "demo") url = url.replace("text=", "text=" + encodeURIComponent("🧪 *TESTE DA AGENDA ONLINE — desconsiderar*\n\n"));
      M.registrarIntencao({ ...pedidoAtual, unidadeId: ag.unidade, agendaOnline: true });
      mostrarPronto(info, url);
      const w = window.open(url, "_blank"); if (w) { try { w.opener = null; } catch { /* */ } }
    } catch (e) {
      agErro(A.mensagemErro(e));
      if (e.codigo === "HORARIO_INDISPONIVEL") { escolherDia(ag.dia); carregarMes(false); }
    } finally { btn.classList.remove("btn--carregando"); btn.disabled = !ag?.hora; }
  }
  function mostrarPronto(info, url) {
    $("#ag-codigo").textContent = info.codigo;
    $("#ag-pronto-info").innerHTML = `
      <li><span>Paciente</span>${esc(info.paciente.nome)}</li>
      <li><span>Quando</span>${esc(dataExtenso(info.data))} às ${esc(info.hora)}</li>
      <li><span>Com</span>${esc(info.profissional)} · ${esc(info.area)}</li>
      <li><span>Onde</span>Unidade ${esc(info.unidade)}</li>
      <li><span>Situação</span>Aguardando confirmação da central</li>`;
    $("#ag-pronto-wa").href = url;
    ag.hora = null;
    mostrarEtapa("pronto");
  }

  /* ---------- Meus agendamentos (guardados neste aparelho: código + nascimento) ---------- */
  const CHAVE_AG = "corujinhas-agendamentos-v1";
  const ROTULO_STATUS = { solicitado: "Aguardando confirmação", confirmado: "Confirmado", realizado: "Realizado", faltou: "Não compareceu", cancelado_paciente: "Cancelado por você", cancelado_equipe: "Cancelado pela clínica" };
  let meus = ler(CHAVE_AG, []);
  if (!Array.isArray(meus)) meus = [];
  meus = meus.filter((m) => m && m.codigo && m.data && m.data >= A.util?.somaDias?.(A.util.hojeSP(), -30));
  const dlgMeus = $("#meus");
  function salvarMeu(r) { meus = [r, ...meus.filter((m) => m.codigo !== r.codigo)].slice(0, 20); gravar(CHAVE_AG, meus); }
  const podeCancelar = (m) => (m.status === "solicitado" || m.status === "confirmado") && `${m.data}T${m.hora}` > A.util.agoraSP();
  function renderMeus() {
    const ord = [...meus].sort((x, y) => (podeCancelar(y) - podeCancelar(x)) || (x.data + x.hora).localeCompare(y.data + y.hora));
    $("#meus-vazio").hidden = !!ord.length;
    $("#meus-lista").innerHTML = ord.map((m, i) => {
      const [, mm, dd] = m.data.split("-");
      return `<li class="meu" style="--i:${i}" data-st="${esc(m.status)}" data-codigo="${esc(m.codigo)}">
        <div class="meu__topo">
          <span class="meu__data" aria-hidden="true"><b>${dd}</b><small>${MESES[+mm - 1].slice(0, 3)}</small></span>
          <span class="meu__txt"><strong>${esc(m.paciente.split(" ")[0])} · ${esc(m.profissional)}</strong>
            <small>${esc(dataExtenso(m.data))} às ${esc(m.hora)} · ${esc(m.unidade)}</small></span>
          <span class="meu__st">${esc(ROTULO_STATUS[m.status] || m.status)}</span>
        </div>
        <div class="meu__det" hidden><p><span>Código</span>${esc(m.codigo)}</p>${m.area ? `<p><span>Atendimento</span>${esc(m.area)}</p>` : ""}${m.endereco ? `<p><span>Endereço</span>${esc(m.endereco)}</p>` : ""}</div>
        <div class="meu__conf" hidden><p>Cancelar a consulta de ${esc(m.paciente.split(" ")[0])} em ${esc(dataExtenso(m.data))} às ${esc(m.hora)}?</p>
          <div><button type="button" class="btn btn--suave" data-manter>Manter</button><button type="button" class="btn btn--perigo" data-sim>Sim, cancelar</button></div></div>
        <div class="meu__acoes">
          <button type="button" class="meu__btn" data-det aria-expanded="false">Ver detalhes</button>
          ${podeCancelar(m) ? `<button type="button" class="meu__btn meu__btn--cancelar" data-cancelar>Cancelar agendamento</button>`
            : `<button type="button" class="meu__btn" data-tirar>Remover da lista</button>`}
        </div>
      </li>`;
    }).join("");
  }
  async function atualizarMeus() {
    await Promise.all(meus.map(async (m) => {
      try { const r = await A.consultar(m.codigo, m.nascimento); if (r) Object.assign(m, { status: r.status, data: String(r.data).slice(0, 10), hora: r.hora, unidade: r.unidade, endereco: r.endereco, profissional: r.profissional, area: r.area }); }
      catch { /* mantém o que está salvo */ }
    }));
    gravar(CHAVE_AG, meus);
  }
  async function abrirMeus() {
    $$("[data-demo]").forEach((e) => (e.hidden = A.modo !== "demo"));
    renderMeus();
    if (typeof dlgMeus.showModal === "function") { if (!dlgMeus.open) dlgMeus.showModal(); } else dlgMeus.setAttribute("open", "");
    if (!meus.length) dlgMeus.querySelector(".meus__buscar").open = true;
    await atualizarMeus(); renderMeus();
  }
  dlgMeus.addEventListener("click", async (e) => {
    if (e.target === dlgMeus || e.target.closest("[data-fechar]")) return dlgMeus.close();
    const li = e.target.closest(".meu"); if (!li) return;
    const m = meus.find((x) => x.codigo === li.dataset.codigo);
    if (e.target.closest("[data-det]")) { const d = $(".meu__det", li), b = e.target.closest("[data-det]"); d.hidden = !d.hidden; b.setAttribute("aria-expanded", !d.hidden); b.textContent = d.hidden ? "Ver detalhes" : "Ocultar detalhes"; return; }
    if (e.target.closest("[data-cancelar]")) { $(".meu__conf", li).hidden = false; $(".meu__acoes", li).hidden = true; $("[data-manter]", li).focus(); return; }
    if (e.target.closest("[data-manter]")) { $(".meu__conf", li).hidden = true; $(".meu__acoes", li).hidden = false; return; }
    if (e.target.closest("[data-tirar]")) { meus = meus.filter((x) => x !== m); gravar(CHAVE_AG, meus); return renderMeus(); }
    const sim = e.target.closest("[data-sim]");
    if (sim) {
      sim.disabled = true; sim.textContent = "Cancelando…";
      try {
        const r = await A.cancelar(m.codigo, m.nascimento);
        Object.assign(m, { status: r?.status || "cancelado_paciente" }); gravar(CHAVE_AG, meus);
        let url = M.criarLinkCancelamento({ ...m, paciente: m.paciente.split(" ")[0] });
        if (A.modo === "demo") url = url.replace("text=", "text=" + encodeURIComponent("🧪 *TESTE DA AGENDA ONLINE — desconsiderar*\n\n"));
        renderMeus();
        const aviso = $("#aviso-wa"); aviso.textContent = "Agendamento cancelado. Avisando a central pelo WhatsApp…";
        aviso.classList.add("aviso-wa--on"); setTimeout(() => aviso.classList.remove("aviso-wa--on"), 3600);
        const w = window.open(url, "_blank"); if (w) { try { w.opener = null; } catch { /* */ } }
      } catch (err) { sim.disabled = false; sim.textContent = "Sim, cancelar"; $(".meu__conf p", li).textContent = A.mensagemErro(err); }
    }
  });
  $("#meus-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target, cod = f.codigo.value.trim().toUpperCase().replace(/^CJ-?/, "CJ-"), nasc = f.nascimento.value;
    if (!/^CJ-[A-Z2-9]{6}$/.test(cod) || !nasc) { $("#meus-erro").textContent = "Informe o código (CJ-XXXXXX) e a data de nascimento."; return; }
    $("#meus-erro").textContent = "";
    try {
      const r = await A.consultar(cod, nasc);
      if (!r) { $("#meus-erro").textContent = "Não encontramos esse agendamento. Confira o código e a data."; return; }
      salvarMeu({ codigo: r.codigo, nascimento: nasc, paciente: r.paciente, profissional: r.profissional, area: r.area, unidade: r.unidade, endereco: r.endereco, data: String(r.data).slice(0, 10), hora: r.hora, status: r.status });
      f.reset(); f.closest("details").open = false; renderMeus();
    } catch (err) { $("#meus-erro").textContent = A.mensagemErro(err); }
  });
  if (A.ativo) $$("[data-abrir-meus]").forEach((b) => { b.hidden = false; if (!dlg.contains(b)) b.addEventListener("click", abrirMeus); });

  // Rodapé: apagar tudo o que o site guardou neste aparelho
  const botaoApagar = $("#apagar-dados");
  if (botaoApagar) botaoApagar.addEventListener("click", () => {
    pacientes = []; unidadeId = ""; meus = [];
    try { Object.keys(localStorage).filter((k) => k.startsWith("corujinhas-")).forEach((k) => localStorage.removeItem(k)); } catch { /* sem armazenamento */ }
    try { Object.keys(sessionStorage).filter((k) => k.startsWith("corujinhas-") && k !== "corujinhas-abertura").forEach((k) => sessionStorage.removeItem(k)); } catch { /* sem armazenamento */ }
    $("#apagar-status").textContent = "Pronto. Nenhum dado do agendamento ficou salvo neste aparelho.";
  });

  document.addEventListener("click", (e) => {
    const a = e.target.closest("a");
    if (!a || !pedidos.has(a) || dlg.contains(a)) return;
    if (e.ctrlKey || e.metaKey || e.shiftKey) return; // abrir em nova aba segue o link direto
    e.preventDefault();
    abrirAgenda(a, pedidos.get(a), a.dataset.unidadeFixa);
  });

  /* ---------- Seletor de atendimento ---------- */
  const categorias = $("#categorias");
  const painel = $("#painel");
  let areaAtiva = null;
  let ultimoBotao = null;

  function renderCategorias() {
    const botao = (a, i) => `
      <button type="button" class="cat" data-area="${esc(a.id)}" data-cor="${esc(a.cor)}" style="--i:${i}">
        ${icone(a.icone, "cat__icone")}
        <span class="cat__nome">${esc(a.rotulo)}</span>
        <span class="cat__meta">${contagem(a.profissionais.length)}</span>
      </button>`;
    const noSeletor = C.areas.filter((a) => a.id !== "acompanhamento_adulto"); // tem seção própria
    const com = noSeletor.filter((a) => !a.semEquipeNominal);
    const sem = noSeletor.filter((a) => a.semEquipeNominal);
    categorias.innerHTML = `
      <div class="cat-grupo"><h3 class="cat-grupo__t">Equipe apresentada</h3>
        <div class="cat-grade">${com.map(botao).join("")}</div></div>
      <div class="cat-grupo"><h3 class="cat-grupo__t">Consulte a central</h3>
        <div class="cat-grade">${sem.map((a, i) => botao(a, com.length + i)).join("")}</div></div>`;
  }

  function cardProfissional(id, area, i) {
    const p = C.profissionais[id];
    const reg = [p.registro, p.rqe ? `RQE ${p.rqe}` : null].filter(Boolean).map(esc).join(" · ");
    return `
      <article class="pro" style="--i:${i}" data-pro="${esc(id)}">
        <div class="pro__foto">
          <img src="${esc(p.retrato)}" alt="Foto de ${esc(p.nome)}" width="496" height="440" loading="lazy" draggable="false">
        </div>
        <div class="pro__texto">
          <h4 class="pro__nome">${esc(p.nome)}</h4>
          <p class="pro__desc">${descricaoHTML(p.descricao)}</p>
          <p class="pro__reg">${reg}</p>
        </div>
        <a class="btn btn--primario btn--card" data-agendar="${esc(id)}" href="#" draggable="false"
           aria-label="Agendar consulta com ${esc(p.nome)} em ${esc(area.titulo)} pelo WhatsApp">
          <svg aria-hidden="true"><use href="#i-wa"/></svg><span>Agendar consulta</span></a>
      </article>`;
  }

  function renderPainel(area) {
    const ids = [...new Set(area.profissionais)]; // no máximo uma vez por área
    const corpo = ids.length
      ? `<div class="fileira-caixa" data-n="${ids.length}">
           <div class="fileira" tabindex="0" role="group" aria-roledescription="carrossel" aria-label="Profissionais de ${esc(area.titulo)}">
             ${ids.map((id, i) => cardProfissional(id, area, i)).join("")}
           </div>
           <div class="fileira__controles">
             <button type="button" class="seta" data-dir="-1" aria-label="Profissionais anteriores"><svg aria-hidden="true"><use href="#i-voltar"/></svg></button>
             <button type="button" class="seta" data-dir="1" aria-label="Próximos profissionais"><svg aria-hidden="true"><use href="#i-seta"/></svg></button>
           </div>
         </div>`
      : `<div class="sem-equipe">
           <p>Ainda não apresentamos aqui os profissionais desta área. A central informa quem atende, em qual unidade e a disponibilidade.</p>
           <a class="btn btn--primario" data-area-central href="#"><svg aria-hidden="true"><use href="#i-wa"/></svg><span>Consultar profissionais e disponibilidade</span></a>
         </div>`;

    painel.dataset.cor = area.cor;
    painel.innerHTML = `
      <div class="painel__barra">
        <button type="button" class="trocar" id="trocar-area"><svg aria-hidden="true"><use href="#i-voltar"/></svg>Trocar tipo de consulta</button>
        <span class="painel__atual">${icone(area.icone, "icone--mini")}${esc(area.rotulo)}</span>
      </div>
      <div class="painel__cabeca">
        ${icone(area.icone, "icone--medio")}
        <div>
          <h3 class="painel__titulo" id="painel-titulo" tabindex="-1">${esc(area.titulo)}</h3>
          <p class="painel__desc">${esc(area.descricao)}</p>
        </div>
      </div>
      ${corpo}`;

    $$("[data-agendar]", painel).forEach((a) => {
      const p = C.profissionais[a.dataset.agendar];
      ligar(a, { tipo: "profissional", profissionalId: a.dataset.agendar, areaId: area.id, nome: p.nome, area: area.titulo });
    });
    const central = $("[data-area-central]", painel);
    if (central) ligar(central, { tipo: "area", areaId: area.id, area: area.titulo });
    const caixa = $(".fileira-caixa", painel);
    if (caixa) configurarFileira(caixa);
  }

  function abrirArea(id, origem) {
    const area = C.areas.find((a) => a.id === id);
    if (!area) return;
    areaAtiva = area; ultimoBotao = origem || null;
    renderPainel(area);
    categorias.hidden = true;
    painel.hidden = false;
    painel.classList.remove("painel--entra"); void painel.offsetWidth; painel.classList.add("painel--entra");
    const topo = $("#seletor").getBoundingClientRect().top;
    if (topo < 70 || topo > window.innerHeight * 0.6) $("#seletor").scrollIntoView({ behavior: comportamento(), block: "start" });
    $("#painel-titulo").focus({ preventScroll: true });
    window.dispatchEvent(new CustomEvent("corujinhas:area", { detail: { areaId: area.id } }));
  }

  function voltarCategorias() {
    areaAtiva = null;
    painel.hidden = true;
    painel.innerHTML = "";
    categorias.hidden = false;
    $$(".cat", categorias).forEach((b) => b.classList.add("cat--visivel"));
    const alvo = ultimoBotao && document.contains(ultimoBotao) ? ultimoBotao : $(".cat", categorias);
    alvo.scrollIntoView({ behavior: comportamento(), block: "center" });
    alvo.focus({ preventScroll: true });
  }

  categorias.addEventListener("click", (e) => {
    const b = e.target.closest(".cat");
    if (b) abrirArea(b.dataset.area, b);
  });
  painel.addEventListener("click", (e) => { if (e.target.closest("#trocar-area")) voltarCategorias(); });
  painel.addEventListener("keydown", (e) => { if (e.key === "Escape" && !e.target.closest("dialog")) voltarCategorias(); });

  /* ---------- Fileira horizontal (mesmo componente para todas as áreas) ---------- */
  /* ---------- Equipe: escolha o seu médico (cards deslizáveis) ---------- */
  function renderEquipe() {
    const caixa = $("#equipe-lista");
    if (!caixa) return;
    const areasDe = (id) => C.areas.filter((a) => a.profissionais.includes(id));
    const ids = [C.destaque.profissional, ...Object.keys(C.profissionais).filter((id) => id !== C.destaque.profissional)];
    const cards = ids.map((id, i) => {
      const p = C.profissionais[id], areas = areasDe(id);
      if (!areas.length) return "";
      const varias = areas.length > 1;
      const opcoes = areas.map((a, k) => `
        <li style="--k:${k}"><a class="medico__op" data-cor="${esc(a.cor)}" href="#" data-med="${esc(id)}" data-med-area="${esc(a.id)}" draggable="false">
          ${icone(a.icone, "medico__op-icone")}<span><strong>${esc(a.rotulo.replace(/\u00ad/g, ""))}</strong><small>Agendar</small></span>
          <svg class="medico__op-seta" aria-hidden="true"><use href="#i-seta"/></svg></a></li>`).join("");
      return `
      <article class="pro medico${i === 0 ? " medico--destaque" : ""}" style="--i:${i}" data-medico="${esc(id)}" data-varias="${varias}">
        <div class="pro__foto">
          <img src="${esc(p.retrato)}" alt="Foto de ${esc(p.nome)}" width="496" height="440" loading="lazy" draggable="false">
          ${i === 0 ? `<span class="medico__selo">Responsável técnica</span>` : ""}
        </div>
        <div class="pro__texto">
          <h3 class="pro__nome">${esc(p.nome)}</h3>
          <p class="pro__desc">${descricaoHTML(p.descricao)}</p>
        </div>
        ${varias
          ? `<button type="button" class="btn btn--card medico__abrir" aria-expanded="false" aria-controls="op-${esc(id)}"><span>Escolher consulta</span><span class="medico__n">${areas.length}</span></button>`
          : `<a class="btn btn--primario btn--card" href="#" data-med="${esc(id)}" data-med-area="${esc(areas[0].id)}" draggable="false"
               aria-label="Agendar consulta com ${esc(p.nome)} em ${esc(areas[0].titulo)}"><svg aria-hidden="true"><use href="#i-wa"/></svg><span>Agendar consulta</span></a>`}
        ${varias ? `<div class="medico__opcoes" id="op-${esc(id)}" role="group" aria-label="Formas de consulta com ${esc(p.nome)}" hidden>
          <div class="medico__opcoes-topo"><p>Como você quer se consultar?</p>
            <button type="button" class="medico__fechar" aria-label="Fechar opções">×</button></div>
          <ul>${opcoes}</ul></div>` : ""}
      </article>`;
    }).join("");
    caixa.innerHTML = `
      <div class="fileira" tabindex="0" role="group" aria-roledescription="carrossel" aria-label="Profissionais do Instituto Corujinhas">${cards}</div>
      <div class="fileira__controles">
        <button type="button" class="seta" data-dir="-1" aria-label="Profissionais anteriores"><svg aria-hidden="true"><use href="#i-voltar"/></svg></button>
        <button type="button" class="seta" data-dir="1" aria-label="Próximos profissionais"><svg aria-hidden="true"><use href="#i-seta"/></svg></button>
      </div>`;
    $$("[data-med]", caixa).forEach((a) => {
      const p = C.profissionais[a.dataset.med], area = C.areas.find((x) => x.id === a.dataset.medArea);
      ligar(a, { tipo: "profissional", profissionalId: a.dataset.med, areaId: area.id, nome: p.nome, area: area.titulo });
    });
    const fechar = (card) => {
      const op = $(".medico__opcoes", card); if (!op || op.hidden) return;
      card.classList.remove("medico--aberto"); $(".medico__abrir", card).setAttribute("aria-expanded", "false");
      setTimeout(() => { if (!card.classList.contains("medico--aberto")) op.hidden = true; }, 260);
    };
    const abrir = (card) => {
      $$(".medico--aberto", caixa).forEach((c) => c !== card && fechar(c));
      const op = $(".medico__opcoes", card); op.hidden = false; void op.offsetWidth;
      card.classList.add("medico--aberto"); $(".medico__abrir", card).setAttribute("aria-expanded", "true");
      setTimeout(() => $(".medico__op", op)?.focus({ preventScroll: true }), 120);
    };
    caixa.addEventListener("click", (e) => {
      const card = e.target.closest(".medico");
      if (!card || e.target.closest("[data-med]")) return; // links abrem o agendamento
      if (e.target.closest(".medico__fechar")) { fechar(card); $(".medico__abrir", card).focus(); return; }
      if (card.dataset.varias === "true") {
        if (e.target.closest(".medico__opcoes")) return;
        card.classList.contains("medico--aberto") ? fechar(card) : abrir(card);
      }
      else if (!e.target.closest("a, button")) $("[data-med]", card).click(); // card de uma consulta só: toque no card = agendar
    });
    caixa.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      const card = e.target.closest(".medico--aberto"); if (card) { e.stopPropagation(); fechar(card); $(".medico__abrir", card).focus(); }
    });
    configurarFileira(caixa);
  }

  function configurarFileira(caixa) {
    const fileira = $(".fileira", caixa);
    const [ant, prox] = $$(".seta", caixa);
    let quadro = 0;
    const passo = () => {
      const card = $(".pro", fileira);
      const gap = parseFloat(getComputedStyle(fileira).columnGap) || 0;
      return card ? card.getBoundingClientRect().width + gap : fileira.clientWidth * 0.8;
    };
    const atualizar = () => {
      quadro = 0;
      const max = fileira.scrollWidth - fileira.clientWidth;
      const rola = max > 2;
      caixa.classList.toggle("fileira-caixa--rola", rola);
      ant.disabled = !rola || fileira.scrollLeft <= 2;
      prox.disabled = !rola || fileira.scrollLeft >= max - 2;
    };
    const agendar = () => { if (!quadro) quadro = requestAnimationFrame(atualizar); };
    const mover = (dir) => fileira.scrollBy({ left: dir * passo(), behavior: comportamento() });
    fileira.addEventListener("scroll", agendar, { passive: true });
    new ResizeObserver(agendar).observe(fileira);
    [ant, prox].forEach((b) => b.addEventListener("click", () => mover(Number(b.dataset.dir))));
    fileira.addEventListener("keydown", (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); mover(e.key === "ArrowRight" ? 1 : -1); }
    });

    // Arraste com o mouse a partir da foto ou do fundo do card. Texto continua selecionável; toque usa a rolagem nativa.
    let x0 = 0, s0 = 0, pressionado = false, arrastou = false, idP = null;
    fileira.addEventListener("pointerdown", (e) => {
      if (!ehMouse(e) || e.button !== 0 || !caixa.classList.contains("fileira-caixa--rola")) return;
      if (e.target.closest(".pro__texto, button, .medico__opcoes")) return;
      pressionado = true; arrastou = false; idP = e.pointerId; x0 = e.clientX; s0 = fileira.scrollLeft;
    });
    fileira.addEventListener("pointermove", (e) => {
      if (!pressionado || e.pointerId !== idP) return;
      const dx = e.clientX - x0;
      if (!arrastou && Math.abs(dx) > 6) { arrastou = true; fileira.classList.add("fileira--arrastando"); fileira.setPointerCapture(idP); }
      if (arrastou) { e.preventDefault(); fileira.scrollLeft = s0 - dx; }
    });
    const soltar = (e) => {
      if (!pressionado || (e && e.pointerId !== idP)) return;
      pressionado = false;
      if (!arrastou) return;
      if (fileira.hasPointerCapture(idP)) fileira.releasePointerCapture(idP);
      const p = passo();
      fileira.classList.remove("fileira--arrastando");
      fileira.scrollTo({ left: Math.round(fileira.scrollLeft / p) * p, behavior: comportamento() });
      setTimeout(() => (arrastou = false), 0);
    };
    fileira.addEventListener("pointerup", soltar);
    fileira.addEventListener("pointercancel", soltar);
    fileira.addEventListener("click", (e) => { if (arrastou) { e.preventDefault(); e.stopPropagation(); } }, true);
    fileira.addEventListener("dragstart", (e) => e.preventDefault());
    atualizar();
  }

  /* ---------- Convênios, avaliações e unidades ---------- */
  function renderConvenios() {
    const cv = C.convenios;
    const alvo = $("#convenios-lista");
    const grupos = Object.entries(cv.categorias).map(([chave, rotulo]) => {
      const itens = cv.itens.filter((i) => i.categoria === chave);
      return itens.length ? `<div class="conv-grupo conv-grupo--${esc(chave)}">
        <h3>${esc(rotulo)} <span>${itens.length}</span></h3>
        <ul class="conv-grade">${itens.map((i, k) => `
          <li class="conv" style="--i:${k}" title="${esc(i.detalhe || i.nome)}">
            <span class="conv__logo"><img src="${esc(i.logo)}" alt="" loading="lazy" decoding="async"></span>
            <span class="conv__nome">${esc(i.nome)}</span>
          </li>`).join("")}</ul></div>` : "";
    }).join("");
    alvo.innerHTML = `<div class="conv-grupos">${grupos}</div>`;
  }

  /* Avaliações em faixa contínua: a lista é repetida só para fechar o laço (cópias ficam ocultas a leitores de tela). */
  function renderAvaliacoes() {
    const av = C.avaliacoes;
    const lista = $("#avaliacoes-lista");
    const card = (t, oculto) => `
      <li class="aval"${oculto ? ' aria-hidden="true"' : ""}>
        <div class="aval__topo">
          <span class="aval__avatar" aria-hidden="true">${esc((t.nome || "G").slice(0, 1))}</span>
          <div><p class="aval__nome">${esc(t.nome || "Avaliação no Google")}${t.unidade ? ` <span class="aval__unidade">· ${esc(t.unidade)}</span>` : ""}</p>
            <p class="aval__estrelas" aria-label="${t.estrelas} de 5 estrelas">${Array.from({ length: t.estrelas }, () => `<svg aria-hidden="true"><use href="#i-estrela"/></svg>`).join("")}</p></div>
        </div>
        <blockquote>${esc(t.texto)}</blockquote>
      </li>`;
    const base = av.trechos.filter((t) => t.estrelas >= 4);
    const montar = () => {
      const largura = $("#carrossel-aval").clientWidth || window.innerWidth;
      const aprox = Math.max(300, Math.min(380, largura * 0.8)) + 16;
      const repeticoes = Math.max(1, Math.ceil((largura * 1.2) / (aprox * base.length)));
      let grupo = [];
      for (let r = 0; r < repeticoes; r++) grupo = grupo.concat(base.map((t) => [t, r > 0]));
      // duas metades iguais: a animação anda 50% e recomeça sem salto
      lista.innerHTML = grupo.map(([t, o]) => card(t, o)).join("") + grupo.map(([t]) => card(t, true)).join("");
      lista.style.setProperty("--duracao", `${Math.max(18, grupo.length * 7)}s`);
    };
    montar();
    let largura0 = window.innerWidth;
    window.addEventListener("resize", () => { if (Math.abs(window.innerWidth - largura0) > 80) { largura0 = window.innerWidth; montar(); } });
    $("#link-google").href = av.link;
    $("#notas-google").innerHTML = av.notas.map((n) => `<li><strong>${esc(n.nota)}</strong><span>${esc(n.unidade)}</span></li>`).join("");
    $("#nota-total").textContent = `${av.total} avaliações no Google`;
    $("#link-google").setAttribute("aria-label", `Notas no Google: ${av.notas.map((n) => `${n.unidade} ${n.nota}`).join(", ")}. ${av.total} avaliações. Ver no Google Maps`);
  }

  /* Minimapa ilustrado de cada unidade, desenhado com as ruas reais do OpenStreetMap. */
  function mapaSVG(u) {
    const m = (window.CORUJINHAS_MAPAS || {})[u.mapaSvg];
    if (!m) return "";
    const id = `rua-${esc(u.mapaSvg)}`;
    const linhas = (lista, cls) => lista.map((d, i) => `<path class="${cls}" d="${d}" pathLength="1" style="--k:${i % 12}"/>`).join("");
    const c = m.cls;
    return `<svg class="mapa" viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Mapa ilustrado da região da unidade ${esc(u.nome)}">
      <rect class="mapa__fundo" width="320" height="200"/>
      <g class="mapa__verde">${c.verde.map((d) => `<path d="${d}"/>`).join("")}</g>
      <g class="mapa__agua">${c.agua.map((d) => `<path d="${d}"/>`).join("")}</g>
      <g class="mapa__trilho">${c.trilho.map((d) => `<path d="${d}"/>`).join("")}</g>
      <g class="mapa__casca">${c.grande.concat(c.media).map((d) => `<path d="${d}"/>`).join("")}</g>
      <g class="mapa__ruas">${linhas(c.pequena, "r-p")}${linhas(c.media, "r-m")}${linhas(c.grande, "r-g")}</g>
      ${m.predio ? `<path class="mapa__predio" d="${m.predio}"/>` : ""}
      <path id="${id}" class="mapa__destaque" d="${m.ruaPath}" pathLength="1"/>
      <text class="mapa__nome"><textPath href="#${id}" startOffset="50%" text-anchor="middle">${esc(m.rua)}</textPath></text>
      <circle class="mapa__carro" r="3.2" style="offset-path: path('${m.ruaPath}')"/>
      <text class="mapa__credito" x="314" y="195" text-anchor="end">© OpenStreetMap</text>
      <g class="mapa__pin" transform="translate(160 100)">
        <ellipse class="mapa__anel" rx="16" ry="7"/><ellipse class="mapa__anel mapa__anel--2" rx="16" ry="7"/>
        <ellipse class="mapa__sombra" rx="7" ry="2.6"/>
        <g class="mapa__gota"><path d="M0 0C-6-8-12-13-12-21a12 12 0 0 1 24 0C12-13 6-8 0 0Z"/><circle cy="-21" r="5.2"/></g>
      </g>
    </svg>`;
  }

  const verMapa = (u, cls) => u.mapa ? `<a class="${cls}" href="${esc(u.mapa)}" target="_blank" rel="noopener noreferrer" aria-label="Ver a unidade ${esc(u.nome)} no mapa"><svg aria-hidden="true"><use href="#i-mapa"/></svg>Ver mapa</a>` : "";
  const ligarAgora = (u) => `<a class="u-btn" href="tel:${esc(u.telefone.tel)}" aria-label="Ligar agora para a unidade ${esc(u.nome)}, ${esc(u.telefone.exibicao)}"><svg aria-hidden="true"><use href="#i-tel"/></svg>Ligar agora</a>`;
  const agendarAqui = (u) => `<a class="u-btn u-btn--forte" href="#" data-agendar-unidade="${esc(u.id)}" data-unidade-fixa="${esc(u.id)}"><svg aria-hidden="true"><use href="#i-wa"/></svg>Agendar</a>`;

  function renderUnidades() {
    $("#lista-unidades").innerHTML = C.unidades.map((u, i) => `
      <li class="unidade" style="--i:${i}" data-entrada="unidade" data-cor="${esc(u.cor || "azul")}">
        <div class="unidade__mapa">${mapaSVG(u)}<span class="unidade__regiao">${esc(u.regiao || "")}</span></div>
        <div class="unidade__corpo">
          <h3>${esc(u.nome)}</h3>
          <p class="unidade__end">${esc(u.enderecoCurto || "Endereço informado pela central")}</p>
          <p class="unidade__hora"><svg aria-hidden="true"><use href="#i-relogio"/></svg><span>${u.horario.map(esc).join("<br>")}</span></p>
          ${u.extra ? `<div class="unidade__acoes">${verMapa(u, "u-btn")}${ligarAgora(u)}${agendarAqui(u)}</div>
          <div class="unidade__extra"><p><b>${esc(u.extra.rotulo)}</b><span>${esc(u.extra.exibicao)}</span></p>
            <span class="unidade__extra-acoes">
              ${u.extra.whatsapp ? `<a class="u-mini" href="https://wa.me/${esc(u.extra.whatsapp)}?text=${encodeURIComponent(`Olá! Vim pelo site do Instituto Corujinhas e gostaria de falar sobre ${u.extra.rotulo.toLowerCase()} na unidade ${u.nome}.`)}" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp da ${esc(u.extra.rotulo)} ${esc(u.nome)}"><svg aria-hidden="true"><use href="#i-wa"/></svg>WhatsApp</a>` : ""}
              <a class="u-mini" href="tel:${esc(u.extra.tel)}" aria-label="Ligar para ${esc(u.extra.rotulo)} ${esc(u.nome)}"><svg aria-hidden="true"><use href="#i-tel"/></svg>Ligar</a>
            </span></div>`
          : `<div class="unidade__fim"><div class="unidade__acoes unidade__acoes--2">${ligarAgora(u)}${agendarAqui(u)}</div>
          ${verMapa(u, "u-mapa-grande")}</div>`}
        </div>
      </li>`).join("");
    $$("[data-agendar-unidade]").forEach((a) => ligar(a, { tipo: "geral" }));
  }

  /* ---------- Textos: títulos entram palavra por palavra ---------- */
  function dividirTextos() {
    $$("[data-texto]").forEach((el) => {
      const palavras = el.textContent.trim().split(/\s+/);
      el.setAttribute("aria-label", el.textContent.trim());
      el.innerHTML = palavras.map((p, i) => `<span class="palavra" aria-hidden="true"><span style="--p:${i}">${esc(p)}</span></span>`).join(" ");
    });
  }

  /* ---------- Entradas (uma vez) e pausa fora da tela ---------- */
  function configurarEntradas() {
    $$('[data-entrada="hero"]').forEach((el, i) => el.style.setProperty("--i", i));
    // listas em cascata: cada item entra um pouco depois do anterior
    $$('[data-entrada="cascata"]').forEach((lista) => [...lista.children].forEach((item, i) => item.style.setProperty("--c", i)));
    // parágrafos de uma mesma cabeça de seção entram em sequência
    $$(".secao__cabeca, .adulto__texto, .servico, .central").forEach((bloco) => $$('[data-entrada="padrao"], [data-entrada="kicker"]', bloco).forEach((el, i) => el.style.setProperty("--s", i)));
    const obs = new IntersectionObserver((entradas) => {
      entradas.forEach((en) => {
        if (!en.isIntersecting) return;
        en.target.classList.add("visivel");
        if (en.target === categorias) $$(".cat", categorias).forEach((b) => b.classList.add("cat--visivel"));
        // em listas que deslizam na horizontal, os cartões fora da tela entram junto
        if (en.target.matches(".unidade")) $$(".unidade").forEach((u) => u.classList.add("visivel"));
        obs.unobserve(en.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    $$("[data-entrada], [data-texto], .rodape__in").forEach((el) => obs.observe(el));
    const ambiente = new IntersectionObserver((entradas) => entradas.forEach((en) => en.target.classList.toggle("pausado", !en.isIntersecting)));
    $$("[data-ambiente]").forEach((el) => ambiente.observe(el));
    document.addEventListener("visibilitychange", () => document.documentElement.classList.toggle("pagina-oculta", document.hidden));
  }

  /* ---------- Hero: atalhos de área flutuando, palavra que gira e leve paralaxe ---------- */
  function configurarHero() {
    const chips = $("#hero-chips");
    chips.innerHTML = (C.destaque.chipsHero || []).map((id, i) => {
      const a = C.areas.find((x) => x.id === id);
      return a ? `<button type="button" class="chip-area chip-area--${i + 1}" data-hero-area="${esc(a.id)}" data-profundidade="${(0.7 + i * 0.25).toFixed(2)}">
        <span class="chip-area__flut">${icone(a.icone)}${esc(a.rotulo)}</span></button>` : "";
    }).join("");
    chips.addEventListener("click", (e) => {
      const b = e.target.closest("[data-hero-area]");
      if (!b) return;
      const id = b.dataset.heroArea;
      abrirArea(id, $(`.cat[data-area="${id}"]`, categorias));
      $("#atendimentos").scrollIntoView({ behavior: comportamento(), block: "start" });
    });

    // Palavra que gira (passiva): pausa fora da tela, com a aba oculta e com movimento reduzido.
    const lista = $("#giro"); const total = lista.children.length; let n = 0;
    const hero = $("#inicio");
    if (movimentoReduzido.matches) lista.style.transform = `translateY(-${(total - 1) * 1.2}em)`;
    else setInterval(() => {
      if (document.hidden || hero.classList.contains("pausado")) return;
      n = (n + 1) % total; lista.style.transform = `translateY(-${n * 1.2}em)`;
    }, 2400);

    // Paralaxe leve ao ponteiro (passiva + reativa), só com mouse.
    const visual = $("#hero-visual");
    const camadas = $$("[data-profundidade]", visual);
    let ax = 0, ay = 0, x = 0, y = 0, laco = 0;
    const passo = () => {
      x += (ax - x) * 0.1; y += (ay - y) * 0.1;
      camadas.forEach((c) => { const d = parseFloat(c.dataset.profundidade); c.style.translate = `${(x * 12 * d).toFixed(2)}px ${(y * 9 * d).toFixed(2)}px`; });
      laco = Math.abs(ax - x) + Math.abs(ay - y) > 0.002 ? requestAnimationFrame(passo) : 0;
    };
    hero.addEventListener("pointermove", (e) => {
      if (!ehMouse(e) || movimentoReduzido.matches) return;
      const r = visual.getBoundingClientRect();
      ax = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / r.width));
      ay = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / r.height));
      if (!laco) laco = requestAnimationFrame(passo);
    });
    hero.addEventListener("pointerleave", () => { ax = 0; ay = 0; if (!laco) laco = requestAnimationFrame(passo); });
  }

  /* ---------- Categorias inclinam levemente sob o mouse ---------- */
  function configurarInclinacao() {
    categorias.addEventListener("pointermove", (e) => {
      if (!ehMouse(e) || movimentoReduzido.matches) return;
      const b = e.target.closest(".cat"); if (!b) return;
      const r = b.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
      b.classList.add("cat--inclina");
      b.style.setProperty("--ry", `${(px * 10).toFixed(2)}deg`);
      b.style.setProperty("--rx", `${(-py * 10).toFixed(2)}deg`);
    });
    categorias.addEventListener("pointerout", (e) => {
      const b = e.target.closest(".cat");
      if (b && !b.contains(e.relatedTarget)) { b.classList.remove("cat--inclina"); b.style.setProperty("--rx", "0deg"); b.style.setProperty("--ry", "0deg"); }
    });
  }

  /* ---------- Abertura: a corujinha do "O" aparece, a logo se forma e voa para o topo ---------- */
  function configurarAbertura() {
    const r = document.documentElement;
    const intro = $("#intro");
    const fim = () => { r.classList.remove("com-abertura"); intro?.remove(); };
    if (!r.classList.contains("com-abertura") || !intro || !intro.animate) { fim(); return; }
    const logo = $("#intro-logo");
    const letras = $$(".intro__l", logo);
    const sub = $(".intro__sub", logo);
    const iO = letras.findIndex((l) => l.dataset.letra === "O");
    // espera as camadas da logo carregarem (no máx. 700 ms) para a animação começar inteira
    const urls = [...letras, sub].map((el) => getComputedStyle(el).backgroundImage.slice(5, -2));
    const carregar = (u) => new Promise((ok) => { const im = new Image(); im.onload = im.onerror = ok; im.src = u; });
    Promise.race([Promise.all(urls.map(carregar)), new Promise((ok) => setTimeout(ok, 700))]).then(animar);
    function animar() {
      const e1 = "cubic-bezier(.22,1,.36,1)", e2 = "cubic-bezier(.65,0,.35,1)";
      // posição do "O" dentro da logo para começar com zoom nele
      const caixa = logo.getBoundingClientRect();
      const oX = (parseFloat(letras[iO].style.getPropertyValue("--x0")) + parseFloat(letras[iO].style.getPropertyValue("--x1"))) / 200;
      const zoom = Math.min(2.4, (window.innerWidth * 0.62) / (caixa.width * 0.18));
      const dx = (0.5 - oX) * caixa.width * zoom;
      logo.style.transformOrigin = "50% 50%";
      const inicio = `translate(${dx}px, ${caixa.height * 0.08}px) scale(${zoom})`;

      // Linha do tempo (~3 s): coruja do "O" com zoom → zoom recua → letras nascem a partir do O → subtítulo → voo até o topo.
      const T = { o: 600, segura: 850, zoom: 950, letras: 1000, passo: 75, sub: 1850, voo: 2550, dVoo: 600 };
      letras[iO].animate([
        { opacity: 0, transform: "scale(.3) rotate(-18deg)" },
        { opacity: 1, transform: "scale(1.12) rotate(4deg)", offset: .65 },
        { opacity: 1, transform: "none" }], { duration: T.o, easing: e1, fill: "both" });
      logo.animate([{ transform: inicio }, { transform: inicio, offset: T.segura / (T.segura + T.zoom) }, { transform: "none" }],
        { duration: T.segura + T.zoom, easing: e2, fill: "both" });
      letras.forEach((l, i) => {
        if (i === iO) return;
        const lado = i < iO ? 1 : -1;
        l.animate([
          { opacity: 0, transform: `translateX(${lado * 38}%) translateY(26%) scale(.55)`, filter: "blur(6px)" },
          { opacity: 1, transform: "translateY(-6%) scale(1.04)", filter: "blur(0)", offset: .7 },
          { opacity: 1, transform: "none", filter: "blur(0)" }],
          { duration: 520, delay: T.letras + Math.abs(i - iO) * T.passo, easing: e1, fill: "both" });
      });
      const base = logo.style.getPropertyValue("--base").trim();
      sub.animate([
        { opacity: 0, clipPath: `inset(${base} 100% 0 0)`, transform: "translateY(22%)", letterSpacing: "0" },
        { opacity: 1, clipPath: `inset(${base} 0% 0 0)`, transform: "none" }],
        { duration: 600, delay: T.sub, easing: e1, fill: "both" });

      // voo até a logo do topo
      setTimeout(() => {
        const alvo = $(".topo__marca img").getBoundingClientRect();
        const agora = logo.getBoundingClientRect();
        const s = alvo.width / agora.width;
        const tx = alvo.left + alvo.width / 2 - (agora.left + agora.width / 2);
        const ty = alvo.top + alvo.height / 2 - (agora.top + agora.height / 2);
        logo.getAnimations().forEach((a) => a.commitStyles?.());
        logo.animate([{ transform: "none" }, { transform: `translate(${tx}px, ${ty}px) scale(${s})` }], { duration: T.dVoo, easing: e2, fill: "forwards" });
        const saida = intro.animate([{ backgroundColor: "rgba(255,249,243,1)" }, { backgroundColor: "rgba(255,249,243,0)" }], { duration: T.dVoo, easing: "ease-in", fill: "forwards" });
        r.classList.add("abertura-pousando");
        saida.onfinish = fim;
      }, T.voo);
      setTimeout(fim, T.voo + T.dVoo + 800);
    }
    window.addEventListener("pageshow", (e) => { if (e.persisted) fim(); });
  }

  /* ---------- Mascote animado: o vídeo do personagem (WebP animado) + um pulinho ao trocar de área ---------- */
  function configurarMascote() {
    const box = $("#mascote");
    let ultimo = 0;
    const acenar = () => {
      const agora = performance.now();
      if (movimentoReduzido.matches || agora - ultimo < 2000) return;
      ultimo = agora;
      box.classList.remove("mascote--pulo"); void box.offsetWidth; box.classList.add("mascote--pulo");
    };
    box.addEventListener("pointerenter", acenar);
    box.addEventListener("click", acenar);
    window.addEventListener("corujinhas:area", acenar);
    new IntersectionObserver(([en]) => box.classList.toggle("pausado", !en.isIntersecting)).observe(box);
  }

  /* ---------- Brilho do ponteiro nos botões ---------- */
  document.addEventListener("pointermove", (e) => {
    if (!ehMouse(e)) return;
    const b = e.target.closest(".btn, .cat, .chip-area");
    if (!b) return;
    const r = b.getBoundingClientRect();
    b.style.setProperty("--mx", `${e.clientX - r.left}px`);
    b.style.setProperty("--my", `${e.clientY - r.top}px`);
  }, { passive: true });

  /* ---------- Botão flutuante só depois da apresentação ---------- */
  const flutuante = $(".flutuante");
  new IntersectionObserver(([en]) => flutuante.classList.toggle("flutuante--oculto", en.isIntersecting), { threshold: 0.2 }).observe($("#inicio"));

  /* ---------- Início ---------- */
  dividirTextos();
  renderCategorias();
  renderEquipe();
  renderConvenios();
  renderAvaliacoes();
  renderUnidades();
  atualizarLinksGerais();
  configurarHero();
  configurarInclinacao();
  configurarEntradas();
  configurarAbertura();
  configurarMascote();
}
