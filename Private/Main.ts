
// import fs from 'fs'
// import path from 'path'
// import { fileURLToPath } from 'url'

import { Lexer } from "./Lexer.js"
import Parser from "./Parser.js"
import SemanticAnalizer from "./Semantic Analizer.js"

/*
function loadCode( fileName: string ){

    const filename = fileURLToPath( import.meta.url )
    
    const dirname = path.dirname( filename )

    const filePath = path.join( dirname, '../', 'Code', fileName )

    const data = fs.readFileSync( filePath, { encoding: 'utf-8' } )

    return data
}
*/
// loadCode('Variable Declaration.zm')


// (5..(int?)?)* x;

/// pointers
/// reference
/// nullable
/// category
/// list (int?)? x;


let code = `

    int a = 0;
    {
    
        int a = 0;

    }

`






const tokens = Lexer.ScanTokens( code )

// console.log( tokens )

const ast = Parser.Parse( tokens )

console.log( JSON.stringify( ast, null, 3 ) )

SemanticAnalizer.Analize( ast )