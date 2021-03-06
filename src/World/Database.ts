/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { Wob, WobProperties } from "./Wob";
import { Property } from "./Property";
import * as Petal from "../Petal/All";
import * as DB from "../Database/All";
import * as Persistence from "../Utils/Persistence";

export class Database {
	public verbose: boolean;
	private _sal: DB.AccessLayer;

	constructor(sal: DB.AccessLayer) {
		this._sal = sal;
	}

	private async connect(): Promise<void> {
		return await this._sal.connect();
	}

	private close(conn: any): void {
		this._sal.close(conn);
	}

	public async loadWob(id: number): Promise<Wob> {
		let conn = await this.connect();

		try {
			let wobrows = await this._sal.select(conn, "select * from wobs where wobid=?", [id]);
			if (!wobrows.length)
				return null;

			let props = await this._sal.select(conn, "select * from properties where wobid=?", [id]);
			let verbs = await this._sal.select(conn, "select * from verbs where wobid=?", [id]);

			let wob = new Wob(id);
			wob.container = wobrows[0].container;
			wob.base = wobrows[0].base;
			wob.owner = wobrows[0].owner;
			wob.group = wobrows[0].group;
			wob.perms = wobrows[0].perms;

			for (let p of props) {
				let json = JSON.parse(p.value);

				// We have to special case this for now.
				if (json.type === "blob") {
					let data = p.valueBlob;
					let mime: string = json.mime;
					let fn: string = json.filename;
					wob.setProperty(p.name, new Property(new Petal.PetalBlob(data, mime, fn), p.perms));
				} else {
					let unp = Persistence.unpersist(json);
					wob.setProperty(p.name, new Property(unp, p.perms));
				}
			}

			for (let v of verbs) {
				let sigs: string[] = [];
				if (v.sigs)
					sigs = JSON.parse(v.sigs);
				wob.setVerbCode(v.name, sigs, v.code);
			}

			let contained = await this._sal.select(conn, "select wobid from wobs where container=?", [id]);
			wob.contents.push(...contained.map(i => i.wobid));

			wob.dirty = false;

			return wob;
		} finally {
			this.close(conn);
		}
	}

	public async loadWobsByGlobalId(ids: string[]): Promise<Wob[]> {
		if (!ids.length)
			return [];

		let conn = await this.connect();

		try {
			let instr = ids.map(i => "?").join(",");
			let pers = ids.map(i => Persistence.persist(i));
			let json = pers.map(p => JSON.stringify(p));
			let wobs = await this._sal.select(conn, "select wobs.wobid from wobs " +
												"inner join properties on wobs.wobid=properties.wobid " +
												"where properties.name=? and properties.value in (" + instr + ")",
												[ WobProperties.GlobalId, ...json ]);

			this.close(conn); conn = null;

			// FIXME: TypeScript thinks Promise.all returns Promise<Promise<Wob>[]>. See if they've
			// fixed this later and try it again without the <any>.
			return <any>(await Promise.all(wobs.map(w => this.loadWob(w.wobid))));
		} finally {
			if (conn)
				this.close(conn);
		}
	}

	public async loadWobsByPropertyMatch(key: string, value: any): Promise<Wob[]> {
		let conn = await this.connect();

		try {
			let pers = Persistence.persist(value);
			let json = JSON.stringify(pers);
			let wobs = await this._sal.select(conn, "select wobs.wobid from wobs " +
												"inner join properties on wobs.wobid=properties.wobid " +
												"where properties.name=? and properties.value=?",
												[ key, json ]);

			this.close(conn); conn = null;

			// FIXME: TypeScript thinks Promise.all returns Promise<Promise<Wob>[]>. See if they've
			// fixed this later and try it again without the <any>.
			return <any>(await Promise.all(wobs.map(w => this.loadWob(w.wobid))));
		} finally {
			if (conn)
				this.close(conn);
		}
	}

	public async readMeta(key: string): Promise<string> {
		let conn = await this.connect();
		try {
			let rows = await this._sal.select(conn, "select * from meta where name=?", [key]);
			if (!rows || !rows.length)
				return null;
			else
				return rows[0].value;
		} finally {
			this.close(conn);
		}
	}

	public async writeMeta(key: string, value: string): Promise<void> {
		let conn = await this.connect();
		try {
			await this._sal.run(conn, "delete from meta where name=?", [key]);
			await this._sal.run(conn, "insert into meta (name,value) values (?,?)", [key, value]);
		} finally {
			this.close(conn);
		}
	}

	public async exists(id: number): Promise<boolean> {
		let conn = await this.connect();
		try {
			let wobrows = await this._sal.select(conn, "select id from wobs where wobid=?", [id]);
			return wobrows && wobrows.length > 0;
		} finally {
			this.close(conn);
		}
	}

	public async findContained(id: number): Promise<number[]> {
		let conn = await this.connect();
		try {
			return (await this._sal.select(conn, "select wobid from wobs where container=?", [id]))
				.map(r => r.wobid);
		} finally {
			this.close(conn);
		}
	}

	public async updateWob(wob: Wob): Promise<void> {
		let conn = await this.connect();
		try {
			await this._sal.transact(conn, async () => {
				await this._sal.run(conn,"update wobs set container=?, base=?, owner=?, `group`=?, perms=? where wobid=?",
					[wob.container, wob.base, wob.owner, wob.group, wob.perms, wob.id]);

				await this._sal.run(conn, "delete from properties where wobid=?", [wob.id]);
				await this._sal.run(conn, "delete from verbs where wobid=?", [wob.id]);

				await this.insertProperties(conn, wob);
				await this.insertVerbs(conn, wob);
			});
		} finally {
			this.close(conn);
		}
	}

	private async insertProperties(conn: any, wob: Wob): Promise<any> {
		for (let p of wob.getPropertyNames()) {
			let v = wob.getProperty(p);

			// We have to special case this for now.
			if (v.value instanceof Petal.PetalBlob) {
				let blob: Petal.PetalBlob = v.value;
				let json = JSON.stringify({ type: "blob", size: blob.length, mime: blob.mime, offset: 0, filename: blob.filename });
				await this._sal.run(conn, "insert into properties (wobid, name, perms, value, valueBlob) values (?, ?, ?, ?, ?)",
					[wob.id, p, v.perms, json, blob.data]);
			} else {
				let pers = Persistence.persist(wob.getProperty(p).value);
				let json = JSON.stringify(pers);
				await this._sal.run(conn, "insert into properties (wobid, name, perms, value) values (?, ?, ?, ?)",
					[wob.id, p, v.perms, json]);
			}
		}
	}

	private async insertVerbs(conn: any, wob: Wob): Promise<any> {
		for (let p of wob.getVerbNames()) {
			let v = wob.getVerb(p);

			await this._sal.run(conn, "insert into verbs (wobid, name, perms, sigs, code) values (?, ?, ?, ?, ?)",
				[wob.id, p, v.perms, JSON.stringify(v.signatureStrings), v.code]);
		}
	}

	public async deleteWob(id: number): Promise<void> {
		let conn = await this.connect();
		try {
			await this._sal.transact(conn, async () => {
				await this._sal.run(conn, "delete from properties where wobid=?", [id]);
				await this._sal.run(conn, "delete from verbs where wobid=?", [id]);
				await this._sal.run(conn, "delete from wobs where wobid=?", [id]);
			});
		} finally {
			this.close(conn);
		}
	}

	public async createWob(wob: Wob): Promise<void> {
		let conn = await this.connect();
		try {
			await this._sal.run(conn, "insert into wobs (wobid, container, base, owner, `group`, perms) values (?,?,?,?,?,?)",
				[wob.id, wob.container, wob.base, wob.owner, wob.group, wob.perms]);

			await this.insertProperties(conn, wob);
			await this.insertVerbs(conn, wob);
		} finally {
			this.close(conn);
		}
	}
}
