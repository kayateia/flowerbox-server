/*
	Flowerbox
	Copyright (C) 2016 Dove
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

///<reference path="../../typings/globals/express/index.d.ts" />

import * as express from "express";
import * as World from "../World/All";
import { InitWorld } from "../InitWorld";
import { indexRouter } from "./Routes/Index";
import { terminalRouter } from "./Routes/Terminal";
import { userRouter } from "./Routes/User";
import { worldRouter } from "./Routes/World";

const bodyParser = require("body-parser");

export let app = express();
export let world = new World.World();

async function worldStartup() {
	// Create a small in-world "game world" to test with.
	await world.createDefault(InitWorld);
	for (let r of [indexRouter, terminalRouter, userRouter, worldRouter])
		r.world = world;
}

worldStartup()
	.then(() => {
		app.use(bodyParser.json());
		app.use(bodyParser.urlencoded({ extended: false }));

		app.use("/", indexRouter.router);
		app.use("/terminal", terminalRouter.router);
		app.use("/user", userRouter.router);
		app.use("/world", worldRouter.router);

		// Catch 404 and forward to error handler.
		app.use((req, res, next) => {
			let err: any = new Error("Not Found");
			err.status = 404;
			next(err);
		});
	})
	.catch(err => {
		console.log("Can't start up world.", err);
	});