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

$(".adx-banner-button").click(function () {
  window.open('https://aws.amazon.com/marketplace/search/results?FULFILLMENT_OPTION_TYPE=DATA_EXCHANGE&CONTRACT_TYPE=OPEN_DATA_LICENSES&filters=FULFILLMENT_OPTION_TYPE%2CCONTRACT_TYPE&trk=8384929b-0eb1-4af3-8996-07aa409646bc&sc_channel=el', '_blank');
});