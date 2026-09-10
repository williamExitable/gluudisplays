if (!customElements.get('product-modal')) {
  customElements.define(
    'product-modal',
    class ProductModal extends ModalDialog {
      constructor() {
        super();
        this.sliderComponent = this.querySelector('slider-component');
        this.slider = this.querySelector('[id^="Slider-ProductModal"]');
        if (!this.slider) return;

        this.isDragging = false;
        this.pointerDownX = null;
        this.bindDragEvents();

        this.addEventListener('keydown', this.onKeyDown.bind(this));
      }

      hide() {
        this.endDrag();
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

      onKeyDown(event) {
        const button =
          event.code === 'ArrowRight'
            ? this.querySelector('.slider-button--next')
            : event.code === 'ArrowLeft'
            ? this.querySelector('.slider-button--prev')
            : null;
        if (!button) return;

        // Prevents the browser from also scrolling the slider natively.
        event.preventDefault();
        button.click();
      }

      /*
       * Touch devices scroll the slider natively, but a mouse cannot drag a scroll container,
       * so dragging is emulated. Scroll snapping is turned off while dragging and the slider is
       * snapped back to the nearest slide on release.
       */
      bindDragEvents() {
        this.slider.addEventListener('dragstart', (event) => event.preventDefault());
        this.slider.addEventListener('pointerdown', this.onPointerDown.bind(this));
        this.slider.addEventListener('pointermove', this.onPointerMove.bind(this));
        this.slider.addEventListener('pointerup', this.onPointerUp.bind(this));
        this.slider.addEventListener('pointercancel', this.endDrag.bind(this));
      }

      onPointerDown(event) {
        if (event.pointerType !== 'mouse' || event.button !== 0) return;
        // Leave the slider buttons and the video/model players alone.
        if (event.target.closest('.slider-buttons, deferred-media, product-model')) return;

        this.pointerDownX = event.clientX;
        this.pointerDownScroll = this.slider.scrollLeft;
        this.pointerDownIndex = this.nearestSlideIndex();
      }

      onPointerMove(event) {
        if (this.pointerDownX === null) return;

        const distance = event.clientX - this.pointerDownX;
        if (!this.isDragging) {
          if (Math.abs(distance) < 5) return;
          this.isDragging = true;
          this.slider.setPointerCapture(event.pointerId);
          this.slider.classList.add('is-dragging');
          this.slider.style.scrollSnapType = 'none';
          this.slider.style.scrollBehavior = 'auto';
        }

        this.slider.scrollLeft = this.pointerDownScroll - distance;
      }

      onPointerUp(event) {
        if (!this.isDragging) {
          this.pointerDownX = null;
          return;
        }

        // Keeps ModalDialog's "click outside closes the modal" handler from firing after a drag.
        event.stopPropagation();

        // A swipe should advance a whole slide well before it is dragged halfway, so the drag
        // distance decides the direction instead of simply snapping back to the nearest slide.
        const distance = event.clientX - this.pointerDownX;
        const threshold = Math.max(40, this.slider.clientWidth * 0.08);
        const steps = Math.abs(distance) > threshold ? (distance < 0 ? 1 : -1) : 0;

        this.endDrag();
        this.slideTo(this.pointerDownIndex + steps);
      }

      endDrag() {
        if (!this.slider) return;
        this.isDragging = false;
        this.pointerDownX = null;
        this.slider.classList.remove('is-dragging');
        this.slider.style.scrollSnapType = '';
        this.slider.style.scrollBehavior = '';
      }

      // Hidden slides (variant duplicates) are skipped so the indexes match the slider counter.
      visibleSlides() {
        return Array.from(this.querySelectorAll('.product-media-modal__slide')).filter(
          (slide) => slide.clientWidth > 0
        );
      }

      nearestSlideIndex() {
        const slides = this.visibleSlides();
        let nearest = 0;
        slides.forEach((slide, index) => {
          if (Math.abs(slide.offsetLeft - this.slider.scrollLeft) < Math.abs(slides[nearest].offsetLeft - this.slider.scrollLeft)) {
            nearest = index;
          }
        });
        return nearest;
      }

      slideTo(index) {
        const slides = this.visibleSlides();
        if (!slides.length) return;

        const target = slides[Math.min(Math.max(index, 0), slides.length - 1)];
        this.slider.scrollTo({ left: target.offsetLeft, behavior: 'smooth' });
      }
    }
  );
}
