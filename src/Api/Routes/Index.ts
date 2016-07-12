/*
	Flowerbox
	Copyright (C) 2016 Dove
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

///<reference path="../../../typings/globals/express/index.d.ts" />

import { RouterBase } from "./RouterBase";

export class IndexRouter extends RouterBase {
	constructor() {
		super();

		this.router.get("/", (req, res, next) => {
			return res.json({ success: true });
		});
	}
}

export let indexRouter = new IndexRouter();
