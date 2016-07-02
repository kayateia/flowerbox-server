import { AstNode } from "./AstNode";
import { AstVarDecl } from "./AstVarDecl";
import { compile } from "./Parser";

export class AstVarStatement extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		let varsAny: any = parseTree.declarations.map(compile);
		this.vars = varsAny;
	}

	public execute(runtime: any): void {
		for (let i=this.vars.length - 1; i>=0; --i)
			this.vars[i].execute(runtime);
	}

	public what: string = "Var";
	public vars: AstVarDecl[];
}
