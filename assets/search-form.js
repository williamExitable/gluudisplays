class SearchForm extends HTMLElement {
  constructor() {
    super();
    this.input = this.querySelector('input[type="search"]');
    this.resetButton = this.querySelector('button[type="reset"]');

    this.initPlaceholderTicker();

    if (this.input) {
      this.input.form.addEventListener('reset', this.onFormReset.bind(this));
      this.input.addEventListener(
        'input',
        debounce((event) => {
          this.onChange(event);
        }, 300).bind(this)
      );
    }
  }

  toggleResetButton() {
    const resetIsHidden = this.resetButton.classList.contains('hidden');
    if (this.input.value.length > 0 && resetIsHidden) {
      this.resetButton.classList.remove('hidden');
    } else if (this.input.value.length === 0 && !resetIsHidden) {
      this.resetButton.classList.add('hidden');
    }
  }

  onChange() {
    this.toggleResetButton();
  }

  shouldResetForm() {
    return !document.querySelector('[aria-selected="true"] a');
  }

  onFormReset(event) {
    // Prevent default so the form reset doesn't set the value gotten from the url on page load
    event.preventDefault();
    // Don't reset if the user has selected an element on the predictive search dropdown
    if (this.shouldResetForm()) {
      this.input.value = '';
      this.input.focus();
      this.toggleResetButton();
    }
  }

  initPlaceholderTicker() {
    if (!this.input) return;

    this.label = this.querySelector('.field__label');

    if (this.tickerStarted) return;
    this.tickerStarted = true;

    const placeholderTwo = this.input.dataset.placeholderTwo;
    const placeholderThree = this.input.dataset.placeholderThree;

    if (!placeholderTwo && !placeholderThree) return;

    const typingSpeed = parseInt(this.input.dataset.typingSpeed, 10) || 100;
    const deletingSpeed = parseInt(this.input.dataset.deletingSpeed, 10) || 60;
    const delayAfterDeleting = parseInt(this.input.dataset.delayAfterDeleting, 10) || 500;
    const delayBeforeFirstDelete = parseInt(this.input.dataset.delayBeforeFirstDelete, 10) || 2000;
    const delayAfterWordTyped = parseInt(this.input.dataset.delayAfterWordTyped, 10) || 2400;

    const baseText = this.input.dataset.placeholderOne
      || (this.label ? this.label.textContent : this.input.placeholder);
    const focusText = this.input.dataset.placeholderFocus || baseText;

    const placeholders = [];
    if (placeholderTwo) placeholders.push(placeholderTwo);
    if (baseText) placeholders.push(baseText);

    const updatePlaceholder = (value) => {
      this.input.setAttribute('placeholder', value);
      if (this.label) this.label.textContent = value;
    };

    let activeInterval = null;
    let activeTimeout = null;
    let startIndex = 0;

    const stopTicker = () => {
      clearInterval(activeInterval);
      clearTimeout(activeTimeout);
      activeInterval = null;
      activeTimeout = null;
    };

    const typeInNextPlaceholder = (placeholder) => {
      return new Promise((resolve) => {
        let currentText = this.input.getAttribute('placeholder');
        let nextPlaceholder = currentText.length >= 3 && placeholder.startsWith(currentText)
          ? placeholder.replace(currentText, '')
          : placeholder;

        activeInterval = setInterval(() => {
          currentText += nextPlaceholder.charAt(0);
          updatePlaceholder(currentText);
          nextPlaceholder = nextPlaceholder.substring(1);

          if (nextPlaceholder.length === 0) {
            clearInterval(activeInterval);
            activeInterval = null;
            resolve();
          }
        }, typingSpeed);
      });
    };

    const deleteCurrentPlaceholder = (nextPlaceholder) => {
      return new Promise((resolve) => {
        let currentText = this.input.getAttribute('placeholder');

        activeInterval = setInterval(() => {
          currentText = currentText.substring(0, currentText.length - 1);
          updatePlaceholder(currentText);

          if (currentText.length === 0 || (currentText.length >= 3 && nextPlaceholder.startsWith(currentText))) {
            clearInterval(activeInterval);
            activeInterval = null;
            resolve();
          }
        }, deletingSpeed);
      });
    };

    const showNextPlaceholder = () => {
      const nextPlaceholder = placeholders[startIndex];
      startIndex = (startIndex + 1) % placeholders.length;

      deleteCurrentPlaceholder(nextPlaceholder).then(() => {
        activeTimeout = setTimeout(() => {
          typeInNextPlaceholder(nextPlaceholder).then(() => {
            activeTimeout = setTimeout(showNextPlaceholder, delayAfterWordTyped);
          });
        }, delayAfterDeleting);
      });
    };

    const startTicker = () => {
      stopTicker();
      startIndex = 0;
      updatePlaceholder(baseText);
      activeTimeout = setTimeout(showNextPlaceholder, delayBeforeFirstDelete);
    };

    this.input.addEventListener('focus', () => {
      stopTicker();
      updatePlaceholder(focusText);
    });

    this.input.addEventListener('blur', () => {
      if (this.input.value.length > 0) {
        updatePlaceholder(focusText);
      } else {
        startTicker();
      }
    });

    startTicker();
  }
}

customElements.define('search-form', SearchForm);
