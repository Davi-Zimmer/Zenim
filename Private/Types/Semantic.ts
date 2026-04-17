import { LiteralIdentifier, Span, TypeAST } from "./AST.js"

export type SemanticType =
    | { base: 'str'    | null, nullable: boolean, span: Span, type: 'data' }
    | { base: 'bool'   | null, nullable: boolean, span: Span, type: 'data' }
    | { base: 'char'   | null, nullable: boolean, span: Span, type: 'data' }
    | { base: 'void'   | null, nullable: boolean, span: Span, type: 'data' }
    | { base: 'null'   | null, nullable: boolean, span: Span, type: 'data' }
    | { base: 'int'    | null, nullable: boolean, span: Span, type: 'data' }
    | { base: 'dbl'    | null, nullable: boolean, span: Span, type: 'data' }
    | { base: 'flt'    | null, nullable: boolean, span: Span, type: 'data' }
    | { base: 'any'    | null, nullable: boolean, span: Span, type: 'data' }
    | { base: 'model'  | null, nullable: boolean, span: Span, model: ModelSymbol, type: 'data' }
    | { base: 'alias'  | null, nullable: boolean, span: Span, alias: AliasSymbol, type: 'data' }
    | { base: 'list'   | null, nullable: boolean, span: Span, inner: SemanticType, size: number, type: 'data' }
    | { base: 'object' | null, nullable: boolean, span: Span, type: 'data', props: Map< string, SemanticType > }
    | { base: 'method' | null, nullable: boolean, span: Span, type: 'data', method: MethodSymbol }

export type FieldInfo = {
    identifier   : LiteralIdentifier
    type         : TypeAST
    defaultValue : SemanticType
}

export interface SymbolInfo {
    identifier  : LiteralIdentifier 
    kind        : TypeAST
    initialized : boolean
}

export type ModelSymbol = {
    identifier  : LiteralIdentifier
    fields      : Map< string, FieldInfo >
    composition : ModelSymbol | undefined
}

export type MethodSymbol = {
    identifier : LiteralIdentifier
    returns    : TypeAST
    params     : TypeAST[]
}

export type AliasSymbol = {
    identifier : LiteralIdentifier
    type       : TypeAST

}


export type Flow = {
    type          : 'flow'
    returnsType   : SemanticType | null
    alwaysReturns : boolean
}
