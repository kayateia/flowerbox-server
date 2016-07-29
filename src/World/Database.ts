/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { Wob } from "./Wob";
import * as Petal from "../Petal/Petal";

export class Database {
	public verbose: boolean;

	constructor() {
		this.verbose = false;
	}

	public async loadWob(id: number): Promise<Wob> {
		if (this.verbose) {
			console.log("select * from wobs wob=", id);
			console.log("select * from properties where wob=", id);
		}
		return new Wob(id);
	}

	public async updateWob(wob: Wob): Promise<void> {
		if (this.verbose) {
			console.log("update wobs wob", wob.id, "container", wob.container, "base", wob.base, "verbcode", wob.verbCode);
			console.log("delete from properties where wob=", wob.id);
			for (let p of wob.getPropertyNames()) {
				console.log("insert into properties wob", wob.id, "name", p, "value", Petal.ObjectWrapper.Unwrap(wob.getProperty(p)));
			}
		}
	}

	public async deleteWob(id: number): Promise<void> {
		if (this.verbose) {
			console.log("delete from properties where wob=", id);
			console.log("delete from wobs where wob=", id);
		}
	}

	public async createWob(wob: Wob): Promise<void> {
		if (this.verbose) {
			console.log("insert into wobs wob", wob.id, "container", wob.container, "base", wob.base, "verbcode", wob.verbCode);
			for (let p of wob.getPropertyNames()) {
				console.log("insert into properties wob", wob.id, "name", p, "value", Petal.ObjectWrapper.Unwrap(wob.getProperty(p)));
			}
		}
	}
}
