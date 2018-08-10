//Decision Tree

function Node(lb, leaf, ind, inf) {
    this.label = lb;
    this.children = [];
    this.conditions = [];
    this.parent = null;
    this.isLeaf = leaf;
    this.index = ind;
    this.info = inf
}

function Tree(dt) {
    //var node = new Node(dt);
    var node = dt;
    this._root = node;
}

//global vars

//tree as received from the server in xml form
var xmlTree = null;

var tree = null;
var Stack = [];
var decisionTree = null;

var priceKeywords = ["price","pp","pr","bidprice","bid_price","bp","winprice","computedprice","pricefloor","win_price","wp","chargeprice","charge_price","cp","extcost","tt_bidprice","bdrct","hbprice","hb_bid","cost","wtbwinprice","rtb_win_price","rtbwp","bidfloor","seatbid","price_paid","maxPriceInUserCurrency",
"uid","_pp","x_price","title","_p","add_code","acp","description1","p","ep","wp_exchange","z","value","crtbwp"];


var publisherKeywordTable = {};

var prices;
var newPrices = 0;
var yourValue;
var total_enc;
var total_plain;
//if disable is 0 the plugin works
//if it's 1 it doesn't
var disable = 0;
var disableDonation = 0;

//counters for the current session
var session_plain = 0;
var session_enc = 0;
var session_value = 0.0;
var facebook_flag = 0;
//helper functions

function printDisable() {
    console.log(disable);
}

function disableValue() {
    disable = 1;
}
function enableValue() {
    disable = 0;
}
function timeOfDayRange() {
    //return the hour in a anomized way,in intervals of 3 hours
    //the return value is a string
    var d = new Date();
    var hour = d.getHours();
    if(hour >= 0 && hour <= 3 )      return '00:00';
    else if(hour > 3 && hour <= 6)   return '03:00';
    else if(hour > 6 && hour <= 9)   return '06:00';
    else if(hour > 9 && hour <= 12)  return '09:00';
    else if(hour > 12 && hour <= 15) return '12:00';
    else if(hour > 15 && hour <= 18) return '15:00';
    else if(hour > 18 && hour <= 21) return '18:00';
    else                             return '21:00'
}

function intercept()
{
    var blocked = false;
    try {
        chrome.webRequest.onBeforeRequest.addListener( function(info) {
            blocked = true;
            //var t0 = performance.now();
            var params = info.url.substring(info.url.indexOf('?')+1);
            var domain = info.url.split('?')[0];
            var res = has_PriceKeyword(params);
            var stripped_domain = domain.match(/^(https?\:\/\/)?(?:www\.)?([^\/?#]+)(?:[\/?#]|$)/i);
            var price_keyword;

            for(adv in adDB)
                if(stripped_domain[2].includes(adDB[adv]))
                    stripped_domain[2] = adDB[adv]

            //try to find a price keyword without looking at the advertisers dictionary
            //will be used only if the dictionary fails
            if(res !== null && res.length > 1) price_keyword = res[0];

            //if it's a known advertister AND this advertiser is in the dictionary with the advertiser-keywords pairs AND in the advertiser url there is a price keyword that corresponds to this advertiser
            if((adDB.includes(stripped_domain[2])) && (stripped_domain[2] in publisherKeywordTable) && (has_matching_PriceKeyword(publisherKeywordTable[stripped_domain[2]],params) !== null) ) {
                console.log(info.url);
                newPrices++;
                //add to res the correct keyword and price
                var res = has_matching_PriceKeyword(publisherKeywordTable[stripped_domain[2]],params);
                //what to do if price is not encrypted
                if (isNumeric(res[1])) {
                    console.log(domain+"\n"+params+"\nPRICE:"+calculatePrice(res[1]));
                    var timestamp = new Date().getTime();
                    //prices[timestamp] = info.url+" -> "+res[0]+"->"+res[1];
                    var urltoprice = info.url+" -> "+res[0]+"->"+calculatePrice(res[1]);
                    //console.log(tree);
                    //console.log(getFeatures(info));
                    //savePrice(prices);
                    total_plain = total_plain + 1;
                    session_plain = session_plain + 1;
                    saveTotalPlain(total_plain);
                    yourValue = yourValue + calculatePrice(parseFloat(res[1]));
                    session_value = session_value + calculatePrice(parseFloat(res[1]));
                    console.log(session_value);
                    saveYourValue(yourValue);
                }
                else {
                    chrome.tabs.query({'active': true, 'windowId': chrome.windows.WINDOW_ID_CURRENT},
                        function(tabs){
                            var curr_tab = tabs[0].url;
                            //price is encryted
                            //we need to collect the user features
                            //and run classification on the DT
                            //in order to find out the prediction about the price
                            console.log("URL:"+curr_tab);
                            var fallback_price = yourValue / (total_plain + total_enc);
                            var features = getFeatures(info,curr_tab);
                            console.log(features);
                            //if we have not create the DT yet create it
                            if (decisionTree === null) decisionTree = parseXML(treeXML_2);
                            //predict the price
                            var price = classify(decisionTree._root,features);
                            console.log(price);
                            if (isNumeric(price)) {
                                //we found a predicted price
                                var timestamp = new Date().getTime();
                                //prices[timestamp] = info.url+" -> "+res[0]+"->"+price;
                                console.log("Price prediction found.Prediction: "+price);
                                //savePrice(prices);
                                total_enc = total_enc + 1;
                                session_enc = session_enc + 1;
                                saveTotalEnc(total_enc);
                                yourValue = yourValue + calculatePrice(parseFloat(price));
				saveYourValue(yourValue);
                                session_value = session_value + calculatePrice(parseFloat(price));
                                //could add the features I want ot donate seperated by the '|' delimiter
                                var urltoprice = info.url+" -> "+res[0]+"->"+res[1];
                            } else {
                                console.log("Not found prediction for the given features");
                                //increment the counter of the encrypted prices even if the 
                                //price wasn't predicted
                                total_enc = total_enc + 1;
                                session_enc = session_enc + 1;
                                saveTotalEnc(total_enc);                               
                                yourValue = yourValue + calculatePrice(parseFloat(fallback_price));
				saveYourValue(yourValue);
                                session_value = session_value + calculatePrice(parseFloat(fallback_price));
                            }
                        });
                }
                //savePrice(prices);
                chrome.browserAction.setIcon({
                    path: "images/icon-38.png"});
                chrome.browserAction.setBadgeText({ text: newPrices.toString()});
            }
        },
            {
                urls: ["https://*/*", "http://*/*",],
            },
            ["blocking"]);
    } catch (ErrorMessage) {
        console.log("page:" + ErrorMessage);
    }
}

var user_location = null;
var country = null
$.getJSON("http://www.ip-api.com/json",function(data) {
    user_location = data.city;
    country = data.country;
    console.log("User's town: "+ user_location+"User's country: "+country);
});

function getFeatures(info,curr_tab) {

    var params = info.url.substring(info.url.indexOf('?')+1);
    var winnerDSP = info.url.split('?')[0];

    return user_location+"|"+ getTrafficType()+ "|" + getHourOfDay()+"|" + getDay() +"|"+ getPlatform()+"|"+ getFormat(params)+"|"+getOperatingSystem()+"|"+getPublisher(winnerDSP)+"|"+getCategoria(curr_tab);
}

//return the categor
function getCategoria(info) {
    var domain = info.split('?')[0];

    //console.log("CATEGORIA:"+domain);
    var stripped_domain = domain.match(/^(https?\:\/\/)?(?:www\.)?([^\/?#]+)(?:[\/?#]|$)/i);
    console.log(stripped_domain[2]);
    if ((stripped_domain[2].split('.').length - 1) < 2 ) stripped_domain[2] = "www."+stripped_domain[2]; //if we stripped the domain and it's not an api we add the www. 
    //console.log(IABs[stripped_domain[2]] === undefined);
    if(IABs[stripped_domain[2]] !== undefined) {
        return IABs[stripped_domain[2]];
    } else {
        return "#N/A";
    }
}

//this plugin is for the chrome desktop edition
//si the traffic will always be WEB
function getTrafficType() {
    return "WEB";
}

function getDay() {
    var day = new Date().getDay();
    return day; 
}

//currently we support only dekstop
function getPlatform() {
    return "Desktop";
}

function getHourOfDay() {
    var hour = new Date().getHours();
    if (hour <= 9)		return "12am-9am";
    else if (hour <= 18)    return "9am-6pm";
    else			return "6pm-12am";
}

//return the ad resolution if it exists
function getFormat(urlParams) {
    if(urlParams === null) return "undef";
    var paramList = urlParams.split("&");
    var adSize = "320x50";   //this is the smallest possiple resolution, if you don't find any suitabe resolution return thr smallest
                             //this way we might underestimate the value of an ad but we still report results relative to the user
    for(i in paramList) {
        var parts = paramList[i].split('=');
        if(parts[0] === "size" || parts[0] === "adsize" || parts[0] === "sz" || parts[0] === "res" || parts[0] === "dims")  return parts[1];
        if(parts[0] === "width" && parts[1].length > 0 ) adSize = parts[1];
        if(parts[0] === "vadw" && parts[1].length > 0 ) adSize = parts[1];
        if(parts[0] === "winWidth" && parts[1].length > 0 ) adSize = parts[1];

        if(parts[0] === "height" && parts[1].length > 0) adSize += "x"+parts[1];
        if(parts[0] === "vadh" && parts[1].length > 0) adSize += "x"+parts[1];
        if(parts[0] === "winHeight" && parts[1].length > 0) adSize += "x"+parts[1];
    }
    return adSize;
}

function getOperatingSystem() {
    var OS = "Unknown OS";
    if(navigator.appVersion.indexOf("Win") != -1) OS = "Windows";
    if(navigator.appVersion.indexOf("Mac") != -1) OS = "MacOS";
    if(navigator.appVersion.indexOf("X11") != -1) OS = "UNIX";
    if(navigator.appVersion.indexOf("Linux") != -1) OS = "Linux";
    return OS;
}

//takes as argument the domain and returns the ad exchange
function getPublisher(url) {
    for(var ex in adDB){
        if(url.includes(adDB[ex])) {
            if(adDB[ex].includes("openx"))              return "OpenX";
            else if(adDB[ex].includes("google"))        return "Google";
            else if(adDB[ex].includes("pulsepoint"))    return "PulsePoint";    
            else if(adDB[ex].includes("rubicon"))       return "Rubicon";    
            else                                        return adDB[ex];
        }
    }
    return "undef";
}

function has_matching_PriceKeyword(keywordsList,urlParams) {
    if(urlParams.includes('http')) urlParams = urlParams.substring(urlParams.indexOf('?')+1);
    urlParams = urlParams.split('&');
    for(var kw in keywordsList) {
        for(var par in urlParams) {
            var pair = urlParams[par].split('=');
            if(pair[0] === keywordsList[kw])
                return pair;
        }
    }
    return null;
}

function has_PriceKeyword(urlParams) {
    if (urlParams === null) return urlParams;
    var paramsList = urlParams.split("&");
    for( i in paramsList) {
        var parts = paramsList[i].split("=");
        if (priceKeywords.indexOf(parts[0]) > -1 && parts[1].length > 0) return [parts[0],parts[1]]
    }
    return null;
}

/*Takes as parameter the price catch in the url. 
 * Returns the price converted to USD.
 * We assume that the url prices are either in microdollars
 * or USD.*/
function calculatePrice(pr) {
    if(isNumeric(pr)) {
        if(pr % 1 === 0) { //number is int
            //convert microdollars to dollars
            //cpm
            if(pr.toString().length <= 3)        return pr/1000.0;  
            //microdollars
            else if( pr.toString().length <= 7 ) return pr/1000000.0; 
            //wrong number
            else                                 return 0;
        } else {    //number is floar
            if(pr < 0.7) return pr; //price is lower than 1.1 dollars
            //if its above 1.1 dollars it must be cpm so divide by 1000
            else         return pr/1000.0; 
        }
    } else {
        return 0;
    }
}

function isNumeric(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
}

function classify(root,attrStr) {
    var attrs = attrStr.split("\|");
    return _classify(root,attrs);
}

//function to return the index based of the attribute name
function attributeToIndex(attr) {
    if (attr === "CIUDAD") 			return 1;
    else if (attr === "TIPO-DE-TRAFICO")    return 2;
    else if (attr === "RANGO-HORAS")        return 3;
    else if (attr === "DIA-DE-LA-SEMANA")  	return 4;
    else if (attr === "DISPOSITIVO") 	return 5;
    else if (attr === "FORMATO") 		return 6;
    else if (attr === "SISTEMA-OPERATIVO")  return 7;
    else if (attr === "AD-EXCHANGES") 	return 8;
    else if (attr === "CATEGORIA") 		return 9;
    else if (attr === "PRECIO-IMPRESION") 	return 10;
    else 					return 0;
}

//compare the label of a node with a given feature
//it returns true if the comparison holds
//otherwise false
function comparator(condition, feature) {
    var operator = condition.split(" ")[0];
    var value = condition.split(" ")[1];
    //if the operator is >,<,>=,<= the value must be numeric
    if( operator === ">=") {
        if (parseFloat(feature) >= parseFloat(value)) return true;
        else					      return false;
    } else if( operator === "<=") {
        if(parseFloat(feature) <= parseFloat(value)) return true;
        else					     return false;
    } else if( operator === "=" ) {
        if (isNumeric(value)) {
            if(parseFloat(feature) === parseFloat(value)) return true;
            else					      return false;
        } else {
            if(feature === value) return true;
            else		      return false;
        }
    } else if( operator === ">" ) {
        if(parseFloat(feature) > parseFloat(value)) return true;
        else 					    return false;
    } else if( operator === "<" ) {
        if(parseFloat(feature) > parseFloat(value)) return true;
        else					    return false;
    } else {return false;}
}

function _classify(node, attrs) {
    //console.log(node.isLeaf);
    if (node.isLeaf === true) {
        var price = node.label.slice(1,-1).split("-");
        //console.log(price);
        
        //TO DO - CHECK THE PRICE IF IS INF
        //console.log(price[0]+" "+price[1]);
        if(price.length === 3) return parseFloat(price[2])/2; //the price if in range -inf to value
        else {
            if(isNumeric(price[1])) //if the second value of the array is numeric then the price is in range value1 to value
                var ret = (parseFloat(price[0]) + parseFloat(price[1]))/2;
            else //the value is in range value to inf
                var ret = parseFloat(price[0])/2;
        }
        return ret;
    }
    var currValue = attrs[parseInt(node.index) - 1];
    //console.log(currValue);
    for(cond in node.conditions){
        //console.log("currval:"+currValue+" cond:"+node.conditions[cond]);
        if(comparator(node.conditions[cond],currValue) === true) {
            //console.log("got in!");
            return (_classify(node.children[cond],attrs));
        }

    }
    return "Can't find class -- Please learn tree with more examples";
}

function parseXML(xmlTree) {
    //console.log("called parse XML");
    var splittedXML = xmlTree.split("\n");
    var xmlLength = splittedXML.length;
    var i;
    //console.log(xmlLength);
    for(i = 0; i<xmlLength; i+=1) {
        var symbols = splittedXML[i].trim().replace(/\s\s+/g,' ').replace("<","").replace(/.$/,"").match(/('[^']+'|[^=]+)/g);
        var dispatcher = symbols[0].split(" ")[0].replace(/ /g,"");
        //console.log(i +" "+ symbols);
        if (dispatcher === "Test") {
            var attribute = symbols[1].split(" ")[0].replace(/'/g,"").replace(/ /g,"");
            var condition = symbols[3].split(" ")[0].replace(/'/g,"").replace(/ /g,"") + " " + symbols[5].replace(/'/g,"").replace(/ /g,"");
            var index = attributeToIndex(attribute);
            var leaf = false;
            //console.log(Stack.length);
            if(Stack.length === 0) {
                var tmp = new Node(attribute,leaf,index,"");
                tmp.conditions.push(condition);
                Stack.push(tmp);
               // console.log(tmp);
            } else {
                //this is the equal condition
                if(Stack[Stack.length - 1].label === attribute) {
                    //temporary fix in case where the attribute is DIA-DE-LA-SEMANA and the next node is again DIA-DE-LA-SEMANA
                    //will remove the if ...else and keep only the one line in else condition
                    if(attribute === "DIA-DE-LA-SEMANA") {
                            if(Stack[Stack.length - 1].conditions[0].split(" ")[0] === condition.split(" ")[0]) {
                                var tmp = new Node(attribute,leaf,index,"");
                                tmp.conditions.push(condition);
                                Stack.push(tmp);
                            }
                            else {
                                Stack[Stack.length - 1].conditions.push(condition);
                            }
                    } else { 
                        Stack[Stack.length - 1].conditions.push(condition);
                    }
                } else {
                    //this is a new node for the stack	
                    var tmp = new Node(attribute,leaf,index,"");
                    tmp.conditions.push(condition);
                    Stack.push(tmp);
                }
            }

        } else if (dispatcher === "/Test") {
            //if(Stack.length !== 1) {
            var node = Stack.pop();
            //console.log(node);
            Stack[Stack.length - 1].children.push(node); 
        } else if (dispatcher === "/DecisionTree") {
            //console.log("Parsed /DecisionTree");
            var node = Stack.pop();
            return tree = new Tree(node);
        } else if (dispatcher === "Output") {
            var leaf = true;
            var index = 0;
            var label = symbols[1].split(" ")[0].replace(/'/g,"");
            var info = symbols[2].split(" ")[0].replace(/'/g,"");
            var tmp = new Node(label,leaf,index,info);
            Stack.push(tmp)
        }


    }

}
function saveYourValue(vl) {
    chrome.storage.sync.set({"yourValue":vl}, function() {
        if (chrome.runtime.error) {
            console.log("Runtime error.")
        }
    });
}

//save the counter for the total encrypted ads
function saveTotalEnc(enc) {
    chrome.storage.sync.set({"total_enc":enc}, function() {
        if (chrome.runtime.error) {
            console.log("Runtime error.")
        }
    });
}
//save the counter for the total plaintext ads 
function saveTotalPlain(pl) {
    chrome.storage.sync.set({"total_plain":pl}, function() {
        if (chrome.runtime.error) {
            console.log("Runtime error");
        }
    });
}

var treeXML_2 = null;
function saveXML(d) {
    treeXML_2 = d;
}

//get the tree in xml format from the server 
function getTree()
{
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        if (xhr.readyState == 4) { 
            var data = xhr.responseText;
            saveXML(data);
        }
    }
    //xhr.open('GET','DT/simplifiedDT.xml',true);
    xhr.open('GET','DT/parsedXML5.xml',true);
    xhr.send(null);
}

function printTree(data)
{
    console.log(data);
}

//remove the lines from the xml tree which contains only whitespaces
function removeEmptyFields(arr) {
    var arraylength = arr.length;
    var ret = [];
    for (var i =0; i < arraylength; i++) {
        if(arr[i].length > 2)
            ret.push(arr[i]);
    }
    return ret;
}

//this is used to check if the tree exists
if(treeXML_2 === null) {
    getTree();
}
//cretae the advertiser keyword hashtable
var keyword_url = chrome.extension.getURL('databases/keywords.csv');
$.get(keyword_url,function(data){
    var ad2key = data;
    ad2key = ad2key.split("\n");
    for(i in ad2key) {
        var tmp = ad2key[i].replace(/"/g,"").split('\t');
        if(publisherKeywordTable[tmp[0]] === undefined) publisherKeywordTable[tmp[0]] = [tmp[1]];
        else						publisherKeywordTable[tmp[0]].push(tmp[1]);
    }
    delete publisherKeywordTable[""];
    console.log(publisherKeywordTable);
});

//read the IABs file 
var IAB_url = chrome.extension.getURL('IABs/IABmap.csv');
var IABs = null;

$.get(IAB_url, function(data){
    IABs = data;
    //convert csv to array
    IABs = IABs.split("\n");
    IABs_tmp = [];
    for(i in IABs) {
        IABs_tmp.push(IABs[i].split("\t"));

    }
    IABs = {};
    //convert array to dictionary
    for(i in IABs_tmp) {
        IABs[IABs_tmp[i][0]] = IABs_tmp[i][2];
    }
    //console.log(IABs);
});

var adDB = [];
//get the URL of the local database for known ad exchanges
var adDB_url = chrome.extension.getURL('databases/services.json');

//read and parse the database, keep only the ad exchanges
$.getJSON(adDB_url, function(data){
    adDB_tmp = data.categories.Advertising;
    for(x in adDB_tmp) {
        for(i in adDB_tmp[x]) {
            for(sites in adDB_tmp[x][i]) {
                for(url in adDB_tmp[x][i][sites]){
                    adDB.push(adDB_tmp[x][i][sites][url]);
                }
            }
        }

    }
    console.log(adDB);
});

chrome.storage.sync.get('yourValue', function(vl) {
    if (typeof vl.yourValue === 'undefined') {
        yourValue = 0;
    } else {
        yourValue = vl.yourValue;
    }
});

chrome.storage.sync.get('total_enc', function(enc) {
    if (typeof enc.total_enc === 'undefined') {
        total_enc = 0;
    } else {
        total_enc = enc.total_enc
    }
});

chrome.storage.sync.get('total_plain', function(pl){
    if (typeof pl.total_plain === 'undefined') {
        total_plain = 0;
    } else {
        total_plain = pl.total_plain;
    }
});

//this are for indexedDB
if(!('indexedDB' in window)) {
    console.log("This browser doent support IndexedDB");
} else {
    console.log("This browser support indexedDB");
}

var openRequest = indexedDB.open("URL2",1);
var db;

openRequest.onupgradeneeded = function(e) {
    console.log("running onupgradeneeded");
    var thisDB = e.target.result;

    if(!thisDB.objectStoreNames.contains("URLarray")) {
        console.log("creating the new db");
        thisDB.createObjectStore("URLarray",{autoIncrement:true});
    }
}

openRequest.onsuccess = function(e) {
    console.log("running onsuccess");
    db = e.target.result;
    //tx = db.transaction(["URL_array"],"readwrite");
    //store = tx.objectStore("URL_array");
}

function addPrices(e) {
    console.log("adding to indexedDB");

    var tx = db.transaction(["URLarray"],"readwrite");
    var store = tx.objectStore("URLarray");
    var req = store.add(e);
    //console.log(req);	
    req.onsuccess = function(ev) {
        console.log("We did it!!!!");
    }
    req.onerror = function(ev) {
        console.log(e);
        console.log("Error",ev.target.error.name);
        store.put(e);
    }
}

function clearPricesArray() {	
    var tx = db.transaction(["URLarray"],"readwrite");
    var store = tx.objectStore("URLarray");
    store.clear();
}

function printPricesArray() {

    var tx = db.transaction(["URLarray"],"readwrite");
    var store = tx.objectStore("URLarray");	
    //var ob = store.get("urlarr");
    var ob = store.getAll();
    //console.log(ob);
    //result is an array containg tuples of {timestamp, urltoprice}
    //the urltoprices uses -> delimiters to seperate the url parameters frin the actual prices
    ob.onsuccess = function(ev) {
        console.log(ob.result);
    }
    //console.log(ob);
}

//here ends the indexedDB
intercept();

