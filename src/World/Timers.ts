/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import * as Petal from "../Petal/All";

// Manages timers and intervals by string IDs.
export class Timers {
	constructor() {
		this._timeouts = new Map<string, NodeJS.Timer>();
		this._intervals = new Map<string, NodeJS.Timer>();
	}

	// Set a single one-shot timeout with the given ID, callback, and delay in milliseconds.
	// If a timer with the ID was previously pending, it will be canceled.
	public setTimeout(id: string, callback: () => void, delay: number): void {
		// Was there a previous timer with this name?
		this.clearTimeout(id);

		let timeout = setTimeout(() => {
			this._timeouts.delete(id);
			callback();
		}, delay);
		this._timeouts.set(id, timeout);
	}

	// Clear the previous timeout with the specified ID, if it exists.
	public clearTimeout(id: string): void {
		if (this._timeouts.has(id)) {
			let oldTimeout = this._timeouts.get(id);
			clearTimeout(oldTimeout);
		}
	}

	// Set a periodic interval timer with the given ID, callback, and delay in milliseconds.
	// If an interval with the ID was previously ongoing, it will be canceled.
	public setInterval(id: string, callback: () => void, delay: number): void {
		// Was there a previous interval with this name?
		if (this._intervals.has(id)) {
			let oldInterval = this._intervals.get(id);
			clearInterval(oldInterval);
		}

		let interval = setInterval(callback, delay);
		this._intervals.set(id, interval);
	}

	// Clear the previous interval with the specified ID, if it exists.
	public clearInterval(id: string): void {
		if (this._intervals.has(id)) {
			let oldInterval = this._intervals.get(id);
			clearInterval(oldInterval);
		}
	}

	private _timeouts: Map<string, NodeJS.Timer>;
	private _intervals: Map<string, NodeJS.Timer>;
}
