# Flowerbox
## Copyright (C) 2016 Kayateia

### What is Flowerbox?

Flowerbox is a Node.js rewrite/upgrade of a C# project called CliMOO, 
which is a C# rewrite/upgrade of a Python project called ... Flowerbox. 
It has a storied history.

Flowerbox is essentially a web-based MOO (MUD Object Oriented, an 
online, multiplayer text adventure created with object-oriented 
principles).

I'll be filling out more of this later.


### How to get started?

There isn't much here for end users or admins yet, but you can start 
playing with the code if you want. You need to do the following:

     npm install -g typescript
     npm install -g typings
     npm install
     typings install
     grunt
     tsc

That should build the project. For future hacking on the code, you only 
need to run grunt if you want to update the pegjs grammar. Use tsc or 
use a proper auto-compiling editor like Atom.

What's accessible to run right now is runnable like this:

node js/test.js

You can edit src/test.ts to play with various possibilities.


### Game notes

I'm only going to list what I've implemented here; the rest is too up in 
the air right now.

#### Scripting language: Petal

Petal is based (very heavily) on ECMAScript. It has a few extra 
assumptions, like 'var' works like 'let' in ES. == and != also work like 
=== and !==, respectively. You can't access named properties on an array 
outside of the allowed (read-only) members exposed from the underlying 
objects. Just some stuff like that. It also allows for a few extra 
characters in identifiers, namely # and @. It is otherwise largely 
ECMAScript.

