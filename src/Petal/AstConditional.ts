import { AstNode } from "./AstNode";
import { compile } from "./Parser";
import { runtimeError, Step, Runtime } from "./Runtime";
import { LValue } from "./LValue";

export class AstConditional extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		this.test = compile(parseTree.test);
		this.result = compile(parseTree.consequent);
		this.alternate = compile(parseTree.alternate);
	}

	public execute(runtime: Runtime): void {
		runtime.pushAction(Step.Callback("Conditional", () => {
			let result = LValue.PopAndDeref(runtime);

			if (result)
				runtime.pushAction(new Step(this.result, "Conditional result"));
			else
				runtime.pushAction(new Step(this.alternate, "Conditional alternate"));
		}));
		runtime.pushAction(new Step(this.test, "Conditional test"));
	}

	public what: string = "Test";
	public test: AstNode;
	public result: AstNode;
	public alternate: AstNode;
}
