world = new World({
    canvasId:"flatopia_canvas",
    consoleId:"flatopia_console",
    width:1000, height:800,
});

console.log("Hello World!");
console.log("It is a sunny day!")

// Add a Bird to the world
bird = new Character({
    name:"Birdy", x:200, y:0, h:150,
    imageUrl:"bird.png"
});
world.add(bird);

// Add a Paper Doll to the world
doll = new PaperDoll({x:-200, y:100, h:0});
world.add(doll);

bird.do(new Follow( {follower:bird, leader:doll, relX:-100, relY:50, randX:20, randY:20} ) );

world.addController( new DebugController() );
//world.addController( new CharacterController({
//    character:doll,
//    onEvent: function(e){}
//}));

for ( var i = 0; i<100; i++ ) {
    doll.moveTo({x:0,y:500,h:0});
    doll.moveTo({x:100,y:500,h:0});
    doll.moveTo({x:-100,y:500,h:0});
    doll.moveTo({x:-100,y:500,h:100});
    doll.moveTo({x:50,y:500,h:100});
    doll.moveTo({x:0,y:0,h:0});
}
