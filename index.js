module.exports = Spritesheet;

var Vec2d = require('vec2d').Vec2d
  , fs = require('fs')
  , path = require('path')
  , Canvas = require('canvas')
  , Image = Canvas.Image

function Spritesheet() {
  this.sprites = {};
  this.spriteList = [];
  this.size = new Vec2d(0, 0);
}

Spritesheet.prototype.add = function(file, cb) {
  var sprite = {
    image: new Image(),
    filename: file,
  };
  this.sprites[file] = sprite;
  this.spriteList.push(sprite);
  fs.readFile(file, function(err, imgBuffer) {
    if (err) return cb(err);
    sprite.image.src = imgBuffer;
    sprite.pos = new Vec2d(0, 0);
    cb();
  });
};

Spritesheet.prototype.save = function(file, cb) {
  this.calculatePositions();
  this.render(file, cb);
};

Spritesheet.prototype.calculatePositions = function() {
  var self = this;
  // figure out where to place each image in the sprite sheet
  // sets the .pos such that they are in a spritesheet
  self.size = new Vec2d(0, 0);
  var positions = [];
  self.spriteList.forEach(function(sprite, spriteIndex) {
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
          var placed = self.spriteList[i];
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
};

Spritesheet.prototype.render = function(file, cb) {
  // render to png
  var canvas = new Canvas(this.size.x, this.size.y);
  var context = canvas.getContext('2d');
  this.spriteList.forEach(function(sprite) {
    context.drawImage(sprite.image, sprite.pos.x, sprite.pos.y);
  });
  var fsOut = fs.createWriteStream(file);
  var pngOut = canvas.createPNGStream();
  pngOut.on('error', cb);
  fsOut.on('error', cb);
  fsOut.on('close', cb);
  pngOut.pipe(fsOut);
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
