/*
  Injecteert een stylesheet in de shadow root van <shopify-forms-embed> om details
  te overschrijven die de app hardcoded zet en die niet via host-custom-properties
  te sturen zijn: h2-marges, p-line-height, en de knop-hover met een echte
  background-color in plaats van een filter.
*/
(function () {
  const EMBED = 'shopify-forms-embed';
  const styled = new WeakSet();

  const css = `
    /* h2: marges gelijk aan thema */
    h2[class*="textHeading"] {
      margin: 0 0 2rem !important;
    }

    /* p/span body: thema-line-height en -letter-spacing */
    p,
    span,
    p[class*="textBody"],
    span[class*="textBody"] {
      line-height: calc(1 + 0.8 / var(--font-body-scale)) !important;
      letter-spacing: 0.06rem !important;
    }

    /* Knop: font-gewicht en maat van thema .button */
    button[type="submit"],
    button[class*="formSubmitButton"] {
      font-size: 1.5rem !important;
      font-weight: 700 !important;
      letter-spacing: 0.1rem !important;
      min-width: calc(12rem + var(--buttons-border-width) * 2) !important;
      transition: box-shadow var(--duration-short) ease, background-color var(--duration-short) ease !important;
    }

    button[type="submit"]:not([disabled]):hover,
    button[class*="formSubmitButton"]:not([disabled]):hover,
    button[type="submit"]:not([disabled]):focus-visible,
    button[class*="formSubmitButton"]:not([disabled]):focus-visible {
      background-color: var(--color-button-hover) !important;
      filter: none !important;
    }
  `;

  function apply(embed) {
    const root = embed.shadowRoot;
    if (!root || styled.has(root)) return;
    styled.add(root);

    try {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(css);
      root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
    } catch (error) {
      const style = document.createElement('style');
      style.textContent = css;
      root.appendChild(style);
    }
  }

  function scan(node) {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    if (node.tagName === 'SHOPIFY-FORMS-EMBED') apply(node);
    node.querySelectorAll(EMBED).forEach(apply);
  }

  scan(document.documentElement);
  new MutationObserver((mutations) => {
    mutations.forEach((mutation) => mutation.addedNodes.forEach(scan));
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
