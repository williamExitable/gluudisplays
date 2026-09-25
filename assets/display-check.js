/*
 * Display check: "Welk display past het beste bij mij? Doe de check!"
 *
 * A small Vue app inside the theme's modal, rendered globally by snippets/display-check.liquid.
 * It can be opened from anywhere:
 *   - window.GluuDisplayCheck.open('my-trigger')
 *   - any element with [data-display-check-open] (the attribute value is used as trigger name)
 *   - a link to #display-check, or any url with ?display-check=1
 *
 * Every step, answer, result and product click is pushed to the GTM dataLayer as a
 * display_check_* event.
 */

const DISPLAY_CHECK_CATEGORIES = {
  totems: 'Totems',
  futuro: 'Futuro',
  bords: 'Digitale borden',
  countertop: 'Countertop',
  panel: 'Panel',
};

/*
 * touch: 'required' when the use case only works with a touchscreen, 'optional' otherwise.
 * categories: the categories that suit the use case; an empty list means "no preference".
 */
const DISPLAY_CHECK_USE_CASES = {
  aanbiedingen: { touch: 'optional', categories: ['bords', 'totems', 'panel'] },
  bestellingen: { touch: 'required', categories: ['totems', 'futuro', 'countertop'] },
  website: { touch: 'required', categories: ['totems', 'countertop', 'futuro'] },
  aanmeldzuil: { touch: 'required', categories: ['totems', 'futuro', 'countertop'] },
  media: { touch: 'optional', categories: [] },
  onbekend: { touch: 'optional', categories: [] },
};

const DISPLAY_CHECK_STEPS = [
  {
    id: 'usecase',
    question: 'Waar wil je het display voor gebruiken?',
    multiple: false,
    options: [
      { value: 'aanbiedingen', label: 'Promoten van aanbiedingen', icon: 'ph-tag' },
      { value: 'bestellingen', label: 'Plaatsen van bestellingen', icon: 'ph-shopping-cart' },
      { value: 'website', label: 'Browsen van mijn website', icon: 'ph-cursor-click' },
      { value: 'aanmeldzuil', label: 'Aanmeldzuil', icon: 'ph-identification-card' },
      { value: 'media', label: "Tonen van video's of afbeeldingen", icon: 'ph-play-circle' },
      { value: 'onbekend', label: 'Weet ik niet', icon: 'ph-question' },
    ],
  },
  {
    id: 'placement',
    question: 'Waar wil je het display plaatsen?',
    hint: 'Meerdere keuzes mogelijk.',
    multiple: true,
    options: [
      { value: 'totems', label: 'Staand in de ruimte', icon: 'ph-columns' },
      { value: 'futuro', label: 'Balie, bureau, receptie of beurs', icon: 'ph-storefront' },
      { value: 'bords', label: 'Stoepbord of uitgangsbord', icon: 'ph-signpost' },
      { value: 'countertop', label: 'Op een tafel of bureau', icon: 'ph-desktop-tower' },
      { value: 'panel', label: 'Aan de wand', icon: 'ph-frame-corners' },
    ],
  },
  {
    id: 'touch',
    question: 'Wil je interactie met de gebruiker?',
    hint: 'Meerdere keuzes mogelijk.',
    multiple: true,
    options: [
      { value: 'yes', label: 'Ja, met touchscreen', icon: 'ph-hand-tap' },
      { value: 'no', label: 'Nee, alleen weergeven', icon: 'ph-monitor' },
    ],
  },
];

const DISPLAY_CHECK_TOUCH_LABELS = {
  yes: 'Touchscreen',
  optional: 'Touchscreen optioneel',
  no: 'Zonder touchscreen',
};

const DISPLAY_CHECK_RESULT_LIMIT = 6;

function displayCheckTrack(event, data) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(Object.assign({ event: `display_check_${event}` }, data));
}

function displayCheckOptionLabel(stepId, value) {
  const step = DISPLAY_CHECK_STEPS.find((item) => item.id === stepId);
  const option = step && step.options.find((item) => item.value === value);
  return option ? option.label : value;
}

function displayCheckAnswerLabels(answers) {
  return DISPLAY_CHECK_STEPS.reduce((labels, step) => {
    const answer = answers[step.id];
    const values = Array.isArray(answer) ? answer : [answer].filter(Boolean);

    if (values.length) {
      labels[step.id] = values.map((value) => displayCheckOptionLabel(step.id, value));
    }
    return labels;
  }, {});
}

/*
 * Products are scored instead of filtered hard, so a choice that matches nothing still gets
 * suggestions. Only the placement and an explicit touch preference act as a hard filter; if
 * nothing survives that filter the scored list is shown as "dichtst in de buurt".
 */
function displayCheckMatch(products, answers) {
  const useCase = DISPLAY_CHECK_USE_CASES[answers.usecase] || DISPLAY_CHECK_USE_CASES.onbekend;
  const placements = answers.placement || [];
  const touchAnswers = answers.touch || [];
  const wantsTouch = touchAnswers.includes('yes');
  const wantsStatic = touchAnswers.includes('no');
  const touchRequired = useCase.touch === 'required' || (wantsTouch && !wantsStatic);
  const staticOnly = wantsStatic && !wantsTouch;

  const scored = products.map((product) => {
    const reasons = [];
    let score = 0;

    const placementMatches = placements.filter((placement) => product.categories.includes(placement));
    if (placementMatches.length) {
      score += 4;
      reasons.push(`Geschikt voor: ${placementMatches.map((value) => displayCheckOptionLabel('placement', value)).join(', ')}`);
    }

    if (useCase.categories.some((category) => product.categories.includes(category))) {
      score += 2;
      reasons.push(`Past bij ${displayCheckOptionLabel('usecase', answers.usecase).toLowerCase()}`);
    }

    if (touchRequired) {
      if (product.touch === 'no') reasons.push('Let op: zonder touchscreen');
      else {
        score += 2;
        reasons.push(product.touch === 'yes' ? 'Met touchscreen' : 'Touchscreen als optie');
      }
    }
    if (staticOnly && product.touch !== 'yes') score += 1;
    if (!product.available) score -= 1;

    const placementOk = !placements.length || placementMatches.length > 0;
    const touchOk = (!touchRequired || product.touch !== 'no') && (!staticOnly || product.touch !== 'yes');

    return { product, score, reasons, matches: placementOk && touchOk };
  });

  const byScore = (a, b) => b.score - a.score || a.product.price - b.product.price;
  const primary = scored.filter((item) => item.matches).sort(byScore);
  const rest = scored.filter((item) => !item.matches).sort(byScore);

  return {
    exact: primary.length > 0,
    results: (primary.length ? primary : rest).slice(0, DISPLAY_CHECK_RESULT_LIMIT),
  };
}

/*
 * The advice form is a Liquid contact form that lives outside the app. It is moved into this
 * component while the advice step is open and put back afterwards, so Vue never patches it.
 */
const DisplayCheckAdvice = {
  props: {
    summary: { type: String, required: true },
    products: { type: String, required: true },
  },
  template: '<div class="display-check__advice-slot" ref="slot"></div>',
  mounted() {
    this.form = document.getElementById('DisplayCheckAdviceForm');
    if (!this.form) return;

    this.form.removeAttribute('hidden');
    this.$refs.slot.appendChild(this.form);
    this.fill('[data-display-check-summary]', this.summary);
    this.fill('[data-display-check-products]', this.products);

    const status = this.form.querySelector('[data-form-status]');
    if (status) status.focus();
  },
  beforeUnmount() {
    if (!this.form) return;
    this.form.setAttribute('hidden', '');
    document.body.appendChild(this.form);
  },
  methods: {
    fill(selector, value) {
      const field = this.form.querySelector(selector);
      if (field) field.value = value;
    },
  },
};

const DisplayCheckApp = {
  components: { 'display-check-advice': DisplayCheckAdvice },
  data() {
    return {
      steps: DISPLAY_CHECK_STEPS,
      categoryLabels: DISPLAY_CHECK_CATEGORIES,
      touchLabels: DISPLAY_CHECK_TOUCH_LABELS,
      products: [],
      view: 'intro',
      stepIndex: 0,
      answers: { usecase: null, placement: [], touch: [] },
    };
  },
  computed: {
    step() {
      return this.steps[this.stepIndex];
    },
    selection() {
      const answer = this.answers[this.step.id];
      return Array.isArray(answer) ? answer : [answer].filter(Boolean);
    },
    match() {
      return displayCheckMatch(this.products, this.answers);
    },
    results() {
      return this.match.results;
    },
    answerSummary() {
      const labels = displayCheckAnswerLabels(this.answers);
      return this.steps
        .filter((step) => labels[step.id])
        .map((step) => `${step.question} ${labels[step.id].join(', ')}`)
        .join('\n');
    },
    productSummary() {
      return this.results.map((item) => item.product.title).join(', ');
    },
    progress() {
      return Math.round(((this.stepIndex + 1) / this.steps.length) * 100);
    },
  },
  methods: {
    start(trigger) {
      displayCheckTrack('start', { display_check_trigger: trigger || 'modal' });
      this.view = 'question';
      this.stepIndex = 0;
      this.trackStep();
    },
    trackStep() {
      displayCheckTrack('step_view', {
        display_check_step: this.step.id,
        display_check_step_number: this.stepIndex + 1,
        display_check_question: this.step.question,
      });
    },
    trackAnswer(value) {
      displayCheckTrack('answer', {
        display_check_step: this.step.id,
        display_check_question: this.step.question,
        display_check_answer: displayCheckOptionLabel(this.step.id, value),
        display_check_answers: this.selection.map((item) => displayCheckOptionLabel(this.step.id, item)).join(', '),
      });
    },
    isSelected(option) {
      return this.selection.includes(option.value);
    },
    // A single-choice step advances right away; multiple choice waits for the next button.
    select(option) {
      if (!this.step.multiple) {
        this.answers[this.step.id] = option.value;
        this.trackAnswer(option.value);
        this.next();
        return;
      }

      const selected = this.answers[this.step.id];
      const index = selected.indexOf(option.value);
      if (index === -1) selected.push(option.value);
      else selected.splice(index, 1);
      this.trackAnswer(option.value);
    },
    next() {
      if (this.stepIndex < this.steps.length - 1) {
        this.stepIndex += 1;
        this.trackStep();
        return;
      }
      this.showResults();
    },
    back() {
      if (this.view !== 'question') {
        this.view = 'question';
        this.stepIndex = this.steps.length - 1;
        return;
      }
      if (this.stepIndex === 0) {
        this.view = 'intro';
        return;
      }
      this.stepIndex -= 1;
      this.trackStep();
    },
    showResults() {
      this.view = 'results';
      const labels = displayCheckAnswerLabels(this.answers);

      displayCheckTrack('results', {
        display_check_exact_match: this.match.exact,
        display_check_result_count: this.results.length,
        display_check_products: this.results.map((item) => item.product.handle).join(','),
        display_check_usecase: (labels.usecase || []).join(', '),
        display_check_placement: (labels.placement || []).join(', '),
        display_check_touch: (labels.touch || []).join(', '),
      });
    },
    restart() {
      displayCheckTrack('restart', { display_check_step: this.view });
      this.answers = { usecase: null, placement: [], touch: [] };
      this.stepIndex = 0;
      this.view = 'question';
      this.trackStep();
    },
    openAdvice() {
      this.view = 'advice';
      displayCheckTrack('advice_open', {
        display_check_products: this.results.map((item) => item.product.handle).join(','),
      });
    },
    productClick(item, index) {
      displayCheckTrack('product_click', {
        display_check_product_handle: item.product.handle,
        display_check_product_title: item.product.title,
        display_check_product_price: item.product.price,
        display_check_product_position: index + 1,
      });
    },
    categoryLabel(item) {
      return item.product.categories.map((category) => this.categoryLabels[category]).filter(Boolean).join(' · ');
    },
  },
  template: `
    <div class="display-check__inner">
      <header class="display-check__header">
        <p class="display-check__eyebrow">Displaycheck</p>
        <h2 class="display-check__title">Welk display past het beste bij mij? Doe de check!</h2>
      </header>

      <div v-if="view === 'intro'" class="display-check__body display-check__body--intro">
        <p class="display-check__lead">
          Antwoord op drie korte vragen en we laten je zien welke displays het beste bij jouw
          situatie passen.
        </p>
        <button type="button" class="button display-check__cta" @click="start('intro')">
          Start de check
        </button>
      </div>

      <div v-else-if="view === 'question'" class="display-check__body">
        <div class="display-check__progress">
          <div class="display-check__progress-bar" :style="{ width: progress + '%' }"></div>
        </div>
        <p class="display-check__step-count">Vraag {{ stepIndex + 1 }} van {{ steps.length }}</p>

        <h3 class="display-check__question">{{ step.question }}</h3>
        <p v-if="step.hint" class="display-check__hint">{{ step.hint }}</p>

        <ul class="display-check__options" :class="'display-check__options--' + step.id">
          <li v-for="option in step.options" :key="option.value">
            <button
              type="button"
              class="display-check__option"
              :class="{ 'display-check__option--selected': isSelected(option) }"
              :aria-pressed="isSelected(option)"
              @click="select(option)"
            >
              <i class="ph-fill" :class="option.icon" aria-hidden="true"></i>
              <span class="display-check__option-label">{{ option.label }}</span>
            </button>
          </li>
        </ul>

        <div class="display-check__actions">
          <button type="button" class="button button--secondary" @click="back">Terug</button>
          <button
            v-if="step.multiple"
            type="button"
            class="button"
            :disabled="!selection.length"
            @click="next"
          >
            {{ stepIndex === steps.length - 1 ? 'Bekijk resultaat' : 'Volgende' }}
          </button>
        </div>
      </div>

      <div v-else-if="view === 'results'" class="display-check__body">
        <h3 class="display-check__question">
          {{ match.exact ? 'Deze displays passen bij jouw keuzes' : 'Dit komt het dichtst in de buurt' }}
        </h3>
        <p v-if="!match.exact" class="display-check__hint">
          Er is geen display dat precies aan alle keuzes voldoet. Vraag advies aan en we zoeken met
          je mee.
        </p>

        <ul v-if="results.length" class="display-check__results">
          <li v-for="(item, index) in results" :key="item.product.id" class="display-check__result">
            <a
              class="display-check__result-link"
              :href="item.product.url"
              @click="productClick(item, index)"
            >
              <img
                v-if="item.product.image"
                class="display-check__result-image"
                :src="item.product.image"
                :alt="item.product.title"
                width="600"
                height="600"
                loading="lazy"
              >
              <span class="display-check__result-info">
                <span class="display-check__result-category">{{ categoryLabel(item) }}</span>
                <span class="display-check__result-title">{{ item.product.title }}</span>
                <span class="display-check__result-price">vanaf {{ item.product.priceFormatted }}</span>
                <span class="display-check__result-touch">{{ touchLabels[item.product.touch] }}</span>
              </span>
            </a>
            <ul v-if="item.reasons.length" class="display-check__reasons">
              <li v-for="reason in item.reasons" :key="reason">{{ reason }}</li>
            </ul>
          </li>
        </ul>
        <p v-else class="display-check__hint">
          We konden geen displays laden. Vraag advies aan, dan helpen we je persoonlijk verder.
        </p>

        <div class="display-check__actions">
          <button type="button" class="button button--secondary" @click="restart">
            Opnieuw starten
          </button>
          <button type="button" class="button" @click="openAdvice">Advies vragen</button>
        </div>
      </div>

      <div v-else class="display-check__body">
        <h3 class="display-check__question">Advies op maat</h3>
        <p class="display-check__hint">
          Laat je gegevens achter, dan nemen we contact met je op met een advies op basis van je
          keuzes.
        </p>
        <display-check-advice :summary="answerSummary" :products="productSummary" />
        <div class="display-check__actions">
          <button type="button" class="button button--secondary" @click="back">Terug</button>
          <button type="button" class="button button--secondary" @click="restart">
            Opnieuw starten
          </button>
        </div>
      </div>
    </div>
  `,
};

class DisplayCheckModal extends ModalDialog {
  show(opener) {
    super.show(opener);
    this.mountApp();

    const trigger = (opener && (opener.dataset.displayCheckOpen || opener.dataset.trigger)) || this.trigger || 'unknown';
    displayCheckTrack('open', { display_check_trigger: trigger });
    this.trigger = null;
  }

  hide() {
    displayCheckTrack('close', {
      display_check_step: this.app ? this.app.view : 'intro',
      display_check_completed: this.app ? this.app.view === 'results' || this.app.view === 'advice' : false,
    });
    super.hide();
  }

  mountApp() {
    if (this.app) return this.app;

    const mount = this.querySelector('#DisplayCheckApp');
    if (!mount || typeof Vue === 'undefined') return null;

    mount.innerHTML = '';
    this.app = Vue.createApp(DisplayCheckApp).mount(mount);
    this.app.products = this.products();
    return this.app;
  }

  products() {
    const data = document.getElementById('DisplayCheckData');
    if (!data) return [];

    try {
      return JSON.parse(data.textContent).products || [];
    } catch (error) {
      console.warn('display-check: could not parse product data', error);
      return [];
    }
  }
}

if (!customElements.get('display-check-modal')) {
  customElements.define('display-check-modal', DisplayCheckModal);
}

window.GluuDisplayCheck = {
  open(trigger, view) {
    const modal = document.getElementById('DisplayCheckModal');
    if (!modal) return;

    modal.trigger = trigger || 'api';
    modal.show(document.activeElement);

    const app = modal.mountApp();
    if (app && view) app.view = view;
  },
};

document.addEventListener('click', (event) => {
  const trigger = event.target.closest('[data-display-check-open], a[href$="#display-check"]');
  if (!trigger) return;

  event.preventDefault();
  window.GluuDisplayCheck.open(trigger.dataset.displayCheckOpen || 'link');
});

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);

  // The advice form posts to the current page, so reopen the tool on the advice step to show
  // the success or error message the Liquid form rendered.
  if (document.querySelector('#DisplayCheckAdviceForm .display-check__form-success')) {
    displayCheckTrack('advice_submit', { display_check_trigger: 'contact_form' });
    window.GluuDisplayCheck.open('advice_submitted', 'advice');
    return;
  }

  if (params.get('display-check') || window.location.hash === '#display-check') {
    window.GluuDisplayCheck.open('url');
  }
});
