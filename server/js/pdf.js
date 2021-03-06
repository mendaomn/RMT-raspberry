// pdf.js
// Generates a pdf from an html string

// Requires
var phantom = require('phantom');

// Init
var baseId = 'rmt_order_';

exports.run = function(html, path, callback) {
	var today = new Date();
    var id = baseId + today.toLocaleString().replace(/\//g, '-').replace(/ /g, '_') + '.pdf';
    var filepath = path + '/' + id;

    phantom.create(function(ph) {
        ph.createPage(function(page) {
        	// Page config
            page.set('paperSize', {
                width: '6cm',
                height: '12cm',
                margin: {
                    top: '15px',
                    left: '0px',
                    right: '0px'
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
