import { WobProperties } from "./World/Wob";

let $parse: any;
let $: any;
let map: any;
let filter: any;
let caller: any;

export let InitWorld = [
	// #1
	{
		properties: {
			"name": "Za Waarudo",
			"globalid": "world",
			"desc": "This is an endless void existing outside of all other reality."
				+ " When you stare into the void, the void stares back at you..."
		},
		verbs: {
			$command: {
				code: function() {
					var text = $parse.text;
					if (text.startsWith("say ")) {
						$.log("Saying", text.substr("say ".length));
						return true;
					} else if (text.startsWith("create ")) {
						var name = text.substr("create ".length);
						var newWob = $.create(caller.location);
						newWob.name = name;
						$.log("Poof!", name, "(#" + newWob.id + ") was created.");
						return true;
					} else
						return false;
				}
			},
			$sayinto: {
				code: function(into, what) {
					for (var o in into.contents) {
						if (o.$hear)
							o.$hear(what);
					}
				}
			}
			look: {
				sigs: [ "look none at self", "look self" ],
				code: function(target) {
					if (!$parse.player.$hear)
						return;

					if (!target)
						target = this;

					$parse.player.$hear([$.notate(target.name, target)]);
					$parse.player.$hear([target.desc]);
					$parse.player.$hear([]);

					var contents = target.contents;
					if (contents.length) {
						var arr = ["Here:"];
						var names = map(contents, function(w) {
							arr.push($.notate(w.name, w));
						});
						$parse.player.$hear(arr);
					}
				}
			},
			maze: {
				sigs: [ "maze" ],
				code: function() {
					function rand(min: number, max: number): number {
						return Math.floor(Math.random() * (max - min)) + min;
					}

					var xsize = 8, ysize = 8;
					var grid = [];
					for (var y=0; y<ysize; ++y) {
						var r = [];
						grid.push(r);
						for (var x=0; x<xsize; ++x)
							r.push("#");
					}

					var checks = [ [-1, 0], [1, 0], [0, -1], [0, 1] ];

					function next(curx, cury, first) {
						// Unblock the current space.
						if (first)
							grid[cury][curx] = "+";
						else
							grid[cury][curx] = " ";

						// Pick a random direction that is not:
						// - Outside the map
						// - Behind an already opened wall.
						var dir = rand(0, 4);
						var dirarr = [];
						for (var i=0; i<4; ++i) {
							dirarr.push(dir);
							dir = (dir + 1) % 4;
						}
						for (var d in dirarr) {
							var vx = 0, vy = 0;
							switch (d) {
								case 0: // up
									vy = -1;
									break;
								case 1: // right
									vx = 1;
									break;
								case 2: // down
									vy = 1;
									break;
								case 3: // left
									vx = -1;
									break;
							}

							// Do the coordinates meet the requirements?
							var nx = curx + vx, ny = cury + vy;
							if (nx < 1 || ny < 1 || nx >= (xsize-1) || ny >= (ysize-1)) {
								if (nx === 0 || ny === 0 || nx === (xsize-1) || ny === (ysize-1)) {
									var makeExit = rand(0, 100);
									if (makeExit < 30) {
										// Look for nearby exits and don't put two next to each other.
										var skipExit = false;
										for (var check in checks) {
											var cx = nx + check[0];
											var cy = ny + check[1];
											if (cx >= 0 && cy >= 0 && cx <= (xsize-1) && cy <= (ysize-1)) {
												if (grid[cy][cx] === "+")
													skipExit = true;
											}
										}
										if (!skipExit)
											grid[ny][nx] = "+";
									}
								}
								continue;
							}

							if (grid[ny][nx] === " ")
								continue;
							var borked = false;
							if (rand(0, 100) >= 3) {
								for (var check in checks) {
									var px = check[0];
									var py = check[1];
									if ( !((ny+py) === cury && (nx+px) === curx) && grid[ny+py][nx+px] === " ") {
										borked = true;
									}
								}
							}

							if (!borked) {
								next(nx, ny, false);
							}
						}
					}

					var x1 = 3;
					var y1 = 0;
					next(x1, y1, true);

					$.log("Finished with maze generation");

					for (var y=0; y<ysize; ++y) {
						var o = "";
						for (var x=0; x<xsize; ++x) {
							o = o + grid[y][x];
						}
						$.log(o);
					}
				}
			}
		}
	},

	// #2
	{
		properties: {
			"name": "Player",
			"desc": "A blank shape that says MY BURAZAA on it."
		},
		container: 1,
		base: 1,
		verbs: {
			poke: {
				sigs: [ "poke self" ],
				code: function() {
					$.log("poked!");
				}
			},
			$hear: {
				// 'what' should be an array of objects to be stored for later retrieval by a client.
				code: function(what) {
					if (!this.hearlog)
						this.hearlog = [];
					what = what.slice(0);
					what.unshift($.timestamp());
					this.hearlog.push(what);
				}
			}
		}
	},

	// #3
	{
		properties: {
			"name": "Room",
			"desc": "A featureless room."
		},
		container: 1,
		base: 1,
		verbs: {
			look: {
				sigs: [ "look" ],
				code: "function() {\
					#1.look(this);\
				}"
			}
		}
	},

	// #4
	{
		properties: {
			"name": "Kayateia",
			"desc": "A hacker girl stares at you from a hooded gaze..."
		},
		container: 1,
		base: 2,
		verbs: {
		}
	},

	// #5
	{
		properties: {
			"name": "Generic Exit",
			"desc": "A door that doesn't seem to lead anywhere."
		},
		container: 1,
		base: 1,
		verbs: {
			go: {
				sigs: [ "go self", "go none in self", "go none at self", "go none through self" ],
				code: function() {
					var target = $.get(this.target);
					$.log("You go into", target.name);
					$.move(caller, target);
					target.look();
				}
			}
		}
	},

	{
		properties: {
			"name": "Door",
			"desc": "This door leads to the room.",
			"target": 3
		},
		container: 1,
		base: 5
	},

	{
		properties: {
			"name": "Hammer",
			"desc": "A silly looking hammer."
		},
		container: 1,
		base: 1,
		verbs: {
			throw: {
				sigs: [ "throw self at any" ],
				code: function() {}
			},
			use: {
				sigs: [ "use self on any" ],
				code: function() {}
			}
		}
	},

	{
		properties: {
			"name": "Teacup",
			"desc": "A silly looking teacup."
		},
		container: 1,
		base: 1,
		verbs: {
			drink: {
				sigs: [ "drink none from self" ],
				code: function() {}
			},
			drop: {
				sigs: [ "drop self" ],
				code: function() {}
			}
		}
	},

	{
		properties: {
			"name": "Dog who was put in a kennel",
			"desc": "A very sad dog."
		},
		container: 1,
		base: 1,
		verbs: {
			release: {
				sigs: [ "release self" ],
				code: function() {
					$.log("Thank you for releasing me,", $parse.player.name, "!");
				}
			},
			put: {
				sigs: [ "put self in any" ],
				code: function() {
					$.log("Noooes,", $parse.player.name, ", why did you put me in the", $parse.indirect.name, "?");
				}
			}
		}
	},

	{
		properties: {
			"name": "Human person",
			"desc": "Stand in the place where you are.",
			"globalid": "human"
		},
		container: 3,
		base: 1,
		verbs: {
			pet: {
				sigs: [ "pet self" ],
				code: function() {
					$.log("Ahhh!!");
				}
			}
		}
	}
];
