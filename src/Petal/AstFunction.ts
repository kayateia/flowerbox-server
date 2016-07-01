import { AstNode } from "./AstNode";
import { AstStatements } from "./AstStatements";
import { compile } from "./Parser";

export class AstFunction extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		if (parseTree.id)
			this.name = parseTree.id.name;
		this.params = parseTree.params.map((i) => i.name);
		this.body = new AstStatements(parseTree.body);
	}

	public what: string = "Function";
	public name: string;
	public params: string[];
	public body: AstStatements;
}
