class CustomBannerSlider extends HTMLElement {
  constructor() {
    super();
    this.slides = Array.from(this.querySelectorAll('.custom-banner__slide'));
    this.index = 0;
    this.speed = parseInt(this.dataset.autoplaySpeed, 10) || 6000;
    this.animationDuration = 700;
  }

  connectedCallback() {
    if (this.slides.length < 2) return;

    this.observer = new IntersectionObserver((entries) => {
      entries[0].isIntersecting ? this.play() : this.pause();
    });
    this.observer.observe(this);
  }

  disconnectedCallback() {
    this.pause();
    this.observer?.disconnect();
  }

  play() {
    if (this.timer) return;
    this.timer = setInterval(() => this.next(), this.speed);
  }

  pause() {
    clearInterval(this.timer);
    this.timer = null;
  }

  next() {
    const current = this.slides[this.index];
    this.index = (this.index + 1) % this.slides.length;
    const upcoming = this.slides[this.index];

    current.classList.replace('custom-banner__slide--active', 'custom-banner__slide--leaving');
    current.setAttribute('aria-hidden', 'true');

    clearTimeout(this.enterTimer);
    this.enterTimer = setTimeout(() => {
      current.classList.remove('custom-banner__slide--leaving');
      upcoming.classList.add('custom-banner__slide--active');
      upcoming.removeAttribute('aria-hidden');
    }, this.animationDuration);
  }
}

customElements.define('custom-banner-slider', CustomBannerSlider);
