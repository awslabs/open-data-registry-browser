'use strict';

// Listen for clicks on the tags and send to appropriate page if clicked.
$('.tag').click(function (e) {
  let location;
  // Handle different location for services and tags
  if ($(e.target).hasClass('service-tag')) {
    location = '/service/' + $(this).text().toLowerCase().replace(/ /g, '-') + '/usage-examples/';  
  } else {
    location = '/tag/' + $(this).text().replace(/ /g, '-');
  }
  window.location.href = location;
});
