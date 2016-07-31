/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { Wob, WobProperties } from "./Wob";
import * as Petal from "../Petal/Petal";
import * as DB from "../Database/All";

export class Database {
	public verbose: boolean;
	private _sal: DB.AccessLayer;
	private _conn: any;

	constructor(sal: DB.AccessLayer) {
		this._sal = sal;

		// We keep one persistent connection in case we're using an in-memory driver.
		this.connect()
			.then(c => this._conn = c)
			.catch(e => console.log(e));
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

			let wob = new Wob(id);
			wob.container = wobrows[0].container;
			wob.base = wobrows[0].base;
			wob.verbCode = wobrows[0].verbCode;

			for (let p of props)
				wob.setProperty(p.key, p.value);

			let contained = await this._sal.select(conn, "select wobid from wobs where container=?", [id]);
			wob.contents.push(...contained.map(i => i.wobid));

			wob.dirty = false;

			return wob;
		} finally {
			this.close(conn);
		}
	}

	public async loadWobsByGlobalId(ids): Promise<Wob[]> {
		let conn = await this.connect();

		try {
			let instr = ids.map(i => "?").join(",");
			let wobs = await this._sal.select(conn, "select wobs.wobid from wobs " +
												"inner join properties on wobs.wobid=properties.wobid " +
												"where properties.key=? and properties.value in (" + instr + ")",
												[ WobProperties.GlobalId, ...ids ]);

			this.close(conn); conn = null;
			return await Promise.all(wobs.map(w => this.loadWob(w.wobid)));
		} finally {
			if (conn)
				this.close(conn);
		}
	}

	public async loadWobsByPropertyMatch(key: string, value: string): Promise<Wob[]> {
		let conn = await this.connect();

		try {
			let wobs = await this._sal.select(conn, "select wobs.wobid from wobs " +
												"inner join properties on wobs.wobid=properties.wobid " +
												"where properties.key=? and properties.value =?",
												[ key, value ]);

			this.close(conn); conn = null;
			return await Promise.all(wobs.map(w => this.loadWob(w.wobid)));
		} finally {
			if (conn)
				this.close(conn);
		}
	}

	public async readMeta(key: string): Promise<string> {
		let conn = await this.connect();
		try {
			let rows = await this._sal.select(conn, "select * from meta where key=?", [key]);
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
			await this._sal.run(conn, "delete from meta where key=?", [key]);
			await this._sal.run(conn, "insert into meta (key,value) values (?,?)", [key, value]);
		} finally {
			this.close(conn);
		}
	}

	public async exists(id: number): Promise<boolean> {
		let conn = await this.connect();
		console.log("conn is", conn);
		try {
			let wobrows = await this._sal.select(conn, "select id from wobs where id=?", [id]);
			console.log("wobrows is", wobrows);
			return wobrows && wobrows.length > 0;
		} finally {
			console.log("closing", conn);
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
			await this._sal.transact(this._conn, async () => {
				await this._sal.run(this._conn,"update wobs set container=?, base=?, verbCode=? where wobid=?",
					[wob.container, wob.base, wob.verbCode, wob.id]);

				await this._sal.run(this._conn, "delete from properties where wobid=?", [wob.id]);

				await this.insertProperties(this._conn, wob);
			});
		} finally {
			this.close(conn);
		}
	}

	private async insertProperties(conn: any, wob: Wob): Promise<any> {
		for (let p of wob.getPropertyNames()) {
			await this._sal.run(conn, "insert into properties (wobid, key, value) values (?, ?, ?)",
				[wob.id, p, wob.getProperty(p)]);
		}
	}

	public async deleteWob(id: number): Promise<void> {
		let conn = await this.connect();
		try {
			await this._sal.transact(this._conn, async () => {
				await this._sal.run(this._conn, "delete from properties where wobid=?", [id]);
				await this._sal.run(this._conn, "delete from wobs where id=?", [id]);
			});
		} finally {
			this.close(conn);
		}
	}

	public async createWob(wob: Wob): Promise<void> {
		let conn = await this.connect();
		try {
			await this._sal.run(conn, "insert into wobs (wobid, container, base, verbCode) values (?,?,?,?)",
				[wob.id, wob.container, wob.base, wob.verbCode]);

			await this.insertProperties(conn, wob);
		} finally {
			this.close(conn);
		}
	}
}
