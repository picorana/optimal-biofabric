class Biofabric_lp{
    constructor(graph){
        this.g = graph;
        this.model = {};
        this.m = 50;
        this.zcount = 0;
        this.verbose = true;
        this.mip = true;

        this.mode = "triplets";

        // remove edge with id 17
        // this.g.links = this.g.links.filter(e => e.id != 17)
    }

    async arrange(){
        this.startTime = new Date().getTime()

        this.makeModel()

        let startTime2 = new Date().getTime()
        
        this.solve()

        this.elapsedTime = new Date().getTime() - this.startTime;
        this.solveTime = new Date().getTime() - startTime2;

        console.log(this.solveTime, this.modelToString(this.model), this.result)
    }

    makeModel(){
        this.fillModel()

        if (this.model.objective_function.length <= 10) {
            this.model.objective_function = this.model.objective_function.substring(0, this.model.objective_function.length - 1)
            this.model.objective_function += 'empty\n\n';
        }

        if (this.model.subjectTo.length <= 12) {
            this.model.subjectTo += 'empty = 1\n';
        }
    }

    fillModel(){
        if (this.mode == "triplets") this.fillModelTriplets();
        else this.fillModelPairs();
    }

    fillModelTriplets(){
        this.model.objective_function = "Maximize \n"
        this.model.subjectTo = "Subject To \n"
        this.model.bounds = "\nBounds \n"

        let added_xvars = []
        let added_cvars = []

        // find redundant edges: edges that can't participate in a staircase because they are not connected to a node with degree > 2
        let redundant_edges = this.g.links.filter(e => {
            let source_degree = this.g.links.filter(l => l.source == e.source || l.target == e.source).length
            let target_degree = this.g.links.filter(l => l.source == e.target || l.target == e.target).length
            return source_degree < 3 && target_degree < 3
        })
        // compute the opposite of the redundant edges: the non-redundant ones
        this.g.links = this.g.links.filter(e => !redundant_edges.includes(e))

        // add definition of variables on x
        for (let i = 0; i < this.g.links.length - 1; i++){
            for (let j = i + 1; j < this.g.links.length; j++){
                let a = "e" + this.g.links[i].id
                let b = "e" + this.g.links[j].id
                let x_ab = "x_" + a + b
                this.model.bounds += "binary " + x_ab + "\n"
                added_xvars.push(x_ab)
            }
        }

        // add definition of variables on y
        for (let i = 0; i < this.g.nodes.length - 1; i++){
            for (let j = i + 1; j < this.g.nodes.length; j++){
                let a = "n" + this.g.nodes[i].id
                let b = "n" + this.g.nodes[j].id
                let y_ab = "y_" + a + b
                this.model.bounds += "binary " + y_ab + "\n"
                added_xvars.push(y_ab)
            }
        }

        // add transitivity constraints on x
        for (let i = 0; i < this.g.links.length - 2; i++){
            for (let j = i + 1; j < this.g.links.length - 1; j++){
              for (let k = j + 1; k < this.g.links.length; k++){
                let x_ab = "x_e" + this.g.links[i].id + "e" + this.g.links[j].id
                let x_bc = "x_e" + this.g.links[j].id + "e" + this.g.links[k].id
                let x_ac = "x_e" + this.g.links[i].id + "e" + this.g.links[k].id
                // check that all these exist
                if (!added_xvars.includes(x_ab)) console.warn(x_ab + " not found")
                if (!added_xvars.includes(x_bc)) console.warn(x_bc + " not found")
                if (!added_xvars.includes(x_ac)) console.warn(x_ac + " not found")

                //
                this.model.subjectTo += x_ab + " + " + x_bc + " - " + x_ac + " >= 0\n"
                this.model.subjectTo += "- " + x_ab + " - " + x_bc + " + " + x_ac + " >= - 1\n"
              }
            }
          }

        // add transitivity constraints on y
        for (let i = 0; i < this.g.nodes.length - 2; i++){
            for (let j = i + 1; j < this.g.nodes.length - 1; j++){
              for (let k = j + 1; k < this.g.nodes.length; k++){
                if (i == j || i == k || j == k) continue;
                
                let y_ab = "y_n" + this.g.nodes[i].id + "n" + this.g.nodes[j].id
                let y_bc = "y_n" + this.g.nodes[j].id + "n" + this.g.nodes[k].id
                let y_ac = "y_n" + this.g.nodes[i].id + "n" + this.g.nodes[k].id
                
                // check that all these exist
                if (!added_xvars.includes(y_ab)) console.warn(y_ab + " not found")
                if (!added_xvars.includes(y_bc)) console.warn(y_bc + " not found")
                if (!added_xvars.includes(y_ac)) console.warn(y_ac + " not found")

                this.model.subjectTo += y_ab + " + " + y_bc + " - " + y_ac + " >= 0\n"
                this.model.subjectTo += "- " + y_ab + " - " + y_bc + " + " + y_ac + " >= - 1\n"
              }
            }
          }

        // compute position of edges
        for (let e1 of this.g.links){
            let pos_e1 = "pos_e" + e1.id 
            let tmp_accumulator = this.g.links.length - 1;

            for (let e2 of this.g.links){
                if (e1 == e2) continue;
                let x_e1e2 = "x_e" + e1.id + "e" + e2.id
                
                
                if (!added_xvars.includes(x_e1e2)) {
                    pos_e1 += " - " + "x_e" + e2.id + "e" + e1.id
                    tmp_accumulator -= 1
                }
                else {
                    pos_e1 += " + " + x_e1e2
                }
            }
            this.model.subjectTo += pos_e1 + " = " + tmp_accumulator + "\n"
        }

        for (let n of this.g.nodes){
            let adjacent_edges = this.g.links.filter(e => e.source == n.id || e.target == n.id)
            if (adjacent_edges.length < 3) continue;
            for (let i = 0; i < adjacent_edges.length; i++){
                for (let j = 0; j < adjacent_edges.length; j++){
                    if (i == j) continue;

                    let edge1 = adjacent_edges[i]
                    let edge2 = adjacent_edges[j]

                    let z1 = "z_e" + edge1.id + "e" + edge2.id;

                    this.model.subjectTo += "pos_e" + edge2.id + " - pos_e" + edge1.id + " + " + this.m + " " + z1 + " <= " + (1 + this.m + 0.01) + "\n"
                    this.model.subjectTo += "pos_e" + edge2.id + " - pos_e" + edge1.id + " - " + this.m + " " + z1 + " >= " + (1 - this.m - 0.01) + "\n"
                    
                    this.model.bounds += "binary " + z1 + "\n"

                    this.model.subjectTo += "pos_e" + edge1.id + " <= " + this.g.links.length + "\n"
                    this.model.subjectTo += "pos_e" + edge2.id + " <= " + this.g.links.length + "\n"
                }
            }
        }

        // compute objective values
        for (let n of this.g.nodes){
            let adjacent_edges = this.g.links.filter(e => e.source == n.id || e.target == n.id)
            // can't be a staircase if the node has less than 3 neighbors
            if (adjacent_edges.length < 3) continue;

            for (let i = 0; i < adjacent_edges.length; i++){
                for (let j = i+1; j < adjacent_edges.length; j++){
                    for (let k = j+1; k < adjacent_edges.length; k++){
                        if (i == j || i == k || j == k) continue;

                        let edge1 = adjacent_edges[i]
                        let edge2 = adjacent_edges[j]
                        let edge3 = adjacent_edges[k]
                        let othernode1 = edge1.source == n.id ? edge1.target : edge1.source
                        let othernode2 = edge2.source == n.id ? edge2.target : edge2.source
                        let othernode3 = edge3.source == n.id ? edge3.target : edge3.source

                        let sorted_edge_ids = [edge1.id, edge2.id, edge3.id].sort((a, b) => a - b)

                        // let c = "c_e" + edge1.id + "e" + edge2.id + "e" + edge3.id;
                        let c = "c_n" + n.id + "_e" + sorted_edge_ids[0] + "_e" + sorted_edge_ids[1] + "_e" + sorted_edge_ids[2] + "_";
                        let z1 = "z_e" + sorted_edge_ids[0] + "e" + sorted_edge_ids[1];
                        let z2 = "z_e" + sorted_edge_ids[1] + "e" + sorted_edge_ids[2];
                        
                        let y_n1n2 = "y_n" + othernode1 + "n" + othernode2
                        let y_n2n3 = "y_n" + othernode2 + "n" + othernode3

                        let y_n2n1 = "y_n" + othernode2 + "n" + othernode1
                        let y_n3n2 = "y_n" + othernode3 + "n" + othernode2

                        added_cvars.push(c)

                        this.model.subjectTo += c + " - " + z1 + " <= 0\n"
                        this.model.subjectTo += c + " - " + z2 + " <= 0\n"

                        if (added_xvars.includes(y_n1n2) && added_xvars.includes(y_n2n3)) {
                            this.model.subjectTo += c + " - " + y_n1n2 + " <= 0\n"
                            this.model.subjectTo += c + " - " + y_n2n3 + " <= 0\n"
                            this.model.subjectTo += c 
                                + " - " + z1 
                                + " - " + z2 
                                + " - " + y_n1n2 
                                + " - " + y_n2n3
                                + " >= - 3\n"
                        } else if (!added_xvars.includes(y_n1n2) && added_xvars.includes(y_n2n3)) {
                            this.model.subjectTo += c + " + " + y_n2n1 + " <= 1\n"
                            this.model.subjectTo += c + " - " + y_n2n3 + " <= 0\n"

                            this.model.subjectTo += c 
                                + " - " + z1 
                                + " - " + z2 
                                + " + " + y_n2n1 
                                + " - " + y_n2n3
                                + " >= - 2\n"
                        } else if (added_xvars.includes(y_n1n2) && !added_xvars.includes(y_n2n3)) {
                            this.model.subjectTo += c + " - " + y_n1n2 + " <= 0\n"
                            this.model.subjectTo += c + " + " + y_n3n2 + " <= 1\n"

                            this.model.subjectTo += c 
                                + " - " + z1 
                                + " - " + z2 
                                + " - " + y_n1n2 
                                + " + " + y_n3n2
                                + " >= - 2\n"
                        } else {
                            this.model.subjectTo += c + " + " + y_n2n1 + " <= 1\n"
                            this.model.subjectTo += c + " + " + y_n3n2 + " <= 1\n"

                            this.model.subjectTo += c 
                                + " - " + z1 
                                + " - " + z2 
                                + " + " + y_n2n1 
                                + " + " + y_n3n2
                                + " >= - 1\n"
                        }

                        this.model.objective_function += c + " + "
                        this.model.bounds += "binary " + c + "\n"
                    
                    }
                }
            }
        }

        this.model.objective_function = this.model.objective_function.substring(0, this.model.objective_function.length - 2) + "\n\n"

        // every edge can participate in at most 2 staircases
        for (let e of this.g.links){
            let cvars = added_cvars.filter(c => c.includes("_e" + e.id + "_"))
            if (cvars.length == 0) continue;
            
            // get all triplets of cvars
            for (let i = 0; i < cvars.length - 2; i++){
                for (let j = i + 1; j < cvars.length - 1; j++){
                    for (let k = j + 1; k < cvars.length; k++){
                        this.model.subjectTo += cvars[i] + " + " + cvars[j] + " + " + cvars[k] + " <= 2\n"
                    }
                }
            }
        }

        // nodes that participate in a staircase and have a degree of 1 are free to move around and can be placed anywhere
        for (let node of this.g.nodes){
            // get node degree
            let degree = this.g.links.filter(e => e.source == node.id || e.target == node.id).length
            if (degree < 3) continue;
            // get all the node neighbors of the node in question
            let adjacent_edges = this.g.links.filter(e => e.source == node.id || e.target == node.id)

            // get the nodes at the other endpoint of these edges
            let neighbors = adjacent_edges.map(e => e.source == node.id ? e.target : e.source)
            
            // console.log(node.id, neighbors)
            // get three neighbors that either have a degree of 1
            let neighbors_to_consider = neighbors.filter(n => this.g.links.filter(e => e.source == n || e.target == n).length < 2)

            if (neighbors_to_consider.length < 3) continue;

            for (let i = 0; i < neighbors_to_consider.length - 2; i++){
                let edge_with_ni = adjacent_edges.filter(e => e.source == neighbors_to_consider[i] || e.target == neighbors_to_consider[i])[0]
                let edge_with_nj = adjacent_edges.filter(e => e.source == neighbors_to_consider[i + 1] || e.target == neighbors_to_consider[i + 1])[0]
                let edge_with_nk = adjacent_edges.filter(e => e.source == neighbors_to_consider[i + 2] || e.target == neighbors_to_consider[i + 2])[0]

                let c = "c_n" + node.id + "_e" + edge_with_ni.id + "_e" + edge_with_nj.id + "_e" + edge_with_nk.id + "_";
                this.model.subjectTo += c + " = 1\n"
            }
        }
    }

    fillModelPairs(){
        this.model.objective_function = "Maximize \n"
        this.model.subjectTo = "Subject To \n"
        this.model.bounds = "\nBounds \n"

        let added_xvars = []

        // add definition of variables on x
        for (let i = 0; i < this.g.links.length - 1; i++){
            for (let j = i + 1; j < this.g.links.length; j++){
            let a = "e" + this.g.links[i].id
            let b = "e" + this.g.links[j].id
            let x_ab = "x_" + a + b
            this.model.bounds += "binary " + x_ab + "\n"
            added_xvars.push(x_ab)
            }
        }

        // add definition of variables on y
        for (let i = 0; i < this.g.nodes.length - 1; i++){
            for (let j = i + 1; j < this.g.nodes.length; j++){
            let a = "n" + this.g.nodes[i].id
            let b = "n" + this.g.nodes[j].id
            let y_ab = "y_" + a + b
            this.model.bounds += "binary " + y_ab + "\n"
            added_xvars.push(y_ab)
            }
        }

        // add transitivity constraints on x
        for (let i = 0; i < this.g.links.length - 2; i++){
            for (let j = i + 1; j < this.g.links.length - 1; j++){
              for (let k = j + 1; k < this.g.links.length; k++){
                let x_ab = "x_e" + this.g.links[i].id + "e" + this.g.links[j].id
                let x_bc = "x_e" + this.g.links[j].id + "e" + this.g.links[k].id
                let x_ac = "x_e" + this.g.links[i].id + "e" + this.g.links[k].id
                // check that all these exist
                if (!added_xvars.includes(x_ab)) console.warn(x_ab + " not found")
                if (!added_xvars.includes(x_bc)) console.warn(x_bc + " not found")
                if (!added_xvars.includes(x_ac)) console.warn(x_ac + " not found")

                //
                this.model.subjectTo += x_ab + " + " + x_bc + " - " + x_ac + " >= 0\n"
                this.model.subjectTo += "- " + x_ab + " - " + x_bc + " + " + x_ac + " >= - 1\n"
              }
            }
          }

        // add transitivity constraints on y
        for (let i = 0; i < this.g.nodes.length - 2; i++){
            for (let j = i + 1; j < this.g.nodes.length - 1; j++){
              for (let k = j + 1; k < this.g.nodes.length; k++){
                let y_ab = "y_n" + this.g.nodes[i].id + "n" + this.g.nodes[j].id
                let y_bc = "y_n" + this.g.nodes[j].id + "n" + this.g.nodes[k].id
                let y_ac = "y_n" + this.g.nodes[i].id + "n" + this.g.nodes[k].id
                // check that all these exist
                if (!added_xvars.includes(y_ab)) console.warn(y_ab + " not found")
                if (!added_xvars.includes(y_bc)) console.warn(y_bc + " not found")
                if (!added_xvars.includes(y_ac)) console.warn(y_ac + " not found")

                //
                this.model.subjectTo += y_ab + " + " + y_bc + " - " + y_ac + " >= 0\n"
                this.model.subjectTo += "- " + y_ab + " - " + y_bc + " + " + y_ac + " >= - 1\n"
              }
            }
          }

        // compute position of edges
        for (let e1 of this.g.links){
            let pos_e1 = "pos_e" + e1.id 
            let tmp_accumulator = this.g.links.length - 1;

            for (let e2 of this.g.links){
                if (e1 == e2) continue;
                let x_e1e2 = "x_e" + e1.id + "e" + e2.id
                
                
                if (!added_xvars.includes(x_e1e2)) {
                    pos_e1 += " - " + "x_e" + e2.id + "e" + e1.id
                    tmp_accumulator -= 1
                }
                else {
                    pos_e1 += " + " + x_e1e2
                }
            }
            this.model.subjectTo += pos_e1 + " = " + tmp_accumulator + "\n"
        }

        // compute objective values
        for (let n of this.g.nodes){
            let adjacent_edges = this.g.links.filter(e => e.source == n.id || e.target == n.id)
            if (adjacent_edges.length < 3) continue;
            for (let i = 0; i < adjacent_edges.length; i++){
                for (let j = 0; j < adjacent_edges.length; j++){
                    if (i == j) continue;

                    let edge1 = adjacent_edges[i]
                    let edge2 = adjacent_edges[j]
                    let othernode1 = edge1.source == n.id ? edge1.target : edge1.source
                    let othernode2 = edge2.source == n.id ? edge2.target : edge2.source

                    let c = "c_e" + edge1.id + "e" + edge2.id;
                    let z = "z_e" + edge1.id + "e" + edge2.id;
                    
                    let y_n1n2 = "y_n" + othernode1 + "n" + othernode2
                    if (!added_xvars.includes(y_n1n2)) {

                    } else {
                        this.model.subjectTo += c + " - " + z + " <= 0\n"
                        this.model.subjectTo += c + " - " + y_n1n2 + " <= 0\n"
                        this.model.subjectTo += c + " - " + z + " - " + y_n1n2 + " >= -1\n"
                    }

                    this.model.objective_function += c + " + "

                    this.model.subjectTo += "pos_e" + edge2.id + " - pos_e" + edge1.id + " + " + this.m + " " + z + " <= " + (1 + this.m + 0.01) + "\n"
                    this.model.subjectTo += "pos_e" + edge2.id + " - pos_e" + edge1.id + " - " + this.m + " " + z + " >= " + (1 - this.m - 0.01) + "\n"

                    this.model.bounds += "binary " + c + "\n"
                    this.model.bounds += "binary " + z + "\n"

                    this.model.subjectTo += "pos_e" + edge1.id + " <= " + this.g.links.length + "\n"
                    // this.model.subjectTo += "pos_e" + edge1.id + " >= 0\n"
                    this.model.subjectTo += "pos_e" + edge2.id + " <= " + this.g.links.length + "\n"
                    // this.model.subjectTo += "pos_e" + edge2.id + " >= 0\n"
                }
            }
        }

        this.model.objective_function = this.model.objective_function.substring(0, this.model.objective_function.length - 2) + "\n\n"

        // console.log(this.modelToString(this.model))
    }

    solve(){
        let prob = this.modelToString(this.model)
        this.modelString = prob;

        this.result = {}
        let objective, i;

        if (this.verbose) glp_set_print_func(console.log);

        let lp = glp_create_prob();
        glp_read_lp_from_string(lp, null, prob);

        glp_scale_prob(lp, GLP_SF_AUTO);
            
        let smcp = new SMCP({presolve: GLP_ON});
        glp_simplex(lp, smcp);

        if (this.mip){
            glp_intopt(lp);
            objective = glp_mip_obj_val(lp);

            for(i = 1; i <= glp_get_num_cols(lp); i++){
                this.result[glp_get_col_name(lp, i)] = glp_mip_col_val(lp, i);
            }
        } else {
            objective = glp_get_obj_val(lp);
            for(i = 1; i <= glp_get_num_cols(lp); i++){
                this.result[glp_get_col_name(lp, i)] = glp_get_col_prim (lp, i);
            }
        }
    }

    makeModelRunways(){
        this.model.objective_function = "Maximize \n"
        this.model.subjectTo = "Subject To \n"
        this.model.bounds = "\nBounds \n"

        let added_xvars = []
        let added_cvars = []

        // find redundant edges: edges that can't participate in a staircase because they are not connected to a node with degree > 2
        let redundant_edges = this.g.links.filter(e => {
            let source_degree = this.g.links.filter(l => l.source == e.source || l.target == e.source).length
            let target_degree = this.g.links.filter(l => l.source == e.target || l.target == e.target).length
            return source_degree < 3 && target_degree < 3
        })
        // compute the opposite of the redundant edges: the non-redundant ones
        this.g.links = this.g.links.filter(e => !redundant_edges.includes(e))

        // add definition of variables on x
        for (let i = 0; i < this.g.links.length - 1; i++){
            for (let j = i + 1; j < this.g.links.length; j++){
            let a = "e" + this.g.links[i].id
            let b = "e" + this.g.links[j].id
            let x_ab = "x_" + a + b
            this.model.bounds += "binary " + x_ab + "\n"
            added_xvars.push(x_ab)
            }
        }

        // add transitivity constraints on x
        for (let i = 0; i < this.g.links.length - 2; i++){
            for (let j = i + 1; j < this.g.links.length - 1; j++){
                for (let k = j + 1; k < this.g.links.length; k++){
                let x_ab = "x_e" + this.g.links[i].id + "e" + this.g.links[j].id
                let x_bc = "x_e" + this.g.links[j].id + "e" + this.g.links[k].id
                let x_ac = "x_e" + this.g.links[i].id + "e" + this.g.links[k].id
                // check that all these exist
                if (!added_xvars.includes(x_ab)) console.warn(x_ab + " not found")
                if (!added_xvars.includes(x_bc)) console.warn(x_bc + " not found")
                if (!added_xvars.includes(x_ac)) console.warn(x_ac + " not found")

                //
                this.model.subjectTo += x_ab + " + " + x_bc + " - " + x_ac + " >= 0\n"
                this.model.subjectTo += "- " + x_ab + " - " + x_bc + " + " + x_ac + " >= - 1\n"
                }
            }
        }

        // compute position of edges
        for (let e1 of this.g.links){
            let pos_e1 = "pos_e" + e1.id 
            let tmp_accumulator = this.g.links.length - 1;

            for (let e2 of this.g.links){
                if (e1 == e2) continue;
                let x_e1e2 = "x_e" + e1.id + "e" + e2.id
                
                
                if (!added_xvars.includes(x_e1e2)) {
                    pos_e1 += " - " + "x_e" + e2.id + "e" + e1.id
                    tmp_accumulator -= 1
                }
                else {
                    pos_e1 += " + " + x_e1e2
                }
            }
            this.model.subjectTo += pos_e1 + " = " + tmp_accumulator + "\n"
        }

        // define the positions, that will be used to determine if two edges are adjacent (z)
        for (let n of this.g.nodes){
            let adjacent_edges = this.g.links.filter(e => e.source == n.id || e.target == n.id)
            if (adjacent_edges.length < 3) continue;
            for (let i = 0; i < adjacent_edges.length - 1; i++){
                for (let j = i + 1; j < adjacent_edges.length; j++){
                    if (i == j) continue;

                    let edge1 = adjacent_edges[i]
                    let edge2 = adjacent_edges[j]
                    let sorted_edge_ids = [edge1.id, edge2.id].sort((a, b) => a - b)

                    let z1 = "z_e" + sorted_edge_ids[0] + "e" + sorted_edge_ids[1];

                    this.model.subjectTo += "pos_e" + edge2.id + " - pos_e" + edge1.id + " + " + this.m + " " + z1 + " <= " + (1 + this.m + 0.01) + "\n"
                    this.model.subjectTo += "pos_e" + edge2.id + " - pos_e" + edge1.id + " - " + this.m + " " + z1 + " >= " + (- 1 - this.m - 0.01) + "\n"
                    
                    this.model.bounds += "binary " + z1 + "\n"
                }
            }
        }

        // bound the positions
        for (let e of this.g.links){
            this.model.subjectTo += "pos_e" + e.id + " <= " + this.g.links.length + "\n"
        }


        // compute objective values
        for (let n of this.g.nodes){
            let adjacent_edges = this.g.links.filter(e => e.source == n.id || e.target == n.id)
            // can't be a staircase if the node has less than 3 neighbors
            if (adjacent_edges.length < 3) continue;

            for (let i = 0; i < adjacent_edges.length; i++){
                for (let j = i+1; j < adjacent_edges.length; j++){
                    for (let k = j+1; k < adjacent_edges.length; k++){
                        if (i == j || i == k || j == k) continue;

                        let edge1 = adjacent_edges[i]
                        let edge2 = adjacent_edges[j]
                        let edge3 = adjacent_edges[k]

                        let sorted_edge_ids = [edge1.id, edge2.id, edge3.id].sort((a, b) => a - b)

                        let c = "c_n" + n.id + "_e" + sorted_edge_ids[0] + "_e" + sorted_edge_ids[1] + "_e" + sorted_edge_ids[2] + "_";
                        let z1 = "z_e" + sorted_edge_ids[0] + "e" + sorted_edge_ids[1];
                        let z2 = "z_e" + sorted_edge_ids[1] + "e" + sorted_edge_ids[2];

                        added_cvars.push(c)

                        this.model.subjectTo += c + " - " + z1 + " <= 0\n"
                        this.model.subjectTo += c + " - " + z2 + " <= 0\n"

                        this.model.subjectTo += c 
                            + " - " + z1 
                            + " - " + z2 
                            + " >= - 1\n"

                        this.model.objective_function += c + " + "
                        this.model.bounds += "binary " + c + "\n"
                    
                    }
                }
            }
        }

        // // every edge can participate in at most 2 staircases
        // for (let e of this.g.links){
        //     let cvars = added_cvars.filter(c => c.includes("_e" + e.id + "_"))
        //     if (cvars.length == 0) continue;
            
        //     // get all triplets of cvars
        //     for (let i = 0; i < cvars.length - 2; i++){
        //         for (let j = i + 1; j < cvars.length - 1; j++){
        //             for (let k = j + 1; k < cvars.length; k++){
        //                 this.model.subjectTo += cvars[i] + " + " + cvars[j] + " + " + cvars[k] + " <= 2\n"
        //             }
        //         }
        //     }
        // }

        // // if a node has only one neighbor of degree 3, then one of the edges that doesn't
        // // connect to the neighbor might be placed at the beginning of the visualization
        // for (let node of this.g.nodes){
        //     let adjacent_edges = this.g.links.filter(e => e.source == node.id || e.target == node.id)
        //     if (adjacent_edges.length < 3) continue;
        //     let neighbors = adjacent_edges.map(e => e.source == node.id ? e.target : e.source)
        //     let neighbors_to_consider = neighbors.filter(n => this.g.links.filter(e => e.source == n || e.target == n).length < 3)
        //     if (neighbors_to_consider.length == 1){
        //         let edge = adjacent_edges.filter(e => e.source == neighbors_to_consider[0] || e.target == neighbors_to_consider[0])[0]
        //         this.model.subjectTo += "pos_e" + edge.id + " = 0\n"
        //         break;
        //     }
        // }

        // // nodes that participate in a staircase and have a degree of 1 are free to move around and can be placed anywhere
        // for (let node of this.g.nodes){
        //     // get node degree
        //     let degree = this.g.links.filter(e => e.source == node.id || e.target == node.id).length
        //     if (degree < 3) continue;
        //     // get all the node neighbors of the node in question
        //     let adjacent_edges = this.g.links.filter(e => e.source == node.id || e.target == node.id)

        //     // get the nodes at the other endpoint of these edges
        //     let neighbors = adjacent_edges.map(e => e.source == node.id ? e.target : e.source)
            
        //     // get three neighbors that either have a degree of 1
        //     let neighbors_to_consider = neighbors.filter(n => this.g.links.filter(e => e.source == n || e.target == n).length < 2)

        //     if (neighbors_to_consider.length < 3) continue;

        //     // console.log(node.id, neighbors_to_consider)

        //     for (let i = 0; i < neighbors_to_consider.length - 2; i++){
        //         let edge_with_ni = adjacent_edges.filter(e => e.source == neighbors_to_consider[i] || e.target == neighbors_to_consider[i])[0]
        //         let edge_with_nj = adjacent_edges.filter(e => e.source == neighbors_to_consider[i + 1] || e.target == neighbors_to_consider[i + 1])[0]
        //         let edge_with_nk = adjacent_edges.filter(e => e.source == neighbors_to_consider[i + 2] || e.target == neighbors_to_consider[i + 2])[0]

        //         let c = "c_n" + node.id + "_e" + edge_with_ni.id + "_e" + edge_with_nj.id + "_e" + edge_with_nk.id + "_";
        //         this.model.subjectTo += c + " = 1\n"
        //     }
        // }

        this.model.objective_function = this.model.objective_function.substring(0, this.model.objective_function.length - 2) + "\n\n"
    }

    // Miller–Tucker–Zemlin formulation
    makeModelAdjacency(){
        this.model.objective_function = "Maximize \n"
        this.model.subjectTo = "Subject To \n"
        this.model.bounds = "\nBounds \n"

        for (let i = 0; i < this.g.links.length; i++){
            let total_sum_e_l = ""
            let total_sum_l_e = ""
            for (let j = 0; j < this.g.links.length; j++){
                if (i == j) continue;
                let e1 = this.g.links[i].id
                let e2 = this.g.links[j].id
                let a = e1 < e2 ? e1 : e2
                let b = e1 < e2 ? e2 : e1
                let z_e = "z_e" + a + "e" + b
                let l_e = "l_e" + e1 + "e" + e2
                let e_l = "l_e" + e2 + "e" + e1
                total_sum_e_l += l_e + " + "
                total_sum_l_e += e_l + " + "
                this.model.bounds += "binary " + l_e + "\n"
                this.model.bounds += "binary " + z_e + "\n"
                this.model.subjectTo += z_e + " - " + l_e + " - " + e_l + " = 0 \n"
            }
            this.model.subjectTo += total_sum_e_l.slice(0, total_sum_e_l.length - 2) + " = 1\n"
            this.model.subjectTo += total_sum_l_e.slice(0, total_sum_l_e.length - 2) + " = 1\n"
        }

        for (let i = 1; i < this.g.links.length; i++){
            for (let j = 1; j < this.g.links.length; j++){
                if (i == j) continue;
                let u1 = "u_" + i
                let u2 = "u_" + j
                let n = this.g.links.length
                let l_e = "l_e" + i + "e" + j
                this.model.subjectTo += u1 + " - " + u2 + " + " + n + " " + l_e + " - " + l_e + " <= " + (n - 2) + "\n"
            }
        }

        for (let i = 2; i < this.g.links.length; i++){
            this.model.subjectTo += "u_" + this.g.links[i].id + " >= 2\n"
            this.model.subjectTo += "u_" + this.g.links[i].id + " <= " + this.g.links.length + "\n"
        }
            
        // compute objective values
        for (let n of this.g.nodes){
            let adjacent_edges = this.g.links.filter(e => e.source == n.id || e.target == n.id)
            // can't be a staircase if the node has less than 3 neighbors
            if (adjacent_edges.length < 3) continue;

            for (let i = 0; i < adjacent_edges.length; i++){
                for (let j = i + 1; j < adjacent_edges.length; j++){
                    for (let k = j + 1; k < adjacent_edges.length; k++){
                        if (i == j || i == k || j == k) continue;

                        let edge1 = adjacent_edges[i]
                        let edge2 = adjacent_edges[j]
                        let edge3 = adjacent_edges[k]

                        let sorted_edge_ids = [edge1.id, edge2.id, edge3.id].sort((a, b) => a - b)

                        let c1 = "c_n" + n.id + "_e" + sorted_edge_ids[0] + "_e" + sorted_edge_ids[1] + "_e" + sorted_edge_ids[2] + "_";
                        let c2 = "c_n" + n.id + "_e" + sorted_edge_ids[0] + "_e" + sorted_edge_ids[2] + "_e" + sorted_edge_ids[1] + "_";
                        let c3 = "c_n" + n.id + "_e" + sorted_edge_ids[1] + "_e" + sorted_edge_ids[2] + "_e" + sorted_edge_ids[0] + "_";

                        let z1 = "z_e" + sorted_edge_ids[0] + "e" + sorted_edge_ids[1];
                        let z2 = "z_e" + sorted_edge_ids[1] + "e" + sorted_edge_ids[2];
                        let z3 = "z_e" + sorted_edge_ids[0] + "e" + sorted_edge_ids[2];

                        this.model.subjectTo += c1 + " - " + z1 + " <= 0\n"
                        this.model.subjectTo += c1 + " - " + z2 + " <= 0\n"

                        this.model.subjectTo += c2 + " - " + z1 + " <= 0\n"
                        this.model.subjectTo += c2 + " - " + z3 + " <= 0\n"

                        this.model.subjectTo += c3 + " - " + z2 + " <= 0\n"
                        this.model.subjectTo += c3 + " - " + z3 + " <= 0\n"

                        this.model.subjectTo += c1 
                            + " - " + z1 
                            + " - " + z2 
                            + " >= - 1\n"

                        this.model.subjectTo += c2
                            + " - " + z1
                            + " - " + z3
                            + " >= - 1\n"

                        this.model.subjectTo += c3
                            + " - " + z2
                            + " - " + z3
                            + " >= - 1\n"

                        this.model.objective_function += c1 + " + "
                        this.model.objective_function += c2 + " + "
                        this.model.objective_function += c3 + " + "
                        this.model.bounds += "binary " + c1 + "\n"
                        this.model.bounds += "binary " + c2 + "\n"
                        this.model.bounds += "binary " + c3 + "\n"
                    }
                }
            }
        }
        
        this.model.objective_function = this.model.objective_function.substring(0, this.model.objective_function.length - 2) + "\n\n"
    }

    // version including x variables
    makeModelAdjacencyx(){
        this.model.objective_function = "Maximize \n"
        this.model.subjectTo = "Subject To \n"
        this.model.bounds = "\nBounds \n"

        let added_cvars = []
        let added_xvars = []
        let added_le = []
        let added_el = []

        let redundant_edges = this.g.links.filter(e => {
            let source_degree = this.g.links.filter(l => l.source == e.source || l.target == e.source).length
            let target_degree = this.g.links.filter(l => l.source == e.target || l.target == e.target).length
            return source_degree < 3 && target_degree < 3
        })

        // add definition of variables on x
        for (let i = 0; i < this.g.links.length - 1; i++){
            for (let j = i + 1; j < this.g.links.length; j++){
                let a = "e" + this.g.links[i].id
                let b = "e" + this.g.links[j].id
                let x_ab = "x_" + a + b
                this.model.bounds += "binary " + x_ab + "\n"
                added_xvars.push(x_ab)
            }
        }

        // add transitivity constraints on x
        for (let i = 0; i < this.g.links.length - 2; i++){
            for (let j = i + 1; j < this.g.links.length - 1; j++){
                for (let k = j + 1; k < this.g.links.length; k++){
                    let x_ab = "x_e" + this.g.links[i].id + "e" + this.g.links[j].id
                    let x_bc = "x_e" + this.g.links[j].id + "e" + this.g.links[k].id
                    let x_ac = "x_e" + this.g.links[i].id + "e" + this.g.links[k].id
                    // check that all these exist
                    if (!added_xvars.includes(x_ab)) console.warn(x_ab + " not found")
                    if (!added_xvars.includes(x_bc)) console.warn(x_bc + " not found")
                    if (!added_xvars.includes(x_ac)) console.warn(x_ac + " not found")

                    //
                    this.model.subjectTo += x_ab + " + " + x_bc + " - " + x_ac + " >= 0\n"
                    this.model.subjectTo += "- " + x_ab + " - " + x_bc + " + " + x_ac + " >= - 1\n"
                }
            }
        }
        // this.model.subjectTo += "z_e13e18 = 1\n"
        // this.model.subjectTo += "z_e12e15 = 1\n"
        // this.model.subjectTo += "z_e14e15 = 1\n"
        // this.model.subjectTo += "z_e14e16 = 1\n"


        // every edge has left and right adjacency
        for (let i = 0; i < this.g.links.length - 1; i ++){
            for (let j = i + 1; j < this.g.links.length; j++){
                // if (e1 == e2) continue;
                let e1 = this.g.links[i].id
                let e2 = this.g.links[j].id
                // redundant edges do not need adjacency
                if (redundant_edges.includes(this.g.links[i]) || redundant_edges.includes(this.g.links[j])) continue;
                // sort indices 
                let a = e1 < e2 ? e1 : e2
                let b = e1 < e2 ? e2 : e1
                let l_e = "l_e" + e1 + "e" + e2
                let e_l = "l_e" + e2 + "e" + e1
                let x_e = "x_e" + e1 + "e" + e2
                let z_e = "z_e" + a + "e" + b
                if (!added_xvars.includes(x_e)) console.log(x_e + " not found")
                // if (!added_xvars.includes(e_x)) console.log(e_x + " not found")
                this.model.bounds += "binary " + l_e + "\n"
                this.model.bounds += "binary " + e_l + "\n"
                this.model.bounds += "binary " + x_e + "\n"
                this.model.bounds += "binary " + z_e + "\n"
                this.model.subjectTo += l_e + " + " + e_l + " <= 1\n"
                this.model.subjectTo += z_e + " - " + l_e + " - " + e_l + " = 0 \n"
                this.model.subjectTo += l_e + " - " + x_e + " <= 0\n"
                // this.model.subjectTo += e_l + " - " + e_x + " <= 0\n"
                this.model.subjectTo += x_e + " + " + e_l + " <= 1\n"
                // this.model.subjectTo += e_x + " + " + l_e + " <= 1\n"
            }
        }

        // the left sum of all l_e of a given edge must be at most 1
        for (let e = 0; e < this.g.links.length; e++){
            let sum_left_l_e = ""
            let sum_left_e_l = ""
            for (let i = 0; i < this.g.links.length; i++){
                if (e == i) continue;
                sum_left_l_e += " + " + "l_e" + e + "e" + i
                sum_left_e_l += " + " + "l_e" + i + "e" + e
            }
            this.model.subjectTo += sum_left_l_e + " <= 1\n"
            this.model.subjectTo += sum_left_e_l + " <= 1\n"
        }

        // the sum of all l_e must be equal to the number of edges
        // this.model.subjectTo += added_le.join(" + ") + " = " + (this.g.links.length - 1) + "\n"
            
        // compute objective values
        for (let n of this.g.nodes){
            let adjacent_edges = this.g.links.filter(e => e.source == n.id || e.target == n.id)
            // can't be a staircase if the node has less than 3 neighbors
            if (adjacent_edges.length < 3) continue;

            for (let i = 0; i < adjacent_edges.length; i++){
                for (let j = i + 1; j < adjacent_edges.length; j++){
                    for (let k = j + 1; k < adjacent_edges.length; k++){
                        if (i == j || i == k || j == k) continue;

                        let edge1 = adjacent_edges[i]
                        let edge2 = adjacent_edges[j]
                        let edge3 = adjacent_edges[k]

                        let sorted_edge_ids = [edge1.id, edge2.id, edge3.id].sort((a, b) => a - b)

                        let c1 = "c_n" + n.id + "_e" + sorted_edge_ids[0] + "_e" + sorted_edge_ids[1] + "_e" + sorted_edge_ids[2] + "_";
                        let c2 = "c_n" + n.id + "_e" + sorted_edge_ids[0] + "_e" + sorted_edge_ids[2] + "_e" + sorted_edge_ids[1] + "_";
                        let c3 = "c_n" + n.id + "_e" + sorted_edge_ids[1] + "_e" + sorted_edge_ids[2] + "_e" + sorted_edge_ids[0] + "_";

                        let z1 = "z_e" + sorted_edge_ids[0] + "e" + sorted_edge_ids[1];
                        let z2 = "z_e" + sorted_edge_ids[1] + "e" + sorted_edge_ids[2];
                        let z3 = "z_e" + sorted_edge_ids[0] + "e" + sorted_edge_ids[2];

                        this.model.subjectTo += c1 + " - " + z1 + " <= 0\n"
                        this.model.subjectTo += c1 + " - " + z2 + " <= 0\n"

                        this.model.subjectTo += c2 + " - " + z1 + " <= 0\n"
                        this.model.subjectTo += c2 + " - " + z3 + " <= 0\n"

                        this.model.subjectTo += c3 + " - " + z2 + " <= 0\n"
                        this.model.subjectTo += c3 + " - " + z3 + " <= 0\n"
                        // this.model.subjectTo += c1 + " - " + z1 + " - " + z2 + " - " + z3 + " <= - 1\n"

                        this.model.subjectTo += c1 
                            + " - " + z1 
                            + " - " + z2 
                            + " >= - 1\n"

                        this.model.subjectTo += c2
                            + " - " + z1
                            + " - " + z3
                            + " >= - 1\n"

                        this.model.subjectTo += c3
                            + " - " + z2
                            + " - " + z3
                            + " >= - 1\n"

                        // console.log(z1, z2, z3)

                        this.model.objective_function += c1 + " + "
                        this.model.objective_function += c2 + " + "
                        this.model.objective_function += c3 + " + "
                        this.model.bounds += "binary " + c1 + "\n"
                    
                    }
                }
            }
        }
        
        this.model.objective_function = this.model.objective_function.substring(0, this.model.objective_function.length - 2) + "\n\n"
    }

    // version with only left adjacencies and combinations
    makeModelAdjacencycomb(){
        this.model.objective_function = "Maximize \n"
        this.model.subjectTo = "Subject To \n"
        this.model.bounds = "\nBounds \n"

        let added_cvars = []
        let added_le = []
        let added_el = []

        let redundant_edges = this.g.links.filter(e => {
            let source_degree = this.g.links.filter(l => l.source == e.source || l.target == e.source).length
            let target_degree = this.g.links.filter(l => l.source == e.target || l.target == e.target).length
            return source_degree < 3 && target_degree < 3
        })

        // every edge has left and right adjacency
        for (let e1 = 0; e1 < this.g.links.length; e1++){
            // if (redundant_edges.includes(this.g.links[e1])) continue;
            let sum_left_l_e = ""
            let sum_left_e_l = ""
            for (let e2 = 0; e2 < this.g.links.length; e2++){
                // if (redundant_edges.includes(this.g.links[e2])) continue;
                if (e1 == e2) continue;
                // sort indices 
                let a = e1 < e2 ? e1 : e2
                let b = e1 < e2 ? e2 : e1
                let l_e = "l_e" + e1 + "e" + e2
                let e_l = "l_e" + e2 + "e" + e1
                let z_e = "z_e" + a + "e" + b
                this.model.bounds += "binary " + l_e + "\n"
                this.model.bounds += "binary " + z_e + "\n"
                this.model.subjectTo += l_e + " + " + e_l + " <= 1\n"
                this.model.subjectTo += z_e + " - " + l_e + " - " + e_l + " = 0 \n"
                sum_left_e_l += " + " + l_e
                sum_left_l_e += " + " + e_l
                added_le.push(l_e)
                added_el.push(e_l)
            }
            this.model.subjectTo += sum_left_e_l + " <= 1\n"
            this.model.subjectTo += sum_left_l_e + " <= 1\n"
        }

        // the sum of all l_e must be equal to the number of edges
        this.model.subjectTo += added_le.join(" + ") + " = " + (this.g.links.length - 1) + "\n"

        if (this.g.links.filter(e => !redundant_edges.includes(e)).map(e => e.id).length > 13) return;

        // get all possible combinations 
        let combinations = this.combinations(this.g.links.filter(e => !redundant_edges.includes(e)).map(e => e.id)).filter(c => c.length >= 3)
        // console.log(combinations.length, this.g.links.filter(e => !redundant_edges.includes(e)).map(e => e.id).length)
        if (combinations.length > 10000){return;}
        for (let combination of combinations){
            let pairs = this.k_combinations(combination, 2)
            let string_to_add = ""
            for (let elem of pairs){
                let l_e = "l_e" + elem[0] + "e" + elem[1]
                let e_l = "l_e" + elem[1] + "e" + elem[0]
                string_to_add += " + " + l_e + " + " + e_l
            }
            this.model.subjectTo += string_to_add + " <= " + (combination.length - 1) + "\n"
        }
            
        // compute objective values
        for (let n of this.g.nodes){
            let adjacent_edges = this.g.links.filter(e => e.source == n.id || e.target == n.id)
            // can't be a staircase if the node has less than 3 neighbors
            if (adjacent_edges.length < 3) continue;

            for (let i = 0; i < adjacent_edges.length; i++){
                for (let j = i + 1; j < adjacent_edges.length; j++){
                    for (let k = j + 1; k < adjacent_edges.length; k++){
                        if (i == j || i == k || j == k) continue;

                        let edge1 = adjacent_edges[i]
                        let edge2 = adjacent_edges[j]
                        let edge3 = adjacent_edges[k]

                        let sorted_edge_ids = [edge1.id, edge2.id, edge3.id].sort((a, b) => a - b)

                        let c1 = "c_n" + n.id + "_e" + sorted_edge_ids[0] + "_e" + sorted_edge_ids[1] + "_e" + sorted_edge_ids[2] + "_";
                        let c2 = "c_n" + n.id + "_e" + sorted_edge_ids[0] + "_e" + sorted_edge_ids[2] + "_e" + sorted_edge_ids[1] + "_";
                        let c3 = "c_n" + n.id + "_e" + sorted_edge_ids[1] + "_e" + sorted_edge_ids[2] + "_e" + sorted_edge_ids[0] + "_";

                        let z1 = "z_e" + sorted_edge_ids[0] + "e" + sorted_edge_ids[1];
                        let z2 = "z_e" + sorted_edge_ids[1] + "e" + sorted_edge_ids[2];
                        let z3 = "z_e" + sorted_edge_ids[0] + "e" + sorted_edge_ids[2];

                        this.model.subjectTo += c1 + " - " + z1 + " <= 0\n"
                        this.model.subjectTo += c1 + " - " + z2 + " <= 0\n"

                        this.model.subjectTo += c2 + " - " + z1 + " <= 0\n"
                        this.model.subjectTo += c2 + " - " + z3 + " <= 0\n"

                        this.model.subjectTo += c3 + " - " + z2 + " <= 0\n"
                        this.model.subjectTo += c3 + " - " + z3 + " <= 0\n"
                        // this.model.subjectTo += c1 + " - " + z1 + " - " + z2 + " - " + z3 + " <= - 1\n"

                        this.model.subjectTo += c1 
                            + " - " + z1 
                            + " - " + z2 
                            + " >= - 1\n"

                        this.model.subjectTo += c2
                            + " - " + z1
                            + " - " + z3
                            + " >= - 1\n"

                        this.model.subjectTo += c3
                            + " - " + z2
                            + " - " + z3
                            + " >= - 1\n"

                        // console.log(z1, z2, z3)

                        this.model.objective_function += c1 + " + "
                        this.model.objective_function += c2 + " + "
                        this.model.objective_function += c3 + " + "
                        this.model.bounds += "binary " + c1 + "\n"
                    
                    }
                }
            }
        }
        
        this.model.objective_function = this.model.objective_function.substring(0, this.model.objective_function.length - 2) + "\n\n"
    }

    k_combinations(set, k) {
        var i, j, combs, head, tailcombs;
        if (k > set.length || k <= 0) {
            return [];
        }
        if (k == set.length) {
            return [set];
        }
        if (k == 1) {
            combs = [];
            for (i = 0; i < set.length; i++) {
                combs.push([set[i]]);
            }
            return combs;
        }
        combs = [];
        for (i = 0; i < set.length - k + 1; i++) {
            head = set.slice(i, i+1);
            tailcombs = this.k_combinations(set.slice(i + 1), k - 1);
            for (j = 0; j < tailcombs.length; j++) {
                combs.push(head.concat(tailcombs[j]));
            }
        }
        return combs;
    }
    
    combinations(set) {
        var k, i, combs, k_combs;
        combs = [];
        for (k = 1; k <= set.length; k++) {
            k_combs = this.k_combinations(set, k);
            for (i = 0; i < k_combs.length; i++) {
                combs.push(k_combs[i]);
            }
        }
        return combs;
    }

    makeModelAdjacencyr(){
        this.model.objective_function = "Maximize \n"
        this.model.subjectTo = "Subject To \n"
        this.model.bounds = "\nBounds \n"

        let added_cvars = []
        let added_le = []

        // every edge has left and right adjacency
        for (let e1 = 0; e1 < this.g.links.length; e1++){
            let sum_left_e1 = ""
            let sum_right_e1 = ""
            for (let e2 = 0; e2 < this.g.links.length; e2++){
                if (e1 == e2) continue;
                // sort indices 
                let a = e1 < e2 ? e1 : e2
                let b = e1 < e2 ? e2 : e1
                let l_e = "l_e" + e1 + "e" + e2
                let r_e = "r_e" + e1 + "e" + e2
                let z_e = "z_e" + a + "e" + b
                this.model.bounds += "binary " + l_e + "\n"
                this.model.bounds += "binary " + r_e + "\n"
                this.model.bounds += "binary " + z_e + "\n"
                // this.model.subjectTo += l_e + " + " + r_e + " = 0\n"
                this.model.subjectTo += z_e + " - " + l_e + " - " + r_e + " = 0 \n"
                sum_left_e1 += " + " + l_e
                sum_right_e1 += " + " + r_e
                added_le.push(l_e)
            }
            this.model.subjectTo += sum_left_e1 + " <= 1\n"
            this.model.subjectTo += sum_right_e1 + " <= 1\n"
        }

        // the sum of all l_e must be equal to the number of edges
        // this.model.subjectTo += added_le.join(" + ") + " = " + (this.g.links.length-1) + "\n"

        // if an edge has something on its left, then no other edge can have it on its right
        for (let e1 = 0; e1 < this.g.links.length; e1++){
            for (let e2 = 0; e2 < this.g.links.length; e2++){
                if (e1 == e2) continue;
                let l_e1e2 = "l_e" + e1 + "e" + e2
                let r_e1e2 = "r_e" + e1 + "e" + e2

                for (let e3 = 0; e3 < this.g.links.length; e3++){
                    if (e1 == e3 || e2 == e3) continue;
                    let r_e3e1 = "r_e" + e3 + "e" + e1
                    let l_e3e1 = "l_e" + e3 + "e" + e1
                    this.model.subjectTo += l_e1e2 + " + " + r_e3e1 + " <= 1\n"
                    this.model.subjectTo += r_e1e2 + " + " + l_e3e1 + " <= 1\n"
                }
            }
        }

        // compute objective values
        for (let n of this.g.nodes){
            let adjacent_edges = this.g.links.filter(e => e.source == n.id || e.target == n.id)
            // can't be a staircase if the node has less than 3 neighbors
            if (adjacent_edges.length < 3) continue;

            for (let i = 0; i < adjacent_edges.length; i++){
                for (let j = i+1; j < adjacent_edges.length; j++){
                    for (let k = j+1; k < adjacent_edges.length; k++){
                        if (i == j || i == k || j == k) continue;

                        let edge1 = adjacent_edges[i]
                        let edge2 = adjacent_edges[j]
                        let edge3 = adjacent_edges[k]

                        let sorted_edge_ids = [edge1.id, edge2.id, edge3.id].sort((a, b) => a - b)

                        let c1 = "c_n" + n.id + "_e" + sorted_edge_ids[0] + "_e" + sorted_edge_ids[1] + "_e" + sorted_edge_ids[2] + "_";
                        let z1 = "z_e" + sorted_edge_ids[0] + "e" + sorted_edge_ids[1];
                        let z2 = "z_e" + sorted_edge_ids[1] + "e" + sorted_edge_ids[2];
                        let z3 = "z_e" + sorted_edge_ids[0] + "e" + sorted_edge_ids[2];

                        this.model.subjectTo += c1 + " - " + z1 + " <= 0\n"
                        this.model.subjectTo += c1 + " - " + z2 + " <= 0\n"
                        // this.model.subjectTo += c1 + " - " + z1 + " - " + z2 + " - " + z3 + " <= - 1\n"

                        this.model.subjectTo += c1 
                            + " - " + z1 
                            + " - " + z2 
                            + " >= - 1\n"

                        // this.model.subjectTo += c1
                        //     + " - " + z1
                        //     + " - " + z3
                        //     + " >= - 1\n"

                        // this.model.subjectTo += c1
                        //     + " - " + z2
                        //     + " - " + z3
                        //     + " >= - 1\n"

                        // console.log(z1, z2, z3)

                        this.model.objective_function += c1 + " + "
                        this.model.bounds += "binary " + c1 + "\n"
                    
                    }
                }
            }
        }

        this.model.objective_function = this.model.objective_function.substring(0, this.model.objective_function.length - 2) + "\n\n"
    }

    modelToString(){
        return this.model.objective_function + this.model.subjectTo + this.model.bounds + '\nEnd\n'
    }

    apply_solution(){
        if (options.solve_adjacency){
            // console.log(this.result)
            // find edges that have no left neighbors
            let edges_without_left_neighbors = this.g.links.filter(e => {
                let id = e.id;
                return this.g.links.filter(l => l.id != id).every(l => this.result["l_e" + id + "e" + l.id] == 0)
            })
            // console.log(edges_without_left_neighbors.map(e => e.id))
            // in this.result, print all l_e that are 1
            // console.log(Object.keys(this.result).filter(k => k.includes("l_e") && this.result[k] == 1))
        
            let new_edge_list = []
            let next_edge;
            let next_next_edge;

            if (edges_without_left_neighbors.length > 0) next_edge = edges_without_left_neighbors[0]
            else next_edge = this.g.links[0]
            next_edge.visited = true;
            new_edge_list.push(next_edge)

            // find the next edge that has the previous edge as a left neighbor
            for (let i = 0; i < this.g.links.length - 1; i++){
                // find the edge that has the next_edge as a left neighbor
                next_next_edge = this.g.links.find(e => this.result["l_e" + e.id + "e" + next_edge.id] == 1)
                if (next_next_edge != undefined && next_next_edge.visited == true) console.warn("solution contains loops", next_edge.id, next_next_edge.id)
                
                if (next_next_edge == undefined) {
                    // console.log("no right neighbor found for edge", next_edge.id)
                    if (edges_without_left_neighbors.filter(f => !f.visited).length > 0) next_next_edge = edges_without_left_neighbors.filter(f => !f.visited)[0]
                    else next_next_edge = this.g.links.find(e => !e.visited)
                }
                // console.log(next_edge.id, next_next_edge.id)
                next_next_edge.visited = true;
                new_edge_list.push(next_next_edge)
                next_edge = next_next_edge
            }

            this.g.links = new_edge_list
        } else {
            this.g.links.sort((a, b) => {
                let aid = a.id;
                let bid = b.id;
                
                if (this.result["x_e" + aid + "e" + bid] == 0) return 1;
                else if (this.result["x_e" + aid + "e" + bid] == 1) return -1;
                else if (this.result["x_e" + bid + "e" + aid] == 1) return 1;
                else if (this.result["x_e" + bid + "e" + aid] == 0) return -1;
            })

            this.g.nodes.sort((a, b) => {
                let aid = a.id;
                let bid = b.id;
                
                if (this.result["y_n" + aid + "n" + bid] == 0) return 1;
                else if (this.result["y_n" + aid + "n" + bid] == 1) return -1;
                else if (this.result["y_n" + bid + "n" + aid] == 1) return 1;
                else if (this.result["y_n" + bid + "n" + aid] == 0) return -1;
            })
        }
    }

    writeForGLPK(){
        let tmpstring = ""
        for (let elem of this.model.bounds.split("\n")){
            tmpstring += elem.replace("binary ", " ").replace("Bounds", "Binaries\n")
        }
        return this.model.objective_function.slice(0, this.model.objective_function.length - 1) + this.model.subjectTo + tmpstring + '\nEnd\n'
    }

    async readFromGLPK(filename){
        await fetch(filename)
            .then(response => response.text())
            .then(text => {
                this.result = {};

                // split text and remove everything above "   No. Column name       Activity     Lower bound   Upper bound"
                text = text.split("No. Column name       Activity     Lower bound   Upper bound")[1]
                text = text.split("------ ------------    ------------- ------------- -------------")[1]

                for (let i in text.split("\n")){
                    const pattern = /^\s*\d+\s+(\w+)\s+(?:\*|\s)\s+(\d+)\s+\d+/;
                    const match = text.split("\n")[i].match(pattern);
                    if (match) {
                        this.result[match[1]] = parseFloat(match[2])
                    }
                }
                this.apply_solution();

                const evt = new Event('solution_reading_complete');
                document.dispatchEvent(evt)
            })
    }

    async readFromGurobi(filename){
        await fetch(filename)
            .then(response => response.text())
            .then(text => {
                this.result = {};

                for (let i in text.split("\n")){
                    const match = text.split("\n")[i].split(" ")
                    this.result[match[0]] = parseFloat(match[1])
                }
                this.apply_solution();

                const evt = new Event('solution_reading_complete');
                document.dispatchEvent(evt)
            })
    
    }
}

try {
    module.exports = exports = Biofabric_lp;
 } catch (e) {}