
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

// 1..(bool?) list = [ true, null ];
// 3..bool b = [ true, false, maybe ];
// ..(..int) test = [ [] ]; // da erro ainda
// ret a + b;


/*
model x {
    int a
};

x.a;
*/
/*
    int x = 0;
    int* p = &x;
    int* q = &(*p);


    int p = 0;
    *p = 10;

    int a = 0;
    int b = 1;

    b = a;
*/
/*
    10 = x;
    (x + 1) = 5;
*/


let code = `

    int x = 0;
    int* p = &x;
    int* q = &(*p);

    10 = x;     // erro
    (x + 1) = 5; // erro
`



const tokens = Lexer.ScanTokens( code )

// console.log( tokens )

const ast = Parser.Parse( tokens )

// console.log( JSON.stringify( ast, null, 3 ) )

SemanticAnalizer.Analize( ast )