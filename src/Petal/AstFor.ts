import { AstNode } from "./AstNode";
import { compile } from "./Parser";

export class AstFor extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		this.init = compile(parseTree.init);
		this.test = compile(parseTree.test);
		this.update = compile(parseTree.update);
		this.body = compile(parseTree.body);
	}

	public what: string = "For";
	public init: AstNode;
	public test: AstNode;
	public update: AstNode;
	public body: AstNode;
}
