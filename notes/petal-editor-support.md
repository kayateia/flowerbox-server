You can get support in Atom for syntax highlighting in .petal files by
editing your config and adding the following under "*"/"core":

```
"*":
  core:
    customFileTypes:
      "source.js": [
        "petal"
      ]
```

