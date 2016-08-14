# Flowerbox object model
by Dove/d0vely

### Basics

Flowerbox has a simple object model that is based on a prototypical concept rather than a class concept. It was strongly inspired by LambdaMOO. It's similar in concept to JavaScript, but in some ways it's simpler than that because there is no "prototype" object involved. The objects (world objects, or "wobs") simply inherit properties (members) and verbs (methods) from each other directly.

We'll start with a simple example. Take wob A, which has properties "bar" and "baz", and verb "look". Now add wob B, which marks A as its base, and has property "quux", and a verb "take".


### The native model

Natively, these are modelled as Maps, which I will simplify for discussion purposes to Objects.

```javascript
var a = {
	bar: "test me!",
	baz: null,
	look: function() {
		this.baz = this.bar;
		log(this.bar, "looks like A");
	}
};
var b = {
	inherits:a,
	quux: null,
	take: function() {
		this.quux = "it's B!";
		log(this.quux, "looks like B");
	}
};
```

When we call a.look(), the value of "a" becomes "this" in the method a.look. If we call b.look(), then "b" is checked for a "look" verb first, and when look() is not found, "a" is checked. It's found there, so execution proceeds, with "b" as "this". Effectively, "look" is a verb that belongs to both objects; the definition of it is simply pulled from its canonical source (a). If "b" defined a "look" verb, that would then become b.look().

Properties work the same way.

- Does "b" have a "bar"? No -- then,
- Does "a" have a "bar"? Yes -- then,
- Read a.bar.

Writing is different: When calling b.look(), the code edits "this.baz", and so b.baz would be edited, not a.baz.

Various outputs:
- a.look(): "test me! looks like A" (a.baz = "test me!")
- b.look(): "test me! looks like A" (b.baz = "test me!")
- b.take(): "it's B! looks like B" (b.quux = "it's B!")


### The traditional OOP explanation

A similar sort of concept might be written out thus, in C#-ish classes:

```csharp
class A {
	public string bar = "test me!";
	public string baz = null;
	public void look() {
		this.baz = this.bar;
		log(this.bar, "looks like A");
	}
}

class B : A {
	public string quux;
	public void take() {
		this.quux = "it's B!";
		log(this.quux, "looks like B");
	}
}
```

In C#, you would use the new operator on these to make instances. You could take an instance of B, and treat it as if it were an A: instanceB.look() would work, and instanceB.baz would be "test me!" afterward. instanceB.look() would print "test me! looks like A", and instanceB.take() would print "it's B! looks like B". Furthermore, if instanceB.look() modified baz, it would modify the value in instanceB, not instanceA.

Now just remove the instance layer. There is object A (or static class A, if that helps you think about it) and object B (or static class B). When you have a reference to B, and access B.bar, the lookup procedure is much the same as in any language with OOP. Just repeating what was written above:

- Does B have a "bar"? No -- then,
- Does A have a "bar"? Yes -- then,
- Read A.bar.


### Overriding

What happens if you have the same property or verb on two different wobs? Then the one higher up the chain wins. Take this example:

```javascript
var d = {
	bar: "D's bar",
	look: function() { log(this.bar); }
};
var e = {
	inherits:d,
	bar: "E's bar"
};
var f = {
	inherits:e,
	test: function() { this.bar = "F's bar" }
};
```

If we call d.look(), then it will print "D's bar". If we call e.look(), then it will still invoke D's verb code, but now "this" will be "e", so it will print "E's bar".

A third thing happens if we call f.test(). Again, simply because "this" is "f" when we call it, f.bar is what changes. If we call e.look(), we will still get "E's bar", or d.look(), "D's bar".

The verbs (methods) might also be overridden in this way.


### Other Wob Things

Wobs contain several intrinsic properties, besides the user-configurable ones. This includes the base "class" object that it inherits from, as well as a list of contained objects. Wobs may contain each other in an acyclic way.


### Wobs and Properties, Dirs and Files

One interesting notion I've heard about this is to think the about objects like a file system. The wobs as directories, the properties as non-executable files, and the verbs as executable files.

- A wob can contain other wobs, and also contains properties and verbs
- Properties cannot contain anything but data
- Verbs cannot contain anything but code

Additionally, as we'll see below, security settings apply in a similar to way directories and files. Each item has an owner and group (defacto or otherwise), and each item has a set of permission bits as appropriate for the item type. Read and write on a wob (directory) means modifying the container itself: being able to enumerate the contained items, being able to edit the list of them, and so forth. Read and write on a property means you can read or modify the data contained in it. Reading and writing on a verb means you can read or write the code contained in it. Execute on a verb means that you can execute the verb.

The mapping is fairly straightforward.


### Security Intro

In a standard operating system, code can be written by many different people, but with a few exceptions, it will run as the user who invokes it. This gives it full permissions to all of the user's data. This can be useful, e.g. if you want to allow it to operate on a document on your behalf. But it is also the source of an endless stream of security headaches.

Flowerbox uses a *sandbox* model. It is more like a microservice architecture in many ways. When microservice B wants to ask microservice A to do something, it has to "throw the request over the fence"; this usually happens through HTTP these days, but it could happen other ways. All of the code involved in A's actions is running as A. If A wants to modify B's data, it must either ask B to do it, or get some special dispensation.

We will see below that that "special dispensation" refers to the sticky bit on permissions.


### Security details

In Flowerbox, each wob, each property, and each verb have an effective set of POSIX-like permissions, including owner and group.

Each property and verb on a wob is owned by a specified wob in the inheritance chain. So if C inherits from B inherits from A, then there may be properties and verbs on C owned by C, B, or A. Unless it's otherwise forbidden, writing a property or verb higher up the chain will override the lower one (e.g. C.bar will override A.bar).

Each property has a read/write flag for *groups* and *others*; owners and administrators may always read and write them. Default is read any, write owner only. Each property also has a sticky bit; this means that the property remains owned by the parent in child wobs. (e.g. if B has property foo, and foo is marked sticky, then B continues to own foo, and may write it in C; conversely, C's verbs may not write C.foo. See below.)

Each verb has the same flags as properties, plus an execute flag for *groups* and *others*; owners and administrators may always execute them. The execute flag defaults to on for groups and others.

Wobs contain the following properties:

- Owner (also a wob ID)
- Group (also a wob ID - has to inherit from @group)
- Per owner/group/other read/write. Default is rw for owner only, r for others.

Verb code runs as the owner of the wob. So if you had a wob A with verb "look", and executed A.look(), it would run as you; all permissions on everything it does would be calculated as you. It would also inherit your CPU and memory constraints (see below).


#### Sticky Bits

In an inheritance situation, the base wob may want some space in the sub-wob to store some data for that instance. This was described up top, where a.look() wants to write to "baz"; when c.look() is the called verb, "c.bar" is what will be modified. In other words, verb code from A would write to C. Unfortunately, by default, this is not allowed!

Another example of this scenario given in the LambdaMOO documentation is that of a Radio. Player 1 could've written a Radio wob, and then Player 2 wants their own, so they make a DoveRadio that inherits from it. The Radio wob has a channel selector property, and when they're called from DoveRadio, Radio's verbs must set its value... in DoveRadio. How does this happen?

Sticky bits are the answer to this scenario. When a base wob wants to write some data pertaining to a sub-wob, by default this is only allowed on its own wob. It has a few options:

- Keep a sort of table mapping on its own properties that say, for wob #142, this is the radio channel; for wob #523, this is the radio channel; etc.
- Some method has to be allowed for the base wob to store "local data" on the sub-wob.

Obviously option #1 is suboptimal for a number of reasons, like that the sub-wob might go away without notification. Then we'd be left with a mess of sub-wob properties we have to clean up. It is better to store the data where it is being used, and that is on the sub-wob itself. A sticky property is like ceding a little piece of land to a foreign country's embassy. You're saying, okay, this is yours to do with as you please. The base wob reserves a property in this way by putting the property on itself with the sticky bit; then wobs that inherit from it will automatically give control over that property to the base wob.


### Security override (TBD - Not implemented yet)

It may eventually be possible to write a verb on an object that allows a more sophisticated set of access privileges to be implemented. This could give you group policies, ACLs, and the like.


### Sandbox limits (TBD - Not implemented yet)

Each user has a maximum CPU usage (called "step count") and data usage (by object) per verb, a maximum data usage (by object per wob) as well as a maximum number of wobs. These are set as defaults on the system, and may be overridden per user. As it makes sense, each may also be overridden per wob.

When a verb goes beyond either of the designated limits, an exception will be thrown inside and it will be given a (small) fixed number of remaining steps for cleanup.

Note that the limits are enforced per user - meaning that, if object A (with verb "look") is owned by user 1, and object B that inherits from A is owned by user 2, then running B.look will "charge" user 1, not user 2. This allows for the system admins to make expansive and expensive verb code that regular users can use, for example.
