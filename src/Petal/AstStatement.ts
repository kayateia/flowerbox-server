import { AstNode } from "./AstNode";
import { IActionCallback } from "./IActionCallback";
import { compile } from "./Parser";
import { Step, Runtime } from "./Runtime";

export class AstStatement extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		if (parseTree.expression)
			this.statement = compile(parseTree.expression);
	}

	public execute(runtime: Runtime, callback: IActionCallback): void {
		if (this.statement)
			runtime.pushAction(new Step(this.statement, "Statement", callback));
		else {
			if (callback)
				callback(runtime);
		}
	}

	public what: string = "Statement";
	public statement: AstNode;
}
