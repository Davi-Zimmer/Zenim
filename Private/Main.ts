import { Lexer } from "./Lexer.js"

const code = `
    int a = 1;
    str b = "T";
    dbl c = .1;
    flt c = .1;
    char d = 'c';
    bool e = true;
    void f = void;
    null g = null;

    mut int a = 1;
`



const tokens = Lexer.ScanTokens( code )

console.log( tokens )