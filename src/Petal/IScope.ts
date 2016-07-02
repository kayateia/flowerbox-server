/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

// A scope is a container for program state information like active variable values.
// These can act hierarchically; they can be chained, and the available values are
// pulled from the highest up in the chain.
export interface IScope {
	set(name: string, value: any): void;
	get(name: string): any;
	has(name: string): boolean;
	del(name: string): void;
	names(): string[];
}
