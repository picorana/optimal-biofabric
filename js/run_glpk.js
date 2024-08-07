let fs = require('fs');
eval(fs.readFileSync('js/util.js')+'');
var exec = require('child_process').exec, child;
let Biofabric_lp = require('./biofabric_lp.js'); 

let solver_in_use = "gurobi"; // gurobi or glpk

async function load_data(){
    let graph = await JSON.parse(fs.readFileSync("data/grafo2700.25.json"));
    graph.nodes = graph.nodes.slice(0, 14)
    let nodemap = graph.nodes.map(n => n.id)
    graph.links = graph.links.filter(l => nodemap.includes(l.source) && nodemap.includes(l.target))
    return graph;
}

async function sh(cmd) {
    return new Promise(function (resolve, reject) {
      exec(cmd, (err, stdout, stderr) => {
        if (err) {
          reject(err);
        } else {
          resolve({ stdout, stderr });
        }
      });
    });
}

async function solve_one_graph(file){
    let startTime = new Date().getTime()
    if (solver_in_use == "glpk"){
        let { stdout } = await sh("glpsol --lp ./lp_problems/" + file.replace("json", "lp") + " --cuts --tmlim 10 -o ./lp_solutions/" + file.replace(".json", ".sol"))
    } else if (solver_in_use == "gurobi"){
        let { stdout } = await sh("gurobi_cl TimeLimit=100 ResultFile=./lp_solutions/" + file.replace("json", "sol") + " LogFile=./lp_solutions/" + file.replace("json", "log") + " ./lp_problems/" + file.replace("json", "lp"))
    }
    console.log("Time to solve ", file, new Date().getTime() - startTime)
}

function cleanup(){
    fs.rmdirSync("./lp_problems", { recursive: true })
    fs.rmdirSync("./lp_solutions", { recursive: true })

    fs.mkdirSync("./lp_problems")
    fs.mkdirSync("./lp_solutions")
}

async function init(){
    cleanup();

    let maxnodenumber = 30;
    let minnodenumber = 30;
    let maxfiles = 3;

    // list all files in the directory
    let files = fs.readdirSync("data/rome-lib").filter(f => f.includes(".json") && parseInt(f.split(".")[1]) <= maxnodenumber
        && parseInt(f.split(".")[1]) >= minnodenumber).slice(0, maxfiles);

    // filter out grafo1.json
    files = files.filter(f => !f.includes("1013.15"))

    // files is now an array. Write the array to file (rome_lib_filenames.js) in the data folder starting with "let filenames = ["
    let filestring = "let filenames = [\n"
    for (let file of files){
        filestring += "'" + file + "', "
    }
    filestring = filestring.slice(0, filestring.length - 2) + "]\n"
    fs.writeFileSync("data/rome_lib_filenames.js", filestring, () => {});

    // write all problems
    for (let file of files){
        let graph = await JSON.parse(fs.readFileSync("data/rome-lib/" + file));
        let nodemap = graph.nodes.map(n => n.id)
        graph.links = graph.links.filter(l => nodemap.includes(l.source) && nodemap.includes(l.target))
        let lp = new Biofabric_lp(graph);
        lp.makeModel();
        await fs.writeFile("./lp_problems/" + file.replace("json", "lp"), lp.writeForGLPK(), function(err){
            if (err) return console.log(err);
        });
    }

    // create dictionary of elapsed times
    let times = {};

    // write all solutions
    for (let file of files){
        let startTime = new Date().getTime()
        await solve_one_graph(file);
        times[file] = new Date().getTime() - startTime;
    }

    // write dictionary to json file
    let resultstring = JSON.stringify(times)
    fs.writeFileSync('lp_solutions/result_times.json', resultstring, () => {});
}

init();

// OLD FUNCTIONS

function genRandomQueryVisGraphs(i, depth=3, tableDistribution=[2, 3], seed="hello."){
    let gen = new GraphGenerator(depth, seed, tableDistribution)
    let g = gen.generate()

    g.setExactWeights()
    g.sortGraph()

    let g2 = new SimpleGraph()

    for (let table of g.tables){
        let groupNodes = []
        for (let attr of table.attributes){
            let n = {depth: table.depth, name: attr.name, id: attr.name}
            g2.addNode(n);
            groupNodes.push(n);
        }
        g2.addGroup({nodes: groupNodes, id: table.name})
    }

    for (let edge of g.edges){
        let n1 = g2.nodes.find(n => n.id == edge.att1.name)
        let n2 = g2.nodes.find(n => n.id == edge.att2.name)
        g2.addEdge({nodes: [n1, n2]})
    }

    let algorithm = new SimpleLp(g2)
    algorithm.verbose = false;
    algorithm.options.bendiness_reduction_active = false;
    algorithm.options.simplify_for_groups_enabled = true;
    algorithm.makeModel();

    let filename = "./gurobi_problems/" + i + ".lp"
    filenames.push(filename);
    fs.writeFile(filename, algorithm.writeForGurobi(), function(err){
        if (err) return console.log(err);
    });

    return g2;
}

function buildGraphFromTextFile (text, doAddGroups, bendiness_reduction_active = false) {
    let g = new SimpleGraph();

    for (let n of text.split("#")[0].split('\n')){
        if (n.split(' ')[0] == '') continue;
        g.addNode({depth: 0, name: 'u' + n.split(' ')[0]})
    }

    for (let e of text.split("#")[1].split('\n')){
        if (e.split(" ").length < 4) continue;
        let n1 = g.nodes.find(n => n.id == 'u' + e.split(' ')[2])
        let n2 = g.nodes.find(n => n.id == 'u' + e.split(' ')[3].replace("\r", ""))

        if (n1 == undefined || n2 == undefined) continue;

        g.addEdge({nodes: [n1, n2]});
    }

    let moveToDepth = (node, newDepth) => {
        g.nodeIndex[node.depth].splice(g.nodeIndex[node.depth].indexOf(node), 1);
        node.depth = newDepth;
        while (g.nodeIndex.length <= node.depth) g.nodeIndex.push([]);
        g.nodeIndex[node.depth].push(node);
    }

    startnode = g.nodes.find(n => n.id == "u1");
    startnode.visited = true;
    curIndex = 0;
    while(g.nodeIndex[curIndex] != undefined){
        if (curIndex == 0){
            for (let node of g.nodes){
                if (node == startnode) continue;
                moveToDepth(node, node.depth + 1)
            }
        } else {
            let edgeSet = g.edges.filter(e => (e.nodes[0].depth < curIndex && e.nodes[1].depth == curIndex) || (e.nodes[1].depth < curIndex && e.nodes[0].depth == curIndex))
            let nodeSet = g.nodeIndex[curIndex].filter(n => edgeSet.find(e => e.nodes[0] == n || e.nodes[1] == n) == undefined)
            for (let node of nodeSet){
                moveToDepth(node, node.depth+1)
            }
        }
        curIndex++;
        // if (curIndex == 10) break;
    }

    for (let edge of g.edges){
        if (edge.nodes[0].depth > edge.nodes[1].depth){
            edge.nodes = [edge.nodes[1], edge.nodes[0]];
        }
    }

    g.addAnchors();
    if (doAddGroups) addGroups(g);
    if (doAddGroups && !bendiness_reduction_active) g.addAnchors();
    return g;
}

async function readRomeLib (i, filename, doAddGroups, bendiness_reduction_active, simplify_for_groups_enabled) {
    let text = fs.readFileSync(filename, 'utf-8')
    let g = buildGraphFromTextFile(text, doAddGroups, bendiness_reduction_active);

    let algorithm = new SimpleLp(g);
    algorithm.verbose = false;
    algorithm.options.bendiness_reduction_active = bendiness_reduction_active;
    algorithm.options.simplify_for_groups_enabled = simplify_for_groups_enabled;
    algorithm.makeModel();

    if (algorithm.model.subjectTo.includes("empty")) console.log(filename)
    // console.log("num nodes: " + g.nodes.length, "num edges: " + g.edges.length, "num vars: " + algorithm.model.bounds.split("\n").length, "num constraints: " + algorithm.model.subjectTo.split("\n").length)

    let fname = "./gurobi_problems/" + i + ".lp"
    fs.writeFileSync(fname, algorithm.writeForGurobi(), function(err){
        if (err) return console.log(err);
    });

    return g;
}

async function mainQueryVis() {

    let startseed = "hello."
    let rng = new Math.seedrandom(startseed);
    let numattempts = 1;

    // clean logs
    let basepath = "./gurobi_solutions/"
    // let basepath = "benchmarks/Rome-Lib/graficon10nodi/"

    for (let i=0; i<numattempts; i++){
        fs.writeFile(basepath + i + ".log", "", function(err){
            if (err) return console.log(err);
        });
    }

    for (let i=0; i<numattempts; i++){
        let graph = genRandomQueryVisGraphs(i, 6, [6, 10], genRandomSeed(5, rng));
        console.log("created graph " + i + " with " + graph.nodes.length + " nodes, " + graph.edges.length + " edges and " + graph.groups.length + " groups.");
    }

    for (let i=0; i<numattempts; i++){
        let { stdout } = await sh("gurobi_cl ResultFile=./gurobi_solutions/" + i + ".sol LogFile=./gurobi_solutions/" + i + ".log ./gurobi_problems/" + i + ".lp")
    }

    let times = [];

    for (let i=0; i<numattempts; i++){
        let data = fs.readFileSync(basepath + i + ".log", 'utf-8')

        const content = data.split('\n');
        let resultLine = content.find(l => l.includes("Explored"));
        let resultTime = parseFloat(resultLine.split(" ")[7]);
        times.push(resultTime)
    
        console.log(resultTime);
        
    }

    console.log("average: " + times.reduce((a, b) => a + b, 0)/numattempts)
}

async function testRomeLib(testname, doAddGroups, bendiness_reduction_active, simplify_for_groups_enabled, maxfilesPerNum = 10, timeout = 100, bounds=[10, 81]){
    cleanup();

    for (let num=bounds[0]; num<bounds[1]; num+=10){
        let basepath = "benchmarks/Rome-Lib/graficon" + num + "nodi/"
        var files = fs.readdirSync(basepath);
    
        for (let i=0; i<files.length; i++){
            let graph = await Promise.resolve(readRomeLib(num + "_" + i, basepath + files[i], doAddGroups, bendiness_reduction_active, simplify_for_groups_enabled));
            if (i>maxfilesPerNum) break;
            if (i%100 == 0) console.log("created graph " + (num + "_" + i) + " with " + graph.nodes.length + " nodes, " + graph.edges.length + " edges and " + graph.groups.length + " groups.");
        }

        for (let i=0; i<files.length; i++){
            if (i%100 == 0) console.log("solving " + num + "_" + i)
            if (i>maxfilesPerNum) break;
            let { stdout } = await sh("gurobi_cl TimeLimit=" + timeout + " ResultFile=./gurobi_solutions/" + (num + "_" + i) + ".sol LogFile=./gurobi_solutions/" + (num + "_" + i) + ".log ./gurobi_problems/" + (num + "_" + i) + ".lp")
        }
    }

    let times = {};

    for (let file of fs.readdirSync("./gurobi_solutions/")){
        if (!file.includes(".log")) continue;

        let data = fs.readFileSync("./gurobi_solutions/" + file, 'utf-8')

        const content = data.split('\n');
        let resultLine = content.find(l => l.includes("Explored"));
        if (resultLine == undefined) {
            resultLine = content.find(l => l.includes("Solved"));
            resultTime = parseFloat(resultLine.split(" ")[5]);
        } else resultTime = parseFloat(resultLine.split(" ")[7]);
        let errorLine = content.find(l => l.includes("infeasible"))
        if (errorLine != undefined) console.log("ERROR: ", file, "is infeasible")
        // console.log(resultLine)

        let n = file.split("_")[0]
        if (times[n] == undefined) times[n] = [];
        times[n].push(resultTime)
        // console.log(file + ":" + resultTime);
    }

    let resultstring = JSON.stringify(times)
    fs.writeFileSync('result_times_' + testname + '.json', resultstring, () => {});
}

async function mainRomeLib(){
    // testRomeLib('nogroups_mincrossing', false, false, false, 10, 10, [10, 81])
    // testRomeLib('nogroups_minbendiness', false, true, false, 10, 10, [10, 81])
    // testRomeLib('groups_nocollapse_mincrossing', true, false, false, 10, 10, [10, 81])
    // testRomeLib('groups_nocollapse_minbendiness', true, true, false, 10, 10, [10, 81])
    testRomeLib('groups_collapse_mincrossing', true, false, true, 10, 50, [10, 101])
    // testRomeLib('groups_collapse_minbendiness', true, true, true, 10, 10, [10, 81])


    // testRomeLib('nogroups_mincrossing_big', false, false, false, 25, 180, [10, 101])
    // testRomeLib('nogroups_minbendiness_big', false, true, false, 25, 180, [10, 101])
    // testRomeLib('groups_nocollapse_mincrossing_big2', true, false, false, 25, 180, [70, 81])
    // testRomeLib('groups_nocollapse_minbendiness_big', true, true, false, 25, 180, [10, 101])
    // testRomeLib('groups_collapse_mincrossing_big2', true, false, true, 25, 180, [10, 101])
    // testRomeLib('groups_collapse_minbendiness_big', true, true, true, 25, 180, [10, 101])
}

function printResults(){
    function getAvg(grades) {
        const total = grades.reduce((acc, c) => acc + c, 0);
        return total / grades.length;
    }

    const median = arr => {
        const mid = Math.floor(arr.length / 2),
          nums = [...arr].sort((a, b) => a - b);
        return arr.length % 2 !== 0 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
      };

    const printData = (d1) => {
        for (let elem in d1){
            tmp = d1[elem].filter(n => n < 180) 
            console.log(elem + ' nodes: ' + getAvg(tmp))
            console.log('percent unsolved: ', d1[elem].filter(n => n>=100).length / d1[elem].length)
        }
    }

    console.log("No groups, min crossing")
    let d1 = fs.readFileSync('result_times_nogroups_mincrossing_big2.json', 'utf-8')
    d1 = JSON.parse(d1);
    printData(d1)

    console.log("\nNo groups, min bendiness")
    d2 = fs.readFileSync('result_times_nogroups_minbendiness_big.json', 'utf-8')
    d2 = JSON.parse(d2);
    printData(d2)

    console.log("\nGroups, no collapse, min crossing")
    d3 = fs.readFileSync('result_times_groups_nocollapse_mincrossing_big.json', 'utf-8')
    d3 = JSON.parse(d3);
    printData(d3)

    console.log("\nGroups, no collapse, min bendiness")
    d4 = fs.readFileSync('result_times_groups_nocollapse_minbendiness_big.json', 'utf-8')
    d4 = JSON.parse(d4);
    printData(d4)

    console.log("\nGroups, collapse, min crossing")
    d5 = fs.readFileSync('result_times_groups_collapse_mincrossing_big.json', 'utf-8')
    d5 = JSON.parse(d5);
    printData(d5)

    console.log("\nGroups, collapse, min bendiness")
    d6 = fs.readFileSync('result_times_groups_collapse_minbendiness_big.json', 'utf-8')
    d6 = JSON.parse(d6);
    printData(d6)

    let addStats = (el) => {
        let s = ""
        if (el != undefined) {
            if (el.filter(n => n < 180).length != 0) s += (Math.round(median(el.filter(n => n < 180))*100)/100) + "\t& "
            else s += "-\t&"
            if (el.filter(n => n>=180).length != 0)
                s += (Math.round((el.filter(n => n>=180).length/el.length)*100)) + "\\%\t& "
            else s+= "\t&"
        }
        else s += "\t&\t& "
        return s;
    }

    console.log("\n")
    for (let i=10; i<101; i+=10){
        let stres = i + "\t& "
        stres += addStats(d1[i])
        stres += addStats(d2[i])
        stres += addStats(d3[i])
        stres += addStats(d4[i])
        stres += addStats(d5[i])
        stres += addStats(d6[i])
        
        console.log(stres.slice(0, stres.length - 2) + "\\\\")
    }
}

function convertRomeLib(){
    let bounds=[10, 101]
    let maxfilesPerNum = 25;

    for (let num=bounds[0]; num<bounds[1]; num+=1){
        let basepath = "benchmarks/Rome-Lib/graficon" + num + "nodi/"
        let writepath = "benchmarks/Rome-Lib-New/"
        var files = fs.readdirSync(basepath);
    
        for (let i=0; i<files.length; i++){
            // if (i>maxfilesPerNum) break;
            let addGroups = true;
            let text = fs.readFileSync(basepath + files[i], 'utf-8')
            let g = buildGraphFromTextFile(text, addGroups, true);

            let nres = {"nodes":[], "edges":[]}
            for (let node of g.nodes){
                nres["nodes"].push({"id": node.id, "depth": parseFloat(node.depth)})
            }
            for (let edge of g.edges){
                nres["edges"].push({"nodes": [edge.nodes[0].id, edge.nodes[1].id]})
            }
            if (addGroups){
                nres["groups"] = []
                for (let group of g.groups){
                    nres["groups"].push({"id": group.id, "nodes": group.nodes.map(n => n.id)})
                }
            }
            
            let rr = JSON.stringify(nres, null, 4);

            fs.mkdirSync(writepath + "full_set/" + num + "nodes/", { recursive: true })

            let fname = writepath + "full_set/" + num + "nodes/" + files[i] + ".json"
            fs.writeFileSync(fname, rr, {encoding:'utf8',flag:'w'}, function(err){
                if (err) return console.log(err);
            });
        }
    }
}

function printOneModel(nodenum, modelnum){
    let basepath = "benchmarks/Rome-Lib/graficon" + nodenum + "nodi/"
    var files = fs.readdirSync(basepath);

    for (let i=0; i<files.length; i++){
        if (i == modelnum) {
            let text = fs.readFileSync(basepath + files[i], 'utf-8')
            let g = buildGraphFromTextFile(text, true);
            let algorithm = new SimpleLp(g);
            algorithm.verbose = false;
            algorithm.options.bendiness_reduction_active = false;
            algorithm.options.simplify_for_groups_enabled = true;
            algorithm.makeModel();
            // console.log(algorithm)
            console.log("num nodes: " + g.nodes.length, "num edges: " + g.edges.length, "num vars: " + algorithm.model.bounds.split("\n").length, "num constraints: " + algorithm.model.subjectTo.split("\n").length)
        }
    }
}

// printOneModel(80, 0);
// mainRomeLib();
// printResults();
// convertRomeLib();
  