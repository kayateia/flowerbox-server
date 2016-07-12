/*
	Flowerbox
	Copyright (C) 2016 Dove
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

///<reference path="../../typings/globals/express/index.d.ts" />

import * as express from "express";
import { indexRouter } from "./Routes/Index";

const bodyParser = require("body-parser");

export let app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use("/", indexRouter);

// Catch 404 and forward to error handler.
app.use((req, res, next) => {
	let err: any = new Error("Not Found");
	err.status = 404;
	next(err);
});
