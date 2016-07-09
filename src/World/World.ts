/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { WobReferenceException } from "./Exceptions";
import { Wob, WobProperties } from "./Wob";
import { Verb } from "./Verb";
import * as Strings from "../Strings";
import { Utils } from "../Petal/Utils";

// Zaa Warudo
export class World {
	constructor() {
		this._nextId = 1;
		this._wobCache = new Map<number, Wob>();
	}

	public async createDefault(init: any): Promise<void> {
		for (let wobdef of init) {
			let wob = await this.createWob();
			for (let prop of Utils.GetPropertyNames(wobdef.properties))
				wob.setProperty(prop, wobdef.properties[prop]);
			for (let verb of Utils.GetPropertyNames(wobdef.verbs)) {
				let vpieces = wobdef.verbs[verb];
				wob.setVerb(verb, new Verb(verb, vpieces.join("\n")));
			}
			if (wobdef.container) {
				let container = await this.getWob(wobdef.container);
				container.addContent(wob);
			}
			if (wobdef.base)
				wob.base = wobdef.base;
		}
	}

	public async createWob(container?: number): Promise<Wob> {
		// Make the object.
		let wob = new Wob(this._nextId++);
		this._wobCache.set(wob.id, wob);

		// If there's a container specified, place the object into the container.
		if (container) {
			let containerWob: Wob = this._wobCache[container];
			if (!containerWob)
				throw new WobReferenceException("Can't find container", container);

			containerWob.addContent(wob);
		}

		return wob;
	}

	public async getWob(id: number): Promise<Wob> {
		return new Promise<Wob>((success, fail) => {
			// For now, we only support the in-memory cache.
			success(this._wobCache.get(id));
		});
	}

	// Eventually this will be the one to prefer using if you need more than one object,
	// because it can optimize its SQL queries as needed.
	public getWobs(ids: number[]): Promise<Wob[]> {
		return new Promise<Wob[]>((success, fail) => {
			success(ids.map((id) => this._wobCache.get(id)));
		});
	}

	public getWobsByGlobalId(ids: string[]): Promise<Wob[]> {
		return new Promise<Wob[]>((success, fail) => {
			success([...this._wobCache.values()].filter((w) => Strings.caseIn(w.getProperty(WobProperties.GlobalId), ids)));
		});
	}

	private _nextId: number;
	private _wobCache: Map<number, Wob>;
}
