import { Inclusions } from "./Inclusions.js"

export class CFile {
    
    private includes      = new Set< string >
    private typedefs      = new Set< string >
    private forwardDecls  = new Set< string >
    private globals       = new Set< string >
    private structs       = new Set< string >
    private methodDecls   = new Set< string >
    private functionImpls = new Set< string >
    private startup       = new Set< string >
    private mainBody      = new Set< string >


    public join(){
        
        return [

            [ ...this.includes      ].join('\n'),
            [ ...this.typedefs      ].join('\n'),
            [ ...this.forwardDecls  ].join('\n'),
            [ ...this.globals       ].join('\n'),
            [ ...this.structs       ].join('\n'),
            [ ...this.methodDecls   ].join('\n'),
            [ ...this.functionImpls ].join('\n'),
            
            'int main() {',
            [ ...this.startup       ].join('\n'),
            [ ...this.mainBody      ].join('\n'),
            '}'

        ].join('\n\n')

    }

    public include( ...inclusion: Inclusions[] ){
        
        inclusion.forEach( i => this.includes.add( `#include ${ i }` ) )

    }

    public writeBody( line: string ){
        
        this.mainBody.add( line )
    
    }

    public writeMethod( method: string ){
        
        this.methodDecls.add( method )

    }

}