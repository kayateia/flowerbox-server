/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { AstNode } from "./AstNode";
import { AstIdentifier } from "./AstIdentifier";
import { AstFunction } from "./AstFunction";
import { parse } from "./Parser";
import { Runtime } from "./Runtime";
import { RuntimeException } from "./Exceptions";
import { Value } from "./Value";
import { Utils } from "./Utils";
import { ObjectWrapper, IObject } from "./Objects";
import { LValue } from "./LValue";
import { Compiler } from "./Compiler";

// This unfortunately covers both a.b and a["b"] (non-computed and computed).
export class AstMemberExpression extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		this.obj = parse(parseTree.object);
		if (!parseTree.computed) {
			this.member = parseTree.property.name;
		} else {
			this.property = parse(parseTree.property);
		}
	}

	// FIXME: Doesn't handle ThisValues.
	public compile(compiler: Compiler): void {
		this.obj.compile(compiler);
		if (this.property)
			this.property.compile(compiler);

		compiler.emit("Member lookup part 1", this, (runtime: Runtime) => {
			let property;
			if (this.property)
				property = Value.PopAndDeref(runtime);
			let obj = Value.PopAndDeref(runtime);

			if (!obj)
				throw new RuntimeException("Null reference", runtime, this.member);

			let iobj: IObject = ObjectWrapper.WrapForMemberAccess(obj);
			if (!iobj)
				throw new RuntimeException("Can't wrap object for lookup", runtime, obj);

			let value;
			if (this.property)
				value = iobj.getAccessor(property, runtime.accessorCargo);
			else
				value = iobj.getAccessor(this.member, runtime.accessorCargo);

			if (value instanceof Promise)
				return value;
			else
				runtime.pushOperand(value);
		});

		compiler.emit("Member lookup part 2", this, (runtime: Runtime) => {
			let value = runtime.popOperand();

			// Unwrap what's there on read, and if it's a Promise, do the read and make
			// a new LValue that has the raw (succeeded) value as well as the old writer.
			//
			// Note: This is kind of a hack. But it limits the damage to one small area (here)
			// instead of having async and Promise code scattered all over the runtime.
			// It's also a good bet that most accesses will be reads, anyway, and if they
			// are writes, a read is likely to have preceeded it.
			let derefed = Value.Deref(runtime, value);
			if (derefed instanceof Promise) {
				return derefed.then(val => {
					return new LValue(value.name, () => val, value.write, value.thisValue);
				})
				.catch((err) => {
					throw err;
				});
			} else
				runtime.pushOperand(value);
		});
	}

	public what: string = "MemberExpression";
	public obj: AstNode;

	// For non-computed properties.
	public member: string;

	// For computed properties.
	public property: AstNode;
}
