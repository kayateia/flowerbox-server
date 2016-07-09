/*
	Flowerbox
	Copyright (C) 2016 Kayateia, Dove
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { AstNode } from "./AstNode";
import { AstFunction, AstFunctionInstance } from "./AstFunction";
import { compile } from "./Parser";
import { Step, Runtime } from "./Runtime";
import { RuntimeException } from "./Exceptions";
import { IScope } from "./IScope";
import { StandardScope } from "./Scopes/StandardScope";
import { ParameterScope } from "./Scopes/ParameterScope";
import { LValue } from "./LValue";
import { ThisValue } from "./ThisValue";
import { Utils } from "./Utils";

export class AstCallExpression extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);

		// We might not have these if the object was created synthetically.
		if (parseTree.callee && parseTree.arguments) {
			this.callee = compile(parseTree.callee);
			this.param = parseTree.arguments.map(compile);
		}
	}

	public static Create(callee: AstNode, param: AstNode[]): AstCallExpression {
		let ace = new AstCallExpression({});
		ace.callee = callee;
		ace.param = param;
		return ace;
	}

	// Unwinds the stack past the current function call invocation, for early return.
	public static UnwindCurrent(runtime: Runtime): void {
		runtime.popActionUntil((s: Step) => s.name() !== "Function scope");
		runtime.popAction();
	}

	public execute(runtime: Runtime): any {
		runtime.pushAction(Step.Callback("Function execution", (v) => {
			let callee = runtime.popOperand();
			let thisValue = null;
			let otherInjects = {};
			if (callee instanceof ThisValue) {
				let tv = <ThisValue>callee;
				thisValue = tv.thisValue;
				otherInjects = tv.others;
			}
			callee = LValue.Deref(runtime, callee);

			let values = [];
			for (let i=0; i<this.param.length; ++i) {
				values.push(LValue.PopAndDeref(runtime));
			}

			if (callee === null || callee === undefined)
				throw new RuntimeException("Can't call null/undefined");

			// Are we looking at a real native function or a Petal function?
			if (typeof(callee) === "function") {
				// If the callback returns a Promise, we will return that and bail early.
				let result = callee(...values);
				if (result instanceof Promise)
					return result;
				else
					runtime.pushOperand(result);
			} else if (typeof(callee) === "object" && AstFunction.IsFunction(callee)) {
				// We need to do two things here. The first one is that we need to get the function's
				// arguments in place, using a function argument scope. Then we need to push the contents
				// of the function onto the action stack.
				var func: AstFunctionInstance = callee;
				runtime.pushAction(Step.Scope("Function scope", func.scope));

				let otherInjectNames: string[] = Utils.GetPropertyNames(otherInjects);

				var scope: IScope = new ParameterScope(func.scope, ["arguments", "this", ...otherInjectNames, ...func.params]);
				scope.set("arguments", values);
				scope.set("this", thisValue);
				for (let i of otherInjectNames)
					scope.set(i, otherInjects[i]);
				for (let i=0; i<func.params.length && i<values.length; ++i)
					scope.set(func.params[i], values[i]);

				runtime.pushAction(Step.Scope("Parameter scope", scope));
				runtime.pushAction(new Step(func.body));
			} else {
				// Throw something heavy
				throw new RuntimeException("Can't call uncallable object", callee);
			}
			return null;
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
