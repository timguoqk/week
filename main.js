'use strict';
var timeUseData, timeUseVotedData, data, selectedData, timeUseStats, stats;
var width, height, svg;
var types = ['Personal Care', 'Household Activities', 'Caring For & Helping Household (HH) Members', 'Caring For & Helping NonHH Members', 'Work & Work-Related Activities', 'Education', 'Consumer Purchases', 'Professional & Personal Care Services', 'Household Services', 'Government Services & Civic Obligations', 'Eating And Drinking', 'Socializing, Relaxing, And Leisure', 'Sports, Exercise And Recreation', 'Religious and Spiritual Activities', 'Volunteer Activities', 'Telephone Calls', 'Traveling'];
var dayOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
      timeUseData = clean(timeUseData);
      data = clean(data);

      timeUseStats = calcStats(timeUseData);
      stats = calcStats(data);

      timeUseVotedData = vote(timeUseData);

      plot();

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

      function calcStats(ds) {
        var res = _.range(types.length).map(function() { return 0; });
        for (var i = 0; i < ds.length; i ++)
          res[ds[i].type] += ds[i].stopH - ds[i].startH + (ds[i].stopM - ds[i].startM) / 60;
        // The last entry is the sum
        // res.push(res.reduce(function(x, y) { return x + y; }));
        return res;
      }

      function vote(ds) {
        var res = _.range(7).map(function() {
          return _.range(24).map(function() {
            return _.range(6).map(function() {
              return _.range(types.length).map(_.constant(0));
            });
          });
        });
        for (var i = 0; i < ds.length; i ++) {
          var j = ds[i].startH, k = Math.floor(ds[i].startM / 10);
          while (j < ds[i].stopH || (j == ds[i].stopH && k <= ds[i].stopM / 10)) {
            res[ds[i].week][j][k][ds[i].type] += 1;
            k += 1;
            if (k == 6) {
              k = 0;
              j += 1;
            }
          }
        }
        return res.reduce(function(iprev, icurr, i) {
          var raw = icurr.reduce(function(jprev, jcurr, j) {
            return jprev.concat(jcurr.map(function(kcurr, k) {
              return {
                startH: j,
                startM: 10 * k,
                stopH: j,
                stopM: 10 * k + 10,
                week: i,
                type: kcurr.indexOf(_.max(kcurr))
              };
            }));
          }, []);
          // Merge events of the same type
          var out = [raw[0]];
          for (var j = 1; j < raw.length; j ++) {
            if (raw[j].type == out[out.length - 1].type)
              continue;
            out[out.length - 1].stopH = raw[j - 1].stopH;
            out[out.length - 1].stopM = raw[j - 1].stopM;
            out.push(raw[j]);
          }
          out[out.length - 1].stopH = raw[raw.length - 1].stopH;
          out[out.length - 1].stopM = raw[raw.length - 1].stopM;
          return iprev.concat(out);
        }, []);
      }
    });
  });
  $(window).on('resize', redraw);
});

function plot() {
  selectedData = data;
  width = $('#main-container').width();
  height = $('#main-container').height();
  var svg = d3.select('#main-container').append('svg')
    .attr('width', width)
    .attr('height', height)
  .append('g')
    .attr('transform', 'translate(50, 50)');
  // Category 20c
  var colors = ["#a1d99b", "#969696", "#636363", "#fdae6b", "#9e9ac8", "#fdd0a2", "#74c476", "#fd8d3c", "#c6dbef", "#d9d9d9", "#6baed6", "#bdbdbd", "#bcbddc", "#dadaeb", "#e6550d", "#c7e9c0", "#756bb1"];
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
      return dayOfWeek[d];
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
        'top': $(this).position().top
      });
      $('#tip').toggleClass('active');
    })
    .on('mouseleave', function() {
      $('#tip').toggleClass('active');
      highlight(-1);
    })
    .on('click', function(d) {
      highlight(d.type);
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

  // dow-chart
  var wdSvg, wdX, wdY, wdXAxis, wdYAxis;

  // bar-chart
  var barSvg, barH, barW, barX, barY, barXAxis, barYAxis;
  barSvg = d3.select('#bar-chart').append('svg')
    .append('g').attr('transform', 'translate(30, 30)');
  barW = $('#bar-chart').width() - 30;
  barH = $('#bar-chart').height() - 30;
  barX = d3.scale.ordinal()
    .domain(_.range(types.length))
    .rangeRoundBands([0, barW], .1);
  barY = d3.scale.linear()
    .domain([0, _.max(stats)])
    .range([barH - 30, 0]);
  barXAxis = d3.svg.axis()
    .scale(barX)
    .orient('bottom');
  barYAxis = d3.svg.axis()
    .scale(barY)
    .orient('left');
  barSvg.append('g')
    .attr('class', 'x axis')
    .attr('transform', 'translate(0, ' + (barH - 30) + ')')
    .call(barXAxis);
  barSvg.append('g')
    .attr('class', 'y axis')
    .call(barYAxis);
  barSvg.selectAll('rect.bar')
    .data(stats)
  .enter().append('rect')
    .attr('class', 'bar')
    .attr('x', function(d, i) { return barX(i); })
    .attr('width', barX.rangeBand())
    .attr('y', barY)
    .attr('height', function(d) { return barH - 30 - barY(d); });

  function highlight(i) {
    if (i == -1) {
      selectedData = data;
      personalRects.transition(800).attr('opacity', 1);
    } else {
      selectedData = _.where(data, {type: i});
      personalRects.transition(800)
        .attr('opacity', function(d) {
          return (i == d.type) ? 1 : 0.2;
        });
    }
      
  }
}

function redraw() {
  $('#main-container').empty();
  plot();
}
