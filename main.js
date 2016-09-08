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

	function InventoryItem(amount, displayName, description) {
		this.amount = amount;
		this.displayName = displayName;
		this.description = description;
	}
	
	function ItemDefinition(name, description) {
		this.name = name;
		this.description = description;
	}
	
	function ItemDefinitionGroup() {
		this.defs = {};
	}
	
	ItemDefinitionGroup.prototype.addItemDefinition = function(minAmount, itemDefinition) {
		if(itemDefinition instanceof ItemDefinition) {
			this.defs[minAmount] = itemDefinition;
		}
	}
	
	ItemDefinitionGroup.prototype.getItemDefinition = function(minAmount) {
		var def, previous = 0;
		for(def in this.defs) {
			if(def <= minAmount)
				previous = def;
			else
				break;
		}
		if(previous == 0)
			return null;
		else
			return this.defs[previous];
	}

	function Logic() {
		var pageContainer = document.getElementById('page_container');
		var inventoryContainer = document.getElementById('inventory_container');
		var statsContainer = document.getElementById('stats_container');
		var inventoryInfobox = document.getElementById('inventory_infobox');
		
		var pages = [];
		var inventory = {};
		var stats = {};
		
		var itemDefinitionGroups = {};
		
		function initialize(rawPageArray) {
			pages = [];
			inventory = {};
			
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
			var i;
			for(i in inventory)
				delete inventory[i];

			displayInventory();
		}
		
		function clearStats() {
			var i;
			for(i in stats)
				delete stats[i];

			displayStats();
		}
		
		function addItemDefinitionGroup(itemStr, itemDefinitionGroup) {
			if(itemDefinitionGroup instanceof ItemDefinitionGroup) {
				itemDefinitionGroups[itemStr] = itemDefinitionGroup;
			}
		}
		
		function getItemDefinition(itemStr, minAmount) {
			var itemDefinitionGroup = itemDefinitionGroups[itemStr];
			if(itemDefinitionGroup === undefined)
				return null;
			return itemDefinitionGroup.getItemDefinition(minAmount);
		}
		
		function registerStat(name, inventoryItem) {
			if(inventoryItem instanceof InventoryItem) {
				var stat = stats[name];
				if(stat === undefined) {
					stats[name] = inventoryItem;
					if(stats[name].amount === null)
						stats[name].amount = 0;
					displayStats();
					return true;
				}
				else {
					var i;
					for(i in inventoryItem) {
						if(inventoryItem[i] !== null)
							stat[i] = inventoryItem[i];
					}
					displayStats();
					return true;
				}
			}
			return false;
		}
		
		function modifyStat(name, amount) {
			if(stats[name] !== undefined) {
				if(amount !== null) {
					stats[name].amount += amount;
					if(stats[name].amount < 0)
						stats[name].amount = 0;
				}
				else {
					stats[name].amount = 0;
				}
			}
			else {
				stats[name] = new InventoryItem(amount, null, null);
			}
			
			displayStats();
		}
		
		function addItemToInventory(name, inventoryItem, isNameOverride, isDescriptionOverride) {
			if(inventoryItem instanceof InventoryItem) {
				var isExisting = inventory[name] !== undefined;
				var newInventoryItem = null;
				
				if(isExisting) {
					if(inventoryItem.amount === null || inventoryItem.amount <= 0) {

					}
					else {
						inventory[name].amount += inventoryItem.amount;
					}
					
					if(inventoryItem.displayName !== null && (!inventory[name].displayName || isNameOverride))
						inventory[name].displayName = inventoryItem.displayName;
					if(inventoryItem.description !== null && (!inventory[name].description || isDescriptionOverride))
						inventory[name].description = inventoryItem.description;
					
					newInventoryItem = inventory[name];
				}
				else {
					if(inventoryItem.amount <= 0)
						return false;
					
					inventory[name] = inventoryItem;
					newInventoryItem = inventoryItem;
				}
				
				var itemDefinition = getItemDefinition(name, newInventoryItem.amount);
				
				if(itemDefinition !== null) {
					if(itemDefinition.name !== null)
						newInventoryItem.displayName = itemDefinition.name;
					if(itemDefinition.description !== null)
						newInventoryItem.description = itemDefinition.description;
				}
				
				displayInventory();
				return true;
			}
			return false;
		}
		
		function removeItemFromInventory(name, amount) {
			if(inventory[name] !== undefined) {
				var item = inventory[name];
				
				if(amount > 0)
					item.amount -= amount;
				else
					item.amount = 0;
				
				if(item.amount == 0) {
					delete inventory[name];
					
					displayInventory();
					return true;
				}
				else if(item.amount < 0) {
					item.amount += amount;
					return false;
				}
				else {
					displayInventory();
					return true;
				}
			}
			
			return false;
		}
		
		function getInventoryContainsItem(name, amount) {
			if(inventory[name] !== undefined && inventory[name].amount >= amount)
				return true;
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
			
			for(i in inventory) {
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
		
		function displayStats() { //TODO merge this function with displayInventory if stats don't end up having a very discernable difference from inventory
			var i, node;
			for(i = 0; i < statsContainer.children.length; i++) {
				node = statsContainer.children[i];
				node.onmouseover = "";
				node.onmouseout = "";
			}
			
			statsContainer.innerHTML = "";
			
			for(i in stats) {
				node = document.createElement("a");
				node.innerHTML = stats[i].displayName + " " + stats[i].amount + "<br>";
				
				node.onmouseover = (function(a) {
					return function() {
						inventoryInfobox.innerHTML = "<span>" + a + "</span>";
					}
				})(stats[i].description);
				
				node.onmouseout = function() {
					inventoryInfobox.innerHTML = "";
				}
				
				statsContainer.appendChild(node);
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
			
			/*if(pageNext == 0) {
				console.log("Page 0");
				
				//parseInitializationPage
				
				servePage(1, 0, null);
				return;
			}*/
			
			var page = pages[pageNext].node.cloneNode(true);
			var visited = pages[pageNext].visited;
			
			applyFlags(page);
			
			var i;
			
			if(pageNext <= 0) {
				for(i = 0; i < page.children.length; i++) {
					var child = page.children[i];
					
					parseNodeDefineItem(child);
				}
			}
			
			var iterator = function(parent) {
				var i;
				for(i = 0; i < parent.children.length; i++) {
					var child = parent.children[i];
					
					parseNodeVisibility(child, args);
					parseNodeAddSyntax(child);
					
					if(child.style.display != "none") {
						parseNodeTargetPage(child, pageNext);
						parseNodeAddItem(child);
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
		
		function parseNodeDefineItem(node) {
			var defineItem = getSpecialAttribute(node, "define-item");
			
			if(defineItem === null)
				return;
			
			var i, itemDefinitionGroup = new ItemDefinitionGroup();
			var minAmount = null;
			var name = null;
			var description = null;
			for(i = 0; i < node.children.length; i++) {
				var child = node.children[i];
				minAmount 	= getSpecialAttribute(child, "define-item-minamount");
				if(minAmount === null)
					continue;
				
				name 		= getSpecialAttribute(child, "define-item-name");
				description = getSpecialAttribute(child, "define-item-description");
				
				itemDefinitionGroup.addItemDefinition(minAmount, new ItemDefinition(name, description));
			}

			addItemDefinitionGroup(defineItem, itemDefinitionGroup);
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
		
		function parseNodeAddItem(node) {
			var item = getSpecialAttribute(node, "item");
			if(item === null)
				return;
			
			var itemAmount = getSpecialAttribute(node, "item-amount");
			var itemName = getSpecialAttribute(node, "item-name");
			var itemNameOverride = getSpecialAttribute(node, "item-name-override");
			var itemDescription = getSpecialAttribute(node, "item-description");
			var itemDescriptionOverride = getSpecialAttribute(node, "item-description-override");
			var itemAction = getSpecialAttribute(node, "item-action");
			var itemType = getSpecialAttribute(node, "item-type");
			
			var addItems = function(item, itemAmount, itemName, itemNameOverride, itemDescription, itemDescriptionOverride, itemAction) {
				if(!(item instanceof Array)) 					item = [item];
				if(!(itemAmount instanceof Array)) 				itemAmount = [itemAmount];
				if(!(itemName instanceof Array)) 				itemName = [itemName];
				if(!(itemNameOverride instanceof Array)) 		itemNameOverride = [itemNameOverride];
				if(!(itemDescription instanceof Array)) 		itemDescription = [itemDescription];
				if(!(itemDescriptionOverride instanceof Array)) itemDescriptionOverride = [itemDescriptionOverride];
				if(!(itemAction instanceof Array)) 				itemAction = [itemAction];
				if(!(itemType instanceof Array)) 				itemType = [itemType];
				
				var _itemAmount = null;
				var _itemName = null;
				var _itemNameOverride = null;
				var _itemDescription = null;
				var _itemDescriptionOverride = null;
				var _itemAction = null;
				var _itemType = null;
				
				var isNameOverride = false;
				var isDescriptionOverride = false;
				var sendName = "";
				var sendDescription = "";
				
				for(var i = 0; i < item.length; i++) {
					_itemAmount 			 = itemAmount[i] === undefined ? itemAmount[0] : itemAmount[i];
					_itemName 				 = itemName[i] === undefined ? itemName[0] : itemName[i];
					_itemNameOverride		 = itemNameOverride[i] === undefined ? itemNameOverride[0] : itemNameOverride[i];
					_itemDescription 		 = itemDescription[i] === undefined ? itemDescription[0] : itemDescription[i];
					_itemDescriptionOverride = itemDescriptionOverride[i] === undefined ? itemDescriptionOverride[0] : itemDescriptionOverride[i];
					_itemAction				 = itemAction[i] === undefined ? itemAction[0] : itemAction[i];
					_itemType				 = itemType[i] === undefined ? itemType[0] : itemType[i];
					
					if(_itemAction != "add" && _itemAction != "remove" && _itemAction != "modify")
						_itemAction = "add";
					
					if(_itemType != "inventory" && _itemType != "stats")
						_itemType = "inventory";
					
					isNameOverride = _itemNameOverride ? true : false;
					isDescriptionOverride = _itemDescriptionOverride ? true : false;
					sendName = isNameOverride ? _itemNameOverride : _itemName;
					sendDescription = isDescriptionOverride ? _itemDescriptionOverride : _itemDescription;
					
					if(_itemType == "inventory") {
						if(_itemAction == "remove") {
							removeItemFromInventory(item[i], ((_itemAmount === null || _itemAmount <= 0) ? -1 : _itemAmount));
						}
						else if(_itemAction == "add" || _itemAction == "modify") {
							addItemToInventory(item[i],
								new InventoryItem(
									_itemAction == "modify" ? 0 : (_itemAmount <= 0 ? 1 : _itemAmount),
									sendName,
									sendDescription
								),
							_itemAction == "modify" ? true : isNameOverride, _itemAction == "modify" ? true : isDescriptionOverride);
						}
					}
					else if(_itemType == "stats") {
						if(_itemAction == "remove") {
							modifyStat(item[i], _itemAmount === null ? null : -_itemAmount);
						}
						else if(_itemAction == "add" || _itemAction == "modify") {
							if(sendName !== null || sendDescription !== null) {
								registerStat(item[i], new InventoryItem(null, sendName, sendDescription));
								if(_itemAmount !== null)
									modifyStat(item[i], _itemAmount);
							}
							else if(_itemAmount !== null) {
								modifyStat(item[i], _itemAmount);
							}
						}
					}
				}
			}
			
			var eventType = getSpecialAttribute(node, "item-eventtype");
			
			if(eventType === null || eventType == "auto") {
				addItems(item, itemAmount, itemName, itemNameOverride, itemDescription, itemDescriptionOverride, itemAction);
			}
			else if(eventType == "click") {
				var f2 = (function(a, b, c, d, e, f, g, h) {
					var handler = function() {
						a(b, c, d, e, f, g, h);

						node.className += " item-retrieved";
						node.removeEventListener("click", handler);
					}
					return handler;
				})(addItems, item, itemAmount, itemName, itemNameOverride, itemDescription, itemDescriptionOverride, itemAction);
				
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
			clearStats();
			servePage(0, null, null);
		}
		
		function getSpecialAttribute(node, attribute) {
			return getParsedAttribute(node.getAttribute("data-" + attribute));
		}
		
		function getSpecialAttributesWithPrefix(node, prefix) {
			var obj = {};
			var i;
			
			prefix = prefix + "";
			
			if(prefix.length > 0 && prefix.charAt(prefix.length - 1) != "-")
				prefix += "-";
			
			var attributes = node.attributes;
			for(i = 0; i < attributes.length; i++) {
				if(attributes[i].name.indexOf("data-" + prefix) == 0) {
					
					obj[attributes[i].name.replace("data-" + prefix, "")] = getParsedAttribute(attributes[i].value);
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
		
		function getPages() {
			return pages;
		}
		function getInventory() {
			return inventory;
		}
		function getStats() {
			return stats;
		}
		function getItemDefinitionGroups() {
			return itemDefinitionGroups;
		}
		
		return {
			initialize : initialize,
			restart : restart,
			
			//DEBUG GLOBAL ACCESS
			servePage : servePage,
			addItemToInventory : addItemToInventory,
			removeItemFromInventory : removeItemFromInventory,
			registerStat : registerStat,
			modifyStat : modifyStat,
			
			getPages : getPages,
			getInventory : getInventory,
			getStats : getStats,
			getItemDefinitionGroups : getItemDefinitionGroups,
			
			InventoryItem : InventoryItem
			//
		}
	}

	var global = (function() {
		var pl = new PageLoader("data.html");
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
















