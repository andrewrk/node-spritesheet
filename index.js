module.exports = Spritesheet;

var Vec2d = require('vec2d').Vec2d
  , fs = require('fs')
  , EventEmitter = require('events').EventEmitter
  , path = require('path')
  , assert = require('assert')
  , util = require('util')
  , Canvas = require('canvas')
  , Image = Canvas.Image

util.inherits(Spritesheet, EventEmitter);
function Spritesheet() {
  EventEmitter.call(this);
  this.sprites = {};
  this.size = new Vec2d(0, 0);
  this.dirty = false;
  this.pending = 0;
  this.pendingCbList = [];
}

Spritesheet.prototype.add = function(file, cb) {
  var self = this;
  var sprite = {
    image: new Image(),
    filename: file,
  };
  self.sprites[file] = sprite;
  pend(self);
  fs.readFile(file, function(err, imgBuffer) {
    if (err) {
      if (cb) {
        cb(err);
      } else {
        self.emit('error', err);
      }
      unpend(self);
      return;
    }
    sprite.image.src = imgBuffer;
    sprite.pos = new Vec2d(0, 0);
    self.dirty = true;
    if (cb) cb();
    unpend(self);
  });
};

Spritesheet.prototype.save = function(file, cb) {
  var self = this;
  self.calculatePositions(function() {
    self.render(file, cb);
  });
};

Spritesheet.prototype.calculatePositions = function(cb) {
  var self = this;
  sync(self, function() {
    if (self.dirty) {
      calculatePositions(self);
      self.dirty = false;
      cb();
    }
  });
};

Spritesheet.prototype.render = function(file, cb) {
  var self = this;
  // render to png
  var canvas = new Canvas(self.size.x, self.size.y);
  var context = canvas.getContext('2d');
  for (var id in self.sprites) {
    var sprite = self.sprites[id];
    context.drawImage(sprite.image, sprite.pos.x, sprite.pos.y);
  }
  var fsOut = fs.createWriteStream(file);
  var pngOut = canvas.createPNGStream();
  pngOut.on('error', next);
  fsOut.on('error', next);
  fsOut.on('close', next);
  pngOut.pipe(fsOut);

  function next(err) {
    if (cb) {
      cb(err);
    } else {
      if (err) self.emit('error', err);
    }
  }
};

function byReverseHeightThenFilename(a, b) {
  var diff = b.image.width - a.image.height;
  if (diff === 0) {
    if (b.filename > a.filename) {
      return 1;
    } else {
      return -1;
    }
  } else {
    return diff;
  }
}

function byXThenY(a, b) {
  var diff = a.x - b.x;
  if (diff === 0) {
    return a.y - b.y;
  } else {
    return diff;
  }
}

function mapToList(map) {
  var list = [];
  for (var id in map) {
    list.push(map[id]);
  }
  return list;
}

function pend(self) {
  self.pending += 1;
}

function unpend(self) {
  self.pending -= 1;
  assert.ok(self.pending >= 0);
  flushCbList(self);
}

function sync(self, cb) {
  self.pendingCbList.push(cb);
  flushCbList(self);
}

function flushCbList(self) {
  if (self.pending === 0) {
    self.pendingCbList.forEach(function(cb) {
      process.nextTick(cb);
    });
    self.pendingCbList = [];
  }
}

function calculatePositions(self) {
  // figure out where to place each image in the sprite sheet
  // sets the .pos such that they are in a spritesheet
  self.size = new Vec2d(0, 0);
  var positions = [];
  var list = mapToList(self.sprites);
  list.forEach(function(sprite, spriteIndex) {
    positions.sort(byXThenY);
    sprite.pos = calcPos();
    var y = sprite.pos.y + sprite.image.height;
    if (y < self.size.y) positions.push(new Vec2d(sprite.pos.x, y));
    var x = sprite.pos.x + sprite.image.width;
    if (x < self.size.x) positions.push(new Vec2d(x, sprite.pos.y));
    self.size.boundMin(sprite.pos.offset(sprite.image.width, sprite.image.height));

    function calcPos() {
      for (var pos_i = 0; pos_i < positions.length; ++pos_i) {
        var pos = positions[pos_i];
        var intersects = calcIntersects();
        if (!intersects) {
          positions.splice(pos_i, 1);
          return pos;
        }
      }
      // expand right
      return new Vec2d(self.size.x, 0);

      function calcIntersects(){
        if (pos.x + sprite.image.width >= self.size.x) {
          return true;
        }
        if (pos.y + sprite.image.height >= self.size.y) {
          return true;
        }
        for (var i = 0; i < spriteIndex; ++i) {
          var placed = list[i];
          if (!(placed.pos.x + placed.image.width <= pos.x ||
                placed.pos.x >= pos.x + sprite.image.width ||
                placed.pos.y + placed.image.height <= pos.y ||
                placed.pos.y >= pos.y + sprite.image.height))
          {
            return true;
          }
        }
        return false;
      }
    }
  });
}
