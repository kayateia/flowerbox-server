/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { AstNode } from "./AstNode";
import { parse } from "./Parser";
import { Runtime } from "./Runtime";
import { Value } from "./Value";
import { Compiler } from "./Compiler";
import { Address } from "./Address";
import { StackItem, Markers } from "./StackItem";

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
		this.discriminant = parse(parseTree.discriminant);
		this.cases = [];
		for (let c of parseTree.cases) {
			let sc = new SwitchCase(parse(c.test), c.consequent.map(parse));
			this.cases.push(sc);
		}
	}

	public compile(compiler: Compiler): void {
		if (!this.cases.length)
			return;

		// First thing, calculate the test value. This pushes a value on the operand stack.
		this.discriminant.compile(compiler);

		// Deref the value.
		compiler.emit("Switch test deref", this, (runtime: Runtime) => {
			let value = Value.PopAndDeref(runtime);

			// Put a break marker so the break statement can find our addresses.
			runtime.push(new StackItem()
				.setMarker(Markers.Break)
				.setExitLoop(this.switchEnd));

			runtime.pushOperand(value);
		});

		// Evaulate each test case...
		let caseLabels = [];
		this.cases.forEach((c,idx) => {
			c.test.compile(compiler);
			compiler.emit("Switch case test", this, (runtime: Runtime) => {
				let result = Value.PopAndDeref(runtime);
				if (result === runtime.get(0).operand) {
					// Whee, we found it. Jump to the appropriate case label.
					runtime.gotoPC(caseLabels[idx]);
				}
			});
		});

		this.switchEnd = compiler.newLabel(this);
		compiler.emit("Switch bail", this, (runtime: Runtime) => {
			runtime.gotoPC(this.switchEnd);
		});

		// Now all the body code.
		this.cases.forEach(c => {
			caseLabels.push(compiler.newLabel(this));
			c.body.forEach(b => b.compile(compiler));
		});

		this.switchEnd.pc = compiler.pc;

		compiler.emit("Switch cleanup", this, (runtime: Runtime) => {
			runtime.popWhile(i => i.marker !== Markers.Break);
			runtime.pop();
		});
	}

	public what: string = "Switch";
	public discriminant: AstNode;
	public cases: SwitchCase[];

	// For break support.
	public switchEnd: Address;
}
