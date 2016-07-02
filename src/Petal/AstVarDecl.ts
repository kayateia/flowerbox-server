import { AstNode } from "./AstNode";
import { IActionCallback } from "./IActionCallback";
import { compile } from "./Parser";
import { Step, Runtime } from "./Runtime";

export class AstVarDecl extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		this.name = parseTree.id.name;
		if (parseTree.init)
			this.init = compile(parseTree.init);
	}

	public execute(runtime: Runtime, callback: IActionCallback): void {
		runtime.pushAction(new Step(null, "Var assignment for " + this.name, (val) => {
			let opval: any;
			if (this.init) {
				opval = runtime.popOperand();
			}

			runtime.currentScope().set(this.name, opval);

			if (callback)
				callback(runtime);
		}));
		if (this.init)
			runtime.pushAction(new Step(this.init, "Var decl init value"));
	}

	public what: string = "VarDecl";
	public name: string;
	public init: AstNode;
}
