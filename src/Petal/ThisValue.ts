/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

// This feels like kind of a hack but I don't have a better idea right now -- this class
// allows you to pass along an associated "this" value if the value retrieved from a member
// lookup happens to be a function that can be called. The "this" value can then be
// injected into the function as a parameter.
//
// Other values are also allowed to be injected here, which may happen from the rest
// of the Flowerbox runtime.
export class ThisValue {
	constructor(thisValue: any, value: any, others?: any) {
		this.thisValue = thisValue;
		this.value = value;
		if (others)
			this.others = others;
		else
			this.others = {};
	}

	public thisValue: any;
	public value: any;
	public others: any;
}
