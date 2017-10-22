/**
 * Created by pawan.venugopal on 10/31/16.
 * Modified by Sasiluk Ruangrongsorakai on 10/22/17.
 */

"use strict";

require('dotenv').config();

var Botkit = require('./lib/Botkit.js');
var os = require('os');
var http = require('http');
var request = require('request');

if (!process.env.clientId || !process.env.clientSecret || !process.env.port) {
    console.log('Error: Specify clientId clientSecret and port in environment');
    process.exit(1);
}

var controller = Botkit.glipbot({
    debug: true
}).configureGlipApp({
    clientId: process.env.clientId,
    clientSecret: process.env.clientSecret,
    redirectUri: process.env.redirectUri,
    apiRoot: process.env.apiRoot,
    accessToken: '',
    subscriptionId: ''
});


var bot = controller.spawn({});

controller.setupWebserver(process.env.port || 3000, function(err, webserver){
    controller.createWebhookEndpoints(webserver, bot,  function () {
        console.log("Online");
    });

    controller.createOauthEndpoints(webserver, bot, function(err, req, res) {
        if(err) {
            res.status(500).send('ERROR: ' + err);
        } else {
            res.send('Success!');
        }
    })

});

controller.hears(['hi','hello'], 'message_received', function (bot, message) {
    bot.reply(message, "Hello!");

});

var ringCentralAuthToken = "U0pDMTFQMDFQQVMwMHxBQUJ0ejd4TS1zVEprZHMxSFhRWGdGRk5UTjV6NldkZzRiRWZMVjVaT0VwUF9QZkozTmczYmVOZjhrNjZiTlUxWnNSNF9QWWRPMEVYNENYQjd4dmJsWHJoOUlvRjhKQk9zYlRUbnJ2enFlcXBkdFdSa3FYcUF2QmQ4N0tiSkhITGhrVVhSTWlhRWlneDhZNi1hU1M3aFRpNU9vcFpuUjlCRnBZVjJ0ZzFTbWw1NVRPZG9pcGszeEM3eVpRZ2lmTXlaQzR8TFhTamVRfEdjYmhnNGhTWWFLNUdKMlkwdVA0LWc";
var allFoodOwners = [];
var allFoodNames = [];
var deliveryPersonName = "";
controller.hears(['lunchbot at '], 'message_received', function (bot, message) {
    console.log("0 message is " + JSON.stringify(message));

    var foodPlace = message.text.split('lunchbot at ');
    request.get(
            "https://platform.devtest.ringcentral.com/restapi/v1.0/glip/persons/" + message.body.creatorId,
            { 
                'auth': 
                    {
                        'bearer': ringCentralAuthToken
                    },
                'json': 
                    {
                        'from':{"phoneNumber":"19045591195"},
                        "to":[{"phoneNumber":"4406660919"}],
                        "text": foodOrderIntro
                    }
            },
            function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    console.log(body);
                    deliveryPersonName = body.firstName;
                    bot.reply(message, deliveryPersonName + ' is getting lunch at **' + foodPlace[1] + '**. Reply with your order now!');
                } else {
                    console.log("error sending text");
                }
            }
        );

});

var maxOrder = 3;
var orderCount = maxOrder;
var foodOrderIntro = "\nHere's the orders: \n";
var foodOrderStyled = "";
controller.hears(['lunchbot '], 'message_received', function (bot, message) {

    var foodOrder = message.text.split('lunchbot ');

    console.log("1 message is " + JSON.stringify(message));

    request.get(
            "https://platform.devtest.ringcentral.com/restapi/v1.0/glip/persons/" + message.body.creatorId,
            { 
                'auth': 
                    {
                        'bearer': ringCentralAuthToken
                    }
            },
            function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    console.log("orderer " + body);
                    var obj = JSON.parse(body);
                    var foodOwner = obj.firstName;
                    console.log("First Name: " + foodOwner);

                    bot.reply(message, '*Confirmed order of ' + foodOrder[1] + ' for ' + foodOwner + "*");

                    allFoodOwners.push(foodOwner);
                    allFoodNames.push(foodOrder[1]);

                    orderCount -= 1;
                    if (orderCount == 0) {

                        for (var i = 0; i < allFoodNames.length; i++) {
                            foodOrderIntro += allFoodOwners[i] + " wants " + allFoodNames[i] + "\n";
                            foodOrderStyled += "\t" + allFoodOwners[i] + " wants **" + allFoodNames[i] + "**\n";
                        }

                        request.post(
                            "https://platform.devtest.ringcentral.com/restapi/v1.0/account/~/extension/~/sms",
                            { 
                                'auth': 
                                    {
                                        'bearer': ringCentralAuthToken
                                    },
                                'json': 
                                    {
                                        'from':{"phoneNumber":"19045591195"},
                                        "to":[{"phoneNumber":"4406660919"}],
                                        "text": foodOrderIntro
                                    }
                            },
                            function (error, response, body) {
                                if (!error && response.statusCode == 200) {
                                    console.log(body);
                                    bot.reply(message, 'Total ' + maxOrder + ' orders have been sent to ' + deliveryPersonName + '! Thanks!');
                                    bot.reply(message, foodOrderStyled);
                                } else {
                                    console.log("error sending text");
                                }
                            }
                        );
                    } else {
                        bot.reply(message, orderCount + ' orders left. Place yours now!');
                    }


                } else {
                    console.log("error geting user id " + error);
                }
            }
        );





});

controller.hears(['smstest'], 'message_received', function (bot, message) {

    request.post(
            "https://platform.devtest.ringcentral.com/restapi/v1.0/account/~/extension/~/sms",
            { 
                'auth': 
                    {
                        'bearer': ringCentralAuthToken
                    },
                'json': 
                    {
                        'from':{"phoneNumber":"19045591195"},
                        "to":[{"phoneNumber":"4406660919"}],
                        "text": foodOrderIntro 
                    }
            },
            function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    console.log(body);
                } else {
                    console.log("error sending text " + error);
                }
            }
        );
});



// var lunchOrder = function(response, convo) {

    
//     controller.storage.users.get(message.user, function(err, user) {
//         if (user && user.name) {
//             bot.reply(message, '@Company, ' + bot.identity + 'is getting lunch at ' + message.text);
//             bot.reply(message, 'Reply if you\'d like to get lunch too!');
//         } else {
//             bot.reply(message, '@Company, Your coworker is getting lunch at ' + message.text);
//             bot.reply(message, 'Reply if you\'d like to get lunch too!');
//         }
//     });


//     convo.ask("What flavor of pizza do you want?", function(response, convo) {
//         convo.say("Awesome.");
//         askSize(response, convo);
//         convo.next();
//     });
// }

function formatUptime(uptime) {
    var unit = 'second';
    if (uptime > 60) {
        uptime = uptime / 60;
        unit = 'minute';
    }
    if (uptime > 60) {
        uptime = uptime / 60;
        unit = 'hour';
    }
    if (uptime != 1) {
        unit = unit + 's';
    }

    uptime = uptime + ' ' + unit;
    return uptime;
}




