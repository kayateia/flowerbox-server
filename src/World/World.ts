/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { WobReferenceException, WobOperationException } from "./Exceptions";
import { Wob, WobProperties } from "./Wob";
import * as Strings from "../Utils/Strings";
import { Database } from "./Database";
import { ImportExport } from "./ImportExport";
import { Timers } from "./Timers";

// Zaa Warudo
export class World {
	private _nextId: number;
	private _nextIdDirty: boolean;
	private _wobCache: Map<number, Wob>;
	private _db: Database;
	private _callOnLoads: boolean;
	private _timers: Timers;

	constructor(database: Database, callOnLoads: boolean) {
		// This is the default nextId. We don't set it to dirty because in the case
		// where the database hasn't been created yet, we will write it out after the first
		// wob create anyway; and if it has been created, we don't want to accidentally overwrite it.
		this._nextId = 1;
		this._nextIdDirty = false;

		this._wobCache = new Map<number, Wob>();
		this._db = database;
		this._callOnLoads = callOnLoads;

		this._timers = new Timers();

		setTimeout(() => this.commitTimeout(), 5*1000);
	}

	public async createDefault(basePath: string): Promise<void> {
		if (await this._db.exists(1)) {
			console.log("Skipping default world creation; already exists");
			let nextidstr = await this._db.readMeta("nextid");
			if (nextidstr)
				this._nextId = parseInt(nextidstr, 10);
			return;
		}

		await ImportExport.Import(this, basePath, this._callOnLoads);
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

		if (this._callOnLoads)
			await wob.callOnLoad(this);

		await this._db.createWob(wob);

		return wob;
	}

	// Returns the ID of the next object we would create. This is intended mainly
	// for use by the exporter so that it can enumerate all objects for export.
	public get nextId(): number {
		return this._nextId;
	}

	public async getWob(id: number): Promise<Wob> {
		if (!this._wobCache.has(id)) {
			let loaded = await this._db.loadWob(id);
			if (loaded) {
				this._wobCache.set(id, loaded);
				await loaded.callOnLoad(this);
			}
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
		let results = [...this._wobCache.values()].filter(w => {
			let prop = w.getProperty(WobProperties.GlobalId);
			if (!prop)
				return false;

			return Strings.caseIn(prop.value, ids);
		});
		results.forEach(w => resultMap.set(w.id, true));

		// Look for results in the database as well.
		let dbresults = await this._db.loadWobsByGlobalId(ids);
		await Promise.all(dbresults.map(async w => {
			if (!resultMap.has(w.id)) {
				results.push(w);
				resultMap.set(w.id, true);
				this._wobCache.set(w.id, w);
				if (this._callOnLoads)
					await w.callOnLoad(this);
			}
		}));

		return results;
	}

	public async getWobByGlobalId(id: string): Promise<Wob> {
		let wobs = await this.getWobsByGlobalId([id]);
		if (wobs.length)
			return wobs[0];
		else
			return null;
	}

	// FIXME: This doesn't work for complex objects - need a JSON comparator.
	public async getWobsByPropertyMatch(property: string, value: any): Promise<Wob[]> {
		// Start off getting the in-memory results.
		let resultMap = new Map<number, boolean>();
		let results = [...this._wobCache.values()].filter((w) => w.getProperty(property) && w.getProperty(property).value === value);
		results.forEach(w => resultMap.set(w.id, true));

		// Look for results in the database as well.
		let dbresults = await this._db.loadWobsByPropertyMatch(property, value);
		await Promise.all(dbresults.map(async w => {
			if (!resultMap.has(w.id)) {
				results.push(w);
				resultMap.set(w.id, true);
				this._wobCache.set(w.id, w);
				if (this._callOnLoads)
					await w.callOnLoad(this);
			}
		}));

		return results;
	}

	public async moveWob(id: number, to: number) : Promise<void> {
		let wob = await this.getWob(id);
		if (!wob)
			throw new WobOperationException("Couldn't find source wob", [id]);

		let container = await this.getWob(wob.container);
		if (container) {
			// Remove it from the original container.
			container.removeContent(id);
		}

		wob.container = to;

		container = await this.getWob(to);
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

	public get timers(): Timers {
		return this._timers;
	}
}
