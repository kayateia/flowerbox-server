import { AstNode } from "./AstNode";
import { compile } from "./Parser";

export class AstIdentifier extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		this.name = parseTree.name;
	}

	public what: string = "Identifier";
	public name: string;
}
