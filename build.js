console.log('========= RUNNING BUILD.JS ==========');

var fs = require('fs');
var dotEnv = require('dotenv');
dotEnv.config({ override: true });


// PREPARE
var environmentsDir = './src/environments';

if (!fs.existsSync(environmentsDir)){
    fs.mkdirSync(environmentsDir);
}

// -- ENVIRONMENT FILE
console.log('... starting creating environment.ts');

var content = 'export const environment = {';
content += '\n\tproduction: ' + process.env.PRODUCTION + ',';
content += '\n\tapi: "' + process.env.API + '",';
content += '\n};';

var environmentFilePath = './src/environments/environment.ts';

fs.writeFile(environmentFilePath, content, err => {
  if (err) {
    console.error(err);
  }
});

console.log('success: ', fs.existsSync(environmentFilePath));
// --

// -- PROXY CONF
console.log('... starting creating proxy.conf.json');

var content = '{';
content += '\n\t"/api/*": {';
content += '\n\t\t"target": "' + process.env.API + '",';
content += '\n\t\t"secure": "' + process.env.API.startsWith('https') + '",';
content += '\n\t\t"logLevel": "debug"';
content += '\n\t}';
content += '\n}';

var proxyConfFilePath = './src/proxy.conf.json';

fs.writeFile(proxyConfFilePath, content, err => {
  if (err) {
    console.error(err);
  }
});

console.log('success: ', fs.existsSync(proxyConfFilePath));
// --

console.log(__dirname);
