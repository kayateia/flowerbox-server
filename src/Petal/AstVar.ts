import { AstNode, ResultCallback } from "./AstNode";
import { AstVarDecl } from "./AstVarDecl";
import { compile } from "./Parser";

export class AstVar extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		let varsAny: any = parseTree.declarations.map(compile);
		this.vars = varsAny;
	}

	public execute(runtime: any, callback: ResultCallback): void {
		for (let i=0; i<this.vars.length; ++i) {
			if (i < this.vars.length - 1)
				this.vars[i].execute(runtime, null);
			else
				this.vars[i].execute(runtime, callback);
		}
	}

	public what: string = "Var";
	public vars: AstVarDecl[];
}
