import { Lexer } from "./Lexer.js"

const code = `
    int a = b;

`



const tokens = Lexer.ScanTokens( code )

console.log( tokens )