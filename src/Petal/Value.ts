/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { LValue } from "./LValue";
import { Runtime } from "./Runtime";
import { RuntimeException } from "./Exceptions";
import { StackItem } from "./StackItem";

export class Value {
	// Handles derefing LValue if needed.
	public static Deref(runtime: Runtime, value: any): any {
		return LValue.Deref(runtime, value);
	}

	public static PopOperand(runtime: Runtime): any {
		let item = runtime.get(0);
		if (!item.hasOperand)
			throw new RuntimeException("Popped value is not an operand", runtime, item);
		runtime.pop();
		return item.operand;
	}

	// Pops an operand from the stack and returns the deref'd value.
	public static PopAndDeref(runtime: Runtime): any {
		return Value.Deref(runtime, Value.PopOperand(runtime));
	}

	public static GetLValue(value: any): LValue {
		if (LValue.IsLValue(value))
			return value;
		else
			throw new RuntimeException("Can't convert value to LValue", null, value);
	}

	public static PopAndGetLValue(runtime: Runtime): any {
		let value = Value.PopOperand(runtime);
		return Value.GetLValue(value);
	}
}
