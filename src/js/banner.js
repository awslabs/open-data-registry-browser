'use strict';

// Dismiss ADX banner
$(".adx-close-button").click(function () {
  $("#adx-banner").css("display", "none");
  $("#spacer").css("display", "none");
});

$(document).ready(function() {
  $("#spacer").css("height", $("#adx-banner").height());
});

$(window).on('resize', function() {
  $("#spacer").css("height", $("#adx-banner").height());
});