# Flowerbox object model
by Dove/d0vely

### Basics

Flowerbox has a simple object model that is based on a prototypical concept rather than a class concept. It was strongly inspired by LambdaMOO. It's similar in concept to Javascript, but is simpler than that because there is no "prototype" object involved. The objects (world objects, or "wobs") simply inherit properties (members) and verbs (methods) from each other.

We'll start with a simple example. Take wob A, which has properties "bar" and "baz", and verb "look". Now add wob B, which marks A as its base, and has property "quux", and a verb "take".


### The traditional OOP explanation

A similar sort of concept might be written out thus, in C#-ish classes:

```
class A {
	public string bar = "test me!", baz;
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

In C#, you would use the new operator on these to make instances. You could take an instance of B, and treat it as if it were an A: instanceB.look() would work, and instanceB.baz would be "test me!" afterward. instanceB.look() would print "test me! looks like A", and instanceB.take() would print "it's B! looks like B".

Now just remove the instance layer. There is object A (or static class A, if that helps you think about it) and object B (or static class B). When you have a reference to B, and access B.bar, the lookup procedure is much the same as in any language with OOP:

- Does B have a "bar"? No -- then,
- Does A have a "bar"? Yes -- then,
- Read A.bar.


### The native model (TypeScript/JavaScript)

Natively, these things are modelled as Maps, which I will simplify for discussion purposes to Objects.

```
var a = { bar: "test me!", baz: null, look: function() { this.baz = this.bar; log(this.bar, "looks like A"); } };
var b = { inherits:a, quux: null, take: function() { this.quux = "it's B!"; log(this.quux, "looks like B"); } };
```

When we call a.look(), the value of "a" becomes "this" and the method (verb) proceeds as normal. If we call b.look(), then "b" is checked first, and when look() is not found, "a" is checked. In this case, "b" becomes "this" and the method proceeds as normal.

Properties work the same way. Just repeating what was written above:

- Does "b" have a "bar"? No -- then,
- Does "a" have a "bar"? Yes -- then,
- Read a.bar.


### Overriding

What happens if you have the same property or verb on two different wobs? Then the one higher up the chain wins. Take this example:

```
var a = { bar: "A's bar", look: function() { log(this.bar); } };
var b = { inherits:a, bar: "B's bar" };
var c = { inherits:b, test: function() { this.bar = "C's bar" } };
```

If we call a.look(), then it will print "A's bar". If we call b.look(), then it will still invoke A's verb code, but now "this" will be "b", so it will print "B's bar".

A third thing happens if we call c.test(). Again, simply because "this" is "c" when we call it, c.bar is what changes. If we call b.look(), we will still get "B's bar", or a.look(), "A's bar".

The verbs (methods) might also be overridden in this way.


### Security Intro

Much like JavaScript loading in a browser, different pieces of code on a Flowerbox server may belong to different people; and much like JavaScript loading in a browser, we want that code to keep its hands to itself as it works, so that we can trust it to run without worrying about our own data.

This causes a unique problem. In the situation of subclassing within an app, it's just a matter of data hiding. If B subclasses A, then B can't necessarily access A's data, and A can't access B's data. When code from differently trusted sources is involved, it is even more important.

Another difference between JavaScript in a browser and Flowerbox is that, in a browser, the unit of sandboxing is a window. Outside of iframes, JavaScripts don't call each other outside that sandbox. In Flowerbox, the simplest operations will often involve code from multiple sources.

Finally, one last difficulty is that the base wob may want some space in the sub-wob to store some data for that instance. An example given in the LambdaMOO documentation is that of a Radio. Someone could've written a Radio wob, and then someone else wants their own, so they make a DoveRadio that inherits from it. Now the Radio wob has a channel selector that must store its data somewhere in DoveRadio. How does this happen?

The security model in Flowerbox follows this basic pattern: if B inherits from A, then B is treated as a composite object made up of both A and B, separated by a border. A has access to its own data and code, and can store new data in the instance (B). B has access to its own data and code, and of course can store new data in the instance (B). If permissions allow for it, then A can also touch B's properties and verbs, and B could touch A's properties and verbs, but that is handled the same as any two objects talking to each other.


### Security details

In Flowerbox, each wob, each property, and each verb have an effective set of POSIX-like permissions, including owner.

Each property and verb on a wob is owned by a specified wob in the inheritance chain. So if C inherits from B inherits from A, then there may be properties and verbs on C owned by C, B, or A. Unless it's otherwise forbidden, writing a property or verb higher up the chain will override the lower one (e.g. C.bar will override A.bar).

Each property has a read/write flag for *others*; owners and administrators may always read and write them. Default is read any, write owner only. Each property also has a sticky bit; this means that value overriding in children is not allowed. (e.g. if B has property foo, and foo is marked sticky, then B continues to own foo, and may write it in C; conversely, C's verbs may not write C.foo.)

Each verb has an execute flag for *others*; owners and administrators may always execute them. Default is enabled.

Wobs contain the following properties:

- Owner (also a wob ID)
- Property list read (by any) - default is set
- Property list write (new properties, by any) - default is not set
- Verb list read (any) - default is set

Verb code runs as the owner of the wob. So if you had a wob A with verb "look", and executed A.look(), it would run as you; all permissions on everything it does would be calculated as you. It would also inherit your CPU and memory constraints (see below).

The reason verb reading and writing isn't separate per verb is that the overall verb code per wob is stored in one program fragment.


### Security override (TBD)

It will be possible to write a verb on an object that allows a more sophisticated set of access privileges to be implemented. This could give you group policies, ACLs, and the like.


### Sandbox limits

Each user has a maximum CPU usage (called "step count") and data usage (by object) per verb, a maximum data usage (by object per wob) as well as a maximum number of wobs. These are set as defaults on the system, and may be overridden per user. As it makes sense, each may also be overridden per wob.

When a verb goes beyond either of the designated limits, an exception will be thrown inside and it will be given a (small) fixed number of remaining steps for cleanup.

Note that the limits are enforced per user - meaning that, if object A (with verb "look") is owned by user 1, and object B that inherits from A is owned by user 2, then running B.look will "charge" user 1, not user 2. This allows for the system admins to make expansive and expensive verb code that regular users can use, for example.
