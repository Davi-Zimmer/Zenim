import { AstKind, Expr, LiteralChar, LiteralNumber, LiteralNull, LiteralString, LiteralVoid, Modifiers, Statement, ExpressionStatement, LiteralBool, MemberAccess, Unary, BinaryExpression, VariableDeclaration, Type, Program, Identifier, Span, ModifierNames, BlockStatement } from "./Types/AST.js"
import { TKind, Token } from "./Types/Tokens.js"

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

        const body: Statement[] = []

        while( !this.isAtEnd() ){

            body.push( this.statement() )

        }

        return {
            kind: AstKind.Program,
            body
        } as Program

    }

    private statement(){

        if( this.isDeclaration() ) return this.declarations()

        if( this.check( TKind.LeftBrace ) ) return this.blockStatement()

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
    
    private errorLocation( astNode?: Statement | Expr | Type ){

        if( !astNode ) {
            
            const p = this.peek()

            return `at line: ${p.line}, column: ${p.column} to ${p.column + p.length}`

        }

        const start = astNode.span.start

        const end   = astNode.span.end

        return `at line: ${ start.line } column: ${ start.column } to line: ${ end.line } column: ${ end.column }`

    }

    private isPrimitive(){
        return this.check(
            TKind.Int
        )
    }

    private parseIdentifier(){

        const ident = this.consume( TKind.Identifier )

        if( !ident ) throw new Error(`Missing identifier ${this.errorLocation()}`)

        return {
            kind: AstKind.Identifier,
            name: ident.lexeme,
            span: this.tokenToSpan( ident ),
        } as Identifier

    }

    private tokenToSpan( tk: Token ){
        return { 
            start: { line: tk.line,  column: tk.column },
            end: { line: tk.line,  column: tk.column + tk.length }
        } as Span
    }

    private getPreviosSpan(){

        return  this.tokenToSpan( this.previus() )

    }

    private spanRange( start: { line: number, column: number }, end: { line: number, column: number } ){
        return {
            start,
            end
        } as Span 

    }

    private parseModifiers(): Modifiers[] {

        const modifiers: Modifiers[] = []

        while( this.isModifier() && !this.isAtEnd() ){
            
            modifiers.push({
              name: this.peek().kind as ModifierNames,
              span: this.tokenToSpan(  this.peek() )  
            })

            this.advance()

        }

        return modifiers

    }

    // ----------------------------------- _Types_ ----------------------------------- \\

    private isModifier(){

        return this.check(
            TKind.Mut,
            TKind.Once,
        )

    }

    private consumeTypeName(){

        if( this.check(
            TKind.Identifier,
            TKind.Int,
            TKind.Flt,
            TKind.Dbl,
            TKind.Str,
            TKind.Char,
            TKind.Bool,
            TKind.Void,
            TKind.Null,
        )) return this.advance()

        throw new Error(`Expected Type ${ this.errorLocation() }`)

    }

    private parsePrimaryType(){

        if( this.match( TKind.LeftParen ) ){
            
            const type = this.parseType()

            this.consume( TKind.RightParen )

            return type

        }

        const name = this.consumeTypeName()

        return {
            kind: "Base",
            name: name?.lexeme,
            span: this.tokenToSpan( name! )
        } as Type

    }

    private parseArrayType(): Type {

        if( this.check( TKind.NumberLiteral ) ){

            const numberLiteral = this.consume( TKind.NumberLiteral )!
            
            this.consume( TKind.DotDot )

            const inner = this.parseArrayType()

            return {
                kind: "Array",
                inner,
                size: numberLiteral?.literal,
                span: this.tokenToSpan( numberLiteral )
            } as Type

        }

        return this.parsePrimaryType()

    }

    private parseType(): Type {
        
        let type = this.parseArrayType()

        while( true ) {

            if( this.match( TKind.Question ) ) {
                type = {
                    kind: "Nullable",
                    inner: type,
                    span: this.spanRange( type.span.start, this.tokenToSpan( this.previus() ).end )
                }

                continue
            }

            if( this.match( TKind.Star ) ) {
                type = {
                    kind: "Pointer",
                    inner: type,
                    span: this.spanRange( type.span.start, this.tokenToSpan( this.previus() ).end )

                }
                continue
            }

            if( this.match( TKind.Circumflex ) ) {
                type = {
                    kind: "UniquePointer",
                    inner: type,
                    span: this.spanRange( type.span.start, this.tokenToSpan( this.previus() ).end )
                }
                continue
            }

            break
        }

        return type

    }

    private checkFuturePeek( index: number, kind: TKind ){

        if( this.current + index >= this.tokens.length ) return false

        return this.tokens[ this.current + index ].kind === kind

    }
  
    private tryParseType() {
        
        const checkpoint = this.current
        
        try {

            this.parseType()

            if( this.check( TKind.Identifier ) ) {

                this.current = checkpoint
                
                return false
            }

            return true
            
        } catch {

            this.current = checkpoint

            return true

        }

    }

    // ----------------------------------- _Declarations_ ----------------------------------- \\
    
    private isDeclaration(){

        const a = !this.tryParseType()

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
        ) || this.check( TKind.NumberLiteral ) && this.checkFuturePeek( 1, TKind.DotDot ) || a

    }

    private parseInitializer(){

        let initializer: undefined | Expr

        if( this.match( TKind.Equals ) ){

            initializer = this.expression()

        }

        return initializer

    }

    private declarations(){
        
        const a = this.variableDeclaration()

        this.consume( TKind.Semicolon )

        return a

    }

    private variableDeclaration(){

        let modifiers: Modifiers[] = []

        if( this.isModifier() ){

            modifiers = this.parseModifiers()

        }

        const type = this.parseType()

        const identifier = this.parseIdentifier()

        let initializer = this.parseInitializer()

        return {
            kind: AstKind.VariableDeclaration,
            identifier,
            type,
            initializer,
            modifiers,
            span: this.spanRange( 
                modifiers[0]?.span.start ?? type.span.start,
                initializer?.span.end ?? identifier.span.end
            )
        } as VariableDeclaration


    }

    // ----------------------------------- _Statements_ ----------------------------------- \\

    private blockStatement(){

        let blockStartSpan = this.tokenToSpan( this.peek() )

        this.consume( TKind.LeftBrace )

        const statements: Statement[] = []

        while( !this.match( TKind.RightBrace ) && !this.isAtEnd() ){
            
            statements.push(
                this.statement()
            )

        }
        
        return {
            kind: AstKind.BlockStatement,
            body: statements,
            span: this.spanRange( blockStartSpan.start, this.getPreviosSpan().end )
        } as BlockStatement

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
                right,
                span: this.spanRange( expr.span.start, right.span.end )
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
                right,
                span: this.spanRange( expr.span.start, right.span.end )
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
                right,
                span: this.spanRange( expr.span.start, right.span.end )
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
                right,
                span: this.spanRange( expr.span.start, right.span.end )
            } as BinaryExpression

        }

        return expr

    }

    private comparison() {

        let expr = this.term()

        if( this.match( TKind.Greater, TKind.GreaterOrEqual, TKind.Less, TKind.LessOrEqual, TKind.EqualsEquals ) ){

            const operator = this.previus()

            const right = this.term()

            expr = {
                kind: AstKind.BinaryExpression,
                left: expr,
                operator: operator.kind,
                right,
                span: this.spanRange( expr.span.start, right.span.end )
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
                right,
                span: this.spanRange( expr.span.start, right.span.end )

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
                right,
                span: this.spanRange( expr.span.start, right.span.end )

            } as BinaryExpression

        }

        return expr

    }

    private exponent(){

        let expr = this.unary()
        
        if( this.match( TKind.StarStar ) ) {

            const operator = this.previus()

            const right = this.exponent()

            expr = {
                kind: AstKind.BinaryExpression,
                right,
                left: expr,
                operator: operator.kind,
                span: this.spanRange( expr.span.start, right.span.end )

            } as BinaryExpression

        }

        return expr

    }

    private unary(): Expr {

        if( this.match( TKind.Exclamation, TKind.Minus ) ){

            const operator = this.previus()
            
            const right = this.unary()

            return {
                kind: AstKind.UnaryExpression,
                operator: operator.kind,
                right,
                span: this.spanRange( this.tokenToSpan( operator ).start, right.span.end )

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

            if( this.match( TKind.Dot ) && this.check( TKind.Identifier ) ){

                const ident = this.parseIdentifier()

                expr = {
                    kind: AstKind.MemberAccess,
                    member: ident.name,
                    object: expr,
                    span: this.spanRange( expr.span.start, ident.span.end )
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
            value : Number( this.previus().literal ),
            span  : this.getPreviosSpan()
        } as LiteralNumber

    }

    private primaryStringLiteral(){
        return { 
            kind  : AstKind.LiteralString,
            value : this.previus().literal,
            span  : this.getPreviosSpan()
        } as LiteralString
    }

    private primaryCharLiteral(){
        return { 
            kind  : AstKind.LiteralChar,
            value : this.previus().literal,
            span  : this.getPreviosSpan()
        } as LiteralChar
    }

    private primaryVoidLiteral(){
        return { 
            kind  : AstKind.LiteralVoid,
            span  : this.getPreviosSpan()
        } as LiteralVoid
    }

    private primaryNullLiteral(){
        return { 
            kind  : AstKind.LiteralNull,
            span  : this.getPreviosSpan()
        } as LiteralNull
    }

    private primaryBoolLiteral(){
        return { 
            kind  : AstKind.LiteralBool,
            value :  this.previus().literal,
            span  : this.getPreviosSpan()
        } as LiteralBool
    }

}

export default Parser