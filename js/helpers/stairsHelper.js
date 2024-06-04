function finalizeStair(map, key, results, indexMap, minLength = 3, maxStepSize = 1) {
    let edgeIds = map[key].edgeList;
    let pairValues = map[key].pairValues;
    let commonValue = indexMap[key];
    delete map[key] // reset

    if (edgeIds.length >= minLength) {

        //console.log("CurrStreak: ")
        //console.log(pairValues)

        let potentialStair = []
        let currPairValues = []

        let direction = 0; // should only take [-1,0,1] as values

        // additional check on the pair values to verify the stair:
        for (let i = 0; i < pairValues.length - 1; i++) {
            let j = i + 1; // Get the next element's index
            // iterate pairwise over the opposing values

            let firstValuePos = indexMap[pairValues[i]];
            let secondValuePos = indexMap[pairValues[j]]

            // get the actual positions from the index map, given nodes might be shuffled
            let difference = firstValuePos - secondValuePos;
            let newDirection = difference > 0 ? -1 : 1; // similar to a comparator function
            let tooLargeStepSize = Math.abs(difference) > maxStepSize
            let crossing = false //firstValuePos > commonValue && secondValuePos < commonValue
            //|| firstValuePos < commonValue && secondValuePos > commonValue;

            if (Math.abs(newDirection - direction) > 1  // direction switch from 1 to -1 or vice versa
                || tooLargeStepSize
                || crossing) // too large difference between stair edges
            {

                // from here on it's not a valid stair with j, but if the potential before it is long enough, we might store that
                if (potentialStair.length >= minLength - 1) { // mirrors the condition from before, but we need to make sure
                    potentialStair.push(edgeIds[i]) // we add from index i here since that one is still valid!
                    // only the new j now has met the break condition!
                    currPairValues.push(indexMap[pairValues[i]])

                    // store the result
                    results.push({
                        commonId: parseInt(key),
                        stair: potentialStair,
                        commonValue: commonValue,
                        pairValues: currPairValues
                    });
                }

                // we also reset here there may be more stairs starting with this value
                potentialStair = []
                currPairValues = []
                //console.log("reset")
                // so we add the last node because otherwise we would skip it!
            }

            // now if it's only a direction change the stairs can still just overlap and be valid,
            // however if it's breaking the maxStepSize then that's a problem!
            if (!tooLargeStepSize) {
                potentialStair.push(edgeIds[i])
                currPairValues.push(indexMap[pairValues[i]])
            }
            direction = newDirection;
        }


        // last iteration since we only iterate over pairs, but maybe make sure it's the same direction!!
        potentialStair.push(edgeIds[edgeIds.length - 1])
        currPairValues.push(indexMap[pairValues[edgeIds.length - 1]])

        // final check if remaining stuff is also a stair
        if (potentialStair.length >= minLength) { // mirrors the condition from before, but we need to make sure
            results.push({
                commonId: parseInt(key),
                stair: potentialStair,
                commonValue: commonValue,
                pairValues: currPairValues
            });
            //console.log("Add: ")
            //console.log(currPairValues)
        }
    }
}

function addToStairArrayMap(map, key, value, pairValue) {


    // Check if the key already exists
    if (!map[key]) {
        // If not, create a new object with the value
        map[key] = {edgeList: [value], pairValues: [pairValue]};
    } else {
        // If it does, just push the new value to the existing arrays
        map[key].edgeList.push(value);
        map[key].pairValues.push(pairValue);
    }
}

function detectStairs(nodes, edges, structureSize = 3, stepSize = 1) {
    let nodeDegrees = {}
    const minimumLength = structureSize;
    let trackers = {};
    let results = [];

    let nodeIndexMap = {}
    nodes.forEach((value, index) => {
        nodeIndexMap[value.id] = index;
    });
    let edgeMap = {} // might seem useless but spares us a lot of O(n) find(...) calls

    // we go over each edge and store the current edge_ids into the tracker
    edges.forEach((edge, index) => {
        // degree extraction for quality measure
        nodeDegrees[edge.source] = (nodeDegrees[edge.source] || 0) + 1;
        nodeDegrees[edge.target] = (nodeDegrees[edge.target] || 0) + 1;

        // edgeMap for quality measures
        edgeMap[edge.id] = edge;

        let oldKeys = Object.keys(trackers) // might be empty in the beginning
        addToStairArrayMap(trackers, edge.source, edge.id, edge.target)
        addToStairArrayMap(trackers, edge.target, edge.id, edge.source)

        // now after adding we need to verify if the trackers still look at streaks, or if they have ended

        // check which oldkeys we need to throw out
        oldKeys.forEach((key) => {
            // we do exactly the same as searching for streaks, but...
            if (key !== edge.source.toString() && key !== edge.target.toString() && index !== 0) {
                finalizeStair(trackers, key, results, nodeIndexMap, minimumLength, stepSize);
                // in here we additionally check the pairValues if they are consistent
            }
        });
        //console.log(trackers)
    });

    // last iteration so the final streaks may be extracted
    Object.keys(trackers).forEach((key) => {
        finalizeStair(trackers, key, results, nodeIndexMap, minimumLength, stepSize);
    })


    let qualities = getQualityOfStairs(results, edgeMap, nodeIndexMap, nodeDegrees);
    return [results, qualities];
}


// TODO: move to its own file!
function getQualityOfStairs(results, edgeMap, nodeIndexMap, degrees) {
    let qualities = [];
    // each stair needs to have at least one id that's the same for each edge,
    // so we can simply add the differences between them to get the step distance size

    let optimalStepSize = 1;
    let idealAvgSteps = 1;

    let singleStairGapAssessment = []

    results.forEach((result) => {

        let stair = result.stair.map((id) => edgeMap[id])

        let commonNodeId = result.commonId;
        let stepSizes = [];
        let sumOfDeviations = 0;
        let sumOfStepSizes = 0;
        let sumOfSquaredDeviations = 0;
        let sumOfSquaredOPTDeviations = 0;


        // Get step sizes, aka. differences between the steps
        for (let i = 0; i < stair.length - 1; i++) {
            let j = i + 1;
            // one step here is always composed of two neighbouring edges that have one id in common
            //console.log(i, j)
            const sourceDifference = nodeIndexMap[stair[i]['source']] - nodeIndexMap[stair[j]['source']];
            const targetDifference = nodeIndexMap[stair[i]['target']] - nodeIndexMap[stair[j]['target']];

            //console.log(sourceDifference)
            //console.log(targetDifference)


            const stepSize = Math.abs(sourceDifference + targetDifference)
            // should always be negative but absolute value to be sure that all are same
            stepSizes.push(stepSize)
            const deviation = Math.abs(stepSize - optimalStepSize); // Ideal Step Size is 1
            sumOfDeviations += deviation;
            sumOfStepSizes += stepSize;


        }

        // calculate size of stair compared to node degree
        const StairSizeMetric = stair.length / degrees[commonNodeId]

        // Calculate Mean Deviation (MD)
        const meanStepSize = sumOfStepSizes / stepSizes.length;
        const meanDeviation = sumOfDeviations / stepSizes.length;


        // stuff for new formula
        let SquareError = Math.pow((stepSizes.length + 1) / degrees[commonNodeId], 2);
        let maxStepDist = Math.max(...stepSizes);
        let minStepDist = Math.min(...stepSizes);
        let numerator = 0


        // prepare values for Standard Deviation (SD) and Optimal Standard Deviation (OSD)

        // For a second standard deviation where we measure the deviation from the optimal average
        // similar to the optimal size in the mean deviation above, makes cross comparisons more viable
        stepSizes.forEach(stepSize => {
            sumOfSquaredDeviations += Math.pow(stepSize - meanStepSize, 2);
            sumOfSquaredOPTDeviations += Math.pow(stepSize - idealAvgSteps, 2);

            numerator += (maxStepDist - stepSize)
        });

        // Calculate Standard Deviation
        const variance = sumOfSquaredDeviations / stepSizes.length;
        const varianceToOPT = sumOfSquaredOPTDeviations / stepSizes.length;
        const standardDeviation = Math.sqrt(variance);
        const standardOPTDeviation = Math.sqrt(varianceToOPT);

        qualities.push([[StairSizeMetric], [meanDeviation, standardDeviation, standardOPTDeviation]]);


        let denominator = (stepSizes.length + 1) * (maxStepDist - minStepDist === 0) ? minStepDist : maxStepDist - minStepDist;

        singleStairGapAssessment.push(SquareError * (1 - (numerator / denominator)));
    });

    //qualities.push([singleStairGapAssessment.reduce((accumulator, currentValue) => accumulator + currentValue, 0)])
    return qualities;
}


/*
if (!global.runningMainScript) {
    console.log("this is a test run:");

    degrees = {}

    test_stairs = [
        [
            [
                {"id": 0, "source": 0, "target": 1},
                {"id": 1, "source": 0, "target": 2},
                {"id": 2, "source": 0, "target": 3},
            ],
            [
                {"id": 3, "source": 4, "target": 5},
                {"id": 4, "source": 4, "target": 6},
                {"id": 5, "source": 4, "target": 7},
                {"id": 6, "source": 4, "target": 8},
                {"id": 6, "source": 4, "target": 9},
            ],
            // first value always 1 since there are no other edges than the ones in the stairs for this test data!
            // all 0,0,0 for step-sizes [1,1] and [1,1,1,1], respectively, since they are optimal, for MD, SD, and OSD.
        ],
        [
            [
                {"id": 0, "source": 0, "target": 2},
                {"id": 1, "source": 0, "target": 4},
                {"id": 2, "source": 0, "target": 6},
            ],
            // 1,0,1 for step-sizes [2,2]
            // 1 MD means that on average the deviation from the optimal (step-size = 1) is 1 too large
            // 0 SD means that internally there is uniformity in the step sizes (not measured from the optimal)
            // 1 OSD means here that compared to the expected optimal value (where all step sizes are 1) we diverge on average 1 away,
            // similar to the MD result which also needs an optimal baseline (step-size = 1)
        ],
        [
            [
                {"id": 0, "source": 0, "target": 1},
                {"id": 1, "source": 0, "target": 2},
                {"id": 2, "source": 0, "target": 4},
            ],
            // 0.5,0.5, 0.707... for step-sizes [1,2]
            // 0.5 MD means that on average the deviation from the optimal (step-size = 1) is 0.5 away (1 out of 2 steps is too large)
            // 0.5 SD means that internally there is an average offset by 0.5 from the mean
            // 0.707 OSD means here that compared to the expected value (where all step sizes are 1) there is an average offset of 0.7 from the optimal mean
        ],
        [
            [
                {"id": 0, "source": 0, "target": 1},
                {"id": 1, "source": 0, "target": 2},
                {"id": 3, "source": 0, "target": 3},
                {"id": 4, "source": 0, "target": 4},
                {"id": 5, "source": 0, "target": 6},
            ],
            // 0.25, 0.433..., 0.5... for step-sizes [1,1,1,2]
            // 0.2 MD means that on average the deviation from the optimal (step-size = 1) is 0.25 away (1 out of 4 steps is too large by 1)
            // 0.433... SD means that internally there is an average offset by 0.433... from the mean
            // 0.5... OSD means here that compared to the expected value (where all step sizes are 1) there is an average offset of 0.5... from the optimal mean,
        ],
        [
            [
                {"id": 0, "source": 0, "target": 1},
                {"id": 1, "source": 0, "target": 2},
                {"id": 3, "source": 0, "target": 3},
                {"id": 4, "source": 0, "target": 5},
                {"id": 5, "source": 0, "target": 7},
            ],
            // 0.5, 0.5..., 0.707... for [1,1,2,2] // similar to before but step sizes are more equally distributed
            // explanations like two above, we get the same result since relative deviations haven't changed
        ],
        [
            [
                {"id": 0, "source": 0, "target": 1},
                {"id": 1, "source": 0, "target": 2},
                {"id": 3, "source": 0, "target": 3},
                {"id": 4, "source": 0, "target": 5},
                {"id": 5, "source": 0, "target": 7},
                {"id": 5, "source": 0, "target": 9},
            ],
            // 0.6, 0.489..., 0.774... for [1,1,2,2,2]
            // Here we added one more sub-optimal step, which locally improves (SD decreases) but OSD jumps up.
        ],
        [
            [
                {"id": 0, "source": 0, "target": 1},
                {"id": 1, "source": 0, "target": 2},
                {"id": 3, "source": 0, "target": 3},
                {"id": 4, "source": 0, "target": 4},
                {"id": 5, "source": 0, "target": 5},
                {"id": 5, "source": 0, "target": 6},
                {"id": 5, "source": 0, "target": 7},
                {"id": 5, "source": 0, "target": 8},
                {"id": 5, "source": 0, "target": 10},
            ],
            // 0.125, 0.330..., 0.353... for [1,1,1,1,1,1,1,2]
            // Lastly, we show how much deviation from the optimal mean we get by having only one step with a larger difference.
            // all values appear better than before (closer to 0), which makes intuitive sense, since the outlier is not bad on average
        ],
        [
            [
                {"id": 0, "source": 0, "target": 1},
                {"id": 1, "source": 0, "target": 2},
                {"id": 3, "source": 0, "target": 3},
                {"id": 4, "source": 0, "target": 4},
                {"id": 5, "source": 0, "target": 5},
                {"id": 5, "source": 0, "target": 6},
                {"id": 5, "source": 0, "target": 7},
                {"id": 5, "source": 0, "target": 8},
                {"id": 5, "source": 0, "target": 20},
            ],
            // 1.375, 3.637..., 3.889...
            // Adding even more distance we see the averages get diluted by the outlier
        ],
    ];

    // TODO: work out metric for all stairs in a graph not just for individual ones

    // TODO maybe add some quality focused on continuation so having a larger step in the middle is worse than at the end?


    test_stairs.forEach(config => {
        degrees = {} // reset degrees
        config.forEach(stair => {
            stair.forEach(edge => {
                degrees[edge.source] = (degrees[edge.source] || 0) + 1;
                degrees[edge.target] = (degrees[edge.target] || 0) + 1;
            });
        });
        let nodes = Object.keys(degrees).map(x => parseInt(x, 10)); // extract nodes
        let results = getQualityOfStairs(config, nodes);
        console.log(results);
    });


}
 */




