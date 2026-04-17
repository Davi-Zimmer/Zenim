import { AliasSymbol, MethodSymbol, ModelSymbol, SymbolInfo } from "./Types/Semantic.js"
import { HasModifier } from "./Utils/HasModifier.js"
import { Modifiers } from "./Types/AST.js"
import { TKind } from "./Types/Tokens.js"

export enum ScopeKinds {
    Global   = "Global",
    Block    = "Block",
    Function = "Function",
    Class    = "Class",
    Model    = "Model",
    Loop     = "Loop",
    Match    = "Match",
}

export class Scope {

    private variables = new Map< string, SymbolInfo >()
    private models    = new Map< string, ModelSymbol >()
    private methods   = new Map< string, MethodSymbol >()
    private alias     = new Map< string, AliasSymbol >()

    public parent : Scope | null = null
    public kind   : ScopeKinds

    constructor( parent: Scope | null, kind: ScopeKinds = ScopeKinds.Block ){

        this.parent = parent

        this.kind = kind

    }

    public declareVar( symbol: SymbolInfo ){

        if( this.variables.has( symbol.identifier.name ) ) throw new Error(`Symbol '${ symbol.identifier.name }' already declared in this scope`)

        this.variables.set( symbol.identifier.name, symbol )

    }

    public declareModel( symbol: ModelSymbol ){

        if( this.models.has( symbol.identifier.name ) ) throw new Error(`Symbol '${ symbol.identifier.name }' already declared in this scope`)

        this.models.set( symbol.identifier.name, symbol )

    }

    public declareMethod( symbol: MethodSymbol ){

        if( this.methods.has( symbol.identifier.name ) ) throw new Error(`Symbol '${ symbol.identifier.name }' already declared in this scope`)

        this.methods.set( symbol.identifier.name, symbol )

    }

    public declareAlias( symbol: AliasSymbol ){

        if( this.alias.has( symbol.identifier.name ) ) throw new Error(`Symbol '${ symbol.identifier.name }' already declared in this scope`)

        this.alias.set( symbol.identifier.name, symbol )

    }

    public resolveAll( identifier: string ){

        return (

            this.resolveModel  ( identifier ) ||
            this.resolveMethod ( identifier ) ||
            this.resolveVar    ( identifier ) ||
            this.resolveAlias  ( identifier )

        )

    }

    public resolveVar( identifier: string ){

        let scope: Scope | null = this

        while( scope ){

            const found = scope.variables.get( identifier )

            if( found ) return found

            scope = scope.parent

        }

        return null

    }

    public resolveModel( identifier: string ){

        let scope: Scope | null = this

        while( scope ){

            const found = scope.models.get( identifier )

            if( found ) return found

            scope = scope.parent

        }

        return null

    }

    public resolveMethod( identifier: string ){

        let scope: Scope | null = this

        while( scope ){

            const found = scope.methods.get( identifier )

            if( found ) return found

            scope = scope.parent

        }

        return null

    }

    public resolveAlias( identifier: string ){
    
        let scope: Scope | null = this

        while( scope ){

            const found = scope.alias.get( identifier )

            if( found ) return found

            scope = scope.parent

        }

        return null

    }

    public resolveLocalVar( identifier: string ){
        
        return this.variables.get( identifier ) ?? null

    }

    public resolveLocalModel( identifier: string ){
        
        return this.models.get( identifier ) ?? null

    }

    public resolveLocalMethod( identifier: string ){
        
        return this.methods.get( identifier ) ?? null

    }

    public resolveLocalAlias( identifier: string ){
        
        return this.alias.get( identifier ) ?? null

    }

    public assignVar( identifier: string ){

        const symbol = this.resolveVar( identifier )

        if( !symbol ) throw new Error(`Cannot assign to undeclared variable '${identifier}'`)
        
        // if( HasModifier( TKind.Mut, symbol.kind.modifiers ) ) throw new Error(`Cannot assign to immutable variable '${ identifier }'`)

        symbol.initialized = true

        return symbol

    }

    public isKind( ...kinds: ScopeKinds[] ){

        for( const kind of kinds ){

            if( this.kind === kind ) return true

        }

        return false

    }

}


export class ScopeStack {
    
    private current: Scope

    constructor(){

        this.current = new Scope( null, ScopeKinds.Global )

    }

    get scope(): Scope { return this.current }

    public push( kind: Scope['kind'] = ScopeKinds.Block ){

        this.current = new Scope( this.current, kind )

        return this.current

    }

    public pop(){

        if( !this.current.parent ) throw new Error("Cannot pop global scope")

        this.current = this.current.parent

    }

    public canbreak(){

        let scope: Scope | null = this.scope

        while( scope ){
            
            if( scope.isKind( ScopeKinds.Loop, ScopeKinds.Match ) ){
                
                return true

            }

            scope = scope.parent

        }

        return false

    }

    public canNext(){

        let scope: Scope | null = this.scope

        while( scope ){

            if( scope.isKind( ScopeKinds.Loop ) ){

                return true

            }

            scope = scope.parent

        }

        return false

    }

}