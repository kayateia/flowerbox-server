/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { LValue } from "./LValue";
import { ThisValue } from "./ThisValue";
import { Runtime } from "./Runtime";
import { RuntimeException } from "./Exceptions";

export class Value {
	// Handles derefing both ThisValue and LValue.
	public static Deref(runtime: Runtime, value: any): any {
		let lval = ThisValue.Deref(value);
		return LValue.Deref(runtime, lval);
	}

	// Pops from the operand stack and returns the deref'd value.
	public static PopAndDeref(runtime: Runtime): any {
		return Value.Deref(runtime, runtime.popOperand());
	}

	public static GetThisValue(value: any): ThisValue {
		if (ThisValue.IsThisValue(value))
			return value;
		else
			throw new RuntimeException("Can't convert value to ThisValue", value);
	}

	public static GetLValue(value: any): LValue {
		if (ThisValue.IsThisValue(value))
			value = ThisValue.Deref(value);
		if (LValue.IsLValue(value))
			return value;
		else
			throw new RuntimeException("Can't convert value to LValue", value);
	}
}
