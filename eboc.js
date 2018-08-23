"use strict";

/**
 * Game model constructor for exploding boxes of color Calling this will create an SVG view
 *
 * @param id HTML element id for game view
 * @param width Width in pixels of the game view
 * @param height Height in pixels of the game view
 * @param onScore Callback called when the score has changed
 * @param onLevelUp Callback called when the game level has changed
 *
 */
function Eboc(id, width, height, onScore, onLevelUp) {
  this.width = width;
  this.height = height;

  /* Boxes are stored in a 2D array. The first array stores arrays of columns, from left to right. The second
   array level stores box objects for each column, from bottom to top. */
  this.columns = [];
  this.borderPadding = 30;
  this.currentLevelIndex = 0;
  this.levels = [
    {size:15,numColors:1},
    {size:15,numColors:4},
    {size:20,numColors:3},
    {size:20,numColors:4},
    {size:15,numColors:5},
    {size:15,numColors:6},
    {size:25,numColors:3},
    {size:25,numColors:4},
    {size:25,numColors:5},
    {size:25,numColors:6},
    {size:25,numColors:1}
  ];

  this.view = new Eboc.SvgView(id, width, height);
  this.onScore = onScore;
  this.onLevelUp = onLevelUp;
  this.resetGame();
}

/**
 * Singleton for score calculation methods used by both model and view
 */
Eboc.Scorer = {

  multipliers:[
    [30, 32],
    [25, 16],
    [20, 8],
    [15, 4],
    [13, 2],
    [0, 1],
  ],

  getScore: function( groupSize ) {
    let multiplier = this.getMultiplier(groupSize);
    return groupSize * multiplier;
  },

  getMultiplier: function(groupSize) {
    let multiplier = 1;
    for (let pair of this.multipliers) {
      if (groupSize > pair[0]) {
        multiplier = pair[1];
        break;
      }
    }
    return multiplier;
  },

  getBoxPenalty: function(numBoxesRemaining) {
    return numBoxesRemaining ? (numBoxesRemaining*-100) : 1000;
  },

  getMovesBonus: function(moves) {
    return (1000 - moves*10);
  }
}

/**
 * Box object stored in columns
 * @param x       X location of the box
 * @param y       Y location of the box
 * @param colorId Index of the color for this box
 * @param size    Size of the box in pixels
 * @param column  Column array containing the box
 */
Eboc.Box = function(x, y, colorId, size, column) {
  this.x = x;
  this.y = y;
  this.width = size;
  this.height = size;
  this.colorId = colorId;
  this.fallingBy = 0;
  this.slidingBy = 0;
  this.column = column;
}

/**
 * Resets the enire game
 */
Eboc.prototype.resetGame = function() {
  this.currentLevelIndex = 0;

  this.score = 0;
  this.moves = 0;
  this.largestGroup = 0;
  this.levelScore = 0;

  let level = this.levels[this.currentLevelIndex];
  this.setup(level.size, level.size, level.numColors);
  this.view.setup(this.columns, this.onBoxSelected.bind(this));
  if (this.onScore) {
    this.onScore(this.score, this.moves, this.largestGroup);
  }
}

/**
 * Resets the game after a level
 */
Eboc.prototype.resetLevel = function() {
  this.levelScore = 0;
  this.moves = 0;
  if (this.onScore) {
    this.onScore(this.score, this.moves, this.largestGroup);
  }
}

/* Updates each box with a list of its matching neighbors. */
Eboc.prototype.updateNeighbors = function() {
  for (let i = 0; i < this.columns.length; i ++) {

    let column = this.columns[i];
    let prevColumn = i > 0 ? this.columns[i-1] : null;
    let nextColumn = i < this.columns.length - 1 ? this.columns[i+1] : null;

    for (let j = 0; j < column.length; j ++) {
      let box = column[j];
      /* collect an array of neighbors */
      let neighbors = [];

      /* box above */
      if (j < column.length - 1) {
        neighbors.push(column[j+1]);
      }
      /* box below */
      if (j > 0) {
        neighbors.push(column[j-1]);
      }
      /* box to the left */
      if (prevColumn && prevColumn[j]) {
        neighbors.push(prevColumn[j]);
      }
      /* box to the right */
      if (nextColumn && nextColumn[j]) {
        neighbors.push(nextColumn[j]);
      }

      box.matchingNeighbors = neighbors.filter((neighbor) => neighbor.colorId == box.colorId);
    }
  }
}

/*
 * Recursively labels all boxes in a group with a reference to the same array that contains all members of the group.
 */
Eboc.prototype.updateGroupsFromBox = function(box, group) {
  if (!box.group) {
    box.group = group;
    group.push(box);
    for (let neighbor of box.matchingNeighbors) {
      this.updateGroupsFromBox(neighbor, group);
    }
  }
}

/*
 * Loops through all boxes and updates the box objects with group and neighbor information. This should be called every
 * time the column structure changes so that groups reflect the current adjacency.
 *
 * @return maxGroupSize which is 0 if there are no remaining groups
 */
Eboc.prototype.updateGroups = function() {

  /* clear old groups */
  for (let i = 0; i < this.columns.length; i ++) {
    let column = this.columns[i];
    for (let j = 0; j < column.length; j ++) {
      column[j].group = null;
    }
  }

  this.updateNeighbors();
  let maxGroupSize = 0;
  /* create new groups */
  for (let i = 0; i < this.columns.length; i ++) {
    let column = this.columns[i];
    for (let j = 0; j < column.length; j ++) {
      let box = column[j];
      let group = [];
      this.updateGroupsFromBox(box, group);
      maxGroupSize = Math.max(maxGroupSize, group.length);
    }
  }

  return maxGroupSize;
}

/**
 * Setup the game with columns of a given dimension and number of colors to be set randomly
 * @param xSize     Number of boxes in the horizontal direction
 * @param ySize     Number of boxes in the vertical direction
 * @param numColors Number of colors to randomly assign between boxes
 */
Eboc.prototype.setup = function(xSize, ySize, numColors) {

  let boxWidth = this.width / xSize - 2 * this.borderPadding / xSize;
  this.columns.length = 0;

  for (let i = 0; i < xSize; i ++) {
    this.columns[i] = [];
    for (let j = 0; j < ySize ; j ++) {
      let column = this.columns[i];
      let colorId = Math.floor(Math.random() * numColors);
      let x = i * boxWidth + this.borderPadding;
      let y = this.height - j * boxWidth - this.borderPadding;
      let box = new Eboc.Box(x, y, colorId, boxWidth, column);
      column.push(box);
    }
  }

  this.updateGroups();
}

/**
 * Ends a level.
 */
Eboc.prototype.endLevel = async function() {

  /* end of level score calculations */
  let movesBonus = Eboc.Scorer.getMovesBonus(this.moves);
  let boxPenalty = Eboc.Scorer.getBoxPenalty(this.boxes.length)
  let preBonusScore = this.score;

  this.score += movesBonus + boxPenalty;
  await this.view.showEndLevel(this.score, this.levelScore, preBonusScore, movesBonus, boxPenalty, this.boxes)

  this.resetLevel();
  if (this.score < 0) {
    this.view.showFailureScreen(this.resetGame.bind(this));
  } else {
    this.currentLevelIndex++;
    if (this.currentLevelIndex >= this.levels.length) {
      this.view.showFinalScreen(this.resetGame.bind(this));
    } else {
      let level = this.levels[this.currentLevelIndex];
      this.setup(level.size, level.size, level.numColors);
      this.view.setup(this.columns, this.onBoxSelected.bind(this));
      if (this.onLevelUp) {
        this.onLevelUp(this.currentLevelIndex + 1);
      }
    }
  }
}

/**
 * Handles a box being selected by the user
 *
 * @param      {Box}  box     The box selected by the user
 */
Eboc.prototype.onBoxSelected = async function(box) {
  let groupSize = box.group.length;

  if (groupSize <= 1) {
    return; /* early return if user clicked a "group" with one box */
  }

  this.largestGroup = Math.max(groupSize, this.largestGroup);

  /* calculate the amount for boxes above to fall */
  let boxesToRemove = [];
  for (let member of box.group) {
    let index = member.column.indexOf(member);
    for (let i = index; i < member.column.length; i++) {
      member.column[i].fallingBy += member.column[i].height;
    }
    boxesToRemove.push(member);
    member.column.splice(index, 1);
  }

  /* Find any empty columns and move the columns over */
  let boxesToDrop = [];
  for (let colIndex =0; colIndex < this.columns.length; colIndex++) {
    let column = this.columns[colIndex];
    if (!column.length) {

      /* Add one boxWidth worth of sliding to all columns to the right */
      for (let rColIndex = colIndex + 1; rColIndex < this.columns.length; rColIndex++) {
        for (let rBox of this.columns[rColIndex]) {
          /* Since there is no column width value, use the box's own width.
           * this assumption relies on all boxes being the same width */
          rBox.slidingBy += rBox.width;
        }
      }

      this.columns.splice(colIndex, 1);
      colIndex--;
    } else {
      /* If column is not empty use this chance to find the boxes that will drop */
      boxesToDrop = boxesToDrop.concat(column.filter((aBox)=> aBox.fallingBy > 0))
    }
  }

  /* Find all the boxes which will slide over and count boxes remaining and update the flat list of boxes*/
  let boxesToSlide = [];
  this.boxes = [];
  for (let column of this.columns) {
    boxesToSlide = boxesToSlide.concat(column.filter((aBox)=> aBox.slidingBy > 0));
    this.boxes = this.boxes.concat(column);
  }

  /* Update groups before animations start, so fast clicking while animation happens
   * doesn't use old groups */
  let maxGroupRemaining = this.updateGroups();

  /* Update the view so that each animation happens sequentially */
  let ret = this.view.showBoxesRemoved(boxesToRemove)

  try {
    await this.view.showScoreMultiplier(box, groupSize);
    await this.view.showBoxesDropping(boxesToDrop);
    await this.view.showBoxesSliding(boxesToSlide);
  } catch (error) {
     /* On any animation error just setup the whole view to the current state */
    this.view.setup(this.columns, this.onBoxSelected.bind(this));
    console.error(error);
  }

  var thisScore = Eboc.Scorer.getScore(groupSize);

  this.moves++;
  this.score += thisScore;
  this.levelScore += thisScore;

  if (this.onScore) {
    this.onScore(this.score, this.moves, this.largestGroup);
  }

  if (maxGroupRemaining <= 1) {
    this.endLevel();
  }

}