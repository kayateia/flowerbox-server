/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { IScope } from "../IScope";
import { Utils } from "../Utils";
import { RuntimeException } from "../Exceptions";

export class ConstScope implements IScope {
	constructor(parent: IScope, items: Map<string, any>) {
		this._parent = parent;
		this._contents = items;
	}

	public static FromObject(parent: IScope, obj: any): ConstScope {
		let members = Utils.GetPropertyNames(obj);
		let map = new Map<string, any>();
		for (let m of members)
			map.set(m, obj[m]);

		return new ConstScope(parent, map);
	}

	public get(name: string): any {
		if (this._contents.has(name))
			return this._contents.get(name);
		else if (this._parent)
			return this._parent.get(name);
		else
			return null;
	}

	public has(name: string): boolean {
		if (this._contents.has(name))
			return true;
		else if (this._parent)
			return this._parent.has(name);
		else
			return false;
	}

	public set(name: string, value: any): void {
		if (this._contents.has(name))
			throw new RuntimeException("Can't set a value in a constant scope", null, name);
		else if (this._parent)
			this._parent.set(name, value);
	}

	public setConst(name: string, value: any): void {
		this._contents.set(name, value);
	}

	public del(name: string): void {
		if (this._contents.has(name))
			throw new RuntimeException("Can't delete a value from a constant scope", null, name);
		else if (this._parent)
			this._parent.del(name);
	}

	public names(): string[] {
		if (this._parent)
			return Utils.CombineArraysUniquely([...this._contents.keys()], this._parent.names());
		else
			return [...this._contents.keys()];
	}

	private _parent: IScope;
	private _contents: Map<string, any>;
}
