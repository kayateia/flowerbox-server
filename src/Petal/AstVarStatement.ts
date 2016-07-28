/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { AstNode } from "./AstNode";
import { AstVarDecl } from "./AstVarDecl";
import { parse } from "./Parser";
import { Compiler } from "./Compiler";

export class AstVarStatement extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		let declsAny: any = parseTree.declarations.map(parse);
		this.decls = declsAny;
	}

	public compile(compiler: Compiler): void {
		this.decls.forEach(d => d.compile(compiler));
	}

	public what: string = "Var";
	public decls: AstVarDecl[];
}
