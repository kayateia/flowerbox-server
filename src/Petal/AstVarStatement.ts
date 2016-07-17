/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { AstNode } from "./AstNode";
import { AstVarDecl } from "./AstVarDecl";
import { compile } from "./Parser";

export class AstVarStatement extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		let declsAny: any = parseTree.declarations.map(compile);
		this.decls = declsAny;
	}

	public execute(runtime: any): void {
		for (let i=this.decls.length - 1; i>=0; --i)
			this.decls[i].execute(runtime);
	}

	public what: string = "Var";
	public decls: AstVarDecl[];
}
