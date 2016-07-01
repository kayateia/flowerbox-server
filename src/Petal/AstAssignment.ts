import { AstNode } from "./AstNode";
import { compile } from "./Parser";

export class AstAssignment extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		this.operator = parseTree.operator;
		this.left = compile(parseTree.left);
		this.right = compile(parseTree.right);
	}

	public what: string = "Assignment";
	public operator: string;
	public left: AstNode;
	public right: AstNode;
}
