import { AstNode } from "./AstNode";
import { AstIdentifier } from "./AstIdentifier";
import { compile } from "./Parser";

export class AstMemberExpression extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		let objAny: any = compile(parseTree.object);
		this.obj = objAny;
		this.member = parseTree.property.name;
	}

	public what: string = "MemberExpression";
	public obj: AstIdentifier;
	public member: string;
}
