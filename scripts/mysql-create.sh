#!/bin/sh

# Creates or re-creates the MySQL tables from the schema.
# Sub in your connection info.
# Assumes a database has been created.

mysql -u root -p flowerbox < scripts/mysql.sql
