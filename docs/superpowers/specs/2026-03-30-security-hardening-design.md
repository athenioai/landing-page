# Spec: Hardening de Segurança — Correção de Issues Críticos

**Data:** 2026-03-30
**Status:** Aprovado

---

## Contexto

A análise de pentest identificou que o endpoint Supabase é público e a anon key está exposta no HTML. Qualquer script pode fazer POST direto para `/rest/v1/leads` bypassando 100% das proteções client-side. O objetivo é mover o controle para o servidor.

---

## Mudanças

### 1. Supabase RPC Function `submit_lead`

Criar tabela `submission_attempts` para rastrear o rate limiting:

```sql
CREATE TABLE submission_attempts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_at timestamptz DEFAULT now()
);
```

Criar função `submit_lead` com `SECURITY DEFINER`:

```sql
CREATE OR REPLACE FUNCTION submit_lead(
  p_name        text,
  p_company     text,
  p_email       text,
  p_whatsapp    text,
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
  -- Validate required fields
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

  -- Rate limit: max 20 submissions per minute globally
  SELECT COUNT(*) INTO recent_count
  FROM submission_attempts
  WHERE submitted_at > now() - interval '1 minute';

  IF recent_count >= 20 THEN
    RETURN jsonb_build_object('error', 'rate_limited');
  END IF;

  -- Record attempt
  INSERT INTO submission_attempts DEFAULT VALUES;

  -- Insert lead
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

GRANT EXECUTE ON FUNCTION submit_lead TO anon;
```

Remover a policy de INSERT direto na tabela `leads`:

```sql
DROP POLICY IF EXISTS "anon_insert" ON leads;
```

---

### 2. Atualizar fetch no `index.html`

- Trocar URL de `/rest/v1/leads` para `/rest/v1/rpc/submit_lead`
- Payload usa prefixo `p_` nos parâmetros (nomes das funções Postgres)
- Remover header `Prefer: return=minimal`
- Resposta é sempre HTTP 200 com JSON `{success: true}` ou `{error: "code"}`
- Atualizar tratamento de erros para novos códigos

### 3. Sanitizar UTMs na extração (não só no submit)

No `applyAttribution`, aplicar `sanitize()` ao ler parâmetros da URL:

```js
var fromUrl = params.get(k);
input.value = fromUrl ? sanitize(fromUrl) : (pack[k] || '');
```

E no `mergeAttribution`, sanitizar antes de salvar em sessionStorage:

```js
if (v) { pack[k] = sanitize(String(v)); changed = true; }
```

### 4. Proteção contra Clickjacking

Adicionar no `<head>`:

```html
<meta http-equiv="Content-Security-Policy" content="frame-ancestors 'none'">
```

---

## Tratamento de erros (JS)

| `data.error` | Mensagem exibida |
|---|---|
| `duplicate_email` | "Este e-mail já está na lista." |
| `rate_limited` | "Muitas tentativas. Tente em breve." |
| qualquer outro | "Erro ao salvar. Tente novamente." |
| `AbortError` (timeout) | "Conexão lenta. Tente novamente." |

---

## Arquivos afetados

- `index.html`: fetch URL, payload, error handling, UTM sanitization, meta CSP
- Supabase SQL (executado pelo usuário no dashboard)

---

## Fora do escopo

- reCAPTCHA v3 (requer chave Google — melhoria futura)
- Limpeza automática da tabela `submission_attempts` (manutenção futura)
- Rate limiting por IP (requer infraestrutura adicional)
