import { AstNode } from "./AstNode";
import { IActionCallback } from "./IActionCallback";
import { compile } from "./Parser";
import { Runtime } from "./Runtime";

export class AstIdentifier extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		this.name = parseTree.name;
	}

	public execute(runtime: Runtime, callback: IActionCallback): void {
		let val = runtime.currentScope().get(this.name);
		runtime.pushOperand(val);
		if (callback)
			callback(runtime);
	}

	public what: string = "Identifier";
	public name: string;
}
