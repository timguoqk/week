'use strict';
var timeUseData, data;
var width, height, svg;
var types = ['Personal Care', 'Household Activities', 'Caring For & Helping Household (HH) Members', 'Caring For & Helping NonHH Members', 'Work & Work-Related Activities', 'Education', 'Consumer Purchases', 'Professional & Personal Care Services', 'Household Services', 'Government Services & Civic Obligations', 'Eating And Drinking', 'Socializing, Relaxing, And Leisure', 'Sports, Exercise And Recreation', 'Religious and Spiritual Activities', 'Volunteer Activities', 'Telephone Calls', 'Traveling'];

$(document).ready(function() {
  $.getJSON('timeuse.json', function(json, textStatus) {
    timeUseData = json;
    d3.csv('timesheet.csv', function(d) {
      return {
        startH: moment(d['Start time'], 'hh:mm A').hours(),
        startM: moment(d['Start time'], 'hh:mm A').minutes(),
        stopH: moment(d['End time'], 'hh:mm A').hours(),
        stopM: moment(d['End time'], 'hh:mm A').minutes(),
        week: moment(d['Date'], 'M/D/YY').weekday(),
        type: types.indexOf(d['Project'])
      };
    }, function(err, rows) {
      data = rows;
      // Break events that cross midnight
      function clean(ds) {
        for (var i = 1; i < ds.length; i ++) {
          if (ds[i].stopH < ds[i].startH) {
            ds.push({
              startH: 0,
              startM: 0,
              stopH: ds[i].stopH,
              stopM: ds[i].stopM,
              week: (ds[i].week + 1) % 7,
              type: ds[i].type
            });
            ds[i].stopH = 23;
            ds[i].stopM = 59;
          }
        }
        return ds;
      }
      timeUseData = clean(timeUseData);
      data = clean(data);

      plot();
    });
  });
  $(window).on('resize', redraw);
});

function plot() {
  width = $('#main-container').width();
  height = $('#main-container').height();
  var svg = d3.select('#main-container').append('svg')
    .attr('width', width)
    .attr('height', height)
  .append('g')
    .attr('transform', 'translate(50, 50)');
  // Category 20c
  var colors = ["#a1d99b", "#969696", "#636363", "#fdae6b", "#9e9ac8", "#fdd0a2", "#74c476", "#fd8d3c", "#c6dbef", "#d9d9d9", "#6baed6", "#bdbdbd", "#bcbddc", "#756bb1", "#e6550d", "#c7e9c0", "#dadaeb", "#3182bd", "#9ecae1", "#31a354"];
  var colorScale = d3.scale.ordinal()
    .range(colors)
    .domain(d3.range(types.length));
  var xScale = d3.scale.linear()
    .domain([0, 24])
    .range([0, (width - 150) / 2]);
  var xAxis = d3.svg.axis()
    .scale(xScale)
    .orient('top')
    .tickSize(-(height - 100));
  var yScale = d3.scale.ordinal()
    .domain(d3.range(8))
    .rangePoints([0, height - 100]);
  var yAxis = d3.svg.axis()
    .scale(yScale)
    .orient('left')
    .tickSize(-(width - 150) / 2)
    .tickFormat(function(d) {
      return moment().weekday(d).toString().substring(0, 3);
    });
  var personalRects = svg.selectAll('rect.personal')
    .data(data)
  .enter().append('rect')
    .attr('class', 'personal')
    .attr('x', function(d) {
      return xScale(d.startH + d.startM / 60);
    })
    .attr('y', function(d) {
      return yScale(d.week);
    })
    .attr('width', function(d) {
      return xScale(d.stopH - d.startH + (d.stopM - d.startM) / 60);
    })
    .attr('height', (height - 100) / 7)
    .attr('fill', function(d) {
      return colorScale(d.type);
    })
    .attr('case-id', function(d, i) { return i; })
    .on('mouseenter', function(d) {
      $('#tip').html(types[d.type]);
      $('#tip').css({
        'left': $(this).position().left,
        'top': $(this).position().top + $(this).attr('height') / 3
      });
      $('#tip').toggleClass('active');
    })
    .on('mouseleave', function() {
      $('#tip').toggleClass('active');
    });

  svg.append('g')
    .attr('class', 'axis xAxis')
    .call(xAxis);
  svg.append('g')
    .attr('class', 'axis yAxis')
    .call(yAxis);

  // Legend
  var legend = d3.legend.color()
    .scale(colorScale)
    .labels(types)
    .on('cellover', function(i) {
      highlight(i);
    })
    .on('cellout', function() {
      highlight(-1);
    });
  svg.append('g')
    .attr('class', 'legend')
    .attr('transform', 'translate(' + (xScale.range()[1] + 20).toString() + ', 50)')
    .call(legend);

  function highlight(i) {
    personalRects.transition(800)
      .attr('opacity', function(d) {
        return (i == -1 || i == d.type) ? 1 : 0.2;
      });
  }
}

function redraw() {
  $('#main-container').empty();
  plot();
}
