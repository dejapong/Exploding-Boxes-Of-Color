"use strict";

/*
 * SVG view for Eboc. This view uses Raphael to draw the Eboc game state, handle user inputs
 * and provide sweet animations.
 *
 * @param id      HTML id of the element to create the svg node in
 * @param width   Width of the resulting svg node
 * @param height  Height of the resulting svg node
 */
Eboc.SvgView = function (id, width, height) {
  this.colors = ["#de3c29","#c9932d","#007d46","#224360","#912220","#0087fa"];
  this.hcolors = ["#f87060","#f0c779","#26a26b","#487093","#a7413f","#6eabdf"];
  this.textAttr = {"font-size":20,"fill":"#fff","stroke-width": 0,"font-family":"Lobster"};
  this.paper = Raphael(id,width,height);
  this.backgroundColor = "#252522";
  this.highlightColor = "#FFFFFF";
  this.particles = [];
  this.rendering = false;
  this.lastFrameTimeMs = 0;
  this.touchDetected = false;
  this.width = width;
  this.height = height;
  Object.assign(this.paper.canvas.style, {overflow:"unset"})
}

/*
 * Internal helper function which creates an array of functions, one function per line
 * of text. When these are applied as executors to chained promises, they will draw
 * lines of text, or action buttons on the center of the screen.
 *
 * @param lines   An array of strings or objects which will be displayed sequentially.
 *                Objects which have the form {text:string, action:function} will be
 *                rendered as a button. The function "action" will be called when the
 *                user presses it
 * @param centerY Y value for the center of the lines of text
 * @param options Various appearance and animation options
 *
 * @return array of executor functions which will display lines of text
 */
Eboc.SvgView.prototype._createLineExecutors = function(lines, centerY, options) {

  let linesShown = 0;

  options = Object.assign({
    delay: 500,
    lineViews:[],
    fontSize:30,
  }, options);
  let lineHeight = options.fontSize * 1.2;

  /* Create promise executors for each line of text.  */
  let executors = lines.map((text, lineNumber)=>{
    return (resolve)=> {
      linesShown ++;

      let y = centerY + (linesShown - lines.length) * lineHeight + lineHeight * lines.length / 2;
      let textView = this.paper.text(this.width / 2, y, text.action ? text.text : text);
      options.lineViews.push(textView);

      /* Draw a button with background rect, or just plain line of text*/
      if (text.action) {
        textView.attr(Object.assign({}, this.textAttr, {
          "font-size": options.fontSize,
          "cursor":"pointer"
        }));
        let margin = 2;
        let bBox = textView.getBBox();
        let width =  bBox.width;
        let height =  bBox.height - 6 - margin * 2;
        textView.attr({ "font-size": options.fontSize / 2 });
        let x = textView.attr("x") - width / 2;
        let y = textView.attr("y") - height / 2;
        let background = this.paper.rect(x, y + margin, width, height, 5);
        background.attr({
          "fill":this.colors[parseInt((this.colors.length-1)*Math.random())],
          "cursor":"pointer"
        })
        textView.toFront();
        textView.click(text.action);
        background.click(text.action);
        resolve();
      } else {
        textView.attr(Object.assign({}, this.textAttr, {"font-size": 0}));
        textView.animate({"font-size": options.fontSize}, options.delay, "bounce", function() {
          resolve();
        });
      }


    };
  });

  return executors;
}

/**
 * Call at anytime to start the particle rendering cycle
 */
Eboc.SvgView.prototype._startRendering = function(){
  if (!this.rendering) {
    this.rendering = true;
    this.lastFrameTimeMs = performance.now();
    this._renderParticles();
  }
}

/**
 * Called to render all particles in the view. This will continue to render as fast
 * as possible, until all particles are gone.
 *
 * Particles can set the field "dying" to be true, these will continue to fall and wrap at
 * the bottom of the screen until removed by some other method.
 */
Eboc.SvgView.prototype._renderParticles = function() {
  const GRAVITY = 0.5;
  const MSPF = 1000/60; /* target milliseconds per frame */

  /* Timescale animation so particles appear to move at the same speed regardless of frame rate */
  let nowMs = performance.now();
  let elapsedFrameTimeMs = nowMs - this.lastFrameTimeMs;
  let timeScale = elapsedFrameTimeMs / MSPF;

  for (let i =0; i < this.particles.length; i++) {
    let particle = this.particles[i];
    let oldX = particle.x;
    let oldY = particle.y;

    if (particle.life <= 0){
      this.particles.splice(i, 1);
      particle.remove();
      i--;
    } else {

      particle.x += particle.dx * timeScale;
      particle.y += particle.dy * timeScale;

      particle.attr({
        x:particle.x,
        y:particle.y,
        width:particle.life,
        height:particle.life,
      });

      if (particle.dying) {
        particle.dy += GRAVITY;
        particle.life--;
      } else {
        if (particle.y > window.innerHeight) {
          particle.y = -100;
        }
      }
    }
  }

  this.lastFrameTimeMs = nowMs;

  if (this.particles.length) {
    window.requestAnimationFrame(this._renderParticles.bind(this));
  } else {
    this.rendering = false;
  }
}

/**
 * Event handler for cursor leaving a single box.
 * @param columns Array of columns containing all boxes
 */
Eboc.SvgView.prototype._onMouseOut = function(columns) {
  for (let column of columns) {
    for (let box of column) {
      if (box.highlighted) {
        box.view.attr({
          "fill": this.colors[box.colorId],
          "stroke": this.backgroundColor
        });
        box.highlighted = false;
      }
    }
  }
}

/**
 * Event handler for cursor entering a single box
 * @param box The object for the box the cursor entered
 */
Eboc.SvgView.prototype._onMouseOver = function(box) {
  if (this.touchDetected) {
    return;
  }

  for (let member of box.group) {
    member.view.attr({
      "fill": this.hcolors[member.colorId],
      "stroke": this.highlightColor,
    }).toFront();
    member.highlighted = true;
  }
}

/**
 * Even handler for a user clicking a single box
 * @param box The object for the box the user clicked on
 * @param onBoxSelected Game model method to call when a box is clicked on by the user
 */
Eboc.SvgView.prototype._onMouseDown = function(box, onBoxSelected) {
  let clickAnimation = Raphael.animation({
    "stroke-width": 5
  }, 50, "backIn", function() {
    this.animate({"stroke-width": 2}, 50, "backIn");
  });
  box.view.toFront().animate(clickAnimation);

  onBoxSelected(box);
}

/**
 * Event handler for detecting touchscreen input
 */
Eboc.SvgView.prototype._onTouchDetected = function(columns){
  this.touchDetected = true;
  this._onMouseOut(columns);
}

/**
 * Sets up the view and connects events with the game model
 *
 * @param columns Array of columns containing all boxes
 * @param onBoxSelected Game model method to call when a box is clicked on by the user
 */
Eboc.SvgView.prototype.setup = function(columns, onBoxSelected) {
  this.paper.clear();
  for (let column of columns) {
    for (let box of column) {
      box.view = this.paper.rect(
        box.x - box.slidingBy,
        box.y + box.fallingBy,
        box.width,
        box.height,
        5);
      box.slidingBy = 0;
      box.fallingBy = 0;
      box.view.attr({
        "y" : - 200 - this.height * Math.random(),
        "fill": this.colors[box.colorId],
        "stroke-width": 2,
        "stroke": this.backgroundColor
      });

      let anim = Raphael.animation({
        "y": box.y
      }, 1000, "bounce");
      box.view.animate(anim.delay(this.height-box.y))

      /* Highlight group on mouseover */
      box.view.mouseover(this._onMouseOver.bind(this, box));

      /* Unhighlight group on mouse out or touchend */
      box.view.mouseout(this._onMouseOut.bind(this, columns));
      box.view.touchstart(this._onTouchDetected.bind(this, columns));

      /* Notify model that box has been clicked and show click animation */
      box.view.mousedown(this._onMouseDown.bind(this, box, onBoxSelected));
      box.view.touchend(function(e){
        /* Prevent double tap zoom on the blocks */
        e.preventDefault();
      });

    }
  }
}

/**
 * Show a score multiplier animation for the selecting a box which belongs to a group
 * @param box       The box to show the score multiplier for
 * @param groupSize The size of the group the box belonged to, used to lookup the multiplier
 *
 * @return A promise for running the animation
 */
Eboc.SvgView.prototype.showScoreMultiplier = async function(box, groupSize) {
  return new Promise((resolve)=> {

    let scoreText;
    let multiplier = Eboc.Scorer.getMultiplier(groupSize)
    if (multiplier > 1) {
      scoreText = multiplier + "x";
    }

    if (scoreText) {
      let text = this.paper.text(box.x, box.y, scoreText);
      text.attr(this.textAttr);
      text.animate({"font-size": 30}, 10, "easeIn", function(){
        this.animate({ y: 0}, 1200, "linear", function(){
          this.animate({ opacity:0 }, 300, function(){
            this.remove();
          });
        })
      })
    }

    /* Don't hold up resolution on animation */
    resolve();
  });
}

/**
 * Show boxes dropping by their fallingBy value.
 * @param boxesToDrop Array of boxes to animate falling
 *
 * @return A promise for running the animation
 */
Eboc.SvgView.prototype.showBoxesDropping = async function(boxesToDrop) {
  return Promise.all(boxesToDrop.map(function(box){
    return new Promise((resolve)=> {
      let originalY = box.y;
      box.y = originalY + box.fallingBy;
      box.fallingBy = 0;
      box.view.animate({
        y: box.y
      }, 500, "bounce", resolve);
    });
  }));
}

/**
 * Show boxes sliding horizontally by their slidingBy value
 * @param boxestoSlide Array of boxes to animate sliding
 *
 * @return A promise for running the animation
 */
Eboc.SvgView.prototype.showBoxesSliding = async function(boxesToSlide) {
  return Promise.all(boxesToSlide.map(function(box){
    return new Promise(function(resolve) {
      let originalX = box.x;
      box.x = originalX - box.slidingBy;
      box.slidingBy = 0;
      box.view.animate({
        x: box.x
      }, 500, "bounce", resolve);
    });
  }));
}

/**
 * Show boxes being removed.. in this case by exploding them and creating
 * particles to be animated
 *
 * @param boxesToRemove Array of boxes to animate being removed
 *
 * @return A promise for running the animation
 */
Eboc.SvgView.prototype.showBoxesRemoved = async function(boxesToRemove) {
  return new Promise((resolve, reject)=> {
    for (let box of boxesToRemove) {
      const quart = box.width * 0.5;
      const maxSpeed = 15;
      const minSpeed = 5;
      const maxLife = box.width;
      const minLife = maxLife;
      var particleAttr = {
        "fill": this.colors[box.colorId],
        "stroke-width":0
      };

      let particles = [];
      particles.push(this.paper.rect(box.x, box.y, quart, quart, 3));
      particles.push(this.paper.rect(box.x + quart, box.y, quart, quart, 3));

      //send them off at random angles and speeds
      for (var i = 0; i < particles.length; i++){
        let particle = particles[i];
        let speed = Math.max(Math.random() * maxSpeed, minSpeed);
        let takeoffAngle = Math.random() * Math.PI * 2;
        particle.dying = true;
        particle.attr(particleAttr);
        particle.dx = speed * Math.cos(takeoffAngle);
        particle.dy = speed * Math.sin(takeoffAngle);
        particle.life = Math.max(maxLife * Math.random(), minLife);
        /* Read once and cache position value to save attribute lookup */
        particle.x = particle.attr("x");
        particle.y = particle.attr("y");
        this.particles.push(particle);
      }

      box.view.remove();
    }

    if (boxesToRemove.length) {
      this._startRendering();
    }

    resolve();
  });
}

/**
 * Display the screen for the end of a level
 *
 * @param score           Final score for entire game
 * @param levelScore      Portion of total score accumulated this level
 * @param preBonusScore   Total score before any end-of-level bonuses are added
 * @param movesBonus      Bonus given for number of moves used
 * @param boxPenalty      Penalty (or bonus) given for boxes remaining
 * @param remainingBoxes  Number of boxes remaining at the end of the level
 *
 * @return a Promise chain which animates the ending screen
 */
Eboc.SvgView.prototype.showEndLevel = async function(score, levelScore, preBonusScore, movesBonus, boxPenalty, remainingBoxes) {

  /* Variable set to the most recent promise's resolve function. This allows the user to skip animations after the "continue"
   button is shown */
  let currentResolve;

  /* Create text lines to be displayed serially */
  let lineTexts = [
    "Level Complete",
    `Level Score: ${levelScore}` ,
    `Moves Bonus: ${movesBonus}` ,
    (boxPenalty <= 0) ?
      `Remaining Box Penalty: ${boxPenalty}`:
      `Fully Cleared Bonus: ${boxPenalty}`,
    `Total Score: ${preBonusScore}`,
    {text: "Continue", action: ()=>{
      if (currentResolve) {
        currentResolve();
        currentResolve = null;
      }
    }}
  ];

  let lineViews = [];
  let executors = this._createLineExecutors(lineTexts, this.height/2, {lineViews: lineViews});
  /* Add more executors after the lines are displayed */
  executors = executors.concat([
    /* Explode remaining boxes */
    (resolve)=> {
      currentResolve = resolve;
      return this.showBoxesRemoved(remainingBoxes).then(resolve);
    },
    /* Show the score counting up (or down) */
    (resolve)=> {
      currentResolve = resolve;
      if (currentResolve) {
        const numFrames = 30;
        const scorePerFrame = parseInt((score - levelScore) / numFrames);
        let countScore = preBonusScore;
        let frames = 0;
        let countingInterval = setInterval(()=> {
          lineViews[lineViews.length - 2].attr({"text" : "Total Score: " + countScore });
          countScore += scorePerFrame;
          frames ++;
          if (frames > numFrames) {
            clearInterval(countingInterval);
            resolve();
          }
        },30);
      } else {
        resolve();
      }
    },
    /* Pause at the end to let the user reflect on their performance */
    (resolve)=> {
      if (currentResolve) {
        currentResolve = resolve;
        setTimeout(()=>{
          resolve();
        }, 10000);
      } else {
        resolve();
      }
    }
  ]);

  /* Serially chain all executors */
  let promiseChain = executors.reduce((chain, promise)=>{
    return chain.then(()=> {
      return new Promise(promise);
    });
  }, Promise.resolve());

  return promiseChain;
}

/**
 * Show a screen for failing to win the game
 *
 * @param resetFunc Function to be called that will reset the game
 *
 * @return A promise resolved when the screen has rendered
 */
Eboc.SvgView.prototype.showFailureScreen = async function(resetFunc) {

  /* Create text lines to be displayed serially */
  let lineTexts = [
    "Unfortunately,",
    "You were not able to",
    "explode enough",
    "to continue.",
    {text:"Try again", action:resetFunc}
  ];

  let executors = this._createLineExecutors(lineTexts, this.height / 2, {});

  this.paper.clear();
  return executors.reduce((chain, promise)=>{
    return chain.then(()=> {
      return new Promise(promise);
    });
  }, Promise.resolve());
}

/**
 * Show a screen for winning the game
 *
 * @param resetFunc Function to be called that will reset the game
 *
 * @return A promise resolved when the screen has rendered
 */
Eboc.SvgView.prototype.showFinalScreen = async function(resetFunc) {

  /* Create text lines to be displayed serially */
  let lineTexts = [
    "Congratulations!",
    "You have exploded",
    "All",
    "The",
    "Boxes",
    {text:"Play again", action:resetFunc}
  ];

  let executors = [(resolve)=>{

    let distances = [];
    for (let i =0; i < 100; i++) {
      distances[i] = Math.random();
    }
    distances.sort();

    for (let i =0; i < 100; i++) {
      let distance = distances[i];
      let y = -this.height * Math.random();
      let x = this.width * Math.random();
      let particle = this.paper.rect(x, y, 50*distance, 50*distance, 5*distance);
      particle.x = x;
      particle.y = y;
      particle.attr({"fill": this.colors[parseInt((this.colors.length - 1) * Math.random())],})
      particle.dy = distance * 5;
      particle.dx = 0;
      particle.life = 50*distance;
      particle.dying = false;
      this.particles.push(particle)
    }
    this._startRendering();
    resolve();
  }];

  executors = executors.concat(this._createLineExecutors(lineTexts, this.height / 2, {
    delay: 800,
    fontSize: 40,
  }));

  this.paper.clear();
  return executors.reduce((chain, promise)=>{
    return chain.then(()=> {
      return new Promise(promise);
    });
  }, Promise.resolve());
}
