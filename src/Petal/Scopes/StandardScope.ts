/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { IScope } from "../IScope";
import { Utils } from "../Utils";

export class StandardScope implements IScope {
	constructor(parent?: IScope) {
		this._vars = {}
		this._parent = parent;
	}

	// Set the value of this specified variable within this scope.
	public set(name: string, value: any): void {
		if (this._vars.hasOwnProperty(name))
			this._vars[name] = value;
		else if (this._parent && this._parent.has(name))
			this._parent.set(name, value);
		else
			this._vars[name] = value;
	}

	// Get the value of the specified variable if we have it; undefined otherwise.
	public get(name: string): any {
		if (this._vars.hasOwnProperty(name))
			return this._vars[name];
		else {
			if (this._parent)
				return this._parent.get(name);
			else
				return undefined;
		}
	}

	public has(name: string): boolean {
		if (this._vars.hasOwnProperty(name))
			return true;

		if (this._parent)
			return this._parent.has(name);
		else
			return false;
	}

	public del(name: string): void {
		if (this._vars.hasOwnProperty(name))
			delete this._vars[name];
		else {
			if (this._parent)
				this._parent.del(name);
		}
	}

	public names(): string[] {
		var ours: string[] = Utils.GetPropertyNames(this._vars);

		if (this._parent)
			ours = Utils.CombineArraysUniquely(ours, this._parent.names());

		return ours;
	}

	// This is just a simple dictionary from name to value.
	private _vars: any;

	// If we are a child scope, point to our parent.
	private _parent: IScope;
}
