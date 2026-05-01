
import { Scope, ScopeKinds, ScopeStack } from "./Scopes.js"
import { AST, Expr, Program, TypeAST, VariableDeclaration, LiteralIdentifier as AstType, Span, AstKind, BinaryExpression, Unary, Modifiers, ModifierNames, BlockStatement, IfElseStatement, LiteralNumber, LiteralString, LiteralChar, LiteralBool, LiteralNull, LiteralVoid, WhileStatement, DoWhileStatement, LiteralList, ForStatement, RangeExpression, BreakStatement, NextStatement, MatchStatement, MatchClause, LiteralValue, MethodDeclaration, MethodParams, ReturnStatement, Statement, ModelDeclaration, ModelFieldDeclaration, AliasItem, AliasStatement, ExpressionStatement, MemberAccess, LiteralModel, ObjectProps, CallExpression, LiteralIdentifier, OwnExpression, ListAccess } from "./Types/AST.js"
import { Flow, SemanticType, ModelSymbol, MethodSymbol, SemanticResult } from "./Types/Semantic.js"

type baseType = 
    | 'str'
    | 'bool'
    | 'char'
    | 'void'
    | 'null'
    | 'int'
    | 'flt'
    | 'dbl'
    | 'list'
    | 'any'
    | 'model'
    | 'object'
    | 'alias'
    | 'method'
    | 'ptr'
    | 'uniqPtr'
    | 'uniqVal'


class SemanticAnalizer {

    public static Analize( ast: Program ){

        const analizer = new SemanticAnalizer()

        return analizer.visit( ast )

    }

    private firstLower( s: string ){
    
        return s.charAt( 0 ).toLowerCase() + s.substring( 1, s.length )

    }

    private scopeStack = new ScopeStack()

    private visit( ast: AST ) : null | SemanticResult {

        const func = this[ this.firstLower( ast.kind ) as keyof SemanticAnalizer ] as ( node: AST ) => void | SemanticResult | Flow

        if( !( func instanceof Function )) throw new Error(`"${ ast.kind }" Does't not exist in Semantic Analyzer `)

        const returns = func.call( this, ast ) ?? null

        if( !returns || returns?.type === 'flow' ) return null

        return returns

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


    private typeToString( t: SemanticType ): string {
        
        const nullableToString = ( s: string ) =>  t.nullable ? `${s}?` : s 


        if( t.base === 'ptr' ) {

            return nullableToString( `${ this.typeToString( t.to.type ) }*` )

        }

        if( t.base === 'uniqPtr' ) {

            return nullableToString( `${ this.typeToString( t.to.type ) }^` )

        }

        if( t.base === 'uniqVal' ){

            return nullableToString( `${ this.typeToString( t.value.type ) }^` )

        }

        if( t.base === 'list' ){

            return nullableToString( `Array<${ this.typeToString( t.inner.type ) }>` )

        }

        if( t.base === 'alias' ){

            const types = t.alias.types.map( aliasType => this.typeToString( this.resolveType( aliasType ).type ) )

            return nullableToString( `${ types.join(' | ')  }`)

        }

        return nullableToString( t.base! )

    }

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

    private isLlValue( sType: BinaryExpression ) {
        
        switch( sType.left.kind ){

            case AstKind.LiteralIdentifier : return true
            case AstKind.MemberAccess      : return true
            case AstKind.UnaryExpression   : return sType.operator === '*'
        
        }

        return false
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

    private resolveType( node: TypeAST ): SemanticResult { /////////////////// coisar o model aq 
        
        switch( node.kind ){
            
            case 'Base': {

                if( this.isPrimitive( node.name ) ){

                    return { 
                        type: {
                            base: node.name,
                            nullable: false,
                            span: node.span,
                            type: 'data',
                            isUnique: false,
                        },

                        valueKind: 'lvalue'

                    } as SemanticResult

                }

                const model = this.scopeStack.scope.resolveModel( node.name )

                if( model )  {
                    return {
                        type: {
                            base: 'model',
                            nullable: false,
                            span: node.span,
                            type: 'data',
                            isUnique: false,

                            model
                        },
                        valueKind: 'lvalue'

                    }
                }

                const alias = this.scopeStack.scope.resolveAlias( node.name )
                
                if( alias )  {

                    return {
                        type: {
                            base: 'alias',
                            nullable: false,
                            span: node.span,
                            type: 'data',
                            isUnique: false,
                            alias
                        },
                        valueKind: 'lvalue'
                    }

                }

                const method = this.scopeStack.scope.resolveMethod( node.name )

                if( method ) {

                    return {
                        type: {
                            base: 'method',
                            nullable: false,
                            isUnique: false,
                            type: 'data',
                            span: node.span,
                            method,
                        },
                        valueKind: 'lvalue'
                    }


                }

                throw new Error(`Type '${ node.name }' does not exist ${ this.errorLocation( node.span ) }`)

            }

            case 'Nullable': {

                const inner = this.resolveType( node.inner )
                
                inner.type.nullable = true

                return {
                    type: inner.type,
                    valueKind: 'lvalue'

                } as SemanticResult

            }

            case 'Pointer': return {
                type: {
                    base: 'ptr',
                    nullable: false,
                    span: node.span,
                    type: 'data',
                    isUnique: false,
                    to: this.resolveType( node.inner )
                },
                valueKind: 'lvalue'
            }

            case 'UniquePointer': return {
                type: {
                    base: 'uniqPtr',
                    nullable: false,
                    span: node.span,
                    type: 'data',
                    isUnique: true,

                    to: this.resolveType( node.inner )
                },
                valueKind: 'lvalue'
            }

            case 'Array': return {
                type: {
                    base: 'list',
                    nullable: false,
                    span: node.span,
                    inner: this.resolveType( node.inner ),
                    size: node.size,
                    isUnique: false,

                    type: 'data' 
                },
                valueKind: 'lvalue'

            }

            default: return {
                type: {
                    base: null,
                    nullable: false,
                    span: node.span,
                    isUnique: false,
                    type: 'data'
                },
                valueKind: 'lvalue'
            }

        }

    }

    private typeExist( type: string | null ){

        return (
            type !== null  && (
                
                type === 'int'     ||
                type === 'flt'     ||
                type === 'str'     ||
                type === 'dbl'     ||
                type === 'char'    ||
                type === 'bool'    ||
                type === 'void'    ||
                type === 'null'    ||
                type === 'list'    ||
                type === 'model'   ||
                type === 'alias'   ||
                type === 'ptr'     ||
                type === 'uniqPtr'
            )
        )

    }

    private resolveMath( node: BinaryExpression, scope: Scope ): SemanticResult {

        const left  = this.analyzeExpression( node.left, scope ).type
        const right = this.analyzeExpression( node.right, scope ).type

        if( left.base === "int" && right.base === "int" ) {

            return {
                type: {
                    base: "int",
                    nullable: false,
                    isUnique: false,
                    type: 'data',
                    span: this.spanRange( left.span, right.span )
                },
                valueKind: 'rvalue'
            }


        }

        throw new Error(`Operator not supported for ${left.base} and ${right.base}`)

    }

    private resolveComparison( node: BinaryExpression, scope: Scope ): SemanticResult {

        const left  = this.analyzeExpression( node.left, scope ).type
        const right = this.analyzeExpression( node.right, scope ).type

        const a =  {
            type: {
                base: "bool",
                nullable: false,
                isUnique: false,
                type: 'data',
                span: this.spanRange( left.span, right.span )
            },
            valueKind: 'rvalue'
        } as SemanticResult

        if( left.base === 'null' || right.base === 'null' ) return a 
        if( left.base === 'void' || right.base === 'void' ) return a 
        
        if( left.base !== right.base ) {

            throw new Error(`Cannot compare ${left.base} with ${right.base}`)

        }

        return a 

    }

    private resolveAssignment( node: BinaryExpression, scope: Scope ): SemanticResult {

        const left = this.analyzeExpression( node.left, scope )
        const leftType = left.type
        
        if( !this.isLlValue( node ) ){
            
            throw new Error(`Invalid assignment target ${ this.errorLocation( node.left.span ) }`)
            
        }
        
        const right = this.analyzeExpression( node.right, scope )
        const rightType = right.type

        this.checkAssignmentErrors( left, right, node )

        const isCompatible = this.isAssignable( leftType, rightType )

        if( !isCompatible  ) throw new Error(`Type '${ this.typeToString( leftType ) }' is not compatible with '${ this.typeToString( rightType ) }' ${this.errorLocation( rightType.span )}`)

        return {
            type: {
                base:'void',
                isUnique: false,
                nullable: false,
                type: 'data',
                span: this.spanRange( leftType.span, rightType.span )
            },
            valueKind: 'rvalue'
        }

    }

    private analyzeBinary( node: BinaryExpression, scope: Scope ){
        
        switch( node.operator ){
            case '=': return this.resolveAssignment( node, scope )
            case '+': return this.resolvePlus( node, scope  )
            case '-': 
            case '*': 
            case '**': 
            case '/': return this.resolveMath( node, scope )
            case "==":
            case "!=":
            case "<":
            case ">":
            case "<=":
            case ">=": 
            case "||": 
            case "&&": return this.resolveComparison( node, scope )

            default: {
    
                throw new Error(`Operator '${ node.operator }' not supported for ${ node.left.kind } and ${ node.right.kind } ${ this.errorLocation( this.spanRange( node.left.span, node.right.span ) ) }`)
            }

        }

    }

    private kindIs( type: AstKind, ...types: AstKind[] ){

        for( const a of types ){

            if( a === type ) return true 

        }

        return false

    }

    private resolvePlus( node: BinaryExpression, scope: Scope ): SemanticResult {

        const left  = this.analyzeExpression( node.left, scope ).type
        const right = this.analyzeExpression( node.right, scope ).type

        const span = this.spanRange( left.span, right.span )

        if( left.base === 'str' || right.base === 'str' ){
            return {
                type: {
                    base: 'str',
                    nullable: false,
                    isUnique: false,
                    span,
                    type: 'data' 
                },
                valueKind: 'rvalue'

            }
        }

        if( left.base === 'int' && right.base === 'int' ){
            return {
                type: {
                base: 'int',
                    isUnique: false,
                    nullable: false,
                    span,
                    type: 'data' 
                },
                valueKind: 'rvalue'
            }
        }

        if( left.base === 'char' && right.base === 'char' ){
            return {
                type: {
                    base: 'str',
                    isUnique: false,
                    nullable: false,
                    span,
                    type: 'data' 
                },
                valueKind: 'rvalue'
            }
        }

        if( left.base === 'bool' && right.base === 'bool' ){
            return {
                type: {
                    base: 'bool',
                    isUnique: false,
                    nullable: false,
                    span,
                    type: 'data' 
                },
                valueKind: 'rvalue'
            }
        }

        throw new Error(`It is not possible to concatenate '${ left.base }' with '${ right.base }' ${ this.errorLocation( span ) }` )

    }

    private analyzeMemberAccess( node: MemberAccess ): SemanticResult {

        const objectType = this.analyzeExpression( node.object, this.scopeStack.scope ).type

        /// throw new Error(`Type '${objectType.base}' has no members`)

        if( objectType.base !== 'model' ){

            throw new Error(`Type '${ objectType.base }' has no members ${ this.errorLocation( objectType.span ) }`)

        }

        if( node.kind !== AstKind.MemberAccess ) throw new Error('???')
            
        const a = objectType.model.fields.get( node.member )

        if( !a ) {

            throw new Error(`Type '${ objectType.model.identifier.name }' has no member named '${ node.member }' ${ this.errorLocation( node.span ) }`)

        }

        return this.resolveType( a.type )

    }

    private analyzeLiteralModel( node: LiteralModel ): SemanticResult {

        const props = new Map< string, SemanticResult >()

        for( const item of node.modelItems ){

            const valueType = this.analyzeExpression( item, this.scopeStack.scope )

            if( !valueType.type.base ) {

                throw new Error(`Cannot resolve type of property '${ item.identifier.name }' ${ this.errorLocation( valueType.type.span ) }`)

            }

            props.set( item.identifier.name, valueType )

        }

        return {
            type: {
                base: 'object',
                isUnique: false,
                nullable: false,
                props,
                type: "data",
                span: node.span
            },
            valueKind: 'rvalue'
        }

    }

    private analyzeObjectProps( node: ObjectProps ): SemanticResult {
        
        const item = this.analyzeExpression( node.item, this.scopeStack.scope )

        if( !item.type ) return {
            type: {
                base: 'null',
                nullable: false,
                span: node.span,
                isUnique: false,
                type: 'data'
            },
            valueKind: 'rvalue'
        }

        return item

        /*
        console.log( item )

        if( item.base !== 'model' ){


        }

        /*
            if( item.base === 'object' ){

                const d = item.props.get( node.identifier.name )

                if( !d ) {

                    throw new Error(`Type '${ item.base }' has no member named '${ node.identifier.name }' ${ this.errorLocation( node.identifier.span ) }`)

                }


            }
        //*

        if( item.base === 'model' ){

            const d = item.model.fields.get( node.identifier.name )

            if( !d ) {

                throw new Error(`Type '${ item.model.identifier.name }' has no member named '${ node.identifier.name }' ${ this.errorLocation( node.identifier.span ) }`)

            }

            return this.resolveType( d.type )

        }


        return item
        */
    }

    private analyzeExpressionStatement( node: ExpressionStatement ): SemanticResult {

        return this.analyzeExpression( node.expression, this.scopeStack.scope )

    }

    private analyzeCallExpression( node: CallExpression ): SemanticResult {
        
        const ident = node.callee as LiteralIdentifier 
        
        const method = this.scopeStack.scope.resolveMethod( ident.name )

        if( !method ) {

            throw new Error(`Method '${ ident.name }' does not exist ${ this.errorLocation( ident.span ) }`)

        }

        for( let i = 0; i < method.params.length; i++ ){
            
            const param = method.params[ i ]
            const arg   = node.args[ i ] 

            if( !arg ) {

                const lastArg = node.args[ node.args.length - 1 ] 

                throw new Error(`Missing type '${ param.kind }' in method arguments ${ this.errorLocation( lastArg.span ) }`)

            }

            const semanticParam = this.resolveType( param ).type

            const semanticArg = this.analyzeExpression( arg, this.scopeStack.scope ).type

            if( !this.isAssignable( semanticParam, semanticArg ) ){

                throw new Error(`Argument type '${ semanticArg.base }' is not assignable with parameter type '${ semanticParam.base }' ${ this.errorLocation( arg.span ) }`)

            }

        }

        for( let i = 0; i < node.args.length; i++ ){
            
            const param = method.params[ i ]

            if( !param ){

                const lastParam = method.params[ method.params.length - 1 ] 

                throw new Error(`Too many parameters ${ this.errorLocation( lastParam.span ) }`)

            }

        }

        return this.resolveType( method.returns )

    }

    private resolveMethod( method: MethodSymbol, span: Span ): SemanticResult {

        return {
            type: {
                base: 'method',
                method,
                isUnique: false,
                nullable: false,
                span,
                type: "data"
            },
            valueKind: 'rvalue'

        }

    }

    private analyzeUniquePtr( node: Unary, scope: Scope ): SemanticResult {

        const to = this.analyzeExpression( node.right, scope )

        if( to ) {

            throw new Error(`Cannot create double unique pointer ${ this.errorLocation( node.right.span ) }`)

        }

        return {
            type: {
                base    : 'uniqPtr',
                isUnique: true,
                nullable: false,
                span    : node.span,
                type    : 'data',
                to
            },
            valueKind: 'rvalue'
        }

    }

    private analyzeUnary( node: Unary, scope: Scope ): SemanticResult {

        switch( node.operator ){

            case '-':
            case '!': return this.analyzeExpression( node.right, scope )
            
            case '*': {

                const a = this.analyzeExpression( node.right, scope ).type
                
                if( a.base !== 'ptr' ){

                    return {
                        type: {
                            isUnique: false,
                            base    : 'ptr',
                            nullable: false,
                            span    : node.span,
                            type    : 'data',
                            to      : this.analyzeExpression( node.right, scope )
                        },
                        valueKind: 'rvalue'
                    }

                }

                return a.to

            }
            case '^':  return this.analyzeUniquePtr( node, scope )
            case '&':  return {
                type: {
                    isUnique: false,
                    base    : 'ptr',
                    nullable: false,
                    span    : node.span,
                    type    : 'data',
                    to      : this.analyzeExpression( node.right, scope )
                },
                valueKind: 'rvalue'
            }

        }

        throw new Error(`unknown operator: '${ node.operator }' ${ this.errorLocation( node.span ) }`)

    }

    private analyzeOwnExpression( node: OwnExpression, scope: Scope ): SemanticResult {

        const value = this.analyzeExpression( node.expr, scope )

        if( value.type.base === 'uniqVal' ){

            throw new Error(`'own' Has already been mentioned ${ this.errorLocation( node.expr.span ) }`)

        }

        return {
            type: {
                base: 'uniqVal',
                isUnique: true,
                nullable: false,
                span: node.span,
                type: 'data',
                value
            },
            valueKind: 'rvalue'
        }

    }

    private analyzeIdentifier( node: LiteralIdentifier, scope: Scope ): SemanticResult {

        const n = ( node as AstType ) 

        const symbolVar = this.scopeStack.scope.resolveVar( n.name )
        if( symbolVar ) return this.resolveType( symbolVar.kind )

        const symbolMethod = this.scopeStack.scope.resolveMethod( n.name )
        if( symbolMethod ) return this.resolveMethod( symbolMethod, node.span )

        const symbolModel = this.scopeStack.scope.resolveModel( n.name )
        if( symbolModel ) return {
            type: {
                base: 'model',
                model: symbolModel,
                isUnique: false,
                nullable: false,
                span: node.span,
                type: 'data'
            },
            valueKind: 'lvalue'

        }

        const aliasSymbol = this.scopeStack.scope.resolveAlias( n.name )

        if( aliasSymbol ) return {
            type: {
                base     : 'alias',
                alias    : aliasSymbol,
                isUnique : false,
                nullable : false,
                span     : aliasSymbol.identifier.span,
                type     : "data" 
            },
            valueKind : 'lvalue'
        }

        throw new Error(`Identifier '${ n.name }' was never declared ${ this.errorLocation( node.span ) }`)

    }

    private listAccess( node: ListAccess, scope: Scope ): SemanticResult {

        const targ = this.analyzeExpression( node.target, scope )

        if( targ.type.base !== 'list' && targ.type.base !== 'alias' ) {

            throw new Error(`'${ targ.type.base } '  It's not a list ${ this.errorLocation( targ.type.span ) }`)

        }

        const index = this.analyzeExpression( node.index, scope )

        if( index.type.base !== "int" ){

            throw new Error(`List access must be a number ${ this.errorLocation( index.type.span ) }`)

        }

        if( targ.type.base === 'list' ){

            return {
                type: targ.type.inner.type,
                valueKind: 'rvalue' // pode ser tanto r quanto l ( não sei como faz isso XD )
            }

        }

        return {
            type: targ.type,
            valueKind: 'rvalue'
        }

        // if( targ.type.size > index.type ){}


    }

    private analyzeExpression( node: Expr , scope: Scope ): SemanticResult {

        switch( node.kind ) {

            case AstKind.LiteralString: return {
                type: {
                    base: 'str',
                    isUnique: false,
                    nullable: false,
                    span: node.span,
                    type: 'data' 
                },
                valueKind: 'rvalue'
            }

            case AstKind.LiteralNumber: return { /////////////// trocar pra LiteralInt e adicionar float/double
                type: {

                    base: 'int',                   
                    isUnique: false,
                    nullable: false,
                    span: node.span,
                    type: 'data' 
                },

                valueKind: 'rvalue'

            }

            case AstKind.LiteralBool: return {
                type: {
                    base: 'bool',
                    isUnique: false,
                    nullable: false,
                    span: node.span,
                    type: 'data' 
                },

                valueKind: 'rvalue'

            }
           
            case AstKind.LiteralChar: return {
                type: {

                    base: 'char',
                    isUnique: false,
                    nullable: false,
                    span: node.span,
                    type: 'data' 
                },

                valueKind: 'rvalue'

            }

            case AstKind.LiteralNull: return {
                type: {
                    base: 'null',
                    isUnique: false,
                    nullable: true,
                    span: node.span,
                    type: 'data' 
                },

                valueKind: 'rvalue'

            }

            case AstKind.LiteralVoid: return {
                type: {
                    base: 'void',
                    isUnique: false,
                    nullable: false,
                    span: node.span,
                    type: 'data' 
                },

                valueKind: 'rvalue'

            }

            case AstKind.MemberAccess: return this.analyzeMemberAccess( node as MemberAccess )

            case AstKind.ObjectProps: return this.analyzeObjectProps( node as ObjectProps )

            case AstKind.LiteralList: return this.analyzeList( node as LiteralList, scope )

            case AstKind.BinaryExpression: return this.analyzeBinary( ( node as BinaryExpression ), scope )

            // case AstKind.UnaryExpression: return this.analyzeExpression( ( node as Unary ).right, scope )

            case AstKind.UnaryExpression: return this.analyzeUnary( node as Unary, scope )


            case AstKind.LiteralIdentifier: return this.analyzeIdentifier( node as LiteralIdentifier, scope )

            case AstKind.CallExpression: return this.analyzeCallExpression( node as CallExpression )

            case AstKind.LiteralModel: return this.analyzeLiteralModel( node as LiteralModel )
            // case AstKind.MemberAccess : return this.analyzeMemberAccess( node as MemberAccess )

            case AstKind.ExpressionStatement: return this.analyzeExpressionStatement( node as ExpressionStatement )

            case AstKind.OwnExpression: return this.analyzeOwnExpression( node as OwnExpression, scope )

            case AstKind.ListAccess: return this.listAccess( node as ListAccess, scope )

            default: {

                console.warn(`Expression type '${ node.kind }' has no analysis`)

                return {

                    type: {
                        base: null,
                        isUnique: false,
                        nullable: false,
                        span: node.span,
                        type: 'data' 
                    },
                    valueKind: 'lvalue'

                }

            }

        }

    }

    private resolveAssignableObject( model: SemanticType, object: SemanticType ){
        
        if( object.base === 'object' && model.base === 'model' ){

            for( const [ key, targetProp ] of model.model.fields ){

                const objPropType = object.props.get( key )?.type

                if( !objPropType ){

                    throw new Error(`Missing property '${ key }' in literal object ${ this.errorLocation( object.span ) }`)

                }

                const resolvedTargProp = this.resolveType( targetProp.type ).type
                
                if( !this.isAssignable( resolvedTargProp, objPropType ) ){
                    
                    const aType = targetProp.type

                    if( aType.kind === 'Base' ){

                        throw new Error(`Property '${ objPropType.base }' is not assignable with type '${ aType.name }' ${ this.errorLocation( objPropType.span ) }`)
                        
                    }

                    if( aType.kind === 'Array' ){

                        const t = this.resolveType( aType )

                        throw new Error(`Property '${ this.typeToString( objPropType ) }' is not assignable with type '${ this.typeToString( t.type ) }' ${ this.errorLocation( objPropType.span ) }`)

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

    private resolveAssignableAlias( alias: SemanticType, base: SemanticType ) {

        if( alias.base !== 'alias' ) return false

        for( const type of alias.alias.types ){

            const aliasType = this.resolveType( type ).type
            
            if( aliasType.nullable && base.base === 'list' && base.inner.type.base === 'any' ) return true
            
            const result = this.isAssignable( aliasType, base )
            
            if( result ) return true

        }

        return false

    }

    private resolveAssignableModel( a: SemanticType, b: SemanticType ){

        if( a.base === 'model' && b.base === 'model' ){
            
            for( const [ key, targProp ] of a.model.fields ){

                const objPropType = b.model.fields.get( key )

                if( !objPropType ){

                    throw new Error(`Missing property '${ key }' in model '${ b.model.identifier.name }' ${ this.errorLocation( b.span ) }`)

                }

                const resolvedTargProp = this.resolveType( targProp.type ).type

                const resolvedobjPropType = this.resolveType( targProp.type ).type

                if( !this.isAssignable( resolvedTargProp, resolvedobjPropType ) ){
                    
                    throw new Error(`Property '${ key }' is not assignable with type '${ targProp.identifier.name }' ${ this.errorLocation( b.span ) }`)
                        
                }

            }

            for( const [ key ] of b.model.fields ){

                if( !a.model.fields.has( key ) ) {

                    throw new Error(`Model '${ a.model.identifier.name }' does not have '${ key }' field ${ this.errorLocation( a.span ) }`)

                }

            }

             
            return true

        }

        return false

    }

    private isAssignable( a: SemanticType, b: SemanticType ): boolean {

        if( a.base === null ) return a.nullable
        
        if( a.base === 'alias' ) return this.resolveAssignableAlias( a, b )
        if( b.base === 'alias' ) return this.resolveAssignableAlias( b, a )

        if( a.base === 'list'  && !a.nullable && b.base === 'any' ) return false

        if( b.base === 'any' ) return true

        if( a.base === 'model' && b.base === 'object' ) return this.resolveAssignableObject( a, b )
        
        if( a.base === 'list' && b.base === 'list' ) return this.isAssignable( a.inner.type, b.inner.type )
                
        if( a.base === 'model' && b.base === 'model' ) return this.resolveAssignableModel( a, b )

        if( a.base === 'ptr' && b.base === 'ptr' ) return this.isAssignable( a.to.type, b.to.type )

        if( a.base === 'ptr' && b.base === 'null' ) return true

        // if( a.base === 'uniqPtr' && b.base === 'ptr' ) return true

        if( a.base === 'uniqPtr' && b.base === 'uniqVal' ) return this.isAssignable( a.to.type, b.value.type )

        if( a.base === 'null' && b.base === 'ptr' ) return true 

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

    private analyzeList( node: LiteralList, scope: Scope ): SemanticResult {

        if( node.size === 0 ) {

           const a = {
                base: 'any',
                nullable: false,
                span: node.span,
                size: 0,
                type: 'data',
                isUnique: false
            } as SemanticType

            return {
                type: {
                    base: 'list',
                    nullable: false,
                    span: node.span,
                    isUnique: false,
                    size: node.size,
                    type: 'data',
                    inner: {
                        type: a,
                        valueKind: 'rvalue'
                    } 
                },
                valueKind: 'rvalue'

            } 


        }

        let currentType = this.analyzeExpression( node.list[ 0 ], scope ).type

        for( let i = 1; i < node.list.length; i++ ) {

            const nextType = this.analyzeExpression( node.list[ i ], scope ).type

            currentType = this.mergeTypes( currentType, nextType )
        }

        return {
            type: {
                base: 'list',
                inner: {
                    type: currentType,
                    valueKind: 'rvalue'
                },
                nullable: false,
                isUnique: false,
                span: node.span,
                size: node.size,
                type: 'data' 
            },
            valueKind: 'rvalue'
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

    private isInt( e: Expr ){
        return this.analyzeExpression( e, this.scopeStack.scope ).type.base === 'int'
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

    private checkAssignmentErrors( aSemanticResult: SemanticResult, bSemanticResult: SemanticResult, node: BinaryExpression | VariableDeclaration | MethodParams | ModelFieldDeclaration ){

        const a = aSemanticResult.type
        const b = bSemanticResult.type

        if( a.isUnique ){

            if( b.base === 'uniqPtr' || ( b.base === 'uniqVal' && b.value.type.base === 'uniqPtr' ) ){

                throw new Error(`Cannot copy a unique value. Use 'move' ${ this.errorLocation( b.span ) }`)

            }

            if( bSemanticResult.valueKind === 'lvalue' || ( b.base === 'uniqVal' && b.value.valueKind === 'lvalue' )){

                throw new Error(`Cannot make '${ this.typeToString( b ) }' unique because it refers to an existing value ${ this.errorLocation( b.span ) }`)

            }

            if( b.base === 'ptr' || ( b.base === 'uniqVal' && b.value.type.base === 'ptr' ) ) {

                throw new Error(`Cannot create unique from existing reference ${ this.errorLocation( b.span ) }`)

            }

            if( !b.isUnique ){
                
                throw new Error(`Cannot assign non-unique value to unique pointer. Use 'own' ${ this.errorLocation( b.span ) }`)
                
            }

            if( a.base === 'uniqPtr' && a.to.type.isUnique ){

                throw new Error(`Cannot create a unique pointer to a unique pointer`)

            }

        } else {

            if( b.isUnique ){

                throw new Error(`Cannot convert 'unique pointer' to 'raw pointer' ${ this.errorLocation( node.span ) }`)

            }

        }

    }

    private checkInitializer( node: VariableDeclaration | MethodParams | ModelFieldDeclaration, typeSemanticResult: SemanticResult ){

        if( node.initializer ){
            const type = typeSemanticResult.type

            const initializer_ = this.analyzeExpression( node.initializer, this.scopeStack.scope )
            const initializer = initializer_.type
            
            this.checkAssignmentErrors( typeSemanticResult, initializer_, node )

            const isCompatible = this.isAssignable( type, initializer )

            if( !isCompatible  ) throw new Error(`Type '${ this.typeToString( type ) }' is not compatible with '${ this.typeToString( initializer ) }' ${this.errorLocation( node.span )}`)

            if( initializer.base === 'list' && type.base === 'list' ){

                if( !this.isAssignable( type.inner.type, initializer.inner.type ) ) throw new Error(

                    `Declared list type '${ type.inner.type.base }' is not compatible with list type '${ initializer.inner.type.base }' ${this.errorLocation( initializer.span )}`
                
                )

                if( initializer.size > type.size ){

                    throw new Error(`Too many itens in list, maximum is ${ type.size } but ${ initializer.size } was assigned ${ this.errorLocation( initializer.span ) }`)

                }


            } 

        }
        
    }

    private checkType( ident: LiteralIdentifier ){
        
        const alias = this.scopeStack.scope.resolveAlias( ident.name )

        if( alias ) return alias

        const model = this.scopeStack.scope.resolveModel( ident.name )
        
        if( model ) return model

        throw new Error(`Type '${ ident.name }' was never been declared ${ ident.span }`)

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

        this.checkTypeExist( node, type.type )

        if( !node.initializer && !type.type.nullable ){
            
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

            flow.returnsType = {
                type: this.mergeReturn( flow.returnsType?.type!, flowStmt.returnsType?.type! )!,
                valueKind: 'lvalue'
            }
            
            if( flowStmt.alwaysReturns ){
                
                flow.alwaysReturns = true

                break

            }

        }

        this.scopeStack.pop()

        return flow

    }

    private ifElseStatement( node: IfElseStatement ){

        const type = this.visit( node.condition )?.type

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
                flowThen.returnsType?.type!,
                flowElse.returnsType?.type!
            )

        } as Flow

    }

    private whileStatement( node: WhileStatement ){

        const type = this.visit( node.condition )?.type

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
        
        const type = this.visit( node.condition )?.type

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

        const type = this.resolveType( node.type )?.type

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

        const iterable = this.analyzeExpression( node.iterable , this.scopeStack.scope ).type

        if( iterable.base !== 'list' ) {

            throw new Error(`Iterable must be a list ${ this.errorLocation( node.iterable.span ) }`)

        }

        const type = this.resolveType( node.type ).type

        if( iterable.inner.type.base !== type.base ){
            
            throw new Error(`The declared type in the loop is not the same as the type in the list ${ this.errorLocation( type.span ) }`)

        }

        if( type.nullable !== iterable.inner.type.nullable ){

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

        const condType = this.analyzeExpression( node.condition, this.scopeStack.scope ).type

        const matchFlow: Flow = {
            type: 'flow',
            alwaysReturns: false,
            returnsType: null,
        } 
        
        this.scopeStack.push( ScopeKinds.Match )

        const usedValues = new Set<any>()

        for( const clause of node.clauses ){

            for( const expr of clause.expressions ){

                const exprType = this.analyzeExpression( expr, this.scopeStack.scope ).type

                if( usedValues.has( ( expr as LiteralValue ).value ) ){

                    throw new Error(`The value '${ ( expr as LiteralValue ).value }' has already been used ${ this.errorLocation( expr.span )}`)

                }

                if( !this.isAssignable( condType, exprType ) ){

                    throw new Error(`Match condition(${ condType.base }) is not assignable with '${ exprType.base }' ${ this.errorLocation( exprType.span ) }`)

                }

                usedValues.add( ( expr as LiteralValue ).value )

            }

            const flow = this.matchClause( clause )
            
            matchFlow.returnsType = {
                type: this.mergeReturn( matchFlow.returnsType?.type!, flow?.returnsType?.type ?? null )!,
                valueKind: 'lvalue'
            
            }

            if( !flow?.alwaysReturns ){

                matchFlow.alwaysReturns = false

            }

        }

        this.scopeStack.pop()

        if( node.else ){

            const elseFlow = this.visitScopes( node.else )        

            matchFlow.returnsType = {
                type: this.mergeReturn( matchFlow.returnsType?.type!, elseFlow?.returnsType?.type ?? null )!,
                valueKind: "lvalue"
            } 

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

        this.checkTypeExist( node, type.type )

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

        const funcReturn = this.resolveType( node.returnType.type ).type

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

        if( !( flow && flow.returnsType && this.isAssignable( funcReturn, flow.returnsType.type ) ) ){

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

        this.checkTypeExist( node, type.type )

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

            let types: TypeAST[] = []

            for( const aliasType of item.types ){
                
                const type = this.resolveType( aliasType.type ).type

                this.checkTypeExist( node, type )

                types.push( aliasType.type )

            }

            this.scopeStack.scope.declareAlias({

                identifier: item.identifier,
                types

            })

            
        }

    }

    private expressionStatement( node: ExpressionStatement ){
        
        return this.analyzeExpression( node.expression, this.scopeStack.scope )

    }

    private binaryExpression( node: BinaryExpression ){
        
        return this.analyzeExpression( node, this.scopeStack.scope )

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