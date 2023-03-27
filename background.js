chrome.runtime.onInstalled.addListener(function (details) {
    details && "install" == details.reason && groupAllTabs();
});

chrome.tabs.onCreated.addListener(function (tab) {
    groupTab(tab);
});

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    if (changeInfo.url != undefined) {
        groupTab(tab);
    }
});

const colors = ["grey", "blue", "yellow", "red", "green", "pink", "purple", "cyan"]

const suffix = ["com", "xyz", "net", "top", "tech", "org", "gov", "edu", "cn", "info", "club", "vip"]

function genGroupName(url) {
    url = new URL(url);
    if (url.protocol != "http:" && url.protocol != "https:") {
        return url.protocol.substr(0, url.protocol.length - 1);
    }

    let hostName = url.hostname + "";
    let list = hostName.split(".");
    let first = list[1];
    let next = list[2];
    if (suffix.indexOf(next) >= 0) {
        return first + "." + next;
    }
    if (!isNaN(parseFloat(next)) && isFinite(next)) {
        return "others";
    }
    let groupName = hostName.startsWith("www.") ? hostName.substr(4) : hostName;
    return groupName;
}

let tabIdx = 0;
let allTabs = [];

function onGroupTabComplete() {
    tabIdx++;
    if (tabIdx < allTabs.length) {
        let tab = allTabs[tabIdx];
        groupTab(tab, onGroupTabComplete);
    }
}

function groupAllTabs() {
    console.debug("groupAllTabs");
    chrome.tabs.query(
        {
            currentWindow: true
        }, function (tabs) {
            tabIdx = 0;
            allTabs = tabs;
            groupTab(allTabs[tabIdx], onGroupTabComplete);
        });
}

function groupTab(tab, complete) {
    if (tab.url == "" || tab.pinned) {
        complete && complete();
        return;
    }

    chrome.windows.getCurrent(function (currentWindow) {
        chrome.tabGroups.query(
            {
                windowId: currentWindow.id
            }, function (groups) {
                groupTabIntl(tab, groups, currentWindow, complete);
            })
    });
}

function groupTabIntl(tab, groups, currentWindow, complete) {
    try {
        let groupName = genGroupName(tab.url);
        const existedGroup = groups.find(a => a.title == groupName);
        if (existedGroup == undefined) {
            chrome.tabs.group(
                {
                    createProperties:
                    {
                        windowId: currentWindow.id,
                    },
                    tabIds: tab.id
                }, function (groupId) {
                    console.debug("add group", groupName);
                    chrome.tabGroups.update(groupId,
                        {
                            color: colors[parseInt(Math.random() * 10)],
                            title: groupName,
                        }, function (group) {
                            console.debug("group added", group.title);
                            complete && complete();
                        });
                })
        }
        else {
            console.debug("update group", groupName);
            chrome.tabs.group(
                {
                    groupId: existedGroup.id,
                    tabIds: tab.id
                }, function (groupId) {
                    console.debug("group updated", groupName);
                    complete && complete();
                })
        }
    }
    catch (e) {
        console.error(e)
    }
}