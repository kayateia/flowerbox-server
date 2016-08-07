/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

///<reference path="../../typings/globals/multer/index.d.ts" />

import * as multer from "multer";

let storage = multer.memoryStorage();

// var upload = multer({ storage: storage }).single("userPhoto");
let uploader:any = multer({ storage: storage }).any();

// Returns a Promise that will handle turning a multi-part form body into a proper req.body.
export function upload(req, res) {
	return new Promise<any>(function(resolve, reject) {
		uploader(req, res, function(err) {
			if (err)
				reject(err);
			else
				resolve();
		});
	});
}
