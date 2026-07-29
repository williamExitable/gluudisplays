 document.addEventListener('DOMContentLoaded', function () {
    // Select all links
    var links = document.querySelectorAll('a');

    // Loop through each link
    links.forEach(function (link) {
        // Add a click event listener to each link
        link.addEventListener('click', function (event) {
            // Check if the href contains '#chat'
            if (link.getAttribute('href') === '#chat') {
                event.preventDefault(); // Prevent the default action
                // Your script or function to be triggered
                smartsupp('chat:show');
            }
        });
    });
});