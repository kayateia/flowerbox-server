import { WobProperties } from "./World/Wob";

let $env: any;
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
			$command: [
				function $command() {
					var text = $env.text;
					if (text.startsWith("say ")) {
						$.log("Saying", text.substr(4));
						return true;
					} else
						return false;
				}
			],
			look: [
				"//# look none at self",
				"//# look self",
				function verb_look() {
					var target;
					if ($env.direct)
						target = $env.direct;
					else if ($env.indirect)
						target = $env.indirect;
					else {
						$.log("Don't know what you're looking at!");
						return;
					}
					$.log("looking at", target.name);
					$.log(target.desc);
				}
			],
			test: [
				"//# test self",
				function verb_test() {
					var root = $.get(1);
					$.log("found root", root.name);
				}
			]
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
			poke: [
				"//# poke self",
				function verb_poke() {
					$.log("poked!");
				}
			]
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
			throw: [
				"//# throw self at any",
				function verb_throw() {}
			],
			use: [
				"//# use self on any",
				function verb_use() {}
			]
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
			drink: [
				"//# drink none from self",
				function verb_drink() {}
			],
			drop: [
				"//# drop self",
				function verb_drop() {}
			]
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
			release: [
				"//# release self",
				function verb_release() {
					$.log("Thank you for releasing me,", $env.caller.name, "!");
				}
			],
			put: [
				"//# put self in any",
				function verb_put() {
					$.log("Noooes,", $env.caller.name, ", why did you put me in the", $env.indirect.name, "?");
				}
			]
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
			pet: [
				"//# pet self",
				function verb_pet() {
					$.log("Ahhh!!");
				}
			]
		}
	}
];
