
var simpleLevelPlan = `
......................
..#................#..
..#..............=.#..
..#.........o.o....#..
..#.@......#####...#..
..#####............#..
......#++++++++++++#..
......##############..
......................`;

var Level = class Level {
  constructor(plan) {
    let rows = plan.trim().split("\n").map(l => [...l]);
    this.height = rows.length;
    this.width = rows[0].length;
    this.startActors = [];

    this.rows = rows.map((row, y) => {
      return row.map((ch, x) => {
        let type = levelChars[ch];
        if (typeof type == "string") return type;
        this.startActors.push(
          type.create(new Vec(x, y), ch));
        return "empty";
      });
    });
  }
}

var State = class State {
  constructor(level, actors, status, lives) {
    this.level = level;
    this.actors = actors;
    this.status = status;
    this.lives = lives;
  }

  static start(level) {
    return new State(level, level.startActors, "playing");
  }

  get player() {
    return this.actors.find(a => a.type == "player");
  }
}

var Vec = class Vec {
  constructor(x, y) {
    this.x = x; this.y = y;
  }
  plus(other) {
    return new Vec(this.x + other.x, this.y + other.y);
  }
  times(factor) {
    return new Vec(this.x * factor, this.y * factor);
  }
}

var Player = class Player {
  constructor(pos, speed) {
    this.pos = pos;
    this.speed = speed;
  }

  get type() { return "player"; }

  static create(pos) {
    return new Player(pos.plus(new Vec(0, -0.5)),new Vec(0, 0));
  }
}

Player.prototype.size = new Vec(1, 1.5);

var Lava = class Lava {
  constructor(pos, speed, reset) {
    this.pos = pos;
    this.speed = speed;
    this.reset = reset;
  }

  get type() { return "lava"; }

  static create(pos, ch) {
    if (ch == "=") {
      return new Lava (pos, new Vec(6, 0));
    } else if (ch == "|") {
      return new Lava(pos, new Vec(0, 6));
    } else if (ch == "v") {
      return new Lava(pos, new Vec(0, 10), pos);
    }else if (ch == "/") {
      return new Lava(pos, new Vec(-6, 6), pos);
    }else if (ch == "\\") {
      return new Lava(pos, new Vec(6, 6),  pos);
    }else if (ch == "H") {
      return new Lava(pos, new Vec(0, -10), pos);
    }
  }
}

var Bala = class Bala {
  constructor(pos, speed, reset) {
    this.pos = pos;
    this.speed = speed;
    this.reset = reset;
  }

  get type() { return "bala"; }

  static create(pos, ch) {
    if (ch == "c") {
      return new Bala(pos, new Vec(35, 0), pos);
    } 
  
}
}
Bala.prototype.size = new Vec(3, 2);
Lava.prototype.size = new Vec(1, 1);

var Coin = class Coin {
  constructor(pos, basePos, wobble) {
    this.pos = pos;
    this.basePos = basePos;
    this.wobble = wobble;
  }

  get type() { return "coin"; }

  static create(pos) {
    let basePos = pos.plus(new Vec(0.2, 0.1));
    return new Coin(basePos, basePos,
                    Math.random() * Math.PI * 2);
  }
}

Coin.prototype.size = new Vec(0.6, 0.6);

var levelChars = {
  ".": "empty", "#": "wall", "+": "lava",
  "@": Player, "o": Coin,
  "=": Lava, "|": Lava, "v": Lava, "/": Lava, "\\": Lava, "H" : Lava, "c":Bala};

var simpleLevel = new Level(simpleLevelPlan);

function elt(name, attrs, ...children) {
  let dom = document.createElement(name);
  for (let attr of Object.keys(attrs)) {
    dom.setAttribute(attr, attrs[attr]);
  }
  for (let child of children) {
    dom.appendChild(child);
  }
  return dom;
}

var DOMDisplay = class DOMDisplay {
  constructor(parent, level) {
    this.dom = elt("div", {class: "game"}, drawGrid(level));
    this.actorLayer = null;
    parent.appendChild(this.dom);
  }

  clear() { this.dom.remove(); }
}

var scale = 45;

function drawGrid(level) {
  return elt("table", {
    class: "background",
    style: `width: ${level.width * scale}px`
  }, ...level.rows.map(row =>
    elt("tr", {style: `height: ${scale}px`},
        ...row.map(type => elt("td", {class: type})))
  ));
}

function drawActors(actors) {
  return elt("div", {}, ...actors.map(actor => {
    let rect = elt("div", {class: `actor ${actor.type}`});
    rect.style.width = `${actor.size.x * scale}px`;
    rect.style.height = `${actor.size.y * scale}px`;
    rect.style.left = `${actor.pos.x * scale}px`;
    rect.style.top = `${actor.pos.y * scale}px`;
    return rect;
  }));
}

DOMDisplay.prototype.syncState = function(state) {
  if (this.actorLayer) this.actorLayer.remove();
  this.actorLayer = drawActors(state.actors);
  this.dom.appendChild(this.actorLayer);
  this.dom.className = `game ${state.status}`;
  this.scrollPlayerIntoView(state);
};

DOMDisplay.prototype.scrollPlayerIntoView = function(state) {
  let width = this.dom.clientWidth;
  let height = this.dom.clientHeight;
  let margin = width / 3;

  // The viewport
  let left = this.dom.scrollLeft, right = left + width;
  let top = this.dom.scrollTop, bottom = top + height;

  let player = state.player;
  let center = player.pos.plus(player.size.times(0.5))
                         .times(scale);

  if (center.x < left + margin) {
    this.dom.scrollLeft = center.x - margin;
  } else if (center.x > right - margin) {
    this.dom.scrollLeft = center.x + margin - width;
  }
  if (center.y < top + margin) {
    this.dom.scrollTop = center.y - margin;
  } else if (center.y > bottom - margin) {
    this.dom.scrollTop = center.y + margin - height;
  }
};

Level.prototype.touches = function(pos, size, type) {
  var xStart = Math.floor(pos.x);
  var xEnd = Math.ceil(pos.x + size.x);
  var yStart = Math.floor(pos.y);
  var yEnd = Math.ceil(pos.y + size.y);

  for (var y = yStart; y < yEnd; y++) {
    for (var x = xStart; x < xEnd; x++) {
      let isOutside = x < 0 || x >= this.width ||
                      y < 0 || y >= this.height;
      let here = isOutside ? "wall" : this.rows[y][x];
      if (here == type) return true;
    }
  }
  return false;
};

State.prototype.update = function(time, keys) {
  let actors = this.actors
    .map(actor => actor.update(time, this, keys));
  let newState = new State(this.level, actors, this.status);

  if (newState.status != "playing") return newState;

  let player = newState.player;
  if (this.level.touches(player.pos, player.size, "lava")) {
    return new State(this.level, actors, "lost");
  }

  for (let actor of actors) {
    if (actor != player && overlap(actor, player)) {
      newState = actor.collide(newState);
      
    }
  }
  return newState;
};

function overlap(actor1, actor2) {
  return actor1.pos.x + actor1.size.x > actor2.pos.x &&
         actor1.pos.x < actor2.pos.x + actor2.size.x &&
         actor1.pos.y + actor1.size.y > actor2.pos.y &&
         actor1.pos.y < actor2.pos.y + actor2.size.y;
}

Lava.prototype.collide = function(state) {
  return new State(state.level, state.actors, "lost");
};
Bala.prototype.collide = function(state) {
  return new State(state.level, state.actors, "lost");
};
let coin = 0;
Coin.prototype.collide = function(state) {
  coin += 100;
  let filtered = state.actors.filter(a => a != this);
  let status = state.status;
  document.getElementById("score").innerHTML = "SCORE: " + (kill + coin + killM) ;
  if (!filtered.some(a => a.type == "coin"))
    status = "won", coin== 0;
  return new State(state.level, filtered, status);
};

Lava.prototype.update = function(time, state) {
  let newPos = this.pos.plus(this.speed.times(time));
  if (!state.level.touches(newPos, this.size, "wall")) {
    return new Lava(newPos, this.speed, this.reset);
  } else if (this.reset) {
    return new Lava(this.reset, this.speed, this.reset);
  } else {
    return new Lava(this.pos, this.speed.times(-1));
  }
};
Bala.prototype.update = function(time, state) {
  let newPos = this.pos.plus(this.speed.times(time));
  if (!state.level.touches(newPos, this.size, "wall")) {
    return new Bala(newPos, this.speed, this.reset);
  } else if (this.reset) {
    return new Bala(this.reset, this.speed, this.reset);
  } else {
    return new Bala(this.pos, this.speed.times(-1));
  }
};

var wobbleSpeed = 8, wobbleDist = 0.07;

Coin.prototype.update = function(time) {
  let wobble = this.wobble + time * wobbleSpeed;
  let wobblePos = Math.sin(wobble) * wobbleDist;
  return new Coin(this.basePos.plus(new Vec(0, wobblePos)),
                  this.basePos, wobble);
};

var playerXSpeed = 8.5;
var gravity = 40;
var jumpSpeed = 20;


Player.prototype.update = function(time, state, keys) {
  let xSpeed = 0;
  if (keys.ArrowLeft) xSpeed -= playerXSpeed;
  if (keys.ArrowRight) xSpeed += playerXSpeed;
  let pos = this.pos;
  let movedX = pos.plus(new Vec(xSpeed * time, 0));
  if (!state.level.touches(movedX, this.size, "wall")) {
    pos = movedX;
  }

  let ySpeed = this.speed.y + time * gravity;
  let movedY = pos.plus(new Vec(0, ySpeed * time));
  if (!state.level.touches(movedY, this.size, "wall")) {
    pos = movedY;
  } else if (keys.ArrowUp && ySpeed > 0) {
    ySpeed = -jumpSpeed;
  } else {
    ySpeed = 0;
  }
  return new Player(pos, new Vec(xSpeed, ySpeed));
};

function trackKeys(keys) {
  let down = Object.create(null);

  function track(event) {
    if (keys.includes(event.key)) {
      down[event.key] = event.type == "keydown";
      event.preventDefault();
    }
  }
    window.addEventListener("keydown", track);
    window.addEventListener("keyup", track);
    down.unregister = () => {
    window.removeEventListener("keydown", track);
    window.removeEventListener("keyup", track);
  };
  return down;
}

function runAnimation(frameFunc) {
  let lastTime = null;
  function frame(time) {
    if (lastTime != null) {
      let timeStep = Math.min(time - lastTime, 100) / 1000;
      if (frameFunc(timeStep) === false) return;
    }
    lastTime = time;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
//funcion de pausa
function runLevel(level, Display) {

  let display = new Display(document.body, level);
  let state = State.start(level);
  let ending = 1;
  let pausa = "start";

  return new Promise(resolve => {
    function escHandler(event) {
      if (event.key != "Escape") return;
      event.preventDefault();
      if (pausa == "stop") {
        pausa = "start";
        runAnimation(frame);
      } else if (pausa == "start") {
        pausa = "stop";
      } else {
        pausa = "start"
      }
    }
    window, addEventListener("keydown", escHandler);
    let arrowKeys = trackKeys(["ArrowLeft", "ArrowRight", "ArrowUp"]);

    function frame(time) {
      if (pausa == "stop") {
        return false;
      }
      state = state.update(time, arrowKeys);
      display.syncState(state);
      if (state.status == "playing") {
        return true;
      } else if (ending > 0) {
        ending -= time;
        return true;
      } else {
        display.clear();
        window.removeEventListener("keydown", escHandler);
        arrowKeys.unregister();
        resolve(state.status);
        return false;
      }
    }
    runAnimation(frame);
  });
};



//funcion principal juego 
async function runGame ( plans, Display )
{
 
  this.lives = 5;
  document.getElementById( "reset" ).addEventListener( "click", () => { document.location.reload(); } );
  this.livesView = document.getElementById( "lives" );
  this.levelView = document.getElementById( "level" );
  for ( let level = 0; level < plans.length && lives > 0;) {
    let status = await runLevel(new Level(plans[level]),
                                Display);

    if ( status == "won" )
    {
      lives++;
      this.livesView.innerHTML = "LIVES: " + this.lives;
      level++;
    this.levelView.innerHTML = "LVL: " + `${ level + 1 }`;
 
    }
    else
    {
      lives--;
      this.livesView.innerHTML = "LIVES: " + this.lives;
     // resetscore(rescore);
    }


 
  }
    if ( lives <= 0 ) {
      show( 'loser' );
    } else  {
      show( 'win' );
    } 
}
//function resetscore ()
//{
//  var rescore = document.getElementById("score").reset();
//}

var container = document.getElementById('container');
setTimeout(function () {
  container.classList.add('cerrar');
  document.body.style.overflowY = "visible";// despueés de cargar le devolvemos el scroll
}, 2000 );

//imagen final 
function oculto( id ) {
  var elemento = document.getElementById( id );
  elemento.style.display = "none";
}

function show( id ) {
  document.getElementById( id ).style.display = 'block';
}
//variables del monstrup
let killM = 0;
var Monster = class Monster {
  constructor( pos, speed, reset ) {
    this.pos = pos;
    this.speed = speed;
    this.reset = reset;
  }

  get type() {
    return "monster";
  }

  static create( pos ) {
    return new Monster( pos.plus( new Vec( 0, -1 ) ), new Vec( 4, 0 ) );
  }

  update( time, state ) {
    let newPos = this.pos.plus( this.speed.times( time ) );
  
    if ( !state.level.touches( newPos, this.size, "wall" ) ) {
      return new Monster( newPos, this.speed, this.reset );
      
    } else {
      return new Monster( this.pos, this.speed.times( -1 ) );
    }
  }
//hitbox monstruo
  collide( state ) {
    let player = state.player;
    killM+=700;
    if ( player.pos.y + player.size.y < this.pos.y + 0.5 ) {
      let filtered = state.actors.filter( a => a != this );
      document.getElementById("score").innerHTML = "SCORE: " + (kill + coin + killM);
      if (!filtered.some(a => a.type == "kill"))
        killM == 0;
      return new State( state.level, filtered, state.status );
      
    } else {
      return new State( state.level, state.actors, "lost" );
    }
  }
}

Monster.prototype.size = new Vec( 5.5, 5 );
levelChars[ "M" ] = Monster;

let kill = 0;
var Enemy = class Enemy {
  constructor( pos, speed, reset ) {
    this.pos = pos;
    this.speed = speed;
    this.reset = reset;
  }
 
  get type() {
    return "enemy";
  }

  static create( pos ) {
    return new Enemy( pos.plus( new Vec( 0, -1 ) ), new Vec( 9, 0 ) );
  }

  update( time, state ) {
    let newPos = this.pos.plus( this.speed.times( time ) );
  
    if ( !state.level.touches( newPos, this.size, "wall" ) ) {
      return new Enemy( newPos, this.speed, this.reset );
      
    } else {
      return new Enemy( this.pos, this.speed.times( -1 ) );
    }
  }

  collide( state ) {
    let player = state.player;
  kill += 250
    if ( player.pos.y + player.size.y < this.pos.y + 0.5 ) {
      let filtered = state.actors.filter( a => a != this );
      document.getElementById("score").innerHTML = "SCORE: " + (kill + coin + killM);
      if (!filtered.some(a => a.type == "kill"))
        kill == 0;
      return new State( state.level, filtered, state.status );
      
    } else {
    
      return new State( state.level, state.actors, "lost" );
    }
  }
}

Enemy.prototype.size = new Vec( 1,1.5 );
levelChars[ "e" ] = Enemy;




  