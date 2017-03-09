/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { AstNode } from "./AstNode";
import { AstFunction } from "./AstFunction";
import { parse } from "./Parser";
import { Runtime } from "./Runtime";
import { Value } from "./Value";
import { Compiler } from "./Compiler";
import { StackItem, Markers } from "./StackItem";
import { StandardScope } from "./Scopes/StandardScope";
import { RuntimeException } from "./Exceptions";

// See notes/exception-handling.txt for more on how this works.
export class AstTryStatement extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		this.block = parse(parseTree.block);
		if (parseTree.handler)
			this.handler = <AstCatchClause>parse(parseTree.handler);
		if (parseTree.finalizer)
			this.finalizer = parse(parseTree.finalizer);
	}

	public compile(compiler: Compiler): void {
		let catchLabel;
		if (this.handler)
			catchLabel = compiler.newLabel(this.handler);

		let finallyLabel;
		if (this.finalizer)
			finallyLabel = compiler.newLabel(this.finalizer);

		compiler.emit("Try marker", this, (runtime: Runtime) => {
			// When a throw is executed, we will back out to the next one of these.
			runtime.push(new StackItem()
				.setMarker(Markers.Try)
				.setCatch(catchLabel)
				.setFinally(finallyLabel));
		});

		this.block.compile(compiler);

		let skipLabel = compiler.newLabel(this);
		compiler.emit("Clean up try", this, (runtime: Runtime) => {
			// Clean up the try marker.
			runtime.popWhile(i => i.marker !== Markers.Try);
			runtime.pop();

			// If we have a finally block, push on a finalizer marker.
			if (this.finalizer)
				runtime.pushMarker(Markers.FinallyBlock);

			// Skip over the catch handler.
			if (this.handler)
				runtime.gotoPC(skipLabel);
		});

		// We only need to do this if we actually have a catch block.
		if (this.handler) {
			catchLabel.pc = compiler.pc;

			// We expect to come into this block with one operand on the top of the stack,
			// representing the thrown value.
			compiler.emit("Catch scope", this, (runtime: Runtime) => {
				// Push on a scope with the caught value.
				let scope = new StandardScope(runtime.currentScope);
				scope.set(this.handler.param, Value.PopAndDeref(runtime));
				runtime.push(new StackItem()
					.setScope(scope)
					.setMarker(Markers.CatchBlock));
			});

			this.handler.compile(compiler);

			compiler.emit("Catch cleanup", this, (runtime: Runtime) => {
				runtime.popWhile(i => i.marker !== Markers.CatchBlock);
				runtime.pop();

				// If we have a finalizer, let it run and give it an empty callback
				// so that we just pass on to later code.
				if (this.finalizer)
					runtime.pushMarker(Markers.FinallyBlock);
			});
		}

		skipLabel.pc = compiler.pc;

		// If they provided a finally block, execute that too.
		//
		// In the case of normal execution flow, we just want this block to fall through
		// to the next instruction as if the block was just inline with the rest of the
		// code. However, if we're doing a throw handle, we want this block to pass control
		// back to something else when it's done. This will be done by way of the standard
		// stack unwinder callback.
		if (this.finalizer) {
			finallyLabel.pc = compiler.pc;

			this.finalizer.compile(compiler);

			compiler.emit("Finalizer finalizer", this.finalizer, (runtime: Runtime) => {
				runtime.popWhile(i => i.marker !== Markers.FinallyBlock);
				runtime.pop();
			});
		}
	}

	public what: string = "TryCatch";
	public block: AstNode;
	public handler: AstCatchClause;
	public finalizer: AstNode;
}

export class AstCatchClause extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		this.param = parseTree.param.name;
		this.body = parse(parseTree.body);
	}

	public compile(compiler: Compiler): void {
		this.body.compile(compiler);
	}

	public what: string = "CatchClause";
	public param: string;
	public body: AstNode;
}

export class AstThrowStatement extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		this.argument = parse(parseTree.argument);
	}

	public compile(compiler: Compiler): void {
		this.argument.compile(compiler);

		compiler.emit("Throw statement", this, (runtime: Runtime) => {
			// Get the thrown value.
			let value = Value.PopAndDeref(runtime);

			(function unwindLoop(runtime: Runtime) {
				// Unwind the stack until we hit the next try marker.
				runtime.popWhile(i => i.marker !== Markers.Try);
				if (runtime.count === 0) {
					// We ran out of Petal stack, so throw it to the host.
					throw new RuntimeException("Thrown value", runtime, value);
				}
				let tryMarker = runtime.pop();

				// If we found a try/finally, just execute the finally, but loop back around
				// to us again so we can continue scanning.
				if (!tryMarker.catchAddress && tryMarker.finallyAddress) {
					runtime.push(new StackItem()
						.setUnwinder(unwindLoop)
						.setMarker(Markers.FinallyBlock));
					runtime.gotoPC(tryMarker.finallyAddress);
					return;
				}

				// If we found a try/catch or try/catch/finally, jump to the catch.
				if (tryMarker.catchAddress) {
					runtime.pushOperand(value);
					runtime.gotoPC(tryMarker.catchAddress);
					return;
				}

				// This shouldn't happen.
				throw new RuntimeException("Invalid try/catch stack marker", runtime);
			})(runtime);
		});
	}

	public what: string = "Throw";
	public argument: AstNode;
}
