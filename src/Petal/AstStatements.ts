/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { AstNode } from "./AstNode";
import { parse } from "./Parser";
import { Runtime } from "./Runtime";
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
		if (this.blockStatement) {
			compiler.emit("Pre-block scope push", this, (runtime: Runtime) => {
				// If we're in a block statement, also push on a new scope.
				runtime.pushScope(new StandardScope(runtime.currentScope));
			});
		}

		this.body.forEach(n => {
			compiler.emit("Pre-statement bp save", this, (runtime: Runtime) => {
				runtime.pushBase();
			});

			n.compile(compiler);

			compiler.emit("Post-statement bp restore", this, (runtime: Runtime) => {
				runtime.popBase();
			});
		});

		if (this.blockStatement) {
			compiler.emit("Post-block scope pop", this, (runtime: Runtime) => {
				runtime.popScope();
			});
		}
	}

	public what: string = "Statements";
	public body: AstNode[];
	public blockStatement: boolean;
}
