'use strict';

// Listen for clicks on the tags and send to appropriate page if clicked
$('.tag').click(function () {
  window.location.href = '/tag/' + $(this).text().replace(/ /g, '-');
});
