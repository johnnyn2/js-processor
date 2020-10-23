var fs = require('fs');
var paths = require('./paths');
var JavaScriptObfuscator = require('javascript-obfuscator');
const fetch = require('node-fetch');
const { URLSearchParams } = require('url');

function readAllJsFilesInDirectory (dirname, onFileContent, onError) {
    fs.readdir(dirname, function (err, filenames) {
        if (err) {
            onError(err, dirname);
            return;
        }
        filenames.forEach(function(filename) {
            fs.readFile(dirname + filename, 'utf-8', function(err, content) {
                if (err) {
                    onError(err, filename);
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
        fs.mkdirSync(dist);
        var counter = 1;
        directories.forEach(function (dir) {
            readAllJsFilesInDirectory(dir, async function (filename, content) {
                console.log(counter + '. INFO: Processing ' + filename);

                var obfuscatedJs = JavaScriptObfuscator.obfuscate(content, obfucateOptions).getObfuscatedCode();
                const params = new URLSearchParams();
                params.append('js_code', obfuscatedJs);
                params.append('compilation_level', 'WHITESPACE_ONLY');
                params.append('output_format', 'text');
                params.append('output_info', 'compiled_code');
                fetch('https://closure-compiler.appspot.com/compile', { method: 'POST', body: params })
                    .then(res => { return res.text(); }).then(compiledCode => {
                        fs.writeFile(dist + '/' + filename, compiledCode, function (err) {
                            if (err) throw err;
                            console.log('SUCCESS: ' + filename + ' is obfuscated and minified.');
                        });
                    }).catch(err => console.log('ERROR: Fail to minify ' + filename));
                counter++;
            }, function (err, filename) {
                console.error('ERROR: Fail to process ' + filename);
                throw err;
            })
        });
    }).catch(err => console.log(err));
}


readAllDirectories(paths);