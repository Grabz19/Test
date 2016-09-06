"use strict";

;var game = (function() {
	var util = {};
	
	util.getHyphenDemiliterToCamelCase = function(str) {
		str = str + "";
		
		if(str.charAt(0) == "-")
			str = str.slice(1);
		
		str = str.split(/-| /);
		
		for(var i = 1; i < str.length; i++) {
			str[i] = [str[i].slice(0, 1).toUpperCase(), str[i].slice(1)].join("");
		}
		
		return str.join("");
	}
	
	util.getCamelCaseToHyphenDelimeter = function(str) {
		str = str.split(/ /).join("");
		
		while(true) {
			var index = str.search(/[A-Z]/);
			
			if(~index) {
				str = str.replace(/[A-Z]/,
				(function(a) {
					return "-" + a.toLowerCase()
				}));
			}
			else
				return str;
		}
	}
	
	function PageLoader(src) {
		var listener = null;
		
		function setCompletionListener(f) {
			if(typeof f == "function") {
				listener = f;
				return true;
			}
			else
				return false;
		}
		
		function load() {
			if(!listener)
				return;
			
			var xhr = new XMLHttpRequest();
			xhr.open("GET", src, true);
			
			xhr.onreadystatechange = function() {
				if(xhr.readyState == 4) {
					if(xhr.status == 200 || xhr.status == 0) {
						onLoaded(xhr.responseText);
					}
				}
			}
			
			xhr.send(null);
		}
		
		function onLoaded(raw) {
			var rawPageArray = [], i;
			
			var parentNode = document.createElement("div");
			parentNode.innerHTML = raw;
			
			for(i = 0; i < parentNode.children.length; i++) {
				var page = parentNode.children[i];
				var num = page.getAttribute("data-page");
				if(typeof num != "undefined" && num !== null) {
					num = parseInt(num);
					rawPageArray[num] = page;
				}
			}
			listener(rawPageArray);
		}
		
		return {
			setCompletionListener : setCompletionListener,
			load : load
		}
	}

	function Page(node, visited) {
		this.node = node;
		this.visited = visited;
	}

	function InventoryItem(name, amount, displayName, description) {
		this.name = name;
		this.amount = amount;
		this.displayName = displayName;
		this.description = description;
	}

	function Logic() {
		var pageContainer = document.getElementById('page_container');
		var inventoryContainer = document.getElementById('inventory_container');
		var inventoryInfobox = document.getElementById('inventory_infobox');
		
		var pages = null;
		var inventory = null;
		
		function initialize(rawPageArray) {
			pages = [];
			inventory = [];
			
			var i, j;
			for(i = 0; i < rawPageArray.length; i++) {
				if(!rawPageArray[i]) {
					pages[i] = new Page(document.createElement("div"), 0);
					continue;
				}
				
				pages[i] = new Page(rawPageArray[i], 0);
			}
		}
		
		function clearInventory() {
			inventory.splice(0, inventory.length);
			displayInventory();
		}
		
		function addItemToInventory(inventoryItem, override) {
			if(inventoryItem instanceof InventoryItem) {
				var i;
				for(i = 0; i < inventory.length; i++) {
					if(inventoryItem.name == inventory[i].name) {
						if(inventoryItem.amount === null || inventoryItem.amount <= 0) {

						}
						else
							inventory[i].amount += inventoryItem.amount;
						
						if(inventoryItem.displayName)
							inventory[i].displayName = inventoryItem.displayName;
						if(override && inventoryItem.description)
							inventory[i].description = inventoryItem.description;
						
						displayInventory();
						return true;
					}
				}
				if(inventoryItem.amount === null || inventoryItem.amount <= 0)
					return false;
				
				inventory.push(inventoryItem);
				displayInventory();
				return true;
			}
			return false;
		}
		
		function removeItemFromInventory(name, amount) {
			var i;
			for(i = 0; i < inventory.length; i++) {
				if(inventory[i].name == name) {
					inventory[i].amount -= amount;
					
					if(inventory[i].amount == 0) {
						inventory.splice(i, 1);
						displayInventory();
						return true;
					}
					else if(inventory[i].amount < 0) {
						inventory[i].amount += amount;
						return false;
					}
					else {
						displayInventory();
						return true;
					}
				}
			}
			return false;
		}
		
		function getInventoryContainsItem(name, amount) {
			var i;
			for(i = 0; i < inventory.length; i++) {
				if(inventory[i].name == name && inventory[i].amount >= amount)
					return true;
			}
			return false;
		}
		
		function displayInventory() {
			var i, node;
			for(i = 0; i < inventoryContainer.children.length; i++) {
				node = inventoryContainer.children[i];
				node.onmouseover = "";
				node.onmouseout = "";
			}
			
			inventoryContainer.innerHTML = "";
			
			for(i = 0; i < inventory.length; i++) {
				node = document.createElement("a");
				node.innerHTML = inventory[i].displayName + (inventory[i].amount > 1 ? " " + inventory[i].amount : "") + "<br>";
				
				node.onmouseover = (function(a) {
					return function() {
						inventoryInfobox.innerHTML = "<span>" + a + "</span>";
					}
				})(inventory[i].description);
				
				node.onmouseout = function() {
					inventoryInfobox.innerHTML = "";
				}
				
				inventoryContainer.appendChild(node);
			}
		}
		
		function resetVisited() {
			for(var i = 0; i < pages.length; i++)
				pages[i].visited = 0;
		}
		
		function servePage(pageNext, pageFrom, args) {
			if(typeof args == "string")
				args = JSON.parse(args);
			
			console.log("Serving page " + pageNext + " from page " + pageFrom + " with arguments: " + JSON.stringify(args) + ".");
			
			if(!pages || !pages[pageNext])
				return false;
			
			if(pageNext == 0) {
				console.log("Page 0");
				
				//parseInitializationPage
				
				servePage(1, 0, null);
				return;
			}
			
			var page = pages[pageNext].node.cloneNode(true);
			var visited = pages[pageNext].visited;
			
			applyFlags(page);
			
			var iterator = function(parent) {
				var i;
				for(i = 0; i < parent.children.length; i++) {
					var child = parent.children[i];
					
					parseNodeVisibility(child, args);
					parseNodeAddSyntax(child);
					
					if(child.style.display != "none") {
						parseNodeTargetPage(child, pageNext);
						parseNodeTargetAddToInventory(child);
						parseNodeTargetRestart(child);
						
						iterator(child);
					}
				}
			}
			
			iterator(page);
			
			pageContainer.innerHTML = "";
			pageContainer.appendChild(page);
			pages[pageNext].visited++;
			return true;
		}
		
		function applyFlags(page) {
			var resetVisited = getSpecialAttribute(page, "page-flag-resetvisited");
			
			if(resetVisited !== null) {
				if(resetVisited instanceof Array) {
					for(var i = 0; i < resetVisited.length; i++) {
						pages[resetVisited[i]].visited = 0;
					}
				}
				else {
					pages[resetVisited].visited = 0;
				}
			}
		}
		
		function parseNodeTargetRestart(node) {
			var gameOver = getSpecialAttribute(node, "gameover");
			if(gameOver !== null) {
				var f = function() {
					restart();
					node.removeEventListener("click", f);
				}
				
				node.addEventListener("click", f);
			}
		}
		
		function parseNodeTargetPage(node, currentPage) {
			var targetPage = getSpecialAttribute(node, "goto");
			
			if(targetPage === null)
				return;
			
			var sendArgs = getSpecialAttributesWithPrefix(node, "goto-arg");
			
			var f = function() {
				servePage(targetPage, currentPage, sendArgs);
				node.removeEventListener("click", f);
			}
			
			node.addEventListener("click", f);
		}
		
		function parseNodeTargetAddToInventory(node) { //TODO this is all sorts of fucked up
			var item = getSpecialAttribute(node, "item");
			if(item === null)
				return;
			
			var itemAmount = getSpecialAttribute(node, "item-amount");
			var itemName = getSpecialAttribute(node, "item-name");
			var itemDescription = getSpecialAttribute(node, "item-description");
			var itemDescriptionOverride = getSpecialAttribute(node, "item-description-override");
			var itemAction = getSpecialAttribute(node, "item-action");

			var f = function(item, itemAmount, itemName, itemDescription, itemDescriptionOverride, itemAction) {
				if(itemAction == "remove") {
					removeItemFromInventory(item, ((itemAmount === null || itemAmount <= 0) ? 1 : itemAmount));
				}
				else if(itemAction == "add" || itemAction == "modify") {
					var inventoryItem = new InventoryItem(
						item,
						itemAction == "modify" ? 0 : (itemAmount <= 0 ? 1 : itemAmount),
						itemName,
						itemDescription
					);
					
					addItemToInventory(inventoryItem, itemDescriptionOverride);
				}
			}
			
			var addItems = function(item, itemAmount, itemName, itemDescription, itemDescriptionOverride) {
				if(item instanceof Array) {
					for(var i = 0; i < item.length; i++) {
						f(item[i], itemAmount[i], itemName[i], itemDescription[i], itemDescriptionOverride === null ? false : itemDescriptionOverride[i], itemAction === null ? "add" : itemAction[i]);
					}
				}
				else {
					f(item, itemAmount, itemName, itemDescription, itemDescriptionOverride === null ? false : itemDescriptionOverride, itemAction === null ? "add" : itemAction);
				}
			}
			
			
			var eventType = getSpecialAttribute(node, "item-eventtype");
			
			if(eventType === null || eventType == "auto") {
				addItems(item, itemAmount, itemName, itemDescription, itemDescriptionOverride);
			}
			else if(eventType == "click") {
				var f2 = (function(a, b, c, d, e, f, g) {
					var handler = function() {
						a(b, c, d, e, f, g);

						node.className += " item-retrieved";
						node.removeEventListener("click", handler);
					}
					return handler;
				})(addItems, item, itemAmount, itemName, itemDescription, itemDescriptionOverride, itemAction);
				
				node.addEventListener("click", f2);
			}
		}
		
		function parseNodeAddSyntax(node) {
			var gotoPage = getSpecialAttribute(node, "goto");
			if(gotoPage === null)
				return;
			
			var index = node.innerHTML.search(/>(?!<)/);
			index = index > 0 ? index + 1 : 0;
			node.innerHTML = [node.innerHTML.slice(0, index), "[Page " + gotoPage + "] ", node.innerHTML.slice(index)].join("");
		}
		
		function parseNodeVisibility(node, args) {
			var isVisibleArr = [];
			
			isVisibleArr.push(getVisibleIfArgumentsMatch(node, args));
			isVisibleArr.push(getVisibleIfVisited(node));
			isVisibleArr.push(getVisibleIfHasItem(node));
			
			var isVisible = (function() {
				for(var i = 0; i < isVisibleArr.length; i++) {
					if(!isVisibleArr[i]) {
						return false;
					}
				}
				return true;
			})();
			
			if(!isVisible)
				node.style.display = "none";
			
		}
		
		function getVisibleIfHasItem(node) {
			var showIfHasItem = getSpecialAttribute(node, "showif-hasitem");
			var showIfNotHasItem = getSpecialAttribute(node, "showif-nothasitem");

			var isShowIfHasItem = true;
			var isShowIfNotHasItem = true;
			
			if(showIfHasItem !== null) {
				var showIfHasItemAmount = getSpecialAttribute(node, "showif-hasitem-amount");
				isShowIfHasItem = getInventoryContainsItem(showIfHasItem, showIfHasItemAmount === null ? 1 : showIfHasItemAmount);
			}
			if(showIfNotHasItem !== null) {
				var showIfNotHasItemAmount = getSpecialAttribute(node, "showif-nothasitem-amount");
				isShowIfNotHasItem = getInventoryContainsItem(showIfNotHasItem, showIfNotHasItemAmount === null ? 1 : showIfNotHasItemAmount);
				isShowIfNotHasItem = !isShowIfNotHasItem;
			}
			
			return isShowIfHasItem && isShowIfNotHasItem;
		}
		
		function getVisibleIfArgumentsMatch(node, args) {
			var showIfArgs = getSpecialAttributesWithPrefix(node, "showif-arg");
			var showIfNotArgs = getSpecialAttributesWithPrefix(node, "showif-notarg");
			
			var isShowIfId = [];
			var isShowIfNotId = [];
			
			var getId = function(id, attribPage, falseIfId) {
				if(attribPage instanceof Array) {
					var arr = [];
					var i;
					for(i = 0; i < attribPage.length; i++) {
						if(falseIfId ? id == attribPage[i] : id != attribPage[i])
							arr.push(false);
						else
							arr.push(true);
					}
					for(i = 0; i < arr.length; i++) {
						if(arr[i])
							return true;
					}
					return false;
				}
				else {
					if(falseIfId ? id == attribPage : id != attribPage)
						return false;
				}
				return true;
			}
			
			var arg;
			
			if(showIfArgs !== null && showIfArgs !== {}) {
				for(arg in showIfArgs)
					isShowIfId.push(getId(args[arg], showIfArgs[arg], false));
			}
			if(showIfNotArgs !== null && showIfNotArgs !== {}) {
				for(arg in showIfNotArgs)
					isShowIfNotId.push(getId(args[arg], showIfNotArgs[arg], true));
			}
			
			console.log(isShowIfId, showIfArgs, isShowIfNotId, showIfNotArgs);
			return isShowIfId.indexOf(false) == -1 && isShowIfNotId.indexOf(false) == -1;
		}
		
		function getVisibleIfVisited(node) {
			var showIfVisited = getSpecialAttribute(node, "showif-visited");
			var showIfNotVisited = getSpecialAttribute(node, "showif-notvisited");
			
			var showIfVisitedTimes = getSpecialAttribute(node, "showif-visited-times");
			var showIfNotVisitedTimes = getSpecialAttribute(node, "showif-notvisited-times");
			
			var isShowIfVisited = true;
			var isShowIfNotVisited = true;
			
			var getVisited = function(attribPage, attribTimes, falseIfVisited) {
				if(attribPage instanceof Array) {
					var arr = [];
					var i;
					for(i = 0; i < attribPage.length; i++) {
						if(falseIfVisited ? (pages[attribPage[i]].visited >= (attribTimes instanceof Array ? attribTimes[i] : attribTimes)) : (pages[attribPage[i]].visited < (attribTimes instanceof Array ? attribTimes[i] : attribTimes)))
							arr.push(false);
						else
							arr.push(true);
					}
					for(i = 0; i < arr.length; i++) {
						if(!arr[i])
							return false;
					}
					return true;
				}
				else {
					if(falseIfVisited ? (pages[attribPage].visited >= attribTimes) : (pages[attribPage].visited < attribTimes))
						return false;
				}
				return true;
			}
			
			if(showIfVisited !== null)
				isShowIfVisited = getVisited(showIfVisited, showIfVisitedTimes === null ? 1 : showIfVisitedTimes, false);
			if(showIfNotVisited !== null)
				isShowIfNotVisited = getVisited(showIfNotVisited, showIfNotVisitedTimes === null ? 1 : showIfNotVisitedTimes, true);
			
			return isShowIfVisited && isShowIfNotVisited;
		}
		
		function restart() {
			resetVisited();
			clearInventory();
			servePage(0, null, null);
		}
		
		function getSpecialAttribute(node, attribute) {
			return getParsedAttribute(node.getAttribute("data-" + attribute));
		}
		
		function getSpecialAttributesWithPrefix(node, prefix) {
			var obj = {};
			var i;
			
			var attributes = node.attributes;
			for(i = 0; i < attributes.length; i++) {
				if(attributes[i].name.indexOf("data-" + prefix) == 0) {
					
					obj[util.getHyphenDemiliterToCamelCase(attributes[i].name.replace("data-" + prefix, ""))] = getParsedAttribute(attributes[i].value);
				}
			}
			
			return obj;
		}
		
		function getParsedAttribute(value) {
			if(value === null)
				return null;
			
			try {
				return JSON.parse(value);
			}
			catch(e) {
				return value;
			}
		}
		
		return {
			initialize : initialize,
			restart : restart,
			
			//DEBUG GLOBAL ACCESS
			servePage : servePage,
			addItemToInventory : addItemToInventory,
			removeItemFromInventory : removeItemFromInventory
			//
		}
	}

	var global = (function() {
		var pl = new PageLoader("book.html");
		pl.setCompletionListener(onLoaded);
		pl.load();
		
		var logic = new Logic();
		
		function onLoaded(rawPageArray) {
			logic.initialize(rawPageArray);
			logic.restart();
		}
		
		return {
			util : util,
			logic : logic
		}
	})();
	
	return global;
})();
















