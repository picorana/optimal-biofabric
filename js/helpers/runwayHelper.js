let nodeDegrees = {}


function finalizeStreak(map, key, results, minLength = 3) {
    let streak = map[key]; // potential runway
    delete map[key] // reset

    if (streak.length >= minLength) {
        results.push({streak: streak, commonId: key});

    }
}

function addToArrayMap(map, key, value) {


    // Check if the key already exists
    if (!map[key]) {
        // If not, create a new array with the value
        map[key] = [value];
    } else {
        // If it does, just push the new value to the existing array
        map[key].push(value);
    }
}

function detectRunways(nodes, edges) {

    //console.log("edges in runways: " + edges.map(n => n.id))

    const minimumLength = 3; // at least 3 consecutive parts
    let trackers = {};
    let results = [];
    nodeDegrees = {} // reset values since JS sometimes doesn't clear the global value

    // we go over each edge and store the current edge_ids into the tracker
    edges.forEach((edge, index) => {

        // degree extraction for quality measure
        nodeDegrees[edge.source] = (nodeDegrees[edge.source] || 0) + 1;
        nodeDegrees[edge.target] = (nodeDegrees[edge.target] || 0) + 1;

        let oldKeys = Object.keys(trackers) // might be empty in the beginning
        addToArrayMap(trackers, edge.source, edge.id)
        addToArrayMap(trackers, edge.target, edge.id)

        // now after adding we need to verify if the trackers still look at streaks, or if they have ended

        // check which oldkeys we need to throw out
        oldKeys.forEach((key) => {
            // we assert here that if the current edge does not share node_ids with the previous streaks they are done.
            if (key !== edge.source.toString() && key !== edge.target.toString() && index !== 0) {
                finalizeStreak(trackers, key, results);
                // in here is the final check if the streak is bigger than our threshold
            }
        });
    });

    // last iteration so the final streaks may be extracted
    Object.keys(trackers).forEach((key) => {
        finalizeStreak(trackers, key, results);
    })

    let qualities = getQualityOfRunways(results)
    return [results, qualities];
}

function getQualityOfRunways(runways) {

    let qualities = [];
    runways.forEach((runway) => {

        qualities.push(runway.streak.length / nodeDegrees[runway.commonId])
    })
    return qualities;
}

