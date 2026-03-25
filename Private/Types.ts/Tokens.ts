export enum TKind {

    // Basics
    Eof = "Eof",
    Identifier    = "Identifier",
    Number        = "Number",
    CharLiteral   = "CharLiteral",
    StringLiteral = "StringLiteral",
    BoolLiteral   = "BooleanLiteral",
    NumberLiteral = "NumberLiteral",
    
    
    // Operators
    Plus        = "+",
    Minus       = "-",
    Star        = "*",
    Slash       = "/",
    Percent     = "%",
    Exclamation = "!",
    Question    = "?",
    StarStar    = "**",
    Equals      = "=",

    
    // Delimiters
    LeftParen    = "(",
    RightParen   = ")",
    RightBracket = "[",
    LeftBracket  = "]",
    LeftBrace    = "{",
    RightBrace   = "}",
    Semicolon    = ";",
    Colon        = ":",
    Comma        = ",",
    Dot          = ".",
    UnderLine    = "_",

    // Comparators
    EqualsEquals   = "==",
    NotEquals      = "!=",
    Less           = "<",
    Greater        = ">",
    LessOrEqual    = "<=",
    GreaterOrEqual = ">=",
    And            = "&",
    AndAnd         = "&&",
    Or             = "|",
    OrOr           = "||",
    
    // Others 
    Tilde         = "~",
    Circumflex    = "^",
    ReverseSlash  = "\\",
    Grave         = "`",
    RightArrow    = "->",
    LeftArrow     = "<-",


    Mut = "Mut",
    Once = "Once",
    Int = "Int",
    Flt = "Flt",
    Str = "Str",
    Char = "Char",
    Bool = "Bool",
    Null = "Null",
    Void = "Void",
    Dbl  = "Dbl"
        
}


export interface Token {
    kind        : TKind
    lexeme      : string
    literal    ?: any
    line        : number
    column      : number
    length      : number
}