import { TKind, Token } from "./Tokens"

export enum AstKind {
    LiteralNumber     = "LiteralNumber",
    LiteralString    = "LiteralString",
    LiteralChar      = "LiteralChar",
    LiteralBool      = "LiteralBool",
    LiteralVoid      = "LiteralVoid",
    LiteralNull      = "LiteralNull",
    // LiteralDouble    = "LiteralDouble",
    // LiteralFloat     = "LiteralFloat",

    Statement           = "Statement",
    Program             = "Program",
    BinaryExpression    = "BinaryExpression",
    UnaryExpression     = "UnaryExpression",
    ExpressionStatement = "ExpressionStatement",


    MemberAccess = "MemberAccess",



    VariableDeclaration = "VariableDeclaration"

}

// ----------------------------------- _Statement_ ----------------------------------- \\


export interface Statement {
    kind: AstKind
}

export interface Expr {
    kind: AstKind
}

export interface Program {
    kind: AstKind.Program
    body: Statement[]

}

export interface ExpressionStatement extends Statement {
    kind: AstKind.ExpressionStatement
    expression: Expr
}


export type Statements = Expr | Statement | Program 

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
}

// ----------------------------------- _Declarations_ ----------------------------------- \\

export interface TypedBinding {
    modifiers : Modifiers[]
    typeToken : Token
}

export interface VariableDeclaration extends Statement {
    kind         : AstKind.VariableDeclaration 
    identifier   : string
    binding      : TypedBinding
    initializer? : Expr
}


// ----------------------------------- _XXX_ ----------------------------------- \\

export type Modifiers = TKind.Once | TKind.Mut




export type AST = Program | Statement