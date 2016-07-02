import { Runtime } from "./Runtime";

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

	public static IsLValue(value: any): boolean {
		return typeof(value) === "object" && value._reader;
	}

	public static Deref(runtime: Runtime, value: any): any {
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
