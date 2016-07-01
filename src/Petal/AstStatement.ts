import { AstNode } from "./AstNode";
import { compile } from "./Parser";

export class AstStatement extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		this.statement = compile(parseTree.expression);
	}

	public what: string = "Statement";
	public statement: AstNode;
}
