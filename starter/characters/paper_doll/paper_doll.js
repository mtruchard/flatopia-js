class PaperDoll extends Character {
    constructor(attributes) {
        if ( !attributes.name ) {
            attributes.name = "Paper Doll";
        }
        attributes.imageUrl = "../../starter/characters/paper_doll/paper_doll.png";  // TODO: unhardcode path
        super(attributes);
    }
}