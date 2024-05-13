class Edge_sorting_lp{
    constructor(graph){
        this.g = graph;
        this.model = {};
        this.m = 50;
        this.zcount = 0;
        this.verbose = true;
        this.mip = true;
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
        this.model.objective_function = "Maximize \n"
        this.model.subjectTo = "Subject To \n"
        this.model.bounds = "\nBounds \n"

        // let added_xvars = []

        // // add definition of variables on x
        // for (let i = 0; i < this.g.links.length - 1; i++){
        //     for (let j = i + 1; j < this.g.links.length; j++){
        //     let a = "e" + this.g.links[i].id
        //     let b = "e" + this.g.links[j].id
        //     let x_ab = "x_" + a + b
        //     this.model.bounds += "binary " + x_ab + "\n"
        //     added_xvars.push(x_ab)
        //     }
        // }

        // // add definition of variables on y
        // for (let i = 0; i < this.g.nodes.length - 1; i++){
        //     for (let j = i + 1; j < this.g.nodes.length; j++){
        //     let a = "n" + this.g.nodes[i].id
        //     let b = "n" + this.g.nodes[j].id
        //     let y_ab = "y_" + a + b
        //     this.model.bounds += "binary " + y_ab + "\n"
        //     added_xvars.push(y_ab)
        //     }
        // }

        let objective_function = ""
        let vars_added_in_objective_function = [];
        
        // minimize distance variables
        for (let node of this.g.nodes){
            let adjacent_edges = this.g.links.filter(n => n.source == node.id || n.target == node.id)
        
            for (let i = 0; i < adjacent_edges.length - 1; i++){
                for (let j = i + 1; j < adjacent_edges.length; j++){
                    let d = "d_" + adjacent_edges[i].id + "_" + adjacent_edges[j].id
                    if (!vars_added_in_objective_function.includes(d)){
                        objective_function += "d_" + adjacent_edges[i].id + "_" + adjacent_edges[j].id + " + "
                        vars_added_in_objective_function.push(d)
                    }
                }
            }
        }
        
        objective_function = objective_function.slice(0, objective_function.length - 2)
        this.model.objective_function += objective_function + "\n\n"
          
        // // create distance variables
        for (let node of this.g.nodes){
            let adjacent_edges = this.g.links.filter(n => n.source == node.id || n.target == node.id)
        
            for (let i = 0; i < adjacent_edges.length - 1; i++){
                for (let j = i + 1; j < adjacent_edges.length; j++){
                    let a = adjacent_edges[i].id 
                    let b = adjacent_edges[j].id
                    let d = "d_" + a + "_" + b
                    let xa = "x_" + a
                    let xb = "x_" + b

                    // this.model.subjectTo += "x_" + a + " - x_" + b + " - 1 <= " + this.m + " * (1 - d_" + a + "_" + b + ")\n"
                    // problem.subjectTo("x_" + a + " - x_" + b + " - 1 >= - " + big_M + "(1 - d_" + a + "_" + b + ")")
                    // this.model.subjectTo += "x_" + a + " - x_" + b + " + " + this.m + " " + d + "" + " <= " + (this.m + 1) + " \n"
                    // this.model.subjectTo += "x_" + a + " - x_" + b + " " + " - " + this.m + " " + d + " >= " + (-this.m + 1) + "\n"
                    this.model.bounds += "binary d_" + a + "_" + b + "\n"

                    this.model.subjectTo += xa + " - " + xb + " - " + this.m + " " + d + " >= " + (1 - this.m) + "\n"
                    this.model.subjectTo += xb + " - " + xa + " - " + this.m + " " + d + " >= " + (1 - this.m) + "\n"
                    this.model.subjectTo += xa + " - " + xb + " + " + this.m + " " + d + " <= " + (1 + this.m) + " \n"
                    this.model.subjectTo += xb + " - " + xa + " + " + this.m + " " + d + " <= " + (1 + this.m) + " \n"
                }
            }
        }

        // ensure x_a and x_b are always different
        for (let i = 0; i < this.g.links.length - 1; i++){
            for (let j = i+1; j < this.g.links.length; j++){
                let a = this.g.links[i].id
                let b = this.g.links[j].id
                let z = "z_" + a + "_" + b
                this.model.bounds += "binary " + z + "\n"
                this.model.subjectTo += "x_" + a + " - x_" + b + " - " + this.m + " " + z + " <= - 1 \n"
                this.model.subjectTo += "x_" + a + " - x_" + b + " - " + this.m + " " + z + " >= " + (1 - this.m) + "\n"
            }
        }

        console.log(this.modelToString(this.model))
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

    modelToString(){
        return this.model.objective_function + this.model.subjectTo + this.model.bounds + '\nEnd\n'
    }

    apply_solution(){
        this.g.links.sort((a, b) => {
            let aid = a.id;
            let bid = b.id;
            
            if (this.result["x_e" + aid + "_e" + bid] == 0) return 1;
            else if (this.result["x_e" + aid + "_e" + bid] == 1) return -1;
            else if (this.result["x_e" + bid + "_e" + aid] == 1) return 1;
            else if (this.result["x_e" + bid + "_e" + aid] == 0) return -1;
        })

        this.g.nodes.sort((a, b) => {
            let aid = a.id;
            let bid = b.id;
            
            if (this.result["y_n" + aid + "_n" + bid] == 0) return 1;
            else if (this.result["y_n" + aid + "_n" + bid] == 1) return -1;
            else if (this.result["y_n" + bid + "_n" + aid] == 1) return 1;
            else if (this.result["y_n" + bid + "_n" + aid] == 0) return -1;
        })
    }
}