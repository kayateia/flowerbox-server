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
				throw new RuntimeException("Null reference", this.member);

			let iobj: IObject = ObjectWrapper.Wrap(obj);
			if (!iobj)
				throw new RuntimeException("Can't wrap object for lookup", obj);

			let value;
			if (this.property)
				value = iobj.getAccessor(property);
			else
				value = iobj.getAccessor(this.member);

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
				return derefed.then((val) => {
					return new LValue(value.name, () => val, value.write);
				})
				.catch((err) => {
					throw err;
				});
			} else
				runtime.pushOperand(value);
		});
	}

	/*public execute(runtime: Runtime): void {
		// See IObject.ts for more info about what's going on in here.
		runtime.pushAction(Step.Callback("Member lookup", () => {
			let obj = Value.PopAndDeref(runtime);
			let property;
			if (this.property)
				property = Value.PopAndDeref(runtime);
			let iobj: IObject = ObjectWrapper.Wrap(obj);
			if (!iobj)
				throw new RuntimeException("Can't wrap object for lookup", obj);

			let value;
			if (this.property)
				value = iobj.getAccessor(property);
			else
				value = iobj.getAccessor(this.member);

			function finishUp(finalValue) {
				// If we already got a ThisValue, don't double-wrap it. Otherwise, store the object with
				// the value so it can become the "this" value in the function call.
				//
				// This mess of logic here is a hack to make it easier to return ThisValues from native callbacks. FIXME.
				if (!ThisValue.IsThisValue(finalValue) && !ThisValue.IsThisValue(Value.Deref(runtime, finalValue)))
					finalValue = new ThisValue(obj, finalValue);

				return finalValue;
			}

			// If they returned a promise, then we have to let that flow back out and pause
			// the execution loop. When it's finished, we'll come back here and finish up with
			// the real value.
			//
			// Note that this is a REALLY ugly place to put the Promise support; more ideal would
			// be plumbing it into LValue, but then we'd have to support async all over the place.
			// In truth, the current design of Petal is not inspiring but it should hold for
			// another day...
			if (value instanceof Promise)
				return value
					.then(finishUp)
					.catch((err) => {
						throw err;
					});
			else {
				runtime.pushOperand(finishUp(value));
			}
		}));
		runtime.pushAction(Step.Node("Member object", this.obj));
		if (this.property)
			runtime.pushAction(Step.Node("Member index", this.property));
	} */

	public what: string = "MemberExpression";
	public obj: AstNode;

	// For non-computed properties.
	public member: string;

	// For computed properties.
	public property: AstNode;
}
