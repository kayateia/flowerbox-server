import { AstNode } from "./AstNode";
import { IActionCallback } from "./IActionCallback";
import { compile } from "./Parser";

export class AstLiteral extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		this.value = parseTree.value;
	}

	public execute(runtime: any, callback: IActionCallback): any {
		runtime.pushOperand(this.value);
		if (callback)
			callback(runtime);
	}

	public what: string = "Literal";
	public value: any;
}
