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
			"desc": "A hacker girl stares at you from a hooded gaze..."
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
