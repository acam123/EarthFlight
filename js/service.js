/**
 * service.js
 *
 * Computer Science 50
 * Earth Flight
 *
 * Implements a shuttle service.
 */

// default height
var HEIGHT = 0.8;

// default latitude
var LATITUDE = 42.3745615030193;

// default longitude
var LONGITUDE = -71.11803936751632;

// default heading
var HEADING = 1.757197490907891;

// default velocity
var VELOCITY = 0;

// global reference to shuttle's marker on 2D map
var planeicon = null;

// global reference to 3D Earth
var earth = null;

// global reference to 2D map
var map = null;

// global reference to shuttle
var shuttle = null;

// initialize force
var FORCE = 0;

// initialize plane view
var plane_view = 0;

//initialize points
var score = 0;

//initial velocity multiplier
var timePressed = 0;

//initial forward velocity
var forward = 0;

//acceleration constant
var accel = 1.001;

//initialize forwardVelocity
var forwardVelocity = 0;

// load version 1 of the Google Earth API
google.load("earth", "1");

// load version 3 of the Google Maps API
google.load("maps", "3", {other_params: "sensor=false"});

// once the window has loaded
$(window).load(function() {

    // listen for keydown anywhere in body
    $(document.body).keydown(function(event) {
        change_plane_mode(event);    
        return keystroke(event, true);
    });

    // listen for keyup anywhere in body
    $(document.body).keyup(function(event) {
        // w not pressed
        if (event.keyCode == 87 || event.keyCode == 119)
        {      
            forwardVelocity = 0;
            drag();  
        }
        // s not pressed
        else if (event.keyCode == 83 || event.keyCode == 115)
        {
            forwardVelocity = 0;
        }
        // up and down arrow not pressed
        if (shuttle.rollAngle != 0 )
        {
            if (event.keyCode == 38 || event.keyCode == 40)
            {
                rollReturn();
               
            }
        }
        return keystroke(event, false);
    });

    // load application
    load();
});

// unload application
$(window).unload(function() {
    unload();
});



/**
 * Called if Google Earth fails to load.
 */
function failureCB(errorCode) 
{
    // report error unless plugin simply isn't installed
    if (errorCode != ERR_CREATE_PLUGIN)
    {
        alert(errorCode);
    }
}

/**
 * Handler for Earth's frameend event.
 */
function frameend() 
{
    angle_standard();
    shuttle.update();
    pickup();
    move_plane();
}

/**
 * Called once Google Earth has loaded.
 */
function initCB(instance) 
{
    // retain reference to GEPlugin instance
    earth = instance;

    // specify the speed at which the camera moves
    earth.getOptions().setFlyToSpeed(100);

    // show buildings
    earth.getLayerRoot().enableLayerById(earth.LAYER_BUILDINGS, true);

    // disable terrain (so that Earth is flat)
    earth.getLayerRoot().enableLayerById(earth.LAYER_TERRAIN, false);

    // prevent mouse navigation in the plugin
    earth.getOptions().setMouseNavigationEnabled(false);

    // instantiate shuttle
    shuttle = new Shuttle({
        heading: HEADING,
        height: HEIGHT,
        latitude: LATITUDE,
        longitude: LONGITUDE,
        planet: earth,
        velocity: VELOCITY 
    });

    // synchronize camera with Earth
    google.earth.addEventListener(earth, "frameend", frameend);

    // synchronize map with Earth
     google.earth.addEventListener(earth.getView(), "viewchange", viewchange);

    // update shuttle's camera
    shuttle.updateCamera();

    // show Earth
    earth.getWindow().setVisibility(true);


    // populate Earth with plane
    populate();
}

/**
 * Handles keystrokes.
 */
function keystroke(event, state)
{
    // ensure we have event
    if (!event)
    {
        event = window.event;
    }
    

    // left arrow
    if (event.keyCode == 37)
    {
        shuttle.states.turningLeftward = state;   
        return false;
    }

    // up arrow
    else if (event.keyCode == 38)
    {
        shuttle.states.tiltingUpward = state;
        return false;
    }

    // right arrow
    else if (event.keyCode == 39)
    {
        shuttle.states.turningRightward = state;
        return false;
    }

    // down arrow
    else if (event.keyCode == 40)
    {
        shuttle.states.tiltingDownward = state;
        return false;
    }

    // A, a
    else if (event.keyCode == 65 || event.keyCode == 97)
    {
        shuttle.states.slidingLeftward = state;
        return false;
    }

    
    // D, d
    else if (event.keyCode == 68 || event.keyCode == 100)
    {
        shuttle.states.slidingRightward = state;
        return false;
    }
  
    // S, s
    else if (event.keyCode == 83 || event.keyCode == 115)
    {
        shuttle.states.movingBackward = state; 
        return false;
    }

    // W, w
    else if (event.keyCode == 87 || event.keyCode == 119)
    {
        shuttle.states.movingForward = state;
        return false;
    }
    
    // space
    else if (event.keyCode == 32)
    {
        shuttle.states.flyingUpward = state;
        return false;
    }
    
    // shift
    else if (event.keyCode == 16 )
    {
        shuttle.states.flyingDownward = state;
        return false;
    }
         
    return true;
}

/**
 * Loads application.
 */
function load()
{
    // embed 2D map in DOM
    var latlng = new google.maps.LatLng(LATITUDE, LONGITUDE);
    map = new google.maps.Map($("#map").get(0), {
        center: latlng,
        disableDefaultUI: true,
        mapTypeId: google.maps.MapTypeId.SATELLITE,
        scrollwheel: false,
        zoom: 16,
        zoomControl: true,
        rotation: 90
    });
    
    // prepare plane's icon for map
     var url = window.location.href.substring(0, (window.location.href.lastIndexOf("/")) + 1);
     planeicon = new google.maps.Marker({
       // icon: "https://maps.gstatic.com/intl/en_us/mapfiles/ms/micons/plane.png",
        icon: (url + "/img/rotations/aircraftsmall0.png"),
        map: map,
        title: "you are here",
    }); 

    // embed 3D Earth in DOM
    google.earth.createInstance("earth", initCB, failureCB); 
}


/**
 * Populates Earth with objects
 */
function populate()
{   
    // get current URL, sans any filename
    var url = window.location.href.substring(0, (window.location.href.lastIndexOf("/")) + 1);
    make_overlay(url);
    make_hoops(url); 
}

/**
 * Handler for Earth's viewchange event.
 */
function viewchange() 
{
    // keep map centered on shuttle's marker
    var latlng = new google.maps.LatLng(shuttle.position.latitude, shuttle.position.longitude);
    map.setCenter(latlng);
    
    var url = window.location.href.substring(0, (window.location.href.lastIndexOf("/")) + 1);
    
    // update plane icon 
    degA = Math.round((shuttle.headingAngle * 180 / Math.PI + 2 ) / 5 ) * 5;
    
    planeicon.setIcon(url + "img/planes/aircraftsmall" + degA +".png");
    planeicon.setPosition(latlng);
   
} 

/**
 * Unloads Earth.
 */
function unload()
{
    google.earth.removeEventListener(earth.getView(), "viewchange", viewchange);
    google.earth.removeEventListener(earth, "frameend", frameend);
}

function move_plane()
{  
     var loc = earth.createLocation('');
     loc.setLatLngAlt(shuttle.position.latitude -.0000025, shuttle.position.longitude + .0000025, shuttle.cameraAltitude);
     model.setLocation(loc);
     var orientation = earth.createOrientation('');
     orientation.setHeading(shuttle.headingAngle * 180 / Math.PI - 90);
     orientation.setTilt(0);
     orientation.setRoll(shuttle.rollAngle);
     model.setOrientation(orientation);
}

/*function force(direction)
{
    if (direction == "forward")
    {
        FORCE += 1; 
    }
    else if (direction == "backward")
    {
        FORCE -= 1; 
    }
    
    var lookAt = earth.getView().copyAsLookAt(earth.ALTITUDE_RELATIVE_TO_GROUND);
    lookAt.setLatitude(lookAt.getLatitude() + FORCE);
    lookAt.setLongitude(lookAt.getLongitude() + 0);
    earth.getView().setAbstractView(lookAt);
}*/

function make_overlay(url)
{
     // Create the ScreenOverlay
     screenOverlay = earth.createScreenOverlay('');

    // Specify a path to the image and set as the icon
    var icon = earth.createIcon('');
    //icon.setHref('http://earth-api-samples.googlecode.com/svn/trunk/examples/static/frame.png'); 
    //icon.setHref(url + "/img/frame.png");
    //icon.setHref('http://comps.fotosearch.com/comp/CSP/CSP990/metal-window-frame_~k11514638.jpg');
    //icon.setHref(url + "/img/plane2.png");
    icon.setHref(url + "/img/cockpit.png");
    screenOverlay.setIcon(icon);

    // Set the ScreenOverlay's position in the window
    screenOverlay.getOverlayXY().setXUnits(earth.UNITS_FRACTION);
    screenOverlay.getOverlayXY().setYUnits(earth.UNITS_FRACTION);
    //screenOverlay.getOverlayXY().setX(600);
    //screenOverlay.getOverlayXY().setY(300);
    screenOverlay.getOverlayXY().setX(.5);
    screenOverlay.getOverlayXY().setY(.5);

    // Set the overlay's size in pixels
    screenOverlay.getSize().setXUnits(earth.UNITS_FRACTION);
    screenOverlay.getSize().setYUnits(earth.UNITS_FRACTION);
    //screenOverlay.getSize().setX(250);
    //screenOverlay.getSize().setY(75);
    screenOverlay.getSize().setX(1);
    screenOverlay.getSize().setY(1);

    // Specify the point in the image around which to rotate
    screenOverlay.getRotationXY().setXUnits(earth.UNITS_FRACTION);
    screenOverlay.getRotationXY().setYUnits(earth.UNITS_FRACTION);
    screenOverlay.getRotationXY().setX(0.5);
    screenOverlay.getRotationXY().setY(0.5);

    // Rotate the overlay
    screenOverlay.setRotation(0);

    // Add the ScreenOverlay to Earth
    earth.getFeatures().appendChild(screenOverlay);
}

function make_hoops(url)
{
    for (var i = 0; i < HOOPS.length; i++)
    {
        var placemark = earth.createPlacemark('');
        placemark.setName(HOOPS[i].number);
        var model = earth.createModel('');
        var link = earth.createLink('');
        link.setHref(url + "/img/hoop.dae");
        model.setLink(link); 
        var loc = earth.createLocation('');
        loc.setLatLngAlt((HOOPS[i]["lat"]), (HOOPS[i]["lng"]), (HOOPS[i]["alt"]) );
        var orientation = earth.createOrientation('');
        orientation.setHeading(HOOPS[i]["rotate"]);
        orientation.setTilt(HOOPS[i]["tilt"]);
        model.setOrientation(orientation);
        model.setLocation(loc);
        model.setAltitudeMode(earth.ALTITUDE_RELATIVE_TO_GROUND);
        
        placemark.setGeometry(model); 
        earth.getFeatures().appendChild(placemark);
        
        // add marker to map
        var marker = new google.maps.Marker({
            icon: (url + "/img/star.png"),
            map: map,
            position: new google.maps.LatLng(HOOPS[i]["lat"], HOOPS[i]["lng"]),
            title: "hoop" + i
            });
        
        // remember hoops's placemark and marker for later
        HOOPS[i]["marker"] = marker;
        HOOPS[i]["placemark"] = placemark;
        
        //set hoops's status
    }   HOOPS[i]["status"] = "incomplete";
}

function make_plane(url)
{
    // Create a 3D model, initialize it from a Collada file, and place it in the world.
    placemark = earth.createPlacemark('');
    placemark.setName('Plane');
    model = earth.createModel('');
    link = earth.createLink('');
    //link.setHref('http://earth-api-samples.googlecode.com/svn/trunk/examples/static/splotchy_box.dae');
    //link.setHref("/home/jharvard/vhosts/localhost/public/Final_Project2/img/plane.dae");
    link.setHref(url + "/img/plane2.dae");
    model.setLink(link);
    var loc = earth.createLocation('');
    loc.setLatLngAlt(shuttle.position.latitude -.0000025, shuttle.position.longitude + .0000025, shuttle.cameraAltitude );
    var orientation = earth.createOrientation('');
    orientation.setHeading(shuttle.headingAngle * 180 / Math.PI - 100);
    orientation.setTilt(0);
    model.setOrientation(orientation);
    model.setLocation(loc);
    placemark.setGeometry(model); 
    model.setAltitudeMode(earth.ALTITUDE_RELATIVE_TO_GROUND);
    earth.getFeatures().appendChild(placemark); 
}

function pickup()
{
      if (shuttle.cameraAltitude >= HOOPS[0]["alt"] - 2 && shuttle.cameraAltitude <= HOOPS[0]["alt"] + 2)
    {
        // for each HOOP
        for (var i = 0; i < HOOPS.length; i++)
        {
            if (HOOPS[i]["status"] != "complete")
            { 
                // get location info of HOOPS
                var g_lat = HOOPS[i]["lat"];
                var g_lng = HOOPS[i]["lng"];
                
                // check distance from shuttle
                var d = shuttle.distance(g_lat, g_lng);

                
                // if in range
                if (d <= 4.0)
                {
                    // remove placemark & marker of this HOOP from 3D and 2D map
                    var features = earth.getFeatures();
                    HOOPS[i]["marker"].setMap(null);
                    features.removeChild(HOOPS[i]["placemark"]);
                    HOOPS[i]["status"] = "complete";   
                    
                    // add point
                    score++;
                    $('#scoreboard').text(score);
                }
            }
        } 
    }   
}  

/* This function alters the plane view mode with the c button */
function change_plane_mode(event)
{
    // ensure we have event
    if (!event)
    {
        event = window.event;
    }
    
    // C, c
    if (event.keyCode == 67 || event.keyCode == 99)
    {
        plane_view++;
        
        if (plane_view > 2)
        {
            plane_view = 0;    
        } 
    
     
        var url = window.location.href.substring(0, (window.location.href.lastIndexOf("/")) + 1); 
        
        if (plane_view == 0)
        {
            make_overlay(url);
        }
        else if (plane_view == 1)
        {
            earth.getFeatures().removeChild(screenOverlay);
            make_plane(url);
            
        }
        else 
        {
            earth.getFeatures().removeChild(placemark);
        }
    }

}  
/* This function wraps the headingAngle around the limits of 0 and 360 degrees*/
function angle_standard()
{
     if (shuttle.headingAngle <= 0) 
        {
            shuttle.headingAngle = 360 * Math.PI /180 ;
        }
        else if (shuttle.headingAngle * 180 / Math.PI >= 360) 
        {
            shuttle.headingAngle = 0;
        }    
}

/* this function slows down the plane after w has been released; 
this should parallel the forward thrust more and incorporate 
direction to include support for s key as back */

function drag() 
{
    if (forward > 0)
    {
        forward -= 0.05;
    }
    
    if (forward > 0)
    {
        setTimeout(function () {drag()}, 100);      
    }
    
    if (forward < 0) 
    {
        forward = 0;
    }
} 

/* This function returns the roll Angle after 
you stop pressing the arrow keys with a bit of fancy animation

*/
function rollReturn()
{ 
    
    if (shuttle.rollAngle >= 0.3)
    {
        shuttle.rollAngle -= 0.2;
        shuttle.cameraAltitude += 0.5;
        setTimeout(function () {rollReturn()}, 30);
    }
    else if (shuttle.rollAngle <= -0.3)
    {
        shuttle.rollAngle += 0.2;
        shuttle.cameraAltitude -= 0.5;
        setTimeout(function () {rollReturn()}, 30);  
    }
    else
    {
        shuttle.rollAngle = 0;
    }
    
}
