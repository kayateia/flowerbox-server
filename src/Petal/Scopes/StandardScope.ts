import { IScope } from "../IScope";

export class StandardScope implements IScope {
	constructor(parent?: IScope) {
		this._vars = {}
		this._parent = parent;
	}

	// Set the value of this specified variable within this scope.
	public set(name: string, value: any): void {
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
		var ours: string[] = this._vars.getOwnPropertyNames();

		if (this._parent) {
			// This could be a lot more efficient.
			var theirs = this._parent.names();
			theirs.forEach((n) => {
				if (ours.indexOf(n) < 0)
					ours.push(n);
			});
		}

		return ours;
	}

	// This is just a simple dictionary from name to value.
	private _vars: any;

	// If we are a child scope, point to our parent.
	private _parent: IScope;
}
