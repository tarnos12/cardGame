const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
canvas.width = 800;
canvas.height = 600;
console.log("Game Version 0.9");
//Image loader
class Loader {
	constructor(callback) {
		this.imagesToLoad = null;
		this.imagesLoaded = 0;
		this.callBackFn = callback;
		this.images = {};
	}

	init () {
		ctx.save();
		ctx.font = "80px Verdana";
		ctx.fillText(`LOADING...`, canvas.width / 2 - 250, canvas.height / 2);
		ctx.restore();
		let images =  ["background", "border", "deck", "emptyCardSlot"];
		let cardColors = ["red", "blue", "yellow"];
		this.imagesToLoad = images.length + cardColors.length * 8;
		for(const img of images) this.loadImage(`img/${img}.png`, img);
		for(let i = 1; i < 9; i++) {
			for (const color of cardColors) this.loadImage(`img/${color}/${i}.png`, `${color}_${i}`);
		}
	}
	loadImage(src, name) {
		let img = new Image();
		this.images[name] = img;
		img.onload = () => {
			this.imagesLoaded++;
			if(this.imagesLoaded === this.imagesToLoad) {
				this.callBackFn.init(this.images);
			}
		};
		img.onerror = function (error) {
			console.log(error);
		};
		img.src = src;
	}
}

//Card object
class Card {
	constructor(number, color, x, y, image) {
		//Use images instead
		this.number = number || 1;
		this.image = image;
		this.color = color || "red";
		this.width = 100;
		this.height = 150;
		this.x = x;
		this.y = y;
		this.isShown = false;
	}

	click(){}
	render() {
		if(!this.isShown) return;
		ctx.drawImage(this.image, 610, 70, 670, 950, this.x, this.y, this.width, this.height);
	}
}

class Game {
	constructor() {
		this.deck = {
			width: 100, height: 150,
			x: canvas.width - 120,
			y: canvas.height - 160,
		};
		this.selectedCardIndex = null;
		this.selectedCardField = null;
		this.cards = [];//cards in deck
		this.cardSlots = [];
		this.playSlots = [];
		//TODO: Save score and display as "top score" on page refresh/new game start.
		this.score = 0;
		this.topScore = 0;
		this.lastScore = 0;
	}
	restart(){
		this.init(this.images);
	}
	init(images) {
		this.lastScore = this.score;
		this.deck = {
			width: 100, height: 150,
			x: canvas.width - 120,
			y: canvas.height - 180,
			image: images.deck,
		};
		this.selectedCardIndex = null;
		this.selectedCardField = null;
		this.cards = [];//cards in deck
		this.cardSlots = [];
		this.playSlots = [];
		this.score = 0;
		this.topScore = 0;
		this.images = images;
		for(let i = 1; i < 9; i++ ){
			this.cards.push(
				new Card(i, "red", null, null, images[`red_${i}`]),
				new Card(i, "blue", null, null, images[`blue_${i}`]),
				new Card(i, "yellow", null, null, images[`yellow_${i}`]),
			)
		}
		for(let i = 0 ; i < 5; i++) {
			let card = {width: 100, height: 150, x: ((canvas.width - 225) / 5) * (i + 1), y: canvas.height / 2, card:null, image: images['emptyCardSlot']};
			this.cardSlots.push(card);
		}
		for(let i = 0 ; i < 3; i++) {
			let card = {width: 100, height: 150, x: ((canvas.width - 288) / 3) * (i + 1), y: canvas.height / 2 - 180, card:null, image: images['emptyCardSlot']};
			this.playSlots.push(card);
		}

		loadGame();
		requestAnimationFrame(frame);
	}

	update(clickPos, isRightClick) {
		//Select card from 5 slots
		for (const [ cardSlotIndex, cardSlot ] of this.cardSlots.entries()) {
			let isClicked = Game.checkIfClicked(cardSlot, clickPos);
			if(isClicked){
				if(cardSlot.card) {
					if(!isRightClick) {
						this.selectedCardIndex = cardSlotIndex;
						this.selectedCardField = "cardSlots";
						return
					}
					cardSlot.card = null;
					this.selectedCardIndex = null;
					this.selectedCardField = null;
				}
				if(this.selectedCardIndex !== null && this.selectedCardField === "playSlots") {
					cardSlot.card = this.playSlots[this.selectedCardIndex].card;
					this.playSlots[this.selectedCardIndex].card = null;
					this.selectedCardIndex = null;
					this.selectedCardField = null;
				}
				return
			}
		}

		//Put the selected card on the playslot(3 slots)
		for (const [ playSlotIndex, playSlot ] of this.playSlots.entries()) {
			let isClicked = Game.checkIfClicked(playSlot, clickPos);
			if(isClicked) {
				if(playSlot.card) {//Select a card on playSlot
					this.selectedCardIndex = playSlotIndex;
					this.selectedCardField = "playSlots";
					return;
				}
				if(this.selectedCardIndex !== null && !playSlot.card && this.selectedCardField === "cardSlots") {
					playSlot.card = this.cardSlots[this.selectedCardIndex].card;
					this.cardSlots[this.selectedCardIndex].card = null;
					this.selectedCardIndex = null;
				}
				return;
			}
		}
		//TODO: Display warning message that we can't draw a card now
		if(this.checkIfAtLeastOneCardIsPlayed()) return;
		let isClicked = Game.checkIfClicked(this.deck, clickPos);
		if(isClicked) this.drawCard();
	}

	checkIfAtLeastOneCardIsPlayed() {
		for(const cardInPlay of this.playSlots){
			if(cardInPlay.card) return true;
		}
	}
	//TODO: Use callbacks to reuse the loop and call a function passing specific object etc.
	matchCards() {
		let colors = [];
		let numbers = [];
		for(const cardInPlay of this.playSlots){
			if(!cardInPlay.card) return;
			colors.push(cardInPlay.card.color);
			numbers.push(cardInPlay.card.number);
		}
		//If the loop above did not return, that means all 3 cards are placed, so the null checks below are redundant
		let isOrderedNumber = false;
		//TODO: Make it better...
		if(numbers[0] + 1 === numbers[1]){
			if(numbers[1] +1 === numbers[2]){
				isOrderedNumber = true;
			}
		}
		let isSameNumber = numbers.every((number, index, array) =>{
			return (number !== null) && (number === array[0]);
		});
		let isSameColor = colors.every((color, index, array) =>{
			return (color !== null) && (color === array[0])
		});
		let isThreeColors = false;
		if(colors[0] !== colors[1] && colors[0] !== colors[2] && colors[1] !== colors[2]) {
			isThreeColors = true;
		}

		//TODO: Add animation of card moving from playslot to the top left edge.
		for(const playSlot of this.playSlots) {
			playSlot.card = null;//remove cards from play slots
		}
		if(!isSameNumber && !isOrderedNumber) return;//Numbers are neither same nor ordered

		let totalNumber = numbers.reduce((reducer, adder) =>{
			return reducer + adder;
		});
		let multiplier = 1;
		if(isThreeColors) multiplier = 2;
		if(isSameColor) multiplier = 3;
		if(isOrderedNumber) multiplier += 2;
		if(isSameNumber) multiplier += 1;
		this.score += totalNumber * multiplier;
	}
	checkIfGameOver() {
		//TODO: Check if playable cards are less than 2(with empty playfield) or if card numbers are not going to result in any points
		let deckLength = this.cards.length;
		let cardSlotCards = 0;
		for(const cardSlot of this.cardSlots) {
			if(cardSlot.card) cardSlotCards++;
		}
		let playSlotCards = 0;
		for(const playSlot of this.playSlots) {
			if(playSlot.card) cardSlotCards++;
		}
		if(this.score > this.topScore) this.topScore = this.score;
		saveGame();
		let totalCards = deckLength + cardSlotCards + playSlotCards;
		if(totalCards >= 3) return;
		//Set top score and reset the game
		this.restart();
	}
	drawCard() {
		for(const cardSlot of this.cardSlots) {
			let randomCardIndex = Math.floor(Math.random() * this.cards.length);
			if(!cardSlot.card) {
				cardSlot.card = this.cards[randomCardIndex];
				this.cards.splice(randomCardIndex, 1);
			}
		}
	}
	static checkIfClicked (element, clickPos) {
		return ((clickPos.x > element.x && clickPos.x < element.x + element.width) &&
			(clickPos.y > element.y && clickPos.y < element.y + element.height))
	}

	render() {
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		//draw background
		ctx.drawImage(this.images.background, 0, 0, canvas.width, canvas.height);
		//draw borders

		ctx.drawImage(this.images.border, 0, 0, canvas.width, canvas.height);
		//Draw score
		ctx.save();
		ctx.font = "40px serif";
		ctx.fillStyle = "white";
		ctx.fillText("Score: " + this.score, 20, 60);
		ctx.fillText("Top: " + this.topScore, 20, 110);
		ctx.fillText("Last: " + this.lastScore, 20, 160);
		ctx.restore();
		//Draw deck
		ctx.drawImage(this.deck.image,610, 70, 670, 950, this.deck.x, this.deck.y, this.deck.width, this.deck.height);


		//Draw card slots
		for(const [cardSlotIndex, cardSlot ] of this.cardSlots.entries()) {
			ctx.drawImage(cardSlot.image, 610, 70, 670, 950, cardSlot.x, cardSlot.y, cardSlot.width, cardSlot.height);
			if(cardSlot.card) {
				cardSlot.card.x = cardSlot.x;
				cardSlot.card.y = cardSlot.y;
				cardSlot.card.isShown = true;
				cardSlot.card.render();
			}
			if(cardSlotIndex === this.selectedCardIndex && this.selectedCardField === "cardSlots") {
				ctx.save();
				ctx.strokeStyle = "orange";
				ctx.lineWidth = 5;
				ctx.strokeRect(cardSlot.x, cardSlot.y, cardSlot.width, cardSlot.height);
				ctx.restore();
			}
		}

		//Draw play slots
		for(const [ playSlotIndex, playSlot ] of this.playSlots.entries()){
			ctx.drawImage(playSlot.image, 610, 70, 670, 950, playSlot.x, playSlot.y, playSlot.width, playSlot.height);
			if(playSlot.card) {
				playSlot.card.x = playSlot.x;
				playSlot.card.y = playSlot.y;
				playSlot.card.isShown = true;
				playSlot.card.render();
			}
			if(playSlotIndex === this.selectedCardIndex && this.selectedCardField === "playSlots") {
				ctx.save();
				ctx.strokeStyle = "orange";
				ctx.lineWidth = 5;
				ctx.strokeRect(playSlot.x, playSlot.y, playSlot.width, playSlot.height);
				ctx.restore();
			}
		}
	}
}

let game = new Game();
let loader = new Loader(game);
loader.init();

//click events
document.addEventListener("click", (e) =>{
	let clickPosition = getMousePos(e);
	game.update(clickPosition, false);
	game.matchCards();
	game.checkIfGameOver();
});

//TODO: Fix double click caused by 2 events when rightclicking("oncontextmenu" is considered a "click" too)
canvas.addEventListener('contextmenu', function(e) {
	e.preventDefault();
	let clickPosition = getMousePos(e);
	game.update(clickPosition, true);
	game.matchCards();
	game.checkIfGameOver();
	return false;
}, false);


//Get mouse position relative to the canvas.
function getMousePos(evt) {
	let rect = canvas.getBoundingClientRect();
	return {
		x: evt.clientX - rect.left,
		y: evt.clientY - rect.top
	};
}

function timestamp() {
	return window.performance && window.performance.now ? window.performance.now() : new Date().getTime();
}

let now, dt,
	last = timestamp();

function frame() {
	now   = timestamp();
	dt    = (now - last) / 1000;    // duration in seconds
	game.render(dt);
	last = now;
	requestAnimationFrame(frame);
}

function saveGame() {
	localStorage.setItem("saveGame", game.topScore);
}

function loadGame(){
	game.topScore = localStorage.getItem("saveGame");
}