import { AstNode } from "./AstNode";
import { compile } from "./Parser";

export class AstConditional extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		this.test = compile(parseTree.test);
		this.result = compile(parseTree.consequent);
		this.alternate = compile(parseTree.alternate);
	}

	public what: string = "Test";
	public test: AstNode;
	public result: AstNode;
	public alternate: AstNode;
}
