import { AstNode } from "./AstNode";
import { IActionCallback } from "./IActionCallback";
import { AstVarDecl } from "./AstVarDecl";
import { compile } from "./Parser";

export class AstVarStatement extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		let varsAny: any = parseTree.declarations.map(compile);
		this.vars = varsAny;
	}

	public execute(runtime: any, callback: IActionCallback): void {
		if (this.vars.length === 0) {
			if (callback)
				callback(runtime);
		} else {
			for (let i=this.vars.length - 1; i>=0; --i) {
				if (i === this.vars.length - 1)
					this.vars[i].execute(runtime, callback);
				else
					this.vars[i].execute(runtime, null);
			}
		}
	}

	public what: string = "Var";
	public vars: AstVarDecl[];
}
