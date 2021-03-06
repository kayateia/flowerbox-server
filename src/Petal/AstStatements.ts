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
import { StackItem, Markers } from "./StackItem";

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
				// If we're in a block statement, push on a block marker and a new scope.
				runtime.push(new StackItem()
					.setMarker(Markers.Block)
					.setScope(new StandardScope(runtime.currentScope)));
			});
		}

		this.body.forEach(n => {
			compiler.emit("Pre-statement stack save", this, (runtime: Runtime) => {
				runtime.pushMarker(Markers.Statement);
			});

			n.compile(compiler);

			compiler.emit("Post-statement stack restore", this, (runtime: Runtime) => {
				runtime.popWhile(i => i.marker !== Markers.Statement);
				runtime.pop();
			});
		});

		if (this.blockStatement) {
			compiler.emit("Post-block scope pop", this, (runtime: Runtime) => {
				runtime.popWhile(i => i.marker !== Markers.Block);
				runtime.pop();
			});
		}
	}

	public what: string = "Statements";
	public body: AstNode[];
	public blockStatement: boolean;
}
