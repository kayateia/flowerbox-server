/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { WobReferenceException } from "./Exceptions";
import { Wob, WobProperties } from "./Wob";

// Zaa Warudo
export class World {
	constructor() {
		this._nextId = 1;
		this._wobCache = new Map<number, Wob>();

		// Create a small in-world "game world" to test with.
		this.createDefault();
	}

	public createDefault(): void {
		// This will create #1. It is the root object.
		let wob = this.createWob();
		wob.setProperty(WobProperties.Name, "Zaa Warudo");
		wob.setProperty(WobProperties.GlobalId, "world");
		wob.setProperty(WobProperties.Description, "This is an endless void existing outside of all other reality.");
	}

	public createWob(container?: number): Wob {
		// Make the object.
		let wob = new Wob(this._nextId++);
		this._wobCache[wob.id] = wob;

		// If there's a container specified, place the object into the container.
		if (container) {
			let containerWob: Wob = this._wobCache[container];
			if (!containerWob)
				throw new WobReferenceException("Can't find container", container);

			containerWob.addContent(wob);
		}

		return wob;
	}

	public getWob(id: number): Wob {
		// For now, we only support the in-memory cache.
		return this._wobCache[id];
	}

	private _nextId: number;
	private _wobCache: Map<number, Wob>;
}
