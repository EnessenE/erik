function timeout(delay) {
    return new Promise(function (resolve, reject) {
        setTimeout(resolve, delay);
    });
}

const config = require("./config.json");
const sql = require("./sql.js");

const configcommands = require("./Commands/configuration.js");
const infocommands = require("./Commands/Info.js");
const musiccommands = require("./Commands/Music.js");

const imdbcommands = require("./Commands/IMDB.js");
const giphycommands = require("./Commands/Giphy.js");

const Discord = require('discord.js');
const client = new Discord.Client();
const token = config.discordtoken;

const OS = require('os');
var fs = require('fs');

var defaultprefix = config.defaultprefix;
var botver = config.botver;
var statusbot = botver + " | " + "/" + "help";
var versioninfo = config.versioninfo;

//inits//

configcommands.init(sql, config);
infocommands.init(config, OS);
imdbcommands.init(config);
musiccommands.init(sql, config, client);
giphycommands.init(config);

//end inits//

var commands = [
    "help", "List of commands.",
    "prefix [new prefix]", "Set a new prefix for the bot.",
    "ping", "Ping of the bot to discord.",
    "you", "Bot info.",
    "serverinfo", "Info about the server.",
    "play [URL/video name]", "Add a youtube video to the queue.",
    "queue", "Show the current queue.",
    "stop", "Stops the bot from playing music and clears the queue.",
    "playtime [seconds]", "Set the max video length for the bot",
    "botcontrol [role name]", "This role can set settings for the bot",
    "skip", "Vote to skip the current song. If you are the one who requested the song then song will be force skipped.",
    "avatar", "Links your avatar",
    "userinfo @[username]", "Get info about your and other discord accounts.",
    "help - API's", "From here we have commands based on a external API",
    "IMDB [movie title]", "Get info about your favorite movie!"
];

console.log(OS.hostname());
client.login(token);

client.on('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    await sendtoadmin("I have been started on: " + OS.hostname() + " - " + botver);
    await sendtoadmin(`Ready to serve on ${client.guilds.size} servers, for ${client.users.size} users.`);
    client.user.setActivity(statusbot);
});

client.on('guildCreate', async guild => {
    sendtoadmin(`Connected to a discord: ` + guild.name + " - " + (guild.memberCount - 1) + " members");
    client.user.setActivity(statusbot);
});

client.on('guildDelete', async guild => {
    sendtoadmin(`Disconnected from a discord: ` + guild.name + " - " + (guild.memberCount - 1) + " members");
});

var admins;

function getadminuser() {
    return new Promise(async function (resolve, reject) {
        var result = [];
        config.admins.forEach(async function (admin) {
            console.log("getting admin user: " + admin.toString());
            var x = await client.fetchUser(admin.toString());
            result.push(x);
        });
        resolve(result);
    })
}

async function sendtoadmin(message) {
    console.log(message);
    if (admins == undefined) {
        admins = await getadminuser();
    }
    console.log("Sending message: " + message.toString());
    admins.forEach(function (admin) {
        admin.send(message.toString());
    });

}

async function getmember(message, user) {
    const botmember = await message.guild.fetchMember(user);
    return botmember;
}

function PermCheck(message, user, roleid) {
    var val = false;
    return new Promise(function (resolve, reject) {
        roletarget = parseInt(roleid);
        message.member.roles.forEach(function (element) {
            if (roletarget == parseInt(element.id)) {
                val = true;
            }
        });
        if (message.member.hasPermission("ADMINISTRATOR")) {
            val = true;
        }
        resolve(val);
    })
}

client.on('message', async message => {
    var message = await message;
    if (message.author != client.user) {
        if (message.channel.type === 'dm') { //dm
            var string = "";
            config.admins.forEach(async function (admin) {
                string += "or <@" + admin + ">";
            });
            message.reply("Hi! I have no functioning commands here. If you want to talk about me contact " + string + ". Or to add me visit " + config.botlink)
        }

        else {
            if (message.guild.available) {
                const user = message.author;

                var out = await sql.getserver(await message.guild.id)
                if (out == false) {//id,servername,members,prefix,owner
                    console.log("Creation of record: " + await sql.create(message.guild.id, message.guild.name, message.guild.memberCount, defaultprefix, await message.guild.ownerID, message.guild.region));
                }
                else {
                    sql.update(message.guild.id, message.guild.name, message.guild.memberCount, await message.guild.ownerID, message.guild.region) //async
                }

                const permmember = await message.channel.permissionsFor(client.user);
                if (user.tag === client.user.tag) {
                    console.log(message.content);
                };
                try {
                    console.log("[" + message.guild.name + "]" + message.author.tag + " - " + message.content);

                    if (user != client.user && permmember.has("SEND_MESSAGES") && !message.author.tag.includes("#0000")) {
                        messageParts = message.content.split(' ');
                        input = messageParts[0].toLowerCase();
                        parameters = messageParts.splice(1, messageParts.length);

                        prefix = await sql.getprefix(message.guild.id);
                        gotroleid = await sql.getvalue(message.guild.id, "PermRole");

                        musiccommands.playlistcheck(client, message);

                        if (input === prefix + "ping") {
                            infocommands.ping(client, message);
                        }
                        else if (input === prefix + "you" || input === prefix + "botinfo") {
                            infocommands.botinfo(client, message);
                        }
                        else if (input === prefix + "prefix") {
                            configcommands.setprefix(client, message, parameters);
                        }
                        else if (input === prefix + "serverinfo") {
                            infocommands.serverinfo(client, message);
                        }
                        else if (input === prefix + "help") {
                            infocommands.help(client, message, commands);
                        }
                        else if (input === prefix + "play") {
                            musiccommands.play(client, message, parameters, permmember);
                        }
                        else if (input === prefix + "stop") {
                            musiccommands.stop(client, message, gotroleid);
                        }
                        else if (input === prefix + "skip") {
                            musiccommands.skip(client, message);
                        }
                        else if (input === prefix + "queue") {
                            musiccommands.queue(client, message);
                        }
                        else if (input === prefix + "imdb") {
                            imdbcommands.search(client, message, parameters);
                        }
                        else if (input === prefix + "giphy") {
                            giphycommands.search(client, message, parameters);
                        }
                        else if (input === prefix + "playtime") {
                            musiccommands.setplaytime(client, message, parameters);
                        }
                        else if (input === prefix + "debug") {
                            message.reply(message.author.id);
                        }
                        else if (input === prefix + "botcontrol") {
                            configcommands.setbotcontrol(message);
                        }
                        else if ((input === prefix + "userinfo") || (input === prefix + "me")) {
                            infocommands.userinfo(client, message);
                        }
                    }
                }
                catch (erro) {
                    console.log(erro);
                    sendtoadmin("Error occured: " + erro);
                }
            }
        }
    }
}
);

function notallowed(command, id) {
    return "You are not allowed to use the " + prefix + command + " command."
}

console.log("Bot has started");
