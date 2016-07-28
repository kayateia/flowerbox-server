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

export class AstVarDecl extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		this.name = parseTree.id.name;
		if (parseTree.init)
			this.init = parse(parseTree.init);
	}

	public compile(compiler: Compiler): void {
		if (this.init)
			this.init.compile(compiler);

		compiler.emit("Vardecl init", this, (runtime: Runtime) => {
			let value;
			if (this.init)
				value = Value.PopAndDeref(runtime);
			runtime.currentScope.set(this.name, value);
		});
	}

	public what: string = "VarDecl";
	public name: string;
	public init: AstNode;
}
