/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/
"use strict";
///<reference path="../typings/globals/node/index.d.ts" />

import { Wob, WobProperties } from "./World/Wob";
import { Verb } from "./World/Verb";
import { World } from "./World/World";
import * as Execution from "./World/Execution";
import * as InputParser from "./World/InputParser";
import * as readline from "readline";
import { InitWorld } from "./InitWorld";

let world = new World();

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

async function tester() {
	// Create a small in-world "game world" to test with.
	await world.createDefault(InitWorld);

	let player = (await world.getWobsByPropertyMatch(WobProperties.Name, "Kayateia"))[0];
	(function nextLine() {
		rl.question('> ', (answer) => {
			InputParser.parseInput(answer, player, world)
				.then((match) => {
					Execution.executeResult(match, player, world)
						.then(() => {
							// Look for new output on the player.
							let output = player.getProperty("hearlog");
							if (output && output.length) {
								output.forEach(l => {
									let arr = [];
									l.forEach(obj => {
										if (obj instanceof Execution.NotationWrapper) {
											arr.push(obj.notation.text);
											if (obj.notation.value instanceof Wob) {
												arr.push("(#" + obj.notation.value.id + ")");
											}
										} else
											arr.push(obj.toString());
									});
									console.log(...arr);
								});
								player.setProperty("hearlog", []);
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
