
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
   
    ..int x = [ 0, 0 ];

    ..( ..int ) y = [ [ '0' ] ];

        alias D1: ..int;
        alias D2: ..D1;
        D2 test = [];

        test1 = 500;
        test2 = "Sou Lindo Mesmo";

        
        alias X: int | str;
        X test2 = "f";
     
        str x = test2;
        
        
        alias AlphaNumeric: str | int;
        
        AlphaNumeric var = 10;
        
        int number = var as int;
        
        if( var is str ){
        
        }

        A XD = { a: 1 } ; /// falaq que 'b' é missing
    */
   
   
let code = `

    int x = 1;

    x = 0;

`



const tokens = Lexer.ScanTokens( code )

// console.log( tokens )

const ast = Parser.Parse( tokens )

// console.log( JSON.stringify( ast, null, 3 ) )

SemanticAnalizer.Analize( ast )