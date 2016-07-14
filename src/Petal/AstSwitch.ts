/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { AstNode } from "./AstNode";
import { compile } from "./Parser";
import { Step, Runtime } from "./Runtime";
import { Value } from "./Value";
import { Loops } from "./Loops";

class SwitchCase {
	constructor(test: AstNode, body: AstNode[]) {
		this.test = test;
		this.body = body;
	}

	public test: AstNode;
	public body: AstNode[];
}

export class AstSwitch extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		this.testValue = compile(parseTree.discriminant);
		this.cases = [];
		for (let c of parseTree.cases) {
			let sc = new SwitchCase(compile(c.test), c.consequent.map(compile));
			this.cases.push(sc);
		}
	}

	public execute(runtime: Runtime): void {
		if (this.cases.length < 1)
			return;

		// Stack marker in case we want to break.
		Loops.PushMarker(runtime, Loops.Outside);

		let that = this;
		let testValue;
		let curTestIdx = 0;

		function doIteration() {
			// Grab the condition value.
			let value = Value.PopAndDeref(runtime);
			if (testValue === value) {
				// Yay, we found it. Push on the code for the rest of the cases. Either one
				// will have a break statement or we'll execute it all.
				for (let i=that.cases.length-1; i>=curTestIdx; --i) {
					for (let j=that.cases[i].body.length-1; j>=0; --j) {
						runtime.pushAction(Step.Node("Case code", that.cases[i].body[j]));
					}
				}
				return;
			} else {
				// Nope. Push on the next test and callback.
				if (++curTestIdx >= that.cases.length)
					return;

				runtime.pushAction(Step.Callback("Switch test case callback", doIteration));
				runtime.pushAction(Step.Node("Switch first case", that.cases[curTestIdx].test));
			}
		};

		// Grab the testValue.
		runtime.pushAction(Step.Callback("Switch get testValue", () => {
			testValue = Value.PopAndDeref(runtime);

			// And push on the first test value execution.
			runtime.pushAction(Step.Callback("Switch test case callback", doIteration));
			runtime.pushAction(Step.Node("Switch first case", this.cases[0].test));
		}));

		// First thing, calculate the test value.
		runtime.pushAction(Step.Node("Switch test value", this.testValue));
	}

	public what: string = "Switch";
	public testValue: AstNode;
	public cases: SwitchCase[];
}