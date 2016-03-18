'use strict';
var surveyData, surveyVotedData, personalData, surveyStats, personalStats;
var width, height, svg;
var colorScale;
var types = ['Personal Care', 'Household Activities', 'Caring For & Helping Household (HH) Members', 'Caring For & Helping NonHH Members', 'Work & Work-Related Activities', 'Education', 'Consumer Purchases', 'Professional & Personal Care Services', 'Household Services', 'Government Services & Civic Obligations', 'Eating And Drinking', 'Socializing, Relaxing, And Leisure', 'Sports, Exercise And Recreation', 'Religious and Spiritual Activities', 'Volunteer Activities', 'Telephone Calls', 'Traveling'];
var dayOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

$(document).ready(function() {
  $.getJSON('timeuse.json', function(json, textStatus) {
    surveyData = json;
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
      personalData = rows;
      // Break events that cross midnight
      surveyData = clean(surveyData);
      personalData = clean(personalData);

      surveyStats = calcStats(surveyData);
      personalStats = calcStats(personalData);

      surveyVotedData = vote(surveyData);

      plot('personal', personalData, personalStats);
      plot('survey', surveyVotedData, surveyStats);
      plotLegend();

      function clean(ds) {
        ds = _.reject(ds, function(d) { return d.type >= types.length; });
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

      function calcStats(ds, num) {
        var res = [];
        for (var i = 0; i < types.length; i ++)
          res.push({id: i, val: 0});
        for (var i = 0; i < ds.length; i ++)
          res[ds[i].type].val += ds[i].stopH - ds[i].startH + (ds[i].stopM - ds[i].startM) / 60;
        // Normalize to a week
        var multiplier = 24 * 7 / res.reduce(function(prev, curr) { return prev + curr.val; }, 0);
        res = res.map(function(x) { return {id: x.id, val: x.val * multiplier}; });
        return res;
      }
    });
    init();
  });
  $(window).on('resize', redraw);
});

function plot(tag, data, stats) {
  var selectedData = data;
  width = $('#main-container .' + tag + '.container').width();
  height = $('#main-container .' + tag + '.container').outerHeight();
  var svg = d3.select('#main-container .' + tag + '.container').append('svg')
    .attr('width', width)
    .attr('height', height)
  .append('g')
    .attr('transform', 'translate(35, 35)');
  var xScale = d3.scale.linear()
    .domain([0, 24])
    .range([0, width - 60]);
  var xAxis = d3.svg.axis()
    .scale(xScale)
    .orient('top')
    .tickSize(-(height - 40));
  var yScale = d3.scale.ordinal()
    .domain(d3.range(8))
    .rangePoints([0, height - 40]);
  var yAxis = d3.svg.axis()
    .scale(yScale)
    .orient('left')
    .tickSize(-width + 60)
    .tickFormat(function(d) {
      return dayOfWeek[d];
    });
  var mainRects = svg.selectAll('rect.' + tag)
    .data(data)
  .enter().append('rect')
    .attr('class', tag)
    .attr('x', function(d) {
      return xScale(d.startH + d.startM / 60);
    })
    .attr('y', function(d) {
      return yScale(d.week);
    })
    .attr('width', function(d) {
      return xScale(d.stopH - d.startH + (d.stopM - d.startM) / 60);
    })
    .attr('height', (height - 40) / 7)
    .attr('fill', function(d) {
      return colorScale(d.type);
    })
    .attr('case-id', function(d, i) { return i; })
    .on('mouseenter', function(d, i) {
      var rect = $('.' + tag + ' [case-id=' + i + ']');
      $('#tip').html(types[d.type]);
      $('#tip').css({
        'left': rect.offset().left - $('#tip').outerWidth() / 2 + parseInt(rect.attr('width')) / 2,
        'top': rect.offset().top - $('#tip').outerHeight()
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

  // dow-chart
  var wdSvg, wdX, wdY, wdXAxis, wdYAxis;
  var line = d3.svg.line()
    .interpolate('basis')
    .x(function(d, i) { return wdX(i); })
    .y(function(d) { return wdY(d); });

  // bar-chart
  var barSvg, barH, barW, barX, barY, barXAxis, barYAxis;
  barSvg = d3.select('.' + tag + ' .bar-chart').append('svg')
    .append('g').attr('transform', 'translate(30, 0)');
  barW = $('.' + tag + ' .bar-chart').width() - 30;
  barH = $('.' + tag + ' .bar-chart').height();
  barX = d3.scale.ordinal()
    .domain(_.pluck(stats, 'id'))
    .rangeRoundBands([0, barW], .1);
  barY = d3.scale.linear()
    // .domain([0, _.max(_.pluck(stats, 'val'))])
    .domain([0, 90])
    .range([barH - 20, 0]);
  barXAxis = d3.svg.axis()
    .scale(barX)
    .orient('bottom')
    .tickFormat('');
  barYAxis = d3.svg.axis()
    .scale(barY)
    .ticks(5)
    .orient('left');
  barSvg.append('g')
    .attr('class', 'x axis')
    .attr('transform', 'translate(0, ' + (barH - 20) + ')')
    .call(barXAxis);
  barSvg.append('g')
    .attr('class', 'y axis')
    .call(barYAxis);
  var barRects = barSvg.selectAll('rect.bar')
    .data(stats)
  .enter().append('rect')
    .attr('class', 'bar')
    .attr('category-id', function(d) { return d.id; })
    .attr('x', function(d) { return barX(d.id); })
    .attr('width', barX.rangeBand())
    .attr('y', function(d) { return barY(d.val); })
    .attr('height', function(d) { return barH - 20 - barY(d.val); })
    .attr('fill', function(d) { return colorScale(d.id); })
    .on('click', function(d) { highlight(d.id); })
    .on('mouseover', function(d) {
      var rect = $('.' + tag + ' [category-id=' + d.id + ']');
      $('#tip').html(types[d.id] + ': ' + d.val.toFixed(2) + 'h');
      $('#tip').css({
        'left': rect.offset().left - $('#tip').outerWidth() / 2 + parseInt(rect.attr('width')) / 2,
        'top': rect.offset().top - $('#tip').outerHeight() - 10
      });
      $('#tip').toggleClass('active');
      highlight(d.id);
    })
    .on('mouseleave', function(d) {
      highlight(-1);
      $('#tip').toggleClass('active');
    });
  $('.' + tag + ' .sort-button').on('click', function() {
    if ($(this).hasClass('active'))
      stats = _.sortBy(stats, 'id');
    else
      stats = _.sortBy(stats, function(d) { return -d.val; });
    barX.domain(_.pluck(stats, 'id'));
    barRects.transition()
      .duration(800)
      .attr('x', function(d) { return barX(d.id); });
    $(this).toggleClass('active')
  });

  highlights[tag] = function (idx) {
    if (idx == -1) {
      selectedData = data;
      $('.' + tag + ' .bar-chart rect.bar').removeClass('active');
      mainRects.transition().attr('opacity', 1);
      barRects.transition().attr('opacity', 1);
    } else {
      $('.' + tag + ' .bar-chart rect.bar[category-id=' + idx + ']').addClass('active');
      selectedData = _.where(data, {type: idx});
      mainRects.transition()
        .attr('opacity', function(d) {
          return (idx == d.type) ? 1 : 0.2;
        });
      barRects.transition()
        .attr('opacity', function(d) {
          return (d.id == idx) ? 1 : 0.2;
        });
    }
  }
}

function plotLegend() {
  var legend = d3.legend.color()
    .scale(colorScale)
    .labels(types)
    .shapePadding(10)
    .on('cellover', function(i) {
      highlight(i);
    })
    .on('cellout', function() {
      highlight(-1);
    });
  $('#legend').empty();
  d3.select('#legend')
  .append('svg')
    .attr('width', $('#legend').width())
    .attr('height', $('#legend').height())
  .append('g')
    .attr('transform', 'translate(0, 35)')
    .call(legend);
}

function init() {
  // Category 20c
  var colors = ["#a1d99b", "#969696", "#636363", "#fdae6b", "#9e9ac8", "#fdd0a2", "#74c476", "#fd8d3c", "#c6dbef", "#d9d9d9", "#6baed6", "#bdbdbd", "#bcbddc", "#dadaeb", "#e6550d", "#c7e9c0", "#756bb1"];
  colorScale = d3.scale.ordinal()
    .range(colors)
    .domain(d3.range(types.length));
}

function redraw() {
  // $('.main-container').empty();
  // $('.dow-chart').empty();
  // $('.bar-chart').empty();
  // plot('personal', personalData, personalStats);
  // plot('survey', surveyVotedData, surveyStats);
  // plotLegend();
}

var highlights = {};
function highlight(i) {
  highlights['personal'](i);
  highlights['survey'](i);
  if (i == -1)
    d3.selectAll('.legendCells rect.active').classed('active', false);
  else
    d3.selectAll('.legendCells>g.cell:nth-of-type(' + (i + 1) + ') rect').classed('active', true);
}