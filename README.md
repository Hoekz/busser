# Busser

Busser is a node.js middleware for handling `multipart/form-data`, which is primarily used for uploading files. It is written
on top of [busboy](https://github.com/mscdex/busboy) for maximum efficiency and is an alternative to multer.

***NOTE***: Busser should only be used on multipart forms, use bodyParser for other types of forms.

## Installation

```sh
$ npm install --save busser
```

## Usage

Currently, Busser only works with a single file, adding the property `file` to the `request` object.  The `file` property contains 
the following fields:

```javascript
{
    'original': 'upload.ext',//the name of the uploaded file
    'name': 'file.ext',//the name underwhich the file is stored
    'dest': './path/to/dir/',//the directory where the file is stored
    'path': 'full/path/to/file/file.ext'//the full path to the file
}
```

This information given so that you can update references or store the file location in a database.  The actual file storage is handled
by the middleware.

It is possible to use Busser with the given default settings:

```javascript
{
    filter: defaultFilter,//allows all files
    name: defaultName,//generates a new unique name for the file, preserving extension
    dest: defaultDest,//returns the location './uploads/'
    fieldname: 'file',//the fieldname to look for in the form
    sizeLimit: Math.pow(2, 25),//limits files to 32mb, can easily be changed
    mimeReg: /.*/ //allows all mimetypes, currently checked by regular expression
}
```

A basic usage example:

```javascript
var express = require('express');
var busser = require('busser');

var router = express.Router();

var handleUpload = busser({
   fieldname: 'image',//look for the field 'image'
   sizeLimit: Math.pow(2, 20),//limit to 1mb
   mimeReg: busser.regex.image//limit to images
});

router.post('/upload-image', handleUpload, function(req, res){
   res.jsonp({
      success: req.file.original + ' stored.'
   });
});
```

To handle the errors more gracefully than allowing them to be formatted by Express, call the handler yourself:

```javascript
router.post('/upload-image', function(req, res, next){
    handleUpload(req, res, function(err){
        if(err){
            res.jsonp({
                error: err.message
            });
        }else{
            next();
        }
    });
}, function(req, res){
    res.jsonp({
        success: req.file.original + ' stored.'
    });
});
```
## Options

Currently, the options available are:

Key | Type | Description
--- | --- | ---
fieldname | String | name of the field in the form to look for. Throws error if not found, or if a file is found under a different name
mimeReg | String or RegExp | mimetype of the file. Throws error if no match is found. Some RegExp are provided on the busser.regex object
sizeLimit | Number (bytes) | size of the file. Throws error if file is too big. Some size are provided on the busser.size object
filter | Function(req, file, next) | filter for file.  Throws error if next is not called with a truthy value
dest | Function(req, file, next) | destination folder for file. Default passes './uploads/' to next
name | Function(req, file, next) | name to store file as. Default passes a unique name with extension preserved to next

Which are run in this order as well (meaning failure will result first from fieldname, then mimetype, etc.).

`filter`, `dest`, and `name` are each passed the `request` object, an object describing the file, and the next function to continue execution. 
The file object can be described as such:

```javascript
{
    'filename': 'upload.ext',//the name of the uploaded file
    'file': <ReadStream>,//the stream of the file
    'encoding': 'utf8',//the encoding of the file
    'mimetype': 'type/ext'//tye mimetype of the file
}
```

## Provided shortcuts

```javascript
busser.regex = {
    'image': /^image\// //'image/png','image/jpg', etc.
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
```

## Future

I did this for a school project when I had a lot of trouble getting multer to work the way I wanted it to. Hopefully I'll be able to
keep updating it to support multiple files with multiple configurations.  In the mean time, this should work well alongside bodyParser
for single file uploads, like profile pictures or code files.
