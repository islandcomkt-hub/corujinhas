# Agenda online — como ativar

Até as chaves serem preenchidas, o site continua agendando pelo WhatsApp como antes. Enquanto isso, dá para testar:

- **Site em demonstração:** https://corujinhas.islandcompany.space/?demo
- **Painel em demonstração:** https://corujinhas.islandcompany.space/painel

Na demonstração, tudo fica só no navegador de quem está testando. Nenhum horário é reservado de verdade, e as mensagens de WhatsApp saem marcadas como TESTE.

## 1. Criar o banco (Supabase)

1. Em [supabase.com](https://supabase.com), crie um projeto com a região **South America (São Paulo)** e uma senha forte.
2. Abra **SQL Editor**, cole todo o conteúdo de `supabase/schema.sql` e clique em **Run**.
   O arquivo pode ser rodado de novo sem perder dados.
3. Em **Authentication → Sign In / Providers**, desligue **Allow new users to sign up**. Assim, só a equipe cadastrada entra no painel.

## 2. Criar o acesso das atendentes

1. Em **Authentication → Users → Add user → Create new user**, informe o e-mail e a senha da atendente e marque **Auto Confirm User**.
2. Copie o **UID** do usuário criado.
3. No **SQL Editor**, rode o comando abaixo, trocando o UID e o nome:

   ```sql
   insert into public.equipe (user_id, nome) values ('COLE-O-UID-AQUI', 'Recepção');
   ```

Um usuário que não estiver na tabela `equipe` consegue entrar, mas não vê nenhum dado.

## 3. Ligar o site ao banco

Em **Project Settings → API**, copie dois valores e coloque em `assets/js/agenda-config.js`:

- **Project URL** vai em `supabaseUrl`.
- **anon public key** vai em `supabaseAnonKey`.

Nunca use a chave `service_role` nesse arquivo. A chave pública só permite chamar as funções da agenda; as tabelas ficam protegidas pelas regras de acesso.

Faça o commit no `main` e a Vercel publica sozinha.

## 4. Montar as escalas

No painel, abra a aba **Escalas** e escolha o profissional. Toque nos dias de cada unidade em que ele atende.

- O padrão é 8h–12h e 17h–22h, e cada dia pode ter faixas próprias.
- Só aparecem no site os profissionais que têm escala. Os demais continuam agendando pelo WhatsApp.
- A Dra. Letícia já vem com o exemplo informado: seg a qua no Horto, qua e qui no Bom Jardim, sex a dom no Shopping.

## Regras da agenda

As regras ficam em **Escalas → Regras gerais**:

| Regra | Padrão |
| --- | --- |
| Duração de cada consulta | 30 min |
| Atraso possível avisado ao paciente | 15 min |
| Antecedência mínima para marcar | 1 h |
| Agenda aberta | 60 dias à frente |
| Pedidos em aberto por WhatsApp | 4 |

Um profissional nunca recebe dois pacientes no mesmo horário, mesmo em unidades diferentes.

## Observação sobre o plano grátis

O plano grátis do Supabase pausa o projeto depois de alguns dias sem nenhum acesso. Com o site no ar e a equipe usando o painel, isso não deve acontecer. Para uma clínica, o plano pago é o recomendado, porque inclui backups diários.
