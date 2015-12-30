// index.js
// --
// Simple HTTPS server, listening on port 55555 by default
// serves content of /public folder
// registers the /printOrder service
// stores orders in /server/orders folder

// Requires
var https = require('https');
var fs = require('fs');
var express = require('express');
var bodyParser = require('body-parser');
var jade = require('jade');
var pdf = require(__dirname + '/server/js/pdf');
var pdfPrinter = require(__dirname + '/server/js/PDFprinter');

// Config
var ORDER_TEMPLATE_PATH = __dirname + '/server/templates/order.jade';
var ORDERS_RENDERED_PATH = __dirname + '/server/orders';
var KEYS_PATH = __dirname + '/server/keys';


// Init
var app = express();
var renderOrder = jade.compileFile(ORDER_TEMPLATE_PATH);


var credentials = {
    key: fs.readFileSync(KEYS_PATH + '/key.pem'),
    cert: fs.readFileSync(KEYS_PATH + '/cert.pem')
};

// Set a middleware to log out incoming requests
app.use(logger);

// Serve ./public 's content as STATIC resources
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json()); // to support JSON-encoded bodies

// Register services
app.post('/printOrder', printOrder);

// Listen on provided PORT, fallback to port 55555
// app.listen(process.env.PORT || 3000);
// HTTPS variant
https.createServer(credentials, app).listen(process.env.PORT || 55555);
console.log("Server up at https://localhost:" + (process.env.PORT || 55555));


// Functions
// SERVICE: /printOrder
function printOrder(req, res) {
    var json = req.body; // fetch incoming JSON
    console.log("Ready to print the following order:");
    console.log(json);
    try {
        var html = renderOrder(json); // render template

        // (html, path, callback) => generates a pdf from the HTML, saves it in path, call callback(filename)
        // as a callback, we print to default printer
        pdf.run(html, ORDERS_RENDERED_PATH, pdfPrinter.print);
        // celebrate!
        res.type('text/plain');
        res.send('Well done bro!');
    }
    catch(err){
    	console.log("Something went wrong:", err);
    }
}

// MIDDLEWARE: print out to console every incoming request 
function logger(req, res, next) {
    console.log(req.method, req.url);
    next(); // Passing the request to the next handler in the stack.
}