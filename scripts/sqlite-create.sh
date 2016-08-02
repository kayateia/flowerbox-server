#!/bin/sh

# Creates or re-creates the SQLite database from the schema.

rm -f flowerbox.db*
sqlite3 flowerbox.db < scripts/sqlite.sql

