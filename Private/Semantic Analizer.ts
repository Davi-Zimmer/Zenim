import { Program } from "./Types/AST.js"

class SemanticAnalizer {

    public static Analize( ast: Program ){

        const analizer = new SemanticAnalizer()

        return analizer.visit()

    }


    private scopeStack = ''

    private visit(){

    }


}

export default SemanticAnalizer