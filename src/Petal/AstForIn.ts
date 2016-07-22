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
		compiler.pushNode("For-in post-body", this, (runtime: Runtime) => {
			console.log("POST-LOOP");
			runtime.popOperand();
			runtime.popScope();
		});

		compiler.emit("For-in init scope", this, (runtime: Runtime) => {
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
			if (!(source instanceof Array)) {
				if (typeof(source) !== "object")
					throw new RuntimeException("Can't enumerate object", source);
				if (!AstObject.IsPetalObject(source))
					throw new RuntimeException("Can't enumerate object", source);

				source = Utils.GetPropertyNames(source)
					.filter(x => !x.startsWith("___"));
			} else {
				source = source.slice(0);
			}

			// Put it back on the stack for our use as the loop goes on.
			console.log("PRE-LOOP: source is", source);
			runtime.pushOperand(source);
		});

		// Compile the body.
		this.nextLabel = compiler.newLabel(this);
		compiler.emit("For-in pre-body", this, (runtime: Runtime) => {
			let right = runtime.getOperand(0);
			console.log("RIGHT is",right);
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
		compiler.popNode();
	}

	public what: string = "ForIn";
	public varName: string;
	public right: AstNode;
	public body: AstNode;

	// For use by break/continue inside.
	public nextLabel: Address;
	public postLoopLabel: Address;
}
