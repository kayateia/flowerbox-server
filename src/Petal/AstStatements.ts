import { AstNode } from "./AstNode";
import { compile } from "./Parser";

export class AstStatements extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		this.body = parseTree.body.map(compile);
	}

	public what: string = "Statements";
	public body: AstNode[];
}
