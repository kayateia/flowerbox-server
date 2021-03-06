/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/
"use strict";
///<reference path="../typings/globals/node/index.d.ts" />

import * as World from "./World/All";
import * as readline from "readline";
import * as Petal from "./Petal/All";
import * as Database from "./Database/All";

let config = require("../config");

let sal = new Database.AccessLayer(config);
let world = new World.World(new World.Database(sal), true);

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

async function tester() {
	// Create a small in-world "game world" to test with.
	await world.createDefault("./notes/init");

	let player = (await world.getWobsByGlobalId(["kayateia"]))[0];
	(function nextLine() {
		rl.question('> ', (answer) => {
			let admin = false;
			if (answer[0] === "#") {
				admin = true;
				answer = answer.substr(1);
			}
			World.parseInput(answer, player, world)
				.then((match) => {
					World.executeResult(match, player, admin, world)
						.then(() => {
							// Look for new output on the player.
							let output: any = player.getProperty(World.WobProperties.EventStream);
							if (output)
								output = Petal.ObjectWrapper.Unwrap(output.value);
							if (output && output.length) {
								output.forEach(l => {
									let arr = [];
									arr.push(l.time, " -" + l.type[0] + "- ");
									l.body.forEach(obj => {
										if (obj instanceof World.NotationWrapper) {
											arr.push(obj.notation.text);
											if (obj.notation.value instanceof World.WobRef) {
												arr.push(" (#" + obj.notation.value.id + ")");
											}
											if (obj.notation.value instanceof World.PropertyRef) {
												arr.push(" [" + obj.notation.value.wobid + "/" + obj.notation.value.property + "]");
											}
										} else
											arr.push(obj.toString());
									});
									console.log(arr.join(""));
								});
								player.setPropertyKeepingPerms(World.WobProperties.EventStream, null);
							}
							nextLine();
						})
						.catch((e) => {
							console.log(e, e.stack);
							nextLine();
						});
				})
				.catch((e) => {
					console.log(e, e.stack);
					nextLine();
				});
		});
	})();
}

tester()
	.catch(err => {
		console.log(err, err.stack);
	});
