import { AstNode, ResultCallback } from "./AstNode";
import { compile } from "./Parser";
import { Runtime } from "./Runtime";

export class AstStatements extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		this.body = parseTree.body.map(compile);
	}

	public execute(runtime: Runtime, callback: ResultCallback): void {
		for (let i=0; i<this.body.length; ++i) {
			if (i < this.body.length - 1)
				runtime.addStep(this.body[i], null);
			else
				runtime.addStep(this.body[i], callback);
		}
	}

	public what: string = "Statements";
	public body: AstNode[];
}
