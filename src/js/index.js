'use strict';

// Get datasets object
var datasets = {{toJSON datasets}};

// Function to set matching count number
var setMatchingCount = function (count) {
  $("#count-matching").text(count);
  if (count > 1) {
    $("#count-matching-text").text("datasets");
  } else {
    $("#count-matching-text").text("dataset");
  }
}

// Set initial matching datasets count
setMatchingCount(datasets.length);

// Listen for changes in search box and filter based
// on input
$("#search-box").on('input', function () {
  var searchText = $(this).val();
  // Loop over each item and hide non-matching
  let countMatching = 0;
  $(".dataset").each(function() {
    if (isMatch($(this).attr('id'), searchText)) {
      countMatching++;
      $(this).show();
    } else {
      $(this).hide();
    }
  });

  // Set matching datasets count
  setMatchingCount(countMatching);
});

// Make sure we're not trying to submit anything if you press
// enter in the text box
$("#search-box").on("keydown", function (e) {
  if (e.key === "Enter") {
    e.preventDefault();
    return;
  }
});

// Helper function to see if dataset has some match
var isMatch = function(slug, text) {
  // Lowercase search text
  text = text.toLowerCase();
  // Find matching dataset
  var dataset;
  for (var i = 0; i < datasets.length; i++) {
    if (datasets[i].Slug === slug) {
      dataset = datasets[i];
      break;
    }
  }

  // Check dataset name
  if (dataset.Name.toLowerCase().indexOf(text) !== -1) {
    return true;
  }

  // Check dataset tags
  for (var i = 0; i < dataset.Tags.length; i++) {
    if (dataset.Tags[i].toLowerCase().indexOf(text) !== -1) {
      return true;
    }
  }

  // Check dataset description
  if (dataset.Description.toLowerCase().indexOf(text) !== -1) {
    return true;
  }

  // Check resources Type
  var hasMatch = false;
  for (var i = 0; i < dataset.Resources.length; i++) {
    if (!dataset.Resources[i].Type) { continue; }
    if (dataset.Resources[i].Type.toLowerCase().indexOf(text) !== -1) {
      hasMatch = true;
      break;
    }
  }
  if (hasMatch) { return true; }

  // Check resources ARN
  hasMatch = false;
  for (var i = 0; i < dataset.Resources.length; i++) {
    if (!dataset.Resources[i].ARN) { continue; }
    if (dataset.Resources[i].ARN.toLowerCase().indexOf(text) !== -1) {
      hasMatch = true;
      break;
    }
  }
  if (hasMatch) { return true; }

  // If we're here, no match
  return false;
};

var triggerInput = function (text) {
  $("#search-box").focus();
  $("#search-box").val(text);
  $('#search-box').trigger('input');
}

// Listen for clicks on the tags and fill in search box if clicked
$('.tag').click(function () {
  triggerInput($(this).text());
});

// Handle query passed in url via ?search=foo
var search = /search=(.*)/.exec(window.location.search);
if (search) {
  triggerInput(decodeURIComponent(search[1]));
}

// Load page with search box in focus
$("#search-box").focus();