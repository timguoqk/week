'use strict';
var timeUseData, data;
var width, height, svg;
var types = ['Personal Care', 'Household Activities', 'Caring For & Helping Household (HH) Members', 'Caring For & Helping NonHH Members', 'Work & Work-Related Activities', 'Education', 'Consumer Purchases', 'Professional & Personal Care Services', 'Household Services', 'Government Services & Civic Obligations', 'Eating And Drinking', 'Socializing, Relaxing, And Leisure', 'Sports, Exercise And Recreation', 'Religious and Spiritual Activities', 'Volunteer Activities', 'Telephone Calls', 'Traveling', 'Data Codes'];

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
        for (var i = 0; i < ds.length; i ++) {
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
  console.log(height);
  var svg = d3.select('#main-container').append('svg')
    .attr('width', width)
    .attr('height', height)
  .append('g')
    .attr('transform', 'translate(50, 50)');
  var colorScale = d3.scale.category20c().domain(d3.range(types.length));
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
  svg.selectAll('rect.time-use')
    .data(data)
  .enter().append('rect')
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
    .attr('class', 'time-use')
    .on('mouseenter', function(d) {
      $('#tip').html(types[d.type]);
      $('#tip').css({'left': event.pageX, 'top': event.pageY});
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
}

function redraw() {
  $('#main-container').empty();
  plot();
}
