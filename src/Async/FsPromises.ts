/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import * as fs from "fs";

export function readFile(path: string): Promise<string> {
	return new Promise((a, r) => {
		fs.readFile(path, (err, result) => {
			if (err)
				r(err);
			else
				a(result);
		});
	});
}
