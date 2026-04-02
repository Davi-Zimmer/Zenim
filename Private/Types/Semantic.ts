import { LiteralIdentifier, Type } from "./AST.js"

export interface SymbolInfo {
    identfier   : LiteralIdentifier 
    kind        : Type
    initialized : boolean
}

