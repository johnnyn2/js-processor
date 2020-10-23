var fs = require('fs');
var paths = require('./paths');
var JavaScriptObfuscator = require('javascript-obfuscator');

function readAllJsFilesInDirectory (dirname, onFileContent, onError) {
    fs.readdir(dirname, function (err, filenames) {
        if (err) {
            onError(err);
            return;
        }
        filenames.forEach(function(filename) {
            fs.readFile(dirname + filename, 'utf-8', function(err, content) {
                if (err) {
                    onError(err);
                    return;
                }
                onFileContent(filename, content);
            })
        })
    });
}

var obfucateOptions = {
    compact: false,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 1,
    numbersToExpressions: true,
    simplify: true,
    shuffleStringArray: true,
    splitStrings: true,
    stringArrayThreshold: 1
};

const dist = './dist';

function removeDist() {
    return new Promise((resolve, reject) => {
        if (fs.existsSync(dist)) {
            fs.rmdir(dist, { recursive: true }, (err) => {
                if (err) 
                    reject(err);
                else
                    resolve();
            })
        }
    })
    
}

function readAllDirectories (directories) {
    const removeDistPromise = removeDist();
    removeDistPromise.then(() => {
        if (!fs.existsSync(dist)) {
            fs.mkdirSync(dist);
            var counter = 1;
            directories.forEach(function(dir) {
                readAllJsFilesInDirectory(dir, function(filename, content) {
                    console.log(counter + '. INFO: Processing ' + filename);
                    var obfuscatedJs = JavaScriptObfuscator.obfuscate(content, obfucateOptions).getObfuscatedCode();
                    fs.writeFile(dist + '/' + filename, obfuscatedJs, function(err) {
                        if (err) throw err;
                        console.log('SUCCESS: ' + filename + ' is obfuscated.');
                    });
                    counter++;
                }, function(err) {
                    console.error('ERROR: Fail to obfuscate');
                    throw err;
                })
            });
        }
    }).catch(err => console.log(err));
}


readAllDirectories(paths);