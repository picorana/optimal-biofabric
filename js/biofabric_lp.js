class Biofabric_lp{
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

    modelToString(){
        return this.model.objective_function + this.model.subjectTo + this.model.bounds + '\nEnd\n'
    }

    apply_solution(){
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