The version of Acorn in this directory is a modified version of Acorn 3.2.0.
The change that's been made to it is that isIdentifierStart() and isIdentifierChar()
have been modified to allow for @ and # to start identifier names. I did it
this way because I couldn't find a way to make the plugin syntax let me
replace or augment those functions, unfortunately, and monkey patching
was also not working due to the module structure.

