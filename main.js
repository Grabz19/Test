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
	var pageContainer = document.getElementById('page');
	
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
		
		var nodes = page.getElementsByTagName("*");
		for(i = 0; i < nodes.length; i++) {
			var node = nodes[i];
			var targetPage = node.getAttribute("data-goto");
			if(targetPage) {
				targetPage = parseInt(targetPage);
				var sendArgs = {};
				var argId = node.getAttribute("data-goto-arg-id");
				if(argId) {
					sendArgs.id = argId;
				}
				node.onclick = (function(a, b, c) {
					return function() {
						servePage(a, b, c);
					}
				})(targetPage, pageNext, sendArgs);
			}
			
			var showIfId = node.getAttribute("data-showif-arg-id");
			var showIfNotId = node.getAttribute("data-showif-arg-notid");
			var visible = true;
			if(args) {
				if(showIfId !== null && args.id != showIfId)
					visible = false;
				
				if(showIfNotId !== null && args.id == showIfNotId)
					visible = false;
			}
			
			var checkVisited = function(attribute, falseIfVisited) {
				attribute = JSON.parse(attribute);
				
				if(attribute instanceof Array) {
					var arr = [];
					var i;
					for(i = 0; i < attribute.length; i++) {
						if(falseIfVisited ? pages[attribute[i]].visited : !pages[attribute[i]].visited)
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
					if(falseIfVisited ? pages[attribute].visited : !pages[attribute].visited)
						return false;
				}
				return true;
			}
			
			var showIfNotVisited = node.getAttribute("data-showif-arg-notvisited");
			if(showIfNotVisited !== null)
				visible = checkVisited(showIfNotVisited, true);
			var showIfVisited = node.getAttribute("data-showif-arg-visited");
			if(showIfVisited !== null)
				visible = checkVisited(showIfVisited, false);
			
			if(!visible)
				node.style.display = "none";
			
			var gameOver = node.getAttribute("data-gameover");
			if(gameOver !== null)
				node.onclick = restart;
		}
		
		pageContainer.innerHTML = "";
		pageContainer.appendChild(page);
		pages[pageNext].visited++;
		return true;
	}
	
	function restart() {
		resetVisited();
		servePage(1, null, null);
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
















