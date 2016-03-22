'use strict';
var surveyData, surveyVotedData, personalData, selectedData, surveyStats, personalStats, mixedStats;
var width, height, svg, texturesSvg;
var colorScale;
var barGroups, barRects;
var wdSvg, wdX, wdY, wdXAxis, wdYAxis, wdLine;
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
        type: types.indexOf(d['Project']),
        tag: 'personal'
      };
    }, function(err, rows) {
      personalData = rows;
      // Break events that cross midnight
      surveyData = clean(surveyData, 'survey');
      personalData = clean(personalData, 'personal');

      surveyStats = calcStats(surveyData);
      personalStats = calcStats(personalData);
      mixedStats = mixStats();

      surveyVotedData = vote(surveyData);

      plot();

      function clean(ds, tag) {
        ds = _.reject(ds, function(d) { return d.type >= types.length; });
        for (var i = 1; i < ds.length; i ++) {
          if (ds[i].stopH < ds[i].startH) {
            ds.push({
              startH: 0,
              startM: 0,
              stopH: ds[i].stopH,
              stopM: ds[i].stopM,
              week: (ds[i].week + 1) % 7,
              type: ds[i].type,
              tag: tag
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
                type: kcurr.indexOf(_.max(kcurr)),
                tag: 'survey'
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
        res = res.map(function(x) {
          return {
            id: x.id,
            val: x.val * multiplier,
            tag: ds[0].tag
          };
        });
        return res;
      }

      function mixStats() {
        var res = [];
        for (var i = 0; i < types.length; i ++)
          res.push([personalStats[i], surveyStats[i]]);
        return res;
      }
    });
    init();
  });
  $(window).on('resize', redraw);
  $('header>.button').on('click', function() {
    $('.ui.modal#about').modal('show');
  })
});

function plot() {
  selectedData = personalData;
  plotMain(personalData);
  plotMain(surveyVotedData);
  plotLegend();
  plotBar();
  plotDow();
}

function plotMain(data) {
  var tag = data[0].tag;
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

  highlights[tag] = function (idx) {
    if (idx == -1) {
      $('.bar-chart rect.bar').removeClass('active');
      mainRects.transition().attr('opacity', 1);
      barRects.transition().attr('opacity', 1);
    } else {
      $('.bar-chart rect.bar[category-id=' + idx + ']').addClass('active');
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

  var svgBox = $('#legend>svg').get(0).getBBox();
  var dh = Math.round(($('#legend').height() - svgBox.height) / 2);
  var dw = Math.round(($('#legend').width() - svgBox.width) / 2);
  $('#legend').css('padding-top', `${dh}px`)
    .css('padding-bottom', `${dh}px`)
    .css('padding-left', `${dw}px`)
    .css('padding-right', `${dw}px`);
}

function init() {
  // Category 20c
  var colors = ["#a1d99b", "#969696", "#636363", "#fdae6b", "#9e9ac8", "#fdd0a2", "#74c476", "#fd8d3c", "#c6dbef", "#d9d9d9", "#6baed6", "#bdbdbd", "#bcbddc", "#dadaeb", "#e6550d", "#c7e9c0", "#756bb1"];
  colorScale = d3.scale.ordinal()
    .range(colors)
    .domain(d3.range(types.length));
  texturesSvg = d3.select('#textures').append('svg');
}

function plotBar() {
  var barSvg, barH, barW, barX, barX1, barY, barXAxis, barYAxis;
  barSvg = d3.select('.bar-chart').append('svg')
    .append('g').attr('transform', 'translate(30, 0)');
  barW = $('.bar-chart').width() - 30;
  barH = $('.bar-chart').height();
  barX = d3.scale.ordinal()
    .domain(_.range(types.length))
    .rangeRoundBands([0, barW], .1);
  barX1 = d3.scale.ordinal()
    .domain(['personal', 'survey'])
    .rangeRoundBands([0, barX.rangeBand()]);
  barY = d3.scale.linear()
    .domain([0, 90])
    .range([barH - 20, 15]);
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

  barGroups = barSvg.selectAll('.category')
    .data(mixedStats)
  .enter().append('g')
    .attr('class', 'category')
    .attr('transform', function(d, i) { return "translate(" + barX(i) + ",0)"; });
  barRects = barGroups.selectAll("rect")
    .data(function(d) { return d;})
  .enter().append('rect')
    .attr('class', 'bar')
    .attr('category-id', function(d) { return d.id; })
    .attr('tag', function(d) { return d.tag; })
    .attr('x', function(d) { return barX1(d.tag); })
    .attr('width', barX1.rangeBand())
    .attr('y', function(d) {return barY(d.val); })
    .attr('height', function(d) { return barH - 20 - barY(d.val); })
    .attr('fill', function(d) {
      if (d.tag == 'survey') {
        var t = textures.lines()
          .thicker()
          .orientation('3/8', '7/8')
          .stroke(colorScale(d.id));
        texturesSvg.call(t);
        return t.url();
      }
      return colorScale(d.id);
    })
    .on('click', function(d) { highlight(d.id); })
    .on('mouseover', function(d) {
      highlight(d.id);
      var rect = $('[category-id=' + d.id + '][tag=' + d.tag + ']');
      $('#tip').html(types[d.id] + ': ' + d.val.toFixed(2) + 'h');
      $('#tip').css({
        'left': rect.offset().left - $('#tip').outerWidth() / 2 + parseInt(rect.attr('width')) / 2,
        'top': rect.offset().top - $('#tip').outerHeight() - 10
      });
      $('#tip').toggleClass('active');
    })
    .on('mouseleave', function(d) {
      highlight(-1);
      $('#tip').toggleClass('active');
    });
  $('.sort-button').on('click', function() {
    var indices;
    if ($(this).hasClass('active'))
      indices = _.pluck(_.sortBy(personalStats, 'id'), 'id');
    else
      indices = _.pluck(_.sortBy(personalStats, function(d) { return -d.val; }), 'id');
    barX.domain(indices);
    barGroups.transition()
      .duration(800)
      .attr('transform', function(d, i) { return 'translate(' + barX(i) + ',0)'; });
    $(this).toggleClass('active')
  });
}

function plotDow() {
  // dow-chart
  var wdW, wdH;
  wdSvg = d3.select('.dow-chart').append('svg')
    .append('g').attr('transform', 'translate(30, 0)');
  wdW = $('.dow-chart').width() - 30;
  wdH = $('.dow-chart').height();
  wdX = d3.scale.ordinal()
    .domain(_.range(7))
    .rangePoints([0, wdW - 20]);
  wdY = d3.scale.linear()
    .domain([0, 1.2 * 24])
    .range([wdH - 20, 15]);
  wdLine = d3.svg.line()
    .interpolate('monotone')
    .x(function(d) { return wdX(d.x); })
    .y(function(d) { return wdY(d.y); });
  wdXAxis = d3.svg.axis()
    .scale(wdX)
    .orient('bottom')
    .tickFormat(function(d) {
      return dayOfWeek[d];
    });
  wdYAxis = d3.svg.axis()
    .scale(wdY)
    .ticks(5)
    .orient('left');
  wdSvg.append('g')
    .attr('class', 'x axis')
    .attr('transform', 'translate(0, ' + (wdH - 20) + ')')
    .call(wdXAxis);
  wdSvg.append('g')
    .attr('class', 'y axis')
    .call(wdYAxis);

  wdSvg.append('path')
    .attr('class', 'dow line')
    .attr('d', wdLine(_.range(7).map(function(i) {
      return {x: i, y: 24};
    })))
    .attr('stroke', 'black');
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
  if (i == -1) {
    selectedData = personalData;
    d3.selectAll('.legendCells rect.active').classed('active', false);
  } else {
    selectedData = _.where(personalData, {type: i});
    d3.selectAll('.legendCells>g.cell:nth-of-type(' + (i + 1) + ') rect').classed('active', true);
  }
  selectedData = _.range(7).map(function(i) {
    return {
      x: i,
      y: _.where(selectedData, {week: i}).reduce(function(p, c) {
        return p + (c.stopH + c.stopM / 60 - c.startH - c.startM / 60);
      }, 0)
    };
  });
  wdY.domain([0, 1.2 * _.max(_.pluck(selectedData, 'y'))]);
  wdSvg.select('.dow.line')
    .transition()
    .duration(800)
    .attr('d', wdLine(selectedData))
    .attr('stroke', i == -1 ? 'black' : colorScale(i));
  wdSvg.select('.y.axis')
    .transition()
    .duration(800)
    .call(wdYAxis);
}