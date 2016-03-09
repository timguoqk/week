'use strict';
var timeUseData;
var width, height, svg;
var types = ['Personal Care', 'Household Activities', 'Caring For & Helping Household (HH) Members', 'Caring For & Helping Nonhousehold (NonHH) Members', 'Work & Work-Related Activities', 'Education', 'Consumer Purchases', 'Professional & Personal Care Services', 'Household Services', 'Government Services & Civic Obligations', 'Eating and Drinking', 'Socializing, Relaxing, and Leisure', 'Sports, Exercise, and Recreation', 'Religious and Spiritual Activities', 'Volunteer Activities', 'Telephone Calls', 'Traveling', 'Data Codes'];
$(document).ready(function() {
  $.getJSON('timeuse.json', function(json, textStatus) {
    timeUseData = json;
    plot();
  });
  $(window).on('resize', resize);
});

function plot() {
  width = $('#d3-container').width();
  height = $('#d3-container').height();
  svg = d3.select('#d3-container').append('svg')
    .attr('width', width)
    .attr('height', height);
  svg.selectAll('rect.time-use')
    .data(timeUseData)
  .enter().append('rect')
    .attr('class', 'time-use');
}

function resize() {
  $('#d3-container').empty();
  $('.changeType .ui.button').removeClass('active');
  draw();
}