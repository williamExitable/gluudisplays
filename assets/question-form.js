const QUESTION_FORM_TIMEOUT = 15000;
const QUESTION_FORM_FILL_INTERVAL = 250;
const QUESTION_FORM_FILL_ATTEMPTS = 80;

function setQuestionFormValue(field, value) {
  const descriptor = Object.getOwnPropertyDescriptor(field.constructor.prototype, 'value');
  if (descriptor && descriptor.set) descriptor.set.call(field, value);
  else field.value = value;

  field.dispatchEvent(new Event('input', { bubbles: true }));
  field.dispatchEvent(new Event('change', { bubbles: true }));
}

function hideQuestionFormField(field) {
  const label = field.labels && field.labels.length ? field.labels[0] : null;

  let container = field.parentElement;
  while (label && container && !container.contains(label)) container = container.parentElement;

  if (container && container.querySelectorAll('input, textarea, select').length === 1) {
    container.style.setProperty('display', 'none', 'important');
    return;
  }

  field.style.setProperty('display', 'none', 'important');
  if (label) label.style.setProperty('display', 'none', 'important');
}

if (!customElements.get('question-form-embed')) {
  customElements.define(
    'question-form-embed',
    class QuestionFormEmbed extends HTMLElement {
      connectedCallback() {
        if (this.claimed) return;
        this.formId = this.dataset.formId;
        if (!this.formId) return;
        if (!this.claim()) this.watch();
      }

      watch() {
        if (this.observer) return;
        this.observer = new MutationObserver(() => this.claim());
        this.observer.observe(document.documentElement, { childList: true, subtree: true });
        this.timer = setTimeout(this.fail.bind(this), QUESTION_FORM_TIMEOUT);
      }

      stopWatching() {
        if (this.observer) this.observer.disconnect();
        if (this.timer) clearTimeout(this.timer);
        this.observer = null;
        this.timer = null;
      }

      findSource() {
        const nodes = document.querySelectorAll(`[data-forms-id="${this.formId}"]`);
        return Array.from(nodes).find((node) => !this.contains(node));
      }

      claim() {
        const source = this.findSource();
        if (!source) return false;

        this.claimed = true;
        this.stopWatching();
        this.appendChild(source.closest('[id^="shopify-block-"]') || source);
        this.setAttribute('loaded', '');

        this.watchVariant();
        this.watchModal();
        this.fill();
        return true;
      }

      fail() {
        this.stopWatching();
        this.setAttribute('failed', '');
      }

      // Refill whenever the customer switches variant, so the article number always
      // matches the variant that is on screen.
      watchVariant() {
        if (typeof subscribe !== 'function' || typeof PUB_SUB_EVENTS === 'undefined') return;

        subscribe(PUB_SUB_EVENTS.variantChange, (event) => {
          if (event.data.sectionId !== this.dataset.sectionId || !event.data.variant) return;
          this.dataset.sku = event.data.variant.sku || '';
          this.dataset.variantId = event.data.variant.id;
          this.fill();
        });
      }

      // The form is a React app: it can re-render (or reset after a submit) while the
      // modal is closed, so reapply the value every time the modal is opened.
      watchModal() {
        const modal = this.closest('modal-dialog');
        if (!modal) return;

        new MutationObserver(() => {
          if (modal.hasAttribute('open')) this.fill();
        }).observe(modal, { attributes: true, attributeFilter: ['open'] });
      }

      buildValue() {
        const parts = [this.dataset.sku, this.dataset.productTitle];
        const url = this.dataset.productUrl;

        if (url) parts.push(this.dataset.variantId ? `${url}?variant=${this.dataset.variantId}` : url);
        return parts.filter((part) => part).join(' | ');
      }

      // Shopify Forms can render the field either directly in the light DOM or inside
      // the shadow root of <form-embed>, so search every root below this element.
      searchRoots() {
        const roots = [this];

        this.querySelectorAll('*').forEach((node) => {
          if (node.shadowRoot) roots.push(node.shadowRoot);
        });
        return roots;
      }

      // A custom field renders as <input id="custom#product"
      // data-testid="field-custom#product"> with a separate <label for="custom#product">
      // Product</label>. The test id is the most precise handle; the label text is the
      // fallback in case the app changes its id scheme.
      findField() {
        const name = this.dataset.fillLabel.toLowerCase();
        const matches = (texts) => texts.some((text) => text && text.toLowerCase().includes(name));

        return this.searchRoots().reduce((found, root) => {
          if (found) return found;

          const exact = root.querySelector(`[data-testid="field-custom#${name}"]`);
          if (exact) return exact;

          const fields = Array.from(root.querySelectorAll('input, textarea'));
          return (
            fields.find((field) => matches(Array.from(field.labels || []).map((label) => label.textContent))) ||
            fields.find((field) => matches([field.getAttribute('aria-label'), field.placeholder, field.name, field.id]))
          );
        }, null);
      }

      fill() {
        if (!this.dataset.fillLabel) return;

        const value = this.buildValue();
        if (!value) return;

        if (this.fillTimer) clearInterval(this.fillTimer);

        let attempts = 0;
        const attempt = () => {
          const field = this.findField();

          if (field) {
            setQuestionFormValue(field, value);
            if (this.hasAttribute('data-fill-hidden')) hideQuestionFormField(field);
            return true;
          }

          if (++attempts < QUESTION_FORM_FILL_ATTEMPTS) return false;
          console.warn(
            `question-form-embed: no field matching "${this.dataset.fillLabel}" found in ${this.dataset.formId}`
          );
          return true;
        };

        if (attempt()) return;
        this.fillTimer = setInterval(() => {
          if (attempt()) clearInterval(this.fillTimer);
        }, QUESTION_FORM_FILL_INTERVAL);
      }
    }
  );
}
