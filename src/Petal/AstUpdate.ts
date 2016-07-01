import { AstNode } from "./AstNode";
import { compile } from "./Parser";

export class AstUpdate extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		this.operator = parseTree.operator;
		this.arg = compile(parseTree.argument);
		this.prefix = parseTree.prefix;
	}

	public what: string = "Update";
	public operator: string;
	public arg: AstNode;
	public prefix: boolean;
}
