/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/
"use strict";
///<reference path="../typings/globals/node/index.d.ts" />

import * as World from "./World/All";
import * as readline from "readline";
import * as Petal from "./Petal/Petal";

let InitWorld = require("../notes/init/InitWorld");

let world = new World.World(new World.Database());

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

async function tester() {
	// Create a small in-world "game world" to test with.
	await world.createDefault(InitWorld, "./notes/init");

	let player = (await world.getWobsByGlobalId(["kayateia"]))[0];
	(function nextLine() {
		rl.question('> ', (answer) => {
			World.parseInput(answer, player, world)
				.then((match) => {
					World.executeResult(match, player, world)
						.then(() => {
							// Look for new output on the player.
							let output = player.getProperty("hearlog");
							if (output)
								output = Petal.ObjectWrapper.Unwrap(output);
							if (output && output.length) {
								output.forEach(l => {
									let arr = [];
									l.forEach(obj => {
										if (obj instanceof World.NotationWrapper) {
											arr.push(obj.notation.text);
											if (obj.notation.value instanceof World.Wob) {
												arr.push("(#" + obj.notation.value.id + ")");
											}
										} else
											arr.push(obj.toString());
									});
									(<any>console.log)(...arr);
								});
								player.setProperty("hearlog", null);
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
