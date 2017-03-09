/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { RuntimeException } from "./Exceptions";

export class FixedStack<T> {
	// The "type" parameter is optional. If included, the type will be available
	// for pushRef() to create new instances. Why you can't simply new T() in
	// TypeScript is beyond me, but them's the breaks.
	constructor(type?: any) {
		this._stack = [];
		this._sp = 0;
		this._type = type;
	}

	public push(value: T): void {
		if (this._stack.length <= this._sp) {
			this._stack[this._stack.length + 10000] = null;
		}

		this._stack[this._sp++] = value;
	}

	// This is a specialized version of push() that returns the existing value
	// that's there already instead of taking a new one from the user. This lets
	// you store structures that can be reused on the stack. (Since, presumably,
	// if you're using a FixedStack to begin with, performance matters.)
	public pushRef(): T {
		if (this._stack.length <= this._sp) {
			this._stack[this._stack.length + 10000] = null;
		}

		if (this._stack[this._sp] === undefined)
			this._stack[this._sp] = new this._type();
		return this._stack[this._sp++];
	}

	public pop(): T {
		if (this._sp === 0)
			throw new RuntimeException("Stack underflow", null);

		return this._stack[--this._sp];
	}

	public get empty(): boolean {
		return this._sp === 0;
	}

	public clear(): void {
		this._sp = 0;
	}

	public popMany(count: number): void {
		if (this._sp < count)
			throw new RuntimeException("Stack underflow", null);

		this._sp -= count;
	}

	public get(index: number): T {
		if (this._sp < (1+index))
			throw new RuntimeException("Stack underflow", null);

		return this._stack[this._sp - (1+index)];
	}

	public set(index: number, value: T): void {
		if (this._sp < (1+index))
			throw new RuntimeException("Stack underflow", null);

		this._stack[this._sp - (1+index)] = value;
	}

	public get count(): number {
		return this._sp;
	}

	private _stack: T[];
	private _sp: number;
	private _type: any;
}
