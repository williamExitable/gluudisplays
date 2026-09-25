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

## Displaycheck (Vue)

De tool "Welk display past het beste bij mij? Doe de check!" is een Vue-app zonder build-stap:
Vue 3 staat als global build in `assets/vue.global.prod.js`, de app in `assets/display-check.js`.

`snippets/display-check.liquid` wordt één keer vanuit `theme.liquid` gerenderd en levert de
modal, de productdata (`<script type="application/json" id="DisplayCheckData">`, uit
`collections.all`, max 50 producten) en het adviesformulier (een native `{% form 'contact' %}`,
dus geen afhankelijkheid van een app-block). De app verplaatst dat formulier in de adviesstap
in de DOM en zet het daarna terug, zodat Vue nooit over de Liquid-markup rendert.

Openen kan met `window.GluuDisplayCheck.open(trigger)`, met `[data-display-check-open]` op een
element, via een link naar `#display-check`, of met `?display-check=1` in de URL. De section
`display-check-trigger` plaatst een kant-en-klare knop.

Producten krijgen hun categorie (`totems`, `futuro`, `bords`, `countertop`, `panel`) op basis
van handle en product type. Overschrijf dat met de producttag `check:<categorie>` (meerdere
tags mogelijk) en de touch-detectie met `check-touch` / `check-no-touch`.

### DataLayer

Alle events gaan via `displayCheckTrack()` naar `window.dataLayer` (GTM-container
`GTM-KQK4FGTN`). Eventnaam is altijd `display_check_<actie>`, properties beginnen met
`display_check_`. Antwoorden worden als leesbare labels gepusht, producten als handle.

| Event | Wanneer | Properties |
| --- | --- | --- |
| `display_check_open` | modal gaat open | `trigger` |
| `display_check_start` | klik op "Start de check" | `trigger` (`intro`) |
| `display_check_step_view` | vraag komt in beeld | `step`, `step_number`, `question` |
| `display_check_answer` | elke (de)selectie | `step`, `question`, `answer`, `answers` |
| `display_check_results` | resultaten in beeld | `exact_match`, `result_count`, `products`, `usecase`, `placement`, `touch` |
| `display_check_product_click` | klik op een productkaart | `product_handle`, `product_title`, `product_price`, `product_position` |
| `display_check_restart` | klik op "Opnieuw starten" | `step` (view waar de gebruiker vandaan kwam) |
| `display_check_advice_open` | adviesstap in beeld | `products` |
| `display_check_advice_submit` | pagina terug na verzonden formulier | `trigger` (`contact_form`) |
| `display_check_close` | modal gaat dicht | `step`, `completed` (true bij results/advice) |

`display_check_trigger` vertelt waar de tool vandaan is geopend: `url`, `link`, `api`,
`advice_submitted`, of de waarde van `data-display-check-open` (bijvoorbeeld
`section-<section.id>` of `featured-collection-<section.id>`).
