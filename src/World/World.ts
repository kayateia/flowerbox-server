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
import * as Petal from "../Petal/All";
import * as FsPromises from "../Async/FsPromises";
import * as CorePromises from "../Async/CorePromises";
import * as path from "path";
import { Database } from "./Database";

// Zaa Warudo
export class World {
	private _nextId: number;
	private _nextIdDirty: boolean;
	private _wobCache: Map<number, Wob>;
	private _db: Database;

	constructor(database: Database) {
		// This is the default nextId. We don't set it to dirty because in the case
		// where the database hasn't been created yet, we will write it out after the first
		// wob create anyway; and if it has been created, we don't want to accidentally overwrite it.
		this._nextId = 1;
		this._nextIdDirty = false;

		this._wobCache = new Map<number, Wob>();
		this._db = database;

		setTimeout(() => this.commitTimeout(), 5*1000);
	}

	public async createDefault(init: any, basePath: string): Promise<void> {
		if (await this._db.exists(1)) {
			console.log("Skipping default world creation; already exists");
			let nextidstr = await this._db.readMeta("nextid");
			if (nextidstr)
				this._nextId = parseInt(nextidstr, 10);
			return;
		}

		for (let wobdef of init) {
			let wob = await this.createWob();
			for (let prop of Utils.GetPropertyNames(wobdef.properties))
				wob.setProperty(prop, wobdef.properties[prop]);
			if (wobdef.propertiesBinary) {
				for (let prop of Utils.GetPropertyNames(wobdef.propertiesBinary)) {
					let pv = wobdef.propertiesBinary[prop];
					let fn = path.join(basePath, pv.file);
					console.log("loading", fn, "-", pv.mime);
					let contents = await FsPromises.readFile(fn);
					wob.setProperty(prop, new Petal.PetalBlob(contents, pv.mime, pv.file));
				}
			}

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
				let container = this.getCachedWob(wobdef.container);
				wob.container = wobdef.container;
				container.contents.push(wob.id);
			}
			if (wobdef.base)
				wob.base = wobdef.base;
		}

		await this.commit();
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

		if (this._nextIdDirty) {
			this._db.writeMeta("nextid", this._nextId.toString());
			this._nextIdDirty = false;
		}
	}

	public async createWob(container?: number): Promise<Wob> {
		// Make the object.
		let wob = new Wob(this._nextId++);
		this._wobCache.set(wob.id, wob);
		this._nextIdDirty = true;

		// If there's a container specified, place the object into the container.
		if (container) {
			let containerWob: Wob = await this.getWob(container);
			if (!containerWob)
				throw new WobReferenceException("Can't find container", container);

			containerWob.contents.push(wob.id);
		}

		await this._db.createWob(wob);

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

	// Returns the requested wob if it's memory; otherwise null.
	public getCachedWob(id: number): Wob {
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

	public async getWobsByGlobalId(ids: string[]): Promise<Wob[]> {
		// Start off getting the in-memory results.
		let resultMap = new Map<number, boolean>();
		let results = [...this._wobCache.values()].filter((w) => Strings.caseIn(w.getProperty(WobProperties.GlobalId), ids));
		results.forEach(w => resultMap.set(w.id, true));

		// Look for results in the database as well.
		let dbresults = await this._db.loadWobsByGlobalId(ids);
		dbresults.forEach(w => {
			if (!resultMap.has(w.id)) {
				results.push(w);
				resultMap.set(w.id, true);
				this._wobCache.set(w.id, w);
			}
		});

		return results;
	}

	public async getWobsByPropertyMatch(property: string, value: any): Promise<Wob[]> {
		// Start off getting the in-memory results.
		let resultMap = new Map<number, boolean>();
		let results = [...this._wobCache.values()].filter((w) => w.getProperty(property) === value);
		results.forEach(w => resultMap.set(w.id, true));

		// Look for results in the database as well.
		let dbresults = await this._db.loadWobsByPropertyMatch(property, value);
		dbresults.forEach(w => {
			if (!resultMap.has(w.id)) {
				results.push(w);
				resultMap.set(w.id, true);
				this._wobCache.set(w.id, w);
			}
		});

		return results;
	}

	public async moveWob(id: number, to: number) : Promise<void> {
		let wob = await this.getWob(id);
		if (!wob)
			throw new WobOperationException("Couldn't find source wob", [id]);

		let container = this.getCachedWob(wob.container);
		if (container) {
			// Remove it from the original container.
			container.removeContent(id);
		}

		wob.container = to;

		container = this.getCachedWob(to);
		if (container) {
			// Add it to the new one.
			container.addContent(id);
		}
	}

	public async compostWob(id: number): Promise<void> {
		let wob = await this.getWob(id);
		if (!wob)
			throw new WobReferenceException("Couldn't find wob for composting", id);

		// Does it contain anything else? If so, for now, we fail.
		if (wob.contents.length)
			throw new WobOperationException("Wob can't be composted because it contains other wobs", [id, ...wob.contents]);

		let container = this.getCachedWob(wob.container);
		if (container) {
			// Remove it from the original container.
			container.removeContent(id);
		}

		// Remove it from the database.
		await this._db.deleteWob(id);

		// And remove it from our store.
		this._wobCache.delete(id);
	}
}
