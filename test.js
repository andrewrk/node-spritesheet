var assert = require('assert');
var Spritesheet = require('./');
var sheet = new Spritesheet();
sheet.add('file1.png', function(err) {
  assert.ifError(err);
  sheet.add('file2.png', function(err) {
    assert.ifError(err);
    sheet.save('spritesheet.png', function(err) {
      assert.ifError(err);
      console.log(sheet.sprites);
    });
  });
});
