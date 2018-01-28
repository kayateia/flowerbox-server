# Flowerbox
## Copyright (C) 2016-2018 Kayateia

### What is Flowerbox?

Flowerbox is a Node.js rewrite/upgrade of a C# project called CliMOO, 
which is a C# rewrite/upgrade of a Python project called ... Flowerbox. 
It has a storied history.

Flowerbox is essentially a web-based MOO (MUD Object Oriented, an 
online, multiplayer text adventure created with object-oriented 
principles).

I'll be filling out more of this later.

The code is licensed under the GPLv3 currently. Some parts of it might
eventually be pulled out (like Petal) so if you want to contribute, we
should talk about that.


### How to get started?

I haven't had much luck with Node 9.x yet, but 8.x still seems to
be working fine.

There isn't much here for end users or admins yet, but you can start 
playing with the code if you want. You need to do the following:

     npm install -g typescript
     npm install
     tsc

That should build the project. For future hacking on the code, run tsc
or use a proper auto-compiling editor like Atom.

What's accessible to run right now is runnable like this:

node js/test.js

You can edit src/test.ts to play with various possibilities.

### Running tests

You'll also need to install Jasmine if you want to run the tests:

     npm install -g jasmine


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

