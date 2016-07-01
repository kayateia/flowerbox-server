import { AstNode } from "./AstNode";
import { compile } from "./Parser";

export class AstCallExpression extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		this.callee = compile(parseTree.callee);
		this.param = parseTree.arguments.map(compile);
	}
	public what: string = "CallExpression";
	public callee: AstNode;
	public param: AstNode[];
}
