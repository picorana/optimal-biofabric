let fs = require('fs');
eval(fs.readFileSync('js/util.js')+'');
// eval(fs.readFileSync('js/lp_triplets.js')+'');
var exec = require('child_process').exec, child;
let Biofabric_lp = require('./biofabric_lp.js'); 
let sortByDegree = require('./heuristics.js').sortByDegree;
let sortForStaircases = require('./heuristics.js').sortForStaircases;

// import options.js
let options = require('./options.js').options;

let solver_in_use = "gurobi"; // gurobi or glpk

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

async function solve_one_graph(file, i){
    let startTime = new Date().getTime()
    if (solver_in_use == "glpk"){
        let { stdout } = await sh("glpsol --lp ./lp_problems/" + file.replace("json", "lp") + " --cuts --tmlim 10 -o ./lp_solutions/" + file.replace(".json", ".sol"))
    } else if (solver_in_use == "gurobi"){
        let { stdout } = await sh("gurobi_cl TimeLimit=" + options.timeout_value + " ResultFile=./lp_solutions/" + file.replace("json", "sol") + " LogFile=./lp_solutions/" + file.replace("json", "log") + " ./lp_problems/" + file.replace("json", "lp"))
    }
    console.log("Time to solve (" + i + ") " , file, new Date().getTime() - startTime)
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
    let minnodenumber = 10;
    let maxfiles = 10;

    // list all files in the directory
    let files = fs.readdirSync("data/rome-lib").filter(f => f.includes(".json") && parseInt(f.split(".")[1]) <= maxnodenumber
        && parseInt(f.split(".")[1]) >= minnodenumber).slice(0, maxfiles);

    // filter out grafo1.json
    // files = files.filter(f => f.includes("grafo1021.14.json"))
    files = files.filter(f => f.includes("grafo1001.12"))
    // files = files.filter(f => f.includes(".11"))


    // files is now an array. Write the array to file (rome_lib_filenames.js) in the data folder starting with "let filenames = ["
    let filestring = "let filenames = [\n"
    for (let file of files){
        filestring += "'" + file + "', "
    }
    filestring = filestring.slice(0, filestring.length - 2) + "]\n"
    fs.writeFileSync("data/rome_lib_filenames.js", filestring, () => {});

    if (options.solve_split) solve_split_problem(files)
    else if (options.solve_adjacency) solve_adjacency_problem(files)
    else solve_entire_problem(files)
}

async function solve_entire_problem(files){
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
        await solve_one_graph(file, files.indexOf(file));
        times[file] = new Date().getTime() - startTime;
        fs.writeFileSync('lp_solutions/result_times.json', JSON.stringify(times), () => {});
    }
}

async function solve_split_problem(files){
    // solve for runways
    for (let file of files){
        let graph = JSON.parse(fs.readFileSync("data/rome-lib/" + file));
        
        // note: the heuristic solution here should help improve time to solve ILP.
        sortByDegree(graph.nodes, graph.links)
        // sortForStaircases(graph.nodes, graph.links)
        // end of heuristic solution

        let lp = new Biofabric_lp(graph);
        lp.makeModelRunways();
        fs.writeFileSync("./lp_problems/" + file.replace("json", "lp"), lp.writeForGLPK(), function(err){
            if (err) return console.log(err);
        });
    }

    // create dictionary of elapsed times
    let times = {};

    // write all solutions
    for (let file of files){
        let startTime = new Date().getTime()
        await solve_one_graph(file, files.indexOf(file));
        times[file] = new Date().getTime() - startTime;
        fs.writeFileSync('lp_solutions/result_times.json', JSON.stringify(times), () => {});
    }
}

async function solve_adjacency_problem(files){
    // solve for runways
    for (let file of files){
        let graph = JSON.parse(fs.readFileSync("data/rome-lib/" + file));
        
        // note: the heuristic solution here should help improve time to solve ILP.
        sortByDegree(graph.nodes, graph.links)
        // sortForStaircases(graph.nodes, graph.links)
        // end of heuristic solution

        let lp = new Biofabric_lp(graph);
        lp.makeModelAdjacency();
        fs.writeFileSync("./lp_problems/" + file.replace("json", "lp"), lp.writeForGLPK(), function(err){
            if (err) return console.log(err);
        });
    }

    // create dictionary of elapsed times
    let times = {};

    // write all solutions
    for (let file of files){
        let startTime = new Date().getTime()
        await solve_one_graph(file, files.indexOf(file));
        times[file] = new Date().getTime() - startTime;
        fs.writeFileSync('lp_solutions/result_times.json', JSON.stringify(times), () => {});
    }
}

init();
