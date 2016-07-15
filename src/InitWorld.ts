import { WobProperties } from "./World/Wob";

let $parse: any;
let $: any;
let map: any;
let filter: any

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
						$.log("Saying", text.substr(4));
						return true;
					} else
						return false;
				}
			},
			look: {
				sigs: [ "look none at self", "look self" ],
				code: function(target) {
					if (!target)
						target = this;
					$.log(target.name);
					$.log(target.desc);
					$.log();

					var contents = $.contents(target);
					if (contents.length) {
						var names = map(contents, function(w) {
							return w.name;
						});
						$.log("Here: " + names.join(", "));
					}
				}
			},
			test: {
				sigs: [ "test self" ],
				code: "function() {\
					var root = $.get(1);\
					var root2 = #1;\
					var root3 = @world;\
					$.log('found root', root.name);\
					$.log('found root2', root2.name);\
					$.log('found root3', root3.name);\
					$.log('calling test2');\
					var t2r = root.test2(10);\
					$.log('test2 returned',t2r);\
				}"
			},
			test2: {
				sigs: [ "test2 self" ],
				code: function(a) {
					$.log("test2 was called with",a);
					return 5;
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
			}
		}
	},
	// #3
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
	// #4
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
	// #5
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
	// #6
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
	// #7
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
	// #8
	{
		properties: {
			"name": "Human person",
			"desc": "Stand in the place where you are.",
			"globalid": "human"
		},
		container: 4,
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
