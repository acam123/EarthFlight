/**
 * shuttle.js
 *
 * Computer Science 50
 * Earth Flight
 *
 * Implements a shuttle.  Based on
 * http://earth-api-samples.googlecode.com/svn/trunk/demos/firstpersoncam/firstpersoncam.js.
 */

/**
 * Encapsulates a shuttle.
 */
  
function Shuttle(config)
{
    // shuttle's position
    this.position = {
        altitude: 0,
        heading: config.heading,
        latitude: config.latitude,
        longitude: config.longitude
    };

    // shuttle's states
    this.states = {
        flyingUpward: false,
        flyingDownward: false,
        movingBackward: false,
        movingForward: false,
        slidingLeftward: false,
        slidingRightward: false,
        tiltingDownward: false,
        tiltingUpward: false,
        turningLeftward: false,
        turningRightward: false
    };

    // remember shuttle's planet
    this.planet = config.planet;

    // remember shuttle's height
    this.height = config.height;

    // remember shuttle's velocity
    this.velocity = config.velocity;

    // initialize camera altitude to shuttle's height
    this.cameraAltitude = this.height;

    // shuttle's initial Cartesian coordinates
    this.localAnchorCartesian = 
        V3.latLonAltToCartesian([this.position.latitude, this.position.longitude, this.position.altitude]);

    // heading angle and tilt angle are relative to local frame
    this.headingAngle = config.heading;
    this.tiltAngle = 0;
    this.rollAngle = 0;

    // initialize time
    this.lastMillis = (new Date()).getTime();  

    // initialize shuttle's seats to empty
    this.seats = [];
    for (var i = 0; i < config.seats; i++)
    {
        this.seats[i] = null;
    }
}

/**
 * Calculates the distance in meters between the shuttle and specified coordinates.
 * Based on https://developers.google.com/maps/articles/mvcfun#makingitwork.
 */
Shuttle.prototype.distance = function(lat, lng)
{
    var R = 6371;
    var dLat = (this.position.latitude - lat) * Math.PI / 180;
    var dLon = (this.position.longitude - lng) * Math.PI / 180;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat * Math.PI / 180) * Math.cos(this.position.latitude * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c;
    return d * 1000;
};

/**
 * Method that updates a shuttle's location.
 */
Shuttle.prototype.update = function()
{
    this.planet.getWindow().blur();
  
    // Update delta time (dt in seconds)
    var now = (new Date()).getTime();  
    var dt = (now - this.lastMillis) / 1000.0;
    if (dt > 0.25)
    {
        dt = 0.25;
    }  
    this.lastMillis = now;    
    
    // Update orientation and then position of camera based on user input.
    this.updateOrientation(dt);
    this.updatePosition(dt);
           
    // Update camera.
    this.updateCamera();
};

/**
 * Method that updates a shuttle's camera.
 */
Shuttle.prototype.updateCamera = function() 
{
    // calculate heading; keep angle in [-180, 180]
    var heading = this.headingAngle * 180 / Math.PI;
    while (heading < -180) 
    {
        heading += 360;
    }
    while (heading > 180)
    {
        heading -= 360;
    }

    // Update camera position.  Note that tilt at 0 is facing directly downwards.
    // We add 90 such that 90 degrees is facing forwards.
    var la = this.planet.createLookAt("");
    la.set(
        this.position.latitude,
        this.position.longitude,
        this.cameraAltitude, 
        this.planet.ALTITUDE_RELATIVE_TO_GROUND,
        heading,
        90,//tilt anglethis.tiltAngle * 180 / Math.PI + 120, /* tilt */ //maybe we should put this back in  
        0 /* altitude is constant */
    );  
    this.planet.getView().setAbstractView(la);         
};

/**
 * Method that updates a shuttle's orientation.
 */
Shuttle.prototype.updateOrientation = function(dt) 
{
    // Based on dt and input press, update turn angle.
    if (this.states.turningLeftward || this.states.turningRightward)
    {
        if (forward > 0)
        {
            var turnSide = -1;
            
            var turnSpeed = 60.0; // degrees/sec
            if (this.states.turningLeftward)
            {
                turnSpeed *= -1.0;
                turnSide = 1;
            }
            this.headingAngle += turnSpeed * dt * Math.PI / 180.0;
            
            //add in plane lean when turning
            this.tiltAngle += turnSide;
            
            if (this.tiltAngle > 20 ) 
            {
                this.tiltAngle = 20;
            }
            else if (this.tiltAngle < -20)
            {
                 this.tiltAngle = -20;
            }
        }
    }
    if (this.states.tiltingDownward) // maybe more restrictions like when touching ground
    {
        if( shuttle.cameraAltitude > HEIGHT)
        {
            if (this.rollAngle >= -20)
            {
                this.rollAngle -= 1; 
            }
            
            this.cameraAltitude += (this.rollAngle / 2); //tweak
        }
    } 
    
    if (this.states.tiltingUpward)
    {
        // only allow lift if fast enough
        if (forward >= speedThreshold)
        {
            if (this.rollAngle <= 10)
            {
                this.rollAngle += 1;
            }
            
            this.cameraAltitude += (this.rollAngle / 2); // matches above 
            
            if (this.cameraAltitude >= 30)
            {
                this.cameraAltitude = 30;
            }
        }
    }
   
}

/**
 * Method that updates a shuttle's position.
 */
Shuttle.prototype.updatePosition = function(dt) 
{
    // Convert local lat/lon to a global matrix.  The up vector is 
    // vector = position - center of earth.  And the right vector is a vector
    // pointing eastwards and the facing vector is pointing towards north.
    var localToGlobalFrame = M33.makeLocalToGlobalFrame([this.position.latitude, this.position.longitude, this.position.altitude]);
  
    // Move in heading direction by rotating the facing vector around
    // the up vector, in the angle specified by the heading angle.
    // Strafing is similar, except it's aligned towards the right vec.
    var headingVec = V3.rotate(localToGlobalFrame[1], localToGlobalFrame[2], -this.headingAngle);                             
    var rightVec = V3.rotate(localToGlobalFrame[0], localToGlobalFrame[2], -this.headingAngle);

    // Calculate strafe/forwards                             
    var strafe = 0;                             

    if (this.states.movingForward || this.states.movingBackward)
    {
        if (this.states.movingBackward)
        {
            forwardVelocity -= 0.005;
        }
        else if (this.states.movingForward)
        {
            forwardVelocity += 0.005;
        }
        
        forward += forwardVelocity; //forward is speed that gets combined with heading angle to change position, maybe need to initialize
    
        if (forward <= 0)
        {
            forward = 0;
        }
        else if (forward >= 20)
        {
            forward = 20;
        }
    }  
  /*  if (this.states.flyingUpward) 
    {
        this.cameraAltitude += 2.0;
    }
    else if (this.states.flyingDownward) 
    {
        this.cameraAltitude -= 2.0;
    }
    this.cameraAltitude = Math.max(this.height, this.cameraAltitude); */
  
    // remember distance traveled
    this.distanceTraveled += forward;

    // Add the change in position due to forward velocity and strafe velocity.
    this.localAnchorCartesian = V3.add(this.localAnchorCartesian, V3.scale(rightVec, strafe));
    this.localAnchorCartesian = V3.add(this.localAnchorCartesian, V3.scale(headingVec, forward));
                                                                        
    // Convert cartesian to Lat Lon Altitude for camera setup later on.
    var localAnchorLla = V3.cartesianToLatLonAlt(this.localAnchorCartesian);
    this.position.latitude = localAnchorLla[0];
    this.position.longitude = localAnchorLla[1];
    this.position.altitude = localAnchorLla[2];
}
