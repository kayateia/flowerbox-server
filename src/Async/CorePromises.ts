/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

export class CorePromises {
	public static Delay(ms: number): Promise<{}> {
		return new Promise(r => setTimeout(r, ms));
	}
}
