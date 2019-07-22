// make sure that the CSV file for continuing order is overwritten
chrome.downloads.onDeterminingFilename.addListener(function(item, suggest) {
    suggest({
        filename: item.filename,
        conflictAction: "overwrite",
    });
});

// open help page on install
chrome.runtime.onInstalled.addListener(function(object) {
    chrome.tabs.create({url: "html/help.html"});
});

// ensure embedded buttons are added every time Alma refreshes
chrome.tabs.onUpdated.addListener(function(id, changes, tab) {
    if (tab.url.includes("alma.exlibrisgroup.com/mng/action/home.do")) {
        chrome.tabs.sendMessage(id, {
            greeting: "add_buttons",
        });
    }
});

// perform API requests for popup
chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request.greeting == "api") {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', request.url);
            xhr.onreadystatechange = function() {
                if (this.readyState == 4) {
                    sendResponse({"data": this.responseText, "status": this.status});
                }
            };
            xhr.send('');
            return true;
        } else if (request.greeting == "open_help") {
            chrome.tabs.create({
                "url": "../html/help.html",
            });
        }
    }
);
