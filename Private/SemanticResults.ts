import { Modifiers, Span, TypeAST } from "./Types/AST.js"
import { AliasSymbol, baseType, MethodSymbol, ModelSymbol, SemanticAttributes, SemanticResult, SemanticType } from "./Types/Semantic"

class SemanticXConstructor {

    protected semanticResult : SemanticResult = {} as SemanticResult

    constructor(){
        
        this.setup()

    }

    protected setup(){

        const generic = {
            base      : null,
            isUnique  : false,
            nullable  : false,
            span      : {} as Span,
            type      : 'data'
        }

        this.semanticResult = {
            type      : generic,
            valueKind : 'lvalue',
            mutable   : false
        } as SemanticResult

    }

    public setUnique( b: boolean ){
        this.semanticResult.type.isUnique = b
        return this
    }
    
    public setNullable ( b: boolean ){
        this.semanticResult.type.nullable = b
        return this
    }

    public setSpan( s: Span ){
        this.semanticResult.type.span = s
        return this
    }

    public setType( t: 'data' ){
        this.semanticResult.type.type = t
        return this
    }
    
    public setValueKind( v: "lvalue" | "rvalue" ){
        this.semanticResult.valueKind = v
        return this
    }

    public setBase( b: baseType ){
        this.semanticResult.type.base = b
        return this
    }

    //----- modifiers ----- \\\
    public setMutable( b: boolean ){
        this.semanticResult.mutable = b
        return this
    }
    
    public setOnce( b: boolean ){
        this.semanticResult.once = b
    }

    public setModifiers( m: Modifiers[] ){

        for( const modifier of m ){
            
            switch( modifier.name ){

                case 'Mut' : this.setMutable( true ); continue
                case 'Once': this.setOnce( true ); continue 

                default: {

                    throw new Error(`Unknown modifier '${ modifier }'`)

                }

            }

        }

        return this

    }

    public build(){

        if( this.semanticResult.type.base === null ){

            console.log( this.semanticResult.type )

            throw new Error("é null")

        }

        return this.semanticResult
    }

    public loadResult( s: SemanticResult ){
        this.semanticResult = s 
        return this
    }

    public loadType( s: SemanticType ){
        this.semanticResult.type = s
        return this
    }

}

class SemanticStrConstructor extends SemanticXConstructor {

    constructor() { 
        super()
        this.setBase( 'str' )
    }

}

class SemanticBoolConstructor extends SemanticXConstructor {

    constructor() { 
        super()
        this.setBase( 'bool' )
    }

}

class SemanticCharConstructor extends SemanticXConstructor {

    constructor() { 
        super()
        this.setBase( 'char' )
    }

}

class SemanticVoidConstructor extends SemanticXConstructor {

    constructor() { 
        super()
        this.setBase( 'void' )
    }

}

class SemanticNullConstructor extends SemanticXConstructor {

    constructor() { 
        super()
        this.setBase( 'null' )
    }

}

class SemanticIntConstructor extends SemanticXConstructor {

    constructor() { 
        super()
        this.setBase( 'int' )
    }

}

class SemanticDblConstructor extends SemanticXConstructor {

    constructor() { 
        super()
        this.setBase( 'dbl' )
    }

}

class SemanticFltConstructor extends SemanticXConstructor {

    constructor() { 
        super()
        this.setBase( 'flt' )
    }

}

class SemanticAnyConstructor extends SemanticXConstructor {

    constructor() { 
        super()
        this.setBase( 'any' )
    }

    public setSize( s: number ){
        
        if( this.semanticResult.type.base === 'any' ) {

            this.semanticResult.type.size = s 

        }

        return this

    }

}

class SemanticModelConstructor extends SemanticXConstructor {

    constructor() { 
        super()
        this.setBase( 'model' )
    }

    public setModel( m: ModelSymbol ) {
        
        if( this.semanticResult.type.base === 'model' ) {

            this.semanticResult.type.model = m

        }

        return this

    }

}

class SemanticAliasConstructor extends SemanticXConstructor {

    constructor() { 
        super()
        this.setBase( 'alias' )
    }

    public setAlias( a: AliasSymbol ) {
        
        if( this.semanticResult.type.base === 'alias' ) {

            this.semanticResult.type.alias = a

        }

        return this

    }

}

class SemanticListConstructor extends SemanticXConstructor {

    constructor() { 
        super()
        this.setBase( 'list' )
    }

    public setInner( inner: SemanticResult ) {
        
        if( this.semanticResult.type.base === 'list' ) {

            this.semanticResult.type.inner = inner

        }

        return this

    }

    public setSize( s: number ){

        if( this.semanticResult.type.base === 'list' ) {

            this.semanticResult.type.size = s

        }

        return this
    
    }

}

class SemanticObjectConstructor extends SemanticXConstructor {

    constructor() { 
        super()
        this.setBase( 'object' )
    }

    public setProps( props: Map< string, SemanticResult > ) {
        
        if( this.semanticResult.type.base === 'object' ) {

            this.semanticResult.type.props = props

        }

        return this

    }

}

class SemanticMethodConstructor extends SemanticXConstructor {

    constructor() { 
        super()
        this.setBase( 'method' )
    }

    public setMethod( m: MethodSymbol ) {
        
        if( this.semanticResult.type.base === 'method' ) {

            this.semanticResult.type.method = m

        }

        return this

    }


}

class SemanticPtrConstructor extends SemanticXConstructor {

    constructor() { 
        super()
        this.setBase( 'ptr' )
    }

    public setTo( to: SemanticResult ) {
        
        if( this.semanticResult.type.base === 'ptr' ) {

            this.semanticResult.type.to = to 

        }

        return this

    }

}

class SemantiUniqPtrConstructor extends SemanticXConstructor {

    constructor() { 
        super()
        this.setBase( 'uniqPtr' )
    }

    public setTo( to: SemanticResult ) {
        
        if( this.semanticResult.type.base === 'uniqPtr' ) {

            this.semanticResult.type.to = to 

        }

        return this

    }

}

class SemantiUniqValueConstructor extends SemanticXConstructor {

    constructor() { 
        super()
        this.setBase( 'uniqVal' )
    }

    public setValue( value: SemanticResult ) {
        
        if( this.semanticResult.type.base === 'uniqVal' ) {

            this.semanticResult.type.value = value

        }

        return this

    }

}

class SemantiUnionConstructor extends SemanticXConstructor {

    constructor() { 
        super()
        this.setBase( 'union' )
    }

    public setUniontypes( t: TypeAST[] ) {
        
        if( this.semanticResult.type.base === 'union' ) {

            this.semanticResult.type.types = t

        }

        return this

    }

}

class SemantitypeUnionConstructor extends SemanticXConstructor {

    constructor() { 
        super()
        this.setBase( 'typeUnion' )
    }

    public setLeft( l: SemanticResult ) {
        
        if( this.semanticResult.type.base === 'typeUnion' ) {

            this.semanticResult.type.types = l

        }

        return this

    }

    public setTypeUnionTypes( t: SemanticResult ) {
        
        if( this.semanticResult.type.base === 'typeUnion' ) {

            this.semanticResult.type.types = t

        }

        return this

    }

}

type semanticMap = {
    alias     : SemanticAliasConstructor,
    any       : SemanticAnyConstructor,
    bool      : SemanticBoolConstructor,
    char      : SemanticCharConstructor,
    dbl       : SemanticDblConstructor,
    flt       : SemanticFltConstructor,
    int       : SemanticIntConstructor,
    list      : SemanticListConstructor,
    method    : SemanticMethodConstructor,
    model     : SemanticModelConstructor,
    null      : SemanticNullConstructor,
    object    : SemanticObjectConstructor,
    ptr       : SemanticPtrConstructor,
    str       : SemanticStrConstructor,
    typeUnion : SemantitypeUnionConstructor,
    union     : SemantiUnionConstructor,
    uniqPtr   : SemantiUniqPtrConstructor,
    uniqVal   : SemantiUniqValueConstructor,
    void      : SemanticVoidConstructor,
}

export function SemanticConstructor< T extends keyof semanticMap >( type?: T | null ): semanticMap[ T ] {

    if( !type ) return new SemanticXConstructor() as semanticMap[ T ]

    const sConstructor = {

        alias     : SemanticAliasConstructor,
        any       : SemanticAnyConstructor,
        bool      : SemanticBoolConstructor,
        char      : SemanticCharConstructor,
        dbl       : SemanticDblConstructor,
        flt       : SemanticFltConstructor,
        int       : SemanticIntConstructor,
        list      : SemanticListConstructor,
        method    : SemanticMethodConstructor,
        model     : SemanticModelConstructor,
        null      : SemanticNullConstructor,
        object    : SemanticObjectConstructor,
        ptr       : SemanticPtrConstructor,
        str       : SemanticStrConstructor,
        typeUnion : SemantitypeUnionConstructor,
        union     : SemantiUnionConstructor,
        uniqPtr   : SemantiUniqPtrConstructor,
        uniqVal   : SemantiUniqValueConstructor,
        void      : SemanticVoidConstructor

    }

    const itemConstructor = sConstructor[ type ] ? new sConstructor[ type ]() : new SemanticXConstructor()
    
    return itemConstructor as semanticMap[ T ]

}
