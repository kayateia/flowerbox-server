/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { AstNode } from "./AstNode";
import { compile } from "./Parser";
import { Step, Runtime } from "./Runtime";
import { StandardScope } from "./Scopes/StandardScope";
import { Value } from "./Value";

export class AstFor extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		this.init = compile(parseTree.init);
		this.test = compile(parseTree.test);
		this.update = compile(parseTree.update);
		this.body = compile(parseTree.body);
	}

	public execute(runtime: Runtime): void {
		// Stack marker in case we want to break or continue.
		runtime.pushAction(Step.Nonce("For marker"));

		let that = this;
		(function pushForIteration() {
			runtime.pushAction(Step.Callback("For next iteration", pushForIteration));
			runtime.pushAction(new Step(that.update, "For update"));
			runtime.pushAction(new Step(that.body, "For body"));

			// Do the condition check.
			runtime.pushAction(Step.Callback("For test callback", () => {
				// Get the result.
				let result = Value.PopAndDeref(runtime);
				if (!result) {
					// Bail.
					runtime.popActionUntil((s: Step) => s.name() !== "For marker");
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
