# GLUU Displays theme

Shopify Dawn-based theme. Local dev: `shopify theme dev` (preview op http://127.0.0.1:9292).

## Cookiebot auto-blocking

De Cookiebot app-block staat met `data-blockingmode="auto"` in de `<body>`. In die modus
onderschept Cookiebot **elk `<script src>` dat ná die tag in de HTML staat** en voert het
pas uit nadat de consent-status bepaald is (na `load`, of helemaal niet).

Gevolg: theme-scripts die vanuit een section/snippet geladen worden (`product-modal.js`,
`media-gallery.js`, `product-info.js`, …) registreren hun custom elements te laat, waardoor
je fouten krijgt als `modal.show is not a function`.

Hetzelfde geldt voor inline scripts: het blok in `theme.liquid` dat `window.routes`,
`window.cartStrings`, `window.variantStrings` en `window.accessibilityStrings` zet werd ook
geblokkeerd, waardoor die globals `undefined` waren en `feather.replace()` nooit liep.

**Elk `<script>` van het thema zelf (inline én `| asset_url`) moet daarom
`data-cookieconsent="ignore"` hebben.** Theme-scripts zijn functioneel en zetten geen cookies.
