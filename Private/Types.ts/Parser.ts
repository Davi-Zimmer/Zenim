import { AstKind, Expr, LiteralChar, LiteralNumber, LiteralNull, LiteralString, LiteralVoid, Modifiers, Statement, TypedBinding, ExpressionStatement } from "./AST.js"
import { TKind, Token } from "./Tokens.js"

class Parser {

    private tokens: Token[] = []

    private current = 0

    private errorLocation(){

        const p = this.peek()

        return `at line: ${p.line}, Column: ${p.column} to ${p.column + p.length}`

    }

    constructor( tokens: Token[] ){
        
        this.tokens = tokens

    }

    public static Parse( tokens: Token[] ){

        return new Parser( tokens ).parse()

    }

    private isAtEnd = () =>  this.peek()?.kind === TKind.Eof

    private peek = () => this.tokens[ this.current ] ?? null

    private previus = () => this.tokens[ this.current - 1 ]

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

        throw new Error( `Expected ${ tKind } but it came ${ p.kind } ${this.errorLocation()}` )

    }


    public parse(){

        return this.program()

    }

    private program() {

        const ast:Statement[] = []

        while( !this.isAtEnd() ){

            ast.push( this.statement() )

        }

        return ast

    }

    private statement(){

        if( this.isDeclaration() ) this.declarations()


        return this.expressionStatement()
    }

    private expressionStatement(){

        const expr = this.expression()

        this.consume( TKind.Semicolon )

        this.advance()

        return {
            kind: AstKind.ExpressionStatement,
            // expression: expr
        } as ExpressionStatement

    }

    // ----------------------------------- _Helpers_ ----------------------------------- \\
    
    private isPrimitive(){
        return this.check(
            TKind.Int
        )
    }

    private parseIdentifier(){

        const ident = this.consume( TKind.Identifier )

        if( !ident || !ident.literal ) throw new Error(`Missing identifier ${this.errorLocation()}`)

        return ident.literal

    }

    // ----------------------------------- _Types_ ----------------------------------- \\


    private isModifier(){

        return this.check(
            TKind.Mut,
            TKind.Once
        )

    }


    private parseModifiers(){

        const modifiers: Modifiers[] = []

        while( this.isModifier() ) modifiers.push( this.peek().kind as Modifiers )

        return modifiers

    }

    private parseBinding(){

        const modifiers = this.parseModifiers()
        
        const kind = this.advance()

        if( !kind ) throw new Error("Missing variable type " + this.errorLocation() )

        return {
            modifiers,
            typeToken: kind
        } as TypedBinding

    }

    // ----------------------------------- _Declarations_ ----------------------------------- \\
    
    private isDeclaration(){
        return this.check(
            TKind.Mut,
            TKind.Int
        )

    }

    private parseInitializer(){

        let initializer: undefined | Expr


        if( this.match( TKind.Equals ) ){

            // expr = this.expression()

        }

        return initializer

    }

    private declarations(){
        
        const binding = this.parseBinding()

        return this.variableDeclaration( binding )

    }

    private variableDeclaration( binding: TypedBinding ){

        const name = this.parseIdentifier()
        
        const initializer = this.parseInitializer()

    }

    // ----------------------------------- _Expressions_ ----------------------------------- \\

    private expression(){

        return this.assignment()

    }

    private assignment() {

        // let expr = this.logical()

    }


    private primary(){

        const t = this.peek()

        if( !t ) throw new Error(`Unexpected end ${ this.errorLocation() }`)

        if( this.match( TKind.NumberLiteral ) ) return this.primaryNumberLiteral()

        if( this.match( TKind.StringLiteral ) ) return this.primaryStringLiteral()

        if( this.match( TKind.CharLiteral   ) ) return this.primaryCharLiteral()

        if( this.match( TKind.VoidLiteral   ) ) return this.primaryVoidLiteral()

        if( this.match( TKind.NumberLiteral ) ) return this.primaryNullLiteral()

    }

    // ----------------------------------- _PrimaryFuncs_ ----------------------------------- \\

    private primaryNumberLiteral() {

       return { 
            kind  : AstKind.LiteralNumber,
            value : Number( this.previus().literal )
        } as LiteralNumber

    }

    private primaryStringLiteral(){
        return { 
            kind  : AstKind.LiteralString,
            value : this.previus().literal
        } as LiteralString
    }

    private primaryCharLiteral(){
        return { 
            kind  : AstKind.LiteralChar,
            value : this.previus().literal
        } as LiteralChar
    }

    private primaryVoidLiteral(){
        return { 
            kind  : AstKind.LiteralVoid,
        } as LiteralVoid
    }

    private primaryNullLiteral(){
        return { 
            kind  : AstKind.LiteralNull,
        } as LiteralNull
    }

}