# Flowerbox as an OS
by Dove/d0vely

### Introduction

One way to think of Flowerbox is as an operating system. It is an operating system that runs on top of a virtual machine, on top of another operating system, but it is a type of OS nonetheless.

This document is an attempt to explain how that maps for both current and future planned Flowerbox code.


### Kernel

The Flowerbox code is a type of OS kernel. It interfaces with the underlying hardware (in this case, Node), and provides several useful facilities for programs running on top of it. I'll cover these below.


### Programming language and virtual machine

Petal is the official programming language of Flowerbox. Programs are written in Petal, and then they are compiled by the operating system down into a virtual machine program. The virtual machine then executes the code one step at a time, allowing it to manipulate data structures and execute loops and such, all arbitrated by the kernel. Memory access in Petal is not "to the metal" - things like arrays and objects are abstractions that the virtual machine makes to *look* like raw access inside Petal, but they are actually virtual objects that can implement a variety of mechanisms on the back end.

One good example of one of these "mechanisms" is in reading from and writing to wobs. It looks like a plain object to Petal, but in reality, reads and writes are going through a complex mapping from Petal's virtual model to a real underlying model. Reads and writes are subject to security checks which may interrupt Petal programs.

A type of virtual memory exists underneath Petal as well, in the form of the automated loading and cache eviction of wobs in the World object. An illusion is presented of a potentially vast memory that is, in reality, a limited view onto the full set of data, which exists in secondary storage (in this case, a database on disk).

Flowerbox also provides for pre-emptive multitasking among programs. If a program is taking too long, it is pre-empted and other programs are given the chance to run. This is currently very primitive but improvements are planned.


### Security model

Flowerbox provides a security model comparable to UNIX. There are security principals: users, and groups which may contain users or other groups. There is a concept of normal and admin users, and a privilege escalation system. There are many securable objects, in the form of wobs, their properties, and their verbs. I'll cover more on security within programs below.


### Filesystem

Flowerbox provides an object-oriented file system implemented as a graph of objects (wobs). These wobs are used to store a variety of things, including in-game manipulatable objects, as well as security principals (users and groups). Data related to gameplay (images, sounds, music) is also stored on wobs as properties. As mentioned above, the file system has an in-memory cache as well as "disk" backing.


### Programs/processes

In regards to the programs running on top of it, Flowerbox acts more like a microservice broker. It mostly facilitates things like disk storage and memory management, as well as remote administration functionality (the API), and otherwise leaves it up to the programs running on top of it to implement functionality.

In Flowerbox, each user more or less has their own kingdom, consisting of files/data (wobs and properties), as well as actions that can be performed on their data (programs/verbs). The programs are stored as wobs. Verbs are requests made to that user's programs. Whenever a request is made, a "process" is spun up to handle the request as needed.

These actions are less like UNIX shell commands, and more like URL requests on an HTTP microservice. So, for example, to walk a dog is less like this:

```
> walk dog
--> execute /usr/bin/walk as the caller
----> /usr/bin/walk manipulates the caller's dog to walk it
```

And more like this:

```
> HTTP GET /walk/dog
--> execute walk verb as the HTTP server's user
----> Walk verb manipulates HTTP server user's dog to walk it
```

The "walk" code belongs to the server's user, and therefore it executes as the server's user. The "walk" code cannot manipulate the caller's data in any way, unless it's explicitly allowed. Likewise, the caller cannot manipulate the server's data in any way, unless it's explicitly allowed. When flow control passes from one service to another, the security context changes too.

Services may also "subclass" each other, by effectively delegating some of their verbs to another service. So, there may be dog service A, and dog service B, and B doesn't actually implement the walking - A does. Of course that leaves an interesting question: how does A actually walk B's dog, if they're separate security contexts?

In this case, something like cookies happen. A stores its own data in B like an embassy - B can't touch that data, and A can. This is called "sticky" properties, and is important for things like security on player wobs.

It is also possible for users to explicitly allow access to their data, through permissions, but this isn't really the normal or recommended course of action.


### Ongoing processes

The above describes what happens in response to outside events (typically through the access API of Flowerbox itself) pretty well. What about processes acting internally? What if a process wants to do some long-running task or wants to act periodically?

This aspect of Flowerbox is not really fleshed out yet, but the intention is to allow for background tasks. These tasks would be allowed a certain quota of running time whenever they're active, and they could also willingly yield, either by waiting on a delay or other such waiting, like making network requests.


### Network access

At the moment, the only incoming network access that's available is handled by way of Flowerbox's HTTP API. This means that it's the kernel itself that's arbitrating those requests. This may not always be the case, though.

There are some rumblings of ideas of making it possible for Petal verbs to accept and respond to HTTP requests on the API. Some of the existing API functionality might then be moved into "userland" code.

There is also the concept of allowing Petal code to make requests back out to the internet, though this is under some debate, because of the heavy possibility for abuse. There would need to be some limitations, especially on frequency of requests (and possibly a whitelist of sites).
