import { AstNode } from "./AstNode";
import { AstVarDecl } from "./AstVarDecl";
import { compile } from "./Parser";

export class AstVar extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		var varsAny: any = parseTree.declarations.map(compile);
		this.vars = varsAny;
	}

	public what: string = "Var";
	public vars: AstVarDecl[];
}
