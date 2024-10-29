// initialize a class with exports called options
let options = { 
    solver_in_use: "gurobi",
    
    timeout_value: 10,

    solve_split: false,
    solve_adjacency: false,
}

try{ exports.options = options; } catch(e){} // for node.js