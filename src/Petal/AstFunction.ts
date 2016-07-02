import { AstNode } from "./AstNode";
import { AstStatements } from "./AstStatements";
import { compile } from "./Parser";
import { Runtime } from "./Runtime";

export class AstFunction extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		if (parseTree.id)
			this.name = parseTree.id.name;
		this.params = parseTree.params.map((i) => i.name);
		this.body = new AstStatements(parseTree.body);
	}

	public static IsFunction(value: any): boolean {
		return value.what === "Function";
	}

	// We basically just "execute" like an R-Value, to be set in variables or called directly.
	public execute(runtime: Runtime): void {
		if (this.name)
			runtime.currentScope().set(this.name, this);
		runtime.pushOperand(this);
	}

	public what: string = "Function";
	public name: string;
	public params: string[];
	public body: AstStatements;
}
