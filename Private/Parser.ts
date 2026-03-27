import { AstKind, Expr, LiteralChar, LiteralNumber, LiteralNull, LiteralString, LiteralVoid, Modifiers, Statement, TypedBinding, ExpressionStatement, LiteralBool, MemberAccess, Unary, BinaryExpression, VariableDeclaration } from "./Types/AST.js"
import { TKind, Token } from "./Types/Tokens.js"

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

        const ast: Statement[] = []

        while( !this.isAtEnd() ){

            ast.push( this.statement() )

        }

        return ast

    }

    private statement(){

        if( this.isDeclaration() ) return this.declarations()

        return this.expressionStatement()
    }

    private expressionStatement(){

        const expr = this.expression()

        this.consume( TKind.Semicolon )

        this.advance()

        return {
            kind: AstKind.ExpressionStatement,
            expression: expr
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

        if( !ident ) throw new Error(`Missing identifier ${this.errorLocation()}`)

        return ident.lexeme

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

        while( this.isModifier() && !this.isAtEnd() ) {

            modifiers.push( this.peek().kind as Modifiers )

            this.advance()
            
        }

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
            TKind.Once,
            TKind.Mut,
            TKind.Str,
            TKind.Char,
            TKind.Int,
            TKind.Bool,
            TKind.Flt,
            TKind.Dbl,
            TKind.Void,
            TKind.Null,
            // TKind.Identifier

        )

    }

    private parseInitializer(){

        let initializer: undefined | Expr


        if( this.match( TKind.Equals ) ){

            initializer = this.expression()

        }

        return initializer

    }

    private declarations(){
        
        const binding = this.parseBinding()

        const a = this.variableDeclaration( binding )

        this.consume( TKind.Semicolon )

        return a

    }

    private variableDeclaration( binding: TypedBinding ){

        const identifier = this.parseIdentifier()
        
        const initializer = this.parseInitializer()

        return {
            kind: AstKind.VariableDeclaration,
            identifier,
            initializer,
            binding
        } as VariableDeclaration

    }

    // ----------------------------------- _Expressions_ ----------------------------------- \\

    private expression(){

        return this.assignment()

    }

    private assignment() {

        let expr = this.logical()

        if( this.match( TKind.Equals ) ){

            const operator = this.previus()

            const right = this.logical()

            expr = {
                kind: AstKind.BinaryExpression,
                left: expr,
                operator: operator.kind,
                right
            } as BinaryExpression

        }

        return expr


    }

    private logical() {

        return this.logicalOr()

    }

    private logicalOr() {

        let expr = this.logicalAnd()

        if( this.match( TKind.OrOr ) ){

            const operator = this.previus()

            const right = this.logicalAnd()

            expr = {
                kind: AstKind.BinaryExpression,
                left: expr,
                operator: operator.kind,
                right
            } as BinaryExpression

        }

        return expr

    }

    private logicalAnd() {

        let expr = this.equality()

        if( this.match( TKind.AndAnd ) ){

            const operator = this.previus()

            const right = this.equality()

            expr = {
                kind: AstKind.BinaryExpression,
                left: expr,
                operator: operator.kind,
                right
            } as BinaryExpression

        }

        return expr

    }

    private equality() {

        let expr = this.comparison()

        if( this.match( TKind.Equals, TKind.NotEquals ) ){

            const operator = this.previus()

            const right = this.comparison()

            expr = {
                kind: AstKind.BinaryExpression,
                left: expr,
                operator: operator.kind,
                right
            } as BinaryExpression

        }

        return expr

    }

    private comparison() {

        let expr = this.term()

        if( this.match( TKind.Greater, TKind.GreaterOrEqual, TKind.Less, TKind.LessOrEqual ) ){

            const operator = this.previus()

            const right = this.term()

            expr = {
                kind: AstKind.BinaryExpression,
                left: expr,
                operator: operator.kind,
                right
            } as BinaryExpression

        }

        return expr

    }

    private term(){

        let expr = this.factor()

        if( this.match( TKind.Plus, TKind.Minus ) ){

            const operator = this.previus()

            const right = this.factor()

            expr = {
                kind: AstKind.BinaryExpression,
                left: expr,
                operator: operator.kind,
                right
            } as BinaryExpression

        }

        return expr

    }

    private factor(){

        let expr = this.exponent()

        if( this.match( TKind.Star, TKind.Slash, TKind.Percent ) ){

            const operator = this.previus()

            const right = this.exponent()

            expr = {
                kind: AstKind.BinaryExpression,
                left: expr,
                operator: operator.kind,
                right
            } as BinaryExpression

        }

        return expr

    }

    private exponent(){

        let expr = this.unary()
        
        if( this.match( TKind.StarStar ) ) {

            const operator = this.previus().kind

            const right = this.exponent()

            expr = {
                kind: AstKind.BinaryExpression,
                right,
                left: expr,
                operator
            } as BinaryExpression

        }

        return expr

    }

    private unary(): Expr {

        if( this.match( TKind.Exclamation, TKind.Minus ) ){
           
            const operator = this.previus().kind
            
            const right = this.unary()

            return {
                kind: AstKind.UnaryExpression,
                operator,
                right
            } as Unary

        }

        return this.call()

    }

    private call(){
        
        let expr = this.primary()

        while( true ){

            if( this.match( TKind.LeftParen ) ){

                expr = this.finishCall( expr )

                continue

            }

            if( this.match( TKind.Dot ) &&  this.check( TKind.Identifier ) ){

                const name = this.parseIdentifier()

                expr = {
                    kind: AstKind.MemberAccess,
                    member: name,
                    object: expr
                } as MemberAccess
            
                continue
            }

            break

        }

        return expr


    }

    private primary(): Expr {

        const t = this.peek()

        if( !t ) throw new Error(`Unexpected end ${ this.errorLocation() }`)

        if( this.match( TKind.NumberLiteral ) ) return this.primaryNumberLiteral()

        if( this.match( TKind.StringLiteral ) ) return this.primaryStringLiteral()

        if( this.match( TKind.CharLiteral   ) ) return this.primaryCharLiteral()

        if( this.match( TKind.Void ) ) return this.primaryVoidLiteral()

        if( this.match( TKind.Null ) ) return this.primaryNullLiteral()

        if( this.match( TKind.True, TKind.False, TKind.Maybe ) ) return this.primaryBoolLiteral()
        
        throw new Error(`Expected Expression but it came "${ this.peek().kind }" ${this.errorLocation()}`)
        
    }

    private finishCall( callee: Expr ){ // fazer dps
        
        return callee

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

    private primaryBoolLiteral(){
        return { 
            kind  : AstKind.LiteralBool,
            value :  this.previus().literal
        } as LiteralBool
    }

}

export default Parser