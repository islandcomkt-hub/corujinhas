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
  let pedidoAtual = null, origemAgenda = null;
  let unidadeId = ler(CHAVE_UNI, "");

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
    lista.innerHTML = pacientes.map((p, i) => {
      const meta = [p.tipo === "crianca" ? "Criança" : "Adulto", textoIdade(idade(p.nascimento)), p.atendimento].filter(Boolean).join(" · ");
      return `<li style="--i:${i}">
        <a class="paciente" href="${esc(linkPara(p))}" target="_blank" rel="noopener" data-paciente="${esc(p.id)}">
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
    if (nome === "cadastro") setTimeout(() => $('[name="tipo"]:checked', form)?.focus() || $('[name="tipo"]', form).focus(), 30);
    else setTimeout(() => $(".paciente", dlg)?.focus(), 30);
  }
  function preencherAtendimento() {
    const conv = C.convenios.itens.filter((i) => i.categoria === "convenio"), parc = C.convenios.itens.filter((i) => i.categoria === "parceria");
    $("#agenda-atendimento").innerHTML = `<option value="Particular">Particular</option>
      <optgroup label="Convênios">${conv.map((i) => `<option value="Convênio ${esc(i.nome)}">${esc(i.nome)}</option>`).join("")}</optgroup>
      <optgroup label="Parcerias">${parc.map((i) => `<option value="${esc(i.nome)}">${esc(i.nome)}</option>`).join("")}</optgroup>
      <option value="Outro convênio (informo na conversa)">Outro convênio</option>`;
  }
  function abrirAgenda(a, pedido, uniFixa) {
    origemAgenda = a; pedidoAtual = pedido;
    if (uniFixa !== undefined) unidadeId = uniFixa;
    $("#agenda-contexto").textContent = rotuloPedido(pedido);
    renderUnidadesChips(); renderPacientes();
    form.reset(); atualizarTipo(); $("#agenda-erro").textContent = "";
    if (typeof dlg.showModal === "function") dlg.showModal(); else dlg.setAttribute("open", "");
    mostrarEtapa(pacientes.length ? "pacientes" : "cadastro");
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
    $("#agenda-erro").textContent = erros[0] || "";
    if (erros.length) { $(".campo--erro input, .campo--erro select", f)?.focus(); return null; }
    return { id: `p${Date.now().toString(36)}`, tipo, nome, nascimento: f.nascimento.value, cpf: cpf ? mascaraCPF(cpf) : "", responsavel: tipo === "crianca" ? resp : "", atendimento: f.atendimento.value };
  }
  function abrirWhatsApp(url) {
    const w = window.open(url, "_blank", "noopener");
    if (!w) location.href = url;
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
      if (igual >= 0) pacientes[igual] = { ...pac, id: pacientes[igual].id }; else pacientes.push(pac);
      gravar(CHAVE_PAC, pacientes);
    }
    const url = linkPara(pac);
    M.registrarIntencao({ ...pedidoAtual, unidadeId: unidadeId || null, cadastro: true });
    abrirWhatsApp(url);
    dlg.close();
  });
  dlg.addEventListener("change", (e) => {
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
    const pac = e.target.closest(".paciente");
    if (pac) {
      M.registrarIntencao({ ...pedidoAtual, unidadeId: unidadeId || null, pacienteSalvo: true });
      setTimeout(() => dlg.close(), 80);
    }
  });
  dlg.addEventListener("close", () => origemAgenda?.focus({ preventScroll: true }));
  preencherAtendimento();

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
    const com = C.areas.filter((a) => !a.semEquipeNominal);
    const sem = C.areas.filter((a) => a.semEquipeNominal);
    categorias.innerHTML = `
      <div class="cat-grupo"><h3 class="cat-grupo__t">Com equipe apresentada</h3>
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
      if (e.target.closest(".pro__texto, button")) return;
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
      <g class="mapa__pin" transform="translate(160 100)">
        <ellipse class="mapa__anel" rx="16" ry="7"/><ellipse class="mapa__anel mapa__anel--2" rx="16" ry="7"/>
        <ellipse class="mapa__sombra" rx="7" ry="2.6"/>
        <g class="mapa__gota"><path d="M0 0C-6-8-12-13-12-21a12 12 0 0 1 24 0C12-13 6-8 0 0Z"/><circle cy="-21" r="5.2"/></g>
      </g>
    </svg>`;
  }

  function renderUnidades() {
    $("#lista-unidades").innerHTML = C.unidades.map((u, i) => `
      <li class="unidade" style="--i:${i}" data-entrada="unidade" data-cor="${esc(u.cor || "azul")}">
        <div class="unidade__mapa">${mapaSVG(u)}<span class="unidade__regiao">${esc(u.regiao || "")}</span></div>
        <div class="unidade__corpo">
          <h3>${esc(u.nome)}</h3>
          <p class="unidade__end">${esc(u.enderecoCurto || "Endereço informado pela central")}</p>
          <p class="unidade__hora"><svg aria-hidden="true"><use href="#i-relogio"/></svg><span>${u.horario.map(esc).join("<br>")}${u.divergencia ? " *" : ""}</span></p>
          <div class="unidade__acoes">
            ${u.mapa ? `<a class="u-btn" href="${esc(u.mapa)}" target="_blank" rel="noopener"><svg aria-hidden="true"><use href="#i-mapa"/></svg>Ver mapa</a>` : ""}
            <a class="u-btn" href="tel:${esc(u.telefone.tel)}" aria-label="Ligar agora para a unidade ${esc(u.nome)}, ${esc(u.telefone.exibicao)}"><svg aria-hidden="true"><use href="#i-tel"/></svg>Ligar agora</a>
            <a class="u-btn u-btn--forte" href="#" data-agendar-unidade="${esc(u.id)}" data-unidade-fixa="${esc(u.id)}"><svg aria-hidden="true"><use href="#i-wa"/></svg>Agendar</a>
          </div>
          ${u.extra ? `<div class="unidade__extra"><p><b>${esc(u.extra.rotulo)}</b><span>${esc(u.extra.exibicao)}</span></p>
            <span class="unidade__extra-acoes">
              ${u.extra.whatsapp ? `<a class="u-mini" href="https://wa.me/${esc(u.extra.whatsapp)}?text=${encodeURIComponent(`Olá! Vim pelo site do Instituto Corujinhas e gostaria de falar sobre ${u.extra.rotulo.toLowerCase()} na unidade ${u.nome}.`)}" target="_blank" rel="noopener" aria-label="WhatsApp da ${esc(u.extra.rotulo)} ${esc(u.nome)}"><svg aria-hidden="true"><use href="#i-wa"/></svg>WhatsApp</a>` : ""}
              <a class="u-mini" href="tel:${esc(u.extra.tel)}" aria-label="Ligar para ${esc(u.extra.rotulo)} ${esc(u.nome)}"><svg aria-hidden="true"><use href="#i-tel"/></svg>Ligar</a>
            </span></div>` : ""}
        </div>
      </li>`).join("");
    $$("[data-agendar-unidade]").forEach((a) => ligar(a, { tipo: "geral" }));
    const div = C.unidades.find((u) => u.divergencia);
    $("#unidades-nota").innerHTML = `${div ? `* ${esc(div.nome)}: ${esc(div.divergencia)}. Confirme com a central. ` : ""}Mapas ilustrados com dados © colaboradores do <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>.`;
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
