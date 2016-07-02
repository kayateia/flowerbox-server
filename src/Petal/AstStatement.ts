import { AstNode } from "./AstNode";
import { compile } from "./Parser";
import { Step, Runtime } from "./Runtime";

export class AstStatement extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		if (parseTree.expression)
			this.statement = compile(parseTree.expression);
	}

	public execute(runtime: Runtime): void {
		if (this.statement)
			runtime.pushAction(new Step(this.statement, "Statement"));
	}

	public what: string = "Statement";
	public statement: AstNode;
}
