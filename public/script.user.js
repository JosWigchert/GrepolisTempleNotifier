// ==UserScript==
// @name         Grepolis Temple Notifier
// @namespace    http://tampermonkey.net/
// @version      2024.0.4
// @description  Monitors the incoming support and attacks on temples
// @author       Jos
// @match        http://*.grepolis.com/game/*
// @match        https://*.grepolis.com/game/*
// @exclude      view-source://*
// @exclude      https://classic.grepolis.com/game/*
// @icon         https://cdn-icons-png.flaticon.com/512/3874/3874511.png
// @updateURL    https://grepolis-temple-notifier.vercel.app/script.meta.js
// @downloadURL  https://grepolis-temple-notifier.vercel.app/script.user.js
// @homepage     https://grepolis-temple-notifier.vercel.app
// @grant		 GM_getValue
// @grant		 GM_setValue
// @grant        unsafeWindow
// @require		 https://ajax.googleapis.com/ajax/libs/jquery/3.6.0/jquery.min.js
// ==/UserScript==

/*******************************************************************************************************************************
 * Global stuff
 *******************************************************************************************************************************/

var uw = unsafeWindow || window;
var $ = uw.jQuery;

const BASE_URL = "https://grepolis-temple-notifier-three.vercel.app";

// ======================================
const settings = {
    send_support_message: true,
    send_attack_message: true,
    discord_support_hook: "[Discord Webhook URL here]",
    discord_attack_hook: "[Discord Webhook URL here]",
    monitor_timeout: 60000,
};

const language = {
    settings: {
        title: "Temple Notifier Settings",
        settings: "Settings",
        send_support_message: "Send support message to Discord",
        send_attack_message: "Send attack message to Discord",
        discord_support_hook: "Discord webhook URL for support messages",
        discord_attack_hook: "Discord webhook URL for attack messages",
        monitor_timeout: "Timeout in milliseconds for checking for new movements",
        save_reload: "Save and reload",
        credits:
            "Made by Jos, please contact me with suggestions or bugs and to add support for your language.",
    },
};
// ======================================

(function () {
    "use strict";
    console.log(
        "%c|= " +
        GM.info.script.name +
        " is active v" +
        GM.info.script.version +
        " (" +
        GM.info.scriptHandler +
        " v" +
        GM.info.version +
        ") =|",
        "color: cyan; font-size: 1em; font-weight: bolder; "
    );

    addSettingsButton();
    loadSettings();

    // delayed start for monitoring
    setTimeout(() => {
        monitor();
    }, 1000);
})();

function addSettingsButton() {
    if (document.getElementById("GTNSettingsButton") == null) {
        //if button not found
        var button = document.createElement("div");
        button.id = "GTNSettingsButton";
        button.className = "btn_settings circle_button";
        var img = document.createElement("div");
        img.style.margin = "6px 0px 0px 5px";
        img.style.background =
            "url(https://cdn-icons-png.flaticon.com/512/3874/3874511.png) no-repeat 0px 0px";
        img.style.width = "22px";
        img.style.height = "22px";
        img.style.backgroundSize = "100%";
        button.style.top = "145px";
        button.style.right = "108px";
        button.style.zIndex = "10000";
        button.appendChild(img);
        document.getElementById("ui_box").appendChild(button);

        // Add open settings menu event
        $("#GTNSettingsButton").click(createSettingsWindow);
    }
}

function loadSettings() {
    settings.send_support_message = GM_getValue("setting_send_support_message", false);
    settings.send_attack_message = GM_getValue("setting_send_attack_message", true);
    settings.discord_support_hook = GM_getValue("setting_discord_support_hook", "[Discord Webhook URL here]");
    settings.discord_attack_hook = GM_getValue("setting_discord_attack_hook", "[Discord Webhook URL here]");
    settings.monitor_timeout = GM_getValue("setting_monitor_timeout", 10000);
}

async function monitor() {
    console.log("Monitoring Temples");

    try {
        await getTempleMovements();
    } catch (error) {
        console.error(error);
    }

    setTimeout(function () {
        monitor();
    }, settings.monitor_timeout + Math.random() * 10000);
}

async function getTempleMovements() {
    const templeCommands = await fetchTempleCommands();
    for (let command of templeCommands) {
        if (command.count_supports > 0 || command.count_attacks > 0) {
            const templeData = await fetchTempleData(command.temple_id);
            console.log(templeData);
            for (let movement of templeData.movements) {
                createTempleMovement(
                    movement.id,
                    command.temple_id,
                    movement.sender_name,
                    movement.origin_town_name,
                    movement.type
                ).then((data) => {
                    if (!data.success) return;
                    if (settings.send_support_message && movement.type === "support") {
                        sendToDiscord(
                            settings.discord_support_hook,
                            `Temple **${movement.destination_town_name}** has received support from **${movement.sender_name}** in town **${movement.origin_town_name}**`
                        );
                    }
                    if (settings.send_attack_message && movement.type.includes("attack")) {
                        sendToDiscord(
                            settings.discord_attack_hook,
                            `Temple **${movement.destination_town_name}** has received attack from **${movement.sender_name}** in town **${movement.origin_town_name}**`
                        );
                    }
                }).catch((error) => {
                    console.warn(error);
                });
            }
        }
    }
}

async function fetchTempleData(templeId) {
    const payload = {
        action_name: "read",
        model_url: "TempleInfo",
        arguments: {
            target_id: templeId,
        },
    };

    var result = undefined;
    await gpAjax.ajaxGet("frontend_bridge", "execute", payload, !0, {
        success: function (da, U) {
            result = U;
        },
        error: function (da, U) {
            console.error(da);
            console.error(U);
        },
    });

    return result;
}

async function fetchTempleCommands() {
    const payload = {
        types: [
            {
                type: "backbone",
            },
        ],
        town_id: Game.townId,
        nl_init: false,
    };

    var result = undefined;
    await gpAjax.ajaxPost("game/data", "get", payload, !0, {
        success: function (da, U) {
            result = U;
        },
        error: function (da, U) {
            console.error(da);
            console.error(U);
        },
    });

    return result.backbone.collections
        .find((item) => item.class_name === "TempleCommands")
        .data.map((item) => item.d);
}

async function createTempleMovement(movementId, templeId, user, town, type) {
    const url = `${BASE_URL}/t`;

    const payload = {
        movementId: movementId,
        templeId: templeId,
        user: user,
        town: town,
        type: type,
    };

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.statusText}`);
    }

    return await response.json();
}

async function sendToDiscord(webhookUrl, message) {
    const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            user: "Grepolis Temple Notifier",
            content: message,
        }),
    });

    if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.statusText}`);
    }

    return await response.json();
}



function createSettingsWindow() {
    var windowExists = false;
    var windowItem = null;
    for (let item of document.getElementsByClassName("ui-dialog-title")) {
        if (item.innerHTML == language.settings.title) {
            windowExists = true;
            windowItem = item;
        }
    }
    if (!windowExists) {
        var wnd = Layout.wnd.Create(
            Layout.wnd.TYPE_DIALOG,
            language.settings.title
        );
    }

    wnd.setContent("");
    for (let item of document.getElementsByClassName("ui-dialog-title")) {
        if (item.innerHTML == language.settings.title) {
            windowItem = item;
        }
    }

    wnd.setHeight(document.body.scrollHeight / 2 + 100);
    wnd.setWidth("800");
    wnd.setTitle(language.settings.title);
    var title = windowItem;
    var frame = title.parentElement.parentElement.children[1].children[4];
    frame.innerHTML = "";
    var html = document.createElement("html");
    var body = document.createElement("div");
    var head = document.createElement("head");
    element = document.createElement("h3");
    element.innerHTML = language.settings.settings;
    body.appendChild(element);
    var list = document.createElement("ul");
    list.style = "overflow-y: scroll;overflow-x: hidden;";
    list.style.height = document.body.scrollHeight / 2 - 100 + "px";
    list.style.paddingBottom = "5px";

    createSettingsCheckbox(
        list,
        settings.send_support_message,
        "setting_send_support_message",
        language.settings.send_support_message
    );
    createSettingsCheckbox(
        list,
        settings.send_attack_message,
        "setting_send_attack_message",
        language.settings.send_attack_message
    );
    list.appendChild(document.createElement("hr"));

    createSettingsTextblock(list, language.settings.discord_support_hook);
    createSettingsTextbox(
        list,
        settings.discord_support_hook,
        "setting_discord_support_hook",
        400
    );
    createSettingsTextblock(list, language.settings.discord_attack_hook);
    createSettingsTextbox(
        list,
        settings.discord_attack_hook,
        "setting_discord_attack_hook",
        400
    );
    list.appendChild(document.createElement("hr"));

    createSettingsTextblock(list, language.settings.monitor_timeout);
    createSettingsTextbox(
        list,
        settings.monitor_timeout,
        "setting_monitor_timeout",
        400,
        "number"
    );
    list.appendChild(document.createElement("hr"));

    var element = document.createElement("p");
    element.innerHTML = "Grepolis Map Enhancer v." + GM_info.script.version;
    element.innerHTML += "<br>" + language.settings.credits;
    element.innerHTML +=
        '<br><p style="font-size: xx-small">contact: <a href="mailto:contact@joswigchert.nl">contact@joswigchert.nl</a> - web: <a href="https://gme.cyllos.dev" tagert="_blank">nogniks.com</a> - <a href="https://gme.cyllos.dev/GrepolisMapEnhancer.user.js" target="_blank">update</a></p>';

    element.style.position = "absolute";
    element.style.bottom = "0";
    element.style.left = "0";
    element.style.marginBottom = "0";
    element.style.lineHeight = "1";
    list.appendChild(element);

    var savebutton = createSettingsButton("settings_reload", language.settings.save_reload); savebutton.style.position = 'absolute'; savebutton.style.bottom = "0"; savebutton.style.right = "0";
    body.appendChild(savebutton);

    body.appendChild(list);

    html.appendChild(head);
    html.appendChild(body);
    frame.appendChild(html);

    // $(".gtncheckbox").click(function () {
    //     swapCheckboxValue(this);
    // });

    $('.gtncheckbox').on('click', function () {
        swapCheckboxValue(this);
    });

    $('.gtntextbox').on('change', function () {
        setTextboxValue(this);
    });

    $('#settings_reload').on('click', function () {
        window.location.reload();
    });

    addMeta("GTNSettings", "ready", "true");

    // $("#settings_reload").click(function(){
    //     GM_setValue('setting_inactiveMin', $('#setting_inactiveMin').val());
    //     GM_setValue('setting_inactiveMax', $('#setting_inactiveMax').val());
    //     GM_setValue('setting_discordhook' + UWGame.world_id, $('#setting_discordhook').val());
    //     if($('#setting_token').val() == "") { GM_setValue('setting_token' + UWGame.world_id, null) }
    //     else if($('#setting_token').val().length == 32){GM_setValue('setting_token' + UWGame.world_id, $('#setting_token').val()) }
    //     if($('#setting_key').val() == "") { GM_setValue('setting_key' + UWGame.world_id, null) }
    //     else if($('#setting_key').val().length == 8){GM_setValue('setting_key' + UWGame.world_id, $('#setting_key').val()) }
    //     window.location.reload();
    // });
}

function addMeta(metaName, attributeName, value) {
    var metaTag = document.createElement("meta");
    metaTag.name = metaName;
    var metaValue = document.createAttribute(attributeName);
    metaValue.value = value;
    metaTag.attributes.setNamedItem(metaValue);

    $("head").prepend(metaTag);
}

function swapCheckboxValue(element) {
    $("#" + element.id).toggleClass("checked");
    settings[element.id] = $(element).hasClass("checked");
    console.log("Setting " + element.id + " to " + $(element).hasClass("checked"));
    GM_setValue(element.id, $(element).hasClass("checked"));
}

function setTextboxValue(element) {
    settings[element.id] = $(element).val();
    console.log("Setting " + element.id + " to " + $(element).val());
    GM_setValue(element.id, $(element).val());
}

function createSettingsButton(id, text) {
    var element = document.createElement("div");
    element.className = "button_new";
    element.id = id;
    element.style.margin = "2px";
    var childElement = document.createElement("div");
    childElement.className = "left";
    element.appendChild(childElement);
    childElement = document.createElement("div");
    childElement.className = "right";
    element.appendChild(childElement);
    childElement = document.createElement("div");
    childElement.className = "caption js-caption";
    childElement.innerHTML = text + '<div class="effect js-effect"></div>';
    element.style.float = "left";
    element.appendChild(childElement);
    return element;
}

function createSettingsCheckbox(list, value, id, description) {
    var checkbox = document.createElement("div");
    checkbox.className = "cbx_icon";
    var caption = document.createElement("div");
    caption.className = "cbx_caption";
    var listitem = document
        .createElement("li")
        .appendChild(document.createElement("div"));
    var state = value ? "checked" : "unchecked";
    listitem.id = id;
    listitem.className = "gtncheckbox checkbox_new " + state;
    caption.innerHTML = description;
    listitem.appendChild(checkbox);
    listitem.appendChild(caption);
    list.appendChild(listitem.parentElement);
}

function createSettingsTextbox(list, setting, id, width, type) {
    var listitem = document.createElement("div");
    listitem.className = "textbox";
    listitem.style.width = width + "px";
    if (setting == null) setting = "";
    listitem.innerHTML =
        '<div class="left"></div><div class="right"></div><div class="middle"><div class="ie7fix"><input tabindex="1" id="' +
        id +
        '" class="gtntextbox" value="' +
        setting +
        '" ' + (type ? 'type="' + type + '"' : '') +
        ' size="10" type="text"></div></div>';
    list.appendChild(listitem);
}

function createSettingsTextblock(list, description) {
    var p = document.createElement("p");
    p.innerHTML = description;
    list.appendChild(p);
}

function maakKleurKiezer(list, setting, id, width) {
    var listitem = document.createElement("div");
    listitem.className = "color";
    listitem.style.width = width + "px";
    if (setting == null) setting = "";
    listitem.innerHTML =
        '<div class="left"></div><div class="right"></div><div class="middle"><div class="ie7fix"><input tabindex="1" class="kleurKiezer" id="' +
        id +
        '" value="' +
        setting +
        '" type="color"></div></div>';
    list.appendChild(listitem);
}
