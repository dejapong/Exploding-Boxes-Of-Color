/**
	Exploding Boxes of Color 	
  
  Author: Dejapong (http://dejapong.com)
  
	This program is free software: you can redistribute it and/or modify
	it under the terms of the GNU General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU General Public License for more details.

	You should have received a copy of the GNU General Public License
	along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/
Raphael.fn.matchDrop = function(id,width,height,onScore,onLevelUp){
	var score = 0, largestGroup = 0, moves =0, totalMoves, scoreToSave,
	colors = ["#de3c29","#c9932d","#007d46","#224360","#912220","#0087fa"],
	hcolors = ["f87060","#f0c779","#26a26b","#487093","#a7413f","#6eabdf"],
	history = [], numColors = 3, columns,
	paper = Raphael(id,width,height), groupSizes = {},
	groupsRemaining = true, blocksRemaining = 0,
	background = "#252522", nextButton, text, startTime,
	textAttr = {"font-size":20,"fill":"#fff","stroke-width": 0,"font-family":"Lobster"},
	xCount, yCount, padding =30, blockWidth, currentLevel = 0,
	levels = [
		{size:15,colors:3},
		{size:15,colors:4},
		{size:20,colors:3},
		{size:20,colors:4},
		{size:15,colors:5},
		{size:15,colors:6},
		{size:25,colors:3},
		{size:25,colors:4},
		{size:25,colors:5},
		{size:25,colors:6},
		{size:25,colors:1}
	];
	
	/** Restart the game */
	function restart(){
		history = [];	
		currentLevel = 0;		
		score = 0;
		scoreToSave = 0;
		totalMoves = 0;
		startTime = new Date().getTime(); 
		var level = levels[currentLevel];
		numColors = level.colors; 
		xCount = level.size;
		yCount = level.size;
		onLevelUp(currentLevel+1); 
		setup();
	}
	
	function postScore(){
		var endTime = new Date().getTime();
		var elapsedTime = endTime - startTime; 
		var name = prompt("Enter your name to post your score");
		if (name =="") alert("You must enter a name to post your score");
		if (name != undefined && name !=""){
			var form = document.createElement("form");
			form.setAttribute("method", "post");
			form.setAttribute("action", "postScore.php");		
			var field = document.createElement("input");
			field.setAttribute("type", "hidden");
			field.setAttribute("name", "name");
			field.setAttribute("value",name);
			form.appendChild(field);
			field = document.createElement("input");
			field.setAttribute("type", "hidden");
			field.setAttribute("name", "score");
			field.setAttribute("value",scoreToSave);
			form.appendChild(field);
			field = document.createElement("input");
			field.setAttribute("type", "hidden");
			field.setAttribute("name", "time");
			field.setAttribute("value",elapsedTime);
			form.appendChild(field);
			field = document.createElement("input");
			field.setAttribute("type", "hidden");
			field.setAttribute("name", "history");
			field.setAttribute("value",history);
			form.appendChild(field);
			field = document.createElement("input");
			field.setAttribute("type", "hidden");
			field.setAttribute("name", "level");
			field.setAttribute("value",currentLevel);
			form.appendChild(field);
			document.body.appendChild(form);
			form.submit();		
		}
	}
	
	//go to next level
	function nextLevel(){
		scoreToSave = score;
		var bonus = 0; 
		currentLevel = currentLevel + 1;
		if (blocksRemaining > 0)
			bonus += blocksRemaining*-100;
		else
			bonus += 1000;
		bonus += (1000 - moves*10);
		
		score += bonus;
		totalMoves += moves; 

		if (text) text.attr("text","");
		if (currentLevel == levels.length){
			text = paper.text(width/2,padding,"You Won!\nWell Done. Thanks for Playing!");
			text.attr(textAttr);
			onScore(score,moves,largestGroup);
			scoreToSave = score;
			showPostScore();
		}else{
			var level = levels[currentLevel],
				delay = 700;			
			numColors = level.colors; 
			xCount = level.size;
			yCount = level.size; 
			setTimeout(showLevelComplete,1000);
		}//end else	

		function showLevelComplete(){
			text = paper.text(width/2,padding,"Level Completed");
			text.attr(textAttr);
			setTimeout(showScore,delay);
		}
		
		function showScore(){
			text = paper.text(width/2,padding + 150,"Current Score: " + scoreToSave);
			text.attr(textAttr);			
			setTimeout(showRemainingBlocks,delay);
		}
		
		function showRemainingBlocks(){
			var text;
			if (blocksRemaining > 0)
				text = paper.text(width/2,padding + 200,"Remaining Blocks: " + (blocksRemaining*-100) + " Points" );
			else
				text = paper.text(width/2,padding + 200,"No Remaining Blocks: 1000 Points");
			text.attr(textAttr);
			setTimeout(showMovesUsed,delay);
		}
		
		function showMovesUsed(){
			var remainText = paper.text(width/2,padding + 250,"Moves Bonus: " + (1000 - moves*10) + " Points");
			remainText.attr(textAttr);
			setTimeout(showButton,delay);	
		}
		
		function showButton(){
			var text = paper.text(width/2,padding + 300,"Final Score: " + score);
			var buttonText;
			nextButton = paper.rect(width/2-100,360,200,30,5);
			nextButton.attr({"fill":"#c9932d","stroke-width":0,"cursor":"pointer"});
			if (score < 0){				
				buttonText = paper.text(width/2,374,"Try Again");
				nextButton.click(restart);
				buttonText.click(restart);
				showPostScore();
			}else{
				buttonText = paper.text(width/2,374,"Next Level");
				nextButton.click(setup);
				buttonText.click(setup);
				buttonText.attr({"cursor":"pointer"});
			}
			buttonText.attr(textAttr);	
			text.attr(textAttr);
		}
		
		function showPostScore(){
			var button = paper.rect(width/2-100,406,200,30,5);
			button.attr({"fill":"#007d46","stroke-width":0,"cursor":"pointer"});
			text = paper.text(width/2,420,"Post Current Score");
			text.attr(textAttr);
			text.attr({"cursor":"pointer"});
			button.click(postScore);
			text.click(postScore);
		}
		
	} //end next level 
	
	//find groups of colors
	function findGroups(){
		blocksRemaining = 0; 
		groupsRemaining = false; 
		for (var i = 0,il=columns.length; i < il ; i ++){
			for (var j = 0,jl=columns[i].length; j < jl ; j ++){
				blocksRemaining++;
				columns[i][j].findGroups(i*yCount + j);
			}
		}
		if (!groupsRemaining){
			nextLevel();
		}
	}	
	
	//create blocks
	function setup(){
		//reset variables
		paper.clear();
		columns = []; 
		largestGroup = 0; 
		moves = 0; history.push("n");
		blockWidth = width/xCount - 2*padding/xCount; 
		onScore(score,moves,largestGroup);
		onLevelUp(currentLevel+1);
		//create the text
		text = paper.text(width/2,padding,"");
		text.attr(textAttr);
		history.push(xCount); history.push(yCount);	
		for (var i = 0,il=xCount; i < il ; i ++){
			columns[i] = [];
			for (var j = 0,jl=yCount; j < jl ; j ++){
				var color = Math.floor(Math.random()*numColors); 
				var block = paper.rect(i*blockWidth+padding,height-j*blockWidth-padding,blockWidth-2,blockWidth-2,5);
				block.attr({fill:colors[color],"stroke-width":2,"stroke":background});
				block.type = color; 
				block.column = i;
				block.row = j;
				block.id = i*yCount+j;
				block.downQ = 0;
				block.leftQ = 0;
				block.marked= false; 
				history.push(color); 

				block.findGroups = function (groupNumber){ 
					if (this.marked) return;
					var i = this.column; 
					var j = this.row; 
					this.marked=true;
					this.group = groupNumber;
					if (!groupSizes[groupNumber]) groupSizes[groupNumber] = 0; 
					groupSizes[groupNumber]++;
					if (groupSizes[groupNumber] > 1) groupsRemaining = true; 
					var neighbor = [];
					if (j < columns[i].length) neighbor.push(columns[i][j+1]);
					if (j > 0) neighbor.push(columns[i][j-1]);
					if (i > 0) neighbor.push(columns[i-1][j]);
					if (i < columns.length-1) neighbor.push(columns[i+1][j]);
					for (var k =0; k < neighbor.length; k++){
						if (neighbor[k])
						if (neighbor[k].type == this.type)
							neighbor[k].findGroups(groupNumber);
					}
				}
				
				block.click(function(){ 
					var size = groupSizes[this.group]; 
					if (size < 2){ 
						return;
					}
					text.attr({"text":"","font-size":1});
					if (size > 7)
						if (size < 15)  text.attr({"text":"Good Job! x2"});
						else if (size < 20)  text.attr({"text":"Great Job! x4"});
						else if (size < 25)  text.attr({"text":"Oh my, Quite Excellent! x8"});
						else if (size < 30) text.attr({"text":"Oh, so many Indeed! x16"});
						else text.attr({"text":"Force of a Thousand Suns!!! x32"});
					text.animate({"font-size":20,"fill":"#fff","y":padding},300,"<");  
										
					var thisScore = size
					if (size > 13 && size < 15) thisScore *=2;
					if (size > 15 && size < 20) thisScore *=4;
					if (size > 20 && size < 25) thisScore *=8;
					if (size > 25 && size < 30) thisScore *=16;				
					if (size > 30) thisScore *=32;
										
					score += thisScore;	
					moves ++; 				 
					history.push(this.id);
					largestGroup = Math.max(largestGroup,size)
					onScore(score,moves,largestGroup); 
					
					var group = [];
					//find the group members and mark all upper blocks to come down
					for (var k = 0,kl=columns.length; k < kl ; k ++){
						var inColumn = 0; 
						var column = columns[k]; 
						for (var l = 0,ll=column.length; l < ll ; l ++){
							if (column[l].group == this.group){
								group.push(column[l]);
								for (var m = l+1; m < columns[k].length; m++){
									column[m].downQ += blockWidth; 
									column[m].row -= 1;
								}
								inColumn++;
							}
						}
						//if column is gone, move everyone over
						if (inColumn == column.length){
							for (i = k+1,il=columns.length;i<il;i++){
								for (j = 0,jl=columns[i].length;j<jl;j++){
									var block = columns[i][j];
									block.column -= 1;
									block.leftQ = -1*blockWidth; 
								}
							}
						}
						
					}
	
					//move all blocks down
					for (var k = 0,kl=columns.length; k < kl ; k ++){
						var column = columns[k]; 
						for (var l = 0,ll=column.length; l < ll ; l ++){
							var curY = height - l * blockWidth-padding;
							var block = column[l];
							var downQ = block.downQ; 
							block.animate({y:curY+downQ},500,"bounce");
							block.downQ = 0;
							block.marked = false;
						}
					}
	
						
					//remove blocks and columns
					for (var i =0,il = group.length ; i < il ; i++){
						var block = group[i];
						var columnIndex= block.column;
						var column = columns[columnIndex];
						column.splice(block.row,1);
						block.explode();
						if (column.length == 0){
							columns.splice(columnIndex,1);
						}
					}
					
					//move all columns over if needed  
					for (var k = 0,kl=columns.length; k < kl ; k ++)
						for (var l = 0,ll=columns[k].length; l < ll ; l ++){
							var block = columns[k][l]; 
							var leftQ = block.leftQ;
							if (leftQ < 0){
								var curX = k * blockWidth+padding;
								leftQ += blockWidth;		
								block.animate({x:curX+leftQ},500,"<");
								block.leftQ = 0;
								block.marked = false;
							}
						}
					
					//find new groups resulting from the moves
					groupSizes = {};
					findGroups();
				});//end block click
	
				block.mouseout(function(){
					for (var i = 0,il=columns.length; i < il ; i ++){
						for (var j = 0,jl=columns[i].length; j < jl ; j ++){	
							if (columns[i][j].group == this.group)
								columns[i][j].attr({"fill":colors[this.type],"stroke":background});
						}
					}
				});			
				
				block.mouseover(function(){
					for (var i = 0,il=columns.length; i < il ; i ++){
						for (var j = 0,jl=columns[i].length; j < jl ; j ++){	
							if (columns[i][j].group == this.group)
								columns[i][j].attr({"fill":hcolors[this.type],stroke:"#fff","stroke-width":2});
						}
					}
				});
				
				block.explode = function(){
					var x = this.attr("x");
					var y = this.attr("y");
					var speed = 25;
					var minspeed = 15; 
					var gravity = 0.1; 
					var quart = blockWidth*0.5;
					var bitAttr = {"fill":colors[this.type],"stroke-width":0};
					//create build four blocks in place
					var bits = []; 
					bits[0] = paper.rect(x,y,quart,quart,3);
					bits[1] = paper.rect(x+quart,y,quart,quart,3); 
					for (var i = 0; i<2;i++){
						var bit = bits[i]; 
						bit.attr(bitAttr);				
						bit.speed = Math.random()*speed+minspeed;
						bit.angle = Math.random()*3.14*2;
					}
					var life = blockWidth;
					//send them off at random angles and speeds
					var animate = setInterval(function(){
						for (var i = 0; i<2;i++){
							var bit = bits[i];
							
							var curX = bit.attr("x");
							var curY = bit.attr("y");
							
							if (bit.angle > 1.57)
							if (bit.angle > 4.71){
								bit.angle += gravity;
								if (bit.angle > 7.85) bit.angle = 1.57;
							} else{ 
								bit.angle -= gravity
							}
							
							life--;
							if (life <= 0){
								bit.remove();
								clearInterval(animate); 
							}
								
							bit.attr({
								x:(curX + bit.speed*Math.cos(bit.angle)),
								y:(curY + bit.speed*Math.sin(bit.angle)),
								width:life,
								height:life
								});
						}
					},60);
					this.remove();
				}//end block explode
				
				columns[i][j] = block; 
			}//end row loop for block creation
		}//end column loop for block creation
		text.toFront();
		findGroups();
	}//end setup
	
	//prevent text selection
	window.onload = function() {
		document.onselectstart = function() {return false;} // ie
		document.onmousedown = function() {return false;} // mozilla
	}
	restart(); 
}
