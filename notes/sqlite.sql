pragma journal_mode = WAL;

create table meta (
	id integer primary key,
	key text,
	value text);

insert into meta(key, value) values ('version', '1');

create table wobs (
	id integer primary key,
	wobid integer,
	container integer,
	base integer,
	verbCode text);

create table properties (
	id integer primary key,
	wobid integer,
	key text,
	value text,
	foreign key(wobid) references wobs(id));
