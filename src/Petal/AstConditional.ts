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

export class AstConditional extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		this.test = parse(parseTree.test);
		this.consequent = parse(parseTree.consequent);
		if (parseTree.alternate)
			this.alternate = parse(parseTree.alternate);
		this.statement = parseTree.type === "IfStatement";
	}

	public compile(compiler: Compiler): void {
		// Evaluate the condition first.
		this.test.compile(compiler);

		// What was the result?
		let skipConsequent = compiler.newLabel(this);
		let skipToEnd = compiler.newLabel(this);
		compiler.emit("Conditional branch", this, (runtime: Runtime) => {
			let testResult = Value.PopAndDeref(runtime);
			if (!testResult)
				runtime.gotoPC(skipConsequent);
		});

		// Compile the consequent.
		this.consequent.compile(compiler);
		compiler.emit("Conditional skip alternate", this, (runtime: Runtime) => {
			runtime.gotoPC(skipToEnd);
		});

		// And the alternate, if we have one.
		skipConsequent.pc = compiler.pc;
		if (this.alternate)
			this.alternate.compile(compiler);

		skipToEnd.pc = compiler.pc;
	}

	/*public execute(runtime: Runtime): void {
		runtime.pushAction(Step.Callback("Conditional", () => {
			let result = Value.PopAndDeref(runtime);

			if (this.statement)
				runtime.pushAction(Step.ClearOperands(runtime));

			if (result)
				runtime.pushAction(new Step(this.consequent, "Conditional consequent"));
			else if (this.alternate)
				runtime.pushAction(new Step(this.alternate, "Conditional alternate"));
		}));
		runtime.pushAction(new Step(this.test, "Conditional test"));
	} */

	public what: string = "Test";
	public test: AstNode;
	public consequent: AstNode;
	public alternate: AstNode;
	public statement: boolean;
}
