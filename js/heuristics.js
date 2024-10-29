function sortForStaircases(nodes, edges) {
    // node ordering already applied at this step
    let ordered = nodes.map(x => x.id);

    // get ordering on degree
    let sorted = JSON.parse(JSON.stringify(nodes));
    sortByDegree(sorted, edges);
    let degrees = sorted.map(x => x.id)

    edges.sort((a, b) => {
        // sort edges according to degree
        let node_a = degrees.indexOf(a.source) < degrees.indexOf(a.target) ? a.source : a.target;
        let other_a = degrees.indexOf(a.source) < degrees.indexOf(a.target) ? a.target : a.source;
        let degree_a = degrees.indexOf(node_a);
        let node_b = degrees.indexOf(b.source) < degrees.indexOf(b.target) ? b.source : b.target;
        let other_b = degrees.indexOf(b.source) < degrees.indexOf(b.target) ? b.target : b.source;
        let degree_b = degrees.indexOf(node_b);
        if (degree_a > degree_b) {
            return 1;
        } else if (degree_b > degree_a) {
            return -1;
        } else {
            // sort edges according to length
            let length_a = ordered.indexOf(other_a) - ordered.indexOf(node_a);
            let length_b = ordered.indexOf(other_b) - ordered.indexOf(node_b);
            if (length_a > length_b) {
                return 1;
            } else if (length_b > length_a) {
                return -1;
            } else {
                return 0;
            }
        }
    });
}

function sortByDegree(nodes, edges) {
    nodes.sort(function (a, b) {
        let count = function (id) {
            return edges.filter(e => e.source === id || e.target === id).length;
        };
        return (count(a.id) < count(b.id)) ? 1 : (count(b.id) < count(a.id) ? -1 : 0);
    });
}

try {
    module.exports = {
        sortForStaircases,
        sortByDegree
    }
} catch (e) {
}