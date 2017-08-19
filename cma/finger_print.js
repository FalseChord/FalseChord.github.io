//console.log("start tracking...");
//console.log(document.cookie);

function readCookie(name){
    var all_cookies = document.cookie.split('; ');

    for(i=all_cookies.length-1; i>=0; i--){
        one_cookie = all_cookies[i].split('=');
        if (one_cookie[0]==name) { return(one_cookie[1]); }
    }

    default_key = new Date().toISOString();
    return (default_key);
}

function onUserClickLike() {
    console.log("user clicked Like button");
}

var mapping_cookie = readCookie("_ga");
var fprint=encodeURIComponent(document.cookie+navigator.userAgent);
//console.log(fprint);
xshow_url = 'https://us-central1-sogi-ads.cloudfunctions.net/xshow_script?';
url_load = xshow_url+"key="+mapping_cookie+"&likes=2&fprint="+fprint;
//console.log(url_load);

//console.log("window.url_loaded = "+window.url_loaded);
$('#fb_like_lead').load(url_load);

