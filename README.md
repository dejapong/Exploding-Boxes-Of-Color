# Exploding Boxes of Color (Eboc)

[[https://github.com/dejapong/Exploding-Boxes-Of-Color/screenshot.png|alt= Eboc Screenshot]]

Eboc started as a quick weekend project back in 2012. I was considering using Raphael.js for a project, and figured building a game would be a good way to test the framework. I've refactored it since then.

The game is a color matching, falling block game that I broke up into a model and view. The model contains the column structures and adjacency data. The view asynchronously animates game state transitions. Some animations are purely cosmetic, and do not interupt the game state. The ones that do used chained [promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) to ensure that game states do not transition until the animation is complete.

Promises compose nicely, and work naturally whether the view chooses to kick off multiple aync animations serially, or in parallel.

# Serial Promises
For an example of serial asynchronous animations: the end-of-level screen displays several lines of text, one after the other, then animates a counting score. The game model does not set up the next level until after the score has finished counting, or the user interrupts by clicking a "continue" button.

A helper method called `_createLineExecutors()` in `Eboc.SvgView` accepts lines of screen text as an array of strings. It returns an array of "executors", functions which can be passed to the `Promise` constructors that perform an asynchronous action, then either call `resolve()`, `reject()` or return another promise. A simplified version of the Eboc function looks like this:

```javascript
  function _createLineExecutors(lineTexts) {
    const lineHeight = 10;
    return lineTexts.map((text, lineNumber)=>{
      return (resolve)=>{
        r.paper.text(0,lineY += lineHeight, text).animate({fontSize:20}, 500, resolve);
      };
    }
  }
```

Other executors can be appended to this array, and the final array chained together:

```javascript
  function showEndLevel(score) {
    let executors = _createLineExecutors([`The Score is: ${score}`, "Well Done!", this._animateScoreCounting]);
    return = executors.reduce((chain, promise)=>{
      return chain.then(()=> {
        return new Promise(promise);
      });
    }, Promise.resolve());
  }
```

When `showEndLevel()` is called, it returns a promise. The model can then tell the view to show the ending lines, and only increment the model state after the view is done.

```javascript
  async function endLevel() {
    await view.showEndLevel()
    this.currentLevel++;
    this.resetLevel();
  }
```

#Parallel Promises

It's even easier to run promises in parallel using the `all()` method on an array of promises:

```javascript
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
```