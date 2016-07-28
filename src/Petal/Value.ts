/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { LValue } from "./LValue";
import { Runtime } from "./Runtime";
import { RuntimeException } from "./Exceptions";

export class Value {
	// Handles derefing LValue if needed.
	public static Deref(runtime: Runtime, value: any): any {
		return LValue.Deref(runtime, value);
	}

	// Pops from the operand stack and returns the deref'd value.
	public static PopAndDeref(runtime: Runtime): any {
		return Value.Deref(runtime, runtime.popOperand());
	}

	public static GetLValue(value: any): LValue {
		if (LValue.IsLValue(value))
			return value;
		else
			throw new RuntimeException("Can't convert value to LValue", value);
	}
}
