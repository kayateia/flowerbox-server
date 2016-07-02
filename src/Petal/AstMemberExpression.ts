import { AstNode } from "./AstNode";
import { AstIdentifier } from "./AstIdentifier";
import { compile } from "./Parser";
import { Step, Runtime, runtimeError } from "./Runtime";
import { LValue } from "./LValue";
import { Utils } from "./Utils";
import { ObjectWrapper, IObject } from "./Objects";

export class AstMemberExpression extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		let objAny: any = compile(parseTree.object);
		this.obj = objAny;
		this.member = parseTree.property.name;
	}

	public execute(runtime: Runtime): void {
		// See IObject.ts for more info about what's going on in here.
		runtime.pushAction(Step.Callback("Member lookup", () => {
			let obj = LValue.PopAndDeref(runtime);
			let iobj = ObjectWrapper.Wrap(obj);
			if (!iobj)
				throw runtimeError;

			runtime.pushOperand(iobj.getAccessor(this.member));
		}));
		runtime.pushAction(Step.Node("Member object", this.obj));
	}

	public what: string = "MemberExpression";
	public obj: AstIdentifier;
	public member: string;
}
