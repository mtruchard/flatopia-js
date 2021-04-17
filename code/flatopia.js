/* COORDINATES
 * 1) World Coordinates - x,y move along the surface and h is height.
 *    x is 0 at horizontal center, y is 0 at front, h is zero at bottom
 * 2) Drawing Coordinates - for drawing in the javascript graphics context
 *    Drawn objects are 2D rectangles in the 3D world coordinate space
 *    x is 0 at left, y is zero at front.
 */

class World {
    constructor(attributes) {
        this.canvasId = attributes.canvasId;
        this.worldObjects = [];  // Objects in the world but not in the place
        this.objects = []; // All objects including those from the place
        if ( attributes.objects ) {
            for ( var i=0; i<attributes.objects.length; i++) {
                this.add( create(attributes.objects[i]) );
            }
        }
        //this.$canvas = null;
        this.canvas = null;
        this.canvasWidth;
        this.canvasHeight;
        this.ctx = null;
        this.tps = ('tps' in attributes)?attributes.tps:30;  // ticks per second
        this.eventFunction = null;
        this.isReady = false;
        this.place = null;
        this._createMode = (attributes.createMode)?attributes.createMode:false;
        
        var self = this;
        window.onload = function() {
            //self.$canvas = $('#'+self.canvasId);
            self.canvas = document.getElementById(self.canvasId);
            self.canvas.addEventListener('mousedown', self.mouseEvent.bind(self), false );
            self.canvas.addEventListener('touchstart', self.mouseEvent.bind(self), false );
            self.canvas.addEventListener('click', self.mouseEvent.bind(self), false );
            self.canvasWidth = self.canvas.width;
            self.canvasHeight = self.canvas.height;
            var canvasContext = self.canvas.getContext("2d");
            var cameraPosition = new Position({x:0, y: -1000, h: 300});
            self.ctx = new DrawingContex(canvasContext, self.canvasWidth/2, self.canvasHeight*0.9, cameraPosition, self._createMode); // multiply by 0.9 to give a little room in "front"
            if ( !self.place ) {
                var bounds = new Bounds( {left:-self.canvasWidth/2, right:self.canvasWidth/2, front: -100, back: self.canvasHeight, bottom:0, top:self.canvasHeight/2} );
                self.setPlace( new Place( {
                    backgroundUrn: null,
                    bounds: bounds
                } ) );
            }
            self.isReady = true;
            
            self.fireEvent( {
                type: 'ready'
            });
            setInterval( function() {
                self.draw();
                self.act();
            }, 1000 / self.tps);
        };
        
        document.onkeydown = function(e) {
            var key = checkKey(e);
            self.fireEvent( {
                type: 'keydown',
                key: key,
                pos: null
            });
        };
    }
    
    add( object ) {
        this.objects.push(object);
        this.worldObjects.push(object);
        object.container = this;
    }
    
    ready( readyFunction ) {
        this.readyFunction = readyFunction;
        if ( this.isReady ) this.readyFunction();
    }
    
    setPlace( place ) {
        this.place = place;
        //place.bounds = this.bounds;
        this.objects = place.objects.concat( this.worldObjects ); // concat creates new array.
        this.objects.forEach( o => { o.container = this; });
        place.container = this;
    }
    /* this.setBounds = function( bounds ) {
        this.bounds = bounds;
    }; */
    
    setBackground(backgroundUrl) {
        //this.$canvas.css('background-image', 'url("' + backgroundUrl + '")');
        this.canvas.style.backgroundImage = 'url("' + backgroundUrl + '")';
    }
    
    /*
     * DRAW
     */
    draw() {
        this.objects = this.objects.sort( function(a,b) { return ( a.getPosition().y - b.getPosition().y )});
        this.clear();
        if (this.place) this.place.draw(this.ctx,new Position({x:0,y:0,h:0}));
        for ( var i=0; i<this.objects.length; i++ ) {
            this.objects[i].draw(this.ctx,new Position({x:0,y:0,h:0}));
        }
    }
    clear() {
        this.canvas.width = this.canvas.width; // clears the canvas
    }
    getMousePos(evt) {
        // Maps the mouse event position onto the 3D X-Y horizontal plane
        // May return null if click is above the hoizon
        var rect = this.canvas.getBoundingClientRect();
        var x2D = evt.clientX - rect.left;
        var y2D = evt.clientY - rect.top;
        return this.ctx.tFromXY(x2D, y2D);
    }
    
    /*
     * ACT
     */
    act() {
        if (this.place && this.place.act) this.place.act();
        for ( var i=0; i<this.objects.length; i++ ) {
            if ( this.objects[i].act ) {
                this.objects[i].act();
            }
        }
    }

    /*
     * EVENTS
     * {
     *    world:
     *    place:
     *    type: 'ready', 'mousedown', 'keydown', 'steppedOn', 'bumpedInto', ...
     *    key:
     *    pos:  location in world coordinates
     *    actor: the object that acted on something
     *    object: the object that was acted upon
     * }
     */
    //window.addEventListener('click', function(e) { mouseEvent(e) } );
        
    mouseEvent(e) {
        var pos = this.getMousePos(e);
        if ( this._createMode ) {
            if ( pos !== null ) {
                this.ctx.setPos(new Position({x:0,y:0,h:0}),new Position({x:0,y:0,h:0}));
                this.ctx.canvas.beginPath();
                this.ctx.moveTo(new Point({x:-1000, y:pos.y, h:pos.h}));
                this.ctx.lineTo(new Point({x:1000, y:pos.y, h:pos.h}));
                this.ctx.moveTo(new Point({x:pos.x, y:0, h:pos.h}));
                this.ctx.lineTo(new Point({x:pos.x, y:3000, h:pos.h}));
                //this.ctx.canvas.arc(pos.x, pos.y, 10, 0, Math.PI * 2, true); // circle
                this.ctx.canvas.stroke();
            }
        }
        if ( e.type === "mousedown" || e.type === "touchstart" || e.type === "click" ) {
            if ( !pos ) return;
        }
        this.fireEvent( {
            type: e.type,
            key: null,
            pos: pos
        });
    }
    onEvent( eventFunction ) {
        this.eventFunction = eventFunction;
    }
    fireEvent( event ) {
        event.world = this;
        event.place = this.place;
        if ( this.eventFunction ) {
            this.eventFunction( event );
        }
        if ( this.place.eventFunction ) {
            this.place.eventFunction( event );
        }
    }
    
    hitAnything( rect ) {
        var objects = [];
        for ( var i=0; i<this.objects.length; i++ ) {
            var anObject = this.objects[i];
            var aPos = anObject.getPosition();
            if (rect.intersectsWith( anObject.getBounds().translate(aPos) ) ) {
                objects.push(anObject);
            }
        }
        return objects;
    }
    
    getBounds() {
        if ( this.place === null ) return null;
        return this.place.getBounds();
    }
    
    get createMode() { return this._createMode; }
    set createMode( createMode ) {
        this._createMode = !(!createMode);
        this.ctx.createMode = createMode;
    }
    toggleCreateMode() {
        this._createMode = !_createMode;
        this.ctx.createMode = this._createMode;
    }
}

/*
 * @param canvasOffsetX is the left of the canvas
 * @param canvasOffsetY is the top of the canvas
 * @param cameraPosition is the 3D point of the camera looking in to the canvas
 */
class DrawingContex {
    constructor( canvas, canvasOffsetX, canvasOffsetY, cameraPosition, createMode ) {
        this.canvas = canvas;
        this.createMode = createMode;
        this.offsetX = canvasOffsetX;
        this.offsetY = canvasOffsetY;
        this.cameraPosition = cameraPosition;
        this.pos = null;
    }
    
    /* Transform to 2D
     * p point in 3D coords
     * x is the 2D 0 horizontal point
     * y is the 2D 0 vertical point
     * returns x or y in drawing context
     */
//    t2x(p) {
//        var p2 = p.translate(this.pos);
//        return this.canvasOffsetX+p2.x;
//    }
//    t2y(p) {
//        var p2 = p.translate(this.pos);
//        return this.canvasOffsetY-p2.y-p2.h;
//    }
    t2xy(p) {
        //var p2 = containerPos.translate(pos.translate(p));
        var p2 = p.translate(this.pos);
        //return {x: this.canvasOffsetX+p2.x, y: this.canvasOffsetY-p2.y-p2.h};
        
        //this.fd = 1000; // focal distance - distance of screen from eye
        //var dy = this.fd/(p2.y + this.fd); // ratio
        //return new Point2D({x: this.offsetX + (p2.x*dy), y: this.eyeLevelY - (p2.h*dy) });
        
        // X is right, Y is in, H is up
        // x2d is right, y2d is down
        // -Yc/(Y-Yc) // focal ratio, negative since Yc goes negative outside screen
        var f = (this.cameraPosition.y/(p2.y - this.cameraPosition.y))*-1;
        // X2d = ((X - Xc) * (Zc/(Z-Zc))) + Xc
        // Y2d = (-(H - Hc) * (Yc/(Y-Yc))) - Hc  // H goes opposite direction from Y2d
        var x2d = this.offsetX + ((p2.x-this.cameraPosition.x) * f) + this.cameraPosition.x;
        var y2d = this.offsetY - ((p2.h-this.cameraPosition.h) * f) - this.cameraPosition.h;
        return new Point2D({x: x2d, y: y2d });
    }
    
    /* Transform from 2D x,y to 3D point
     * Chooses a point on the 3D xy surface (h=0)
     * Returns null if the 2D point does not hit that xy surface
     */
    tFromXY(x,y) {
        if ( y < this.offsetY - this.cameraPosition.h  ) { // above eyeLevel  ??? is this correct
            return null;
        }
        
    //  var y3 = (this.cameraPosition.h * this.cameraPosition.y) / (this.cameraPosition.h + this.offsetY - y) + this.cameraPosition.y;
        var y3 = (this.cameraPosition.h * this.cameraPosition.y) / (this.cameraPosition.h + this.offsetY - y) - this.cameraPosition.y;
        var x3 = (this.offsetX + this.cameraPosition.x - x) / (this.cameraPosition.y/(y3 - this.cameraPosition.y)) + this.cameraPosition.x;
        
        // TODO need to translate to handle position other than 0,0,0
        return new Point({x: x3, y: y3, h: 0});
    }
    
    setPos(containerPos,pos) {
        this.pos = containerPos.translate(pos);
    }
    
    moveTo(p) {
        var xy = this.t2xy(p);
        this.canvas.lineTo(xy.x, xy.y);
    }
    lineTo(p) {
        var xy = this.t2xy(p);
        this.canvas.lineTo(xy.x, xy.y);
    }
}

class Place {
    constructor(attributes) {
        this.name = name;
        this.backgroundUrl = attributes.backgroundUrl;
        this.bounds = attributes.bounds;
        this.objects = [];
        if ( attributes.objects ) {
            for ( var i=0; i<attributes.objects.length; i++) {
                this.add( create(attributes.objects[i]) );
            }
        }
        this.container = null;
        this.eventFunction = null;
    }
    
    add( object ) {
        this.objects.push(object);
        object.container = this;
    }
    
    draw(ctx, containerPos) {
        this.container.setBackground(this.backgroundUrl);
        if ( ctx.createMode ) {
            this.bounds.draw( ctx, containerPos );
            ctx.canvas.stroke();
        }
    }
    getBounds() {
        return this.bounds;
    }
    onEvent( eventFunction ) {
        this.eventFunction = eventFunction;
    }
}


/**
 * THINGS
 */

/*
 * The position (x,y,z) is the position of the bottom-horizontal-center "feet" in container coordinates where the thing touches the ground
 * Local coordinates are relative to the position
 */
class Thing {
    constructor(attributes) {
        this.name = attributes.name;
        this.actions = [];
        this.isShown = true;
        this.pos = new Position({x:attributes.x?attributes.x:0, y:attributes.y?attributes.y:0, h:attributes.h?attributes.h:0});
    
        this.container = null;
        /* this.topLeft = null;
        this.feetRect = null;
        this.adjFeetRect = null;
        this.bounds = null; */
        this.eventFunction = null;
    }
    
    show() {
        this.isShown = true;
    }
    hide() {
        this.isShown = false;
    }
    
    /* Draw the thing
     * x,y is the location of pos (0,0) in the drawing ctx
     */
    draw(ctx, containerPos) {
        if ( !this.isShown ) return;
        if ( ctx.createMode ) {
            // Draw 3x3 square at feet at height 0
            ctx.setPos(containerPos,this.pos);
            ctx.canvas.beginPath();
            var p,xy;
            p = new Point({x:-5,y:-5,h:0});
            ctx.moveTo(p);
            p = new Point({x:5,y:-5,h:0});
            ctx.lineTo(p);
            p = new Point({x:5,y:5,h:0});
            ctx.lineTo(p);
            p = new Point({x:-5,y:5,h:0});
            ctx.lineTo(p);
            p = new Point({x:-5,y:-5,h:0});
            ctx.lineTo(p);
            ctx.canvas.stroke();
        }
    }
    
    /* Get the bounds in Thing coordinates where (0,0,0) is the position of the feet */
    getBounds() {
        return new Bounds({left:0, top:0, right:0, bottom:0, front:0, back:0});
    }
    
    /* Get the bounds rectangle that touches the ground in Thing coordinates where (0,0,0) is the position of the feet */
    getFeetRect() {
        var bounds = this.getBounds();
        var width = bounds.width;
        var depth = bounds.depth;
        var height = bounds.height;
        return new Bounds( {left:bounds.left+width*0.1, right:bounds.left+width*0.9, front:bounds.front+depth*0.1, back:bounds.front+depth*0.9, top:0, bottom:0} );
    }
    
    /* Get the rectangle that touches the ground in container coordinates
    getAdjFeetRect() {
        var bounds = this.getBounds();
        var width = bounds.width;
        var height = bounds.height;
        this.topLeft = new Point( {x:this.pos.x - width*0.5, y:this.pos.y - height*0.8} );
        this.feetRect = this.getFeetRect();
        return this.feetRect.translate(this.topLeft.x,this.topLeft.y);
    }*/

    setFrame( frame ) {}
    isReady( frame ) { return true; }
    do( action ) {
        action.part = this;
        this.actions.push( action );
    }
    act() {
        if ( this.actions.length > 0 ) {
            var done = this.actions[0].do();
            if ( done ) {
                this.actions.shift();
            }
        }
        this._checkHits();
    }
    
    _checkHits() {
        var hitObjects = this.container.hitAnything(this.getBounds().translate(this.pos));
        hitObjects = hitObjects.filter( function(o) { if ( o !== this ) return true; });
        if ( hitObjects.length > 0 && hitObjects[0] !== this ) {
            this.fireEvent( {
                type : "bumpedInto",
                object: hitObjects[0]
            });
        }
        var steppedOnObjects = this.container.hitAnything(this.getFeetRect().translate(this.pos));
        steppedOnObjects = steppedOnObjects.filter( function(o) { if ( o !== this ) return true; });
        if ( steppedOnObjects.length > 0 && steppedOnObjects[0] !== this ) {
            this.fireEvent( {
                type : "steppedOn",
                object: steppedOnObjects[0]
            });
        }
    }
    
    move( dx, dy, dh ) {
        if ( typeof dy === 'undefined' ) {
            // dx is a position or point
            dy = dx.y;
            dh = dx.h;
            dx = dx.x;
        }
        if ( typeof h === 'undefined' ) {
            dh = this.pos.dh;
        }
        this.actions.push( new MoveBy( {character:this, dx:dx, dy:dy, dh:dh} ) );
    }
    moveTo( x, y, h ) {
        if ( typeof y === 'undefined' ) {
            // x is a position or point
            y = x.y;
            h = x.h;
            x = x.x;
        }
        if ( typeof h === 'undefined' ) {
            h = this.pos.h;
        }
        this.actions.push( new MoveTo( {character:this, x:x, y:y, h:h} ) );
    }
    stop() {
        this.actions = [];
    }
    
    /* Get the position of the feet in container coordinates */
    getPosition() {
        return this.pos;
    }
    /* Set the position of the feet in container coordinates */
    setPosition( x, y, h ) {
        if ( typeof y === 'undefined' ) {
            y = x.y;
            h = x.h;
            x = x.x;
        }
        this.pos = new Position( {x:x, y:y, h:h} );
        
        // keep feet inside bounds of container
        //var bounds = this.getBounds();
        //var width = bounds.width();
        //var height = bounds.height();
        // this.topLeft = new Point( {x:this.pos.x - width*0.5, y:this.pos.y - height*0.8} );
        var feetRect = this.getFeetRect();
        var adjFeetRect = feetRect.translate(this.pos);
        var delta = this.container.getBounds().keepInside( adjFeetRect );
        if ( delta.x !== 0 || delta.y !== 0 || delta.h !== 0) {
            this.pos = new Position( {x:x+delta.x, y:y+delta.y, h:h+delta.h} );
        }
        
        return delta;
    }
    
    /*var numResourcesLoaded = 0;
    var totalResources = 0;
    function resourceLoaded() {
        numResourcesLoaded += 1;
        if(numResourcesLoaded === totalResources) {
            this.feetRect = new Rectangle( this.images.main.width*0.1, this.images.main.height*0.8, this.images.main.width*0.9, this.images.main.height );
            this.setPosition( this.pos.x, this.pos.y ); // adjust this.topLeft based on image
            this.isReady = true;
            if ( this.readyFunction ) this.readyFunction();
        }
    }*/
    
    /*ready( readyFunction ) {
        this.readyFunction = readyFunction;
        if ( this.isReady ) this.readyFunction();
    };*/
    
    onEvent( eventFunction ) {
        this.eventFunction = eventFunction;
    }
    fireEvent(event) {
        event.actor = this;
        if ( this.eventFunction ) this.eventFunction(event);
        this.container.fireEvent( event );
    }
}

class CompositeThing extends Thing {
    constructor(attributes) {
        super(attributes );
        this.partsByName = {};
        this.parts = [];
        if ( attributes.parts ) {
            for ( var i=0; i<attributes.parts.length; i++) {
                var part = create(attributes.parts[i]);
                this.parts.push(part);
                this.partsByName[part.name] = part;
                part.container = this;
            }
        }
    }
    
    draw(ctx,containerPos) {
        if ( !this.isShown ) return;
        var drawPos = containerPos.translate(this.pos);
        this.parts.forEach( thing => {
            thing.draw(ctx, drawPos);
        });
        super.draw( ctx, containerPos );
    }

    setFrame( frame ) {}
    isReady( frame ) { return true; }
    do( action ) {
        action.part = this;
        this.actions.push( action );
    }
    act() {
        if ( this.actions.length > 0 ) {
            var done = this.actions[0].do();
            if ( done ) {
                this.actions.shift();
            }
        }
        
        this.parts.forEach( part => {
            part.act();
        });
        
        this._checkHits();
    }
    
    getBounds() {
        if ( this.parts.length === 0 ) {
            return new Rect({left:0, top:0, right:0, bottom:0});
        } else {
            return this.parts[0].getBounds();
        }
    }
    
    addPart(part) {
        this.parts.push( part );
        this.partsByName[name] = part;
        part.container = this;
    }
    
    getPart( partName ) {
        return this.partsByName[partName];
    }
    
    hitAnything( rect ) {
        var objects = [];
        return objects;
    }
    
    /*var numResourcesLoaded = 0;
    var totalResources = 0;
    function resourceLoaded() {
        numResourcesLoaded += 1;
        if(numResourcesLoaded === totalResources) {
            this.feetRect = new Rectangle( this.images.main.width*0.1, this.images.main.height*0.8, this.images.main.width*0.9, this.images.main.height );
            this.setPosition( this.pos.x, this.pos.y ); // adjust this.topLeft based on image
            this.isReady = true;
            if ( this.readyFunction ) this.readyFunction();
        }
    }*/
    
    /*ready( readyFunction ) {
        this.readyFunction = readyFunction;
        if ( this.isReady ) this.readyFunction();
    }*/
}

class Character extends CompositeThing {
    constructor(attributes) {
        super(attributes);
        this.imageUrn = attributes.imageUrn;
        if ( this.imageUrn ) {
            this.addPart( new Img( {name: "main", imageUrn:this.imageUrn, topLeft:new Point({x:0,y:0,h:0})} ) );
        }
        this.wordBubble = new WordBubble( {name: "wordBubble", imageUrn:'urn:com:loki:examples:app:pages:drawingPage!word_bubble.png', pos:new Position({x:0,y:0,h:0})} );
        this.wordBubble.hide();
        this.addPart( this.wordBubble );
        this.bubbleWords = null;
    }
    
    draw(ctx, containerPos) {
        if ( !this.isShown ) return;
        super.draw(ctx, containerPos);
    }
    
    say( words ) {
        this.actions.push( new Say( {speaker:this, words:words} ) );
    }
    sayNow( words ) {
        this.wordBubble.say(words,1);
        this.wordBubble.show();
    }
}

class WordBubble extends Thing {
    constructor(attributes) {
        super(attributes);
        this.image = new Img( {imageUrn: attributes.imageUrn, pos:new Position({x:0,y:0,h:100})} );
        
        this.words = null;
        this.wordBubbleSeconds = 1;
        this.wordBubbleInterval;
    }
    draw( ctx, containerPos ) {
        if ( !this.isShown ) return;
        if ( !this.words ) return;
        this.image.draw( ctx, this.pos.translate(containerPos) );
        ctx.setPos(containerPos,this.pos);
        ctx.canvas.font = "20px Arial";
        var p = new Point({x:165,y:0,h:80});
        var xy = ctx.t2xy(p);
        ctx.canvas.fillText(this.words, xy.x, xy.y );
    }
    say( words, seconds ) {
        this.words = words;
        this.wordBubbleSeconds = seconds;
        if ( this.wordBubbleInterval ) {
            clearInterval(this.wordBubbleInterval);
            this.wordBubbleInterval = null;
        }
        if ( !words ) {
            this.hide();
            return;
        }
        this.show();
        this.wordBubbleInterval = setInterval(this.say, this.wordBubbleSeconds*1000); // clear the word bubble later
    }
    getBounds() {
        return this.image.getBounds();
    }
}

//class Rectangle extends Thing {
//    constructor(attributes) {
//        super(attributes);
//        this.rect = new Rect( {left: attributes.left, right: attributes.right, top: attributes.top, bottom: attributes.bottom });
//    }
//    draw( ctx, x, y, createMode) {
//        if ( !this.isShown ) return;
//        var p1 = new Point({x:this.rect.left,y:0,h:this.rect.height});
//        var p1 = new Point({x:this.rect.width,y:0,h:this.rect.top});
//        var xy = ctx.t2xy(p);
//        ctx.rect( this.rect.left+x, this.rect.top+y, this.rect.width+x, this.rect.height+y );
//    }
//    getBounds() {
//        return this.rect;
//    }
//}

class Box extends Thing {
    constructor(attributes) {
        super(attributes);
        this.bounds = new Bounds({left:attributes.width/-2, top:attributes.height, right:attributes.width/2, bottom:0, front:attributes.depth/-2, back:attributes.depth/2});
    }
    draw(ctx, containerPos) {
        this.bounds.draw( ctx, containerPos.translate(this.pos) );
    }
    getBounds() {
        return this.bounds;
    }
}

class InvisibleBox extends Thing {
    constructor(attributes) {
        super(attributes);
        this.bounds = new Bounds({left:attributes.width/-2, top:attributes.height, right:attributes.width/2, bottom:0, front:attributes.depth/-2, back:attributes.depth/2});
    }
    draw(ctx, containerPos) {
        if ( ctx.createMode ) {
            this.bounds.draw( ctx, containerPos );
            //ctx.stroke();
        }
    }
    getBounds() {
        return this.bounds;
    }
}

class Text extends Thing {
    constructor(attributes) {
        super(attributes);
        this.text = attributes.text;
        this.font = attributes.font;
    }
    draw( ctx, containerPos ) {
        if ( !this.isShown ) return;
        ctx.canvas.font = "20px Arial";
        ctx.setPos(containerPos,this.pos);
        var xy = ctx.t2xy(new Point({x:0,y:0,h:0}));
        ctx.canvas.fillText(this.text, xy.x, xy.y);
    }
    getBounds() {
        return new Bounds( {left:0, right:5, top:5, bottom:0, front:0, back:0} );
    }
    getPosition() {
        return new Position( {x: this.x, y: this.y} );
    }
}

class Shape extends Thing {
    constructor(attributes) {
        attributes = attributes?attributes:{x:0,y:0};
        super(attributes);
        this.points = [new Point(0,0,0)];
        this.lineColor = "black";
        this.fillColor = null;
    }
    
    draw( ctx, containerPos) {
        if ( !this.isShown || this.points.length === 0 ) return;
        ctx.setPos(containerPos,this.pos);
        var oldStrokeStyle = ctx.canvas.strokeStyle;
        var oldFillStyle = ctx.canvas.fillStyle;
        ctx.canvas.strokeStyle = this.lineColor;
        ctx.canvas.fillStyle = this.fillColor;
        ctx.canvas.beginPath();
        var po = this.points[0].translate(this.pos);
        ctx.moveTo(po);
        this.points.forEach( p => {
            po = p.translate(this.pos);
            ctx.lineTo(po);
        });
        ctx.canvas.stroke();
        if (this.fillColor) ctx.canvas.fill();
        ctx.canvas.strokeStyle = oldStrokeStyle;
        ctx.canvas.fillStyle = oldFillStyle;
        //Thing.prototype.draw.call(this, ctx, x, y, createMode);
    }
    getBounds() {
        var left = this.points[0].x;
        var right = this.points[0].x;
        var front = this.points[0].y;
        var back = this.points[0].y;
        var top = this.points[0].h;
        var bottom = this.points[0].h;
        this.points.forEach( p => {
            if ( p.x < left ) left = p.x;
            if ( p.x > right ) right = p.x;
            if ( p.y < front ) front = p.y;
            if ( p.y > back ) back = p.y;
            if ( p.h < top ) top = p.h;
            if ( p.h > bottom ) bottom = p.h;
        });
        return new Bounds( {left:left, right:right, top:top, bottom:bottom, front:front, back:back} );
    }
    startAt( x, y, h ) {
        this.points = [new Point({x:x?x:0,y:y?y:0,h:h?h:0})];
    }
    lineTo( x, y, h ) {
        this.points.push( new Point({x:x?x:0,y:y?y:0,h:h?h:0}) );
    }
    setLineColor( color ) {
        this.lineColor = color;
    }
    setFillColor( color ) {
        this.fillColor = color;
    }
}

/*
 * bottom-horizontal-center "feet" of image is at x=0, y=0, h=0 in local cords
 */
class Img extends Thing {
    constructor(attributes) {
        super(attributes);
        var imageUrn = attributes.imageUrn;
        
        this.ready = false;
        this.image = new Image();
        var self = this;
        this.image.onload = function() {
            self._resourceLoaded();
        };
        this.image.src = loki.web.resourceUrl(imageUrn);
    }
    _resourceLoaded() {
        this.ready = true;
    }
    draw( ctx, containerPos ) {
        if ( !this.ready ) return;
        if ( !this.isShown ) return;
        ctx.setPos(containerPos, this.pos);
        var topLeft = ctx.t2xy(new Point({x:this.image.width*-0.5, y:0, h:this.image.height}));
        var bottomRight = ctx.t2xy(new Point({x:this.image.width*0.5, y:0, h:0}));
        var width = bottomRight.x - topLeft.x;
        var height = bottomRight.y - topLeft.y;
        ctx.canvas.drawImage(this.image, topLeft.x, topLeft.y, width, height);
    }
    getBounds() {
        var halfWidth = this.image.width/2;
        return new Bounds( {left:-halfWidth, right:halfWidth, top:this.image.height, bottom:0, front:0, back:0} );
    }
    isReady( frame ) {
        return this.ready;
    }
}

class AnimatedThing extends CompositeThing {
    constructor(attributes) {
        super(attributes);
        /* this.partsByName = {};
        this.parts = [];
        if ( attributes.parts ) {
            for ( var i=0; i<attributes.parts.length; i++) {
                var part = create(attributes.parts[i]);
                this.parts.push(part);
                this.partsByName[part.name] = part;
            }
        }*/
        this.partIdx = 0;
        this.ready = false;
        this.bounds = null;
    }
    
    draw( ctx, containerPos ) {
        if ( !this.isShown ) return;
        var part = this.parts[this.partIdx];
        part.draw(ctx, containerPos.translate(this.pos));
    }
    getBounds() {
        if ( !this.bounds ) {
            // TODO
            this.bounds = this.parts[0].getBounds().translate(this.pos);
        }
        return this.bounds;
    }
    isReady() {
        if ( this.ready ) return true;
        for ( var i=0; i<this.parts.length;i++) {
            if ( !parts[i].isReady() ) {
                return false;
            }
        }
        this.isReady = true;
        return true;
    }
    setFrame( frame ) {
        if ( typeof frame === 'string' ) {
            var found = false;
            for ( var i=0; i<this.parts.length; i++ ) {
                if ( this.parts[i].name === frame ) {
                    this.partIdx = i;
                    found = true;
                }
            }
            return found;
        } else {
            if ( frame >= 0 && frame < this.parts.length ) {
                this.partIdx = frame;
                return true;
            } else {
                return false;
            }
        }
    }
}


/*
 * GEOMETRIES
 */

class Point2D {
    constructor(attributes) {
        this.x = attributes.x;
        this.y = attributes.y;
    }
    deltaTo( pt ) {
        return new Point2D( {x:this.x-pt.x, y:this.y-pt.y} );
    }
}

class Rect2D {
    constructor(attributes) {
        this.left = attributes.left;
        this.right = attributes.right;
        this.top = attributes.top;
        this.bottom = attributes.bottom;
        this.width = this.right-this.left;
        this.height = this.bottom-this.top;
    }
    center() {
        return new Point2D( {x:(this.left+this.right)/2, y:(this.top+this.bottom)/2} );
    }
    translate(p) {
        return new Rect2D( {left:this.left+p.x, top:this.top+p.y, right:this.right+p.x, bottom:this.bottom+p.y} );
    }
    intersectsWith(r2) {
        return !(r2.left > this.right || 
               r2.right < this.left || 
               r2.top > this.bottom ||
               r2.bottom < this.top);
    }
    contains(r2) {
        return (this.left <= r2.left &&
               this.right >= r2.right &&
               this.top <= r2.top &&
               this.bottom >= this.bottom);
    }
    keepInside(r2) {
        // Returns deltaX/deltaY needed to keep rect inside this rect
        var dx = 0;
        var dy = 0;
        if ( this.left > r2.left ) dx = this.left - r2.left;
        if ( this.right < r2.right ) dx = this.right - r2.right;
        if ( this.top > r2.top ) dy = this.top - r2.top;
        if ( this.bottom < r2.bottom ) dy = this.bottom - r2.bottom;
        return new Point2D( {x:dx, y:dy} );
    }
//    draw( ctx, containerPos ) {
//        ctx.setPos( containerPos );
//        
//        var topLeft = new Point( {x:-this.width/2, y:-this.depth/2, h:0} );
//        ctx.rect( this.left+x, this.top+y, this.width+x, this.height+y );
//    }
}

/* A point in 3D world/container coordinates
 * x is 0 at left, increasing to right
 * y is 0 at front, increasing toward back
 * h is 0 at bottom, increasing toward top
 */
class Point {
    constructor(attributes) {
        this.x = attributes.x;
        this.y = attributes.y;
        this.h = attributes.h;
    }
    /* Translate the point using the given position */
    translate(p) {
        return new Point( {x:this.x+p.x, y:this.y+p.y, h:this.h+p.h} );
    }
    deltaTo( pt ) {
        return new Point( {x:pt.x-this.x, y:pt.y-this.y, h:pt.h-this.h} );
    }
}

/* A position in 3D world/container coordinates
 * Includes the x,y,h location and also in the future may include rotation.
 */
class Position {
    constructor(attributes) {
        this.x = attributes.x;
        this.y = attributes.y;
        this.h = attributes.h;
    }
    /* Translate the position using the given position */
    translate(p) {
        return new Position( {x:this.x+p.x, y:this.y+p.y, h:this.h+p.h} );
    }
    deltaTo( pos ) {
        return new Position( {x:pt.x-this.x, y:pt.y-this.y, h:pt.h-this.h} );
    }
}


/* Rectangular bounds in 3D world/container coordinates
 * left is 0, increasing to right
 * front is 0, increasing toward back
 * bottom is 0, increasing toward top
 */
class Bounds {
    constructor(attributes) {
        this._left = attributes.left?attributes.left:0;  
        this._right = attributes.right?attributes.right:0;
        this._front = attributes.front?attributes.front:0;
        this._back = attributes.back?attributes.back:0;
        this._bottom = attributes.bottom?attributes.bottom:0;
        this._top = attributes.top?attributes.top:0;
        /*if ( attributes.left ) {
        }
        else {
            left = attributes.xMin;
            right = attributes.xMax;
            front = attributes.yMin;
            back = attributes.yMax;
            bottom = attributes.hMin;
            top = attributes.hMax;
        }*/
    }
    get left() { return this._left; }
    get right() { return this._left; }
    get front() { return this._front; }
    get back() { return this._back; }
    get top() { return this._top; }
    get bottom() { return this._bottom; }
    get width() { return Math.abs(this._right-this._left); }
    get depth() { return Math.abs(this._back-this._front) }
    get height() { return Math.abs(this._bottom-this._top); }
    get center() {
        return new Point( {x:(this._left+this._right)/2, y:(this._front+this._back)/2, h:(this._top+this._bottom)/2} );
    }
    translate(pos) {
        return new Bounds( {left:this._left+pos.x, right:this._right+pos.x, front:this._front+pos.y, back:this._back+pos.y, top:this._top+pos.h, bottom:this._bottom+pos.h} );
    }
    intersectsWith(r2) {
        return !(r2.left > this._right || 
               r2.right < this._left ||
               r2.bottom > this._top ||
               r2.top < this._bottom ||
               r2.front > this._back ||
               r2.back < this._front
               );
    }
    contains(r2) {
        return (this._left <= r2.left &&
               this._right >= r2.right &&
               this._top >= r2.top &&
               this._bottom <= r2.bottom &&
               this._front <= r2.front &&
               this._back >= r2.back);
    }
    keepInside(r2) {
        // Returns deltaX/deltaY/deltaH needed to keep rect inside this rect
        var dx = 0;
        var dy = 0;
        var dh = 0;
        if ( this._left > r2.left ) dx = this._left - r2.left;
        if ( this._right < r2.right ) dx = this._right - r2.right;
        if ( this._top < r2.top ) dh = this._top - r2.top;
        if ( this._bottom > r2.bottom ) dh = this._bottom - r2.bottom;
        if ( this._front > r2.front ) dy = this._front - r2.front;
        if ( this._back < r2.back ) dy = this._back - r2.back;
        return new Point( {x:dx, y:dy, h:dh} );
    }
    draw( ctx, containerPos) {
        var oldStrokeStyle = ctx.canvas.strokeStyle;
        ctx.canvas.strokeStyle = "black";
        
        ctx.setPos( containerPos, new Point( {x:0, y:0, h:0} ) );
        
        ctx.canvas.beginPath();
        var p = new Point( {x:this._left, y:this._front, h:this._bottom} );
        ctx.moveTo(p);
        p = new Point( {x:this._right, y:this._front, h:this._bottom} );
        ctx.lineTo(p);
        p = new Point( {x:this._right, y:this._back, h:this._bottom} );
        ctx.lineTo(p);
        p = new Point( {x:this._left, y:this._back, h:this._bottom} );
        ctx.lineTo(p);
        p = new Point( {x:this._left, y:this._front, h:this._bottom} );
        ctx.lineTo(p);
        
        p = new Point( {x:this._left, y:this._front, h:this._top} );
        ctx.lineTo(p);
        p = new Point( {x:this._right, y:this._front, h:this._top} );
        ctx.lineTo(p);
        p = new Point( {x:this._right, y:this._back, h:this._top} );
        ctx.lineTo(p);
        p = new Point( {x:this._left, y:this._back, h:this._top} );
        ctx.lineTo(p);
        p = new Point( {x:this._left, y:this._front, h:this._top} );
        ctx.lineTo(p);
        ctx.canvas.stroke();
        
        ctx.canvas.beginPath();
        p = new Point( {x:this._right, y:this._front, h:this._bottom} );
        ctx.moveTo(p);
        p = new Point( {x:this._right, y:this._front, h:this._top} );
        ctx.lineTo(p);
        ctx.canvas.stroke();
        
        ctx.canvas.beginPath();
        p = new Point( {x:this._right, y:this._back, h:this._bottom} );
        ctx.moveTo(p);
        p = new Point( {x:this._right, y:this._back, h:this._top} );
        ctx.lineTo(p);
        ctx.canvas.stroke();
        
        ctx.canvas.beginPath();
        p = new Point( {x:this._left, y:this._back, h:this._bottom} );
        ctx.moveTo(p);
        p = new Point( {x:this._left, y:this._back, h:this._top} );
        ctx.lineTo(p);
        ctx.canvas.stroke();
        
        ctx.canvas.strokeStyle = oldStrokeStyle;
    }
}


/*
 * ACTIONS
 */

class Action {
    constructor(attributes) {
    }
    do() {
    }
}

class Do extends Action {
    constructor(attributes) {
        super(attributes);
        this.doFunction = attributes.doFunction;
    }
    
    do() {
        this.doFunction();
        return true;
    }
}
    
class MoveTo extends Action {
    constructor(attributes) {
        super(attributes);
        this.character = attributes.character;
        if ( attributes.target ) {
            if ( attributes.target instanceof Position ) {
                this.targetY = attributes.target.y;
                this.targetX = attributes.target.x;
                this.targetH = attributes.target.h;
            } else {
                var center = attributes.target.getBounds().center();
                this.targetX = center.x;
                this.targetY = center.y;
                this.targetH = center.h;
            }
        } else {
            this.targetX = attributes.x;
            this.targetY = attributes.y;
            this.targetH = attributes.h;
        }
        this.moveRate = 10;
    }
    do() {
        var x = this.character.getPosition().x;
        var y = this.character.getPosition().y;
        var h = this.character.getPosition().h;
        if ( x > this.targetX ) {
            x = x - this.moveRate;
            if ( x < this.targetX ) x = this.targetX;
        }
        if ( x < this.targetX ) {
            x = x + this.moveRate;
            if ( x > this.targetX ) x = this.targetX;
        }
        if ( y > this.targetY ) {
            y = y - this.moveRate;
            if ( y < this.targetY ) y = this.targetY;
        }
        if ( y < this.targetY ) {
            y = y + this.moveRate; 
            if ( y > this.targetY ) y = this.targetY;
        }
        if ( h > this.targetH ) {
            h = h - this.moveRate;
            if ( h < this.targetH ) h = this.targetH;
        }
        if ( h < this.targetH ) {
            h = h + this.moveRate; 
            if ( h > this.targetH ) h = this.targetH;
        }
        var delta = this.character.setPosition(x,y,h);
        if ( delta.x !== 0 || delta.y !== 0 || delta.h !== 0 ) return true; // movement done if we hit bounds 
        return ( y === this.targetY ) && (x === this.targetX ) && (h === this.targetH );  // true if movement done
    }
}

class MoveBy extends Action {
    constructor(attributes) {
        super(attributes);
        this.character = attributes.character;
        this.dx = attributes.dx;
        this.dy = attributes.dy;
        this.dh = attributes.dh;
        
        this.targetX = null;
        this.targetY = null;
        this.targetH = null;
        this.moveRate = 10;
    }
    do() {
        var x = this.character.getPosition().x;
        var y = this.character.getPosition().y;
        var h = this.character.getPosition().h;
        if ( !this.targetX ) {
            // Set target on first move
            this.targetX = x + this.dx;
            this.targetY = y + this.dy;
            this.targetH = h + this.dh;
        }
        if ( x > this.targetX ) {
            x = x - this.moveRate;
            if ( x < this.targetX ) x = this.targetX;
        }
        if ( x < this.targetX ) {
            x = x + this.moveRate;
            if ( x > this.targetX ) x = this.targetX;
        }
        if ( y > this.targetY ) {
            y = y - this.moveRate;
            if ( y < this.targetY ) y = this.targetY;
        }
        if ( y < this.targetY ) {
            y = y + this.moveRate; 
            if ( y > this.targetY ) y = this.targetY;
        }
        if ( h > this.targetH ) {
            h = h - this.moveRate;
            if ( h < this.targetH ) h = this.targetH;
        }
        if ( h < this.targetH ) {
            h = h + this.moveRate; 
            if ( h > this.targetH ) y = this.targetH;
        }
        var delta = this.character.setPosition(x,y,h);
        if ( delta.x !== 0 || delta.y !== 0 || delta.h !== 0 ) return true; // movement done if we hit bounds 
        return ( y === this.targetY ) && (x === this.targetX ) && (h === this.targetH );  // true if movement done
    }
}

class Follow extends Action {
    constructor(attributes) {
        super(attributes);
        this.character = attributes.follower;
        this.followedCharacter = attributes.leader;
        this.relX = attributes.relX;
        this.relY = attributes.relY;
        this.relH = attributes.relH;
        this.randX = attributes.randX?attributes.randX:0;
        this.randY = attributes.randY?attributes.randY:0;
        this.randH = attributes.randH?attributes.randH:0;
        
        this.targetX = null;
        this.targetY = null;
        this.targetH = null;
        this.moveRate = 10;
    }
    do() {
        var to = this.followedCharacter.getPosition();
        this.targetX = to.x+this.relX+ ((Math.random()*0.5) * this.randX);
        this.targetY = to.y+this.relY+ ((Math.random()*0.5) * this.randY);
        this.targetH = to.h+this.relH+ ((Math.random()*0.5) * this.randH);
        var x = this.character.getPosition().x;
        var y = this.character.getPosition().y;
        var h = this.character.getPosition().h;
        if ( x > this.targetX + this.randX ) {
            x = x - this.moveRate;
            if ( x < this.targetX ) x = this.targetX;
        }
        if ( x < this.targetX - this.randX ) {
            x = x + this.moveRate;
            if ( x > this.targetX ) x = this.targetX;
        }
        if ( y > this.targetY + this.randY ) {
            y = y - this.moveRate;
            if ( y < this.targetY ) y = this.targetY;
        }
        if ( y < this.targetY - this.randY ) {
            y = y + this.moveRate; 
            if ( y > this.targetY ) y = this.targetY;
        }
        if ( h > this.targetH + this.randH ) {
            h = h - this.moveRate;
            if ( h < this.targetH ) h = this.targetH;
        }
        if ( h < this.targetH - this.randH ) {
            h = h + this.moveRate; 
            if ( h > this.targetH ) y = this.targetH;
        }
        this.character.setPosition(x,y,h);
        return false;
    }
}

class Say extends Action {
    constructor(attributes) {
        super(attributes);
        this.character = attributes.speaker;
        this.words = attributes.words;
    }
    do() {
       this.character.sayNow(this.words);
       return true;
    }
}

class Animate extends Action {
    constructor(attributes) {
        super(attributes);
        this.part = attributes.part;
        this.ticks = attributes.ticks?attributes.ticks:10;
        this.frames = attributes.frames; // array of frame names
        this.increment = attributes.increment; // frame number increment
        this.repeat = attributes.repeat;
        
        this.frameIdx = 0;
        this.tickDown = 0;
        this.done = false;
    }
    
    do() {
        this.tickDown--;
        if ( this.tickDown > 0 ) return;
        this.tickDown = this.ticks;
        if ( this.frames ) {
            this.part.setFrame( this.frames[this.frameIdx] );
            this.frameIdx++;
            if ( this.frameIdx >= this.frames.length ) {
                if ( this.repeat ) {
                    this.frameIdx = 0;
                    return false;
                } else {
                    return true;
                }
            } else {
                return false;
            }
        } else if ( this.increment ) {
            if ( this.done ) {
                if ( this.repeat ) {
                    this.frameIdx = 0;
                    return false;
                } else {
                    return true;
                }
            }
            var found = part.setFrame( this.increment );
            this.done = (!found);
            this.frameIdx++;
            return true;
        }
        return true;
    }
}


function create( attributes ) {
    //var newProps = {};
    //for ( var prop in attributes ) {
    //   if ( prop !== "type" ) {
    //        newProps[prop] = { value: attributes[prop] };
    //    }
    //}
    //var obj = Object.create( { constructor: attributes.type }, newProps );
    //attributes.type.call( obj, attributes );
    //var obj = attributes.type.constructor.call( attributes );
    var ctr = attributes.type;
    var obj = new ctr(attributes);
    return obj;
}

function checkKey(e) {
    var event = window.event ? window.event : e;
    if ( event.keyCode == 37 ) {
        return "left";
    } else if ( event.keyCode == 38 ) {
        return "up";
    } else if ( event.keyCode == 39 ) {
        return "right";
    } else if ( event.keyCode == 40 ) {
        return "down";
    }
    return event.key;  // String.fromCharCode(65);
}
