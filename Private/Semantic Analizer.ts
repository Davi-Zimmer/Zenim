import { ScopeStack } from "./Scopes.js"
import { AST, Expr, Program, Type, VariableDeclaration, Statement, Identifier } from "./Types/AST.js"

class SemanticAnalizer {

    public static Analize( ast: Program ){

        const analizer = new SemanticAnalizer()

        return analizer.visit( ast )

    }

    private firstLower( s: string ){
    
        return s.charAt( 0 ).toLowerCase() + s.substring( 1, s.length )

    }

    private scopeStack = new ScopeStack()

    private visit( ast: AST ){

        const func = this[ this.firstLower( ast.kind ) as keyof SemanticAnalizer ] as ( node: AST ) => void 

        if( !( func instanceof Function )) throw new Error(`"${ ast.kind }" Does't not exist in Semantic Analyzer `)

        func.call( this, ast )

    }

    private errorLocation( astNode: Statement | Expr | Type | Identifier ){

        const start = astNode.span.start
        const end   = astNode.span.end

        const idk = start.line === end.line ? '' : `line: ${ end.line } column: `

        return `at line: ${ start.line } column: ${ start.column } to ${idk}${ end.column }`

    }

    // ------------------------------------------ Analisys ------------------------------------------ \\

    private program( node: Program ){

        node.body.forEach( n => this.visit( n ) )

    }

    private variableDeclaration( node: VariableDeclaration ){

        if( this.scopeStack.scope.resolveLocal( node.identifier.name ) ){

            throw new Error(`Identifier '${ node.identifier.name }' already exists in this scope ${this.errorLocation( node.identifier )}`)

        }

        this.scopeStack.scope.declare({
            identfier: node.identifier,
            initialized: false,
            kind: node.type
        })

    }


}

export default SemanticAnalizer