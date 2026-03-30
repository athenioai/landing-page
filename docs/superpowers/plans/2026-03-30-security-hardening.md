# Security Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mover validação e controle de inserção para o servidor via Supabase RPC, bloqueando inserção direta na tabela `leads` e corrigindo UTM sanitization e clickjacking.

**Architecture:** Uma função Postgres `submit_lead` com `SECURITY DEFINER` valida campos, aplica rate limiting (máx 20/min global via tabela `submission_attempts`) e insere em `leads`. O JS passa a chamar `/rpc/submit_lead` em vez de inserir diretamente. A policy `anon_insert` é removida da tabela `leads`.

**Tech Stack:** Vanilla JS (ES5+), Supabase REST API, Postgres (PL/pgSQL)

**Credentials:**
- `SUPABASE_URL`: `https://lxkfjfcapcxznamipelp.supabase.co`
- `SUPABASE_ANON_KEY`: `sb_publishable_VUU90I0U5kQwCfjwXMZ76g_FsCOYTTl`

---

### Task 1: Supabase — criar tabela, função RPC e atualizar RLS

**Files:**
- N/A (executar SQL no Supabase Dashboard → SQL Editor)

- [ ] **Step 1: Criar tabela `submission_attempts` e função `submit_lead`**

Acesse: `https://lxkfjfcapcxznamipelp.supabase.co` → SQL Editor → New query. Execute:

```sql
-- Tabela de controle de rate limiting
CREATE TABLE submission_attempts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_at timestamptz DEFAULT now()
);

-- Função RPC com validação e rate limiting server-side
CREATE OR REPLACE FUNCTION submit_lead(
  p_name          text,
  p_company       text,
  p_email         text,
  p_whatsapp      text,
  p_company_size  text    DEFAULT NULL,
  p_intent        text    DEFAULT 'waitlist',
  p_utm_source    text    DEFAULT NULL,
  p_utm_medium    text    DEFAULT NULL,
  p_utm_campaign  text    DEFAULT NULL,
  p_utm_content   text    DEFAULT NULL,
  p_utm_term      text    DEFAULT NULL,
  p_referrer      text    DEFAULT NULL,
  p_landing_url   text    DEFAULT NULL,
  p_user_agent    text    DEFAULT NULL,
  p_screen_width  int     DEFAULT NULL,
  p_screen_height int     DEFAULT NULL,
  p_consent       boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  recent_count int;
BEGIN
  IF p_name IS NULL OR length(trim(p_name)) < 2 THEN
    RETURN jsonb_build_object('error', 'invalid_name');
  END IF;
  IF p_company IS NULL OR length(trim(p_company)) < 2 THEN
    RETURN jsonb_build_object('error', 'invalid_company');
  END IF;
  IF p_email IS NULL OR p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RETURN jsonb_build_object('error', 'invalid_email');
  END IF;
  IF p_whatsapp IS NULL OR length(regexp_replace(p_whatsapp, '\D', '', 'g')) < 10 THEN
    RETURN jsonb_build_object('error', 'invalid_whatsapp');
  END IF;
  IF NOT p_consent THEN
    RETURN jsonb_build_object('error', 'consent_required');
  END IF;

  SELECT COUNT(*) INTO recent_count
  FROM submission_attempts
  WHERE submitted_at > now() - interval '1 minute';

  IF recent_count >= 20 THEN
    RETURN jsonb_build_object('error', 'rate_limited');
  END IF;

  INSERT INTO submission_attempts DEFAULT VALUES;

  INSERT INTO leads (
    name, company, email, whatsapp, company_size, intent,
    utm_source, utm_medium, utm_campaign, utm_content, utm_term,
    referrer, landing_url, user_agent, screen_width, screen_height, consent
  ) VALUES (
    trim(p_name), trim(p_company), lower(trim(p_email)),
    regexp_replace(p_whatsapp, '\D', '', 'g'),
    p_company_size, p_intent,
    p_utm_source, p_utm_medium, p_utm_campaign, p_utm_content, p_utm_term,
    p_referrer, p_landing_url, p_user_agent, p_screen_width, p_screen_height,
    p_consent
  );

  RETURN jsonb_build_object('success', true);

EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('error', 'duplicate_email');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('error', 'server_error');
END;
$$;

-- Liberar execução para anon
GRANT EXECUTE ON FUNCTION submit_lead TO anon;

-- Bloquear inserção direta na tabela leads
DROP POLICY IF EXISTS "anon_insert" ON leads;
```

- [ ] **Step 2: Verificar que inserção direta está bloqueada**

```bash
curl -s -o /dev/null -w "%{http_code}" -X POST \
  'https://lxkfjfcapcxznamipelp.supabase.co/rest/v1/leads' \
  -H "apikey: sb_publishable_VUU90I0U5kQwCfjwXMZ76g_FsCOYTTl" \
  -H "Authorization: Bearer sb_publishable_VUU90I0U5kQwCfjwXMZ76g_FsCOYTTl" \
  -H "Content-Type: application/json" \
  -d '{"name":"Bot","company":"Spam","email":"bot@spam.com","whatsapp":"11999999999","intent":"waitlist","consent":true}'
```

Esperado: `403` (RLS bloqueia inserção direta).

- [ ] **Step 3: Verificar que o RPC funciona**

```bash
curl -s -X POST \
  'https://lxkfjfcapcxznamipelp.supabase.co/rest/v1/rpc/submit_lead' \
  -H "apikey: sb_publishable_VUU90I0U5kQwCfjwXMZ76g_FsCOYTTl" \
  -H "Authorization: Bearer sb_publishable_VUU90I0U5kQwCfjwXMZ76g_FsCOYTTl" \
  -H "Content-Type: application/json" \
  -d '{"p_name":"Teste Silva","p_company":"Empresa Teste","p_email":"teste2@teste.com","p_whatsapp":"11999999999","p_intent":"waitlist","p_consent":true}'
```

Esperado: `{"success":true}`

- [ ] **Step 4: Testar email duplicado via RPC**

```bash
curl -s -X POST \
  'https://lxkfjfcapcxznamipelp.supabase.co/rest/v1/rpc/submit_lead' \
  -H "apikey: sb_publishable_VUU90I0U5kQwCfjwXMZ76g_FsCOYTTl" \
  -H "Authorization: Bearer sb_publishable_VUU90I0U5kQwCfjwXMZ76g_FsCOYTTl" \
  -H "Content-Type: application/json" \
  -d '{"p_name":"Teste Silva","p_company":"Empresa Teste","p_email":"teste2@teste.com","p_whatsapp":"11999999999","p_intent":"waitlist","p_consent":true}'
```

Esperado: `{"error":"duplicate_email"}`

- [ ] **Step 5: Testar validação server-side (campo obrigatório faltando)**

```bash
curl -s -X POST \
  'https://lxkfjfcapcxznamipelp.supabase.co/rest/v1/rpc/submit_lead' \
  -H "apikey: sb_publishable_VUU90I0U5kQwCfjwXMZ76g_FsCOYTTl" \
  -H "Authorization: Bearer sb_publishable_VUU90I0U5kQwCfjwXMZ76g_FsCOYTTl" \
  -H "Content-Type: application/json" \
  -d '{"p_name":"X","p_company":"Empresa","p_email":"invalido","p_whatsapp":"11999999999","p_consent":true}'
```

Esperado: `{"error":"invalid_email"}` (nome < 2 chars retorna invalid_name primeiro, ou email inválido retorna invalid_email — qualquer campo inválido retorna erro)

- [ ] **Step 6: Limpar lead de teste**

No Supabase SQL Editor:
```sql
DELETE FROM leads WHERE email = 'teste2@teste.com';
DELETE FROM submission_attempts;
```

---

### Task 2: Atualizar `index.html` — fetch, UTM sanitization e meta CSP

**Files:**
- Modify: `/Users/lucas-couto/www/athenio/landing-page/index.html`

- [ ] **Step 1: Adicionar meta CSP contra clickjacking no `<head>`**

Localizar a linha com `<meta name="viewport"...>` (linha ~6) e adicionar logo após:

```html
  <meta http-equiv="Content-Security-Policy" content="frame-ancestors 'none'">
```

- [ ] **Step 2: Corrigir sanitização de UTMs na extração**

Localizar a função `mergeAttribution` (~linha 1589). Encontrar:
```js
      if (v) { pack[k] = String(v).trim().slice(0, 240); changed = true; }
```
Substituir por:
```js
      if (v) { pack[k] = sanitize(String(v)); changed = true; }
```

Localizar a função `applyAttribution` (~linha 1601). Encontrar:
```js
      input.value = fromUrl ? fromUrl.trim().slice(0,240) : (pack[k] || '');
```
Substituir por:
```js
      input.value = fromUrl ? sanitize(fromUrl) : (pack[k] || '');
```

- [ ] **Step 3: Substituir o bloco fetch no submit handler**

Localizar o bloco fetch atual que começa com:
```js
    fetch('https://lxkfjfcapcxznamipelp.supabase.co/rest/v1/leads', {
```
e termina com o fechamento do `.catch`. Substituir o bloco **inteiro** por:

```js
    var payload = {
      p_name:          nome,
      p_company:       empresa,
      p_email:         email,
      p_whatsapp:      phone,
      p_company_size:  sanitize(form.tamanho_empresa.value) || null,
      p_intent:        'waitlist',
      p_utm_source:    sanitize(form.utm_source.value)   || null,
      p_utm_medium:    sanitize(form.utm_medium.value)   || null,
      p_utm_campaign:  sanitize(form.utm_campaign.value) || null,
      p_utm_content:   sanitize(form.utm_content.value)  || null,
      p_utm_term:      sanitize(form.utm_term.value)     || null,
      p_referrer:      String(document.referrer).slice(0, 500) || null,
      p_landing_url:   String(window.location.href).slice(0, 500),
      p_user_agent:    String(navigator.userAgent).slice(0, 500),
      p_screen_width:  screen.width,
      p_screen_height: screen.height,
      p_consent:       true
    };

    var controller = new AbortController();
    var timeout    = setTimeout(function() { controller.abort(); }, 8000);

    fetch('https://lxkfjfcapcxznamipelp.supabase.co/rest/v1/rpc/submit_lead', {
      method:  'POST',
      signal:  controller.signal,
      headers: {
        'apikey':        'sb_publishable_VUU90I0U5kQwCfjwXMZ76g_FsCOYTTl',
        'Authorization': 'Bearer sb_publishable_VUU90I0U5kQwCfjwXMZ76g_FsCOYTTl',
        'Content-Type':  'application/json'
      },
      body: JSON.stringify(payload)
    })
    .then(function(res) {
      return res.json().catch(function() { return {}; });
    })
    .then(function(data) {
      clearTimeout(timeout);
      if (data && data.success) {
        window.location.href = THANK_YOU;
        return;
      }
      throw new Error((data && data.error) || 'server_error');
    })
    .catch(function(err) {
      clearTimeout(timeout);
      submitBtn.disabled    = false;
      submitBtn.textContent = 'GARANTIR MINHA VAGA DE FUNDADOR →';
      var msg = err.name === 'AbortError'            ? 'Conexão lenta. Tente novamente.'    :
                err.message === 'duplicate_email'    ? 'Este e-mail já está na lista.'      :
                err.message === 'rate_limited'       ? 'Muitas tentativas. Tente em breve.' :
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

- [ ] **Step 4: Confirmar que o bloco antigo foi completamente removido**

Buscar no arquivo por `rest/v1/leads` (sem `/rpc/`). Não deve existir nenhuma ocorrência. Buscar também por `return=minimal` — não deve existir.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "security: RPC proxy para leads, rate limiting server-side, UTM sanitization e CSP"
```

---

### Task 3: Verificação final e push

**Files:**
- N/A (verificação e git)

- [ ] **Step 1: Verificar meta CSP no HTML**

```bash
grep -n "frame-ancestors" /Users/lucas-couto/www/athenio/landing-page/index.html
```
Esperado: linha com `frame-ancestors 'none'`

- [ ] **Step 2: Verificar que não há mais referência direta a `/rest/v1/leads`**

```bash
grep -n "rest/v1/leads" /Users/lucas-couto/www/athenio/landing-page/index.html
```
Esperado: nenhuma saída

- [ ] **Step 3: Verificar que o RPC está sendo chamado**

```bash
grep -n "rpc/submit_lead" /Users/lucas-couto/www/athenio/landing-page/index.html
```
Esperado: 1 ocorrência

- [ ] **Step 4: Push**

```bash
git push
```

---

## Checklist de cobertura do spec

| Requisito | Task |
|---|---|
| Tabela `submission_attempts` criada | Task 1 Step 1 |
| Função `submit_lead` com validação server-side | Task 1 Step 1 |
| Rate limiting: máx 20/min global | Task 1 Step 1 |
| `GRANT EXECUTE ON FUNCTION submit_lead TO anon` | Task 1 Step 1 |
| `DROP POLICY anon_insert` — inserção direta bloqueada | Task 1 Step 1 |
| Inserção direta retorna 403 | Task 1 Step 2 |
| RPC retorna `{"success":true}` | Task 1 Step 3 |
| RPC retorna `{"error":"duplicate_email"}` | Task 1 Step 4 |
| Meta CSP `frame-ancestors 'none'` | Task 2 Step 1 |
| UTM sanitizado em `mergeAttribution` | Task 2 Step 2 |
| UTM sanitizado em `applyAttribution` | Task 2 Step 2 |
| Fetch aponta para `/rpc/submit_lead` | Task 2 Step 3 |
| Payload usa prefixo `p_` | Task 2 Step 3 |
| Sem header `Prefer: return=minimal` | Task 2 Step 3 |
| Erro `rate_limited` exibido ao usuário | Task 2 Step 3 |
| Sem referência direta a `/rest/v1/leads` | Task 3 Step 2 |
