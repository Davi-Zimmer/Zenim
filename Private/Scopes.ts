import { SymbolInfo } from "./Types/Semantic.js"
import { HasModifier } from "./Utils/HasModifier.js"
import { Modifiers } from "./Types/AST.js"
import { TKind } from "./Types/Tokens.js"

export enum ScopeKinds {
    Global   = "Global",
    Block    = "Block",
    Function = "Function",
    Class    = "Class",
    Model    = "Model",
    Loop     = "Loop"
}

export class Scope {

    private symbols = new Map< string, SymbolInfo >

    public parent : Scope | null = null
    public kind   : ScopeKinds

    constructor( parent: Scope | null, kind: ScopeKinds = ScopeKinds.Block ){

        this.parent = parent

        this.kind = kind

    }

    public declare( symbol: SymbolInfo ){

        if( this.symbols.has( symbol.identfier.name ) ) throw new Error(`Symbol '${symbol.identfier.name}' already declared in this scope`)

        this.symbols.set( symbol.identfier.name, symbol )

    }

    public resolve( identifier: string ){

        let scope: Scope | null = this

        while( scope ){

            const found = scope.symbols.get( identifier )

            if( found ) return found

            scope = scope.parent

        }

        return null

    }

    public resolveLocal( identifier: string ){
        
        return this.symbols.get( identifier ) ?? null

    }

    public assign( identifier: string ){

        const symbol = this.resolve( identifier )

        if( !symbol ) throw new Error(`Cannot assign to undeclared variable '${identifier}'`)
        
        // if( HasModifier( TKind.Mut, symbol.kind.modifiers ) ) throw new Error(`Cannot assign to immutable variable '${ identifier }'`)

        symbol.initialized = true

        return symbol

    }


}


export class ScopeStack {
    
    private current: Scope

    constructor(){

        this.current = new Scope( null, ScopeKinds.Global )

    }

    get scope(): Scope { return this.current }


    public push( kind: Scope['kind'] = ScopeKinds.Block ){

        return new Scope( this.current, kind )

    }

    public pop(){

        if( !this.current.parent ) throw new Error("Cannot pop global scope")

        this.current = this.current.parent

    }

}