// pdf.js
// Generates a pdf from an html string

// Requires
var phantom = require('phantom');

// Init
var baseId = 'rmt_order_';

exports.run = function(html, path, callback) {
	var today = new Date();
    var id = baseId + today.toLocaleString().replace(/ /, '_') + '.pdf';
    var filepath = path + '/' + id;

    phantom.create(function(ph) {
        ph.createPage(function(page) {
        	// Page config
            page.set('paperSize', {
                width: '3cm',
                height: '7cm',
                margin: {
                    top: '15px',
                    left: '10px'
                }
            });
            page.set('content', html);
            // Render
            page.render(filepath, function(err) {
                ph.exit();
                if (callback)
                    callback(filepath);
            });
        }); 
    });

};
