import { AstNode } from "./AstNode";
import { compile } from "./Parser";

export class AstReturn extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		this.arg = compile(parseTree.argument);
	}
	public what: string = "CallExpression";
	public arg: AstNode;
}
