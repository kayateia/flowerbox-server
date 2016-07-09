/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/
import { Runtime } from "./Runtime";
import { RuntimeException } from "./Exceptions";
import { ThisValue } from "./ThisValue";

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

	public read(runtime: Runtime): any {
		return this._reader(runtime);
	}

	public write(runtime: Runtime, value: any): void {
		this._writer(runtime, value);
	}

	public static MakeReadOnly(value: any): LValue {
		return new LValue("Read-only Value", (rt) => value, (rt) => { throw new RuntimeException("Can't write to read-only value"); });
	}

	public static IsLValue(value: any): boolean {
		return typeof(value) === "object" && value._reader;
	}

	public static Deref(runtime: Runtime, value: any): any {
		// Just save ourselves some trouble and do this here.
		if (value instanceof ThisValue)
			value = (<ThisValue>value).value;

		if (LValue.IsLValue(value))
			return value.read();
		else
			return value;
	}

	public static PopAndDeref(runtime: Runtime): any {
		let value = runtime.popOperand();
		return LValue.Deref(runtime, value);
	}

	private _name: string;
	private _reader: ILValueReader;
	private _writer: ILValueWriter;
}
