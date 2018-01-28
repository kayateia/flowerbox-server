/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import * as fs from "fs";

export function readFile(path: string): Promise<Buffer> {
	return new Promise((a, r) => {
		fs.readFile(path, (err, result) => {
			if (err)
				r(err);
			else
				a(result);
		});
	});
}

export function writeFile(path: string, contents: string | Buffer): Promise<void> {
	return new Promise<void>((a, r) => {
		fs.writeFile(path, contents, (err) => {
			if (err)
				r(err);
			else
				a();
		});
	});
}
