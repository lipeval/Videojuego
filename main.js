
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

class Level {
  constructor(plan) {
    var rows = plan.trim().split("\n").map(l => [...l]);
    this.height = rows.length;
    this.width = rows[0].length;
    this.startActors = [];

    this.rows = rows.map((row, y) => {
      return row.map((ch, x) => {
        var type = levelChars[ch];
        if (typeof type == "string") return type;
        this.startActors.push(
          type.create(new Vec(x, y), ch));
        return "empty";
      });
    });
  }
}

class State {
    constructor(level, actors, status) {
      this.level = level;
      this.actors = actors;
      this.status = status;
    }
  
    static start(level) {
      return new State(level, level.startActors, "playing");
    }
  
    get player() {
      return this.actors.find(a => a.type == "player");
    }
  }

  class Vec {
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

  class Player {
    constructor(pos, speed) {
      this.pos = pos;
      this.speed = speed;
    }
  
    get type() { 
      return "player"; 
    }
  
    static create(pos) {
      return new Player(pos.plus(new Vec(0, -0.5)),
                        new Vec(0, 0));
    }
  }
  
  Player.prototype.size = new Vec(0.7, 1.5);

  class Lava {
    constructor(pos, speed, reset) {
      this.pos = pos;
      this.speed = speed;
      this.reset = reset;
    }
  
    get type() { return "lava"; }
  
    static create(pos, ch) {
      if (ch == "=") {
        return new Lava(pos, new Vec(2, 0));
      } else if (ch == "|") {
        return new Lava(pos, new Vec(0, 2));
      } else if (ch == "v") {
        return new Lava(pos, new Vec(0, 3), pos);
      }
    }
  }
  
  Lava.prototype.size = new Vec(0.6, 1);

  class Coin {
    constructor(pos, basePos, wobble) {
      this.pos = pos;
      this.basePos = basePos;
      this.wobble = wobble;
    }
  
    get type() { return "coin"; }
  
    static create(pos) {
      var basePos = pos.plus(new Vec(0.2, 0.1));
      return new Coin(basePos, basePos,
                      Math.random() * Math.PI * 2);
    }
  }
  
  Coin.prototype.size = new Vec(0.5, 0.5);

  const levelChars = {
    ".": "empty", "#": "wall", "+": "lava",
    "@": Player, "o": Coin,
    "=": Lava, "|": Lava, "v": Lava
  };

  var simpleLevel = new Level(simpleLevelPlan);
console.log(`${simpleLevel.width} by ${simpleLevel.height}`);

function elt(name, attrs, ...children) {
    var dom = document.createElement(name);
    for (let attr of Object.keys(attrs)) {
      dom.setAttribute(attr, attrs[attr]);
    }
    for (let child of children) {
      dom.appendChild(child);
    }
    return dom;
  }

  class DOMDisplay {
    constructor(parent, level) {
      this.dom = elt("div", {class: "game"}, drawGrid(level));
      this.actorLayer = null;
      parent.appendChild(this.dom);
    }
  
    clear() { this.dom.remove(); }
  }

  const scale = 18;

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
      var rect = elt("div", {class: `actor ${actor.type}`});
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
    var width = this.dom.clientWidth;
    var height = this.dom.clientHeight;
    var margin = width / 3;
  
    var left = this.dom.scrollLeft, right = left + width;
    var top = this.dom.scrollTop, bottom = top + height;
  
    var player = state.player;
    var center = player.pos.plus(player.size.times(0.5))
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
        var isOutside = x < 0 || x >= this.width ||
                        y < 0 || y >= this.height;
        var here = isOutside ? "wall" : this.rows[y][x];
        if (here == type) return true;
      }
    }
    return false;
  };

  State.prototype.update = function(time, keys) {
    var actors = this.actors
      .map(actor => actor.update(time, this, keys));
    var newState = new State(this.level, actors, this.status);
  
    if (newState.status != "playing") return newState;
  
    var player = newState.player;
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
  
  Coin.prototype.collide = function(state) {
    var filtered = state.actors.filter(a => a != this);
    var status = state.status;
    if (!filtered.some(a => a.type == "coin")) status = "won";
    return new State(state.level, filtered, status);
  };

  Lava.prototype.update = function(time, state) {
    var newPos = this.pos.plus(this.speed.times(time));
    if (!state.level.touches(newPos, this.size, "wall")) {
      return new Lava(newPos, this.speed, this.reset);
    } else if (this.reset) {
      return new Lava(this.reset, this.speed, this.reset);
    } else {
      return new Lava(this.pos, this.speed.times(-1));
    }
  };

  const wobbleSpeed = 20, wobbleDist = 0.14;

Coin.prototype.update = function(time) {
  var wobble = this.wobble + time * wobbleSpeed;
  var wobblePos = Math.sin(wobble) * wobbleDist;
  return new Coin(this.basePos.plus(new Vec(0, wobblePos)),
                  this.basePos, wobble);
};

var playerXSpeed = 8;
var gravity = 28;
var jumpSpeed = 16;

Player.prototype.update = function(time, state, keys) {
  var xSpeed = 0;
  if (keys.ArrowLeft) xSpeed -= playerXSpeed;
  if (keys.ArrowRight) xSpeed += playerXSpeed;
  var pos = this.pos;
  var movedX = pos.plus(new Vec(xSpeed * time, 0));
  if (!state.level.touches(movedX, this.size, "wall")) {
    pos = movedX;
  }

  var ySpeed = this.speed.y + time * gravity;
  var movedY = pos.plus(new Vec(0, ySpeed * time));
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
    var down = Object.create(null);
    function track(event) {
      if (keys.includes(event.key)) {
        down[event.key] = event.type == "keydown";
        event.preventDefault();
      }
    }
    window.addEventListener("keydown", track);
    window.addEventListener("keyup", track);
    return down;
  }
  
  var arrowKeys =
    trackKeys(["ArrowLeft", "ArrowRight", "ArrowUp"]);

    function runAnimation(frameFunc) {
        var lastTime = null;
        function frame(time) {
          if (lastTime != null) {
            var timeStep = Math.min(time - lastTime, 100) / 800;
            if (frameFunc(timeStep) === false) return;
          }
          lastTime = time;
          requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
      }

      function runLevel(level, Display) {
        var display = new Display(document.body, level);
        var state = State.start(level);
        var ending = 1;
        return new Promise(resolve => {
          runAnimation(time => {
            state = state.update(time, arrowKeys);
            display.syncState(state);
            if (state.status == "playing") {
              return true;
            } else if (ending > 0) {
              ending -= time;
              return true;
            } else {
              display.clear();
              resolve(state.status);
              return false;
            }
          });
        });
      }

      async function runGame(plans, Display) {
        for (let level = 0; level < plans.length;) {
          var status = await runLevel(new Level(plans[level]),
                                      Display);
          if (status == "won") level++;
        }
        console.log("Has rescatado a todos los Crios :) !!");
      }

      function runGame(plans, Display) {
        function startLevel(n) {
          runLevel(new Level(plans[n]), Display, function(status) {
            if (status == "lost")
              startLevel(n);
            else if (n < plans.length - 1)
              startLevel(n + 1);
            else
              console.log("You win!");
          });
        }
        startLevel(0);
      }