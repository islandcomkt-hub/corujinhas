-- =====================================================================
-- Instituto Corujinhas — agenda online (Supabase / Postgres)
-- Rodar inteiro no SQL Editor do Supabase (pode rodar de novo: é idempotente).
--
-- Modelo de acesso
--  • Visitante do site (papel anon): NÃO lê nenhuma tabela. Só chama as funções
--    agenda_* abaixo, que devolvem horários livres, criam um pedido, consultam ou
--    cancelam um agendamento pelo código + data de nascimento.
--  • Atendentes (usuários do Supabase Auth cadastrados na tabela equipe): leem e
--    alteram tudo pelo painel /painel. Quem não está em equipe não vê nada.
-- =====================================================================

-- ---------- Tabelas ----------
create table if not exists public.unidades (
  id        text primary key,
  nome      text not null,
  endereco  text not null default '',
  ordem     smallint not null default 0
);

create table if not exists public.profissionais (
  id      text primary key,                       -- mesmo id do config.js do site (ex.: dra_leticia_nacife)
  nome    text not null,
  areas   text[] not null default '{}',           -- ids de área (ex.: {pediatria})
  ativo   boolean not null default true,
  ordem   smallint not null default 0,
  criado_em timestamptz not null default now()
);

-- Escala: em que unidade o profissional atende em cada dia da semana e em quais faixas.
-- dia_semana: 0 = domingo … 6 = sábado. faixas: [["08:00","12:00"],["17:00","22:00"]]
create table if not exists public.escalas (
  id              bigint generated always as identity primary key,
  profissional_id text not null references public.profissionais(id) on delete cascade,
  unidade_id      text not null references public.unidades(id) on delete cascade,
  dia_semana      smallint not null check (dia_semana between 0 and 6),
  faixas          jsonb not null default '[["08:00","12:00"],["17:00","22:00"]]',
  unique (profissional_id, unidade_id, dia_semana)
);

-- Folgas / dias bloqueados de um profissional (todas as unidades).
create table if not exists public.bloqueios (
  id              bigint generated always as identity primary key,
  profissional_id text not null references public.profissionais(id) on delete cascade,
  data            date not null,
  motivo          text not null default '',
  unique (profissional_id, data)
);

create table if not exists public.ajustes (
  id                     boolean primary key default true check (id),
  duracao_min            smallint not null default 30,   -- duração de cada atendimento
  tolerancia_min         smallint not null default 15,   -- atraso possível avisado ao paciente (até 45 min no total)
  antecedencia_min       smallint not null default 60,   -- não oferece horário que começa em menos de 1 h
  horizonte_dias         smallint not null default 60,   -- agenda aberta até 60 dias à frente
  max_ativos_por_contato smallint not null default 4     -- limite de pedidos futuros por WhatsApp (anti-abuso)
);
insert into public.ajustes default values on conflict do nothing;

create table if not exists public.equipe (
  user_id   uuid primary key,          -- id do usuário em Authentication → Users
  nome      text not null default '',
  criado_em timestamptz not null default now()
);

-- Código curto para a atendente localizar o agendamento (sem letras/números ambíguos).
create or replace function public.gerar_codigo() returns text
language plpgsql volatile set search_path = public as $$
declare
  alfabeto constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  b bytea := uuid_send(gen_random_uuid());
  r text := '';
begin
  for i in 0..5 loop
    r := r || substr(alfabeto, (get_byte(b, i) % 31) + 1, 1);
  end loop;
  return 'CJ-' || r;
end $$;

create table if not exists public.agendamentos (
  id               uuid primary key default gen_random_uuid(),
  codigo           text not null unique default public.gerar_codigo(),
  profissional_id  text not null references public.profissionais(id),
  area_id          text not null default '',
  area             text not null default '',
  unidade_id       text not null references public.unidades(id),
  data             date not null,
  hora             time not null,
  duracao_min      smallint not null default 30,
  status           text not null default 'solicitado'
                   check (status in ('solicitado','confirmado','realizado','faltou','cancelado_paciente','cancelado_equipe')),
  urgente          boolean not null default false,
  paciente_nome    text not null,
  paciente_tipo    text not null check (paciente_tipo in ('crianca','adulto')),
  nascimento       date not null,
  cpf              text not null default '',
  responsavel      text not null default '',
  telefone         text not null default '',      -- WhatsApp de contato, só dígitos com DDD
  atendimento      text not null default 'Particular',
  observacao       text not null default '',      -- anotação interna da equipe
  origem           text not null default 'site' check (origem in ('site','painel')),
  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now(),
  atualizado_por   uuid,
  cancelado_em     timestamptz,
  vaga_oferecida_em timestamptz                   -- quando a equipe ofereceu uma vaga antecipada
);

-- Um profissional não pode ter dois agendamentos ativos no mesmo início de horário.
create unique index if not exists agendamentos_horario_unico
  on public.agendamentos (profissional_id, data, hora)
  where status not in ('cancelado_paciente','cancelado_equipe');
create index if not exists agendamentos_data on public.agendamentos (data, hora);
create index if not exists agendamentos_telefone on public.agendamentos (telefone);

create or replace function public.agendamentos_atualizado() returns trigger
language plpgsql set search_path = public as $$
begin
  new.atualizado_em := now();
  begin new.atualizado_por := auth.uid(); exception when others then null; end;
  if new.status in ('cancelado_paciente','cancelado_equipe') and old.status not in ('cancelado_paciente','cancelado_equipe') then
    new.cancelado_em := now();
  elsif new.status not in ('cancelado_paciente','cancelado_equipe') then
    new.cancelado_em := null;
  end if;
  return new;
end $$;
drop trigger if exists agendamentos_atualizado on public.agendamentos;
create trigger agendamentos_atualizado before update on public.agendamentos
  for each row execute function public.agendamentos_atualizado();

-- ---------- Acesso ----------
create or replace function public.eh_equipe() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.equipe where user_id = auth.uid());
$$;

alter table public.unidades      enable row level security;
alter table public.profissionais enable row level security;
alter table public.escalas       enable row level security;
alter table public.bloqueios     enable row level security;
alter table public.ajustes       enable row level security;
alter table public.equipe        enable row level security;
alter table public.agendamentos  enable row level security;

do $$
declare t text;
begin
  foreach t in array array['unidades','profissionais','escalas','bloqueios','ajustes','agendamentos'] loop
    execute format('drop policy if exists equipe_total on public.%I', t);
    execute format('create policy equipe_total on public.%I for all to authenticated using (public.eh_equipe()) with check (public.eh_equipe())', t);
  end loop;
end $$;
drop policy if exists equipe_le_equipe on public.equipe;
create policy equipe_le_equipe on public.equipe for select to authenticated using (public.eh_equipe());

revoke all on public.unidades, public.profissionais, public.escalas, public.bloqueios, public.ajustes, public.equipe, public.agendamentos from anon;
grant select, insert, update, delete on public.unidades, public.profissionais, public.escalas, public.bloqueios, public.agendamentos to authenticated;
grant select, update on public.ajustes to authenticated;
grant select on public.equipe to authenticated;

-- ---------- Regras da agenda ----------
create or replace function public._agora_sp() returns timestamp
language sql stable as $$ select (now() at time zone 'America/Sao_Paulo') $$;

-- Horários livres de um profissional numa unidade e data (respeita escala, folgas,
-- consultas já marcadas em QUALQUER unidade, antecedência e horizonte).
create or replace function public._horarios_livres(p_prof text, p_unidade text, p_data date)
returns setof time
language plpgsql stable security definer set search_path = public as $$
declare
  aj public.ajustes;
  esc public.escalas;
  f jsonb;
  t time; ini time; fim time;
  agora timestamp := public._agora_sp();
begin
  select * into aj from public.ajustes limit 1;
  if p_data < agora::date or p_data > agora::date + aj.horizonte_dias then return; end if;
  if not exists (select 1 from public.profissionais where id = p_prof and ativo) then return; end if;
  if exists (select 1 from public.bloqueios where profissional_id = p_prof and data = p_data) then return; end if;
  select * into esc from public.escalas
   where profissional_id = p_prof and unidade_id = p_unidade and dia_semana = extract(dow from p_data)::int;
  if not found then return; end if;
  for f in select * from jsonb_array_elements(esc.faixas) loop
    ini := (f->>0)::time; fim := (f->>1)::time;
    t := ini;
    while t + make_interval(mins => aj.duracao_min) <= fim and t >= ini loop
      if (p_data + t) >= agora + make_interval(mins => aj.antecedencia_min)
         and not exists (
           select 1 from public.agendamentos a
            where a.profissional_id = p_prof and a.data = p_data
              and a.status not in ('cancelado_paciente','cancelado_equipe')
              and a.hora < t + make_interval(mins => aj.duracao_min)
              and a.hora + make_interval(mins => a.duracao_min) > t) then
        return next t;
      end if;
      exit when t + make_interval(mins => aj.duracao_min) < t; -- proteção contra virada da meia-noite
      t := t + make_interval(mins => aj.duracao_min);
    end loop;
  end loop;
end $$;

-- ---------- Funções públicas (site) ----------
create or replace function public.agenda_ajustes()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object('duracao_min', duracao_min, 'tolerancia_min', tolerancia_min,
                           'antecedencia_min', antecedencia_min, 'horizonte_dias', horizonte_dias)
    from public.ajustes limit 1;
$$;

-- Profissionais com agenda online (ativos e com escala).
create or replace function public.agenda_profissionais()
returns table (id text, nome text, areas text[])
language sql stable security definer set search_path = public as $$
  select p.id, p.nome, p.areas from public.profissionais p
   where p.ativo and exists (select 1 from public.escalas e where e.profissional_id = p.id)
   order by p.ordem, p.nome;
$$;

-- Unidades em que o profissional atende e os dias da semana de cada uma.
create or replace function public.agenda_unidades(p_prof text)
returns table (unidade_id text, nome text, dias smallint[])
language sql stable security definer set search_path = public as $$
  select u.id, u.nome, array_agg(e.dia_semana order by e.dia_semana)
    from public.escalas e join public.unidades u on u.id = e.unidade_id
    join public.profissionais p on p.id = e.profissional_id and p.ativo
   where e.profissional_id = p_prof
   group by u.id, u.nome, u.ordem order by u.ordem;
$$;

-- Dias com vaga num intervalo (no máximo 62 dias por chamada).
create or replace function public.agenda_dias(p_prof text, p_unidade text, p_de date, p_ate date)
returns table (data date, livres int)
language sql stable security definer set search_path = public as $$
  select d::date, (select count(*)::int from public._horarios_livres(p_prof, p_unidade, d::date))
    from generate_series(p_de, least(p_ate, p_de + 62), interval '1 day') d
   where exists (select 1 from public.escalas e where e.profissional_id = p_prof and e.unidade_id = p_unidade
                   and e.dia_semana = extract(dow from d)::int);
$$;

create or replace function public.agenda_horarios(p_prof text, p_unidade text, p_data date)
returns table (hora text)
language sql stable security definer set search_path = public as $$
  select to_char(h, 'HH24:MI') from public._horarios_livres(p_prof, p_unidade, p_data) h order by h;
$$;

-- Cria o pedido de agendamento (status "solicitado"; a equipe confirma pelo WhatsApp).
create or replace function public.agenda_criar(p jsonb)
returns json language plpgsql volatile security definer set search_path = public as $$
declare
  aj public.ajustes;
  v_prof public.profissionais;
  v_uni public.unidades;
  v_data date; v_hora time; v_nasc date;
  v_tel text := regexp_replace(coalesce(p->>'telefone',''), '\D', '', 'g');
  v_cpf text := regexp_replace(coalesce(p->>'cpf',''), '\D', '', 'g');
  v_tipo text := p->>'paciente_tipo';
  v_nome text := btrim(regexp_replace(coalesce(p->>'paciente_nome',''), '\s+', ' ', 'g'));
  v_resp text := btrim(regexp_replace(coalesce(p->>'responsavel',''), '\s+', ' ', 'g'));
  v_area text := coalesce(p->>'area_id','');
  r public.agendamentos;
begin
  select * into aj from public.ajustes limit 1;
  select * into v_prof from public.profissionais where id = p->>'profissional_id' and ativo;
  if not found then raise exception 'PROFISSIONAL_INDISPONIVEL'; end if;
  select * into v_uni from public.unidades where id = p->>'unidade_id';
  if not found then raise exception 'UNIDADE_INVALIDA'; end if;
  begin
    v_data := (p->>'data')::date; v_hora := (p->>'hora')::time; v_nasc := (p->>'nascimento')::date;
  exception when others then raise exception 'DADOS_INVALIDOS'; end;
  if v_area = '' or not (v_area = any (v_prof.areas)) then v_area := coalesce(v_prof.areas[1], ''); end if;
  if v_tipo not in ('crianca','adulto') or length(v_nome) < 5 or length(v_nome) > 80 or position(' ' in v_nome) = 0
     or v_nasc is null or v_nasc > public._agora_sp()::date or v_nasc < date '1900-01-01'
     or length(v_tel) not between 10 and 13
     or (v_cpf <> '' and length(v_cpf) <> 11)
     or (v_tipo = 'adulto' and v_cpf = '')
     or (v_tipo = 'crianca' and (length(v_resp) < 5 or position(' ' in v_resp) = 0))
     or length(coalesce(p->>'atendimento','')) > 80 then
    raise exception 'DADOS_INVALIDOS';
  end if;
  -- serializa pedidos do mesmo profissional no mesmo dia
  perform pg_advisory_xact_lock(hashtext(v_prof.id || v_data::text));
  if not exists (select 1 from public._horarios_livres(v_prof.id, v_uni.id, v_data) h where h = v_hora) then
    raise exception 'HORARIO_INDISPONIVEL';
  end if;
  if (select count(*) from public.agendamentos
       where telefone = v_tel and data >= public._agora_sp()::date
         and status in ('solicitado','confirmado')) >= aj.max_ativos_por_contato then
    raise exception 'LIMITE_PEDIDOS';
  end if;
  insert into public.agendamentos (profissional_id, area_id, area, unidade_id, data, hora, duracao_min,
         paciente_nome, paciente_tipo, nascimento, cpf, responsavel, telefone, atendimento, origem)
  values (v_prof.id, v_area, left(coalesce(p->>'area',''), 80), v_uni.id, v_data, v_hora, aj.duracao_min,
         v_nome, v_tipo, v_nasc,
         case when v_cpf = '' then '' else substr(v_cpf,1,3)||'.'||substr(v_cpf,4,3)||'.'||substr(v_cpf,7,3)||'-'||substr(v_cpf,10,2) end,
         case when v_tipo = 'crianca' then v_resp else '' end, v_tel,
         coalesce(nullif(p->>'atendimento',''), 'Particular'), 'site')
  returning * into r;
  return json_build_object('codigo', r.codigo, 'data', r.data, 'hora', to_char(r.hora,'HH24:MI'),
                           'unidade', v_uni.nome, 'profissional', v_prof.nome, 'status', r.status);
exception when unique_violation then
  raise exception 'HORARIO_INDISPONIVEL';
end $$;

-- Paciente consulta o próprio agendamento (código + data de nascimento).
create or replace function public.agenda_consultar(p_codigo text, p_nascimento date)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object('codigo', a.codigo, 'profissional', p.nome, 'area', a.area, 'unidade', u.nome,
                           'endereco', u.endereco, 'data', a.data, 'hora', to_char(a.hora,'HH24:MI'),
                           'status', a.status, 'paciente', split_part(a.paciente_nome, ' ', 1))
    from public.agendamentos a
    join public.profissionais p on p.id = a.profissional_id
    join public.unidades u on u.id = a.unidade_id
   where a.codigo = upper(btrim(p_codigo)) and a.nascimento = p_nascimento;
$$;

-- Paciente cancela (só consultas futuras ainda não realizadas). A equipe vê na hora no painel.
create or replace function public.agenda_cancelar(p_codigo text, p_nascimento date)
returns json language plpgsql volatile security definer set search_path = public as $$
declare r public.agendamentos;
begin
  update public.agendamentos set status = 'cancelado_paciente'
   where codigo = upper(btrim(p_codigo)) and nascimento = p_nascimento
     and status in ('solicitado','confirmado') and (data + hora) > public._agora_sp()
  returning * into r;
  if not found then raise exception 'NAO_CANCELAVEL'; end if;
  return public.agenda_consultar(r.codigo, r.nascimento);
end $$;

revoke execute on all functions in schema public from public;
grant execute on function public.agenda_ajustes(), public.agenda_profissionais(), public.agenda_unidades(text),
  public.agenda_dias(text, text, date, date), public.agenda_horarios(text, text, date),
  public.agenda_criar(jsonb), public.agenda_consultar(text, date), public.agenda_cancelar(text, date)
  to anon, authenticated;
grant execute on function public.eh_equipe(), public.gerar_codigo(), public._agora_sp(),
  public._horarios_livres(text, text, date) to authenticated;
grant execute on function public.agendamentos_atualizado() to authenticated;
-- O Supabase dá EXECUTE direto ao anon por padrão: tiramos das funções internas.
revoke execute on function public.eh_equipe(), public.gerar_codigo(), public._agora_sp(),
  public._horarios_livres(text, text, date), public.agendamentos_atualizado() from anon;

-- ---------- Dados iniciais ----------
insert into public.unidades (id, nome, endereco, ordem) values
  ('unidade-horto', 'Horto', 'Av. Castelo Branco, 807 · Sl 101 · Horto, Ipatinga', 1),
  ('unidade-fabriciano', 'Fabriciano', 'R. Dr. Moacir Birro, 325 A · Centro, Cel. Fabriciano', 2),
  ('unidade-bom-jardim', 'Bom Jardim', 'R. Papoula, 143 · Bom Jardim, Ipatinga', 3),
  ('unidade-shopping', 'Shopping Vale do Aço', 'Shopping Vale do Aço · 2º andar · Ipatinga', 4)
on conflict (id) do nothing;

insert into public.profissionais (id, nome, areas, ordem) values
  ('dra_sheila_tomaz', 'Dra. Sheila Tomaz', '{consulta_medica,acompanhamento_adulto}', 1),
  ('dr_thyago_trigo', 'Dr. Thyago Trigo', '{pediatria}', 2),
  ('dra_leticia_nacife', 'Dra. Letícia Nacife', '{pediatria}', 3),
  ('dr_romulo_armando', 'Dr. Romulo Armando', '{consulta_medica}', 4),
  ('dra_carolina_rodrigues', 'Dra. Carolina Rodrigues', '{consulta_medica}', 5),
  ('dr_lucas_ayres', 'Dr. Lucas Ayres', '{familia_comunidade}', 6),
  ('aline_nunes_silva', 'Aline Nunes Silva', '{psicologia}', 7),
  ('adila_santos', 'Adila Santos', '{fonoaudiologia,teste_linguinha}', 8),
  ('kamilla_oliveira', 'Kamilla Oliveira', '{nutricao}', 9),
  ('dra_rogeria_sampaio', 'Dra. Rogéria Sampaio', '{odontopediatria,ortodontia}', 10),
  ('dra_beatriz_andrade', 'Dra. Beatriz Andrade', '{odontopediatria}', 11),
  ('dra_keren_hapuck', 'Dra. Kéren Hapuck', '{medicina_nuclear}', 12)
on conflict (id) do nothing;

-- Exemplo informado: Dra. Letícia — seg a qua no Horto, qua e qui no Bom Jardim, sex a dom no Shopping.
-- (Quarta aparece nas duas unidades: o sistema impede o mesmo horário duas vezes. Ajuste no painel.)
insert into public.escalas (profissional_id, unidade_id, dia_semana)
select 'dra_leticia_nacife', u, d from (values
  ('unidade-horto', 1), ('unidade-horto', 2), ('unidade-horto', 3),
  ('unidade-bom-jardim', 3), ('unidade-bom-jardim', 4),
  ('unidade-shopping', 5), ('unidade-shopping', 6), ('unidade-shopping', 0)) v(u, d)
on conflict do nothing;
