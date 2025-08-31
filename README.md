# flatopia-js
Flat world game engine written in Java Script.

The Flatopia game engine is written in plain old Java Script (no libraries or compiling) and runs completely in the browser. Because of this it can be used for learning the basics and intricacies of Java Script. The Flatopia world consist of flat shapes (images) moving in a 3D world. The programmer can use this game engine to create characters, move them around in the world, define interactions and create a fully functional game.

The engine is written in object oriented Java Script and is in the single file [flatopia.js](code/flatopia.js).

# Examples
[First Game](https://mtruchard.github.io/flatopia-js/games/firstGame/index.html) [(code)](examples/firstGame)

[Second Game](https://mtruchard.github.io/flatopia-js/games/secondGame/index.html) [(code)](games/secondGame)

[Scratchpad](https://mtruchard.github.io/flatopia-js/games/scratchpad/index.html) [(code)](examples/scratchpad)

# World Geometry
All locations and movement are described using 3D coordinate positions in JSON such as {x:0,y:100,h:50}.
The 'x' coordinate goes horizontally across the screen with its origin (x=0) at the center. 'x' gets larger going to the right.
The 'y' coordinate goes into the screen with its origin (y=0) at the front. 'y' gets larger going into the screen.
The 'h' coordinate goes up and down with its origin at the bottom (h=0). 'h' gets larger going up.
The idea is that the x and y coordinates move across the ground and the h coordinate goes up into the air. You can make a character fly by changing h where a larger h means up.
