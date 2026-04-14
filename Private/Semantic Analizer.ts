import { Scope, ScopeKinds, ScopeStack } from "./Scopes.js"
import { AST, Expr, Program, TypeAST, VariableDeclaration, LiteralIdentifier as AstType, Span, AstKind, BinaryExpression, Unary, Modifiers, ModifierNames, BlockStatement, IfElseStatement, LiteralNumber, LiteralString, LiteralChar, LiteralBool, LiteralNull, LiteralVoid, WhileStatement, DoWhileStatement, LiteralList, ForStatement, RangeExpression, BreakStatement, NextStatement, MatchStatement, MatchClause, LiteralValue, MethodDeclaration, MethodParams, ReturnStatement, Statement, ModelDeclaration, ModelFieldDeclaration, AliasItem, AliasStatement, ExpressionStatement, MemberAccess, LiteralModel, ObjectProps } from "./Types/AST.js"
import { Flow, SemanticType, ModelSymbol } from "./Types/Semantic.js"

type baseType = 'str' | 'bool' | 'char' | 'void' | 'null' | 'int' | 'flt' | 'dbl' | 'list' | 'any' | 'model' | 'object'

class SemanticAnalizer {

    public static Analize( ast: Program ){

        const analizer = new SemanticAnalizer()

        return analizer.visit( ast )

    }

    private firstLower( s: string ){
    
        return s.charAt( 0 ).toLowerCase() + s.substring( 1, s.length )

    }

    private scopeStack = new ScopeStack()

    private visit( ast: AST ) : null | SemanticType {

        const func = this[ this.firstLower( ast.kind ) as keyof SemanticAnalizer ] as ( node: AST ) => void | SemanticType | Flow

        if( !( func instanceof Function )) throw new Error(`"${ ast.kind }" Does't not exist in Semantic Analyzer `)

        const returns = func.call( this, ast ) ?? null

        if( returns?.type === 'data' ){

            return returns

        }

        return null

    }

    private visitScopes( ast: AST ) : null | Flow {

        const func = this[ this.firstLower( ast.kind ) as keyof SemanticAnalizer ] as ( node: AST ) => void | SemanticType | Flow

        if( !( func instanceof Function )) throw new Error(`"${ ast.kind }" Does't not exist in Semantic Analyzer `)

        const returns = func.call( this, ast ) ?? null

        if( returns?.type === 'flow' ){

            return returns

        }

        return null

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

    private isPrimitive( s: string ) {

        return (
            s == 'str'  || 
            s == 'bool' || 
            s == 'char' || 
            s == 'void' || 
            s == 'null' || 
            s == 'int'  || 
            s == 'flt'  || 
            s == 'dbl'  || 
            s == 'list' || 
            s == 'any'
        )
    }

    private modifiersAllowedIn: Record< string, Set< string > > = {
        Global : new Set([ 'Mut', 'Once' ]),
        Model  : new Set([ 'Mut', 'Once' ])
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

    private resolveType( node: TypeAST ): SemanticType { /////////////////// coisar o model aq

        switch( node.kind ){
            
            case 'Base': {

                if( this.isPrimitive( node.name ) ){

                    return { 
                        base: node.name,
                        nullable: false,
                        span: node.span,
                        type: 'data',

                    } as SemanticType

                }

                const model = this.scopeStack.scope.resolveModel( node.name )

                if( !model ) throw new Error(`Model '${ node.name }' does not exist ${ this.errorLocation( node.span ) }`)

                return {

                    base: 'model',
                    nullable: false,
                    span: node.span,
                    type: 'data',
                    model

                }                

            }

            case 'Nullable': {
                const inner = this.resolveType( node.inner )

                return {
                    ...inner,
                    nullable: true,
                    span: node.span,
                    type: 'data' 

                }

            }

            case 'Array': return {
                base: 'list',
                nullable: false,
                span: node.span,
                inner: this.resolveType( node.inner ),
                size: node.size,
                type: 'data' 

            }

            default: return {
                base: null,
                nullable: false,
                span: node.span,
                type: 'data' 

            }

        }

    }

    private typeExist( type: string | null ){

        return (
            type !== null    &&
            type === 'int'   ||
            type === 'flt'   ||
            type === 'str'   ||
            type === 'dbl'   ||
            type === 'char'  ||
            type === 'bool'  ||
            type === 'void'  ||
            type === 'null'  ||
            type === 'list'  ||
            type === 'model' ||
            //!( !this.scopeStack.scope.resolveModel( type! ) ) ||
            !( !this.scopeStack.scope.resolveAlias( type! ) )
        )

    }

    private resolveMath( left: SemanticType, right: SemanticType ): SemanticType {

        if( left.base === "int" && right.base === "int" ) {

            return {
                base: "int",
                nullable: false,
                type: 'data',
                span: this.spanRange( left.span, right.span )
            }

        }

        throw new Error(`Operator not supported for ${left.base} and ${right.base}`)

    }

    private resolveComparison( left: SemanticType, right: SemanticType ): SemanticType {

        const a =  {
            base: "bool",
            nullable: false,
            span: this.spanRange( left.span, right.span )
        } as SemanticType

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

    private resolvePlus( left: SemanticType, right: SemanticType ): SemanticType {

        const span = this.spanRange( left.span, right.span )

        if( left.base === 'str' || right.base === 'str' ){
            return {
                base: 'str',
                nullable: false,
                span,
                type: 'data' 

            }
        }

        if( left.base === 'int' && right.base === 'int' ){
            return {
                base: 'int',
                nullable: false,
                span,
                type: 'data' 
            }
        }

        if( left.base === 'char' && right.base === 'char' ){
            return {
                base: 'str',
                nullable: false,
                span,
                type: 'data' 
            }
        }

        if( left.base === 'bool' && right.base === 'bool' ){
            return {
                base: 'bool',
                nullable: false,
                span,
                type: 'data' 
            }
        }

        throw new Error(`It is not possible to concatenate '${ left.base }' with '${ right.base }' ${ this.errorLocation( span ) }` )

    }

    private analyzeMemberAccess( node: MemberAccess ){

        const objectType = this.analyzeExpression( node.object, this.scopeStack.scope )

        /// throw new Error(`Type '${objectType.base}' has no members`)

        if( objectType.base !== 'model' ) return {
            base: null,
            nullable: false,
            span: node.span,
            type: 'data' 
        }

        return {} as any

    }

    private analyzeLiteralModel( node: LiteralModel ): SemanticType {

        const props = new Map< string, SemanticType >()

        for( const item of node.modelItems ){

            const valueType = this.analyzeExpression( item, this.scopeStack.scope )

            if( !valueType.base ) {

                throw new Error(`Cannot resolve type of property '${ item.identifier.name }' ${ this.errorLocation( valueType.span ) }`)

            }

            props.set( item.identifier.name, valueType )

        }

        return {
            base: 'object',
            nullable: false,
            props,
            type: "data",
            span: node.span

        }

    }

    private analyzeExpression( node: Expr , scope: Scope ): SemanticType {

        switch( node.kind ) {

            case AstKind.LiteralString: return {
                base: 'str',
                nullable: false,
                span: node.span,
                type: 'data' 
            }

            case AstKind.LiteralNumber: return { /////////////// trocar pra LiteralInt e adicionar float/double
                base: 'int',                   
                nullable: false,
                span: node.span,
                type: 'data' 
            }

            case AstKind.LiteralBool: return {
                base: 'bool',
                nullable: false,
                span: node.span,
                type: 'data' 
            }
           
            case AstKind.LiteralChar: return {
                base: 'char',
                nullable: false,
                span: node.span,
                type: 'data' 
            }

            case AstKind.LiteralNull: return {
                base: 'null',
                nullable: true,
                span: node.span,
                type: 'data' 
            }

            case AstKind.LiteralVoid: return {
                base: 'void',
                nullable: false,
                span: node.span,
                type: 'data' 
            }

            case AstKind.ObjectProps: {

                const n = node as ObjectProps

                return this.analyzeExpression( n.item, scope )

            }

            case AstKind.LiteralList: return this.analyzeList( node as LiteralList, scope )

            case AstKind.BinaryExpression: return this.anayizeBinary( ( node as BinaryExpression ), scope )

            case AstKind.UnaryExpression: return this.analyzeExpression( ( node as Unary ).right, scope )

            case AstKind.LiteralIdentifier: {

                const n = ( node as AstType ) 

                const symbolVar = this.scopeStack.scope.resolveVar( n.name )
                if( symbolVar ) return this.resolveType( symbolVar.kind )

                const symbolMethod = this.scopeStack.scope.resolveMethod( n.name )
                if( symbolMethod ) return this.resolveType( symbolMethod.returns )

                const symbolModel = this.scopeStack.scope.resolveModel( n.name )
                if( symbolModel ) return {
                    base: 'model',
                    model: symbolModel,
                    nullable: false,
                    span: node.span,
                    type: 'data'

                }

                throw new Error(`Identifier '${ n.name }' was never declared ${ this.errorLocation( node.span ) }`)
    
            }

            case AstKind.LiteralModel: return this.analyzeLiteralModel( node as LiteralModel )
            // case AstKind.MemberAccess : return this.analyzeMemberAccess( node as MemberAccess )

            default: return {
                base: null,
                nullable: false,
                span: node.span,
                type: 'data' 
            }

        }

    }

    private resolveAssignableObject( model: SemanticType, object: SemanticType ){
        
        if( object.base === 'object' && model.base === 'model' ){

            for( const [ key, targetProp ] of model.model.fields ){

                const objPropType = object.props.get( key )

                if( !objPropType ){

                    throw new Error(`Missing property '${ key }' in literal object ${ this.errorLocation( object.span ) }`)

                }

                const resolvedTargProp = this.resolveType( targetProp.type )
                
                if( !this.isAssignable( resolvedTargProp, objPropType ) ){
                    
                    const aType = targetProp.type

                    if( aType.kind === 'Base' ){

                        throw new Error(`Property '${ objPropType.base }' is not assignable with type '${ aType.name }' ${ this.errorLocation( objPropType.span ) }`)
                        
                    }

                    // throw new Error(`Literal object property named ${ key } is not assignable with type ${} ${ this.errorLocation( objPropType.span ) }`)
                    
                    throw new Error(`Error in Error XD`)

                }
                
            }

            for( const [ key ] of object.props ){

                if( !model.model.fields.has( key ) ){

                    throw new Error(`Model '${ model.base }' does not have '${ key }' field ${ this.errorLocation( object.span ) }`)

                }

            }
            
            return true

        }

        return false

    }

    private isAssignable( a: SemanticType, b: SemanticType ): boolean {
        
        if( b.base === 'any' ) return true
        
        if( a.base === null ) return a.nullable 
        
        if( a.base === 'model' && b.base === 'object' ) return this.resolveAssignableObject( a, b )

        
        if( a.base === 'list' && b.base === 'list' ) return this.isAssignable( a.inner, b.inner )
                
        if( a.base === 'model' && b.base === 'model' ) return a.model === b.model
                

        return a.base === b.base 

    }

    private mergeTypes( a: SemanticType, b: SemanticType ): SemanticType {

        if( a.base === b.base ) {

            if( a.base === 'list'){
                return {
                    base: a.base,
                    nullable: a.nullable || b.nullable,
                    span: a.span,
                    size: a.size
                } as SemanticType
            }

            return {
                base: a.base,
                nullable: a.nullable || b.nullable,
                span: a.span
            } as SemanticType
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
                type: 'data',
                inner: {
                    base: 'any',
                    nullable: false,
                    span: node.span,
                    size: 0,
                    type: 'data' 
                    
                } as SemanticType

            } as SemanticType

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
            size: node.size,
            type: 'data' 
        } as SemanticType

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

    private isInt( e: Expr ){
        return this.analyzeExpression( e, this.scopeStack.scope ).base === 'int'
    }

    private isList( e: Expr ){

        return this.analyzeExpression( e, this.scopeStack.scope ).base === 'list'

    }

    private mergeReturn( a: SemanticType | null, b: SemanticType | null ){

        if( !a ) return b
        if( !b ) return a

        if( this.isAssignable( a, b ) ) return a 
        if( this.isAssignable( b, a ) ) return b 

        throw new Error(`Incompatible return types ${ this.errorLocation( a.span ) }`)

    }

    private checkIdentifierExists( node: VariableDeclaration | MethodDeclaration | MethodParams | ModelDeclaration | ModelFieldDeclaration | AliasItem ){

        if( 
            this.scopeStack.scope.resolveLocalVar    ( node.identifier.name ) ||
            this.scopeStack.scope.resolveLocalModel  ( node.identifier.name ) ||
            this.scopeStack.scope.resolveLocalMethod ( node.identifier.name )
        ){

            throw new Error(`Identifier '${ node.identifier.name }' already exists in this scope ${this.errorLocation( node.identifier.span )}`)
            
        }

    }

    private checkTypeExist( node: Statement, type: SemanticType ){

        if( !this.typeExist( type.base ) ) {
            
            throw new Error(`Type '${ type.base }' was never declared ${ this.errorLocation( node.span ) }`)

        }

    }

    private analyzeObjectCompatibility( model: SemanticType, object: SemanticType ){
        
        return this.isAssignable( model, object )

    }

    private checkInitializer( node: VariableDeclaration | MethodParams | ModelFieldDeclaration, type: SemanticType ){

        if( node.initializer ){

            const initializer = this.analyzeExpression( node.initializer, this.scopeStack.scope )

            const isCompatible = this.analyzeObjectCompatibility( type, initializer )

            if( !isCompatible  ) throw new Error(`Type '${type.base}' is not compatible with '${initializer.base}' ${this.errorLocation( node.span )}`)

            if( initializer.base === 'list' && type.base === 'list' ){

                if( !this.isAssignable( type.inner, initializer.inner ) ) throw new Error(

                    `Declared list type '${ type.inner.base }' is not compatible with list type '${ initializer.inner.base }' ${this.errorLocation( initializer.span )}`
                
                )

                if( initializer.size > type.size ){

                    throw new Error(`Too many itens in list, maximum is ${ type.size } but ${ initializer.size } was assigned ${ this.errorLocation( initializer.span ) }`)

                }


            } 

        }
        
    }

    /*
        private chechCycle( model: ModelSymbol, visited = new Set< ModelSymbol >() ){

            if( visited.has( model ) ){

                throw new Error(`Circular dependency of the model ${ this.errorLocation( model.identifier.span ) }`)

            }

            visited.add( model )

            if( model.composition ){

                this.chechCycle( model.composition, visited )

            }

        }
    */

    // ------------------------------------------ Analisys ------------------------------------------ \\

    private program( node: Program ){

        node.body.forEach( n => this.visit( n ) )

        console.log( 'No errors founded :)' )

    }

    private variableDeclaration( node: VariableDeclaration ){

        this.checkIdentifierExists( node )

        const type = this.resolveType( node.type )


        this.checkTypeExist( node, type )

        if( !node.initializer && !type.nullable ){
            
            throw new Error(`It is not possible to declare variables without content unless they are nullable ${this.errorLocation( node.span )}`)

        }

        this.checkInitializer( node, type )

        this.checkModifiers( node.modifiers, this.scopeStack.scope ) 

        this.scopeStack.scope.declareVar({
            identifier: node.identifier,
            initialized: false,
            kind: node.type

        })

    }

    private blockStatement( node: BlockStatement ){

        this.scopeStack.push( ScopeKinds.Block )

        let flow: Flow = {
            alwaysReturns: false,
            returnsType: null,
            type: 'flow'
        }

        for( const stmt of node.body ){

            const flowStmt = this.visitScopes( stmt )

            if( !flowStmt ) continue

            flow.returnsType = this.mergeReturn( flow.returnsType, flowStmt.returnsType )
            
            if( flowStmt.alwaysReturns ){
                
                flow.alwaysReturns = true

                break

            }

        }

        this.scopeStack.pop()

        return flow

    }

    private ifElseStatement( node: IfElseStatement ){

        const type = this.visit( node.condition )

        if( !this.baseIs( type?.base, 'bool' ) ){

            throw new Error(`Condition must be boolean ${this.errorLocation( node.condition.span )}`)

        }

        const flowThen = this.visitScopes( node.thenBranch )

        const flowElse = node.elseBranch ? this.visitScopes( node.elseBranch ) : {
            type: 'flow',
            alwaysReturns: false,
            returnsType: null

        } as Flow

        if( !flowThen ){

            throw new Error(`Invalid statement in if ${ this.errorLocation( node.thenBranch.span ) }`)

        }

        if( !flowElse ){

            if( node.elseBranch ){

                throw new Error(`Invalid statement in if ${ this.errorLocation( node.elseBranch?.span ) }`)

            }

            throw new Error(`Invalid statement in else ${ this.errorLocation( node.thenBranch.span ) }`)

        }

        return {
            type: 'flow',
            alwaysReturns: flowThen?.alwaysReturns && flowElse?.alwaysReturns,
            returnsType: this.mergeReturn(
                flowThen.returnsType,
                flowElse.returnsType

            )

        } as Flow

    }

    private whileStatement( node: WhileStatement ){

        const type = this.visit( node.condition )

        if( !this.baseIs( type?.base, 'bool' ) ){

            throw new Error(`Condition must be boolean ${ this.errorLocation( node.condition.span ) }`)

        }

        this.scopeStack.push( ScopeKinds.Loop )

        const flow = this.visitScopes( node.body )

        this.scopeStack.pop()

        return {
            type: 'flow',
            alwaysReturns: false,
            returnsType: flow?.returnsType
        } as Flow

    }

    private doWhileStatement(  node: DoWhileStatement ){
        
        const type = this.visit( node.condition )

        if( !this.baseIs( type?.base, 'bool' ) ){

            throw new Error(`Condition must be boolean ${this.errorLocation( node.condition.span )}`)

        }

        this.scopeStack.push( ScopeKinds.Loop )

        const flow = this.visitScopes( node.body )

        this.scopeStack.pop()

        return {
            type: 'flow',
            alwaysReturns: false,
            returnsType: flow?.returnsType

        } as Flow

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

    private forStatement( node: ForStatement ){

        const scope = this.scopeStack.scope

        node.forKind === 'in' ? this.analyzeForIn( node, scope ) : this.analyzeForOf( node, scope )

        this.scopeStack.push( ScopeKinds.Loop )

        const flow = this.visitScopes( node.body )

        this.scopeStack.pop()

            return {
            type: 'flow',
            alwaysReturns: false,
            returnsType: flow?.returnsType

        } as Flow

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
   
        return this.visitScopes( node.body )

    }

    private matchStatement( node: MatchStatement ){

        const condType = this.analyzeExpression( node.condition, this.scopeStack.scope )

        const matchFlow: Flow = {
            type: 'flow',
            alwaysReturns: false,
            returnsType: null,
        } 
        
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

                usedValues.add( ( expr as LiteralValue ).value )

            }

            const flow = this.matchClause( clause )
            
            matchFlow.returnsType = this.mergeReturn( matchFlow.returnsType, flow?.returnsType ?? null )

            if( !flow?.alwaysReturns ){

                matchFlow.alwaysReturns = false

            }

        }

        this.scopeStack.pop()

        if( node.else ){

            const elseFlow = this.visitScopes( node.else )

            matchFlow.returnsType = this.mergeReturn( matchFlow.returnsType, elseFlow?.returnsType ?? null )


            if( !elseFlow?.alwaysReturns ){

                matchFlow.alwaysReturns = false

            }

        } else {

            matchFlow.alwaysReturns = false

        }

        return matchFlow

    }

    private methodParams( node: MethodParams ) {

        this.checkIdentifierExists( node )

        const type = this.resolveType( node.type )

        this.checkTypeExist( node, type )

        this.checkInitializer( node, type )

        this.checkModifiers( node.modifiers, this.scopeStack.scope ) 

        this.scopeStack.scope.declareVar({
            identifier: node.identifier,
            initialized: false,
            kind: node.type
        })

    }

    private methodDeclaration( node: MethodDeclaration ){

        this.checkIdentifierExists( node )

        const funcReturn = this.resolveType( node.returnType.type )

        this.checkTypeExist( node, funcReturn )

        this.scopeStack.push( ScopeKinds.Function )

        const params: TypeAST[] = []

        for( const param of node.params ){

            this.methodParams( param )

            params.push( param.type )

        }

        const flow = this.blockStatement( node.body )

        if( !flow.alwaysReturns ){

            if( funcReturn.base !== 'void' ){

                throw new Error(`The function return type is returning void ${ this.errorLocation( node.span ) }`)

            }

        }

        if( !( flow && flow.returnsType && this.isAssignable( funcReturn, flow.returnsType ) ) ){

            throw new Error(`The function type is not the same as function return type ${ this.errorLocation( funcReturn.span ) }`)

        }

        this.scopeStack.pop()

        this.scopeStack.scope.declareMethod({
            identifier : node.identifier,
            returns    : node.returnType.type,
            params
        })

    }

    private __ReturnStatement( node: ReturnStatement ){
        
        const type = this.analyzeExpression( node.expr, this.scopeStack.scope ) 
        
        return {
            type: 'flow',
            alwaysReturns: true,
            returnsType: type

        } as Flow

    }

    private modelField( node: ModelFieldDeclaration ) {

        this.checkModifiers( node.modifiers, this.scopeStack.scope  )

        this.checkIdentifierExists( node )

        const type = this.resolveType( node.type )

        this.checkTypeExist( node, type )

        this.checkInitializer( node, type )

        return {
            type: node.type,
            defaultValue: type,
            identifier: node.identifier
        }

    }

    private modelDeclaration( node: ModelDeclaration ){

        this.checkIdentifierExists( node )

        this.scopeStack.push( ScopeKinds.Model )

        let composition

        if( node.composition ){

            composition = this.scopeStack.scope.resolveModel( node.composition.name )

            if( !composition ){

                throw new Error(`Model '${ node.composition.name }' Does't not exist in this scope ${ this.errorLocation( node.composition.span ) }`)

            }

        }

        const model: ModelSymbol = {
            fields: new Map(),
            identifier: node.identifier,
            composition
        }

        for( const field of node.field ){
            
            const name = field.identifier.name

            const fieldModel = this.modelField( field )

            if( model.fields.has( name ) ){

                throw new Error(`Identifier '${ name }' has already been declared ${ this.errorLocation( field.identifier.span ) }`)

            }

            model.fields.set( name, fieldModel ) 

        }

        this.scopeStack.pop()

        this.scopeStack.scope.declareModel( model )
        
    }

    private aliasStatement( node: AliasStatement ) {

        for( const item of node.items ){

            this.checkIdentifierExists( item )

            const type = this.resolveType( item.type )

            this.checkTypeExist( node, type )

            this.scopeStack.scope.declareAlias({
                identifier: item.identifier,
                type: item.type

            })
            
        }

    }

    private expressionStatement( node: ExpressionStatement ){
        /*
        // console.log( JSON.stringify( node.expression, null, 3  ) )

        const a = this.analyzeExpression( node.expression, this.scopeStack.scope )

        
        console.log( JSON.stringify( a, null, 3  ) )
        */

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

    private literalIdentifier( node: AstType ){
        
        return this.analyzeExpression( node, this.scopeStack.scope )
        
    }

}

export default SemanticAnalizer