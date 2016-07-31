/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import * as Persistence from "../Persistence";
import * as World from "../All";

describe("Persistence", function() {
	it("should persist and unpersist basic JSON structures", function() {
		let input = [1,2,3, { a:4, b:5, 6:10, zz: { q: "a", w: [null, undefined, "foo"] } }];
		let output = Persistence.persist(input);
		let reversed = Persistence.unpersist(output);
		expect(input).toEqual(reversed);
	});

	it("should persist special types", function() {
		let input = [ new World.WobRef(5),
			new World.NotationWrapper(new World.Notation("foo", [ 1,2,3 ])) ];
		let output = Persistence.persist(input);
		let reversed = Persistence.unpersist(output);
		expect(input).toEqual(reversed);
	});
});
