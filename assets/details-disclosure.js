class DetailsDisclosure extends HTMLElement {
  constructor() {
    super();
    this.mainDetailsToggle = this.querySelector('details');
    this.content = this.mainDetailsToggle.querySelector('summary').nextElementSibling;

    this.mainDetailsToggle.addEventListener('focusout', this.onFocusOut.bind(this));
    this.mainDetailsToggle.addEventListener('toggle', this.onToggle.bind(this));
  }

  onFocusOut() {
    setTimeout(() => {
      if (!this.contains(document.activeElement)) this.close();
    });
  }

  onToggle() {
    if (!this.animations) this.animations = this.content.getAnimations();

    if (this.mainDetailsToggle.hasAttribute('open')) {
      this.animations.forEach((animation) => animation.play());
    } else {
      this.animations.forEach((animation) => animation.cancel());
    }
  }

  close() {
    this.mainDetailsToggle.removeAttribute('open');
    this.mainDetailsToggle.querySelector('summary').setAttribute('aria-expanded', false);
  }
}

customElements.define('details-disclosure', DetailsDisclosure);

class HeaderMenu extends DetailsDisclosure {
  constructor() {
    super();
    this.header = document.querySelector('.header-wrapper');
    this.summary = this.mainDetailsToggle.querySelector('summary');
    this.desktop = window.matchMedia('(min-width: 990px)');

    this.addEventListener('mouseover', this.onMouseOver.bind(this));
    this.addEventListener('mouseout', this.onMouseOut.bind(this));
    this.summary.addEventListener('click', this.onSummaryClick.bind(this));
  }

  onMouseOver() {
    if (!this.desktop.matches) return;
    clearTimeout(this.closeTimeout);
    this.open();
  }

  onMouseOut(event) {
    if (!this.desktop.matches) return;
    // Ignore moves between descendants of this menu.
    if (event.relatedTarget && this.contains(event.relatedTarget)) return;
    // Delay the close so the pointer can cross the gap between the menu item
    // and the panel (the header padding) without the panel disappearing.
    clearTimeout(this.closeTimeout);
    this.closeTimeout = setTimeout(() => this.close(), 150);
  }

  onSummaryClick(event) {
    // On desktop the menu is controlled by hover; a mouse click (detail > 0)
    // should not toggle it. Keyboard activation keeps the native behaviour.
    if (!this.desktop.matches || event.detail === 0) return;
    event.preventDefault();
    // global.js also listens for this click and flips aria-expanded, so restore
    // it once all click handlers have run.
    setTimeout(() => this.summary.setAttribute('aria-expanded', this.mainDetailsToggle.hasAttribute('open')));
  }

  open() {
    document.querySelectorAll('header-menu').forEach((menu) => {
      if (menu !== this) menu.close();
    });
    this.mainDetailsToggle.setAttribute('open', '');
    this.summary.setAttribute('aria-expanded', true);
  }

  onToggle() {
    if (!this.header) return;
    this.header.preventHide = this.mainDetailsToggle.open;

    if (document.documentElement.style.getPropertyValue('--header-bottom-position-desktop') !== '') return;
    document.documentElement.style.setProperty(
      '--header-bottom-position-desktop',
      `${Math.floor(this.header.getBoundingClientRect().bottom)}px`
    );
  }
}

customElements.define('header-menu', HeaderMenu);
