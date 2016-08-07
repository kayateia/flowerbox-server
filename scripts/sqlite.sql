pragma journal_mode = WAL;

create table meta (
	id integer primary key,
	name text,
	value text);

insert into meta(name, value) values ('version', '1');

create table wobs (
	id integer primary key,
	wobid integer,
	container integer,
	base integer,
	verbCode text);

create table properties (
	id integer primary key,
	wobid integer,
	name text,
	value text,
	valueBinary blob,
	foreign key(wobid) references wobs(id));
