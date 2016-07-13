/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { WobReferenceException, WobOperationException } from "./Exceptions";
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

			let verbNames = Utils.GetPropertyNames(wobdef.verbs);
			let codePieces = [];
			for (let vn of verbNames) {
				let code = vn + ": { ";
				if (wobdef.verbs[vn].sigs)
					code += "sigs: " + JSON.stringify(wobdef.verbs[vn].sigs) + ",";
				if (wobdef.verbs[vn].code)
					code += "code: " + wobdef.verbs[vn].code;
				code += " }";
				codePieces.push(code);
			}
			let fullCode = "var verb = { " + codePieces.join(",") + " };";
			wob.verbCode = fullCode;

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

	public getWob(id: number): Promise<Wob> {
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

	public async moveWob(id: number, to: number) : Promise<void> {
		let wobs = await this.getWobs([id, to]);
		if (!wobs[0] || !wobs[1])
			throw new WobOperationException("Couldn't find source and/or destination wobs", [id, to]);

		let container = await this.getWob(wobs[0].container);
		if (!container)
			throw new WobOperationException("Couldn't find container", [id, wobs[0].container]);

		// Remove it from the original container.
		container.removeContent(wobs[0]);

		// Add it to the new one.
		wobs[1].addContent(wobs[0]);
	}

	private _nextId: number;
	private _wobCache: Map<number, Wob>;
}
