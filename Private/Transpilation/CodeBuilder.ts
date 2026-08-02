import { Inclusions } from "./Inclusions.js"

export class CFile {
    
    private includes      = new Set  < string >
    private typedefs      = new Array< string >
    private forwardDecls  = new Array< string >
    private globals       = new Array< string >
    private structs       = new Array<string>()
    private methodDecls   = new Array<string>()
    private functionImpls = new Array<string>()
    private startup       = new Array<string>()
    private mainBody      = new Array<string>()


    public join(){
        
        return [
            
            [ "#include <stdio.h>\n"    , ...this.includes ].join('\n'),
            this.typedefs       .join('\n'),
            this.forwardDecls   .join('\n'),
            this.globals        .join('\n'),
            this.structs        .join('\n'),
            this.methodDecls    .join('\n'),
            this.functionImpls  .join('\n'),
            
            'int main() {',
                this.startup    .join('\n'),
                this.mainBody   .join('\n'),
            '}'

        ].join('\n\n')

    }

    public include( ...inclusion: Inclusions[] ){
        
        inclusion.forEach( i => this.includes.add( `#include ${ i }` ) )

    }

    public writeBody( line: string ){
        
        this.mainBody.push( line )
    
    }

    public writeMethod( method: string ){
        
        this.methodDecls.push( method )

    }

}