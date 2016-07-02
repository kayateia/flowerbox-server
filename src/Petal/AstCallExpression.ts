import { AstNode } from "./AstNode";
import { AstFunction } from "./AstFunction";
import { compile } from "./Parser";
import { runtimeError, Step, Runtime } from "./Runtime";
import { IScope } from "./IScope";
import { ParameterScope } from "./Scopes/ParameterScope";

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

			// Are we looking at a real native function or a Petal function?
			if (typeof(callee) === "function") {
				let result = callee(...values);
				runtime.pushOperand(result);
			} else if (typeof(callee) == "object" && AstFunction.IsFunction(callee)) {
				// We need to do two things here. The first one is that we need to get the function's
				// arguments in place, using a function argument scope. Then we need to push the contents
				// of the function onto the action stack.
				var func: AstFunction = callee;
				var scope: IScope = new ParameterScope(runtime.currentScope(), func.params);
				scope.set("arguments", values);
				for (let i=0; i<func.params.length && i<values.length; ++i)
					scope.set(func.params[i], values[i]);

				runtime.pushAction(Step.Scope("Parameter scope", scope));
				runtime.pushAction(new Step(func.body));
			} else {
				// Throw something heavy
				console.log("ERROR: Can't call uncallable object", callee);
				throw runtimeError;
			}
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
