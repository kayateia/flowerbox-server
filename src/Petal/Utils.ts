/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

export class Utils {
	public static CombineArraysUniquely(a1: string[], a2: string[]): string[] {
		let output: any = {};
		a1.forEach((i) => output[i] = 0);
		a2.forEach((i) => output[i] = 0);
		return Utils.GetPropertyNames(output);
	}

	// For some reason getOwnPropertyNames() isn't defined?! Nor is keys().
	public static GetPropertyNames(a: any) {
		let output: string[] = [];
		for (var i in a)
			if (!a.hasOwnProperty || a.hasOwnProperty(i))
				output.push(i);

		return output;
	}
}
