var PC_Wrapper = PC_Wrapper || (function() {
  var container = document.querySelector('#container');
  var canvas = document.createElement('CANVAS');
  var assetUrls = [
    'ui-circle-default.png',
    'ui-slider_top-default.png',
    'white1x1-default.png',
    'input-default.js',
    'ui-default.js'
  ];

  init();
  
  function init() {
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    container.appendChild(canvas);
    pc.app = new pc.Application(canvas, { });
    pc.app.start();
    
    // fill the available space at full resolution
    pc.app.setCanvasFillMode(pc.FILLMODE_NONE);
    pc.app.setCanvasResolution(pc.RESOLUTION_AUTO);

    pc.app.mouse = new pc.Mouse(canvas);
    pc.app.touch = new pc.TouchDevice(canvas);

    // ensure canvas is resized when window changes size
    window.addEventListener('resize', function() {
      pc.app.resizeCanvas();
    });

    loadAssets(function() {
      var cameraEntity = drawStage();
      cameraEntity.addComponent('script');
      cameraEntity.script.create('orbitCamera');
      cameraEntity.script.create('touchInput');
      cameraEntity.script.create('mouseInput');

      drawUI();
    });
    
  }

  function loadAssets(callback) {
    var cnt = 0;
    assetUrls.forEach(function(url) {
      pc.app.assets.loadFromUrl(url, /.js$/.test(url) ? 'script' : 'texture', function(err, asset) {
        if (++cnt >= assetUrls.length) {
          callback();
        }
      });
    });
  }

  function drawStage() {
    var cameraEntity = new pc.Entity('camera');
    cameraEntity.addComponent('camera', {
      clearColor: new pc.Color(1,1,1)
    });
    
    var light = new pc.Entity('light');
  
    light.addComponent('light', {
      type: 'spot',
      color: new pc.Color(1, 1, 1)
    });
    
    light.setPosition(0, 0.5, -0.5);
    light.setEulerAngles(-45, 0, 0);
    
    pc.app.root.addChild(light);
    pc.app.root.addChild(cameraEntity);
    cameraEntity.setPosition(0, 0, 2);
    
    return cameraEntity;
  }

  function drawUI() {
    console.log('UIControl draw!');
    // parent 2d screen
    var screenEntity = new pc.Entity('ui-screen');
    screenEntity.enabled = true;
    screenEntity.addComponent('screen', {
      screenSpace: true, // for 2d screen
      scaleMode: pc.SCALEMODE_BLEND,
      scaleBlend: 0.5,
      referenceResolution: new pc.Vec2(1280, 720)
    });
    
    
    // sliders group
    var uiSliders = new pc.Entity('ui-sliders');
    uiSliders.addComponent('element', {
      type: pc.ELEMENTTYPE_GROUP,
      anchor: new pc.Vec4(1,0,1,0),
      pivot: new pc.Vec2(1,0),
      width: 64,
      height: 400,
      margin: new pc.Vec4(-139,250,75,-650)
    });
    uiSliders.setLocalPosition(-75,250,0);
    

    // divider
    var uiDivider = new pc.Entity('ui-divider');
    uiDivider.addComponent('element', {
      type: pc.ELEMENTTYPE_IMAGE,
      anchor: new pc.Vec4(0.5,0.5,0.5,0.5),
      pivot: new pc.Vec2(0.5,0.5),
      width: 40,
      height: 2,
      margin: new pc.Vec4(-20,-1,-20,-1),
      texture: pc.app.assets.find('white1x1-default.png').resource
    });
    uiSliders.addChild(uiDivider);

    // top circle
    var uiTopCircle = new pc.Entity('ui-top-circle');
    uiTopCircle.addComponent('element', {
      type: pc.ELEMENTTYPE_IMAGE,
      anchor: new pc.Vec4(0.5,1,0.5,1),
      pivot: new pc.Vec2(0.5,1),
      width: 64,
      height: 64,
      margin: new pc.Vec4(-32,-64,-32,0),
      texture: pc.app.assets.find('ui-circle-default.png').resource
    });
    uiTopCircle.setLocalScale(0.8,0.8,0.8);
    uiSliders.addChild(uiTopCircle);

    // bot circle
    var uiBotCircle = new pc.Entity('ui-bot-circle');
    uiBotCircle.addComponent('element', {
      type: pc.ELEMENTTYPE_IMAGE,
      anchor: new pc.Vec4(0.5,0,0.5,0),
      pivot: new pc.Vec2(0.5,0),
      width: 64,
      height: 64,
      margin: new pc.Vec4(-32,0,-32,-64),
      texture: pc.app.assets.find('ui-circle-default.png').resource
    });
    uiBotCircle.setLocalScale(0.8,0.8,0.8);
    uiSliders.addChild(uiBotCircle);

    // slider guide
    var uiSliderGuide = new pc.Entity('ui-slider-guide');
    uiSliderGuide.addComponent('element', {
      type: pc.ELEMENTTYPE_IMAGE,
      anchor: new pc.Vec4(0.5,0.5,0.5,0.5),
      pivot: new pc.Vec2(0.5,0.5),
      width: 3,
      height: 300,
      margin: new pc.Vec4(-1.5,-150,-1.5,-150),
      texture: pc.app.assets.find('white1x1-default.png').resource
    });
    uiSliders.addChild(uiSliderGuide);

    // top slider
    var uiTopSlider = new pc.Entity('ui-top-slider');
    uiTopSlider.addComponent('element', {
      type: pc.ELEMENTTYPE_IMAGE,
      useInput: true,
      anchor: new pc.Vec4(0.5,1,0.5,1),
      pivot: new pc.Vec2(0.5,1),
      width: 64,
      height: 64,
      margin: new pc.Vec4(-32,-64,-32,0),
      rect: new pc.Vec4(0,0,1,1),
      texture: pc.app.assets.find('ui-slider_top-default.png').resource
    });
    uiTopSlider.addComponent('script');
    uiTopSlider.script.create('slider');
    uiTopSlider.setLocalScale(0.8,0.8,0.8);
    uiSliders.addChild(uiTopSlider);

    // bottom slider
    var uiBotSlider = new pc.Entity('ui-bot-slider');
    uiBotSlider.addComponent('element', {
      type: pc.ELEMENTTYPE_IMAGE,
      useInput: true,
      anchor: new pc.Vec4(0.5,1,0.5,1),
      pivot: new pc.Vec2(0.5,1),
      width: 64,
      height: 64,
      margin: new pc.Vec4(-32,-412,-32,348),
      rect: new pc.Vec4(0,0,1,1),
      texture: pc.app.assets.find('ui-slider_top-default.png').resource
    });
    uiBotSlider.addComponent('script');
    uiBotSlider.script.create('slider');
    uiBotSlider.setLocalPosition(0,-348.8,0);
    uiBotSlider.setLocalScale(0.8,0.8,0.8);
    uiSliders.addChild(uiBotSlider);

    screenEntity.addChild(uiSliders);
    pc.app.root.addChild(screenEntity);

    
  }

  return {
    pc: pc
  }

}());

//# sourceURL=sample.js