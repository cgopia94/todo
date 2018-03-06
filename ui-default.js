var PC_Wrapper_UI = (function() {
  var pc = PC_Wrapper.pc;
  
  ///////////////////////////// Slider  /////////////////////////////
  var Slider = pc.createScript('slider');
  var ui_focus = false;
  
  // initialize code called once per entity
  Slider.prototype.initialize = function() {
    // this.sashes = [this.app.root.findByName('Win_0_Sash_' + this.sash_position), this.app.root.findByName('Win_1_Sash_' + this.sash_position)];
    // this.sash_min = 0;
    // this.sash_max = 0.145;
    this.sliding = false;
    this.lastY = 0;
    
    console.log(this.entity.element);
    this.entity.element.on(pc.EVENT_MOUSEDOWN, this.onMouseDown, this);
    this.app.mouse.on(pc.EVENT_MOUSEUP, this.onMouseUp, this);
    if (this.app.touch) {
      this.entity.element.on(pc.EVENT_TOUCHSTART, this.onMouseDown1, this);
      this.app.touch.on(pc.EVENT_TOUCHMOVE, this.onTouchMove, this);
      this.app.touch.on(pc.EVENT_TOUCHEND, this.onMouseUp, this);    
    }
    
    
      
  };

  Slider.prototype.onTouchMove = function(event) {
    // ui_focus = true;
    this.lastY = event.touches[0].y;
    console.log('onTouchMove1:', this.lastY);
  };

  Slider.prototype.onMouseDown = function(event) {
    alert('Bingo!!!');
    this.lastY = pc.app.mouse._lastY;
    if (event.touches && event.touches[0]) {
      this.isTouch = true;
      this.lastY = event.touches[0].pageY;
    }
    console.log('onMouseDown!!!');
    ui_focus = true;
    if (!this.sliding) {
      this.initPointerPosY = this.lastY;
      this.initDraggerPosY = this.entity.getLocalPosition().y;
      console.log('device._lastY:', this.initPointerPosY);
    }
    
    this.sliding = true;
  };

  Slider.prototype.onMouseUp = function(event) {
    console.log('onMouseUp!!!', this.entity.getLocalPosition(), this.app.mouse._lastX, this.app.mouse._lastY);
    ui_focus = false;
    this.sliding = false;
  };

  // update code called every frame
  Slider.prototype.update = function(dt) {
    if (this.sliding) {
      console.log('pixelRatio:', window.devicePixelRatio);
      
      if (!this.isTouch) this.lastY = this.app.mouse._lastY;
      var position = 0;
      var slide_percent = 0;
      this.entity.setLocalPosition(0, position, 0);
      position = this.initDraggerPosY + (this.initPointerPosY - this.lastY) / this.entity.element.screen.screen.scale * window.devicePixelRatio;
      if(this.sash_position == 'Lower') {
        if(position > -198.8)
            position = -198.8;
        else if(position < -348.8)
            position = -348.8;
        
        slide_percent = (1 - ((position + 198.8) / -150));
      }
      else {
        if(position > 0)
            position = 0;
        else if(position < -150)
            position = -150;
        
        slide_percent = position / 150;
      }
      console.log('open %:', slide_percent, this.lastY);
      this.entity.setLocalPosition(0, position, 0);
      var sash_position = ((this.sash_max - this.sash_min) * slide_percent) + this.sash_min;
      
      for(var i in this.sashes) {
        this.sashes[i].setLocalPosition(0, sash_position, 0);
      }
    }
  };
}());
