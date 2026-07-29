document.addEventListener('DOMContentLoaded', function () {
  // Select all links with the 'scroll-to' class
  const links = document.querySelectorAll('.scroll-to');

  // Add click event listeners to each link
  links.forEach(link => {
    link.addEventListener('click', function (e) {
      // Prevent the default link behavior
      e.preventDefault();

      // Get the target ID from the href attribute
      const targetId = this.getAttribute('href').substring(1);

      // Find the target element
      const targetElement = document.getElementById(targetId);

      // Scroll to the target element smoothly
      if (targetElement) {
        window.scrollTo({
          top: targetElement.offsetTop,
          behavior: 'smooth'
        });
      }
    });
  });
});
