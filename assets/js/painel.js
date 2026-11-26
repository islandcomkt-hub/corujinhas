/*
 * Instituto Corujinhas — painel de agendamentos (equipe).
 * Dados: CorujinhasAgenda (agenda-api.js). Mensagens para o paciente: CorujinhasMensagens.criarLinkPaciente.
 */
{
  const C = window.CORUJINHAS_CONFIG, A = window.CorujinhasAgenda, M = window.CorujinhasMensagens, U = M.util;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const { hojeSP, somaDias, diaSemana, agoraSP } = A.util;
  const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  const DSEM = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const DSEM_L = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  const ST = {
    solicitado: ["Aguardando confirmação", "Aguardando"], confirmado: ["Confirmado", "Confirmado"], realizado: ["Realizado", "Realizado"],
    faltou: ["Não compareceu", "Faltou"], cancelado_paciente: ["Cancelado pelo paciente", "Cancelado"], cancelado_equipe: ["Cancelado pela clínica", "Cancelado"]
  };
  const ativo = (s) => s === "solicitado" || s === "confirmado";
  const cancelado = (s) => s === "cancelado_paciente" || s === "cancelado_equipe";

  let cad = null, lista = [], vista = "dia", ref = hojeSP(), aba = "agenda";
  const filtros = { prof: "", area: "", uni: "", st: "ativos" };

  /* ---------- utilidades ---------- */
  const profNome = (id) => cad?.profissionais.find((p) => p.id === id)?.nome || id;
  const uniNome = (id) => cad?.unidades.find((u) => u.id === id)?.nome || id;
  const uniEnd = (id) => cad?.unidades.find((u) => u.id === id)?.endereco || C.unidades.find((u) => u.id === id)?.enderecoCurto || "";
  const areaTit = (id) => C.areas.find((a) => a.id === id)?.titulo || id;
  const areaRot = (id) => (C.areas.find((a) => a.id === id)?.rotulo || id).replace(/­/g, "");
  const dataBR = (iso) => U.dataBR(iso);
  const dataExt = (iso) => { const [, m, d] = iso.split("-").map(Number); return `${DSEM_L[diaSemana(iso)].toLowerCase()}, ${d} de ${MESES[m - 1]}`; };
  const somaMin = (h, m) => { const [a, b] = h.split(":").map(Number), t = a * 60 + b + m; return `${String(Math.floor(t / 60) % 24).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`; };
  const hora5 = (h) => String(h).slice(0, 5);
  const idade = (iso) => {
    const [a, m, d] = iso.split("-").map(Number), [ha, hm, hd] = hojeSP().split("-").map(Number);
    let i = ha - a; if (hm < m || (hm === m && hd < d)) i--;
    return i <= 0 ? "menos de 1 ano" : i === 1 ? "1 ano" : `${i} anos`;
  };
  const primeiro = (n) => String(n || "").split(" ")[0];
  const contato = (a) => (a.paciente_tipo === "crianca" && a.responsavel ? primeiro(a.responsavel) : primeiro(a.paciente_nome));
  const tolerancia = () => cad?.ajustes?.tolerancia_min ?? 15;
  function aviso(t, erro) {
    const el = $("#aviso"); el.textContent = t; el.classList.toggle("aviso-wa--erro", !!erro);
    el.classList.add("aviso-wa--on"); clearTimeout(aviso.t); aviso.t = setTimeout(() => el.classList.remove("aviso-wa--on"), 3200);
  }
  const falha = (e) => aviso(A.mensagemErro(e), true);
  function abrirLink(url) { const w = window.open(url, "_blank"); if (w) { try { w.opener = null; } catch { /* */ } } }
  const abrirDlg = (d) => { if (!d.open) d.showModal(); };

  /* ---------- login ---------- */
  $$("[data-demo]").forEach((e) => (e.hidden = A.modo !== "demo"));
  $$("[data-so-banco]").forEach((e) => (e.hidden = A.modo === "demo"));
  $("#form-login").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target, btn = $("button[type=submit]", f);
    btn.disabled = true; $("#login-erro").textContent = "";
    try { await A.entrar(f.email.value.trim(), f.senha.value); f.senha.value = ""; await iniciar(); }
    catch (err) { $("#login-erro").textContent = A.mensagemErro(err); }
    finally { btn.disabled = false; }
  });
  $("#sair").addEventListener("click", async () => { await A.sair(); location.reload(); });
  $("#reiniciar-demo")?.addEventListener("click", async () => { A.reiniciarDemo(); await recarregarTudo(); aviso("Demonstração reiniciada."); });

  async function iniciar() {
    try { cad = await A.cadastros(); }
    catch (e) { $("#tela-app").hidden = true; $("#tela-login").hidden = false; return falha(e); }
    $("#tela-login").hidden = true; $("#tela-app").hidden = false;
    $("#quem").textContent = A.sessao()?.email || "";
    preencherFiltros();
    await mostrarAba(aba);
  }

  /* ---------- abas ---------- */
  async function mostrarAba(nome) {
    aba = nome;
    $$(".pn-aba").forEach((b) => (b.dataset.aba === nome ? b.setAttribute("aria-current", "page") : b.removeAttribute("aria-current")));
    $$(".pn-sec").forEach((s) => (s.hidden = s.dataset.sec !== nome));
    const sec = $(`[data-sec="${nome}"]`); sec.classList.remove("pn-sec--entra"); void sec.offsetWidth; sec.classList.add("pn-sec--entra");
    if (nome === "agenda") await carregarAgenda();
    if (nome === "urgencia") await carregarUrgencia();
    if (nome === "cancelados") await carregarCancelados();
    if (nome === "escalas") renderEscalas();
    atualizarContadoresAbas();
  }
  $$(".pn-aba").forEach((b) => b.addEventListener("click", () => mostrarAba(b.dataset.aba)));

  async function atualizarContadoresAbas() {
    try {
      const prox = await A.listar({ de: somaDias(hojeSP(), -14), ate: somaDias(hojeSP(), 60) });
      const urg = prox.filter((a) => a.urgente && ativo(a.status) && a.data >= hojeSP()).length;
      const canc = prox.filter((a) => cancelado(a.status) && a.data >= hojeSP()).length;
      $("#n-urg").hidden = !urg; $("#n-urg").textContent = urg;
      $("#n-canc").hidden = !canc; $("#n-canc").textContent = canc;
    } catch { /* silencioso */ }
  }

  /* ---------- agenda: filtros e período ---------- */
  function preencherFiltros() {
    const opt = (v, t) => `<option value="${esc(v)}">${esc(t)}</option>`;
    $("#f-prof").innerHTML = opt("", "Todos") + cad.profissionais.map((p) => opt(p.id, p.nome + (p.ativo ? "" : " (inativo)"))).join("");
    $("#f-area").innerHTML = opt("", "Todos") + C.areas.map((a) => opt(a.id, areaRot(a.id))).join("");
    $("#f-uni").innerHTML = opt("", "Todas") + cad.unidades.map((u) => opt(u.id, u.nome)).join("");
    $("#f-prof").value = filtros.prof; $("#f-area").value = filtros.area; $("#f-uni").value = filtros.uni; $("#f-st").value = filtros.st;
  }
  [["#f-prof", "prof"], ["#f-area", "area"], ["#f-uni", "uni"], ["#f-st", "st"]].forEach(([sel, k]) =>
    $(sel).addEventListener("change", (e) => { filtros[k] = e.target.value; renderAgenda(); }));

  function periodo() {
    if (vista === "dia") return { de: ref, ate: ref };
    if (vista === "semana") { const de = somaDias(ref, -diaSemana(ref)); return { de, ate: somaDias(de, 6) }; }
    const ini = ref.slice(0, 8) + "01"; const [a, m] = ref.split("-").map(Number);
    const fim = `${ref.slice(0, 8)}${String(new Date(Date.UTC(a, m, 0)).getUTCDate()).padStart(2, "0")}`;
    return { de: somaDias(ini, -diaSemana(ini)), ate: somaDias(fim, 6 - diaSemana(fim)), ini, fim };
  }
  function rotuloPeriodo() {
    const p = periodo();
    if (vista === "dia") return (ref === hojeSP() ? "Hoje · " : "") + dataExt(ref);
    if (vista === "semana") return `${dataBR(p.de).slice(0, 5)} a ${dataBR(p.ate).slice(0, 5)}`;
    const [a, m] = ref.split("-").map(Number); return `${MESES[m - 1][0].toUpperCase()}${MESES[m - 1].slice(1)} de ${a}`;
  }
  $$("[data-vista]").forEach((b) => b.addEventListener("click", () => { vista = b.dataset.vista; $$("[data-vista]").forEach((x) => x.setAttribute("aria-pressed", x === b)); carregarAgenda(); }));
  $$("[data-passo]").forEach((b) => b.addEventListener("click", () => {
    const n = +b.dataset.passo;
    if (vista === "dia") ref = somaDias(ref, n);
    else if (vista === "semana") ref = somaDias(ref, 7 * n);
    else { let [a, m] = ref.split("-").map(Number); m += n; if (m > 12) { m = 1; a++; } if (m < 1) { m = 12; a--; } ref = `${a}-${String(m).padStart(2, "0")}-01`; }
    carregarAgenda();
  }));
  $("[data-hoje]").addEventListener("click", () => { ref = hojeSP(); carregarAgenda(); });

  async function carregarAgenda() {
    $("#periodo").textContent = rotuloPeriodo();
    $("#vista").innerHTML = `<p class="ag__carregando">Carregando agenda…</p>`;
    try { const p = periodo(); lista = await A.listar(p); renderAgenda(); }
    catch (e) { $("#vista").innerHTML = ""; falha(e); }
  }
  const passaFiltros = (a, comStatus = true) =>
    (!filtros.prof || a.profissional_id === filtros.prof) && (!filtros.area || a.area_id === filtros.area) && (!filtros.uni || a.unidade_id === filtros.uni) &&
    (!comStatus || filtros.st === "todos" || (filtros.st === "ativos" ? ativo(a.status) : filtros.st === "cancelados" ? cancelado(a.status) : a.status === filtros.st));

  function renderAgenda() {
    const p = periodo();
    const doPeriodo = lista.filter((a) => passaFiltros(a, false) && (vista !== "mes" || (a.data >= p.ini && a.data <= p.fim)));
    const conta = (f) => doPeriodo.filter(f).length;
    $("#contadores").innerHTML = [
      ["solicitado", "Aguardando confirmação", conta((a) => a.status === "solicitado")],
      ["confirmado", "Confirmados", conta((a) => a.status === "confirmado")],
      ["urgente", "Urgências", conta((a) => a.urgente && ativo(a.status))],
      ["cancelados", "Cancelados", conta((a) => cancelado(a.status))]
    ].map(([k, t, n]) => `<button type="button" class="pn-cont pn-cont--${k}" data-cont="${k}"><b>${n}</b><span>${t}</span></button>`).join("");
    const itens = lista.filter((a) => passaFiltros(a));
    if (vista === "dia") renderDia(itens);
    else if (vista === "semana") renderSemana(itens, p);
    else renderMes(itens, p);
  }
  $("#contadores").addEventListener("click", (e) => {
    const b = e.target.closest("[data-cont]"); if (!b) return;
    const k = b.dataset.cont;
    if (k === "urgente") return mostrarAba("urgencia");
    filtros.st = k; $("#f-st").value = k; renderAgenda();
  });

  function itemHTML(a, i = 0, compacto = false) {
    const [longo, curto] = ST[a.status] || [a.status, a.status];
    return `<button type="button" class="pn-item${compacto ? " pn-item--compacto" : ""}" style="--i:${i}" data-id="${esc(a.id)}" data-st="${esc(a.status)}"${a.urgente ? " data-urg" : ""}>
      <span class="pn-item__hora"><b>${hora5(a.hora)}</b>${compacto ? "" : `<small>até ${somaMin(hora5(a.hora), tolerancia())}</small>`}</span>
      <span class="pn-item__txt"><strong>${esc(compacto ? primeiro(a.paciente_nome) : a.paciente_nome)}${compacto ? "" : ` <em>${esc(idade(a.nascimento))}</em>`}</strong>
        <small>${esc(compacto ? profNome(a.profissional_id).replace(/^Dra?\. /, "") : `${profNome(a.profissional_id)} · ${areaRot(a.area_id)} · ${uniNome(a.unidade_id)}`)}</small></span>
      ${a.urgente ? `<span class="pn-urg" title="Urgência">Urgência</span>` : ""}
      <span class="pn-st pn-st--${esc(a.status)}" title="${esc(longo)}">${esc(compacto ? curto : longo)}</span>
    </button>`;
  }
  const vazio = (t) => `<div class="pn-vazio"><svg aria-hidden="true"><use href="#p-agenda"/></svg><p>${esc(t)}</p></div>`;
  function renderDia(itens) {
    $("#vista").className = "pn-vista pn-vista--dia";
    $("#vista").innerHTML = itens.length ? itens.map((a, i) => itemHTML(a, i)).join("") : vazio("Nenhum agendamento neste dia com estes filtros.");
  }
  function renderSemana(itens, p) {
    $("#vista").className = "pn-vista pn-vista--semana";
    let html = "";
    for (let d = p.de; d <= p.ate; d = somaDias(d, 1)) {
      const doDia = itens.filter((a) => a.data === d);
      html += `<div class="pn-col${d === hojeSP() ? " pn-col--hoje" : ""}"><button type="button" class="pn-col__topo" data-ir-dia="${d}"><span>${DSEM[diaSemana(d)]}</span><b>${Number(d.slice(8))}</b></button>
        <div class="pn-col__itens">${doDia.map((a, i) => itemHTML(a, i, true)).join("") || `<p class="pn-col__vazio">—</p>`}</div></div>`;
    }
    $("#vista").innerHTML = html;
  }
  function renderMes(itens, p) {
    $("#vista").className = "pn-vista pn-vista--mes";
    let html = DSEM.map((d) => `<span class="pn-mes__dsem">${d}</span>`).join("");
    for (let d = p.de; d <= p.ate; d = somaDias(d, 1)) {
      const doDia = itens.filter((a) => a.data === d), fora = d < p.ini || d > p.fim;
      const n = (f) => doDia.filter(f).length;
      const sol = n((a) => a.status === "solicitado"), conf = n((a) => a.status === "confirmado"), urg = n((a) => a.urgente && ativo(a.status)), outros = doDia.length - sol - conf;
      html += `<button type="button" class="pn-mes__dia${fora ? " pn-mes__dia--fora" : ""}${d === hojeSP() ? " pn-mes__dia--hoje" : ""}" data-ir-dia="${d}" aria-label="${esc(dataExt(d))}: ${doDia.length} agendamentos">
        <b>${Number(d.slice(8))}</b>
        <span class="pn-mes__marcas">${sol ? `<i class="m-sol">${sol}</i>` : ""}${conf ? `<i class="m-conf">${conf}</i>` : ""}${urg ? `<i class="m-urg">${urg}</i>` : ""}${outros > 0 && filtros.st !== "ativos" ? `<i class="m-out">${outros}</i>` : ""}</span></button>`;
    }
    $("#vista").innerHTML = html + `<p class="pn-legenda"><i class="m-sol"></i>Aguardando <i class="m-conf"></i>Confirmados <i class="m-urg"></i>Urgência</p>`;
  }
  $("#vista").addEventListener("click", (e) => {
    const d = e.target.closest("[data-ir-dia]");
    if (d) { ref = d.dataset.irDia; vista = "dia"; $$("[data-vista]").forEach((x) => x.setAttribute("aria-pressed", x.dataset.vista === "dia")); return carregarAgenda(); }
    const it = e.target.closest("[data-id]"); if (it) abrirDetalhe(lista.find((a) => a.id === it.dataset.id));
  });

  /* ---------- busca (código abre direto) ---------- */
  $("#form-busca").addEventListener("submit", async (e) => {
    e.preventDefault();
    const q = $("#busca").value.trim(); if (!q) return;
    try {
      if (/^CJ-?[A-Z2-9]{6}$/i.test(q)) {
        const a = await A.buscarCodigo(q.toUpperCase().replace(/^CJ-?/, "CJ-"));
        if (!a) return aviso("Nenhum agendamento com esse código.", true);
        return abrirDetalhe(a);
      }
      const r = await A.buscarTexto(q);
      $$(".pn-sec").forEach((s) => (s.hidden = s.dataset.sec !== "agenda"));
      $$(".pn-aba").forEach((b) => (b.dataset.aba === "agenda" ? b.setAttribute("aria-current", "page") : b.removeAttribute("aria-current")));
      $("#periodo").textContent = `Busca: "${q}" · ${r.length} resultado${r.length === 1 ? "" : "s"}`;
      $("#contadores").innerHTML = `<button type="button" class="pn-cont" data-limpar><span>Limpar busca</span></button>`;
      $("[data-limpar]").addEventListener("click", () => { $("#busca").value = ""; carregarAgenda(); });
      lista = r;
      $("#vista").className = "pn-vista pn-vista--dia";
      $("#vista").innerHTML = r.length ? r.map((a, i) => `<div class="pn-busca-item"><span class="pn-busca-data">${dataBR(a.data)}</span>${itemHTML(a, i)}</div>`).join("") : vazio("Nada encontrado.");
    } catch (err) { falha(err); }
  });

  /* ---------- detalhe ---------- */
  const dlgDet = $("#detalhe");
  let atual = null;
  function abrirDetalhe(a) { if (!a) return; atual = a; renderDetalhe(); abrirDlg(dlgDet); }
  function renderDetalhe() {
    const a = atual, h = hora5(a.hora), futuro = `${a.data}T${h}` > agoraSP();
    const [longo] = ST[a.status] || [a.status];
    const tel = U.foneBR(a.telefone);
    const acoes = [];
    if (a.status === "solicitado") acoes.push(`<button type="button" class="btn btn--primario" data-status="confirmado"><svg aria-hidden="true"><use href="#p-agenda"/></svg>Confirmar consulta</button>`);
    if (a.status === "confirmado" || (a.status === "solicitado" && !futuro)) acoes.push(`<button type="button" class="btn btn--suave" data-status="realizado">Realizado</button>`, `<button type="button" class="btn btn--suave" data-status="faltou">Faltou</button>`);
    if (ativo(a.status)) acoes.push(`<button type="button" class="btn btn--suave pn-btn-canc" data-status="cancelado_equipe" data-dois-passos>Cancelar consulta</button>`);
    if (!ativo(a.status)) acoes.push(`<button type="button" class="btn btn--suave" data-status="${futuro ? "solicitado" : "confirmado"}">${cancelado(a.status) ? "Reativar" : "Voltar para confirmado"}</button>`);
    $("#det-corpo").innerHTML = `
      <header class="pn-det__topo">
        <div><p class="pn-det__cod"><span>Código</span><b id="det-titulo">${esc(a.codigo)}</b>
          <button type="button" class="pn-copiar" data-copiar="${esc(a.codigo)}">Copiar</button></p>
          <span class="pn-st pn-st--${esc(a.status)}">${esc(longo)}</span>${a.urgente ? ` <span class="pn-urg">Urgência</span>` : ""}</div>
        <button type="button" class="agenda__fechar" data-fechar aria-label="Fechar">×</button>
      </header>
      <section class="pn-det__quando">
        <p class="pn-det__data">${esc(dataExt(a.data).replace(/^./, (c) => c.toUpperCase()))}<b>${h}</b></p>
        <p class="pn-det__tol">Pode atrasar até ${somaMin(h, tolerancia())} · duração ~${a.duracao_min} min</p>
        <p>${esc(profNome(a.profissional_id))} · ${esc(areaTit(a.area_id) || a.area)}</p>
        <p>Unidade ${esc(uniNome(a.unidade_id))} — ${esc(uniEnd(a.unidade_id))}</p>
      </section>
      <div class="pn-det__acoes">${acoes.join("")}</div>
      <section class="pn-det__bloco">
        <h3>Paciente</h3>
        <dl class="pn-dl">
          <dt>Nome</dt><dd>${esc(a.paciente_nome)}</dd>
          <dt>Nascimento</dt><dd>${dataBR(a.nascimento)} · ${esc(idade(a.nascimento))} · ${a.paciente_tipo === "crianca" ? "criança" : "adulto"}</dd>
          ${a.cpf ? `<dt>CPF</dt><dd>${esc(a.cpf)}</dd>` : ""}
          ${a.responsavel ? `<dt>Responsável</dt><dd>${esc(a.responsavel)}</dd>` : ""}
          <dt>WhatsApp</dt><dd>${tel ? esc(tel) : "—"}</dd>
          <dt>Atendimento</dt><dd>${esc(a.atendimento)}</dd>
        </dl>
        ${a.telefone ? `<div class="pn-det__wa">
          <button type="button" class="pn-wa" data-msg="confirmacao"><svg aria-hidden="true"><use href="#p-wa"/></svg>Enviar confirmação</button>
          <button type="button" class="pn-wa" data-msg="lembrete"><svg aria-hidden="true"><use href="#p-wa"/></svg>Enviar lembrete</button>
          <button type="button" class="pn-wa pn-wa--suave" data-msg="conversa"><svg aria-hidden="true"><use href="#p-wa"/></svg>Abrir conversa</button></div>` : ""}
      </section>
      ${ativo(a.status) ? `<section class="pn-det__bloco">
        <h3>Remarcar</h3>
        <div class="pn-remarcar">
          <label class="campo"><span>Unidade</span><select data-rm-uni>${cad.unidades.map((u) => `<option value="${esc(u.id)}"${u.id === a.unidade_id ? " selected" : ""}>${esc(u.nome)}</option>`).join("")}</select></label>
          <label class="campo"><span>Data</span><input type="date" data-rm-data value="${esc(a.data)}" min="${hojeSP()}"></label>
        </div>
        <div class="pn-rm-horas" data-rm-horas><p class="pn-dica">Escolha a unidade e a data para ver os horários livres.</p></div>
      </section>` : ""}
      <section class="pn-det__bloco">
        <h3>Anotações da equipe</h3>
        <label class="pn-check"><input type="checkbox" data-urgente ${a.urgente ? "checked" : ""}><span>Consulta de urgência</span></label>
        <textarea class="pn-obs" data-obs rows="3" maxlength="500" placeholder="Visível só para a equipe">${esc(a.observacao || "")}</textarea>
        <button type="button" class="btn btn--suave" data-salvar-obs>Salvar anotação</button>
      </section>
      <p class="pn-det__meta">Pedido pelo ${a.origem === "painel" ? "painel" : "site"} em ${new Date(a.criado_em).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}${a.cancelado_em ? ` · cancelado em ${new Date(a.cancelado_em).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}` : ""}</p>`;
    if (ativo(a.status)) carregarHorasRemarcar();
  }
  function textoMsg(tipo, a) {
    const h = hora5(a.hora), u = uniNome(a.unidade_id), end = uniEnd(a.unidade_id);
    const base = `Olá, ${contato(a)}! Aqui é do Instituto Corujinhas.`;
    if (tipo === "confirmacao") return `${base} A consulta de ${a.paciente_nome} com ${profNome(a.profissional_id)} está confirmada para ${dataExt(a.data)} às ${h}, na unidade ${u} (${end}). O atendimento pode atrasar até ${tolerancia()} minutos. Código: ${a.codigo}. Até lá!`;
    if (tipo === "lembrete") return `${base} Passando para lembrar da consulta de ${a.paciente_nome} com ${profNome(a.profissional_id)} em ${dataExt(a.data)} às ${h}, na unidade ${u} (${end}). Se precisar remarcar, é só responder esta mensagem.`;
    return `${base} `;
  }
  async function salvar(campos, msgOk) {
    try {
      const novo = await A.atualizar(atual.id, campos);
      Object.assign(atual, novo || campos);
      const i = lista.findIndex((x) => x.id === atual.id); if (i >= 0) lista[i] = atual;
      renderDetalhe(); if (aba === "agenda") renderAgenda(); else mostrarAba(aba);
      atualizarContadoresAbas();
      if (msgOk) aviso(msgOk);
      return true;
    } catch (e) { falha(e); return false; }
  }
  dlgDet.addEventListener("click", async (e) => {
    if (e.target === dlgDet || e.target.closest("[data-fechar]")) return dlgDet.close();
    const cp = e.target.closest("[data-copiar]");
    if (cp) { try { await navigator.clipboard.writeText(cp.dataset.copiar); aviso("Código copiado."); } catch { /* */ } return; }
    const st = e.target.closest("[data-status]");
    if (st) {
      if (st.hasAttribute("data-dois-passos") && !st.dataset.armado) {
        st.dataset.armado = "1"; st.textContent = "Clique de novo para cancelar"; st.classList.add("pn-btn-canc--armado");
        setTimeout(() => { if (st.isConnected) { delete st.dataset.armado; st.textContent = "Cancelar consulta"; st.classList.remove("pn-btn-canc--armado"); } }, 4000);
        return;
      }
      const rotulos = { confirmado: "Consulta confirmada.", realizado: "Marcada como realizada.", faltou: "Falta registrada.", cancelado_equipe: "Consulta cancelada. O horário foi liberado.", solicitado: "Consulta reativada." };
      const ok = await salvar({ status: st.dataset.status }, rotulos[st.dataset.status]);
      if (ok && st.dataset.status === "confirmado" && atual.telefone) {
        $(".pn-det__wa [data-msg=confirmacao]", dlgDet)?.classList.add("pn-wa--destaque");
      }
      return;
    }
    const msg = e.target.closest("[data-msg]");
    if (msg) return abrirLink(M.criarLinkPaciente(atual.telefone, textoMsg(msg.dataset.msg, atual)));
    if (e.target.closest("[data-salvar-obs]")) return salvar({ observacao: $("[data-obs]", dlgDet).value.trim(), urgente: $("[data-urgente]", dlgDet).checked }, "Anotação salva.");
    const mv = e.target.closest("[data-mover]");
    if (mv) {
      const uni = $("[data-rm-uni]", dlgDet).value, data = $("[data-rm-data]", dlgDet).value;
      return salvar({ unidade_id: uni, data, hora: mv.dataset.mover }, `Remarcada para ${dataBR(data)} às ${mv.dataset.mover}.`);
    }
  });
  dlgDet.addEventListener("change", (e) => {
    if (e.target.matches("[data-urgente]")) return salvar({ urgente: e.target.checked }, e.target.checked ? "Marcada como urgência." : "Urgência removida.");
    if (e.target.matches("[data-rm-uni], [data-rm-data]")) carregarHorasRemarcar();
  });
  async function carregarHorasRemarcar() {
    const box = $("[data-rm-horas]", dlgDet); if (!box) return;
    const uni = $("[data-rm-uni]", dlgDet).value, data = $("[data-rm-data]", dlgDet).value;
    if (!data) return;
    box.innerHTML = `<p class="ag__carregando">Buscando horários…</p>`;
    try {
      const hs = await A.horarios(atual.profissional_id, uni, data);
      box.innerHTML = hs.length ? `<div class="ag__lista">${hs.map((h) => `<button type="button" class="ag-hora" data-mover="${h}"><strong>${h}</strong><small>mover</small></button>`).join("")}</div>`
        : `<p class="pn-dica">Sem horários livres de ${esc(profNome(atual.profissional_id))} nesta unidade e data (confira a escala).</p>`;
    } catch (err) { box.innerHTML = ""; falha(err); }
  }

  /* ---------- urgência ---------- */
  async function carregarUrgencia() {
    const box = $("#lista-urg"); box.innerHTML = `<p class="ag__carregando">Carregando…</p>`;
    try {
      const r = (await A.listar({ de: hojeSP(), ate: somaDias(hojeSP(), 30) })).filter((a) => a.urgente && ativo(a.status));
      lista = r;
      box.innerHTML = r.length ? r.map((a, i) => `<div class="pn-busca-item"><span class="pn-busca-data">${a.data === hojeSP() ? "Hoje" : dataBR(a.data).slice(0, 5)}</span>${itemHTML(a, i)}</div>`).join("")
        : vazio("Nenhuma consulta de urgência em aberto.");
    } catch (e) { box.innerHTML = ""; falha(e); }
  }
  $("#lista-urg").addEventListener("click", (e) => { const it = e.target.closest("[data-id]"); if (it) abrirDetalhe(lista.find((a) => a.id === it.dataset.id)); });

  /* ---------- cancelados + fila de espera ---------- */
  let cancelados = [];
  async function carregarCancelados() {
    const box = $("#lista-canc"); box.innerHTML = `<p class="ag__carregando">Carregando…</p>`;
    try {
      cancelados = (await A.listar({ de: somaDias(hojeSP(), -7), ate: somaDias(hojeSP(), 90) }))
        .filter((a) => cancelado(a.status)).sort((x, y) => String(y.cancelado_em).localeCompare(String(x.cancelado_em)));
      box.innerHTML = cancelados.length ? cancelados.map((a, i) => {
        const h = hora5(a.hora), futuro = `${a.data}T${h}` > agoraSP();
        return `<article class="pn-canc" style="--i:${i}" data-canc="${esc(a.id)}">
          <div class="pn-canc__topo">
            <span class="pn-canc__vaga"><b>${dataBR(a.data).slice(0, 5)}</b><small>${h}</small></span>
            <div class="pn-canc__txt"><strong>${esc(profNome(a.profissional_id))} · ${esc(areaRot(a.area_id))}</strong>
              <small>Unidade ${esc(uniNome(a.unidade_id))} · era de ${esc(a.paciente_nome)} · ${esc(ST[a.status][0].toLowerCase())}</small></div>
            ${futuro ? `<button type="button" class="btn btn--suave" data-fila="${esc(a.id)}">Ver fila</button>` : `<span class="pn-dica">Horário já passou</span>`}
          </div>
          <div class="pn-fila" data-fila-box hidden></div>
        </article>`;
      }).join("") : vazio("Nenhum cancelamento recente.");
    } catch (e) { box.innerHTML = ""; falha(e); }
  }
  $("#lista-canc").addEventListener("click", async (e) => {
    const art = e.target.closest("[data-canc]"); if (!art) return;
    const vaga = cancelados.find((a) => a.id === art.dataset.canc), box = $("[data-fila-box]", art);
    if (e.target.closest("[data-fila]")) {
      if (!box.hidden) { box.hidden = true; return; }
      box.hidden = false; box.innerHTML = `<p class="ag__carregando">Procurando pacientes…</p>`;
      try {
        const fila = (await A.fila({ profissional_id: vaga.profissional_id, area_id: vaga.area_id, depoisDe: vaga.data }))
          .filter((a) => a.id !== vaga.id && `${a.data}T${hora5(a.hora)}` > `${vaga.data}T${hora5(vaga.hora)}`);
        box._fila = fila;
        box.innerHTML = fila.length ? `<p class="pn-dica">Pacientes de ${esc(profNome(vaga.profissional_id))} (${esc(areaRot(vaga.area_id))}) com consulta depois desta vaga, do mais próximo ao mais distante:</p>
          <ul>${fila.map((a) => `<li class="pn-fila__item" data-cand="${esc(a.id)}">
            <span><strong>${esc(a.paciente_nome)}</strong><small>Hoje marcada para ${dataBR(a.data).slice(0, 5)} às ${hora5(a.hora)} · ${esc(uniNome(a.unidade_id))}${a.vaga_oferecida_em ? ` · <b class="pn-oferecida">vaga oferecida</b>` : ""}</small></span>
            <span class="pn-fila__acoes">
              ${a.telefone ? `<button type="button" class="pn-wa" data-oferecer><svg aria-hidden="true"><use href="#p-wa"/></svg>Oferecer vaga</button>` : ""}
              <button type="button" class="btn btn--suave" data-adiantar>Adiantar para a vaga</button>
            </span></li>`).join("")}</ul>`
          : `<p class="pn-dica">Ninguém com consulta posterior para este profissional e tipo de consulta.</p>`;
      } catch (err) { box.innerHTML = ""; falha(err); }
      return;
    }
    const li = e.target.closest("[data-cand]"); if (!li) return;
    const cand = box._fila.find((a) => a.id === li.dataset.cand);
    if (e.target.closest("[data-oferecer]")) {
      const txt = `Olá, ${contato(cand)}! Aqui é do Instituto Corujinhas. Abriu uma vaga com ${profNome(vaga.profissional_id)} (${areaRot(vaga.area_id)}) em ${dataExt(vaga.data)} às ${hora5(vaga.hora)}, na unidade ${uniNome(vaga.unidade_id)}. A consulta de ${cand.paciente_nome} está marcada para ${dataExt(cand.data)} às ${hora5(cand.hora)}. Quer adiantar para esse horário? É só responder SIM.`;
      abrirLink(M.criarLinkPaciente(cand.telefone, txt));
      try { await A.atualizar(cand.id, { vaga_oferecida_em: new Date().toISOString() }); cand.vaga_oferecida_em = new Date().toISOString(); } catch { /* */ }
      $("small", li).insertAdjacentHTML("beforeend", cand.vaga_oferecida_em && !$(".pn-oferecida", li) ? ` · <b class="pn-oferecida">vaga oferecida</b>` : "");
      return;
    }
    const ad = e.target.closest("[data-adiantar]");
    if (ad) {
      if (!ad.dataset.armado) { ad.dataset.armado = "1"; ad.textContent = `Confirmar: mover para ${dataBR(vaga.data).slice(0, 5)} ${hora5(vaga.hora)}`; return; }
      try {
        await A.atualizar(cand.id, { data: vaga.data, hora: hora5(vaga.hora), unidade_id: vaga.unidade_id, vaga_oferecida_em: null });
        aviso(`${primeiro(cand.paciente_nome)} adiantado(a) para ${dataBR(vaga.data).slice(0, 5)} às ${hora5(vaga.hora)}. Avise o paciente.`);
        carregarCancelados();
      } catch (err) { falha(err); }
    }
  });

  /* ---------- nova consulta (painel) ---------- */
  const dlgForm = $("#formulario");
  function abrirNova(urgente) {
    const profs = cad.profissionais.filter((p) => p.ativo);
    $("#form-corpo").innerHTML = `
      <header class="pn-det__topo"><div><p class="pn-det__cod"><span>${urgente ? "Encaixe de urgência" : "Nova consulta"}</span></p><h2 id="form-titulo">Agendar pelo painel</h2></div>
        <button type="button" class="agenda__fechar" data-fechar aria-label="Fechar">×</button></header>
      <form id="form-nova" class="pn-form" novalidate>
        <div class="pn-form__grade">
          <label class="campo"><span>Profissional</span><select name="profissional_id" required>${profs.map((p) => `<option value="${esc(p.id)}">${esc(p.nome)}</option>`).join("")}</select></label>
          <label class="campo"><span>Tipo de consulta</span><select name="area_id" required></select></label>
          <label class="campo"><span>Unidade</span><select name="unidade_id" required>${cad.unidades.map((u) => `<option value="${esc(u.id)}">${esc(u.nome)}</option>`).join("")}</select></label>
          <label class="campo"><span>Data</span><input name="data" type="date" required value="${hojeSP()}"></label>
        </div>
        <div class="pn-form__horas" data-nv-horas></div>
        <label class="campo pn-form__encaixe"><span>Ou outro horário (encaixe)</span><input name="hora" type="time" step="300" required></label>
        <div class="agenda__tipo" role="radiogroup" aria-label="Paciente">
          <label><input type="radio" name="paciente_tipo" value="crianca" checked><span>Criança</span></label>
          <label><input type="radio" name="paciente_tipo" value="adulto"><span>Adulto</span></label>
        </div>
        <div class="pn-form__grade">
          <label class="campo"><span>Nome do paciente</span><input name="paciente_nome" required maxlength="80"></label>
          <label class="campo"><span>Nascimento</span><input name="nascimento" type="date" required></label>
          <label class="campo"><span>CPF</span><input name="cpf" inputmode="numeric" maxlength="14"></label>
          <label class="campo" data-nv-resp><span>Responsável</span><input name="responsavel" maxlength="80"></label>
          <label class="campo"><span>WhatsApp</span><input name="telefone" type="tel" inputmode="tel" maxlength="16" placeholder="(31) 90000-0000"></label>
          <label class="campo"><span>Atendimento</span><input name="atendimento" maxlength="80" value="Particular" list="lista-atend"></label>
        </div>
        <datalist id="lista-atend"><option value="Particular">${C.convenios.itens.map((i) => `<option value="${esc((i.categoria === "convenio" ? "Convênio " : "") + i.nome)}">`).join("")}</datalist>
        <label class="pn-check"><input type="checkbox" name="urgente" ${urgente ? "checked" : ""}><span>Consulta de urgência</span></label>
        <label class="pn-check"><input type="checkbox" name="confirmado" checked><span>Já confirmar (agendado pela equipe)</span></label>
        <textarea class="pn-obs" name="observacao" rows="2" maxlength="500" placeholder="Anotação interna (opcional)"></textarea>
        <p class="agenda__erro" data-nv-erro role="alert"></p>
        <button type="submit" class="btn btn--primario btn--grande">Salvar consulta</button>
      </form>`;
    const f = $("#form-nova");
    const atualizarAreas = () => {
      const p = cad.profissionais.find((x) => x.id === f.profissional_id.value);
      f.area_id.innerHTML = (p?.areas || []).map((id) => `<option value="${esc(id)}">${esc(areaRot(id))}</option>`).join("");
      const unis = [...new Set(cad.escalas.filter((e) => e.profissional_id === p?.id).map((e) => e.unidade_id))];
      if (unis.length && !unis.includes(f.unidade_id.value)) f.unidade_id.value = unis[0];
    };
    const atualizarHoras = async () => {
      const box = $("[data-nv-horas]", f); box.innerHTML = `<p class="ag__carregando">Horários livres…</p>`;
      try {
        const hs = await A.horarios(f.profissional_id.value, f.unidade_id.value, f.data.value);
        box.innerHTML = hs.length ? `<p class="pn-dica">Horários livres na escala:</p><div class="ag__lista">${hs.map((h) => `<button type="button" class="ag-hora" data-nv-hora="${h}"><strong>${h}</strong></button>`).join("")}</div>`
          : `<p class="pn-dica">Sem horários livres na escala para esta data. Use um horário de encaixe.</p>`;
      } catch { box.innerHTML = ""; }
    };
    const tipo = () => { $("[data-nv-resp]", f).hidden = f.paciente_tipo.value !== "crianca"; };
    f.addEventListener("change", (e) => {
      if (e.target.name === "profissional_id") { atualizarAreas(); atualizarHoras(); }
      if (e.target.name === "unidade_id" || e.target.name === "data") atualizarHoras();
      if (e.target.name === "paciente_tipo") tipo();
    });
    f.addEventListener("click", (e) => {
      const b = e.target.closest("[data-nv-hora]"); if (!b) return;
      f.hora.value = b.dataset.nvHora; $$(".ag-hora", f).forEach((x) => x.classList.toggle("ag-hora--sel", x === b));
    });
    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      const erro = $("[data-nv-erro]", f), tel = f.telefone.value.replace(/\D/g, "");
      const nome = f.paciente_nome.value.trim().replace(/\s+/g, " ");
      if (!f.hora.value) return (erro.textContent = "Escolha um horário.");
      if (nome.split(" ").length < 2) return (erro.textContent = "Informe o nome completo do paciente.");
      if (!f.nascimento.value) return (erro.textContent = "Informe a data de nascimento.");
      if (tel && tel.length < 10) return (erro.textContent = "WhatsApp com DDD.");
      erro.textContent = "";
      try {
        const reg = await A.criarInterno({
          profissional_id: f.profissional_id.value, area_id: f.area_id.value, area: areaTit(f.area_id.value), unidade_id: f.unidade_id.value,
          data: f.data.value, hora: f.hora.value, duracao_min: cad.ajustes.duracao_min, paciente_nome: nome, paciente_tipo: f.paciente_tipo.value,
          nascimento: f.nascimento.value, cpf: f.cpf.value.trim(), responsavel: f.paciente_tipo.value === "crianca" ? f.responsavel.value.trim() : "",
          telefone: tel, atendimento: f.atendimento.value.trim() || "Particular", urgente: f.urgente.checked,
          status: f.confirmado.checked ? "confirmado" : "solicitado", observacao: f.observacao.value.trim()
        });
        dlgForm.close(); aviso(`Consulta salva · código ${reg.codigo}`);
        ref = reg.data; await mostrarAba(reg.urgente ? "urgencia" : "agenda");
        abrirDetalhe(reg);
      } catch (err) { erro.textContent = A.mensagemErro(err); }
    });
    atualizarAreas(); tipo(); atualizarHoras();
    abrirDlg(dlgForm);
  }
  $("#novo").addEventListener("click", () => abrirNova(false));
  $("#novo-urg").addEventListener("click", () => abrirNova(true));
  dlgForm.addEventListener("click", (e) => { if (e.target === dlgForm || e.target.closest("[data-fechar]")) dlgForm.close(); });

  /* ---------- escalas ---------- */
  let profSel = null, celulaSel = null;
  const FAIXAS_PADRAO = [["08:00", "12:00"], ["17:00", "22:00"]];
  function renderEscalas() {
    const profs = [...cad.profissionais].sort((a, b) => (b.ativo - a.ativo) || a.ordem - b.ordem);
    if (!profSel || !profs.some((p) => p.id === profSel)) profSel = profs[0]?.id;
    $("#lista-profs").innerHTML = profs.map((p) => {
      const n = cad.escalas.filter((e) => e.profissional_id === p.id).length;
      return `<li><button type="button" class="pn-prof${p.id === profSel ? " pn-prof--sel" : ""}${p.ativo ? "" : " pn-prof--inativo"}" data-prof="${esc(p.id)}">
        <strong>${esc(p.nome)}</strong><small>${p.ativo ? (n ? `${n} ${n === 1 ? "dia" : "dias"} na agenda online` : "Sem escala · só WhatsApp") : "Inativo"}</small></button></li>`;
    }).join("");
    renderEscala();
    const f = $("#form-ajustes");
    ["duracao_min", "tolerancia_min", "antecedencia_min", "horizonte_dias"].forEach((k) => (f[k].value = cad.ajustes[k]));
  }
  function renderEscala() {
    const p = cad.profissionais.find((x) => x.id === profSel), box = $("#escala");
    if (!p) { box.innerHTML = ""; return; }
    const esc_ = cad.escalas.filter((e) => e.profissional_id === p.id);
    const repetidos = [0, 1, 2, 3, 4, 5, 6].filter((d) => esc_.filter((e) => e.dia_semana === d).length > 1);
    const folgas = cad.bloqueios.filter((b) => b.profissional_id === p.id);
    const fx = (e) => e.faixas.map(([i, f]) => `${i.replace(":00", "h").replace(/^0/, "")}–${f.replace(":00", "h").replace(/^0/, "")}`).join(" · ");
    box.innerHTML = `
      <div class="pn-escala__topo">
        <div><h3>${esc(p.nome)}</h3><p>${p.areas.map((a) => `<span class="pn-tag">${esc(areaRot(a))}</span>`).join("")}</p></div>
        <div class="pn-escala__btns">
          <button type="button" class="btn btn--suave" data-editar-prof>Editar</button>
          <button type="button" class="btn btn--suave" data-ativar="${p.ativo ? "0" : "1"}">${p.ativo ? "Desativar" : "Reativar"}</button>
        </div>
      </div>
      <p class="pn-dica">Toque num dia para ativar ou editar as faixas de horário daquela unidade. Padrão: 8h–12h e 17h–22h.</p>
      <div class="pn-grade" role="grid" aria-label="Escala semanal">
        <span></span>${DSEM.map((d) => `<span class="pn-grade__dsem">${d}</span>`).join("")}
        ${cad.unidades.map((u) => `<span class="pn-grade__uni" data-cor="${esc(C.unidades.find((x) => x.id === u.id)?.cor || "")}">${esc(u.nome.replace("Shopping Vale do Aço", "Shopping"))}</span>` +
          [0, 1, 2, 3, 4, 5, 6].map((d) => {
            const e = esc_.find((x) => x.unidade_id === u.id && x.dia_semana === d), sel = celulaSel && celulaSel.u === u.id && celulaSel.d === d;
            return `<button type="button" class="pn-cel${e ? " pn-cel--on" : ""}${sel ? " pn-cel--sel" : ""}" data-cel-u="${esc(u.id)}" data-cel-d="${d}" aria-label="${esc(u.nome)}, ${DSEM_L[d]}: ${e ? fx(e) : "sem atendimento"}">${e ? `<small>${esc(fx(e))}</small>` : "<i>+</i>"}</button>`;
          }).join("")).join("")}
      </div>
      ${repetidos.length ? `<p class="pn-alerta">${repetidos.map((d) => DSEM_L[d]).join(", ")}: em mais de uma unidade. O paciente escolhe a unidade e o sistema não deixa o mesmo horário ser marcado duas vezes. Se o profissional fica em cada unidade num período, ajuste as faixas (ex.: manhã numa, noite na outra).</p>` : ""}
      <div class="pn-faixas" id="faixas"></div>
      <div class="pn-folgas">
        <h4>Folgas e dias sem atendimento</h4>
        <ul>${folgas.map((b) => `<li><span>${dataBR(b.data)} · ${esc(DSEM_L[diaSemana(b.data)])}${b.motivo ? ` · ${esc(b.motivo)}` : ""}</span><button type="button" data-tirar-folga="${esc(b.data)}" aria-label="Remover folga">×</button></li>`).join("") || `<li class="pn-dica">Nenhuma folga marcada.</li>`}</ul>
        <form class="pn-folga-form" id="form-folga"><input type="date" name="data" min="${hojeSP()}" required aria-label="Data da folga"><input name="motivo" placeholder="Motivo (opcional)" maxlength="60" aria-label="Motivo"><button type="submit" class="btn btn--suave">Bloquear dia</button></form>
      </div>`;
    if (celulaSel) renderFaixas();
  }
  function renderFaixas() {
    const e = cad.escalas.find((x) => x.profissional_id === profSel && x.unidade_id === celulaSel.u && x.dia_semana === celulaSel.d);
    const box = $("#faixas"); if (!box) return;
    if (!e) { box.innerHTML = ""; return; }
    box.innerHTML = `<div class="pn-faixas__caixa"><h4>${esc(uniNome(e.unidade_id))} · ${DSEM_L[e.dia_semana]}</h4>
      <div data-linhas>${e.faixas.map(([i, f]) => linhaFaixa(i, f)).join("")}</div>
      <button type="button" class="pn-link" data-add-faixa>+ Adicionar faixa</button>
      <div class="pn-faixas__acoes"><button type="button" class="btn btn--suave pn-btn-canc" data-tirar-dia>Tirar este dia</button><button type="button" class="btn btn--primario" data-salvar-faixas>Salvar horários</button></div></div>`;
  }
  const linhaFaixa = (i, f) => `<div class="pn-faixa"><input type="time" value="${i}" step="900" aria-label="Início"><span>até</span><input type="time" value="${f}" step="900" aria-label="Fim"><button type="button" data-tirar-faixa aria-label="Remover faixa">×</button></div>`;

  $("#lista-profs").addEventListener("click", (e) => { const b = e.target.closest("[data-prof]"); if (b) { profSel = b.dataset.prof; celulaSel = null; renderEscalas(); } });
  $("#escala").addEventListener("click", async (e) => {
    const cel = e.target.closest("[data-cel-u]");
    if (cel) {
      const u = cel.dataset.celU, d = +cel.dataset.celD;
      const existe = cad.escalas.find((x) => x.profissional_id === profSel && x.unidade_id === u && x.dia_semana === d);
      celulaSel = { u, d };
      if (!existe) {
        const nova = { profissional_id: profSel, unidade_id: u, dia_semana: d, faixas: FAIXAS_PADRAO };
        try { await A.salvarEscala(nova); cad.escalas.push(nova); aviso(`${DSEM_L[d]} em ${uniNome(u)} ativado (8h–12h e 17h–22h).`); } catch (err) { return falha(err); }
      }
      renderEscala(); $("#faixas")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      return;
    }
    if (e.target.closest("[data-add-faixa]")) { $("[data-linhas]").insertAdjacentHTML("beforeend", linhaFaixa("13:00", "17:00")); return; }
    if (e.target.closest("[data-tirar-faixa]")) { e.target.closest(".pn-faixa").remove(); return; }
    if (e.target.closest("[data-salvar-faixas]")) {
      const faixas = $$(".pn-faixa").map((l) => $$("input", l).map((i) => i.value)).filter(([i, f]) => i && f);
      if (!faixas.length) return aviso("Adicione pelo menos uma faixa ou tire o dia.", true);
      if (faixas.some(([i, f]) => i >= f)) return aviso("O fim de cada faixa precisa ser depois do início.", true);
      faixas.sort((x, y) => x[0].localeCompare(y[0]));
      if (faixas.some((f, k) => k && f[0] < faixas[k - 1][1])) return aviso("As faixas não podem se sobrepor.", true);
      const reg = { profissional_id: profSel, unidade_id: celulaSel.u, dia_semana: celulaSel.d, faixas };
      try { await A.salvarEscala(reg); cad.escalas.find((x) => x.profissional_id === profSel && x.unidade_id === reg.unidade_id && x.dia_semana === reg.dia_semana).faixas = faixas; aviso("Horários salvos."); renderEscala(); }
      catch (err) { falha(err); }
      return;
    }
    if (e.target.closest("[data-tirar-dia]")) {
      const reg = { profissional_id: profSel, unidade_id: celulaSel.u, dia_semana: celulaSel.d };
      try { await A.removerEscala(reg); cad.escalas = cad.escalas.filter((x) => !(x.profissional_id === reg.profissional_id && x.unidade_id === reg.unidade_id && x.dia_semana === reg.dia_semana)); celulaSel = null; aviso("Dia retirado da escala. Consultas já marcadas continuam valendo."); renderEscalas(); }
      catch (err) { falha(err); }
      return;
    }
    const tf = e.target.closest("[data-tirar-folga]");
    if (tf) { try { await A.removerBloqueio({ profissional_id: profSel, data: tf.dataset.tirarFolga }); cad.bloqueios = cad.bloqueios.filter((b) => !(b.profissional_id === profSel && b.data === tf.dataset.tirarFolga)); renderEscala(); } catch (err) { falha(err); } return; }
    const at = e.target.closest("[data-ativar]");
    if (at) {
      const p = cad.profissionais.find((x) => x.id === profSel);
      try { at.dataset.ativar === "1" ? await A.salvarProfissional({ ...p, ativo: true }) : await A.removerProfissional(p.id); p.ativo = at.dataset.ativar === "1"; aviso(p.ativo ? "Profissional reativado." : "Profissional desativado: some da agenda online. Consultas marcadas continuam."); renderEscalas(); preencherFiltros(); }
      catch (err) { falha(err); }
      return;
    }
    if (e.target.closest("[data-editar-prof]")) abrirProf(cad.profissionais.find((x) => x.id === profSel));
  });
  $("#escala").addEventListener("submit", async (e) => {
    if (e.target.id !== "form-folga") return;
    e.preventDefault();
    const b = { profissional_id: profSel, data: e.target.data.value, motivo: e.target.motivo.value.trim() };
    if (!b.data) return;
    try { await A.salvarBloqueio(b); cad.bloqueios.push(b); cad.bloqueios.sort((x, y) => x.data.localeCompare(y.data)); aviso(`${dataBR(b.data)} bloqueado. Novas marcações não aparecem nesse dia.`); renderEscala(); }
    catch (err) { falha(err); }
  });
  $("#form-ajustes").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target, a = {};
    ["duracao_min", "tolerancia_min", "antecedencia_min", "horizonte_dias"].forEach((k) => (a[k] = Number(f[k].value)));
    try { await A.salvarAjustes(a); Object.assign(cad.ajustes, a); aviso("Regras salvas. Valem para os próximos agendamentos."); } catch (err) { falha(err); }
  });

  const slug = (t) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40);
  function abrirProf(p) {
    const novo = !p;
    $("#form-corpo").innerHTML = `
      <header class="pn-det__topo"><div><p class="pn-det__cod"><span>Equipe</span></p><h2 id="form-titulo">${novo ? "Adicionar profissional" : "Editar profissional"}</h2></div>
        <button type="button" class="agenda__fechar" data-fechar aria-label="Fechar">×</button></header>
      <form id="form-prof" class="pn-form" novalidate>
        <label class="campo"><span>Nome como aparece para o paciente</span><input name="nome" required maxlength="60" value="${esc(p?.nome || "")}" placeholder="Dra. Nome Sobrenome"></label>
        <fieldset class="pn-areas"><legend>Tipos de consulta que atende</legend>
          ${C.areas.map((a) => `<label class="pn-check"><input type="checkbox" name="areas" value="${esc(a.id)}" ${p?.areas.includes(a.id) ? "checked" : ""}><span>${esc(areaRot(a.id))}</span></label>`).join("")}
        </fieldset>
        ${novo ? `<p class="pn-dica">Depois de salvar, monte a escala dele. Para aparecer com foto na seção "Equipe" do site, a inclusão no site é feita à parte.</p>` : ""}
        <p class="agenda__erro" data-pf-erro role="alert"></p>
        <button type="submit" class="btn btn--primario btn--grande">Salvar</button>
      </form>`;
    $("#form-prof").addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = e.target, nome = f.nome.value.trim(), areas = $$('input[name=areas]:checked', f).map((i) => i.value);
      if (nome.length < 4) return ($("[data-pf-erro]", f).textContent = "Informe o nome.");
      if (!areas.length) return ($("[data-pf-erro]", f).textContent = "Marque pelo menos um tipo de consulta.");
      let id = p?.id || slug(nome);
      if (novo && cad.profissionais.some((x) => x.id === id)) id += "_" + Date.now().toString(36).slice(-3);
      const reg = { id, nome, areas, ativo: p?.ativo ?? true, ordem: p?.ordem ?? cad.profissionais.length + 1 };
      try {
        await A.salvarProfissional(reg);
        if (novo) cad.profissionais.push(reg); else Object.assign(p, reg);
        dlgForm.close(); profSel = id; celulaSel = null; renderEscalas(); preencherFiltros();
        aviso(novo ? "Profissional adicionado. Agora toque nos dias para montar a escala." : "Dados salvos.");
      } catch (err) { $("[data-pf-erro]", f).textContent = A.mensagemErro(err); }
    });
    abrirDlg(dlgForm);
  }
  $("#add-prof").addEventListener("click", () => abrirProf(null));

  /* ---------- atualização automática ---------- */
  async function recarregarTudo() { cad = await A.cadastros(); preencherFiltros(); await mostrarAba(aba); }
  setInterval(() => {
    if (document.hidden || dlgDet.open || dlgForm.open || $("#tela-app").hidden || aba === "escalas" || $("#busca").value) return;
    mostrarAba(aba);
  }, 60000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden && !$("#tela-app").hidden && !dlgDet.open && !dlgForm.open && aba !== "escalas" && !$("#busca").value) mostrarAba(aba); });

  /* ---------- início ---------- */
  (async () => {
    if (A.modo === "desligado") { $("#tela-login").hidden = false; $("#login-erro").textContent = "Agenda online não configurada."; return; }
    if (A.sessao()) return iniciar();
    if (A.modo === "demo") { await A.entrar("demonstracao"); return iniciar(); }
    $("#tela-login").hidden = false;
  })();
}
