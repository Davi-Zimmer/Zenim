import { ModelSymbol } from "./Semantic.js"
import { TKind, Token } from "./Tokens.js"

export enum AstKind {
    LiteralNumber     = "LiteralNumber",
    LiteralString     = "LiteralString",
    LiteralChar       = "LiteralChar",
    LiteralBool       = "LiteralBool",
    LiteralVoid       = "LiteralVoid",
    LiteralNull       = "LiteralNull",
    LiteralIdentifier = "LiteralIdentifier",
    LiteralList       = "LiteralList",
    LiteralModel      = "LiteralModel",


    // LiteralDouble    = "LiteralDouble",
    // LiteralFloat     = "LiteralFloat",

    RangeExpression   = "RangeExpression",
    MethodReturn      = "MethodReturn",


    Statement           = "Statement",
    Program             = "Program",
    BinaryExpression    = "BinaryExpression",
    UnaryExpression     = "UnaryExpression",
    ExpressionStatement = "ExpressionStatement",
    BlockStatement      = "BlockStatement",
    IfElseStatement     = "IfElseStatement",
    WhileStatement      = "WhileStatement",
    DoWhileStatement    = "DoWhileStatement",
    ForStatement        = "ForStatement",
    BreakStatement      = "BreakStatement",
    NextStatement       = "NextStatement",
    MatchClause         = "MatchClause",
    MatchStatement      = "MatchStatement",
    __ReturnStatement   = "__ReturnStatement",
    ModelDeclaration    = "ModelDeclaration",
    ModelFieldDeclaration = "ModelFieldDeclaration",
    AliasStatement        = "AliasStatement",
    AliasItem             = "AliasItem",
    CallExpression        = "CallExpression",
    ObjectProps           = "ObjectProps",
    

    MemberAccess        = "MemberAccess",
    VariableDeclaration = "VariableDeclaration",
    MethodDeclaration   = "MethodDeclaration",
    MethodParams        = "MethodParams",

}

export interface Span {
    start: { line: number, column: number  }
    end  : { line: number, column: number  }
}

// ----------------------------------- _Statement_ ----------------------------------- \\

export interface Statement {
    kind: AstKind
    span: Span

}

export interface Expr extends Statement {
    kind: AstKind
    span: Span
}

export interface Program extends Statement {
    kind: AstKind.Program
    body: Statement[]

}

export interface ExpressionStatement extends Statement {
    kind: AstKind.ExpressionStatement
    expression: Expr
}

export interface BlockStatement extends Statement {
    kind: AstKind.BlockStatement,
    body: Statement[]
    span: Span
}

export interface IfElseStatement extends Statement {
    kind       : AstKind.IfElseStatement
    condition  : Expr
    thenBranch : Statement
    elseBranch : Statement | undefined
    span       : Span
}

export interface WhileStatement extends Statement {
    kind: AstKind.WhileStatement
    condition: Expr
    body: Statement
}

export interface DoWhileStatement extends Statement {
    kind: AstKind.DoWhileStatement
    body: Statement
    condition: Expr

}

export interface ForStatement extends Statement {
    kind       : AstKind.ForStatement
    forKind    : 'in' | 'of'
    identifier : LiteralIdentifier
    type       : TypeAST
    
    iterable   : Expr
    step      ?: Expr
    body       : Statement 
}

export interface BreakStatement extends Statement {
    kind: AstKind.BreakStatement
    span: Span
}

export interface NextStatement extends Statement {
    kind: AstKind.NextStatement
    span: Span
}

export interface MatchClause extends Statement {
    kind        : AstKind.MatchClause
    expressions : Expr[]
    body        : Statement

}

export interface MatchStatement extends Statement {
    kind: AstKind.MatchStatement
    span: Span

    condition : Expr
    clauses   : MatchClause[]
    else      : Statement | undefined

}

export interface AliasItem extends Statement {
    kind       : AstKind.AliasItem
    type       : TypeAST
    modifiers  : Modifiers[]
    identifier : LiteralIdentifier
}

export interface AliasStatement extends Statement {
    kind       : AstKind.AliasStatement
    items      : AliasItem[]
}


// ----------------------------------- _Literals_ ----------------------------------- \\

export interface LiteralNumber extends Expr {
    kind : AstKind.LiteralNumber
    value: number
}

/*
export interface LiteralFloat extends Expr {
    kind: AstKind.LiteralFloat
    value: number
}

export interface LiteralDouble extends Expr {
    kind: AstKind.LiteralDouble
    value: number
}
*/

export interface LiteralString extends Expr {
    kind: AstKind.LiteralString
    value: string
}

export interface LiteralChar extends Expr {
    kind: AstKind.LiteralChar
    value: string
}

export interface LiteralBool extends Expr {
    kind: AstKind.LiteralBool
    value: boolean | 'maybe'
}

export interface LiteralNull extends Expr {
    kind: AstKind.LiteralNull
    value: null
}

export interface LiteralVoid extends Expr {
    kind: AstKind.LiteralVoid
    value: void
}

export interface LiteralIdentifier extends Expr {
    kind: AstKind.LiteralIdentifier
    name: string,
    span: Span
}

export interface LiteralList extends Expr {
    kind: AstKind.LiteralList
    list: Expr[]
    size: number
}

export interface LiteralModel extends Expr {
    kind       : AstKind.LiteralModel
    modelItems : ObjectProps[]
    span       : Span
}


export type LiteralValue = LiteralBool | LiteralString | LiteralChar | LiteralNumber | LiteralVoid | LiteralNull | LiteralBool // | LiteralFloat | LiteralDouble


// ----------------------------------- _Expressions_ ----------------------------------- \\

export interface BinaryExpression extends Expr {
    kind     : AstKind.BinaryExpression
    left     : Expr
    right    : Expr
    operator : string
}

export interface Unary extends Expr {
    kind     : AstKind.UnaryExpression
    right    : Expr
    operator : string
}

export interface RangeExpression extends Expr {
    kind  : AstKind.RangeExpression
    start : Expr
    end   : Expr
    span  : Span
}

export interface MemberAccess extends Expr {
    kind   : AstKind.MemberAccess
    object : Expr
    member : string
    span   : Span
}

export interface MethodReturn extends Expr {
    kind: AstKind.MethodReturn
    type: TypeAST
}

export interface MethodParams extends Expr {
    kind        : AstKind.MethodParams
    type        : TypeAST
    modifiers   : Modifiers[]
    initializer : Expr | undefined
    identifier  : LiteralIdentifier
}

export interface ReturnStatement extends Expr {
    kind: AstKind.__ReturnStatement
    expr: Expr
}

export interface CallExpression extends Expr {
    kind   : AstKind.CallExpression
    callee : Expr
    args   : Expr[]
}

export interface ObjectProps extends Expr {
    kind       : AstKind.ObjectProps
    item       : Expr
    identifier : LiteralIdentifier
    span       : Span
}

// ----------------------------------- _Declarations_ ----------------------------------- \\
export type TypeAST =
  | { span: Span, kind: "Base", name: string }
  | { span: Span, kind: "Pointer", inner: TypeAST }
  | { span: Span, kind: "UniquePointer", inner: TypeAST }
  | { span: Span, kind: "Array", size: number, inner: TypeAST }
  | { span: Span, kind: "Nullable", inner: TypeAST }
  | { span: Span, kind: "Model", model: ModelSymbol }
  

export interface TypedBinding {
    identifier : string
    type       : TypeAST
    modifiers ?: Modifiers[]
}

export interface VariableDeclaration extends Statement {
    kind         : AstKind.VariableDeclaration 
    identifier   : LiteralIdentifier
    type         : TypeAST
    modifiers    : Modifiers[]
    initializer ?: Expr
    span         : Span
}

export interface MethodParams extends Expr {
    kind        : AstKind.MethodParams
    initializer : Expr | undefined
    identifier  : LiteralIdentifier
    modifiers   : Modifiers[]
    type        : TypeAST
}

export interface MethodDeclaration extends Statement {
    kind        : AstKind.MethodDeclaration
    body        : BlockStatement
    
    returnType  : MethodReturn
    identifier  : LiteralIdentifier
    modifiers   : Modifiers[]
    span        : Span
    params      : MethodParams[]
    metExplicit : boolean
}

export interface ModelFieldDeclaration extends Statement {
    kind        : AstKind.ModelFieldDeclaration
    initializer : Expr | undefined
    identifier  : LiteralIdentifier
    modifiers   : Modifiers[]
    type        : TypeAST
}

export interface ModelDeclaration extends Statement {
    composition : LiteralIdentifier | undefined
    kind        : AstKind.ModelDeclaration
    identifier  : LiteralIdentifier
    span        : Span
    field       : ModelFieldDeclaration[]
}

// ----------------------------------- _XXX_ ----------------------------------- \\

export type ModifierNames = 'Once' | 'Mut'

export type Modifiers = {
    name: ModifierNames
    span: Span
}




export type AST = Program | Statement | Expr