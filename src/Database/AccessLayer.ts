/*
	LifeStream - Instant Photo Sharing
	Copyright (C) 2014-2016 Kayateia, Dove, and Deciare

	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
 */

// Drivers will implement this interface. The driver's constructor should connect to the database.
export interface IDriver {
	// Make a connection to the database and call the callback with it (or an error object).
	connect(callback: (err: any, connection: any) => void);

	// Do a SQL select with the specified args (an array), and call the callback with an error
	// object or with rows of data.
	select(connection: any, statement: string, args: any[], callback:(err: any, rows: any[]) => void);

	// Do a SQL execute with the specified args (an array), and call the callback with an error
	// object or with an ID of the last inserted row (if applicable).
	run(connection: any, statement: string, args: any[], callback:(err: any, insertId: number) => void);

	// Returns a string that represents a transaction beginning statement.
	// Really lame, guys. Lame.
	getTransactStartSql(): string;

	// Closes the database connection.
	close(connection: any);
}

export interface ICallback {
	(error?, result?): void
}

export interface IAccessLayerConfig {
	databaseVerbose: boolean;
}

export class AccessLayer {
	private _driver: IDriver;
	private _verbose: boolean;

	constructor(config: IAccessLayerConfig, driver: IDriver) {
		this._driver = driver;
		this._verbose = config.databaseVerbose;
	}

	// Returns a promise that evaluates to a database connection, ready for statements.
	public connect(): Promise<any> {
		return new Promise((success: ICallback, fail: ICallback) => {
			this._driver.connect(function(err: any, conn: any) {
				//if (this._verbose)
				//	console.log("Connect -> (",err,",",conn,")");
				if (err)
					fail(err);
				else
					success(conn);
			});
		});
	}

	// Returns a promise that evaluates to a select operation on the database.
	public select(conn: any, statement: string, args: any[]): Promise<any[]> {
		return new Promise((success: ICallback, fail: ICallback) => {
			if (this._verbose)
				console.log("select: (",statement,",",args,")");
			this._driver.select(conn, statement, args, (err: any, rows: any[]) => {
				if (this._verbose)
					console.log("select results: (",err,",",rows,")");
				if (err)
					fail(err);
				else
					success(rows);
			});
		});
	}

	// Returns a promise that evaluates to a run operation on the database. Returns
	// the insert ID, if applicable.
	public run(conn: any, statement: string, args: any[]): Promise<number> {
		return new Promise((success: ICallback, fail: ICallback) => {
			if (this._verbose)
				console.log("run: (",statement,",",args,")");
			this._driver.run(conn, statement, args, (err: any, insertId: number) => {
				if (this._verbose)
					console.log("run results: (",err,",",insertId,")");
				if (err)
					fail(err);
				else
					success(insertId);
			});
		});
	}

	// Returns a promise that evaluates to a run() operation wrapped in a transaction.
	// If any of the promises fails, the whole transaction will be rolled back; otherwise
	// it will be committed.
	public async transact(conn: any, workCallback: () => Promise<void>): Promise<void> {
		if (this._verbose)
			console.log("transact: begin");

		await this.run(conn, this._driver.getTransactStartSql(), []);
		try {
			await workCallback();

			if (this._verbose)
				console.log("transact: commit");
			await this.run(conn, "commit", []);
		} catch (err) {
			if (this._verbose)
				console.log("transact: rollback");
			await this.run(conn, "rollback", []);
			throw err;
		}
	}

	public getTransactStartSql() {
		return this._driver.getTransactStartSql();
	}

	public close(conn) {
		this._driver.close(conn);
	}
}
