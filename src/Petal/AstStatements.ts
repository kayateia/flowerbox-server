import { AstNode } from "./AstNode";
import { compile } from "./Parser";
import { Step, Runtime } from "./Runtime";

export class AstStatements extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		this.body = parseTree.body.map(compile);
	}

	public execute(runtime: Runtime): void {
		if (!this.body.length)
			return;

		runtime.pushAction(Step.ClearOperands(runtime));
		runtime.pushAction(new Step(this.body[this.body.length - 1]));
		if (this.body.length > 1) {
			for (let i=this.body.length - 2; i>=0; --i) {
				runtime.pushAction(Step.ClearOperands(runtime));
				runtime.pushAction(new Step(this.body[i]));
			}
		}
	}

	public what: string = "Statements";
	public body: AstNode[];
}
