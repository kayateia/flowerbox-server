/*
	Flowerbox
	Copyright (C) 2016 Dove
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

///<reference path="../../../typings/globals/express/index.d.ts" />

import { RouterBase } from "./RouterBase";
import { ModelBase } from "../Model/ModelBase";
import { Token } from "../Model/Token";
import { LoginResult } from "../Model/Login";
import * as World from "../../World/All";
import * as Crypto from "../../Crypto/Crypto";
import * as Wob from "../Model/Wob";
import { Security } from "../Security";
import { WobCommon } from "../WobCommon";

export class UserRouter extends RouterBase {
	constructor() {
		super();

		// Log in to the server and get back a bearer token.
		this.router.post("/login/:user", (rq,rs,n) => { this.asyncWrapper(rq,rs,n,()=>this.login(rq,rs,n)); });

		// Return info about the user's wob.
		this.router.get("/player-info", (rq,rs,n) => { this.asyncWrapper(rq,rs,n,()=>this.playerInfo(rq,rs,n)); });
	}

	public async login(req, res, next): Promise<ModelBase> {
		let userId = req.params.user;
		let password = Crypto.hash(req.body.password);
		console.log(password);

		let players = await this.world.getWobsByGlobalId([userId]);
		if (players.length !== 1)
			return new ModelBase(false, "Username or password was invalid.");
		let player = players[0];

		let pwhash = player.getProperty(World.WobProperties.PasswordHash);
		if (!pwhash || pwhash != password)
			return new ModelBase(false, "Username or password was invalid.");

		let tokenContents = new Token(userId, player.id, password);
		let token = Security.CreateToken(tokenContents);
		res.json(new LoginResult(token));

		return null;
	}

	public async playerInfo(req, res, next): Promise<ModelBase> {
		let tokenInfo = Security.VerifyToken(req, res);
		if (!tokenInfo)
			return null;

		let wob = await this.world.getWob(tokenInfo.wobId);
		if (!wob)
			return new ModelBase(false, "Can't find user wob");

		res.json(await WobCommon.GetInfo(wob, this.world));
		return null;
	}
}

export let userRouter = new UserRouter();
