/*
	Flowerbox
	Copyright (C) 2016 Dove
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

///<reference path="../../../typings/globals/express/index.d.ts" />

import * as express from "express";
import * as World from "../../World/All";

export class RouterBase {
	constructor() {
		this._router = express.Router();
	}

	// We'd use express.Router here, but the typing is fairly useless.
	public get router(): any {
		return this._router;
	}

	public get world(): World.World {
		return this._world;
	}

	public set world(world: World.World) {
		this._world = world;
	}

	private _router: any;
	private _world: World.World;
}
