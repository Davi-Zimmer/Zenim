import { Identifier, Type } from "./AST.js"

export interface SymbolInfo {
    identfier   : Identifier 
    kind        : Type
    initialized : boolean
}

