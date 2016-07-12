/*
	Flowerbox
	Copyright (C) 2016 Dove
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

///<reference path="../../../typings/globals/express/index.d.ts" />

import { RouterBase } from "./RouterBase";
import * as World from "../../World/All";

export class TerminalRouter extends RouterBase {
	constructor() {
		super();

		this.router.get("/command/:command", (rq,rs,n) => { this.command(rq,rs,n); });
	}

	public command(req, res, next): void {
		let ws;
		this.world.getWobs([3])
			.then(w => {
				ws = w;
				return World.parseInput(req.params.command, ws[0], this.world);
			})
			.then(match => {
				return World.executeResult(match, ws[0], this.world);
			})
			.then(() => {
				res.json({ foo: true });
			})
			.catch(err => {
				console.log(err);
			});
	}
}

export let terminalRouter = new TerminalRouter();
