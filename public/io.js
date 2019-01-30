var IO = (function() {

	var
		appid = "664f4c566e534b707844553d",
		sourceId = "23069708",
		country = "BR",

		currency_map = {
			'ARS': {abrv: '$ ', cents: 2, mi: '.', cent: ','},
			'MXN': {abrv: '$ ', cents: 2, mi: ',', cent: '.'},
			'BRL': {abrv: 'R$ ', cents: 2, mi: '.', cent: ','},
			'CLP': {abrv: '$ ', cents: 3, mi: '.', cent: '.'},
			'COP': {abrv: '$ ', cents: 2, mi: '.', cent: ','},
			'PEN': {abrv: 'S/. ', cents: 2, mi: '.', cent: ','},
			'VEF': {abrv: 'Bs.F. ', cents: 2, mi: '.', cent: ','}
		},

		slug_to_id = {},
		id_to_name = {},

		sort_map = {},
		last_sort = '',

		imageErrorSrc = "http://thumbnails.buscape.com.br/404/imagemn100_brasil.gif",
		image1px = "data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==",

		cache = new LRUCache(15),

		// Instant
		suggestionHasHeartBeat = !0,
		suggestionHasHeartBeatKeyboard = !0,
		delayedSuggestion,
		lastSuggestion = "",

		searchHasHeartBeat = !0,
		delayedSearch,
		lastKeyword = "",

		hoverSuggest,
		hasFocus,
		hoverTip,


		// JSONP configs
		head,
		timeout = 10,
		complete = [],
		last_id,


		tabs = [],


		// DOM
		searchHolder = $("instant"),
		suggestionHolder = $("suggestion"),
		sidebar = $("sidebar"),

		offersHolder = $("offers"),
		loading = $("loading"),
		infos = $("infos"),

		h1 = $('title'),
		theader = $('t-header'),

		sorting_open = $('sorting-open'),
		sorting_drop = $('sorting-drop'),
		sort_label = $('sort-label'),

		content = $("content"),

		// ln01
		label_value = searchHolder.value,
		detail = $('detail').innerHTML,
		goto_store = $('goto_store').innerHTML,
		back = $('back').innerHTML,

		// Lazy Loading
		document_body = document.body,
		document_element = document.documentElement,

		instances = {},
		windowHeight,
		last_options = {},
		last_callback = {},
		last_method = "",
		last_title = "",

		has_nextpage = !1,

		loading_interval,

		ies = navigator.userAgent.match(/MSIE/);


	// JSONP-E
	function jsonp_id(id) {
		last_id = id;
	}


	function jcomplete(data) {
		complete[last_id](data);
	}


	function load(url) {

		var script = document.createElement('script'), done = !1;
		script.src = url;
		script.async = !0;
		script.charset = "utf-8";

		script.onload = script.onreadystatechange = function() {
			if ( !done && (!this.readyState || this.readyState === "loaded" || this.readyState === "complete") ) {
				done = !0;
				script.onload = script.onreadystatechange = null;
				if ( script && script.parentNode ) {
					script.parentNode.removeChild( script );
				}
			}
		};

		if ( !head ) {
			head = document.getElementsByTagName('head')[0];
		}

		head.appendChild(script);
	}


	function paramsToQuery(params) {

		var query = [];
		params = params || {};
		for (key in params) {
			if (params.hasOwnProperty(key) && typeof params[key] !== "undefined") {
				query.push(key + "=" + encodeURIComponent(params[key]));
			}
		}
		return query.join('&');
	}


	function jsonp(url, params, callbackquery, callback, onerror) {

		var
			timer,
			func = function(json) {
				clearTimeout(timer);
				callback(json);
			},
			id = complete.push(func)-1;

		timer = setTimeout(function() {
			complete[id] = function() {};
			if (onerror) onerror();
		}, timeout*1000);

		var
			query = (url.match(/\?/)) ? "&" : "?",
			jsonp = "IO.jsonp_id(" + id + ");IO.jcomplete";

		query += paramsToQuery(params);

		// se API precisar de um parametro diferente
		load(url + query + "&" + callbackquery + "=" + jsonp);

		return jsonp;

	}


	function sendRequest(url, callback, postData) {
		var req = createXMLHTTPObject();
		if (!req) return;
		var method = (postData) ? "POST" : "GET";
		req.open(method,url,true);
		if (postData)
			req.setRequestHeader('Content-type','application/x-www-form-urlencoded');
		req.onreadystatechange = function () {
			if (req.readyState != 4) return;
			if (req.status != 200 && req.status != 304) {
	//			alert('HTTP error ' + req.status);
				return;
			}
			callback(req);
		}
		if (req.readyState == 4) return;
		req.send(postData);
	}

	var XMLHttpFactories = [
		function () {return new XMLHttpRequest()},
		function () {return new ActiveXObject("Msxml2.XMLHTTP")},
		function () {return new ActiveXObject("Msxml3.XMLHTTP")},
		function () {return new ActiveXObject("Microsoft.XMLHTTP")}
	];

	function createXMLHTTPObject() {
		var xmlhttp = false;
		for (var i=0;i<XMLHttpFactories.length;i++) {
			try {
				xmlhttp = XMLHttpFactories[i]();
			}
			catch (e) {
				continue;
			}
			break;
		}
		return xmlhttp;
	}


	// cross browser event handling
	function addEvent( el, type, fn ) {
		if ( window.addEventListener ) {
			el.addEventListener( type, fn, false );
		} else if ( window.attachEvent ) {
			el.attachEvent( "on" + type, fn );
		} else {
			var old = el["on" + type];
			el["on" + type] = function() { old(); fn(); };
		}
	}


	// cross browser event handling
	function removeEvent( el, type, fn ) {
		if ( window.removeEventListener ) {
			el.removeEventListener( type, fn, false );
		} else if ( window.attachEvent ) {
			el.detachEvent( "on" + type, fn );
		}
	}


	// getBoundingClientRect alternative
	function findPos(obj) {
		var top  = 0;
		if (obj && obj.offsetParent) {
			do {
				top += obj.offsetTop || 0;
				top -= obj.scrollTop || 0;
			} while (obj = obj.offsetParent);
			return { "top" : top };
		}
	}


	// top position of an element
	var getTopPos = (function() {
		var dummy = document.createElement("div");
		if ( dummy.getBoundingClientRect ) {
			return function( el ) {
				return el.$$top || el.getBoundingClientRect().top;
			};
		} else {
			return function( el ) {
				return el.$$top || findPos( el ).top;
			};
		}
	})();


	// sorts images by their vertical positions
	function img_sort( a, b ) {
		return getTopPos( a ) - getTopPos( b );
	}


	// let's just provide some interface
	// for the outside world
	var FoldHandler = function( target, offset ) {

		var
			imgs,    // images array (ordered)
			last,    // last visible image (index)
			id,      // id of the target element
			self;    // this instance

		offset = offset || 0; // for prefetching

		if ( !target ) {
			target = document;
			id = "$document";
		} else if ( typeof target === "string" ) {
			id = target;
			target = document.getElementById( target );
		} else {
			id = target.id || "$undefined";
		}

		// return if this instance already exists
		if ( instances[id] ) {
			return instances[id];
		}

		// or make a new instance
		self = instances[id] = {

			// init & reset
			init: function() {
				imgs = null;
				last = 0;
				addEvent( window, "scroll", self.fetchImages );
				self.fetchImages();
				return this;
			},

			destroy: function() {
				removeEvent( window, "scroll", self.fetchImages );
				delete instances[id];
			},

			// fetches images, starting at last (index)
			fetchImages: function() {

				var
					img,
					temp,
					len,
					i;

				// still trying to get the target
				target = target || document.getElementById( id );

				// if it's the first time
				// initialize images array
				if ( !imgs && target ) {

					temp = target.getElementsByTagName( "img" );

					if ( temp.length ) {
						imgs = [];
						len  = temp.length;
					} else return;

					// fill the array for sorting
					for ( i = 0; i < len; i++ ) {
						img = temp[i];

						if ( img.nodeType === 1 && img.getAttribute("rel") ) {

							// store them and cache current
							// positions for faster sorting
							img.$$top = getTopPos( img );
							imgs.push( img );
						}
					}

					imgs.sort( img_sort );
				}

				// loop through the images
				while ( imgs[last] ) {

					img = imgs[last];

					// delete cached position
					if ( img.$$top ) img.$$top = null;

					// check if the img is above the fold
					if ( getTopPos( img ) < windowHeight + offset )  {
						img.src = img.getAttribute("rel");

						// then use onerror and change the src
						// (ies spoofing)
						if (!ies) {
              setTimeout(function() {
  							img.onerror = function() {
  								// console.log(1);
  								imageError(this);
  							}
              }, 10);
						}

						last++;
					} else return;
				}

				// we've fetched the last image -> finished
				if ( last && last === imgs.length )  {

					if (has_nextpage) {

						last_options["page"] = last_options["page"] + 1;
						BWS(last_method, last_options, last_callback);

						addLoading();

					}

					self.destroy();
				}

			}
		}
		return self.init();
	}


	function MouseBoundaryCrossing(evt, landmark) {
	    evt = evt || window.event;

	    var eventType = evt.type;

	    this.inLandmark = false;
	    this.leftLandmark = false;
	    this.enteredLandmark = false;

	    if(eventType == "mouseout") {
	        this.toElement = evt.relatedTarget || evt.toElement;
	        this.fromElement = evt.target || evt.srcElement;
	    } else if(eventType == "mouseover") {
	        this.toElement = evt.target || evt.srcElement;
	        this.fromElement = evt.relatedTarget || evt.fromElement;
	    } else throw (new Error("Event type \"" + eventType + "\" is irrelevant"));	//irrelevant event type

	    // target is unknown
	    // this seems to happen on the mouseover event when the mouse is already inside the element when the page loads and
	    // the mouse is moved: fromElement is undefined
	    if(!this.toElement || !this.fromElement) throw (new Error("Event target(s) undefined"));

	    //determine whether from-element is inside or outside of landmark (i.e., does tmpFrom == the landmark or the document?)
	    var tmpFrom = this.fromElement;
	    while(tmpFrom.nodeType == 1)	//while tmpFrom is an element node
	    {
	        if(tmpFrom == landmark) break;
	        tmpFrom = tmpFrom.parentNode;
	    }

	    //determine whether to-element is inside or outside of landmark (i.e., does tmpTo == the landmark or the document?)
	    var tmpTo = this.toElement;
	    while(tmpTo.nodeType == 1)	//while tmpTo is an element node
	    {
	        if(tmpTo == landmark) break;
	        tmpTo = tmpTo.parentNode;
	    }

	    if(tmpFrom == landmark && tmpTo == landmark) this.inLandmark = true;	//mouse is inside landmark; didn't enter or leave
	    else if(tmpFrom == landmark && tmpTo != landmark)	//mouse left landmark
	    {
	        this.leftLandmark = true;
	        this.inLandmark = (eventType == "mouseout");	//mouseout: currently inside landmark, but leaving now
	    //mouseover: currently outside of landmark; just left
	    }
	    else if(tmpFrom != landmark && tmpTo == landmark)	//mouse entered landmark
	    {
	        this.enteredLandmark = true;
	        this.inLandmark = (eventType == "mouseover");	//mouseover: currently inside landmark; just entered
	    //mouseout: currently outside of landmark, but entering now
	    }
	//else	//mouse is outside of landmark; didn't enter or leave
	}


	//usage:  elem.onmouseout = onMouseLeave(leaveHandler, outHandler);
	//usage:  elem.onmouseover = onMouseEnter(enterHandler, overHandler);
	function onMouseLeave(elem, handleLeave, handleOut) {
	    if(!handleLeave) return handleOut;
	    return function(evt)
	    {
	        evt = evt || window.event;
	        if(handleOut) handleOut.call(elem, evt);
	        try{
	            var mbc = new MouseBoundaryCrossing(evt, elem);
	            if(mbc.leftLandmark) handleLeave.call(elem, evt);
	        }catch(e){}
	    }
	}

	// function onMouseEnter(elem, handleEnter, handleOver) {
	//     if(!handleEnter) return handleOver;
	//     return function(evt)
	//     {
	//         evt = evt || window.event;
	//         if(handleOver) handleOver.call(elem, evt);
	//         try{
	//             var mbc = new MouseBoundaryCrossing(evt, elem);
	//             if(mbc.enteredLandmark) handleEnter.call(elem, evt);
	//         }catch(e){}
	//     }
	// }

	/**
	 * A doubly linked list-based Least Recently Used (LRU) cache. Will keep most
	 * recently used items while discarding least recently used items when its limit
	 * is reached.
	 *
	 * Licensed under MIT. Copyright (c) 2010 Rasmus Andersson <http://hunch.se/>
	 * See README.md for details.
	 *
	 * Illustration of the design:
	 *
	 *       entry             entry             entry             entry
	 *       ______            ______            ______            ______
	 *      | head |.newer => |      |.newer => |      |.newer => | tail |
	 *      |  A   |          |  B   |          |  C   |          |  D   |
	 *      |______| <= older.|______| <= older.|______| <= older.|______|
	 *
	 *  removed  <--  <--  <--  <--  <--  <--  <--  <--  <--  <--  <--  added
	 */
	function LRUCache(limit) {
	  // Current size of the cache. (Read-only).
	  this.size = 0;
	  // Maximum number of items this cache can hold.
	  this.limit = limit;
	  this._keymap = {};
	}

	/**
	 * Put <value> into the cache associated with <key>. Returns the entry which was
	 * removed to make room for the new entry. Otherwise undefined is returned
	 * (i.e. if there was enough room already).
	 */
	LRUCache.prototype.put = function(key, value) {
	  var entry = {key:key, value:value};
	  // Note: No protection agains replacing, and thus orphan entries. By design.
	  this._keymap[key] = entry;
	  if (this.tail) {
	    // link previous tail to the new tail (entry)
	    this.tail.newer = entry;
	    entry.older = this.tail;
	  } else {
	    // we're first in -- yay
	    this.head = entry;
	  }
	  // add new entry to the end of the linked list -- it's now the freshest entry.
	  this.tail = entry;
	  if (this.size === this.limit) {
	    // we hit the limit -- remove the head
	    return this.shift();
	  } else {
	    // increase the size counter
	    this.size++;
	  }
	}

	/**
	 * Purge the least recently used (oldest) entry from the cache. Returns the
	 * removed entry or undefined if the cache was empty.
	 *
	 * If you need to perform any form of finalization of purged items, this is a
	 * good place to do it. Simply override/replace this function:
	 *
	 *   var c = new LRUCache(123);
	 *   c.shift = function() {
	 *     var entry = LRUCache.prototype.shift.call(this);
	 *     doSomethingWith(entry);
	 *     return entry;
	 *   }
	 */
	LRUCache.prototype.shift = function() {
	  // todo: handle special case when limit == 1
	  var entry = this.head;
	  if (entry) {
	    if (this.head.newer) {
	      this.head = this.head.newer;
	      this.head.older = undefined;
	    } else {
	      this.head = undefined;
	    }
	    // Remove last strong reference to <entry> and remove links from the purged
	    // entry being returned:
	    entry.newer = entry.older = undefined;
	    // delete is slow, but we need to do this to avoid uncontrollable growth:
	    delete this._keymap[entry.key];
	  }
	  return entry;
	}

	/**
	 * Get and register recent use of <key>. Returns the value associated with <key>
	 * or undefined if not in cache.
	 */
	LRUCache.prototype.get = function(key, returnEntry) {
	  // First, find our cache entry
	  var entry = this._keymap[key];
	  if (entry === undefined) return; // Not cached. Sorry.
	  // As <key> was found in the cache, register it as being requested recently
	  if (entry === this.tail) {
	    // Already the most recenlty used entry, so no need to update the list
	    return entry.value;
	  }
	  // HEAD--------------TAIL
	  //   <.older   .newer>
	  //  <--- add direction --
	  //   A  B  C  <D>  E
	  if (entry.newer) {
	    if (entry === this.head)
	      this.head = entry.newer;
	    entry.newer.older = entry.older; // C <-- E.
	  }
	  if (entry.older)
	    entry.older.newer = entry.newer; // C. --> E
	  entry.newer = undefined; // D --x
	  entry.older = this.tail; // D. --> E
	  if (this.tail)
	    this.tail.newer = entry; // E. <-- D
	  this.tail = entry;
	  return returnEntry ? entry : entry.value;
	}

	// ----------------------------------------------------------------------------
	// Following code is optional and can be removed without breaking the core
	// functionality.

	/**
	 * Check if <key> is in the cache without registering recent use. Feasible if
	 * you do not want to chage the state of the cache, but only "peek" at it.
	 * Returns the entry associated with <key> if found, or undefined if not found.
	 */
	LRUCache.prototype.find = function(key) {
	  return this._keymap[key];
	}
	//
	// /**
	//  * Update the value of entry with <key>. Returns the old value, or undefined if
	//  * entry was not in the cache.
	//  */
	// LRUCache.prototype.set = function(key, value) {
	//   var oldvalue, entry = this.get(key, true);
	//   if (entry) {
	//     oldvalue = entry.value;
	//     entry.value = value;
	//   } else {
	//     oldvalue = this.put(key, value);
	//     if (oldvalue) oldvalue = oldvalue.value;
	//   }
	//   return oldvalue;
	// }
	//
	// /**
	//  * Remove entry <key> from cache and return its value. Returns undefined if not
	//  * found.
	//  */
	// LRUCache.prototype.remove = function(key) {
	//   var entry = this._keymap[key];
	//   if (!entry) return;
	//   delete this._keymap[entry.key]; // need to do delete unfortunately
	//   if (entry.newer && entry.older) {
	//     // relink the older entry with the newer entry
	//     entry.older.newer = entry.newer;
	//     entry.newer.older = entry.older;
	//   } else if (entry.newer) {
	//     // remove the link to us
	//     entry.newer.older = undefined;
	//     // link the newer entry to head
	//     this.head = entry.newer;
	//   } else if (entry.older) {
	//     // remove the link to us
	//     entry.older.newer = undefined;
	//     // link the newer entry to head
	//     this.tail = entry.older;
	//   } else {// if(entry.older === undefined && entry.newer === undefined) {
	//     this.head = this.tail = undefined;
	//   }
	//
	//   this.size--;
	//   return entry.value;
	// }
	//
	// /** Removes all entries */
	// LRUCache.prototype.removeAll = function() {
	//   // This should be safe, as we never expose strong refrences to the outside
	//   this.head = this.tail = undefined;
	//   this.size = 0;
	//   this._keymap = {};
	// }
	//
	// /**
	//  * Return an array containing all keys of entries stored in the cache object, in
	//  * arbitrary order.
	//  */
	// if (typeof Object.keys === 'function') {
	//   LRUCache.prototype.keys = function() { return Object.keys(this._keymap); }
	// } else {
	//   LRUCache.prototype.keys = function() {
	//     var keys = [];
	//     for (var k in this._keymap) keys.push(k);
	//     return keys;
	//   }
	// }


	/*
	 * Copyright (c) 2009-2011 Andreas Blixt <andreas@blixt.org>
	 * Contributors: Aaron Ogle <aogle@avencia.com>,
	 *               Matti Virkkunen <mvirkkunen@gmail.com>,
	 *               Simon Chester <simonches@gmail.com>
	 * http://github.com/blixt/js-hash
	 * MIT License: http://www.opensource.org/licenses/mit-license.php
	 *
	 * Hash handler
	 * Keeps track of the history of changes to the hash part in the address bar.
	 */
	/* WARNING for Internet Explorer 7 and below:
	 * If an element on the page has the same ID as the hash used, the history will
	 * get messed up.
	 *
	 * Does not support history in Safari 2 and below.
	 *
	 * Example:
	 *     function handler(newHash, initial) {
	 *         if (initial)
	 *             alert('Hash is "' + newHash + '"');
	 *         else
	 *             alert('Hash changed to "' + newHash + '"');
	 *     }
	 *     Hash.init(handler);
	 *     Hash.go('abc123');
	 *
	 *
	 * Updated by Simon Chester (simonches@gmail.com) on 2011-05-16:
	 *   - Removed the need for blank.html and the iframe argument by creating the
	 *     iframe on initialization.
	 *
	 * Updated by Matti Virkkunen (mvirkkunen@gmail.com) on 2009-11-16:
	 *   - Added second argument to callback that indicates whether the callback is
	 *     due to initial state (true) or due to an actual change to the hash
	 *     (false).
	 *
	 * Updated by Aaron Ogle (aogle@avencia.com) on 2009-08-11:
	 *   - Fixed bug where Firefox automatically unescapes location.hash but no
	 *     other browsers do. Always get the hash by parsing location.href and
	 *     never use location.hash.
	 */

	var Hash = (function () {
		var
			documentMode = document.documentMode,
			history = window.history,
			// Plugin variables
			callback, hash,
			// IE-specific
			iframe,

		getHash = function () {
		    // Internet Explorer 6 (and possibly other browsers) extracts the query
		    // string out of the location.hash property into the location.search
		    // property, so we can't rely on it. The location.search property can't be
		    // relied on either, since if the URL contains a real query string, that's
		    // what it will be set to. The only way to get the whole hash is to parse
		    // it from the location.href property.
		    //
		    // Another thing to note is that in Internet Explorer 6 and 7 (and possibly
		    // other browsers), subsequent hashes are removed from the location.href
		    // (and location.hash) property if the location.search property is set.
		    //
		    // Via Aaron: Firefox 3.5 (and below?) always unescape location.hash which
		    // causes poll to fire the hashchange event twice on escaped hashes. This
		    // is because the hash variable (escaped) will not match location.hash
		    // (unescaped.) The only consistent option is to rely completely on
		    // location.href.
		    var index = window.location.href.indexOf('!');
		    return (index == -1 ? '' : window.location.href.substr(index + 1));
		},

		// Used by all browsers except Internet Explorer 7 and below.
		poll = function () {
		    var curHash = getHash();
		    if (curHash != hash) {
		        hash = curHash;
		        callback(curHash, false);
		    }
		},

		// From:
		// http://perfectionkills.com/detecting-event-support-without-browser-sniffing/
		isHashChangeSupported = function() {
		    var eventName = 'onhashchange';
		    var isSupported = (eventName in document.body);
		    if (!isSupported) {
		        document.body.setAttribute(eventName, 'return;');
		        isSupported = typeof document.body[eventName] == 'function';
		    }

		    // documentMode logic from YUI to filter out IE8 Compat Mode (which
		    // generates false positives).
		    return isSupported && (document.documentMode === undefined ||
		                           document.documentMode > 7);
		},

		createIframe = function () {
		    var tempEl = document.createElement();
		    tempEl.innerHTML = '<iframe src="javascript:void(0)" tabindex="-1" ' +
		                       'style="display: none;"></iframe>';
		    var frame = tempEl.childNodes[0];
		    document.body.appendChild(frame);
		    return frame;
		},

		// Used to create a history entry with a value in the iframe.
		setIframe = function (newHash) {
		    try {
		        var doc = iframe.contentWindow.document;
		        doc.open();
		        doc.write('<html><body>' + newHash + '</body></html>');
		        doc.close();
		        hash = newHash;
		    } catch (e) {
		        setTimeout(function () { setIframe(newHash); }, 10);
		    }
		},

		// Used by Internet Explorer 7 and below to set up an iframe that keeps track
		// of history changes.
		setUpIframe = function () {
		    // Don't run until access to the body is allowed.
		    try {
		        iframe = createIframe();
		    } catch (e) {
		        setTimeout(setUpIframe, 10);
		        return;
		    }

		    // Create a history entry for the initial state.
		    setIframe(hash);
		    var data = hash;

		    setInterval(function () {
		        var curData, curHash;

		        try {
		            curData = iframe.contentWindow.document.body.innerText;
		            if (curData != data) {
		                data = curData;
		                window.location.hash = hash = curData;
		                callback(curData, true);
		            } else {
		                curHash = getHash();
		                if (curHash != hash) setIframe(curHash);
		            }
		        } catch (e) {
		        }
		    }, 50);
		};

		return {
		    init: function (cb) {
		        // init can only be called once.
		        if (callback) return;

		        callback = cb;

		        // Keep track of the hash value.
		        hash = getHash();
		        cb(hash, true);

		        if (isHashChangeSupported()) {
		            if (window.addEventListener){
		              window.addEventListener('hashchange', poll, false);
		            } else if (window.attachEvent){
		              window.attachEvent('onhashchange', poll);
		            }
		        } else {
		            // Run specific code for Internet Explorer.
		            if (window.ActiveXObject) {
		                if (!documentMode || documentMode < 8) {
		                    // Internet Explorer 5.5/6/7 need an iframe for history
		                    // support.
		                    setUpIframe();
		                }
		            } else {
		                // Change Opera navigation mode to improve history support.
		                if (history.navigationMode) {
		                    history.navigationMode = 'compatible';
		                }

		                setInterval(poll, 50);
		            }
		        }
		    },

		    go: function (newHash) {
		        // Cancel if the new hash is the same as the current one, since there
		        // is no cross-browser way to keep track of navigation to the exact
		        // same hash multiple times in a row. A wrapper can handle this by
		        // adding an incrementing counter to the end of the hash.
		        if (newHash == hash) return;
		        if (iframe) {
		            setIframe(newHash);
		        } else {
		            window.location.hash = hash = newHash;
		            callback(newHash, false);
		        }
		    }
		};
	})();


	/**
	 * Converts a string to a "URL-safe" slug.
	 * Allows for some customization with two optional parameters:
	 *
	 * @param {string} Delimiter used. If not specified, defaults to a dash "-"
	 * @param {array} Adds to the list of non-alphanumeric characters which
	 *   will be converted to the delimiter. The default list includes:
	 *   ['–', '—', '―', '~', '\\', '/', '|', '+', '\'', '‘', '’', ' ']
	 */
	function slugify(to_slug, separators) {
	    var i = separators && separators.length,
	        delimiter = '-',
	        regexEscape = new RegExp(/[[\/\\^$*+?.()|{}\]]/g),
	        regexDelimiter = delimiter.replace(regexEscape, "\\$&"),
	        prohibited = new RegExp("([^a-z0-9" + regexDelimiter + "])", "g"),
	        consecutive = new RegExp("(" + regexDelimiter + "+)", "g"),
	        trim = new RegExp("^" + regexDelimiter + "*(.*?)" + regexDelimiter + "*$"),
	        sanitizer = {
	            // common latin
	'á': 'a','à': 'a','â': 'a','ä': 'a','ã': 'a','æ': 'ae','ç': 'c','é': 'e','è': 'e','ê': 'e','ë': 'e','ẽ': 'e','í': 'i','ì': 'i','î': 'i','ï': 'i','ĩ': 'i','ó': 'o','ò': 'o','ô': 'o','ö': 'o','õ': 'o','œ': 'oe','ß': 'ss','ú': 'u','ù': 'u','û': 'u','ü': 'u','ũ': 'u',

	            // separators
	            '–': delimiter,
	            '—': delimiter,
	            '―': delimiter,
	            '~': delimiter,
	            '/': delimiter,
	            '\\': delimiter,
	            '|': delimiter,
	            '+': delimiter,
	            '‘': delimiter,
	            '’': delimiter,
	            '\'': delimiter,
	            ' ': delimiter,

	            // permitted by default but can be overridden
	            '-': '-',
	            '_': '_'
		};

	    // add any user-defined separator elements
	    if (separators) {
	        for (i; i >= 0; --i) {
	            sanitizer[separators[i]] = delimiter;
	        }
	    }

	    // do all the replacements
	    to_slug = to_slug.toLowerCase(); // if we don't do this, add the uppercase versions to the sanitizer plus inlcude A-Z in the prohibited filter
	    to_slug = to_slug.replace(prohibited, function (match) { return sanitizer[match] || '' });
	    to_slug = to_slug.replace(consecutive, delimiter);
	    to_slug = to_slug.replace(trim, "$1");

	    return to_slug;
	}


	// muda url da imagem para encontrar novos tamanhos
	function resizeThumb(url, tosize) {

		var replaceMap = {
			'100x100': '200x200',
			'_vitrine.': '_detalhe1.',
			'_p.': '_m.',
			'/vitrine/': '/vitrine_grande/'
		}

		for (r in replaceMap) {
			url = tosize == "p" ? url.replace(replaceMap[r], r) : url.replace(r, replaceMap[r]);
			// para na primeira
			if (url.match(replaceMap[r]) || url.match(r)) {
				break;
			}
		}

		return url;
	}


	function imageError(el) {
		el.onerror = null;
		el.src = imageErrorSrc;
	}

	function imageRemove(el) {
		el.onerror = null;
		el.src = image1px;
	}


	function hasClass(el, cls) {
		return el ? el.className.match(new RegExp('(\\s|^)'+cls+'(\\s|$)')) : !1;
	}


	function addClass(ele, cls) {
		if (!hasClass(ele,cls)) ele.className += " "+cls;
	}


	function removeClass(ele, cls) {
		if (hasClass(ele,cls)) {
	    	var reg = new RegExp('(\\s|^)'+cls+'(\\s|$)');
			ele.className=ele.className.replace(reg,' ');
		}
	}


	function formatMoney(n, currency){

		var
			currency = currency_map[currency],
			c = currency.cents,
			d = currency.cent,
			t = currency.mi;

		var c = isNaN(c = Math.abs(c)) ? 2 : c, d = d == undefined ? "," : d, t = t == undefined ? "." : t, s = n < 0 ? "-" : "", i = parseInt(n = Math.abs(+n || 0).toFixed(c)) + "", j = (j = i.length) > 3 ? j % 3 : 0;

		if (n > 0) {

			return "<em>" + currency.abrv + "</em>" + s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");

		} else {
			return "Consulte";
		}

	}


	function toFixed(num) {
		return parseFloat(num).toFixed(2).replace('.', ',');
	}


	function $(e) {
		return document.getElementById(e);
	}


	function addLoading() {

		removeLoading();

		var status = 1;
		loading.className = "load_1";

		loading_interval = setInterval(function() {

			status++;
			if (status > 4) {
				status = 1;
			}
			loading.className = "load_" + status;

		}, 80);

	}


	function removeLoading() {
		clearInterval(loading_interval);
		loading.className = "hide";
	}


	// lazy load de ofertas e categorias sem produtos
	function onDemandBWS(service, params, title, failed) {

		// recursive foldmanager
		last_method = service;
		last_options = params;
		last_title = title;

		last_callback = function(o) {

			delayedSearchCallback(function() {

				removeLoading();

				// se não tiver produto, faz outra de offers
				if (last_method == "findProductList" && !o["product"]) {

					onDemandBWS("findOfferList", last_options, title, !0);

				} else {

					if (last_method == "findOfferList" || last_method == "offers") {
						offersHolder.innerHTML += renderOffers(o);
						offersHolder.className = "";
					} else {
						offersHolder.innerHTML += renderProducts(o);
						offersHolder.className = "domain-list";
					}

					FoldHandler().fetchImages();

				}

			});

		}

		has_nextpage = !1;
		FoldHandler().destroy();

		offersHolder.innerHTML = "";
		addLoading();

		if (last_method == "findProductList" || last_method == "offers") {

			infos.innerHTML = "";
			infos.style.display = "none";
			content.className = "";
			theader.innerHTML = "<h2>" + title + "</h2>";

		} else {

			theader.innerHTML = "<h3>" + title + "</h3>";

		}



		if (last_method == "topProducts") {

			sorting_drop.style.display = "none";
			sorting_open.style.display = "none";

		} else {

			last_options["sort"] = last_sort;

			sorting_open.style.display = "block";
		}

		renderSort();
		BWS(last_method, last_options, last_callback);

	}


	function BWS(service, params, callback) {

		var
			key = service + "/" + paramsToQuery(params),
			cached = cache.get(key),
			lomadee = !0;

		if (service == "viewProductDetails") {
			lomadee = !1;
		}

		if (cached) {

			has_nextpage = cached["totalpages"] > cached["page"];
			callback(cached);

		} else {

			var country = params['country'] || 'BR';
			delete params['country'];

			params['format'] = 'json';
			params['sourceId'] = sourceId;

			jsonp(
				"http://sandbox.buscape.com/service/" +
				// "http://bws.buscape.com/service/" +
				service + (lomadee ? "/lomadee/" : "/") + appid + "/" + country + "/",
				params,
				'callback',
				function(o) {

					cache.put(key, o);
					has_nextpage = o["totalpages"] > o["page"];
					callback(o);

				}
			);

		}

	}


	function viewPortHeight() {
		return window.innerHeight || document_element.clientHeight || document_body.clientHeight;
	}


	function documentHeight() {
		return Math.max(
			document_body.scrollHeight,
			document_element.scrollHeight,
			document_body.offsetHeight,
			document_element.offsetHeight
		);
	}

	// -------------------------------------

	// heartbeat:
	// não executa se estiver executando
	// coloca na fila e executa quando a anterior terminar
	// TODO - executar delayed search no fail do jsonp
	function suggestionSearch(keyword) {


		searchHeartBeat(function() {

			keyword = slugify(keyword);

			if (keyword !== '') {

				Hash.go('!suggestion-' + keyword.replace(/\ /g, '+'));
				// failback
				//		onDemandBWS("findOfferList", {keyword: keyword, results: 28, page: 1}, keyword);
				onDemandBWS("findProductList", {keyword: keyword, results: 28, page: 1}, keyword);
			}

		});

	}


	function mouseSuggestion(type, el, index) {

		var suggestionHolder = el.parentNode.parentNode;

		if (type == 'out') {

			hoverSuggest = !1;
			el.className = "";

		} else {

			hoverSuggest = !0;

			if (hoverTip !== -1) {
				var element = suggestionHolder.getElementsByTagName('li')[hoverTip];
				element ? element.getElementsByTagName('a')[0].className = "" : 0;
			}

			el.className = "hover";
			hoverTip = index;

		}

	}


	function selectSuggestion(el) {
		var input = el.parentNode.parentNode.parentNode.getElementsByTagName("input")[0];

		input.value = el.innerHTML;
		suggestionSearch(el.innerHTML);

		input.focus();

		return !1;
	}


	function suggestionInstant(value) {
		value = slugify(value);

		if (value == '') {
			suggestionBoxHide();
		}

		if (value == '' || value == lastSuggestion) {
			delayedSuggestionCallback(function() {});
			return !1;
		}

		// workTabs(0);

		hoverTip = -1;
		lastSuggestion = value;

		if (value.length == 1) {
			value = value + "%20";
		}
		
		// ajax
		jsonp("http://bws.buscape.com.br/service/autoComplete/mobile/" + appid + "/BR/", {format: "json", keyword: value}, "callback", function(data) {

		// sendRequest("/autoComplete?q=" + value, function(data) {

			delayedSuggestionCallback(function() {

				var
	        		palavras = data["keywords"];

				if (palavras.length > 0 && hasFocus) {
					var suggestion = [];
					for (var i=0; i < palavras.length && i < 6; i++) {
						if (palavras[i] !== value) {
							suggestion.push("<li><a href='' onmouseover='IO.mouseSuggestion(\"over\", this, ", i, ");' onmouseout='IO.mouseSuggestion(\"out\", this, ", i, ");' onclick='return IO.selectSuggestion(this);'>", palavras[i], "</a></li>");
						}
					}

					if (palavras.length == 1 && palavras[0] == value) {
						suggestionBoxHide(suggestionHolder);
					} else {
						suggestionBoxShow(suggestion.join(''));
					}
				}

				var searchTerm;

				if (value.length > 4 || palavras[0] == undefined) {

					searchTerm = value;

				} else {

					searchTerm = palavras[0];

					hoverTip = 0;
					var element = suggestionHolder.getElementsByTagName('li')[hoverTip];
					element ? element.getElementsByTagName('a')[0].className = "hover" : 0;

				}

				suggestionSearch(searchTerm);

			});

		});


	}


	// -- search-heartbeat
	function searchHeartBeat(fn) {
		if (searchHasHeartBeat) {

			searchHasHeartBeat = !1;
			fn();

		} else {

			delayedSearch = fn;

		}
	}


	function delayedSearchCallback(fn) {
		if (delayedSearch) {

			var delayed_buffer = delayedSearch;
			delayedSearch = null;
			delayed_buffer();

		} else {

			fn();
			searchHasHeartBeat = !0;
		}
	}
	// -- search-heartbeat


	// --- suggestion-heartbeat
	function suggestionHeartBeat(fn) {
		if (suggestionHasHeartBeat) {

			suggestionHasHeartBeat = !1;
			fn();

		} else {

			delayedSuggestion = fn;

		}
	}


	function delayedSuggestionCallback(fn) {
		if (delayedSuggestion) {

			var delayed_buffer = delayedSuggestion;
			delayedSuggestion = null;
			delayed_buffer();

		} else {

			fn();
			suggestionHasHeartBeat = !0;

		}
	}

	// -- suggestion-heartbeat


	function suggestionHeartBeatKeyboard(fn) {
		if (suggestionHasHeartBeatKeyboard) {

			suggestionHasHeartBeatKeyboard = !1;
			fn();

			setTimeout(function() {
				suggestionHasHeartBeatKeyboard = !0;
			}, 200);
		}
	}


	function suggestionBoxCommand(event) {

		if (event.keyCode == 38) {
			event.preventDefault && event.preventDefault();
		}

		if (!hasClass(suggestionHolder, "hide")) {

			suggestionHeartBeatKeyboard(function() {

				var
					elements = suggestionHolder.getElementsByTagName("a");

				if (elements) {
					switch(event.keyCode) {
						// p/ baixo
						case 40:
							if (hoverTip !== -1) {
								elements[hoverTip] ? elements[hoverTip].className = "" : 0;
							}

							if ((hoverTip + 1) < elements.length) {
								hoverTip++;
							} else {
								hoverTip = -1;
							}
						break;

						// p/ cima
						case 38:
							if (hoverTip !== -1) {
								elements[hoverTip] ? elements[hoverTip].className = "" : 0;
							}

							if (hoverTip > 0) {
								hoverTip--;
							} else {
								hoverTip = elements.length;
							}

						break;

						default:

					}

					if (event.keyCode == 40 || event.keyCode == 38) {

						if (hoverTip !== -1 && elements[hoverTip]) {
							searchHolder.value = elements[hoverTip].innerHTML;
							elements[hoverTip].className = "hover";
						} else {
							searchHolder.value = searchHolder.getAttribute('rel');
						}

						suggestionSearch(searchHolder.value);

					}

				}

			});

		}
	}


	function suggestionBoxShow(suggestionsContent) {
		hoverTip = -1;
		suggestionHolder.innerHTML = suggestionsContent;
		removeClass(suggestionHolder, "hide");
	}


	function suggestionBoxHide() {
		addClass(suggestionHolder, "hide");
		lastSuggestion = "";
	}


	function renderSort() {
		var render = [];

		for (s in sort_map) {
			if (last_sort == s) {
				render.push('<li>', sort_map[s], '</li>');
			} else {
				render.push('<li><a href="" onclick="return IO.changeSort(\'', s, '\')">', sort_map[s], '</a></li>');
			}
		}

		sorting_drop.innerHTML = render.join('');
		sort_label.innerHTML = sort_map[last_sort];
	}


	function changeSort(sort) {

		sorting_drop.style.display = "none";

		if (last_sort !== sort) {
			last_sort = sort;

			onDemandBWS(last_method, last_options, last_title);
		}

		return !1;
	}


	function openSort() {

		sorting_drop.style.display = "block";

		return !1;

	}


	function zoomIn(element, thumbnail, name, id, domain, price, slice, isproduct) {

		if (element.childNodes.length > 1) {
			return;
		}

		var old = $("tooltip");
		if (old) {
			old.parentNode.removeChild(old);
		}

		var
			tooltip = document.createElement("div"),
			normalized_name = slugify(name),

			link = isproduct ? ['/#!details', normalized_name, id].join('-') : id;

		tooltip.setAttribute('id', 'tooltip');

		tooltip.onmouseout = onMouseLeave(tooltip, function() {
			IO.zoomOut(this);
		});

		tooltip.innerHTML += ['<a href="', link, '" title="', goto_store, '">',
            '<img style="background:url(', thumbnail, ') no-repeat center center;background-size: 200px 200px;" src="', resizeThumb(thumbnail, "m"), '" width="200" height="200" alt="Offer Title" onerror="IO.imageRemove(this);" />',
            '<span class="name">', name, ' <em>(...)</em></span>',
			(domain ? '<span class="domain"><img src="' + domain + '" width="85" /></span>' : ''),
            '<span class="price">', price, '</span>',
			slice,
        '</a>',
        '<ul>',
			(isproduct ? '<li><a href="/#!details-' + normalized_name + '-' + id + '" title="Saiba mais sobre esta oferta">' + detail + '</a></li>' : ''),
            '<li><a href="', link, '">', goto_store,'</a></li>',
        '</ul>'].join('');

		element.appendChild(tooltip);

	}


	function zoomOut(element) {

		element.parentNode.removeChild(element);

	}


	function renderOffers(o) {

		var
			render = [];

		if (o['offer']) {

			for (i = 0; i < o['offer'].length; i++) {
				var
					r = o['offer'][i]["offer"],
					name = r["offername"].slice(0,32).replace(/[\(\)\']/, ''),
					thumbnail = r["thumbnail"] ? resizeThumb(r["thumbnail"]["url"], "p") : imageErrorSrc,
					domain = r["seller"]["thumbnail"] ? r["seller"]["thumbnail"]["url"] : "",
					link = r["links"][0]["link"]["url"],
					abrv = r["price"]["currency"]["abbreviation"],
					price = formatMoney(r["price"]["value"], abrv),
					slice = (r["price"]["parcel"] && r["price"]["parcel"]["number"]) ? "<em>ou</em> " + r["price"]["parcel"]["number"] + "x " + formatMoney(r["price"]["parcel"]["value"], abrv) : '';

					render.push(
						"<li onmouseover='IO.zoomIn(this, \"", thumbnail, "\", \"", name, "\", \"", link, "\", \"", domain, "\", \"", price, "\", \"", slice, "\", !1);'>",
							"<a href='#' title='Saiba mais sobre esta oferta'>",
								"<img src='' rel='", thumbnail, "' width='100' height='100' alt='", name, "' />",
								"<span class='name'>", name, " <em>(...)</em></span>",
								"<span class='domain'>",
								"<img src='' rel='", domain, "' height='30' />",
								"</span>",
								"<span class='price'>", price, "</span>",
								slice,
							"</a>",
						"</li>"
					);

			}

		} else {

			render.push("<li class='active unic'>Nenhum resultado encontrado. Tente outra busca.</li>");

		}

		return render.join('');

	}


	function renderProducts(o) {

		var
			render = [];

		if (o['product']) {

			for (i = 0; i < o['product'].length; i++) {
				var
					r = o['product'][i]["product"],
					name = r["productname"].slice(0,40).replace(/[\(\)\']/, ''),
					thumbnail = (r["thumbnail"]) ? resizeThumb(r["thumbnail"]["url"], "p") : imageErrorSrc,
					abrv = r["currency"]["abbreviation"],
					price = formatMoney(r["pricemin"], abrv),
					slice = null,
					domain = null;

				render.push(
					"<li onmouseover='IO.zoomIn(this, \"", thumbnail, "\", \"", name, "\", \"", r["id"], "\", \"", domain, "\", \"", price, "\", \"", slice, "\", !0);'>",
		            	"<a href='#' title='Saiba mais sobre esta oferta'>",
		                    "<img src='' rel='", thumbnail, "' width='100' height='100' alt='", name, "' />",
		                    "<span class='name'>", name, " <em>(...)</em></span>",
		                    "<span class='price'>", price, "</span>",
		                "</a>",
					"</li>"
				);

				// console.log(r);
			}

		} else {

			render.push("<li class='active unic'>Nenhum resultado encontrado. Tente outra busca.</li>");

		}

		return render.join('');

	}


	function renderStars(rating) {
		var
			li = ['<ul id="rating">'],
			total = parseFloat(rating),
			k = 5;

		if (total > 0) {
			for (k; k--;) {
				if (total >= 2) {
					li.push('<li><span class="star01">1</span></li>');
					total -= 2;
				} else if (total >= 1) {
					li.push('<li><span class="star03">3</span></li>');
					total -= 1;
				} else {
					li.push('<li><span class="star02">2</span></li>');
				}
			};
		}

		li.push('</ul>');
		return li.join('');
	}


	function detailProduct(id) {

		var fn = function(p) {

			var
				thumb = resizeThumb(p["thumbnail"]["url"], "m"),
				name = p["productname"],
				abrv = p["currency"]["abbreviation"],
				min = formatMoney(p["pricemin"], abrv),
				max = formatMoney(p["pricemax"], abrv),
				rating = p["rating"]["useraveragerating"]["rating"],
				specification = p["specification"]["item"],
				description = "";

			if (specification) {
				for (var i=0; i < specification.length; i++) {
					if (i >= 5) {
						break;
					}
					var item = [];
					for (var k=0; k < specification[i]["item"]["value"].length; k++) {
						item.push(specification[i]["item"]["value"][k]);
					}
					description += specification[i]["item"]["label"] + ": " + item.join(', ') + "<br/>";
				}
			}

			content.className = "in";
			infos.style.display = "block";
			theader.innerHTML = "<h3>Ofertas</h3>";

			var render = [];

			render.push(

				'<img id="offer-photo" src="', thumb, '" width="200" height="200" alt="" />',
				'<div id="infos-cont">',
				'<a id="back" href="javascript:history.back(-1);">&laquo; ', back, '</a>',
				    '<h2>', name, '</h2>',
				    '<p id="full-price">',
				    	'de <em>', min, '</em> a <em>', max, '</em>',
				    '</p>',
					renderStars(rating),
				    '<p>', description, '</p>',
				'</div>'
			);

			infos.innerHTML = render.join('');

			onDemandBWS("findOfferList", {productId: id, results: 28, page: 1}, "Ofertas");

		}

		// procura produto em todo cache

		var p = undefined;

		if (cache.head) {

			for (var k in cache._keymap) {
				var ps = cache._keymap[k]["value"]["product"];
				for (var pi in ps) {
					if (parseInt(id) == ps[pi]["product"]["id"]) {
						p = ps[pi]["product"];
						break;
					}
				}
			}

			if (p) {
				fn(p);
			}

		}

		// se nao tiver no cache faz request só para ele
		if (!p) {

			BWS("viewProductDetails", {productId: id, results: 1}, function(o) {
				fn(o["product"][0]["product"]);
			});

		}

	}


	function clickProduct(id) {

		BWS("findOfferList", {sort: 'price', productId: id, results: 1}, function(o) {
			if (o["offer"][0]) {
				setTimeout(function() {
					window.location.href = o["offer"][0]["offer"]["links"][0]["link"]["url"];
				}, 0);
			}
		});

	}


	function onWindowResize() {
		windowHeight = viewPortHeight();
		sidebar.style.height = (windowHeight - 101) + "px";
	}


	// pode ser rodado dentro do iframe sem src :)
	function render(gcountry) {

		country = gcountry;

		onWindowResize();

		// pega nome das categorias da sidebar e associa em um hash
		var cats = sidebar.getElementsByTagName("a");
		for (var i = cats.length; i--;) {
			var
				cat = cats[i].href.split('#!').pop(),
				rel = cats[i].getAttribute('rel');

			slug_to_id[cat] = rel;
			id_to_name[rel] = cats[i].innerHTML;
		}

		// pega a ordenação e monta o hash
		var sorts = sorting_drop.getElementsByTagName("li");
		for (var i = 0; i < sorts.length; i++) {
			var rel = sorts[i].getAttribute('rel');
			sort_map[rel] = sorts[i].innerHTML;
		}

		sidebar.onmouseover = function() {
			this.style.overflow = "auto";
		};

		sidebar.onmouseout = function() {
			this.style.overflow = "hidden";
		};

		searchHolder.onkeypress = function(event) {
			if (!event) event = window.event;
			suggestionBoxCommand(event);
		};

		searchHolder.onkeydown = function(event) {
			if (!event) event = window.event;
			suggestionBoxCommand(event);
		};

		searchHolder.onkeyup = function(event) {
			if (!event) event = window.event;

			var donothing = {38: !0, 40: !0, 16: !0, 17: !0, 18: !0, 91: !0, 37: !0, 39: !0, 27: !0, 13: !0};

			// se for alguma tecla diferente de p/ cima, p/ baixo, shift, alt, control, command, esc
			if (!donothing[event.keyCode]) {

				var value = this.value;
				this.setAttribute('rel', value);

				suggestionHeartBeat(function() {
					suggestionInstant(value);
				});

			}

			// esc
			if (event.keyCode == 27 || event.keyCode == 13) {
				searchHolder.blur();
				suggestionBoxHide();
			}

			suggestionHasHeartBeatKeyboard = !0;
		};

		searchHolder.onfocus = function() {

			// window._gaq.push(['_trackEvent', 'Search', 'Focus', this.value]);

			hasFocus = !0;

			if (this.value == label_value) {
				this.value = "";
			}

			var value = this.value;

			suggestionHeartBeat(function() {
				suggestionInstant(value);
			});
		};

		searchHolder.onblur = function() {

			hasFocus = !1;

			if (this.value == "") {
				this.value = label_value;
			}

			if (!hoverSuggest) {
				suggestionBoxHide();
			}
		};


		document.onmouseup = function(e) {

			var targ;

			if (!e) {
				var e = window.event;
			}

			if (e.target) {
				targ = e.target;
			} else if (e.srcElement) {
				targ = e.srcElement;
			}

			if (targ.nodeType == 3) {
				targ = targ.parentNode;
			}

			if (targ.id !== 'sorting-drop' && targ.parentNode.id !== 'sorting-drop' && targ.parentNode.parentNode.id !== 'sorting-drop') {
				changeSort(last_sort);
			}

		};


		addEvent(window, "resize", function() {
			onWindowResize();
		});


		Hash.init(function(visited, initial) {

			// if (!visited.match(/click\-/)) {
				window.scrollTo(0, 0);
			// }

			// usar sourceid se tiver


			var t = "Instant Ofertas";

			last_sort = '';

			if (visited == "") {
				h1.innerHTML = t;
			} else {
				h1.innerHTML = "<a href='index.html#!'>" + t + "</a>";
			}

			if (visited == "") {

				var initial_instruction = $('initial');

				if (initial_instruction) {
					Hash.go("#!" + initial_instruction.innerText.split('#!').pop());
				} else {

				// onDemandBWS("offers", {results: 28, page: 1, categoryId: 77}, "Ofertas");
				onDemandBWS("findProductList", {categoryId: "77", results: 28, page: 1}, id_to_name[77]);

				}

			} else if (visited.match(/click\-/) && !initial) {

				var id = visited.split('-').pop();
				clickProduct(id);

			} else if (visited.match(/details\-/) || (visited.match(/click\-/) && initial)) {

				// window._gaq.push(['_trackEvent', 'Product', 'Detail', id]);

				last_sort = 'price';

				var id = visited.split('-').pop();
				detailProduct(id);

			} else if (visited.match(/suggestion\-/)) {

				if (initial) {

					var kw = visited.split('-').pop().replace(/\+/g, ' ');
					searchHolder.value = kw;

					// window._gaq.push(['_trackEvent', 'Suggestion', 'Start', kw]);

					suggestionSearch(kw);
				}

			} else {

				// if (initial) {
				// 	window._gaq.push(['_trackEvent', 'Category', 'Start', visited]);
				// } else {
				// 	window._gaq.push(['_trackEvent', 'Category', 'Open', visited]);
				// }

				if (visited.indexOf("#!") == -1) {

					// verifica source id e categoria

					var
						sid = visited.match(/\-sid\-([^\-]*)/),
						cid = visited.match(/\-cid\-([^\-]*)/),
						slug = visited.match(/(.*?)(?=\-sid|$)/),
						category_id = (slug_to_id[slug[0]] || (cid ? cid[1] : 77)),
						name = (id_to_name[category_id] || "Ofertas")
					;

					if (sid) {
						sourceId = sid[1];
					}

					onDemandBWS("findProductList", {categoryId: category_id, results: 28, page: 1}, name);
				}

			}

		});
	}


	return {

		selectSuggestion: selectSuggestion,
		mouseSuggestion: mouseSuggestion,
		imageError: imageError,
		imageRemove: imageRemove,
		changeSort: changeSort,
		jcomplete: jcomplete,
		jsonp_id: jsonp_id,
		openSort: openSort,
		zoomOut: zoomOut,
		zoomIn: zoomIn,
		render: render

	};

}());