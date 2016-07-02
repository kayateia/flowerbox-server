import { StandardScope } from "./StandardScope";
import { IScope } from "../IScope";
import { Utils } from "../Utils";

export class ParameterScope implements IScope {
	constructor(parent: IScope, parameters: string[]) {
		this._parent = parent;
		this._contents = new StandardScope();
		parameters.forEach((p) => this._contents.set(p, null));
	}

	public get(name: string): any {
		if (this._contents.has(name))
			return this._contents.get(name);
		else
			return this._parent.get(name);
	}

	public has(name: string): boolean {
		if (this._contents.has(name))
			return true;
		else
			return this._parent.has(name);
	}

	public set(name: string, value: any): void {
		if (this._contents.has(name))
			this._contents.set(name, value);
		else
			this._parent.set(name, value);
	}

	public del(name: string): void {
		this._parent.del(name);
	}

	public names(): string[] {
		return Utils.CombineArraysUniquely(this._contents.names(), this._parent.names());
	}

	_parent: IScope;
	_contents: StandardScope;
}
