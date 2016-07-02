import { AstNode } from "./AstNode";
import { compile } from "./Parser";
import { Step, Runtime } from "./Runtime";

export class AstCallExpression extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		this.callee = compile(parseTree.callee);
		this.param = parseTree.arguments.map(compile);
	}

	public execute(runtime: Runtime): void {
		runtime.pushAction(Step.Callback("Function execution", (v) => {
			let callee = runtime.popOperand();
			let values = [];
			for (let i=0; i<this.param.length; ++i)
				values.push(runtime.popOperand());
			let result = callee(...values);
			runtime.pushOperand(result);
		}));
		runtime.pushAction(new Step(this.callee, "Callee Resolution"));
		this.param.forEach((p: AstNode) => {
			runtime.pushAction(new Step(p, "Parameter Resolution"));
		});
	}

	public what: string = "CallExpression";
	public callee: AstNode;
	public param: AstNode[];
}
