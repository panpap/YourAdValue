function writeToPopUp() {
	var clr = chrome.extension.getBackgroundPage().total_plain;
	var enc = chrome.extension.getBackgroundPage().total_enc;
	var value = chrome.extension.getBackgroundPage().yourValue;
//	if(clr != 0 || enc != 0)
//		value = value / (clr + enc);

	var session_clr = chrome.extension.getBackgroundPage().session_plain;
	var session_enc = chrome.extension.getBackgroundPage().session_enc;
	var session_value = chrome.extension.getBackgroundPage().session_value;
    //if(session_clr != 0 || session_enc != 0)
	//	session_value = session_value / (session_clr + session_enc)

	return "<div class='all_time_stats'>"+
		"<div id='title'>"+"All time stats"+ "<br />"+ "</div>" +
		"Cleartext ads: " + clr.toString() + "<br/>" + 
		"Encrypted ads: "+ enc.toString() + "<br />"+
		"Total value: "+ value.toFixed(2).toString() + " USD<br />"+ 
		"<span class='all_time_stats_text'>The all time stats section display statistics about ads from the beggining of time.<br/>Cleartext ads: are the advertisements that their value is in plaintext.<br/> Encrypted ads: are the ads that their value is encrypted. <br/> Total value is the summary of the cleartext and encrypted prices in US dollars.  </span> </div>"+ 
		"<div class='session_stats'>"+
		"<div id='title'>"+"current session stats"+ "<br />"+ "</div>" +
		"Cleartext ads: "+ session_clr.toString() +"<br />"+
		"Encrypted ads: "+ session_enc.toString() +"<br />"+
		"Total value: "+ session_value.toFixed(2).toString() +" USD"+
		"<span class='session_stats_text'>The current session stats section displays statistics about ads from the time you opened your browser until closing it. <br/> Cleartext ads: are the advertisments that their value is in plaintext.<br/> Encrypted ads: are the ads that their value is encrypted. <br/> Total value is the summary of the cleartext and encrypted prices in US dollars for the current session. </span>"+
		"</div>";
	//return chrome.extension.getBackgroundPage().printTest();
}

var ctx = document.getElementById("myChart").getContext('2d');
var myChart = new Chart(ctx, {
	type: 'doughnut',
	data: {
		label: "All time statistics",
		labels: ["Cleartext ads","Encrypted ads"],
		datasets: [{	
			data: [chrome.extension.getBackgroundPage().total_plain, 
				chrome.extension.getBackgroundPage().total_enc],
			backgroundColor: ["#b1e5f2", "#a6a6a8"],
		}]
	}
});

chrome.extension.getBackgroundPage().newPrices = 0;

document.write(writeToPopUp());

//this are used for enabling and disabling the plugin
function EnableButton() {
    //return "<label align='left' id='switch'>"+
  	return	   "<input type='button' value='Enable Plugin' id='switch'>"//+
  		   //"<span class='slider round'></span>"+
		   //"</label>" + "<div id='DisTag'><h2>Enable plugin</h2></div>"
}
function disableButton() {
    //return "<label align='left' id='switch'>"+
  	return	   "<input type='button' value='Disable Plugin' id='switch'>"//+
  		   //"<span class='slider round'></span>"+
		   //"</label>" + "<div id='DisTag'><h2>Disable plugin</h2></div>"
}
var disableValue = chrome.extension.getBackgroundPage().disable; //enableValue holds if the plugin is enabled or disabled

if(disableValue === 0)
	document.write(disableButton())
else
	document.write(EnableButton())

document.getElementById("switch").addEventListener("click",function(){
	var dis = chrome.extension.getBackgroundPage().disable;
	if(dis === 0) {
		chrome.extension.getBackgroundPage().disableValue();
		document.getElementById('switch').value = 'Enable Plugin';
		//document.getElementById('DisTag').innerHTML = '<h2>Enable Plugin</h2>';
	}
	else {	
		chrome.extension.getBackgroundPage().enableValue();
		document.getElementById('switch').value = 'Disable Plugin';
		//document.getElementById('DisTag').innerHTML = '<h2>Disable Plugin</h2>';
	}
});

document.write("<input type='image' src='./images/questionaire.png' title='Complete our questionnaire' width=30 height=34 id='questionaire'>")
document.getElementById('questionaire').addEventListener("click", function() {
    chrome.tabs.create({url:"https://goo.gl/forms/YEXBrCAJ076SeSZ62"});
});

function openDescription() {
   chrome.browserAction.onClicked.addListener(function(activeTab){
  	   var newURL = "http://stackoverflow.com/";
  	   chrome.tabs.create({ url: newURL });
	}); 
}
document.write("<input type='button' value='Plugin Description' id='desc_key'>");
document.getElementById('desc_key').addEventListener("click",function(){
  	   chrome.tabs.create({ url: chrome.extension.getURL('description.html') }); 
});

document.write("<input type='image' src='./images/bug.png' title='Report a bug' width=30 height=34 id='bug'>")
document.getElementById('bug').addEventListener("click", function() {
    chrome.tabs.create({url:"https://docs.google.com/forms/d/e/1FAIpQLScS42vjYmo-bIVJ9Sv04WOD-eykFWitjNn0sYUdHsO43LVhyA/viewform"});
});
/*
document.write("<input type='image' src='./images/questionaire.png' width=34 height=34 id='questionaire'>")
document.getElementById('questionaire').addEventListener("click", function() {
    chrome.tabs.create({url:"https://goo.gl/forms/YEXBrCAJ076SeSZ62"});
});
*/
chrome.browserAction.setBadgeText({
	text: ""
});

chrome.browserAction.setIcon({
	path: "images/icon2-38.png"
});
