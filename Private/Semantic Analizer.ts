import { addEmitHelpers, Modifier } from "typescript"
import { Scope, ScopeKinds, ScopeStack } from "./Scopes.js"
import { AST, Expr, Program, Type, VariableDeclaration, Statement, Identifier, Span, AstKind, LiteralValue, BinaryExpression, Unary, Modifiers, ModifierNames } from "./Types/AST.js"

type sla = { base: string | null, nullable: boolean, span: Span }

class SemanticAnalizer {

    public static Analize( ast: Program ){

        const analizer = new SemanticAnalizer()

        return analizer.visit( ast )

    }

    private firstLower( s: string ){
    
        return s.charAt( 0 ).toLowerCase() + s.substring( 1, s.length )

    }

    private scopeStack = new ScopeStack()

    private visit( ast: AST ){

        const func = this[ this.firstLower( ast.kind ) as keyof SemanticAnalizer ] as ( node: AST ) => void 

        if( !( func instanceof Function )) throw new Error(`"${ ast.kind }" Does't not exist in Semantic Analyzer `)

        func.call( this, ast )

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
                base: node.name,
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
            base: "bool",
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

    private analyzeExpression( node: Expr | Identifier , scope: Scope ): sla {

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

            case AstKind.Identifier: {

                const n = ( node as Identifier ) 

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

}

export default SemanticAnalizer