async function draw_result_scatterplots(parent_div, filenames, times){
    // put a stats div on top of the page
    let stats = document.createElement("div")
    stats.className = "row"
    parent_div.appendChild(stats)

    // create a scatterplot for the results
    let scatterplot = document.createElement("div")
    scatterplot.className = "col-lg"
    stats.appendChild(scatterplot)

    // create new row
    let stats2 = document.createElement("div")
    stats2.className = "row"
    parent_div.appendChild(stats2)

    let scatterplot2 = document.createElement("div")
    scatterplot2.className = "col-lg"
    stats2.appendChild(scatterplot2)

    let stats3 = document.createElement("div")
    stats3.className = "row"
    parent_div.appendChild(stats3)

    let scatterplot3 = document.createElement("div")
    scatterplot3.className = "col-lg"
    stats3.appendChild(scatterplot3)

    let stats4 = document.createElement("div")
    stats4.className = "row"
    parent_div.appendChild(stats4)

    let scatterplot4 = document.createElement("div")
    scatterplot4.className = "col-lg"
    stats4.appendChild(scatterplot4)

    let stats5 = document.createElement("div")
    stats5.className = "row"
    parent_div.appendChild(stats5)

    let scatterplot5 = document.createElement("div")
    scatterplot5.className = "col-lg"
    stats5.appendChild(scatterplot5)

    let stats6 = document.createElement("div")
    stats6.className = "row"
    parent_div.appendChild(stats6)

    let scatterplot6 = document.createElement("div")
    scatterplot6.className = "col-lg"
    stats6.appendChild(scatterplot6)


    let exclude_timeouts_from_median_scatterplots = true;

    let time_by_num_nodes = {}
    let time_by_num_edges = {}
    let time_by_density = {}
    let time_by_max_degree = {}
    let timeouts_by_num_nodes = {}
    let timeouts_by_num_edges = {}
    let timeouts_by_density = {}
    let timeouts_by_max_degree = {}
    let total_num_graphs_by_num_nodes = {}
    let total_num_graphs_by_num_edges = {}
    let total_num_graphs_by_density = {}
    let total_num_graphs_by_max_degree = {}

    let runway_quality_by_num_nodes_degreecending = {}
    let runway_quality_by_num_edges_degreecending = {}
    let runway_quality_by_density_degreecending = {}
    let runway_quality_by_max_degree_degreecending = {}
    let staircase_quality_by_num_nodes_degreecending = {}
    let staircase_quality_by_num_edges_degreecending = {}
    let staircase_quality_by_density_degreecending = {}
    let staircase_quality_by_max_degree_degreecending = {}
    let runway_quality_by_num_nodes_ilp = {}
    let runway_quality_by_num_edges_ilp = {}
    let runway_quality_by_density_ilp = {}
    let runway_quality_by_max_degree_ilp = {}
    let staircase_quality_by_num_nodes_ilp = {}
    let staircase_quality_by_num_edges_ilp = {}
    let staircase_quality_by_density_ilp = {}
    let staircase_quality_by_max_degree_ilp = {}
    let difference_in_runway_quality_by_num_nodes = {}
    let difference_in_runway_quality_by_num_edges = {}
    let difference_in_runway_quality_by_density = {}
    let difference_in_runway_quality_by_max_degree = {}
    let difference_in_staircase_quality_by_num_nodes = {}
    let difference_in_staircase_quality_by_num_edges = {}
    let difference_in_staircase_quality_by_density = {}
    let difference_in_staircase_quality_by_max_degree = {}

    for (let filename of filenames){
        // read json in data/rome-lib
        // check if the files exist
        let r = await d3.json("data/rome-lib/" + filename)
        let r2 = await (await fetch("lp_solutions/" + filename.replace(".json", ".sol"))).text()
        let r2log = await (await fetch("lp_solutions/" + filename.replace(".json", ".log"))).text()
        if (r.status == 404 || r2.status == 404){
          continue;
        }

        // find in r2log the time it took to solve the problem
        let time = r2log.split("\n").filter(x => x.includes("seconds"))[2]
        if (time == undefined) {console.log(filename); continue;}
        // make a regex to find the number right before the word "seconds"
        time = parseFloat(time.match(/\d+\.\d+/)[0])

        // compute density of the graph, approximated to the second decimal
        let density = r.links.length / (r.nodes.length * (r.nodes.length - 1) / 2)
        density = Math.round(density * 100) / 100

        // compute max degree of the graph
        let max_degree = Math.max.apply(0, r.nodes.map(n => r.links.filter(e => e.source == n.id || e.target == n.id).length))

        // if the number of nodes is not in the dictionary, add it
        if (!(r.nodes.length in total_num_graphs_by_num_nodes)) total_num_graphs_by_num_nodes[r.nodes.length] = 0
        if (!(r.links.length in total_num_graphs_by_num_edges)) total_num_graphs_by_num_edges[r.links.length] = 0
        if (!(density in total_num_graphs_by_density)) total_num_graphs_by_density[density] = 0
        if (!(max_degree in total_num_graphs_by_max_degree)) total_num_graphs_by_max_degree[max_degree] = 0

        total_num_graphs_by_num_nodes[r.nodes.length] += 1
        total_num_graphs_by_num_edges[r.links.length] += 1
        total_num_graphs_by_density[density] += 1
        total_num_graphs_by_max_degree[max_degree] += 1

        if (r2log.includes("Time limit reached")){
            if (timeouts_by_num_nodes[r.nodes.length] == undefined) timeouts_by_num_nodes[r.nodes.length] = 0
            if (timeouts_by_num_edges[r.links.length] == undefined) timeouts_by_num_edges[r.links.length] = 0
            if (timeouts_by_density[density] == undefined) timeouts_by_density[density] = 0
            if (timeouts_by_max_degree[max_degree] == undefined) timeouts_by_max_degree[max_degree] = 0
            timeouts_by_num_nodes[r.nodes.length] += 1
            timeouts_by_num_edges[r.links.length] += 1
            timeouts_by_density[density] += 1
            timeouts_by_max_degree[max_degree] += 1
            if (exclude_timeouts_from_median_scatterplots) continue;
        }

        // if the number of nodes is not in the dictionary, add it
        if (!(r.nodes.length in time_by_num_nodes))time_by_num_nodes[r.nodes.length] = []
        if (!(r.links.length in time_by_num_edges))time_by_num_edges[r.links.length] = []
        if (!(density in time_by_density))time_by_density[density] = []
        if (!(max_degree in time_by_max_degree))time_by_max_degree[max_degree] = []

        time_by_num_nodes[r.nodes.length].push(time)
        time_by_num_edges[r.links.length].push(time)
        time_by_density[density].push(time)
        time_by_max_degree[max_degree].push(time)

        // compute degreecending quality 
        sortByDegree(r.nodes, r.links)
        sortForStaircases(r.nodes, r.links)
        let degreecendingquality = analyzeGraph(r.nodes, r.links)

        if (!(r.nodes.length in runway_quality_by_num_nodes_degreecending)) runway_quality_by_num_nodes_degreecending[r.nodes.length] = []
        if (!(r.links.length in runway_quality_by_num_edges_degreecending)) runway_quality_by_num_edges_degreecending[r.links.length] = []
        if (!(density in runway_quality_by_density_degreecending)) runway_quality_by_density_degreecending[density] = []
        if (!(max_degree in runway_quality_by_max_degree_degreecending)) runway_quality_by_max_degree_degreecending[max_degree] = []

        runway_quality_by_num_nodes_degreecending[r.nodes.length].push(degreecendingquality.runwayQualities.reduce((a, b) => a + b, 0))
        runway_quality_by_num_edges_degreecending[r.links.length].push(degreecendingquality.runwayQualities.reduce((a, b) => a + b, 0))
        runway_quality_by_density_degreecending[density].push(degreecendingquality.runwayQualities.reduce((a, b) => a + b, 0))
        runway_quality_by_max_degree_degreecending[max_degree].push(degreecendingquality.runwayQualities.reduce((a, b) => a + b, 0))

        if (!(r.nodes.length in staircase_quality_by_num_nodes_degreecending)) staircase_quality_by_num_nodes_degreecending[r.nodes.length] = []
        if (!(r.links.length in staircase_quality_by_num_edges_degreecending)) staircase_quality_by_num_edges_degreecending[r.links.length] = []
        if (!(density in staircase_quality_by_density_degreecending)) staircase_quality_by_density_degreecending[density] = []
        if (!(max_degree in staircase_quality_by_max_degree_degreecending)) staircase_quality_by_max_degree_degreecending[max_degree] = []

        staircase_quality_by_num_nodes_degreecending[r.nodes.length].push(degreecendingquality.stairQualities.slice(0, -1).map(s => Math.round(s[0] * 100)/100).reduce((a, b) => a + b, 0))
        staircase_quality_by_num_edges_degreecending[r.links.length].push(degreecendingquality.stairQualities.slice(0, -1).map(s => Math.round(s[0] * 100)/100).reduce((a, b) => a + b, 0))
        staircase_quality_by_density_degreecending[density].push(degreecendingquality.stairQualities.slice(0, -1).map(s => Math.round(s[0] * 100)/100).reduce((a, b) => a + b, 0))
        staircase_quality_by_max_degree_degreecending[max_degree].push(degreecendingquality.stairQualities.slice(0, -1).map(s => Math.round(s[0] * 100)/100).reduce((a, b) => a + b, 0))

        // compute ilp quality
        let lp = new Biofabric_lp(r);
        await lp.readFromGurobi("lp_solutions/" + filename.replace(".json", ".sol"))
        let ilpquality = analyzeGraph(r.nodes, r.links, lp)

        if (!(r.nodes.length in runway_quality_by_num_nodes_ilp)) runway_quality_by_num_nodes_ilp[r.nodes.length] = []
        if (!(r.links.length in runway_quality_by_num_edges_ilp)) runway_quality_by_num_edges_ilp[r.links.length] = []
        if (!(density in runway_quality_by_density_ilp)) runway_quality_by_density_ilp[density] = []
        if (!(max_degree in runway_quality_by_max_degree_ilp)) runway_quality_by_max_degree_ilp[max_degree] = []

        runway_quality_by_num_nodes_ilp[r.nodes.length].push(ilpquality.runwayQualities.reduce((a, b) => a + b, 0))
        runway_quality_by_num_edges_ilp[r.links.length].push(ilpquality.runwayQualities.reduce((a, b) => a + b, 0))
        runway_quality_by_density_ilp[density].push(ilpquality.runwayQualities.reduce((a, b) => a + b, 0))
        runway_quality_by_max_degree_ilp[max_degree].push(ilpquality.runwayQualities.reduce((a, b) => a + b, 0))

        if (!(r.nodes.length in staircase_quality_by_num_nodes_ilp)) staircase_quality_by_num_nodes_ilp[r.nodes.length] = []
        if (!(r.links.length in staircase_quality_by_num_edges_ilp)) staircase_quality_by_num_edges_ilp[r.links.length] = []
        if (!(density in staircase_quality_by_density_ilp)) staircase_quality_by_density_ilp[density] = []
        if (!(max_degree in staircase_quality_by_max_degree_ilp)) staircase_quality_by_max_degree_ilp[max_degree] = []

        staircase_quality_by_num_nodes_ilp[r.nodes.length].push(ilpquality.stairQualities.slice(0, -1).map(s => Math.round(s[0] * 100)/100).reduce((a, b) => a + b, 0))
        staircase_quality_by_num_edges_ilp[r.links.length].push(ilpquality.stairQualities.slice(0, -1).map(s => Math.round(s[0] * 100)/100).reduce((a, b) => a + b, 0))
        staircase_quality_by_density_ilp[density].push(ilpquality.stairQualities.slice(0, -1).map(s => Math.round(s[0] * 100)/100).reduce((a, b) => a + b, 0))
        staircase_quality_by_max_degree_ilp[max_degree].push(ilpquality.stairQualities.slice(0, -1).map(s => Math.round(s[0] * 100)/100).reduce((a, b) => a + b, 0))

        // compute difference in runway quality
        if (!(r.nodes.length in difference_in_runway_quality_by_num_nodes)) difference_in_runway_quality_by_num_nodes[r.nodes.length] = []
        if (!(r.links.length in difference_in_runway_quality_by_num_edges)) difference_in_runway_quality_by_num_edges[r.links.length] = []
        if (!(density in difference_in_runway_quality_by_density)) difference_in_runway_quality_by_density[density] = []
        if (!(max_degree in difference_in_runway_quality_by_max_degree)) difference_in_runway_quality_by_max_degree[max_degree] = []

        difference_in_runway_quality_by_num_nodes[r.nodes.length].push(ilpquality.runwayQualities.reduce((a, b) => a + b, 0) - degreecendingquality.runwayQualities.reduce((a, b) => a + b, 0))
        difference_in_runway_quality_by_num_edges[r.links.length].push(ilpquality.runwayQualities.reduce((a, b) => a + b, 0) - degreecendingquality.runwayQualities.reduce((a, b) => a + b, 0))
        difference_in_runway_quality_by_density[density].push(ilpquality.runwayQualities.reduce((a, b) => a + b, 0) - degreecendingquality.runwayQualities.reduce((a, b) => a + b, 0))
        difference_in_runway_quality_by_max_degree[max_degree].push(ilpquality.runwayQualities.reduce((a, b) => a + b, 0) - degreecendingquality.runwayQualities.reduce((a, b) => a + b, 0))
    
        // compute difference in staircase quality
        if (!(r.nodes.length in difference_in_staircase_quality_by_num_nodes)) difference_in_staircase_quality_by_num_nodes[r.nodes.length] = []
        if (!(r.links.length in difference_in_staircase_quality_by_num_edges)) difference_in_staircase_quality_by_num_edges[r.links.length] = []
        if (!(density in difference_in_staircase_quality_by_density)) difference_in_staircase_quality_by_density[density] = []
        if (!(max_degree in difference_in_staircase_quality_by_max_degree)) difference_in_staircase_quality_by_max_degree[max_degree] = []

        difference_in_staircase_quality_by_num_nodes[r.nodes.length].push(ilpquality.stairQualities.slice(0, -1).map(s => Math.round(s[0] * 100)/100).reduce((a, b) => a + b, 0) - degreecendingquality.stairQualities.slice(0, -1).map(s => Math.round(s[0] * 100)/100).reduce((a, b) => a + b, 0))
        difference_in_staircase_quality_by_num_edges[r.links.length].push(ilpquality.stairQualities.slice(0, -1).map(s => Math.round(s[0] * 100)/100).reduce((a, b) => a + b, 0) - degreecendingquality.stairQualities.slice(0, -1).map(s => Math.round(s[0] * 100)/100).reduce((a, b) => a + b, 0))
        difference_in_staircase_quality_by_density[density].push(ilpquality.stairQualities.slice(0, -1).map(s => Math.round(s[0] * 100)/100).reduce((a, b) => a + b, 0) - degreecendingquality.stairQualities.slice(0, -1).map(s => Math.round(s[0] * 100)/100).reduce((a, b) => a + b, 0))
        difference_in_staircase_quality_by_max_degree[max_degree].push(ilpquality.stairQualities.slice(0, -1).map(s => Math.round(s[0] * 100)/100).reduce((a, b) => a + b, 0) - degreecendingquality.stairQualities.slice(0, -1).map(s => Math.round(s[0] * 100)/100).reduce((a, b) => a + b, 0))
    }

    let maxnumnodes = 25 // Math.max.apply(0, Object.keys(time_by_num_nodes))
    let maxnumedges = 30 // Math.max.apply(0, Object.keys(time_by_num_edges))
    let minnumnodes = 10 // Math.min.apply(0, Object.keys(time_by_num_nodes))
    let minnumedges = 5 // Math.min.apply(0, Object.keys(time_by_num_edges))
    let mindensity = 0.05 // Math.min.apply(0, Object.keys(time_by_density))
    let maxdensity = 0.25 // Math.max.apply(0, Object.keys(time_by_density))
    let maxmaxdegree = 9 // Math.max.apply(0, Object.keys(time_by_max_degree))
    let minmaxdegree = 3 //Math.min.apply(0, Object.keys(time_by_max_degree))
    let maxrunwayquality = 10
    let maxrunwayqualitydifference = 5
    let maxstaircasequality = 10
    let maxstaircasequalitydifference = 5

    let mintime = 0
    let maxtime = Object.values(time_by_num_nodes).map(x => Math.max.apply(0, x)).reduce((a, b) => Math.max(a, b))

    // normalize timeouts
    for (let elem in timeouts_by_num_nodes) timeouts_by_num_nodes[elem] /= total_num_graphs_by_num_nodes[elem]
    for (let elem in timeouts_by_num_edges) timeouts_by_num_edges[elem] /= total_num_graphs_by_num_edges[elem]
    for (let elem in timeouts_by_density) timeouts_by_density[elem] /= total_num_graphs_by_density[elem]
    for (let elem in timeouts_by_max_degree) timeouts_by_max_degree[elem] /= total_num_graphs_by_max_degree[elem]

    draw_scatterplot_with_median(scatterplot, [time_by_num_nodes], minnumnodes, maxnumnodes, mintime, maxtime, "Time to solve the problem by number of nodes", [d3.schemeTableau10[3]])
    draw_scatterplot_with_median(scatterplot, [time_by_num_edges], minnumedges, maxnumedges, mintime, maxtime, "Time to solve the problem by number of edges", [d3.schemeTableau10[3]])
    draw_scatterplot_with_median(scatterplot, [time_by_density], mindensity, maxdensity, mintime, maxtime, "Time to solve the problem by density", [d3.schemeTableau10[3]])
    draw_scatterplot_with_median(scatterplot, [time_by_max_degree], minmaxdegree, maxmaxdegree, mintime, maxtime, "Time to solve the problem by max degree", [d3.schemeTableau10[3]])

    draw_linechart_with_timeouts(scatterplot2, timeouts_by_num_nodes, minnumnodes, maxnumnodes, "Number of timeouts by number of nodes", [d3.schemeTableau10[2]])
    draw_linechart_with_timeouts(scatterplot2, timeouts_by_num_edges, minnumedges, maxnumedges, "Number of timeouts by number of edges", [d3.schemeTableau10[2]])
    draw_linechart_with_timeouts(scatterplot2, timeouts_by_density, mindensity, maxdensity, "Number of timeouts by density", [d3.schemeTableau10[2]])
    draw_linechart_with_timeouts(scatterplot2, timeouts_by_max_degree, minmaxdegree, maxmaxdegree, "Number of timeouts by max degree", [d3.schemeTableau10[2]])

    // draw the quality of the runways
    draw_scatterplot_with_median(scatterplot3, [runway_quality_by_num_nodes_degreecending, runway_quality_by_num_nodes_ilp], minnumnodes, maxnumnodes, 0, maxrunwayquality, "Quality of the runways by number of nodes")
    draw_scatterplot_with_median(scatterplot3, [runway_quality_by_num_edges_degreecending, runway_quality_by_num_edges_ilp], minnumedges, maxnumedges, 0, maxrunwayquality, "Quality of the runways by number of edges")
    draw_scatterplot_with_median(scatterplot3, [runway_quality_by_density_degreecending, runway_quality_by_density_ilp], mindensity, maxdensity, 0, maxrunwayquality, "Quality of the runways by density")
    draw_scatterplot_with_median(scatterplot3, [runway_quality_by_max_degree_degreecending, runway_quality_by_max_degree_ilp], minmaxdegree, maxmaxdegree, 0, maxrunwayquality, "Quality of the runways by max degree")

    // draw the difference in quality of the runways
    draw_scatterplot_with_median(scatterplot4, [difference_in_runway_quality_by_num_nodes], minnumnodes, maxnumnodes, -maxrunwayqualitydifference, maxrunwayqualitydifference, "Difference in quality of the runways by number of nodes", [d3.schemeTableau10[4]])
    draw_scatterplot_with_median(scatterplot4, [difference_in_runway_quality_by_num_edges], minnumedges, maxnumedges, -maxrunwayqualitydifference, maxrunwayqualitydifference, "Difference in quality of the runways by number of edges", [d3.schemeTableau10[4]])
    draw_scatterplot_with_median(scatterplot4, [difference_in_runway_quality_by_density], mindensity, maxdensity, -maxrunwayqualitydifference, maxrunwayqualitydifference, "Difference in quality of the runways by density", [d3.schemeTableau10[4]])
    draw_scatterplot_with_median(scatterplot4, [difference_in_runway_quality_by_max_degree], minmaxdegree, maxmaxdegree, -maxrunwayqualitydifference, maxrunwayqualitydifference, "Difference in quality of the runways by max degree", [d3.schemeTableau10[4]])

    // draw the quality of the staircases
    draw_scatterplot_with_median(scatterplot5, [staircase_quality_by_num_nodes_degreecending, staircase_quality_by_num_nodes_ilp], minnumnodes, maxnumnodes, 0, maxstaircasequality, "Quality of the staircases by number of nodes")
    draw_scatterplot_with_median(scatterplot5, [staircase_quality_by_num_edges_degreecending, staircase_quality_by_num_edges_ilp], minnumedges, maxnumedges, 0, maxstaircasequality, "Quality of the staircases by number of edges")
    draw_scatterplot_with_median(scatterplot5, [staircase_quality_by_density_degreecending, staircase_quality_by_density_ilp], mindensity, maxdensity, 0, maxstaircasequality, "Quality of the staircases by density")
    draw_scatterplot_with_median(scatterplot5, [staircase_quality_by_max_degree_degreecending, staircase_quality_by_max_degree_ilp], minmaxdegree, maxmaxdegree, 0, maxstaircasequality, "Quality of the staircases by max degree")

    // draw the difference in quality of the staircases
    draw_scatterplot_with_median(scatterplot6, [difference_in_staircase_quality_by_num_nodes], minnumnodes, maxnumnodes, -maxstaircasequalitydifference, maxstaircasequalitydifference, "Difference in quality of the staircases by number of nodes", [d3.schemeTableau10[4]])
    draw_scatterplot_with_median(scatterplot6, [difference_in_staircase_quality_by_num_edges], minnumedges, maxnumedges, -maxstaircasequalitydifference, maxstaircasequalitydifference, "Difference in quality of the staircases by number of edges", [d3.schemeTableau10[4]])
    draw_scatterplot_with_median(scatterplot6, [difference_in_staircase_quality_by_density], mindensity, maxdensity, -maxstaircasequalitydifference, maxstaircasequalitydifference, "Difference in quality of the staircases by density", [d3.schemeTableau10[4]])
    draw_scatterplot_with_median(scatterplot6, [difference_in_staircase_quality_by_max_degree], minmaxdegree, maxmaxdegree, -maxstaircasequalitydifference, maxstaircasequalitydifference, "Difference in quality of the staircases by max degree", [d3.schemeTableau10[4]])
}

function draw_scatterplot_with_median(scatterplot, datapoints, minnumnodes, maxnumnodes, mintime, maxtime, title, colors){
    let scatterplot_svg = d3.select(scatterplot).append("svg")
      .attr("width", 300)  
      .attr("viewBox", "0 0 500 500")

    let scatterplot_x = d3.scaleLinear()
        .domain([minnumnodes, maxnumnodes])
        .range([50, 450])

    let scatterplot_y = d3.scaleLinear()
        .domain([mintime, maxtime])
        .range([450, 50])

    if (colors == undefined){
        colors = ["steelblue", "orange"]
    }

    for (let datapoint of datapoints){
        let colorindex = datapoints.indexOf(datapoint)
        let medianvalues = {}

        for (let numnodes in datapoint){
            if (datapoint[numnodes].length == 0) continue;
            for (let time of datapoint[numnodes]){
                scatterplot_svg.append("circle")
                    .attr("cx", scatterplot_x(numnodes))
                    .attr("cy", scatterplot_y(time))
                    .attr("r", 5)
                    .attr("fill", colors[colorindex])
                    .style("opacity", 0.5)
            }

            // compute the median
            let median = d3.median(datapoint[numnodes])
            medianvalues[numnodes] = median
        }

        let medianline = []
        let arr = Object.keys(datapoint).map(n => parseFloat(n)).sort((a, b) => a - b)
        for (let numnodes of arr){
            numnodes = parseFloat(numnodes)
            // if (scatterplot_y(medianvalues[numnodes]) == undefined) continue;
            medianline.push([scatterplot_x(numnodes), scatterplot_y(parseFloat(medianvalues[numnodes]))])
            // console.log(scatterplot_y(medianvalues[numnodes]))
        }
        
        // draw the median line
        scatterplot_svg.append("path")
            .attr("d", d3.line()(medianline))
            .attr("stroke", colors[colorindex])
            .attr("stroke-width", 4)
            .attr("fill", "none")
            .attr("stroke-linecap", "round")
            .attr("stroke-linejoin", "round")
    }

    // draw the axes, with only 5 ticks and big font
    scatterplot_svg.append("g")
        .attr("transform", "translate(0,450)")
        .call(d3.axisBottom(scatterplot_x).ticks(3))

    scatterplot_svg.append("g")
        .attr("transform", "translate(50,0)")
        .call(d3.axisLeft(scatterplot_y).ticks(3))

    // make the font of the ticks bigger
    scatterplot_svg.selectAll("text")
        .attr("font-size", "22px")

    // give a title to the scatterplot
    scatterplot_svg.append("text")
        .attr("x", 250)
        .attr("y", 20)
        .attr("text-anchor", "middle")
        .attr("font-size", "20px")
        .text(title)
}

function draw_linechart_with_timeouts(stats2, timeouts_by_num_nodes, minnumnodes, maxnumnodes, title, colors){
    let linechart = d3.select(stats2).append("svg")
      .attr("width", 300)  
      .attr("viewBox", "0 0 500 500")

    let linechart_x = d3.scaleLinear()
        .domain([minnumnodes, maxnumnodes])
        .range([50, 450])

    let linechart_y = d3.scaleLinear()
        .domain([0, Math.max.apply(0, Object.values(timeouts_by_num_nodes))])
        .range([450, 50])

    if (colors == undefined){
        colors = ["steelblue", "orange"]
    }

    let linechart_data = []
    let arr = Object.keys(timeouts_by_num_nodes).map(x => parseFloat(x)).sort((a, b) => a - b)
    for (let numnodes of arr){
        linechart_data.push([linechart_x(numnodes), linechart_y(timeouts_by_num_nodes[numnodes])])
    }

    linechart.append("path")
        .attr("d", d3.line()(linechart_data))
        .attr("stroke", colors[0])
        .attr("stroke-width", 4)
        .attr("fill", "none")
        .attr("stroke-linecap", "round")
        .attr("stroke-linejoin", "round")

    // draw the axes
    linechart.append("g")
        .attr("transform", "translate(0,450)")
        .call(d3.axisBottom(linechart_x).ticks(3))

    linechart.append("g")
        .attr("transform", "translate(50,0)")
        .call(d3.axisLeft(linechart_y).ticks(3))

    // make the font of the ticks bigger
    linechart.selectAll("text")
        .attr("font-size", "22px")

    // give a title to the scatterplot
    linechart.append("text")
        .attr("x", 250)
        .attr("y", 20)
        .attr("text-anchor", "middle")
        .attr("font-size", "20px")
        .text(title)
}