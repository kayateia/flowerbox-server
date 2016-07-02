/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { AstNode } from "./AstNode";
import { AstFunction } from "./AstFunction";
import { compile } from "./Parser";
import { Step, Runtime } from "./Runtime";
import { RuntimeException } from "./Exceptions";
import { IScope } from "./IScope";
import { StandardScope } from "./Scopes/StandardScope";
import { ParameterScope } from "./Scopes/ParameterScope";
import { LValue } from "./LValue";

export class AstCallExpression extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		this.callee = compile(parseTree.callee);
		this.param = parseTree.arguments.map(compile);
	}

	// Unwinds the stack past the current function call invocation, for early return.
	public static UnwindCurrent(runtime: Runtime): void {
		runtime.popActionUntil((s: Step) => s.name() !== "Function scope");
		runtime.popAction();
	}

	public execute(runtime: Runtime): void {
		runtime.pushAction(Step.Callback("Function execution", (v) => {
			let callee = LValue.PopAndDeref(runtime);
			let values = [];
			for (let i=0; i<this.param.length; ++i) {
				values.push(LValue.PopAndDeref(runtime));
			}

			// Are we looking at a real native function or a Petal function?
			if (typeof(callee) === "function") {
				let result = callee(...values);
				runtime.pushOperand(result);
			} else if (typeof(callee) == "object" && AstFunction.IsFunction(callee)) {

				// We need to do two things here. The first one is that we need to get the function's
				// arguments in place, using a function argument scope. Then we need to push the contents
				// of the function onto the action stack.
				var func: AstFunction = callee;
				runtime.pushAction(Step.Scope("Function scope", func.scope));

				var scope: IScope = new ParameterScope(func.scope, func.params);
				scope.set("arguments", values);
				for (let i=0; i<func.params.length && i<values.length; ++i) {
					console.log("Setting", func.params[i], "to", values[i]);
					scope.set(func.params[i], values[i]);
				}

				runtime.pushAction(Step.Scope("Parameter scope", scope));
				runtime.pushAction(new Step(func.body));
			} else {
				// Throw something heavy
				throw new RuntimeException("Can't call uncallable object", callee);
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
