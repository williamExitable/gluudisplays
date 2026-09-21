class CustomerReviewsSlider extends HTMLElement {
  connectedCallback() {
    const container = this.querySelector('.swiper');
    if (!container || typeof Swiper === 'undefined' || container.swiper) return;

    new Swiper(container, {
      slidesPerView: 1,
      spaceBetween: 20,
      grabCursor: true,
      navigation: {
        prevEl: this.querySelector('.customer-reviews__nav--prev'),
        nextEl: this.querySelector('.customer-reviews__nav--next'),
      },
      breakpoints: {
        750: { slidesPerView: 2 },
        990: { slidesPerView: 3 },
      },
    });
  }
}

customElements.define('customer-reviews-slider', CustomerReviewsSlider);
