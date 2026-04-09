import { Scope, ScopeKinds, ScopeStack } from "./Scopes.js"
import { AST, Expr, Program, Type, VariableDeclaration, LiteralIdentifier, Span, AstKind, BinaryExpression, Unary, Modifiers, ModifierNames, BlockStatement, IfElseStatement, LiteralNumber, LiteralString, LiteralChar, LiteralBool, LiteralNull, LiteralVoid, WhileStatement, DoWhileStatement, LiteralList, ForStatement, RangeExpression, BreakStatement, NextStatement, MatchStatement, MatchClause, LiteralValue, MethodDeclaration, MethodParams } from "./Types/AST.js"

type baseType = 'str' | 'bool' | 'char' | 'void' | 'null' | 'int' | 'flt' | 'dbl' | 'list' | 'any'

type sla =
    | { base: 'str'  | null, nullable: boolean, span: Span }
    | { base: 'bool' | null, nullable: boolean, span: Span }
    | { base: 'char' | null, nullable: boolean, span: Span }
    | { base: 'void' | null, nullable: boolean, span: Span }
    | { base: 'null' | null, nullable: boolean, span: Span }
    | { base: 'int'  | null, nullable: boolean, span: Span }
    | { base: 'dbl'  | null, nullable: boolean, span: Span }
    | { base: 'flt'  | null, nullable: boolean, span: Span }
    | { base: 'any'  | null, nullable: boolean, span: Span }
    | { base: 'list' | null, nullable: boolean, span: Span, inner: sla, size: number }
  

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
            
            case 'Base': return { 
                base: node.name,
                nullable: false,
                span: node.span
            } as sla

            case 'Nullable': {
                const inner = this.resolveType( node.inner )

                return {
                    ...inner,
                    nullable: true,
                    span: node.span
                }

            }

            case 'Array': return {
                base: 'list',
                nullable: false,
                span: node.span,
                inner: this.resolveType( node.inner ),
                size: node.size
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
            type === 'null' ||
            type === 'list'
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
        } as sla

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

    private analyzeExpression( node: Expr , scope: Scope ): sla {


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
                nullable: true,
                span: node.span
            }

            case AstKind.LiteralVoid: return {
                base: 'void',
                nullable: false,
                span: node.span
            }

            case AstKind.LiteralList: return this.analyzeList( node as LiteralList, scope )

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

    private isAssignable( a: sla, b: sla ): boolean {

        if( b.base === 'any' ) return true
        
        if( a.base === null ) return a.nullable 
        
        if( a.base !== b.base ) return false

        if( a.base === 'list' && b.base === 'list' ) return this.isAssignable( a.inner, b.inner )
        
        return true

    }

    private mergeTypes( a: sla, b: sla ): sla {

        if( a.base === b.base ) {

            if( a.base === 'list'){
                return {
                    base: a.base,
                    nullable: a.nullable || b.nullable,
                    span: a.span,
                    size: a.size
                } as sla
            }

            return {
                base: a.base,
                nullable: a.nullable || b.nullable,
                span: a.span
            } as sla
        }

        if( a.base === 'null' ) return {
            ...b,
            nullable: true
        }

        if( b.base === 'null' ) return {
            ...a,
            nullable: true
        }

        const nullable = a.nullable || b.nullable ? 'nullable ' : ''

        throw new Error(`Type ${ b.base } differs in ${ nullable }literal ${ a.base } ${ this.errorLocation( b.span ) }`)
    
    }

    private analyzeList( node: LiteralList, scope: Scope ) {

        if( node.size === 0 ) {

            return {
                base: 'list',
                nullable: false,
                span: node.span,
                size: node.size,
                inner: {
                    base: 'any',
                    nullable: false,
                    span: node.span,
                    size: 0
                    
                } as sla

            } as sla

        }

        let currentType = this.analyzeExpression( node.list[ 0 ], scope )

        for (let i = 1; i < node.list.length; i++) {

            const nextType = this.analyzeExpression( node.list[ i ], scope )

            currentType = this.mergeTypes( currentType, nextType )
        }

        return {
            base: 'list',
            inner: currentType,
            nullable: false,
            span: node.span,
            size: node.size
        } as sla

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
    /*
    private convertDataToList( type: sla ){

        if( type.base !== 'list') throw new Error(`TYPE IS NOT LIST`)

        // const listSize = type.
        
        const nullable = type.nullable ? '?' : '' 


        return `..${type.inner.base}${nullable}`

    }
    */

    private isInt( e: Expr ){
        return this.analyzeExpression( e, this.scopeStack.scope ).base === 'int'
    }

    private isList( e: Expr ){

        return this.analyzeExpression( e, this.scopeStack.scope ).base === 'list'

    }

    private analyzeForIn( node: ForStatement, scope: Scope ){

        const type = this.resolveType( node.type )

        if( type.base !== 'int' ) {

            throw new Error(`'For in' type must be int, but it came ${ type.base } ${ this.errorLocation( node.type.span ) } `)

        }

        if( type.nullable ) {

            throw new Error(`'For in' type cannot be nullable ${ this.errorLocation( type.span ) }`)

        }
        
        // adicionar restrição pra ponteiros tambem

        if( node.iterable.kind === AstKind.RangeExpression ){

            const range = node.iterable as RangeExpression

            if( !this.isInt( range.start ) || !this.isInt( range.end ) ){

                throw new Error(`Range expression must be 'int -> int' ${ this.errorLocation( node.iterable.span ) }`)

            }

        } else {

            throw new Error(`'For in' iterable must be an range`)

        }

        if( node.step ){

            if( !this.isInt( node.step ) ){

                throw new Error(`Step must be int ${ this.errorLocation( node.step.span ) }`)

            }

        }

    }

    private analyzeForOf( node: ForStatement, scope: Scope ) {
        
        if( node.iterable.kind === AstKind.RangeExpression ) {

            throw new Error(`In 'For of', range cannot be used ${ this.errorLocation( node.iterable.span ) }`)

        }

        const iterable = this.analyzeExpression( node.iterable , this.scopeStack.scope )

        if( iterable.base !== 'list' ) {

            throw new Error(`Iterable must be a list ${ this.errorLocation( node.iterable.span ) }`)

        }

        const type = this.resolveType( node.type )

        if( iterable.inner.base !== type.base ){
            
            throw new Error(`The declared type in the loop is not the same as the type in the list ${ this.errorLocation( type.span ) }`)

        }

        if( type.nullable !== iterable.inner.nullable ){

            if( type.nullable ){

                throw new Error(`The iterable list is not nullable, but the variable is ${ this.errorLocation( type.span ) }`)
            
            }
            
            throw new Error(`The iterable list is nullable, but the variable isn't ${ this.errorLocation( type.span ) }`)

        }

        if( node.step ){

            if( !this.isInt( node.step ) ){

                throw new Error(`Step must be int ${ this.errorLocation( node.step.span ) }`)

            }

        }

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

            if( initializer.base === 'list' && type.base === 'list' ){

                if( !this.isAssignable( type.inner, initializer.inner ) ) throw new Error(

                    `Declared list type '${ type.inner.base }' is not compatible with list type '${ initializer.inner.base }' ${this.errorLocation( initializer.span )}`
                
                )

                if( initializer.size > type.size ){

                    throw new Error(`Too many itens in list, maximum is ${ type.size } but ${ initializer.size } was assigned ${ this.errorLocation( initializer.span ) }`)

                }


            } 

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

            throw new Error(`Condition must be boolean ${ this.errorLocation( node.condition.span ) }`)

        }

        this.scopeStack.push( ScopeKinds.Loop )

        this.visit( node.body )

        this.scopeStack.pop()

    }

    private doWhileStatement(  node: DoWhileStatement ){
        
        const type = this.visit( node.condition )

        if( !this.baseIs( type?.base, 'bool' ) ){

            throw new Error(`Condition must be boolean ${this.errorLocation( node.condition.span )}`)

        }

        this.scopeStack.push( ScopeKinds.Loop )

        this.visit( node.body )

        this.scopeStack.pop()

    }

    private forStatement( node: ForStatement ){

        const scope = this.scopeStack.scope

        node.forKind === 'in' ? this.analyzeForIn( node, scope ) : this.analyzeForOf( node, scope )

    }

    private breakStatement( node: BreakStatement ) {

        if( !this.scopeStack.canbreak() ){
            
            throw new Error(`Cannot use 'break' outside a loop or match`)

        }

    }

    private nextStatement( node: NextStatement ){

        if( !this.scopeStack.canNext() ){
            
            throw new Error(`Cannot use 'next' outside a loop`)

        }

    }

    private matchClause( node: MatchClause ){
   
        this.visit( node.body )

    }

    private matchStatement( node: MatchStatement ){

        const condType = this.analyzeExpression( node.condition, this.scopeStack.scope )

        this.scopeStack.push( ScopeKinds.Match )

        const usedValues = new Set<any>()

        for( const clause of node.clauses ){

            for( const expr of clause.expressions ){

                const exprType = this.analyzeExpression( expr, this.scopeStack.scope )

                if( usedValues.has( ( expr as LiteralValue ).value ) ){

                    throw new Error(`The value '${ ( expr as LiteralValue ).value }' has already been used ${ this.errorLocation( expr.span )}`)

                }

                if( !this.isAssignable( condType, exprType ) ){

                    throw new Error(`Match condition(${ condType.base }) is not assignable with '${ exprType.base }' ${ this.errorLocation( exprType.span ) }`)

                }

                this.visit( expr )
                
                usedValues.add( ( expr as LiteralValue ).value )

            }

            this.matchClause( clause )

        }

        this.scopeStack.pop()

    }

    private methodParams( node: MethodParams ) {

        if( this.scopeStack.scope.resolveLocal( node.identifier.name ) ){

            throw new Error(`Identifier '${ node.identifier.name }' already exists in this scope ${this.errorLocation( node.identifier.span )}`)
            
        }

        const type = this.resolveType( node.type )

        if( !this.typeExist( type.base ) ) {
            
            throw new Error(`Type '${ type.base }' was never declared ${ this.errorLocation( node.span ) }`)

        }

        if( node.initializer ){

            const initializer = this.analyzeExpression( node.initializer, this.scopeStack.scope )

            if( initializer.base !== type.base ) throw new Error(`Type '${type.base}' is not compatible with '${initializer.base}' ${this.errorLocation( node.span )}`)

            if( initializer.base === 'list' && type.base === 'list' ){

                if( !this.isAssignable( type.inner, initializer.inner ) ) throw new Error(

                    `Declared list type '${ type.inner.base }' is not compatible with list type '${ initializer.inner.base }' ${this.errorLocation( initializer.span )}`
                
                )

                if( initializer.size > type.size ){

                    throw new Error(`Too many itens in list, maximum is ${ type.size } but ${ initializer.size } was assigned ${ this.errorLocation( initializer.span ) }`)

                }


            } 

        }

        this.checkModifiers( node.modifiers, this.scopeStack.scope ) 

        this.scopeStack.scope.declare({
            identfier: node.identifier,
            initialized: false,
            kind: node.type

        })

    }

    private methodDeclaration( node: MethodDeclaration ){

        this.scopeStack.push( ScopeKinds.Function )

        for( const param of node.params ){

            this.methodParams( param )

        }


        this.blockStatement( node.body )

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