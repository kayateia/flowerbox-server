/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { AstNode } from "./AstNode";
import { parse } from "./Parser";
import { Runtime } from "./Runtime";
import { Step } from "./Step";
import { StandardScope } from "./Scopes/StandardScope";
import { Compiler } from "./Compiler";

export class AstStatements extends AstNode {
	constructor(parseTree: any, blockStatement: boolean) {
		super(parseTree);
		if (parseTree) {
			this.body = parseTree.body.map(parse);
			this.blockStatement = blockStatement;
		}
	}

	public static FromStatement(node: AstNode, blockStatement: boolean): AstStatements {
		let stmts = new AstStatements(null, blockStatement);
		stmts.body = [node];
		return stmts;
	}

	public compile(compiler: Compiler): void {
		this.body.forEach(n => {
			compiler.emit(new Step("Pre-statement bp save", this, (runtime: Runtime) => {
				runtime.pushBase();
			}));

			n.compile(compiler);

			compiler.emit(new Step("Post-statement bp restore", this, (runtime: Runtime) => {
				runtime.popBase();
			}));
		});
	}

	/*public execute(runtime: Runtime): void {
		if (!this.body.length)
			return;

		// If we're entering a block (if statement, for loop, etc) then add a new scope
		// for any inner variables that might be declared.
		if (this.blockStatement)
			runtime.pushAction(Step.Scope("Block scope", new StandardScope(runtime.currentScope())));

		runtime.pushAction(Step.ClearOperands(runtime));
		runtime.pushAction(new Step(this.body[this.body.length - 1]));
		if (this.body.length > 1) {
			for (let i=this.body.length - 2; i>=0; --i) {
				runtime.pushAction(Step.ClearOperands(runtime));
				runtime.pushAction(new Step(this.body[i]));
			}
		}
	} */

	public what: string = "Statements";
	public body: AstNode[];
	public blockStatement: boolean;
}
