/*
	Flowerbox
	Copyright (C) 2016 Dove, Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

///<reference path="../../../typings/globals/express/index.d.ts" />

import { RouterBase } from "./RouterBase";
import { ModelBase } from "../Model/ModelBase";
import { HearLog, HearLogItem, WobRef } from "../Model/HearLog";
import * as World from "../../World/All";
import * as CorePromises from "../../Async/CorePromises";
import * as Petal from "../../Petal/All";

export class TerminalRouter extends RouterBase {
	constructor() {
		super();

		// Execute a command on the server, as the user.
		this.router.get("/command/:command", (rq,rs,n) => { this.asyncWrapper(rq,rs,n,()=>this.command(rq,rs,n)); });

		// Get new "hear log" output from the user's wob.
		// This may have a "since" parameter that only shows things since the specified time.
		this.router.get("/new-output", (rq,rs,n) => { this.asyncWrapper(rq,rs,n,()=>this.newOutput(rq,rs,n)); });
	}

	public async command(req, res, next): Promise<ModelBase> {
		let playerAny = await this.getUserWob();
		if (playerAny instanceof ModelBase)
			return playerAny;
		let player: World.Wob = playerAny;

		let match = await World.parseInput(req.params.command, player, this.world);
		await World.executeResult(match, player, this.world);

		res.json(new ModelBase(true));

		return null;
	}

	public async newOutput(req, res, next): Promise<ModelBase> {
		// Query parameters.
		let since = req.query.since;
		if (!since)
			since = 0;

		let playerAny = await this.getUserWob();
		if (playerAny instanceof ModelBase)
			return playerAny;
		let player: World.Wob = playerAny;

		// If we don't have new output immediately available, then turn it into a long-wait push request.
		let output: any[][] = this.newerThan(Petal.ObjectWrapper.Unwrap(player.getProperty(World.WobProperties.HearLog)), since);
		let count = 10000 / 500;
		while (count-- && !output.length) {
			await CorePromises.delay(500);
			output = this.newerThan(Petal.ObjectWrapper.Unwrap(player.getProperty(World.WobProperties.HearLog)), since);
			if (output.length)
				break;
		}

		if (!output.length) {
			res.json(new HearLog([]));
			return null;
		}

		// The value we got should be an array of arrays. The first element of each sub-array
		// will be a timestamp; everything after that is stuff to be displayed to the user.
		// Because we can end up passing back rich objects along with regular text, we need
		// to do some sanitizing of the output before sending it back.
		let logs: HearLogItem[] = [];
		output.forEach(l => {
			logs.push(new HearLogItem(l[0], l.slice(1).map(i => {
				if (i instanceof World.NotationWrapper) {
					let value = i.notation.value;
					if (value instanceof World.Wob)
						return new WobRef(i.notation.text, i.notation.value.id);
					else
						return i.notation.text;
				} else
					return i;
			})));
		});

		res.json(new HearLog(logs));
	}

	// Helper for newOutput - returns any log lines that are newer than the specified cutoff time.
	private newerThan(output: any[][], since: number): any[][] {
		if (!output || !output.length)
			return [];

		let rv = [];
		for (let o of output) {
			if (o[0] >= since)
				rv.push(o);
		}

		return rv;
	}

	// Returns the player's Wob or a ModelBase with an error message.
	private async getUserWob(): Promise<any /*World.Wob | ModelBase*/> {
		let players = await this.world.getWobsByGlobalId(["Kayateia"]);
		if (players.length !== 1)
			return new ModelBase(false, "No such player exists");
		return players[0];
	}
}

export let terminalRouter = new TerminalRouter();
