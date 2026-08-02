import { AST, AstKind, BlockStatement, Expr, LiteralBool, LiteralChar, LiteralIdentifier, LiteralList, LiteralModel, LiteralNull, LiteralNumber, LiteralString, LiteralVoid, MethodDeclaration, MethodParams, MethodReturn, Modifiers, Program, ReturnStatement, TypeAST, VariableDeclaration } from "../Types/AST.js";
import { CFile } from "./CodeBuilder.js";
import { Inclusions } from "./Inclusions.js";

export class Transpiler {

    public static Transpile( ast: Program ){
        
        const transpiler = new Transpiler()

        transpiler.visit( ast )

        return transpiler.file.join()

    }

    private file = new CFile()

    private ident = 1;

    public visit( ast: AST ) : void | string {

        switch( ast.kind ){

            case AstKind.Program             : return this.program( ast as Program ) 
            case AstKind.VariableDeclaration : return this.variableDeclaration( ast as VariableDeclaration )
            case AstKind.LiteralNumber       : return this.literalNumber( ast as LiteralNumber )
            case AstKind.LiteralString       : return this.literalString( ast as LiteralString )

            case AstKind.LiteralBool         : return this.literalBool( ast as LiteralBool )
            case AstKind.LiteralVoid         : return this.literalVoid( ast as LiteralVoid )
            case AstKind.LiteralChar         : return this.literalChar( ast as LiteralChar )
            case AstKind.LiteralNull         : return this.literalNull( ast as LiteralNull )
            case AstKind.LiteralIdentifier   : return this.literalIdentifier( ast as LiteralIdentifier )
            case AstKind.LiteralList         : return this.literalList( ast as LiteralList )
            case AstKind.LiteralModel        : return this.literalModel( ast as LiteralModel )

            case AstKind.MethodDeclaration   : return this.methodDeclaration( ast as MethodDeclaration )    
            case AstKind.BlockStatement      : return this.blocksStatement( ast as BlockStatement )
            case AstKind.__ReturnStatement   : return this.__returnStatement( ast as ReturnStatement )
            default: throw new Error(`Unknown Ast kind '${ ast.kind }' in transpiler`)

        }   

    }

    public visitExpression(){
        
    }

    private writeInBody( data: string ){
        
        this.file.writeBody( 

            this.addTab( data )

        )

    }

    private writeMethod( data: string ) {
        
        this.file.writeMethod( data )

    }

    private addTab( s: string ){

        return '    '.repeat( this.ident ) + s

    }

    private writeBlock( callback: () => void ){

        this.file.writeBody('{')

        this.ident++

        callback()

        this.ident--

        this.file.writeBody('}')


    }

    //------------------------------------------ Visits ------------------------------------------\\

    private program( node: Program ){

        for( const statement of node.body ){

            this.visit( statement )

        }

    }

    private variableDeclaration( node: VariableDeclaration ){

        this.writeInBody(

            this.emitVariable( node.modifiers, node.type, node.identifier.name, node.initializer ) + ';'

        )

    }

    private methodDeclaration( node: MethodDeclaration ){

        const type = this.emitType( node.returnType.type )
        
        const params = this.emitMethodParameter( node.params )
        
        const body = this.visit( node.body )

        this.writeMethod(
            `${ type } ${ node.identifier.name }(${ params }) {\n${ body }\n}`
        )

    }

    private blocksStatement( node: BlockStatement ){

        return node.body.map( b => this.visit( b ) ).join('\n')

    }

    private __returnStatement( node: ReturnStatement ){
        console.log("return????")

        throw new Error("HEHEHEHA")
        
        return this.addTab( `return ${ this.emitExpression( node.expr ) }; `)

    }


    //------------------------------------------ X ------------------------------------------\\

    private visitModifier( modifiers: Modifiers[] ): string {

        let modifiersString = ''
        
        
        return modifiersString

    }

    private tType( s: string ){

        switch( s ){

            case 'str'        : return 'char*'
            case 'int'        : return 'int'
            case 'char'       : return 'char'
            case 'flt'        : return 'float'
            case 'dbl'        : return 'double'
            case 'bool'       : return 'bool'
            case 'void'       : return 'void'
            case 'null'       : return 'void*'
            
            default: {
                console.warn(`\n[ !!!WARNING!!! ]\n base type '${ s }' does not exist in switch `)
                return ''
            }

        }

    }

    private emitType( type: TypeAST ): string {

        switch( type.kind ){

            case 'Base': return this.tType( type.name )

            default: {

                throw new Error(`Unknown TypeAST: '${ type.kind }'`)

            }

        }


    }

    private emitVariable( modifiers: Modifiers[], type: TypeAST, identifier: string, initializer?: Expr ){
        
        const modifier = this.visitModifier( modifiers )

        const t = this.emitType( type )

        const value = initializer ? ' = ' + this.emitExpression( initializer ) : ''

        return `${ modifier } ${ t } ${ identifier }${ value }`

    }

    private emitMethodParameter( params: MethodParams[] ){

        return params.map( p => 
            this.emitVariable( p.modifiers, p.type, p.identifier.name ) )
            .join(',') + ' '

    }

    private emitExpression( expression: Expr ): string {

        const expr = this.visit( expression )

        if( !expr ){

            throw new Error(`Expression ${ expression.kind } returned void, go fix it`)

        }

        return expr

    }

    private literalNumber( node: LiteralNumber ) {
        return node.value.toString()
    }

    private literalString( node: LiteralString ) {
        return `"${ node.value }"`
    }

    private literalBool( node: LiteralBool ){

        this.file.include( Inclusions.boolean )
        
        return node.value.toString()

    }

    private literalVoid( node: LiteralVoid ){
        return 'void'
    }

    private literalChar( node: LiteralChar ){
        return `'${ node.value }'`
    }

    private literalNull( node: LiteralNull ){
        return 'NULL'
    }

    private literalIdentifier( node: LiteralIdentifier ){
        return node.name
    }

    private literalList( node: LiteralList ){
        return '<LIST_TO_DO>'
    }

    private literalModel( node: LiteralModel ){
        return '<MODEL_TO_DO>'
    }

}
