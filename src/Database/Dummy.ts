/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
 */

import { IDriver, ICallback } from "./AccessLayer";

// Implements a dummy driver that always returns no rows from selects and prints everything.
export class Dummy implements IDriver {
	// Make a connection to the database and call the callback with it (or an error object).
	public connect(callback: (err: any, connection: any) => void) {
		callback(null, null);
	}

	// Do a SQL select with the specified args (an array), and call the callback with an error
	// object or with rows of data.
	public select(connection: any, statement: string, args: any[], callback:(err: any, rows: any[]) => void) {
		console.log(statement, args);
		callback(null, []);
	}

	// Do a SQL execute with the specified args (an array), and call the callback with an error
	// object or with an ID of the last inserted row (if applicable).
	public run(connection: any, statement: string, args: any[], callback:(err: any, insertId: number) => void) {
		console.log(statement, args);
		callback(null, 0);
	}

	// Returns a string that represents a transaction beginning statement.
	// Really lame, guys. Lame.
	public getTransactStartSql(): string {
		return "begin transation;";
	}

	// Closes the database connection.
	public close(connection: any) {
	}
}
