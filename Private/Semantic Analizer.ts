import { Scope, ScopeKinds, ScopeStack } from "./Scopes.js"
import { AST, Expr, Program, Type, VariableDeclaration, Statement, LiteralIdentifier, Span, AstKind, LiteralValue, BinaryExpression, Unary, Modifiers, ModifierNames, BlockStatement, IfElseStatement, LiteralNumber, LiteralString, LiteralChar, LiteralBool, LiteralNull, LiteralVoid, WhileStatement } from "./Types/AST.js"

type baseType = 'str' | 'bool' | 'char' | 'void' | 'null' | 'int' | 'flt' | 'dbl'

type sla = { base: baseType | null, nullable: boolean, span: Span }


class SemanticAnalizer {

    public static Analize( ast: Program ){

        const analizer = new SemanticAnalizer()

        return analizer.visit( ast )

    }

    private firstLower( s: string ){
    
        return s.charAt( 0 ).toLowerCase() + s.substring( 1, s.length )

    }

    private scopeStack = new ScopeStack()

    private visit( ast: AST ) : null | sla {

        const func = this[ this.firstLower( ast.kind ) as keyof SemanticAnalizer ] as ( node: AST ) => void 

        if( !( func instanceof Function )) throw new Error(`"${ ast.kind }" Does't not exist in Semantic Analyzer `)

        return func.call( this, ast ) ?? null

    }

    private errorLocation( span: Span ){

        const start = span.start
        const end   = span.end

        const idk = start.line === end.line ? '' : `line: ${ end.line } column: `

        return `at line: ${ start.line } column: ${ start.column } to ${idk}${ end.column }`

    }

    private spanRange( start: Span, end: Span ){
        return { start: start.start, end: end.end } as Span
    }

    // ------------------------------------------ Helpers ------------------------------------------ \\

    private modifiersAllowedIn: Record< string, Set< string > > = {
        Global: new Set([ 'Mut', 'Once' ]),
    }

    private isModifierAlloed( scopeKind: ScopeKinds, modifier: Modifiers[] ){

        const seen: Set< string > = new Set()

        for( const mod of modifier ){

            if( seen.has( mod.name ) ){

                throw new Error(`Modifier '${ mod.name }' has already been mentioned ${ this.errorLocation( mod.span ) }`)

            }

            const exists = this.modifiersAllowedIn[ scopeKind as string ].has( mod.name )

            if( !exists ) throw new Error(`Cannot use modifier '${ mod.name }' in ${ scopeKind } scope ${ this.errorLocation( mod.span ) }`)
            
        }

    }

    private resolveType( node: Type ): sla {
        
        switch( node.kind ){
            
            case "Base": return { 
                base: node.name as baseType,
                nullable: false,
                span: node.span
            }

            case "Nullable": {
                const inner = this.resolveType( node.inner )

                return {
                    ...inner,
                    nullable: true,
                    span: node.span

                }
            }

            default: return {
                base: null,
                nullable: false,
                span: node.span

            }

        }

    }

    private typeExist( type: string | null ){

        return (
            type !== null   &&
            type === 'int'  ||
            type === 'flt'  ||
            type === 'str'  ||
            type === 'dbl'  ||
            type === 'char' ||
            type === 'bool' ||
            type === 'void' ||
            type === 'null' 
        )

    }

    private resolveMath( left: sla, right: sla ): sla {

        if( left.base === "int" && right.base === "int" ) {

            return {
                base: "int",
                nullable: false,
                span: this.spanRange( left.span, right.span )
            }

        }

        throw new Error(`Operator not supported for ${left.base} and ${right.base}`)

    }

    private resolveComparison( left: sla, right: sla ): sla {

        const a =  {
            base: "bool" as baseType,
            nullable: false,
            span: this.spanRange( left.span, right.span )
        }

        if( left.base === 'null' || right.base === 'null' ) return a 
        if( left.base === 'void' || right.base === 'void' ) return a 
        
        if( left.base !== right.base ) {

            throw new Error(`Cannot compare ${left.base} with ${right.base}`)

        }

        return a 

    }

    private anayizeBinary( node: BinaryExpression, scope: Scope ){

        const left  = this.analyzeExpression( node.left, scope )
        const right = this.analyzeExpression( node.right, scope )

        switch( node.operator ){
            case '+': return this.resolvePlus( left, right )
            case '-': 
            case '*': 
            case '**': 
            case '/': return this.resolveMath( left, right )
            case "==":
            case "!=":
            case "<":
            case ">":
            case "<=":
            case ">=": 
            case "||": 
            case "&&": return this.resolveComparison( left, right )

            default: {
                throw new Error(`Operator '${ node.operator }' not supported for ${left.base} and ${right.base} ${ this.errorLocation( this.spanRange( left.span, right.span ) ) }`)
            }

        }

    }

    private kindIs( type: AstKind, ...types: AstKind[] ){

        for( const a of types ){

            if( a === type ) return true 

        }

        return false

    }

    private resolvePlus( left: sla, right: sla ): sla {

        const span = this.spanRange( left.span, right.span )

        if( left.base === 'str' || right.base === 'str' ){
            return {
                base: 'str',
                nullable: false,
                span
            }
        }

        if( left.base === 'int' && right.base === 'int' ){
            return {
                base: 'int',
                nullable: false,
                span
            }
        }

        if( left.base === 'char' && right.base === 'char' ){
            return {
                base: 'str',
                nullable: false,
                span
            }
        }

        if( left.base === 'bool' && right.base === 'bool' ){
            return {
                base: 'bool',
                nullable: false,
                span
            }
        }

        throw new Error(`It is not possible to concatenate '${ left.base }' with '${ right.base }' ${ this.errorLocation( span ) }` )

    }

    private analyzeExpression( node: Expr | LiteralIdentifier , scope: Scope ): sla {

        switch( node.kind ) {

            case AstKind.LiteralString: return {
                base: 'str',
                nullable: false,
                span: node.span
            }

            case AstKind.LiteralNumber: return { /////////////// trocar pra LiteralInt e adicionar float/double
                base: 'int',                   
                nullable: false,
                span: node.span
            }

            case AstKind.LiteralBool: return {
                base: 'bool',
                nullable: false,
                span: node.span
            }
           
            case AstKind.LiteralChar: return {
                base: 'char',
                nullable: false,
                span: node.span
            }

            case AstKind.LiteralNull: return {
                base: 'null',
                nullable: false,
                span: node.span
            }

            case AstKind.LiteralVoid: return {
                base: 'void',
                nullable: false,
                span: node.span
            }

            case AstKind.BinaryExpression: return this.anayizeBinary( ( node as BinaryExpression ), scope )

            case AstKind.UnaryExpression: return this.analyzeExpression( ( node as Unary ).right, scope )

            case AstKind.LiteralIdentifier: {

                const n = ( node as LiteralIdentifier ) 

                const symbol = this.scopeStack.scope.resolve( n.name )

                if( !symbol ) throw new Error(`Variable '${ n.name }' was never declared ${ this.errorLocation( node.span ) }`)
                
                return this.resolveType( symbol.kind )

            }

            default: return {
                base: null,
                nullable: false,
                span: node.span
            }

        }

    }

    private checkModifiers( modifiers: Modifiers[], scope: Scope ) {

        return this.isModifierAlloed( scope.kind, modifiers )

    }

    private baseIs( base: baseType | undefined | null, ...types: baseType[] ) {

        if( !base ) return false

        for( const t of types ) {

            if( base === t ) return true

        }

        return false

    }

    // ------------------------------------------ Analisys ------------------------------------------ \\

    private program( node: Program ){

        node.body.forEach( n => this.visit( n ) )

        console.log( 'No errors founded :)' )

    }

    private variableDeclaration( node: VariableDeclaration ){

        if( this.scopeStack.scope.resolveLocal( node.identifier.name ) ){

            throw new Error(`Identifier '${ node.identifier.name }' already exists in this scope ${this.errorLocation( node.identifier.span )}`)
            
        }

        const type = this.resolveType( node.type )

        if( !this.typeExist( type.base ) ) {
            
            throw new Error(`Type '${ type.base }' was never declared ${ this.errorLocation( node.span ) }`)

        }

        if( !node.initializer && !type.nullable ){
            
            throw new Error(`It is not possible to declare variables without content unless they are nullable ${this.errorLocation( node.span )}`)

        }

        if( node.initializer ){

            const initializer = this.analyzeExpression( node.initializer, this.scopeStack.scope )

            if( initializer.base !== type.base ) throw new Error(`Type '${type.base}' is not compatible with '${initializer.base}' ${this.errorLocation( node.span )}`)

        }

        this.checkModifiers( node.modifiers, this.scopeStack.scope ) 

        this.scopeStack.scope.declare({
            identfier: node.identifier,
            initialized: false,
            kind: node.type

        })

    }

    private blockStatement( node: BlockStatement ){

        this.scopeStack.push( ScopeKinds.Block )

        for( const stmt of node.body ){

            this.visit( stmt )

        }

        this.scopeStack.pop()

    }

    private ifElseStatement( node: IfElseStatement ){

        const type = this.visit( node.condition )

        if( !this.baseIs( type?.base, 'bool' ) ){

            throw new Error(`Condition must be boolean ${this.errorLocation( node.condition.span )}`)

        }

        this.visit( node.thenBranch )

        if( node.elseBranch ) this.visit( node.elseBranch )


    }

    private whileStatement( node: WhileStatement ){

        const type = this.visit( node.condition )

        if( !this.baseIs( type?.base, 'bool' ) ){

            throw new Error(`Condition must be boolean ${this.errorLocation( node.condition.span )}`)

        }

        this.scopeStack.push( ScopeKinds.Loop )

        this.visit( node.body )

        this.scopeStack.pop()

    }

    // ----------------------------------- Literals ----------------------------------- \\

    private literalNumber( node: LiteralNumber ) {

        return this.analyzeExpression( node, this.scopeStack.scope )
    
    }

    private literalString( node: LiteralString ) {

        return this.analyzeExpression( node, this.scopeStack.scope )
    
    }

    private literalChar( node: LiteralChar ) {

        return this.analyzeExpression( node, this.scopeStack.scope )
    
    }

    private literalBool( node: LiteralBool ) {

        return this.analyzeExpression( node, this.scopeStack.scope )
    
    }

    private literalNull( node: LiteralNull ) {

        return this.analyzeExpression( node, this.scopeStack.scope )
    
    }

    private literalVoid( node: LiteralVoid ) {

        return this.analyzeExpression( node, this.scopeStack.scope )
    
    }

    private literalIdentifier( node: LiteralIdentifier ){
        
        return this.analyzeExpression( node, this.scopeStack.scope )
        
    }

}

export default SemanticAnalizer