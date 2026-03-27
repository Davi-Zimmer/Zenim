import { Lexer } from "./Lexer.js"
import Parser from "./Parser.js"

/* 
    str b = "T";
    dbl c = .1;
    flt c = .1;
    char d = 'c';
    bool e = true;
    void f = void;
    null g = null;

    mut int a = 1;
*/

const code = `
    int a = -1 + 4 * 18;

    str b = "T";
    dbl c = .1;
    flt c = .1;
    char d = 'c';
    bool e = true;
    void f = void;
    null g = null;

    mut int h = 1;
    once int i = 1;
    once mut int j = 1;

 
`



const tokens = Lexer.ScanTokens( code )

// console.log( tokens )

const ast = Parser.Parse( tokens )

console.log( JSON.stringify( ast, null, 3 ) )