export enum TKind {

    // Basics
    Eof = "Eof",
    Identifier    = "Identifier",
    Number        = "Number",
    VoidLiteral   = "VoidLiteral",
    NullLiteral   = "NullLiteral",
    StringLiteral = "StringLiteral",
    CharLiteral   = "CharLiteral",
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
    DotDot       = "..",

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


    // Modifiers
    Mut = "Mut",
    Once = "Once",
    
    // Types
    Int = "Int",
    Flt = "Flt",
    Str = "Str",
    Char = "Char",
    Bool = "Bool",
    Null = "Null",
    Void = "Void",
    Dbl  = "Dbl",

    True   = "True",
    False  = "False",
    Maybe  = "Maybe",

    // Reserved words
    If      = "If",
    Else    = "Else", 
    While   = "While",
    Do      = "Do",
    For     = "For",
    In      = "In",
    Of      = "Of",
    Break   = "Break",
    Next    = "Next",

}


export interface Token {
    kind        : TKind
    lexeme      : string
    literal    ?: any
    line        : number
    column      : number
    length      : number
}

/*



*/