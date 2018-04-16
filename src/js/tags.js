'use strict';

// Listen for clicks on the tags and send to main page if clicked
$('.tag').click(function () {
  window.location.href = '/?search=' + $(this).text();
});
