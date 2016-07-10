/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { AstNode } from "./AstNode";
import { compile } from "./Parser";
import { Step, Runtime } from "./Runtime";
import { Value } from "./Value";

export class AstVarDecl extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		this.name = parseTree.id.name;
		if (parseTree.init)
			this.init = compile(parseTree.init);
	}

	public execute(runtime: Runtime): void {
		runtime.pushAction(new Step(null, "Var assignment for " + this.name, (val) => {
			let opval: any;
			if (this.init) {
				opval = Value.PopAndDeref(runtime);
			}

			runtime.currentScope().set(this.name, opval);
		}));
		if (this.init)
			runtime.pushAction(new Step(this.init, "Var decl init value"));
	}

	public what: string = "VarDecl";
	public name: string;
	public init: AstNode;
}
