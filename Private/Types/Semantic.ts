import { LiteralIdentifier, Span, TypeAST } from "./AST.js"

export type SemanticGeneric = {
    nullable: boolean
    isUnique: boolean
    mutable: boolean 
    span: Span
    type: 'data'
}

export type baseType = 
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
    | 'union'
    | 'typeUnion'


export type SemanticAttributes =
    | { base: 'str'       | null }
    | { base: 'bool'      | null }
    | { base: 'char'      | null }
    | { base: 'void'      | null }
    | { base: 'null'      | null }
    | { base: 'int'       | null }
    | { base: 'dbl'       | null }
    | { base: 'flt'       | null }
    | { base: 'any'       | null, size: number }
    | { base: 'model'     | null, model: ModelSymbol }
    | { base: 'alias'     | null, alias: AliasSymbol }
    | { base: 'list'      | null, inner: SemanticResult, size: number }
    | { base: 'object'    | null, props: Map< string, SemanticResult > }
    | { base: 'method'    | null, method: MethodSymbol }
    | { base: 'ptr'       | null, to: SemanticResult }
    | { base: 'uniqPtr'   | null, to: SemanticResult }
    | { base: 'uniqVal'   | null, value: SemanticResult }
    | { base: 'union'     | null, types: TypeAST[] }
    | { base: 'typeUnion' | null, left: SemanticResult, types: SemanticResult }


export type SemanticType = SemanticAttributes & SemanticGeneric



export type SemanticResult = {
    type: SemanticType
    valueKind: 'lvalue' | 'rvalue'
}

export type FieldInfo = {
    identifier   : LiteralIdentifier
    type         : TypeAST
    defaultValue : SemanticResult
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
    types      : TypeAST[]

}


export type Flow = {
    type          : 'flow'
    returnsType   : SemanticResult | null
    alwaysReturns : boolean
}

