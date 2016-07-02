import { AstNode } from "./AstNode";
import { compile } from "./Parser";
import { Step, Runtime } from "./Runtime";
import { StandardScope } from "./Scopes/StandardScope";
import { LValue } from "./LValue";

export class AstFor extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		this.init = compile(parseTree.init);
		this.test = compile(parseTree.test);
		this.update = compile(parseTree.update);
		this.body = compile(parseTree.body);
	}

	public execute(runtime: Runtime): void {
		// For loop's lexical scope, which will go on below any of our code.
		let scope = new StandardScope(runtime.currentScope());
		runtime.pushAction(Step.Scope("For scope", scope));

		let that = this;
		(function pushForIteration() {
			runtime.pushAction(Step.Callback("For next iteration", pushForIteration));
			runtime.pushAction(new Step(that.update, "For update"));
			runtime.pushAction(new Step(that.body, "For body"));

			// Do the condition check.
			runtime.pushAction(Step.Callback("For test callback", () => {
				// Get the result.
				let result = LValue.PopAndDeref(runtime);
				if (!result) {
					// Bail.
					runtime.popActionUntil((s: Step) => s.name() !== "For scope");
					runtime.popAction();
				}
			}));
			runtime.pushAction(new Step(that.test, "For test"));
		})();

		// First thing, for loop init.
		runtime.pushAction(new Step(this.init, "For init"));
	}

	public what: string = "For";
	public init: AstNode;
	public test: AstNode;
	public update: AstNode;
	public body: AstNode;
}
