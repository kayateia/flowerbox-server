import { AstNode } from "./AstNode";
import { compile } from "./Parser";

export class AstLiteral extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		this.value = parseTree.value;
	}
	public what: string = "Literal";
	public value: any;
}
