'use strict';

// Listen for clicks on the tags and send to appropriate page if clicked.
// Handle the special case when the Requester Pays tag is clicked from Resources.
$('.tag').click(function () {
  let location = '/tag/' + $(this).text().replace(/ /g, '-');
  if ($(this).text() === 'Requester Pays') {
    location = 'https://docs.aws.amazon.com/AmazonS3/latest/dev/RequesterPaysBuckets.html';
  }
  window.location.href = location;
});
