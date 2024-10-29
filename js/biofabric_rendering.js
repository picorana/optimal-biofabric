function render_biofabric(graph, ordernodes, orderedges, result, nodetitle, edgetitle, print_title = true, stroke_width = 3, rect_size = 5){
  
    let svgwidth = 500;
    let svgheight = 500;
    let padding = {left: 30, right: 20, top: (print_title? 40 : 20), bottom: 50}
    let color_by_staircase = true;
    let show_node_indices = true;
    let show_edge_indices = true;
    
    const svg = d3.create('svg')
        .attr("viewBox", [0, 0, svgwidth, svgheight])
  
    let numnodes = graph.nodes.length;
    let numedges = graph.links.length;
  
    if (print_title) svg.append("text")
      .attr("x", svgwidth/2)
      .attr("y", 20)
      .attr("text-anchor", "middle")
      .style("font-family", "Arial")
      .style("font-weight", "bold")
      .style("fill", "gray")
      .text(nodetitle + " + " + edgetitle)
  
    let node_h_dict = {}
  
    for (let i in ordernodes){
      let line_h = padding.top + (svgheight - padding.top - padding.bottom)/numnodes * i
  
      node_h_dict[ordernodes[i]] = line_h;
      
      svg.append("line")
        .attr("stroke", "#eee")
        .attr("stroke-width", 3)
        .style("stroke-linecap", "round")
        .attr("x1", padding.left)
        .attr("x2", svgwidth - padding.left)
        .attr("y1", line_h)
        .attr("y2", line_h)
  
      if (show_node_indices) svg.append("text")
        .attr("x", padding.left - 10)
        .attr("y", line_h + .2 * (svgheight - padding.top - padding.bottom)/(numnodes))
        .style("font-size", "small")
        .style("fill", "lightgray")
        .style("font-family", "Arial")
        .style("text-anchor", "end")
        .text(ordernodes[i])
    }
  
    for (let i in orderedges){
      let line_x = padding.left + (svgwidth - padding.left - padding.right)/numedges * i
      
      let edge = graph.links.find(e => e.id == orderedges[i])
      let topnode_h = node_h_dict[edge.source]
      let bottomnode_h = node_h_dict[edge.target]
  
      let highestnode = Math.max(topnode_h, bottomnode_h)
      let lowestnode = Math.min(topnode_h, bottomnode_h)
  
      svg.append("line")
        .attr("stroke", () => {
          if (!color_by_staircase) return "gray"
          // else if (result.stairs.length == 0) return "gray"
          else {
            let possible_stair = result.stairs.find(s => s.includes(orderedges[i]))
            if (possible_stair != undefined) {
              let stairquality = 1 //compute_individual_stair_quality(possible_stair, graph, ordernodes, orderedges)
              return d3.interpolateHsl(...["gray", "#F3722C"])(stairquality)
            }
            else if (result.escalators != undefined){
              
              let possible_escalator = result.escalators.find(e => e.includes(orderedges[i]))
              if (possible_escalator != undefined) return "gray"
              else return "gray"
            }
            else {
              return "gray"
            }
          }
        })
        .attr("stroke-width", stroke_width)
          .style("stroke-linecap", "round")
          .attr("x1", line_x)
          .attr("x2", line_x)
          .attr("y1", topnode_h)
          .attr("y2", bottomnode_h)
  
      svg.append("rect")
        .attr("x", line_x - rect_size/2)
        .attr("y", highestnode - rect_size/2)
        .attr("width", rect_size)
        .attr("height", rect_size)
        .attr("rx", 3)
        .attr("ry", 3)
        .attr("fill", () => {
          if (!color_by_staircase) return "gray"
          else if (result.runways.length == 0) return "gray"
          else {
            let ind = parseInt(i)
            let possible_runway = result.runways.find(s => s.includes(orderedges[i]))
            if (possible_runway != undefined) {
              let col = "gray"
              
              if (orderedges[ind-1] != undefined){
                let prevedge = graph.links.find(e => e.id == orderedges[ind-1])
                if (node_h_dict[prevedge.source] == highestnode) col = "#F94144"
                if (node_h_dict[prevedge.target] == highestnode) col = "#F94144"
                
              }
              if (orderedges[ind+1] != undefined){
                let nextedge = graph.links.find(e => e.id == orderedges[ind+1])
                if (Math.round(10*node_h_dict[nextedge.source]) == Math.round(10*highestnode)) col = "#F94144"
                if (Math.round(10*node_h_dict[nextedge.target]) == Math.round(10*highestnode)) col = "#F94144"
              }
              return col
            }
            else return "gray"
          }})
  
      svg.append("rect")
        .attr("x", line_x - rect_size/2)
        .attr("y", lowestnode - rect_size/2)
        .attr("width", rect_size)
        .attr("height", rect_size)
        .attr("rx", 3)
        .attr("ry", 3)
        .attr("fill", () => {
          if (!color_by_staircase) return "gray"
          else if (result.runways.length == 0) return "gray"
          else {
            let ind = parseInt(i)
            let possible_runway = result.runways.find(s => s.includes(orderedges[i]))
            if (possible_runway != undefined) {
              let col = "gray"
              
              if (orderedges[ind-1] != undefined){
                let prevedge = graph.links.find(e => e.id == orderedges[ind-1])
                if (node_h_dict[prevedge.source] == lowestnode) col = "#F94144"
                if (node_h_dict[prevedge.target] == lowestnode) col = "#F94144"
                
              }
              if (orderedges[ind+1] != undefined){
                let nextedge = graph.links.find(e => e.id == orderedges[ind+1])
                if (Math.round(10*node_h_dict[nextedge.source]) == Math.round(10*lowestnode)) col = "#F94144"
                if (Math.round(10*node_h_dict[nextedge.target]) == Math.round(10*lowestnode)) col = "#F94144"
              }
              return col
            }
            else return "gray"
          }})
  
      if (show_edge_indices) svg.append("text")
        .attr("x", line_x - rect_size/2)
        .attr("y", padding.top - 8)
        .style("font-size", "small")
        .style("font-family", "Arial")
        .style("text-anchor", "start")
        .style("fill", "lightgray")
        .text(orderedges[i])

      // svg.append("text")
      //   .attr("x", svgwidth/2)
      //   .attr("y", svgheight - 30)
      //   .attr("text-anchor", "middle")
      //   .text("quality: " + Math.round(result.stairQualities[result.stairQualities.length - 1]*100)/100)

      // svg.append("text")
      //   .attr("x", svgwidth/2)
      //   .attr("y", svgheight - 30)
      //   .attr("text-anchor", "middle")
      //   .text("quality: " + Math.round(result.stairQualities[result.stairQualities.length - 1]*100)/100)
    }
    
    
    return svg.node();
  }