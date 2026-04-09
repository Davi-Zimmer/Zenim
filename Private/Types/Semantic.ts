import { LiteralIdentifier, TypeAST } from "./AST.js"

export interface SymbolInfo {
    identfier   : LiteralIdentifier 
    kind        : TypeAST
    initialized : boolean
}

