/*
 * Instituto Corujinhas — acesso à agenda online.
 * Um único objeto (window.CorujinhasAgenda) com a mesma interface em dois modos:
 *  • "supabase": banco real (assets/js/agenda-config.js preenchido). Visitante só usa as funções agenda_*;
 *    a equipe entra com e-mail e senha e lê/edita as tabelas protegidas por RLS.
 *  • "demo": tudo no navegador (localStorage), para apresentar e testar sem banco. Nada é reservado de verdade.
 *  • "desligado": sem banco e sem ?demo — o site volta ao agendamento pelo WhatsApp.
 */
(function () {
  const CFG = window.CORUJINHAS_AGENDA || {};
  const temBanco = !!(CFG.supabaseUrl && CFG.supabaseAnonKey);
  const pedeDemo = (() => {
    try {
      if (/[?&]demo\b/.test(location.search)) sessionStorage.setItem("corujinhas-demo", "1");
      if (/[?&]sair-demo\b/.test(location.search)) sessionStorage.removeItem("corujinhas-demo");
      return sessionStorage.getItem("corujinhas-demo") === "1";
    } catch { return /[?&]demo\b/.test(location.search); }
  })();
  // o painel sem banco configurado abre direto em demonstração
  const ehPainel = /^\/painel/.test(location.pathname);
  const modo = temBanco ? "supabase" : (pedeDemo || ehPainel) ? "demo" : "desligado";

  /* ---------- utilidades de data (sempre no fuso de São Paulo) ---------- */
  const agoraSP = () => new Date().toLocaleString("sv-SE", { timeZone: "America/Sao_Paulo" }).replace(" ", "T").slice(0, 16); // "2026-11-26T07:16"
  const hojeSP = () => agoraSP().slice(0, 10);
  const somaDias = (iso, n) => { const d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const diaSemana = (iso) => new Date(iso + "T12:00:00Z").getUTCDay();
  const min = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };
  const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  const ATIVOS = (s) => s !== "cancelado_paciente" && s !== "cancelado_equipe";

  class ErroAgenda extends Error { constructor(codigo) { super(codigo); this.codigo = codigo; } }
  const MENSAGENS_ERRO = {
    HORARIO_INDISPONIVEL: "Esse horário acabou de ser ocupado. Escolha outro, por favor.",
    LIMITE_PEDIDOS: "Este WhatsApp já tem vários agendamentos em aberto. Fale com a central para marcar mais.",
    DADOS_INVALIDOS: "Confira os dados do paciente e tente de novo.",
    PROFISSIONAL_INDISPONIVEL: "A agenda online deste profissional não está disponível agora.",
    UNIDADE_INVALIDA: "Escolha uma unidade válida.",
    NAO_CANCELAVEL: "Este agendamento não pode mais ser cancelado pelo site. Fale com a central.",
    SEM_CONEXAO: "Não foi possível conectar. Verifique a internet e tente de novo.",
    LOGIN: "E-mail ou senha incorretos.",
    SEM_PERMISSAO: "Este usuário não tem acesso ao painel."
  };
  const mensagemErro = (e) => MENSAGENS_ERRO[e?.codigo] || MENSAGENS_ERRO[e?.message] || "Algo deu errado. Tente de novo em instantes.";

  /* =================================================================
   * Modo SUPABASE
   * ================================================================= */
  function adaptadorSupabase() {
    const URL_BASE = CFG.supabaseUrl.replace(/\/$/, "");
    const CHAVE_SESSAO = "corujinhas-painel-sessao";
    let sessao = (() => { try { return JSON.parse(sessionStorage.getItem(CHAVE_SESSAO)); } catch { return null; } })();
    const salvarSessao = (s) => { sessao = s; try { s ? sessionStorage.setItem(CHAVE_SESSAO, JSON.stringify(s)) : sessionStorage.removeItem(CHAVE_SESSAO); } catch { /* */ } };

    async function renovar() {
      if (!sessao?.refresh_token) return;
      const r = await fetch(`${URL_BASE}/auth/v1/token?grant_type=refresh_token`, {
        method: "POST", headers: { apikey: CFG.supabaseAnonKey, "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: sessao.refresh_token })
      });
      if (!r.ok) { salvarSessao(null); throw new ErroAgenda("LOGIN"); }
      const j = await r.json();
      salvarSessao({ access_token: j.access_token, refresh_token: j.refresh_token, expira: Date.now() + j.expires_in * 1000, email: j.user?.email });
    }
    async function token() {
      if (sessao && sessao.expira - Date.now() < 60000) await renovar();
      return sessao?.access_token || CFG.supabaseAnonKey;
    }
    async function pedir(caminho, { metodo = "GET", corpo, prefer } = {}) {
      let r;
      try {
        r = await fetch(`${URL_BASE}${caminho}`, {
          method: metodo,
          headers: {
            apikey: CFG.supabaseAnonKey, Authorization: `Bearer ${await token()}`,
            "Content-Type": "application/json", ...(prefer ? { Prefer: prefer } : {})
          },
          body: corpo === undefined ? undefined : JSON.stringify(corpo)
        });
      } catch { throw new ErroAgenda("SEM_CONEXAO"); }
      const texto = await r.text();
      const j = texto ? JSON.parse(texto) : null;
      if (!r.ok) {
        const m = (j && (j.message || j.msg)) || "";
        const cod = Object.keys(MENSAGENS_ERRO).find((k) => m.includes(k)) || (r.status === 401 || r.status === 403 ? "SEM_PERMISSAO" : m.includes("duplicate") ? "HORARIO_INDISPONIVEL" : "ERRO");
        throw new ErroAgenda(cod);
      }
      return j;
    }
    const rpc = (nome, args) => pedir(`/rest/v1/rpc/${nome}`, { metodo: "POST", corpo: args });
    const tab = (t, query = "") => pedir(`/rest/v1/${t}${query}`);
    const enc = encodeURIComponent;

    return {
      ajustes: () => rpc("agenda_ajustes", {}),
      profissionais: () => rpc("agenda_profissionais", {}),
      unidades: (prof) => rpc("agenda_unidades", { p_prof: prof }),
      dias: (prof, uni, de, ate) => rpc("agenda_dias", { p_prof: prof, p_unidade: uni, p_de: de, p_ate: ate }),
      horarios: async (prof, uni, data) => (await rpc("agenda_horarios", { p_prof: prof, p_unidade: uni, p_data: data })).map((r) => r.hora),
      criar: (p) => rpc("agenda_criar", { p }),
      consultar: (codigo, nascimento) => rpc("agenda_consultar", { p_codigo: codigo, p_nascimento: nascimento }),
      cancelar: (codigo, nascimento) => rpc("agenda_cancelar", { p_codigo: codigo, p_nascimento: nascimento }),

      // ---------- equipe ----------
      async entrar(email, senha) {
        let r;
        try {
          r = await fetch(`${URL_BASE}/auth/v1/token?grant_type=password`, {
            method: "POST", headers: { apikey: CFG.supabaseAnonKey, "Content-Type": "application/json" },
            body: JSON.stringify({ email, password: senha })
          });
        } catch { throw new ErroAgenda("SEM_CONEXAO"); }
        if (!r.ok) throw new ErroAgenda("LOGIN");
        const j = await r.json();
        salvarSessao({ access_token: j.access_token, refresh_token: j.refresh_token, expira: Date.now() + j.expires_in * 1000, email: j.user?.email });
        const eu = await tab("equipe", "?select=user_id&limit=1");
        if (!eu.length) { salvarSessao(null); throw new ErroAgenda("SEM_PERMISSAO"); }
        return { email: j.user?.email };
      },
      async sair() {
        try { await fetch(`${URL_BASE}/auth/v1/logout`, { method: "POST", headers: { apikey: CFG.supabaseAnonKey, Authorization: `Bearer ${sessao?.access_token}` } }); } catch { /* */ }
        salvarSessao(null);
      },
      sessao: () => (sessao ? { email: sessao.email } : null),
      listar: ({ de, ate }) => tab("agendamentos", `?select=*&data=gte.${de}&data=lte.${ate}&order=data.asc,hora.asc`),
      buscarCodigo: async (codigo) => (await tab("agendamentos", `?select=*&codigo=eq.${enc(codigo.trim().toUpperCase())}`))[0] || null,
      buscarTexto: (texto) => tab("agendamentos", `?select=*&or=(paciente_nome.ilike.*${enc(texto)}*,responsavel.ilike.*${enc(texto)}*,cpf.ilike.*${enc(texto)}*,telefone.ilike.*${enc(texto.replace(/\D/g, "") || texto)}*)&order=data.desc,hora.desc&limit=50`),
      fila: ({ profissional_id, area_id, depoisDe }) => tab("agendamentos",
        `?select=*&profissional_id=eq.${enc(profissional_id)}&area_id=eq.${enc(area_id)}&data=gte.${depoisDe}&status=in.(solicitado,confirmado)&order=data.asc,hora.asc&limit=40`),
      atualizar: async (id, campos) => (await pedir(`/rest/v1/agendamentos?id=eq.${id}`, { metodo: "PATCH", corpo: campos, prefer: "return=representation" }))[0],
      criarInterno: async (reg) => (await pedir(`/rest/v1/agendamentos`, { metodo: "POST", corpo: { ...reg, origem: "painel" }, prefer: "return=representation" }))[0],
      async cadastros() {
        const [profissionais, unidades, escalas, bloqueios, ajustes] = await Promise.all([
          tab("profissionais", "?select=*&order=ordem.asc,nome.asc"), tab("unidades", "?select=*&order=ordem.asc"),
          tab("escalas", "?select=*"), tab("bloqueios", `?select=*&data=gte.${hojeSP()}&order=data.asc`), tab("ajustes", "?select=*")]);
        return { profissionais, unidades, escalas, bloqueios, ajustes: ajustes[0] };
      },
      salvarProfissional: (p) => pedir(`/rest/v1/profissionais?on_conflict=id`, { metodo: "POST", corpo: p, prefer: "resolution=merge-duplicates,return=representation" }),
      removerProfissional: (id) => pedir(`/rest/v1/profissionais?id=eq.${enc(id)}`, { metodo: "PATCH", corpo: { ativo: false } }),
      salvarEscala: (e) => pedir(`/rest/v1/escalas?on_conflict=profissional_id,unidade_id,dia_semana`, { metodo: "POST", corpo: { profissional_id: e.profissional_id, unidade_id: e.unidade_id, dia_semana: e.dia_semana, faixas: e.faixas }, prefer: "resolution=merge-duplicates,return=representation" }),
      removerEscala: (e) => pedir(`/rest/v1/escalas?profissional_id=eq.${enc(e.profissional_id)}&unidade_id=eq.${enc(e.unidade_id)}&dia_semana=eq.${e.dia_semana}`, { metodo: "DELETE" }),
      salvarBloqueio: (b) => pedir(`/rest/v1/bloqueios?on_conflict=profissional_id,data`, { metodo: "POST", corpo: b, prefer: "resolution=merge-duplicates" }),
      removerBloqueio: (b) => pedir(`/rest/v1/bloqueios?profissional_id=eq.${enc(b.profissional_id)}&data=eq.${b.data}`, { metodo: "DELETE" }),
      salvarAjustes: (a) => pedir(`/rest/v1/ajustes?id=eq.true`, { metodo: "PATCH", corpo: a })
    };
  }

  /* =================================================================
   * Modo DEMONSTRAÇÃO (localStorage) — mesmas regras do banco
   * ================================================================= */
  function adaptadorDemo() {
    const CHAVE = "corujinhas-demo-v2";
    const FAIXAS = [["08:00", "12:00"], ["17:00", "22:00"]];
    const C = window.CORUJINHAS_CONFIG;
    function semente() {
      const unidades = C.unidades.map((u, i) => ({ id: u.id, nome: u.nome, endereco: u.enderecoCurto || "", ordem: i + 1 }));
      const areasDe = (id) => C.areas.filter((a) => a.profissionais.includes(id)).map((a) => a.id);
      const profissionais = Object.entries(C.profissionais).map(([id, p], i) => ({ id, nome: p.nome, areas: areasDe(id), ativo: true, ordem: i + 1 }));
      const escalas = [
        ["unidade-horto", 1], ["unidade-horto", 2], ["unidade-horto", 3], ["unidade-bom-jardim", 3], ["unidade-bom-jardim", 4],
        ["unidade-shopping", 5], ["unidade-shopping", 6], ["unidade-shopping", 0]
      ].map(([u, d], i) => ({ id: i + 1, profissional_id: "dra_leticia_nacife", unidade_id: u, dia_semana: d, faixas: FAIXAS }));
      // TESTE: os demais profissionais recebem uma escala de exemplo (2 dias em cada uma de 3 unidades) para dar para agendar com todos.
      profissionais.filter((p) => p.id !== "dra_leticia_nacife").forEach((p, i) => {
        [[1, 2], [3, 4], [5, 6]].forEach((dias, k) => dias.forEach((d) =>
          escalas.push({ id: escalas.length + 1, profissional_id: p.id, unidade_id: unidades[(i + k) % unidades.length].id, dia_semana: d, faixas: FAIXAS })));
      });
      const banco = { unidades, profissionais, escalas, bloqueios: [], agendamentos: [], seq: 100,
        ajustes: { duracao_min: 30, tolerancia_min: 15, antecedencia_min: 60, horizonte_dias: 60, max_ativos_por_contato: 4 } };
      // alguns pedidos de exemplo para o painel não começar vazio
      const exemplos = [
        ["Helena Exemplo Costa", "crianca", "2020-04-12", "Carla Exemplo Costa", "31988880001", 0, "08:30", "confirmado"],
        ["Davi Exemplo Rocha", "crianca", "2018-09-30", "Renato Exemplo Rocha", "31988880002", 0, "17:00", "solicitado"],
        ["Laura Exemplo Dias", "crianca", "2022-01-08", "Bruna Exemplo Dias", "31988880003", 1, "09:00", "solicitado"],
        ["Miguel Exemplo Lima", "crianca", "2019-06-21", "Paula Exemplo Lima", "31988880004", 2, "18:30", "confirmado"],
        ["Alice Exemplo Melo", "crianca", "2021-11-02", "Tiago Exemplo Melo", "31988880005", 7, "10:00", "solicitado"]
      ];
      let d0 = hojeSP(); let base = 1;
      while (!escalas.some((e) => e.dia_semana === diaSemana(somaDias(d0, base)))) base++;
      exemplos.forEach(([nome, tipo, nasc, resp, tel, offs, hora, status], i) => {
        let data = somaDias(d0, base + offs);
        while (!escalas.some((e) => e.dia_semana === diaSemana(data))) data = somaDias(data, 1);
        const esc = escalas.find((e) => e.dia_semana === diaSemana(data));
        banco.agendamentos.push(registro(banco, { profissional_id: "dra_leticia_nacife", area_id: "pediatria", area: "Pediatria", unidade_id: esc.unidade_id,
          data, hora, paciente_nome: nome, paciente_tipo: tipo, nascimento: nasc, cpf: "", responsavel: resp, telefone: tel,
          atendimento: i % 2 ? "Convênio Usisaúde" : "Particular", status, urgente: i === 2, origem: "site" }));
      });
      return banco;
    }
    function codigo() {
      const a = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; const b = new Uint8Array(6); crypto.getRandomValues(b);
      return "CJ-" + [...b].map((x) => a[x % 31]).join("");
    }
    function registro(banco, r) {
      const agora = new Date().toISOString();
      return { id: crypto.randomUUID ? crypto.randomUUID() : String(++banco.seq), codigo: codigo(), duracao_min: banco.ajustes.duracao_min,
        status: "solicitado", urgente: false, cpf: "", responsavel: "", observacao: "", origem: "site", criado_em: agora, atualizado_em: agora,
        cancelado_em: null, vaga_oferecida_em: null, area_id: "", area: "", ...r };
    }
    const carregar = () => { try { const b = JSON.parse(localStorage.getItem(CHAVE)); if (b && b.agendamentos) return b; } catch { /* */ } const b = semente(); salvar(b); return b; };
    const salvar = (b) => { try { localStorage.setItem(CHAVE, JSON.stringify(b)); } catch { /* */ } };
    const espera = (v) => new Promise((ok) => setTimeout(() => ok(JSON.parse(JSON.stringify(v))), 120));

    function livres(b, prof, uni, data) {
      const aj = b.ajustes, agora = agoraSP(), hoje = agora.slice(0, 10);
      if (data < hoje || data > somaDias(hoje, aj.horizonte_dias)) return [];
      if (!b.profissionais.some((p) => p.id === prof && p.ativo)) return [];
      if (b.bloqueios.some((x) => x.profissional_id === prof && x.data === data)) return [];
      const esc = b.escalas.find((e) => e.profissional_id === prof && e.unidade_id === uni && e.dia_semana === diaSemana(data));
      if (!esc) return [];
      const ocupados = b.agendamentos.filter((a) => a.profissional_id === prof && a.data === data && ATIVOS(a.status));
      const limite = data === hoje ? min(agora.slice(11)) + aj.antecedencia_min : -1;
      const out = [];
      for (const [i, f] of esc.faixas) {
        for (let t = min(i); t + aj.duracao_min <= min(f); t += aj.duracao_min) {
          if (t < limite) continue;
          if (ocupados.some((a) => min(a.hora) < t + aj.duracao_min && min(a.hora) + a.duracao_min > t)) continue;
          out.push(hhmm(t));
        }
      }
      return out.sort();
    }
    const resumo = (b, a) => {
      const p = b.profissionais.find((x) => x.id === a.profissional_id), u = b.unidades.find((x) => x.id === a.unidade_id);
      return { codigo: a.codigo, profissional: p?.nome, area: a.area, unidade: u?.nome, endereco: u?.endereco, data: a.data, hora: a.hora, status: a.status, paciente: a.paciente_nome.split(" ")[0] };
    };
    let sessao = (() => { try { return JSON.parse(sessionStorage.getItem("corujinhas-demo-sessao")); } catch { return null; } })();

    return {
      ajustes: () => { const a = carregar().ajustes; return espera({ duracao_min: a.duracao_min, tolerancia_min: a.tolerancia_min, antecedencia_min: a.antecedencia_min, horizonte_dias: a.horizonte_dias }); },
      profissionais: () => { const b = carregar(); return espera(b.profissionais.filter((p) => p.ativo && b.escalas.some((e) => e.profissional_id === p.id)).sort((x, y) => x.ordem - y.ordem).map(({ id, nome, areas }) => ({ id, nome, areas }))); },
      unidades: (prof) => {
        const b = carregar();
        if (!b.profissionais.some((p) => p.id === prof && p.ativo)) return espera([]);
        return espera(b.unidades.map((u) => ({ unidade_id: u.id, nome: u.nome, dias: b.escalas.filter((e) => e.profissional_id === prof && e.unidade_id === u.id).map((e) => e.dia_semana).sort() }))
          .filter((u) => u.dias.length));
      },
      dias: (prof, uni, de, ate) => {
        const b = carregar(), out = [];
        for (let d = de; d <= ate; d = somaDias(d, 1)) if (b.escalas.some((e) => e.profissional_id === prof && e.unidade_id === uni && e.dia_semana === diaSemana(d))) out.push({ data: d, livres: livres(b, prof, uni, d).length });
        return espera(out);
      },
      horarios: (prof, uni, data) => espera(livres(carregar(), prof, uni, data)),
      criar: (p) => {
        const b = carregar(), tel = String(p.telefone || "").replace(/\D/g, "");
        if (!livres(b, p.profissional_id, p.unidade_id, p.data).includes(p.hora)) return Promise.reject(new ErroAgenda("HORARIO_INDISPONIVEL"));
        if (b.agendamentos.filter((a) => a.telefone === tel && a.data >= hojeSP() && (a.status === "solicitado" || a.status === "confirmado")).length >= b.ajustes.max_ativos_por_contato) return Promise.reject(new ErroAgenda("LIMITE_PEDIDOS"));
        const r = registro(b, { ...p, telefone: tel, responsavel: p.paciente_tipo === "crianca" ? p.responsavel : "", origem: "site" });
        b.agendamentos.push(r); salvar(b);
        const u = b.unidades.find((x) => x.id === r.unidade_id), pr = b.profissionais.find((x) => x.id === r.profissional_id);
        return espera({ codigo: r.codigo, data: r.data, hora: r.hora, unidade: u.nome, profissional: pr.nome, status: r.status });
      },
      consultar: (codigo, nasc) => { const b = carregar(); const a = b.agendamentos.find((x) => x.codigo === codigo.trim().toUpperCase() && x.nascimento === nasc); return espera(a ? resumo(b, a) : null); },
      cancelar: (codigo, nasc) => {
        const b = carregar(); const a = b.agendamentos.find((x) => x.codigo === codigo.trim().toUpperCase() && x.nascimento === nasc);
        if (!a || !["solicitado", "confirmado"].includes(a.status) || `${a.data}T${a.hora}` <= agoraSP()) return Promise.reject(new ErroAgenda("NAO_CANCELAVEL"));
        a.status = "cancelado_paciente"; a.cancelado_em = a.atualizado_em = new Date().toISOString(); salvar(b);
        return espera(resumo(b, a));
      },

      entrar: (email) => { sessao = { email: email || "demo@corujinhas" }; try { sessionStorage.setItem("corujinhas-demo-sessao", JSON.stringify(sessao)); } catch { /* */ } return espera(sessao); },
      sair: () => { sessao = null; try { sessionStorage.removeItem("corujinhas-demo-sessao"); } catch { /* */ } return espera(null); },
      sessao: () => sessao,
      listar: ({ de, ate }) => espera(carregar().agendamentos.filter((a) => a.data >= de && a.data <= ate).sort((x, y) => (x.data + x.hora).localeCompare(y.data + y.hora))),
      buscarCodigo: (c) => espera(carregar().agendamentos.find((a) => a.codigo === c.trim().toUpperCase()) || null),
      buscarTexto: (t) => {
        const q = t.toLowerCase(), dig = t.replace(/\D/g, "");
        return espera(carregar().agendamentos.filter((a) => a.paciente_nome.toLowerCase().includes(q) || a.responsavel.toLowerCase().includes(q) || (dig && (a.cpf.replace(/\D/g, "").includes(dig) || a.telefone.includes(dig))))
          .sort((x, y) => (y.data + y.hora).localeCompare(x.data + x.hora)).slice(0, 50));
      },
      fila: ({ profissional_id, area_id, depoisDe }) => espera(carregar().agendamentos.filter((a) => a.profissional_id === profissional_id && a.area_id === area_id && a.data >= depoisDe && (a.status === "solicitado" || a.status === "confirmado"))
        .sort((x, y) => (x.data + x.hora).localeCompare(y.data + y.hora))),
      atualizar: (id, campos) => {
        const b = carregar(); const a = b.agendamentos.find((x) => x.id === id);
        const novo = { ...a, ...campos };
        if (ATIVOS(novo.status) && (campos.data || campos.hora || campos.status) && b.agendamentos.some((x) => x.id !== id && x.profissional_id === novo.profissional_id && x.data === novo.data && x.hora === novo.hora && ATIVOS(x.status)))
          return Promise.reject(new ErroAgenda("HORARIO_INDISPONIVEL"));
        if (campos.status && !ATIVOS(campos.status) && ATIVOS(a.status)) novo.cancelado_em = new Date().toISOString();
        if (campos.status && ATIVOS(campos.status)) novo.cancelado_em = null;
        novo.atualizado_em = new Date().toISOString();
        Object.assign(a, novo); salvar(b); return espera(a);
      },
      criarInterno: (reg) => {
        const b = carregar();
        if (b.agendamentos.some((x) => x.profissional_id === reg.profissional_id && x.data === reg.data && x.hora === reg.hora && ATIVOS(x.status))) return Promise.reject(new ErroAgenda("HORARIO_INDISPONIVEL"));
        const r = registro(b, { ...reg, origem: "painel" }); b.agendamentos.push(r); salvar(b); return espera(r);
      },
      cadastros: () => { const b = carregar(); return espera({ profissionais: b.profissionais, unidades: b.unidades, escalas: b.escalas, bloqueios: b.bloqueios.filter((x) => x.data >= hojeSP()), ajustes: b.ajustes }); },
      salvarProfissional: (p) => { const b = carregar(); const i = b.profissionais.findIndex((x) => x.id === p.id); if (i >= 0) b.profissionais[i] = { ...b.profissionais[i], ...p }; else b.profissionais.push({ ativo: true, ordem: b.profissionais.length + 1, ...p }); salvar(b); return espera(p); },
      removerProfissional: (id) => { const b = carregar(); const p = b.profissionais.find((x) => x.id === id); if (p) p.ativo = false; salvar(b); return espera(null); },
      salvarEscala: (e) => { const b = carregar(); const i = b.escalas.findIndex((x) => x.profissional_id === e.profissional_id && x.unidade_id === e.unidade_id && x.dia_semana === e.dia_semana); if (i >= 0) b.escalas[i].faixas = e.faixas; else b.escalas.push({ id: ++b.seq, ...e }); salvar(b); return espera(e); },
      removerEscala: (e) => { const b = carregar(); b.escalas = b.escalas.filter((x) => !(x.profissional_id === e.profissional_id && x.unidade_id === e.unidade_id && x.dia_semana === e.dia_semana)); salvar(b); return espera(null); },
      salvarBloqueio: (x) => { const b = carregar(); if (!b.bloqueios.some((y) => y.profissional_id === x.profissional_id && y.data === x.data)) b.bloqueios.push({ id: ++b.seq, motivo: "", ...x }); salvar(b); return espera(x); },
      removerBloqueio: (x) => { const b = carregar(); b.bloqueios = b.bloqueios.filter((y) => !(y.profissional_id === x.profissional_id && y.data === x.data)); salvar(b); return espera(null); },
      salvarAjustes: (a) => { const b = carregar(); Object.assign(b.ajustes, a); salvar(b); return espera(b.ajustes); },
      reiniciarDemo: () => { try { localStorage.removeItem(CHAVE); } catch { /* */ } carregar(); }
    };
  }

  const api = modo === "supabase" ? adaptadorSupabase() : modo === "demo" ? adaptadorDemo() : {};
  window.CorujinhasAgenda = { modo, ativo: modo !== "desligado", ...api, mensagemErro, ErroAgenda, util: { agoraSP, hojeSP, somaDias, diaSemana } };
})();
