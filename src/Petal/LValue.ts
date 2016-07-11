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

export interface ILValueWriter {
	(runtime: Runtime, value: any): void
}

export class LValue {
	constructor(name: string, reader: ILValueReader, writer: ILValueWriter) {
		this._name = name;
		this._reader = reader;
		this._writer = writer;
	}

	// Reads the value behind the l-value. This should never have any side effects.
	public read(runtime: Runtime): any {
		return this._reader(runtime);
	}

	// Writes to the value behind the l-value.
	public write(runtime: Runtime, value: any): void {
		this._writer(runtime, value);
	}

	// Makes a simple LValue that is read-only for a constant value.
	public static MakeReadOnly(value: any): LValue {
		return new LValue("Read-only Value", (rt) => value, (rt) => { throw new RuntimeException("Can't write to read-only value"); });
	}

	// Returns true if the specified object is an LValue.
	public static IsLValue(value: any): boolean {
		return value instanceof LValue;
	}

	// Calls the read method and returns the value it returned, if this is an LValue.
	// Otherwise, returns the original value.
	public static Deref(runtime: Runtime, value: any): any {
		if (LValue.IsLValue(value))
			return value.read();
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
}
