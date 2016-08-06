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

	// #2
	{
		properties: {
			"name": "Player",
			"desc": "A blank shape that says MY BURAZAA on it."
		},
		container: 1,
		base: 1,
		verbs: "2-player.petal"
	},

	// #3
	{
		properties: {
			"name": "Room",
			"desc": "A featureless room."
		},
		container: 1,
		base: 1,
		verbs: "3-room.petal"
	},

	// #4
	{
		properties: {
			"name": "Kayateia",
			"desc": "A hacker girl stares at you from a hooded gaze...",
			"globalid": "kayateia",
			"pwhash": "c9771fdacefc80d33926f5c9db42d2b839459ca2"
		},
		container: 1,
		base: 2
	},

	// #5
	{
		properties: {
			"name": "Generic Exit",
			"desc": "A door that doesn't seem to lead anywhere."
		},
		container: 1,
		base: 1,
		verbs: "5-exit.petal"
	},

	// #6
	{
		properties: {
			"name": "Empty room 1",
			"desc": "An empty room with #1 on the wall."
		},
		container: 1,
		base: 3
	},

	// #7
	{
		properties: {
			"name": "Empty room 2",
			"desc": "An empty room with #2 on the wall."
		},
		container: 1,
		base: 3,
	},

	// #8
	{
		properties: {
			"name": "Deciare",
			"desc": "Wielding a pillow and a blanket, she stares at you fiercely.",
			"globalid": "deciare",
			"pwhash": "d074bdbe9ad92dedded13262944570114043a84d"
		},
		container: 1,
		base: 2
	},

	{
		properties: {
			"name": "ToRoom",
			"target": 6
		},
		container: 1,
		base: 5
	},

	{
		properties: {
			"name": "East",
			"target": 7
		},
		container: 6,
		base: 5
	},

	{
		properties: {
			"name": "West",
			"target": 6
		},
		container: 7,
		base: 5
	},

	{
		properties: {
			"name": "ToOne",
			"target": 1
		},
		container: 6,
		base: 5
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
		verbs: "hammer.petal"
	},

	{
		properties: {
			"name": "Teacup",
			"desc": "A silly looking teacup."
		},
		container: 1,
		base: 1,
		verbs: "teacup.petal"
	},

	{
		properties: {
			"name": "Dog who was put in a kennel",
			"desc": "A very sad dog."
		},
		container: 1,
		base: 1,
		verbs: "dog.petal"
	},

	{
		properties: {
			"name": "Human person",
			"desc": "Stand in the place where you are.",
			"globalid": "human"
		},
		container: 3,
		base: 1,
		verbs: "human.petal"
	}
];
