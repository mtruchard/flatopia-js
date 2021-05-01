class Flower extends Character {
    constructor(attributes) {
        if ( !attributes.name ) {
            attributes.name = "Flower";
        }
        attributes.imageUrl = "../../starter/characters/flower/flower.png";  // TODO: unhardcode path
        super(attributes);
    }
}