import { convertToObject, convertTypeAcquisitionFromJson, idText, textChangeRangeIsUnchanged } from "typescript"
import { AstKind, Expr, LiteralChar, LiteralNumber, LiteralNull, LiteralString, LiteralVoid, Modifiers, Statement, ExpressionStatement, LiteralBool, MemberAccess, Unary, BinaryExpression, VariableDeclaration, TypeAST, Program, LiteralIdentifier, Span, ModifierNames, BlockStatement, IfElseStatement, WhileStatement, DoWhileStatement, LiteralList, ForStatement, RangeExpression, BreakStatement, NextStatement, MatchStatement, MatchClause, MethodDeclaration, MethodParams, MethodReturn, ReturnStatement, ModelDeclaration, ModelFieldDeclaration, AliasStatement, AliasItem, CallExpression, ObjectProps, LiteralModel } from "./Types/AST.js"
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
        
        if( this.check( TKind.Match ) ) return this.matchStatement()
            
        if( this.check( TKind.Ret ) ) return this.__returnStatement()

        if( this.check( TKind.Break ) ) return this.breakStatement()

        if( this.check( TKind.Next ) ) return this.nextStatement()

        if( this.check( TKind.If ) ) return this.ifStatement()

        if( this.check( TKind.While ) ) return this.whileStatement()

        if( this.check( TKind.For ) ) return this.forStatement()

        if( this.check( TKind.Do ) ) return this.doWhileStatement()

        if( this.isDeclaration() ) return this.declarations()

        if( this.check( TKind.LeftBrace ) ) return this.blockStatement()

        return this.expressionStatement()
    }

    private expressionStatement(){

        const expr = this.expression()

        this.consume( TKind.Semicolon )

        return {
            kind: AstKind.ExpressionStatement,
            expression: expr
        } as ExpressionStatement

    }

    // ----------------------------------- _Helpers_ ----------------------------------- \\
    
    private errorLocation( astNode?: Statement | Expr | TypeAST ){

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
            kind: AstKind.LiteralIdentifier,
            name: ident.lexeme,
            span: this.tokenToSpan( ident ),
        } as LiteralIdentifier

    }

    private tokenToSpan( tk: Token ){
        return { 
            start: { line: tk.line,  column: tk.column },
            end: { line: tk.line,  column: tk.column + tk.length }
        } as Span
    }

    private getPreviousSpan(){

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

    private safeConsumeSemicolon(){

        if( this.previus()?.kind !== TKind.Semicolon ){

            this.consume( TKind.Semicolon )   

        }

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
        } as TypeAST

    }

    private parseArrayType(): TypeAST {

        if( this.check( TKind.NumberLiteral ) || this.check( TKind.DotDot ) ){

            let listStart: Token | undefined

            if( this.check( TKind.NumberLiteral ) ) {

                listStart = this.consume( TKind.NumberLiteral )!

            }

            if( !listStart ) listStart = this.consume( TKind.DotDot )!
            else this.consume( TKind.DotDot )

            const inner = this.parseArrayType()

            return {
                kind: "Array",
                inner,
                size: listStart?.literal,
                span: this.tokenToSpan( listStart )
            } as TypeAST

        }

        return this.parsePrimaryType()

    }

    private parseType(): TypeAST {
        
        let type = this.parseArrayType()

        while( !this.isAtEnd() ) {

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

            this.current = checkpoint

            return true
            
        } catch {

            this.current = checkpoint

            return true

        }

    }

    private parseParameter(){

        const params: MethodParams[] = []

        while( !this.check( TKind.RightParen ) && !this.isAtEnd() ){

            const spanStart = this.tokenToSpan( this.peek() )
            
            const modifiers = this.parseModifiers()

            const type = this.parseType()

            const identifier = this.parseIdentifier()

            const initializer = this.parseInitializer()

            params.push({
                kind: AstKind.MethodParams,
                initializer,
                modifiers,
                identifier,
                type,
                span: this.spanRange( spanStart.start, this.getPreviousSpan().end  )
            })

            if( this.check( TKind.RightParen ) ) break

            this.consume( TKind.Comma )

        }
        
        return params

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
            TKind.Met,
            TKind.Model,
            TKind.Alias,
        ) || this.check( TKind.NumberLiteral ) && this.checkFuturePeek( 1, TKind.DotDot ) || a

    }

    private parseListInitialization(): LiteralList {

        const array: Expr[] = []

        const spanStart = this.getPreviousSpan()

        while( !this.check( TKind.RightBracket ) && ! this.isAtEnd() ){

            array.push( 

                this.expression()
            
            )

            if( this.check( TKind.Comma ) ) {

                this.consume( TKind.Comma )

                continue

            }

        }

        this.consume( TKind.RightBracket )

        return {
            kind: AstKind.LiteralList,
            list: array,
            size: array.length,
            span: this.spanRange( spanStart.start, this.getPreviousSpan().end )

        }

    }

    private parseModelFieldVarDeclaration(): ObjectProps {

        const identifier = this.parseIdentifier()

        const spanStart = this.getPreviousSpan()

        this.consume( TKind.Colon )

        const expr = this.expression()

        return {
            kind: AstKind.ObjectProps,
            identifier,
            item: expr,
            span: this.spanRange( spanStart.start, this.getPreviousSpan().end )

        }

    }

    private parseLiteralModel(): LiteralModel {

        const expr: ObjectProps[] = []        

        const spanStart = this.getPreviousSpan()

        while( !this.check( TKind.RightBrace ) && !this.isAtEnd() ){

            expr.push(

                this.parseModelFieldVarDeclaration()

            )

            if( this.check( TKind.RightBrace ) ) break

            if( this.check( TKind.Comma ) ) this.consume( TKind.Comma )

        }
        
        this.consume( TKind.RightBrace )

        return {
            kind: AstKind.LiteralModel,
            modelItems: expr,
            span: this.spanRange( spanStart.start, this.getPreviousSpan().end )

        }

    }

    private parseInitializer(){

        let initializer: undefined | Expr
   
        if( this.match( TKind.Equals ) ){

            if( this.match( TKind.LeftBracket ) ) initializer = this.parseListInitialization()
            else
            if( this.match( TKind.LeftBrace ) ) initializer = this.parseLiteralModel()

            else {

                initializer = this.expression()

            }

        }

        return initializer

    }

    private declarations(){

        if( this.check( TKind.Model ) ) return this.modelStatement()

        if( this.check( TKind.Alias ) ) return this.aliasStatement()

        let modifiers: Modifiers[] = []

        if( this.isModifier() ){

            modifiers = this.parseModifiers()

        }

        let isMethod = this.match( TKind.Met ) 

        const type = this.parseType()

        if( isMethod ) {

            return this.methodStatement( modifiers, type, true )

        }

        const a = this.variableDeclaration( modifiers, type )

        this.consume( TKind.Semicolon )

        return a

    }

    private variableDeclaration( modifiers: Modifiers[], type: TypeAST ){

        const identifier = this.parseIdentifier()

        if( this.check( TKind.LeftParen ) ){

            return this.methodStatement( modifiers, type, false, identifier )

        }

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

    private methodStatement( modifiers: Modifiers[], type: TypeAST, metExplicit: boolean, identifier?: LiteralIdentifier ): MethodDeclaration {

        if( !identifier ) identifier = this.parseIdentifier()
        
        this.consume( TKind.LeftParen )

        const params = this.parseParameter()

        this.consume( TKind.RightParen )

        const body = this.blockStatement()

        return {
            kind: AstKind.MethodDeclaration,
            body,
            identifier,
            modifiers,
            params,
            metExplicit,
            returnType: {
                kind: AstKind.MethodReturn,
                type: type
            } as MethodReturn,
            span: this.spanRange( 
                modifiers[0]?.span.start ?? type.span.start,
                body?.span.end ?? body.span.end
            )
        } 

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
            span: this.spanRange( blockStartSpan.start, this.getPreviousSpan().end )
        } as BlockStatement

    }

    private ifStatement(): IfElseStatement {

        let startSpan = this.tokenToSpan( this.peek() )

        this.consume( TKind.If )

        this.consume( TKind.LeftParen )

        const expr = this.expression()

        this.consume( TKind.RightParen )

        const thenBranch = this.statement()

        let elseBranch: Statement | undefined 

        if( this.match( TKind.Else ) ) elseBranch = this.statement()

        let endSpan = elseBranch?.span ?? thenBranch.span

        return {
            kind: AstKind.IfElseStatement,
            condition: expr,
            elseBranch,
            thenBranch,
            span: this.spanRange( startSpan.start, endSpan.end )
        }

    }

    private whileStatement(): WhileStatement {

        const spanStart = this.tokenToSpan( this.peek() )

        this.consume( TKind.While )

        this.consume( TKind.LeftParen )

        const expr = this.expression()

        this.consume( TKind.RightParen )

        const statement = this.statement()

        return {
            kind: AstKind.WhileStatement,
            body: statement,
            condition: expr,
            span: this.spanRange( spanStart.start, this.getPreviousSpan().end )
        }

    }

    private doWhileStatement(): DoWhileStatement {
        
        const spanStart = this.tokenToSpan( this.peek() )

        this.consume( TKind.Do )

        const statement = this.statement()
        
        this.consume( TKind.While )

        this.consume( TKind.LeftParen )

        const expr = this.expression()

        this.consume( TKind.RightParen )

        this.consume( TKind.Semicolon )

        return {
            kind: AstKind.DoWhileStatement,
            body: statement,
            condition: expr,
            span: this.spanRange( spanStart.start, this.getPreviousSpan().end )
        }

    }

    private forStatement(): ForStatement {
        
        this.consume( TKind.For )

        let spanStart = this.getPreviousSpan()

        this.consume( TKind.LeftParen )

        // declaration
        const type = this.parseType()
        const identifier = this.parseIdentifier()

        // in / of
        let forKind: 'in' | 'of'
        
        if( this.match( TKind.In, TKind.Of ) ) {

            forKind = this.previus().kind === TKind.In ? 'in' : 'of'

        } else {

            throw new Error(`Expected 'in' or 'of' ${ this.errorLocation() }`)

        }
        
        const iterable = this.expression()
        
        let step: Expr | undefined

        if( this.match( TKind.Comma ) ) step = this.expression()

        this.consume( TKind.RightParen )

        const body = this.statement()

        return {
            kind: AstKind.ForStatement,
            body,
            type,
            identifier,
            step,
            forKind,
            iterable,
            span: this.spanRange( spanStart.start, this.getPreviousSpan().end )
        }


    }

    private breakStatement(): BreakStatement {

        this.consume( TKind.Break )
        
        const span = this.getPreviousSpan()

        this.consume( TKind.Semicolon )

        return {
            kind: AstKind.BreakStatement,
            span
        }

    }

    private nextStatement(): NextStatement {

        this.consume( TKind.Next )
        
        const span = this.getPreviousSpan()

        this.consume( TKind.Semicolon )

        return {
            kind: AstKind.NextStatement,
            span
        }

    }

    private matchClauses(): MatchClause {

        const expressions: Expr[] = []

        do {

            expressions.push( 
                
                this.expression()

            )


        } while( this.match( TKind.Comma ) && !this.isAtEnd() )

        this.consume( TKind.Colon )

        const body = this.statement()

        return {
            kind: AstKind.MatchClause, 
            body,
            expressions,
            span: this.spanRange( expressions[0].span.start, this.getPreviousSpan().end )

        }

    } 

    private matchStatement(): MatchStatement {

        this.consume( TKind.Match )

        const spanStart = this.getPreviousSpan()

        this.consume( TKind.LeftParen )

        const condition = this.expression()

        this.consume( TKind.RightParen )
        
        this.consume( TKind.LeftBrace )
        
        const clauses: MatchClause[] = []

        while( !this.check( TKind.RightBrace ) && !this.isAtEnd() ){

            clauses.push(

                this.matchClauses()

            )

            this.safeConsumeSemicolon()

            if( this.check( TKind.Else ) ) break

        }
        
        let _else: Statement | undefined = undefined

        if( this.match( TKind.Else ) ){

            _else = this.statement()

            this.consume( TKind.Semicolon )
        }

        // this.consume( TKind.Semicolon )

        this.consume( TKind.RightBrace )


        return {
            kind: AstKind.MatchStatement,
            clauses,
            condition,
            else: _else,
            span: this.spanRange( spanStart.start, this.getPreviousSpan().end )
        }

    }

    private __returnStatement(): ReturnStatement {

        this.consume( TKind.Ret )

        const spanStart = this.getPreviousSpan()

        const expr = this.expression()

        this.consume( TKind.Semicolon )

        return {
            kind: AstKind.__ReturnStatement,
            expr,
            span: this.spanRange( spanStart.start, this.getPreviousSpan().end )
        }
        
    }

    private parseModelFieldDeclaration(): ModelFieldDeclaration {

        const aSpanStart = this.tokenToSpan( this.peek() )

        const modifiers = this.parseModifiers()

        const type = this.parseType()

        const identifier = this.parseIdentifier()

        let initializer = this.parseInitializer()

        return {
            kind: AstKind.ModelFieldDeclaration,
            initializer,
            identifier,
            type,
            modifiers,
            span: this.spanRange( aSpanStart.start, this.getPreviousSpan().end )

        }

    }

    private modelStatement(): ModelDeclaration {

        this.consume( TKind.Model )

        const spanStart = this.getPreviousSpan()

        const identifier = this.parseIdentifier()

        let composition: LiteralIdentifier | undefined = undefined

        if( this.check( TKind.Colon ) ) {

            this.consume( TKind.Colon )

            composition = this.parseIdentifier()

        }

        this.consume( TKind.LeftBrace )

        const field: ModelFieldDeclaration[] = []

        while( !this.check( TKind.RightBrace ) && !this.isAtEnd() ){

            field.push(

                this.parseModelFieldDeclaration()

            )

            if( this.check( TKind.RightBrace ) ) break

            if( this.check( TKind.Comma ) ) this.consume( TKind.Comma )

        }

        this.consume( TKind.RightBrace )

        this.consume( TKind.Semicolon )

        return {
            kind: AstKind.ModelDeclaration,
            field,
            identifier,
            composition,
            span: this.spanRange( spanStart.start, this.getPreviousSpan().end )
        }

    }

    private parseAliasItem(): AliasItem {

        const spanStart = this.tokenToSpan( this.peek() )

        const identifier = this.parseIdentifier()
        
        this.consume( TKind.Colon )

        const type = this.parseType()

        return {
            kind: AstKind.AliasItem,
            type,
            identifier,
            modifiers: [],
            span: this.spanRange( spanStart.start, this.getPreviousSpan().end )

        }

    }

    private aliasStatement(): AliasStatement | AliasItem {

        this.consume( TKind.Alias )

        const spanStart = this.getPreviousSpan()

        const items: AliasItem[] = []
        
        if( this.match( TKind.LeftParen ) ){
            
            while( !this.check( TKind.RightParen ) && !this.isAtEnd() ){

                items.push(

                    this.parseAliasItem()

                )

                if( this.check( TKind.RightParen ) ) break

                if( this.check( TKind.Comma ) ) this.consume( TKind.Comma )

            }

            this.consume( TKind.RightParen )

            this.consume( TKind.Semicolon )

            return {
                kind: AstKind.AliasStatement,
                items,
                span: this.spanRange( spanStart.start, this.getPreviousSpan().end )
            }

        }

        items.push(

            this.parseAliasItem()

        )

        this.consume( TKind.Semicolon )

        return {
            kind: AstKind.AliasStatement,
            items,
            span: this.spanRange( spanStart.start, this.getPreviousSpan().end )
        }

    }

    // ----------------------------------- _Expressions_ ----------------------------------- \\

    private expression(){

        if( this.isAtEnd() ) throw new Error(`EOF in Expression`)

        return this.range()

    }

    private range() {

        let expr = this.assignment()

        if( this.match( TKind.RightArrow ) ){

            const right = this.assignment()

            expr = {
                kind: AstKind.RangeExpression,
                start: expr,
                end: right,
                span: this.spanRange( expr.span.start, right.span.end )
            } as RangeExpression

        }

        return expr

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

        if( this.match( TKind.EqualsEquals, TKind.NotEquals ) ){

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
        
        if( this.match( TKind.Star ) && this.check( TKind.Star ) ) {

            const right = this.exponent()

            expr = {
                kind: AstKind.BinaryExpression,
                right,
                left: expr,
                operator: '**',
                span: this.spanRange( expr.span.start, right.span.end )

            } as BinaryExpression

        }

        return expr

    }

    private unary(): Expr {

        if( this.match( TKind.Exclamation, TKind.Minus, TKind.Star, TKind.Circumflex, TKind.And ) ){

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

        while( !this.isAtEnd() ){

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

        if( this.match( TKind.LeftParen ) )     return this.primaryParen()

        if( this.match( TKind.NumberLiteral ) ) return this.primaryNumberLiteral()

        if( this.match( TKind.StringLiteral ) ) return this.primaryStringLiteral()

        if( this.match( TKind.CharLiteral   ) ) return this.primaryCharLiteral()

        if( this.match( TKind.Void          ) ) return this.primaryVoidLiteral()

        if( this.match( TKind.Null          ) ) return this.primaryNullLiteral()

        if( this.match( TKind.True, TKind.False, TKind.Maybe ) ) return this.primaryBoolLiteral()
        
        if( this.match( TKind.Identifier ) ) return this.primaryIdentifier()

        if( this.match( TKind.LeftBrace ) ) return this.primaryLiteralModel()

        throw new Error(`Expected Expression but it came "${ this.peek().kind }" ${this.errorLocation()}`)
        
    }

    private parseParams(){

        const args: Expr[] = []

        if( !this.check( TKind.RightParen ) ){

            do {

                args.push(

                    this.expression()

                )

            } while( this.match( TKind.Comma ) )

        }

        this.consume( TKind.RightParen )

        return args

    }

    private finishCall( callee: Expr ): CallExpression {
        
        const spanStart = this.tokenToSpan( this.peek() )

        const args = this.parseParams()

        return {
            kind: AstKind.CallExpression,
            callee,
            args,
            span: this.spanRange( spanStart.start, this.getPreviousSpan().end )

        }

    }

    // ----------------------------------- _PrimaryFuncs_ ----------------------------------- \\

    private primaryNumberLiteral() {
       return { 
            kind  : AstKind.LiteralNumber,
            value : Number( this.previus().literal ),
            span  : this.getPreviousSpan()
        } as LiteralNumber

    }

    private primaryStringLiteral(){
        return { 
            kind  : AstKind.LiteralString,
            value : this.previus().literal,
            span  : this.getPreviousSpan()
        } as LiteralString
    }

    private primaryCharLiteral(){
        return { 
            kind  : AstKind.LiteralChar,
            value : this.previus().literal,
            span  : this.getPreviousSpan()
        } as LiteralChar
    }

    private primaryVoidLiteral(){
        return { 
            kind  : AstKind.LiteralVoid,
            span  : this.getPreviousSpan()
        } as LiteralVoid
    }

    private primaryNullLiteral(){
        return { 
            kind  : AstKind.LiteralNull,
            span  : this.getPreviousSpan()
        } as LiteralNull
    }

    private primaryBoolLiteral(){
        return { 
            kind  : AstKind.LiteralBool,
            value :  this.previus().literal,
            span  : this.getPreviousSpan()
        } as LiteralBool
    }

    private primaryIdentifier(){

        const p = this.previus()

        return {
            kind: AstKind.LiteralIdentifier,
            name: p.lexeme,
            span: this.tokenToSpan( p )

        } as LiteralIdentifier

    }

    private primaryLiteralModel(){

        return this.parseLiteralModel()

    }

    private primaryParen() {

        const expr = this.expression()

        this.consume( TKind.RightParen )

        return expr
        
    }

}

export default Parser