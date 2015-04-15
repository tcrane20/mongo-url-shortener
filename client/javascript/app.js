
var main = function () {
    "use strict";

    // Assign action to submit button
    $("input.shortSubmit").on("click", function(event){
        event.preventDefault();
        // Get user's input and sees if it contains http://
        var url = $("input.shortText").val();
        var url_regex = new RegExp("http:\/\/(.+)");
        var match = url.match(url_regex);
        // Website URL is lacking http://, so add it in
        if (match === null){
            url = "http://" + url;
        }
        // Send URL to server
        $.post("/shorter", {"url": url}, function (res){
            var msg;
            // Write message based on server's response
            if (res.type === "0"){ // Get Shortened URL
                msg = "Your URL is shortened to";
            } else if (res.type === "1"){ // Get Original URL
                msg = "The original URL is";
            } else if (res.type === "2"){ // URL doesn't exist
                msg = "This URL is invalid!";
            }
            // Create DOM
            $("input.shortText").val("");
            var $msg = $("<h3>").text(msg);
            var $url = $("<h2>").text(res.url);
            $("div.result").empty().append($msg, $url);
        });
    });

    // Called upon loading the page
    // Get top 10 most popular links
    $.post("/hits", function(res){
        // The website's URL (e.g. http://localhost:3000/)
        var base_url = window.location.href;
        // Populate the table
        for (var i = 0; i < res.length; i += 2){
            var $row = $("<tr>");

            var url = base_url + res[i],
                hits = res[i+1];

            var $url = $("<td>").html("<a href=" + url +">" + url + "</a>"), // Makes URL a hyperlink
                $hits = $("<td>").text(hits);

            $row.append($url, $hits);
            $("table.table").append($row);
        }
    });
};

$(document).ready(main);

