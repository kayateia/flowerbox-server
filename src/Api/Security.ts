/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import * as Crypto from "../Crypto/Crypto";
import { Token } from "./Model/Token";
import { ModelBase } from "./Model/ModelBase";

export class Security {
	// Verify that the token is valid and return the info it contains. If this
	// returns null, then a response has been sent to the client.
	public static VerifyToken(req, res): Token {
		try {
			let auth = null;
			if (req.headers.authorization) {
				auth = req.headers.authorization;
			}

			if (!auth) {
				res.status(401).json(new ModelBase(false, "Missing bearer token"));
				return;
			}

			let token = auth.substring("Bearer ".length);
			let tokenContents = Crypto.decryptJson(token);

			// TODO: Check token expiration.

			return tokenContents;
		} catch (err) {
			console.log("Validation error:", err);
			res.status(401).json(new ModelBase(false, "Token validation error"));
			return null;
		}
	}

	// Create the token to return to the client using the specified info.
	public static CreateToken(tokenContents: Token): string {
		return Crypto.encryptJson(tokenContents);
	}
}
