/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

///<reference path="../../../typings/globals/restler/index.d.ts" />

import * as rest from "restler";

// The service must be running for these tests to pass. Note that running them a second
// time without restarting the service may invalidate the results. They make changes to
// world objects which may be unexpected on a subsequent run.

const baseUrl = "http://localhost:3001";

describe("World API", function() {
	let headers = {
		"Authorization": "Bearer "
	};

	it("will function once we have a login", function(done) {
		rest.post(baseUrl + "/user/login/kayateia", {
			data: { password: "kayateia" }
		}).on("complete", function(result) {
			expect(result.success).toEqual(true);
			headers.Authorization += result.token;
			done();
		});
	});

	it("allows property querying", function(done) {
		rest.get(baseUrl + "/world/wob/@world/property/name", {
			headers: headers
		}).on("complete", function(result) {
			expect(result).toEqual({
				success: true,
				id: 1,
				name: "name",
				value: "Za Waarudo"
			});
			done();
		});
	});

	it("allows property setting by multi-part form", function(done) {
		rest.put(baseUrl + "/world/wob/@kayateia/properties/binary", {
			multipart: true,
			headers: headers,
			data: {
				testMultipartFormSet: JSON.stringify("test value")
			}
		}).on("complete", function(result) {
			expect(result).toEqual({
				success: true,
			});

			rest.get(baseUrl + "/world/wob/@kayateia/property/testMultipartFormSet", {
				headers: headers
			}).on("complete", function(result) {
				expect(result.success).toEqual(true);
				expect(result.value).toEqual("test value");
				done();
			})
		});
	});

	it("allows property setting by JSON/form", function(done) {
		rest.put(baseUrl + "/world/wob/@kayateia/properties", {
			headers: headers,
			data: {
				testJsonSet: "test value"
			}
		}).on("complete", function(result) {
			expect(result).toEqual({
				success: true,
			});

			rest.get(baseUrl + "/world/wob/@kayateia/property/testJsonSet", {
				headers: headers
			}).on("complete", function(result) {
				expect(result.success).toEqual(true);
				expect(result.value).toEqual("test value");
				done();
			})
		});
	});

	it("allows property deletion", function(done) {
		rest.del(baseUrl + "/world/wob/@kayateia/property/name", {
			headers: headers,
		}).on("complete", function(result) {
			expect(result).toEqual({
				success: true,
			});

			rest.get(baseUrl + "/world/wob/@kayateia/property/name", {
				headers: headers
			}).on("complete", function(result) {
				expect(result.success).toEqual(true);
				expect(result.value).toEqual("Player");
				done();
			})
		});
	});
});
