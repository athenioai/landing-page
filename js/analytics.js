/* ============================================================
   ATHENIO — dataLayer para GTM / GA4
   - Conversão recomendada: disparo nesta página (obrigado.html)
     OU meta “page_view” / “URL contém obrigado.html”.
   - UTMs na query são espelhados no objeto para variáveis no GTM.
   - Instale o container GTM no <head> das páginas quando for ao ar.
   ============================================================ */

'use strict';

window.dataLayer = window.dataLayer || [];

window.athenioAnalytics = {
  /**
   * Chamar apenas na página de obrigado (1 conversão por envio bem-sucedido).
   */
  pushThankYouPage() {
    const p   = new URLSearchParams(window.location.search);
    const row = {
      event: 'athenio_generate_lead',
      conversion_page: 'obrigado',
    };
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'fbclid', 'dor_principal'].forEach((k) => {
      const v = p.get(k);
      if (v) row[k] = String(v).slice(0, 240);
    });
    window.dataLayer.push(row);
  },
};
