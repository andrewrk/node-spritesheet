var Spritesheet = require('../');
var sheet = new Spritesheet();
sheet.add('test/file0.png');
sheet.add('test/file1.png');
sheet.add('test/file2.png');
sheet.add('test/file3.png');
sheet.add('test/file3.png');
sheet.save('test/spritesheet.png');
