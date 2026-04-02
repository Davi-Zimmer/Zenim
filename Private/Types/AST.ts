import { TKind, Token } from "./Tokens"

export enum AstKind {
    LiteralNumber     = "LiteralNumber",
    LiteralString     = "LiteralString",
    LiteralChar       = "LiteralChar",
    LiteralBool       = "LiteralBool",
    LiteralVoid       = "LiteralVoid",
    LiteralNull       = "LiteralNull",
    LiteralIdentifier = "LiteralIdentifier",
    // LiteralDouble    = "LiteralDouble",
    // LiteralFloat     = "LiteralFloat",

    Statement           = "Statement",
    Program             = "Program",
    BinaryExpression    = "BinaryExpression",
    UnaryExpression     = "UnaryExpression",
    ExpressionStatement = "ExpressionStatement",
    BlockStatement      = "BlockStatement",
    IfElseStatement     = "IfElseStatement",
    WhileStatement      = "WhileStatement",
    DoWhileStatement    = "DoWhileStatement",

    
    MemberAccess        = "MemberAccess",
    VariableDeclaration = "VariableDeclaration",

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

export interface MemberAccess {
    kind   : AstKind.MemberAccess
    object : Expr
    member : string
    span   : Span
}

// ----------------------------------- _Declarations_ ----------------------------------- \\
export type Type =
  | {span:Span, kind: "Base", name: string }
  | {span:Span, kind: "Pointer", inner: Type }
  | {span:Span, kind: "UniquePointer", inner: Type }
  | {span:Span, kind: "Array", size: number, inner: Type }
  | {span:Span, kind: "Nullable", inner: Type }
  

export interface TypedBinding {
    identifier : string
    type       : Type
    modifiers ?: Modifiers[]
}

export interface VariableDeclaration extends Statement {
    kind         : AstKind.VariableDeclaration 
    identifier   : LiteralIdentifier
    type         : Type
    modifiers    : Modifiers[]
    initializer ?: Expr
    span         : Span
}

// ----------------------------------- _XXX_ ----------------------------------- \\

export type ModifierNames = 'Once' | 'Mut'

export type Modifiers = {
    name: ModifierNames
    span: Span
}




export type AST = Program | Statement | Expr