var sliderEl = document.querySelector(".gallery_viewer__thumbnails .swiper");

var swiper = new Swiper(sliderEl, {
  direction: "vertical",
  slidesPerView: 3,
  spaceBetween: 16,
});