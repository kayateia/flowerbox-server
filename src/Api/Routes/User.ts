/*
	Flowerbox
	Copyright (C) 2016 Dove
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

///<reference path="../../../typings/globals/express/index.d.ts" />

import { RouterBase } from "./RouterBase";
import * as World from "../../World/All";

export class UserRouter extends RouterBase {
	constructor() {
		super();

		this.router.get("/login", (req, res, next) => { this.login(req, res, next); });
	}

	public login(req, res, next): void {
		return res.json({ success: true });
	}
}

export let userRouter = new UserRouter();
