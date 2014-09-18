/* CDDL HEADER START
 *
 * The contents of this file are subject to the terms of the
 * Common Development and Distribution License (the "License").
 * You may not use this file except in compliance with the License.
 *
 * You can obtain a copy of the license at src/license_cddl-1.0.txt
 * or http://www.opensolaris.org/os/licensing.
 * See the License for the specific language governing permissions
 * and limitations under the License.
 *
 * When distributing Covered Code, include this CDDL HEADER in each
 * file and include the License file at src/license_cddl-1.0.txt
 * If applicable, add the following below this CDDL HEADER, with the
 * fields enclosed by brackets "[]" replaced with your own identifying
 * information: Portions Copyright [yyyy] [name of copyright owner]
 *
 * CDDL HEADER END
 */

/* Copyright (c) 2014 Darran Hunt. All rights reserved. */

/*!      \file background.js
*        \brief        Mooltipass Chrome Authentication plugin
*        Created: 14/6/2014
*        Author: Darran Hunt
*
*        Waits for requests from the web page content script for
*        credentials, asks the Mooltipass Client for them, then sends
*        the response back to the content script.
* 
* 	Modified: 12/09/2014 by Bjorn Wielens
* 	- Implemented blacklist for sites.
* 	- Implemented card presence detection.
*/


var mooltipass = {};
var mpClient = null;
var contentAddr = null;
var connected = null;
var mpInputCallback = null;;

function getAll(ext)
{
    for (var ind=0; ind<ext.length; ind++) {
        if (ext[ind].shortName == 'Mooltipass Client') {
            mpClient = ext[ind];
            break;
        }
    }

    if (mpClient) {
        chrome.runtime.sendMessage(mpClient.id, { type: 'ping' });
        console.log('found mooltipass client "'+ext[ind].shortName+'" id='+ext[ind].id);
    } else {
        console.log('No mooltipass client found');
    }
}

// Search for the Mooltipass Client
chrome.management.getAll(getAll);

// Messages from the mooltipass client app
chrome.runtime.onMessageExternal.addListener(function(request, sender, sendResponse) 
{
    console.log('back: app req '+JSON.stringify(request));
    switch (request.type) {
        case 'credentials':
            console.log('back: got credentials '+JSON.stringify(request));
            //chrome.tabs.sendMessage(contentAddr, request);
            if (mpInputCallback) {
                mpInputCallback([{Login: request.inputs.login.value, Name: '<name>', Uuid: '<Uuid>', Password: request.inputs.password.value, StringFields: []}]);
                mpInputCallback = null;
            }
            break;
        case 'updateComplete':
            console.log('back: got updateComplete');
            //chrome.tabs.sendMessage(contentAddr, request);
            break;
        case 'connected':
            console.log('back: got connected');
            connected = request;
            //if (contentAddr) {
                //chrome.tabs.sendMessage(contentAddr, request);
            //}
            break;
        case 'disconnected':
            console.log('back: got disconnected');
            connected = null;
            //if (contentAddr) {
                //chrome.tabs.sendMessage(contentAddr, request);
            //}
            break;
        case 'cardPresent':
            console.log('back: got cardPresent');
            //if (contentAddr) {
                //chrome.tabs.sendMessage(contentAddr, request);
            //}
            //if (!request.state){
                //chrome.browserAction.setIcon({path: 'mooltipass-nocard.png'});
            //}
            break;
        case 'rescan':
            console.log('back: got rescan');
            //if (contentAddr) {
                //chrome.tabs.sendMessage(contentAddr, request);
            //}
            break;
        default:
            break;
    }
});

mooltipass.addCredentials = function(callback, tab, username, password, url) 
{
    mooltipass.updateCredentials(callback, tab, null, username, password, url);
}

mooltipass.isConnected = function()
{
    return connected != null;
}

// needs to block until a response is received.
mooltipass.updateCredentials = function(callback, tab, entryId, username, password, url) 
{
	console.log("mp.updateCredentials(callback, {1}, {2}, {3}, [password], {4})", tab.id, entryId, username, url);

	// unset error message
	page.tabs[tab.id].errorMessage = null;

    chrome.runtime.sendMessage({type: 'update', url: url, inputs: {login: {id: 0, name: 0, value: username}, password: { id: 1, name: 1, value: password }}});

    // this needs to be blocking, but can't because we're waiting on an async response from the mp app and the mp, which may never arrive.
    // So this actually needs to tight loop until an mp response arrives, with a timeout.
    if (false) {
	var result = keepass.send(request);
	var status = result[0];
	var response = result[1];

	// verify response
	var code = "error";
	if(keepass.checkStatus(status, tab)) {
		var r = JSON.parse(response);
		if (keepass.verifyResponse(r, key, id)) {
			code = "success";
		}
		else {
			code = "error";
		}
	}
    }

	callback("success");
}


mooltipass.associate = function(callback, tab) 
{
    console.log('mp.associate()');
}


mooltipass.generatePassword = function(callback, tab) 
{
    console.log('mp.generatePassword()');
}

mooltipass.copyPassword = function(callback, tab)
{
    console.log('mp.copyPassword()');
}


mooltipass.retrieveCredentials = function(callback, tab, url, submiturl, forceCallback, triggerUnlock) 
{
	page.debug("mp.retrieveCredentials(callback, {1}, {2}, {3}, {4})", tab.id, url, submiturl, forceCallback);

	// unset error message
	page.tabs[tab.id].errorMessage = null;

	// is browser associated to keepass?
	if (!mooltipass.isConnected()) {
		browserAction.showDefault(null, tab);
		if(forceCallback) {
			callback([]);
		}
		return;
	}

    request = { type: 'inputs',
                url: url, 
                inputs: {
                    login: {id: 'login.id', name: 'login.name'},
                    password: {id: 'pass.id', name: 'pass.name'} } };

    console.log('sending to '+mpClient.id);
    contentAddr = tab.id;
    mpInputCallback = callback;
    chrome.runtime.sendMessage(mpClient.id, request);
}
