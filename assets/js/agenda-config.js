/*
 * Agenda online — ligação com o Supabase.
 * Preencha com os dados de Project Settings → API do projeto Supabase do instituto.
 * A "anon public key" pode ficar aqui: ela só permite chamar as funções públicas da agenda;
 * as tabelas ficam protegidas pelas regras de acesso (RLS) do schema.sql.
 * NUNCA coloque aqui a chave "service_role".
 *
 * Vazio = agenda online desligada no site (volta ao WhatsApp). Para ver a demonstração, abra o site com ?demo
 */
window.CORUJINHAS_AGENDA = {
  supabaseUrl: "",
  supabaseAnonKey: ""
};
