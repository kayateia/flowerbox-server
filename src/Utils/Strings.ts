/*
	Flowerbox
	Copyright (C) 2016 Dove
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

// One value in the map. We wrap these to maintain the original case when
// listing out the keys in the map, but are still able to store them in a
// case insensitive manner.
class Item<T> {
	constructor(k: string, v: T) {
		this.key = k;
		this.value = v;
	}

	public key: string;
	public value: T;
}

// This implements a case-insensitive map from strings to any other object.
export class CaseMap<T> {
	constructor() {
		this._map = new Map<string, Item<T>>();
	}

	public get(key: string): T {
		let item = this._map.get(key.toLowerCase());
		if (!item)
			return null;
		else
			return item.value;
	}

	public set(key: string, value: T): void {
		this._map.set(key.toLowerCase(), new Item(key, value));
	}

	public has(key: string): boolean {
		return this._map.has(key.toLowerCase());
	}

	public delete(key: string): void {
		this._map.delete(key.toLowerCase());
	}

	public keys(): string[] {
		let ret: string[] = [];
		for (let pair of this._map)
			ret.push(pair[1].key);
		return ret;
	}

	public values(): T[] {
		let ret: T[] = [];
		for (let pair of this._map)
			ret.push(pair[1].value);
		return ret;
	}

	private _map: Map<string, Item<T>>;
}

// Does a case insensitive comparison. Not locale sensitive.
export function caseEqual(a: string, b: string): boolean {
	if (a === undefined || a === null || b === undefined || b === null)
		return false;
	return a.toLowerCase() === b.toLowerCase();
}

export function caseIn(str: string, arr: string[]): boolean {
	if (str === undefined || str === null)
		return false;

	for (var s of arr)
		if (caseEqual(s, str))
			return true;
	return false;
}

// For some reason "string" in ["string"] === false in JavaScript.
export function stringIn(str: string, arr: string[]): boolean {
	if (str === undefined || str === null)
		return false;

	for (var s of arr)
		if (s === str)
			return true;
	return false;
}
