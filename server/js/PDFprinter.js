// PDFprinter.js
// Takes a file path and prints the file to default printer

var printer = require( 'printer' );
var fs = require( 'fs' );

exports.print = function( filename, printerName ) {
    printer.printFile( {
        printer: 'PDF',
        filename: filename,
        success: function( jobID ) {
            console.log( "ID: " + jobID );
        },
        error: function( err ) {
            console.log( 'printer module error: ' + err );
            // throw err;
        }
    } );
};
