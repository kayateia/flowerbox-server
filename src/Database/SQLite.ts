/*
	LifeStream - Instant Photo Sharing
	Copyright (C) 2014-2016 Kayateia and Dove

	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
 */

import { IDriver, ICallback } from "./AccessLayer";
import * as fs from "fs";

let sqlite3 = require("sqlite3").verbose();

export interface ISQLiteConfig {
	sqliteFile: string;
	sqliteSchema: string;
}

export class SQLite implements IDriver {
	private _checkedExists: boolean;
	private _verbose: boolean;
	private _config: ISQLiteConfig;

	constructor(config: ISQLiteConfig) {
		this._checkedExists = false;
		this._verbose = true;
		this._config = config;
	}

	public connect(callback: ICallback): void {
		let db = new sqlite3.Database(this._config.sqliteFile);

		if (!this._checkedExists) {
			this._checkedExists = true;
			db.get("select * from meta", (err: any, row: any[]) => {
				if (!row) {
					console.error("Database is not created; please do so and try again.");
				} else
					callback(null, db);
			});
		} else
			callback(null, db);
	}

	public select(db: any, statement: string, args: any[], callback: ICallback) {
		db.all(statement, args, callback);
	}

	public run(db: any, statement: string, args: any[], callback: ICallback) {
		// This must be a function and not an arrow function, to receive 'this'
		// from the SQL driver.
		db.run(statement, args, function(err: any) {
			if (err)
				return callback(err);
			else
				return callback(null, this.lastID);
		});
	}

	public close(db: any): void {
		db.close();
	}

	public getTransactStartSql(): string {
		return "begin immediate transaction";
	}
}
