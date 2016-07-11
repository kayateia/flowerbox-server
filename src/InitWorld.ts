import { WobProperties } from "./World/Wob";

let $parse: any;
let $: any;

export let InitWorld = [
	// #1
	{
		properties: {
			"name": "Za Waarudo",
			"globalid": "world",
			"desc": "This is an endless void existing outside of all other reality."
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
				code: function() {
					var target = this;
					$.log("looking at", this.name);
					$.log(this.desc);
					/*var target;
					if ($parse.direct)
						target = $parse.direct;
					else if ($parse.indirect)
						target = $parse.indirect;
					else {
						$.log("Don't know what you're looking at!");
						return;
					}
					$.log("looking at", target.name);
					$.log(target.desc); */
				}
			},
			test: {
				sigs: [ "test self" ],
				code: function() {
					var root = $.get(1);
					$.log("found root", root.name);
					$.log("calling test2");
					var t2r = root.test2(10);
					$.log("test2 returned",t2r);
				}
			},
			test2: {
				sigs: [ "test2 self" ],
				code: function(a) {
					$.log("test2 was called with",a);
					return 5;
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
				code: function() {
					var target = this;
					$.log("looking at", target.name);
					$.log(target.desc);
				}
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
