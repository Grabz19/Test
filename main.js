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

function Logic() {
	var pageContainer = document.getElementById('page_container');
	var inventoryContainer = document.getElementById('inventory_container');
	var inventoryInfobox = document.getElementById('inventory_infobox');
	
	var pages = null;
	
	function initialize(rawPageArray) {
		pages = [];
		
		var i, j;
		for(i = 0; i < rawPageArray.length; i++) {
			if(!rawPageArray[i]) {
				pages[i] = new Page(document.createElement("div"), 0);
				continue;
			}
			
			pages[i] = new Page(rawPageArray[i], 0);
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
			parseNodeTargetRestart(node);
		}
		
		pageContainer.innerHTML = "";
		pageContainer.appendChild(page);
		pages[pageNext].visited++;
		return true;
	}
	
	function applyFlags(page) {
		var resetVisited = getSpecialAttribute(page, "page-flag-resetvisited");
		
		if(resetVisited === null)
			return false;
		else {
			
			if(resetVisited instanceof Array) {
				for(var i = 0; i < resetVisited.length; i++) {
					pages[resetVisited[i]].visited = 0;
				}
			}
			else {
				pages[resetVisited].visited = 0;
			}
			return true;
		}
	}
	
	function parseNodeTargetRestart(node) {
		var gameOver = getSpecialAttribute(node, "gameover");
		if(gameOver !== null)
			node.onclick = restart;
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
		
		node.onclick = (function(a, b, c) {
			return function() {
				servePage(a, b, c);
			}
		})(targetPage, currentPage, sendArgs);
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
		servePage(1, null, null);
	}
	
	function getSpecialAttribute(node, attribute) {
		return JSON.parse(node.getAttribute("data-" + attribute));
	}
	
	return {
		initialize : initialize,
		servePage : servePage,
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
















