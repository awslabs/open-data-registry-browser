'use strict';

// Listen for clicks on the tags and send to appropriate page if clicked.
$('.tag').click(function () {
  let location = '/tag/' + $(this).text().replace(/ /g, '-');
  window.location.href = location;
});
