/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { AstNode } from "./AstNode";
import { parse } from "./Parser";
import { Runtime } from "./Runtime";
import { StandardScope } from "./Scopes/StandardScope";
import { Value } from "./Value";
import { Loops } from "./Loops";
import { Compiler } from "./Compiler";
import { Address } from "./Address";

export class AstFor extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		this.init = parse(parseTree.init);
		this.test = parse(parseTree.test);
		this.update = parse(parseTree.update);
		this.body = parse(parseTree.body);
	}

	public compile(compiler: Compiler): void {
		compiler.pushLoop(this);

		compiler.emit("For init scope", this, (runtime: Runtime) => {
			// Push on a scope to handle what drops out of the init vars.
			runtime.pushScope(new StandardScope(runtime.currentScope));
		});

		this.init.compile(compiler);

		let checkLabel = compiler.newLabel(this);

		this.test.compile(compiler);

		this.postLoopLabel = compiler.newLabel(this);
		compiler.emit("For test checker", this, (runtime: Runtime) => {
			let testResult = Value.PopAndDeref(runtime);
			if (!testResult)
				runtime.gotoPC(this.postLoopLabel);
		});

		this.body.compile(compiler);

		this.nextLabel = compiler.newLabel(this);
		this.update.compile(compiler);

		compiler.emit("For loop looptie loop", this, (runtime: Runtime) => {
			runtime.gotoPC(checkLabel);
		});

		this.postLoopLabel.pc = compiler.pc;
		compiler.emit("Drop for scope", this, (runtime: Runtime) => {
			runtime.popScope();
		});

		compiler.popLoop();
	}

	public what: string = "For";
	public init: AstNode;
	public test: AstNode;
	public update: AstNode;
	public body: AstNode;

	// For use by break/continue inside.
	public nextLabel: Address;
	public postLoopLabel: Address;
}
