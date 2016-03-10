var BusBoy = require('busboy');
var crypto = require('crypto');
var path = require('path');
var fs = require('fs');

var root = process.cwd();

function defaultFilter(req, file, next){
    next(true);
}

function defaultName(req, file, next){
    crypto.pseudoRandomBytes(16, function (err, raw) {
        next(raw.toString('hex') + Date.now() + path.extname(file.filename));
    });
}

function defaultDest(req, file, next){
    next('./uploads/');
}

var defaultFieldname = 'file';
var defaultSizeLimit = Math.pow(2, 25);//32mb
var defaultMimeReg = /.*/;

var busser = function(options){
    if(typeof options != 'object') return module.exports({});
    options.filter = options.filter || defaultFilter;
    options.name = options.name || defaultName;
    options.dest = options.dest || defaultDest;
    options.fieldname = options.fieldname || defaultFieldname;
    options.sizeLimit = options.sizeLimit || defaultSizeLimit;
    options.mimeReg = options.mimeReg || defaultMimeReg;
    var finished = false;
    return function(req, res, next){
        var bb = new BusBoy({
            headers: req.headers,
            limits: {
                fileSize: options.sizeLimit
            }
        });
        bb.on('file', function(fieldname, file, filename, encoding, mimetype){
            if(fieldname != options.fieldname){
                file.resume();
                finished = true;
                next(new Error('file fieldname mismatch: ' + fieldname + ' != '  + options.fieldname));
            }else if(!mimetype.match(options.mimeReg)){
                file.resume();
                finished = true;
                next(new Error('file mimetype mismatch: ' + mimetype + ' does not match ' + options.mimeReg));
            }else if(req.headers['content-length'] > options.sizeLimit){
                file.resume();
                finished = true;
                next(new Error('file too large: ' + req.headers['content-length'] + ' greater than ' + options.sizeLimit));
            }else{
                var data = {
                    filename: filename,
                    file: file,
                    encoding: encoding,
                    mimetype: mimetype
                };

                var dest = function(cont){
                    if(cont){
                        options.dest(req, data, name);
                    }else{
                        file.resume();
                        finished = true;
                        next(new Error('file failed to pass filter'));
                    }
                };

                var name = function(dest){
                    options.name(req, data, function(name){
                        var loc = path.resolve(root, dest, name);
                        req.file = {
                            original: filename,
                            name: name,
                            path: loc,
                            dest: dest
                        };
                        file.pipe(fs.createWriteStream(loc));
                    });
                };

                options.filter(req, data, dest);
            }
        });
        bb.on('finish', function(){
            if(!finished) next();
            finished = true;
        });
        req.pipe(bb);
    };
};

busser.regex = {
    'image': /^image\/.*$/ //'image/png','image/jpg', etc.
}

busser.size = {
    kb: function(n){
        return n * Math.pow(2, 10);
    },
    mb: function(n){
        return n * Math.pow(2, 20);
    },
    gb: function(n){
        return n * Math.pow(2, 30);
    }
}

module.exports = busser;