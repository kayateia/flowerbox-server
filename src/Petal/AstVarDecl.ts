import { AstNode, ResultCallback } from "./AstNode";
import { compile } from "./Parser";
import { Runtime } from "./Runtime";

export class AstVarDecl extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		this.name = parseTree.id.name;
		this.init = compile(parseTree.init);
	}

	public execute(runtime: Runtime, callback: ResultCallback): void {
		runtime.addStep(this.init, (val: any) => {
			runtime.currentScope().setVar(this.name, val);
			if (callback)
				callback(val);
		});
	}

	public what: string = "VarDecl";
	public name: string;
	public init: AstNode;
}
