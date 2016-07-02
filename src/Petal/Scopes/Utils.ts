export class Utils {
	public static CombineArraysUniquely(a1: string[], a2: string[]): string[] {
		let output: any = {};
		a1.forEach((i) => output[i] = 0);
		a2.forEach((i) => output[i] = 0);
		return output.getOwnPropertyNames();
	}
}
