var PC_Wrapper_Input = (function() {
  var pc = PC_Wrapper.pc;
  ///////////////////////////// orbitCamera  /////////////////////////////
  
  var OrbitCamera = pc.createScript('orbitCamera');
  
  // Property to get and set the distance between the pivot point and camera
  // Clamped between this.distanceMin and this.distanceMax
  Object.defineProperty(OrbitCamera.prototype, "distance", {
      get: function() {
          return this._targetDistance;
      },

      set: function(value) {
          this._targetDistance = this._clampDistance(value);
      }
  });


  // Property to get and set the pitch of the camera around the pivot point (degrees)
  // Clamped between this.pitchAngleMin and this.pitchAngleMax
  // When set at 0, the camera angle is flat, looking along the horizon
  Object.defineProperty(OrbitCamera.prototype, "pitch", {
      get: function() {
          return this._targetPitch;
      },

      set: function(value) {
          this._targetPitch = this._clampPitchAngle(value);
      }
  });


  // Property to get and set the yaw of the camera around the pivot point (degrees)
  Object.defineProperty(OrbitCamera.prototype, "yaw", {
      get: function() {
          return this._targetYaw;
      },

      set: function(value) {
          this._targetYaw = value;

          // Ensure that the yaw takes the shortest route by making sure that 
          // the difference between the targetYaw and the actual is 180 degrees
          // in either direction
          var diff = this._targetYaw - this._yaw;
          var reminder = diff % 360;
          if (reminder > 180) {
              this._targetYaw = this._yaw - (360 - reminder);
          } else if (reminder < -180) {
              this._targetYaw = this._yaw + (360 + reminder);
          } else {
              this._targetYaw = this._yaw + reminder;
          }
      }
  });


  // Property to get and set the world position of the pivot point that the camera orbits around
  Object.defineProperty(OrbitCamera.prototype, "pivotPoint", {
      get: function() {
          return this._pivotPoint;
      },

      set: function(value) {
          this._pivotPoint.copy(value);
      }
  });


  // Moves the camera to look at an entity and all its children so they are all in the view
  OrbitCamera.prototype.focus = function (focusEntity) {
      // Calculate an bounding box that encompasses all the models to frame in the camera view
      this._buildAabb(focusEntity, 0);

      var halfExtents = this._modelsAabb.halfExtents;

      var distance = Math.max(halfExtents.x, Math.max(halfExtents.y, halfExtents.z));
      distance = (distance / Math.tan(0.5 * this.entity.camera.fov * pc.math.DEG_TO_RAD));
      distance = (distance * 2);

      this.distance = distance;

      this._removeInertia();

      this._pivotPoint.copy(this._modelsAabb.center);
  };


  OrbitCamera.distanceBetween = new pc.Vec3();

  // Set the camera position to a world position and look at a world position
  // Useful if you have multiple viewing angles to swap between in a scene
  OrbitCamera.prototype.resetAndLookAtPoint = function (resetPoint, lookAtPoint) {
      this.pivotPoint.copy(lookAtPoint);
      this.entity.setPosition(resetPoint);

      this.entity.lookAt(lookAtPoint);

      var distance = OrbitCamera.distanceBetween;
      distance.sub2(lookAtPoint, resetPoint);
      this.distance = distance.length();

      this.pivotPoint.copy(lookAtPoint);

      var cameraQuat = this.entity.getRotation();
      this.yaw = this._calcYaw(cameraQuat);
      this.pitch = this._calcPitch(cameraQuat, this.yaw);

      this._removeInertia();
      this._updatePosition();
  };


  // Set camera position to a world position and look at an entity in the scene
  // Useful if you have multiple models to swap between in a scene
  OrbitCamera.prototype.resetAndLookAtEntity = function (resetPoint, entity) {
      this._buildAabb(entity, 0);
      this.resetAndLookAtPoint(resetPoint, this._modelsAabb.center);
  };


  // Set the camera at a specific, yaw, pitch and distance without inertia (instant cut)
  OrbitCamera.prototype.reset = function (yaw, pitch, distance) {
      this.pitch = pitch;
      this.yaw = yaw;
      this.distance = distance;

      this._removeInertia();
  };

  /////////////////////////////////////////////////////////////////////////////////////////////
  // Private methods
  OrbitCamera.prototype.postInitialize = function() {
    this.orbitCamera = this.entity.script.orbitCamera;
    console.log('OrbitCam PostInit:', this.orbitCamera);
    
    this.startYaw = this.orbitCamera.yaw;
    this.startPitch = this.orbitCamera.pitch;
    this.startDistance = this.orbitCamera.distance;
    this.startPivotPosition = this.orbitCamera.pivotPoint.clone();
  };

  OrbitCamera.prototype.initialize = function () {
    this.distanceMax = 0;
    this.distanceMin = 0;
    this.pitchAngleMax = 90;
    this.pitchAngleMin = -90;
    this.inertiaFactor = 0;
    this.focusEntity;
    this.frameOnStart = true;
    
    var self = this;
    
    var onWindowResize = function () {
        self._checkAspectRatio();
    };

    window.addEventListener('resize', onWindowResize, false);

    this._checkAspectRatio();

    // Find all the models in the scene that are under the focused entity
    this._modelsAabb = new pc.BoundingBox();
    this._buildAabb(this.focusEntity || this.app.root, 0);

    this.entity.lookAt(this._modelsAabb.center);

    this._pivotPoint = new pc.Vec3();
    this._pivotPoint.copy(this._modelsAabb.center);

    // Calculate the camera euler angle rotation around x and y axes
    // This allows us to place the camera at a particular rotation to begin with in the scene
    var cameraQuat = this.entity.getRotation();

    // Preset the camera
    this._yaw = this._calcYaw(cameraQuat);
    this._pitch = this._clampPitchAngle(this._calcPitch(cameraQuat, this._yaw));
    this.entity.setLocalEulerAngles(this._pitch, this._yaw, 0);

    this._distance = 0;

    this._targetYaw = this._yaw;
    this._targetPitch = this._pitch;

    // If we have ticked focus on start, then attempt to position the camera where it frames
    // the focused entity and move the pivot point to entity's position otherwise, set the distance
    // to be between the camera position in the scene and the pivot point
    if (this.frameOnStart) {
        this.focus(this.focusEntity || this.app.root);
    } else {
        var distanceBetween = new pc.Vec3();
        distanceBetween.sub2(this.entity.getPosition(), this._pivotPoint);
        this._distance = this._clampDistance(distanceBetween.length());
    }

    this._targetDistance = this._distance;

    // Reapply the clamps if they are changed in the editor
    this.on('attr:distanceMin', function (value, prev) {
        this._targetDistance = this._clampDistance(this._distance);
    });

    this.on('attr:distanceMax', function (value, prev) {
        this._targetDistance = this._clampDistance(this._distance);
    });

    this.on('attr:pitchAngleMin', function (value, prev) {
        this._targetPitch = this._clampPitchAngle(this._pitch);
    });

    this.on('attr:pitchAngleMax', function (value, prev) {
        this._targetPitch = this._clampPitchAngle(this._pitch);
    });

    // Focus on the entity if we change the focus entity
    this.on('attr:focusEntity', function (value, prev) {
        if (this.frameOnStart) {
            this.focus(value || this.app.root);
        } else {
            this.resetAndLookAtEntity(this.entity.getPosition(), value || this.app.root);
        }
    });

    this.on('attr:frameOnStart', function (value, prev) {
        if (value) {
            this.focus(this.focusEntity || this.app.root);
        }
    });

    this.on('destroy', function() {
        window.removeEventListener('resize', onWindowResize, false);
    });
  };


  OrbitCamera.prototype.update = function(dt) {
    // Add inertia, if any
    var t = this.inertiaFactor === 0 ? 1 : Math.min(dt / this.inertiaFactor, 1);
    this._distance = pc.math.lerp(this._distance, this._targetDistance, t);
    this._yaw = pc.math.lerp(this._yaw, this._targetYaw, t);
    this._pitch = pc.math.lerp(this._pitch, this._targetPitch, t);

    this._updatePosition();
  };


  OrbitCamera.prototype._updatePosition = function () {
    // Work out the camera position based on the pivot point, pitch, yaw and distance
    this.entity.setLocalPosition(0,0,0);
    this.entity.setLocalEulerAngles(this._pitch, this._yaw, 0);

    var position = this.entity.getPosition();
    position.copy(this.entity.forward);
    position.scale(-this._distance);
    position.add(this.pivotPoint);
    this.entity.setPosition(position);
  };


  OrbitCamera.prototype._removeInertia = function () {
    this._yaw = this._targetYaw;
    this._pitch = this._targetPitch;
    this._distance = this._targetDistance;
  };


  OrbitCamera.prototype._checkAspectRatio = function () {
    var height = this.app.graphicsDevice.height;
    var width = this.app.graphicsDevice.width;

    // Match the axis of FOV to match the aspect ratio of the canvas so
    // the focused entities is always in frame
    this.entity.camera.horizontalFov = height > width;
  };


  OrbitCamera.prototype._buildAabb = function (entity, modelsAdded) {
    var i = 0;

    if (entity.model) {
        var mi = entity.model.meshInstances;
        for (i = 0; i < mi.length; i++) {
            if (modelsAdded === 0) {
                this._modelsAabb.copy(mi[i].aabb);
            } else {
                this._modelsAabb.add(mi[i].aabb);
            }

            modelsAdded += 1;
        }
    }

    for (i = 0; i < entity.children.length; ++i) {
        modelsAdded += this._buildAabb(entity.children[i], modelsAdded);
    }

    return modelsAdded;
  };


  OrbitCamera.prototype._calcYaw = function (quat) {
    var transformedForward = new pc.Vec3();
    quat.transformVector(pc.Vec3.FORWARD, transformedForward);

    return Math.atan2(-transformedForward.x, -transformedForward.z) * pc.math.RAD_TO_DEG;
  };


  OrbitCamera.prototype._clampDistance = function (distance) {
    if (this.distanceMax > 0) {
        return pc.math.clamp(distance, this.distanceMin, this.distanceMax);
    } else {
        return Math.max(distance, this.distanceMin);
    }
  };


  OrbitCamera.prototype._clampPitchAngle = function (pitch) {
    // Negative due as the pitch is inversed since the camera is orbiting the entity
    return pc.math.clamp(pitch, -this.pitchAngleMax, -this.pitchAngleMin);
  };


  OrbitCamera.quatWithoutYaw = new pc.Quat();
  OrbitCamera.yawOffset = new pc.Quat();

  OrbitCamera.prototype._calcPitch = function(quat, yaw) {
    var quatWithoutYaw = OrbitCamera.quatWithoutYaw;
    var yawOffset = OrbitCamera.yawOffset;

    yawOffset.setFromEulerAngles(0, -yaw, 0);
    quatWithoutYaw.mul2(yawOffset, quat);

    var transformedForward = new pc.Vec3();

    quatWithoutYaw.transformVector(pc.Vec3.FORWARD, transformedForward);

    return Math.atan2(transformedForward.y, -transformedForward.z) * pc.math.RAD_TO_DEG;
  };

  ///////////////////////// touchInput ////////////////////
  var TouchInput = pc.createScript('touchInput');

  // initialize code called once per entity
  TouchInput.prototype.initialize = function() {
    this.orbitSensitivity = 0.4;
    this.distanceSensitivity = 0.2;
    this.orbitCamera = this.entity.script.orbitCamera;
    
    // Store the position of the touch so we can calculate the distance moved
    this.lastTouchPoint = new pc.Vec2();
    this.lastPinchMidPoint = new pc.Vec2();
    this.lastPinchDistance = 0;
    
    if (this.orbitCamera && this.app.touch) {
        // Use the same callback for the touchStart, touchEnd and touchCancel events as they 
        // all do the same thing which is to deal the possible multiple touches to the screen
        this.app.touch.on(pc.EVENT_TOUCHSTART, this.onTouchStartEndCancel, this);
        this.app.touch.on(pc.EVENT_TOUCHEND, this.onTouchStartEndCancel, this);
        this.app.touch.on(pc.EVENT_TOUCHCANCEL, this.onTouchStartEndCancel, this);
        
        this.app.touch.on(pc.EVENT_TOUCHMOVE, this.onTouchMove, this);
        
        this.on('destroy', function() {
            this.app.touch.off(pc.EVENT_TOUCHSTART, this.onTouchStartEndCancel, this);
            this.app.touch.off(pc.EVENT_TOUCHEND, this.onTouchStartEndCancel, this);
            this.app.touch.off(pc.EVENT_TOUCHCANCEL, this.onTouchStartEndCancel, this);

            this.app.touch.off(pc.EVENT_TOUCHMOVE, this.onTouchMove, this);
        });
    }
  };


  TouchInput.prototype.getPinchDistance = function (pointA, pointB) {
      // Return the distance between the two points
      var dx = pointA.x - pointB.x;
      var dy = pointA.y - pointB.y;    
      
      return Math.sqrt((dx * dx) + (dy * dy));
  };


  TouchInput.prototype.calcMidPoint = function (pointA, pointB, result) {
      result.set(pointB.x - pointA.x, pointB.y - pointA.y);
      result.scale(0.5);
      result.x += pointA.x;
      result.y += pointA.y;
  };


  TouchInput.prototype.onTouchStartEndCancel = function(event) {
      // We only care about the first touch for camera rotation. As the user touches the screen, 
      // we stored the current touch position
      var touches = event.touches;
      if (touches.length == 1) {
          this.lastTouchPoint.set(touches[0].x, touches[0].y);
      
      } else if (touches.length == 2) {
          // If there are 2 touches on the screen, then set the pinch distance
          this.lastPinchDistance = this.getPinchDistance(touches[0], touches[1]);
          this.calcMidPoint(touches[0], touches[1], this.lastPinchMidPoint);
      }
  };


  TouchInput.fromWorldPoint = new pc.Vec3();
  TouchInput.toWorldPoint = new pc.Vec3();
  TouchInput.worldDiff = new pc.Vec3();


  TouchInput.prototype.pan = function(midPoint) {
      var fromWorldPoint = TouchInput.fromWorldPoint;
      var toWorldPoint = TouchInput.toWorldPoint;
      var worldDiff = TouchInput.worldDiff;
      
      // For panning to work at any zoom level, we use screen point to world projection
      // to work out how far we need to pan the pivotEntity in world space 
      var camera = this.entity.camera;
      var distance = this.orbitCamera.distance;
      
      camera.screenToWorld(midPoint.x, midPoint.y, distance, fromWorldPoint);
      camera.screenToWorld(this.lastPinchMidPoint.x, this.lastPinchMidPoint.y, distance, toWorldPoint);
      
      worldDiff.sub2(toWorldPoint, fromWorldPoint);
      
      this.orbitCamera.pivotPoint.add(worldDiff);    
  };


  TouchInput.pinchMidPoint = new pc.Vec2();

  TouchInput.prototype.onTouchMove = function(event) {
      var pinchMidPoint = TouchInput.pinchMidPoint;
      
      // We only care about the first touch for camera rotation. Work out the difference moved since the last event
      // and use that to update the camera target position 
      var touches = event.touches;
      if (touches.length == 1) {
          var touch = touches[0];
          
          this.orbitCamera.pitch -= (touch.y - this.lastTouchPoint.y) * this.orbitSensitivity;
          this.orbitCamera.yaw -= (touch.x - this.lastTouchPoint.x) * this.orbitSensitivity;
          
          this.lastTouchPoint.set(touch.x, touch.y);
      
      } else if (touches.length == 2) {
          // Calculate the difference in pinch distance since the last event
          var currentPinchDistance = this.getPinchDistance(touches[0], touches[1]);
          var diffInPinchDistance = currentPinchDistance - this.lastPinchDistance;
          this.lastPinchDistance = currentPinchDistance;
                  
          this.orbitCamera.distance -= (diffInPinchDistance * this.distanceSensitivity * 0.1) * (this.orbitCamera.distance * 0.1);
          
          // Calculate pan difference
          this.calcMidPoint(touches[0], touches[1], pinchMidPoint);
          this.pan(pinchMidPoint);
          this.lastPinchMidPoint.copy(pinchMidPoint);
      }
  };

  //////////////////////////// mouseInput //////////////////////
  var MouseInput = pc.createScript('mouseInput');

  // initialize code called once per entity
  MouseInput.prototype.initialize = function() {
      console.log('@@@@@@mouseInput:', this);
      this.orbitCamera = this.entity.script.orbitCamera;
      this.orbitSensitivity = 0.3;
      this.distanceSensitivity = 0.15;
          
      if (this.orbitCamera) {
          var self = this;
          
          var onMouseOut = function (e) {
            self.onMouseOut(e);
          };
          
          this.app.mouse.on(pc.EVENT_MOUSEDOWN, this.onMouseDown, this);
          this.app.mouse.on(pc.EVENT_MOUSEUP, this.onMouseUp, this);
          this.app.mouse.on(pc.EVENT_MOUSEMOVE, this.onMouseMove, this);
          this.app.mouse.on(pc.EVENT_MOUSEWHEEL, this.onMouseWheel, this);

          // Listen to when the mouse travels out of the window
          window.addEventListener('mouseout', onMouseOut, false);
          
          // Remove the listeners so if this entity is destroyed
          this.on('destroy', function() {
            this.app.mouse.off(pc.EVENT_MOUSEDOWN, this.onMouseDown, this);
            this.app.mouse.off(pc.EVENT_MOUSEUP, this.onMouseUp, this);
            this.app.mouse.off(pc.EVENT_MOUSEMOVE, this.onMouseMove, this);
            this.app.mouse.off(pc.EVENT_MOUSEWHEEL, this.onMouseWheel, this);

              window.removeEventListener('mouseout', onMouseOut, false);
          });
      }
      
      // Disabling the context menu stops the browser displaying a menu when
      // you right-click the page
      this.app.mouse.disableContextMenu();
    
      this.lookButtonDown = false;
      this.panButtonDown = false;
      this.lastPoint = new pc.Vec2();
  };


  MouseInput.fromWorldPoint = new pc.Vec3();
  MouseInput.toWorldPoint = new pc.Vec3();
  MouseInput.worldDiff = new pc.Vec3();


  MouseInput.prototype.pan = function(screenPoint) {
      var fromWorldPoint = MouseInput.fromWorldPoint;
      var toWorldPoint = MouseInput.toWorldPoint;
      var worldDiff = MouseInput.worldDiff;
      
      // For panning to work at any zoom level, we use screen point to world projection
      // to work out how far we need to pan the pivotEntity in world space 
      var camera = this.entity.camera;
      var distance = this.orbitCamera.distance;
      
      camera.screenToWorld(screenPoint.x, screenPoint.y, distance, fromWorldPoint);
      camera.screenToWorld(this.lastPoint.x, this.lastPoint.y, distance, toWorldPoint);

      worldDiff.sub2(toWorldPoint, fromWorldPoint);
        
      this.orbitCamera.pivotPoint.add(worldDiff);    
  };


  MouseInput.prototype.onMouseDown = function (event) {
      switch (event.button) {
          case pc.MOUSEBUTTON_LEFT: {
              this.lookButtonDown = true;
          } break;
              
          case pc.MOUSEBUTTON_MIDDLE: 
          case pc.MOUSEBUTTON_RIGHT: {
              this.panButtonDown = true;
          } break;
      }
  };


  MouseInput.prototype.onMouseUp = function (event) {
      switch (event.button) {
          case pc.MOUSEBUTTON_LEFT: {
              this.lookButtonDown = false;
          } break;
              
          case pc.MOUSEBUTTON_MIDDLE: 
          case pc.MOUSEBUTTON_RIGHT: {
              this.panButtonDown = false;            
          } break;
      }
  };


  MouseInput.prototype.onMouseMove = function (event) {    
      var mouse = pc.app.mouse;
      if (this.lookButtonDown) {
          this.orbitCamera.pitch -= event.dy * this.orbitSensitivity;
          this.orbitCamera.yaw -= event.dx * this.orbitSensitivity;
      } else if (this.panButtonDown) {
          this.pan(event);   
      }
      
      this.lastPoint.set(event.x, event.y);
  };


  MouseInput.prototype.onMouseWheel = function (event) {
      this.orbitCamera.distance -= event.wheel * this.distanceSensitivity * (this.orbitCamera.distance * 0.1);
      event.event.preventDefault();
      console.log('cam distance:', this.orbitCamera.distance);
  };


  MouseInput.prototype.onMouseOut = function (event) {
      this.lookButtonDown = false;
      this.panButtonDown = false;
  };
}());



