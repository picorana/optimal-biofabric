function analyzeGraph(nodes, edges) {

    let result_template = {
        nodeOrder: "",
        edgeOrder: "",
        structureSize: 3,
        stepSize: -1,
        stairs: [],
        stairQualities: [],
        //escalators: [],
        //escalatorQualities: [],
        //runways: [],
        //runwayQualities: [],
    }

    stepSize = nodes.length;
    timekeeping = false;
    consoleLogging = false;
    structureSize = 3;
    moreInfo = false;

    let currNodes = []
    let currEdges = []

    // nodeOrderKeys.forEach(nodeOrderKey => {
        // edgeOrderKeys.forEach(edgeOrderKey => {
            currNodes = nodes;
            currEdges = edges;

            // currNodes = JSON.parse(JSON.stringify(nodes));
            // currEdges = JSON.parse(JSON.stringify(edges));

            // // Ordering Nodes and Edges
            // timekeeping ? console.time("Ordering Nodes and Edges") : null;
            // consoleLogging ? console.log(`Ordering Nodes with ${nodeOrderKey} key`) : null;
            // sortNodes(nodeOrderKey, currNodes, currEdges, data)
            // consoleLogging ? console.log(`Ordering Edges with ${edgeOrderKey} key`) : null;
            // sortEdges(edgeOrderKey, currNodes, currEdges)
            // timekeeping ? console.timeEnd("Ordering Nodes and Edges") : null;
            // consoleLogging ? console.log("") : null; // formatting of console log

            //console.log(currNodes.map(n => n.id))
            //console.log(currEdges)

            // result_template.nodeOrder = nodeOrderKey;
            // result_template.edgeOrder = edgeOrderKey;


            /* start analyzing the ordered nodes and edges as if they were displayed by bio-fabric */

            // Runways
            // timekeeping ? console.time("Analyzing runways") : null;
            let [runways, runwayQualities] = detectRunways(currNodes, currEdges)
            // timekeeping ? console.timeEnd("Analyzing runways") : null;
            //consoleLogging ? console.log(`Found ${runways.length > 0 ? runways.length : "no"} runway${runways.length !== 1 ? "s" : ""}!\r\n`) : null;
            //moreInfo ? console.log(runways) : null;
            //moreInfo ? console.log(runwayQualities) : null;

            //console.log(runways)
            result_template.runways = runways.map(r => {
                return r.streak
            });
            result_template.runwayQualities = runwayQualities;
            

            // stepSizes.forEach((stepSize) => {

                // Stairs
                // timekeeping ? console.time("Analyzing stairs") : null;
                let [stairs, stairQualities] = detectStairs(currNodes, currEdges, structureSize, stepSize)
                // console.log("stairs:", stairs)
                // timekeeping ? console.timeEnd("Analyzing stairs") : null;
                //consoleLogging ? console.log(`Found ${stairs.length > 0 ? stairs.length : "no"} stair${stairs.length !== 1 ? "s" : ""}, with maximal stepSize ${stepSize}!\r\n`) : null;
                // moreInfo ? console.log(stairs.map((stair => stair.map(item => item.id)))) : null;
                //moreInfo ? console.log(stairQualities) : null;

                // Escalators
                // timekeeping ? console.time("Analyzing escalators") : null;
                // let [escalators, escalatorQualities] = detectEscalators(currNodes, currEdges, structureSize, stepSize)
                // timekeeping ? console.timeEnd("Analyzing escalators") : null;
                //consoleLogging ? console.log(`Found ${escalators.length > 0 ? escalators.length : "no"} escalator${escalators.length !== 1 ? "s" : ""}, with maximal stepSize ${stepSize}!\r\n`) : null;
                //moreInfo ? console.log(escalators) : null;
                //moreInfo ? console.log(escalatorQualities) : null;

                //console.log("Size " + stepSize + ": ")
                /*stairs.forEach(s => {
                    console.log(s.pairValues)
                })*/

                stairs.forEach(r => {
                    let currCommonValue = r.commonValue
                    let currStair = r.pairValues;
                    let direction = null; // 'rising' or 'falling'

                    for (let i = 1; i < currStair.length; i++) {

                        let difference = currStair[i] - currStair[i - 1];
                        if (Math.abs(difference) > stepSize) {
                            console.log(`Invalid stepSize at index ${i}, between pair ${currStair[i - 1]} and ${currStair[i]}`)
                        }

                        if (difference > 0) {
                            // Current number is greater than the previous one
                            if (direction === 'falling') {
                                console.log(`Direction changed to rising at index ${i}, number: ${currStair[i]}`);
                            }
                            direction = 'rising';
                        } else if (difference < 0) {
                            // Current number is less than the previous one
                            if (direction === 'rising') {
                                console.log(`Direction changed to falling at index ${i}, number: ${currStair[i]}`);
                            }
                            direction = 'falling';
                        }
                        // No 'else' case needed as the problem states there will be no duplicate values
                    }
                })

                result_template.stepSize = stepSize;
                result_template.stairs = stairs.map(r => {
                    return r.stair
                });

                let finalValue = compute_stair_quality(edges, stairs, nodes)
                stairQualities.push(finalValue)

                result_template.stairQualities = stairQualities;

                console.log("result template", result_template)
                return result_template


                function compute_stair_quality(edges, r, currNodeOrdering) {

                    let all_stairs_quality = 0;
                    r.forEach((res) => {
                        let stair = res.stair
                        let edges_involved = stair.map(id => edges.find(l => l.id === id)).filter(e => e !== undefined);
                        let node_in_common = res.commonId

                        let node_in_common_pos = currNodeOrdering.findIndex(n => n.id === node_in_common);

                        // compute node degree
                        let node_in_common_degree = edges.filter(d => d.source === node_in_common || d.target === node_in_common).length

                        let completeness = Math.pow(stair.length / node_in_common_degree, 2)

                        let arr_d = [];
                        for (let i in edges_involved) {
                            i = parseInt(i);
                            if (i === edges_involved.length - 1) continue;

                            let e = edges_involved[i];
                            let next_e = edges_involved[i + 1];

                            let sourcepos_e = currNodeOrdering.findIndex(n => n.id === e.source);
                            let targetpos_e = currNodeOrdering.findIndex(n => n.id ===e.target);
                            let sourcepos_next_e = currNodeOrdering.findIndex(n => n.id === next_e.source);
                            let targetpos_next_e = currNodeOrdering.findIndex(n => n.id === next_e.target);

                            let othernodes = [sourcepos_e, targetpos_e, sourcepos_next_e, targetpos_next_e].filter(n => n !== node_in_common_pos)
                            if ((othernodes[0] < node_in_common_pos && othernodes[1] > node_in_common_pos) ||
                                (othernodes[0] > node_in_common_pos && othernodes[1] < node_in_common_pos))
                                arr_d.push(othernodes[0] + othernodes[1])
                            else arr_d.push(Math.abs(othernodes[0] - othernodes[1]))
                        }

                        let max_d = Math.max.apply(0, arr_d)
                        let min_d = Math.min.apply(0, arr_d)

                        let d_diff = (max_d === min_d ? 1 : max_d - min_d)

                        let topsum = 0;

                        for (let d of arr_d) {
                            topsum += d - min_d;
                        }

                        let denominator = stair.length * d_diff;

                        all_stairs_quality += completeness // * (1 - topsum / denominator)
                    })
                    return all_stairs_quality
                }

                
            // })
}

