# Spec: Integração Supabase para Captura de Leads

**Data:** 2026-03-30
**Status:** Aprovado

---

## Contexto

A landing page atual (`index.html`) possui um formulário de lista de espera que valida os dados e redireciona para `obrigado.html` sem salvar nada. O objetivo é persistir os leads no Supabase com dados de identidade, intenção, atribuição de tráfego e contexto de dispositivo.

---

## Abordagem

Fetch direto para a REST API do Supabase (sem SDK). O codebase é vanilla JS puro — o SDK seria overkill para uma única operação de INSERT. A `anon key` fica exposta no fonte por design; o RLS garante que ela só pode inserir, nunca ler.

---

## Schema da tabela `leads`

```sql
create table leads (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz default now(),

  -- Identidade
  name          text not null,
  company       text not null,
  email         text not null,
  whatsapp      text not null,
  company_size  text,

  -- Intenção (definida pela página, não pelo usuário)
  intent        text not null,  -- 'waitlist' | 'diagnostic'

  -- Atribuição de tráfego
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  utm_content   text,
  utm_term      text,
  referrer      text,
  landing_url   text,

  -- Contexto do dispositivo
  user_agent    text,
  screen_width  int,
  screen_height int,

  -- LGPD
  consent       boolean default false
);
```

### RLS (Row Level Security)

```sql
-- Habilitar RLS
alter table leads enable row level security;

-- Anon pode inserir
create policy "anon_insert" on leads
  for insert to anon
  with check (true);

-- Anon NÃO pode ler (sem policy de SELECT para anon)
-- Apenas service_role acessa os dados
```

---

## Fluxo de submissão

1. Usuário preenche o form e clica em enviar
2. Validação client-side existente roda (sem mudanças)
3. JS coleta campos do form + dados automáticos:
   - `intent`: hardcoded por página (`'waitlist'` no `index.html`, `'diagnostic'` no `index-produto.html`)
   - `referrer`: `document.referrer`
   - `landing_url`: `window.location.href`
   - `user_agent`: `navigator.userAgent`
   - `screen_width / screen_height`: `screen.width / screen.height`
   - UTMs: lidos dos inputs hidden já existentes
4. `fetch` POST para `https://<project>.supabase.co/rest/v1/leads` com headers:
   - `apikey: <anon_key>`
   - `Authorization: Bearer <anon_key>`
   - `Content-Type: application/json`
   - `Prefer: return=minimal`
5. Sucesso → aguarda 900ms → redireciona para `obrigado.html`
6. Erro → exibe mensagem de erro inline, reabilita o botão, mantém dados do form

---

## Tratamento de erros

- Email duplicado (conflict): mensagem "Este e-mail já está na lista."
- Erro genérico: mensagem "Erro ao salvar. Tente novamente."
- Timeout (>8s): mensagem "Conexão lenta. Tente novamente."
- O botão volta ao estado original para nova tentativa

---

## Configuração necessária

O desenvolvedor deve:
1. Criar a tabela `leads` no Supabase com o schema acima
2. Configurar o RLS conforme descrito
3. Fornecer `SUPABASE_URL` e `SUPABASE_ANON_KEY` para serem inseridos no JS

---

## Arquivos afetados

- `index.html`: substituir o bloco `/* ── FORM ── */` para adicionar a chamada ao Supabase
- Nenhum arquivo novo necessário

---

## Fora do escopo

- Email de confirmação automático (pode ser adicionado via trigger no Supabase futuramente)
- Dashboard de análise dos leads
- Deduplicação por WhatsApp
