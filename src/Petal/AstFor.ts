/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { AstNode } from "./AstNode";
import { parse } from "./Parser";
import { Step, Runtime } from "./Runtime";
import { StandardScope } from "./Scopes/StandardScope";
import { Value } from "./Value";
import { Loops } from "./Loops";

export class AstFor extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		this.init = parse(parseTree.init);
		this.test = parse(parseTree.test);
		this.update = parse(parseTree.update);
		this.body = parse(parseTree.body);
	}

	public execute(runtime: Runtime): void {
		// Stack marker in case we want to break.
		Loops.PushMarker(runtime, Loops.Outside);

		// Push on a scope to handle what drops out of the init vars.
		runtime.pushAction(Step.Scope("For init scope", new StandardScope(runtime.currentScope())));

		let that = this;
		(function pushForIteration() {
			runtime.pushAction(Step.Callback("For next iteration", pushForIteration));
			runtime.pushAction(new Step(that.update, "For update"));
			Loops.PushMarker(runtime, Loops.Iteration);
			runtime.pushAction(new Step(that.body, "For body"));

			// Do the condition check.
			runtime.pushAction(Step.Callback("For test callback", () => {
				// Get the result.
				let result = Value.PopAndDeref(runtime);
				if (!result) {
					// Bail.
					Loops.UnwindCurrent(runtime, Loops.Outside);
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
