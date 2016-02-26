// index.js
// --
// Simple HTTPS server, listening on port 55555 by default
// serves content of /public folder
// registers the /printOrder service
// registers the /printInvoice service
// registers the /today service
// stores orders in /server/orders folder
// stores invoices in /server/invoices folder
// stores JSON invoices in /server/storage folder

// Requires
var https = require( 'https' );
var fs = require( 'fs' );
var jsonfile = require( 'jsonfile' );
var express = require( 'express' );
var bodyParser = require( 'body-parser' );
var jade = require( 'jade' );
var pdf = require( __dirname + '/server/js/pdf' );
var pdfPrinter = require( __dirname + '/server/js/PDFprinter' );

// Config
var ORDER_BAR_TEMPLATE_PATH = __dirname + '/server/templates/order_bar.jade';
var ORDER_KITCHEN_TEMPLATE_PATH = __dirname + '/server/templates/order_kitchen.jade';
var INVOICE_TEMPLATE_PATH = __dirname + '/server/templates/invoice.jade';
var ORDERS_BAR_RENDERED_PATH = __dirname + '/server/orders/bar';
var ORDERS_KITCHEN_RENDERED_PATH = __dirname + '/server/orders/kitchen';
var INVOICES_RENDERED_PATH = __dirname + '/server/invoices';
var LOCAL_STORAGE_PATH = __dirname + '/server/storage';
var KEYS_PATH = __dirname + '/server/keys';
// Printer names
var PRINTER_CASHIER = 'Bar';
var PRINTER_BAR = 'Bar';
var PRINTER_KITCHEN = 'Bar';

// Init
var app = express();
var renderBarOrder = jade.compileFile( ORDER_BAR_TEMPLATE_PATH );
var renderKitchenOrder = jade.compileFile( ORDER_KITCHEN_TEMPLATE_PATH );
var renderInvoice = jade.compileFile( INVOICE_TEMPLATE_PATH );


var credentials = {
    key: fs.readFileSync( KEYS_PATH + '/key.pem' ),
    cert: fs.readFileSync( KEYS_PATH + '/cert.pem' )
};

// Set a middleware to log out incoming requests
app.use( logger );

// Serve ./public 's content as STATIC resources
app.use( express.static( __dirname + '/public' ) );
app.use( bodyParser.json() ); // to support JSON-encoded bodies

// Register services
app.post( '/printOrder', printOrder );
app.post( '/printInvoice', printInvoice );
app.get( '/today', getTodaysIncome );

// Listen on provided PORT, fallback to port 55555
// app.listen(process.env.PORT || 3000);
// HTTPS variant
https.createServer( credentials, app ).listen( process.env.PORT || 55555 );
console.log( "Server up at https://localhost:" + ( process.env.PORT || 55555 ) );


// Functions
// SERVICE: /printOrder
function printOrder( req, res ) {
    var json = req.body; // fetch incoming JSON
    console.log( "Ready to print the following order:" );
    console.log( json );
    try {
        var barHtml = renderBarOrder( json ); // render template
        var kitchenHtml = renderKitchenOrder( json ); // render template

        // (html, path, callback) => generates a pdf from the HTML, saves it in path, call callback(filename)
        // as a callback, we print to default printer
        pdf.run( barHtml, ORDERS_BAR_RENDERED_PATH, printToBar );
        pdf.run( kitchenHtml, ORDERS_KITCHEN_RENDERED_PATH, printToKitchen );
        // celebrate!
        res.type( 'text/plain' );
        res.send( 'Well done bro!' );
    } catch ( err ) {
        console.log( "Something went wrong:", err );
    }
}

// SERVICE: /printInvoice
function printInvoice( req, res ) {
    var json = req.body; // fetch incoming JSON
    console.log( "Ready to print the following invoice:" );
    console.log( json );
    try {
        var html = renderInvoice( json ); // render template

        // (html, path, callback) => generates a pdf from the HTML, saves it in path, call callback(filename)
        // as a callback, we print to default printer
        pdf.run( html, INVOICES_RENDERED_PATH, printToCashier );

        // Store locally for future analysis
        storeLocally( Object.assign( json ) );

        // celebrate!
        res.type( 'text/plain' );
        res.send( 'Well done bro!' );
    } catch ( err ) {
        console.log( "Something went wrong:", err );
    }
}

// SERVICE: /today
function getTodaysIncome( req, res ) {
    var income = readLocally()
        .filter( isTodaysInvoice ) // is this invoice between 5am - 5am 
        .reduce( function( income, obj ) {
            return income + obj.total;
        }, 0 );

    console.log( "Total income", income );
    res.type( 'text/plain' );
    res.send( 'Serata: ' + income + '€' );
}

// UTILITY: does invoice belong to today's work session?
function isTodaysInvoice( invoice ) {
    // Today
    var today = new Date(),
        todayHours = today.getHours(),
        todayDateString = today.toDateString();

    // Invoice
    var invoiceDate = new Date( invoice.date ),
        invoiceHours = invoiceDate.getHours(),
        invoiceDateString = invoiceDate.toDateString();

    if ( invoiceDateString === todayDateString ) {
        return ( todayHours < 5 ) && ( invoiceHours < 5 ) ||
            ( todayHours >= 5 ) && ( invoiceHours >= 5 );
    } else if ( invoiceDate.getYear() === today.getYear() && invoiceDate.getMonth() === today.getMonth() ) {
        return ( todayHours < 5 ) && ( invoiceHours >= 5 ) && ( today.getDay() === invoiceDate.getDay() - 1 )
    }
}

// UTILITY: store locally
function storeLocally( object ) {
    var today = new Date();
    var id = 'invoice_' + today.toLocaleString().replace( /\//g, '-' ).replace( / /g, '_' ) + '.json';
    var filepath = LOCAL_STORAGE_PATH + '/' + id;
    var toBeStored = Object.assign( object );

    toBeStored.date = today.toLocaleString();

    jsonfile.writeFile( filepath, toBeStored, function( err ) {
        console.error( err );
    } );
}

// UTILITY: read locally
function readLocally() {
    return fs.readdirSync( LOCAL_STORAGE_PATH )
        .map( function( filename ) {
            var filepath,
                obj;

            filepath = LOCAL_STORAGE_PATH + '/' + filename;
            obj = jsonfile.readFileSync( filepath, {
                throws: false
            } );

            return obj;
        } );
}

// UTILITY: print to cashier
function printToCashier( filename ) {
    pdfPrinter.print( filename, PRINTER_CASHIER );
}

// UTILITY: print to bar
function printToBar( filename ) {
    pdfPrinter.print( filename, PRINTER_BAR );
}

// UTILITY: print to kitchen
function printToKitchen( filename ) {
    pdfPrinter.print( filename, PRINTER_KITCHEN );
}

// FUNCTIONAL UTILITIES:
// Combine functions, execute them from left to right
function fp_combine() {
    var scope = arguments;

    return function( arg ) {
        for ( var i = scope.length - 1; i >= 0; i-- ) {
            scope[ i ]( arg );
        }
    }
}

// MIDDLEWARE: print out to console every incoming request 
function logger( req, res, next ) {
    console.log( req.method, req.url );
    next(); // Passing the request to the next handler in the stack.
}
