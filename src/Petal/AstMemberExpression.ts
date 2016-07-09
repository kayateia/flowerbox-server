/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { AstNode } from "./AstNode";
import { AstIdentifier } from "./AstIdentifier";
import { AstFunction } from "./AstFunction";
import { compile } from "./Parser";
import { Step, Runtime } from "./Runtime";
import { RuntimeException } from "./Exceptions";
import { LValue } from "./LValue";
import { Utils } from "./Utils";
import { ObjectWrapper, IObject } from "./Objects";
import { ThisValue } from "./ThisValue";

// This unfortunately covers both a.b and a["b"] (non-computed and computed).
export class AstMemberExpression extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		this.obj = compile(parseTree.object);
		if (!parseTree.computed) {
			this.member = parseTree.property.name;
		} else {
			this.property = compile(parseTree.property);
		}
	}

	public execute(runtime: Runtime): void {
		// See IObject.ts for more info about what's going on in here.
		runtime.pushAction(Step.Callback("Member lookup", () => {
			let obj = LValue.PopAndDeref(runtime);
			let property;
			if (this.property)
				property = LValue.PopAndDeref(runtime);
			let iobj: IObject = ObjectWrapper.Wrap(obj);
			if (!iobj)
				throw new RuntimeException("Can't wrap object for lookup", obj);

			let value;
			if (this.property)
				value = iobj.getAccessor(property);
			else
				value = iobj.getAccessor(this.member);

			let valderefed = LValue.Deref(runtime, value);
			if (AstFunction.IsFunction(valderefed) || typeof(valderefed) === "function")
				runtime.pushOperand(new ThisValue(obj, value));
			else
				runtime.pushOperand(value);
		}));
		runtime.pushAction(Step.Node("Member object", this.obj));
		if (this.property)
			runtime.pushAction(Step.Node("Member index", this.property));
	}

	public what: string = "MemberExpression";
	public obj: AstNode;

	// For non-computed properties.
	public member: string;

	// For computed properties.
	public property: AstNode;
}
