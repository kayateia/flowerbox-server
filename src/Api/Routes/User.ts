/*
	Flowerbox
	Copyright (C) 2016 Dove
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

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

		// Log in to the server and get back a bearer token. The password should be sent in the
		// body. If the "admin" query parameter is truthy, we will attempt to get an admin (sudo) token.
		this.router.post("/login/:user", (rq,rs,n) => { this.asyncWrapper(rq,rs,n,()=>this.login(rq,rs,n)); });

		// Return info about the user's wob.
		this.router.get("/player-info", (rq,rs,n) => { this.asyncWrapperLoggedIn(rq,rs,n,()=>this.playerInfo(rq,rs,n)); });
	}

	public async login(req, res, next): Promise<ModelBase> {
		let userId = req.params.user;
		let password = Crypto.hash(req.body.password);
		let admin = req.query.admin;

		console.log(password);

		let players = await this.world.getWobsByGlobalId([userId]);
		if (players.length !== 1) {
			res.status(401);
			return new ModelBase(false, "Username or password was invalid.");
		}
		let player = players[0];

		let pwhash = player.getProperty(World.WobProperties.PasswordHash);
		if (!pwhash || pwhash.value != password) {
			res.status(401);
			return new ModelBase(false, "Username or password was invalid.");
		}

		let tokenContents = new Token(userId, player.id, password, false);

		// If they requested an admin token, also see if the user's wob has an admin property.
		if (admin) {
			let adminBit = player.getProperty(World.WobProperties.Admin);
			if (!adminBit || !adminBit.value) {
				res.status(401);
				return new ModelBase(false, "User is not authorized for admin access.");
			}

			tokenContents.admin = true;
		}

		let token = Security.CreateToken(tokenContents);
		res.json(new LoginResult(token));

		return null;
	}

	public async playerInfo(req, res, next): Promise<ModelBase> {
		let wob = await this.world.getWob(this.token.wobId);
		if (!wob) {
			res.status(404);
			return new ModelBase(false, "Can't find user wob");
		}

		res.json(await WobCommon.GetInfo(wob, wob, this.token.admin, this.world));
		return null;
	}
}

export let userRouter = new UserRouter();
