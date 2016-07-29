/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { WobReferenceException, WobOperationException } from "./Exceptions";
import { Wob, WobProperties } from "./Wob";
import { Verb } from "./Verb";
import * as Strings from "../Utils/Strings";
import { Utils } from "../Petal/Utils";
import * as FsPromises from "../Async/FsPromises";
import * as path from "path";
import { Database } from "./Database";

// Zaa Warudo
export class World {
	private _nextId: number;
	private _wobCache: Map<number, Wob>;
	private _db: Database;

	constructor(database: Database) {
		this._nextId = 1;
		this._wobCache = new Map<number, Wob>();
		this._db = database;

		setTimeout(() => this.commitTimeout(), 5*1000);
	}

	public async createDefault(init: any, basePath: string): Promise<void> {
		for (let wobdef of init) {
			let wob = await this.createWob();
			for (let prop of Utils.GetPropertyNames(wobdef.properties))
				wob.setProperty(prop, wobdef.properties[prop]);

			if (!wobdef.verbs) {
				// Do nothing - it gets no verbs.
			} else if (typeof(wobdef.verbs) === "string") {
				let p = path.join(basePath, wobdef.verbs);
				console.log("loading", p);
				let contents = (await FsPromises.readFile(p)).toString();
				wob.verbCode = contents;
			} else {
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
			}

			if (wobdef.container) {
				let container = await this.getWob(wobdef.container);
				container.addContent(wob);
			}
			if (wobdef.base)
				wob.base = wobdef.base;

			wob.dirty = false;
			this._db.createWob(wob);
		}
	}

	public commitTimeout(): void {
		this.commit()
			.then(() => {
			})
			.catch((err) => {
				console.log("Unable to persist to database", err);
			});
		setTimeout(() => this.commitTimeout(), 5*1000);
	}

	public async commit(): Promise<void> {
		for (let k of this._wobCache.keys()) {
			let wob = this._wobCache.get(k);
			if (wob.dirty) {
				await this._db.updateWob(wob);
				wob.dirty = false;
			}
		}
	}

	public async createWob(container?: number): Promise<Wob> {
		// Make the object.
		let wob = new Wob(this._nextId++);
		this._wobCache.set(wob.id, wob);

		// If there's a container specified, place the object into the container.
		if (container) {
			let containerWob: Wob = await this.getWob(container);
			if (!containerWob)
				throw new WobReferenceException("Can't find container", container);

			containerWob.addContent(wob);
		}

		this._db.createWob(wob);

		return wob;
	}

	public async getWob(id: number): Promise<Wob> {
		if (!this._wobCache.has(id)) {
			let loaded = await this._db.loadWob(id);
			if (loaded)
				this._wobCache.set(id, loaded);
		}

		// For now, we only support the in-memory cache.
		return this._wobCache.get(id);
	}

	// Eventually this will be the one to prefer using if you need more than one object,
	// because it can optimize its SQL queries as needed.
	public async getWobs(ids: number[]): Promise<Wob[]> {
		let result: Wob[] = [];
		for (let id of ids)
			result.push(await this.getWob(id));
		return result;
	}

	public getWobsByGlobalId(ids: string[]): Promise<Wob[]> {
		return new Promise<Wob[]>((success, fail) => {
			success([...this._wobCache.values()].filter((w) => Strings.caseIn(w.getProperty(WobProperties.GlobalId), ids)));
		});
	}

	public getWobsByPropertyMatch(property: string, value: any): Promise<Wob[]> {
		return new Promise<Wob[]>((success, fail) => {
			success([...this._wobCache.values()].filter((w) => w.getProperty(property) === value));
		});
	}

	public async moveWob(id: number, to: number) : Promise<void> {
		let wobs = await this.getWobs([id, to]);
		if (!wobs[0] || !wobs[1])
			throw new WobOperationException("Couldn't find source and/or destination wobs", [id, to]);

		if (wobs[0].id !== id)
			wobs = wobs.reverse();

		let container = await this.getWob(wobs[0].container);
		if (!container)
			throw new WobOperationException("Couldn't find container", [id, wobs[0].container]);

		// Remove it from the original container.
		container.removeContent(wobs[0]);

		// Add it to the new one.
		wobs[1].addContent(wobs[0]);
	}

	public async compostWob(id: number): Promise<void> {
		let wob = await this.getWob(id);
		if (!wob)
			throw new WobReferenceException("Couldn't find wob for composting", id);

		// Does it contain anything else? If so, for now, we fail.
		if (wob.contents.length)
			throw new WobOperationException("Wob can't be composted because it contains other wobs", [id, ...wob.contents]);

		let container = await this.getWob(wob.container);
		if (!container)
			throw new WobReferenceException("Couldn't find container wob", wob.container);

		// Remove it from the original container.
		container.removeContent(wob);

		// Remove it from the database.
		this._db.deleteWob(id);

		// And remove it from our store.
		this._wobCache.delete(id);
	}
}
