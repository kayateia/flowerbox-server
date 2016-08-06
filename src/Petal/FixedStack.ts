/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { RuntimeException } from "./Exceptions";

export class FixedStack<T> {
	constructor() {
		this._stack = [];
		this._sp = 0;
	}

	public push(value: T): void {
		if (this._stack.length <= this._sp) {
			this._stack[this._stack.length + 10000] = null;
		}

		this._stack[this._sp++] = value;
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
}
