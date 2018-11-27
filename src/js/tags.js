'use strict';

// Listen for clicks on the tags and send to appropriate page if clicked
$('.tag').click(function () {
  window.location.href = '/' + $(this).text().replace(/ /g, '-');
});
