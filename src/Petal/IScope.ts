/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

// A scope is a container for program state information like active variable values.
// These can act hierarchically; they can be chained, and the available values are
// pulled from the highest up in the chain.
export interface IScope {
	// Sets the value in this scope.
	set(name: string, value: any): void;

	// Gets the value from this scope.
	get(name: string): any;

	// Returns true if this scope has the value.
	has(name: string): boolean;

	// Deletes the value from the scope.
	del(name: string): void;

	// Returns an array of all items in the scope.
	names(): string[];
}

// A scope catcher is a last-ditch effort to look up a variable name, often used
// for names that are not specifically in existence until needed (e.g. object IDs).
export interface IScopeCatcher {
	// Gets the value from this scope.
	get(name: string): any;

	// If this method returns true, get() will return a Promise that must
	// be fulfilled before the value can be gotten.
	requiresAsync(name: string): boolean;
}
