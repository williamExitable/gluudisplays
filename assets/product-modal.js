if (!customElements.get('product-modal')) {
  customElements.define(
    'product-modal',
    class ProductModal extends ModalDialog {
      constructor() {
        super();
        this.sliderComponent = this.querySelector('slider-component');
        this.slider = this.querySelector('[id^="Slider-ProductModal"]');
      }

      hide() {
        super.hide();
      }

      show(opener) {
        super.show(opener);
        this.showActiveMedia();
      }

      showActiveMedia() {
        const mediaId = this.openedBy.getAttribute('data-media-id');
        const slides = this.querySelectorAll('.product-media-modal__slide');
        slides.forEach((slide) => slide.classList.toggle('active', slide.dataset.mediaId === mediaId));

        const activeSlide = this.querySelector(`.product-media-modal__slide[data-media-id="${mediaId}"]`);
        if (!activeSlide || !this.slider) return;

        // The modal is only made visible in super.show(), so wait a frame for the slider to be laid
        // out before jumping to the slide. 'instant' skips the smooth scrolling used while swiping.
        requestAnimationFrame(() => {
          this.slider.scrollTo({ left: activeSlide.offsetLeft, behavior: 'instant' });
          if (this.sliderComponent) this.sliderComponent.resetPages();
        });

        const activeMediaTemplate = activeSlide.querySelector('template');
        const activeMediaContent = activeMediaTemplate ? activeMediaTemplate.content : null;
        const deferredMedia = activeSlide.querySelector('deferred-media, product-model');

        if (deferredMedia && activeMediaContent && activeMediaContent.querySelector('.js-youtube')) {
          deferredMedia.loadContent();
        }
      }
    }
  );
}
