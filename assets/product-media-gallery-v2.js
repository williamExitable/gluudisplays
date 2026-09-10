// Guarded init: the thumbnail rail is only rendered when a product has more than
// one media item, so the container is frequently absent.
(function () {
  const container = document.querySelector('.gallery_viewer__thumbnails .swiper');
  if (!container || typeof Swiper === 'undefined' || container.swiper) return;

  new Swiper(container, {
    direction: 'vertical',
    slidesPerView: 3,
    spaceBetween: 16,
  });
})();
