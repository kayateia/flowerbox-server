import { AstNode } from "./AstNode";
import { AstIdentifier } from "./AstIdentifier";
import { compile, parseException } from "./Parser";
import { Step, Runtime } from "./Runtime";
import { LValue } from "./LValue";
import { Utils } from "./Utils";

export class AstObject extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		this.contents = {};
		parseTree.properties.forEach((p) => {
			// "get" and "set" are also possible - we aren't handling them yet.
			if (p.kind !== "init")
				throw parseException;

			let key = p.key;
			if (key.type === "Identifier")
				key = key.name;
			else if (key.type === "Literal")
				key = key.value;
			else
				throw parseException;

			let value = compile(p.value);

			this.contents[key] = value;
		});
	}

	public execute(runtime: Runtime): any {
		runtime.pushAction(Step.Callback("Object constructor", () => {
			let result = {};
			Utils.GetPropertyNames(this.contents).forEach((p) => {
				let value = LValue.PopAndDeref(runtime);
				result[p] = value;
			});
			runtime.pushOperand(result);
		}));
		Utils.GetPropertyNames(this.contents).forEach((i) =>
			runtime.pushAction(new Step(this.contents[i], "Object member")));
	}

	public what: string = "ObjectExpression";
	public contents: any;
}
