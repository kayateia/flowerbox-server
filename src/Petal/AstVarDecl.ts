import { AstNode } from "./AstNode";
import { compile } from "./Parser";

export class AstVarDecl extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		this.name = parseTree.id.name;
		this.init = compile(parseTree.init);
	}

	public what: string = "VarDecl";
	public name: string;
	public init: AstNode;
}
