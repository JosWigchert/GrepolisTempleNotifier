// ==UserScript==
// @name         Grepolis Map Enhancer
// @author       Cyllos
// @description  Grepolis Map Enhancer by Cyllos
// @include      http://*.grepolis.com/game/*
// @include      https://*.grepolis.com/game/*
// @exclude      view-source://*
// @exclude      https://classic.grepolis.com/game/*
// @updateURL    https://gme.cyllos.dev/GrepolisMapEnhancer.meta.js
// @downloadURL  https://gme.cyllos.dev/GrepolisMapEnhancer.user.js
// @version      2024.3.8.2
// @homepage     https://gme.cyllos.dev/
// @grant GM_setValue
// @grant GM_getValue
// @grant unsafeWindow
// @require https://ajax.googleapis.com/ajax/libs/jquery/1.12.4/jquery.min.js
// @require https://cdnjs.cloudflare.com/ajax/libs/crypto-js/3.1.2/rollups/aes.js
// @require https://cdnjs.cloudflare.com/ajax/libs/crypto-js/3.1.2/rollups/sha1.js
// ==/UserScript==

/* Bedankt voor de hulp, de suggesties of vertalingen:
 * 
 * KapteniZ
 * Psychevora
 * Frietebakker
 * Doctor Brzeszczot
 * Renier van Loon
 *
 */

// zet globale variabelen
var idleList = {};
var koloSet = false;
var startTime = 0;
var totalTime = 0;
var settings = {};
var i = 0;
var UWGame = unsafeWindow.Game;
unsafeWindow.UWGame = UWGame;
var taglijst = null;
var BDAlarmTimeout = false;
var aanvalTimeout = false;
var BDAlarmAudio = new Audio( 'https://gme.cyllos.dev/res/boerendorpen.mp3' );
var aanvalscount = 0;

let vertaling = {
    startbericht: "Starting Grepolis Map Enhancer, version ",
    geladenbericht: "Map Enhancer started succesfully!",
    discordlinkdefaulttekst: "[place your discord webhook here]",
    taglijstontbreekt: "taglist not found",
    tagedit: "GME tag of ",
    opslaan: "Save",
    verwijderen: "Delete",
    aanval: "attack",
    verdediging: "defense",
    van: " from",
    door: " by",
    aankomst: "arriving",
    gmesettings: "Map Enhancer settings",
    instellingen: "Settings",
    oceaancijfers: "Duller ocean digits (GRCRT) on map",
    customtags: "Enable custom tags",
    customtags_kaart: "Display custom tags on map",
    alliantietags: "Display alliance tags on map",
    spelertags: "Display playertags on map",
    tagkleuren: "Match color of tags with flag",
    swag: "Add some swag",
    commandoscherm: "Keep commands open",
    forumkleuren: "Display colors on the forum",
    aankomsttijd: "Show command arrival time",
    terugtrektijd: "Show max retreat time of command",
    inactieven: "Mark inactive players on the map",
    inactiefvanaf: "Only show players offline for at least ",
    totmax: " days to maximum ",
    dageninactief: " days.",
    discordknop: "Show discord button",
    synctags: "Synchronize custom tags between devices and players by sharing the following token and key. You can generate a new token or remove it to disable syncing.",
    gentoken: "Generate token",
    verwijdertoken: "Remove token",
    opslaanherladen: "Save and reload",
    exporteer: "Export ",
    tags: " tags",
    credits: "Made by cyllos, please contact me to add support for your language.",
    tagsgekopieerd: "Tags copied to clipboard",
    vertaling: "en",
    gedeeldetoken: "shared token",
    gedeeldekey: "shared key",
    verbodentag: "You cannot use this tag. Only use a-z, 0-9, ., :, ?, [, ], (, or )",
    boerendorpalarm: "Play sound when farming claim ready",
    aanvalsindicator: "Change tab icon on incoming attack",
    importeer: "Import tags",
    nieuwetag: "Creating new tag",
    plakexport: "Paste exported tags here",
    importverwerken: "Processing import",
    helena: "Let Helena shine",
    speler: "Player",
    kills: "Kills"
};
(
    function () { // functie die het script opstart
        console.log("GME: " + vertaling.startbericht + GM_info.script.version); // toon startbevestiging van het script in console
        laadVertalingen(); // haal scriptvertalingen op
        laadSettings(); // laad de settings van de gebruiker
        laadCSS(); // voeg custom css toe
        laadCustomTagsVanServer(); // haal custom tags op van de server
        getTagsOpKaart(); // start het toevoegen van tags op de kaart
        console.log(vertaling.geladenbericht); // toon bevestiging van het laden van het script in console
        wachtDocumentKlaarEnLaadVerder(); // wacht tot het spel geladen is om verder te gaan
    }
)()

function wachtDocumentKlaarEnLaadVerder(){
  // Kijk of het document klaar is en of alles wat we nodig hebben geladen is
  var interval = setInterval(function() {
      if(document.readyState === 'complete' && $(".tb_activities.toolbar_activities .middle")[0]) {
          clearInterval(interval); // stop met het uitvoeren van deze functie

          laadBDAlarm();
          voegSettingsIcoonToe(); // voeg de instelling knop toe
          checkInkomendeAanvallen();
          updateBDAlarmCounter();

          // voeg een observer toe die kijkt of er nieuwe vensters zijn
          var bodyobserver = new MutationObserver(function(mutations) { indienBodyGewijzigd()});
          bodyobserver.observe(document.getElementsByTagName("body")[0], {childList: true});

          var commandListObserver = new MutationObserver(function(mutations) { checkTijden()});
          commandListObserver.observe(document.getElementById("toolbar_activity_commands_list"), {attributes: true, subtree:true});

          addMeta("GMEToken", "token", settings.token);
          addMeta("GMEKey", "key", settings.key);

          // kijk voor periodieke wijzigingen // te verwijderen op termijn
          observe();
      }
  }, 100);
}

function laadSettings(){	// laad de settings van de gebruiker zijn browser
    // haalt de setting en indien deze niet bestaat, de default value
    settings.token = GM_getValue("setting_token" + UWGame.world_id, null);
    settings.key = GM_getValue("setting_key" + UWGame.world_id, null);
    settings.oceaannummer = GM_getValue('setting_oceaannummer', true);
    settings.inactive = GM_getValue('setting_inactive', true);
    settings.inactiveMin = GM_getValue('setting_inactiveMin', 1);
    settings.inactiveMax = GM_getValue('setting_inactiveMax', 10);
    settings.colors = GM_getValue('setting_colors', true);
    settings.boerendorpalarm = GM_getValue('setting_boerendorpalarm', false);
    settings.aanvalsindicator = GM_getValue('setting_aanvalsindicator', true);
    settings.tijden = GM_getValue('setting_tijden', true);
    settings.terugTrek = GM_getValue('setting_terugTrek', true);
    settings.tags = GM_getValue('setting_tags', true);
    settings.customtags = GM_getValue('setting_customtags', true);
    settings.customtags_kaart = GM_getValue('setting_customtags_kaart', true);
    settings.support = GM_getValue('setting_support', false);
    settings.playertag = GM_getValue('setting_playertag', false);
    settings.tagkleuren = GM_getValue('setting_tagkleuren', true);
    settings.swag = GM_getValue('setting_swag', true);
    settings.helena = GM_getValue('setting_helena', true);
    settings.commandoopen = GM_getValue('setting_commandoopen', false);
    settings.discord = GM_getValue('setting_discord', true);
    settings.discordhook = GM_getValue('setting_discordhook' + UWGame.world_id, vertaling.discordlinkdefaulttekst);
}

function indienBodyGewijzigd(){
    // indien er een stadsinfo scherm is, toon dan het tag edit knopje
    if($(".gpwindow_content")) toonTagEditKnopje();
    updateCustomTagsBijEilanden();
}

function observe() {	// start observe module die kijkt voor veranderingen
    for (var item of document.getElementsByClassName("title")) { //
        if (settings.colors) checkForumKleuren(item);	// indien gewenst, laad de alliantieforum kleuren module
    }
    if(settings.discord) laadDiscordKnop();				// indien gewenst, check of er een discordknop moet toegevoegd worden
    if(settings.customtags) updateCustomTagsBijStadsnaam();
    if(i%5==0) updateCustomTagsBijEilanden(); updateKoloKillTopic();
    if($(".gpwindow_content")) toonTagEditKnopje();
    if(i==30) updateKoloKills();
    if(i > 1000) i=0;
    i++;
    setTimeout(function() {													// laad deze module opnieuw om terug alle checks uit te voeren
        observe();
    }, 400);
}
function laadVertalingen(){
    // laad vertalingen op van het script
    // dit gebeurt op basis van de servertaal
    console.log("laadvertaling");
    return $.get({
        url: "https://gme.cyllos.dev/vertalingen/" + UWGame.world_id.replace(/[^a-z]/gi, '') + ".json?_" + (new Date().getDay()) + "&v=" + GM_info.script.version,
    }).done(function( data ){
        vertaling = data;
    });
}

function checkInkomendeAanvallen(){
    // kijk of er inkomende aanvallen zijn
    if(settings.aanvalsindicator){
        var huidigeaantal = parseInt($(".activity.attack_indicator.active").text()) || 0;
        if(huidigeaantal > 0 && huidigeaantal > aanvalscount){
            aanvalscount = huidigeaantal;
            flitsAanvalsMelding();
        }
        else if (huidigeaantal == 0) {
            window.clearTimeout( aanvalTimeout );
            $("link")[4].setAttribute("href", "https://gpnl.innogamescdn.com/images/game/start/favicon.ico");
        }
        else {
            aanvalscount = huidigeaantal;
        }
    }
    // kijk binnen 5 seconden opnieuw
    setTimeout(function() {
        checkInkomendeAanvallen();
    }, 5000);
}


function flitsAanvalsMelding(){
    // toon een flitsend icoontje bij aanval
    if($("link")[4].href == "https://gpnl.innogamescdn.com/images/game/start/favicon.ico") $("link")[4].setAttribute("href", "https://gme.cyllos.dev/res/incoming.ico");
    else $("link")[4].setAttribute("href", "https://gpnl.innogamescdn.com/images/game/start/favicon.ico");
    aanvalTimeout = setTimeout( function() {
        flitsAanvalsMelding();
    }, 300);
}

function updateBDAlarmCounter(){
    if($(".captain_active").length > 0){
        // update de timer van het boerendorpalarm
        var dr = new Date(0);
        dr.setUTCSeconds(GM_getValue( UWGame.world_id + '_grepolis-claim-ready') / 1000);
        var dn = new Date(0);
        dn.setUTCSeconds($.now() / 1000);
        if(dr < dn) $(".boerendorpcounter")[0].innerText = "0";
        else $(".boerendorpcounter")[0].innerText = Math.abs(dr - dn) / 1000;

        setTimeout(function() {
            updateBDAlarmCounter();
        }, 1000);
    }
}

function addMeta(naam, naamWaarde, waarde){
    var metaTag = document.createElement("meta");
    metaTag.name = naam;
    var metaWaarde = document.createAttribute(naamWaarde);
    metaWaarde.value = waarde;
    metaTag.attributes.setNamedItem(metaWaarde);

    $("head").prepend(metaTag);
}
function laadBDAlarm() {

    // Boerendorpenalarm geschreven door Smafe Web Solutions, geupdated door by KapteniZ
    // code https://greasyfork.org/scripts/402482-grepolis-boerendorpen-alarm-v0-4-0/code/Grepolis%20boerendorpen%20alarm%20v040.user.js
    // laad het boerendorpalarm

    // voeg het icoontje toe
    if($(".captain_active").length > 0){
      var aw = document.createElement('div');
      aw.classList += 'toolbar_button boerendorpKnop';

      var icoon = document.createElement('div');
      var claimStatus = "actief";
      if(GM_getValue( UWGame.world_id + '_grepolis-claim-ready') > ( parseInt( $.now() ) )) claimStatus = "inactief";
      icoon.classList += 'icon boerendorpIcoon ' + claimStatus;
      var count = document.createElement('div');
      count.classList += 'count js-caption boerendorpcounter';
      count.innerText = 0;
      icoon.appendChild(count);
      aw.append(icoon);

      $(".toolbar_buttons")[0].append(aw);

      $(".boerendorpKnop").click(function() {
          BDAlarmAudio.pause();
          BDAlarmAudio.currentTime = 0;
          window.clearTimeout( BDAlarmTimeout );
          javascript:Layout.wnd.Create(Layout.wnd.TYPE_FARM_TOWN_OVERVIEWS,"Farming Town Overview");void(0);
      });
  }
    if( GM_getValue( UWGame.world_id + '_grepolis-claim-ready') ) {
        laadBDAlarmGeluid();
    }
    $( 'body' ).on( 'click', '#fto_claim_button', function() {
        var time = $( '#time_options_wrapper .fto_time_checkbox.active' ).attr( 'data-option' );
        if($( '#time_options_wrapper .time_options_loyalty .fto_time_checkbox.active' ).attr( 'data-option' )>time){
            time = $( '#time_options_wrapper .time_options_loyalty .fto_time_checkbox.active' ).attr( 'data-option');
        }
        GM_setValue( UWGame.world_id + '_grepolis-claim-ready', (( parseInt( $.now() ) ) + ( parseInt( time ) * 1000)) );
        laadBDAlarmGeluid();
    } );
    BDAlarmAudio.addEventListener( 'ended', function() {
        this.currentTime = 0;
        this.play();
    }, false );
}

function updateKoloKills(){
    try{
        $.get({
            url: '/game/building_wall',
            data: {
                town_id: UWGame.townId,
                action: "index",
                h: UWGame.csrfToken,
                json: '{"town_id":' + UWGame.townId + ',"nl_init":true}',
                _: (Timestamp.now()*100)
            }
        }).done(function (data) {
            data = data.plain.html;
            if(data.split('colonize').length > 1){
                var totaalKolo = parseInt(data.split('colonize')[1].match(/\d{1,}/)[0]) + parseInt(data.split('colonize')[3].match(/\d{1,}/)[0]);
                console.log(totaalKolo);
                vergelijkKoloKills(totaalKolo);
            }
        }); 
  } catch(e) { console.log(e); }
}

function maakInstellingMenu() {					// functie die het instellingenmenu maakt
    var windowExists = false;
    var windowItem = null;
    for(var item of document.getElementsByClassName('ui-dialog-title')){ // kijk of er al een scherm is
        if(item.innerHTML == vertaling.gmesettings){
            windowExists = true;
            windowItem = item;
        }
    }
    if(!windowExists) wnd = Layout.wnd.Create(Layout.wnd.TYPE_DIALOG, "GME Settings"); // indien er geen is maak een nieuw aan
    wnd.setContent(''); // maak het leeg
    for(item of document.getElementsByClassName('ui-dialog-title')){ // zoek het scherm
        if(item.innerHTML == "GME Settings"){
            windowItem = item;
        }
    }
    wnd.setHeight(document.body.scrollHeight/2 + 100); // zet instellingen van het scherm
    wnd.setWidth('800');
    wnd.setTitle(vertaling.gmesettings);
    var title = windowItem;
    var frame = title.parentElement.parentElement.children[1].children[4]; // selecteer het frame element
    frame.innerHTML = ''; // maak het leeg en maak een kleine html structuur
    var html = document.createElement('html');
    var body = document.createElement('div');
    var head = document.createElement('head');
    element = document.createElement('h3'); // maak een titelelement en zet instellingen
    element.innerHTML = vertaling.instellingen;
    body.appendChild(element);
    var list = document.createElement('ul'); // maak een lijst aan voor de instellingen
    list.style = "overflow-y: scroll;overflow-x: hidden;"
    list.style.height = (document.body.scrollHeight/2)-100 + "px";
    list.style.paddingBottom = "5px";

    // gebruik de maakCheckbox module om checkboxes te maken met de instellingen
    maakCheckbox(list, settings.tags,"setting_tags",vertaling.alliantietags);
    maakCheckbox(list, settings.playertag,"setting_playertag", vertaling.spelertags);
    maakCheckbox(list, settings.tagkleuren,"setting_tagkleuren", vertaling.tagkleuren);
    list.appendChild(document.createElement("hr"));
    maakCheckbox(list, settings.oceaannummer, 'setting_oceaannummer', vertaling.oceaancijfers);
    maakCheckbox(list, settings.swag,"setting_swag",vertaling.swag);
    maakCheckbox(list, settings.helena,"setting_helena",vertaling.helena);
    maakCheckbox(list, settings.colors,"setting_colors", vertaling.forumkleuren);
    maakCheckbox(list, settings.boerendorpalarm,"setting_boerendorpalarm", vertaling.boerendorpalarm);
    maakCheckbox(list, settings.aanvalsindicator,"setting_aanvalsindicator", vertaling.aanvalsindicator);
    list.appendChild(document.createElement("hr"));
    maakCheckbox(list, settings.commandoopen,"setting_commandoopen", vertaling.commandoscherm);
    maakCheckbox(list, settings.tijden,"setting_tijden", vertaling.aankomsttijd);
    maakCheckbox(list, settings.terugTrek,"setting_terugTrek", vertaling.terugtrektijd);
    list.appendChild(document.createElement("hr"));
    maakCheckbox(list, settings.inactive,"setting_inactive", vertaling.inactieven);
    // maak de max en min inactiviteits blokjes en stel in (drie blokken code)
    listitem = document.createElement('div');
    var p = document.createElement('p');
    p.innerHTML = vertaling.inactiefvanaf;
    listitem.appendChild(p)
    listitem.style.lineHeight = '0';

    maakTextbox(listitem, settings.inactiveMin, "setting_inactiveMin", 60);
    p = document.createElement('p');
    p.innerHTML = vertaling.totmax;
    listitem.appendChild(p);
    maakTextbox(listitem, settings.inactiveMax, "setting_inactiveMax", 60);
    p = document.createElement('p');
    p.innerHTML = vertaling.dageninactief;
    listitem.appendChild(p)
    listitem.style.display = "flex";
    listitem.style.justifyContent = "space-between";
    list.appendChild(listitem);
    list.appendChild(document.createElement("hr"));

    // maak een box voor de discordhook in te zetten
    maakCheckbox(list, settings.discord,"setting_discord", vertaling.discordknop);
    maakTextbox(list, settings.discordhook, "setting_discordhook", 400);

    list.appendChild(document.createElement("hr"));
    maakCheckbox(list, settings.customtags,"setting_customtags", vertaling.customtags);
    maakCheckbox(list, settings.customtags_kaart,"setting_customtags_kaart", vertaling.customtags_kaart);
    list.appendChild(maakKnop("importeer_tags", vertaling.importeer));
    list.appendChild(maakKnop("exporteer_tags", vertaling.exporteer + Object.keys(taglijst).length + vertaling.tags));

    var br = document.createElement("br");
    list.appendChild(br);
    p = document.createElement("p");
    p.innerHTML = vertaling.synctags;
    list.appendChild(p);

    listitem = document.createElement('div');
    listitem.appendChild(maakKnop("genereer_token", vertaling.gentoken));
    listitem.appendChild(maakKnop("reset_token", vertaling.verwijdertoken));
    list.appendChild(listitem);

    var tokeninput = document.createElement('div');
    tokeninput.className = "textbox";
    tokeninput.style.width = '250px';
    var setting = "";
    if(settings.token != null) { setting = settings.token };
    tokeninput.innerHTML = '<div class="left"></div><div class="right"></div><div class="middle"><div class="ie7fix"><input tabindex="1" id="setting_token" value="' + setting +'" size="10" placeholder="' + vertaling.gedeeldetoken + '" type="text"></div></div>';
    list.appendChild(tokeninput);

    var keyinput = document.createElement('div');
    keyinput.className = "textbox";
    keyinput.style.width = '120px';
    setting = "";
    if(settings.key != null) { setting = settings.key };
    keyinput.innerHTML = '<div class="left"></div><div class="right"></div><div class="middle"><div class="ie7fix"><input tabindex="1" id="setting_key" value="' + setting +'" size="10" placeholder="' + vertaling.gedeeldekey + '" type="text"></div></div>';
    list.appendChild(keyinput);

    // maak een herlaadknop en stel deze in
    var savebutton = maakKnop("settings_reload", vertaling.opslaanherladen); savebutton.style.position = 'absolute'; savebutton.style.bottom = "0"; savebutton.style.right = "0";
    body.appendChild(savebutton);

    var listitem = document.createElement('div');

    listitem.innerHTML = '<form action="https://www.paypal.com/cgi-bin/webscr" method="post" target="_blank"><input type="hidden" name="cmd" value="_s-xclick" /><input type="hidden" name="hosted_button_id" value="SRWYLPSZ2UG84" /><input type="image" src="https://www.paypalobjects.com/en_US/i/btn/btn_donate_SM.gif" border="0" name="submit" title="PayPal - The safer, easier way to pay online!" alt="Donate with PayPal button" /><img alt="" border="0" src="https://www.paypal.com/en_BE/i/scr/pixel.gif" width="1" height="1" /></form>';
    listitem.style.position = 'absolute'; listitem.style.top = "0"; listitem.style.right = "0";
    body.appendChild(listitem);

    // maak instellingen informatie linksonder
    var element = document.createElement('p');
    element.innerHTML = 'Grepolis Map Enhancer v.' + GM_info.script.version;
    element.innerHTML += '<br>' + vertaling.credits;
    element.innerHTML += '<br><p style="font-size: xx-small">contact: <a href="mailto:me@cyllos.dev">me@cyllos.dev</a> - web: <a href="https://gme.cyllos.dev" tagert="_blank">gme.cyllos.dev</a> - <a href="https://gme.cyllos.dev/GrepolisMapEnhancer.user.js" target="_blank">update</a></p>';

    element.style.position = 'absolute'; element.style.bottom = "0"; element.style.left = "0"; element.style.marginBottom = "0"; element.style.lineHeight =  "1";
    list.appendChild(element);

    // Voeg alle elementen toe aan het instellingenscherm.
    body.appendChild(list);

    // voeg alles bij elkaar
    html.appendChild(head);
    html.appendChild(body);
    frame.appendChild(html); // voeg alles toe aan het frame

    // zeg wat er moet gebeuren als men op een checkbox klikt
    $(".gmesettings").click(function(){wisselInstelling(this);});

    $("#reset_token").click(function(){
        $('#setting_token')[0].value = "";
        $('#setting_key')[0].value = "";
    });
    $("#genereer_token").click(function(){
        $('#setting_token')[0].value = genereerToken(32);
        $('#setting_key')[0].value = genereerToken(8);
    });
    $("#exporteer_tags").click(function(){
        var exportage = "";
        for(var x in taglijst) exportage += x + "~" + taglijst[x].tag + "~" + taglijst[x].kleur + "\n";
        kopieerTekst(exportage);
        alert(vertaling.tagsgekopieerd);
    });
    $("#importeer_tags").click(function(){
        importeerTags();
    });
    addMeta("GMESettings", "ready", "true");


    // zeg wat er moet gebeuren als er op herladen gedrukt wordt. Dit slaat de inputvelden op en herlaadt de pagina
    $("#settings_reload").click(function(){
        GM_setValue('setting_inactiveMin', $('#setting_inactiveMin').val());
        GM_setValue('setting_inactiveMax', $('#setting_inactiveMax').val());
        GM_setValue('setting_discordhook' + UWGame.world_id, $('#setting_discordhook').val());
        if($('#setting_token').val() == "") { GM_setValue('setting_token' + UWGame.world_id, null) }
        else if($('#setting_token').val().length == 32){GM_setValue('setting_token' + UWGame.world_id, $('#setting_token').val()) }
        if($('#setting_key').val() == "") { GM_setValue('setting_key' + UWGame.world_id, null) }
        else if($('#setting_key').val().length == 8){GM_setValue('setting_key' + UWGame.world_id, $('#setting_key').val()) }
        window.location.reload();
    });
}
function kopieerTekstFallback(text) {
  var textArea = document.createElement("textarea");
  textArea.value = text;

  // Avoid scrolling to bottom
  textArea.style.top = "0";
  textArea.style.left = "0";
  textArea.style.position = "fixed";

  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    var successful = document.execCommand('copy');
    var msg = successful ? 'successful' : 'unsuccessful';
    console.log('Fallback: Copying text command was ' + msg);
  } catch (err) {
    console.error('Fallback: Oops, unable to copy', err);
  }

  document.body.removeChild(textArea);
}
function kopieerTekst(text) {
  if (!navigator.clipboard) {
    kopieerTekstFallback(text);
    return;
  }
  navigator.clipboard.writeText(text).then(function() {
    console.log('Async: Copying to clipboard was successful!');
  }, function(err) {
    console.error('Async: Could not copy text: ', err);
  });
}
function genereerToken(num) {
   var result           = '';
   var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
   var charactersLength = characters.length;
   for ( var i = 0; i < num; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
   }
   return result;
}
function wisselInstelling(element) { // functie voor het aan en uit zetten van een module
    $('#' + element.id).toggleClass("checked");
    settings[element.id] = $(element).hasClass("checked");
    GM_setValue(element.id, $(element).hasClass("checked"));
}
function voegSettingsIcoonToe() {			// module die het instellingenknopje rechtsboven maakt
    if(document.getElementById('GMESetupLink') == null){ // indien er nog geen knopje is, doe het volgende
        // het volgende blok code maakt een instellingenknopje en stel in
        var a = document.createElement('div');
        a.id = "GMESetupLink";
        a.className = 'btn_settings circle_button';
        var img = document.createElement('div');
        img.style.margin = '6px 0px 0px 5px';
        img.style.background = "url(https://gme.cyllos.dev/res/icoon.png) no-repeat 0px 0px";
        img.style.width = '22px';
        img.style.height = '22px';
        img.style.backgroundSize = '100%';
        a.style.top = '145px';
        a.style.right = '-4px';
        a.style.zIndex = '10000';
        a.appendChild(img);
        document.getElementById('ui_box').appendChild(a);
        $("#GMESetupLink").click(maakInstellingMenu); // zegt wat er moet gebeuren met het knopje indien men er op drukt
    }
}


function importeerTags(){
    var windowExists = false;
    var windowItem = null;
    for(var item of document.getElementsByClassName('ui-dialog-title')){ // kijk of er al een scherm is
        if(item.innerHTML == vertaling.importeer){
            windowExists = true;
            windowItem = item;
        }
    }
    if(!windowExists) var wnd = Layout.wnd.Create(Layout.wnd.TYPE_DIALOG, vertaling.importeer);
    wnd.setContent(''); // maak het leeg
    for(item of document.getElementsByClassName('ui-dialog-title')){ // zoek het scherm
        if(item.innerHTML == vertaling.importeer){
            windowItem = item;
        }
    }
    wnd.setHeight('400'); // zet instellingen van het scherm
    wnd.setWidth('300');
    wnd.setTitle(vertaling.importeer);
    var title = windowItem;
    var frame = title.parentElement.parentElement.children[1].children[4]; // selecteer het frame element
    frame.innerHTML = ''; // maak het leeg en maak een kleine html structuur
    frame.id = "importFrame";
    var body = document.createElement('div');

    var tekst1 = document.createElement('p');
    tekst1.innerText = vertaling.plakexport;
    body.appendChild(tekst1);

    var inputVeld = document.createElement("textarea");
    inputVeld.style.width = "295px";
    inputVeld.style.height = "250px";
    inputVeld.id = "inputVeld";
    body.appendChild(inputVeld);

    var knop = maakKnop("importtagknop", vertaling.importeer);
    knop.style.width = "295px";
    body.appendChild(knop);

    frame.appendChild(body);

    $("#importtagknop").click(function() {
        var tags = [];
        for(var line of $("#inputVeld").val().split("\n")){
            if(line.split("~").length == 3){
                tags.push({ "entity": line.split("~")[0], "tag" : line.split("~")[1], "kleur": line.split("~")[2] });
            }
        }
        frame.innerHTML = '<p>' + vertaling.importverwerken + '</p><p><span id="importVoortgang">0</span>/' + tags.length + vertaling.tags + '</p>';
        frame.innerHTML += '<div id="importProgressBar"><div id="importProgress"></div></div>';
        wnd.setHeight('150'); // zet instellingen van het scherm
        verwerkImport(wnd, tags, tags.length);

    });

}

async function verwerkImport(wnd, tags, totaalAantalTags){
    if(tags.length > 0){
        var tag = tags.pop(tags[0]);
        saveCustomTag(tag.entity.substr(4), tag.entity.substr(0,4), tag.tag, tag.kleur)
        $("#importVoortgang")[0].innerText = totaalAantalTags-tags.length;
        $("#importProgress")[0].style.width = 100-tags.length/totaalAantalTags*100 + "%";
        if(settings.token != null) {
            await sleep(500);
        }
        else await sleep(50);
        verwerkImport(wnd, tags, totaalAantalTags);
    }
    else {
        wnd.close();
        alert("done");
    }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function laadCSS() { // laad custom css van script
    if(settings.oceaannummer){	// indien gewenst verlaag dan de doorzichtigheid van de oceaannummers
        var oceaannummer = '.RepConvON {opacity: 0.04 !important;}';
    } else oceaannummer = "";
    if(settings.swag){ // indien gewenst voeg wat swag toe
        var swag = "#questlog .questlog_icon { background-color: rgba(0, 0, 0, 0); background-image: url('https://gme.cyllos.dev/res/questionlog.png');}";
    } else swag = "";
    if(settings.commandoopen){ // indien gewenst hou het commando blok open
        var commandoopen = "#toolbar_activity_commands_list { display: block !important;} #toolbar_activity_commands_list.fast .js-dropdown-item-list > div { visibility: visible !important}";
    } else commandoopen = "";

    if(settings.helena){
        var helena = '@keyframes blink-animation4 {50% {box-shadow: 0px 0px 5px 6px #f00;}} .attack_support_window .unit_icon40x40.helen {animation: blink-animation4 1s steps(30, start) infinite;}';

        helena = helena + '.attack_support_window .unit_icon40x40.zuretha {animation: blink-animation4 1s steps(30, start) infinite;}';
        helena = helena + '.attack_support_window .unit_icon40x40.deimos {animation: blink-animation4 1s steps(30, start) infinite;}';
    } else helena = "";

    // voeg alle custom stijlen samen
    var css = [
        commandoopen,
        oceaannummer,
        helena,
        swag,
    ].join("\n");

    // voeg de custom stijlen toe
    var node = document.createElement("style");
    node.type = "text/css";
    node.appendChild(document.createTextNode(css));
    var heads = document.getElementsByTagName("head");
    if (heads.length > 0) {
        heads[0].appendChild(node);
    } else {
        document.documentElement.appendChild(node);
    }

    // voeg algemene Map Enhancer CSS toe
    var styling=document.createElement('link');
    styling.type='text/css';
    styling.rel='stylesheet';
    styling.href='https://gme.cyllos.dev/GrepolisMapEnhancer.css?_'+(new Date().getDay());
    document.body.appendChild(styling);
    console.log("GME: Added CSS");
}

function maakNotificatie(type, inhoud) { // module om een notificatie te maken
    var notificatiehandler = (typeof Layout.notify == 'undefined') ? new NotificationHandler() : Layout;
    notificatiehandler.notify($('#notification_area>.notification').length + 1, type, '<span><b>' + 'Map Enhancer' + '</b></span>' + inhoud + '<span class=\'small notification_date\'>' + ' </span>');
}

function laadInactieveSpelers() { 	// deze module haalt alle inactieve spelers op van GRCRT
    return $.ajax({
        url: "https://www.grcrt.net/json.php",
        method: "get",
        data: {
            method: "getIdleJSON",
            world: UWGame.world_id
        },
        cache: !0
    });
}

function laadCustomTagsVanServer() { 	// haal tags op van gme.cyllos.dev
    if(settings.token == null){
        if(!GM_getValue("taglijst" + UWGame.world_id)){
            console.log("geen taglijst gevonden, begin met nieuwe");
            taglijst = { 1: "undefined" };
        }
        else {
            console.log("offline taglijst gevonden");
            taglijst = GM_getValue("taglijst" + UWGame.world_id);
        }
    }
    else {
        $.ajax({
            url: "https://gme.cyllos.dev/sync2",
            method: "get",
            data: {
                method: "getTagLijst",
                token: settings.token,
            },
            cache: false
        }).done(function(data) {
            taglijst = {};
            var checkpatt = /^[\ a-z0-9\.\[\]\(\)\-\:\?\&\;]+$/i;
            for(var entiteit in data){
                try{
                    if(entiteit.match(/stad\d*\d/i) || entiteit.match(/eila\d*\d/i) || entiteit.match(/spel\d*\d/i) || entiteit.match(/kolo\w*\w/i)) {
                        var bytes = CryptoJS.AES.decrypt(atob(data[entiteit].tag.toString()), settings.key);
                        var plaintext = bytes.toString(CryptoJS.enc.Utf8);
                        data[entiteit].tag = plaintext;
                        if(plaintext.match(checkpatt) || entiteit.match(/kolo\w*\w/i)) taglijst[entiteit] = data[entiteit];
                    }

                } catch (e) { console.log(e); }
            }
        });
    }
    setTimeout(function() {
        laadCustomTagsVanServer();
    }, 5*60*1000);
    updateCustomTags(); // update de custom tags op de kaart
    return taglijst;
}

function laadStadsTag(var1, var3, data) { // module voor het laden van een stad zijn tags
    if (var1 != undefined && var1.length > 0 && var3.player_id) { // indien er een spelers id gevonden is, doe het volgende
        let orientation = '';
        for (var var2 = 0; var2 < var1.length; var2++) { // voor alle steden gevonden
            let className = var1[var2].className;
            if (className != 'flag town') { // indien de klassenaam niet flag town is doe het volgende
              orientation = laadStadsOrientatie(className);
            }
            if (className == 'flag town') { // indien de klassenaam flag town is doe het volgende
                try{
                    var border = "";
                    var inactive = "";
                    // kijk of men inactieve spelers wilt zien en check deze tegen de min en max waarden. Indien geldig voeg toe en geef een rand
                    if(var3.player_name){
                        var inactiveTime = Math.floor(data.JSON[var3.player_id]);
                        if (settings.inactive && (inactiveTime >= settings.inactiveMin) && (inactiveTime <= settings.inactiveMax)) {
                            var inactivetag = document.createElement("div");
                            inactivetag.innerText = inactiveTime + "d";
                            inactivetag.classList += "inactivetag " + orientation;
                            $(var1[var2]).append(inactivetag);
                        }
                    } else {
                        border = "";
                        inactive = "";
                    }
                    var tag = "";
                    var playername = '';
                    var alliancename = '';
                    var kleuren;
                    if(settings.playertag){ if(var3.player_name) playername = var3.player_name; } // indien gewenst voeg spelertags toe
                    if(settings.tags){ alliancename = (var3.alliance_name || '');} // indien gewenst voeg alliantietags toe
                    if(settings.playertag && settings.tags){ playername += '<br>';} // indien beiden, zet dan een break om ze onder elkaar te krijgen

                    if(settings.customtags_kaart) {
                        if(taglijst['stad' + var3.id] != null){
                            tag = '<span class="customTag  ' + orientation + ' customTag_stad' + var3.id + '>' + taglijst['stad' + var3.id].tag + '</span>';
                        }
                        else tag = '<span class="customTag nodisplay mapcustomtag ' + orientation + ' customTag_stad' + var3.id + '"></span>';
                    }
                    if(settings.tagkleuren) { kleuren = 'style="background-color: inherit;"';} else {kleuren = ' ';} // als men kleurtjes wilt erf dan over van vlagkleuren
                    $(var1[var2]).append('<div class="alliance_name ' + orientation +'" ' + kleuren + '>' + playername + alliancename + " " + '</div>' + tag ); // voeg element toe
                    break;
                } catch(e) { console.log(e) }
            }

        }
    }
    return var1;
}
function laadStadsOrientatie(s) {
  if (s && s.indexOf('sw')>-1) return 'sw';
  if (s && s.indexOf('nw')>-1) return 'nw';
  if (s && s.indexOf('ne')>-1) return 'ne';
  if (s && s.indexOf('se')>-1) return 'se';
  else return "none";
}
function getTagsOpKaart() { // deze module start het laden van tags
    idleList = laadInactieveSpelers();
    idleList.success(function(data) {
        var var1 = function(var10) {
            return function() {
                var var1 = var10.apply(this, arguments);
                return laadStadsTag(var1, arguments[0], data);
            };
        };
        MapTiles.createTownDiv = var1(MapTiles.createTownDiv);
    });
}

function laadBDAlarmGeluid() {
    if( BDAlarmTimeout ) {
        BDAlarmAudio.pause();
        BDAlarmAudio.currentTime = 0;
        $(".boerendorpIcoon")[0].classList.replace("actief", "inactief");
        window.clearTimeout( BDAlarmTimeout );
    }

    BDAlarmTimeout = setTimeout( function() {
        $(".boerendorpIcoon")[0].classList.replace("inactief", "actief");
        if(settings.boerendorpalarm) BDAlarmAudio.play();
        setTimeout(() => { if(settings.boerendorpalarm) BDAlarmAudio.pause(); }, 2000);
    }, parseInt( GM_getValue( UWGame.world_id + '_grepolis-claim-ready') ) - parseInt( $.now() ) );
}
