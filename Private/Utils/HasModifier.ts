import { Modifiers } from "../Types/AST.js"

export function HasModifier( mod: Modifiers, mods?: Modifiers[] ){

    if( !mods ) return false

    for( const m of mods ){
        
        if( m === mod ) return true 

    }

    return false

}