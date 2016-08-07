// This defines a basic world which should be saved to a new database to start things out,
// when we actually have a database to save to. :)

module.exports = [
	// #1
	{
		properties: {
			"name": "Za Waarudo",
			"globalid": "world",
			"desc": "This is an endless void existing outside of all other reality."
				+ " When you stare into the void, the void stares back at you..."
		},
		verbs: "1-root.petal"
	},

	{
		properties: {
			"name": "Player",
			"desc": "A blank shape that says MY BURAZAA on it.",
			"globalid": "player"
		},
		container: "@world",
		base: "@world",
		verbs: "2-player.petal"
	},

	{
		properties: {
			"name": "Room",
			"desc": "A featureless room.",
			"globalid": "room"
		},
		container: "@world",
		base: "@world",
		verbs: "3-room.petal"
	},

	{
		properties: {
			"name": "Kayateia",
			"desc": "A hacker girl stares at you from a hooded gaze... or maybe just falls asleep on her keyboard.",
			"globalid": "kayateia",
			"pwhash": "c9771fdacefc80d33926f5c9db42d2b839459ca2"
		},
		propertiesBinary: {
			"image": { file: "kayateia.jpg", mime: "image/jpeg" }
		},
		container: "@world",
		base: "@player"
	},

	{
		properties: {
			"name": "Generic Exit",
			"desc": "A door that doesn't seem to lead anywhere.",
			"globalid": "exit"
		},
		container: "@world",
		base: "@world",
		verbs: "5-exit.petal"
	},

	{
		properties: {
			"name": "Empty room 1",
			"desc": "An empty room with #1 on the wall.",
			"globalid": "room1"
		},
		container: "@world",
		base: "@room"
	},

	{
		properties: {
			"name": "Empty room 2",
			"desc": "An empty room with #2 on the wall.",
			"globalid": "room2"
		},
		container: "@world",
		base: "@room"
	},

	{
		properties: {
			"name": "Deciare",
			"desc": "Wielding a pillow and a blanket, she stares at you fiercely.",
			"globalid": "deciare",
			"pwhash": "d074bdbe9ad92dedded13262944570114043a84d"
		},
		container: "@world",
		base: "@player"
	},

	{
		properties: {
			"name": "ToRoom",
			"target": "@room1"
		},
		container: "@world",
		base: "@exit"
	},

	{
		properties: {
			"name": "East",
			"target": "@room2"
		},
		container: "@room1",
		base: "@exit"
	},

	{
		properties: {
			"name": "West",
			"target": "@room1"
		},
		container: "@room2",
		base: "@exit"
	},

	{
		properties: {
			"name": "ToOne",
			"target": "@world"
		},
		container: "@room1",
		base: "@exit"
	},

	{
		properties: {
			"name": "Hammer",
			"desc": "A silly looking hammer."
		},
		container: "@world",
		base: "@world",
		verbs: "hammer.petal"
	},

	{
		properties: {
			"name": "Teacup",
			"desc": "A silly looking teacup."
		},
		container: "@world",
		base: "@world",
		verbs: "teacup.petal"
	},

	{
		properties: {
			"name": "Dog who was put in a kennel",
			"desc": "A very sad dog."
		},
		container: "@world",
		base: "@world",
		verbs: "dog.petal"
	},

	{
		properties: {
			"name": "Human person",
			"desc": "Stand in the place where you are.",
			"globalid": "human"
		},
		container: "@room2",
		base: "@world",
		verbs: "human.petal"
	}
];
