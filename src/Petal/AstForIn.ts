/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { AstNode } from "./AstNode";
import { AstObject } from "./AstObject";
import { parse } from "./Parser";
import { Runtime } from "./Runtime";
import { StandardScope } from "./Scopes/StandardScope";
import { Value } from "./Value";
import { Utils } from "./Utils";
import { RuntimeException } from "./Exceptions";
import { Compiler } from "./Compiler";
import { Address } from "./Address";
import { ObjectWrapper, PetalObject, PetalArray } from "./Objects";
import { StackItem,Markers } from "./StackItem";

export class AstForIn extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);

		// We're just going to cheat on this one because the structure is always the same,
		// and this is much simpler for us.
		this.varName = parseTree.left.declarations[0].id.name;
		this.right = parse(parseTree.right);
		this.body = parse(parseTree.body);
	}

	public compile(compiler: Compiler): void {
		compiler.emit("For-in init scope", this, (runtime: Runtime) => {
			// Push on a break marker for break and continue.
			runtime.push(new StackItem()
				.setMarker(Markers.Break)
				.setExitLoop(this.postLoopLabel));

			// Push on a scope to handle what drops out of the init vars.
			runtime.pushScope(new StandardScope(runtime.currentScope));
		});

		this.right.compile(compiler);

		compiler.emit("For-in pre-loop", this, (runtime: Runtime) => {
			// Convert the source into something we can hack and slash.
			let source = Value.PopAndDeref(runtime);

			// For arrays, we just enumerate the contents. For objects, we enumerate their keys.
			// For everything else, there's M... exceptions. For now non-Petal objects are
			// also included in that last one.
			if (source instanceof PetalArray) {
				// Just make a copy of the array and we'll dole out the contents one at a time.
				source = source.array.slice(0);
			} else if (source instanceof PetalObject) {
				source = source.keys;
			} else {
				throw new RuntimeException("Can't enumerate object", runtime, source);
			}

			// Put it back on the stack for our use as the loop goes on.
			runtime.push(new StackItem()
				.setOperand(source)
				.setMarker(Markers.Continue)
				.setNextIteration(this.nextLabel));
		});

		// Compile the body.
		this.nextLabel = compiler.newLabel(this);
		compiler.emit("For-in pre-body", this, (runtime: Runtime) => {
			let right = runtime.get(0).operand;
			if (right.length === 0) {
				runtime.gotoPC(this.postLoopLabel);
				return;
			}

			let next = right.shift();
			runtime.currentScope.set(this.varName, next);
		});
		this.body.compile(compiler);

		// And loop back up to the next iteration.
		compiler.emit("For-in looptie loop", this, (runtime: Runtime) => {
			runtime.gotoPC(this.nextLabel);
		});

		this.postLoopLabel = compiler.newLabel(this);
		compiler.emit("For-in loop cleanup", this, (runtime: Runtime) => {
			runtime.popWhile(i => i.marker !== Markers.Break);
			runtime.pop();
		});
	}

	public what: string = "ForIn";
	public varName: string;
	public right: AstNode;
	public body: AstNode;

	// For use by break/continue inside.
	public nextLabel: Address;
	public postLoopLabel: Address;
}
