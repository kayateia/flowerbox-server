/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/
import { Runtime } from "./Runtime";
import { RuntimeException } from "./Exceptions";

export interface ILValueReader {
	(runtime: Runtime): any
}

// This may return a Promise or undefined/null.
export interface ILValueWriter {
	(runtime: Runtime, value: any): any
}

/*
	An l-value, or "left-hand value" is something that might appear on the left
	side of an equals sign (or similar update/assignment operator). Because we have
	to allow for both reading and writing these values, we wrap them in an LValue
	object. Because we also have to track where member values came from for "this"
	support (and they are l-values as well), we also throw in a "this" value here.
*/
export class LValue {
	constructor(name: string, reader: ILValueReader, writer: ILValueWriter, thisValue?: any) {
		this._name = name;
		this._reader = reader;
		this._writer = writer;
		this._this = thisValue;
	}

	// Reads the value behind the l-value. This should never have any side effects.
	public read(runtime: Runtime): any {
		return this._reader(runtime);
	}

	// Writes to the value behind the l-value. This may return a Promise or undefined/null.
	public write(runtime: Runtime, value: any): any {
		return this._writer(runtime, value);
	}

	// Return the "this" value associated with this l-value, if there is one.
	public get thisValue(): any {
		return this._this;
	}

	// Makes a simple LValue that is read-only for a constant value.
	public static MakeReadOnly(value: any, thisValue?: any): LValue {
		return new LValue("Read-only Value",
			(rt) => value,
			(rt) => { throw new RuntimeException("Can't write to read-only value"); },
			thisValue);
	}

	// Returns true if the specified object is an LValue.
	public static IsLValue(value: any): boolean {
		return value instanceof LValue;
	}

	// Calls the read method and returns the value it returned, if this is an LValue.
	// Otherwise, returns the original value.
	public static Deref(runtime: Runtime, value: any): any {
		if (LValue.IsLValue(value))
			return value.read(runtime);
		else
			return value;
	}

	// Pops a value off the operand stack and calls Deref on it.
	public static PopAndDeref(runtime: Runtime): any {
		let value = runtime.popOperand();
		return LValue.Deref(runtime, value);
	}

	private _name: string;
	private _reader: ILValueReader;
	private _writer: ILValueWriter;
	private _this: any;
}
