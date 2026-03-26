import { TKind, Token } from "./Tokens.js"

class Parser {

    private tokens: Token[] = []

    private current = 0


    constructor( tokens: Token[] ){
        
        this.tokens = tokens

    }

    public static Parse( tokens: Token[] ){

        return new Parser( tokens ).parse()

    }

    private isAtEnd = () =>  this.peek()?.kind === TKind.Eof

    private peek = () => this.tokens[ this.current ] ?? null

    private check( ...tKinds: TKind[] ) {
        
        for( const kind of tKinds ){

            if( this.isAtEnd() ) return false

            if( this.peek().kind === kind ) return true

        }

        return false

    }

    private advance() {
        
        if( this.current + 1 >= this.tokens.length ) return null

        return this.tokens[ this.current++ ]


    }

    private match( ...tKinds: TKind[] ) {
      
        if( this.check( ...tKinds ) ){
            
            this.advance()
            
            return true 

        }

        return false

    }

    private consume( tKind: TKind ){

        if( this.check( tKind ) ) return this.advance()

        const p = this.peek()

        throw new Error( `Expected ${ tKind } but it came ${ p.kind } at line: ${p.line}, Column: ${p.column} to ${p.column + p.length}` )

    }


    public parse(){

        

    }


}