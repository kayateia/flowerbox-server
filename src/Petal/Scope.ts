// A variable scope. These may be nested.
export class Scope {
	constructor(parent?: Scope) {
		this._vars = {}
		this._parent = parent;
	}

	// Set the value of ths specified variable within this scope.
	public setVar(name: string, value: any): void {
		this._vars[name] = value;
	}

	// Get the value of the specified variable if we have it; undefined otherwise.
	public getVar(name: string): any {
		if (this._vars.hasOwnProperty(name))
			return this._vars[name];
		else {
			if (this._parent)
				return this._parent.getVar(name);
			else
				return undefined;
		}
	}

	// This is just a simple dictionary from name to value.
	private _vars: any;

	// If we are a child scope, point to our parent.
	private _parent: Scope;
}
