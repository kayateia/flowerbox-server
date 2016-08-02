/*
	LifeStream - Instant Photo Sharing
	Copyright (C) 2014-2016 Dove

	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
 */

import { IDriver, ICallback } from "./AccessLayer";

let mysql = require("mysql");

export interface IMySQLConfig {
	mysqlHost: string;
	mysqlUser: string;
	mysqlPassword: string;
	mysqlDatabase: string;
}

export class MySQL implements IDriver {
	private _config: IMySQLConfig;
	private _pool: any;
	private _checkedExists: boolean;

	constructor(config: IMySQLConfig) {
		this._config = config;
		this._pool = null;
		this._checkedExists = false;
	}

	// Initialize the database if it's not already been initialized. Callback is
	// a standard err function.
	private dbInit(db: any, callback: ICallback) {
		db.query("select * from meta", function(err, results) {
			if (err || !results || !results.length) {
				console.error("Database can't be checked for initialization or has not been initialized.",
					"Please do so and try again.", err);
			}

			return callback();
		});
	}

	// Executes a database statement on a pooled connection. All commands executed
	// on the connection are not guaranteed to run instantly, but are guaranteed to run
	// sequentially and serially.
	public connect(callback: ICallback) {
		if (!this._pool) {
			this._pool = mysql.createPool({
				connectionLimit: 10,
				host: this._config.mysqlHost,
				user: this._config.mysqlUser,
				password: this._config.mysqlPassword,
				database: this._config.mysqlDatabase,
				multipleStatements: true
			});
		}

		this._pool.getConnection((err: any, connection: any) => {
			if (err) {
				callback(err);
			} else {
				if (!this._checkedExists) {
					this.dbInit(connection, (err: any) => {
						if (err)
							return callback(err);
						else {
							this._checkedExists = true;
							return callback(null, connection);
						}
					});
				} else
					return callback(null, connection);
			}
		});
	}

	public select(db: any, statement: string, args: any[], callback: ICallback): void {
		db.query(statement, args, callback);
	}

	public run(db: any, statement: string, args: any[], callback: ICallback): void {
		db.query(statement, args, (err: any, results: any) => {
			if (err)
				return callback(err);
			else
				return callback(null, results.insertId);
		});
	}

	public close(db: any) {
		db.release();
	}

	public getTransactStartSql(): string {
		return "start transaction";
	}
}
