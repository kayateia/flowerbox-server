import { AstNode, ResultCallback } from "./AstNode";
import { compile } from "./Parser";

export class AstLiteral extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		this.value = parseTree.value;
	}

	public execute(runtime: any, callback: ResultCallback): any {
		if (callback)
			callback(this.value);
	}

	public what: string = "Literal";
	public value: any;
}
