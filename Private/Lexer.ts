import { TKind, Token } from "./Types/Tokens.js"

export class Lexer {

    private source: string
    private tokens: Token[] = []

    private start   = 0
    private current = 0
    private line    = 1
    private column  = 1

    private keywords: Record< string, TKind > = {

        mut  : TKind.Mut,
        once : TKind.Once,

        int  : TKind.Int,
        flt  : TKind.Flt,
        str  : TKind.Str,
        dbl  : TKind.Dbl,
        char : TKind.Char,
        bool : TKind.Bool,
        null : TKind.Null,
        void : TKind.Void,

        true  : TKind.True,
        false : TKind.False,
        maybe : TKind.Maybe,

        if    : TKind.If,
        else  : TKind.Else,
        while : TKind.While,
        do    : TKind.Do,
        for   : TKind.For,
        in    : TKind.In,
        of    : TKind.Of,
        break : TKind.Break,
        next  : TKind.Next,
        match : TKind.Match,
        met   : TKind.Met,
        ret   : TKind.Ret,
        model : TKind.Model,
        alias : TKind.Alias

    }

    constructor( src : string ){
        
        this.source = src 

    }

    public static ScanTokens( code: string ){

        return new Lexer( code ).scanTokens()

    }

    private peekChar = () => this.source[ this.current ] ?? '\0'

    private isAtEnd = () => this.current >= this.source.length 

    private check( expected: string) {

        if( this.isAtEnd() ) return false

        if( this.source[ this.current ] !== expected ) return false

        return true
    }

    private match( expected: string ){

        if( this.isAtEnd() ) return false

        if( this.source[ this.current ] !== expected ) return false

        this.current++
        this.column++

        return true

    }

    private advance() {
        
        const char = this.peekChar()

        this.current++
        this.column++

        return char
        
    }

    private isAlpha = ( c: string ) =>  /[a-zA-Z_]/.test( c )

    private isDigit = ( c: string ) => /^\d+$/.test( c )

    private isAlphaNumeric = ( c: string ) => this.isAlpha( c ) || this.isDigit( c )

    private addToken( kind: TKind, literal?: string | number | boolean ) {
        
        const lexeme = this.source.substring( this.start, this.current )
        
        this.tokens.push({
            kind,
            lexeme,
            column : this.column - ( this.current - this.start ),
            line   : this.line,
            length : this.current - this.start,
            literal
        })

    }

    private nextLine(){
        this.line++
        this.column = 1
    }

    private string(){

        while( this.peekChar() != '"' && !this.isAtEnd() ){

            if( this.match( "\n" ) ) this.nextLine()

            this.advance()

        }

        if( this.isAtEnd() ) throw new Error(`Unterminated string at line ${this.line}`)

        this.advance()

        const value  = this.source.substring( this.start + 1, this.current - 1 )
    
        this.addToken( TKind.StringLiteral, value )

    }

    private isLineComment(){

        if( this.match("/") ){
            
            while( this.peekChar() !== "\n" && this.isAtEnd() ){

                this.advance()

            }

            return
        
        }
        
        this.addToken( TKind.Slash )

    }

    private char() {

        if( this.peekChar() !== "'" ){

            this.advance()
            
            if( this.peekChar() !== "'" ) throw new Error(`Char must have only one letter at line ${this.line} char "${this.peekChar()}"`)

            if( this.isAtEnd() ) throw new Error(`Unterminated char at line ${this.line} char "${this.peekChar()}"`)
            
        } else {

            if( this.peekChar() !== "'") throw new Error(`Unterminated char at line ${this.line} char "${this.peekChar()}"`)

        }

        this.advance()

        const value  = this.source.substring( this.start + 1, this.current - 1 )
    
        this.addToken( TKind.CharLiteral, value )

    }

    private number(){

        while( this.isDigit( this.peekChar() ) ) this.advance()

        if( this.check( TKind.Dot ) && this.isDigit( this.source[ this.current + 1 ] ) ){

            while( this.isDigit( this.peekChar() ) ) this.advance()
            
        }

        const value = parseFloat( this.source.substring( this.start, this.current ) )

        this.addToken( TKind.NumberLiteral, value )

    }

    private identifier(){

        while( this.isAlphaNumeric( this.peekChar() ) ) this.advance()

        const text = this.source.substring( this.start, this.current )

        const type = this.keywords[ text ] ?? TKind.Identifier

        this.addToken( type )

    }

    private dotOrDouble(){

        if( this.match( TKind.Dot ) ){

            this.addToken( TKind.DotDot )
            
            return
        }

        if( this.isDigit( this.peekChar() ) ){

            this.number()

            return
        
        }

        this.addToken( TKind.Dot )

    }

    private scanChar(){

        const c = this.advance()

        switch( c ){

            case '+' : this.addToken( TKind.Plus        ); break
            case '-' : this.ifChar  ( TKind.Greater, TKind.Minus, TKind.RightArrow ); break
            case '*' : this.addToken( TKind.Star        ); break
            case '/' : this.addToken( TKind.Slash       ); this.isLineComment(); break
            case '%' : this.addToken( TKind.Percent     ); break
            case '!' : this.addToken( TKind.Exclamation ); break
            case '?' : this.addToken( TKind.Question    ); break
            case '=' : this.ifChar  ( TKind.Equals, TKind.Equals, TKind.EqualsEquals ); break

            case '(' : this.addToken( TKind.LeftParen     ); break
            case ')' : this.addToken( TKind.RightParen    ); break
            case '[' : this.addToken( TKind.LeftBracket   ); break
            case ']' : this.addToken( TKind.RightBracket  ); break
            case '{' : this.addToken( TKind.LeftBrace     ); break
            case '}' : this.addToken( TKind.RightBrace    ); break
            case "<" : this.ifChar  ( TKind.Minus, TKind.Minus, TKind.LeftArrow ); break
            case ">" : this.addToken( TKind.Greater       ); break
            case ';' : this.addToken( TKind.Semicolon     ); break
            case ':' : this.addToken( TKind.Colon         ); break
            case ',' : this.addToken( TKind.Comma         ); break
            case '.' : this.dotOrDouble()                  ; break
            case '_' : this.addToken( TKind.UnderLine     ); break
            
            case "|" : this.addToken( TKind.Or            ); break
            case "&" : this.addToken( TKind.And           ); break
            case "~" : this.addToken( TKind.Tilde         ); break
            case "^" : this.addToken( TKind.Circumflex    ); break
            case "\\": this.addToken( TKind.ReverseSlash  ); break
            case "`" : this.addToken( TKind.Grave         ); break
            case ":" : this.addToken( TKind.Colon         ); break
            case "@" : this.addToken( TKind.Test          ); break

            case " " : 
            case "\r": 
            case "\t": break
            case "\n": this.nextLine(); break
            case '"' : this.string(); break
            case "'" : this.char(); break
        
            default: {
                if( this.isDigit( c ) ) this.number(); else 
                if( this.isAlpha( c ) ) this.identifier(); else
                {
                 
                    throw new Error(`Unknown char '${c}' at line ${this.line}, column ${this.column}`)
                }

            }
        }


    }

    private ifChar( base: TKind, trueCase: TKind, falseCase: TKind ){

        let kind = trueCase

        if( this.match( base ) ) kind = falseCase

        return this.addToken( kind )

    }

    private scanTokens(){

        while( !this.isAtEnd() ){
            
            this.start = this.current

            this.scanChar()

        }

        this.tokens.push({
            kind: TKind.Eof,
            line: this.line,
            lexeme: "",
            column: this.column,
            length: 0
        })

        return this.tokens

    }

}