"use strict";

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
					if(inventoryItem.amount === null)
						inventory[i].amount++;
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
			inventory.push(inventoryItem);
			displayInventory();
			return true;
		}
		return false;
	}
	
	function addItemToInventoryFromNode(node) {
		var item = getSpecialAttribute(node, "item");
		
		if(item !== null) {
			var itemAmount = getSpecialAttribute(node, "item-amount");
			var itemName = getSpecialAttribute(node, "item-name");
			var itemDescription = getSpecialAttribute(node, "item-description");
			var itemDescriptionOverride = getSpecialAttribute(node, "item-description-override");
			
			var inventoryItem = new InventoryItem(
				item,
				itemAmount === null ? 1 : itemAmount,
				itemName,
				itemDescription
			);
			
			addItemToInventory(inventoryItem, itemDescriptionOverride === null ? false : itemDescriptionOverride);
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
			node.innerHTML = inventory[i].displayName + " " + inventory[i].amount + "<br>";
			
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
		
		var page = pages[pageNext].node.cloneNode(true);
		var visited = pages[pageNext].visited;
		var i, j;
		
		applyFlags(page);
		
		var nodes = page.getElementsByTagName("*");
		
		for(i = 0; i < nodes.length; i++) {
			var node = nodes[i];
			
			parseNodeTargetPage(node, pageNext);
			parseNodeVisibility(node, args ? args.id : null);
			parseNodeTargetAddToInventory(node);
			parseNodeTargetRestart(node);
		}
		
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
		
		addItemToInventoryFromNode(page);
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
		
		var sendArgs = {};
		var argId = getSpecialAttribute(node, "goto-arg-id");
		if(argId !== null) {
			sendArgs.id = argId;
		}
		
		var f = function() {
			servePage(targetPage, currentPage, sendArgs);
			node.removeEventListener("click", f);
		}
		
		node.addEventListener("click", f);
	}
	
	function parseNodeTargetAddToInventory(node) {
		var f = function() {
			if(addItemToInventoryFromNode(node)) {
				node.className += " item-retrieved";
			}
			node.removeEventListener("click", f);
		}
		node.addEventListener("click", f);
	}
	
	function parseNodeVisibility(node, id) {
		var isVisibleArr = [];
		
		isVisibleArr.push(getVisibleIfId(node, id));
		isVisibleArr.push(getVisibleIfVisited(node));
		
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
	
	function getVisibleIfId(node, id) {
		var showIfId = getSpecialAttribute(node, "showif-arg-id");
		var showIfNotId = getSpecialAttribute(node, "showif-arg-notid");
		
		var isShowIfId = true;
		var isShowIfNotId = true;
		
		if(showIfId !== null && id != showIfId)
			isShowIfId = false;
		if(showIfNotId !== null && id == showIfNotId)
			isShowIfNotId = false;
		
		return isShowIfId && isShowIfNotId;
	}
	
	function getVisibleIfVisited(node) {
		var showIfVisited = getSpecialAttribute(node, "showif-arg-visited");
		var showIfNotVisited = getSpecialAttribute(node, "showif-arg-notvisited");
		
		var showIfVisitedTimes = getSpecialAttribute(node, "showif-arg-visited-times");
		var showIfNotVisitedTimes = getSpecialAttribute(node, "showif-arg-notvisited-times");
		
		var isShowIfVisited = true;
		var isShowIfNotVisited = true;
		
		var getVisited = function(attribPage, attribTimes, falseIfVisited) {
			if(attribPage instanceof Array) {
				var arr = [];
				var i;
				for(i = 0; i < attribPage.length; i++) {
					if(falseIfVisited ? (pages[attribPage[i]].visited >= attribTimes) : (pages[attribPage[i]].visited < attribTimes))
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
		servePage(1, null, null);
	}
	
	function getSpecialAttribute(node, attribute) {
		var value = node.getAttribute("data-" + attribute);
		if(value === null)
			return null;
		
		value.replace("'", '"');
		
		try {
			return JSON.parse(value);
		}
		catch(e) {
			return value;
		}
	}
	
	return {
		initialize : initialize,
		servePage : servePage,
		addItemToInventory : addItemToInventory,
		removeItemFromInventory : removeItemFromInventory,
		restart : restart
	}
}

var global = (function() {
	var pl = new PageLoader("book.html");
	pl.setCompletionListener(onLoaded);
	pl.load();
	
	var logic = new Logic();
	
	function onLoaded(rawPageArray) {
		logic.initialize(rawPageArray);
		logic.servePage(1, null, null);
	}
	
	return {
		logic : logic
	}
})();
















