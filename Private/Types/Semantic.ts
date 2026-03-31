import { TypedBinding } from "./AST.js"

export interface SymbolInfo {
    identfier   : string 
    kind        : TypedBinding
    initialized : boolean
}

