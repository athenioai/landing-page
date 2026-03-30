# Supabase Leads Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persistir leads do formulário de lista de espera no Supabase com identidade, intenção, atribuição UTM e contexto de dispositivo.

**Architecture:** Fetch direto para a REST API do Supabase (sem SDK), vanilla JS. A `anon key` é pública por design — RLS garante INSERT-only para anon. O campo `intent` é hardcoded por página.

**Tech Stack:** Vanilla JS, Supabase REST API, SQL (Supabase dashboard)

**Credentials:**
- `SUPABASE_URL`: `https://lxkfjfcapcxznamipelp.supabase.co`
- `SUPABASE_ANON_KEY`: `sb_publishable_VUU90I0U5kQwCfjwXMZ76g_FsCOYTTl`

---

### Task 1: Criar tabela `leads` no Supabase

**Files:**
- N/A (executar SQL no Supabase Dashboard → SQL Editor)

- [ ] **Step 1: Abrir o SQL Editor no Supabase Dashboard**

Acesse: https://lxkfjfcapcxznamipelp.supabase.co → SQL Editor → New query

- [ ] **Step 2: Criar a tabela**

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

  -- Intenção
  intent        text not null,

  -- Atribuição
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  utm_content   text,
  utm_term      text,
  referrer      text,
  landing_url   text,

  -- Dispositivo
  user_agent    text,
  screen_width  int,
  screen_height int,

  -- LGPD
  consent       boolean default false
);
```

- [ ] **Step 3: Configurar RLS**

```sql
-- Habilitar RLS
alter table leads enable row level security;

-- Anon pode inserir, mas não ler
create policy "anon_insert" on leads
  for insert
  to anon
  with check (true);
```

- [ ] **Step 4: Verificar no Supabase Dashboard**

Vá em Table Editor → `leads`. A tabela deve aparecer com todas as colunas. Em Authentication → Policies, deve haver a policy `anon_insert` na tabela `leads`.

- [ ] **Step 5: Testar o INSERT via curl**

```bash
curl -X POST 'https://lxkfjfcapcxznamipelp.supabase.co/rest/v1/leads' \
  -H "apikey: sb_publishable_VUU90I0U5kQwCfjwXMZ76g_FsCOYTTl" \
  -H "Authorization: Bearer sb_publishable_VUU90I0U5kQwCfjwXMZ76g_FsCOYTTl" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=minimal" \
  -d '{
    "name": "Teste Silva",
    "company": "Empresa Teste",
    "email": "teste@teste.com",
    "whatsapp": "11999999999",
    "company_size": "1-10",
    "intent": "waitlist",
    "consent": true
  }'
```

Esperado: HTTP `201` sem corpo.

- [ ] **Step 6: Verificar que anon não consegue ler**

```bash
curl 'https://lxkfjfcapcxznamipelp.supabase.co/rest/v1/leads' \
  -H "apikey: sb_publishable_VUU90I0U5kQwCfjwXMZ76g_FsCOYTTl" \
  -H "Authorization: Bearer sb_publishable_VUU90I0U5kQwCfjwXMZ76g_FsCOYTTl"
```

Esperado: `[]` (array vazio — RLS bloqueou o SELECT).

- [ ] **Step 7: Deletar o lead de teste**

No SQL Editor:
```sql
delete from leads where email = 'teste@teste.com';
```

---

### Task 2: Atualizar o form submit handler em `index.html`

**Files:**
- Modify: `index.html` (bloco `/* ── FORM ── */`, linhas ~1583–1701)

- [ ] **Step 1: Localizar o bloco de submit handler**

No `index.html`, encontre o bloco que começa com:
```js
form.addEventListener('submit', function(e) {
```
e termina com:
```js
  });
```
Logo após a linha `if (!valid) { ... return; }` e antes do fechamento do IIFE `})();`.

- [ ] **Step 2: Substituir o bloco de submit**

Remova o trecho atual de submit (do `lastSubmit = Date.now();` até `window.location.href = THANK_YOU + ...`) e substitua por:

```js
    lastSubmit = Date.now();
    submitBtn.disabled    = true;
    submitBtn.textContent = 'RESERVANDO SUA VAGA...';

    var payload = {
      name:          nome,
      company:       empresa,
      email:         email,
      whatsapp:      phone,
      company_size:  sanitize(form.tamanho_empresa.value) || null,
      intent:        'waitlist',
      utm_source:    sanitize(form.utm_source.value)   || null,
      utm_medium:    sanitize(form.utm_medium.value)   || null,
      utm_campaign:  sanitize(form.utm_campaign.value) || null,
      utm_content:   sanitize(form.utm_content.value)  || null,
      utm_term:      sanitize(form.utm_term.value)     || null,
      referrer:      String(document.referrer).slice(0, 500) || null,
      landing_url:   String(window.location.href).slice(0, 500),
      user_agent:    String(navigator.userAgent).slice(0, 500),
      screen_width:  screen.width,
      screen_height: screen.height,
      consent:       true
    };

    var controller = new AbortController();
    var timeout    = setTimeout(function() { controller.abort(); }, 8000);

    fetch('https://lxkfjfcapcxznamipelp.supabase.co/rest/v1/leads', {
      method:  'POST',
      signal:  controller.signal,
      headers: {
        'apikey':        'sb_publishable_VUU90I0U5kQwCfjwXMZ76g_FsCOYTTl',
        'Authorization': 'Bearer sb_publishable_VUU90I0U5kQwCfjwXMZ76g_FsCOYTTl',
        'Content-Type':  'application/json',
        'Prefer':        'return=minimal'
      },
      body: JSON.stringify(payload)
    })
    .then(function(res) {
      clearTimeout(timeout);
      if (res.status === 201) {
        window.location.href = THANK_YOU;
        return;
      }
      return res.json().then(function(data) {
        throw new Error(data && data.code === '23505' ? 'duplicate' : 'server');
      });
    })
    .catch(function(err) {
      clearTimeout(timeout);
      submitBtn.disabled    = false;
      submitBtn.textContent = 'GARANTIR MINHA VAGA DE FUNDADOR →';
      var msg = err.name === 'AbortError'  ? 'Conexão lenta. Tente novamente.' :
                err.message === 'duplicate' ? 'Este e-mail já está na lista.' :
                'Erro ao salvar. Tente novamente.';
      var errEl = document.getElementById('form-submit-error');
      if (!errEl) {
        errEl = document.createElement('p');
        errEl.id = 'form-submit-error';
        errEl.style.cssText = 'color:#a15c5c;font-size:13px;text-align:center;margin-top:4px';
        submitBtn.insertAdjacentElement('afterend', errEl);
      }
      errEl.textContent = msg;
    });
```

- [ ] **Step 3: Verificar que não há código duplicado**

Confirme que o bloco antigo com `setTimeout(function() { window.location.href = THANK_YOU...` foi completamente removido. O arquivo não deve ter dois blocos de submit.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: integra formulário com Supabase para captura de leads"
```

---

### Task 3: Testar a integração no browser

**Files:**
- N/A (teste manual)

- [ ] **Step 1: Abrir o `index.html` no browser**

```bash
open /Users/lucas-couto/www/athenio/landing-page/index.html
```

Ou servir localmente:
```bash
cd /Users/lucas-couto/www/athenio/landing-page && python3 -m http.server 3000
```
Acesse: http://localhost:3000

- [ ] **Step 2: Preencher e submeter o formulário**

Preencha todos os campos obrigatórios com dados reais e clique em "GARANTIR MINHA VAGA".

Esperado: botão muda para "RESERVANDO SUA VAGA...", depois redireciona para `obrigado.html`.

- [ ] **Step 3: Verificar o lead no Supabase**

No SQL Editor do Supabase:
```sql
select * from leads order by created_at desc limit 1;
```

Esperado: registro com todos os campos preenchidos, `intent = 'waitlist'`, `consent = true`.

- [ ] **Step 4: Testar erro de email duplicado**

Submeta o formulário novamente com o mesmo email.

Esperado: botão reabilitado, mensagem "Este e-mail já está na lista." abaixo do botão.

- [ ] **Step 5: Push para o GitHub**

```bash
git push
```

---

## Checklist de cobertura do spec

| Requisito | Task |
|---|---|
| Tabela `leads` com schema completo | Task 1 |
| RLS: anon INSERT sim, SELECT não | Task 1 |
| Campos de identidade (name, company, email, whatsapp, company_size) | Task 2 |
| Campo `intent` hardcoded por página | Task 2 |
| Campos UTM capturados dos inputs hidden | Task 2 |
| Campos automáticos (referrer, landing_url, user_agent, screen) | Task 2 |
| Sucesso → redirect para obrigado.html | Task 2 |
| Erro duplicate email → mensagem específica | Task 2 |
| Erro genérico → mensagem de retry | Task 2 |
| Timeout (8s) → mensagem de conexão lenta | Task 2 |
| Teste end-to-end | Task 3 |
