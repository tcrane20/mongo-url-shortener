// Reference: http://blog.modulus.io/getting-started-with-mongoose

var http = require('http'),
    express = require('express'),
    bodyParser = require('body-parser'),
    app = express(),
    mongoose = require('mongoose'),
    nextKey = 0;

// Loads index.html inside /client folder
app.use(express.static(__dirname + "/client"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
// Start the server
http.createServer(app).listen(3000);

// Create the website and key schemas--------------------------
var websiteSchema = new mongoose.Schema(
	{
	origUrl: String,
	shortUrl: String,
	views: Number
	},
	{collection: 'website'}
);
var Website = mongoose.model('Website', websiteSchema);

var keySchema = new mongoose.Schema(
	{keyid: Number}, 
	{collection: 'nextkey'}
);
var NextKey = mongoose.model('NextKey', keySchema);
//-------------------------------------------------------------

// Upon connection to MongoDB, generate a key unless one already exists in the database
mongoose.connect("mongodb://localhost/test", function(err, res){
	if (err){
		console.error("FAILED CONNECTING TO MONGODB! ERROR: " + err);
	} else {
		console.log("Connected to MongoDB");
		// Initialize key value, assuming one hasn't been set already
		NextKey.find(function (err, docs){
			// Key does not exist in database
			if (!docs.length){
				var key;
				nextKey = 10 * Math.pow(36, 5);
				key = new NextKey({
					keyid: nextKey
				});
				key.save(function (err){
					if (err){
						console.log("SAVE ERROR: " + err);
					}
				});
			} else { // Key exists
				nextKey = docs[0].keyid;
				// Help to ensure nextKey is indeed an integer
				if (isNaN(nextKey)){
					nextKey = parseInt(nextKey);
				}
			}
		});
	}
});


// Helper function that returns the next key and creates a new one
function getNextKey(){
	// Make copy of nextKey to return
	var aliasKey = nextKey;
	// Generate next key and increase values in database
	var incrNext = Math.floor(Math.random() * 100) + 1;
	nextKey += incrNext;
	// Set the next key value in database
	NextKey.findOneAndUpdate({}, {$set: {keyid: nextKey} }, function(err, res){
			if (err) console.log("ERROR");
		}
	);
	return aliasKey.toString(36);
}


// When user wishes to navigate to a page on the website, most likely a shortened URL
app.get("/:url", function(req, res){
	var url = req.params.url;
	Website.findOneAndUpdate({shortUrl: url}, {$inc: {views: 1}}, function (err, doc){
		if (err){
			console.log("EXIST ERROR: " + err);
		} else if (doc === null){ // Doesn't exist
			res.send("NO URL EXISTS!");
		} else { // Exists, redirect to original URL
			res.redirect(doc.origUrl);
		}
	});
});


// Upon arriving to home page, user is requesting the popular links
app.post("/hits", function(req, res){
	// Finds all the websites and sorts them based on page hits (views)
	Website.find({}, null, {sort: {views: -1}}, function (err, list){
		var i = 0;
		var results = []
		var url;
		// Ensure only a TOP 10 list
		var urls = list.slice(0,10);
		
		for (i; i < list.length; i++){
			url = urls[i];
			// We don't want to show URLs that have 0 hits
			if (url.views > 0){
				results.push(url.shortUrl, url.views)
			} else {
				break;
			}
		}
		res.send(results);
	});
});


// User submits a URL to be shortened or obtain the original URL
app.post("/shorter", function (req, res){
	// Get URL inside textbox
	var url = req.body.url;
	// Gets the address URL of the requester
	var base_url = req.headers.origin;
	// If the user inputted a shortened URL, it should follow the template "#{base_url}/(ALPHA_NUM_CHARS)"
	var base_url_regex = new RegExp(base_url + "\/(.+)");
	// See if the input DOES match the above template (null otherwise)
	var key = url.match(base_url_regex);
	
	// Use regular expression to test if inputted URL is requesting for unshortened URL
	if (key !== null){
		// Get the shorthand key in the URL (should be at index 1 of match() result)
		key = key[1];
		// Return the real URL
		Website.find({shortUrl: key}, function (err, docs){
			if (err){
				console.error(err);
			} else if (!docs.length){
				res.json({'type': '2', 'url': ""});
			} else { // Exists
				res.json({'type': '1', 'url': docs[0].origUrl});
			}
		});
	} else { // Did not match; must be shortening a URL
		// Check if the database doesn't have a key for this URL already
		Website.find({origUrl: url}, function (err, docs){
			if (err){
				console.log("EXIST ERROR: " + err);
			} else if (!docs.length){ // Doesn't exist, make new key
				// Make key, set values in database, and send short URL to user
				key = getNextKey();
				var website = new Website({
					origUrl: url,
					shortUrl: key,
					views: 0
				});
				website.save(function (err){
					if (err){
						console.error(err);
					}
				});
				res.json({'type': '0', 'url': base_url + "/" + key});
			} else { // Exists, return database value
				res.json({'type': '0', 'url': base_url + "/" + docs[0].shortUrl});
			}
		});
	}
});

console.log("Server listening on port 3000...");