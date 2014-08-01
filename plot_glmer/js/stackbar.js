d3.stackbar = function module() {
  // initialize variables that will be exposed
  var height = 600, 
      width = 300,
      barwidth = 0,
      vertical = true,
      show_stack = true,
      show_expand = true,
      show_sort = true,
      show_sort_factors = true,
      show_choose_factors = true,
      expand = false,
      data,
      id,
      v1, 
      color_scale = d3.scale.category20(),
      size_var,
      factors,
      v2,
      padding = {
         "top":    5,
         "right":  30,
         "bottom": 60,
         "left":   70
      }

  function expand_extent(extent, percent, top, bottom) {
    var top = typeof(top) === 'undefined' ? true: top,
    bottom = typeof(bottom) === 'undefined' ? true: bottom,
    percent = typeof(percent) === 'undefined' ? 0.1: percent,
    pad = Math.abs(extent[1] - extent[0]) * percent
    extent = extent
    if(bottom) {
      extent[0] = extent[0] - pad
    }
    if(top) {
      extent[1] = extent[1] + pad
    }
    return extent
  }


  // beginning of function to return under namespace
  function stackbar(_selection) {
    // begin declartions requiring declaration of exposed variables

    _selection.each(function(d) {
      
      // make group based on stackvar,

      v2 = v2 ? v2:_.filter(factors, function(d) { return d != v1})[0]


      var stack_group = 'stacked',
      layers, GroupMax, StackMax, xes;

      function update_layers(){
        layers = d3.nest()
                  .key(function(d) { return d[v2] ;}) // layers/colors
                  .key(function(d) { return d[v1] ;}) // x axis variable
                  .rollup(function(d) {
                    return {
                      v2: d[0][v2],
                      x: d[0][v1],
                      count: d.length,
                      w: d3.sum(_.map(d,function(x) { return x[size_var];}))
                          };})
                  .entries(data.top(Infinity)),

        // getting all possible x values
        xes = _.unique(
                _.flatten(
                  _.map(layers, 
                    function(d) {
                      return _.map(d.values, 
                        function(d) { 
                          return d.key;
                        })
                    })
                  )
                ),
        missing_entries = _.zipObject(
                            _.map(layers, 
                              function(d) { 
                                return d.key;
                              }), 
                            _.map(
                              _.range(layers.length), 
                              function(d) { 
                                return [];
                              })
                            );
        _.map(layers, function(d) {
          _.map(d.values, function(x) { 
            missing_entries[d.key].push(x.key)
          })
          missing_entries[d.key] = _.difference(xes, missing_entries[d.key])
        })
        ///////
        ///////
        // Support for missing values can certainly be improved on.
        _.mapValues(missing_entries, function(v, k) {
          _.map(layers, function(d, i, layers) {
            if(d.key == k){
              _.map(v, function(val) {
                d.values.push({key:val, values:{x:+val, v2:k, count:0, w:0}})
              })
            }
          })
        })
        _.forEach(layers, 
          function(d, i) { 
            d.values = _.map(d.values, 
                             function(x) { 
                              return x.values;
                            }) 
          })
        _.forEach(layers, 
          function(d, i) {
            d.values = _.sortBy(d.values, 
                                function(x) { 
                                  return x.x;
                                })
        })

        var stack = d3.layout.stack()
                  .x(function(d) { return d.x; })
                  .y(function(d) { return d.count; })
                  .values(function(d) { return d.values; })
        stack = expand ? stack.offset('expand'): stack
        layers = stack(layers)
        GroupMax = d3.max(layers, function(layer) {
          return d3.max(layer.values, function(l) { return l.y});
        })
        StackMax = d3.max(layers, function(layer) {
          return d3.max(layer.values, function(l) { return l.y + l.y0; });
        })
      } // end update layers

      update_layers()
      if(vertical) {
        if(barwidth * layers[0].values.length > width){
          var size = {
            "category": barwidth * layers[0].values.length,
            "count": height - padding.top  - padding.bottom
          }
          width = barwidth * layers[0].values.length + padding.left + padding.right
        } else {
          var size = {
            "category": width - padding.left - padding.right,
            "count": height - padding.top  - padding.bottom
          }
        }
      } else {
        if(barwidth * layers[0].values.length > height){
          var size = {
            "category": height - padding.top  - padding.bottom,
            "count": barwidth * layers[0].values.length
          }
          height = barwidth * layers[0].values.length + 
          padding.top + padding.bottom;
        } else {
          var size = {
            "category": height - padding.top  - padding.bottom,
            "count": width - padding.left - padding.right
          }
        }
      }

      // scales
      var scales = {};
      scales.category = d3.scale.ordinal()
              .domain(_.sortBy(_.map(xes,
                      function(x) { return !_.isNaN(+x) ? +x : x;})))
              .rangeRoundBands([0, size.category], .08)

      scales.count = d3.scale.linear()
          .domain(expand_extent([0, StackMax], 0.1, true, false))
          .range([size.count, 0])

      if(!vertical) {
        scales.count.domain().reverse()
      }

      var catAxis = d3.svg.axis()
          .scale(scales.category)
          .tickSize(-size.count)
          .tickPadding(6)
          .orient(vertical ? "bottom": "left");

      var countAxis = d3.svg.axis()
          .scale(scales.count)
          .tickSize(-size.category)
          .tickFormat(d3.format(",.2s"))
          .tickPadding(6)
          .orient(vertical ? "left": "bottom");

      if(_selection.select('.frame').empty()){

        var div = _selection.append('div')
                        .attr('class', 'stackbar-div')

        var buttons = div.append('div')
                  .attr('class', 'btn-group-vertical')
                  .append('div')
                  .attr('id', 'buttons'),
        choose_factor = buttons.append('div')
                        .append('select')
                        .attr('id', 'factor_' + id)
                        .attr('class', 'btn')
        choose_factor.selectAll('option')
          .data(factors)
          .enter().append('option')
          .text(_.identity)
          .attr('value', _.identity)
          .attr('selected', function(d) {
            return d == v2 ? "selected": null;
          })
        choose_factor.on('change', function(){
          v2 = this.value
          make_sort_choices();
          draw_chart();
        })
        var choose_sort = buttons.append('div')
                        .append('select')
                        .attr('id', 'choose_sort_' + id)
                        .attr('class', 'btn')

        var make_sort_choices = function() {
          var tmp = $("#choose_sort_" + id).value
          choose_sort.selectAll('option').remove()
          choose_sort.selectAll('option')
                .data([v1, v2])
                .enter().append('option')
                .attr('selected', function(d, i) {
                  return d == tmp ? "selected":null;})
                .attr('value', _.identity)
                .text(_.identity)
        }
        make_sort_choices();

        var sort_button = buttons.append('div')
                        .append('select')
                        .attr('id', 'sort_button_' + id)
                        .attr('class', 'btn')

        sort_button.call(make_sort_button, v1)

        var stack_button = buttons.append('div')
                          .append('select')
                          .attr('id', 'stack_group_' + id)
                        .attr('class', 'btn')

        stack_button.selectAll('option')
            .data(['stacked', 'grouped'])
            .enter().append('option')
            .text(_.identity)
            .attr('selected', function(d,i) { if(i==0) return "selected"})
            .attr('value', _.identity)

        stack_button.on('change', function() {
          stack_group = this.value;
          update_scales();
          draw_chart();
        })

        var expand_button = buttons.append('div')
                          .append('select')
                          .attr('id', 'expand_' + id)
                          .attr('class', 'btn')

        expand_button.selectAll('option')
            .data(['levels', 'expand'])
            .enter().append('option')
            .text(_.identity)
            .attr('selected', function(d,i) { if(i==0) return "selected"})
            .attr('value', _.identity)

        expand_button.on('change', function() {
          expand = this.value == 'expand' ? true: false;
          update_layers()
          update_scales()
          draw_chart()
        })

        var svg = div.append('div')
            .attr('id', id)
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .attr('class', 'frame')

        svg = svg.append("g")
            .attr("transform", "translate(" + padding.left + "," + padding.top + ")")

        svg.append('rect')
            .attr('class', 'background')
            .attr('pointer-events', 'all')
            .attr('fill', 'none')
            .attr('height', (height - padding.top - padding.bottom) + 'px')
            .attr('width', (width - padding.left - padding.right) + 'px')

        svg.append("g")
            .attr("class", "cat axis")
            .attr("transform", function() {
              return vertical ? "translate(0," + size.count + ")":
              "translate(0, 0)"; 
            })

        svg.append("g")
            .attr("class", "count axis")
            .attr('transform', function() {
              return vertical ? 'translate(0, 0)':
            "translate(0," + size.category + ")";
            })

        var vb = svg.append('svg')
            .attr('id', 'vb')
            .attr('class', 'vb')
            .attr('top', 0)
            .attr('left', 0)
            .attr('width', vertical ? size.category:size.count + 'px')
            .attr('height', vertical ? size.count:size.category + 'px')
            .attr('viewBox', function() {
              return vertical ? "0 0 " + size.category + " " + size.count:
              "0 0 " + size.count + " " + size.category;
            })

        var tooltip = div.select('#' + id).append('text')
            .attr('class', 'tooltip')
            .attr('id', 'stack_tooltip_' + id)
            .style('opacity', 0)

      } else {
        var svg = div.select('.frame g'),
        buttons = div.select('#buttons'),
        sort_button = div.select('#sort_button_' + id),
        tooltip = div.select("#stack_tooltip_" + id),
        vb = div.select('#vb')
      }
      div.select("#choose_sort_" + id)
          .on('change', function() {
            div.select("#sort_button_" + id)
                .call(make_sort_button, this.value)
      })

      function tooltip_content(d) {
        return "<p><strong>" + v1 + "</strong>: " + 
        d.x + "<br>" + v2 + ": " + d.v2 + 
        '<br>count: ' + d.count
      }

      function make_sort_button(sel, variable){

        var button_data = variable == v1 ? ['ordered', 'ascending', 'descending']:_.map(layers, function(d) { return d.key;})

        var b = sel.selectAll('option')
                  .data(button_data)

        b.attr('selected', function(d,i) { return i == 0 ? "selected": null;})
          .attr('value', function(d) { return d; })
          .text(function(d) { return d;})

        b.enter().append('option')
          .attr('selected', function(d,i) { return i == 0 ? "selected": null;})
          .attr('value', function(d) { return d; })
          .text(function(d) { return d;})
        b.exit().remove()

        sort_button
          .on('change', function() {
            sort_layers(this.value);
          })
      }

      var original_domain = _.clone(scales.category.domain());
      function sort_layers(variable) {
        if($("#choose_sort_" + id)[0].value == v1){
          // object that has all x variables and their sums
          var agg = _.zipObject(xes, _.map(xes, function(x) {
                  return d3.sum(_.flatten(_.map(layers, function(l) {
                    return _.map(l.values, function(v) {
                      return v.x == x ? v.count: 0;
                    })
                  })))
                }))

          switch(variable)
          {
          case  'ordered':
            scales.category.domain(_.sortBy(scales.category.domain()))
            break
          case "ascending":
            scales.category.domain(_.sortBy(
                                   scales.category.domain(), function(d) { return agg[d]}))
            break
          case "descending":
            scales.category.domain(_.sortBy(
                                   scales.category.domain(), function(d) { return -agg[d]}))
            break
          }
        } else {
          var layer_to_sort = _.map(_.filter(layers, function(layer){
            return layer.key == $("#sort_button_" + id)[0].value
          })[0].values, function(x) {
            return x.count;
          });
          var sorted = _.zip(original_domain, layer_to_sort)
          sorted = _.sortBy(sorted, function(d) {
            return -d[1];
          })
          sorted = _.map(sorted, function(d) {
            return d[0]
          })
          console.log(sorted)
          scales.category.domain(sorted);
        }
        draw_chart('resort');
      }
      console.log(_.clone(layers))

      var refitting = false;
      function transition_duration() {return refitting ? 0: 1000};

      function draw_chart(resort) {

        if(typeof resort === 'undefined'){
          update_layers()
        }
        layer = vb.selectAll(".layer")
            .data(layers)
          
        layer
          .transition().duration(transition_duration())

        layer.enter().append("g")
          .attr("class", "layer")

        layer.exit()
          .transition().duration(transition_duration())
          .style('opacity', 0)
          .remove()

        rect = layer.selectAll("rect")
            .data(function(d) { return d.values; })

        var category = vertical ? 'x': 'y',
        count = vertical ? 'y': 'x',
        rect_width = vertical ? "width": "height",
        rect_height = vertical ? "height" : "width";

        switch(stack_group){
          case "stacked":
            rect.transition().duration(transition_duration())
              .attr(category, function(d) { return scales.category(d.x); })
                .attr(count, function(d) { return vertical ? scales.count(d.y + d.y0):size.count - scales.count(d.y0)})
              .attr(rect_height, function(d) { 
                return scales.count(d.y0)-scales.count(d.y0 + d.y); })
              .attr(rect_width, scales.category.rangeBand())
          break;
          case "grouped":
            rect.transition().duration(transition_duration())
                .delay(function(d, i) { 
                  return transition_duration() ? i * 10: 0; })
                .attr(category, function(d, i, j) { 
                  return scales.category(d.x) + 
                  scales.category.rangeBand() / layers.length  * j; })
                .attr(rect_width, scales.category.rangeBand() / layers.length)
              .transition().duration(transition_duration())
                .attr(count, function(d) { return vertical ? scales.count(d.y0):0})
                .attr(rect_height, function(d) { 
                  return scales.count(0) - scales.count(d.y); });
        }

        rect.enter().append("rect")
            .attr(category, function(d) { return scales.category(d.x); })
            .attr(count, vertical ? scales.count(0):0)
            .attr(rect_width, scales.category.rangeBand())
            .attr(rect_height, 0)
            .style('opacity', 0.6)
            .style('fill', function(d) { return color_scale(d.v2);})
          .transition().duration(transition_duration())
            .delay(function(d, i) { return i * 10; })
            .attr(count, function(d) { return vertical ? scales.count(d.y + d.y0):size.count - scales.count(d.y0)})
            .attr(rect_height, function(d) { 
              return scales.count(d.y0) - scales.count(d.y0 + d.y); });

        rect.on('mouseover', function(d) {
          d3.select(this).style('opacity', 0.8)
            tooltip.transition()
              .duration(200)
              .style('opacity', 0.9)
            tooltip.html(function() { return tooltip_content(d)})
                .style('left', (d3.mouse(this)[0] + 150) + 'px')
                .style('top', (d3.mouse(this)[1] + -60) + 'px')
             })
          .on('mousemove', function() {
            tooltip
                .style('left', (d3.mouse(this)[0] + 150) + 'px')
                .style('top', (d3.mouse(this)[1] + -60) + 'px')
              })
          .on('mouseout', function() {
            d3.select(this).style('opacity', 0.6);
            tooltip.transition().duration(200).style('opacity', 0)
            })

        rect.exit()
          .transition().duration(transition_duration())
          .attr(count, size.count)
          .attr(rect_height, 0);

        svg.select(".background")
          .call(zoom);

        div.select('.cat.axis')
          .transition().duration(transition_duration())
          .call(catAxis)
          .selectAll("text")  
          .style("text-anchor", "end")
          .attr("dx", "-.8em")
          .attr("dy", ".1em")
          .attr("transform", "rotate(-35)");
        div.select('.count.axis')
          .transition().duration(transition_duration())
          .call(countAxis)
      }

      var zoom = d3.behavior.zoom()
                  .on("zoom", zoomed)
      function zoomed() {
        ymax = stack_group == 'stacked' ? StackMax:GroupMax;
        scales.count.domain(expand_extent([0, ymax*1/d3.event.scale], 0.1, true, false))
        if(!vertical) {
          scales.count.domain().reverse();
        }
        refitting = true;
        draw_chart();
        refitting = false;
      }

      draw_chart();

      function update_scales(){

        var stack_group = $('#stack_group_' + id)[0].value;

        ymax = stack_group == 'stacked' ? StackMax:GroupMax;
        if(expand){
          scales.count = d3.scale.linear()
              .domain([0, 1])
              .range([size.count, 0]);
        } else {
          scales.count = d3.scale.linear()
              .domain(expand_extent([0, ymax], 0.1, true, false))
              .range([size.count, 0]);
        }
        if(!vertical){
          scales.count.range().reverse()
        }
        countAxis.scale(scales.count)
        catAxis.scale(scales.category)

      }

    });
  };
  // getters and setters here.
  stackbar.id = function(_x) {
    if(!arguments.length) return id;
    id = _x;
    return stackbar;
  }
  stackbar.height = function(_x) {
    if(!arguments.length) return height;
    height = _x;
    return stackbar;
  }
  stackbar.width = function(_x) {
    if(!arguments.length) return width;
    width = _x;
    return stackbar;
  }
  stackbar.barwidth = function(_x) {
    if(!arguments.length) return barwidth;
    barwidth = _x;
    return stackbar;
  }
  stackbar.color_scale = function(_x) {
    if(!arguments.length) return color_scale;
    color_scale = _x;
    return stackbar;
  }
  stackbar.v1 = function(_x) {
    if(!arguments.length) return v1;
    v1 = _x;
    return stackbar;
  }
  stackbar.v2 = function(_x) {
    if(!arguments.length) return v2;
    v2 = _x;
    return stackbar;
  }
  stackbar.color_var = function(_x) {
    if(!arguments.length) return color_var;
    color_var = _x;
    return stackbar;
  }
  stackbar.padding = function(_x) {
    if(!arguments.length) return padding;
    padding = _x;
    return stackbar;
  }
  stackbar.size_var = function(_x) {
    if(!arguments.length) return size_var;
    size_var = _x;
    return stackbar;
  }
  stackbar.factors = function(_x) {
    if(!arguments.length) return factors;
    factors = _x;
    return stackbar;
  }
  stackbar.data = function(_x) {
    if(!arguments.length) return data;
    data = _x;
    return stackbar;
  }
  stackbar.vertical = function(_x) {
    if(!arguments.length) return vertical;
    vertical = _x;
    return stackbar;
  }
  stackbar.show_stack = function(_x) {
    if(!arguments.length) return show_stack;
    show_stack = _x;
    return stackbar;
  }
  stackbar.show_expand = function(_x) {
    if(!arguments.length) return show_expand;
    show_expand = _x;
    return stackbar;
  }
  stackbar.show_sort = function(_x) {
    if(!arguments.length) return show_sort;
    show_sort = _x;
    return stackbar;
  }
  stackbar.show_sort_factors = function(_x) {
    if(!arguments.length) return show_sort_factors;
    show_sort_factors = _x;
    return stackbar;
  }
  stackbar.show_choose_factors = function(_x) {
    if(!arguments.length) return show_choose_factors;
    show_choose_factors = _x;
    return stackbar;
  }
  d3.rebind(stackbar);
  return stackbar;
};